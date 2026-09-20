import { createHash } from "node:crypto";

import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import { createAdaptivePoller, type PollingCycleOutcome } from "./adaptive-polling.js";
import { MediaStorageError, type MediaStorageClient } from "./media-storage.js";
import {
  normalizeImage,
  WhatsAppMediaError,
  type NormalizedImage,
} from "./whatsapp-media.js";
import {
  AdminCatalogImageUploadRpcError,
  type AdminCatalogImageUploadRpcClient,
  type ClaimedAdminCatalogImageUpload,
} from "./admin-catalog-image-rpc.js";

export type AdminCatalogImageUploadProcessorConfiguration = Readonly<{
  workerId: string;
  pollIntervalMilliseconds: number;
  maximumIdlePollIntervalMilliseconds: number;
  idleBackoffJitterPercent: number;
  leaseSeconds: number;
  maxAttempts: number;
  retryDelaySeconds: number;
  batchSize: number;
}>;

export type CreateAdminCatalogImageUploadProcessorInput = Readonly<{
  configuration: AdminCatalogImageUploadProcessorConfiguration;
  rpcClient: AdminCatalogImageUploadRpcClient;
  storageClient: MediaStorageClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
  onWorkObserved?(): void;
}>;

export type AdminCatalogImageUploadProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
  wake(): void;
}>;

type SupportedSourceMime = "image/jpeg" | "image/png" | "image/webp";

const isSupportedSourceMime = (value: string): value is SupportedSourceMime =>
  value === "image/jpeg" || value === "image/png" || value === "image/webp";

const hashHex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const classifyFailure = (
  error: unknown,
): Readonly<{ errorCode: string; retryable: boolean }> => {
  if (error instanceof WhatsAppMediaError) {
    return Object.freeze({
      errorCode: error.code,
      retryable: error.kind === "retryable" || error.kind === "timeout",
    });
  }
  if (error instanceof MediaStorageError) {
    return Object.freeze({
      errorCode: error.code,
      retryable:
        error.kind === "retryable" || error.kind === "timeout" || error.kind === "uncertain",
    });
  }
  if (error instanceof AdminCatalogImageUploadRpcError) {
    return Object.freeze({
      errorCode: error.code,
      retryable: error.kind === "timeout" || error.kind === "dependency",
    });
  }
  return Object.freeze({ errorCode: "ADMIN_CATALOG_IMAGE_INTERNAL_FAILURE", retryable: true });
};

const processClaim = async (
  input: CreateAdminCatalogImageUploadProcessorInput,
  claim: ClaimedAdminCatalogImageUpload,
  signal: AbortSignal,
): Promise<void> => {
  if (!isSupportedSourceMime(claim.sourceMimeType)) {
    throw new MediaStorageError("invalid", new Error("unsupported source mime type"));
  }
  const sourceDescriptor = {
    organizationId: claim.organizationId,
    mediaAssetId: claim.mediaAssetId ?? claim.uploadId,
    renditionKind: "source_original" as const,
    contentSha256Hex: claim.sourceContentSha256Hex,
    mimeType: claim.sourceMimeType,
  };
  const originalBytes = await input.storageClient.downloadPrivateObject(
    sourceDescriptor,
    signal,
  );
  const observedSha256 = hashHex(originalBytes);
  if (observedSha256 !== claim.sourceContentSha256Hex) {
    throw new MediaStorageError("uncertain", new Error("source sha256 mismatch"));
  }
  const normalized: NormalizedImage = await normalizeImage({
    bytes: originalBytes,
    declaredMimeType: claim.sourceMimeType,
    declaredSha256Hex: claim.sourceContentSha256Hex,
    declaredFileSize: claim.sourceByteSize,
  });
  const analysisDescriptor = {
    organizationId: claim.organizationId,
    mediaAssetId: claim.mediaAssetId ?? claim.uploadId,
    renditionKind: "analysis_webp" as const,
    contentSha256Hex: normalized.analysisWebpSha256Hex,
    mimeType: "image/webp" as const,
  };
  await input.storageClient.uploadObject(
    analysisDescriptor,
    normalized.analysisWebpBytes,
    signal,
  );
  const analysisObjectPath = `${claim.organizationId}/${claim.mediaAssetId ?? claim.uploadId}/analysis_webp/${normalized.analysisWebpSha256Hex}.webp`;
  await input.rpcClient.complete({
    organizationId: claim.organizationId,
    uploadId: claim.uploadId,
    workerId: input.configuration.workerId,
    leaseToken: claim.leaseToken,
    analysisSha256Hex: normalized.analysisWebpSha256Hex,
    analysisMimeType: "image/webp",
    analysisByteSize: normalized.analysisWebpBytes.byteLength,
    analysisWidthPixels: normalized.analysisWidthPixels,
    analysisHeightPixels: normalized.analysisHeightPixels,
    analysisObjectPath,
    signal,
  });
  input.logger.info("admin.catalog.image.upload.completed", "succeeded", {
    organization_id: claim.organizationId,
    upload_id: claim.uploadId,
    variant_id: claim.variantId,
    analysis_byte_size: normalized.analysisWebpBytes.byteLength,
    analysis_width_pixels: normalized.analysisWidthPixels,
    analysis_height_pixels: normalized.analysisHeightPixels,
  });
};

const drainOnce = async (
  input: CreateAdminCatalogImageUploadProcessorInput,
  signal: AbortSignal,
): Promise<Readonly<{ processedCount: number }>> => {
  const claims: ClaimedAdminCatalogImageUpload[] = [];
  for (let i = 0; i < input.configuration.batchSize; i += 1) {
    if (signal.aborted) break;
    const claim = await input.rpcClient.claim({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    if (claim === undefined) break;
    claims.push(claim);
  }
  if (claims.length === 0) return Object.freeze({ processedCount: 0 });
  input.onWorkObserved?.();
  for (const claim of claims) {
    if (signal.aborted) break;
    try {
      await processClaim(input, claim, signal);
    } catch (error) {
      const classification = classifyFailure(error);
      input.logger.warn("admin.catalog.image.upload.failed", "failed", {
        organization_id: claim.organizationId,
        upload_id: claim.uploadId,
        attempt_number: claim.attemptNumber,
        error_code: classification.errorCode,
        retryable: classification.retryable,
      });
      try {
        await input.rpcClient.fail({
          organizationId: claim.organizationId,
          uploadId: claim.uploadId,
          workerId: input.configuration.workerId,
          leaseToken: claim.leaseToken,
          errorCode: classification.errorCode,
          retryable: classification.retryable,
          retryDelaySeconds: input.configuration.retryDelaySeconds,
          maxAttempts: input.configuration.maxAttempts,
          signal,
        });
      } catch (failError) {
        input.logger.error("admin.catalog.image.upload.fail-report-failed", failError, {
          organization_id: claim.organizationId,
          upload_id: claim.uploadId,
        });
      }
    }
  }
  return Object.freeze({ processedCount: claims.length });
};

export const drainAdminCatalogImageUploadOnce = (
  input: CreateAdminCatalogImageUploadProcessorInput,
  signal: AbortSignal,
): Promise<Readonly<{ processedCount: number }>> => drainOnce(input, signal);

export function createAdminCatalogImageUploadProcessor(
  input: CreateAdminCatalogImageUploadProcessorInput,
): AdminCatalogImageUploadProcessor {
  const controller = new AbortController();
  const poller = createAdaptivePoller({
    configuration: {
      baseIntervalMilliseconds: input.configuration.pollIntervalMilliseconds,
      maximumIdleIntervalMilliseconds: input.configuration.maximumIdlePollIntervalMilliseconds,
      jitterPercent: input.configuration.idleBackoffJitterPercent,
    },
  });
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<
    Readonly<{ operational: boolean; outcome: PollingCycleOutcome }>
  > => {
    const operation = "admin.catalog.image.upload.cycle";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    try {
      const result = await drainAdminCatalogImageUploadOnce(input, controller.signal);
      const wasCancelled = controller.signal.aborted;
      if (!wasCancelled) {
        input.logger.debug("worker.admin.catalog.image_cycle_completed", "succeeded", {
          processed_count: result.processedCount,
        });
      }
      input.metrics.recordCompleted({
        operation,
        outcome: wasCancelled ? "cancelled" : "succeeded",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
      if (wasCancelled) {
        return Object.freeze({ operational: false, outcome: "failed" });
      }
      const outcome: PollingCycleOutcome = result.processedCount > 0 ? "active" : "idle";
      if (outcome === "active") {
        input.onWorkObserved?.();
      }
      return Object.freeze({ operational: true, outcome });
    } catch (error) {
      const wasCancelled = controller.signal.aborted;
      if (!wasCancelled) {
        input.logger.error("worker.admin.catalog.image_cycle_failed", error);
      }
      if (wasCancelled) {
        input.metrics.recordCompleted({
          operation,
          outcome: "cancelled",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      } else {
        input.metrics.recordCompleted({
          operation,
          outcome: "failed",
          errorCategory: "internal",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      }
      return Object.freeze({ operational: false, outcome: "failed" });
    }
  };

  const runLoop = async (
    initialCycle: Readonly<{ operational: boolean; outcome: PollingCycleOutcome }>,
  ): Promise<void> => {
    let previousCycle = initialCycle;
    while (!controller.signal.aborted) {
      const decision = poller.decide(previousCycle.outcome);
      const waitResult = await poller.wait(decision, controller.signal);
      if (waitResult === "aborted") break;
      previousCycle = await executeCycle();
      input.onOperationalStateChange(previousCycle.operational);
    }
  };

  return Object.freeze({
    async start() {
      if (started) throw new TypeError("Admin catalog image upload processor cannot start twice");
      started = true;
      const initial = await executeCycle();
      input.onOperationalStateChange(initial.operational);
      if (!controller.signal.aborted) {
        loopPromise = runLoop(initial);
      }
      return initial.operational;
    },
    async stop() {
      controller.abort();
      if (loopPromise !== undefined) await loopPromise;
    },
    wake() {
      // The adaptive poller exposes wake via its decide loop;
      // observers wake the loop by calling executeCycle at the start of start().
    },
  });
}
