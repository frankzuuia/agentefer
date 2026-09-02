import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";
import { Script } from "node:vm";

import { SensitiveValue } from "@agentefer/config";
import { createReadinessState } from "@agentefer/observability";
import { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";

import { createAdminCatalogGateway } from "../src/admin-catalog-gateway.js";
import {
  ADMIN_CATALOG_CSS,
  ADMIN_CATALOG_HTML,
  ADMIN_CATALOG_JAVASCRIPT,
} from "../src/admin-catalog-page.js";
import { createAdminMetaGateway } from "../src/admin-meta-gateway.js";
import { buildApi } from "../src/app.js";
import { createFacebookOAuthGraph } from "../src/facebook-oauth-graph.js";
import {
  FACEBOOK_OAUTH_CALLBACK_HTML,
  FACEBOOK_OAUTH_CALLBACK_JAVASCRIPT,
} from "../src/facebook-oauth-routes.js";
import { createFacebookOAuthRpc } from "../src/facebook-oauth-rpc.js";
import { buildApiTestInput } from "./support.js";

const applications: FastifyInstance[] = [];
const servers: Server[] = [];
const publishableKey = "sb_publishable_admin_catalog_routes";
const serviceSecret = "sb_secret_admin_catalog_routes";
const accessToken = "header.payload.admin-catalog";
const userId = "b4070000-0000-4000-8000-000000000001";
const organizationId = "b4071000-0000-4000-8000-000000000001";
const variantId = "b4074000-0000-4000-8000-000000000001";
const connectionId = "b4076000-0000-4000-8000-000000000001";
const jobId = "b4077000-0000-4000-8000-000000000001";
const batchId = "b4078000-0000-4000-8000-000000000001";

const writeJson = (response: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json",
  });
  response.end(body);
};

const readBody = async (request: IncomingMessage): Promise<Readonly<Record<string, unknown>>> => {
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
  await Promise.all(servers.splice(0).map(closeServer));
});

const emptyPage = () => ({
  summary: { total: 0, active: 0, paused: 0, draft: 0, archived: 0, facebookErrors: 0 },
  connections: [{ id: connectionId, name: "Página Fer", status: "active" }],
  selectedConnectionId: connectionId,
  items: [],
  batches: [],
  hasMore: false,
  nextCursor: null,
});

const createApplication = (dependencyUrl: string): FastifyInstance => {
  const input = buildApiTestInput(createReadinessState());
  const application = buildApi({
    ...input,
    adminMetaGateway: createAdminMetaGateway({
      supabaseUrl: dependencyUrl,
      publishableKey,
      secretKey: new SensitiveValue(serviceSecret),
      timeoutMilliseconds: 250,
    }),
    adminCatalogGateway: createAdminCatalogGateway({
      supabaseUrl: dependencyUrl,
      secretKey: new SensitiveValue(serviceSecret),
      timeoutMilliseconds: 250,
    }),
    facebookOAuthGraph: createFacebookOAuthGraph({
      graphBaseUrl: dependencyUrl,
      dialogBaseUrl: "https://www.facebook.com",
      timeoutMilliseconds: 250,
    }),
    facebookOAuthRpc: createFacebookOAuthRpc({
      supabaseUrl: dependencyUrl,
      secretKey: new SensitiveValue(serviceSecret),
      timeoutMilliseconds: 250,
    }),
    supabaseUrl: dependencyUrl,
    supabasePublishableKey: publishableKey,
  });
  applications.push(application);
  return application;
};

describe("admin catalog routes", () => {
  it("serves a mobile-first shell and locked content security policy", async () => {
    const application = createApplication("https://project.supabase.co");
    const [page, css, javascript] = await Promise.all([
      application.inject({ method: "GET", url: "/admin/catalog" }),
      application.inject({ method: "GET", url: "/admin/catalog/app.css" }),
      application.inject({ method: "GET", url: "/admin/catalog/app.js" }),
    ]);

    expect(page.statusCode).toBe(200);
    expect(page.body).toContain("viewport-fit=cover");
    expect(page.body).toContain('id="previous-page"');
    expect(page.body).toContain('id="next-page"');
    expect(page.headers["content-security-policy"]).toContain(
      "img-src 'self' https://project.supabase.co",
    );
    expect(page.headers["content-security-policy"]).not.toContain("unsafe-inline");
    expect(page.headers["cache-control"]).toBe("no-store, max-age=0");
    expect(page.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
    expect(css.statusCode).toBe(200);
    expect(javascript.statusCode).toBe(200);
  });

  it("keeps the responsive UX contract explicit and the browser script syntactically valid", () => {
    expect(() => new Script(ADMIN_CATALOG_JAVASCRIPT)).not.toThrow();
    expect(ADMIN_CATALOG_HTML).toContain('class="mobile-nav"');
    expect(ADMIN_CATALOG_HTML).toContain('id="connect-facebook-button"');
    expect(ADMIN_CATALOG_HTML).toContain('class="facebook-logo"');
    expect(ADMIN_CATALOG_HTML).toContain('id="facebook-page-dialog"');
    expect(ADMIN_CATALOG_CSS).toContain("env(safe-area-inset-bottom)");
    expect(ADMIN_CATALOG_CSS).toContain("min-height: 44px");
    expect(ADMIN_CATALOG_CSS).toContain("max-height: min(88dvh, 780px)");
    expect(ADMIN_CATALOG_JAVASCRIPT).toContain("pageSize: String(pageSize())");
    expect(ADMIN_CATALOG_JAVASCRIPT).toContain("state.cursorHistory");
    expect(ADMIN_CATALOG_JAVASCRIPT).toContain("event.origin !== window.location.origin");
    expect(ADMIN_CATALOG_JAVASCRIPT).toContain("event.source !== state.facebookPopup");
    expect(ADMIN_CATALOG_JAVASCRIPT).toContain('hostname !== "www.facebook.com"');
    expect(ADMIN_CATALOG_JAVASCRIPT).not.toContain("IntersectionObserver");
    expect(ADMIN_CATALOG_JAVASCRIPT).not.toContain("localStorage");
    expect(ADMIN_CATALOG_JAVASCRIPT).not.toContain("sessionStorage");
  });

  it("serves a redacted callback bridge that removes the authorization query", async () => {
    const application = createApplication("https://project.supabase.co");
    const [page, javascript] = await Promise.all([
      application.inject({ method: "GET", url: "/admin/catalog/facebook/callback?code=secret" }),
      application.inject({ method: "GET", url: "/admin/catalog/facebook/callback.js" }),
    ]);
    expect(page.statusCode).toBe(200);
    expect(page.body).toBe(FACEBOOK_OAUTH_CALLBACK_HTML);
    expect(page.body).not.toContain("secret");
    expect(javascript.body).toBe(FACEBOOK_OAUTH_CALLBACK_JAVASCRIPT);
    expect(() => new Script(javascript.body)).not.toThrow();
    expect(javascript.body).toContain("window.history.replaceState");
    expect(javascript.body).toContain("window.opener.postMessage");
    expect(javascript.headers["referrer-policy"]).toBe("no-referrer");
  });

  it("completes OAuth without returning app, user or Page credentials to the browser", async () => {
    const appSecret = "route-meta-app-secret-contract-value";
    const pageToken = "route-facebook-page-token-contract-value";
    const oauthSessionId = "b4079000-0000-4000-8000-000000000001";
    const leaseToken = "b4079000-0000-4000-8000-000000000002";
    const stagedBodies: Readonly<Record<string, unknown>>[] = [];
    const dependencyUrl = await startServer(async (request, response) => {
      if (request.url === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      if (request.url === "/rest/v1/rpc/begin_facebook_page_oauth") {
        writeJson(response, 200, [
          {
            oauth_session_id: oauthSessionId,
            external_app_id: "216409300082702",
            api_version: "v26.0",
          },
        ]);
        return;
      }
      if (request.url === "/rest/v1/rpc/claim_facebook_page_oauth_exchange") {
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
        return;
      }
      if (request.url === "/v26.0/oauth/access_token") {
        const parameters = new URLSearchParams(
          await (async () => {
            request.setEncoding("utf8");
            let body = "";
            for await (const chunk of request) body += String(chunk);
            return body;
          })(),
        );
        writeJson(response, 200, {
          access_token: parameters.has("fb_exchange_token")
            ? "route-long-lived-user-token-value"
            : "route-short-lived-user-token-value",
        });
        return;
      }
      if (request.url?.startsWith("/v26.0/me/accounts?")) {
        writeJson(response, 200, {
          data: [
            {
              id: "123456789",
              name: "Llantas Fer",
              access_token: pageToken,
              tasks: ["PROFILE_PLUS_CREATE_CONTENT"],
            },
          ],
        });
        return;
      }
      if (request.url === "/rest/v1/rpc/stage_facebook_page_oauth_pages") {
        stagedBodies.push(await readBody(request));
        writeJson(response, 200, null);
        return;
      }
      if (request.url === "/rest/v1/rpc/complete_facebook_page_oauth") {
        writeJson(response, 200, [
          { social_connection_id: connectionId, page_name: "Llantas Fer" },
        ]);
        return;
      }
      writeJson(response, 404, {});
    });
    const application = createApplication(dependencyUrl);
    const headers = {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    };
    const start = await application.inject({
      method: "POST",
      url: "/admin/catalog/facebook/oauth/start",
      headers,
      payload: { organizationId },
    });
    expect(start.statusCode).toBe(201);
    const authorizationUrl = new URL(start.json<{ authorizationUrl: string }>().authorizationUrl);
    expect(authorizationUrl.hostname).toBe("www.facebook.com");
    expect(authorizationUrl.searchParams.has("client_secret")).toBe(false);

    const exchange = await application.inject({
      method: "POST",
      url: "/admin/catalog/facebook/oauth/exchange",
      headers,
      payload: {
        state: authorizationUrl.searchParams.get("state"),
        code: "route-facebook-authorization-code",
      },
    });
    expect(exchange.statusCode).toBe(200);
    expect(exchange.json()).toEqual({
      oauthSessionId,
      pages: [{ id: "123456789", name: "Llantas Fer", tasks: ["PROFILE_PLUS_CREATE_CONTENT"] }],
    });
    expect(exchange.body).not.toContain(appSecret);
    expect(exchange.body).not.toContain(pageToken);
    expect(stagedBodies[0]?.target_token_bundle).toContain(pageToken);

    const complete = await application.inject({
      method: "POST",
      url: "/admin/catalog/facebook/oauth/complete",
      headers,
      payload: { oauthSessionId, pageId: "123456789" },
    });
    expect(complete.statusCode).toBe(200);
    expect(complete.json()).toEqual({
      socialConnectionId: connectionId,
      pageName: "Llantas Fer",
    });
  });

  it.each([
    ["/admin/catalog/facebook/oauth/start", { organizationId }],
    [
      "/admin/catalog/facebook/oauth/exchange",
      { state: "state-value-with-at-least-thirty-two-characters", code: "facebook-code" },
    ],
    ["/admin/catalog/facebook/oauth/complete", { oauthSessionId: jobId, pageId: "123" }],
  ] as const)("requires a bearer owner session for %s", async (url, payload) => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url,
      headers: { "content-type": "application/json" },
      payload,
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: "unauthenticated" });
  });

  it.each([
    ["/admin/catalog/facebook/oauth/start", { organizationId: "invalid" }],
    ["/admin/catalog/facebook/oauth/exchange", { state: "short", code: "short" }],
    ["/admin/catalog/facebook/oauth/complete", { oauthSessionId: jobId, pageId: "page" }],
  ] as const)("rejects the invalid OAuth body for %s", async (url, payload) => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url,
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      payload,
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: "invalid" });
  });

  it("rejects wrong media types and oversized OAuth envelopes", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const wrongMedia = await application.inject({
      method: "POST",
      url: "/admin/catalog/facebook/oauth/start",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "text/plain" },
      payload: "{}",
    });
    const oversized = await application.inject({
      method: "POST",
      url: "/admin/catalog/facebook/oauth/exchange",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      payload: { state: "s".repeat(43), code: "x".repeat(9_000) },
    });
    expect(wrongMedia.statusCode).toBe(415);
    expect(oversized.statusCode).toBe(413);
  });

  it.each([false, true])(
    "marks a claimed exchange failed when Graph rejects it (failure RPC rejects: %s)",
    async (failureRpcRejects) => {
      const oauthSessionId = "b4079000-0000-4000-8000-000000000003";
      const leaseToken = "b4079000-0000-4000-8000-000000000004";
      let failureCalls = 0;
      const dependencyUrl = await startServer((request, response) => {
        if (request.url === "/auth/v1/user") {
          writeJson(response, 200, { id: userId });
          return;
        }
        if (request.url === "/rest/v1/rpc/claim_facebook_page_oauth_exchange") {
          writeJson(response, 200, [
            {
              oauth_session_id: oauthSessionId,
              organization_id: organizationId,
              external_app_id: "216409300082702",
              api_version: "v26.0",
              redirect_uri: "https://agentefer.example.test/admin/catalog/facebook/callback",
              app_secret: "route-app-secret-value",
              exchange_lease_token: leaseToken,
            },
          ]);
          return;
        }
        if (request.url === "/v26.0/oauth/access_token") {
          writeJson(response, 500, { error: { message: "provider unavailable" } });
          return;
        }
        if (request.url === "/rest/v1/rpc/fail_facebook_page_oauth") {
          failureCalls += 1;
          writeJson(response, failureRpcRejects ? 500 : 200, null);
          return;
        }
        writeJson(response, 404, {});
      });
      const application = createApplication(dependencyUrl);
      const response = await application.inject({
        method: "POST",
        url: "/admin/catalog/facebook/oauth/exchange",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        payload: {
          state: "state-value-with-at-least-thirty-two-characters",
          code: "facebook-authorization-code",
        },
      });
      expect(response.statusCode).toBe(503);
      expect(response.headers["retry-after"]).toBe("2");
      expect(failureCalls).toBe(1);
    },
  );

  it("requires a bearer session before reading the tenant catalog", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "GET",
      url: `/admin/catalog/page?organizationId=${organizationId}`,
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ status: "unauthenticated" });
  });

  it("authenticates the browser then calls the bounded service RPC with the verified actor", async () => {
    const requests: { path: string; body?: Readonly<Record<string, unknown>> }[] = [];
    const dependencyUrl = await startServer(async (request, response) => {
      if (request.url === "/auth/v1/user") {
        expect(request.headers.apikey).toBe(publishableKey);
        expect(request.headers.authorization).toBe(`Bearer ${accessToken}`);
        requests.push({ path: request.url });
        writeJson(response, 200, { id: userId });
        return;
      }
      if (request.url === "/rest/v1/rpc/get_facebook_catalog_admin_page") {
        expect(request.headers.apikey).toBe(serviceSecret);
        requests.push({ path: request.url, body: await readBody(request) });
        writeJson(response, 200, emptyPage());
        return;
      }
      writeJson(response, 404, {});
    });
    const application = createApplication(dependencyUrl);
    const response = await application.inject({
      method: "GET",
      url: `/admin/catalog/page?organizationId=${organizationId}&pageSize=6`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ hasMore: false, items: [] });
    expect(requests).toHaveLength(2);
    expect(requests[1]?.body).toMatchObject({
      target_organization_id: organizationId,
      target_actor_user_id: userId,
      target_page_size: 6,
    });
  });

  it.each([
    [
      "set_status",
      "/rest/v1/rpc/admin_set_catalog_offer_status",
      {
        type: "set_status",
        organizationId,
        variantId,
        status: "paused",
        reason: "Pausa autorizada",
        idempotencyKey: "b407-route-command-0001",
      },
      { target_variant_id: variantId },
    ],
    [
      "publish",
      "/rest/v1/rpc/admin_enqueue_facebook_publication",
      {
        type: "publish",
        organizationId,
        variantId,
        socialConnectionId: connectionId,
        operation: "publish",
        idempotencyKey: "b407-route-command-0001",
      },
      { target_variant_id: variantId },
    ],
    [
      "publish_all",
      "/rest/v1/rpc/admin_enqueue_facebook_catalog",
      {
        type: "publish_all",
        organizationId,
        socialConnectionId: connectionId,
        operation: "refresh",
        idempotencyKey: "b407-route-command-0001",
      },
      { target_social_connection_id: connectionId },
    ],
    [
      "retry",
      "/rest/v1/rpc/admin_retry_facebook_publication",
      {
        type: "retry",
        organizationId,
        publicationJobId: jobId,
        idempotencyKey: "b407-route-command-0001",
      },
      { target_publication_job_id: jobId },
    ],
    [
      "batch_state",
      "/rest/v1/rpc/admin_set_facebook_batch_state",
      {
        type: "batch_state",
        organizationId,
        publicationBatchId: batchId,
        action: "pause",
        reason: "Pausa autorizada",
        idempotencyKey: "b407-route-command-0001",
      },
      { target_publication_batch_id: batchId },
    ],
  ] as const)(
    "authenticates and dispatches the exact %s command",
    async (_type, path, payload, expectedBody) => {
      let rpcBody: Readonly<Record<string, unknown>> | undefined;
      const dependencyUrl = await startServer(async (request, response) => {
        if (request.url === "/auth/v1/user") {
          writeJson(response, 200, { id: userId });
          return;
        }
        if (request.url === path) {
          rpcBody = await readBody(request);
          writeJson(response, 200, { accepted: true });
          return;
        }
        writeJson(response, 404, {});
      });
      const application = createApplication(dependencyUrl);
      const response = await application.inject({
        method: "POST",
        url: "/admin/catalog/commands",
        headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        payload,
      });

      expect(response.statusCode).toBe(202);
      expect(response.json()).toMatchObject({ status: "accepted", result: { accepted: true } });
      expect(rpcBody).toMatchObject({
        target_actor_user_id: userId,
        target_idempotency_key: "b407-route-command-0001",
        ...expectedBody,
      });
    },
  );

  it("rejects a command without a content type before authentication", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/catalog/commands",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(response.statusCode).toBe(415);
  });

  it.each([
    { headers: {}, payload: {}, expected: 401 },
    {
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "text/plain" },
      payload: "{}",
      expected: 415,
    },
  ])(
    "rejects an invalid command envelope with $expected",
    async ({ headers, payload, expected }) => {
      const application = createApplication("http://127.0.0.1:9");
      const response = await application.inject({
        method: "POST",
        url: "/admin/catalog/commands",
        headers,
        payload,
      });
      expect(response.statusCode).toBe(expected);
    },
  );

  it("rejects an invalid command only after verifying the session", async () => {
    const dependencyUrl = await startServer((request, response) => {
      if (request.url === "/auth/v1/user") {
        writeJson(response, 200, { id: userId });
        return;
      }
      writeJson(response, 500, {});
    });
    const application = createApplication(dependencyUrl);
    const response = await application.inject({
      method: "POST",
      url: "/admin/catalog/commands",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      payload: { type: "delete", organizationId, idempotencyKey: "b407-route-command-0001" },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ status: "invalid" });
  });

  it("rejects an oversized command before authentication or RPC execution", async () => {
    const application = createApplication("http://127.0.0.1:9");
    const response = await application.inject({
      method: "POST",
      url: "/admin/catalog/commands",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      payload: { value: "x".repeat(17_000) },
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ status: "invalid" });
  });
});
