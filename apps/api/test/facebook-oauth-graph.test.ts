import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createFacebookOAuthGraph, type FacebookOAuthGraph } from "../src/facebook-oauth-graph.js";

const servers: Server[] = [];
const appSecretValue = "facebook-app-secret-contract-value";
const systemUserTokenValue = "facebook-system-user-token-contract-value";
const configurationId = "765432109876543";

const writeJson = (response: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json",
  });
  response.end(body);
};

const readBody = async (request: IncomingMessage): Promise<string> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("Expected UTF-8 body");
    body += chunk;
  }
  return body;
};

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
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) resolve();
      else reject(error);
    });
    server.closeAllConnections();
  });
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

const createGateway = (baseUrl: string, timeoutMilliseconds = 250): FacebookOAuthGraph =>
  createFacebookOAuthGraph({
    graphBaseUrl: baseUrl,
    dialogBaseUrl: "https://www.facebook.com",
    timeoutMilliseconds,
  });

const exchangeInput = () => ({
  apiVersion: "v26.0",
  externalAppId: "216409300082702",
  appSecret: new SensitiveValue(appSecretValue),
  redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
  code: "facebook-authorization-code",
});

describe("Facebook OAuth Graph gateway over real TCP", () => {
  it("builds the versioned Meta Business Login dialog without client-side scopes", () => {
    const url = new URL(
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v26.0",
        externalAppId: "216409300082702",
        configurationId,
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    );
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v26.0/dialog/oauth");
    expect(url.searchParams.get("config_id")).toBe(configurationId);
    expect(url.searchParams.has("scope")).toBe(false);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("override_default_response_type")).toBe("true");
    expect(url.searchParams.has("client_secret")).toBe(false);
  });

  it("exchanges a server-side system token and returns only assigned publish-capable Pages", async () => {
    const bodies: string[] = [];
    const url = await startServer(async (request, response) => {
      if (request.url === "/v26.0/oauth/access_token") {
        const body = await readBody(request);
        bodies.push(body);
        const parameters = new URLSearchParams(body);
        expect(parameters.get("client_secret")).toBe(appSecretValue);
        expect(parameters.has("fb_exchange_token")).toBe(false);
        writeJson(response, 200, { access_token: systemUserTokenValue });
        return;
      }
      if (request.url?.startsWith("/v26.0/me?")) {
        expect(request.headers.authorization).toBe(`Bearer ${systemUserTokenValue}`);
        writeJson(response, 200, {
          id: "112233445566778",
          assigned_pages: {
            data: [
              {
                id: "103456789",
                name: "Llantas Fer",
                tasks: ["CREATE_CONTENT", "ANALYZE"],
              },
              {
                id: "987654321",
                name: "Solo estadísticas",
                tasks: ["ANALYZE"],
              },
            ],
          },
        });
        return;
      }
      writeJson(response, 404, {});
    });

    const result = await createGateway(url).exchangeCodeAndListPages(exchangeInput());
    expect(bodies).toHaveLength(1);
    expect(result.candidates).toEqual([
      {
        id: "103456789",
        name: "Llantas Fer",
        tasks: ["ANALYZE", "CREATE_CONTENT"],
      },
    ]);
    expect(JSON.stringify(result.candidates)).not.toContain(systemUserTokenValue);
    expect(JSON.parse(result.tokenBundle.reveal())).toEqual({
      token_type: "business_integration_system_user",
      access_token: systemUserTokenValue,
      page_ids: ["103456789"],
    });
  });

  it("accepts the shortest supported Graph version", () => {
    const url = new URL(
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v1.0",
        externalAppId: "123",
        configurationId,
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    );
    expect(url.pathname).toBe("/v1.0/dialog/oauth");
  });

  it("accepts decimal nines in both Graph version components", () => {
    const url = new URL(
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v19.9",
        externalAppId: "999",
        configurationId: "999999999999999",
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    );

    expect(url.pathname).toBe("/v19.9/dialog/oauth");
  });

  it("rejects a Graph version whose decimal point has no preceding digit", () => {
    expect(() =>
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v.10",
        externalAppId: "123",
        configurationId,
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    ).toThrow(expect.objectContaining({ kind: "invalid" }));
  });

  it("rejects a Graph version whose decimal point has no following digit", () => {
    expect(() =>
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v10.",
        externalAppId: "123",
        configurationId,
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    ).toThrow(expect.objectContaining({ kind: "invalid" }));
  });

  it("rejects a Graph version component below the ASCII decimal range", () => {
    expect(() =>
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v/.1",
        externalAppId: "123",
        configurationId,
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    ).toThrow(expect.objectContaining({ kind: "invalid" }));
  });

  it.each(["/123", ":123", "123/", "123:"])(
    "rejects non-decimal Business Login configuration identifier %s",
    (invalidConfigurationId) => {
      expect(() =>
        createGateway("https://graph.facebook.com").createAuthorizationUrl({
          apiVersion: "v26.0",
          externalAppId: "123",
          configurationId: invalidConfigurationId,
          redirectUri: "https://agentefer.example.test/callback",
          state: "state-contract-value-with-enough-entropy",
        }),
      ).toThrow(expect.objectContaining({ kind: "invalid" }));
    },
  );

  it.each(["latest", "v", "x1.0", "v.1", "v1.", "v1.2.3", "vA.1", "v1.A", "v10", "v100"])(
    "rejects invalid Graph version %s before making a provider request",
    (apiVersion) => {
      expect(() =>
        createGateway("https://graph.facebook.com").createAuthorizationUrl({
          apiVersion,
          externalAppId: "123",
          configurationId,
          redirectUri: "https://agentefer.example.test/callback",
          state: "state-contract-value-with-enough-entropy",
        }),
      ).toThrow(expect.objectContaining({ kind: "invalid" }));
    },
  );

  it("maps provider authorization failures without exposing its response", async () => {
    const url = await startServer((_request, response) => {
      writeJson(response, 403, { error: { message: systemUserTokenValue } });
    });
    await expect(
      createGateway(url).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects accounts without content permission and malformed provider payloads", async () => {
    let tokenCalls = 0;
    const url = await startServer((_request, response) => {
      tokenCalls += 1;
      if (tokenCalls === 1) {
        writeJson(response, 200, { access_token: systemUserTokenValue });
        return;
      }
      writeJson(response, 200, {
        assigned_pages: {
          data: [{ id: "123", name: "Sin publicar", tasks: ["ANALYZE"] }],
        },
      });
    });
    await expect(
      createGateway(url).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it.each([
    [{ assigned_pages: { data: [] } }, "unauthorized"],
    [{ not_assigned_pages: [] }, "dependency"],
    [{ assigned_pages: { data: [null] } }, "dependency"],
    [
      {
        assigned_pages: {
          data: [
            {
              id: "123",
              name: "Sin tareas",
            },
          ],
        },
      },
      "dependency",
    ],
    [
      {
        assigned_pages: {
          data: [
            {
              id: "not-decimal",
              name: "Página inválida",
              tasks: ["CREATE_CONTENT"],
            },
          ],
        },
      },
      "dependency",
    ],
    [
      {
        assigned_pages: {
          data: [
            {
              id: "123",
              name: "Duplicada",
              tasks: ["CREATE_CONTENT"],
            },
            {
              id: "123",
              name: "Duplicada otra vez",
              tasks: ["MANAGE"],
            },
          ],
        },
      },
      "dependency",
    ],
    [
      {
        assigned_pages: {
          data: [
            {
              id: "123",
              name: "Demasiadas tareas",
              tasks: Array.from({ length: 101 }, (_value, index) => `TASK_${String(index)}`),
            },
          ],
        },
      },
      "dependency",
    ],
  ] as const)("rejects the bounded Page payload %#", async (pageResponse, kind) => {
    let tokenCalls = 0;
    const url = await startServer((_request, response) => {
      tokenCalls += 1;
      writeJson(
        response,
        200,
        tokenCalls === 1 ? { access_token: systemUserTokenValue } : pageResponse,
      );
    });
    await expect(
      createGateway(url).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind });
  });

  it("accepts exactly 100 Pages and 100 tasks but rejects Page 101", async () => {
    const pages = Array.from({ length: 101 }, (_value, index) => ({
      id: String(100_000 + index),
      name: `Página ${String(index)}`,
      tasks:
        index === 0
          ? [
              "CREATE_CONTENT",
              ...Array.from({ length: 99 }, (_task, taskIndex) => `TASK_${String(taskIndex)}`),
            ]
          : ["CREATE_CONTENT"],
    }));
    let tokenCalls = 0;
    const acceptedUrl = await startServer((_request, response) => {
      tokenCalls += 1;
      writeJson(
        response,
        200,
        tokenCalls === 1
          ? { access_token: systemUserTokenValue }
          : { assigned_pages: { data: pages.slice(0, 100) } },
      );
    });
    const accepted = await createGateway(acceptedUrl).exchangeCodeAndListPages(exchangeInput());
    expect(accepted.candidates).toHaveLength(100);

    let rejectedCalls = 0;
    const rejectedUrl = await startServer((_request, response) => {
      rejectedCalls += 1;
      writeJson(
        response,
        200,
        rejectedCalls === 1
          ? { access_token: systemUserTokenValue }
          : { assigned_pages: { data: pages } },
      );
    });
    await expect(
      createGateway(rejectedUrl).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects malformed JSON and oversized declared provider responses", async () => {
    const malformedUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end("not-json");
    });
    await expect(
      createGateway(malformedUrl).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "dependency" });

    const oversizedUrl = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": "999999",
        "content-type": "application/json",
      });
      response.end("{}");
    });
    await expect(
      createGateway(oversizedUrl).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "dependency" });
  });
});
