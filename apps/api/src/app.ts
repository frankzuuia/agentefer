import Fastify, { type FastifyInstance } from "fastify";

import {
  type OperationalMetrics,
  type ReadinessState,
  type StructuredLogger,
} from "@agentefer/observability";

import { type AdminCatalogGateway } from "./admin-catalog-gateway.js";
import { registerAdminCatalogRoutes } from "./admin-catalog-routes.js";
import { type AdminMetaGateway } from "./admin-meta-gateway.js";
import { registerAdminMetaRoutes } from "./admin-meta-routes.js";
import { registerHealthRoutes } from "./health.js";
import { type MetaGraphGateway } from "./meta-graph-gateway.js";
import { registerMetaWebhookRoutes } from "./meta-webhook-routes.js";
import { type MetaWebhookRpcClient } from "./meta-webhook-rpc.js";

export interface BuildApiInput {
  readonly readiness: ReadinessState;
  readonly logger: StructuredLogger;
  readonly metrics: OperationalMetrics;
  readonly adminCatalogGateway: AdminCatalogGateway;
  readonly adminMetaGateway: AdminMetaGateway;
  readonly metaGraphGateway: MetaGraphGateway;
  readonly apiPublicUrl: string;
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
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
  registerAdminCatalogRoutes(application, {
    catalogGateway: input.adminCatalogGateway,
    identityGateway: input.adminMetaGateway,
    logger: input.logger,
    metrics: input.metrics,
    supabaseUrl: input.supabaseUrl,
    supabasePublishableKey: input.supabasePublishableKey,
  });
  registerAdminMetaRoutes(application, {
    gateway: input.adminMetaGateway,
    metaGraphGateway: input.metaGraphGateway,
    logger: input.logger,
    metrics: input.metrics,
    apiPublicUrl: input.apiPublicUrl,
    supabaseUrl: input.supabaseUrl,
    supabasePublishableKey: input.supabasePublishableKey,
  });
  registerMetaWebhookRoutes(application, {
    rpcClient: input.metaWebhookRpcClient,
    logger: input.logger,
    metrics: input.metrics,
    maximumBodyBytes: input.metaWebhookMaximumBodyBytes,
  });
  return application;
}
