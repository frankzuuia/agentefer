import { parseApiEnvironment, type RawEnvironment } from "@agentefer/config";
import { createReadinessState, createStructuredLogger } from "@agentefer/observability";

import { buildApi } from "./app.js";

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
  const readiness = createReadinessState();
  const application = buildApi({ readiness });
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
