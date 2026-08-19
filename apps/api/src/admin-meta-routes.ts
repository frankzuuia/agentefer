import { performance } from "node:perf_hooks";

import {
  createCorrelationScope,
  OperationalError,
  runWithCorrelation,
  type OperationalMetrics,
  type StructuredLogger,
} from "@agentefer/observability";
import {
  type FastifyInstance,
  type FastifyPluginCallback,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

import { AdminMetaGatewayError, type AdminMetaGateway } from "./admin-meta-gateway.js";
import {
  ADMIN_META_CSS,
  ADMIN_META_FAVICON,
  ADMIN_META_HTML,
  ADMIN_META_JAVASCRIPT,
} from "./admin-meta-page.js";
import { parseAdminMetaRegistrationBody, parseBearerAccessToken } from "./admin-meta-protocol.js";
import { readFastifyErrorCode } from "./meta-webhook-routes.js";

const ORGANIZATIONS_OPERATION = "admin.meta.organizations";
const REGISTER_OPERATION = "admin.meta.register";
const MAXIMUM_ADMIN_BODY_BYTES = 140_000;

type AdminMetaRouteInput = Readonly<{
  gateway: AdminMetaGateway;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  apiPublicUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
}>;

class AdminMetaHttpError extends OperationalError {
  readonly statusCode: number;

  constructor(
    code: string,
    category: "validation" | "authentication" | "internal",
    statusCode: number,
  ) {
    super({
      code,
      category,
      retryable: false,
      severity: category === "internal" ? "error" : "warning",
    });
    this.name = "AdminMetaHttpError";
    this.statusCode = statusCode;
  }
}

type ClassifiedAdminMetaFailure = Readonly<{
  error: OperationalError;
  statusCode: number;
}>;

export const classifyAdminMetaFailure = (error: unknown): ClassifiedAdminMetaFailure => {
  if (error instanceof AdminMetaHttpError) {
    return Object.freeze({ error, statusCode: error.statusCode });
  }

  if (error instanceof AdminMetaGatewayError) {
    switch (error.kind) {
      case "invalid":
        return Object.freeze({ error, statusCode: 400 });
      case "unauthenticated":
        return Object.freeze({ error, statusCode: 401 });
      case "unauthorized":
        return Object.freeze({ error, statusCode: 403 });
      case "conflict":
        return Object.freeze({ error, statusCode: 409 });
      case "timeout":
      case "dependency":
        return Object.freeze({ error, statusCode: 503 });
    }
  }

  return Object.freeze({
    error: new AdminMetaHttpError("ADMIN_META_UNCLASSIFIED", "internal", 500),
    statusCode: 500,
  });
};

export const responseForAdminMetaFailure = (
  statusCode: number,
): Readonly<Record<string, string>> => {
  switch (statusCode) {
    case 400:
    case 413:
    case 415:
      return Object.freeze({ status: "invalid" });
    case 401:
      return Object.freeze({ status: "unauthenticated" });
    case 403:
      return Object.freeze({ status: "forbidden" });
    case 409:
      return Object.freeze({ status: "conflict" });
    case 503:
      return Object.freeze({ status: "unavailable" });
    default:
      return Object.freeze({ status: "failed" });
  }
};

export const classifyAdminMetaParserFailure = (
  errorCode: string | undefined,
): ClassifiedAdminMetaFailure => {
  switch (errorCode) {
    case "FST_ERR_CTP_BODY_TOO_LARGE":
      return Object.freeze({
        error: new AdminMetaHttpError("ADMIN_META_ENVELOPE_REJECTED", "validation", 413),
        statusCode: 413,
      });
    case "FST_ERR_CTP_INVALID_MEDIA_TYPE":
      return Object.freeze({
        error: new AdminMetaHttpError("ADMIN_META_ENVELOPE_REJECTED", "validation", 415),
        statusCode: 415,
      });
    case "FST_ERR_CTP_INVALID_JSON_BODY":
      return Object.freeze({
        error: new AdminMetaHttpError("ADMIN_META_ENVELOPE_REJECTED", "validation", 400),
        statusCode: 400,
      });
    case undefined:
    default:
      return Object.freeze({
        error: new AdminMetaHttpError("ADMIN_META_PARSER_FAILED", "internal", 500),
        statusCode: 500,
      });
  }
};

const recordFailure = (
  input: AdminMetaRouteInput,
  operation: string,
  startedAt: number,
  failure: ClassifiedAdminMetaFailure,
): void => {
  input.metrics.recordCompleted({
    operation,
    outcome: "failed",
    errorCategory: failure.error.category,
    durationMilliseconds: performance.now() - startedAt,
  });
  input.logger.error(`${operation}.failed`, failure.error, {
    http_status: failure.statusCode,
  });
};

const sendFailure = (reply: FastifyReply, failure: ClassifiedAdminMetaFailure): void => {
  if (failure.statusCode === 503) {
    reply.header("retry-after", "2");
  }

  reply.code(failure.statusCode).send(responseForAdminMetaFailure(failure.statusCode));
};

const requireAccessToken = (request: FastifyRequest) => {
  const accessToken = parseBearerAccessToken(request.headers.authorization);
  if (accessToken === undefined) {
    throw new AdminMetaHttpError("ADMIN_META_SESSION_REQUIRED", "authentication", 401);
  }

  return accessToken;
};

const requireJsonContentType = (request: FastifyRequest): void => {
  const contentType = request.headers["content-type"];
  const mediaType =
    typeof contentType === "string" ? contentType.split(";", 1)[0]?.trim() : undefined;
  if (mediaType !== "application/json") {
    throw new AdminMetaHttpError("ADMIN_META_MEDIA_TYPE_REQUIRED", "validation", 415);
  }
};

const handleOrganizations = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: AdminMetaRouteInput,
): Promise<void> => {
  const scope = createCorrelationScope();

  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(ORGANIZATIONS_OPERATION);

    try {
      const accessToken = requireAccessToken(request);
      const identity = await input.gateway.authenticate(accessToken);
      const organizations = await input.gateway.listOrganizations(accessToken);

      input.metrics.recordCompleted({
        operation: ORGANIZATIONS_OPERATION,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("admin.meta.organizations.listed", "succeeded", {
        actor_user_id: identity.userId,
        organization_count: organizations.length,
      });

      reply.code(200).send({ organizations });
    } catch (error) {
      const failure = classifyAdminMetaFailure(error);
      recordFailure(input, ORGANIZATIONS_OPERATION, startedAt, failure);
      sendFailure(reply, failure);
    }
  });
};

const handleRegistration = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: AdminMetaRouteInput,
): Promise<void> => {
  const registration = parseAdminMetaRegistrationBody(request.body);
  const scope = createCorrelationScope({ organizationId: registration?.organizationId });

  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(REGISTER_OPERATION);

    try {
      requireJsonContentType(request);
      if (registration === undefined) {
        throw new AdminMetaHttpError("ADMIN_META_REGISTRATION_INVALID", "validation", 400);
      }

      const accessToken = requireAccessToken(request);
      const identity = await input.gateway.authenticate(accessToken);
      const result = await input.gateway.registerMetaApplication({
        organizationId: registration.organizationId,
        externalAppId: registration.externalAppId,
        displayName: registration.displayName,
        apiVersion: registration.apiVersion,
        appSecret: registration.appSecret,
        webhookVerifyToken: registration.webhookVerifyToken,
        actorUserId: identity.userId,
        requestId: scope.identifiers.requestId,
        traceId: scope.identifiers.traceId,
      });
      const callbackUrl = new URL(
        `/webhooks/meta/${result.endpointKey}`,
        input.apiPublicUrl,
      ).toString();

      input.metrics.recordCompleted({
        operation: REGISTER_OPERATION,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("admin.meta.application.registered", "succeeded", {
        organization_id: registration.organizationId,
        actor_user_id: identity.userId,
        meta_application_id: result.metaApplicationId,
        webhook_endpoint_id: result.webhookEndpointId,
      });

      reply.code(201).send({ status: "registered", callbackUrl });
    } catch (error) {
      const failure = classifyAdminMetaFailure(error);
      recordFailure(input, REGISTER_OPERATION, startedAt, failure);
      sendFailure(reply, failure);
    }
  });
};

const createContentSecurityPolicy = (supabaseUrl: string): string => {
  const supabaseOrigin = new URL(supabaseUrl).origin;
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}`,
    "object-src 'none'",
    "manifest-src 'none'",
    "media-src 'none'",
    "worker-src 'none'",
  ].join("; ");
};

export function registerAdminMetaRoutes(
  application: FastifyInstance,
  input: AdminMetaRouteInput,
): void {
  const contentSecurityPolicy = createContentSecurityPolicy(input.supabaseUrl);
  const plugin: FastifyPluginCallback = (scope, _options, done) => {
    scope.addHook("onSend", (_request, reply, payload, hookDone) => {
      reply.header("cache-control", "no-store, max-age=0");
      reply.header("content-security-policy", contentSecurityPolicy);
      reply.header("cross-origin-opener-policy", "same-origin");
      reply.header("cross-origin-resource-policy", "same-origin");
      reply.header("origin-agent-cluster", "?1");
      reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
      reply.header("referrer-policy", "no-referrer");
      reply.header("strict-transport-security", "max-age=63072000; includeSubDomains");
      reply.header("x-content-type-options", "nosniff");
      reply.header("x-frame-options", "DENY");
      reply.header("x-robots-tag", "noindex, nofollow, noarchive");
      hookDone(null, payload);
    });

    scope.setErrorHandler((error, _request, reply) => {
      sendFailure(reply, classifyAdminMetaParserFailure(readFastifyErrorCode(error)));
    });

    scope.get("/admin/meta", (_request, reply) => {
      reply.type("text/html; charset=utf-8").code(200).send(ADMIN_META_HTML);
    });
    scope.get("/admin/meta/app.css", (_request, reply) => {
      reply.type("text/css; charset=utf-8").code(200).send(ADMIN_META_CSS);
    });
    scope.get("/admin/meta/app.js", (_request, reply) => {
      reply.type("text/javascript; charset=utf-8").code(200).send(ADMIN_META_JAVASCRIPT);
    });
    scope.get("/admin/meta/favicon.svg", (_request, reply) => {
      reply.type("image/svg+xml; charset=utf-8").code(200).send(ADMIN_META_FAVICON);
    });
    scope.get("/admin/meta/config", (_request, reply) => {
      reply.code(200).send({
        supabaseUrl: input.supabaseUrl,
        publishableKey: input.supabasePublishableKey,
      });
    });
    scope.get("/admin/organizations", (request, reply) =>
      handleOrganizations(request, reply, input),
    );
    scope.post(
      "/admin/meta/applications",
      { bodyLimit: MAXIMUM_ADMIN_BODY_BYTES },
      (request, reply) => handleRegistration(request, reply, input),
    );
    done();
  };

  application.register(plugin);
}
