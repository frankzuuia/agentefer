import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  AdminCatalogImageUploadRpcError,
  createAdminCatalogImageUploadRpcClient,
} from "../src/admin-catalog-image-rpc.js";

const ids = Object.freeze({
  organization: "11111111-1111-4111-8111-111111111111",
  upload: "22222222-2222-4222-8222-222222222222",
  variant: "33333333-3333-4333-8333-333333333333",
  asset: "44444444-4444-4444-8444-444444444444",
  productMedia: "55555555-5555-4555-8555-555555555555",
  lease: "66666666-6666-4666-8666-666666666666",
});
const sourceHash = "a".repeat(64);
const analysisHash = "b".repeat(64);
const secret = "admin-catalog-image-rpc-secret";
const servers: { close(): Promise<void> }[] = [];

type CapturedRequest = Readonly<{
  url: string;
  headers: IncomingMessage["headers"];
  body: Readonly<Record<string, unknown>>;
}>;

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("expected UTF-8 request body");
    body += chunk;
  }
  return JSON.parse(body) as Record<string, unknown>;
};

const startServer = async (
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    body: Readonly<Record<string, unknown>>,
  ) => void,
): Promise<Readonly<{ url: string; requests: CapturedRequest[] }>> => {
  const requests: CapturedRequest[] = [];
  const server = createServer((request, response) => {
    void readJson(request).then((body) => {
      requests.push({ url: request.url ?? "", headers: request.headers, body });
      handler(request, response, body);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result = {
    url: `http://127.0.0.1:${String(address.port)}/ignored?discard=true`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) resolve();
          else reject(error);
        });
      }),
  };
  servers.push(result);
  return result;
};

const respond = (response: ServerResponse, body: unknown, status = 200): void => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
};

const createClient = (url: string, timeoutMilliseconds = 1_000) =>
  createAdminCatalogImageUploadRpcClient({
    supabaseUrl: url,
    secretKey: new SensitiveValue(secret),
    timeoutMilliseconds,
  });

const validClaimRow = (overrides: Record<string, unknown> = {}) => ({
  organizationId: ids.organization,
  uploadId: ids.upload,
  variantId: ids.variant,
  mediaAssetId: ids.asset,
  sourceBucketId: "agentefer-catalog-private",
  sourceObjectPath: `${ids.organization}/${ids.asset}/source_original/${sourceHash}.jpg`,
  sourceContentSha256Hex: sourceHash,
  sourceMimeType: "image/jpeg",
  sourceByteSize: 1234,
  sourceWidthPixels: 1200,
  sourceHeightPixels: 900,
  scope: "product",
  allowPublic: true,
  altText: "Vista frontal",
  idempotencyKey: "upload-idempotency-1",
  attemptNumber: 2,
  leaseToken: ids.lease,
  leaseExpiresAt: "2026-09-21T19:00:00.000Z",
  ...overrides,
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("admin catalog image Supabase RPC contract", () => {
  it("claims, completes and fails uploads with exact scoped payloads and protected headers", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.endsWith("claim_admin_catalog_image_upload") === true) {
        respond(response, [validClaimRow()]);
        return;
      }
      if (request.url?.endsWith("complete_admin_catalog_image_upload") === true) {
        respond(response, [
          {
            organizationId: ids.organization,
            uploadId: ids.upload,
            mediaAssetId: ids.asset,
            productMediaId: ids.productMedia,
            wasReplayed: true,
          },
        ]);
        return;
      }
      if (request.url?.endsWith("fail_admin_catalog_image_upload") === true) {
        respond(response, { uploadId: ids.upload, status: "dead_letter", wasReplayed: true });
        return;
      }
      respond(response, { error: "unexpected endpoint" }, 404);
    });
    const client = createClient(server.url);

    await expect(
      client.claim({
        workerId: "image-worker",
        leaseSeconds: 120,
        maxAttempts: 8,
        organizationId: ids.organization,
      }),
    ).resolves.toEqual({
      organizationId: ids.organization,
      uploadId: ids.upload,
      variantId: ids.variant,
      mediaAssetId: ids.asset,
      sourceBucketId: "agentefer-catalog-private",
      sourceObjectPath: `${ids.organization}/${ids.asset}/source_original/${sourceHash}.jpg`,
      sourceContentSha256Hex: sourceHash,
      sourceMimeType: "image/jpeg",
      sourceByteSize: 1234,
      sourceWidthPixels: 1200,
      sourceHeightPixels: 900,
      scope: "product",
      allowPublic: true,
      altText: "Vista frontal",
      idempotencyKey: "upload-idempotency-1",
      attemptNumber: 2,
      leaseToken: ids.lease,
      leaseExpiresAt: "2026-09-21T19:00:00.000Z",
    });
    await expect(
      client.complete({
        organizationId: ids.organization,
        uploadId: ids.upload,
        workerId: "image-worker",
        leaseToken: ids.lease,
        analysisSha256Hex: analysisHash,
        analysisMimeType: "image/webp",
        analysisByteSize: 987,
        analysisWidthPixels: 1000,
        analysisHeightPixels: 750,
        analysisObjectPath: `${ids.organization}/${ids.asset}/analysis_webp/${analysisHash}.webp`,
        traceId: "trace-complete",
      }),
    ).resolves.toEqual({
      organizationId: ids.organization,
      uploadId: ids.upload,
      mediaAssetId: ids.asset,
      productMediaId: ids.productMedia,
      wasReplayed: true,
    });
    await expect(
      client.fail({
        organizationId: ids.organization,
        uploadId: ids.upload,
        workerId: "image-worker",
        leaseToken: ids.lease,
        errorCode: "IMAGE_INVALID",
        retryable: false,
        retryDelaySeconds: 30,
        maxAttempts: 8,
        traceId: "trace-fail",
      }),
    ).resolves.toEqual({ uploadId: ids.upload, status: "dead_letter", wasReplayed: true });

    expect(server.requests.map((request) => request.url)).toEqual([
      "/rest/v1/rpc/claim_admin_catalog_image_upload",
      "/rest/v1/rpc/complete_admin_catalog_image_upload",
      "/rest/v1/rpc/fail_admin_catalog_image_upload",
    ]);
    expect(server.requests.map((request) => request.body)).toEqual([
      {
        target_worker_id: "image-worker",
        target_lease_seconds: 120,
        target_max_attempts: 8,
        target_organization_id: ids.organization,
      },
      {
        target_organization_id: ids.organization,
        target_upload_id: ids.upload,
        target_worker_id: "image-worker",
        target_lease_token: ids.lease,
        target_analysis_sha256_hex: analysisHash,
        target_analysis_mime_type: "image/webp",
        target_analysis_byte_size: 987,
        target_analysis_width_pixels: 1000,
        target_analysis_height_pixels: 750,
        target_analysis_object_path: `${ids.organization}/${ids.asset}/analysis_webp/${analysisHash}.webp`,
        target_trace_id: "trace-complete",
      },
      {
        target_organization_id: ids.organization,
        target_upload_id: ids.upload,
        target_worker_id: "image-worker",
        target_lease_token: ids.lease,
        target_error_code: "IMAGE_INVALID",
        target_retryable: false,
        target_retry_delay_seconds: 30,
        target_max_attempts: 8,
        target_trace_id: "trace-fail",
      },
    ]);
    expect(server.requests[0]?.headers).toMatchObject({
      accept: "application/json",
      "accept-profile": "api",
      apikey: secret,
      authorization: `Bearer ${secret}`,
      "content-profile": "api",
      "content-type": "application/json",
    });
  });

  it("handles an empty queue and applies safe defaults to optional claim fields", async () => {
    let requestCount = 0;
    const server = await startServer((_request, response) => {
      requestCount += 1;
      respond(
        response,
        requestCount === 1
          ? []
          : [
              validClaimRow({
                mediaAssetId: null,
                scope: "unexpected",
                allowPublic: false,
                altText: "",
                attemptNumber: null,
              }),
            ],
      );
    });
    const client = createClient(server.url);

    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).resolves.toBeUndefined();
    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).resolves.toMatchObject({
      scope: "variant",
      allowPublic: false,
      attemptNumber: 1,
    });
    expect(server.requests[0]?.body.target_organization_id).toBeNull();
  });

  it.each([
    [{}, "missing identity"],
    [["not-an-object"], "non-object array row"],
    [[validClaimRow({ variantId: null })], "missing required field"],
    [[validClaimRow({ sourceByteSize: Number.NaN })], "non-finite numeric field"],
    ["primitive", "primitive response"],
  ])("fails closed for an invalid claim contract: %s", async (body, description) => {
    void description;
    const server = await startServer((_request, response) => {
      respond(response, body);
    });
    const promise = createClient(server.url).claim({
      workerId: "worker",
      leaseSeconds: 60,
      maxAttempts: 3,
    });
    if (Array.isArray(body) && body.length === 1 && typeof body[0] === "object") {
      await expect(promise).rejects.toMatchObject({ kind: "invalid" });
    } else {
      await expect(promise).resolves.toBeUndefined();
    }
  });

  it("validates complete results and uses input identity fallbacks", async () => {
    let valid = true;
    const server = await startServer((_request, response) => {
      respond(
        response,
        valid
          ? { mediaAssetId: ids.asset, productMediaId: ids.productMedia }
          : { mediaAssetId: ids.asset },
      );
    });
    const client = createClient(server.url);
    const input = {
      organizationId: ids.organization,
      uploadId: ids.upload,
      workerId: "worker",
      leaseToken: ids.lease,
      analysisSha256Hex: analysisHash,
      analysisMimeType: "image/webp",
      analysisByteSize: 100,
      analysisWidthPixels: 10,
      analysisHeightPixels: 10,
      analysisObjectPath: "analysis.webp",
    } as const;
    await expect(client.complete(input)).resolves.toEqual({
      organizationId: ids.organization,
      uploadId: ids.upload,
      mediaAssetId: ids.asset,
      productMediaId: ids.productMedia,
      wasReplayed: false,
    });
    valid = false;
    await expect(client.complete(input)).rejects.toMatchObject({ kind: "invalid" });
  });

  it("uses retryable failure defaults for a sparse result", async () => {
    const server = await startServer((_request, response) => {
      respond(response, {});
    });
    await expect(
      createClient(server.url).fail({
        organizationId: ids.organization,
        uploadId: ids.upload,
        workerId: "worker",
        leaseToken: ids.lease,
        errorCode: "DEPENDENCY",
        retryable: true,
        retryDelaySeconds: 5,
        maxAttempts: 8,
      }),
    ).resolves.toEqual({ uploadId: ids.upload, status: "retryable", wasReplayed: false });
    expect(server.requests[0]?.body.target_trace_id).toBeNull();
  });

  it.each([
    [401, "rejected"],
    [409, "invalid"],
    [422, "invalid"],
    [503, "dependency"],
  ] as const)("classifies HTTP %i as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      respond(response, { error: "redacted" }, status);
    });
    await expect(
      createClient(server.url).claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toMatchObject({ kind });
  });

  it("rejects malformed and oversized JSON responses", async () => {
    let oversized = false;
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(oversized ? `{"value":"${"x".repeat(1_048_577)}"}` : "{");
    });
    const client = createClient(server.url);
    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toMatchObject({ kind: "dependency" });
    oversized = true;
    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("honors an explicit abort signal and wraps network failures", async () => {
    const server = await startServer((_request, response) => {
      respond(response, []);
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      createClient(server.url).claim({
        workerId: "worker",
        leaseSeconds: 60,
        maxAttempts: 3,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });

    const unavailable = new URL(server.url);
    await servers.pop()?.close();
    await expect(
      createClient(unavailable.toString()).claim({
        workerId: "worker",
        leaseSeconds: 60,
        maxAttempts: 3,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("exposes stable operational classifications without leaking causes", () => {
    expect(new AdminCatalogImageUploadRpcError("invalid")).toMatchObject({
      kind: "invalid",
      code: "ADMIN_CATALOG_IMAGE_RPC_INVALID",
      retryable: false,
    });
    expect(new AdminCatalogImageUploadRpcError("cancelled")).toMatchObject({
      kind: "cancelled",
      code: "ADMIN_CATALOG_IMAGE_RPC_CANCELLED",
      retryable: true,
    });
  });
});
