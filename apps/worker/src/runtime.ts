import { randomUUID } from "node:crypto";

import { parseWorkerEnvironment, type RawEnvironment } from "@agentefer/config";
import {
  createOperationalMetrics,
  createReadinessState,
  createStructuredLogger,
} from "@agentefer/observability";

import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from "./health-server.js";
import { createMetaInboundProcessor } from "./meta-inbound-processor.js";
import { createMetaInboundRpcClient } from "./meta-inbound-rpc.js";

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
  const metrics = createOperationalMetrics({ component: "worker" });
  const readiness = createReadinessState();
  const healthServer = createWorkerHealthServer({ readiness });
  const metaInboundProcessor = configuration.metaInbound.enabled
    ? createMetaInboundProcessor({
        configuration: {
          workerId: `worker-${randomUUID()}`,
          pollIntervalMilliseconds: configuration.metaInbound.pollIntervalMilliseconds,
          leaseSeconds: configuration.metaInbound.leaseSeconds,
          maxAttempts: configuration.metaInbound.maxAttempts,
          retryDelaySeconds: configuration.metaInbound.retryDelaySeconds,
          batchSize: configuration.metaInbound.batchSize,
        },
        rpcClient: createMetaInboundRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.metaInbound.rpcTimeoutMilliseconds,
        }),
        logger,
        metrics,
        onOperationalStateChange(operational) {
          if (operational) {
            readiness.markReady();
          } else {
            readiness.markNotReady();
          }
        },
      })
    : undefined;
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: WorkerTerminationSignal): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("worker.shutdown.started", "started", { signal });
      await metaInboundProcessor?.stop();
      await closeWorkerHealthServer(healthServer);
      logger.info("worker.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

  try {
    await listenWorkerHealthServer(healthServer, configuration.health);
    const metaInboundOperational =
      metaInboundProcessor === undefined ? true : await metaInboundProcessor.start();
    if (metaInboundOperational) {
      readiness.markReady();
    }
    logger.info("worker.runtime.started", "succeeded", {
      health_port: configuration.health.port,
      meta_inbound_enabled: configuration.metaInbound.enabled,
      meta_inbound_operational: metaInboundOperational,
    });
  } catch (error) {
    readiness.markNotReady();
    logger.error("worker.runtime.start_failed", error);
    await metaInboundProcessor?.stop();
    if (healthServer.listening) {
      await closeWorkerHealthServer(healthServer);
    }
    throw error;
  }

  return Object.freeze({ shutdown });
}
