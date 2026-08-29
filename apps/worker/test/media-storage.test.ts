import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMediaStorageClient,
  MediaStorageError,
  type MediaObjectDescriptor,
  resolveMediaObject,
} from "../src/media-storage.js";

type TestServer = Readonly<{ origin: string; close(): Promise<void> }>;
const servers: TestServer[] = [];
const secret = "supabase-media-secret-test";

const organizationId = "51000000-0000-4000-8000-000000000010";
const mediaAssetId = "51000000-0000-4000-8000-000000000200";
const contentSha256Hex = "ab".repeat(32);

const descriptor = (overrides: Partial<MediaObjectDescriptor> = {}): MediaObjectDescriptor => ({
  organizationId,
  mediaAssetId,
  renditionKind: "analysis_webp",
  contentSha256Hex,
  mimeType: "image/webp",
  ...overrides,
});

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void,
): Promise<TestServer> => {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result = Object.freeze({
    origin: `http://127.0.0.1:${String(address.port)}/`,
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
  });
  servers.push(result);
  return result;
};

const readBytes = async (request: IncomingMessage): Promise<Uint8Array<ArrayBuffer>> => {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const rawChunk of request) {
    const chunk: unknown = rawChunk;
    const bytes =
      typeof chunk === "string"
        ? new TextEncoder().encode(chunk)
        : chunk instanceof Uint8Array
          ? Uint8Array.from(chunk)
          : (() => {
              throw new TypeError("request body chunk is not binary");
            })();
    chunks.push(bytes);
    length += bytes.byteLength;
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

const createClient = (origin: string, timeoutMilliseconds = 1_000) =>
  createMediaStorageClient({
    supabaseUrl: origin,
    secretKey: new SensitiveValue(secret),
    timeoutMilliseconds,
    maximumDownloadBytes: 8,
  });

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("media Storage object contract", () => {
  it.each([
    ["invalid", "MEDIA_STORAGE_INVALID", "validation", false, "warning"],
    ["rejected", "MEDIA_STORAGE_REJECTED", "authentication", false, "critical"],
    ["conflict", "MEDIA_STORAGE_CONFLICT", "conflict", false, "warning"],
    ["retryable", "MEDIA_STORAGE_RETRYABLE", "dependency", true, "error"],
    ["uncertain", "MEDIA_STORAGE_EFFECT_UNCERTAIN", "dependency", false, "critical"],
    ["cancelled", "MEDIA_STORAGE_CANCELLED", "internal", true, "warning"],
    ["timeout", "MEDIA_STORAGE_TIMEOUT", "timeout", true, "error"],
  ] as const)(
    "exposes the redacted %s failure taxonomy",
    (kind, code, category, retryable, severity) => {
      expect(new MediaStorageError(kind)).toMatchObject({
        name: "MediaStorageError",
        message: code,
        code,
        category,
        retryable,
        severity,
        kind,
      });
    },
  );

  it.each([
    ["source_original", "image/jpeg", "agentefer-catalog-private", ".jpg"],
    ["source_original", "image/png", "agentefer-catalog-private", ".png"],
    ["source_original", "image/webp", "agentefer-catalog-private", ".webp"],
    ["analysis_webp", "image/webp", "agentefer-catalog-private", ".webp"],
    ["whatsapp_jpeg", "image/jpeg", "agentefer-catalog-private", ".jpg"],
    ["storefront_webp", "image/webp", "agentefer-catalog-public", ".webp"],
  ] as const)(
    "resolves %s as an immutable %s object",
    (renditionKind, mimeType, bucketId, extension) => {
      expect(resolveMediaObject(descriptor({ renditionKind, mimeType }))).toEqual({
        bucketId,
        objectPath: `${organizationId}/${mediaAssetId}/${renditionKind}/${contentSha256Hex}${extension}`,
        mimeType,
        maximumBytes: bucketId.endsWith("private") ? 26_214_400 : 10_485_760,
      });
    },
  );

  it.each([
    descriptor({ organizationId: "../other-tenant" }),
    descriptor({ organizationId: `${organizationId.slice(0, -1)}g` }),
    descriptor({ organizationId: organizationId.slice(0, -1) }),
    descriptor({ mediaAssetId: "NOT-A-UUID" }),
    descriptor({ contentSha256Hex: "AB".repeat(32) }),
    descriptor({ contentSha256Hex: `${"a".repeat(63)}g` }),
    descriptor({ contentSha256Hex: "ab" }),
    descriptor({ renditionKind: "source_original", mimeType: "image/gif" as "image/png" }),
    descriptor({ renditionKind: "analysis_webp", mimeType: "image/jpeg" }),
    descriptor({ renditionKind: "whatsapp_jpeg", mimeType: "image/webp" }),
    descriptor({ renditionKind: "storefront_webp", mimeType: "image/png" }),
  ])("fails closed on an invalid object descriptor", (input) => {
    expect(() => resolveMediaObject(input)).toThrow(MediaStorageError);
    expect(() => resolveMediaObject(input)).toThrow(expect.objectContaining({ kind: "invalid" }));
  });

  it.each(["0", "9", "a", "f"])("accepts lower hexadecimal boundary %s", (character) => {
    expect(
      resolveMediaObject(descriptor({ contentSha256Hex: character.repeat(64) })).objectPath,
    ).toContain(character.repeat(64));
  });

  it.each([
    ["http://example.com", 1_000],
    ["https://user@example.com", 1_000],
    ["https://:password@example.com", 1_000],
    ["https://example.com/path", 1_000],
    ["https://example.com/?query=value", 1_000],
    ["https://example.com/#fragment", 1_000],
    ["https://example.com", 0],
    ["https://example.com", 1.5],
  ])("rejects unsafe origin or timeout configuration", (supabaseUrl, timeoutMilliseconds) => {
    expect(() =>
      createMediaStorageClient({
        supabaseUrl,
        secretKey: new SensitiveValue(secret),
        timeoutMilliseconds,
        maximumDownloadBytes: 8,
      }),
    ).toThrow(expect.objectContaining({ kind: "invalid" }));
  });

  it.each([0, 1.5, 26_214_401])(
    "rejects invalid download byte limit %s",
    (maximumDownloadBytes) => {
      expect(() =>
        createMediaStorageClient({
          supabaseUrl: "https://example.com/",
          secretKey: new SensitiveValue(secret),
          timeoutMilliseconds: 1_000,
          maximumDownloadBytes,
        }),
      ).toThrow(expect.objectContaining({ kind: "invalid" }));
    },
  );

  it("accepts exact minimum timeout and download limits on an HTTPS origin", () => {
    const client = createMediaStorageClient({
      supabaseUrl: "https://example.com/",
      secretKey: new SensitiveValue(secret),
      timeoutMilliseconds: 1,
      maximumDownloadBytes: 1,
    });
    expect(
      client.createPublicObjectUrl(descriptor({ renditionKind: "storefront_webp" })).origin,
    ).toBe("https://example.com");
  });

  it("accepts both local HTTP hosts and the exact maximum download limit", () => {
    for (const supabaseUrl of ["http://127.0.0.1:54321/", "http://localhost:54321/"]) {
      const client = createMediaStorageClient({
        supabaseUrl,
        secretKey: new SensitiveValue(secret),
        timeoutMilliseconds: 1_000,
        maximumDownloadBytes: 26_214_400,
      });
      expect(
        client.createPublicObjectUrl(descriptor({ renditionKind: "storefront_webp" })).origin,
      ).toBe(new URL(supabaseUrl).origin);
    }
  });

  it("rejects a non-HTTP protocol even when it uses a local hostname", () => {
    expect(() =>
      createMediaStorageClient({
        supabaseUrl: "ftp://127.0.0.1/",
        secretKey: new SensitiveValue(secret),
        timeoutMilliseconds: 1_000,
        maximumDownloadBytes: 8,
      }),
    ).toThrow(expect.objectContaining({ kind: "invalid" }));
  });
});

describe("media Storage HTTP transport", () => {
  it("uploads bytes once to the exact immutable object endpoint", async () => {
    let requestBody = new Uint8Array();
    const server = await startServer(async (request, response) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe(
        `/storage/v1/object/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp`,
      );
      expect(request.headers.authorization).toBe(`Bearer ${secret}`);
      expect(request.headers.apikey).toBe(secret);
      expect(request.headers["content-type"]).toBe("image/webp");
      expect(request.headers["x-upsert"]).toBe("false");
      expect(request.headers["cache-control"]).toBe("max-age=31536000, immutable");
      requestBody = await readBytes(request);
      response.statusCode = 200;
      response.end('{"Key":"registered"}');
    });
    const body = Uint8Array.from([82, 73, 70, 70]);

    const result = await createClient(server.origin).uploadObject(descriptor(), body);

    expect(requestBody).toEqual(body);
    expect(result.bucketId).toBe("agentefer-catalog-private");
  });

  it("rejects empty and oversized upload bodies before network I/O", async () => {
    let requests = 0;
    const server = await startServer((_request, response) => {
      requests += 1;
      response.end();
    });
    const client = createClient(server.origin);

    await expect(client.uploadObject(descriptor(), new Uint8Array())).rejects.toMatchObject({
      kind: "invalid",
    });
    await expect(
      client.uploadObject(
        descriptor({ renditionKind: "storefront_webp" }),
        new Uint8Array(10_485_761),
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requests).toBe(0);
  });

  it("accepts the exact public bucket upload limit", async () => {
    const server = await startServer(async (request, response) => {
      expect((await readBytes(request)).byteLength).toBe(10_485_760);
      response.statusCode = 200;
      response.end();
    });
    await expect(
      createClient(server.origin).uploadObject(
        descriptor({ renditionKind: "storefront_webp" }),
        new Uint8Array(10_485_760),
      ),
    ).resolves.toMatchObject({ maximumBytes: 10_485_760 });
  });

  it.each([
    [400, "invalid"],
    [401, "rejected"],
    [403, "rejected"],
    [409, "conflict"],
    [408, "retryable"],
    [425, "retryable"],
    [429, "retryable"],
    [500, "retryable"],
    [503, "retryable"],
  ] as const)("classifies Storage HTTP %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status;
      response.end('{"message":"provider detail is not exposed"}');
    });

    await expect(
      createClient(server.origin).uploadObject(descriptor(), Uint8Array.from([1])),
    ).rejects.toMatchObject({ kind });
  });

  it("downloads a private object with exact MIME and bounded bytes", async () => {
    const server = await startServer(async (request, response) => {
      expect(request.method).toBe("GET");
      expect(request.url).toBe(
        `/storage/v1/object/authenticated/agentefer-catalog-private/${organizationId}/${mediaAssetId}/whatsapp_jpeg/${contentSha256Hex}.jpg`,
      );
      expect(request.headers.accept).toBe("image/jpeg");
      response.writeHead(200, { "content-type": "image/jpeg" });
      response.write(Uint8Array.from([255, 216]));
      await new Promise<void>((resolve) => setImmediate(resolve));
      response.end(Uint8Array.from([255, 217]));
    });

    await expect(
      createClient(server.origin).downloadPrivateObject(
        descriptor({ renditionKind: "whatsapp_jpeg", mimeType: "image/jpeg" }),
      ),
    ).resolves.toEqual(Uint8Array.from([255, 216, 255, 217]));
  });

  it("rejects public download through the private channel before network I/O", async () => {
    let requests = 0;
    const server = await startServer((_request, response) => {
      requests += 1;
      response.end();
    });

    await expect(
      createClient(server.origin).downloadPrivateObject(
        descriptor({ renditionKind: "storefront_webp" }),
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requests).toBe(0);
  });

  it("rejects a mismatched response MIME and an oversized declared body", async () => {
    const mismatched = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "image/png" });
      response.end(Uint8Array.from([1]));
    });
    await expect(
      createClient(mismatched.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const oversized = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": "26214401",
        "content-type": "image/webp",
      });
      response.end();
    });
    await expect(
      createClient(oversized.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("accepts the exact configured download limit and rejects one byte more", async () => {
    const exact = await startServer((_request, response) => {
      response.writeHead(200, { "content-length": "8", "content-type": " image/webp " });
      response.end(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    });
    await expect(
      createClient(exact.origin).downloadPrivateObject(descriptor()),
    ).resolves.toHaveLength(8);

    const over = await startServer((_request, response) => {
      response.writeHead(200, { "content-length": "9", "content-type": "image/webp" });
      response.end(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]));
    });
    await expect(
      createClient(over.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  it("accepts an empty declared object and rejects an oversized chunked stream", async () => {
    const empty = await startServer((_request, response) => {
      response.writeHead(200, { "content-length": "0", "content-type": "image/webp" });
      response.end();
    });
    await expect(
      createClient(empty.origin).downloadPrivateObject(descriptor()),
    ).resolves.toHaveLength(0);

    const chunked = await startServer(async (_request, response) => {
      response.writeHead(200, { "content-type": "image/webp" });
      response.write(Uint8Array.from([1, 2, 3, 4, 5]));
      await new Promise<void>((resolve) => setImmediate(resolve));
      response.end(Uint8Array.from([6, 7, 8, 9]));
    });
    await expect(
      createClient(chunked.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it.each([
    [404, "invalid"],
    [408, "retryable"],
    [500, "retryable"],
  ] as const)("classifies private download HTTP %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status;
      response.end();
    });
    await expect(
      createClient(server.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({
      kind,
    });
  });

  it("rejects a missing content type on a successful download", async () => {
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.end(Uint8Array.from([1]));
    });
    await expect(
      createClient(server.origin).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  it("creates a same-origin short-lived signed URL for a private object", async () => {
    let requestBody = new Uint8Array();
    const server = await startServer(async (request, response) => {
      expect(request.method).toBe("POST");
      expect(request.url).toBe(
        `/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp`,
      );
      expect(request.headers.authorization).toBe(`Bearer ${secret}`);
      expect(request.headers.apikey).toBe(secret);
      expect(request.headers.accept).toBe("application/json");
      expect(request.headers["content-type"]).toBe("application/json");
      requestBody = await readBytes(request);
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          signedURL: `/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp?token=safe-test-token`,
        }),
      );
    });

    const signedUrl = await createClient(server.origin).createSignedPrivateUrl(descriptor(), 300);

    expect(JSON.parse(new TextDecoder().decode(requestBody))).toEqual({ expiresIn: 300 });
    expect(signedUrl.origin).toBe(new URL(server.origin).origin);
    expect(signedUrl.searchParams.get("token")).toBe("safe-test-token");
  });

  it.each([30, 900])("accepts exact signed URL TTL boundary %s", async (ttl) => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          signedURL: `/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp?token=boundary`,
        }),
      );
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), ttl),
    ).resolves.toBeInstanceOf(URL);
  });

  it.each([29, 901, 30.5])("rejects unsafe signed URL TTL %s", async (ttl) => {
    const server = await startServer((_request, response) => {
      response.end();
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), ttl),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects signing a public object before network I/O", async () => {
    let requests = 0;
    const server = await startServer((_request, response) => {
      requests += 1;
      response.end();
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(
        descriptor({ renditionKind: "storefront_webp" }),
        300,
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requests).toBe(0);
  });

  it.each([
    [400, "invalid"],
    [403, "rejected"],
    [429, "retryable"],
  ] as const)("classifies signed URL HTTP %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status;
      response.end();
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), 300),
    ).rejects.toMatchObject({ kind });
  });

  it.each([
    ["not-json", "invalid JSON"],
    [JSON.stringify({}), "missing field"],
    [JSON.stringify({ signedURL: 42 }), "non-text field"],
    [JSON.stringify({ signedURL: "" }), "empty field"],
    [JSON.stringify({ signedURL: `/${"a".repeat(8193)}` }), "oversized field"],
  ])("fails closed on %s signed response", async (body) => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(body);
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), 300),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("rejects a same-origin signed URL for a different object path", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          signedURL: `/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/different.webp?token=safe`,
        }),
      );
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), 300),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it.each([
    [8192, true],
    [8193, false],
  ] as const)("enforces signed URL text boundary %s", async (targetLength, accepted) => {
    const signedBase = `/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp?token=`;
    const signedURL = signedBase + "x".repeat(targetLength - signedBase.length);
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ signedURL }));
    });
    const promise = createClient(server.origin).createSignedPrivateUrl(descriptor(), 300);
    if (accepted) {
      await expect(promise).resolves.toHaveProperty("href");
    } else {
      await expect(promise).rejects.toMatchObject({ kind: "uncertain" });
    }
  });

  it("rejects a different origin even when the signed object path is exact", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          signedURL: `https://attacker.invalid/storage/v1/object/sign/agentefer-catalog-private/${organizationId}/${mediaAssetId}/analysis_webp/${contentSha256Hex}.webp?token=stolen`,
        }),
      );
    });
    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), 300),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("rejects a provider response that redirects the signed URL to another origin", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ signedURL: "https://attacker.invalid/stolen" }));
    });

    await expect(
      createClient(server.origin).createSignedPrivateUrl(descriptor(), 300),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("builds a public URL only for approved storefront-compatible descriptors", async () => {
    const server = await startServer((_request, response) => {
      response.end();
    });
    const client = createClient(server.origin);

    expect(
      client.createPublicObjectUrl(descriptor({ renditionKind: "storefront_webp" })).pathname,
    ).toBe(
      `/storage/v1/object/public/agentefer-catalog-public/${organizationId}/${mediaAssetId}/storefront_webp/${contentSha256Hex}.webp`,
    );
    expect(() => client.createPublicObjectUrl(descriptor())).toThrow(
      expect.objectContaining({ kind: "invalid" }),
    );
  });

  it("classifies an aborted upload as cancelled without leaking the secret", async () => {
    const server = await startServer(() => undefined);
    const controller = new AbortController();
    controller.abort();

    let caught: unknown;
    try {
      await createClient(server.origin).uploadObject(
        descriptor(),
        Uint8Array.from([1]),
        controller.signal,
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(MediaStorageError);
    expect(caught).toMatchObject({ kind: "cancelled" });
    expect((caught as Error).message).not.toContain(secret);
  });

  it("classifies real dependency timeouts without leaking secrets", async () => {
    const server = await startServer(() => undefined);
    const client = createClient(server.origin, 10);

    await expect(client.downloadPrivateObject(descriptor())).rejects.toMatchObject({
      kind: "timeout",
    });
    await expect(client.uploadObject(descriptor(), Uint8Array.from([1]))).rejects.toMatchObject({
      kind: "uncertain",
    });
  });

  it("classifies a real connection refusal as retryable for a read", async () => {
    const closedServer = createServer();
    await new Promise<void>((resolve, reject) => {
      closedServer.once("error", reject);
      closedServer.listen({ host: "127.0.0.1", port: 0 }, resolve);
    });
    const address = closedServer.address() as AddressInfo;
    await new Promise<void>((resolve, reject) => {
      closedServer.close((error) => {
        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      });
    });

    await expect(
      createClient(`http://127.0.0.1:${String(address.port)}/`).downloadPrivateObject(descriptor()),
    ).rejects.toMatchObject({ kind: "retryable" });
  });
});
