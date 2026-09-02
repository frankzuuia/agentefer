import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createFacebookOAuthRpc, type FacebookOAuthRpc } from "../src/facebook-oauth-rpc.js";

const servers: Server[] = [];
const serviceSecret = "sb_secret_facebook_oauth_contract";
const actorUserId = "b4070000-0000-4000-8000-000000000001";
const organizationId = "b4071000-0000-4000-8000-000000000001";
const oauthSessionId = "b4072000-0000-4000-8000-000000000001";
const leaseToken = "b4073000-0000-4000-8000-000000000001";
const connectionId = "b4074000-0000-4000-8000-000000000001";
const appSecret = "meta-app-secret-rpc-contract-value";
const pageToken = "meta-page-token-rpc-contract-value";

const writeJson = (response: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json",
  });
  response.end(body);
};

const readJsonBody = async (
  request: IncomingMessage,
): Promise<Readonly<Record<string, unknown>>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("Expected UTF-8 body");
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
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

const createRpc = (supabaseUrl: string, timeoutMilliseconds = 250): FacebookOAuthRpc =>
  createFacebookOAuthRpc({
    supabaseUrl,
    secretKey: new SensitiveValue(serviceSecret),
    timeoutMilliseconds,
  });

describe("Facebook OAuth Supabase RPC gateway over real TCP", () => {
  it("executes the complete owner-bound handoff and keeps credentials in service traffic", async () => {
    const requests: { path: string; body: Readonly<Record<string, unknown>> }[] = [];
    const url = await startServer(async (request, response) => {
      expect(request.headers.apikey).toBe(serviceSecret);
      expect(request.headers.authorization).toBe(`Bearer ${serviceSecret}`);
      expect(request.headers["accept-profile"]).toBe("api");
      const path = request.url ?? "";
      const body = await readJsonBody(request);
      requests.push({ path, body });
      if (path.endsWith("/begin_facebook_page_oauth")) {
        writeJson(response, 200, [
          {
            oauth_session_id: oauthSessionId,
            external_app_id: "216409300082702",
            api_version: "v26.0",
          },
        ]);
      } else if (path.endsWith("/claim_facebook_page_oauth_exchange")) {
        writeJson(response, 200, [
          {
            oauth_session_id: oauthSessionId,
            organization_id: organizationId,
            external_app_id: "216409300082702",
            api_version: "v26.0",
            redirect_uri: "https://agentefer.example.test/admin/catalog/facebook/callback",
            app_secret: appSecret,
            exchange_lease_token: leaseToken,
          },
        ]);
      } else if (path.endsWith("/complete_facebook_page_oauth")) {
        writeJson(response, 200, [
          { social_connection_id: connectionId, page_name: "Llantas Fer" },
        ]);
      } else {
        writeJson(response, 200, null);
      }
    });
    const rpc = createRpc(url);
    const begun = await rpc.begin({
      organizationId,
      actorUserId,
      state: "state-value-with-at-least-thirty-two-characters",
      redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
    });
    const claimed = await rpc.claimExchange({
      state: "state-value-with-at-least-thirty-two-characters",
      actorUserId,
    });
    await rpc.stagePages({
      oauthSessionId,
      actorUserId,
      exchangeLeaseToken: leaseToken,
      candidates: [
        { id: "123456789", name: "Llantas Fer", tasks: ["PROFILE_PLUS_CREATE_CONTENT"] },
      ],
      tokenBundle: new SensitiveValue(
        JSON.stringify([{ id: "123456789", access_token: pageToken }]),
      ),
    });
    await rpc.failExchange({ oauthSessionId, actorUserId, exchangeLeaseToken: leaseToken });
    const completed = await rpc.complete({ oauthSessionId, actorUserId, pageId: "123456789" });

    expect(begun).toEqual({
      oauthSessionId,
      externalAppId: "216409300082702",
      apiVersion: "v26.0",
    });
    expect(claimed.appSecret.reveal()).toBe(appSecret);
    expect(JSON.stringify(claimed)).not.toContain(appSecret);
    expect(completed).toEqual({ socialConnectionId: connectionId, pageName: "Llantas Fer" });
    expect(requests).toHaveLength(5);
    expect(requests[2]?.body).toMatchObject({
      target_oauth_session_id: oauthSessionId,
      target_actor_user_id: actorUserId,
      target_exchange_lease_token: leaseToken,
      target_token_bundle: JSON.stringify([{ id: "123456789", access_token: pageToken }]),
    });
    expect(requests[4]?.body).toMatchObject({ target_page_id: "123456789" });
  });

  it.each([
    [400, "invalid"],
    [404, "invalid"],
    [413, "invalid"],
    [422, "invalid"],
    [401, "unauthenticated"],
    [403, "unauthorized"],
    [409, "conflict"],
    [500, "dependency"],
  ] as const)("maps HTTP %i into %s without parsing provider error text", async (status, kind) => {
    const url = await startServer((_request, response) => {
      writeJson(response, status, { message: appSecret });
    });
    await expect(
      createRpc(url).begin({
        organizationId,
        actorUserId,
        state: "state-value-with-at-least-thirty-two-characters",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
      }),
    ).rejects.toMatchObject({ kind });
  });

  it("rejects malformed success rows and unreachable dependencies", async () => {
    const url = await startServer((_request, response) => {
      writeJson(response, 200, []);
    });
    await expect(
      createRpc(url).begin({
        organizationId,
        actorUserId,
        state: "state-value-with-at-least-thirty-two-characters",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
    await expect(
      createRpc("http://127.0.0.1:9", 50).begin({
        organizationId,
        actorUserId,
        state: "state-value-with-at-least-thirty-two-characters",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    [[{ oauth_session_id: "invalid", external_app_id: "123", api_version: "v26.0" }]],
    [[{ oauth_session_id: oauthSessionId, external_app_id: "", api_version: "v26.0" }]],
    [{ unexpected: true }],
  ])("rejects malformed RPC success contract %#", async (body) => {
    const url = await startServer((_request, response) => {
      writeJson(response, 200, body);
    });
    await expect(
      createRpc(url).begin({
        organizationId,
        actorUserId,
        state: "state-value-with-at-least-thirty-two-characters",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("rejects an oversized declared RPC response", async () => {
    const url = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": "999999",
        "content-type": "application/json",
      });
      response.end("[]");
    });
    await expect(
      createRpc(url).begin({
        organizationId,
        actorUserId,
        state: "state-value-with-at-least-thirty-two-characters",
        redirectUri: "https://agentefer.example.test/admin/catalog/facebook/callback",
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });
});
