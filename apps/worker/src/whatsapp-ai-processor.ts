import {
  CognitiveProviderError,
  type CognitiveProvider,
  type CognitiveTurnResult,
} from "@agentefer/ai";
import { type ModelSelector } from "@agentefer/config";
import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import { waitForPollInterval } from "./meta-inbound-processor.js";
import {
  WhatsAppAiRpcError,
  type ClaimedAgentTurn,
  type ClaimedOutboxEvent,
  type WhatsAppAiRpcClient,
} from "./whatsapp-ai-rpc.js";
import { WhatsAppGraphError, type WhatsAppGraphClient } from "./whatsapp-graph.js";

export type WhatsAppAiProcessorConfiguration = Readonly<{
  workerId: string;
  pollIntervalMilliseconds: number;
  leaseSeconds: number;
  maxAttempts: number;
  retryDelaySeconds: number;
  batchSize: number;
  turnTimeoutMilliseconds: number;
  model: ModelSelector;
  visionModel: ModelSelector;
  reasoningEffort?: string;
}>;

export type WhatsAppAiCycleResult = Readonly<{
  turnCount: number;
  outboxCount: number;
}>;

export type WhatsAppAiProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
}>;

export type CreateWhatsAppAiProcessorInput = Readonly<{
  configuration: WhatsAppAiProcessorConfiguration;
  providers: ReadonlyMap<string, CognitiveProvider>;
  rpcClient: WhatsAppAiRpcClient;
  graphClient: WhatsAppGraphClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const recordFailure = (
  input: CreateWhatsAppAiProcessorInput,
  operation: string,
  startedAt: number,
  error: unknown,
): void => {
  const category =
    error instanceof CognitiveProviderError
      ? "dependency"
      : error instanceof WhatsAppAiRpcError || error instanceof WhatsAppGraphError
        ? error.category
        : "internal";
  input.metrics.recordCompleted({
    operation,
    outcome: "failed",
    errorCategory: category,
    durationMilliseconds: elapsedMilliseconds(startedAt),
  });
};

const settleTurnFailure = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedAgentTurn,
  errorCode: string,
  retryable: boolean,
  signal: AbortSignal,
  terminationReason: "provider_error" | "content_filter" | "cancelled" = "provider_error",
  providerRequestId?: string,
): Promise<void> => {
  await input.rpcClient.settleAgentFailure({
    claim,
    workerId: input.configuration.workerId,
    terminationReason,
    disposition: retryable ? "retry_provider" : "halt_safely",
    ...(providerRequestId === undefined ? {} : { providerRequestId }),
    errorCode,
    signal,
  });
};

const persistTurnResult = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedAgentTurn,
  result: CognitiveTurnResult,
  signal: AbortSignal,
): Promise<void> => {
  if (result.terminationReason === "completed") {
    const visibleText = result.visibleText.trim();
    if (visibleText.length === 0) {
      await settleTurnFailure(
        input,
        claim,
        "provider_visible_output_empty",
        true,
        signal,
        "provider_error",
        result.providerRequestId,
      );
      return;
    }
    await input.rpcClient.completeAgentTurn({
      claim,
      workerId: input.configuration.workerId,
      visibleText,
      providerRequestId: result.providerRequestId,
      responseMetadataSafe: result.metadataSafe,
      signal,
    });
    return;
  }

  if (result.terminationReason === "output_limit") {
    await input.rpcClient.checkpointAgentTurn({
      claim,
      workerId: input.configuration.workerId,
      partialText: result.visibleText,
      providerRequestId: result.providerRequestId,
      responseMetadataSafe: result.metadataSafe,
      signal,
    });
    return;
  }

  if (result.terminationReason === "content_filter") {
    await settleTurnFailure(
      input,
      claim,
      "provider_content_filter",
      false,
      signal,
      "content_filter",
      result.providerRequestId,
    );
    return;
  }

  const errorCode =
    result.terminationReason === "tool_calls"
      ? "unauthorized_provider_tool_call"
      : "provider_incomplete_response";
  await settleTurnFailure(
    input,
    claim,
    errorCode,
    result.terminationReason !== "tool_calls",
    signal,
    "provider_error",
    result.providerRequestId,
  );
};

const processAgentTurn = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedAgentTurn,
  processorSignal: AbortSignal,
): Promise<void> => {
  const operation = "whatsapp.ai.turn";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  const provider = input.providers.get(claim.provider);
  if (provider === undefined) {
    const error = new CognitiveProviderError({
      code: "provider_adapter_not_configured",
      retryable: false,
    });
    recordFailure(input, operation, startedAt, error);
    await settleTurnFailure(input, claim, error.code, false, processorSignal);
    return;
  }

  const timeoutSignal = AbortSignal.timeout(input.configuration.turnTimeoutMilliseconds);
  const turnSignal = AbortSignal.any([processorSignal, timeoutSignal]);
  try {
    const result = await provider.executeTurn({
      model: claim.model,
      systemPrompt: claim.systemPrompt,
      conversation: claim.conversationHistory,
      continuationParts: claim.continuationParts,
      ...(claim.reasoningEffort === undefined ? {} : { reasoningEffort: claim.reasoningEffort }),
      tools: [],
      signal: turnSignal,
    });
    await persistTurnResult(input, claim, result, processorSignal);
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    input.logger.info("worker.whatsapp.ai.turn_completed", "succeeded", {
      organization_id: claim.organizationId,
      agent_run_id: claim.agentRunId,
      provider: claim.provider,
      model: claim.model,
      termination_reason: result.terminationReason,
    });
  } catch (error) {
    recordFailure(input, operation, startedAt, error);
    input.logger.error("worker.whatsapp.ai.turn_failed", error, {
      organization_id: claim.organizationId,
      agent_run_id: claim.agentRunId,
      provider: claim.provider,
      model: claim.model,
      attempt_number: claim.attemptNumber,
    });
    if (processorSignal.aborted) {
      return;
    }
    const timedOut = timeoutSignal.aborted;
    const errorCode = timedOut
      ? "provider_turn_timeout"
      : error instanceof CognitiveProviderError
        ? error.code
        : "provider_turn_internal_failure";
    const retryable = timedOut || !(error instanceof CognitiveProviderError) || error.retryable;
    await settleTurnFailure(input, claim, errorCode, retryable, processorSignal);
  }
};

const settleOutboxFailure = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedOutboxEvent,
  error: unknown,
  signal: AbortSignal,
): Promise<void> => {
  const kind = error instanceof WhatsAppGraphError ? error.kind : "uncertain";
  const outcome =
    kind === "retryable" ? "retryable" : kind === "uncertain" ? "uncertain" : "failed";
  const errorCode =
    error instanceof WhatsAppGraphError ? error.code : "whatsapp_graph_internal_failure";
  await input.rpcClient.settleOutboxEvent({
    claim,
    workerId: input.configuration.workerId,
    outcome,
    errorCode,
    retryDelaySeconds: input.configuration.retryDelaySeconds,
    signal,
  });
};

const processOutboxEvent = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedOutboxEvent,
  signal: AbortSignal,
): Promise<void> => {
  const operation = "whatsapp.outbox.send";
  const startedAt = performance.now();
  input.metrics.recordStarted(operation);
  try {
    const result = await input.graphClient.sendMessage(claim, signal);
    await input.rpcClient.settleOutboxEvent({
      claim,
      workerId: input.configuration.workerId,
      outcome: "succeeded",
      providerMessageId: result.providerMessageId,
      retryDelaySeconds: input.configuration.retryDelaySeconds,
      signal,
    });
    input.metrics.recordCompleted({
      operation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(startedAt),
    });
    input.logger.info("worker.whatsapp.outbox.sent", "succeeded", {
      organization_id: claim.organizationId,
      outbox_event_id: claim.outboxEventId,
      attempt_number: claim.attemptNumber,
    });
  } catch (error) {
    recordFailure(input, operation, startedAt, error);
    input.logger.error("worker.whatsapp.outbox.send_failed", error, {
      organization_id: claim.organizationId,
      outbox_event_id: claim.outboxEventId,
      attempt_number: claim.attemptNumber,
    });
    if (signal.aborted) {
      return;
    }
    await settleOutboxFailure(input, claim, error, signal);
  }
};

export async function drainWhatsAppAiOnce(
  input: CreateWhatsAppAiProcessorInput,
  signal: AbortSignal,
): Promise<WhatsAppAiCycleResult> {
  let turnCount = 0;
  let outboxCount = 0;

  while (turnCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claimAgentTurn({
      workerId: input.configuration.workerId,
      model: input.configuration.model,
      visionModel: input.configuration.visionModel,
      ...(input.configuration.reasoningEffort === undefined
        ? {}
        : { reasoningEffort: input.configuration.reasoningEffort }),
      leaseSeconds: input.configuration.leaseSeconds,
      signal,
    });
    if (claim === undefined) {
      break;
    }
    await processAgentTurn(input, claim, signal);
    turnCount += 1;
  }

  while (outboxCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claimOutboxEvent({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    if (claim === undefined) {
      break;
    }
    await processOutboxEvent(input, claim, signal);
    outboxCount += 1;
  }

  return Object.freeze({ turnCount, outboxCount });
}

export function createWhatsAppAiProcessor(
  input: CreateWhatsAppAiProcessorInput,
): WhatsAppAiProcessor {
  const controller = new AbortController();
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const operation = "whatsapp.ai.cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      const result = await drainWhatsAppAiOnce(input, controller.signal);
      const outcome = controller.signal.aborted ? "cancelled" : "succeeded";
      input.metrics.recordCompleted({
        operation,
        outcome,
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (!controller.signal.aborted) {
        input.logger.debug("worker.whatsapp.ai.cycle_completed", "succeeded", {
          turn_count: result.turnCount,
          outbox_count: result.outboxCount,
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
      recordFailure(input, operation, startedAt, error);
      input.logger.error("worker.whatsapp.ai.cycle_failed", error);
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
        throw new TypeError("WhatsApp AI processor cannot be started twice");
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
