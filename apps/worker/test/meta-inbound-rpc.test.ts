import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createMetaInboundRpcClient, MetaInboundRpcError } from "../src/meta-inbound-rpc.js";

const servers: Server[] = [];
const testSecret = ["sb", "secret", "worker", "meta", "inbound", "test"].join("_");

type RequestHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void> | void;

const startHttpServer = async (handler: RequestHandler): Promise<string> => {
  const server = createServer();
  servers.push(server);
  server.on("request", (request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => response.destroy());
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
      throw new TypeError("Expected a UTF-8 request body");
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

const createClient = (url: string, timeoutMilliseconds = 1_000) =>
  createMetaInboundRpcClient({
    supabaseUrl: url,
    secretKey: new SensitiveValue(testSecret),
    timeoutMilliseconds,
  });

const ids = Object.freeze({
  delivery: "b4031000-0000-4000-8000-000000000101",
  organization: "b4031000-0000-4000-8000-000000000102",
  application: "b4031000-0000-4000-8000-000000000103",
  deliveryLease: "b4031000-0000-4000-8000-000000000104",
  inboundEvent: "b4031000-0000-4000-8000-000000000105",
  connection: "b4031000-0000-4000-8000-000000000106",
  eventLease: "b4031000-0000-4000-8000-000000000107",
  identity: "b4031000-0000-4000-8000-000000000108",
  conversation: "b4031000-0000-4000-8000-000000000109",
  message: "b4031000-0000-4000-8000-000000000110",
});

const deliveryClaimInput = Object.freeze({
  workerId: "worker-rpc-test",
  providerObjectType: "whatsapp_business_account",
  leaseSeconds: 120,
  maxAttempts: 8,
});

const validDeliveryClaimRow = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  delivery_id: ids.delivery,
  organization_id: ids.organization,
  meta_application_id: ids.application,
  provider_object_type: "whatsapp_business_account",
  attempt_number: 1,
  lease_token: ids.deliveryLease,
  lease_expires_at: "2026-08-26T15:00:00.000Z",
  correlation_id: "request-delivery",
  trace_id: null,
  ...overrides,
});

const validRouteRow = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  delivery_id: ids.delivery,
  delivery_status: "routed",
  inserted_event_count: 1,
  replayed_event_count: 0,
  ignored_change_count: 0,
  ...overrides,
});

const validEventClaimRow = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  inbound_event_id: ids.inboundEvent,
  organization_id: ids.organization,
  channel_connection_id: ids.connection,
  attempt_number: 2,
  lease_token: ids.eventLease,
  lease_expires_at: "2026-08-26T15:00:00.000Z",
  correlation_id: "request-event",
  trace_id: "trace-event",
  ...overrides,
});

const validNormalizedRow = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  inbound_event_id: ids.inboundEvent,
  channel_identity_id: ids.identity,
  conversation_id: ids.conversation,
  message_id: ids.message,
  content_kind: "text",
  was_replayed: false,
  principal_type: "contact",
  ...overrides,
});

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

describe("worker Supabase Meta inbound RPC transport", () => {
  it.each([
    ["invalid", "META_INBOUND_RPC_INVALID", "validation", false],
    ["rejected", "META_INBOUND_RPC_REJECTED", "authentication", false],
    ["timeout", "META_INBOUND_RPC_TIMEOUT", "timeout", true],
    ["cancelled", "META_INBOUND_RPC_CANCELLED", "internal", true],
    ["dependency", "META_INBOUND_RPC_DEPENDENCY", "dependency", true],
  ] as const)("keeps %s failures safe and typed", (kind, code, category, retryable) => {
    const error = new MetaInboundRpcError(kind, new Error("private-diagnostic"));
    expect(error).toMatchObject({
      name: "MetaInboundRpcError",
      kind,
      code,
      category,
      retryable,
    });
    expect(JSON.stringify(error)).not.toContain("private-diagnostic");
  });

  it("executes all six RPC contracts without ever transporting a raw payload", async () => {
    const requests: {
      url: string;
      method: string | undefined;
      headers: IncomingMessage["headers"];
      body: Record<string, unknown>;
    }[] = [];
    const url = await startHttpServer(async (request, response) => {
      const body = await readRequestBody(request);
      requests.push({
        url: request.url ?? "",
        method: request.method,
        headers: request.headers,
        body,
      });
      const path = request.url ?? "";

      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, [
          {
            delivery_id: ids.delivery,
            organization_id: ids.organization,
            meta_application_id: ids.application,
            provider_object_type: "whatsapp_business_account",
            attempt_number: 1,
            lease_token: ids.deliveryLease,
            lease_expires_at: "2026-08-26T15:00:00.000Z",
            correlation_id: "request-delivery",
            trace_id: null,
          },
        ]);
        return;
      }
      if (path.endsWith("route_meta_whatsapp_delivery")) {
        writeJson(response, 200, [
          {
            delivery_id: ids.delivery,
            delivery_status: "routed",
            inserted_event_count: 1,
            replayed_event_count: 0,
            ignored_change_count: 0,
          },
        ]);
        return;
      }
      if (path.endsWith("fail_meta_webhook_delivery")) {
        writeJson(response, 200, [
          { delivery_id: ids.delivery, delivery_status: "retryable", attempt_count: 1 },
        ]);
        return;
      }
      if (path.endsWith("claim_meta_whatsapp_message_event")) {
        writeJson(response, 200, [
          {
            inbound_event_id: ids.inboundEvent,
            organization_id: ids.organization,
            channel_connection_id: ids.connection,
            attempt_number: 2,
            lease_token: ids.eventLease,
            lease_expires_at: "2026-08-26T15:00:00.000Z",
            correlation_id: "request-event",
            trace_id: "trace-event",
          },
        ]);
        return;
      }
      if (path.endsWith("normalize_meta_whatsapp_message")) {
        writeJson(response, 200, [
          {
            inbound_event_id: ids.inboundEvent,
            channel_identity_id: ids.identity,
            conversation_id: ids.conversation,
            message_id: ids.message,
            content_kind: "media",
            was_replayed: false,
            principal_type: "contact",
          },
        ]);
        return;
      }
      writeJson(response, 200, [
        { inbound_event_id: ids.inboundEvent, event_status: "dead_letter", attempt_count: 2 },
      ]);
    });
    const client = createClient(url);

    const deliveryClaim = await client.claimDelivery(deliveryClaimInput);
    expect(deliveryClaim).toMatchObject({ deliveryId: ids.delivery });
    expect(deliveryClaim).not.toHaveProperty("traceId");
    await expect(
      client.routeWhatsAppDelivery({
        deliveryId: ids.delivery,
        leaseToken: ids.deliveryLease,
      }),
    ).resolves.toMatchObject({ status: "routed", insertedEventCount: 1 });
    await expect(
      client.failDelivery({
        deliveryId: ids.delivery,
        leaseToken: ids.deliveryLease,
        errorCode: "dependency_timeout",
        retryable: true,
        retryDelaySeconds: 5,
        maxAttempts: 8,
      }),
    ).resolves.toMatchObject({ status: "retryable", attemptCount: 1 });
    await expect(
      client.claimWhatsAppMessage({
        workerId: "worker-rpc-test",
        leaseSeconds: 120,
        maxAttempts: 8,
      }),
    ).resolves.toMatchObject({ inboundEventId: ids.inboundEvent, traceId: "trace-event" });
    await expect(
      client.normalizeWhatsAppMessage({
        inboundEventId: ids.inboundEvent,
        leaseToken: ids.eventLease,
      }),
    ).resolves.toMatchObject({ contentKind: "media", principalType: "contact" });
    await expect(
      client.failWhatsAppMessage({
        inboundEventId: ids.inboundEvent,
        leaseToken: ids.eventLease,
        errorCode: "invalid_whatsapp_message",
        retryable: false,
        retryDelaySeconds: 5,
        maxAttempts: 8,
      }),
    ).resolves.toMatchObject({ status: "dead_letter", attemptCount: 2 });

    expect(requests).toHaveLength(6);
    for (const request of requests) {
      expect(request.method).toBe("POST");
      expect(request.headers.apikey).toBe(testSecret);
      expect(request.headers.authorization).toBeUndefined();
      expect(request.headers.accept).toBe("application/json");
      expect(request.headers["accept-profile"]).toBe("api");
      expect(request.headers["content-profile"]).toBe("api");
      expect(request.headers["content-type"]).toBe("application/json");
      expect(request.body).not.toHaveProperty("payload");
      expect(JSON.stringify(request.body)).not.toContain("customer message");
    }
    expect(requests.map(({ url: requestUrl, body }) => ({ requestUrl, body }))).toEqual([
      {
        requestUrl: "/rest/v1/rpc/claim_meta_webhook_delivery",
        body: {
          target_worker_id: "worker-rpc-test",
          target_provider_object_type: "whatsapp_business_account",
          target_lease_seconds: 120,
          target_max_attempts: 8,
        },
      },
      {
        requestUrl: "/rest/v1/rpc/route_meta_whatsapp_delivery",
        body: {
          target_delivery_id: ids.delivery,
          target_lease_token: ids.deliveryLease,
        },
      },
      {
        requestUrl: "/rest/v1/rpc/fail_meta_webhook_delivery",
        body: {
          target_delivery_id: ids.delivery,
          target_lease_token: ids.deliveryLease,
          target_error_code: "dependency_timeout",
          target_retryable: true,
          target_retry_delay_seconds: 5,
          target_max_attempts: 8,
        },
      },
      {
        requestUrl: "/rest/v1/rpc/claim_meta_whatsapp_message_event",
        body: {
          target_worker_id: "worker-rpc-test",
          target_lease_seconds: 120,
          target_max_attempts: 8,
        },
      },
      {
        requestUrl: "/rest/v1/rpc/normalize_meta_whatsapp_message",
        body: {
          target_inbound_event_id: ids.inboundEvent,
          target_lease_token: ids.eventLease,
        },
      },
      {
        requestUrl: "/rest/v1/rpc/fail_meta_whatsapp_message_event",
        body: {
          target_inbound_event_id: ids.inboundEvent,
          target_lease_token: ids.eventLease,
          target_error_code: "invalid_whatsapp_message",
          target_retryable: false,
          target_retry_delay_seconds: 5,
          target_max_attempts: 8,
        },
      },
    ]);
  });

  it("returns undefined only for a valid empty claim envelope", async () => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, []);
    });
    const client = createClient(url);

    await expect(
      client.claimDelivery({
        workerId: "worker-empty",
        providerObjectType: "whatsapp_business_account",
        leaseSeconds: 120,
        maxAttempts: 8,
      }),
    ).resolves.toBeUndefined();
    await expect(
      client.claimWhatsAppMessage({
        workerId: "worker-empty",
        leaseSeconds: 120,
        maxAttempts: 8,
      }),
    ).resolves.toBeUndefined();
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
  ] as const)("classifies HTTP %i as %s without reading its body", async (status, kind) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, status, { message: "private Supabase diagnostic" });
    });
    const operation = createClient(url).claimDelivery({
      workerId: "worker-failure",
      providerObjectType: "whatsapp_business_account",
      leaseSeconds: 120,
      maxAttempts: 8,
    });
    await expect(operation).rejects.toMatchObject({ kind });
    await expect(operation).rejects.not.toThrow("private Supabase diagnostic");
  });

  it.each([
    {},
    null,
    [null],
    [{ delivery_id: "not-a-uuid" }],
    [{ delivery_id: ids.delivery, delivery_status: "impossible" }],
  ])("fails closed for malformed successful data: %j", async (body) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, body);
    });
    await expect(
      createClient(url).routeWhatsAppDelivery({
        deliveryId: ids.delivery,
        leaseToken: ids.deliveryLease,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    ["non-string UUID", { delivery_id: 42 }],
    ["short UUID", { delivery_id: ids.delivery.slice(0, -1) }],
    ["non-hexadecimal UUID", { delivery_id: `z${ids.delivery.slice(1)}` }],
    ["invalid UUID groups", { delivery_id: "b40310000-000-4000-8000-000000000101" }],
    ["non-string provider object", { provider_object_type: 42 }],
    ["empty provider object", { provider_object_type: "" }],
    ["padded provider object", { provider_object_type: " whatsapp_business_account" }],
    ["oversized provider object", { provider_object_type: "x".repeat(161) }],
    ["non-numeric attempt", { attempt_number: "1" }],
    ["fractional attempt", { attempt_number: 1.5 }],
    ["zero attempt", { attempt_number: 0 }],
    ["non-string timestamp", { lease_expires_at: 42 }],
    ["invalid timestamp", { lease_expires_at: "not-a-date" }],
    ["non-string correlation", { correlation_id: 42 }],
    ["empty correlation", { correlation_id: "" }],
    ["padded correlation", { correlation_id: " request" }],
    ["oversized correlation", { correlation_id: "x".repeat(129) }],
    ["non-string optional trace", { trace_id: 42 }],
    ["empty optional trace", { trace_id: "" }],
    ["oversized optional trace", { trace_id: "x".repeat(129) }],
  ] as const)("rejects a %s in a claimed delivery", async (_description, override) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, [validDeliveryClaimRow(override)]);
    });

    const operation = createClient(url).claimDelivery(deliveryClaimInput);

    await expect(operation).rejects.toBeInstanceOf(MetaInboundRpcError);
    await expect(operation).rejects.toMatchObject({ kind: "dependency" });
  });

  it("accepts exact text boundaries and canonicalizes uppercase UUID evidence", async () => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, [
        validDeliveryClaimRow({
          delivery_id: ids.delivery.toUpperCase(),
          provider_object_type: "x".repeat(160),
          attempt_number: Number.MAX_SAFE_INTEGER,
          correlation_id: "c".repeat(128),
          trace_id: "t".repeat(128),
        }),
      ]);
    });

    await expect(createClient(url).claimDelivery(deliveryClaimInput)).resolves.toEqual({
      deliveryId: ids.delivery,
      organizationId: ids.organization,
      metaApplicationId: ids.application,
      providerObjectType: "x".repeat(160),
      attemptNumber: Number.MAX_SAFE_INTEGER,
      leaseToken: ids.deliveryLease,
      leaseExpiresAt: "2026-08-26T15:00:00.000Z",
      correlationId: "c".repeat(128),
      traceId: "t".repeat(128),
    });
  });

  it.each([
    { body: null },
    { body: {} },
    { body: [null] },
    { body: ["not-a-row"] },
    { body: [validDeliveryClaimRow(), validDeliveryClaimRow()] },
  ])("rejects an invalid optional claim envelope: $body", async ({ body }) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, body);
    });

    await expect(createClient(url).claimDelivery(deliveryClaimInput)).rejects.toMatchObject({
      kind: "dependency",
    });
  });

  it.each([
    { body: [] },
    { body: {} },
    { body: [null] },
    { body: ["not-a-row"] },
    { body: [validRouteRow(), validRouteRow()] },
  ])("rejects an invalid mandatory RPC envelope: $body", async ({ body }) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, body);
    });

    await expect(
      createClient(url).routeWhatsAppDelivery({
        deliveryId: ids.delivery,
        leaseToken: ids.deliveryLease,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    ["inserted_event_count", "1"],
    ["inserted_event_count", 1.5],
    ["inserted_event_count", -1],
    ["replayed_event_count", "0"],
    ["replayed_event_count", 0.5],
    ["replayed_event_count", -1],
    ["ignored_change_count", "0"],
    ["ignored_change_count", 0.5],
    ["ignored_change_count", -1],
  ] as const)("rejects invalid non-negative counter %s=%j", async (field, value) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, [validRouteRow({ [field]: value })]);
    });

    await expect(
      createClient(url).routeWhatsAppDelivery({
        deliveryId: ids.delivery,
        leaseToken: ids.deliveryLease,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each(["routed", "ignored"] as const)(
    "accepts the exact routed delivery status %s",
    async (status) => {
      const url = await startHttpServer((_request, response) => {
        writeJson(response, 200, [validRouteRow({ delivery_status: status })]);
      });

      await expect(
        createClient(url).routeWhatsAppDelivery({
          deliveryId: ids.delivery,
          leaseToken: ids.deliveryLease,
        }),
      ).resolves.toMatchObject({ status });
    },
  );

  it.each([
    "text",
    "media",
    "interactive",
    "location",
    "contact",
    "order",
    "reaction",
    "unsupported",
    "system",
  ] as const)("accepts the normalized content kind %s", async (contentKind) => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, [validNormalizedRow({ content_kind: contentKind })]);
    });

    await expect(
      createClient(url).normalizeWhatsAppMessage({
        inboundEventId: ids.inboundEvent,
        leaseToken: ids.eventLease,
      }),
    ).resolves.toMatchObject({ contentKind });
  });

  it.each(["contact", "member"] as const)(
    "accepts the normalized principal type %s",
    async (principalType) => {
      const url = await startHttpServer((_request, response) => {
        writeJson(response, 200, [validNormalizedRow({ principal_type: principalType })]);
      });

      await expect(
        createClient(url).normalizeWhatsAppMessage({
          inboundEventId: ids.inboundEvent,
          leaseToken: ids.eventLease,
        }),
      ).resolves.toMatchObject({ principalType });
    },
  );

  it.each(["retryable", "dead_letter"] as const)(
    "accepts the exact failed delivery status %s",
    async (status) => {
      const url = await startHttpServer((_request, response) => {
        writeJson(response, 200, [
          { delivery_id: ids.delivery, delivery_status: status, attempt_count: 1 },
        ]);
      });

      await expect(
        createClient(url).failDelivery({
          deliveryId: ids.delivery,
          leaseToken: ids.deliveryLease,
          errorCode: "dependency_unavailable",
          retryable: status === "retryable",
          retryDelaySeconds: 5,
          maxAttempts: 8,
        }),
      ).resolves.toMatchObject({ status });
    },
  );

  it.each(["retryable", "dead_letter"] as const)(
    "accepts the exact failed WhatsApp event status %s",
    async (status) => {
      const url = await startHttpServer((_request, response) => {
        writeJson(response, 200, [
          { inbound_event_id: ids.inboundEvent, event_status: status, attempt_count: 1 },
        ]);
      });

      await expect(
        createClient(url).failWhatsAppMessage({
          inboundEventId: ids.inboundEvent,
          leaseToken: ids.eventLease,
          errorCode: "dependency_unavailable",
          retryable: status === "retryable",
          retryDelaySeconds: 5,
          maxAttempts: 8,
        }),
      ).resolves.toMatchObject({ status });
    },
  );

  it("omits an absent WhatsApp event trace instead of materializing an undefined field", async () => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, [validEventClaimRow({ trace_id: null })]);
    });

    const claim = await createClient(url).claimWhatsAppMessage({
      workerId: "worker-no-event-trace",
      leaseSeconds: 120,
      maxAttempts: 8,
    });

    expect(claim).not.toHaveProperty("traceId");
  });

  it("rejects invalid counters, timestamps, enums and booleans independently", async () => {
    const responses = [
      [
        {
          ...ids,
          delivery_id: ids.delivery,
          delivery_status: "routed",
          inserted_event_count: -1,
          replayed_event_count: 0,
          ignored_change_count: 0,
        },
      ],
      [
        {
          inbound_event_id: ids.inboundEvent,
          organization_id: ids.organization,
          channel_connection_id: ids.connection,
          attempt_number: 1,
          lease_token: ids.eventLease,
          lease_expires_at: "not-a-date",
          correlation_id: "request",
        },
      ],
      [
        {
          inbound_event_id: ids.inboundEvent,
          channel_identity_id: ids.identity,
          conversation_id: ids.conversation,
          message_id: ids.message,
          content_kind: "unknown",
          was_replayed: false,
          principal_type: "contact",
        },
      ],
      [
        {
          inbound_event_id: ids.inboundEvent,
          channel_identity_id: ids.identity,
          conversation_id: ids.conversation,
          message_id: ids.message,
          content_kind: "text",
          was_replayed: "false",
          principal_type: "contact",
        },
      ],
    ];
    let index = 0;
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, responses[index]);
      index += 1;
    });
    const client = createClient(url);

    await expect(
      client.routeWhatsAppDelivery({ deliveryId: ids.delivery, leaseToken: ids.deliveryLease }),
    ).rejects.toMatchObject({ kind: "dependency" });
    await expect(
      client.claimWhatsAppMessage({ workerId: "worker", leaseSeconds: 120, maxAttempts: 8 }),
    ).rejects.toMatchObject({ kind: "dependency" });
    await expect(
      client.normalizeWhatsAppMessage({
        inboundEventId: ids.inboundEvent,
        leaseToken: ids.eventLease,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
    await expect(
      client.normalizeWhatsAppMessage({
        inboundEventId: ids.inboundEvent,
        leaseToken: ids.eventLease,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects oversized and invalid UTF-8 dependency responses", async () => {
    let requestCount = 0;
    const url = await startHttpServer((_request, response) => {
      requestCount += 1;
      if (requestCount === 1) {
        response.writeHead(200, { "content-length": 65_537, "content-type": "application/json" });
        response.end("x");
        return;
      }
      response.writeHead(200, { "content-length": 1, "content-type": "application/json" });
      response.end("{");
    });
    const client = createClient(url);
    const claimInput = {
      workerId: "worker-size",
      providerObjectType: "whatsapp_business_account",
      leaseSeconds: 120,
      maxAttempts: 8,
    };

    await expect(client.claimDelivery(claimInput)).rejects.toMatchObject({ kind: "dependency" });
    await expect(client.claimDelivery(claimInput)).rejects.toMatchObject({ kind: "dependency" });
  });

  it("accepts exactly 64 KiB and rejects an oversized chunked response", async () => {
    let requestCount = 0;
    const boundedBody = `[]${" ".repeat(65_534)}`;
    const url = await startHttpServer((_request, response) => {
      requestCount += 1;
      if (requestCount === 1) {
        response.writeHead(200, {
          "content-length": Buffer.byteLength(boundedBody),
          "content-type": "application/json",
        });
        response.end(boundedBody);
        return;
      }
      response.writeHead(200, { "content-type": "application/json" });
      response.write(`[]${" ".repeat(65_535)}`);
      response.end();
    });
    const client = createClient(url);

    await expect(client.claimDelivery(deliveryClaimInput)).resolves.toBeUndefined();
    await expect(client.claimDelivery(deliveryClaimInput)).rejects.toMatchObject({
      kind: "dependency",
    });
  });

  it("strips an inherited path, query and fragment before calling the RPC boundary", async () => {
    let observedUrl: string | undefined;
    const url = await startHttpServer((request, response) => {
      observedUrl = request.url;
      writeJson(response, 200, []);
    });

    await createClient(`${url}/legacy/path?organization=foreign#private`).claimDelivery(
      deliveryClaimInput,
    );

    expect(observedUrl).toBe("/rest/v1/rpc/claim_meta_webhook_delivery");
  });

  it("distinguishes an external shutdown cancellation from a transport timeout", async () => {
    const url = await startHttpServer((_request, response) => {
      setTimeout(() => {
        writeJson(response, 200, []);
      }, 100);
    });
    const controller = new AbortController();
    const cancelled = createClient(url, 1_000).claimDelivery({
      workerId: "worker-cancel",
      providerObjectType: "whatsapp_business_account",
      leaseSeconds: 120,
      maxAttempts: 8,
      signal: controller.signal,
    });
    controller.abort();

    await expect(cancelled).rejects.toMatchObject({ kind: "cancelled" });
    await expect(
      createClient(url, 10).claimDelivery({
        workerId: "worker-timeout",
        providerObjectType: "whatsapp_business_account",
        leaseSeconds: 120,
        maxAttempts: 8,
      }),
    ).rejects.toMatchObject({ kind: "timeout" });
  });

  it("classifies a real connection refusal as a dependency failure", async () => {
    const url = await startHttpServer((_request, response) => {
      writeJson(response, 200, []);
    });
    const server = servers.pop();
    if (server === undefined) {
      throw new TypeError("Expected the contract server to exist");
    }
    await closeServer(server);

    await expect(createClient(url).claimDelivery(deliveryClaimInput)).rejects.toMatchObject({
      kind: "dependency",
    });
  });
});
