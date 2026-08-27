import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { type ClaimedOutboxEvent } from "../src/whatsapp-ai-rpc.js";
import { createWhatsAppGraphClient, WhatsAppGraphError } from "../src/whatsapp-graph.js";

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

const readBody = async (request: IncomingMessage): Promise<unknown> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected a UTF-8 request body");
    }
    body += chunk;
  }
  return JSON.parse(body) as unknown;
};

const claim = (): ClaimedOutboxEvent => ({
  organizationId: "11111111-1111-4111-8111-111111111111",
  outboxEventId: "22222222-2222-4222-8222-222222222222",
  messageId: "33333333-3333-4333-8333-333333333333",
  leaseToken: "44444444-4444-4444-8444-444444444444",
  leaseExpiresAt: "2026-08-27T00:00:00.000Z",
  attemptNumber: 1,
  apiVersion: "v26.0",
  phoneNumberId: "1120384374493698",
  destination: "5213312345678",
  payload: { type: "text", text: { body: "Hola desde IA" } },
  accessToken: new SensitiveValue("meta-access-token-test"),
  correlationId: "outbox:22222222-2222-4222-8222-222222222222",
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("WhatsApp Graph transport", () => {
  it("sends the tenant destination and payload to the exact phone endpoint", async () => {
    let requestBody: unknown;
    let authorization: string | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/v26.0/1120384374493698/messages");
      authorization = request.headers.authorization;
      requestBody = await readBody(request);
      response.statusCode = 200;
      response.end(JSON.stringify({ messages: [{ id: "wamid.real-result" }] }));
    });

    const result = await createWhatsAppGraphClient(server.origin).sendMessage(claim());

    expect(authorization).toBe("Bearer meta-access-token-test");
    expect(requestBody).toEqual({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: "5213312345678",
      type: "text",
      text: { body: "Hola desde IA" },
    });
    expect(result).toEqual({ providerMessageId: "wamid.real-result" });
  });

  it.each([
    [400, "invalid"],
    [401, "rejected"],
    [429, "retryable"],
    [503, "uncertain"],
  ] as const)("classifies Graph HTTP %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      response.statusCode = status;
      response.end(JSON.stringify({ error: { code: status } }));
    });

    await expect(
      createWhatsAppGraphClient(server.origin).sendMessage(claim()),
    ).rejects.toMatchObject({ kind });
  });

  it("fails closed on unsafe endpoint identifiers before network I/O", async () => {
    await expect(
      createWhatsAppGraphClient().sendMessage({ ...claim(), apiVersion: "../secrets" }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it("treats a successful response without a wamid as effect-uncertain", async () => {
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.end(JSON.stringify({ messages: [] }));
    });

    await expect(
      createWhatsAppGraphClient(server.origin).sendMessage(claim()),
    ).rejects.toMatchObject({ kind: "uncertain" });
  });

  it("marks an aborted request as cancelled", async () => {
    const server = await startServer(() => undefined);
    const controller = new AbortController();
    controller.abort();

    await expect(
      createWhatsAppGraphClient(server.origin).sendMessage(claim(), controller.signal),
    ).rejects.toBeInstanceOf(WhatsAppGraphError);
    await expect(
      createWhatsAppGraphClient(server.origin).sendMessage(claim(), controller.signal),
    ).rejects.toMatchObject({ kind: "cancelled" });
  });
});
