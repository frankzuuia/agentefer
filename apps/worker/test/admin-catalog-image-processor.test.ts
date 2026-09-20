import { createHash } from "node:crypto";

import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  drainAdminCatalogImageUploadOnce,
  type CreateAdminCatalogImageUploadProcessorInput,
} from "../src/admin-catalog-image-processor.js";
import {
  type AdminCatalogImageUploadRpcClient,
  type ClaimedAdminCatalogImageUpload,
} from "../src/admin-catalog-image-rpc.js";
import {
  type MediaObjectDescriptor,
  type MediaStorageClient,
} from "../src/media-storage.js";

const ids = Object.freeze({
  organization: "11111111-1111-4111-8111-111111111111",
  upload: "22222222-2222-4222-8222-222222222222",
  asset: "33333333-3333-4333-8333-333333333333",
  variant: "44444444-4444-4444-8444-444444444444",
  productMedia: "55555555-5555-4555-8555-555555555555",
  lease: "66666666-6666-4666-8666-666666666666",
});

const hashOf = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const storageDouble = (
  uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[],
  downloads: Map<string, Uint8Array>,
): MediaStorageClient => ({
  uploadObject: (descriptor, body) => {
    uploads.push({ descriptor, body });
    return Promise.resolve({
      bucketId: "agentefer-catalog-private" as const,
      objectPath: descriptor.contentSha256Hex,
      mimeType: descriptor.mimeType,
      maximumBytes: 26_214_400,
    });
  },
  downloadPrivateObject: (descriptor) => {
    const bytes = downloads.get(descriptor.contentSha256Hex);
    if (bytes === undefined) {
      return Promise.reject(new Error("download missing"));
    }
    return Promise.resolve(bytes);
  },
  createSignedPrivateUrl: () => Promise.resolve(new URL("https://storage.test/signed")),
  createPublicObjectUrl: () => new URL("https://storage.test/public"),
});

const createInput = (
  overrides: Readonly<{
    rpcClient: AdminCatalogImageUploadRpcClient;
    storageClient: MediaStorageClient;
  }>,
): CreateAdminCatalogImageUploadProcessorInput => ({
  configuration: {
    workerId: "admin-catalog-image-test",
    pollIntervalMilliseconds: 100,
    maximumIdlePollIntervalMilliseconds: 100,
    idleBackoffJitterPercent: 0,
    leaseSeconds: 120,
    maxAttempts: 8,
    retryDelaySeconds: 5,
    batchSize: 5,
  },
  ...overrides,
  logger: createStructuredLogger({ component: "admin-catalog-image-test", level: "fatal" }),
  metrics: createOperationalMetrics({ component: "admin-catalog-image-test" }),
  onOperationalStateChange: () => undefined,
});

const claim = (
  overrides: Partial<ClaimedAdminCatalogImageUpload> = {},
  claimSha256Hex = "0".repeat(64),
): ClaimedAdminCatalogImageUpload => ({
  organizationId: ids.organization,
  uploadId: ids.upload,
  variantId: ids.variant,
  mediaAssetId: ids.asset,
  sourceBucketId: "agentefer-catalog-private",
  sourceObjectPath: `${ids.organization}/${ids.asset}/source_original/${claimSha256Hex}.jpg`,
  sourceContentSha256Hex: claimSha256Hex,
  sourceMimeType: "image/jpeg",
  sourceByteSize: 94,
  sourceWidthPixels: 800,
  sourceHeightPixels: 600,
  scope: "variant",
  allowPublic: false,
  altText: null,
  idempotencyKey: "admin-upload-001",
  attemptNumber: 1,
  leaseToken: ids.lease,
  leaseExpiresAt: "2026-09-20T00:00:00.000Z",
  ...overrides,
});

describe("admin catalog image upload processor", () => {
  it("downloads the source from storage, transcodes to WebP, uploads it and completes", async () => {
    const sourceBytes = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const sourceBytesArray = new Uint8Array(sourceBytes);
    const sha256Hex = hashOf(sourceBytesArray);
    const downloads = new Map<string, Uint8Array>();
    downloads.set(sha256Hex, sourceBytesArray);

    const uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[] = [];
    let pendingClaim = true;
    const completes: unknown[] = [];
    const completesInputs: unknown[] = [];
    const failures: unknown[] = [];

    const rpcClient: AdminCatalogImageUploadRpcClient = {
      claim: () => {
        if (!pendingClaim) return Promise.resolve(undefined);
        pendingClaim = false;
        return Promise.resolve(claim({ sourceMimeType: "image/png" }, sha256Hex));
      },
      complete: (input) => {
        completesInputs.push(input);
        const response = {
          organizationId: input.organizationId,
          uploadId: input.uploadId,
          mediaAssetId: ids.asset,
          productMediaId: ids.productMedia,
          wasReplayed: false,
        };
        completes.push(response);
        return Promise.resolve(response);
      },
      fail: (input) => {
        failures.push(input);
        return Promise.resolve({
          uploadId: input.uploadId,
          status: "retryable",
          wasReplayed: false,
        });
      },
    };

    const result = await drainAdminCatalogImageUploadOnce(
      createInput({
        rpcClient,
        storageClient: storageDouble(uploads, downloads),
      }),
      new AbortController().signal,
    );

    expect(result.processedCount).toBe(1);
    const analysisUpload = uploads.find(
      (entry) => entry.descriptor.renditionKind === "analysis_webp",
    );
    expect(analysisUpload).toBeDefined();
    expect(analysisUpload?.descriptor.mimeType).toBe("image/webp");
    expect(analysisUpload?.descriptor.organizationId).toBe(ids.organization);
    expect(analysisUpload?.descriptor.mediaAssetId).toBe(ids.asset);
    expect(completes).toHaveLength(1);
    const completeInput = completesInputs[0] as {
      analysisObjectPath: string;
      analysisMimeType: string;
      analysisByteSize: number;
      analysisWidthPixels: number;
      analysisHeightPixels: number;
    };
    expect(completeInput.analysisMimeType).toBe("image/webp");
    const analysisSha256Hex = completeInput.analysisObjectPath.split("/").pop() ?? "";
    expect(completeInput.analysisObjectPath).toBe(
      `${ids.organization}/${ids.asset}/analysis_webp/${analysisSha256Hex}`,
    );
    expect(completeInput.analysisByteSize).toBeGreaterThan(0);
    expect(completeInput.analysisWidthPixels).toBeGreaterThan(0);
    expect(completeInput.analysisHeightPixels).toBeGreaterThan(0);
  });

  it("calls fail with the underlying error code when storage download returns a mismatched sha256", async () => {
    const fakeBytes = new Uint8Array([0xff, 0xd8, 0xff]);
    const expectedSha256 = "0".repeat(64);
    const downloads = new Map<string, Uint8Array>();
    downloads.set(expectedSha256, fakeBytes);

    const uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[] = [];
    let pendingClaim = true;
    const failures: unknown[] = [];

    const rpcClient: AdminCatalogImageUploadRpcClient = {
      claim: () => {
        if (!pendingClaim) return Promise.resolve(undefined);
        pendingClaim = false;
        return Promise.resolve(claim());
      },
      complete: () =>
        Promise.reject(new Error("complete must not run when sha256 mismatches")),
      fail: (input) => {
        failures.push(input);
        return Promise.resolve({
          uploadId: input.uploadId,
          status: "retryable",
          wasReplayed: false,
        });
      },
    };

    const result = await drainAdminCatalogImageUploadOnce(
      createInput({
        rpcClient,
        storageClient: storageDouble(uploads, downloads),
      }),
      new AbortController().signal,
    );

    expect(result.processedCount).toBe(1);
    expect(uploads).toHaveLength(0);
    expect(failures).toHaveLength(1);
    const failure = failures[0] as { errorCode: string; retryable: boolean };
    expect(failure.errorCode.length).toBeGreaterThan(0);
    expect(failure.retryable).toBe(true);
  });

  it("returns zero processedCount when the queue is empty", async () => {
    const rpcClient: AdminCatalogImageUploadRpcClient = {
      claim: () => Promise.resolve(undefined),
      complete: () =>
        Promise.reject(new Error("complete must not run when no rows are claimed")),
      fail: () => Promise.reject(new Error("fail must not run when no rows are claimed")),
    };
    const result = await drainAdminCatalogImageUploadOnce(
      createInput({
        rpcClient,
        storageClient: storageDouble([], new Map()),
      }),
      new AbortController().signal,
    );
    expect(result.processedCount).toBe(0);
  });

  it("reports an unsupported mime as a non-retryable failure", async () => {
    let pendingClaim = true;
    const failures: unknown[] = [];
    const rpcClient: AdminCatalogImageUploadRpcClient = {
      claim: () => {
        if (!pendingClaim) return Promise.resolve(undefined);
        pendingClaim = false;
        return Promise.resolve(claim({ sourceMimeType: "image/tiff" }));
      },
      complete: () =>
        Promise.reject(new Error("complete must not run for unsupported mime")),
      fail: (input) => {
        failures.push(input);
        return Promise.resolve({
          uploadId: input.uploadId,
          status: "rejected",
          wasReplayed: false,
        });
      },
    };
    await drainAdminCatalogImageUploadOnce(
      createInput({
        rpcClient,
        storageClient: storageDouble([], new Map()),
      }),
      new AbortController().signal,
    );
    const failure = failures[0] as { retryable: boolean };
    expect(failure.retryable).toBe(false);
  });
});
