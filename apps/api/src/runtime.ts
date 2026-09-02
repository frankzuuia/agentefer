import { parseApiEnvironment, type RawEnvironment } from "@agentefer/config";
import {
  createOperationalMetrics,
  createReadinessState,
  createStructuredLogger,
} from "@agentefer/observability";

import { createAdminCatalogGateway } from "./admin-catalog-gateway.js";
import { createAdminMetaGateway } from "./admin-meta-gateway.js";
import { buildApi } from "./app.js";
import { createFacebookOAuthGraph } from "./facebook-oauth-graph.js";
import { createFacebookOAuthRpc } from "./facebook-oauth-rpc.js";
import { createMetaGraphGateway } from "./meta-graph-gateway.js";
import { createMetaWebhookRpcClient } from "./meta-webhook-rpc.js";

export type ApiTerminationSignal = "SIGINT" | "SIGTERM";

export interface ApiRuntime {
  readonly shutdown: (signal: ApiTerminationSignal) => Promise<void>;
}

export async function startApi(environment: RawEnvironment): Promise<ApiRuntime> {
  const configuration = parseApiEnvironment(environment);
  const logger = createStructuredLogger({
    component: "api",
    environment: configuration.runtime.environment,
    level: configuration.runtime.logLevel,
  });
  const metrics = createOperationalMetrics({ component: "api" });
  const readiness = createReadinessState();
  const adminMetaGateway = createAdminMetaGateway({
    supabaseUrl: configuration.supabase.url,
    publishableKey: configuration.supabase.publishableKey,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const adminCatalogGateway = createAdminCatalogGateway({
    supabaseUrl: configuration.supabase.url,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const metaWebhookRpcClient = createMetaWebhookRpcClient({
    supabaseUrl: configuration.supabase.url,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const metaGraphGateway = createMetaGraphGateway({
    baseUrl: "https://graph.facebook.com",
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const facebookOAuthGraph = createFacebookOAuthGraph({
    graphBaseUrl: "https://graph.facebook.com",
    dialogBaseUrl: "https://www.facebook.com",
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const facebookOAuthRpc = createFacebookOAuthRpc({
    supabaseUrl: configuration.supabase.url,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const application = buildApi({
    readiness,
    logger,
    metrics,
    adminCatalogGateway,
    adminMetaGateway,
    metaGraphGateway,
    facebookOAuthGraph,
    facebookOAuthRpc,
    apiPublicUrl: configuration.server.publicUrl,
    supabaseUrl: configuration.supabase.url,
    supabasePublishableKey: configuration.supabase.publishableKey,
    metaWebhookRpcClient,
    metaWebhookMaximumBodyBytes: configuration.metaWebhook.maximumBodyBytes,
  });
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: ApiTerminationSignal): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("api.shutdown.started", "started", { signal });
      await application.close();
      logger.info("api.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

  try {
    await application.listen({
      host: configuration.server.host,
      port: configuration.server.port,
    });
    readiness.markReady();
    logger.info("api.runtime.started", "succeeded", {
      port: configuration.server.port,
    });
  } catch (error) {
    readiness.markNotReady();
    logger.error("api.runtime.start_failed", error);
    await application.close();
    throw error;
  }

  return Object.freeze({ shutdown });
}
