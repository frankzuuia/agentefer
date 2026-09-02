import { performance } from "node:perf_hooks";

import {
  createCorrelationScope,
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

import { type AdminCatalogGateway } from "./admin-catalog-gateway.js";
import {
  ADMIN_CATALOG_CSS,
  ADMIN_CATALOG_FAVICON,
  ADMIN_CATALOG_HTML,
  ADMIN_CATALOG_JAVASCRIPT,
} from "./admin-catalog-page.js";
import { parseAdminCatalogCommand, parseAdminCatalogQuery } from "./admin-catalog-protocol.js";
import { AdminMetaGatewayError, type AdminMetaGateway } from "./admin-meta-gateway.js";
import { parseBearerAccessToken } from "./admin-meta-protocol.js";
import {
  AdminMetaHttpError,
  classifyAdminMetaFailure,
  classifyAdminMetaParserFailure,
  responseForAdminMetaFailure,
} from "./admin-meta-routes.js";
import { readFastifyErrorCode } from "./meta-webhook-routes.js";

const PAGE_OPERATION = "admin.catalog.page";
const COMMAND_OPERATION = "admin.catalog.command";
const MAXIMUM_COMMAND_BODY_BYTES = 16_384;

export type AdminCatalogRouteInput = Readonly<{
  catalogGateway: AdminCatalogGateway;
  identityGateway: AdminMetaGateway;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  supabaseUrl: string;
  supabasePublishableKey: string;
}>;

const sendFailure = (reply: FastifyReply, error: unknown): void => {
  const failure = classifyAdminMetaFailure(error);
  if (failure.statusCode === 503) {
    reply.header("retry-after", "2");
  }
  reply.code(failure.statusCode).send(responseForAdminMetaFailure(failure.statusCode));
};

const recordFailure = (
  input: AdminCatalogRouteInput,
  operation: string,
  startedAt: number,
  error: unknown,
): void => {
  const failure = classifyAdminMetaFailure(error);
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

const requireAccessToken = (request: FastifyRequest) => {
  const accessToken = parseBearerAccessToken(request.headers.authorization);
  if (accessToken === undefined) {
    throw new AdminMetaGatewayError("unauthenticated");
  }
  return accessToken;
};

const requireJsonContentType = (request: FastifyRequest): void => {
  const contentType = request.headers["content-type"];
  const mediaType =
    typeof contentType === "string" ? contentType.split(";", 1)[0]?.trim() : undefined;
  if (mediaType !== "application/json") {
    throw new AdminMetaHttpError("ADMIN_CATALOG_MEDIA_TYPE_REQUIRED", "validation", 415);
  }
};

const handlePage = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: AdminCatalogRouteInput,
): Promise<void> => {
  const query = parseAdminCatalogQuery(request.query);
  const scope = createCorrelationScope({ organizationId: query?.organizationId });
  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(PAGE_OPERATION);
    try {
      if (query === undefined) {
        throw new AdminMetaGatewayError("invalid");
      }
      const accessToken = requireAccessToken(request);
      const identity = await input.identityGateway.authenticate(accessToken);
      const page = await input.catalogGateway.getPage({
        ...query,
        actorUserId: identity.userId,
      });
      input.metrics.recordCompleted({
        operation: PAGE_OPERATION,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("admin.catalog.page.loaded", "succeeded", {
        organization_id: query.organizationId,
        actor_user_id: identity.userId,
        item_count: page.items.length,
        has_more: page.hasMore,
      });
      reply.code(200).send(page);
    } catch (error) {
      recordFailure(input, PAGE_OPERATION, startedAt, error);
      sendFailure(reply, error);
    }
  });
};

const handleCommand = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: AdminCatalogRouteInput,
): Promise<void> => {
  const command = parseAdminCatalogCommand(request.body);
  const scope = createCorrelationScope({ organizationId: command?.organizationId });
  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(COMMAND_OPERATION);
    try {
      requireJsonContentType(request);
      const accessToken = requireAccessToken(request);
      const identity = await input.identityGateway.authenticate(accessToken);
      if (command === undefined) {
        throw new AdminMetaGatewayError("invalid");
      }
      const actor = { actorUserId: identity.userId } as const;
      const result =
        command.type === "set_status"
          ? await input.catalogGateway.setOfferStatus({ ...command, ...actor })
          : command.type === "publish"
            ? await input.catalogGateway.publish({ ...command, ...actor })
            : command.type === "publish_all"
              ? await input.catalogGateway.publishAll({ ...command, ...actor })
              : command.type === "retry"
                ? await input.catalogGateway.retry({ ...command, ...actor })
                : await input.catalogGateway.setBatchState({ ...command, ...actor });
      input.metrics.recordCompleted({
        operation: COMMAND_OPERATION,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("admin.catalog.command.accepted", "succeeded", {
        organization_id: command.organizationId,
        actor_user_id: identity.userId,
        command_type: command.type,
        idempotency_key: command.idempotencyKey,
      });
      reply.code(202).send({ status: "accepted", result });
    } catch (error) {
      recordFailure(input, COMMAND_OPERATION, startedAt, error);
      sendFailure(reply, error);
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
    `img-src 'self' ${supabaseOrigin}`,
    "font-src 'self'",
    `connect-src 'self' ${supabaseOrigin}`,
    "object-src 'none'",
    "manifest-src 'none'",
    "media-src 'none'",
    "worker-src 'none'",
  ].join("; ");
};

export function registerAdminCatalogRoutes(
  application: FastifyInstance,
  input: AdminCatalogRouteInput,
): void {
  const contentSecurityPolicy = createContentSecurityPolicy(input.supabaseUrl);
  const plugin: FastifyPluginCallback = (scope, _options, done) => {
    scope.addHook("onSend", (_request, reply, payload, hookDone) => {
      reply.header("cache-control", "no-store, max-age=0");
      reply.header("content-security-policy", contentSecurityPolicy);
      reply.header("cross-origin-opener-policy", "same-origin-allow-popups");
      reply.header("cross-origin-resource-policy", "same-site");
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
      const failure = classifyAdminMetaParserFailure(readFastifyErrorCode(error));
      if (failure.statusCode === 503) {
        reply.header("retry-after", "2");
      }
      reply.code(failure.statusCode).send(responseForAdminMetaFailure(failure.statusCode));
    });

    scope.get("/admin/catalog", (_request, reply) => {
      reply.type("text/html; charset=utf-8").code(200).send(ADMIN_CATALOG_HTML);
    });
    scope.get("/admin/catalog/app.css", (_request, reply) => {
      reply.type("text/css; charset=utf-8").code(200).send(ADMIN_CATALOG_CSS);
    });
    scope.get("/admin/catalog/app.js", (_request, reply) => {
      reply.type("text/javascript; charset=utf-8").code(200).send(ADMIN_CATALOG_JAVASCRIPT);
    });
    scope.get("/admin/catalog/favicon.svg", (_request, reply) => {
      reply.type("image/svg+xml; charset=utf-8").code(200).send(ADMIN_CATALOG_FAVICON);
    });
    scope.get("/admin/catalog/config", (_request, reply) => {
      reply.code(200).send({
        supabaseUrl: input.supabaseUrl,
        publishableKey: input.supabasePublishableKey,
      });
    });
    scope.get("/admin/catalog/page", (request, reply) => handlePage(request, reply, input));
    scope.post(
      "/admin/catalog/commands",
      { bodyLimit: MAXIMUM_COMMAND_BODY_BYTES },
      (request, reply) => handleCommand(request, reply, input),
    );
    done();
  };
  application.register(plugin);
}
