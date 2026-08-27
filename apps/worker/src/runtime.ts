import { randomUUID } from "node:crypto";

import { createCognitiveProviderRegistry } from "@agentefer/ai";
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
import { createWhatsAppAiProcessor } from "./whatsapp-ai-processor.js";
import { createWhatsAppAiRpcClient } from "./whatsapp-ai-rpc.js";
import { createWhatsAppGraphClient } from "./whatsapp-graph.js";

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
  let metaInboundOperational = !configuration.metaInbound.enabled;
  let whatsappAiOperational = !configuration.whatsappAi.enabled;
  const synchronizeReadiness = (): void => {
    if (metaInboundOperational && whatsappAiOperational) {
      readiness.markReady();
    } else {
      readiness.markNotReady();
    }
  };
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
          metaInboundOperational = operational;
          synchronizeReadiness();
        },
      })
    : undefined;
  const whatsappAiProcessor = configuration.whatsappAi.enabled
    ? createWhatsAppAiProcessor({
        configuration: {
          workerId: `whatsapp-ai-${randomUUID()}`,
          pollIntervalMilliseconds: configuration.whatsappAi.pollIntervalMilliseconds,
          leaseSeconds: configuration.whatsappAi.leaseSeconds,
          maxAttempts: configuration.whatsappAi.maxAttempts,
          retryDelaySeconds: configuration.whatsappAi.retryDelaySeconds,
          batchSize: configuration.whatsappAi.batchSize,
          turnTimeoutMilliseconds: configuration.ai.limits.turnTimeoutMs,
          model: configuration.ai.model,
          visionModel: configuration.ai.visionModel,
          ...(configuration.ai.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: configuration.ai.reasoningEffort }),
        },
        providers: createCognitiveProviderRegistry({
          ...(configuration.ai.credentials.openaiApiKey === undefined
            ? {}
            : {
                openai: {
                  apiKey: configuration.ai.credentials.openaiApiKey,
                  ...(configuration.ai.endpoints.openai === undefined
                    ? {}
                    : { baseUrl: configuration.ai.endpoints.openai }),
                },
              }),
          ...(configuration.ai.credentials.minimaxApiKey === undefined
            ? {}
            : {
                minimax: {
                  apiKey: configuration.ai.credentials.minimaxApiKey,
                  ...(configuration.ai.endpoints.minimax === undefined
                    ? {}
                    : { baseUrl: configuration.ai.endpoints.minimax }),
                },
              }),
        }),
        rpcClient: createWhatsAppAiRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.whatsappAi.rpcTimeoutMilliseconds,
        }),
        graphClient: createWhatsAppGraphClient(),
        logger,
        metrics,
        onOperationalStateChange(operational) {
          whatsappAiOperational = operational;
          synchronizeReadiness();
        },
      })
    : undefined;
  let shutdownPromise: Promise<void> | undefined;

  const shutdown = (signal: WorkerTerminationSignal): Promise<void> => {
    shutdownPromise ??= (async () => {
      readiness.markNotReady();
      logger.info("worker.shutdown.started", "started", { signal });
      await whatsappAiProcessor?.stop();
      await metaInboundProcessor?.stop();
      await closeWorkerHealthServer(healthServer);
      logger.info("worker.shutdown.completed", "succeeded", { signal });
    })();

    return shutdownPromise;
  };

  try {
    await listenWorkerHealthServer(healthServer, configuration.health);
    metaInboundOperational =
      metaInboundProcessor === undefined ? true : await metaInboundProcessor.start();
    whatsappAiOperational =
      whatsappAiProcessor === undefined ? true : await whatsappAiProcessor.start();
    synchronizeReadiness();
    logger.info("worker.runtime.started", "succeeded", {
      health_port: configuration.health.port,
      meta_inbound_enabled: configuration.metaInbound.enabled,
      meta_inbound_operational: metaInboundOperational,
      whatsapp_ai_enabled: configuration.whatsappAi.enabled,
      whatsapp_ai_operational: whatsappAiOperational,
      ai_provider: configuration.ai.model.provider,
      ai_model: configuration.ai.model.model,
    });
  } catch (error) {
    readiness.markNotReady();
    logger.error("worker.runtime.start_failed", error);
    await whatsappAiProcessor?.stop();
    await metaInboundProcessor?.stop();
    if (healthServer.listening) {
      await closeWorkerHealthServer(healthServer);
    }
    throw error;
  }

  return Object.freeze({ shutdown });
}
