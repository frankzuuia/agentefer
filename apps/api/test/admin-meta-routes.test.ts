import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";
import { PassThrough } from "node:stream";

import { SensitiveValue } from "@agentefer/config";
import {
  createOperationalMetrics,
  createReadinessState,
  createStructuredLogger,
} from "@agentefer/observability";
import { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { AdminMetaGatewayError, createAdminMetaGateway } from "../src/admin-meta-gateway.js";
import {
  classifyAdminMetaFailure,
  classifyAdminMetaParserFailure,
  responseForAdminMetaFailure,
} from "../src/admin-meta-routes.js";
import { buildApi } from "../src/app.js";
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
const appSecret = "meta-app-secret-routes-contract-value";
const verifyToken = "meta-verify-token-routes-contract-value";

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
    metrics: createOperationalMetrics({ component: "admin-meta-routes-test" }),
    adminMetaGateway: createAdminMetaGateway({
      supabaseUrl: dependencyUrl,
      publishableKey,
      secretKey: new SensitiveValue(serviceSecret),
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
    expect(page.body).toContain('href="/admin/meta/favicon.svg"');
    expect(page.body).not.toContain(serviceSecret);

    expect(stylesheet.statusCode).toBe(200);
    expect(stylesheet.headers["content-type"]).toContain("text/css");
    expect(stylesheet.body).toContain("@media (max-width: 680px)");
    expect(stylesheet.body).toContain("#3ecf8e");

    expect(javascript.statusCode).toBe(200);
    expect(javascript.headers["content-type"]).toContain("text/javascript");
    expect(javascript.body).toContain("crypto.getRandomValues");
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
    { method: "POST", url: "/admin/meta/applications", payload: registrationBody() },
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

  it("rejects malformed JSON and oversized envelopes with stable responses", async () => {
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

    expect(malformed.statusCode).toBe(400);
    expect(malformed.json()).toEqual({ status: "invalid" });
    expect(oversized.statusCode).toBe(413);
    expect(oversized.json()).toEqual({ status: "invalid" });
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
