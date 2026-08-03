import { parseApiEnvironment } from "@agentefer/config";
import {
  createReadinessState,
  createStructuredLogger,
  type StructuredLogger,
} from "@agentefer/observability";

import { buildApi } from "./app.js";

const bootstrapLogger = createStructuredLogger({ component: "api" });

async function startApi(): Promise<void> {
  const configuration = parseApiEnvironment(process.env);
  const logger = createStructuredLogger({
    component: "api",
    environment: configuration.runtime.environment,
    level: configuration.runtime.logLevel,
  });
  const readiness = createReadinessState();
  const application = buildApi({ readiness });
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("api.shutdown.started", "started", { signal });
      await application.close();
      logger.info("api.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

  registerSignalHandler("SIGINT", shutdown, logger);
  registerSignalHandler("SIGTERM", shutdown, logger);

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
}

function registerSignalHandler(
  signal: "SIGINT" | "SIGTERM",
  shutdown: (receivedSignal: "SIGINT" | "SIGTERM") => Promise<void>,
  logger: StructuredLogger,
): void {
  process.once(signal, () => {
    void shutdown(signal).catch((error: unknown) => {
      logger.error("api.shutdown.failed", error, { signal });
      process.exitCode = 1;
    });
  });
}

void startApi().catch((error: unknown) => {
  bootstrapLogger.error("api.bootstrap.failed", error);
  process.exitCode = 1;
});
