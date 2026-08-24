import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createMetaGraphGateway,
  MetaGraphGatewayError,
  type MetaGraphGateway,
} from "../src/meta-graph-gateway.js";

const servers: Server[] = [];
const accessTokenValue = "meta-system-user-access-token-contract-value";
const accessToken = new SensitiveValue(accessTokenValue);
const appId = "216409300082702";
const wabaId = "111111111111111";
const phoneNumberId = "222222222222222";

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

const createGateway = (baseUrl: string, timeoutMilliseconds = 200): MetaGraphGateway =>
  createMetaGraphGateway({ baseUrl, timeoutMilliseconds });

const validationInput = () => ({
  apiVersion: "v26.0",
  expectedAppId: appId,
  wabaId,
  phoneNumberId,
  accessToken,
});

const validDebugToken = () => ({
  data: {
    app_id: appId,
    type: "SYSTEM_USER",
    is_valid: true,
    expires_at: 4_102_444_800,
    data_access_expires_at: 4_102_444_800,
    scopes: [
      "whatsapp_business_messaging",
      "whatsapp_business_management",
      "whatsapp_business_messaging",
    ],
    granular_scopes: [
      {
        scope: "pages_messaging",
        target_ids: [],
      },
      {
        scope: "whatsapp_business_management",
        target_ids: [wabaId],
      },
    ],
  },
});

describe("Meta Graph gateway over real TCP", () => {
  it.each([
    {
      kind: "invalid",
      code: "META_GRAPH_INVALID",
      category: "validation",
      retryable: false,
      severity: "warning",
    },
    {
      kind: "unauthorized",
      code: "META_GRAPH_UNAUTHORIZED",
      category: "authorization",
      retryable: false,
      severity: "warning",
    },
    {
      kind: "timeout",
      code: "META_GRAPH_TIMEOUT",
      category: "timeout",
      retryable: true,
      severity: "error",
    },
    {
      kind: "dependency",
      code: "META_GRAPH_DEPENDENCY",
      category: "dependency",
      retryable: true,
      severity: "error",
    },
  ] as const)("preserves the complete $kind error contract", (expected) => {
    const error = new MetaGraphGatewayError(expected.kind);

    expect(error).toMatchObject(expected);
    expect(error.name).toBe("MetaGraphGatewayError");
  });

  it("preserves only bounded provider diagnostics without serializing its cause", () => {
    const error = new MetaGraphGatewayError("dependency", new Error(accessTokenValue), {
      stage: "phone_lookup",
      checkpoint: "phone_identity",
      providerStatus: 429,
      providerErrorCode: 4,
    });

    expect(error).toMatchObject({
      kind: "dependency",
      stage: "phone_lookup",
      checkpoint: "phone_identity",
      providerStatus: 429,
      providerErrorCode: 4,
    });
    expect(JSON.stringify(error)).not.toContain(accessTokenValue);
  });

  it("validates the token, follows bounded phone pagination and subscribes the WABA", async () => {
    const requests: string[] = [];
    const baseUrl = await startServer((request, response) => {
      expect(request.headers.authorization).toBe(`Bearer ${accessTokenValue}`);
      expect(request.headers.accept).toBe("application/json");
      const url = new URL(request.url ?? "", baseUrl);
      requests.push(`${request.method ?? ""} ${url.pathname}`);

      if (url.pathname === "/v26.0/debug_token") {
        expect(request.method).toBe("GET");
        expect(url.searchParams.get("input_token")).toBe(accessTokenValue);
        writeJson(response, 200, validDebugToken());
        return;
      }

      if (url.pathname === `/v26.0/${wabaId}/phone_numbers`) {
        expect(request.method).toBe("GET");
        expect(url.searchParams.get("fields")).toBe(
          "id,display_phone_number,verified_name,quality_rating,name_status",
        );
        expect(url.searchParams.get("limit")).toBe("100");
        if (url.searchParams.get("after") === null) {
          writeJson(response, 200, {
            data: [
              {
                id: "222222222222221",
                display_phone_number: "+52 664 555 0100",
                verified_name: "Otro número",
              },
            ],
            paging: { cursors: { after: "next-page-cursor" } },
          });
          return;
        }
        expect(url.searchParams.get("after")).toBe("next-page-cursor");
        writeJson(response, 200, {
          data: [
            {
              id: phoneNumberId,
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
              quality_rating: "GREEN",
              name_status: "APPROVED",
            },
          ],
        });
        return;
      }

      if (url.pathname === `/v26.0/${wabaId}/subscribed_apps`) {
        expect(request.method).toBe("POST");
        writeJson(response, 200, { success: true });
        return;
      }

      writeJson(response, 404, { error: { code: 100 } });
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).resolves.toEqual({
      displayPhoneNumber: "+52 664 555 0101",
      verifiedName: "AgenteFer Pruebas",
      qualityRating: "GREEN",
      nameStatus: "APPROVED",
      tokenType: "SYSTEM_USER",
      grantedScopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
      tokenExpiresAt: "2100-01-01T00:00:00.000Z",
      dataAccessExpiresAt: "2100-01-01T00:00:00.000Z",
    });
    expect(requests).toEqual([
      "GET /v26.0/debug_token",
      `GET /v26.0/${wabaId}/phone_numbers`,
      `GET /v26.0/${wabaId}/phone_numbers`,
      `POST /v26.0/${wabaId}/subscribed_apps`,
    ]);
  });

  it("accepts exact provider metadata and response boundaries", async () => {
    let requestCount = 0;
    const exactScopes = [
      "whatsapp_business_management",
      "whatsapp_business_messaging",
      "x",
      "x".repeat(160),
      ...Array.from({ length: 96 }, (_, index) => `scope-${String(index)}`),
    ];
    const exactGranularScopes = [
      ...Array.from({ length: 99 }, (_, index) => ({
        scope: `unrelated-${String(index)}`,
        target_ids: [],
      })),
      {
        scope: "whatsapp_business_management",
        target_ids: [...Array.from({ length: 9_999 }, () => "1"), wabaId],
      },
    ];
    const exactPhonePage = [
      ...Array.from({ length: 99 }, (_, index) => ({
        id: `3333333333333${String(index).padStart(2, "0")}`,
        display_phone_number: `+52 664 555 ${String(index).padStart(4, "0")}`,
        verified_name: `Otro ${String(index)}`,
      })),
      {
        id: phoneNumberId,
        display_phone_number: "+52 664 555 0101",
        verified_name: "AgenteFer Pruebas",
      },
    ];
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const bodies: unknown[] = [
        {
          data: {
            app_id: ` ${appId} `,
            type: "T",
            is_valid: true,
            expires_at: 4_102_444_800,
            data_access_expires_at: 4_102_444_800,
            scopes: exactScopes,
            granular_scopes: exactGranularScopes,
          },
        },
        { data: exactPhonePage },
        { success: true },
      ];
      writeJson(response, 200, bodies[requestCount - 1]);
    });

    const result =
      await createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput());

    expect(result.tokenType).toBe("T");
    expect(result.grantedScopes).toHaveLength(100);
    expect(result.grantedScopes).toContain("x");
    expect(result.grantedScopes).toContain("x".repeat(160));
    expect(result.displayPhoneNumber).toBe("+52 664 555 0101");
    expect(requestCount).toBe(3);
  });

  it("accepts a valid Graph response at exactly 64 KiB", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      if (requestCount === 1) {
        const basePayload = JSON.stringify({ ...validDebugToken(), padding: "" });
        const payload = JSON.stringify({
          ...validDebugToken(),
          padding: "x".repeat(65_536 - Buffer.byteLength(basePayload)),
        });
        expect(Buffer.byteLength(payload)).toBe(65_536);
        response.writeHead(200, {
          "content-length": Buffer.byteLength(payload),
          "content-type": "application/json",
        });
        response.end(payload);
        return;
      }
      writeJson(
        response,
        200,
        requestCount === 2
          ? {
              data: [
                {
                  id: phoneNumberId,
                  display_phone_number: "+52 664 555 0101",
                  verified_name: "AgenteFer Pruebas",
                },
              ],
            }
          : { success: true },
      );
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).resolves.toMatchObject({ displayPhoneNumber: "+52 664 555 0101" });
    expect(requestCount).toBe(3);
  });

  it("accepts unscoped non-expiring token metadata without fabricating optional facts", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const bodies: unknown[] = [
        {
          data: {
            app_id: appId,
            type: "SYSTEM_USER",
            is_valid: true,
            expires_at: null,
            data_access_expires_at: null,
            scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
          },
        },
        {
          data: [
            {
              id: phoneNumberId,
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
              quality_rating: null,
              name_status: null,
            },
          ],
        },
        { success: true },
      ];
      writeJson(response, 200, bodies[requestCount - 1]);
    });

    const result =
      await createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput());
    expect(result).toEqual({
      displayPhoneNumber: "+52 664 555 0101",
      verifiedName: "AgenteFer Pruebas",
      tokenType: "SYSTEM_USER",
      grantedScopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
    });
    expect(Object.hasOwn(result, "qualityRating")).toBe(false);
    expect(Object.hasOwn(result, "nameStatus")).toBe(false);
    expect(Object.hasOwn(result, "tokenExpiresAt")).toBe(false);
    expect(Object.hasOwn(result, "dataAccessExpiresAt")).toBe(false);
    expect(requestCount).toBe(3);
  });

  it.each([
    {
      name: "invalid token",
      mutate: (body: ReturnType<typeof validDebugToken>) => {
        body.data.is_valid = false;
      },
      kind: "unauthorized",
    },
    {
      name: "wrong App",
      mutate: (body: ReturnType<typeof validDebugToken>) => {
        body.data.app_id = "216409300082799";
      },
      kind: "unauthorized",
    },
    {
      name: "missing messaging permission",
      mutate: (body: ReturnType<typeof validDebugToken>) => {
        body.data.scopes = ["whatsapp_business_management"];
      },
      kind: "unauthorized",
    },
  ] as const)("rejects $name before reading phone assets", async ({ mutate, kind }) => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const body = validDebugToken();
      mutate(body);
      writeJson(response, 200, body);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind });
    expect(requestCount).toBe(1);
  });

  it.each([
    { name: "missing token envelope", body: {}, kind: "dependency" },
    {
      name: "non-string App ID",
      body: { data: { ...validDebugToken().data, app_id: 7 } },
      kind: "dependency",
    },
    {
      name: "non-array scopes",
      body: { data: { ...validDebugToken().data, scopes: "all" } },
      kind: "dependency",
    },
    {
      name: "empty normalized token type",
      body: { data: { ...validDebugToken().data, type: " " } },
      kind: "dependency",
    },
    {
      name: "oversized token type",
      body: { data: { ...validDebugToken().data, type: "x".repeat(65) } },
      kind: "dependency",
    },
    {
      name: "control character in a scope",
      body: {
        data: {
          ...validDebugToken().data,
          scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
            "invalid\u0000scope",
          ],
        },
      },
      kind: "dependency",
    },
    {
      name: "invalid expiration metadata",
      body: { data: { ...validDebugToken().data, expires_at: -1 } },
      kind: "dependency",
    },
    {
      name: "non-numeric expiration metadata",
      body: { data: { ...validDebugToken().data, expires_at: "4102444800" } },
      kind: "dependency",
    },
    {
      name: "too many token scopes",
      body: {
        data: {
          ...validDebugToken().data,
          scopes: [
            "whatsapp_business_management",
            "whatsapp_business_messaging",
            ...Array.from({ length: 99 }, (_, index) => `extra-${String(index)}`),
          ],
        },
      },
      kind: "dependency",
    },
    {
      name: "out-of-range expiration metadata",
      body: { data: { ...validDebugToken().data, expires_at: Number.MAX_SAFE_INTEGER } },
      kind: "dependency",
    },
    {
      name: "expired token",
      body: { data: { ...validDebugToken().data, expires_at: 1 } },
      kind: "unauthorized",
    },
    {
      name: "expired data access",
      body: { data: { ...validDebugToken().data, data_access_expires_at: 1 } },
      kind: "unauthorized",
    },
  ] as const)("rejects $name as $kind", async ({ body, kind }) => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(response, 200, body);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind });
    expect(requestCount).toBe(1);
  });

  it.each([
    { status: 400, code: 190, kind: "unauthorized" },
    { status: 400, code: 10, kind: "unauthorized" },
    { status: 400, code: 100, kind: "invalid" },
    { status: 400, code: 200, kind: "unauthorized" },
    { status: 400, code: 294, kind: "unauthorized" },
    { status: 401, code: 190, kind: "unauthorized" },
    { status: 403, code: 200, kind: "unauthorized" },
    { status: 404, code: 100, kind: "invalid" },
    { status: 422, code: 100, kind: "invalid" },
    { status: 429, code: 4, kind: "dependency" },
    { status: 500, code: 1, kind: "dependency" },
  ] as const)(
    "maps Graph status $status and code $code to $kind",
    async ({ status, code, kind }) => {
      const baseUrl = await startServer((_request, response) => {
        writeJson(response, status, { error: { code, message: accessTokenValue } });
      });
      let capturedError: unknown;
      try {
        await createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput());
      } catch (error) {
        capturedError = error;
      }

      expect(capturedError).toBeInstanceOf(MetaGraphGatewayError);
      expect(capturedError).toMatchObject({
        kind,
        stage: "token_debug",
        checkpoint: "provider_response",
        providerStatus: status,
        providerErrorCode: code,
      });
      expect(JSON.stringify(capturedError)).not.toContain(accessTokenValue);
    },
  );

  it("maps a Graph 400 response without a structured error to invalid", async () => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 400, {});
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({
      kind: "invalid",
      stage: "token_debug",
      checkpoint: "provider_response",
      providerStatus: 400,
    });
  });

  it.each([
    {
      name: "missing token data",
      body: {},
      checkpoint: "token_response",
    },
    {
      name: "malformed permission collection",
      body: { data: { ...validDebugToken().data, scopes: "not-an-array" } },
      checkpoint: "token_permissions",
    },
    {
      name: "missing token type",
      body: { data: { ...validDebugToken().data, type: undefined } },
      checkpoint: "token_metadata",
    },
  ] as const)("identifies the safe checkpoint for $name", async ({ body, checkpoint }) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, body);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({
      kind: "dependency",
      stage: "token_debug",
      checkpoint,
    });
  });

  it.each([
    { name: "missing", granularScopes: undefined },
    { name: "null", granularScopes: null },
    { name: "object", granularScopes: { provider: "variant" } },
    { name: "malformed item", granularScopes: [null] },
    {
      name: "different target",
      granularScopes: [
        {
          scope: "whatsapp_business_management",
          target_ids: ["111111111111199"],
        },
      ],
    },
  ] as const)(
    "uses the live WABA and phone resource as authority when granular scopes are $name",
    async ({ granularScopes }) => {
      let requestCount = 0;
      const baseUrl = await startServer((_request, response) => {
        requestCount += 1;
        const bodies: unknown[] = [
          {
            data: {
              ...validDebugToken().data,
              granular_scopes: granularScopes,
            },
          },
          {
            data: [
              {
                id: phoneNumberId,
                display_phone_number: "+52 664 555 0101",
                verified_name: "AgenteFer Pruebas",
              },
            ],
          },
          { success: true },
        ];
        writeJson(response, 200, bodies[requestCount - 1]);
      });

      await expect(
        createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
      ).resolves.toMatchObject({
        displayPhoneNumber: "+52 664 555 0101",
        verifiedName: "AgenteFer Pruebas",
      });
      expect(requestCount).toBe(3);
    },
  );

  it.each([
    { name: "missing data", body: { paging: {} } },
    {
      name: "oversized data page",
      body: {
        data: Array.from({ length: 101 }, (_, index) => ({
          id: `333333333333${String(index).padStart(3, "0")}`,
          display_phone_number: `+52 664 555 ${String(index).padStart(4, "0")}`,
          verified_name: `Otro ${String(index)}`,
        })),
      },
    },
    { name: "non-record candidate", body: { data: [null] } },
    {
      name: "non-string candidate ID",
      body: {
        data: [
          {
            id: 222_222,
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer Pruebas",
          },
        ],
      },
    },
    {
      name: "control character in verified name",
      body: {
        data: [
          {
            id: phoneNumberId,
            display_phone_number: "+52 664 555 0101",
            verified_name: "AgenteFer\u0000Pruebas",
          },
        ],
      },
    },
  ] as const)("rejects phone page with $name", async ({ body }) => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(response, 200, requestCount === 1 ? validDebugToken() : body);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
    expect(requestCount).toBe(2);
  });

  it("rejects a phone number that does not belong to the supplied WABA", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(
        response,
        200,
        requestCount === 1
          ? validDebugToken()
          : {
              data: [
                {
                  id: "222222222222299",
                  display_phone_number: "+52 664 555 0199",
                  verified_name: "Número ajeno",
                },
              ],
            },
      );
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requestCount).toBe(2);
  });

  it("classifies a present paging object without an after cursor as invalid", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(
        response,
        200,
        requestCount === 1 ? validDebugToken() : { data: [], paging: { cursors: {} } },
      );
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requestCount).toBe(2);
  });

  it("rejects repeated pagination cursors without making an unbounded request loop", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(
        response,
        200,
        requestCount === 1
          ? validDebugToken()
          : { data: [], paging: { cursors: { after: "same-cursor" } } },
      );
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
    expect(requestCount).toBe(3);
  });

  it("requires Meta to acknowledge the WABA subscription", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const bodies = [
        validDebugToken(),
        {
          data: [
            {
              id: phoneNumberId,
              display_phone_number: "+52 664 555 0101",
              verified_name: "AgenteFer Pruebas",
            },
          ],
        },
        { success: false },
      ];
      writeJson(response, 200, bodies[requestCount - 1]);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
    expect(requestCount).toBe(3);
  });

  it.each([
    { apiVersion: "26.0", wabaId, phoneNumberId },
    { apiVersion: "v26.0/path", wabaId, phoneNumberId },
    { apiVersion: "126.0", wabaId, phoneNumberId },
    { apiVersion: "v.12", wabaId, phoneNumberId },
    { apiVersion: "v12.", wabaId, phoneNumberId },
    { apiVersion: "v/.1", wabaId, phoneNumberId },
    { apiVersion: "v:.1", wabaId, phoneNumberId },
    { apiVersion: "v123", wabaId, phoneNumberId },
    { apiVersion: "v123.", wabaId, phoneNumberId },
    { apiVersion: "v26.0", wabaId: "", phoneNumberId },
    { apiVersion: "v26.0", wabaId: "1".repeat(65), phoneNumberId },
    { apiVersion: "v26.0", wabaId: "../debug_token", phoneNumberId },
    { apiVersion: "v26.0", wabaId, phoneNumberId: "phone/id" },
  ])("rejects unsafe routing identifiers before network I/O", async (override) => {
    await expect(
      createGateway("http://127.0.0.1:9").validateAndSubscribeWhatsAppConnection({
        ...validationInput(),
        ...override,
      }),
    ).rejects.toMatchObject({ kind: "invalid" });
  });

  it.each([
    { name: "minimum Graph version", override: { apiVersion: "v1.0" } },
    { name: "nine-major Graph version", override: { apiVersion: "v9.0" } },
    { name: "zero WABA identifier", override: { wabaId: "0" } },
    { name: "nine Phone Number identifier", override: { phoneNumberId: "9" } },
    { name: "64 digit identifiers", override: { wabaId: "1".repeat(64) } },
  ])("accepts the $name as safe routing before network I/O", async ({ override }) => {
    await expect(
      createGateway("http://127.0.0.1:9").validateAndSubscribeWhatsAppConnection({
        ...validationInput(),
        ...override,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each(["v.1", "v1.", "v1.2.3", "vA.1", "v1.A", "v10"])(
    "rejects malformed Graph version %s before network I/O",
    async (apiVersion) => {
      await expect(
        createGateway("http://127.0.0.1:9").validateAndSubscribeWhatsAppConnection({
          ...validationInput(),
          apiVersion,
        }),
      ).rejects.toMatchObject({ kind: "invalid" });
    },
  );

  it("stops after the configured fifty phone pages", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      writeJson(
        response,
        200,
        requestCount === 1
          ? validDebugToken()
          : {
              data: [],
              paging: { cursors: { after: `cursor-${String(requestCount)}` } },
            },
      );
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
    expect(requestCount).toBe(51);
  });

  it("rejects an oversized Graph response before parsing it", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": 65_537,
        "content-type": "application/json",
      });
      response.end("x");
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects an oversized streamed Graph response without trusting a length header", async () => {
    let requestCount = 0;
    const baseUrl = await startServer((_request, response) => {
      requestCount += 1;
      const payload = JSON.stringify({
        ...validDebugToken(),
        padding: "x".repeat(65_537),
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(payload);
    });

    await expect(
      createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
    expect(requestCount).toBe(1);
  });

  it("rejects malformed Graph JSON", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("{not-json");
    });

    let capturedError: unknown;
    try {
      await createGateway(baseUrl).validateAndSubscribeWhatsAppConnection(validationInput());
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({ kind: "dependency" });
    expect((capturedError as Error).cause).toBeInstanceOf(SyntaxError);
  });

  it("removes query and fragment contamination from the configured Graph origin", async () => {
    let requestCount = 0;
    const origin = await startServer((request, response) => {
      requestCount += 1;
      const requestUrl = new URL(request.url ?? "", origin);
      expect(requestUrl.searchParams.has("poison")).toBe(false);
      writeJson(response, 200, requestCount === 1 ? validDebugToken() : { data: [] });
    });

    await expect(
      createGateway(`${origin}?poison=1#fragment`).validateAndSubscribeWhatsAppConnection(
        validationInput(),
      ),
    ).rejects.toMatchObject({ kind: "invalid" });
    expect(requestCount).toBe(2);
  });

  it("classifies a real timeout and keeps the token redacted", async () => {
    const baseUrl = await startServer((_request, response) => {
      setTimeout(() => {
        writeJson(response, 200, validDebugToken());
      }, 100);
    });
    let capturedError: unknown;
    try {
      await createGateway(baseUrl, 10).validateAndSubscribeWhatsAppConnection(validationInput());
    } catch (error) {
      capturedError = error;
    }

    expect(capturedError).toMatchObject({ kind: "timeout", retryable: true });
    expect(JSON.stringify(capturedError)).not.toContain(accessTokenValue);
  });
});
