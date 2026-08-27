import { SensitiveValue, type ModelSelector } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_RPC_RESPONSE_BYTES = 1_048_576;

export type WhatsAppAiRpcFailureKind =
  "invalid" | "rejected" | "timeout" | "cancelled" | "dependency";

export type WhatsAppAiRpcFailurePhase = "request" | "http_status" | "decode" | "response_contract";

type WhatsAppAiRpcFailureContext = Readonly<{
  operation?: string;
  phase?: WhatsAppAiRpcFailurePhase;
  field?: string;
  status?: number;
}>;

export class WhatsAppAiRpcError extends OperationalError {
  readonly kind: WhatsAppAiRpcFailureKind;
  readonly operation: string | undefined;
  readonly phase: WhatsAppAiRpcFailurePhase | undefined;
  readonly field: string | undefined;
  readonly status: number | undefined;

  constructor(
    kind: WhatsAppAiRpcFailureKind,
    cause?: unknown,
    context: WhatsAppAiRpcFailureContext = {},
  ) {
    const attributes = {
      invalid: {
        code: "WHATSAPP_AI_RPC_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "WHATSAPP_AI_RPC_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      timeout: {
        code: "WHATSAPP_AI_RPC_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
      cancelled: {
        code: "WHATSAPP_AI_RPC_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      dependency: {
        code: "WHATSAPP_AI_RPC_DEPENDENCY",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;
    super({ ...attributes[kind], cause });
    this.name = "WhatsAppAiRpcError";
    this.kind = kind;
    this.operation = context.operation;
    this.phase = context.phase;
    this.field = context.field;
    this.status = context.status;
  }
}

type RpcSignal = Readonly<{ signal?: AbortSignal }>;

export type ClaimedAgentTurn = Readonly<{
  organizationId: string;
  agentJobId: string;
  agentRunId: string;
  jobAttemptId: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptNumber: number;
  provider: string;
  model: string;
  reasoningEffort?: string;
  systemPrompt: string;
  conversationHistory: readonly Readonly<{
    direction: "inbound" | "outbound";
    contentKind: string;
    content: unknown;
  }>[];
  continuationParts: readonly string[];
  channelConnectionId: string;
  conversationId: string;
  triggerMessageId: string;
  correlationId: string;
  traceId?: string;
}>;

export type CompletedAgentTurn = Readonly<{
  agentRunId: string;
  outboundMessageCount: number;
  outboxEventIds: readonly string[];
  wasReplayed: boolean;
}>;

export type RecoveredAgentTurns = Readonly<{
  scannedCount: number;
  recoveredCount: number;
  retryableCount: number;
  failedCount: number;
  uncertainCount: number;
}>;

export type ClaimedOutboxEvent = Readonly<{
  organizationId: string;
  outboxEventId: string;
  messageId: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptNumber: number;
  apiVersion: string;
  phoneNumberId: string;
  destination: string;
  payload: Readonly<Record<string, unknown>>;
  accessToken: SensitiveValue;
  correlationId: string;
}>;

export type WhatsAppAiRpcClient = Readonly<{
  recoverExpiredAgentTurns(
    input: Readonly<{
      workerId: string;
      retryDelaySeconds: number;
      limit: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<RecoveredAgentTurns>;
  claimAgentTurn(
    input: Readonly<{
      workerId: string;
      model: ModelSelector;
      visionModel: ModelSelector;
      reasoningEffort?: string;
      leaseSeconds: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedAgentTurn | undefined>;
  completeAgentTurn(
    input: Readonly<{
      claim: ClaimedAgentTurn;
      workerId: string;
      visibleText: string;
      providerRequestId: string;
      responseMetadataSafe: Readonly<Record<string, unknown>>;
    }> &
      RpcSignal,
  ): Promise<CompletedAgentTurn>;
  checkpointAgentTurn(
    input: Readonly<{
      claim: ClaimedAgentTurn;
      workerId: string;
      partialText: string;
      providerRequestId: string;
      responseMetadataSafe: Readonly<Record<string, unknown>>;
    }> &
      RpcSignal,
  ): Promise<void>;
  settleAgentFailure(
    input: Readonly<{
      claim: ClaimedAgentTurn;
      workerId: string;
      terminationReason: "provider_error" | "content_filter" | "cancelled";
      disposition: "retry_provider" | "halt_safely";
      providerRequestId?: string;
      errorCode: string;
    }> &
      RpcSignal,
  ): Promise<void>;
  claimOutboxEvent(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      maxAttempts: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedOutboxEvent | undefined>;
  settleOutboxEvent(
    input: Readonly<{
      claim: ClaimedOutboxEvent;
      workerId: string;
      outcome: "succeeded" | "retryable" | "failed" | "uncertain";
      providerMessageId?: string;
      errorCode?: string;
      retryDelaySeconds: number;
    }> &
      RpcSignal,
  ): Promise<void>;
}>;

export type CreateWhatsAppAiRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const responseContractError = (field: string): WhatsAppAiRpcError =>
  new WhatsAppAiRpcError("dependency", undefined, {
    phase: "response_contract",
    field,
  });

const isHexadecimalCharacter = (character: string): boolean => {
  const normalized = character.toLowerCase();
  return (normalized >= "0" && normalized <= "9") || (normalized >= "a" && normalized <= "f");
};

const readUuid = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = row[field];
  if (typeof value !== "string" || value.length !== 36) {
    throw responseContractError(field);
  }
  const groups = value.split("-");
  const expectedLengths = [8, 4, 4, 4, 12];
  const valid = groups.every(
    (group, index) =>
      group.length === expectedLengths[index] &&
      Array.from(group).every((character) => isHexadecimalCharacter(character)),
  );
  if (!valid) {
    throw responseContractError(field);
  }
  return value.toLowerCase();
};

const readText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string => {
  const value = row[field];
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maximumLength ||
    value.trim() !== value
  ) {
    throw responseContractError(field);
  }
  return value;
};

const readOptionalText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string | undefined => {
  const value = row[field];
  return value === null || value === undefined ? undefined : readText(row, field, maximumLength);
};

const readInteger = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  minimum: number,
): number => {
  const value = row[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw responseContractError(field);
  }
  return value;
};

const readBoolean = (row: Readonly<Record<string, unknown>>, field: string): boolean => {
  const value = row[field];
  if (typeof value !== "boolean") {
    throw responseContractError(field);
  }
  return value;
};

const readTimestamp = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(row, field, 64);
  if (!Number.isFinite(Date.parse(value))) {
    throw responseContractError(field);
  }
  return value;
};

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw responseContractError("response_rows");
  }
  return value[0];
};

const readOptionalSingleRow = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value) || value.length > 1) {
    throw responseContractError("response_rows");
  }
  const rows: readonly unknown[] = value;
  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }
  if (!isRecord(row)) {
    throw responseContractError("response_row");
  }
  return row;
};

const readRecord = (
  row: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> => {
  const value = row[field];
  if (!isRecord(value)) {
    throw responseContractError(field);
  }
  return value;
};

const readConversation = (
  row: Readonly<Record<string, unknown>>,
): ClaimedAgentTurn["conversationHistory"] => {
  const value = row.conversation_history;
  if (!Array.isArray(value)) {
    throw responseContractError("conversation_history");
  }
  return Object.freeze(
    value.map((item) => {
      if (!isRecord(item)) {
        throw responseContractError("conversation_history.item");
      }
      const direction = item.direction;
      if (direction !== "inbound" && direction !== "outbound") {
        throw responseContractError("conversation_history.direction");
      }
      const entry: ClaimedAgentTurn["conversationHistory"][number] = Object.freeze({
        direction,
        contentKind: readText(item, "content_kind", 80),
        content: item.content,
      });
      return entry;
    }),
  );
};

const readContinuationParts = (row: Readonly<Record<string, unknown>>): readonly string[] => {
  const value = row.continuation_parts;
  if (!Array.isArray(value)) {
    throw responseContractError("continuation_parts");
  }
  return Object.freeze(
    value.map((part) => {
      if (!isRecord(part)) {
        throw responseContractError("continuation_parts.item");
      }
      return readText(part, "text", 262_000);
    }),
  );
};

const failureKindForStatus = (status: number): WhatsAppAiRpcFailureKind => {
  if (status === 400 || status === 413 || status === 422) {
    return "invalid";
  }
  if (status === 401 || status === 403) {
    return "rejected";
  }
  return "dependency";
};

const decodeResponse = async (response: Response, operation: string): Promise<unknown> => {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw new WhatsAppAiRpcError("dependency", undefined, {
      operation,
      phase: "decode",
      field: "response_size",
    });
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new WhatsAppAiRpcError("dependency", error, { operation, phase: "decode" });
  }
};

const validateRpcResponse = <Result>(operation: string, operationValue: () => Result): Result => {
  try {
    return operationValue();
  } catch (error) {
    if (error instanceof WhatsAppAiRpcError && error.operation === undefined) {
      throw new WhatsAppAiRpcError(error.kind, error, {
        operation,
        ...(error.phase === undefined ? {} : { phase: error.phase }),
        ...(error.field === undefined ? {} : { field: error.field }),
        ...(error.status === undefined ? {} : { status: error.status }),
      });
    }
    throw error;
  }
};

export function createWhatsAppAiRpcClient(
  input: CreateWhatsAppAiRpcClientInput,
): WhatsAppAiRpcClient {
  const rpcBaseUrl = new URL(input.supabaseUrl);
  rpcBaseUrl.search = "";
  rpcBaseUrl.hash = "";

  const postRpc = async (
    rpcName: string,
    payload: Readonly<Record<string, unknown>>,
    signal: AbortSignal | undefined,
  ): Promise<unknown> => {
    const url = new URL(rpcBaseUrl);
    url.pathname = `/rest/v1/rpc/${rpcName}`;
    const timeoutSignal = AbortSignal.timeout(input.timeoutMilliseconds);
    const requestSignal =
      signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-profile": "api",
          apikey: input.secretKey.reveal(),
          "content-profile": "api",
          "content-type": "application/json",
          "user-agent": "AgenteFer-Worker/1.0",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: requestSignal,
      });
    } catch (error) {
      const kind =
        signal?.aborted === true ? "cancelled" : timeoutSignal.aborted ? "timeout" : "dependency";
      throw new WhatsAppAiRpcError(kind, error, { operation: rpcName, phase: "request" });
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new WhatsAppAiRpcError(failureKindForStatus(response.status), undefined, {
        operation: rpcName,
        phase: "http_status",
        status: response.status,
      });
    }
    return decodeResponse(response, rpcName);
  };

  return Object.freeze({
    async recoverExpiredAgentTurns(inputValue) {
      const operation = "recover_expired_whatsapp_agent_turns";
      const response = await postRpc(
        operation,
        {
          target_worker_id: inputValue.workerId,
          target_retry_delay_seconds: inputValue.retryDelaySeconds,
          target_limit: inputValue.limit,
          target_organization_id: inputValue.organizationId ?? null,
        },
        inputValue.signal,
      );
      return validateRpcResponse(operation, () => {
        const row = readSingleRow(response);
        return Object.freeze({
          scannedCount: readInteger(row, "scanned_count", 0),
          recoveredCount: readInteger(row, "recovered_count", 0),
          retryableCount: readInteger(row, "retryable_count", 0),
          failedCount: readInteger(row, "failed_count", 0),
          uncertainCount: readInteger(row, "uncertain_count", 0),
        });
      });
    },
    async claimAgentTurn(inputValue) {
      const operation = "claim_whatsapp_agent_turn";
      const response = await postRpc(
        operation,
        {
          target_worker_id: inputValue.workerId,
          target_provider: inputValue.model.provider,
          target_model: inputValue.model.model,
          target_vision_provider: inputValue.visionModel.provider,
          target_vision_model: inputValue.visionModel.model,
          target_reasoning_effort: inputValue.reasoningEffort ?? null,
          target_lease_seconds: inputValue.leaseSeconds,
          target_organization_id: inputValue.organizationId ?? null,
        },
        inputValue.signal,
      );
      return validateRpcResponse(operation, () => {
        const row = readOptionalSingleRow(response);
        if (row === undefined) {
          return undefined;
        }
        const reasoningEffort = readOptionalText(row, "reasoning_effort", 80);
        const traceId = readOptionalText(row, "trace_id", 128);
        return Object.freeze({
          organizationId: readUuid(row, "organization_id"),
          agentJobId: readUuid(row, "agent_job_id"),
          agentRunId: readUuid(row, "agent_run_id"),
          jobAttemptId: readUuid(row, "job_attempt_id"),
          leaseToken: readUuid(row, "lease_token"),
          leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
          attemptNumber: readInteger(row, "attempt_number", 1),
          provider: readText(row, "provider", 80),
          model: readText(row, "model", 200),
          ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
          systemPrompt: readText(row, "system_prompt", 262_144),
          conversationHistory: readConversation(row),
          continuationParts: readContinuationParts(row),
          channelConnectionId: readUuid(row, "channel_connection_id"),
          conversationId: readUuid(row, "conversation_id"),
          triggerMessageId: readUuid(row, "trigger_message_id"),
          correlationId: readText(row, "correlation_id", 128),
          ...(traceId === undefined ? {} : { traceId }),
        });
      });
    },
    async completeAgentTurn(inputValue) {
      const operation = "complete_whatsapp_agent_turn";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.claim.organizationId,
          target_job_attempt_id: inputValue.claim.jobAttemptId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.claim.leaseToken,
          target_visible_text: inputValue.visibleText,
          target_provider_request_id: inputValue.providerRequestId,
          target_response_metadata_safe: inputValue.responseMetadataSafe,
        },
        inputValue.signal,
      );
      return validateRpcResponse(operation, () => {
        const row = readSingleRow(response);
        const eventIds = row.outbox_event_ids;
        if (!Array.isArray(eventIds)) {
          throw responseContractError("outbox_event_ids");
        }
        return Object.freeze({
          agentRunId: readUuid(row, "agent_run_id"),
          outboundMessageCount: readInteger(row, "outbound_message_count", 1),
          outboxEventIds: Object.freeze(
            eventIds.map((eventId) => readUuid({ event_id: eventId }, "event_id")),
          ),
          wasReplayed: readBoolean(row, "was_replayed"),
        });
      });
    },
    async checkpointAgentTurn(inputValue) {
      const operation = "checkpoint_whatsapp_agent_turn";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.claim.organizationId,
          target_job_attempt_id: inputValue.claim.jobAttemptId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.claim.leaseToken,
          target_partial_text: inputValue.partialText,
          target_provider_request_id: inputValue.providerRequestId,
          target_response_metadata_safe: inputValue.responseMetadataSafe,
        },
        inputValue.signal,
      );
      validateRpcResponse(operation, () => readSingleRow(response));
    },
    async settleAgentFailure(inputValue) {
      const operation = "record_agent_attempt_result";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.claim.organizationId,
          target_job_attempt_id: inputValue.claim.jobAttemptId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.claim.leaseToken,
          target_termination_reason: inputValue.terminationReason,
          target_disposition: inputValue.disposition,
          target_provider_request_id: inputValue.providerRequestId ?? null,
          target_response_metadata_safe: { error_code: inputValue.errorCode },
          target_checkpoint_reference: null,
          target_checkpoint_hash: null,
          target_last_error_code: inputValue.errorCode,
        },
        inputValue.signal,
      );
      validateRpcResponse(operation, () => readSingleRow(response));
    },
    async claimOutboxEvent(inputValue) {
      const operation = "claim_whatsapp_outbox_event";
      const response = await postRpc(
        operation,
        {
          target_worker_id: inputValue.workerId,
          target_lease_seconds: inputValue.leaseSeconds,
          target_max_attempts: inputValue.maxAttempts,
          target_organization_id: inputValue.organizationId ?? null,
        },
        inputValue.signal,
      );
      return validateRpcResponse(operation, () => {
        const row = readOptionalSingleRow(response);
        if (row === undefined) {
          return undefined;
        }
        return Object.freeze({
          organizationId: readUuid(row, "organization_id"),
          outboxEventId: readUuid(row, "outbox_event_id"),
          messageId: readUuid(row, "message_id"),
          leaseToken: readUuid(row, "lease_token"),
          leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
          attemptNumber: readInteger(row, "attempt_number", 1),
          apiVersion: readText(row, "api_version", 32),
          phoneNumberId: readText(row, "phone_number_id", 255),
          destination: readText(row, "destination", 512),
          payload: readRecord(row, "payload"),
          accessToken: new SensitiveValue(readText(row, "access_token", 16_384)),
          correlationId: readText(row, "correlation_id", 128),
        });
      });
    },
    async settleOutboxEvent(inputValue) {
      const operation = "record_whatsapp_outbox_result";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.claim.organizationId,
          target_outbox_event_id: inputValue.claim.outboxEventId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.claim.leaseToken,
          target_outcome: inputValue.outcome,
          target_provider_message_id: inputValue.providerMessageId ?? null,
          target_error_code: inputValue.errorCode ?? null,
          target_retry_delay_seconds: inputValue.retryDelaySeconds,
        },
        inputValue.signal,
      );
      validateRpcResponse(operation, () => readSingleRow(response));
    },
  });
}
