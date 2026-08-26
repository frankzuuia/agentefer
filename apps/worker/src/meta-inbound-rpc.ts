import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_RPC_RESPONSE_BYTES = 65_536;

export const META_INBOUND_RPC_FAILURE_KINDS = [
  "invalid",
  "rejected",
  "timeout",
  "cancelled",
  "dependency",
] as const;

export type MetaInboundRpcFailureKind = (typeof META_INBOUND_RPC_FAILURE_KINDS)[number];

export class MetaInboundRpcError extends OperationalError {
  readonly kind: MetaInboundRpcFailureKind;

  constructor(kind: MetaInboundRpcFailureKind, cause?: unknown) {
    const attributes =
      kind === "invalid"
        ? {
            code: "META_INBOUND_RPC_INVALID",
            category: "validation" as const,
            retryable: false,
            severity: "warning" as const,
          }
        : kind === "rejected"
          ? {
              code: "META_INBOUND_RPC_REJECTED",
              category: "authentication" as const,
              retryable: false,
              severity: "critical" as const,
            }
          : kind === "timeout"
            ? {
                code: "META_INBOUND_RPC_TIMEOUT",
                category: "timeout" as const,
                retryable: true,
                severity: "error" as const,
              }
            : kind === "cancelled"
              ? {
                  code: "META_INBOUND_RPC_CANCELLED",
                  category: "internal" as const,
                  retryable: true,
                  severity: "warning" as const,
                }
              : {
                  code: "META_INBOUND_RPC_DEPENDENCY",
                  category: "dependency" as const,
                  retryable: true,
                  severity: "error" as const,
                };

    super({ ...attributes, cause });
    this.name = "MetaInboundRpcError";
    this.kind = kind;
  }
}

type RpcSignal = Readonly<{ signal?: AbortSignal }>;

export type ClaimedMetaDelivery = Readonly<{
  deliveryId: string;
  organizationId: string;
  metaApplicationId: string;
  providerObjectType: string;
  attemptNumber: number;
  leaseToken: string;
  leaseExpiresAt: string;
  correlationId: string;
  traceId?: string;
}>;

export type RoutedMetaDelivery = Readonly<{
  deliveryId: string;
  status: "routed" | "ignored";
  insertedEventCount: number;
  replayedEventCount: number;
  ignoredChangeCount: number;
}>;

export type FailedMetaDelivery = Readonly<{
  deliveryId: string;
  status: "retryable" | "dead_letter";
  attemptCount: number;
}>;

export type ClaimedWhatsAppMessage = Readonly<{
  inboundEventId: string;
  organizationId: string;
  channelConnectionId: string;
  attemptNumber: number;
  leaseToken: string;
  leaseExpiresAt: string;
  correlationId: string;
  traceId?: string;
}>;

export type NormalizedWhatsAppMessage = Readonly<{
  inboundEventId: string;
  channelIdentityId: string;
  conversationId: string;
  messageId: string;
  contentKind:
    | "text"
    | "media"
    | "interactive"
    | "location"
    | "contact"
    | "order"
    | "reaction"
    | "unsupported"
    | "system";
  wasReplayed: boolean;
  principalType: "contact" | "member";
}>;

export type FailedWhatsAppMessage = Readonly<{
  inboundEventId: string;
  status: "retryable" | "dead_letter";
  attemptCount: number;
}>;

export type MetaInboundRpcClient = Readonly<{
  claimDelivery(
    input: Readonly<{
      workerId: string;
      providerObjectType: string;
      leaseSeconds: number;
      maxAttempts: number;
    }> &
      RpcSignal,
  ): Promise<ClaimedMetaDelivery | undefined>;
  routeWhatsAppDelivery(
    input: Readonly<{ deliveryId: string; leaseToken: string }> & RpcSignal,
  ): Promise<RoutedMetaDelivery>;
  failDelivery(
    input: Readonly<{
      deliveryId: string;
      leaseToken: string;
      errorCode: string;
      retryable: boolean;
      retryDelaySeconds: number;
      maxAttempts: number;
    }> &
      RpcSignal,
  ): Promise<FailedMetaDelivery>;
  claimWhatsAppMessage(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      maxAttempts: number;
    }> &
      RpcSignal,
  ): Promise<ClaimedWhatsAppMessage | undefined>;
  normalizeWhatsAppMessage(
    input: Readonly<{ inboundEventId: string; leaseToken: string }> & RpcSignal,
  ): Promise<NormalizedWhatsAppMessage>;
  failWhatsAppMessage(
    input: Readonly<{
      inboundEventId: string;
      leaseToken: string;
      errorCode: string;
      retryable: boolean;
      retryDelaySeconds: number;
      maxAttempts: number;
    }> &
      RpcSignal,
  ): Promise<FailedWhatsAppMessage>;
}>;

export type CreateMetaInboundRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const contentKindValues: ReadonlySet<NormalizedWhatsAppMessage["contentKind"]> = new Set([
  "text",
  "media",
  "interactive",
  "location",
  "contact",
  "order",
  "reaction",
  "unsupported",
  "system",
]);
const principalTypeValues: ReadonlySet<NormalizedWhatsAppMessage["principalType"]> = new Set([
  "contact",
  "member",
]);

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isHexadecimalCharacter = (character: string): boolean => {
  const normalized = character.toLowerCase();
  return (normalized >= "0" && normalized <= "9") || (normalized >= "a" && normalized <= "f");
};

const isHexadecimalGroup = (value: string, expectedLength: number | undefined): boolean => {
  if (expectedLength === undefined || value.length !== expectedLength) {
    return false;
  }
  for (const character of value) {
    if (!isHexadecimalCharacter(character)) {
      return false;
    }
  }
  return true;
};

const readUuid = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = row[field];
  if (typeof value !== "string" || value.length !== 36) {
    throw new MetaInboundRpcError("dependency");
  }

  const groups = value.split("-");
  const validGroupLengths = [8, 4, 4, 4, 12];
  const isValid = groups.every((group, index) =>
    isHexadecimalGroup(group, validGroupLengths[index]),
  );
  if (!isValid) {
    throw new MetaInboundRpcError("dependency");
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
    throw new MetaInboundRpcError("dependency");
  }
  return value;
};

const readOptionalText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string | undefined => {
  const value = row[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  return readText(row, field, maximumLength);
};

const readPositiveInteger = (row: Readonly<Record<string, unknown>>, field: string): number => {
  const value = row[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new MetaInboundRpcError("dependency");
  }
  return value;
};

const readNonNegativeInteger = (row: Readonly<Record<string, unknown>>, field: string): number => {
  const value = row[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new MetaInboundRpcError("dependency");
  }
  return value;
};

const readTimestamp = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(row, field, 64);
  if (!Number.isFinite(Date.parse(value))) {
    throw new MetaInboundRpcError("dependency");
  }
  return value;
};

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw new MetaInboundRpcError("dependency");
  }
  return value[0];
};

const readOptionalSingleRow = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value) || value.length > 1) {
    throw new MetaInboundRpcError("dependency");
  }
  if (value.length === 0) {
    return undefined;
  }
  if (!isRecord(value[0])) {
    throw new MetaInboundRpcError("dependency");
  }
  return value[0];
};

const readEnum = <T extends string>(
  row: Readonly<Record<string, unknown>>,
  field: string,
  values: ReadonlySet<T>,
): T => {
  const value = row[field];
  if (typeof value !== "string" || !values.has(value as T)) {
    throw new MetaInboundRpcError("dependency");
  }
  return value as T;
};

const failureKindForResponse = (status: number): MetaInboundRpcFailureKind => {
  if (status === 400 || status === 413 || status === 422) {
    return "invalid";
  }
  if (status === 401 || status === 403) {
    return "rejected";
  }
  return "dependency";
};

const decodeRpcResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAXIMUM_RPC_RESPONSE_BYTES
    ) {
      throw new MetaInboundRpcError("dependency");
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw new MetaInboundRpcError("dependency");
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new MetaInboundRpcError("dependency", error);
  }
};

export function createMetaInboundRpcClient(
  input: CreateMetaInboundRpcClientInput,
): MetaInboundRpcClient {
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
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: requestSignal,
      });
    } catch (error) {
      const kind =
        signal?.aborted === true
          ? "cancelled"
          : error instanceof Error && error.name === "TimeoutError"
            ? "timeout"
            : "dependency";
      throw new MetaInboundRpcError(kind, error);
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new MetaInboundRpcError(failureKindForResponse(response.status));
    }
    return decodeRpcResponse(response);
  };

  return Object.freeze({
    async claimDelivery(inputValue) {
      const row = readOptionalSingleRow(
        await postRpc(
          "claim_meta_webhook_delivery",
          {
            target_worker_id: inputValue.workerId,
            target_provider_object_type: inputValue.providerObjectType,
            target_lease_seconds: inputValue.leaseSeconds,
            target_max_attempts: inputValue.maxAttempts,
          },
          inputValue.signal,
        ),
      );
      if (row === undefined) {
        return undefined;
      }
      const traceId = readOptionalText(row, "trace_id", 128);
      return Object.freeze({
        deliveryId: readUuid(row, "delivery_id"),
        organizationId: readUuid(row, "organization_id"),
        metaApplicationId: readUuid(row, "meta_application_id"),
        providerObjectType: readText(row, "provider_object_type", 160),
        attemptNumber: readPositiveInteger(row, "attempt_number"),
        leaseToken: readUuid(row, "lease_token"),
        leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
        correlationId: readText(row, "correlation_id", 128),
        ...(traceId === undefined ? {} : { traceId }),
      });
    },
    async routeWhatsAppDelivery(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "route_meta_whatsapp_delivery",
          {
            target_delivery_id: inputValue.deliveryId,
            target_lease_token: inputValue.leaseToken,
          },
          inputValue.signal,
        ),
      );
      return Object.freeze({
        deliveryId: readUuid(row, "delivery_id"),
        status: readEnum(
          row,
          "delivery_status",
          new Set<RoutedMetaDelivery["status"]>(["routed", "ignored"]),
        ),
        insertedEventCount: readNonNegativeInteger(row, "inserted_event_count"),
        replayedEventCount: readNonNegativeInteger(row, "replayed_event_count"),
        ignoredChangeCount: readNonNegativeInteger(row, "ignored_change_count"),
      });
    },
    async failDelivery(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "fail_meta_webhook_delivery",
          {
            target_delivery_id: inputValue.deliveryId,
            target_lease_token: inputValue.leaseToken,
            target_error_code: inputValue.errorCode,
            target_retryable: inputValue.retryable,
            target_retry_delay_seconds: inputValue.retryDelaySeconds,
            target_max_attempts: inputValue.maxAttempts,
          },
          inputValue.signal,
        ),
      );
      return Object.freeze({
        deliveryId: readUuid(row, "delivery_id"),
        status: readEnum(
          row,
          "delivery_status",
          new Set<FailedMetaDelivery["status"]>(["retryable", "dead_letter"]),
        ),
        attemptCount: readPositiveInteger(row, "attempt_count"),
      });
    },
    async claimWhatsAppMessage(inputValue) {
      const row = readOptionalSingleRow(
        await postRpc(
          "claim_meta_whatsapp_message_event",
          {
            target_worker_id: inputValue.workerId,
            target_lease_seconds: inputValue.leaseSeconds,
            target_max_attempts: inputValue.maxAttempts,
          },
          inputValue.signal,
        ),
      );
      if (row === undefined) {
        return undefined;
      }
      const traceId = readOptionalText(row, "trace_id", 128);
      return Object.freeze({
        inboundEventId: readUuid(row, "inbound_event_id"),
        organizationId: readUuid(row, "organization_id"),
        channelConnectionId: readUuid(row, "channel_connection_id"),
        attemptNumber: readPositiveInteger(row, "attempt_number"),
        leaseToken: readUuid(row, "lease_token"),
        leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
        correlationId: readText(row, "correlation_id", 128),
        ...(traceId === undefined ? {} : { traceId }),
      });
    },
    async normalizeWhatsAppMessage(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "normalize_meta_whatsapp_message",
          {
            target_inbound_event_id: inputValue.inboundEventId,
            target_lease_token: inputValue.leaseToken,
          },
          inputValue.signal,
        ),
      );
      const wasReplayed = row.was_replayed;
      if (typeof wasReplayed !== "boolean") {
        throw new MetaInboundRpcError("dependency");
      }
      return Object.freeze({
        inboundEventId: readUuid(row, "inbound_event_id"),
        channelIdentityId: readUuid(row, "channel_identity_id"),
        conversationId: readUuid(row, "conversation_id"),
        messageId: readUuid(row, "message_id"),
        contentKind: readEnum(row, "content_kind", contentKindValues),
        wasReplayed,
        principalType: readEnum(row, "principal_type", principalTypeValues),
      });
    },
    async failWhatsAppMessage(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "fail_meta_whatsapp_message_event",
          {
            target_inbound_event_id: inputValue.inboundEventId,
            target_lease_token: inputValue.leaseToken,
            target_error_code: inputValue.errorCode,
            target_retryable: inputValue.retryable,
            target_retry_delay_seconds: inputValue.retryDelaySeconds,
            target_max_attempts: inputValue.maxAttempts,
          },
          inputValue.signal,
        ),
      );
      return Object.freeze({
        inboundEventId: readUuid(row, "inbound_event_id"),
        status: readEnum(
          row,
          "event_status",
          new Set<FailedWhatsAppMessage["status"]>(["retryable", "dead_letter"]),
        ),
        attemptCount: readPositiveInteger(row, "attempt_count"),
      });
    },
  });
}
