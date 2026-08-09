import { createStructuredLogger } from "@agentefer/observability";

import { startWorker, type WorkerTerminationSignal } from "./runtime.js";

const bootstrapLogger = createStructuredLogger({ component: "worker" });

function registerSignalHandler(
  signal: WorkerTerminationSignal,
  shutdown: () => Promise<void>,
): void {
  process.once(signal, () => {
    void shutdown().catch((error: unknown) => {
      logger.error("worker.shutdown.failed", error, { signal });
      process.exitCode = 1;
    });
  });
}

const logger = bootstrapLogger;

void startWorker(process.env)
  .then((runtime) => {
    registerSignalHandler("SIGINT", () => runtime.shutdown("SIGINT"));
    registerSignalHandler("SIGTERM", () => runtime.shutdown("SIGTERM"));
  })
  .catch((error: unknown) => {
    logger.error("worker.bootstrap.failed", error);
    process.exitCode = 1;
  });
