import { parseWorkerEnvironment, type RawEnvironment } from "@agentefer/config";
import { createReadinessState, createStructuredLogger } from "@agentefer/observability";

import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from "./health-server.js";

export type WorkerTerminationSignal = "SIGINT" | "SIGTERM";

export interface WorkerRuntime {
  readonly shutdown: (signal: WorkerTerminationSignal) => Promise<void>;
}

export async function startWorker(environment: RawEnvironment): Promise<WorkerRuntime> {
  const configuration = parseWorkerEnvironment(environment);
  const logger = createStructuredLogger({
    component: "worker",
    environment: configuration.runtime.environment,
    level: configuration.runtime.logLevel,
  });
  const readiness = createReadinessState();
  const healthServer = createWorkerHealthServer({ readiness });
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: WorkerTerminationSignal): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("worker.shutdown.started", "started", { signal });
      await closeWorkerHealthServer(healthServer);
      logger.info("worker.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

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

  return Object.freeze({ shutdown });
}
