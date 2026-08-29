import { SensitiveValue, type SensitiveValue as SensitiveValueType } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_RPC_RESPONSE_BYTES = 1_048_576;

export type FacebookPublicationRpcFailureKind =
  "invalid" | "rejected" | "timeout" | "cancelled" | "dependency";

export class FacebookPublicationRpcError extends OperationalError {
  readonly kind: FacebookPublicationRpcFailureKind;

  constructor(kind: FacebookPublicationRpcFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "FACEBOOK_PUBLICATION_RPC_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "FACEBOOK_PUBLICATION_RPC_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      timeout: {
        code: "FACEBOOK_PUBLICATION_RPC_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
      cancelled: {
        code: "FACEBOOK_PUBLICATION_RPC_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      dependency: {
        code: "FACEBOOK_PUBLICATION_RPC_DEPENDENCY",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;
    super({ ...attributes[kind], cause });
    this.name = "FacebookPublicationRpcError";
    this.kind = kind;
  }
}

type RpcSignal = Readonly<{ signal?: AbortSignal }>;

export type FacebookPublicationMedia = Readonly<{
  mediaAssetId: string;
  mediaRole: "primary" | "gallery";
  ordinal: number;
  bucketId: string;
  objectPath: string;
  mimeType: "image/webp";
  byteSize: number;
}>;

export type ClaimedFacebookPublicationJob = Readonly<{
  organizationId: string;
  publicationJobId: string;
  publicationBatchId?: string;
  publicationId: string;
  publicationVersionId: string;
  operation: "publish" | "refresh";
  externalEffectKey: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptCount: number;
  maxAttempts: number;
  pageId?: string;
  apiVersion?: string;
  accessToken?: SensitiveValueType;
  headline: string;
  body: string;
  callToAction?: string;
  contentPayload: Readonly<Record<string, unknown>>;
  pricingStatus: "priced" | "on_request";
  priceAmount?: number;
  currencyCode?: string;
  media: readonly FacebookPublicationMedia[];
}>;

export type PublicationAuthorization = Readonly<{
  status: "allowed" | "blocked";
  reason?: string;
  snapshot: Readonly<Record<string, unknown>>;
}>;

export type PublicationRecoverySummary = Readonly<{
  scannedCount: number;
  retryableCount: number;
  failedCount: number;
  uncertainCount: number;
}>;

export type PublicationBatchReconciliationSummary = Readonly<{
  scannedCount: number;
  terminalCount: number;
  notificationsReady: number;
}>;

export type ClaimedPublicationBatchNotification = Readonly<{
  organizationId: string;
  subscriptionId: string;
  publicationBatchId: string;
  leaseToken: string;
  leaseExpiresAt: string;
  attemptCount: number;
  provider: string;
  model: string;
  reasoningEffort?: string;
  systemPrompt: string;
  summaryPayload: Readonly<Record<string, unknown>>;
}>;

export type FacebookPublicationJobOutcome =
  "succeeded" | "retryable" | "failed" | "blocked" | "cancelled" | "uncertain";

export type FacebookPublicationEffectCertainty =
  "not_started" | "confirmed_applied" | "confirmed_not_applied" | "unknown";

export type FacebookPublicationRpcClient = Readonly<{
  recoverExpiredJobs(
    input: Readonly<{ limit: number; organizationId?: string }> & RpcSignal,
  ): Promise<PublicationRecoverySummary>;
  claimJob(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedFacebookPublicationJob | undefined>;
  authorizeJob(
    input: Readonly<{ claim: ClaimedFacebookPublicationJob }> & RpcSignal,
  ): Promise<PublicationAuthorization>;
  markEffectStarted(
    input: Readonly<{ claim: ClaimedFacebookPublicationJob }> & RpcSignal,
  ): Promise<void>;
  recordRateLimitObservation(
    input: Readonly<{
      claim: ClaimedFacebookPublicationJob;
      source: "provider_headers" | "provider_error" | "capability_probe";
      providerRequestId?: string;
      retryAfterAt?: string;
      blockedUntil?: string;
      usageSnapshot: Readonly<Record<string, unknown>>;
    }> &
      RpcSignal,
  ): Promise<void>;
  recordJobResult(
    input: Readonly<{
      claim: ClaimedFacebookPublicationJob;
      outcome: FacebookPublicationJobOutcome;
      effectCertainty: FacebookPublicationEffectCertainty;
      providerRequestId?: string;
      externalPublicationId?: string;
      externalUrl?: string;
      instanceStatus?: "published" | "hidden" | "archived" | "deleted" | "error";
      responseSummary?: Readonly<Record<string, unknown>>;
      errorClass?: string;
      errorCode?: string;
      errorSummary?: Readonly<Record<string, unknown>>;
      retryAt?: string;
    }> &
      RpcSignal,
  ): Promise<void>;
  reconcileBatch(
    input: Readonly<{ organizationId: string; publicationBatchId: string }> & RpcSignal,
  ): Promise<void>;
  reconcileDueBatches(
    input: Readonly<{ limit: number; organizationId?: string }> & RpcSignal,
  ): Promise<PublicationBatchReconciliationSummary>;
  claimBatchNotification(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      organizationId?: string;
    }> &
      RpcSignal,
  ): Promise<ClaimedPublicationBatchNotification | undefined>;
  completeBatchNotification(
    input: Readonly<{
      claim: ClaimedPublicationBatchNotification;
      visibleText: string;
      providerRequestId: string;
    }> &
      RpcSignal,
  ): Promise<void>;
  failBatchNotification(
    input: Readonly<{
      claim: ClaimedPublicationBatchNotification;
      errorCode: string;
      retryable: boolean;
      retryAt?: string;
    }> &
      RpcSignal,
  ): Promise<void>;
}>;

export type CreateFacebookPublicationRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValueType;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const responseContractError = (cause?: unknown): FacebookPublicationRpcError =>
  new FacebookPublicationRpcError("dependency", cause);

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
    throw responseContractError();
  }
  return value;
};

const readOptionalText = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string | undefined => {
  if (row[field] === null || row[field] === undefined) {
    return undefined;
  }
  return readText(row, field, maximumLength);
};

const readInteger = (
  row: Readonly<Record<string, unknown>>,
  field: string,
  minimum: number,
): number => {
  const value = row[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw responseContractError();
  }
  return value;
};

const readNumber = (row: Readonly<Record<string, unknown>>, field: string): number | undefined => {
  const value = row[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  const numericValue = typeof value === "string" ? Number(value) : value;
  if (typeof numericValue !== "number" || !Number.isFinite(numericValue)) {
    throw responseContractError();
  }
  return numericValue;
};

const readUuid = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(row, field, 36);
  const groupLengths = [8, 4, 4, 4, 12];
  const groups = value.split("-");
  if (
    groups.length !== groupLengths.length ||
    groups.some((group, index) => {
      if (group.length !== groupLengths[index]) {
        return true;
      }
      return Array.from(group).some((character) => {
        const normalized = character.toLowerCase();
        return !(
          (normalized >= "0" && normalized <= "9") ||
          (normalized >= "a" && normalized <= "f")
        );
      });
    })
  ) {
    throw responseContractError();
  }
  return value.toLowerCase();
};

const readOptionalUuid = (
  row: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  if (row[field] === null || row[field] === undefined) {
    return undefined;
  }
  return readUuid(row, field);
};

const readTimestamp = (row: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(row, field, 64);
  if (!Number.isFinite(Date.parse(value))) {
    throw responseContractError();
  }
  return value;
};

const readRecord = (
  row: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> => {
  const value = row[field];
  if (!isRecord(value)) {
    throw responseContractError();
  }
  return value;
};

const readEnum = <T extends string>(
  row: Readonly<Record<string, unknown>>,
  field: string,
  values: ReadonlySet<T>,
): T => {
  const value = row[field];
  if (typeof value !== "string" || !values.has(value as T)) {
    throw responseContractError();
  }
  return value as T;
};

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1) {
    throw responseContractError();
  }
  const rows: readonly unknown[] = value;
  const row = rows[0];
  if (!isRecord(row)) {
    throw responseContractError();
  }
  return row;
};

const readOptionalSingleRow = (value: unknown): Readonly<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value) || value.length > 1) {
    throw responseContractError();
  }
  const rows: readonly unknown[] = value;
  const row = rows[0];
  if (row === undefined) {
    return undefined;
  }
  if (!isRecord(row)) {
    throw responseContractError();
  }
  return row;
};

const readMedia = (row: Readonly<Record<string, unknown>>): readonly FacebookPublicationMedia[] => {
  const value = row.media;
  if (!Array.isArray(value) || value.length > 64) {
    throw responseContractError();
  }
  return Object.freeze(
    value.map((item) => {
      if (!isRecord(item)) {
        throw responseContractError();
      }
      return Object.freeze({
        mediaAssetId: readUuid(item, "media_asset_id"),
        mediaRole: readEnum(item, "media_role", new Set(["primary", "gallery"] as const)),
        ordinal: readInteger(item, "ordinal", 0),
        bucketId: readText(item, "bucket_id", 120),
        objectPath: readText(item, "object_path", 1024),
        mimeType: readEnum(item, "mime_type", new Set(["image/webp"] as const)),
        byteSize: readInteger(item, "byte_size", 1),
      });
    }),
  );
};

const failureKindForStatus = (status: number): FacebookPublicationRpcFailureKind => {
  if (status === 400 || status === 413 || status === 422) {
    return "invalid";
  }
  if (status === 401 || status === 403) {
    return "rejected";
  }
  return "dependency";
};

const decodeResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAXIMUM_RPC_RESPONSE_BYTES) {
      throw responseContractError();
    }
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw responseContractError();
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw responseContractError(error);
  }
};

export function createFacebookPublicationRpcClient(
  input: CreateFacebookPublicationRpcClientInput,
): FacebookPublicationRpcClient {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";
  baseUrl.hash = "";

  const postRpc = async (
    name: string,
    payload: Readonly<Record<string, unknown>>,
    signal: AbortSignal | undefined,
  ): Promise<unknown> => {
    const url = new URL(baseUrl);
    url.pathname = `/rest/v1/rpc/${name}`;
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
        signal?.aborted === true ? "cancelled" : timeoutSignal.aborted ? "timeout" : "dependency";
      throw new FacebookPublicationRpcError(kind, error);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new FacebookPublicationRpcError(failureKindForStatus(response.status));
    }
    return decodeResponse(response);
  };

  return Object.freeze({
    async recoverExpiredJobs(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "recover_expired_facebook_publication_jobs",
          {
            target_limit: inputValue.limit,
            target_organization_id: inputValue.organizationId ?? null,
          },
          inputValue.signal,
        ),
      );
      return Object.freeze({
        scannedCount: readInteger(row, "scanned_count", 0),
        retryableCount: readInteger(row, "retryable_count", 0),
        failedCount: readInteger(row, "failed_count", 0),
        uncertainCount: readInteger(row, "uncertain_count", 0),
      });
    },
    async claimJob(inputValue) {
      const row = readOptionalSingleRow(
        await postRpc(
          "claim_facebook_publication_job",
          {
            target_worker_id: inputValue.workerId,
            target_lease_seconds: inputValue.leaseSeconds,
            target_organization_id: inputValue.organizationId ?? null,
          },
          inputValue.signal,
        ),
      );
      if (row === undefined) {
        return undefined;
      }
      const accessToken = readOptionalText(row, "access_token", 65_536);
      const publicationBatchId = readOptionalUuid(row, "publication_batch_id");
      const pageId = readOptionalText(row, "page_id", 255);
      const apiVersion = readOptionalText(row, "api_version", 32);
      const callToAction = readOptionalText(row, "call_to_action", 2_000);
      const priceAmount = readNumber(row, "price_amount");
      const currencyCode = readOptionalText(row, "currency_code", 3);
      return Object.freeze({
        organizationId: readUuid(row, "organization_id"),
        publicationJobId: readUuid(row, "publication_job_id"),
        ...(publicationBatchId === undefined ? {} : { publicationBatchId }),
        publicationId: readUuid(row, "publication_id"),
        publicationVersionId: readUuid(row, "publication_version_id"),
        operation: readEnum(row, "operation", new Set(["publish", "refresh"] as const)),
        externalEffectKey: readText(row, "external_effect_key", 240),
        leaseToken: readUuid(row, "lease_token"),
        leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
        attemptCount: readInteger(row, "attempt_count", 1),
        maxAttempts: readInteger(row, "max_attempts", 1),
        ...(pageId === undefined ? {} : { pageId }),
        ...(apiVersion === undefined ? {} : { apiVersion }),
        ...(accessToken === undefined ? {} : { accessToken: new SensitiveValue(accessToken) }),
        headline: readText(row, "headline", 500),
        body: readText(row, "body", 20_000),
        ...(callToAction === undefined ? {} : { callToAction }),
        contentPayload: readRecord(row, "content_payload"),
        pricingStatus: readEnum(row, "pricing_status", new Set(["priced", "on_request"] as const)),
        ...(priceAmount === undefined ? {} : { priceAmount }),
        ...(currencyCode === undefined ? {} : { currencyCode }),
        media: readMedia(row),
      });
    },
    async authorizeJob(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "authorize_publication_job",
          {
            target_organization_id: inputValue.claim.organizationId,
            target_publication_job_id: inputValue.claim.publicationJobId,
            target_lease_token: inputValue.claim.leaseToken,
          },
          inputValue.signal,
        ),
      );
      const reason = readOptionalText(row, "authorization_reason", 2_000);
      return Object.freeze({
        status: readEnum(row, "authorization_status", new Set(["allowed", "blocked"] as const)),
        ...(reason === undefined ? {} : { reason }),
        snapshot: readRecord(row, "authorization_snapshot"),
      });
    },
    async markEffectStarted(inputValue) {
      const response = await postRpc(
        "mark_publication_effect_started",
        {
          target_organization_id: inputValue.claim.organizationId,
          target_publication_job_id: inputValue.claim.publicationJobId,
          target_lease_token: inputValue.claim.leaseToken,
        },
        inputValue.signal,
      );
      if (typeof response !== "string" || !Number.isFinite(Date.parse(response))) {
        throw responseContractError();
      }
    },
    async recordRateLimitObservation(inputValue) {
      readSingleRow(
        await postRpc(
          "record_social_rate_limit_observation",
          {
            target_organization_id: inputValue.claim.organizationId,
            target_publication_job_id: inputValue.claim.publicationJobId,
            target_lease_token: inputValue.claim.leaseToken,
            target_observation_source: inputValue.source,
            target_provider_request_id: inputValue.providerRequestId ?? null,
            target_retry_after_at: inputValue.retryAfterAt ?? null,
            target_blocked_until: inputValue.blockedUntil ?? null,
            target_usage_snapshot: inputValue.usageSnapshot,
          },
          inputValue.signal,
        ),
      );
    },
    async recordJobResult(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "record_publication_job_result",
          {
            target_organization_id: inputValue.claim.organizationId,
            target_publication_job_id: inputValue.claim.publicationJobId,
            target_lease_token: inputValue.claim.leaseToken,
            target_outcome: inputValue.outcome,
            target_effect_certainty: inputValue.effectCertainty,
            target_provider_request_id: inputValue.providerRequestId ?? null,
            target_external_publication_id: inputValue.externalPublicationId ?? null,
            target_external_url: inputValue.externalUrl ?? null,
            target_instance_status: inputValue.instanceStatus ?? null,
            target_response_summary: inputValue.responseSummary ?? {},
            target_error_class: inputValue.errorClass ?? null,
            target_error_code: inputValue.errorCode ?? null,
            target_error_summary: inputValue.errorSummary ?? null,
            target_retry_at: inputValue.retryAt ?? null,
          },
          inputValue.signal,
        ),
      );
      readUuid(row, "publication_job_id");
      readEnum(
        row,
        "status",
        new Set<FacebookPublicationJobOutcome>([
          "succeeded",
          "retryable",
          "failed",
          "blocked",
          "cancelled",
          "uncertain",
        ]),
      );
    },
    async reconcileBatch(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "reconcile_publication_batch_notifications",
          {
            target_organization_id: inputValue.organizationId,
            target_publication_batch_id: inputValue.publicationBatchId,
          },
          inputValue.signal,
        ),
      );
      readUuid(row, "publication_batch_id");
      readText(row, "status", 40);
      readRecord(row, "job_counts");
      readInteger(row, "notifications_ready", 0);
    },
    async reconcileDueBatches(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "reconcile_due_publication_batches",
          {
            target_limit: inputValue.limit,
            target_organization_id: inputValue.organizationId ?? null,
          },
          inputValue.signal,
        ),
      );
      return Object.freeze({
        scannedCount: readInteger(row, "scanned_count", 0),
        terminalCount: readInteger(row, "terminal_count", 0),
        notificationsReady: readInteger(row, "notifications_ready", 0),
      });
    },
    async claimBatchNotification(inputValue) {
      const row = readOptionalSingleRow(
        await postRpc(
          "claim_publication_batch_notification",
          {
            target_worker_id: inputValue.workerId,
            target_lease_seconds: inputValue.leaseSeconds,
            target_organization_id: inputValue.organizationId ?? null,
          },
          inputValue.signal,
        ),
      );
      if (row === undefined) {
        return undefined;
      }
      const reasoningEffort = readOptionalText(row, "reasoning_effort", 80);
      return Object.freeze({
        organizationId: readUuid(row, "organization_id"),
        subscriptionId: readUuid(row, "publication_batch_subscription_id"),
        publicationBatchId: readUuid(row, "publication_batch_id"),
        leaseToken: readUuid(row, "lease_token"),
        leaseExpiresAt: readTimestamp(row, "lease_expires_at"),
        attemptCount: readInteger(row, "attempt_count", 1),
        provider: readText(row, "provider", 80),
        model: readText(row, "model", 240),
        ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
        systemPrompt: readText(row, "system_prompt", 200_000),
        summaryPayload: readRecord(row, "summary_payload"),
      });
    },
    async completeBatchNotification(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "complete_publication_batch_notification",
          {
            target_organization_id: inputValue.claim.organizationId,
            target_subscription_id: inputValue.claim.subscriptionId,
            target_lease_token: inputValue.claim.leaseToken,
            target_visible_text: inputValue.visibleText,
            target_provider_request_id: inputValue.providerRequestId,
          },
          inputValue.signal,
        ),
      );
      readUuid(row, "publication_batch_subscription_id");
      readText(row, "status", 40);
      readUuid(row, "message_id");
      readUuid(row, "outbox_event_id");
    },
    async failBatchNotification(inputValue) {
      const row = readSingleRow(
        await postRpc(
          "fail_publication_batch_notification",
          {
            target_organization_id: inputValue.claim.organizationId,
            target_subscription_id: inputValue.claim.subscriptionId,
            target_lease_token: inputValue.claim.leaseToken,
            target_error_code: inputValue.errorCode,
            target_retryable: inputValue.retryable,
            target_retry_at: inputValue.retryAt ?? null,
          },
          inputValue.signal,
        ),
      );
      readUuid(row, "publication_batch_subscription_id");
      readText(row, "status", 40);
    },
  });
}
