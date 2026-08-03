import { parseWorkerEnvironment } from "@agentefer/config";
import {
  createReadinessState,
  createStructuredLogger,
  type StructuredLogger,
} from "@agentefer/observability";

import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from "./health-server.js";

const bootstrapLogger = createStructuredLogger({ component: "worker" });

async function startWorker(): Promise<void> {
  const configuration = parseWorkerEnvironment(process.env);
  const logger = createStructuredLogger({
    component: "worker",
    environment: configuration.runtime.environment,
    level: configuration.runtime.logLevel,
  });
  const readiness = createReadinessState();
  const healthServer = createWorkerHealthServer({ readiness });
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: "SIGINT" | "SIGTERM"): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("worker.shutdown.started", "started", { signal });
      await closeWorkerHealthServer(healthServer);
      logger.info("worker.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

  registerSignalHandler("SIGINT", shutdown, logger);
  registerSignalHandler("SIGTERM", shutdown, logger);

  try {
    await listenWorkerHealthServer(healthServer, configuration.health);
    readiness.markReady();
    logger.info("worker.runtime.started", "succeeded", {
      health_port: configuration.health.port,
    });
  } catch (error) {
    readiness.markNotReady();
    logger.error("worker.runtime.start_failed", error);
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
      logger.error("worker.shutdown.failed", error, { signal });
      process.exitCode = 1;
    });
  });
}

void startWorker().catch((error: unknown) => {
  bootstrapLogger.error("worker.bootstrap.failed", error);
  process.exitCode = 1;
});
