import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";
import { PassThrough } from "node:stream";
import { Script } from "node:vm";

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

import { AdminMetaGatewayError, createAdminMetaGateway } from "../src/admin-meta-gateway.js";
import {
  classifyAdminMetaFailure,
  classifyAdminMetaParserFailure,
  responseForAdminMetaFailure,
} from "../src/admin-meta-routes.js";
import { buildApi } from "../src/app.js";
import { createMetaGraphGateway, MetaGraphGatewayError } from "../src/meta-graph-gateway.js";
import { buildApiTestInput } from "./support.js";

const applications: FastifyInstance[] = [];
const dependencyServers: Server[] = [];
const publishableKey = "sb_publishable_admin_routes_test";
const serviceSecret = ["sb", "secret", "admin", "routes", "test"].join("_");
const accessToken = "header.payload.routes-signature";
const userId = "b4033000-0000-4000-8000-000000000001";
const organizationId = "b4033000-0000-4000-8000-000000000002";
const metaApplicationId = "b4033000-0000-4000-8000-000000000003";
const webhookEndpointId = "b4033000-0000-4000-8000-000000000004";
const endpointKey = "b4033000-0000-4000-8000-000000000005";
const channelConnectionId = "b4033000-0000-4000-8000-000000000006";
const appSecret = "meta-app-secret-routes-contract-value";
const verifyToken = "meta-verify-token-routes-contract-value";
const channelAccessToken = "meta-channel-access-token-routes-contract-value";

const writeJson = (response: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(payload),
    "content-type": "application/json",
  });
  response.end(payload);
};

const readJsonBody = async (
  request: IncomingMessage,
): Promise<Readonly<Record<string, unknown>>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected an UTF-8 body");
    }
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
};

const startDependencyServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
): Promise<string> => {
  const server = createServer();
  dependencyServers.push(server);
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

afterEach(async () => {
  await Promise.all(applications.splice(0).map(async (application) => application.close()));
  await Promise.all(dependencyServers.splice(0).map(closeServer));
});

const createApplication = (
  dependencyUrl: string,
  logDestination?: PassThrough,
  metaGraphUrl = dependencyUrl,
  operationalMetrics?: OperationalMetrics,
): FastifyInstance => {
  const readiness = createReadinessState();
  const application = buildApi({
    ...buildApiTestInput(readiness),
    logger: createStructuredLogger({
      component: "api",
      environment: "test",
      level: logDestination === undefined ? "fatal" : "info",
      ...(logDestination === undefined ? {} : { destination: logDestination }),
    }),
    metrics:
      operationalMetrics ?? createOperationalMetrics({ component: "admin-meta-routes-test" }),
    adminMetaGateway: createAdminMetaGateway({
      supabaseUrl: dependencyUrl,
      publishableKey,
      secretKey: new SensitiveValue(serviceSecret),
      timeoutMilliseconds: 200,
    }),
    metaGraphGateway: createMetaGraphGateway({
      baseUrl: metaGraphUrl,
      timeoutMilliseconds: 200,
    }),
    apiPublicUrl: "https://agentefer.frkqr.com",
    supabaseUrl: dependencyUrl,
    supabasePublishableKey: publishableKey,
  });
  applications.push(application);
  return application;
};

const registrationBody = () => ({
  organizationId,
  externalAppId: "216409300082702",
  displayName: "Pruebas Frank",
  apiVersion: "v26.0",
  appSecret,
  webhookVerifyToken: verifyToken,
});

const whatsappRegistrationBody = () => ({
  organizationId,
  metaApplicationId,
  wabaId: "111111111111111",
  phoneNumberId: "222222222222222",
  accessToken: channelAccessToken,
});

describe("admin Meta routes", () => {
  it.each([
    { kind: "invalid", expectedStatus: 400 },
    { kind: "unauthenticated", expectedStatus: 401 },
    { kind: "unauthorized", expectedStatus: 403 },
    { kind: "conflict", expectedStatus: 409 },
    { kind: "timeout", expectedStatus: 503 },
    { kind: "dependency", expectedStatus: 503 },
  ] as const)("classifies a $kind gateway failure", ({ kind, expectedStatus }) => {
    const classified = classifyAdminMetaFailure(
      new AdminMetaGatewayError(kind, new Error(appSecret)),
    );

    expect(classified.statusCode).toBe(expectedStatus);
    expect(classified.error).toBeInstanceOf(AdminMetaGatewayError);
    expect(classified.error).toMatchObject({ kind });
    expect(JSON.stringify(classified)).not.toContain(appSecret);
  });

  it.each([
    { kind: "invalid", expectedStatus: 400 },
    { kind: "unauthorized", expectedStatus: 403 },
    { kind: "timeout", expectedStatus: 503 },
    { kind: "dependency", expectedStatus: 503 },
  ] as const)("classifies a Meta Graph $kind failure", ({ kind, expectedStatus }) => {
    const classified = classifyAdminMetaFailure(
      new MetaGraphGatewayError(kind, new Error(channelAccessToken)),
    );

    expect(classified.statusCode).toBe(expectedStatus);
    expect(classified.error).toMatchObject({ kind });
    expect(JSON.stringify(classified)).not.toContain(channelAccessToken);
  });

  it("classifies unknown failures without exposing their causes", () => {
    const unknown = classifyAdminMetaFailure(new Error(appSecret));

    expect(unknown.statusCode).toBe(500);
    expect(unknown.error).toMatchObject({
      name: "AdminMetaHttpError",
      code: "ADMIN_META_UNCLASSIFIED",
      category: "internal",
      retryable: false,
      severity: "error",
    });
    expect(responseForAdminMetaFailure(500)).toEqual({ status: "failed" });
    expect(JSON.stringify(unknown)).not.toContain(appSecret);
  });

  it.each([
    { statusCode: 400, body: { status: "invalid" } },
    { statusCode: 413, body: { status: "invalid" } },
    { statusCode: 415, body: { status: "invalid" } },
    { statusCode: 401, body: { status: "unauthenticated" } },
    { statusCode: 403, body: { status: "forbidden" } },
    { statusCode: 409, body: { status: "conflict" } },
    { statusCode: 503, body: { status: "unavailable" } },
    { statusCode: 500, body: { status: "failed" } },
  ])("returns a stable safe response for HTTP $statusCode", ({ statusCode, body }) => {
    expect(responseForAdminMetaFailure(statusCode)).toEqual(body);
  });

  it.each([
    {
      errorCode: "FST_ERR_CTP_BODY_TOO_LARGE",
      statusCode: 413,
      code: "ADMIN_META_ENVELOPE_REJECTED",
      category: "validation",
      severity: "warning",
    },
    {
      errorCode: "FST_ERR_CTP_INVALID_MEDIA_TYPE",
      statusCode: 415,
      code: "ADMIN_META_ENVELOPE_REJECTED",
      category: "validation",
      severity: "warning",
    },
    {
      errorCode: "FST_ERR_CTP_INVALID_JSON_BODY",
      statusCode: 400,
      code: "ADMIN_META_ENVELOPE_REJECTED",
      category: "validation",
      severity: "warning",
    },
    {
      errorCode: undefined,
      statusCode: 500,
      code: "ADMIN_META_PARSER_FAILED",
      category: "internal",
      severity: "error",
    },
  ] as const)(
    "classifies parser failure $errorCode as HTTP $statusCode",
    ({ errorCode, statusCode, code, category, severity }) => {
      const classified = classifyAdminMetaParserFailure(errorCode);

      expect(classified.statusCode).toBe(statusCode);
      expect(classified.error).toMatchObject({
        name: "AdminMetaHttpError",
        code,
        category,
        retryable: false,
        severity,
        statusCode,
      });
    },
  );

  it("serves a responsive premium page and strict browser security headers", async () => {
    const application = createApplication("https://hprdctmblmfcoagugvyp.supabase.co");

    const page = await application.inject({ method: "GET", url: "/admin/meta" });
    const stylesheet = await application.inject({ method: "GET", url: "/admin/meta/app.css" });
    const javascript = await application.inject({ method: "GET", url: "/admin/meta/app.js" });
    const favicon = await application.inject({ method: "GET", url: "/admin/meta/favicon.svg" });
    const config = await application.inject({ method: "GET", url: "/admin/meta/config" });

    expect(page.statusCode).toBe(200);
    expect(page.headers["content-type"]).toContain("text/html");
    expect(page.headers["cache-control"]).toBe("no-store, max-age=0");
    expect(page.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(page.headers["cross-origin-resource-policy"]).toBe("same-origin");
    expect(page.headers["origin-agent-cluster"]).toBe("?1");
    expect(page.headers["x-frame-options"]).toBe("DENY");
    expect(page.headers["x-content-type-options"]).toBe("nosniff");
    expect(page.headers["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
    expect(page.headers["referrer-policy"]).toBe("no-referrer");
    expect(page.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(page.headers["strict-transport-security"]).toBe("max-age=63072000; includeSubDomains");
    expect(page.headers["content-security-policy"]).toBe(
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; " +
        "script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; " +
        "connect-src 'self' https://hprdctmblmfcoagugvyp.supabase.co; object-src 'none'; " +
        "manifest-src 'none'; media-src 'none'; worker-src 'none'",
    );
    expect(page.body).toContain("Conecta WhatsApp y Messenger sin mezclar cuentas");
    expect(page.body).toContain('id="organization-select"');
    expect(page.body).toContain('id="whatsapp-form"');
    expect(page.body).toContain('id="meta-application-select"');
    expect(page.body).toContain("Token aislado por negocio");
    expect(page.body).toContain('href="/admin/meta/favicon.svg"');
    expect(page.body).not.toContain(serviceSecret);

    expect(stylesheet.statusCode).toBe(200);
    expect(stylesheet.headers["content-type"]).toContain("text/css");
    expect(stylesheet.body).toContain("@media (max-width: 680px)");
    expect(stylesheet.body).toContain("#3ecf8e");

    expect(javascript.statusCode).toBe(200);
    expect(javascript.headers["content-type"]).toContain("text/javascript");
    expect(javascript.body).toContain("crypto.getRandomValues");
    expect(javascript.body).toContain("loadTenantState");
    expect(() => new Script(javascript.body)).not.toThrow();
    expect(javascript.body).not.toContain("localStorage");
    expect(javascript.body).not.toContain("sessionStorage");

    expect(favicon.statusCode).toBe(200);
    expect(favicon.headers["content-type"]).toContain("image/svg+xml");
    expect(favicon.body).toContain("AgenteFer");
    expect(favicon.body).not.toContain("<script");

    expect(config.statusCode).toBe(200);
    expect(config.json()).toEqual({
      supabaseUrl: "https://hprdctmblmfcoagugvyp.supabase.co",
      publishableKey,
    });
    expect(config.body).not.toContain(serviceSecret);
  });

  it.each([
    { method: "GET", url: "/admin/organizations" },
    { method: "GET", url: `/admin/meta/applications?organizationId=${organizationId}` },
    {
      method: "GET",
      url: `/admin/meta/whatsapp-connections?organizationId=${organizationId}`,
    },
    { method: "POST", url: "/admin/meta/applications", payload: registrationBody() },
    {
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      payload: whatsappRegistrationBody(),
    },
  ] as const)("requires a bearer session for $method $url", async (request) => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject(request);

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: "unauthenticated" });
    expect(response.headers["retry-after"]).toBeUndefined();
    expect(response.body).not.toContain(appSecret);
    expect(response.body).not.toContain(verifyToken);
  });

  it("authenticates the user and returns only organizations admitted by RLS", async () => {
    const logDestination = new PassThrough();
    const dependencyUrl = await startDependencyServer((request, response) => {
      if (request.url === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }

      if (request.url?.startsWith("/rest/v1/organizations?")) {
        expect(request.headers.authorization).toBe(`Bearer ${accessToken}`);
        expect(request.headers.apikey).toBe(publishableKey);
        writeJson(response, 200, [
          { id: organizationId, name: "Frank - Pruebas", status: "active" },
        ]);
        return;
      }

      writeJson(response, 404, {});
    });
    const application = createApplication(dependencyUrl, logDestination);

    const response = await application.inject({
      method: "GET",
      url: "/admin/organizations",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      organizations: [{ id: organizationId, name: "Frank - Pruebas", status: "active" }],
    });
    const logChunk: unknown = logDestination.read();
    const logs = Buffer.isBuffer(logChunk) ? logChunk.toString("utf8") : "";
    expect(logs).toContain('"event":"admin.meta.organizations.listed"');
    expect(logs).toContain('"outcome":"succeeded"');
    expect(logs).toContain(`"actor_user_id":"${userId}"`);
    expect(logs).toContain('"organization_count":1');
  });

  it("rejects a bearer token that Supabase Auth no longer recognizes", async () => {
    const dependencyUrl = await startDependencyServer((_request, response) => {
      writeJson(response, 401, { diagnostic: accessToken });
    });
    const application = createApplication(dependencyUrl);

    const response = await application.inject({
      method: "GET",
      url: "/admin/organizations",
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: "unauthenticated" });
    expect(response.body).not.toContain(accessToken);
  });

  it("registers through the audited RPC and never leaks request secrets", async () => {
    const logDestination = new PassThrough();
    const capturedRpcBodies: Readonly<Record<string, unknown>>[] = [];
    const dependencyUrl = await startDependencyServer(async (request, response) => {
      if (request.url === "/auth/v1/user") {
        expect(request.headers.authorization).toBe(`Bearer ${accessToken}`);
        writeJson(response, 200, { id: userId });
        return;
      }

      if (request.url === "/rest/v1/rpc/register_meta_application") {
        capturedRpcBodies.push(await readJsonBody(request));
        writeJson(response, 200, [
          {
            meta_application_id: metaApplicationId,
            webhook_endpoint_id: webhookEndpointId,
            endpoint_key: endpointKey,
          },
        ]);
        return;
      }

      writeJson(response, 404, {});
    });
    const application = createApplication(dependencyUrl, logDestination);

    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: registrationBody(),
    });
    const logChunk: unknown = logDestination.read();
    const logs = Buffer.isBuffer(logChunk)
      ? logChunk.toString("utf8")
      : typeof logChunk === "string"
        ? logChunk
        : "";

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      status: "registered",
      callbackUrl: `https://agentefer.frkqr.com/webhooks/meta/${endpointKey}`,
    });
    expect(capturedRpcBodies).toHaveLength(1);
    expect(capturedRpcBodies[0]).toMatchObject({
      target_organization_id: organizationId,
      target_app_secret: appSecret,
      target_webhook_verify_token: verifyToken,
      target_actor_user_id: userId,
    });
    expect(response.body).not.toContain(appSecret);
    expect(response.body).not.toContain(verifyToken);
    expect(response.body).not.toContain(accessToken);
    expect(logs).not.toContain(appSecret);
    expect(logs).not.toContain(verifyToken);
    expect(logs).not.toContain(accessToken);
    expect(logs).toContain('"event":"admin.meta.application.registered"');
    expect(logs).toContain('"outcome":"succeeded"');
    expect(logs).toContain(`"organization_id":"${organizationId}"`);
    expect(logs).toContain(`"actor_user_id":"${userId}"`);
    expect(logs).toContain(`"meta_application_id":"${metaApplicationId}"`);
    expect(logs).toContain(`"webhook_endpoint_id":"${webhookEndpointId}"`);
  });

  it("validates Meta live, subscribes the WABA and then stores the tenant channel", async () => {
    const logDestination = new PassThrough();
    const rpcBodies: Readonly<Record<string, unknown>>[] = [];
    const supabaseUrl = await startDependencyServer(async (request, response) => {
      const url = new URL(request.url ?? "", "http://supabase.test");
      if (url.pathname === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (url.pathname === "/rest/v1/meta_applications") {
        expect(request.headers.authorization).toBe(`Bearer ${accessToken}`);
        expect(url.searchParams.get("organization_id")).toBe(`eq.${organizationId}`);
        writeJson(response, 200, [
          {
            id: metaApplicationId,
            organization_id: organizationId,
            external_app_id: "216409300082702",
            display_name: "AgenteFer - Pruebas Frank",
            api_version: "v26.0",
            status: "active",
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/rpc/register_meta_whatsapp_connection") {
        rpcBodies.push(await readJsonBody(request));
        writeJson(response, 200, [
          {
            channel_connection_id: channelConnectionId,
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
            connection_status: "active",
          },
        ]);
        return;
      }
      writeJson(response, 404, {});
    });
    const graphRequests: string[] = [];
    const graphUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://graph.test");
      expect(request.headers.authorization).toBe(`Bearer ${channelAccessToken}`);
      graphRequests.push(`${request.method ?? ""} ${url.pathname}`);
      if (url.pathname === "/v26.0/debug_token") {
        expect(url.searchParams.get("input_token")).toBe(channelAccessToken);
        writeJson(response, 200, {
          data: {
            app_id: "216409300082702",
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: 4_102_444_800,
            data_access_expires_at: 4_102_531_200,
            scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
            granular_scopes: [
              { scope: "whatsapp_business_management", target_ids: ["111111111111111"] },
            ],
          },
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/phone_numbers") {
        writeJson(response, 200, {
          data: [
            {
              id: "222222222222222",
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
              quality_rating: "GREEN",
              name_status: "APPROVED",
            },
          ],
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/subscribed_apps") {
        writeJson(response, 200, { success: true });
        return;
      }
      writeJson(response, 404, { error: { code: 100 } });
    });
    const application = createApplication(supabaseUrl, logDestination, graphUrl);

    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: whatsappRegistrationBody(),
    });
    const logChunk: unknown = logDestination.read();
    const logs = Buffer.isBuffer(logChunk) ? logChunk.toString("utf8") : "";

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      status: "connected",
      connection: {
        id: channelConnectionId,
        displayPhoneNumber: "+52 664 555 0101",
        verifiedName: "AgenteFer Pruebas",
      },
    });
    expect(graphRequests).toEqual([
      "GET /v26.0/debug_token",
      "GET /v26.0/111111111111111/phone_numbers",
      "POST /v26.0/111111111111111/subscribed_apps",
    ]);
    expect(rpcBodies).toHaveLength(1);
    expect(rpcBodies[0]).toMatchObject({
      target_organization_id: organizationId,
      target_meta_application_id: metaApplicationId,
      target_waba_id: "111111111111111",
      target_phone_number_id: "222222222222222",
      target_display_phone_number: "+52 664 555 0101",
      target_verified_name: "AgenteFer Pruebas",
      target_quality_rating: "GREEN",
      target_name_status: "APPROVED",
      target_token_type: "SYSTEM_USER",
      target_granted_scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      target_token_expires_at: "2100-01-01T00:00:00.000Z",
      target_data_access_expires_at: "2100-01-02T00:00:00.000Z",
      target_access_token: channelAccessToken,
      target_actor_user_id: userId,
    });
    expect(response.body).not.toContain(channelAccessToken);
    expect(logs).not.toContain(channelAccessToken);
    expect(logs).not.toContain(accessToken);
    expect(logs).toContain('"event":"admin.meta.whatsapp_connection.registered"');
    expect(logs).toContain(`"channel_connection_id":"${channelConnectionId}"`);
    expect(logs).toContain('"outcome":"succeeded"');
    expect(logs).toContain(`"meta_application_id":"${metaApplicationId}"`);
    expect(logs).toContain('"waba_id":"111111111111111"');
    expect(logs).toContain('"phone_number_id":"[REDACTED]"');
    expect(logs).not.toContain('"phone_number_id":"222222222222222"');
  });

  it("selects the requested tenant App when more than one active App exists", async () => {
    const otherMetaApplicationId = "b4033000-0000-4000-8000-000000000099";
    const supabaseUrl = await startDependencyServer(async (request, response) => {
      const url = new URL(request.url ?? "", "http://supabase.test");
      if (url.pathname === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (url.pathname === "/rest/v1/meta_applications") {
        writeJson(response, 200, [
          {
            id: otherMetaApplicationId,
            organization_id: organizationId,
            external_app_id: "999999999999999",
            display_name: "Otra App",
            api_version: "v26.0",
            status: "active",
          },
          {
            id: metaApplicationId,
            organization_id: organizationId,
            external_app_id: "216409300082702",
            display_name: "AgenteFer - Pruebas Frank",
            api_version: "v26.0",
            status: "active",
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/rpc/register_meta_whatsapp_connection") {
        const body = await readJsonBody(request);
        expect(body.target_meta_application_id).toBe(metaApplicationId);
        writeJson(response, 200, [
          {
            channel_connection_id: channelConnectionId,
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
            connection_status: "active",
          },
        ]);
        return;
      }
      writeJson(response, 404, {});
    });
    const graphUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://graph.test");
      if (url.pathname === "/v26.0/debug_token") {
        writeJson(response, 200, {
          data: {
            app_id: "216409300082702",
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: 0,
            data_access_expires_at: 0,
            scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
            granular_scopes: [
              { scope: "whatsapp_business_management", target_ids: ["111111111111111"] },
            ],
          },
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/phone_numbers") {
        writeJson(response, 200, {
          data: [
            {
              id: "222222222222222",
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
            },
          ],
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/subscribed_apps") {
        writeJson(response, 200, { success: true });
        return;
      }
      writeJson(response, 404, {});
    });
    const application = createApplication(supabaseUrl, undefined, graphUrl);

    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: whatsappRegistrationBody(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: "connected",
      connection: { id: channelConnectionId },
    });
  });

  it("returns only active Apps and WhatsApp connections visible through tenant RLS", async () => {
    const logDestination = new PassThrough();
    const dependencyUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://supabase.test");
      if (url.pathname === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (url.pathname === "/rest/v1/meta_applications") {
        writeJson(response, 200, [
          {
            id: metaApplicationId,
            organization_id: organizationId,
            external_app_id: "216409300082702",
            display_name: "AgenteFer - Pruebas Frank",
            api_version: "v26.0",
            status: "active",
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/meta_whatsapp_connections") {
        writeJson(response, 200, [
          {
            id: channelConnectionId,
            organization_id: organizationId,
            meta_application_id: metaApplicationId,
            waba_id: "111111111111111",
            phone_number_id: "222222222222222",
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
            api_version: "v26.0",
            status: "active",
            connected_at: "2026-08-20T14:00:00.000Z",
          },
        ]);
        return;
      }
      writeJson(response, 404, {});
    });
    const application = createApplication(dependencyUrl, logDestination);

    const applicationsResponse = await application.inject({
      method: "GET",
      url: `/admin/meta/applications?organizationId=${organizationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });
    const connectionsResponse = await application.inject({
      method: "GET",
      url: `/admin/meta/whatsapp-connections?organizationId=${organizationId}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(applicationsResponse.statusCode).toBe(200);
    expect(applicationsResponse.json()).toEqual({
      applications: [
        {
          id: metaApplicationId,
          organizationId,
          externalAppId: "216409300082702",
          displayName: "AgenteFer - Pruebas Frank",
          apiVersion: "v26.0",
          status: "active",
        },
      ],
    });
    expect(connectionsResponse.statusCode).toBe(200);
    expect(connectionsResponse.json()).toEqual({
      connections: [
        {
          id: channelConnectionId,
          organizationId,
          metaApplicationId,
          wabaId: "111111111111111",
          phoneNumberId: "222222222222222",
          displayPhoneNumber: "+52 664 555 0101",
          verifiedName: "AgenteFer Pruebas",
          apiVersion: "v26.0",
          status: "active",
          connectedAt: "2026-08-20T14:00:00.000Z",
        },
      ],
    });
    const logChunk: unknown = logDestination.read();
    const logs = Buffer.isBuffer(logChunk) ? logChunk.toString("utf8") : "";
    expect(logs).toContain('"event":"admin.meta.applications.listed"');
    expect(logs).toContain('"application_count":1');
    expect(logs).toContain('"event":"admin.meta.whatsapp_connections.listed"');
    expect(logs).toContain('"connection_count":1');
    expect(logs.match(/"outcome":"succeeded"/gu)).toHaveLength(2);
  });

  it("records exact route outcomes and bounded durations through the real OpenTelemetry SDK", async () => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 60_000,
    });
    const provider = new MeterProvider({ readers: [reader] });
    const operationalMetrics = createOperationalMetrics({
      component: "admin-meta-routes-test",
      meter: provider.getMeter("admin-meta-routes-integration"),
    });
    const logDestination = new PassThrough();
    const supabaseUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://supabase.test");
      if (url.pathname === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (url.pathname === "/rest/v1/organizations") {
        writeJson(response, 200, [
          { id: organizationId, name: "Frank - Pruebas", status: "active" },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/meta_applications") {
        writeJson(response, 200, [
          {
            id: metaApplicationId,
            organization_id: organizationId,
            external_app_id: "216409300082702",
            display_name: "AgenteFer - Pruebas Frank",
            api_version: "v26.0",
            status: "active",
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/meta_whatsapp_connections") {
        writeJson(response, 200, [
          {
            id: channelConnectionId,
            organization_id: organizationId,
            meta_application_id: metaApplicationId,
            waba_id: "111111111111111",
            phone_number_id: "222222222222222",
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
            api_version: "v26.0",
            status: "active",
            connected_at: "2026-08-20T14:00:00.000Z",
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/rpc/register_meta_application") {
        writeJson(response, 200, [
          {
            meta_application_id: metaApplicationId,
            webhook_endpoint_id: webhookEndpointId,
            endpoint_key: endpointKey,
          },
        ]);
        return;
      }
      if (url.pathname === "/rest/v1/rpc/register_meta_whatsapp_connection") {
        writeJson(response, 200, [
          {
            channel_connection_id: channelConnectionId,
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
            connection_status: "active",
          },
        ]);
        return;
      }
      writeJson(response, 404, {});
    });
    const graphUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://graph.test");
      if (url.pathname === "/v26.0/debug_token") {
        writeJson(response, 200, {
          data: {
            app_id: "216409300082702",
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: 0,
            data_access_expires_at: 0,
            scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
            granular_scopes: [
              { scope: "whatsapp_business_management", target_ids: ["111111111111111"] },
            ],
          },
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/phone_numbers") {
        writeJson(response, 200, {
          data: [
            {
              id: "222222222222222",
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
            },
          ],
        });
        return;
      }
      if (url.pathname === "/v26.0/111111111111111/subscribed_apps") {
        writeJson(response, 200, { success: true });
        return;
      }
      writeJson(response, 404, {});
    });
    const application = createApplication(
      supabaseUrl,
      logDestination,
      graphUrl,
      operationalMetrics,
    );
    const authorization = { authorization: `Bearer ${accessToken}` };

    try {
      const responses = await Promise.all([
        application.inject({ method: "GET", url: "/admin/organizations", headers: authorization }),
        application.inject({
          method: "GET",
          url: `/admin/meta/applications?organizationId=${organizationId}`,
          headers: authorization,
        }),
        application.inject({
          method: "GET",
          url: `/admin/meta/whatsapp-connections?organizationId=${organizationId}`,
          headers: authorization,
        }),
        application.inject({
          method: "POST",
          url: "/admin/meta/applications",
          headers: authorization,
          payload: registrationBody(),
        }),
        application.inject({
          method: "POST",
          url: "/admin/meta/whatsapp-connections",
          headers: authorization,
          payload: whatsappRegistrationBody(),
        }),
      ]);
      const invalidQuery = await application.inject({
        method: "GET",
        url: "/admin/meta/applications",
        headers: authorization,
      });

      expect(responses.map((response) => response.statusCode)).toEqual([200, 200, 200, 201, 201]);
      expect(invalidQuery.statusCode).toBe(400);

      await provider.forceFlush();
      const metricData = exporter
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
        throw new TypeError("Expected sum and histogram route metrics");
      }

      const completedAttributes = completed.dataPoints.map((point) => point.attributes);
      expect(completedAttributes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            "operation.name": "admin.meta.organizations",
            "operation.outcome": "succeeded",
          }),
          expect.objectContaining({
            "operation.name": "admin.meta.applications",
            "operation.outcome": "succeeded",
          }),
          expect.objectContaining({
            "operation.name": "admin.meta.applications",
            "operation.outcome": "failed",
            "error.category": "validation",
          }),
          expect.objectContaining({
            "operation.name": "admin.meta.whatsapp_connections",
            "operation.outcome": "succeeded",
          }),
          expect.objectContaining({
            "operation.name": "admin.meta.register",
            "operation.outcome": "succeeded",
          }),
          expect.objectContaining({
            "operation.name": "admin.meta.whatsapp_register",
            "operation.outcome": "succeeded",
          }),
        ]),
      );
      expect(duration.dataPoints).toHaveLength(6);
      for (const point of duration.dataPoints) {
        expect(point.value.count).toBe(1);
        expect(point.value.sum).toBeGreaterThanOrEqual(0);
        expect(point.value.sum).toBeLessThan(1_000);
      }

      const logChunk: unknown = logDestination.read();
      const logs = Buffer.isBuffer(logChunk) ? logChunk.toString("utf8") : "";
      const records = logs
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as Readonly<Record<string, unknown>>);
      for (const event of [
        "admin.meta.applications.listed",
        "admin.meta.whatsapp_connections.listed",
        "admin.meta.application.registered",
        "admin.meta.whatsapp_connection.registered",
      ]) {
        expect(records.find((record) => record.event === event)).toMatchObject({
          organization_id: organizationId,
        });
      }
    } finally {
      await provider.shutdown();
    }
  });

  it("rejects a tenant App mismatch before any Meta request", async () => {
    let graphRequestCount = 0;
    const supabaseUrl = await startDependencyServer((request, response) => {
      const url = new URL(request.url ?? "", "http://supabase.test");
      if (url.pathname === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (url.pathname === "/rest/v1/meta_applications") {
        writeJson(response, 200, []);
        return;
      }
      writeJson(response, 404, {});
    });
    const graphUrl = await startDependencyServer((_request, response) => {
      graphRequestCount += 1;
      writeJson(response, 200, {});
    });
    const application = createApplication(supabaseUrl, undefined, graphUrl);

    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: whatsappRegistrationBody(),
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ status: "forbidden" });
    expect(graphRequestCount).toBe(0);
    expect(response.body).not.toContain(channelAccessToken);
  });

  it.each([
    { dependencyStatus: 400, expectedStatus: 400, expectedBody: { status: "invalid" } },
    { dependencyStatus: 403, expectedStatus: 403, expectedBody: { status: "forbidden" } },
    { dependencyStatus: 409, expectedStatus: 409, expectedBody: { status: "conflict" } },
    { dependencyStatus: 500, expectedStatus: 503, expectedBody: { status: "unavailable" } },
  ])(
    "redacts a dependency $dependencyStatus registration failure",
    async ({ dependencyStatus, expectedStatus, expectedBody }) => {
      const dependencyUrl = await startDependencyServer((request, response) => {
        if (request.url === "/auth/v1/user") {
          writeJson(response, 200, { id: userId });
          return;
        }
        writeJson(response, dependencyStatus, { secret: appSecret });
      });
      const application = createApplication(dependencyUrl);

      const response = await application.inject({
        method: "POST",
        url: "/admin/meta/applications",
        headers: { authorization: `Bearer ${accessToken}` },
        payload: registrationBody(),
      });

      expect(response.statusCode).toBe(expectedStatus);
      expect(response.json()).toEqual(expectedBody);
      expect(response.body).not.toContain(appSecret);
      expect(response.body).not.toContain(verifyToken);
      if (expectedStatus === 503) {
        expect(response.headers["retry-after"]).toBe("2");
      } else {
        expect(response.headers["retry-after"]).toBeUndefined();
      }
    },
  );

  it("rejects unknown fields before contacting Supabase", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { ...registrationBody(), organizationOverride: "forbidden" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: "invalid" });
  });

  it.each(["/admin/meta/applications", "/admin/meta/whatsapp-connections"])(
    "rejects a missing organization query on %s before contacting Supabase",
    async (url) => {
      const application = createApplication("http://127.0.0.1:9");
      const response = await application.inject({
        method: "GET",
        url,
        headers: { authorization: `Bearer ${accessToken}` },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ status: "invalid" });
    },
  );

  it("rejects unknown WhatsApp fields before contacting Supabase or Meta", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { ...whatsappRegistrationBody(), organizationOverride: "forbidden" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: "invalid" });
  });

  it("records a redacted authentication failure with its stable HTTP status", async () => {
    const logDestination = new PassThrough();
    const application = createApplication("http://127.0.0.1:9", logDestination);
    const response = await application.inject({ method: "GET", url: "/admin/organizations" });
    const logChunk: unknown = logDestination.read();
    const logs = Buffer.isBuffer(logChunk) ? logChunk.toString("utf8") : "";

    expect(response.statusCode).toBe(401);
    expect(logs).toContain('"event":"admin.meta.organizations.failed"');
    expect(logs).toContain('"error_code":"ADMIN_META_SESSION_REQUIRED"');
    expect(logs).toContain('"error_category":"authentication"');
    expect(logs).toContain('"error_retryable":false');
    expect(logs).toContain('"error_severity":"warning"');
    expect(logs).toContain('"http_status":401');
    expect(logs).not.toContain(appSecret);
    expect(logs).not.toContain(verifyToken);
  });

  it("rejects malformed JSON and oversized App or WhatsApp envelopes with stable responses", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const malformed = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      payload: "{",
    });
    const oversized = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { ...registrationBody(), appSecret: "x".repeat(140_001) },
    });
    const oversizedWhatsApp = await application.inject({
      method: "POST",
      url: "/admin/meta/whatsapp-connections",
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { ...whatsappRegistrationBody(), accessToken: "x".repeat(140_001) },
    });

    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ status: "invalid" });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json()).toEqual({ status: "invalid" });
    expect(oversizedWhatsApp.statusCode).toBe(413);
    expect(oversizedWhatsApp.json()).toEqual({ status: "invalid" });
  });

  it("rejects a non-JSON registration media type before reading its body", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "text/plain",
      },
      payload: appSecret,
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ status: "invalid" });
    expect(response.body).not.toContain(appSecret);
  });

  it("maps an unsupported Fastify parser media type to a stable 415 response", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/meta/applications",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/xml",
      },
      payload: "<registration />",
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({ status: "invalid" });
  });
});
