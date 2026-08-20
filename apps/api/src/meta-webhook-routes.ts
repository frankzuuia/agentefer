import { Buffer } from "node:buffer";
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

import {
  parseMetaChallengeQuery,
  parseMetaEndpointKey,
  parseMetaSignatureHeader,
} from "./meta-webhook-protocol.js";
import { MetaWebhookRpcError, type MetaWebhookRpcClient } from "./meta-webhook-rpc.js";

const webhookOperation = (kind: "challenge" | "delivery"): string =>
  kind === "challenge" ? "meta.webhook.challenge" : "meta.webhook.delivery";

type MetaWebhookRouteInput = Readonly<{
  rpcClient: MetaWebhookRpcClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  maximumBodyBytes: number;
}>;

class MetaWebhookHttpError extends OperationalError {
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
    this.name = "MetaWebhookHttpError";
    this.statusCode = statusCode;
  }
}

export type ClassifiedMetaWebhookFailure = Readonly<{
  error: OperationalError;
  statusCode: number;
}>;

export const classifyMetaWebhookFailure = (error: unknown): ClassifiedMetaWebhookFailure => {
  if (error instanceof MetaWebhookHttpError) {
    return Object.freeze({ error, statusCode: error.statusCode });
  }

  if (error instanceof MetaWebhookRpcError) {
    switch (error.kind) {
      case "invalid":
        return Object.freeze({ error, statusCode: 400 });
      case "rejected":
        return Object.freeze({ error, statusCode: 403 });
      case "timeout":
      case "dependency":
        return Object.freeze({ error, statusCode: 503 });
    }
  }

  return Object.freeze({
    error: new MetaWebhookHttpError("META_WEBHOOK_UNCLASSIFIED", "internal", 500),
    statusCode: 500,
  });
};

export const responseForMetaWebhookFailure = (
  statusCode: number,
): Readonly<Record<string, string>> => {
  switch (statusCode) {
    case 400:
    case 413:
    case 415:
      return Object.freeze({ status: "invalid" });
    case 401:
    case 403:
    case 404:
      return Object.freeze({ status: "rejected" });
    case 503:
      return Object.freeze({ status: "unavailable" });
    default:
      return Object.freeze({ status: "failed" });
  }
};

export const readFastifyErrorCode = (error: unknown): string | undefined => {
  if (typeof error !== "object" || error === null || Array.isArray(error)) {
    return undefined;
  }

  const code = (error as Readonly<Record<string, unknown>>).code;
  return typeof code === "string" ? code : undefined;
};

export const classifyMetaWebhookParserFailure = (
  errorCode: string | undefined,
): ClassifiedMetaWebhookFailure => {
  const statusCode =
    errorCode === "FST_ERR_CTP_BODY_TOO_LARGE"
      ? 413
      : errorCode === "FST_ERR_CTP_INVALID_MEDIA_TYPE"
        ? 415
        : 500;
  return Object.freeze({
    error: new MetaWebhookHttpError(
      statusCode === 500 ? "META_WEBHOOK_PARSER_FAILED" : "META_WEBHOOK_ENVELOPE_REJECTED",
      statusCode === 500 ? "internal" : "validation",
      statusCode,
    ),
    statusCode,
  });
};

const recordFailure = (
  input: MetaWebhookRouteInput,
  operation: string,
  startedAt: number,
  failure: ClassifiedMetaWebhookFailure,
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

const sendFailure = (reply: FastifyReply, failure: ClassifiedMetaWebhookFailure): void => {
  if (failure.statusCode === 503) {
    reply.header("retry-after", "1");
  }

  reply.code(failure.statusCode).send(responseForMetaWebhookFailure(failure.statusCode));
};

const requireEndpointKey = (request: FastifyRequest): string => {
  const params = request.params;
  const endpointKey =
    typeof params === "object" && params !== null && !Array.isArray(params)
      ? parseMetaEndpointKey((params as Readonly<Record<string, unknown>>).endpointKey)
      : undefined;

  if (endpointKey === undefined) {
    throw new MetaWebhookHttpError("META_WEBHOOK_ENDPOINT_INVALID", "validation", 404);
  }

  return endpointKey;
};

const handleChallenge = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: MetaWebhookRouteInput,
): Promise<void> => {
  const scope = createCorrelationScope();
  const operation = webhookOperation("challenge");

  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);

    try {
      const endpointKey = requireEndpointKey(request);
      const challenge = parseMetaChallengeQuery(request.query);
      if (challenge === undefined) {
        throw new MetaWebhookHttpError("META_WEBHOOK_CHALLENGE_INVALID", "validation", 400);
      }

      const result = await input.rpcClient.acceptChallenge({
        endpointKey,
        mode: challenge.mode,
        verifyToken: challenge.verifyToken,
        requestId: scope.identifiers.requestId,
        traceId: scope.identifiers.traceId,
      });

      input.metrics.recordCompleted({
        operation,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("meta.webhook.challenge.accepted", "succeeded", {
        organization_id: result.organizationId,
        meta_application_id: result.metaApplicationId,
        webhook_endpoint_id: result.webhookEndpointId,
        credential_version_id: result.credentialVersionId,
      });

      reply.type("text/plain; charset=utf-8").code(200).send(challenge.challenge);
    } catch (error) {
      const failure = classifyMetaWebhookFailure(error);
      recordFailure(input, operation, startedAt, failure);
      sendFailure(reply, failure);
    }
  });
};

const handleDelivery = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: MetaWebhookRouteInput,
): Promise<void> => {
  const scope = createCorrelationScope();
  const operation = webhookOperation("delivery");

  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);

    try {
      const endpointKey = requireEndpointKey(request);
      const signatureHex = parseMetaSignatureHeader(request.headers["x-hub-signature-256"]);
      if (signatureHex === undefined) {
        throw new MetaWebhookHttpError("META_WEBHOOK_SIGNATURE_MISSING", "authentication", 401);
      }
      if (!Buffer.isBuffer(request.body)) {
        throw new MetaWebhookHttpError("META_WEBHOOK_BODY_INVALID", "validation", 400);
      }

      const result = await input.rpcClient.ingestDelivery({
        endpointKey,
        rawBody: request.body,
        signatureHex,
        requestId: scope.identifiers.requestId,
        traceId: scope.identifiers.traceId,
      });

      input.metrics.recordCompleted({
        operation,
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
      input.logger.info("meta.webhook.delivery.accepted", "succeeded", {
        organization_id: result.organizationId,
        meta_application_id: result.metaApplicationId,
        webhook_endpoint_id: result.webhookEndpointId,
        credential_version_id: result.credentialVersionId,
        delivery_id: result.deliveryId,
        provider_object_type: result.providerObjectType,
        replayed: result.replayed,
        delivery_count: result.deliveryCount,
        delivery_status: result.deliveryStatus,
      });

      reply.type("text/plain; charset=utf-8").code(200).send("EVENT_RECEIVED");
    } catch (error) {
      const failure = classifyMetaWebhookFailure(error);
      recordFailure(input, operation, startedAt, failure);
      sendFailure(reply, failure);
    }
  });
};

export function registerMetaWebhookRoutes(
  application: FastifyInstance,
  input: MetaWebhookRouteInput,
): void {
  const plugin: FastifyPluginCallback = (scope, _options, done) => {
    scope.addContentTypeParser(
      "application/json",
      { parseAs: "buffer", bodyLimit: input.maximumBodyBytes },
      (_request, body, parserDone) => {
        parserDone(null, body);
      },
    );
    scope.addHook("onSend", (_request, reply, payload, hookDone) => {
      reply.header("cache-control", "no-store");
      reply.header("x-content-type-options", "nosniff");
      hookDone(null, payload);
    });
    scope.setErrorHandler((error, _request, reply) => {
      const startedAt = performance.now();
      const operation = webhookOperation("delivery");
      input.metrics.recordStarted(operation);
      const failure = classifyMetaWebhookParserFailure(readFastifyErrorCode(error));
      recordFailure(input, operation, startedAt, failure);
      sendFailure(reply, failure);
    });
    scope.get("/webhooks/meta/:endpointKey", (request, reply) =>
      handleChallenge(request, reply, input),
    );
    scope.post(
      "/webhooks/meta/:endpointKey",
      { bodyLimit: input.maximumBodyBytes },
      (request, reply) => handleDelivery(request, reply, input),
    );
    done();
  };

  application.register(plugin);
}
