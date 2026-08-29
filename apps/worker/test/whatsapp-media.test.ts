import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";
import sharp from "sharp";

import {
  createWhatsAppMediaClient,
  normalizeImage,
  WhatsAppMediaError,
  type RetrievedWhatsAppMedia,
} from "../src/whatsapp-media.js";

type TestServer = Readonly<{ origin: string; close(): Promise<void> }>;
const servers: TestServer[] = [];

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

const reference = (mediaId = "media-1") => ({
  apiVersion: "v26.0",
  phoneNumberId: "123456789012345",
  mediaId,
  accessToken: new SensitiveValue("meta-access-token-test"),
});

const pngMedia: RetrievedWhatsAppMedia = {
  bytes: Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  declaredMimeType: "image/png",
};

const validPngBytes = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);

const captureMediaError = async (operation: Promise<unknown>): Promise<WhatsAppMediaError> => {
  try {
    await operation;
  } catch (error) {
    expect(error).toBeInstanceOf(WhatsAppMediaError);
    return error as WhatsAppMediaError;
  }
  throw new Error("expected WhatsAppMediaError");
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("WhatsApp media transport", () => {
  it("enforces positive integral timeouts while accepting the one millisecond boundary", () => {
    for (const timeoutMilliseconds of [0, -1, 1.5, Number.NaN]) {
      expect(() =>
        createWhatsAppMediaClient("https://graph.facebook.com/", timeoutMilliseconds),
      ).toThrow(WhatsAppMediaError);
    }
    expect(() => createWhatsAppMediaClient("https://graph.facebook.com/", 1)).not.toThrow();
  });

  it("retrieves the Meta media URL and downloads it with the tenant token", async () => {
    let mediaAuthorization: string | undefined;
    const server = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        expect(request.headers.authorization).toBe("Bearer meta-access-token-test");
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            url: `${server.origin}media-file`,
            mime_type: "image/png",
            sha256: "1".repeat(64),
            file_size: 4,
          }),
        );
        return;
      }
      expect(request.url).toBe("/media-file");
      mediaAuthorization = request.headers.authorization;
      response.statusCode = 200;
      response.setHeader("content-type", "image/png");
      response.end(Buffer.from([1, 2, 3, 4]));
    });

    const result = await createWhatsAppMediaClient(server.origin).retrieveImage(reference());

    expect(mediaAuthorization).toBe("Bearer meta-access-token-test");
    expect(result).toMatchObject({
      declaredMimeType: "image/png",
      declaredSha256Hex: "1".repeat(64),
      declaredFileSize: 4,
    });
    expect(Array.from(result.bytes)).toEqual([1, 2, 3, 4]);
  });

  it("rejects a returned URL outside Meta-controlled hosts before download", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({ url: "https://attacker.example/image", mime_type: "image/png" }),
      );
    });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects content-type mismatches and unsafe identifiers", async () => {
    const server = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ url: `${server.origin}media-file`, mime_type: "image/png" }));
    });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage({
        ...reference(),
        mediaId: "../secret",
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage({
        ...reference(),
        apiVersion: "v26.0/escape",
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage({
        ...reference(),
        phoneNumberId: "123?456",
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects every unsafe reference segment before issuing a network request", async () => {
    let requestCount = 0;
    const server = await startServer((request, response) => {
      requestCount += 1;
      if (request.url === "/media-file") {
        response.setHeader("content-type", "image/png");
        response.end(Buffer.from([1]));
        return;
      }
      response.setHeader("content-type", "application/json");
      response.end(JSON.stringify({ url: `${server.origin}media-file`, mime_type: "image/png" }));
    });
    const client = createWhatsAppMediaClient(server.origin);

    for (const unsafeReference of [
      { ...reference(), apiVersion: "v26.0/escape" },
      { ...reference(), phoneNumberId: "123?456" },
      { ...reference(), mediaId: "../secret" },
    ]) {
      await expect(client.retrieveImage(unsafeReference)).rejects.toMatchObject({
        kind: "invalid",
      });
    }
    expect(requestCount).toBe(0);
  });

  it("rejects invalid graph origins and media URLs with credentials", async () => {
    expect(() => createWhatsAppMediaClient("http://attacker.example/")).toThrow(WhatsAppMediaError);
    expect(() => createWhatsAppMediaClient("https://user:pass@graph.facebook.com/")).toThrow(
      WhatsAppMediaError,
    );
    const userInfoServer = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          url: `http://user@${new URL(userInfoServer.origin).hostname}/media-file`,
          mime_type: "image/png",
        }),
      );
    });
    await expect(
      createWhatsAppMediaClient(userInfoServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const passwordServer = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          url: `http://:pass@${new URL(passwordServer.origin).hostname}/media-file`,
          mime_type: "image/png",
        }),
      );
    });
    await expect(
      createWhatsAppMediaClient(passwordServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects a protocol mismatch and a media HTTP failure independently", async () => {
    const protocolServer = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          url: `https://${new URL(protocolServer.origin).hostname}/media-file`,
          mime_type: "image/png",
        }),
      );
    });
    await expect(
      createWhatsAppMediaClient(protocolServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const mediaFailureServer = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            url: `${mediaFailureServer.origin}media-file`,
            mime_type: "image/png",
          }),
        );
        return;
      }
      response.statusCode = 503;
      response.end();
    });
    await expect(
      createWhatsAppMediaClient(mediaFailureServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "retryable" });
  });

  it("accepts the localhost HTTP test origin only when its protocol is preserved", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            url: `http://localhost:${new URL(server.origin).port}/media-file`,
            mime_type: "image/png",
          }),
        );
        return;
      }
      response.setHeader("content-type", "image/png");
      response.end(Buffer.from([1]));
    });
    const result = await createWhatsAppMediaClient(
      `http://localhost:${new URL(server.origin).port}/`,
    ).retrieveImage(reference());
    expect(result.declaredMimeType).toBe("image/png");
  });

  it.each([
    [401, "rejected"],
    [404, "retryable"],
    [500, "retryable"],
    [400, "invalid"],
  ] as const)("classifies graph status %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status;
      response.end();
    });
    await expect(
      createWhatsAppMediaClient(server.origin).retrieveImage(reference(`status-${String(status)}`)),
    ).rejects.toMatchObject({ kind });
  });

  it("rejects a download MIME mismatch and bounded response violations", async () => {
    const mimeServer = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({ url: `${mimeServer.origin}media-file`, mime_type: "image/png" }),
        );
        return;
      }
      response.setHeader("content-type", "image/jpeg");
      response.end(Buffer.from([1, 2, 3]));
    });
    await expect(
      createWhatsAppMediaClient(mimeServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const oversizedServer = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.setHeader("content-length", "70000");
      response.end(
        JSON.stringify({ url: "https://graph.facebook.com/media-file", mime_type: "image/png" }),
      );
    });
    await expect(
      createWhatsAppMediaClient(oversizedServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const emptyServer = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({ url: `${emptyServer.origin}media-file`, mime_type: "image/png" }),
        );
        return;
      }
      response.setHeader("content-type", "image/png");
      response.end();
    });
    await expect(
      createWhatsAppMediaClient(emptyServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const missingMimeServer = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({ url: `${missingMimeServer.origin}media-file`, mime_type: "image/png" }),
        );
        return;
      }
      response.end(Buffer.from([1, 2, 3]));
    });
    await expect(
      createWhatsAppMediaClient(missingMimeServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "invalid" });

    const malformedControlServer = await startServer((_request, response) => {
      response.setHeader("content-type", "application/json");
      response.end("not-json");
    });
    await expect(
      createWhatsAppMediaClient(malformedControlServer.origin).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("wraps an interrupted control response as an uncertain media error", async () => {
    const server = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-type": "application/json",
        "content-length": "100",
      });
      response.end("{}");
    });

    await expect(
      createWhatsAppMediaClient(server.origin, 50).retrieveImage(reference()),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("honors cancellation without retrying the request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createWhatsAppMediaClient().retrieveImage(reference(), controller.signal),
    ).rejects.toMatchObject({ kind: "cancelled" });
  });
});

describe("image normalization", () => {
  it("converts a real image to a WebP analysis rendition and hashes both objects", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.startsWith("/v26.0/media-1")) {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            url: `${server.origin}media-file`,
            mime_type: "image/png",
          }),
        );
        return;
      }
      response.statusCode = 200;
      response.setHeader("content-type", "image/png");
      response.end(
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      );
    });
    const media = await createWhatsAppMediaClient(server.origin).retrieveImage(reference());
    const normalized = await normalizeImage(media, "producto.png");
    expect(normalized.originalMimeType).toBe("image/png");
    expect(normalized.widthPixels).toBe(1);
    expect(normalized.heightPixels).toBe(1);
    expect(normalized.analysisWebpBytes.byteLength).toBeGreaterThan(0);
    expect(normalized.originalSha256Hex).toBe(
      createHash("sha256").update(media.bytes).digest("hex"),
    );
    expect(normalized.analysisWebpSha256Hex).toBe(
      createHash("sha256").update(normalized.analysisWebpBytes).digest("hex"),
    );
  });

  it("fails closed for a declared digest mismatch and a malformed image", async () => {
    await expect(
      normalizeImage({ ...pngMedia, declaredSha256Hex: "0".repeat(64) }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(normalizeImage(pngMedia)).rejects.toBeInstanceOf(WhatsAppMediaError);
  });

  it("accepts exact digest, file-size and filename boundaries", async () => {
    const digest = createHash("sha256").update(validPngBytes).digest("hex");
    await expect(
      normalizeImage(
        {
          bytes: validPngBytes,
          declaredMimeType: "image/png",
          declaredSha256Hex: digest,
          declaredFileSize: validPngBytes.byteLength,
        },
        "x",
      ),
    ).resolves.toMatchObject({ originalFileName: "x", originalSha256Hex: digest });
    await expect(
      normalizeImage({ bytes: validPngBytes, declaredMimeType: "image/png" }, "x".repeat(255)),
    ).resolves.toMatchObject({ originalFileName: "x".repeat(255) });
  });

  it("rejects mismatched digest and size at the evidence guards", async () => {
    const digestError = await captureMediaError(
      normalizeImage({
        bytes: validPngBytes,
        declaredMimeType: "image/png",
        declaredSha256Hex: "0".repeat(64),
      }),
    );
    expect(digestError.cause).toBeUndefined();

    const sizeError = await captureMediaError(
      normalizeImage({
        bytes: validPngBytes,
        declaredMimeType: "image/png",
        declaredFileSize: validPngBytes.byteLength + 1,
      }),
    );
    expect(sizeError.cause).toBeUndefined();
  });

  it("rejects declared size, actual MIME and filename evidence mismatches", async () => {
    await expect(
      normalizeImage({
        bytes: validPngBytes,
        declaredMimeType: "image/png",
        declaredFileSize: validPngBytes.byteLength + 1,
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      normalizeImage({ bytes: validPngBytes, declaredMimeType: "image/jpeg" }),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      normalizeImage({ bytes: validPngBytes, declaredMimeType: "image/png" }, " producto.png"),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      normalizeImage({ bytes: validPngBytes, declaredMimeType: "image/png" }, ""),
    ).rejects.toMatchObject({ kind: "invalid" });
    await expect(
      normalizeImage({ bytes: validPngBytes, declaredMimeType: "image/png" }, "x".repeat(256)),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("rejects empty input and oversized image dimensions before conversion", async () => {
    await expect(
      normalizeImage({ bytes: new Uint8Array(), declaredMimeType: "image/png" }),
    ).rejects.toMatchObject({ kind: "invalid" });
    const tallPng = await sharp({
      create: { width: 1, height: 100_001, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();
    await expect(
      normalizeImage({ bytes: tallPng, declaredMimeType: "image/png" }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("distinguishes byte-size guards from decoder failures at exact boundaries", async () => {
    const emptyError = await captureMediaError(
      normalizeImage({ bytes: new Uint8Array(), declaredMimeType: "image/png" }),
    );
    expect(emptyError.cause).toBeUndefined();

    const oneByteError = await captureMediaError(
      normalizeImage({ bytes: Uint8Array.of(0), declaredMimeType: "image/png" }),
    );
    expect(oneByteError.cause).toBeInstanceOf(Error);

    const oversizedError = await captureMediaError(
      normalizeImage({ bytes: new Uint8Array(5_242_881), declaredMimeType: "image/png" }),
    );
    expect(oversizedError.cause).toBeUndefined();

    const exactLimitError = await captureMediaError(
      normalizeImage({ bytes: new Uint8Array(5_242_880), declaredMimeType: "image/png" }),
    );
    expect(exactLimitError.cause).toBeInstanceOf(Error);
  });

  it("rejects width and height above the limit while permitting the exact guard boundary", async () => {
    for (const dimensions of [
      { width: 100_001, height: 1 },
      { width: 1, height: 100_001 },
    ]) {
      const bytes = await sharp({
        create: { ...dimensions, channels: 3, background: { r: 1, g: 2, b: 3 } },
      })
        .png()
        .toBuffer();
      const error = await captureMediaError(
        normalizeImage({ bytes, declaredMimeType: "image/png" }),
      );
      expect(error.cause).toBeUndefined();
    }

    for (const dimensions of [
      { width: 100_000, height: 1 },
      { width: 1, height: 100_000 },
    ]) {
      const bytes = await sharp({
        create: { ...dimensions, channels: 3, background: { r: 1, g: 2, b: 3 } },
      })
        .png()
        .toBuffer();
      const error = await captureMediaError(
        normalizeImage({ bytes, declaredMimeType: "image/png" }),
      );
      expect(error.cause).toBeInstanceOf(Error);
    }
  });

  it("rejects animated WebP input before producing a catalog rendition", async () => {
    const animatedWebp = await sharp(Buffer.from([255, 0, 0, 255, 0, 255, 0, 255]), {
      raw: { width: 1, height: 2, channels: 4, pageHeight: 1 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    const error = await captureMediaError(
      normalizeImage({ bytes: animatedWebp, declaredMimeType: "image/webp" }),
    );
    expect(error.cause).toBeUndefined();
  });
});
