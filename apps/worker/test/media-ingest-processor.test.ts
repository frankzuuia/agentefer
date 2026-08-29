import { createHash } from "node:crypto";

import { SensitiveValue } from "@agentefer/config";
import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  drainMediaIngestOnce,
  type CreateMediaIngestProcessorInput,
} from "../src/media-ingest-processor.js";
import { type ClaimedMediaIngest, type MediaIngestRpcClient } from "../src/media-ingest-rpc.js";
import {
  MediaStorageError,
  type MediaObjectDescriptor,
  type MediaStorageClient,
} from "../src/media-storage.js";
import {
  WhatsAppMediaError,
  type RetrievedWhatsAppMedia,
  type WhatsAppMediaClient,
} from "../src/whatsapp-media.js";

const ids = Object.freeze({
  organization: "11111111-1111-4111-8111-111111111111",
  request: "22222222-2222-4222-8222-222222222222",
  connection: "33333333-3333-4333-8333-333333333333",
  message: "44444444-4444-4444-8444-444444444444",
  lease: "55555555-5555-4555-8555-555555555555",
  asset: "66666666-6666-4666-8666-666666666666",
  object: "77777777-7777-4777-8777-777777777777",
});

const claim = (): ClaimedMediaIngest => ({
  organizationId: ids.organization,
  requestId: ids.request,
  channelConnectionId: ids.connection,
  messageId: ids.message,
  leaseToken: ids.lease,
  leaseExpiresAt: "2026-08-28T01:00:00.000Z",
  attemptNumber: 1,
  apiVersion: "v26.0",
  phoneNumberId: "123456",
  providerMediaId: "meta-media-1",
  correlationId: "message-correlation",
  accessToken: new SensitiveValue("meta-access-token"),
});

const storageDouble = (
  uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[],
): MediaStorageClient => ({
  uploadObject: (descriptor, body) => {
    uploads.push({ descriptor, body });
    return Promise.resolve({
      bucketId:
        descriptor.renditionKind === "storefront_webp"
          ? "agentefer-catalog-public"
          : "agentefer-catalog-private",
      objectPath: `${descriptor.organizationId}/${descriptor.mediaAssetId}/${descriptor.renditionKind}`,
      mimeType: descriptor.mimeType,
      maximumBytes: 26_214_400,
    });
  },
  downloadPrivateObject: () => Promise.reject(new Error("unused")),
  createSignedPrivateUrl: () => Promise.resolve(new URL("https://storage.test/signed")),
  createPublicObjectUrl: () => new URL("https://storage.test/public"),
});

const createInput = (
  overrides: Readonly<{
    mediaClient: WhatsAppMediaClient;
    rpcClient: MediaIngestRpcClient;
    storageClient: MediaStorageClient;
  }>,
): CreateMediaIngestProcessorInput => ({
  configuration: {
    workerId: "media-worker-test",
    pollIntervalMilliseconds: 100,
    leaseSeconds: 120,
    maxAttempts: 8,
    retryDelaySeconds: 5,
    batchSize: 5,
  },
  ...overrides,
  logger: createStructuredLogger({ component: "media-ingest-test", level: "fatal" }),
  metrics: createOperationalMetrics({ component: "media-ingest-test" }),
  onOperationalStateChange: () => undefined,
});

const runEvidenceScenario = async (
  bytes: Uint8Array,
  claimEvidence: Partial<
    Pick<ClaimedMediaIngest, "declaredMimeType" | "declaredSha256Hex" | "declaredFileSize">
  >,
  retrievedEvidence: Partial<
    Pick<RetrievedWhatsAppMedia, "declaredMimeType" | "declaredSha256Hex" | "declaredFileSize">
  >,
): Promise<Readonly<{ beginCalls: number; completeCalls: number; failCalls: number }>> => {
  let pendingClaim = true;
  let beginCalls = 0;
  let completeCalls = 0;
  let failCalls = 0;
  const rpcClient: MediaIngestRpcClient = {
    claim: () => {
      if (!pendingClaim) return Promise.resolve(undefined);
      pendingClaim = false;
      return Promise.resolve({ ...claim(), ...claimEvidence });
    },
    beginAsset: () => {
      beginCalls += 1;
      return Promise.resolve({
        mediaAssetId: ids.asset,
        ingestStatus: "verified",
        wasReplayed: true,
      });
    },
    registerObject: () => Promise.reject(new Error("verified asset must not register objects")),
    complete: () => {
      completeCalls += 1;
      return Promise.resolve({
        requestId: ids.request,
        status: "succeeded",
        mediaAssetId: ids.asset,
        wasReplayed: false,
      });
    },
    fail: () => {
      failCalls += 1;
      return Promise.resolve({ requestId: ids.request, status: "rejected", wasReplayed: false });
    },
  };
  const mediaClient: WhatsAppMediaClient = {
    retrieveImage: () =>
      Promise.resolve({ bytes, declaredMimeType: "image/png", ...retrievedEvidence }),
  };

  await drainMediaIngestOnce(
    createInput({ mediaClient, rpcClient, storageClient: storageDouble([]) }),
    new AbortController().signal,
  );
  return Object.freeze({ beginCalls, completeCalls, failCalls });
};

describe("WhatsApp media ingest processor", () => {
  it("persists original and private WebP renditions before completing the request", async () => {
    const png = await sharp({
      create: { width: 2, height: 2, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[] = [];
    const completed: string[] = [];
    const registered: MediaObjectDescriptor[] = [];
    const beginInputs: Readonly<Record<string, unknown>>[] = [];
    const registrationInputs: Readonly<Record<string, unknown>>[] = [];
    const retrievedReferences: Readonly<Record<string, unknown>>[] = [];
    let claimed = true;
    const expectedClaim = { ...claim(), traceId: "trace-id" };
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(expectedClaim);
      },
      beginAsset: (input) => {
        beginInputs.push(input);
        return Promise.resolve({
          mediaAssetId: ids.asset,
          ingestStatus: "received",
          wasReplayed: false,
        });
      },
      registerObject: (input) => {
        registrationInputs.push(input);
        registered.push(input.descriptor);
        return Promise.resolve({
          mediaAssetObjectId: ids.asset,
          objectStatus: "verified",
          wasReplayed: false,
        });
      },
      complete: (input) => {
        completed.push(input.mediaAssetId);
        return Promise.resolve({
          requestId: ids.request,
          status: "succeeded",
          mediaAssetId: ids.asset,
          wasReplayed: false,
        });
      },
      fail: () => Promise.reject(new Error("unexpected failure")),
    };
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: (reference) => {
        retrievedReferences.push(reference);
        return Promise.resolve({ bytes: png, declaredMimeType: "image/png" });
      },
    };

    await expect(
      drainMediaIngestOnce(
        createInput({ mediaClient, rpcClient, storageClient: storageDouble(uploads) }),
        new AbortController().signal,
      ),
    ).resolves.toEqual({ processedCount: 1 });
    expect(completed).toEqual([ids.asset]);
    expect(uploads.map(({ descriptor }) => descriptor.renditionKind)).toEqual([
      "source_original",
      "analysis_webp",
    ]);
    expect(registered.map((descriptor) => descriptor.renditionKind)).toEqual([
      "source_original",
      "analysis_webp",
    ]);
    expect(uploads[1]?.descriptor.mimeType).toBe("image/webp");
    expect(retrievedReferences).toEqual([
      {
        apiVersion: "v26.0",
        phoneNumberId: "123456",
        mediaId: "meta-media-1",
        accessToken: expectedClaim.accessToken,
      },
    ]);
    expect(beginInputs[0]).toMatchObject({
      organizationId: ids.organization,
      mimeType: "image/png",
      byteSize: png.byteLength,
      widthPixels: 2,
      heightPixels: 2,
      sourceMessageId: ids.message,
      correlationId: "message-correlation",
      traceId: "trace-id",
    });
    expect(registrationInputs.map((input) => input.derivationSpec)).toEqual([
      { kind: "source_original", source: "whatsapp_cloud_api" },
      { kind: "analysis_webp", source: "sharp", quality: 85, effort: 4 },
    ]);
  });

  it("records a non-retryable media rejection without completing the asset", async () => {
    const failures: Readonly<Record<string, unknown>>[] = [];
    let claimed = true;
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(claim());
      },
      beginAsset: () => Promise.reject(new Error("unexpected begin")),
      registerObject: () => Promise.reject(new Error("unexpected register")),
      complete: () => Promise.reject(new Error("unexpected complete")),
      fail: (input) => {
        failures.push(input);
        return Promise.resolve({ requestId: ids.request, status: "rejected", wasReplayed: false });
      },
    };
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: () => Promise.reject(new WhatsAppMediaError("invalid")),
    };

    await drainMediaIngestOnce(
      createInput({ mediaClient, rpcClient, storageClient: storageDouble([]) }),
      new AbortController().signal,
    );
    expect(failures).toMatchObject([{ errorCode: "WHATSAPP_MEDIA_INVALID", retryable: false }]);
  });

  it("rejects each declared evidence mismatch before creating an asset", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const actualSha = createHash("sha256").update(png).digest("hex");
    for (const mismatch of [
      {
        claim: { declaredMimeType: "image/png" as const },
        retrieved: { declaredMimeType: "image/jpeg" as const },
      },
      {
        claim: { declaredSha256Hex: actualSha },
        retrieved: { declaredSha256Hex: "a".repeat(64) },
      },
      {
        claim: { declaredFileSize: png.byteLength },
        retrieved: { declaredFileSize: png.byteLength + 1 },
      },
    ]) {
      let claimed = true;
      let beginCalls = 0;
      let failCalls = 0;
      const rpcClient: MediaIngestRpcClient = {
        claim: () => {
          if (!claimed) return Promise.resolve(undefined);
          claimed = false;
          return Promise.resolve({ ...claim(), ...mismatch.claim });
        },
        beginAsset: () => {
          beginCalls += 1;
          return Promise.reject(new Error("begin must not run"));
        },
        registerObject: () => Promise.reject(new Error("register must not run")),
        complete: () => Promise.reject(new Error("complete must not run")),
        fail: () => {
          failCalls += 1;
          return Promise.resolve({
            requestId: ids.request,
            status: "rejected",
            wasReplayed: false,
          });
        },
      };
      const mediaClient: WhatsAppMediaClient = {
        retrieveImage: () =>
          Promise.resolve({
            bytes: png,
            declaredMimeType: "image/png",
            ...mismatch.retrieved,
          }),
      };
      await drainMediaIngestOnce(
        createInput({ mediaClient, rpcClient, storageClient: storageDouble([]) }),
        new AbortController().signal,
      );
      expect(beginCalls).toBe(0);
      expect(failCalls).toBe(1);
    }
  });

  it("rejects a MIME contradiction before creating an otherwise valid asset", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    await expect(runEvidenceScenario(png, { declaredMimeType: "image/jpeg" }, {})).resolves.toEqual(
      { beginCalls: 0, completeCalls: 0, failCalls: 1 },
    );
  });

  it("accepts matching MIME evidence from the queue and Meta", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    await expect(runEvidenceScenario(png, { declaredMimeType: "image/png" }, {})).resolves.toEqual({
      beginCalls: 1,
      completeCalls: 1,
      failCalls: 0,
    });
  });

  it("rejects a SHA-256 contradiction before normalization can trust the queue", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const actualSha = createHash("sha256").update(png).digest("hex");
    const conflictingSha = actualSha === "0".repeat(64) ? "1".repeat(64) : "0".repeat(64);
    await expect(
      runEvidenceScenario(
        png,
        { declaredSha256Hex: actualSha },
        { declaredSha256Hex: conflictingSha },
      ),
    ).resolves.toEqual({ beginCalls: 0, completeCalls: 0, failCalls: 1 });
  });

  it("accepts SHA-256 evidence when only the queue provides it", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const actualSha = createHash("sha256").update(png).digest("hex");
    await expect(runEvidenceScenario(png, { declaredSha256Hex: actualSha }, {})).resolves.toEqual({
      beginCalls: 1,
      completeCalls: 1,
      failCalls: 0,
    });
  });

  it("accepts SHA-256 evidence when only Meta provides it", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    const actualSha = createHash("sha256").update(png).digest("hex");
    await expect(runEvidenceScenario(png, {}, { declaredSha256Hex: actualSha })).resolves.toEqual({
      beginCalls: 1,
      completeCalls: 1,
      failCalls: 0,
    });
  });

  it("rejects a file-size contradiction before normalization can trust the queue", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    await expect(
      runEvidenceScenario(
        png,
        { declaredFileSize: png.byteLength },
        { declaredFileSize: png.byteLength + 1 },
      ),
    ).resolves.toEqual({ beginCalls: 0, completeCalls: 0, failCalls: 1 });
  });

  it("accepts file-size evidence supplied by either source independently", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 12, g: 34, b: 56 } },
    })
      .png()
      .toBuffer();
    await expect(
      runEvidenceScenario(png, { declaredFileSize: png.byteLength }, {}),
    ).resolves.toEqual({ beginCalls: 1, completeCalls: 1, failCalls: 0 });
    await expect(
      runEvidenceScenario(png, {}, { declaredFileSize: png.byteLength }),
    ).resolves.toEqual({ beginCalls: 1, completeCalls: 1, failCalls: 0 });
  });

  it("does not fail a cancelled claim after a downstream error", async () => {
    const controller = new AbortController();
    let failCalls = 0;
    let claimed = true;
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(claim());
      },
      beginAsset: () => Promise.reject(new Error("unexpected begin")),
      registerObject: () => Promise.reject(new Error("unexpected register")),
      complete: () => Promise.reject(new Error("unexpected complete")),
      fail: () => {
        failCalls += 1;
        return Promise.reject(new Error("cancelled claim must not be failed"));
      },
    };
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: () => {
        controller.abort();
        return Promise.reject(new Error("cancelled"));
      },
    };
    await drainMediaIngestOnce(
      createInput({ mediaClient, rpcClient, storageClient: storageDouble([]) }),
      controller.signal,
    );
    expect(failCalls).toBe(0);
  });

  it("replays a verified asset without uploading duplicate renditions", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 90, g: 80, b: 70 } },
    })
      .png()
      .toBuffer();
    const uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[] = [];
    let claimed = true;
    let completed = 0;
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(claim());
      },
      beginAsset: () =>
        Promise.resolve({ mediaAssetId: ids.asset, ingestStatus: "verified", wasReplayed: true }),
      registerObject: () => Promise.reject(new Error("unexpected register")),
      complete: () => {
        completed += 1;
        return Promise.resolve({
          requestId: ids.request,
          status: "succeeded",
          mediaAssetId: ids.asset,
          wasReplayed: true,
        });
      },
      fail: () => Promise.reject(new Error("unexpected failure")),
    };
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: () => Promise.resolve({ bytes: png, declaredMimeType: "image/png" }),
    };

    await drainMediaIngestOnce(
      createInput({ mediaClient, rpcClient, storageClient: storageDouble(uploads) }),
      new AbortController().signal,
    );
    expect(completed).toBe(1);
    expect(uploads).toEqual([]);
  });

  it("fails closed when the asset RPC returns a non-ingestible state", async () => {
    const failures: Readonly<Record<string, unknown>>[] = [];
    let claimed = true;
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(claim());
      },
      beginAsset: () =>
        Promise.resolve({ mediaAssetId: ids.asset, ingestStatus: "rejected", wasReplayed: false }),
      registerObject: () => Promise.reject(new Error("unexpected register")),
      complete: () => Promise.reject(new Error("unexpected complete")),
      fail: (input) => {
        failures.push(input);
        return Promise.resolve({ requestId: ids.request, status: "retryable", wasReplayed: false });
      },
    };
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: () => Promise.resolve({ bytes: png, declaredMimeType: "image/png" }),
    };

    await drainMediaIngestOnce(
      createInput({ mediaClient, rpcClient, storageClient: storageDouble([]) }),
      new AbortController().signal,
    );
    expect(failures).toMatchObject([{ errorCode: "MEDIA_INGEST_RPC_INVALID", retryable: false }]);
  });

  it("verifies an existing Storage object after an upload conflict", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();
    const uploads: { descriptor: MediaObjectDescriptor; body: Uint8Array }[] = [];
    const storedBodies = new Map<string, Uint8Array>();
    const storageClient: MediaStorageClient = {
      uploadObject: (descriptor, body) => {
        if (storedBodies.has(descriptor.contentSha256Hex)) {
          return Promise.reject(new Error("unexpected second upload"));
        }
        storedBodies.set(descriptor.contentSha256Hex, body);
        uploads.push({ descriptor, body });
        return Promise.reject(new MediaStorageError("conflict"));
      },
      downloadPrivateObject: (descriptor) =>
        Promise.resolve(storedBodies.get(descriptor.contentSha256Hex) ?? new Uint8Array()),
      createSignedPrivateUrl: () => Promise.resolve(new URL("https://storage.test/signed")),
      createPublicObjectUrl: () => new URL("https://storage.test/public"),
    };
    let claimed = true;
    const rpcClient: MediaIngestRpcClient = {
      claim: () => {
        if (!claimed) return Promise.resolve(undefined);
        claimed = false;
        return Promise.resolve(claim());
      },
      beginAsset: () =>
        Promise.resolve({ mediaAssetId: ids.asset, ingestStatus: "received", wasReplayed: false }),
      registerObject: () =>
        Promise.resolve({
          mediaAssetObjectId: ids.object,
          objectStatus: "verified",
          wasReplayed: false,
        }),
      complete: () =>
        Promise.resolve({
          requestId: ids.request,
          status: "succeeded",
          mediaAssetId: ids.asset,
          wasReplayed: false,
        }),
      fail: () => Promise.reject(new Error("unexpected failure")),
    };
    const mediaClient: WhatsAppMediaClient = {
      retrieveImage: () => Promise.resolve({ bytes: png, declaredMimeType: "image/png" }),
    };

    await drainMediaIngestOnce(
      createInput({ mediaClient, rpcClient, storageClient }),
      new AbortController().signal,
    );
    expect(uploads.length).toBe(2);
    expect(
      createHash("sha256")
        .update(uploads[0]?.body ?? new Uint8Array())
        .digest("hex"),
    ).toBe(uploads[0]?.descriptor.contentSha256Hex);
  });

  it("fails a non-conflict Storage error and a corrupt existing object", async () => {
    const png = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();
    for (const storageError of [
      new MediaStorageError("retryable"),
      new MediaStorageError("conflict"),
    ]) {
      let claimed = true;
      const failures: Readonly<Record<string, unknown>>[] = [];
      const storageClient: MediaStorageClient = {
        uploadObject: () => Promise.reject(storageError),
        downloadPrivateObject: () => Promise.resolve(Uint8Array.from([9, 8, 7])),
        createSignedPrivateUrl: () => Promise.resolve(new URL("https://storage.test/signed")),
        createPublicObjectUrl: () => new URL("https://storage.test/public"),
      };
      const rpcClient: MediaIngestRpcClient = {
        claim: () => {
          if (!claimed) return Promise.resolve(undefined);
          claimed = false;
          return Promise.resolve(claim());
        },
        beginAsset: () =>
          Promise.resolve({
            mediaAssetId: ids.asset,
            ingestStatus: "received",
            wasReplayed: false,
          }),
        registerObject: () =>
          Promise.resolve({
            mediaAssetObjectId: ids.object,
            objectStatus: "verified",
            wasReplayed: false,
          }),
        complete: () => Promise.reject(new Error("complete must not run")),
        fail: (input) => {
          failures.push(input);
          return Promise.resolve({
            requestId: ids.request,
            status: "retryable",
            wasReplayed: false,
          });
        },
      };
      const mediaClient: WhatsAppMediaClient = {
        retrieveImage: () => Promise.resolve({ bytes: png, declaredMimeType: "image/png" }),
      };
      await drainMediaIngestOnce(
        createInput({ mediaClient, rpcClient, storageClient }),
        new AbortController().signal,
      );
      expect(failures).toHaveLength(1);
      expect(failures[0]?.errorCode).toBe(
        storageError.kind === "conflict"
          ? "MEDIA_STORAGE_EFFECT_UNCERTAIN"
          : "MEDIA_STORAGE_RETRYABLE",
      );
    }
  });
});
