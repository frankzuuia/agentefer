import type { SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_RPC_RESPONSE_BYTES = 1_048_576;

export type AdminCatalogImageUploadFailureKind =
  | "invalid"
  | "rejected"
  | "timeout"
  | "cancelled"
  | "dependency";

export class AdminCatalogImageUploadRpcError extends OperationalError {
  readonly kind: AdminCatalogImageUploadFailureKind;

  constructor(kind: AdminCatalogImageUploadFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "ADMIN_CATALOG_IMAGE_RPC_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "ADMIN_CATALOG_IMAGE_RPC_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      timeout: {
        code: "ADMIN_CATALOG_IMAGE_RPC_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
      cancelled: {
        code: "ADMIN_CATALOG_IMAGE_RPC_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      dependency: {
        code: "ADMIN_CATALOG_IMAGE_RPC_DEPENDENCY",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;
    super({ ...attributes[kind], cause });
    this.name = "AdminCatalogImageUploadRpcError";
    this.kind = kind;
  }
}

type RpcSignal = Readonly<{ signal?: AbortSignal }>;

export type ClaimedAdminCatalogImageUpload = Readonly<{
  organizationId: string;
  uploadId: string;
  variantId: string;
  mediaAssetId?: string;
  sourceBucketId: string;
  sourceObjectPath: string;
  sourceContentSha256Hex: string;
  sourceMimeType: string;
  sourceByteSize: number;
  sourceWidthPixels: number;
  sourceHeightPixels: number;
  scope: "product" | "variant";
  allowPublic: boolean;
  altText?: string | null;
  idempotencyKey: string;
  attemptNumber: number;
  leaseToken: string;
  leaseExpiresAt: string;
}>;

export type CompletedAdminCatalogImageUpload = Readonly<{
  organizationId: string;
  uploadId: string;
  mediaAssetId: string;
  productMediaId: string;
  wasReplayed: boolean;
}>;

export type AdminCatalogImageUploadRpcClient = Readonly<{
  claim(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      maxAttempts: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedAdminCatalogImageUpload | undefined>;
  complete(
    input: Readonly<{
      organizationId: string;
      uploadId: string;
      workerId: string;
      leaseToken: string;
      analysisSha256Hex: string;
      analysisMimeType: string;
      analysisByteSize: number;
      analysisWidthPixels: number;
      analysisHeightPixels: number;
      analysisObjectPath: string;
      traceId?: string;
    }> &
      RpcSignal,
  ): Promise<CompletedAdminCatalogImageUpload>;
  fail(
    input: Readonly<{
      organizationId: string;
      uploadId: string;
      workerId: string;
      leaseToken: string;
      errorCode: string;
      retryable: boolean;
      retryDelaySeconds: number;
      maxAttempts: number;
      traceId?: string;
    }> &
      RpcSignal,
  ): Promise<Readonly<{ uploadId: string; status: string; wasReplayed: boolean }>>;
}>;

export type CreateAdminCatalogImageUploadRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const decodeJsonObject = async (
  response: Response,
): Promise<Readonly<Record<string, unknown>>> => {
  const text = await response.text();
  if (text.length > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw new AdminCatalogImageUploadRpcError("dependency");
  }
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value)) {
      if (value.length === 0) return Object.freeze({});
      const first: unknown = value[0];
      if (first && typeof first === "object" && !Array.isArray(first)) {
        return first as Readonly<Record<string, unknown>>;
      }
      return Object.freeze({});
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Readonly<Record<string, unknown>>;
    }
    return Object.freeze({});
  } catch (cause) {
    throw new AdminCatalogImageUploadRpcError("dependency", cause);
  }
};

const readField = (
  record: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = record[field];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};

const readNumber = (
  record: Readonly<Record<string, unknown>>,
  field: string,
): number | undefined => {
  const value = record[field];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
};

const callRpc = async (
  baseUrl: URL,
  secretKey: SensitiveValue,
  timeoutMilliseconds: number,
  functionName: string,
  body: Readonly<Record<string, unknown>>,
  signal: AbortSignal | undefined,
): Promise<Readonly<Record<string, unknown>>> => {
  const url = new URL(baseUrl);
  url.pathname = `/rest/v1/rpc/${functionName}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "accept-profile": "api",
        apikey: secretKey.reveal(),
        authorization: `Bearer ${secretKey.reveal()}`,
        "content-profile": "api",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: signal ?? AbortSignal.timeout(timeoutMilliseconds),
    });
  } catch (error) {
    const kind =
      error instanceof Error && error.name === "TimeoutError" ? "timeout" : "dependency";
    throw new AdminCatalogImageUploadRpcError(kind, error);
  }
  if (!response.ok) {
    await response.body?.cancel();
    const kind =
      response.status === 401
        ? "rejected"
        : response.status === 409
          ? "invalid"
          : response.status >= 400 && response.status < 500
            ? "invalid"
            : "dependency";
    throw new AdminCatalogImageUploadRpcError(kind);
  }
  return decodeJsonObject(response);
};

export function createAdminCatalogImageUploadRpcClient(
  input: CreateAdminCatalogImageUploadRpcClientInput,
): AdminCatalogImageUploadRpcClient {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";
  const secretKey = input.secretKey;

  return Object.freeze({
    async claim(claimInput) {
      const record = await callRpc(
        baseUrl,
        secretKey,
        input.timeoutMilliseconds,
        "claim_admin_catalog_image_upload",
        {
          target_worker_id: claimInput.workerId,
          target_lease_seconds: claimInput.leaseSeconds,
          target_max_attempts: claimInput.maxAttempts,
          target_organization_id: claimInput.organizationId ?? null,
        },
        claimInput.signal,
      );
      const organizationId = readField(record, "organizationId");
      const uploadId = readField(record, "uploadId");
      if (organizationId === undefined || uploadId === undefined) {
        return undefined;
      }
      const variantId = readField(record, "variantId");
      const sourceBucketId = readField(record, "sourceBucketId");
      const sourceObjectPath = readField(record, "sourceObjectPath");
      const sourceContentSha256Hex = readField(record, "sourceContentSha256Hex");
      const sourceMimeType = readField(record, "sourceMimeType");
      const sourceByteSize = readNumber(record, "sourceByteSize");
      const sourceWidthPixels = readNumber(record, "sourceWidthPixels");
      const sourceHeightPixels = readNumber(record, "sourceHeightPixels");
      const leaseToken = readField(record, "leaseToken");
      const leaseExpiresAt = readField(record, "leaseExpiresAt");
      const idempotencyKey = readField(record, "idempotencyKey");
      const mediaAssetId = readField(record, "mediaAssetId");
      const attemptNumber = readNumber(record, "attemptNumber") ?? 1;
      const scopeRaw = readField(record, "scope");
      const scope = scopeRaw === "product" || scopeRaw === "variant" ? scopeRaw : "variant";
      const allowPublic = record.allowPublic === true;
      const altTextRaw = record.altText;
      const altText = typeof altTextRaw === "string" && altTextRaw.length > 0 ? altTextRaw : null;
      if (
        variantId === undefined ||
        sourceBucketId === undefined ||
        sourceObjectPath === undefined ||
        sourceContentSha256Hex === undefined ||
        sourceMimeType === undefined ||
        sourceByteSize === undefined ||
        sourceWidthPixels === undefined ||
        sourceHeightPixels === undefined ||
        leaseToken === undefined ||
        leaseExpiresAt === undefined ||
        idempotencyKey === undefined
      ) {
        throw new AdminCatalogImageUploadRpcError("invalid");
      }
      return Object.freeze({
        organizationId,
        uploadId,
        variantId,
        ...(mediaAssetId === undefined ? {} : { mediaAssetId }),
        sourceBucketId,
        sourceObjectPath,
        sourceContentSha256Hex,
        sourceMimeType,
        sourceByteSize,
        sourceWidthPixels,
        sourceHeightPixels,
        scope,
        allowPublic,
        ...(altText === null ? {} : { altText }),
        idempotencyKey,
        attemptNumber,
        leaseToken,
        leaseExpiresAt,
      });
    },
    async complete(completeInput) {
      const record = await callRpc(
        baseUrl,
        secretKey,
        input.timeoutMilliseconds,
        "complete_admin_catalog_image_upload",
        {
          target_organization_id: completeInput.organizationId,
          target_upload_id: completeInput.uploadId,
          target_worker_id: completeInput.workerId,
          target_lease_token: completeInput.leaseToken,
          target_analysis_sha256_hex: completeInput.analysisSha256Hex,
          target_analysis_mime_type: completeInput.analysisMimeType,
          target_analysis_byte_size: completeInput.analysisByteSize,
          target_analysis_width_pixels: completeInput.analysisWidthPixels,
          target_analysis_height_pixels: completeInput.analysisHeightPixels,
          target_analysis_object_path: completeInput.analysisObjectPath,
          target_trace_id: completeInput.traceId ?? null,
        },
        completeInput.signal,
      );
      const organizationId = readField(record, "organizationId") ?? completeInput.organizationId;
      const uploadId = readField(record, "uploadId") ?? completeInput.uploadId;
      const mediaAssetId = readField(record, "mediaAssetId");
      const productMediaId = readField(record, "productMediaId");
      if (mediaAssetId === undefined || productMediaId === undefined) {
        throw new AdminCatalogImageUploadRpcError("invalid");
      }
      return Object.freeze({
        organizationId,
        uploadId,
        mediaAssetId,
        productMediaId,
        wasReplayed: record.wasReplayed === true,
      });
    },
    async fail(failInput) {
      const record = await callRpc(
        baseUrl,
        secretKey,
        input.timeoutMilliseconds,
        "fail_admin_catalog_image_upload",
        {
          target_organization_id: failInput.organizationId,
          target_upload_id: failInput.uploadId,
          target_worker_id: failInput.workerId,
          target_lease_token: failInput.leaseToken,
          target_error_code: failInput.errorCode,
          target_retryable: failInput.retryable,
          target_retry_delay_seconds: failInput.retryDelaySeconds,
          target_max_attempts: failInput.maxAttempts,
          target_trace_id: failInput.traceId ?? null,
        },
        failInput.signal,
      );
      const status = readField(record, "status") ?? "retryable";
      return Object.freeze({
        uploadId: readField(record, "uploadId") ?? failInput.uploadId,
        status,
        wasReplayed: record.wasReplayed === true,
      });
    },
  });
}
