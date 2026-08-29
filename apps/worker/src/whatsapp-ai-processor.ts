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
import { type MediaStorageClient } from "./media-storage.js";
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
  recoveredTurnCount: number;
  uncertainRecoveryCount: number;
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
  mediaStorageClient: MediaStorageClient;
  graphClient: WhatsAppGraphClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isImageMedia = (item: ClaimedAgentTurn["conversationHistory"][number]): boolean => {
  if (item.contentKind !== "media" || !isRecord(item.content)) {
    return false;
  }
  return item.content.type === "image" || isRecord(item.content.image);
};

const conversationWithVisualInputs = async (
  input: CreateWhatsAppAiProcessorInput,
  claim: ClaimedAgentTurn,
  signal: AbortSignal,
): Promise<ClaimedAgentTurn["conversationHistory"]> => {
  const imageMessageIds = claim.conversationHistory
    .filter(isImageMedia)
    .map((item) => item.messageId);
  if (imageMessageIds.length === 0) {
    return claim.conversationHistory;
  }

  const visualInputs = await input.rpcClient.getMediaVisualInputs({
    claim,
    messageIds: imageMessageIds,
    workerId: input.configuration.workerId,
    signal,
  });
  const visualByMessageId = new Map(
    visualInputs.map((visualInput) => [visualInput.messageId, visualInput]),
  );
  if (
    visualByMessageId.size !== imageMessageIds.length ||
    imageMessageIds.some((id) => !visualByMessageId.has(id))
  ) {
    throw new CognitiveProviderError({
      code: "media_visual_input_missing",
      retryable: false,
    });
  }

  const signedUrls = new Map<string, string>();
  for (const visualInput of visualInputs) {
    const signedUrl = await input.mediaStorageClient.createSignedPrivateUrl(
      {
        organizationId: claim.organizationId,
        mediaAssetId: visualInput.mediaAssetId,
        renditionKind: "analysis_webp",
        contentSha256Hex: visualInput.analysisSha256Hex,
        mimeType: visualInput.mimeType,
      },
      300,
      signal,
    );
    signedUrls.set(visualInput.messageId, signedUrl.toString());
  }

  return Object.freeze(
    claim.conversationHistory.map((item) => {
      const signedUrl = signedUrls.get(item.messageId);
      return Object.freeze({
        messageId: item.messageId,
        direction: item.direction,
        contentKind: item.contentKind,
        content: item.content,
        ...(signedUrl === undefined
          ? {}
          : { imageInputs: Object.freeze([{ imageUrl: signedUrl, detail: "high" as const }]) }),
      });
    }),
  );
};

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const parseToolArguments = (argumentsJson: string): Readonly<Record<string, unknown>> => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(argumentsJson) as unknown;
  } catch (error) {
    throw new CognitiveProviderError({
      code: "provider_tool_arguments_invalid_json",
      retryable: false,
      cause: error,
    });
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new CognitiveProviderError({
      code: "provider_tool_arguments_not_object",
      retryable: false,
    });
  }
  return parsed as Readonly<Record<string, unknown>>;
};

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

const rpcFailureAttributes = (error: unknown): Readonly<Record<string, string | number>> => {
  if (!(error instanceof WhatsAppAiRpcError)) {
    return Object.freeze({});
  }
  return Object.freeze({
    rpc_failure_kind: error.kind,
    ...(error.operation === undefined ? {} : { rpc_operation: error.operation }),
    ...(error.phase === undefined ? {} : { rpc_failure_phase: error.phase }),
    ...(error.field === undefined ? {} : { rpc_response_field: error.field }),
    ...(error.status === undefined ? {} : { rpc_http_status: error.status }),
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
  if (result.terminationReason === "tool_calls") {
    const [toolCall] = result.toolCalls;
    if (
      toolCall === undefined ||
      result.toolCalls.length !== 1 ||
      result.toolContinuationState === undefined
    ) {
      await settleTurnFailure(
        input,
        claim,
        "provider_tool_continuation_invalid",
        false,
        signal,
        "provider_error",
        result.providerRequestId,
      );
      return;
    }
    await input.rpcClient.executeToolCall({
      claim,
      workerId: input.configuration.workerId,
      providerRequestId: result.providerRequestId,
      providerToolCallId: toolCall.id,
      toolName: toolCall.name,
      argumentsSafe: parseToolArguments(toolCall.argumentsJson),
      providerState: result.toolContinuationState,
      responseMetadataSafe: result.metadataSafe,
      signal,
    });
    return;
  }

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

  await settleTurnFailure(
    input,
    claim,
    "provider_incomplete_response",
    true,
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
    const conversation = await conversationWithVisualInputs(input, claim, turnSignal);
    const result = await provider.executeTurn({
      model: claim.model,
      systemPrompt: claim.systemPrompt,
      conversation: conversation.map((item) => {
        const { messageId, ...withoutMessageId } = item;
        void messageId;
        return withoutMessageId;
      }),
      continuationParts: claim.continuationParts,
      ...(claim.reasoningEffort === undefined ? {} : { reasoningEffort: claim.reasoningEffort }),
      tools: claim.toolDefinitions,
      toolHistory: claim.toolHistory,
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

const prepareWhatsAppAgentTools = async (
  input: CreateWhatsAppAiProcessorInput,
  signal: AbortSignal,
): Promise<void> => {
  const preparationOperation = "whatsapp.ai.tool_preparation";
  const preparationStartedAt = performance.now();
  input.metrics.recordStarted(preparationOperation);
  let preparation: Awaited<ReturnType<WhatsAppAiRpcClient["prepareAgentTools"]>>;
  try {
    preparation = await input.rpcClient.prepareAgentTools({ signal });
  } catch (error) {
    recordFailure(input, preparationOperation, preparationStartedAt, error);
    throw error;
  }
  if (preparation.organizationsFailed > 0) {
    input.metrics.recordCompleted({
      operation: preparationOperation,
      outcome: "failed",
      errorCategory: "dependency",
      durationMilliseconds: elapsedMilliseconds(preparationStartedAt),
    });
    input.logger.warn("worker.whatsapp.ai.tool_preparation_partial", "failed", {
      organizations_prepared: preparation.organizationsPrepared,
      organizations_failed: preparation.organizationsFailed,
    });
  } else {
    input.metrics.recordCompleted({
      operation: preparationOperation,
      outcome: "succeeded",
      durationMilliseconds: elapsedMilliseconds(preparationStartedAt),
    });
  }
};

export async function drainWhatsAppAiOnce(
  input: CreateWhatsAppAiProcessorInput,
  signal: AbortSignal,
  prepareTools = true,
): Promise<WhatsAppAiCycleResult> {
  let turnCount = 0;
  let outboxCount = 0;
  if (prepareTools) {
    await prepareWhatsAppAgentTools(input, signal);
  }
  const recovery = await input.rpcClient.recoverExpiredAgentTurns({
    workerId: input.configuration.workerId,
    retryDelaySeconds: input.configuration.retryDelaySeconds,
    limit: input.configuration.batchSize,
    signal,
  });

  if (recovery.recoveredCount > 0) {
    input.logger.warn("worker.whatsapp.ai.expired_turns_recovered", "succeeded", {
      scanned_count: recovery.scannedCount,
      recovered_count: recovery.recoveredCount,
      retryable_count: recovery.retryableCount,
      failed_count: recovery.failedCount,
      uncertain_count: recovery.uncertainCount,
    });
  }

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

  return Object.freeze({
    recoveredTurnCount: recovery.recoveredCount,
    uncertainRecoveryCount: recovery.uncertainCount,
    turnCount,
    outboxCount,
  });
}

export function createWhatsAppAiProcessor(
  input: CreateWhatsAppAiProcessorInput,
): WhatsAppAiProcessor {
  const controller = new AbortController();
  let started = false;
  let preparationPending = true;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const operation = "whatsapp.ai.cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      if (preparationPending) {
        await prepareWhatsAppAgentTools(input, controller.signal);
        preparationPending = false;
      }
      const result = await drainWhatsAppAiOnce(input, controller.signal, false);
      const outcome = controller.signal.aborted ? "cancelled" : "succeeded";
      input.metrics.recordCompleted({
        operation,
        outcome,
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (!controller.signal.aborted) {
        input.logger.debug("worker.whatsapp.ai.cycle_completed", "succeeded", {
          recovered_turn_count: result.recoveredTurnCount,
          uncertain_recovery_count: result.uncertainRecoveryCount,
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
      input.logger.error("worker.whatsapp.ai.cycle_failed", error, rpcFailureAttributes(error));
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
