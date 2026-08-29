import {
  CognitiveProviderError,
  type CognitiveProvider,
  type CognitiveTurnResult,
} from "@agentefer/ai";
import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import {
  type ClaimedPublicationBatchNotification,
  type FacebookPublicationRpcClient,
} from "./facebook-publication-rpc.js";
import { waitForPollInterval } from "./meta-inbound-processor.js";

const MAXIMUM_WHATSAPP_SUMMARY_CHARACTERS = 4_000;
const SUMMARY_TASK = Object.freeze({
  purpose: "publication_batch_terminal_summary",
  audience: "store_owner",
  requirements: Object.freeze([
    "Reporta que el lote de publicaciones de Facebook terminó.",
    "Resume resultados reales únicamente a partir de summary_payload.",
    "Incluye totales de éxitos, fallos, bloqueos o resultados inciertos cuando existan.",
    "Aclara qué casos admiten reintento y cuáles requieren conciliación cuando el payload lo indique.",
    "No inventes publicaciones, precios, productos, causas ni tiempos.",
    "Entrega un solo mensaje claro para WhatsApp y no excedas 4000 caracteres.",
  ]),
});

export type PublicationNotificationProcessorConfiguration = Readonly<{
  workerId: string;
  pollIntervalMilliseconds: number;
  leaseSeconds: number;
  retryDelaySeconds: number;
  batchSize: number;
  turnTimeoutMilliseconds: number;
  maxContinuationRounds: number;
}>;

export type PublicationNotificationCycleResult = Readonly<{
  notificationCount: number;
}>;

export type PublicationNotificationProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
}>;

export type CreatePublicationNotificationProcessorInput = Readonly<{
  configuration: PublicationNotificationProcessorConfiguration;
  providers: ReadonlyMap<string, CognitiveProvider>;
  rpcClient: FacebookPublicationRpcClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const retryAt = (retryDelaySeconds: number): string =>
  new Date(Date.now() + Math.max(1, retryDelaySeconds) * 1_000).toISOString();

const internalConversation = (
  claim: ClaimedPublicationBatchNotification,
): readonly Readonly<{
  direction: "inbound";
  contentKind: "text";
  content: Readonly<{ text: Readonly<{ body: string }> }>;
}>[] =>
  Object.freeze([
    Object.freeze({
      direction: "inbound" as const,
      contentKind: "text" as const,
      content: Object.freeze({
        text: Object.freeze({
          body: JSON.stringify({
            task: SUMMARY_TASK,
            summary_payload: claim.summaryPayload,
          }),
        }),
      }),
    }),
  ]);

const errorCode = (error: unknown, timedOut: boolean): string =>
  timedOut
    ? "publication_summary_provider_timeout"
    : error instanceof CognitiveProviderError
      ? error.code
      : "publication_summary_internal_failure";

const errorRetryable = (error: unknown, timedOut: boolean): boolean =>
  timedOut || !(error instanceof CognitiveProviderError) || error.retryable;

const failClaim = async (
  input: CreatePublicationNotificationProcessorInput,
  claim: ClaimedPublicationBatchNotification,
  failureCode: string,
  retryable: boolean,
  signal: AbortSignal,
): Promise<void> => {
  await input.rpcClient.failBatchNotification({
    claim,
    errorCode: failureCode,
    retryable,
    ...(retryable ? { retryAt: retryAt(input.configuration.retryDelaySeconds) } : {}),
    signal,
  });
};

const executeUntilTerminal = async (
  input: CreatePublicationNotificationProcessorInput,
  claim: ClaimedPublicationBatchNotification,
  provider: CognitiveProvider,
  signal: AbortSignal,
): Promise<CognitiveTurnResult> => {
  const continuationParts: string[] = [];
  for (let round = 0; round < input.configuration.maxContinuationRounds; round += 1) {
    const result = await provider.executeTurn({
      model: claim.model,
      systemPrompt: claim.systemPrompt,
      conversation: internalConversation(claim),
      continuationParts,
      ...(claim.reasoningEffort === undefined ? {} : { reasoningEffort: claim.reasoningEffort }),
      signal,
    });
    if (result.terminationReason !== "output_limit") {
      return Object.freeze({
        ...result,
        visibleText: `${continuationParts.join("")}${result.visibleText}`,
      });
    }
    if (result.visibleText.length > 0) {
      continuationParts.push(result.visibleText);
    }
  }
  throw new CognitiveProviderError({
    code: "publication_summary_continuation_ceiling_reached",
    retryable: true,
  });
};

const processClaim = async (
  input: CreatePublicationNotificationProcessorInput,
  claim: ClaimedPublicationBatchNotification,
  processorSignal: AbortSignal,
): Promise<void> => {
  const operation = "facebook.publication.summary";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  const provider = input.providers.get(claim.provider);
  if (provider === undefined) {
    await failClaim(
      input,
      claim,
      "publication_summary_provider_adapter_not_configured",
      false,
      processorSignal,
    );
    input.metrics.recordCompleted({
      operation,
      outcome: "failed",
      errorCategory: "dependency",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    return;
  }

  const timeoutSignal = AbortSignal.timeout(input.configuration.turnTimeoutMilliseconds);
  const turnSignal = AbortSignal.any([processorSignal, timeoutSignal]);
  try {
    const result = await executeUntilTerminal(input, claim, provider, turnSignal);
    if (result.terminationReason !== "completed") {
      await failClaim(
        input,
        claim,
        `publication_summary_${result.terminationReason}`,
        result.terminationReason !== "content_filter" && result.terminationReason !== "cancelled",
        processorSignal,
      );
      input.metrics.recordCompleted({
        operation,
        outcome: "failed",
        errorCategory: result.terminationReason === "content_filter" ? "validation" : "dependency",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      return;
    }

    const visibleText = result.visibleText.trim();
    if (visibleText.length < 1 || visibleText.length > MAXIMUM_WHATSAPP_SUMMARY_CHARACTERS) {
      await failClaim(
        input,
        claim,
        "publication_summary_visible_text_invalid",
        true,
        processorSignal,
      );
      input.metrics.recordCompleted({
        operation,
        outcome: "failed",
        errorCategory: "validation",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      return;
    }

    await input.rpcClient.completeBatchNotification({
      claim,
      visibleText,
      providerRequestId: result.providerRequestId,
      signal: processorSignal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    input.logger.info("worker.facebook.publication.summary_completed", "succeeded", {
      organization_id: claim.organizationId,
      publication_batch_id: claim.publicationBatchId,
      publication_batch_subscription_id: claim.subscriptionId,
      provider: claim.provider,
      model: claim.model,
      attempt_number: claim.attemptCount,
    });
  } catch (error) {
    if (processorSignal.aborted) {
      input.metrics.recordCompleted({
        operation,
        outcome: "cancelled",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
    } else {
      input.metrics.recordCompleted({
        operation,
        outcome: "failed",
        errorCategory: error instanceof CognitiveProviderError ? "dependency" : "internal",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
    }
    input.logger.error("worker.facebook.publication.summary_failed", error, {
      organization_id: claim.organizationId,
      publication_batch_id: claim.publicationBatchId,
      publication_batch_subscription_id: claim.subscriptionId,
      provider: claim.provider,
      model: claim.model,
      attempt_number: claim.attemptCount,
    });
    if (processorSignal.aborted) {
      return;
    }
    const timedOut = timeoutSignal.aborted;
    await failClaim(
      input,
      claim,
      errorCode(error, timedOut),
      errorRetryable(error, timedOut),
      processorSignal,
    );
  }
};

export async function drainPublicationNotificationsOnce(
  input: CreatePublicationNotificationProcessorInput,
  signal: AbortSignal,
): Promise<PublicationNotificationCycleResult> {
  let notificationCount = 0;
  while (notificationCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claimBatchNotification({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      signal,
    });
    if (claim === undefined) {
      break;
    }
    await processClaim(input, claim, signal);
    notificationCount += 1;
  }
  return Object.freeze({ notificationCount });
}

export function createPublicationNotificationProcessor(
  input: CreatePublicationNotificationProcessorInput,
): PublicationNotificationProcessor {
  const controller = new AbortController();
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const operation = "facebook.publication.summary_cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      const result = await drainPublicationNotificationsOnce(input, controller.signal);
      input.metrics.recordCompleted({
        operation,
        outcome: controller.signal.aborted ? "cancelled" : "succeeded",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (!controller.signal.aborted) {
        input.logger.debug("worker.facebook.publication.summary_cycle_completed", "succeeded", {
          notification_count: result.notificationCount,
        });
      }
      return !controller.signal.aborted;
    } catch (error) {
      if (controller.signal.aborted) {
        input.metrics.recordCompleted({
          operation,
          outcome: "cancelled",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
        return false;
      }
      input.metrics.recordCompleted({
        operation,
        outcome: "failed",
        errorCategory: "internal",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      input.logger.error("worker.facebook.publication.summary_cycle_failed", error);
      return false;
    }
  };

  const runLoop = async (): Promise<void> => {
    while (!controller.signal.aborted) {
      const intervalCompleted = await waitForPollInterval(
        input.configuration.pollIntervalMilliseconds,
        controller.signal,
      );
      if (!intervalCompleted) {
        break;
      }
      input.onOperationalStateChange(await executeCycle());
    }
  };

  return Object.freeze({
    async start() {
      if (started) {
        throw new TypeError("Publication notification processor cannot be started twice");
      }
      started = true;
      const operational = await executeCycle();
      input.onOperationalStateChange(operational);
      loopPromise = runLoop();
      return operational;
    },
    async stop() {
      controller.abort();
      await loopPromise;
    },
  });
}
