import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  AdminMetaGatewayError,
  createAdminMetaGateway,
  type AdminMetaGateway,
} from "../src/admin-meta-gateway.js";

const servers: Server[] = [];
const publishableKey = "sb_publishable_admin_contract_test";
const serviceSecret = ["sb", "secret", "admin", "contract", "test"].join("_");
const accessToken = new SensitiveValue("header.payload.admin-signature");
const userId = "b4032000-0000-4000-8000-000000000001";
const organizationId = "b4032000-0000-4000-8000-000000000002";
const metaApplicationId = "b4032000-0000-4000-8000-000000000003";
const webhookEndpointId = "b4032000-0000-4000-8000-000000000004";
const endpointKey = "b4032000-0000-4000-8000-000000000005";
const appSecret = "real-meta-app-secret-contract-value";
const verifyToken = "real-meta-verify-token-contract-value";

const errorContracts = {
  invalid: {
    code: "ADMIN_META_GATEWAY_INVALID",
    category: "validation",
    retryable: false,
    severity: "warning",
  },
  unauthenticated: {
    code: "ADMIN_META_GATEWAY_UNAUTHENTICATED",
    category: "authentication",
    retryable: false,
    severity: "warning",
  },
  unauthorized: {
    code: "ADMIN_META_GATEWAY_UNAUTHORIZED",
    category: "authorization",
    retryable: false,
    severity: "warning",
  },
  conflict: {
    code: "ADMIN_META_GATEWAY_CONFLICT",
    category: "conflict",
    retryable: false,
    severity: "warning",
  },
  timeout: {
    code: "ADMIN_META_GATEWAY_TIMEOUT",
    category: "timeout",
    retryable: true,
    severity: "error",
  },
  dependency: {
    code: "ADMIN_META_GATEWAY_DEPENDENCY",
    category: "dependency",
    retryable: true,
    severity: "error",
  },
} as const;

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
  await Promise.all(servers.splice(0).map(closeServer));
});

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
): Promise<string> => {
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
      throw new TypeError("Expected an UTF-8 request body");
    }
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
};

const createGateway = (baseUrl: string, timeoutMilliseconds = 200): AdminMetaGateway =>
  createAdminMetaGateway({
    supabaseUrl: baseUrl,
    publishableKey,
    secretKey: new SensitiveValue(serviceSecret),
    timeoutMilliseconds,
  });

const registrationInput = () => ({
  organizationId,
  externalAppId: "216409300082702",
  displayName: "Pruebas Frank",
  apiVersion: "v26.0",
  appSecret: new SensitiveValue(appSecret),
  webhookVerifyToken: new SensitiveValue(verifyToken),
  actorUserId: userId,
  requestId: "request-admin-meta-contract",
  traceId: "0123456789abcdef0123456789abcdef",
});

describe("admin Meta Supabase gateway over real TCP", () => {
  it("authenticates, honors RLS headers and registers the exact tenant-scoped RPC", async () => {
    const requests: Readonly<{
      url: string;
      body?: Readonly<Record<string, unknown>>;
    }>[] = [];
    const baseUrl = await startServer(async (request, response) => {
      expect(request.headers.accept).toBe("application/json");

      if (request.url === "/auth/v1/user") {
        expect(request.method).toBe("GET");
        expect(request.headers.apikey).toBe(publishableKey);
        expect(request.headers.authorization).toBe(`Bearer ${accessToken.reveal()}`);
        requests.push({ url: request.url });
        writeJson(response, 200, { id: userId });
        return;
      }

      if (request.url?.startsWith("/rest/v1/organizations?")) {
        expect(request.method).toBe("GET");
        expect(request.headers["accept-profile"]).toBe("api");
        expect(request.headers.apikey).toBe(publishableKey);
        expect(request.headers.authorization).toBe(`Bearer ${accessToken.reveal()}`);
        const url = new URL(request.url, baseUrl);
        expect(url.searchParams.get("select")).toBe("id,name,status");
        expect(url.searchParams.get("status")).toBe("eq.active");
        expect(url.searchParams.get("order")).toBe("name.asc");
        expect(url.searchParams.get("limit")).toBe("100");
        requests.push({ url: url.pathname });
        writeJson(response, 200, [
          { id: organizationId, name: "Frank - Pruebas", status: "active" },
        ]);
        return;
      }

      if (request.url === "/rest/v1/rpc/register_meta_application") {
        expect(request.method).toBe("POST");
        expect(request.headers.apikey).toBe(serviceSecret);
        expect(request.headers["accept-profile"]).toBe("api");
        expect(request.headers["content-profile"]).toBe("api");
        expect(request.headers["content-type"]).toBe("application/json");
        const body = await readJsonBody(request);
        requests.push({ url: request.url, body });
        writeJson(response, 200, [
          {
            meta_application_id: metaApplicationId,
            webhook_endpoint_id: webhookEndpointId,
            endpoint_key: endpointKey,
          },
        ]);
        return;
      }

      writeJson(response, 404, { status: "not-found" });
    });

    const gateway = createGateway(baseUrl);

    await expect(gateway.authenticate(accessToken)).resolves.toEqual({ userId });
    await expect(gateway.listOrganizations(accessToken)).resolves.toEqual([
      { id: organizationId, name: "Frank - Pruebas", status: "active" },
    ]);
    await expect(gateway.registerMetaApplication(registrationInput())).resolves.toEqual({
      metaApplicationId,
      webhookEndpointId,
      endpointKey,
    });

    expect(requests).toHaveLength(3);
    expect(requests[2]?.body).toEqual({
      target_organization_id: organizationId,
      target_external_app_id: "216409300082702",
      target_display_name: "Pruebas Frank",
      target_api_version: "v26.0",
      target_app_secret: appSecret,
      target_webhook_verify_token: verifyToken,
      target_actor_user_id: userId,
      target_correlation_id: "request-admin-meta-contract",
      target_trace_id: "0123456789abcdef0123456789abcdef",
    });
  });

  it.each([
    { operation: "authenticate", status: 400, kind: "unauthenticated" },
    { operation: "authenticate", status: 401, kind: "unauthenticated" },
    { operation: "authenticate", status: 403, kind: "unauthenticated" },
    { operation: "organizations", status: 401, kind: "unauthenticated" },
    { operation: "organizations", status: 403, kind: "unauthorized" },
    { operation: "organizations", status: 413, kind: "invalid" },
    { operation: "organizations", status: 422, kind: "invalid" },
    { operation: "register", status: 400, kind: "invalid" },
    { operation: "register", status: 401, kind: "unauthenticated" },
    { operation: "register", status: 403, kind: "unauthorized" },
    { operation: "register", status: 409, kind: "conflict" },
    { operation: "register", status: 500, kind: "dependency" },
  ] as const)("maps $operation status $status to $kind", async ({ operation, status, kind }) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, status, { diagnostic: appSecret });
    });
    const gateway = createGateway(baseUrl);

    const promise =
      operation === "authenticate"
        ? gateway.authenticate(accessToken)
        : operation === "organizations"
          ? gateway.listOrganizations(accessToken)
          : gateway.registerMetaApplication(registrationInput());

    let capturedError: unknown;
    try {
      await promise;
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toBeInstanceOf(AdminMetaGatewayError);
    expect(capturedError).toMatchObject({
      name: "AdminMetaGatewayError",
      kind,
      ...errorContracts[kind],
    });
    expect(JSON.stringify(capturedError)).not.toContain(appSecret);
  });

  it.each([
    { operation: "authenticate", body: [] },
    { operation: "authenticate", body: null },
    { operation: "authenticate", body: "user" },
    { operation: "authenticate", body: { id: "not-a-uuid" } },
    { operation: "organizations", body: {} },
    { operation: "organizations", body: [null] },
    { operation: "organizations", body: [[]] },
    {
      operation: "organizations",
      body: [{ id: organizationId, name: "Frank", status: "suspended" }],
    },
    { operation: "organizations", body: [{ id: organizationId, name: "", status: "active" }] },
    {
      operation: "organizations",
      body: [{ id: organizationId, name: 42, status: "active" }],
    },
    {
      operation: "organizations",
      body: [{ id: organizationId, name: "x".repeat(161), status: "active" }],
    },
    { operation: "register", body: [] },
    { operation: "register", body: {} },
    { operation: "register", body: [null] },
    {
      operation: "register",
      body: [
        {
          meta_application_id: metaApplicationId,
          webhook_endpoint_id: webhookEndpointId,
          endpoint_key: endpointKey,
        },
        {
          meta_application_id: metaApplicationId,
          webhook_endpoint_id: webhookEndpointId,
          endpoint_key: endpointKey,
        },
      ],
    },
    {
      operation: "register",
      body: [
        {
          meta_application_id: "not-a-uuid",
          webhook_endpoint_id: webhookEndpointId,
          endpoint_key: endpointKey,
        },
      ],
    },
  ] as const)("rejects an invalid $operation dependency contract", async ({ operation, body }) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, body);
    });
    const gateway = createGateway(baseUrl);
    const promise =
      operation === "authenticate"
        ? gateway.authenticate(accessToken)
        : operation === "organizations"
          ? gateway.listOrganizations(accessToken)
          : gateway.registerMetaApplication(registrationInput());

    await expect(promise).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects an oversized dependency response before JSON parsing", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": 65_537,
        "content-type": "application/json",
      });
      response.end("x");
    });

    await expect(createGateway(baseUrl).authenticate(accessToken)).rejects.toMatchObject({
      kind: "dependency",
    });
  });

  it("accepts an exact 64 KiB dependency response and rejects a larger chunked body", async () => {
    const responseBody = JSON.stringify({ id: userId });
    const exactBody = `${responseBody}${" ".repeat(65_536 - Buffer.byteLength(responseBody))}`;
    const oversizedBody = `${responseBody}${" ".repeat(65_537 - Buffer.byteLength(responseBody))}`;
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const payload = requestCount === 1 ? exactBody : oversizedBody;
      response.writeHead(200, {
        ...(requestCount === 1 ? { "content-length": Buffer.byteLength(payload) } : {}),
        "content-type": "application/json",
      });
      response.end(payload);
    });
    const gateway = createGateway(baseUrl);

    await expect(gateway.authenticate(accessToken)).resolves.toEqual({ userId });
    await expect(gateway.authenticate(accessToken)).rejects.toMatchObject(
      errorContracts.dependency,
    );
  });

  it("accepts 100 normalized organizations and rejects response 101", async () => {
    const rows = Array.from({ length: 101 }, () => ({
      id: organizationId,
      name: ` ${"x".repeat(160)} `,
      status: "active",
    }));
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(response, 200, requestCount === 1 ? rows.slice(0, 100) : rows);
    });
    const gateway = createGateway(baseUrl);

    const organizations = await gateway.listOrganizations(accessToken);
    expect(organizations).toHaveLength(100);
    expect(organizations[0]?.name).toBe("x".repeat(160));
    await expect(gateway.listOrganizations(accessToken)).rejects.toMatchObject(
      errorContracts.dependency,
    );
  });

  it("rejects invalid UTF-8 JSON without exposing its content", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{");
    });

    let capturedError: unknown;
    try {
      await createGateway(baseUrl).authenticate(accessToken);
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject(errorContracts.dependency);
    expect(capturedError).toHaveProperty("cause");
  });

  it("classifies a real dependency timeout and keeps secrets redacted", async () => {
    const baseUrl = await startServer((_request, response) => {
      setTimeout(() => {
        writeJson(response, 200, { id: userId });
      }, 100);
    });
    let capturedError: unknown;

    try {
      await createGateway(baseUrl, 10).authenticate(accessToken);
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({ kind: "timeout", retryable: true });
    expect(JSON.stringify(capturedError)).not.toContain(accessToken.reveal());
    expect(JSON.stringify(capturedError)).not.toContain(serviceSecret);
  });

  it("classifies a real connection refusal as a retryable dependency failure", async () => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, { id: userId });
    });
    const server = servers.pop();
    if (server === undefined) {
      throw new Error("Expected the contract server to be registered");
    }
    await closeServer(server);

    await expect(createGateway(baseUrl).authenticate(accessToken)).rejects.toMatchObject(
      errorContracts.dependency,
    );
  });
});
