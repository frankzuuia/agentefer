import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createFacebookOAuthGraph, type FacebookOAuthGraph } from "../src/facebook-oauth-graph.js";

const servers: Server[] = [];
const appSecretValue = "facebook-app-secret-contract-value";
const pageTokenValue = "facebook-page-access-token-contract-value";

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
  it("builds the versioned Meta dialog with only the required Page scopes", () => {
    const url = new URL(
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v26.0",
        externalAppId: "216409300082702",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    );
    expect(url.origin).toBe("https://www.facebook.com");
    expect(url.pathname).toBe("/v26.0/dialog/oauth");
    expect(url.searchParams.get("scope")).toBe(
      "pages_show_list,pages_read_engagement,pages_manage_posts",
    );
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.has("client_secret")).toBe(false);
  });

  it("exchanges server-side tokens and returns only publish-capable safe Page candidates", async () => {
    const bodies: string[] = [];
    const url = await startServer(async (request, response) => {
      if (request.url === "/v26.0/oauth/access_token") {
        const body = await readBody(request);
        bodies.push(body);
        const parameters = new URLSearchParams(body);
        expect(parameters.get("client_secret")).toBe(appSecretValue);
        writeJson(response, 200, {
          access_token: parameters.has("fb_exchange_token")
            ? "long-lived-user-token-value"
            : "short-lived-user-token-value",
        });
        return;
      }
      if (request.url?.startsWith("/v26.0/me/accounts?")) {
        expect(request.headers.authorization).toBe("Bearer long-lived-user-token-value");
        writeJson(response, 200, {
          data: [
            {
              id: "103456789",
              name: "Llantas Fer",
              access_token: pageTokenValue,
              tasks: ["PROFILE_PLUS_CREATE_CONTENT", "PROFILE_PLUS_MESSAGING"],
            },
            {
              id: "987654321",
              name: "Solo estadísticas",
              access_token: "unreturned-page-token-value",
              tasks: ["PROFILE_PLUS_ANALYZE"],
            },
          ],
        });
        return;
      }
      writeJson(response, 404, {});
    });

    const result = await createGateway(url).exchangeCodeAndListPages(exchangeInput());
    expect(bodies).toHaveLength(2);
    expect(result.candidates).toEqual([
      {
        id: "103456789",
        name: "Llantas Fer",
        tasks: ["PROFILE_PLUS_CREATE_CONTENT", "PROFILE_PLUS_MESSAGING"],
      },
    ]);
    expect(JSON.stringify(result.candidates)).not.toContain(pageTokenValue);
    expect(JSON.parse(result.tokenBundle.reveal())).toEqual([
      { id: "103456789", access_token: pageTokenValue },
    ]);
  });

  it("accepts the shortest supported Graph version", () => {
    const url = new URL(
      createGateway("https://graph.facebook.com").createAuthorizationUrl({
        apiVersion: "v1.0",
        externalAppId: "123",
        redirectUri: "https://agentefer.example.test/callback",
        state: "state-contract-value-with-enough-entropy",
      }),
    );
    expect(url.pathname).toBe("/v1.0/dialog/oauth");
  });

  it.each(["latest", "v", "x1.0", "v.1", "v1.", "v1.2.3", "vA.1", "v1.A", "v10"])(
    "rejects invalid Graph version %s before making a provider request",
    (apiVersion) => {
      expect(() =>
        createGateway("https://graph.facebook.com").createAuthorizationUrl({
          apiVersion,
          externalAppId: "123",
          redirectUri: "https://agentefer.example.test/callback",
          state: "state-contract-value-with-enough-entropy",
        }),
      ).toThrow(expect.objectContaining({ kind: "invalid" }));
    },
  );

  it("maps provider authorization failures without exposing its response", async () => {
    const url = await startServer((_request, response) => {
      writeJson(response, 403, { error: { message: pageTokenValue } });
    });
    await expect(
      createGateway(url).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects accounts without content permission and malformed provider payloads", async () => {
    let tokenCalls = 0;
    const url = await startServer((_request, response) => {
      tokenCalls += 1;
      if (tokenCalls <= 2) {
        writeJson(response, 200, { access_token: "bounded-user-token-value" });
        return;
      }
      writeJson(response, 200, {
        data: [
          {
            id: "123",
            name: "Sin publicar",
            access_token: pageTokenValue,
            tasks: ["PROFILE_PLUS_ANALYZE"],
          },
        ],
      });
    });
    await expect(
      createGateway(url).exchangeCodeAndListPages(exchangeInput()),
    ).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it.each([
    [{ data: [] }, "unauthorized"],
    [{ not_data: [] }, "dependency"],
    [{ data: [null] }, "dependency"],
    [
      {
        data: [
          {
            id: "123",
            name: "Sin tareas",
            access_token: pageTokenValue,
          },
        ],
      },
      "dependency",
    ],
    [
      {
        data: [
          {
            id: "not-decimal",
            name: "Página inválida",
            access_token: pageTokenValue,
            tasks: ["PROFILE_PLUS_CREATE_CONTENT"],
          },
        ],
      },
      "dependency",
    ],
    [
      {
        data: [
          {
            id: "123",
            name: "Duplicada",
            access_token: pageTokenValue,
            tasks: ["PROFILE_PLUS_CREATE_CONTENT"],
          },
          {
            id: "123",
            name: "Duplicada otra vez",
            access_token: pageTokenValue,
            tasks: ["PROFILE_PLUS_FULL_CONTROL"],
          },
        ],
      },
      "dependency",
    ],
    [
      {
        data: [
          {
            id: "123",
            name: "Demasiadas tareas",
            access_token: pageTokenValue,
            tasks: Array.from({ length: 101 }, (_value, index) => `TASK_${String(index)}`),
          },
        ],
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
        tokenCalls <= 2 ? { access_token: "bounded-user-token-value" } : pageResponse,
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
      access_token: `page-access-token-${String(index).padStart(4, "0")}`,
      tasks:
        index === 0
          ? [
              "PROFILE_PLUS_CREATE_CONTENT",
              ...Array.from({ length: 99 }, (_task, taskIndex) => `TASK_${String(taskIndex)}`),
            ]
          : ["PROFILE_PLUS_CREATE_CONTENT"],
    }));
    let tokenCalls = 0;
    const acceptedUrl = await startServer((_request, response) => {
      tokenCalls += 1;
      writeJson(
        response,
        200,
        tokenCalls <= 2
          ? { access_token: "bounded-user-token-value" }
          : { data: pages.slice(0, 100) },
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
        rejectedCalls <= 2 ? { access_token: "bounded-user-token-value" } : { data: pages },
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
