import { Buffer } from "node:buffer";
import { getEventListeners } from "node:events";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";
import { Writable } from "node:stream";

import { SensitiveValue } from "@agentefer/config";
import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { afterEach, describe, expect, it } from "vitest";

import {
  classifyMetaInboundFailure,
  createMetaInboundProcessor,
  waitForPollInterval,
} from "../src/meta-inbound-processor.js";
import { createMetaInboundRpcClient, MetaInboundRpcError } from "../src/meta-inbound-rpc.js";

const servers: Server[] = [];
const metricProviders: MeterProvider[] = [];
const testSecret = ["sb", "secret", "processor", "contract", "test"].join("_");

type RequestRecord = Readonly<{
  path: string;
  body: Record<string, unknown>;
}>;

type RequestHandler = (
  request: IncomingMessage,
  response: ServerResponse,
  body: Record<string, unknown>,
) => void;

class JsonLineDestination extends Writable {
  public readonly records: Record<string, unknown>[] = [];

  public override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.records.push(JSON.parse(chunk.toString("utf8")) as Record<string, unknown>);
    callback();
  }
}

const createTelemetry = () => {
  const destination = new JsonLineDestination();
  const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 60_000,
  });
  const provider = new MeterProvider({ readers: [reader] });
  metricProviders.push(provider);

  return Object.freeze({
    destination,
    exporter,
    provider,
    logger: createStructuredLogger({
      component: "worker-processor-test",
      environment: "test",
      level: "debug",
      destination,
    }),
    metrics: createOperationalMetrics({
      component: "worker-processor-test",
      meter: provider.getMeter("worker-processor-contract"),
    }),
  });
};

const readBody = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
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

const startServer = async (
  handler: RequestHandler,
): Promise<Readonly<{ url: string; requests: RequestRecord[] }>> => {
  const requests: RequestRecord[] = [];
  const server = createServer();
  servers.push(server);
  server.on("request", (request, response) => {
    void readBody(request)
      .then((body) => {
        const path = request.url ?? "";
        requests.push(Object.freeze({ path, body }));
        handler(request, response, body);
      })
      .catch(() => response.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  return Object.freeze({ url: `http://127.0.0.1:${String(address.port)}`, requests });
};

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(payload),
    "content-type": "application/json",
  });
  response.end(payload);
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

const ids = Object.freeze({
  delivery: "b4032000-0000-4000-8000-000000000201",
  organization: "b4032000-0000-4000-8000-000000000202",
  application: "b4032000-0000-4000-8000-000000000203",
  deliveryLease: "b4032000-0000-4000-8000-000000000204",
  inboundEvent: "b4032000-0000-4000-8000-000000000205",
  connection: "b4032000-0000-4000-8000-000000000206",
  eventLease: "b4032000-0000-4000-8000-000000000207",
  identity: "b4032000-0000-4000-8000-000000000208",
  conversation: "b4032000-0000-4000-8000-000000000209",
  message: "b4032000-0000-4000-8000-000000000210",
});

const deliveryClaimRow = (deliveryId: string = ids.delivery) => ({
  delivery_id: deliveryId,
  organization_id: ids.organization,
  meta_application_id: ids.application,
  provider_object_type: "whatsapp_business_account",
  attempt_number: 1,
  lease_token: ids.deliveryLease,
  lease_expires_at: "2026-08-26T16:00:00.000Z",
  correlation_id: "processor-delivery",
  trace_id: "processor-delivery-trace",
});

const eventClaimRow = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  inbound_event_id: ids.inboundEvent,
  organization_id: ids.organization,
  channel_connection_id: ids.connection,
  attempt_number: 1,
  lease_token: ids.eventLease,
  lease_expires_at: "2026-08-26T16:00:00.000Z",
  correlation_id: "processor-event",
  trace_id: null,
  ...overrides,
});

const createProcessor = (
  url: string,
  operationalStates: boolean[],
  batchSize = 25,
  telemetry = createTelemetry(),
  pollIntervalMilliseconds = 60_000,
  rpcTimeoutMilliseconds = 1_000,
) =>
  createMetaInboundProcessor({
    configuration: {
      workerId: "worker-processor-contract",
      pollIntervalMilliseconds,
      leaseSeconds: 120,
      maxAttempts: 8,
      retryDelaySeconds: 5,
      batchSize,
    },
    rpcClient: createMetaInboundRpcClient({
      supabaseUrl: url,
      secretKey: new SensitiveValue(testSecret),
      timeoutMilliseconds: rpcTimeoutMilliseconds,
    }),
    logger: telemetry.logger,
    metrics: telemetry.metrics,
    onOperationalStateChange(operational) {
      operationalStates.push(operational);
    },
  });

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
  await Promise.all(metricProviders.splice(0).map((provider) => provider.shutdown()));
});

describe("durable Meta inbound worker cycle", () => {
  it.each([
    ["invalid", "invalid_contract", false, true],
    ["timeout", "dependency_timeout", true, true],
    ["dependency", "dependency_unavailable", true, true],
    ["rejected", "worker_authority_unavailable", true, false],
    ["cancelled", "worker_authority_unavailable", true, false],
  ] as const)(
    "classifies %s RPC failures with an exact safe disposition",
    (kind, errorCode, retryable, settleLease) => {
      expect(classifyMetaInboundFailure(new MetaInboundRpcError(kind), "invalid_contract")).toEqual(
        { errorCode, retryable, settleLease },
      );
    },
  );

  it("classifies an unexpected worker exception without exposing its message", () => {
    expect(
      classifyMetaInboundFailure(new Error("private unexpected diagnostic"), "invalid_contract"),
    ).toEqual({
      errorCode: "worker_internal_failure",
      retryable: true,
      settleLease: true,
    });
  });

  it("removes its abort listener after an ordinary poll interval", async () => {
    const controller = new AbortController();

    await expect(waitForPollInterval(1, controller.signal)).resolves.toBe(true);

    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("does not register a listener when polling starts after shutdown", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(waitForPollInterval(60_000, controller.signal)).resolves.toBe(false);

    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("cancels a pending poll interval and removes its listener during shutdown", async () => {
    const controller = new AbortController();
    const polling = waitForPollInterval(60_000, controller.signal);
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(1);

    controller.abort();
    await expect(polling).resolves.toBe(false);

    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("drains an authenticated delivery and its routed WhatsApp message in one cycle", async () => {
    let deliveryClaims = 0;
    let messageClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        deliveryClaims += 1;
        writeJson(response, 200, deliveryClaims === 1 ? [deliveryClaimRow()] : []);
      } else if (path.endsWith("route_meta_whatsapp_delivery")) {
        writeJson(response, 200, [
          {
            delivery_id: ids.delivery,
            delivery_status: "routed",
            inserted_event_count: 1,
            replayed_event_count: 0,
            ignored_change_count: 0,
          },
        ]);
      } else if (path.endsWith("claim_meta_whatsapp_message_event")) {
        messageClaims += 1;
        writeJson(response, 200, messageClaims === 1 ? [eventClaimRow()] : []);
      } else {
        writeJson(response, 200, [
          {
            inbound_event_id: ids.inboundEvent,
            channel_identity_id: ids.identity,
            conversation_id: ids.conversation,
            message_id: ids.message,
            content_kind: "text",
            was_replayed: false,
            principal_type: "contact",
          },
        ]);
      }
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);
    const processorStartedAt = performance.now();

    await expect(processor.start()).resolves.toBe(true);
    await processor.stop();
    const processorElapsedMilliseconds = performance.now() - processorStartedAt;

    expect(server.requests.map((request) => request.path)).toEqual([
      "/rest/v1/rpc/claim_meta_webhook_delivery",
      "/rest/v1/rpc/route_meta_whatsapp_delivery",
      "/rest/v1/rpc/claim_meta_webhook_delivery",
      "/rest/v1/rpc/claim_meta_whatsapp_message_event",
      "/rest/v1/rpc/normalize_meta_whatsapp_message",
      "/rest/v1/rpc/claim_meta_whatsapp_message_event",
    ]);
    expect(states[0]).toBe(true);
    expect(server.requests.map((request) => request.body)).toEqual([
      {
        target_worker_id: "worker-processor-contract",
        target_provider_object_type: "whatsapp_business_account",
        target_lease_seconds: 120,
        target_max_attempts: 8,
      },
      { target_delivery_id: ids.delivery, target_lease_token: ids.deliveryLease },
      {
        target_worker_id: "worker-processor-contract",
        target_provider_object_type: "whatsapp_business_account",
        target_lease_seconds: 120,
        target_max_attempts: 8,
      },
      {
        target_worker_id: "worker-processor-contract",
        target_lease_seconds: 120,
        target_max_attempts: 8,
      },
      { target_inbound_event_id: ids.inboundEvent, target_lease_token: ids.eventLease },
      {
        target_worker_id: "worker-processor-contract",
        target_lease_seconds: 120,
        target_max_attempts: 8,
      },
    ]);
    expect(
      telemetry.destination.records.map((record) => ({
        event: record.event,
        outcome: record.outcome,
        attributes: record.attributes,
      })),
    ).toEqual([
      {
        event: "worker.meta.delivery.routed",
        outcome: "succeeded",
        attributes: {
          delivery_id: ids.delivery,
          delivery_status: "routed",
          inserted_event_count: 1,
          replayed_event_count: 0,
          ignored_change_count: 0,
        },
      },
      {
        event: "worker.meta.whatsapp.message.normalized",
        outcome: "succeeded",
        attributes: {
          inbound_event_id: ids.inboundEvent,
          channel_identity_id: ids.identity,
          conversation_id: ids.conversation,
          domain_record_id: ids.message,
          inbound_kind: "text",
          principal_type: "contact",
          was_replayed: false,
        },
      },
      {
        event: "worker.meta.inbound.cycle_completed",
        outcome: "succeeded",
        attributes: { delivery_count: 1, normalized_event_count: 1 },
      },
    ]);

    await telemetry.provider.forceFlush();
    const metricData = telemetry.exporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics);
    const completed = metricData.find(
      (metric) => metric.descriptor.name === "agentefer.operation.completed",
    );
    expect(completed?.dataPointType).toBe(DataPointType.SUM);
    if (completed?.dataPointType !== DataPointType.SUM) {
      throw new TypeError("Processor completed metric must use sum aggregation");
    }
    expect(
      completed.dataPoints.map((point) => ({
        operation: point.attributes["operation.name"],
        outcome: point.attributes["operation.outcome"],
        value: point.value,
      })),
    ).toEqual(
      expect.arrayContaining([
        { operation: "meta.delivery.claim", outcome: "succeeded", value: 2 },
        { operation: "meta.delivery.route", outcome: "succeeded", value: 1 },
        { operation: "meta.whatsapp.message.claim", outcome: "succeeded", value: 2 },
        { operation: "meta.whatsapp.message.normalize", outcome: "succeeded", value: 1 },
        { operation: "meta.inbound.cycle", outcome: "succeeded", value: 1 },
      ]),
    );
    const duration = metricData.find(
      (metric) => metric.descriptor.name === "agentefer.operation.duration",
    );
    expect(duration?.dataPointType).toBe(DataPointType.HISTOGRAM);
    if (duration?.dataPointType !== DataPointType.HISTOGRAM) {
      throw new TypeError("Processor duration metric must use histogram aggregation");
    }
    expect(
      duration.dataPoints.every(
        (point) =>
          point.value.count > 0 &&
          (point.value.sum ?? 0) > 0 &&
          (point.value.max ?? Number.POSITIVE_INFINITY) <= processorElapsedMilliseconds + 10,
      ),
      JSON.stringify(duration.dataPoints),
    ).toBe(true);
  });

  it("dead-letters an invalid delivery and keeps the cycle operational", async () => {
    let deliveryClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        deliveryClaims += 1;
        writeJson(response, 200, deliveryClaims === 1 ? [deliveryClaimRow()] : []);
      } else if (path.endsWith("route_meta_whatsapp_delivery")) {
        writeJson(response, 400, { message: "sensitive invalid payload detail" });
      } else if (path.endsWith("fail_meta_webhook_delivery")) {
        writeJson(response, 200, [
          { delivery_id: ids.delivery, delivery_status: "dead_letter", attempt_count: 1 },
        ]);
      } else {
        writeJson(response, 200, []);
      }
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);

    await expect(processor.start()).resolves.toBe(true);
    await processor.stop();

    const failure = server.requests.find((request) =>
      request.path.endsWith("fail_meta_webhook_delivery"),
    );
    expect(failure?.body).toMatchObject({
      target_error_code: "invalid_whatsapp_delivery",
      target_retryable: false,
    });
    expect(JSON.stringify(failure)).not.toContain("sensitive invalid payload detail");
    expect(telemetry.destination.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "worker.meta.delivery.route_failed",
          outcome: "failed",
          error_code: "META_INBOUND_RPC_INVALID",
          error_category: "validation",
          attributes: { delivery_id: ids.delivery, attempt_number: 1 },
        }),
      ]),
    );
    await telemetry.provider.forceFlush();
    const failedRoute = telemetry.exporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .find((metric) => metric.descriptor.name === "agentefer.operation.completed");
    expect(failedRoute?.dataPointType).toBe(DataPointType.SUM);
    if (failedRoute?.dataPointType !== DataPointType.SUM) {
      throw new TypeError("Processor failure metric must use sum aggregation");
    }
    expect(
      failedRoute.dataPoints.map((point) => ({
        operation: point.attributes["operation.name"],
        outcome: point.attributes["operation.outcome"],
        errorCategory: point.attributes["error.category"],
        value: point.value,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          operation: "meta.delivery.route",
          outcome: "failed",
          errorCategory: "validation",
          value: 1,
        },
      ]),
    );
  });

  it("schedules retry and degrades readiness after a dependency routing failure", async () => {
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, [deliveryClaimRow()]);
      } else if (path.endsWith("route_meta_whatsapp_delivery")) {
        writeJson(response, 503, { message: "database temporarily unavailable" });
      } else {
        writeJson(response, 200, [
          { delivery_id: ids.delivery, delivery_status: "retryable", attempt_count: 1 },
        ]);
      }
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    expect(server.requests.at(-1)?.body).toMatchObject({
      target_error_code: "dependency_unavailable",
      target_retryable: true,
      target_retry_delay_seconds: 5,
    });
    expect(states[0]).toBe(false);
    expect(telemetry.destination.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "worker.meta.delivery.route_failed",
          outcome: "failed",
          error_code: "META_INBOUND_RPC_DEPENDENCY",
          attributes: { delivery_id: ids.delivery, attempt_number: 1 },
        }),
        expect.objectContaining({
          event: "worker.meta.inbound.cycle_failed",
          outcome: "failed",
        }),
      ]),
    );
  });

  it("leaves a claimed lease untouched when Supabase rejects worker authority", async () => {
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, [deliveryClaimRow()]);
      } else {
        writeJson(response, 401, { message: "secret rejected" });
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    expect(server.requests).toHaveLength(2);
    expect(server.requests.some((request) => request.path.includes("fail_meta"))).toBe(false);
  });

  it("dead-letters a malformed message event and continues draining", async () => {
    let messageClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, []);
      } else if (path.endsWith("claim_meta_whatsapp_message_event")) {
        messageClaims += 1;
        writeJson(response, 200, messageClaims === 1 ? [eventClaimRow()] : []);
      } else if (path.endsWith("normalize_meta_whatsapp_message")) {
        writeJson(response, 422, { message: "private message evidence" });
      } else {
        writeJson(response, 200, [
          { inbound_event_id: ids.inboundEvent, event_status: "dead_letter", attempt_count: 1 },
        ]);
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states);

    await expect(processor.start()).resolves.toBe(true);
    await processor.stop();

    const failure = server.requests.find((request) =>
      request.path.endsWith("fail_meta_whatsapp_message_event"),
    );
    expect(failure?.body).toMatchObject({
      target_error_code: "invalid_whatsapp_message",
      target_retryable: false,
    });
  });

  it("schedules a retry when message normalization loses its dependency", async () => {
    let messageClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, []);
      } else if (path.endsWith("claim_meta_whatsapp_message_event")) {
        messageClaims += 1;
        writeJson(response, 200, messageClaims === 1 ? [eventClaimRow()] : []);
      } else if (path.endsWith("normalize_meta_whatsapp_message")) {
        writeJson(response, 503, { message: "private dependency detail" });
      } else {
        writeJson(response, 200, [
          { inbound_event_id: ids.inboundEvent, event_status: "retryable", attempt_count: 1 },
        ]);
      }
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    const failure = server.requests.find((request) =>
      request.path.endsWith("fail_meta_whatsapp_message_event"),
    );
    expect(failure?.body).toEqual({
      target_inbound_event_id: ids.inboundEvent,
      target_lease_token: ids.eventLease,
      target_error_code: "dependency_unavailable",
      target_retryable: true,
      target_retry_delay_seconds: 5,
      target_max_attempts: 8,
    });
    expect(states).toEqual([false]);
    expect(telemetry.destination.records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "worker.meta.whatsapp.message.normalize_failed",
          outcome: "failed",
          error_code: "META_INBOUND_RPC_DEPENDENCY",
          error_category: "dependency",
          attributes: {
            inbound_event_id: ids.inboundEvent,
            channel_connection_id: ids.connection,
            attempt_number: 1,
          },
        }),
      ]),
    );
    await telemetry.provider.forceFlush();
    const messageFailure = telemetry.exporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .find((metric) => metric.descriptor.name === "agentefer.operation.completed");
    expect(messageFailure?.dataPointType).toBe(DataPointType.SUM);
    if (messageFailure?.dataPointType !== DataPointType.SUM) {
      throw new TypeError("Processor failure metric must use sum aggregation");
    }
    expect(
      messageFailure.dataPoints.map((point) => ({
        operation: point.attributes["operation.name"],
        outcome: point.attributes["operation.outcome"],
        errorCategory: point.attributes["error.category"],
        value: point.value,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          operation: "meta.whatsapp.message.normalize",
          outcome: "failed",
          errorCategory: "dependency",
          value: 1,
        },
      ]),
    );
  });

  it("degrades readiness when the durable WhatsApp message claim dependency fails", async () => {
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, []);
      } else {
        writeJson(response, 503, { message: "private claim dependency detail" });
      }
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    expect(states).toEqual([false]);
    expect(server.requests.map((request) => request.path)).toEqual([
      "/rest/v1/rpc/claim_meta_webhook_delivery",
      "/rest/v1/rpc/claim_meta_whatsapp_message_event",
    ]);
    await telemetry.provider.forceFlush();
    const completed = telemetry.exporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .find((metric) => metric.descriptor.name === "agentefer.operation.completed");
    expect(completed?.dataPointType).toBe(DataPointType.SUM);
    if (completed?.dataPointType !== DataPointType.SUM) {
      throw new TypeError("Processor failure metric must use sum aggregation");
    }
    expect(
      completed.dataPoints.map((point) => ({
        operation: point.attributes["operation.name"],
        outcome: point.attributes["operation.outcome"],
        errorCategory: point.attributes["error.category"],
        value: point.value,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          operation: "meta.whatsapp.message.claim",
          outcome: "failed",
          errorCategory: "dependency",
          value: 1,
        },
      ]),
    );
  });

  it("leaves a message lease untouched when Supabase rejects worker authority", async () => {
    let messageClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, []);
      } else if (path.endsWith("claim_meta_whatsapp_message_event")) {
        messageClaims += 1;
        writeJson(response, 200, messageClaims === 1 ? [eventClaimRow()] : []);
      } else {
        writeJson(response, 401, { message: "secret rejected" });
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    expect(server.requests.some((request) => request.path.includes("fail_meta"))).toBe(false);
    expect(states).toEqual([false]);
  });

  it("classifies a real routing timeout and schedules the exact bounded retry", async () => {
    let deliveryClaims = 0;
    const server = await startServer((_request, response) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        deliveryClaims += 1;
        writeJson(response, 200, deliveryClaims === 1 ? [deliveryClaimRow()] : []);
      } else if (path.endsWith("route_meta_whatsapp_delivery")) {
        return;
      } else {
        writeJson(response, 200, [
          { delivery_id: ids.delivery, delivery_status: "retryable", attempt_count: 1 },
        ]);
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states, 25, createTelemetry(), 60_000, 10);

    await expect(processor.start()).resolves.toBe(false);
    await processor.stop();

    expect(server.requests.at(-1)?.body).toMatchObject({
      target_error_code: "dependency_timeout",
      target_retryable: true,
    });
  });

  it("enforces the message batch boundary without an extra claim", async () => {
    let messageClaims = 0;
    const server = await startServer((_request, response, body) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        writeJson(response, 200, []);
      } else if (path.endsWith("claim_meta_whatsapp_message_event")) {
        messageClaims += 1;
        writeJson(response, 200, [
          eventClaimRow({
            inbound_event_id: `b4032000-0000-4000-8000-${String(messageClaims).padStart(12, "0")}`,
          }),
        ]);
      } else {
        writeJson(response, 200, [
          {
            inbound_event_id: body.target_inbound_event_id,
            channel_identity_id: ids.identity,
            conversation_id: ids.conversation,
            message_id: ids.message,
            content_kind: "text",
            was_replayed: false,
            principal_type: "contact",
          },
        ]);
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states, 2);

    await expect(processor.start()).resolves.toBe(true);
    await processor.stop();

    expect(
      server.requests.filter((request) =>
        request.path.endsWith("claim_meta_whatsapp_message_event"),
      ),
    ).toHaveLength(2);
    expect(
      server.requests.filter((request) => request.path.endsWith("normalize_meta_whatsapp_message")),
    ).toHaveLength(2);
  });

  it("runs non-overlapping poll cycles and stops future cycles deterministically", async () => {
    const server = await startServer((_request, response) => {
      writeJson(response, 200, []);
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry, 5);

    await expect(processor.start()).resolves.toBe(true);
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new TypeError("A second poll cycle was not observed"));
      }, 1_000);
      const check = setInterval(() => {
        if (states.length >= 2) {
          clearInterval(check);
          clearTimeout(timeout);
          resolve();
        }
      }, 1);
    });
    await processor.stop();
    const stateCountAfterStop = states.length;
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(states.every((state) => state)).toBe(true);
    expect(states.length).toBe(stateCountAfterStop);
    expect(
      telemetry.destination.records.filter(
        (record) => record.event === "worker.meta.inbound.cycle_completed",
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("enforces the configured batch boundary without overlapping extra claims", async () => {
    let claimCount = 0;
    const server = await startServer((_request, response, body) => {
      const path = server.requests.at(-1)?.path ?? "";
      if (path.endsWith("claim_meta_webhook_delivery")) {
        claimCount += 1;
        const suffix = String(claimCount).padStart(3, "0");
        writeJson(response, 200, [deliveryClaimRow(`b4032000-0000-4000-8000-000000000${suffix}`)]);
      } else if (path.endsWith("route_meta_whatsapp_delivery")) {
        writeJson(response, 200, [
          {
            delivery_id: body.target_delivery_id,
            delivery_status: "ignored",
            inserted_event_count: 0,
            replayed_event_count: 0,
            ignored_change_count: 1,
          },
        ]);
      } else {
        writeJson(response, 200, []);
      }
    });
    const states: boolean[] = [];
    const processor = createProcessor(server.url, states, 2);

    await expect(processor.start()).resolves.toBe(true);
    await processor.stop();

    expect(
      server.requests.filter((request) => request.path.endsWith("claim_meta_webhook_delivery")),
    ).toHaveLength(2);
    expect(
      server.requests.filter((request) => request.path.endsWith("route_meta_whatsapp_delivery")),
    ).toHaveLength(2);
  });

  it("aborts a pending real HTTP claim during shutdown and forbids a second start", async () => {
    let releaseRequest: (() => void) | undefined;
    const requestObserved = new Promise<void>((resolve) => {
      releaseRequest = resolve;
    });
    const server = await startServer(() => {
      releaseRequest?.();
    });
    const states: boolean[] = [];
    const telemetry = createTelemetry();
    const processor = createProcessor(server.url, states, 25, telemetry);

    const startPromise = processor.start();
    await requestObserved;
    await processor.stop();
    await expect(startPromise).resolves.toBe(false);
    await expect(processor.start()).rejects.toThrow("cannot be started twice");
    await telemetry.provider.forceFlush();
    const cancelledCycle = telemetry.exporter
      .getMetrics()
      .flatMap((resource) => resource.scopeMetrics)
      .flatMap((scope) => scope.metrics)
      .find((metric) => metric.descriptor.name === "agentefer.operation.completed");
    expect(cancelledCycle?.dataPointType).toBe(DataPointType.SUM);
    if (cancelledCycle?.dataPointType !== DataPointType.SUM) {
      throw new TypeError("Processor cancellation metric must use sum aggregation");
    }
    expect(
      cancelledCycle.dataPoints.map((point) => ({
        operation: point.attributes["operation.name"],
        outcome: point.attributes["operation.outcome"],
        errorCategory: point.attributes["error.category"],
        value: point.value,
      })),
    ).toEqual(
      expect.arrayContaining([
        {
          operation: "meta.delivery.claim",
          outcome: "failed",
          errorCategory: "internal",
          value: 1,
        },
        {
          operation: "meta.inbound.cycle",
          outcome: "cancelled",
          errorCategory: undefined,
          value: 1,
        },
      ]),
    );
  });
});
