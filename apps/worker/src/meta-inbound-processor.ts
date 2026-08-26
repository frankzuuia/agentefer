import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import {
  MetaInboundRpcError,
  type ClaimedMetaDelivery,
  type ClaimedWhatsAppMessage,
  type MetaInboundRpcClient,
} from "./meta-inbound-rpc.js";

export type MetaInboundProcessorConfiguration = Readonly<{
  workerId: string;
  pollIntervalMilliseconds: number;
  leaseSeconds: number;
  maxAttempts: number;
  retryDelaySeconds: number;
  batchSize: number;
}>;

export type MetaInboundCycleResult = Readonly<{
  deliveryCount: number;
  messageCount: number;
}>;

export type MetaInboundProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
}>;

export type CreateMetaInboundProcessorInput = Readonly<{
  configuration: MetaInboundProcessorConfiguration;
  rpcClient: MetaInboundRpcClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

export type MetaInboundFailureDisposition = Readonly<{
  errorCode: string;
  retryable: boolean;
  settleLease: boolean;
}>;

export const waitForPollInterval = (milliseconds: number, signal: AbortSignal): Promise<boolean> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve(false);
      return;
    }

    const finishAfterAbort = (): void => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finishAfterAbort);
      resolve(false);
    };
    const finishAfterInterval = (): void => {
      signal.removeEventListener("abort", finishAfterAbort);
      resolve(true);
    };
    const timer = setTimeout(finishAfterInterval, milliseconds);

    signal.addEventListener("abort", finishAfterAbort);
  });

export const classifyMetaInboundFailure = (
  error: unknown,
  invalidErrorCode: string,
): MetaInboundFailureDisposition => {
  if (error instanceof MetaInboundRpcError) {
    if (error.kind === "invalid") {
      return Object.freeze({
        errorCode: invalidErrorCode,
        retryable: false,
        settleLease: true,
      });
    }
    if (error.kind === "timeout") {
      return Object.freeze({
        errorCode: "dependency_timeout",
        retryable: true,
        settleLease: true,
      });
    }
    if (error.kind === "dependency") {
      return Object.freeze({
        errorCode: "dependency_unavailable",
        retryable: true,
        settleLease: true,
      });
    }
    return Object.freeze({
      errorCode: "worker_authority_unavailable",
      retryable: true,
      settleLease: false,
    });
  }

  return Object.freeze({
    errorCode: "worker_internal_failure",
    retryable: true,
    settleLease: true,
  });
};

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const recordFailure = (
  metrics: OperationalMetrics,
  operation: string,
  startedAt: number,
  error: unknown,
): void => {
  metrics.recordCompleted({
    operation,
    outcome: "failed",
    errorCategory: error instanceof MetaInboundRpcError ? error.category : "internal",
    durationMilliseconds: elapsedMilliseconds(startedAt),
  });
};

const claimDelivery = async (
  input: CreateMetaInboundProcessorInput,
  signal: AbortSignal,
): Promise<ClaimedMetaDelivery | undefined> => {
  const operation = "meta.delivery.claim";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  try {
    const claim = await input.rpcClient.claimDelivery({
      workerId: input.configuration.workerId,
      providerObjectType: "whatsapp_business_account",
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    return claim;
  } catch (error) {
    recordFailure(input.metrics, operation, startedAt, error);
    throw error;
  }
};

const settleDeliveryFailure = async (
  input: CreateMetaInboundProcessorInput,
  claim: ClaimedMetaDelivery,
  disposition: MetaInboundFailureDisposition,
  signal: AbortSignal,
): Promise<void> => {
  if (!disposition.settleLease) {
    throw new MetaInboundRpcError("rejected");
  }

  await input.rpcClient.failDelivery({
    deliveryId: claim.deliveryId,
    leaseToken: claim.leaseToken,
    errorCode: disposition.errorCode,
    retryable: disposition.retryable,
    retryDelaySeconds: input.configuration.retryDelaySeconds,
    maxAttempts: input.configuration.maxAttempts,
    signal,
  });
};

const processDelivery = async (
  input: CreateMetaInboundProcessorInput,
  claim: ClaimedMetaDelivery,
  signal: AbortSignal,
): Promise<void> => {
  const operation = "meta.delivery.route";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  try {
    const result = await input.rpcClient.routeWhatsAppDelivery({
      deliveryId: claim.deliveryId,
      leaseToken: claim.leaseToken,
      signal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    input.logger.debug("worker.meta.delivery.routed", "succeeded", {
      delivery_id: result.deliveryId,
      delivery_status: result.status,
      inserted_event_count: result.insertedEventCount,
      replayed_event_count: result.replayedEventCount,
      ignored_change_count: result.ignoredChangeCount,
    });
  } catch (error) {
    recordFailure(input.metrics, operation, startedAt, error);
    input.logger.error("worker.meta.delivery.route_failed", error, {
      delivery_id: claim.deliveryId,
      attempt_number: claim.attemptNumber,
    });
    const disposition = classifyMetaInboundFailure(error, "invalid_whatsapp_delivery");
    await settleDeliveryFailure(input, claim, disposition, signal);
    if (disposition.retryable) {
      throw error;
    }
  }
};

const claimWhatsAppMessage = async (
  input: CreateMetaInboundProcessorInput,
  signal: AbortSignal,
): Promise<ClaimedWhatsAppMessage | undefined> => {
  const operation = "meta.whatsapp.message.claim";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  try {
    const claim = await input.rpcClient.claimWhatsAppMessage({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    return claim;
  } catch (error) {
    recordFailure(input.metrics, operation, startedAt, error);
    throw error;
  }
};

const settleMessageFailure = async (
  input: CreateMetaInboundProcessorInput,
  claim: ClaimedWhatsAppMessage,
  disposition: MetaInboundFailureDisposition,
  signal: AbortSignal,
): Promise<void> => {
  if (!disposition.settleLease) {
    throw new MetaInboundRpcError("rejected");
  }

  await input.rpcClient.failWhatsAppMessage({
    inboundEventId: claim.inboundEventId,
    leaseToken: claim.leaseToken,
    errorCode: disposition.errorCode,
    retryable: disposition.retryable,
    retryDelaySeconds: input.configuration.retryDelaySeconds,
    maxAttempts: input.configuration.maxAttempts,
    signal,
  });
};

const processWhatsAppMessage = async (
  input: CreateMetaInboundProcessorInput,
  claim: ClaimedWhatsAppMessage,
  signal: AbortSignal,
): Promise<void> => {
  const operation = "meta.whatsapp.message.normalize";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  try {
    const result = await input.rpcClient.normalizeWhatsAppMessage({
      inboundEventId: claim.inboundEventId,
      leaseToken: claim.leaseToken,
      signal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    input.logger.debug("worker.meta.whatsapp.message.normalized", "succeeded", {
      inbound_event_id: result.inboundEventId,
      channel_identity_id: result.channelIdentityId,
      conversation_id: result.conversationId,
      domain_record_id: result.messageId,
      inbound_kind: result.contentKind,
      principal_type: result.principalType,
      was_replayed: result.wasReplayed,
    });
  } catch (error) {
    recordFailure(input.metrics, operation, startedAt, error);
    input.logger.error("worker.meta.whatsapp.message.normalize_failed", error, {
      inbound_event_id: claim.inboundEventId,
      channel_connection_id: claim.channelConnectionId,
      attempt_number: claim.attemptNumber,
    });
    const disposition = classifyMetaInboundFailure(error, "invalid_whatsapp_message");
    await settleMessageFailure(input, claim, disposition, signal);
    if (disposition.retryable) {
      throw error;
    }
  }
};

export async function drainMetaInboundOnce(
  input: CreateMetaInboundProcessorInput,
  signal: AbortSignal,
): Promise<MetaInboundCycleResult> {
  let deliveryCount = 0;
  let messageCount = 0;

  while (deliveryCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await claimDelivery(input, signal);
    if (claim === undefined) {
      break;
    }
    await processDelivery(input, claim, signal);
    deliveryCount += 1;
  }

  while (messageCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await claimWhatsAppMessage(input, signal);
    if (claim === undefined) {
      break;
    }
    await processWhatsAppMessage(input, claim, signal);
    messageCount += 1;
  }

  return Object.freeze({ deliveryCount, messageCount });
}

export function createMetaInboundProcessor(
  input: CreateMetaInboundProcessorInput,
): MetaInboundProcessor {
  const controller = new AbortController();
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const operation = "meta.inbound.cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      const result = await drainMetaInboundOnce(input, controller.signal);
      const outcome = controller.signal.aborted ? "cancelled" : "succeeded";
      input.metrics.recordCompleted({
        operation,
        outcome,
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (!controller.signal.aborted) {
        input.logger.debug("worker.meta.inbound.cycle_completed", "succeeded", {
          delivery_count: result.deliveryCount,
          normalized_event_count: result.messageCount,
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
      recordFailure(input.metrics, operation, startedAt, error);
      input.logger.error("worker.meta.inbound.cycle_failed", error);
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
      const operational = await executeCycle();
      input.onOperationalStateChange(operational);
    }
  };

  return Object.freeze({
    async start() {
      if (started) {
        throw new TypeError("Meta inbound processor cannot be started twice");
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
