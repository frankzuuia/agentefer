import { createStructuredLogger } from "@agentefer/observability";

import { startApi, type ApiTerminationSignal } from "./runtime.js";

const bootstrapLogger = createStructuredLogger({ component: "api" });

function registerSignalHandler(signal: ApiTerminationSignal, shutdown: () => Promise<void>): void {
  process.once(signal, () => {
    void shutdown().catch((error: unknown) => {
      logger.error("api.shutdown.failed", error, { signal });
      process.exitCode = 1;
    });
  });
}

const logger = bootstrapLogger;

export const apiRuntimePromise = startApi(process.env)
  .then((runtime) => {
    registerSignalHandler("SIGINT", () => runtime.shutdown("SIGINT"));
    registerSignalHandler("SIGTERM", () => runtime.shutdown("SIGTERM"));
    return runtime;
  })
  .catch((error: unknown) => {
    logger.error("api.bootstrap.failed", error);
    process.exitCode = 1;
    return undefined;
  });
