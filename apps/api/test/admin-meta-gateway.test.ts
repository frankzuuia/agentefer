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
const channelConnectionId = "b4032000-0000-4000-8000-000000000006";
const appSecret = "real-meta-app-secret-contract-value";
const verifyToken = "real-meta-verify-token-contract-value";
const channelAccessToken = "real-meta-channel-access-token-contract-value";

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

const whatsappRegistrationInput = () => ({
  organizationId,
  metaApplicationId,
  wabaId: "111111111111111",
  phoneNumberId: "222222222222222",
  displayPhoneNumber: "+52 664 555 0101",
  verifiedName: "AgenteFer Pruebas",
  qualityRating: "GREEN",
  nameStatus: "APPROVED",
  tokenType: "SYSTEM_USER",
  grantedScopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
  tokenExpiresAt: "2100-01-01T00:00:00.000Z",
  accessToken: new SensitiveValue(channelAccessToken),
  actorUserId: userId,
  requestId: "request-admin-meta-whatsapp-contract",
  traceId: "fedcba9876543210fedcba9876543210",
});

describe("admin Meta Supabase gateway over real TCP", () => {
  it.each(Object.entries(errorContracts))(
    "exposes the exact redacted %s operational error contract",
    (kind, contract) => {
      const error = new AdminMetaGatewayError(
        kind as keyof typeof errorContracts,
        new Error(appSecret),
      );

      expect(error).toMatchObject({
        name: "AdminMetaGatewayError",
        kind,
        ...contract,
      });
      expect(JSON.stringify(error)).not.toContain(appSecret);
    },
  );

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

  it("lists tenant Meta state through RLS and registers the exact WhatsApp RPC", async () => {
    const rpcBodies: Readonly<Record<string, unknown>>[] = [];
    const baseUrl = await startServer(async (request, response) => {
      expect(request.headers.accept).toBe("application/json");
      const url = new URL(request.url ?? "", baseUrl);

      if (url.pathname === "/rest/v1/meta_applications") {
        expect(request.method).toBe("GET");
        expect(request.headers.apikey).toBe(publishableKey);
        expect(request.headers.authorization).toBe(`Bearer ${accessToken.reveal()}`);
        expect(request.headers["accept-profile"]).toBe("api");
        expect(url.searchParams.get("select")).toBe(
          "id,organization_id,external_app_id,display_name,api_version,status",
        );
        expect(url.searchParams.get("organization_id")).toBe(`eq.${organizationId}`);
        expect(url.searchParams.get("status")).toBe("eq.active");
        expect(url.searchParams.get("order")).toBe("display_name.asc");
        expect(url.searchParams.get("limit")).toBe("100");
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
        expect(request.method).toBe("GET");
        expect(request.headers.apikey).toBe(publishableKey);
        expect(request.headers.authorization).toBe(`Bearer ${accessToken.reveal()}`);
        expect(request.headers["accept-profile"]).toBe("api");
        expect(url.searchParams.get("select")).toBe(
          "id,organization_id,meta_application_id,waba_id,phone_number_id," +
            "display_phone_number,verified_name,api_version,status,connected_at",
        );
        expect(url.searchParams.get("organization_id")).toBe(`eq.${organizationId}`);
        expect(url.searchParams.get("status")).toBe("eq.active");
        expect(url.searchParams.get("order")).toBe("created_at.desc");
        expect(url.searchParams.get("limit")).toBe("100");
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

      if (url.pathname === "/rest/v1/rpc/register_meta_whatsapp_connection") {
        expect(request.method).toBe("POST");
        expect(request.headers.apikey).toBe(serviceSecret);
        expect(request.headers["accept-profile"]).toBe("api");
        expect(request.headers["content-profile"]).toBe("api");
        expect(request.headers["content-type"]).toBe("application/json");
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
    const gateway = createGateway(baseUrl);

    await expect(gateway.listMetaApplications(accessToken, organizationId)).resolves.toEqual([
      {
        id: metaApplicationId,
        organizationId,
        externalAppId: "216409300082702",
        displayName: "AgenteFer - Pruebas Frank",
        apiVersion: "v26.0",
        status: "active",
      },
    ]);
    await expect(gateway.listMetaWhatsAppConnections(accessToken, organizationId)).resolves.toEqual(
      [
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
    );
    await expect(
      gateway.registerMetaWhatsAppConnection(whatsappRegistrationInput()),
    ).resolves.toEqual({
      channelConnectionId,
      displayPhoneNumber: "+52 664 555 0101",
      verifiedName: "AgenteFer Pruebas",
      status: "active",
    });

    expect(rpcBodies).toHaveLength(1);
    expect(rpcBodies[0]).toEqual({
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
      target_data_access_expires_at: null,
      target_access_token: channelAccessToken,
      target_actor_user_id: userId,
      target_correlation_id: "request-admin-meta-whatsapp-contract",
      target_trace_id: "fedcba9876543210fedcba9876543210",
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

  it("maps a WhatsApp registration conflict without exposing its token", async () => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 409, { diagnostic: channelAccessToken });
    });

    let capturedError: unknown;
    try {
      await createGateway(baseUrl).registerMetaWhatsAppConnection(whatsappRegistrationInput());
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({
      name: "AdminMetaGatewayError",
      kind: "conflict",
      ...errorContracts.conflict,
    });
    expect(JSON.stringify(capturedError)).not.toContain(channelAccessToken);
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

  it.each([
    {
      operation: "applications",
      body: {},
    },
    {
      operation: "applications",
      body: [null],
    },
    {
      operation: "applications",
      body: [[]],
    },
    {
      operation: "applications",
      body: [
        {
          id: metaApplicationId,
          organization_id: organizationId,
          external_app_id: "216409300082702",
          display_name: "AgenteFer",
          api_version: "v26.0",
          status: "inactive",
        },
      ],
    },
    {
      operation: "applications",
      body: [
        {
          id: metaApplicationId,
          organization_id: "b4032000-0000-4000-8000-000000000099",
          external_app_id: "216409300082702",
          display_name: "AgenteFer",
          api_version: "v26.0",
          status: "active",
        },
      ],
    },
    {
      operation: "applications",
      body: [
        {
          id: metaApplicationId,
          organization_id: organizationId,
          external_app_id: "",
          display_name: "AgenteFer",
          api_version: "v26.0",
          status: "active",
        },
      ],
    },
    {
      operation: "whatsapp-connections",
      body: {},
    },
    {
      operation: "whatsapp-connections",
      body: [null],
    },
    {
      operation: "whatsapp-connections",
      body: [[]],
    },
    {
      operation: "whatsapp-connections",
      body: [
        {
          id: channelConnectionId,
          organization_id: organizationId,
          meta_application_id: metaApplicationId,
          waba_id: "111111111111111",
          phone_number_id: "222222222222222",
          display_phone_number: "+52 664 555 0101",
          verified_name: "AgenteFer",
          api_version: "v26.0",
          status: "inactive",
          connected_at: "2026-08-20T14:00:00.000Z",
        },
      ],
    },
    {
      operation: "whatsapp-connections",
      body: [
        {
          id: channelConnectionId,
          organization_id: "b4032000-0000-4000-8000-000000000099",
          meta_application_id: metaApplicationId,
          waba_id: "111111111111111",
          phone_number_id: "222222222222222",
          display_phone_number: "+52 664 555 0101",
          verified_name: "AgenteFer",
          api_version: "v26.0",
          status: "active",
          connected_at: "2026-08-20T14:00:00.000Z",
        },
      ],
    },
    {
      operation: "whatsapp-connections",
      body: [
        {
          id: channelConnectionId,
          organization_id: organizationId,
          meta_application_id: metaApplicationId,
          waba_id: "111111111111111",
          phone_number_id: "222222222222222",
          display_phone_number: "+52 664 555 0101",
          verified_name: "AgenteFer",
          api_version: "v26.0",
          status: "active",
          connected_at: "not-a-timestamp",
        },
      ],
    },
  ] as const)("rejects an invalid $operation collection contract", async ({ operation, body }) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, body);
    });
    const gateway = createGateway(baseUrl);
    const promise =
      operation === "applications"
        ? gateway.listMetaApplications(accessToken, organizationId)
        : gateway.listMetaWhatsAppConnections(accessToken, organizationId);

    await expect(promise).rejects.toMatchObject(errorContracts.dependency);
  });

  it.each(["applications", "whatsapp-connections"] as const)(
    "accepts 100 %s rows and rejects response 101",
    async (operation) => {
      const applicationRow = {
        id: metaApplicationId,
        organization_id: organizationId,
        external_app_id: "216409300082702",
        display_name: "AgenteFer",
        api_version: "v26.0",
        status: "active",
      };
      const connectionRow = {
        id: channelConnectionId,
        organization_id: organizationId,
        meta_application_id: metaApplicationId,
        waba_id: "111111111111111",
        phone_number_id: "222222222222222",
        display_phone_number: "+52 664 555 0101",
        verified_name: "AgenteFer",
        api_version: "v26.0",
        status: "active",
        connected_at: "2026-08-20T14:00:00.000Z",
      };
      const rows = Array.from({ length: 101 }, () =>
        operation === "applications" ? applicationRow : connectionRow,
      );
      let requestCount = 0;
      const baseUrl = await startServer((_request, response) => {
        requestCount += 1;
        writeJson(response, 200, requestCount === 1 ? rows.slice(0, 100) : rows);
      });
      const gateway = createGateway(baseUrl);
      const invoke = () =>
        operation === "applications"
          ? gateway.listMetaApplications(accessToken, organizationId)
          : gateway.listMetaWhatsAppConnections(accessToken, organizationId);

      await expect(invoke()).resolves.toHaveLength(100);
      await expect(invoke()).rejects.toMatchObject(errorContracts.dependency);
    },
  );

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
