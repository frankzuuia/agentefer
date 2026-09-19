import { createHash } from "node:crypto";

import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";

import { createAdaptivePoller, type PollingCycleOutcome } from "./adaptive-polling.js";
import {
  type CatalogStorefrontRpcClient,
  type ClaimedCatalogStorefront,
} from "./catalog-storefront-rpc.js";
import { type MediaIngestRpcClient, MediaIngestRpcError } from "./media-ingest-rpc.js";
import {
  MediaStorageError,
  type MediaObjectDescriptor,
  type MediaStorageClient,
} from "./media-storage.js";

const MAXIMUM_PUBLIC_IMAGE_BYTES = 10_485_760;
const digest = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

export type CreateCatalogStorefrontProcessorInput = Readonly<{
  configuration: Readonly<{
    workerId: string;
    pollIntervalMilliseconds: number;
    maximumIdlePollIntervalMilliseconds: number;
    idleBackoffJitterPercent: number;
    leaseSeconds: number;
    maxAttempts: number;
    retryDelaySeconds: number;
    batchSize: number;
  }>;
  rpcClient: CatalogStorefrontRpcClient;
  mediaRpcClient: Pick<MediaIngestRpcClient, "registerObject">;
  storageClient: MediaStorageClient;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  onOperationalStateChange(operational: boolean): void;
}>;

export type CatalogStorefrontProcessor = Readonly<{
  start(): Promise<boolean>;
  stop(): Promise<void>;
  wake(): void;
}>;

const verifyExistingPublicObject = async (
  storageClient: MediaStorageClient,
  descriptor: MediaObjectDescriptor,
  expectedHash: string,
  signal: AbortSignal,
): Promise<void> => {
  const url = storageClient.createPublicObjectUrl(descriptor);
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]),
  });
  if (!response.ok || response.headers.get("content-type")?.split(";", 1)[0] !== "image/webp") {
    await response.body?.cancel();
    throw new MediaStorageError("uncertain");
  }
  const size = Number(response.headers.get("content-length"));
  if (Number.isFinite(size) && size > MAXIMUM_PUBLIC_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new MediaStorageError("invalid");
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAXIMUM_PUBLIC_IMAGE_BYTES || digest(bytes) !== expectedHash) {
    throw new MediaStorageError("uncertain");
  }
};

export const promoteCatalogStorefrontPhoto = async (
  input: CreateCatalogStorefrontProcessorInput,
  claim: ClaimedCatalogStorefront,
  signal: AbortSignal,
): Promise<void> => {
  const privateDescriptor: MediaObjectDescriptor = {
    organizationId: claim.organizationId,
    mediaAssetId: claim.mediaAssetId,
    renditionKind: "analysis_webp",
    contentSha256Hex: claim.analysisSha256Hex,
    mimeType: "image/webp",
  };
  const publicDescriptor: MediaObjectDescriptor = {
    ...privateDescriptor,
    renditionKind: "storefront_webp",
  };
  const bytes = await input.storageClient.downloadPrivateObject(privateDescriptor, signal);
  if (
    bytes.byteLength !== claim.analysisByteSize ||
    bytes.byteLength > MAXIMUM_PUBLIC_IMAGE_BYTES ||
    digest(bytes) !== claim.analysisSha256Hex
  ) {
    throw new MediaStorageError("invalid");
  }
  try {
    await input.storageClient.uploadObject(publicDescriptor, bytes, signal);
  } catch (error) {
    if (!(error instanceof MediaStorageError) || error.kind !== "conflict") throw error;
    await verifyExistingPublicObject(
      input.storageClient,
      publicDescriptor,
      claim.analysisSha256Hex,
      signal,
    );
  }
  const registered = await input.mediaRpcClient.registerObject({
    organizationId: claim.organizationId,
    mediaAssetId: claim.mediaAssetId,
    descriptor: publicDescriptor,
    byteSize: bytes.byteLength,
    widthPixels: claim.analysisWidth,
    heightPixels: claim.analysisHeight,
    derivationSpec: Object.freeze({
      kind: "storefront_webp",
      source: "analysis_webp",
      source_sha256: claim.analysisSha256Hex,
    }),
    correlationId: `catalog-storefront:${claim.jobId}`,
    signal,
  });
  if (registered.objectStatus !== "published") {
    throw new MediaIngestRpcError("invalid");
  }
  await input.rpcClient.complete({
    jobId: claim.jobId,
    workerId: input.configuration.workerId,
    leaseToken: claim.leaseToken,
    signal,
  });
};

export const drainCatalogStorefrontOnce = async (
  input: CreateCatalogStorefrontProcessorInput,
  signal: AbortSignal,
): Promise<number> => {
  let processed = 0;
  while (processed < input.configuration.batchSize && !signal.aborted) {
    const claim = await input.rpcClient.claim({
      workerId: input.configuration.workerId,
      leaseSeconds: input.configuration.leaseSeconds,
      maxAttempts: input.configuration.maxAttempts,
      signal,
    });
    if (!claim) break;
    const startedAt = performance.now();
    input.metrics.recordStarted("media.storefront");
    try {
      await promoteCatalogStorefrontPhoto(input, claim, signal);
      input.logger.info("worker.media.storefront_published", "succeeded", {
        organization_id: claim.organizationId,
        media_asset_id: claim.mediaAssetId,
      });
      input.metrics.recordCompleted({
        operation: "media.storefront",
        outcome: "succeeded",
        durationMilliseconds: performance.now() - startedAt,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") break;
      const retryable =
        error instanceof MediaStorageError
          ? error.kind === "retryable" || error.kind === "timeout" || error.kind === "uncertain"
          : error instanceof MediaIngestRpcError
            ? error.kind === "timeout" || error.kind === "dependency"
            : true;
      const errorCode =
        error instanceof MediaStorageError || error instanceof MediaIngestRpcError
          ? error.code
          : "MEDIA_STOREFRONT_INTERNAL_FAILURE";
      await input.rpcClient.fail({
        jobId: claim.jobId,
        workerId: input.configuration.workerId,
        leaseToken: claim.leaseToken,
        errorCode,
        retryable,
        retryDelaySeconds: input.configuration.retryDelaySeconds,
        maxAttempts: input.configuration.maxAttempts,
        signal,
      });
      input.logger.error("worker.media.storefront_failed", error, {
        organization_id: claim.organizationId,
        media_asset_id: claim.mediaAssetId,
        attempt_number: claim.attemptNumber,
        retryable,
      });
      input.metrics.recordCompleted({
        operation: "media.storefront",
        outcome: "failed",
        errorCategory: "dependency",
        durationMilliseconds: performance.now() - startedAt,
      });
    }
    processed += 1;
  }
  return processed;
};

export const createCatalogStorefrontProcessor = (
  input: CreateCatalogStorefrontProcessorInput,
): CatalogStorefrontProcessor => {
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
  const cycle = async (): Promise<
    Readonly<{ operational: boolean; outcome: PollingCycleOutcome }>
  > => {
    try {
      const processed = await drainCatalogStorefrontOnce(input, controller.signal);
      return Object.freeze({
        operational: !controller.signal.aborted,
        outcome: controller.signal.aborted ? "failed" : processed > 0 ? "active" : "idle",
      });
    } catch (error) {
      if (!controller.signal.aborted)
        input.logger.error("worker.media.storefront_cycle_failed", error);
      return Object.freeze({ operational: false, outcome: "failed" });
    }
  };
  const runLoop = async (
    initial: Readonly<{ operational: boolean; outcome: PollingCycleOutcome }>,
  ): Promise<void> => {
    let previous = initial;
    while (!controller.signal.aborted) {
      const decision = poller.decide(previous.outcome);
      if ((await poller.wait(decision, controller.signal)) === "aborted") break;
      previous = await cycle();
      input.onOperationalStateChange(previous.operational);
    }
  };
  return Object.freeze({
    async start() {
      if (started) throw new TypeError("Catalog storefront processor cannot start twice");
      started = true;
      const initial = await cycle();
      input.onOperationalStateChange(initial.operational);
      loopPromise = runLoop(initial);
      return initial.operational;
    },
    async stop() {
      controller.abort();
      await loopPromise;
    },
    wake() {
      poller.wake();
    },
  });
};
