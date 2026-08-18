import { Buffer } from "node:buffer";
import { type AddressInfo } from "node:net";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMetaWebhookRpcClient,
  MetaWebhookRpcError,
} from "../src/meta-webhook-rpc.js";

const servers: Server[] = [];
const testSecret = ["sb", "secret", "meta", "rpc", "transport", "test"].join("_");

type RequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => Promise<void> | void;

const startHttpServer = async (handler: RequestHandler): Promise<string> => {
  const server = createServer();
  servers.push(server);
  server.on("request", (request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => {
      response.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(address.port)}`;
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
    server.closeAllConnections();
  });
};

const readRequestBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected an UTF-8 request body");
    }
    body += chunk;
  }
  return JSON.parse(body) as Record<string, unknown>;
};

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(payload),
    "content-type": "application/json",
  });
  response.end(payload);
};

const createClient = (supabaseUrl: string, timeoutMilliseconds = 1_000) =>
  createMetaWebhookRpcClient({
    supabaseUrl,
    secretKey: new SensitiveValue(testSecret),
    timeoutMilliseconds,
  });

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

describe("Supabase Meta webhook RPC transport", () => {
  it.each([
    ["invalid", "META_WEBHOOK_RPC_INVALID", "validation", false, "warning"],
    ["rejected", "META_WEBHOOK_RPC_REJECTED", "authentication", false, "warning"],
    ["timeout", "META_WEBHOOK_RPC_TIMEOUT", "timeout", true, "error"],
    ["dependency", "META_WEBHOOK_RPC_DEPENDENCY", "dependency", true, "error"],
  ] as const)(
    "preserves the complete safe error taxonomy for %s failures",
    (kind, code, category, retryable, severity) => {
      const error = new MetaWebhookRpcError(kind, new Error("private-cause"));

      expect(error).toMatchObject({
        name: "MetaWebhookRpcError",
        kind,
        code,
        category,
        retryable,
        severity,
      });
      expect(error.message).toBe(code);
      expect(JSON.stringify(error)).not.toContain("private-cause");
    },
  );

  it("uses the custom API schema and the new secret-key header without Bearer auth", async () => {
    const requests: {
      url: string;
      headers: IncomingMessage["headers"];
      body: Record<string, unknown>;
    }[] = [];
    const baseUrl = await startHttpServer(async (request, response) => {
      requests.push({
        url: request.url ?? "",
        headers: request.headers,
        body: await readRequestBody(request),
      });

      if (request.url?.endsWith("accept_meta_webhook_challenge") === true) {
        writeJson(response, 200, [
          {
            organization_id: "b4021000-0000-4000-8000-000000000001",
            meta_application_id: "b4021000-0000-4000-8000-000000000002",
            webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
            external_app_id: "meta-app-alpha",
            credential_version_id: "b4021000-0000-4000-8000-000000000004",
          },
        ]);
        return;
      }

      writeJson(response, 200, [
        {
          delivery_id: "b4021000-0000-4000-8000-000000000005",
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          credential_version_id: "b4021000-0000-4000-8000-000000000004",
          provider_object_type: "page",
          replayed: false,
          delivery_count: 1,
          delivery_status: "received",
        },
      ]);
    });
    const client = createClient(baseUrl);

    const challenge = await client.acceptChallenge({
      endpointKey: "b4021000-0000-4000-8000-000000000003",
      mode: "subscribe",
      verifyToken: "exact-verify-token-value",
      requestId: "request-challenge",
      traceId: "trace-challenge",
    });
    const rawBody = Buffer.from('{"object":"page","entry":[{"id":"page-alpha"}]}');
    const delivery = await client.ingestDelivery({
      endpointKey: "b4021000-0000-4000-8000-000000000003",
      rawBody,
      signatureHex: "a1".repeat(32),
      requestId: "request-delivery",
      traceId: "trace-delivery",
    });

    expect(challenge.externalAppId).toBe("meta-app-alpha");
    expect(delivery).toMatchObject({
      deliveryId: "b4021000-0000-4000-8000-000000000005",
      providerObjectType: "page",
      replayed: false,
      deliveryCount: 1,
      deliveryStatus: "received",
    });
    expect(requests).toHaveLength(2);
    for (const request of requests) {
      expect(request.headers.apikey).toBe(testSecret);
      expect(request.headers.authorization).toBeUndefined();
      expect(request.headers.accept).toBe("application/json");
      expect(request.headers["accept-profile"]).toBe("api");
      expect(request.headers["content-profile"]).toBe("api");
      expect(request.headers["content-type"]).toBe("application/json");
      expect(request.headers["cache-control"]).toBe("no-cache");
    }
    expect(requests[0]?.url).toBe("/rest/v1/rpc/accept_meta_webhook_challenge");
    expect(requests[0]?.body).toEqual({
      target_endpoint_key: "b4021000-0000-4000-8000-000000000003",
      target_mode: "subscribe",
      target_verify_token: "exact-verify-token-value",
      target_correlation_id: "request-challenge",
      target_trace_id: "trace-challenge",
    });
    expect(requests[1]?.url).toBe("/rest/v1/rpc/ingest_meta_webhook_delivery");
    expect(requests[1]?.body.target_raw_body_base64).toBe(rawBody.toString("base64"));
    expect(requests[1]?.body.target_signature_hex).toBe("a1".repeat(32));
  });

  it.each([
    [400, "invalid"],
    [413, "invalid"],
    [422, "invalid"],
    [401, "rejected"],
    [403, "rejected"],
    [404, "dependency"],
    [409, "dependency"],
    [429, "dependency"],
    [500, "dependency"],
  ] as const)("classifies a PostgREST %i response as %s without exposing its body", async (status, kind) => {
    const baseUrl = await startHttpServer((_request, response) => {
      writeJson(response, status, {
        message: "sensitive provider diagnostic must never escape",
      });
    });

    const operation = createClient(baseUrl).acceptChallenge({
      endpointKey: "b4021000-0000-4000-8000-000000000003",
      mode: "subscribe",
      verifyToken: "exact-verify-token-value",
      requestId: "request-failure",
      traceId: "trace-failure",
    });

    await expect(operation).rejects.toMatchObject({
      name: "MetaWebhookRpcError",
      kind,
    });
    await expect(operation).rejects.not.toThrow("sensitive provider diagnostic");
  });

  it("fails closed when Supabase returns malformed or multiple result rows", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      const validRow = {
        organization_id: "b4021000-0000-4000-8000-000000000001",
        meta_application_id: "b4021000-0000-4000-8000-000000000002",
        webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
        external_app_id: "meta-app-alpha",
        credential_version_id: "b4021000-0000-4000-8000-000000000004",
      };
      writeJson(response, 200, [validRow, validRow]);
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-invalid-contract",
        traceId: "trace-invalid-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([1, 255])(
    "accepts an external application identifier at the exact %i character boundary",
    async (length) => {
      const externalAppId = "a".repeat(length);
      const baseUrl = await startHttpServer((_request, response) => {
        writeJson(response, 200, [
          {
            organization_id: "b4021000-0000-4000-8000-000000000001",
            meta_application_id: "b4021000-0000-4000-8000-000000000002",
            webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
            external_app_id: externalAppId,
            credential_version_id: "b4021000-0000-4000-8000-000000000004",
          },
        ]);
      });

      await expect(
        createClient(baseUrl).acceptChallenge({
          endpointKey: "b4021000-0000-4000-8000-000000000003",
          mode: "subscribe",
          verifyToken: "exact-verify-token-value",
          requestId: "request-text-boundary",
          traceId: "trace-text-boundary",
        }),
      ).resolves.toMatchObject({ externalAppId });
    },
  );

  it.each([{}, null, [], [null], ["not-a-row"], [{}]])(
    "fails closed for a malformed PostgREST result envelope: %j",
    async (responseBody) => {
      const baseUrl = await startHttpServer((_request, response) => {
        writeJson(response, 200, responseBody);
      });

      await expect(
        createClient(baseUrl).acceptChallenge({
          endpointKey: "b4021000-0000-4000-8000-000000000003",
          mode: "subscribe",
          verifyToken: "exact-verify-token-value",
          requestId: "request-malformed-envelope",
          traceId: "trace-malformed-envelope",
        }),
      ).rejects.toMatchObject({ kind: "dependency" });
    },
  );

  it("rejects an oversized dependency response before JSON parsing", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      response.writeHead(200, {
        "content-length": 65_537,
        "content-type": "application/json",
      });
      response.end("x");
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-oversized-contract",
        traceId: "trace-oversized-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects an oversized chunked response after reading its bounded bytes", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      const validRow = JSON.stringify([
        {
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          external_app_id: "meta-app-alpha",
          credential_version_id: "b4021000-0000-4000-8000-000000000004",
        },
      ]);
      const payload = validRow + " ".repeat(65_537 - Buffer.byteLength(validRow));
      response.writeHead(200, { "content-type": "application/json" });
      response.write(payload.slice(0, 32_000));
      response.end(payload.slice(32_000));
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-oversized-chunked-contract",
        traceId: "trace-oversized-chunked-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("accepts a valid dependency response at the exact 64 KiB boundary", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      const validRow = JSON.stringify([
        {
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          external_app_id: "meta-app-alpha",
          credential_version_id: "b4021000-0000-4000-8000-000000000004",
        },
      ]);
      const payload = validRow + " ".repeat(65_536 - Buffer.byteLength(validRow));
      response.writeHead(200, {
        "content-length": Buffer.byteLength(payload),
        "content-type": "application/json",
      });
      response.end(payload);
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-exact-response-boundary",
        traceId: "trace-exact-response-boundary",
      }),
    ).resolves.toMatchObject({ externalAppId: "meta-app-alpha" });
  });

  it("rejects invalid UTF-8 JSON and never returns dependency diagnostics", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      response.writeHead(200, {
        "content-length": 1,
        "content-type": "application/json",
      });
      response.end("{");
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-invalid-json-contract",
        traceId: "trace-invalid-json-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    {
      organization_id: "not-a-uuid",
      meta_application_id: "b4021000-0000-4000-8000-000000000002",
      webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
      external_app_id: "meta-app-alpha",
      credential_version_id: "b4021000-0000-4000-8000-000000000004",
    },
    {
      organization_id: "b4021000-0000-4000-8000-000000000001",
      meta_application_id: "b4021000-0000-4000-8000-000000000002",
      webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
      external_app_id: "",
      credential_version_id: "b4021000-0000-4000-8000-000000000004",
    },
    {
      organization_id: "b4021000-0000-4000-8000-000000000001",
      meta_application_id: "b4021000-0000-4000-8000-000000000002",
      webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
      external_app_id: 42,
      credential_version_id: "b4021000-0000-4000-8000-000000000004",
    },
    {
      organization_id: "b4021000-0000-4000-8000-000000000001",
      meta_application_id: "b4021000-0000-4000-8000-000000000002",
      webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
      external_app_id: "x".repeat(256),
      credential_version_id: "b4021000-0000-4000-8000-000000000004",
    },
  ] as const)("rejects a successful row with %s fields", async (row) => {
    const baseUrl = await startHttpServer((_request, response) => {
      writeJson(response, 200, [row]);
    });

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-invalid-row-contract",
        traceId: "trace-invalid-row-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects an impossible delivery replay counter from the dependency", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      writeJson(response, 200, [
        {
          delivery_id: "b4021000-0000-4000-8000-000000000005",
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          credential_version_id: "b4021000-0000-4000-8000-000000000004",
          provider_object_type: "page",
          replayed: "false",
          delivery_count: 0,
          delivery_status: "received",
        },
      ]);
    });

    await expect(
      createClient(baseUrl).ingestDelivery({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        rawBody: Buffer.from('{"object":"page","entry":[{}]}'),
        signatureHex: "a1".repeat(32),
        requestId: "request-invalid-delivery-contract",
        traceId: "trace-invalid-delivery-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    { replayed: "false", delivery_count: 1 },
    { replayed: false, delivery_count: "1" },
    { replayed: false, delivery_count: 1.5 },
    { replayed: false, delivery_count: 0 },
  ])("rejects each invalid delivery accounting field independently: %j", async (override) => {
    const baseUrl = await startHttpServer((_request, response) => {
      writeJson(response, 200, [
        {
          delivery_id: "b4021000-0000-4000-8000-000000000005",
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          credential_version_id: "b4021000-0000-4000-8000-000000000004",
          provider_object_type: "page",
          delivery_status: "received",
          ...override,
        },
      ]);
    });

    await expect(
      createClient(baseUrl).ingestDelivery({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        rawBody: Buffer.from('{"object":"page","entry":[{}]}'),
        signatureHex: "a1".repeat(32),
        requestId: "request-invalid-accounting-contract",
        traceId: "trace-invalid-accounting-contract",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("classifies a refused real TCP connection as a dependency failure", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      writeJson(response, 200, []);
    });
    const server = servers.pop();
    if (server === undefined) {
      throw new Error("Expected the temporary dependency server");
    }
    await closeServer(server);

    await expect(
      createClient(baseUrl).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-refused-connection",
        traceId: "trace-refused-connection",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("classifies a real TCP timeout as retryable without serializing the secret", async () => {
    const baseUrl = await startHttpServer((_request, response) => {
      setTimeout(() => {
        writeJson(response, 200, []);
      }, 100);
    });
    let capturedError: unknown;

    try {
      await createClient(baseUrl, 10).acceptChallenge({
        endpointKey: "b4021000-0000-4000-8000-000000000003",
        mode: "subscribe",
        verifyToken: "exact-verify-token-value",
        requestId: "request-timeout",
        traceId: "trace-timeout",
      });
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(MetaWebhookRpcError);
    expect(capturedError).toMatchObject({ kind: "timeout", retryable: true });
    expect(JSON.stringify(capturedError)).not.toContain(testSecret);
  });
});
