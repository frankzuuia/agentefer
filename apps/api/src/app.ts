import Fastify, { type FastifyInstance } from "fastify";

import {
  type OperationalMetrics,
  type ReadinessState,
  type StructuredLogger,
} from "@agentefer/observability";

import { registerHealthRoutes } from "./health.js";
import { registerMetaWebhookRoutes } from "./meta-webhook-routes.js";
import { type MetaWebhookRpcClient } from "./meta-webhook-rpc.js";

export interface BuildApiInput {
  readonly readiness: ReadinessState;
  readonly logger: StructuredLogger;
  readonly metrics: OperationalMetrics;
  readonly metaWebhookRpcClient: MetaWebhookRpcClient;
  readonly metaWebhookMaximumBodyBytes: number;
}

export function buildApi(input: BuildApiInput): FastifyInstance {
  const application = Fastify({
    logger: false,
    trustProxy: false,
    bodyLimit: input.metaWebhookMaximumBodyBytes,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5_000,
    requestTimeout: 15_000,
    forceCloseConnections: "idle",
    return503OnClosing: true,
  });

  registerHealthRoutes(application, input.readiness);
  registerMetaWebhookRoutes(application, {
    rpcClient: input.metaWebhookRpcClient,
    logger: input.logger,
    metrics: input.metrics,
    maximumBodyBytes: input.metaWebhookMaximumBodyBytes,
  });
  return application;
}
