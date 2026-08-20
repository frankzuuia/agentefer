import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";
import { PassThrough } from "node:stream";

import { SensitiveValue } from "@agentefer/config";
import {
  createOperationalMetrics,
  createReadinessState,
  createStructuredLogger,
  type OperationalMetrics,
} from "@agentefer/observability";
import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { buildApi } from "../src/app.js";
import {
  classifyMetaWebhookFailure,
  classifyMetaWebhookParserFailure,
  readFastifyErrorCode,
  responseForMetaWebhookFailure,
} from "../src/meta-webhook-routes.js";
import { createMetaWebhookRpcClient } from "../src/meta-webhook-rpc.js";
import { buildApiTestInput } from "./support.js";

const applications: FastifyInstance[] = [];
const dependencyServers: Server[] = [];
const metricProviders: MeterProvider[] = [];
const rpcSecret = ["sb", "secret", "routes", "contract", "test"].join("_");

type CapturedRequest = Readonly<{
  url: string;
  body: Readonly<Record<string, unknown>>;
}>;

const readJsonBody = async (
  request: IncomingMessage,
): Promise<Readonly<Record<string, unknown>>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected an UTF-8 RPC body");
    }
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
};

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(payload),
    "content-type": "application/json",
  });
  response.end(payload);
};

const startDependencyServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void>,
): Promise<string> => {
  const server = createServer();
  dependencyServers.push(server);
  server.on("request", (request, response) => {
    void handler(request, response).catch(() => response.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(address.port)}`;
};

const startApi = async (
  dependencyUrl: string,
  maximumBodyBytes: number,
  logDestination?: PassThrough,
  operationalMetrics?: OperationalMetrics,
): Promise<string> => {
  const readiness = createReadinessState();
  const application = buildApi({
    ...buildApiTestInput(readiness),
    logger: createStructuredLogger({
      component: "api",
      environment: "test",
      level: logDestination === undefined ? "fatal" : "info",
      ...(logDestination === undefined ? {} : { destination: logDestination }),
    }),
    metrics: operationalMetrics ?? createOperationalMetrics({ component: "api-routes-test" }),
    metaWebhookRpcClient: createMetaWebhookRpcClient({
      supabaseUrl: dependencyUrl,
      secretKey: new SensitiveValue(rpcSecret),
      timeoutMilliseconds: 100,
    }),
    metaWebhookMaximumBodyBytes: maximumBodyBytes,
  });
  applications.push(application);
  application.post("/test/json-parser-boundary", (request, reply) => {
    reply.send(request.body);
  });
  await application.listen({ host: "127.0.0.1", port: 0 });
  readiness.markReady();
  const address = application.server.address() as AddressInfo;
  return `http://127.0.0.1:${String(address.port)}`;
};

const createMetricsHarness = () => {
  const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
  const reader = new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 60_000,
  });
  const provider = new MeterProvider({ readers: [reader] });
  metricProviders.push(provider);
  return Object.freeze({
    exporter,
    provider,
    metrics: createOperationalMetrics({
      component: "meta-webhook-routes-test",
      meter: provider.getMeter("meta-webhook-routes-integration"),
    }),
  });
};

const readCompletedAndDurationMetrics = async (
  harness: ReturnType<typeof createMetricsHarness>,
) => {
  await harness.provider.forceFlush();
  const metricData = harness.exporter
    .getMetrics()
    .flatMap((resource) => resource.scopeMetrics)
    .flatMap((scope) => scope.metrics);
  const completed = metricData.find(
    (metric) => metric.descriptor.name === "agentefer.operation.completed",
  );
  const duration = metricData.find(
    (metric) => metric.descriptor.name === "agentefer.operation.duration",
  );

  expect(completed?.dataPointType).toBe(DataPointType.SUM);
  expect(duration?.dataPointType).toBe(DataPointType.HISTOGRAM);
  if (
    completed?.dataPointType !== DataPointType.SUM ||
    duration?.dataPointType !== DataPointType.HISTOGRAM
  ) {
    throw new TypeError("Expected sum and histogram webhook metrics");
  }
  for (const point of duration.dataPoints) {
    const sum = point.value.sum;
    if (sum === undefined) {
      throw new TypeError("Webhook duration histogram did not expose its sum");
    }
    expect(point.value.count).toBeGreaterThan(0);
    expect(sum).toBeGreaterThanOrEqual(0);
    expect(sum / point.value.count).toBeLessThan(1_000);
  }

  return Object.freeze({ completed, duration });
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

afterEach(async () => {
  await Promise.all(applications.splice(0).map(async (application) => application.close()));
  await Promise.all(dependencyServers.splice(0).map(closeServer));
  await Promise.all(metricProviders.splice(0).map(async (provider) => provider.shutdown()));
});

describe("Meta webhook routes over real TCP", () => {
  it("returns the exact challenge and acknowledges a durably accepted raw delivery", async () => {
    const metricsHarness = createMetricsHarness();
    const captured: CapturedRequest[] = [];
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      captured.push({ url: request.url ?? "", body: await readJsonBody(request) });
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
          provider_object_type: "whatsapp_business_account",
          replayed: false,
          delivery_count: 1,
          delivery_status: "received",
        },
      ]);
    });
    const logDestination = new PassThrough();
    logDestination.setEncoding("utf8");
    let logs = "";
    logDestination.on("data", (chunk: string) => {
      logs += chunk;
    });
    const apiUrl = await startApi(dependencyUrl, 1_048_576, logDestination, metricsHarness.metrics);
    const endpointKey = "b4021000-0000-4000-8000-000000000003";
    const challengeResponse = await fetch(
      `${apiUrl}/webhooks/meta/${endpointKey}?hub.mode=subscribe&hub.verify_token=exact-verify-token-value&hub.challenge=0012345`,
    );
    const rawBody = Buffer.from(
      '{"object":"whatsapp_business_account","entry":[{"id":"private-webhook-body-marker"}]}',
    );
    const signature = "a1".repeat(32);
    const deliveryResponse = await fetch(`${apiUrl}/webhooks/meta/${endpointKey}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${signature}`,
      },
      body: rawBody,
    });

    expect(challengeResponse.status).toBe(200);
    expect(await challengeResponse.text()).toBe("0012345");
    expect(challengeResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(challengeResponse.headers.get("cache-control")).toBe("no-store");
    expect(challengeResponse.headers.get("x-content-type-options")).toBe("nosniff");
    expect(deliveryResponse.status).toBe(200);
    expect(await deliveryResponse.text()).toBe("EVENT_RECEIVED");
    expect(deliveryResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(deliveryResponse.headers.get("cache-control")).toBe("no-store");
    expect(captured).toHaveLength(2);
    expect(captured[0]?.body.target_verify_token).toBe("exact-verify-token-value");
    expect(captured[1]?.body.target_raw_body_base64).toBe(rawBody.toString("base64"));
    expect(captured[1]?.body.target_signature_hex).toBe(signature);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(logs).toContain("meta.webhook.challenge.accepted");
    expect(logs).toContain("meta.webhook.delivery.accepted");
    expect(logs).not.toContain("private-webhook-body-marker");
    expect(logs).not.toContain(signature);
    expect(logs).not.toContain("exact-verify-token-value");
    expect(logs).not.toContain(rpcSecret);
    const logRecords = logs
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
    expect(logRecords).toContainEqual(
      expect.objectContaining({
        event: "meta.webhook.challenge.accepted",
        outcome: "succeeded",
        attributes: {
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          credential_version_id: "[REDACTED]",
        },
      }),
    );
    expect(logRecords).toContainEqual(
      expect.objectContaining({
        event: "meta.webhook.delivery.accepted",
        outcome: "succeeded",
        attributes: {
          organization_id: "b4021000-0000-4000-8000-000000000001",
          meta_application_id: "b4021000-0000-4000-8000-000000000002",
          webhook_endpoint_id: "b4021000-0000-4000-8000-000000000003",
          credential_version_id: "[REDACTED]",
          delivery_id: "b4021000-0000-4000-8000-000000000005",
          provider_object_type: "whatsapp_business_account",
          replayed: false,
          delivery_count: 1,
          delivery_status: "received",
        },
      }),
    );
    const { completed, duration } = await readCompletedAndDurationMetrics(metricsHarness);
    expect(completed.dataPoints).toHaveLength(2);
    expect(completed.dataPoints.map((point) => point.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "operation.name": "meta.webhook.challenge",
          "operation.outcome": "succeeded",
        }),
        expect.objectContaining({
          "operation.name": "meta.webhook.delivery",
          "operation.outcome": "succeeded",
        }),
      ]),
    );
    expect(duration.dataPoints).toHaveLength(2);
  });

  it("rejects malformed requests locally without contacting Supabase", async () => {
    const metricsHarness = createMetricsHarness();
    const logDestination = new PassThrough();
    logDestination.setEncoding("utf8");
    let logs = "";
    logDestination.on("data", (chunk: string) => {
      logs += chunk;
    });
    let requestCount = 0;
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      requestCount += 1;
      await readJsonBody(request);
      writeJson(response, 500, {});
    });
    const apiUrl = await startApi(dependencyUrl, 256, logDestination, metricsHarness.metrics);
    const endpointKey = "b4021000-0000-4000-8000-000000000003";

    const malformedEndpoint = await fetch(
      `${apiUrl}/webhooks/meta/not-a-uuid?hub.mode=subscribe&hub.verify_token=exact-verify-token-value&hub.challenge=1`,
    );
    const malformedChallenge = await fetch(
      `${apiUrl}/webhooks/meta/${endpointKey}?hub.mode=unsubscribe&hub.verify_token=exact-verify-token-value&hub.challenge=1`,
    );
    const missingSignature = await fetch(`${apiUrl}/webhooks/meta/${endpointKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    const malformedSignature = await fetch(`${apiUrl}/webhooks/meta/${endpointKey}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": "sha256=not-hex",
      },
      body: "{}",
    });
    const nonJsonBody = await fetch(`${apiUrl}/webhooks/meta/${endpointKey}`, {
      method: "POST",
      headers: {
        "content-type": "text/plain",
        "x-hub-signature-256": `sha256=${"a1".repeat(32)}`,
      },
      body: "plain text is never a raw JSON buffer",
    });
    const unsupportedMediaType = await fetch(`${apiUrl}/webhooks/meta/${endpointKey}`, {
      method: "POST",
      headers: {
        "content-type": "application/xml",
        "x-hub-signature-256": `sha256=${"a1".repeat(32)}`,
      },
      body: "<entry />",
    });

    expect(malformedEndpoint.status).toBe(404);
    expect(malformedChallenge.status).toBe(400);
    expect(missingSignature.status).toBe(401);
    expect(malformedSignature.status).toBe(401);
    expect(nonJsonBody.status).toBe(400);
    expect(unsupportedMediaType.status).toBe(415);
    expect(requestCount).toBe(0);
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(logs).toContain('"error_severity":"warning"');
    expect(logs).toContain('"error_category":"validation"');
    expect(logs).toContain('"error_category":"authentication"');
    const { completed, duration } = await readCompletedAndDurationMetrics(metricsHarness);
    expect(completed.dataPoints.map((point) => point.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          "operation.name": "meta.webhook.challenge",
          "operation.outcome": "failed",
        }),
        expect.objectContaining({
          "operation.name": "meta.webhook.delivery",
          "operation.outcome": "failed",
        }),
      ]),
    );
    expect(duration.dataPoints.length).toBeGreaterThanOrEqual(2);
  });

  it("enforces the configured body boundary before RPC invocation", async () => {
    let requestCount = 0;
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      requestCount += 1;
      await readJsonBody(request);
      writeJson(response, 500, {});
    });
    const apiUrl = await startApi(dependencyUrl, 128);
    const response = await fetch(`${apiUrl}/webhooks/meta/b4021000-0000-4000-8000-000000000003`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${"a1".repeat(32)}`,
      },
      body: JSON.stringify({ object: "page", entry: [{ value: "x".repeat(256) }] }),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ status: "invalid" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(requestCount).toBe(0);
  });

  it.each([
    [400, 400, null],
    [403, 403, null],
    [500, 503, "1"],
  ] as const)(
    "maps a PostgREST %i failure to safe HTTP %i semantics",
    async (dependencyStatus, expectedStatus, retryAfter) => {
      const dependencyUrl = await startDependencyServer(async (request, response) => {
        await readJsonBody(request);
        writeJson(response, dependencyStatus, { message: "private-database-diagnostic" });
      });
      const logDestination = new PassThrough();
      logDestination.setEncoding("utf8");
      let logs = "";
      logDestination.on("data", (chunk: string) => {
        logs += chunk;
      });
      const apiUrl = await startApi(dependencyUrl, 1_024, logDestination);
      const response = await fetch(`${apiUrl}/webhooks/meta/b4021000-0000-4000-8000-000000000003`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": `sha256=${"a1".repeat(32)}`,
        },
        body: '{"object":"page","entry":[{}]}',
      });

      expect(response.status).toBe(expectedStatus);
      expect(response.headers.get("retry-after")).toBe(retryAfter);
      expect(await response.json()).toEqual({
        status:
          expectedStatus === 503 ? "unavailable" : expectedStatus === 400 ? "invalid" : "rejected",
      });
      await new Promise<void>((resolve) => setImmediate(resolve));
      expect(logs).not.toContain("private-database-diagnostic");
      const expectedErrorCode =
        dependencyStatus === 400
          ? "META_WEBHOOK_RPC_INVALID"
          : dependencyStatus === 403
            ? "META_WEBHOOK_RPC_REJECTED"
            : "META_WEBHOOK_RPC_DEPENDENCY";
      expect(logs).toContain('"event":"meta.webhook.delivery.failed"');
      expect(logs).toContain(`"error_code":"${expectedErrorCode}"`);
      expect(logs).toContain(`"http_status":${String(expectedStatus)}`);
    },
  );

  it("returns a retryable 503 when the real dependency request times out", async () => {
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      await readJsonBody(request);
      await new Promise<void>((resolve) => setTimeout(resolve, 200));
      writeJson(response, 200, []);
    });
    const apiUrl = await startApi(dependencyUrl, 1_024);
    const response = await fetch(`${apiUrl}/webhooks/meta/b4021000-0000-4000-8000-000000000003`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": `sha256=${"a1".repeat(32)}`,
      },
      body: '{"object":"page","entry":[{}]}',
    });

    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("1");
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("keeps the raw parser scoped away from ordinary JSON API routes", async () => {
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      await readJsonBody(request);
      writeJson(response, 500, {});
    });
    const apiUrl = await startApi(dependencyUrl, 1_024);
    const response = await fetch(`${apiUrl}/test/json-parser-boundary`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"ordinary":true}',
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ordinary: true });
  });
});

describe("Meta webhook fail-closed HTTP classification", () => {
  it("maps an unknown runtime error to a generic internal failure", () => {
    const failure = classifyMetaWebhookFailure(new Error("private-runtime-diagnostic"));

    expect(failure.statusCode).toBe(500);
    expect(failure.error).toMatchObject({
      name: "MetaWebhookHttpError",
      code: "META_WEBHOOK_UNCLASSIFIED",
      category: "internal",
      retryable: false,
      severity: "error",
    });
    expect(responseForMetaWebhookFailure(failure.statusCode)).toEqual({ status: "failed" });
    expect(failure.error.message).not.toContain("private-runtime-diagnostic");
  });

  it.each([undefined, null, [], "error", 42, { code: 500 }])(
    "does not trust a non-Fastify error code: %j",
    (error) => {
      expect(readFastifyErrorCode(error)).toBeUndefined();
    },
  );

  it("accepts only a string Fastify error code", () => {
    expect(readFastifyErrorCode({ code: "FST_ERR_CTP_BODY_TOO_LARGE" })).toBe(
      "FST_ERR_CTP_BODY_TOO_LARGE",
    );
  });

  it.each([
    {
      errorCode: "FST_ERR_CTP_BODY_TOO_LARGE",
      statusCode: 413,
      code: "META_WEBHOOK_ENVELOPE_REJECTED",
      category: "validation",
      severity: "warning",
    },
    {
      errorCode: "FST_ERR_CTP_INVALID_MEDIA_TYPE",
      statusCode: 415,
      code: "META_WEBHOOK_ENVELOPE_REJECTED",
      category: "validation",
      severity: "warning",
    },
    {
      errorCode: undefined,
      statusCode: 500,
      code: "META_WEBHOOK_PARSER_FAILED",
      category: "internal",
      severity: "error",
    },
  ] as const)(
    "classifies parser failure $errorCode as HTTP $statusCode",
    ({ errorCode, statusCode, code, category, severity }) => {
      const failure = classifyMetaWebhookParserFailure(errorCode);

      expect(failure.statusCode).toBe(statusCode);
      expect(failure.error).toMatchObject({
        name: "MetaWebhookHttpError",
        code,
        category,
        retryable: false,
        severity,
      });
    },
  );
});
