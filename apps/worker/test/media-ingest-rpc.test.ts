import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createMediaIngestRpcClient, type MediaIngestRpcError } from "../src/media-ingest-rpc.js";

const ids = Object.freeze({
  organization: "11111111-1111-4111-8111-111111111111",
  request: "22222222-2222-4222-8222-222222222222",
  connection: "33333333-3333-4333-8333-333333333333",
  message: "44444444-4444-4444-8444-444444444444",
  lease: "55555555-5555-4555-8555-555555555555",
  asset: "66666666-6666-4666-8666-666666666666",
  object: "77777777-7777-4777-8777-777777777777",
});

const servers: { close(): Promise<void> }[] = [];

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
    body: Record<string, unknown>,
  ) => void,
): Promise<{ url: string; requests: Record<string, unknown>[] }> => {
  const requests: Record<string, unknown>[] = [];
  const server = createServer((request, response) => {
    void readJson(request).then((body) => {
      requests.push(body);
      handler(request, response, body);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result = {
    url: `http://127.0.0.1:${String(address.port)}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
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

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("media ingest Supabase RPC contract", () => {
  it("claims a request without serializing the Vault token", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [
        {
          organization_id: ids.organization,
          request_id: ids.request,
          channel_connection_id: ids.connection,
          message_id: ids.message,
          lease_token: ids.lease,
          lease_expires_at: "2026-08-28T01:00:00.000Z",
          attempt_number: 2,
          api_version: "v26.0",
          phone_number_id: "123456",
          provider_media_id: "meta-media-1",
          declared_mime_type: "image/jpeg",
          declared_sha256_hex: "a".repeat(64),
          declared_file_size: 1024,
          correlation_id: "message-correlation",
          trace_id: "trace-id",
          access_token: "vault-secret",
        },
      ]);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });

    const result = await client.claim({
      workerId: "media-worker",
      leaseSeconds: 120,
      maxAttempts: 8,
    });
    expect(result).toMatchObject({
      organizationId: ids.organization,
      requestId: ids.request,
      channelConnectionId: ids.connection,
      messageId: ids.message,
      leaseToken: ids.lease,
      leaseExpiresAt: "2026-08-28T01:00:00.000Z",
      attemptNumber: 2,
      apiVersion: "v26.0",
      phoneNumberId: "123456",
      providerMediaId: "meta-media-1",
      declaredMimeType: "image/jpeg",
      declaredSha256Hex: "a".repeat(64),
      declaredFileSize: 1024,
      correlationId: "message-correlation",
      traceId: "trace-id",
    });
    expect(result?.accessToken.reveal()).toBe("vault-secret");
    expect(JSON.stringify(result)).not.toContain("vault-secret");
    expect(server.requests[0]).toMatchObject({
      target_worker_id: "media-worker",
      target_lease_seconds: 120,
      target_max_attempts: 8,
      target_organization_id: null,
    });
  });

  it("uses bytea hashes and canonical Storage paths across the asset lifecycle", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.endsWith("begin_media_asset_ingest") === true) {
        respond(response, [
          { media_asset_id: ids.asset, ingest_status: "received", was_replayed: false },
        ]);
        return;
      }
      if (request.url?.endsWith("register_media_asset_object") === true) {
        respond(response, [
          { media_asset_object_id: ids.object, object_status: "verified", was_replayed: false },
        ]);
        return;
      }
      if (request.url?.endsWith("complete_whatsapp_media_ingest") === true) {
        respond(response, [
          {
            request_id: ids.request,
            status: "succeeded",
            media_asset_id: ids.asset,
            was_replayed: false,
          },
        ]);
        return;
      }
      if (request.url?.endsWith("fail_whatsapp_media_ingest") === true) {
        respond(response, [{ request_id: ids.request, status: "rejected", was_replayed: false }]);
        return;
      }
      respond(response, {}, 404);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });
    const hash = "b".repeat(64);

    await expect(
      client.beginAsset({
        organizationId: ids.organization,
        contentSha256Hex: hash,
        mimeType: "image/jpeg",
        byteSize: 1024,
        widthPixels: 100,
        heightPixels: 100,
        sourceMessageId: ids.message,
        correlationId: "message-correlation",
      }),
    ).resolves.toMatchObject({ mediaAssetId: ids.asset, ingestStatus: "received" });
    await expect(
      client.registerObject({
        organizationId: ids.organization,
        mediaAssetId: ids.asset,
        descriptor: {
          organizationId: ids.organization,
          mediaAssetId: ids.asset,
          renditionKind: "analysis_webp",
          contentSha256Hex: hash,
          mimeType: "image/webp",
        },
        byteSize: 512,
        widthPixels: 100,
        heightPixels: 100,
        derivationSpec: { kind: "analysis_webp" },
        correlationId: "message-correlation",
      }),
    ).resolves.toMatchObject({ mediaAssetObjectId: ids.object });
    await expect(
      client.complete({
        organizationId: ids.organization,
        requestId: ids.request,
        workerId: "media-worker",
        leaseToken: ids.lease,
        mediaAssetId: ids.asset,
      }),
    ).resolves.toMatchObject({ status: "succeeded" });
    await expect(
      client.fail({
        organizationId: ids.organization,
        requestId: ids.request,
        workerId: "media-worker",
        leaseToken: ids.lease,
        errorCode: "WHATSAPP_MEDIA_INVALID",
        retryable: false,
        retryDelaySeconds: 5,
        maxAttempts: 8,
      }),
    ).resolves.toMatchObject({ status: "rejected" });

    expect(server.requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target_content_sha256: `\\x${hash}` }),
        expect.objectContaining({
          target_bucket_id: "agentefer-catalog-private",
          target_object_path: `${ids.organization}/${ids.asset}/analysis_webp/${hash}.webp`,
        }),
      ]),
    );
  });

  it("rejects malformed RPC responses before exposing partial state", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [{ request_id: "not-a-uuid" }]);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.complete({
        organizationId: ids.organization,
        requestId: ids.request,
        workerId: "media-worker",
        leaseToken: ids.lease,
        mediaAssetId: ids.asset,
      }),
    ).rejects.toMatchObject({ kind: "invalid" } satisfies Partial<MediaIngestRpcError>);
  });

  it("returns an empty claim without inventing a lease", async () => {
    const server = await startServer((_request, response) => {
      respond(response, []);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });
    await expect(
      client.claim({ workerId: "media-worker", leaseSeconds: 120, maxAttempts: 8 }),
    ).resolves.toBeUndefined();
  });

  it("classifies RPC HTTP failures and rejects invalid local hashes", async () => {
    for (const [status, kind] of [
      [401, "rejected"],
      [422, "invalid"],
      [503, "dependency"],
    ] as const) {
      const server = await startServer((_request, response) => {
        respond(response, {}, status);
      });
      const client = createMediaIngestRpcClient({
        supabaseUrl: server.url,
        secretKey: new SensitiveValue("supabase-secret"),
        timeoutMilliseconds: 1_000,
      });
      await expect(
        client.claim({ workerId: "media-worker", leaseSeconds: 120, maxAttempts: 8 }),
      ).rejects.toMatchObject({ kind });
    }

    const server = await startServer((_request, response) => {
      respond(response, [
        { media_asset_id: ids.asset, ingest_status: "received", was_replayed: false },
      ]);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });
    await expect(
      client.beginAsset({
        organizationId: ids.organization,
        contentSha256Hex: "not-a-sha256",
        mimeType: "image/png",
        byteSize: 1,
        widthPixels: 1,
        heightPixels: 1,
        sourceMessageId: ids.message,
        correlationId: "correlation",
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects non-lowercase hexadecimal hashes before issuing an RPC", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [
        { media_asset_id: ids.asset, ingest_status: "received", was_replayed: false },
      ]);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });

    for (const contentSha256Hex of [
      `g${"a".repeat(63)}`,
      `${"a".repeat(63)}g`,
      "A".repeat(64),
      "a".repeat(63),
    ]) {
      await expect(
        client.beginAsset({
          organizationId: ids.organization,
          contentSha256Hex,
          mimeType: "image/png",
          byteSize: 1,
          widthPixels: 1,
          heightPixels: 1,
          sourceMessageId: ids.message,
          correlationId: "correlation",
        }),
      ).rejects.toMatchObject({ kind: "invalid" });
    }
    expect(server.requests).toHaveLength(0);
  });

  it("sends optional file, trace and actor-neutral lifecycle fields", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.endsWith("begin_media_asset_ingest") === true) {
        respond(response, [
          { media_asset_id: ids.asset, ingest_status: "received", was_replayed: false },
        ]);
        return;
      }
      respond(response, [
        { media_asset_object_id: ids.object, object_status: "verified", was_replayed: false },
      ]);
    });
    const client = createMediaIngestRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret"),
      timeoutMilliseconds: 1_000,
    });
    const hash = "c".repeat(64);
    await client.beginAsset({
      organizationId: ids.organization,
      contentSha256Hex: hash,
      mimeType: "image/png",
      byteSize: 10,
      widthPixels: 2,
      heightPixels: 5,
      originalFileName: "producto.png",
      sourceMessageId: ids.message,
      correlationId: "correlation",
      traceId: "trace-id",
    });
    expect(server.requests[0]).toMatchObject({
      target_content_sha256: `\\x${hash}`,
      target_original_file_name: "producto.png",
      target_trace_id: "trace-id",
      target_actor_kind: "worker",
      target_actor_user_id: null,
    });
  });
});
