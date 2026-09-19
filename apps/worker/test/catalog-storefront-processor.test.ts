import { createHash } from "node:crypto";

import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createCatalogStorefrontProcessor,
  drainCatalogStorefrontOnce,
  promoteCatalogStorefrontPhoto,
  type CreateCatalogStorefrontProcessorInput,
} from "../src/catalog-storefront-processor.js";
import { MediaIngestRpcError } from "../src/media-ingest-rpc.js";
import { MediaStorageError, type MediaObjectDescriptor } from "../src/media-storage.js";

const imageBytes = new Uint8Array([82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80]);
const hash = createHash("sha256").update(imageBytes).digest("hex");
const claim = Object.freeze({
  jobId: "11111111-1111-4111-8111-111111111111",
  organizationId: "22222222-2222-4222-8222-222222222222",
  mediaAssetId: "33333333-3333-4333-8333-333333333333",
  analysisSha256Hex: hash,
  analysisByteSize: imageBytes.byteLength,
  analysisWidth: 1,
  analysisHeight: 1,
  leaseToken: "44444444-4444-4444-8444-444444444444",
  attemptNumber: 1,
});

type InputOverrides = Readonly<{
  claim?: CreateCatalogStorefrontProcessorInput["rpcClient"]["claim"];
  fail?: CreateCatalogStorefrontProcessorInput["rpcClient"]["fail"];
  registerObject?: CreateCatalogStorefrontProcessorInput["mediaRpcClient"]["registerObject"];
  uploadObject?: CreateCatalogStorefrontProcessorInput["storageClient"]["uploadObject"];
  downloadPrivateObject?: CreateCatalogStorefrontProcessorInput["storageClient"]["downloadPrivateObject"];
  onOperationalStateChange?: CreateCatalogStorefrontProcessorInput["onOperationalStateChange"];
}>;

const createInput = (sourceBytes: Uint8Array, overrides: InputOverrides = {}) => {
  const calls: string[] = [];
  const input: CreateCatalogStorefrontProcessorInput = {
    configuration: {
      workerId: "storefront-test",
      pollIntervalMilliseconds: 100,
      maximumIdlePollIntervalMilliseconds: 100,
      idleBackoffJitterPercent: 0,
      leaseSeconds: 120,
      maxAttempts: 3,
      retryDelaySeconds: 5,
      batchSize: 1,
    },
    rpcClient: {
      claim: overrides.claim ?? (() => Promise.resolve(claim)),
      complete: () => {
        calls.push("complete");
        return Promise.resolve();
      },
      fail: overrides.fail ?? (() => Promise.resolve()),
    },
    mediaRpcClient: {
      registerObject:
        overrides.registerObject ??
        ((value) => {
          calls.push(`register:${value.descriptor.renditionKind}`);
          expect(value.derivationSpec).toMatchObject({
            kind: "storefront_webp",
            source: "analysis_webp",
          });
          return Promise.resolve({
            mediaAssetObjectId: claim.jobId,
            objectStatus: "published",
            wasReplayed: false,
          });
        }),
    },
    storageClient: {
      uploadObject:
        overrides.uploadObject ??
        ((descriptor: MediaObjectDescriptor, bytes: Uint8Array) => {
          calls.push(`upload:${descriptor.renditionKind}`);
          expect(bytes).toEqual(imageBytes);
          return Promise.resolve({
            bucketId: "agentefer-catalog-public",
            objectPath: "safe",
            mimeType: "image/webp",
            maximumBytes: 10_485_760,
          });
        }),
      downloadPrivateObject:
        overrides.downloadPrivateObject ??
        ((descriptor) => {
          calls.push(`download:${descriptor.renditionKind}`);
          return Promise.resolve(sourceBytes);
        }),
      createSignedPrivateUrl: () => Promise.reject(new Error("not used")),
      createPublicObjectUrl: () => new URL("https://example.test/photo.webp"),
    },
    logger: createStructuredLogger({ component: "catalog-storefront-test", level: "fatal" }),
    metrics: createOperationalMetrics({ component: "catalog-storefront-test" }),
    onOperationalStateChange: overrides.onOperationalStateChange ?? (() => undefined),
  };
  return { input, calls };
};

describe("catalog storefront promotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies only hash-verified WebP bytes then registers and completes the durable job", async () => {
    const { input, calls } = createInput(imageBytes);
    await promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal);
    expect(calls).toEqual([
      "download:analysis_webp",
      "upload:storefront_webp",
      "register:storefront_webp",
      "complete",
    ]);
  });

  it("rejects altered private bytes before any public upload", async () => {
    const { input, calls } = createInput(new Uint8Array([...imageBytes, 1]));
    await expect(
      promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
    ).rejects.toBeInstanceOf(MediaStorageError);
    expect(calls).toEqual(["download:analysis_webp"]);
  });

  it("rejects same-size private bytes whose hash differs", async () => {
    const altered = new Uint8Array(imageBytes);
    altered[0] = 1;
    const { input, calls } = createInput(altered);
    await expect(
      promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(calls).toEqual(["download:analysis_webp"]);
  });

  it("rejects a claimed byte size that differs from the verified object", async () => {
    const { input, calls } = createInput(imageBytes);
    await expect(
      promoteCatalogStorefrontPhoto(
        input,
        { ...claim, analysisByteSize: imageBytes.byteLength + 1 },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(calls).toEqual(["download:analysis_webp"]);
  });

  it("verifies an existing immutable object after an upload conflict", async () => {
    const { input, calls } = createInput(imageBytes, {
      uploadObject: () => Promise.reject(new MediaStorageError("conflict")),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(imageBytes, {
            status: 200,
            headers: { "content-type": "image/webp", "content-length": String(imageBytes.length) },
          }),
        ),
      ),
    );
    await promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal);
    expect(calls).toEqual(["download:analysis_webp", "register:storefront_webp", "complete"]);
  });

  it("rejects a conflicting public object whose bytes do not match", async () => {
    const { input } = createInput(imageBytes, {
      uploadObject: () => Promise.reject(new MediaStorageError("conflict")),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(new Uint8Array([...imageBytes, 1]), {
            status: 200,
            headers: { "content-type": "image/webp" },
          }),
        ),
      ),
    );
    await expect(
      promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it.each([
    [503, "image/webp", "12"],
    [200, "image/jpeg", "12"],
    [200, "image/webp", "10485761"],
  ])(
    "rejects an invalid existing public response %#",
    async (status, contentType, contentLength) => {
      const { input } = createInput(imageBytes, {
        uploadObject: () => Promise.reject(new MediaStorageError("conflict")),
      });
      vi.stubGlobal(
        "fetch",
        vi.fn(() =>
          Promise.resolve(
            new Response(imageBytes, {
              status,
              headers: { "content-type": contentType, "content-length": contentLength },
            }),
          ),
        ),
      );
      await expect(
        promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
      ).rejects.toMatchObject({
        kind: contentLength === "10485761" ? "invalid" : "uncertain",
      });
    },
  );

  it("accepts the declared public-size boundary when verified bytes match", async () => {
    const { input } = createInput(imageBytes, {
      uploadObject: () => Promise.reject(new MediaStorageError("conflict")),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(imageBytes, {
            status: 200,
            headers: { "content-type": "image/webp", "content-length": "10485760" },
          }),
        ),
      ),
    );
    await expect(
      promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
    ).resolves.toBeUndefined();
  });

  it.each([new Error("upload unavailable"), new MediaStorageError("invalid")])(
    "does not mistake a non-conflict upload failure for an existing object %#",
    async (failure) => {
      const { input } = createInput(imageBytes, {
        uploadObject: () => Promise.reject(failure),
      });
      vi.stubGlobal("fetch", vi.fn());
      await expect(
        promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
      ).rejects.toBe(failure);
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("does not complete a job when object registration is not published", async () => {
    const { input, calls } = createInput(imageBytes, {
      registerObject: () =>
        Promise.resolve({
          mediaAssetObjectId: claim.jobId,
          objectStatus: "verified",
          wasReplayed: false,
        }),
    });
    await expect(
      promoteCatalogStorefrontPhoto(input, claim, new AbortController().signal),
    ).rejects.toBeInstanceOf(MediaIngestRpcError);
    expect(calls).not.toContain("complete");
  });

  it("drains an empty queue without side effects", async () => {
    const { input } = createInput(imageBytes, { claim: () => Promise.resolve(undefined) });
    await expect(drainCatalogStorefrontOnce(input, new AbortController().signal)).resolves.toBe(0);
  });

  it.each([
    [new MediaStorageError("invalid"), false, "MEDIA_STORAGE_INVALID"],
    [new MediaStorageError("timeout"), true, "MEDIA_STORAGE_TIMEOUT"],
    [new MediaIngestRpcError("dependency"), true, "MEDIA_INGEST_RPC_DEPENDENCY"],
    [new Error("unexpected"), true, "MEDIA_STOREFRONT_INTERNAL_FAILURE"],
  ])("reports a classified processing failure %#", async (failure, retryable, errorCode) => {
    const reports: unknown[] = [];
    const { input } = createInput(imageBytes, {
      downloadPrivateObject: () => Promise.reject(failure),
      fail: (value) => {
        reports.push(value);
        return Promise.resolve();
      },
    });
    await expect(drainCatalogStorefrontOnce(input, new AbortController().signal)).resolves.toBe(1);
    expect(reports).toEqual([
      expect.objectContaining({ retryable, errorCode, jobId: claim.jobId }),
    ]);
  });

  it("starts once, reports readiness, wakes and stops its adaptive loop", async () => {
    const states: boolean[] = [];
    const { input } = createInput(imageBytes, {
      claim: () => Promise.resolve(undefined),
      onOperationalStateChange: (value: boolean): void => {
        states.push(value);
      },
    });
    const processor = createCatalogStorefrontProcessor(input);
    await expect(processor.start()).resolves.toBe(true);
    processor.wake();
    await expect(processor.start()).rejects.toThrow("cannot start twice");
    await processor.stop();
    expect(states[0]).toBe(true);
  });
});
