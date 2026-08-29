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
import { createFacebookPageClient } from "./facebook-page.js";
import { createFacebookPublicationProcessor } from "./facebook-publication-processor.js";
import { createFacebookPublicationRpcClient } from "./facebook-publication-rpc.js";
import { createMediaIngestProcessor } from "./media-ingest-processor.js";
import { createMediaIngestRpcClient } from "./media-ingest-rpc.js";
import { createMediaStorageClient } from "./media-storage.js";
import { createMetaInboundProcessor } from "./meta-inbound-processor.js";
import { createMetaInboundRpcClient } from "./meta-inbound-rpc.js";
import { createPublicationNotificationProcessor } from "./publication-notification-processor.js";
import { createWhatsAppAiProcessor } from "./whatsapp-ai-processor.js";
import { createWhatsAppAiRpcClient } from "./whatsapp-ai-rpc.js";
import { createWhatsAppGraphClient } from "./whatsapp-graph.js";
import { createWhatsAppMediaClient } from "./whatsapp-media.js";

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
  let mediaIngestOperational = !configuration.whatsappAi.enabled;
  let whatsappAiOperational = !configuration.whatsappAi.enabled;
  let facebookPublicationOperational = !configuration.facebookPublication.enabled;
  let publicationNotificationOperational = !configuration.facebookPublication.enabled;
  const synchronizeReadiness = (): void => {
    if (
      metaInboundOperational &&
      mediaIngestOperational &&
      whatsappAiOperational &&
      facebookPublicationOperational &&
      publicationNotificationOperational
    ) {
      readiness.markReady();
    } else {
      readiness.markNotReady();
    }
  };
  const mediaStorageClient = createMediaStorageClient({
    supabaseUrl: configuration.supabase.url,
    secretKey: configuration.supabase.secretKey,
    timeoutMilliseconds: configuration.whatsappAi.rpcTimeoutMilliseconds,
    maximumDownloadBytes: 5_242_880,
  });
  const providers = createCognitiveProviderRegistry({
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
  });
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
  const mediaIngestProcessor = configuration.whatsappAi.enabled
    ? createMediaIngestProcessor({
        configuration: {
          workerId: `media-ingest-${randomUUID()}`,
          pollIntervalMilliseconds: configuration.whatsappAi.pollIntervalMilliseconds,
          leaseSeconds: configuration.whatsappAi.leaseSeconds,
          maxAttempts: configuration.whatsappAi.maxAttempts,
          retryDelaySeconds: configuration.whatsappAi.retryDelaySeconds,
          batchSize: configuration.whatsappAi.batchSize,
        },
        rpcClient: createMediaIngestRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.whatsappAi.rpcTimeoutMilliseconds,
        }),
        mediaClient: createWhatsAppMediaClient(
          "https://graph.facebook.com/",
          configuration.whatsappAi.rpcTimeoutMilliseconds,
        ),
        storageClient: mediaStorageClient,
        logger,
        metrics,
        onOperationalStateChange(operational) {
          mediaIngestOperational = operational;
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
        providers,
        rpcClient: createWhatsAppAiRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.whatsappAi.rpcTimeoutMilliseconds,
        }),
        mediaStorageClient,
        graphClient: createWhatsAppGraphClient(),
        logger,
        metrics,
        onOperationalStateChange(operational) {
          whatsappAiOperational = operational;
          synchronizeReadiness();
        },
      })
    : undefined;
  const facebookPublicationProcessor = configuration.facebookPublication.enabled
    ? createFacebookPublicationProcessor({
        configuration: {
          workerId: `facebook-publication-${randomUUID()}`,
          supabaseUrl: configuration.supabase.url,
          pollIntervalMilliseconds: configuration.facebookPublication.pollIntervalMilliseconds,
          leaseSeconds: configuration.facebookPublication.leaseSeconds,
          retryDelaySeconds: configuration.facebookPublication.retryDelaySeconds,
          batchSize: configuration.facebookPublication.batchSize,
        },
        rpcClient: createFacebookPublicationRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.facebookPublication.rpcTimeoutMilliseconds,
        }),
        pageClient: createFacebookPageClient(),
        logger,
        metrics,
        onOperationalStateChange(operational) {
          facebookPublicationOperational = operational;
          synchronizeReadiness();
        },
      })
    : undefined;
  const publicationNotificationProcessor = configuration.facebookPublication.enabled
    ? createPublicationNotificationProcessor({
        configuration: {
          workerId: `facebook-publication-summary-${randomUUID()}`,
          pollIntervalMilliseconds: configuration.facebookPublication.pollIntervalMilliseconds,
          leaseSeconds: configuration.whatsappAi.leaseSeconds,
          retryDelaySeconds: configuration.facebookPublication.retryDelaySeconds,
          batchSize: configuration.facebookPublication.batchSize,
          turnTimeoutMilliseconds: configuration.ai.limits.turnTimeoutMs,
          maxContinuationRounds: configuration.ai.limits.maxToolRounds,
        },
        providers,
        rpcClient: createFacebookPublicationRpcClient({
          supabaseUrl: configuration.supabase.url,
          secretKey: configuration.supabase.secretKey,
          timeoutMilliseconds: configuration.facebookPublication.rpcTimeoutMilliseconds,
        }),
        logger,
        metrics,
        onOperationalStateChange(operational) {
          publicationNotificationOperational = operational;
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
      await publicationNotificationProcessor?.stop();
      await facebookPublicationProcessor?.stop();
      await mediaIngestProcessor?.stop();
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
    mediaIngestOperational =
      mediaIngestProcessor === undefined ? true : await mediaIngestProcessor.start();
    whatsappAiOperational =
      whatsappAiProcessor === undefined ? true : await whatsappAiProcessor.start();
    facebookPublicationOperational =
      facebookPublicationProcessor === undefined
        ? true
        : await facebookPublicationProcessor.start();
    publicationNotificationOperational =
      publicationNotificationProcessor === undefined
        ? true
        : await publicationNotificationProcessor.start();
    synchronizeReadiness();
    logger.info("worker.runtime.started", "succeeded", {
      health_port: configuration.health.port,
      meta_inbound_enabled: configuration.metaInbound.enabled,
      meta_inbound_operational: metaInboundOperational,
      media_ingest_enabled: mediaIngestProcessor !== undefined,
      media_ingest_operational: mediaIngestOperational,
      whatsapp_ai_enabled: configuration.whatsappAi.enabled,
      whatsapp_ai_operational: whatsappAiOperational,
      facebook_publication_enabled: configuration.facebookPublication.enabled,
      facebook_publication_operational: facebookPublicationOperational,
      publication_notification_operational: publicationNotificationOperational,
      ai_provider: configuration.ai.model.provider,
      ai_model: configuration.ai.model.model,
    });
  } catch (error) {
    readiness.markNotReady();
    logger.error("worker.runtime.start_failed", error);
    await whatsappAiProcessor?.stop();
    await publicationNotificationProcessor?.stop();
    await facebookPublicationProcessor?.stop();
    await mediaIngestProcessor?.stop();
    await metaInboundProcessor?.stop();
    if (healthServer.listening) {
      await closeWorkerHealthServer(healthServer);
    }
    throw error;
  }

  return Object.freeze({ shutdown });
}
