import { SensitiveValue, type SensitiveValue as SensitiveValueType } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

import { resolveMediaObject, type MediaObjectDescriptor } from "./media-storage.js";

const MAXIMUM_RPC_RESPONSE_BYTES = 1_048_576;

export type MediaIngestFailureKind =
  "invalid" | "rejected" | "timeout" | "cancelled" | "dependency";

export class MediaIngestRpcError extends OperationalError {
  readonly kind: MediaIngestFailureKind;

  constructor(kind: MediaIngestFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "MEDIA_INGEST_RPC_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "MEDIA_INGEST_RPC_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      timeout: {
        code: "MEDIA_INGEST_RPC_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
      cancelled: {
        code: "MEDIA_INGEST_RPC_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      dependency: {
        code: "MEDIA_INGEST_RPC_DEPENDENCY",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;
    super({ ...attributes[kind], cause });
    this.name = "MediaIngestRpcError";
    this.kind = kind;
  }
}

type RpcSignal = Readonly<{ signal?: AbortSignal }>;

export type ClaimedMediaIngest = Readonly<{
  organizationId: string;
  requestId: string;
  channelConnectionId: string;
  messageId: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptNumber: number;
  apiVersion: string;
  phoneNumberId: string;
  providerMediaId: string;
  declaredMimeType?: "image/jpeg" | "image/png" | "image/webp";
  declaredSha256Hex?: string;
  declaredFileSize?: number;
  correlationId: string;
  traceId?: string;
  accessToken: SensitiveValueType;
}>;

export type MediaIngestRpcClient = Readonly<{
  claim(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      maxAttempts: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedMediaIngest | undefined>;
  beginAsset(
    input: Readonly<{
      organizationId: string;
      contentSha256Hex: string;
      mimeType: string;
      byteSize: number;
      widthPixels: number;
      heightPixels: number;
      originalFileName?: string;
      sourceMessageId: string;
      correlationId: string;
      traceId?: string;
    }> &
      RpcSignal,
  ): Promise<Readonly<{ mediaAssetId: string; ingestStatus: string; wasReplayed: boolean }>>;
  registerObject(
    input: Readonly<{
      organizationId: string;
      mediaAssetId: string;
      descriptor: MediaObjectDescriptor;
      byteSize: number;
      widthPixels: number;
      heightPixels: number;
      derivationSpec: Readonly<Record<string, unknown>>;
      correlationId: string;
      traceId?: string;
    }> &
      RpcSignal,
  ): Promise<Readonly<{ mediaAssetObjectId: string; objectStatus: string; wasReplayed: boolean }>>;
  complete(
    input: Readonly<{
      organizationId: string;
      requestId: string;
      workerId: string;
      leaseToken: string;
      mediaAssetId: string;
    }> &
      RpcSignal,
  ): Promise<
    Readonly<{ requestId: string; status: string; mediaAssetId: string; wasReplayed: boolean }>
  >;
  fail(
    input: Readonly<{
      organizationId: string;
      requestId: string;
      workerId: string;
      leaseToken: string;
      errorCode: string;
      retryable: boolean;
      retryDelaySeconds: number;
      maxAttempts: number;
    }> &
      RpcSignal,
  ): Promise<Readonly<{ requestId: string; status: string; wasReplayed: boolean }>>;
}>;

type CreateMediaIngestRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const responseContractError = (field: string): MediaIngestRpcError =>
  new MediaIngestRpcError("invalid", new Error(`Invalid RPC response field: ${field}`));

const readText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength = 16_384,
): string => {
  const value = row[field];
  if (typeof value !== "string" || value.length < 1 || value.length > maximumLength) {
    throw responseContractError(field);
  }
  return value;
};

const readOptionalText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength = 16_384,
): string | undefined => {
  const value = row[field];
  return value === null || value === undefined ? undefined : readText(row, field, maximumLength);
};

const readUuid = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(row, field, 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) {
    throw responseContractError(field);
  }
  return value;
};

const readInteger = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  minimum = 0,
): number => {
  const value = row[field];
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw responseContractError(field);
  }
  return value as number;
};

const readBoolean = (row: Readonly<Record<string, unknown>>, field: string): boolean => {
  if (typeof row[field] !== "boolean") {
    throw responseContractError(field);
  }
  return row[field];
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
  if (value.length === 0) {
    return undefined;
  }
  if (!isRecord(value[0])) {
    throw responseContractError("response_row");
  }
  return value[0];
};

const decodeResponse = async (response: Response, operation: string): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAXIMUM_RPC_RESPONSE_BYTES
    ) {
      throw new MediaIngestRpcError("invalid", new Error(`${operation}: response too large`));
    }
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw new MediaIngestRpcError("invalid", new Error(`${operation}: response too large`));
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new MediaIngestRpcError("invalid", error);
  }
};

const rpcFailureKind = (status: number): MediaIngestFailureKind =>
  status === 401 || status === 403
    ? "rejected"
    : status >= 400 && status < 500
      ? "invalid"
      : "dependency";

const validateHex = (value: string, length: number): string => {
  const isLowerHex = Array.from(value).every(
    (character) => (character >= "0" && character <= "9") || (character >= "a" && character <= "f"),
  );
  if (value.length !== length || !isLowerHex) {
    throw new MediaIngestRpcError("invalid");
  }
  return value;
};

export const createMediaIngestRpcClient = (
  input: CreateMediaIngestRpcClientInput,
): MediaIngestRpcClient => {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";
  baseUrl.hash = "";
  if (!Number.isSafeInteger(input.timeoutMilliseconds) || input.timeoutMilliseconds < 1) {
    throw new MediaIngestRpcError("invalid");
  }

  const postRpc = async (
    operation: string,
    payload: Readonly<Record<string, unknown>>,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const endpoint = new URL(`/rest/v1/rpc/${operation}`, baseUrl);
    const timeoutSignal = AbortSignal.timeout(input.timeoutMilliseconds);
    const requestSignal =
      signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          apikey: input.secretKey.reveal(),
          authorization: `Bearer ${input.secretKey.reveal()}`,
          "content-type": "application/json",
          "content-profile": "api",
          "user-agent": "AgenteFer-Worker/1.0",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: requestSignal,
      });
    } catch (error) {
      if (signal?.aborted === true) {
        throw new MediaIngestRpcError("cancelled", error);
      }
      if (timeoutSignal.aborted) {
        throw new MediaIngestRpcError("timeout", error);
      }
      throw new MediaIngestRpcError("dependency", error);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new MediaIngestRpcError(
        rpcFailureKind(response.status),
        new Error(`${operation}: HTTP ${String(response.status)}`),
      );
    }
    return decodeResponse(response, operation);
  };

  return Object.freeze({
    async claim(inputValue) {
      const operation = "claim_whatsapp_media_ingest";
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
      const row = readOptionalSingleRow(response);
      if (row === undefined) {
        return undefined;
      }
      const declaredMimeType = readOptionalText(row, "declared_mime_type", 32);
      if (
        declaredMimeType !== undefined &&
        declaredMimeType !== "image/jpeg" &&
        declaredMimeType !== "image/png" &&
        declaredMimeType !== "image/webp"
      ) {
        throw responseContractError("declared_mime_type");
      }
      const declaredSha256Hex = readOptionalText(row, "declared_sha256_hex", 64);
      if (declaredSha256Hex !== undefined) {
        validateHex(declaredSha256Hex, 64);
      }
      const declaredFileSize =
        row.declared_file_size === null || row.declared_file_size === undefined
          ? undefined
          : readInteger(row, "declared_file_size", 1);
      return Object.freeze({
        organizationId: readUuid(row, "organization_id"),
        requestId: readUuid(row, "request_id"),
        channelConnectionId: readUuid(row, "channel_connection_id"),
        messageId: readUuid(row, "message_id"),
        leaseToken: readUuid(row, "lease_token"),
        leaseExpiresAt: readText(row, "lease_expires_at", 80),
        attemptNumber: readInteger(row, "attempt_number", 1),
        apiVersion: readText(row, "api_version", 32),
        phoneNumberId: readText(row, "phone_number_id", 255),
        providerMediaId: readText(row, "provider_media_id", 512),
        ...(declaredMimeType === undefined ? {} : { declaredMimeType }),
        ...(declaredSha256Hex === undefined ? {} : { declaredSha256Hex }),
        ...(declaredFileSize === undefined ? {} : { declaredFileSize }),
        correlationId: readText(row, "correlation_id", 128),
        ...(readOptionalText(row, "trace_id", 128) === undefined
          ? {}
          : { traceId: readText(row, "trace_id", 128) }),
        accessToken: new SensitiveValue(readText(row, "access_token", 65_536)),
      });
    },
    async beginAsset(inputValue) {
      const operation = "begin_media_asset_ingest";
      const contentSha256Hex = validateHex(inputValue.contentSha256Hex, 64);
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.organizationId,
          target_content_sha256: `\\x${contentSha256Hex}`,
          target_mime_type: inputValue.mimeType,
          target_byte_size: inputValue.byteSize,
          target_width_pixels: inputValue.widthPixels,
          target_height_pixels: inputValue.heightPixels,
          target_original_file_name: inputValue.originalFileName ?? null,
          target_source_kind: "message",
          target_source_message_id: inputValue.sourceMessageId,
          target_actor_kind: "worker",
          target_actor_user_id: null,
          target_correlation_id: inputValue.correlationId,
          target_trace_id: inputValue.traceId ?? null,
        },
        inputValue.signal,
      );
      const row = readSingleRow(response);
      return Object.freeze({
        mediaAssetId: readUuid(row, "media_asset_id"),
        ingestStatus: readText(row, "ingest_status", 32),
        wasReplayed: readBoolean(row, "was_replayed"),
      });
    },
    async registerObject(inputValue) {
      const operation = "register_media_asset_object";
      const storageObject = resolveMediaObject(inputValue.descriptor);
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.organizationId,
          target_media_asset_id: inputValue.mediaAssetId,
          target_rendition_kind: inputValue.descriptor.renditionKind,
          target_bucket_id: storageObject.bucketId,
          target_object_path: storageObject.objectPath,
          target_content_sha256: `\\x${validateHex(inputValue.descriptor.contentSha256Hex, 64)}`,
          target_mime_type: inputValue.descriptor.mimeType,
          target_byte_size: inputValue.byteSize,
          target_width_pixels: inputValue.widthPixels,
          target_height_pixels: inputValue.heightPixels,
          target_derivation_spec: inputValue.derivationSpec,
          target_actor_kind: "worker",
          target_actor_user_id: null,
          target_correlation_id: inputValue.correlationId,
          target_trace_id: inputValue.traceId ?? null,
        },
        inputValue.signal,
      );
      const row = readSingleRow(response);
      return Object.freeze({
        mediaAssetObjectId: readUuid(row, "media_asset_object_id"),
        objectStatus: readText(row, "object_status", 32),
        wasReplayed: readBoolean(row, "was_replayed"),
      });
    },
    async complete(inputValue) {
      const operation = "complete_whatsapp_media_ingest";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.organizationId,
          target_request_id: inputValue.requestId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.leaseToken,
          target_media_asset_id: inputValue.mediaAssetId,
        },
        inputValue.signal,
      );
      const row = readSingleRow(response);
      return Object.freeze({
        requestId: readUuid(row, "request_id"),
        status: readText(row, "status", 32),
        mediaAssetId: readUuid(row, "media_asset_id"),
        wasReplayed: readBoolean(row, "was_replayed"),
      });
    },
    async fail(inputValue) {
      const operation = "fail_whatsapp_media_ingest";
      const response = await postRpc(
        operation,
        {
          target_organization_id: inputValue.organizationId,
          target_request_id: inputValue.requestId,
          target_worker_id: inputValue.workerId,
          target_lease_token: inputValue.leaseToken,
          target_error_code: inputValue.errorCode,
          target_retryable: inputValue.retryable,
          target_retry_delay_seconds: inputValue.retryDelaySeconds,
          target_max_attempts: inputValue.maxAttempts,
        },
        inputValue.signal,
      );
      const row = readSingleRow(response);
      return Object.freeze({
        requestId: readUuid(row, "request_id"),
        status: readText(row, "status", 32),
        wasReplayed: readBoolean(row, "was_replayed"),
      });
    },
  });
};
