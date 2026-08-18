import { parseApiEnvironment, type RawEnvironment } from "@agentefer/config";
import {
  createOperationalMetrics,
  createReadinessState,
  createStructuredLogger,
} from "@agentefer/observability";

import { buildApi } from "./app.js";
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
  const metaWebhookRpcClient = createMetaWebhookRpcClient({
    supabaseUrl: configuration.supabase.url,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.metaWebhook.rpcTimeoutMilliseconds,
  });
  const application = buildApi({
    readiness,
    logger,
    metrics,
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
