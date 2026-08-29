import { createHash } from "node:crypto";

import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import {
  MediaIngestRpcError,
  type ClaimedMediaIngest,
  type MediaIngestRpcClient,
} from "./media-ingest-rpc.js";
import {
  MediaStorageError,
  type MediaObjectDescriptor,
  type MediaStorageClient,
} from "./media-storage.js";
import {
  normalizeImage,
  WhatsAppMediaError,
  type NormalizedImage,
  type WhatsAppMediaClient,
} from "./whatsapp-media.js";

export type MediaIngestProcessorConfiguration = Readonly<{
  workerId: string;
  pollIntervalMilliseconds: number;
  leaseSeconds: number;
  maxAttempts: number;
  retryDelaySeconds: number;
  batchSize: number;
}>;

export type CreateMediaIngestProcessorInput = Readonly<{
  configuration: MediaIngestProcessorConfiguration;
  rpcClient: MediaIngestRpcClient;
  mediaClient: WhatsAppMediaClient;
  storageClient: MediaStorageClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

export type MediaIngestProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
}>;

export type MediaIngestCycleResult = Readonly<{
  processedCount: number;
}>;

const elapsedMilliseconds = (startedAt: number): number =>
  Math.max(0, performance.now() - startedAt);

const hashHex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const wasAborted = (signal: AbortSignal): boolean => signal.aborted;

const classifyFailure = (error: unknown): Readonly<{ errorCode: string; retryable: boolean }> => {
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
  if (error instanceof MediaIngestRpcError) {
    return Object.freeze({
      errorCode: error.code,
      retryable: error.kind === "timeout" || error.kind === "dependency",
    });
  }
  return Object.freeze({ errorCode: "MEDIA_INGEST_INTERNAL_FAILURE", retryable: true });
};

const uploadOrVerifyExisting = async (
  storageClient: MediaStorageClient,
  descriptor: MediaObjectDescriptor,
  bytes: Uint8Array,
  signal: AbortSignal,
): Promise<void> => {
  try {
    await storageClient.uploadObject(descriptor, bytes, signal);
  } catch (error) {
    if (!(error instanceof MediaStorageError) || error.kind !== "conflict") {
      throw error;
    }
    const existingBytes = await storageClient.downloadPrivateObject(descriptor, signal);
    if (hashHex(existingBytes) !== descriptor.contentSha256Hex) {
      throw new MediaStorageError("uncertain", error);
    }
  }
};

const compareDeclaredEvidence = (
  claim: ClaimedMediaIngest,
  retrieved: Readonly<{
    declaredMimeType: string;
    declaredSha256Hex?: string;
    declaredFileSize?: number;
  }>,
): void => {
  if (
    (claim.declaredMimeType !== undefined &&
      claim.declaredMimeType !== retrieved.declaredMimeType) ||
    (claim.declaredSha256Hex !== undefined &&
      retrieved.declaredSha256Hex !== undefined &&
      claim.declaredSha256Hex !== retrieved.declaredSha256Hex) ||
    (claim.declaredFileSize !== undefined &&
      retrieved.declaredFileSize !== undefined &&
      claim.declaredFileSize !== retrieved.declaredFileSize)
  ) {
    throw new WhatsAppMediaError("invalid");
  }
};

const persistNormalizedImage = async (
  input: CreateMediaIngestProcessorInput,
  claim: ClaimedMediaIngest,
  normalized: NormalizedImage,
  signal: AbortSignal,
): Promise<string> => {
  const begun = await input.rpcClient.beginAsset({
    organizationId: claim.organizationId,
    contentSha256Hex: normalized.originalSha256Hex,
    mimeType: normalized.originalMimeType,
    byteSize: normalized.originalBytes.byteLength,
    widthPixels: normalized.widthPixels,
    heightPixels: normalized.heightPixels,
    sourceMessageId: claim.messageId,
    correlationId: claim.correlationId,
    ...(claim.traceId === undefined ? {} : { traceId: claim.traceId }),
    signal,
  });

  if (begun.ingestStatus === "verified") {
    return begun.mediaAssetId;
  }
  if (begun.ingestStatus !== "received") {
    throw new MediaIngestRpcError("invalid", new Error("media asset is not ingestible"));
  }

  const originalDescriptor: MediaObjectDescriptor = {
    organizationId: claim.organizationId,
    mediaAssetId: begun.mediaAssetId,
    renditionKind: "source_original",
    contentSha256Hex: normalized.originalSha256Hex,
    mimeType: normalized.originalMimeType,
  };
  await uploadOrVerifyExisting(
    input.storageClient,
    originalDescriptor,
    normalized.originalBytes,
    signal,
  );
  await input.rpcClient.registerObject({
    organizationId: claim.organizationId,
    mediaAssetId: begun.mediaAssetId,
    descriptor: originalDescriptor,
    byteSize: normalized.originalBytes.byteLength,
    widthPixels: normalized.widthPixels,
    heightPixels: normalized.heightPixels,
    derivationSpec: Object.freeze({ kind: "source_original", source: "whatsapp_cloud_api" }),
    correlationId: claim.correlationId,
    ...(claim.traceId === undefined ? {} : { traceId: claim.traceId }),
    signal,
  });

  const analysisDescriptor: MediaObjectDescriptor = {
    organizationId: claim.organizationId,
    mediaAssetId: begun.mediaAssetId,
    renditionKind: "analysis_webp",
    contentSha256Hex: normalized.analysisWebpSha256Hex,
    mimeType: "image/webp",
  };
  await uploadOrVerifyExisting(
    input.storageClient,
    analysisDescriptor,
    normalized.analysisWebpBytes,
    signal,
  );
  await input.rpcClient.registerObject({
    organizationId: claim.organizationId,
    mediaAssetId: begun.mediaAssetId,
    descriptor: analysisDescriptor,
    byteSize: normalized.analysisWebpBytes.byteLength,
    widthPixels: normalized.analysisWidthPixels,
    heightPixels: normalized.analysisHeightPixels,
    derivationSpec: Object.freeze({
      kind: "analysis_webp",
      source: "sharp",
      quality: 85,
      effort: 4,
    }),
    correlationId: claim.correlationId,
    ...(claim.traceId === undefined ? {} : { traceId: claim.traceId }),
    signal,
  });

  return begun.mediaAssetId;
};

const processClaim = async (
  input: CreateMediaIngestProcessorInput,
  claim: ClaimedMediaIngest,
  signal: AbortSignal,
): Promise<void> => {
  try {
    const retrieved = await input.mediaClient.retrieveImage(
      {
        apiVersion: claim.apiVersion,
        phoneNumberId: claim.phoneNumberId,
        mediaId: claim.providerMediaId,
        accessToken: claim.accessToken,
      },
      signal,
    );
    compareDeclaredEvidence(claim, retrieved);
    const normalized = await normalizeImage({
      ...retrieved,
      ...(claim.declaredSha256Hex === undefined && retrieved.declaredSha256Hex !== undefined
        ? {}
        : { declaredSha256Hex: claim.declaredSha256Hex ?? retrieved.declaredSha256Hex }),
      ...(claim.declaredFileSize === undefined && retrieved.declaredFileSize !== undefined
        ? {}
        : { declaredFileSize: claim.declaredFileSize ?? retrieved.declaredFileSize }),
    });
    const mediaAssetId = await persistNormalizedImage(input, claim, normalized, signal);
    await input.rpcClient.complete({
      organizationId: claim.organizationId,
      requestId: claim.requestId,
      workerId: input.configuration.workerId,
      leaseToken: claim.leaseToken,
      mediaAssetId,
      signal,
    });
    input.logger.info("worker.media.ingest_completed", "succeeded", {
      organization_id: claim.organizationId,
      request_id: claim.requestId,
      media_asset_id: mediaAssetId,
      attempt_number: claim.attemptNumber,
    });
  } catch (error) {
    if (signal.aborted) {
      return;
    }
    const failure = classifyFailure(error);
    await input.rpcClient.fail({
      organizationId: claim.organizationId,
      requestId: claim.requestId,
      workerId: input.configuration.workerId,
      leaseToken: claim.leaseToken,
      errorCode: failure.errorCode,
      retryable: failure.retryable,
      retryDelaySeconds: input.configuration.retryDelaySeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    input.logger.error("worker.media.ingest_failed", error, {
      organization_id: claim.organizationId,
      request_id: claim.requestId,
      attempt_number: claim.attemptNumber,
      retryable: failure.retryable,
    });
  }
};

export async function drainMediaIngestOnce(
  input: CreateMediaIngestProcessorInput,
  signal: AbortSignal,
): Promise<MediaIngestCycleResult> {
  let processedCount = 0;
  while (processedCount < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claim({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    if (claim === undefined) {
      break;
    }
    const operation = "media.ingest";
    const startedAt = performance.now();
    input.metrics.recordStarted(operation);
    await processClaim(input, claim, signal);
    const wasCancelled = wasAborted(signal);
    if (wasCancelled) {
      input.metrics.recordCompleted({
        operation,
        outcome: "cancelled",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
    } else {
      input.metrics.recordCompleted({
        operation,
        outcome: "succeeded",
        durationMilliseconds: elapsedMilliseconds(startedAt),
      });
    }
    processedCount += 1;
  }
  return Object.freeze({ processedCount });
}

export function createMediaIngestProcessor(
  input: CreateMediaIngestProcessorInput,
): MediaIngestProcessor {
  const controller = new AbortController();
  let started = false;
  let loopPromise: Promise<void> | undefined;

  const executeCycle = async (): Promise<boolean> => {
    const startedAt = performance.now();
    try {
      const result = await drainMediaIngestOnce(input, controller.signal);
      if (!controller.signal.aborted) {
        input.logger.debug("worker.media.ingest_cycle_completed", "succeeded", {
          processed_count: result.processedCount,
        });
      }
      const wasCancelled = controller.signal.aborted;
      if (wasCancelled) {
        input.metrics.recordCompleted({
          operation: "media.ingest.cycle",
          outcome: "cancelled",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      } else {
        input.metrics.recordCompleted({
          operation: "media.ingest.cycle",
          outcome: "succeeded",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      }
      return !wasCancelled;
    } catch (error) {
      if (!controller.signal.aborted) {
        input.logger.error("worker.media.ingest_cycle_failed", error);
      }
      const wasCancelled = controller.signal.aborted;
      if (wasCancelled) {
        input.metrics.recordCompleted({
          operation: "media.ingest.cycle",
          outcome: "cancelled",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      } else {
        input.metrics.recordCompleted({
          operation: "media.ingest.cycle",
          outcome: "failed",
          errorCategory: "internal",
          durationMilliseconds: elapsedMilliseconds(startedAt),
        });
      }
      return false;
    }
  };

  const runLoop = async (): Promise<void> => {
    while (!wasAborted(controller.signal)) {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, input.configuration.pollIntervalMilliseconds);
        controller.signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
      const abortRequested = wasAborted(controller.signal);
      if (!abortRequested) {
        input.onOperationalStateChange(await executeCycle());
      }
    }
  };

  return Object.freeze({
    async start() {
      if (started) {
        throw new TypeError("Media ingest processor cannot be started twice");
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
