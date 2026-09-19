import { type SensitiveValue } from "@agentefer/config";

export type ClaimedCatalogStorefront = Readonly<{
  jobId: string;
  organizationId: string;
  mediaAssetId: string;
  analysisSha256Hex: string;
  analysisByteSize: number;
  analysisWidth: number;
  analysisHeight: number;
  leaseToken: string;
  attemptNumber: number;
}>;

export type CatalogStorefrontRpcClient = Readonly<{
  claim(
    input: Readonly<{
      workerId: string;
      leaseSeconds: number;
      maxAttempts: number;
      signal?: AbortSignal;
    }>,
  ): Promise<ClaimedCatalogStorefront | undefined>;
  complete(
    input: Readonly<{ jobId: string; workerId: string; leaseToken: string; signal?: AbortSignal }>,
  ): Promise<void>;
  fail(
    input: Readonly<{
      jobId: string;
      workerId: string;
      leaseToken: string;
      errorCode: string;
      retryable: boolean;
      retryDelaySeconds: number;
      maxAttempts: number;
      signal?: AbortSignal;
    }>,
  ): Promise<void>;
}>;

type RpcRow = Readonly<Record<string, unknown>>;
const isRecord = (value: unknown): value is RpcRow =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const readText = (row: RpcRow, key: string, maximum = 128): string => {
  const value = row[key];
  if (typeof value !== "string" || value.length < 1 || value.length > maximum) {
    throw new Error(`Catalog storefront RPC contract: ${key}`);
  }
  return value;
};
const readInteger = (row: RpcRow, key: string): number => {
  const value = row[key];
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    throw new Error(`Catalog storefront RPC contract: ${key}`);
  }
  return value as number;
};
const readUuid = (row: RpcRow, key: string): string => {
  const value = readText(row, key, 64);
  const isHex = (character: string): boolean =>
    (character >= "0" && character <= "9") || (character >= "a" && character <= "f");
  const valid =
    value.length === 36 &&
    value[8] === "-" &&
    value[13] === "-" &&
    value[18] === "-" &&
    value[23] === "-" &&
    value[14] !== undefined &&
    value[14] >= "1" &&
    value[14] <= "5" &&
    value[19] !== undefined &&
    ["8", "9", "a", "b"].includes(value[19]) &&
    Array.from(value).every(
      (character, index) => [8, 13, 18, 23].includes(index) || isHex(character),
    );
  if (!valid) {
    throw new Error(`Catalog storefront RPC contract: ${key}`);
  }
  return value;
};
const readHash = (row: RpcRow, key: string): string => {
  const value = readText(row, key, 64);
  if (
    value.length !== 64 ||
    Array.from(value).some(
      (character) =>
        !((character >= "0" && character <= "9") || (character >= "a" && character <= "f")),
    )
  ) {
    throw new Error(`Catalog storefront RPC contract: ${key}`);
  }
  return value;
};

export const createCatalogStorefrontRpcClient = (
  input: Readonly<{
    supabaseUrl: string;
    secretKey: SensitiveValue;
    timeoutMilliseconds: number;
  }>,
): CatalogStorefrontRpcClient => {
  const origin = new URL(input.supabaseUrl);
  if (
    origin.protocol !== "https:" &&
    origin.hostname !== "127.0.0.1" &&
    origin.hostname !== "localhost"
  ) {
    throw new Error("Catalog storefront RPC requires HTTPS");
  }
  if (!Number.isSafeInteger(input.timeoutMilliseconds) || input.timeoutMilliseconds < 1) {
    throw new Error("Catalog storefront RPC timeout is invalid");
  }
  const post = async (
    operation: string,
    payload: RpcRow,
    signal?: AbortSignal,
  ): Promise<unknown> => {
    const endpoint = new URL(`/rest/v1/rpc/${operation}`, origin);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        apikey: input.secretKey.reveal(),
        authorization: `Bearer ${input.secretKey.reveal()}`,
        "content-type": "application/json",
        "content-profile": "api",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal:
        signal === undefined
          ? AbortSignal.timeout(input.timeoutMilliseconds)
          : AbortSignal.any([signal, AbortSignal.timeout(input.timeoutMilliseconds)]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Catalog storefront RPC ${operation} failed: ${String(response.status)}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 16384) throw new Error("Catalog storefront RPC response too large");
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  };
  return Object.freeze({
    async claim(value) {
      const payload = await post(
        "claim_catalog_storefront_job",
        {
          target_worker_id: value.workerId,
          target_lease_seconds: value.leaseSeconds,
          target_max_attempts: value.maxAttempts,
        },
        value.signal,
      );
      if (!Array.isArray(payload) || payload.length > 1)
        throw new Error("Catalog storefront claim contract");
      if (payload.length === 0) return undefined;
      const rows: readonly unknown[] = payload;
      const row = rows[0];
      if (!isRecord(row)) throw new Error("Catalog storefront claim row contract");
      return Object.freeze({
        jobId: readUuid(row, "job_id"),
        organizationId: readUuid(row, "organization_id"),
        mediaAssetId: readUuid(row, "media_asset_id"),
        analysisSha256Hex: readHash(row, "analysis_sha256_hex"),
        analysisByteSize: readInteger(row, "analysis_byte_size"),
        analysisWidth: readInteger(row, "analysis_width"),
        analysisHeight: readInteger(row, "analysis_height"),
        leaseToken: readUuid(row, "lease_token"),
        attemptNumber: readInteger(row, "attempt_number"),
      });
    },
    async complete(value) {
      const payload = await post(
        "complete_catalog_storefront_job",
        {
          target_job_id: value.jobId,
          target_worker_id: value.workerId,
          target_lease_token: value.leaseToken,
        },
        value.signal,
      );
      if (payload !== true) throw new Error("Catalog storefront complete contract");
    },
    async fail(value) {
      const payload = await post(
        "fail_catalog_storefront_job",
        {
          target_job_id: value.jobId,
          target_worker_id: value.workerId,
          target_lease_token: value.leaseToken,
          target_error_code: value.errorCode,
          target_retryable: value.retryable,
          target_retry_delay_seconds: value.retryDelaySeconds,
          target_max_attempts: value.maxAttempts,
        },
        value.signal,
      );
      if (payload !== "retryable" && payload !== "failed") {
        throw new Error("Catalog storefront fail contract");
      }
    },
  });
};
