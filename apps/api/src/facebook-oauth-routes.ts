import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";

import {
  createCorrelationScope,
  runWithCorrelation,
  type OperationalMetrics,
  type StructuredLogger,
} from "@agentefer/observability";
import {
  type FastifyInstance,
  type FastifyPluginCallback,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

import { type AdminMetaGateway } from "./admin-meta-gateway.js";
import { parseBearerAccessToken } from "./admin-meta-protocol.js";
import {
  AdminMetaHttpError,
  classifyAdminMetaFailure,
  classifyAdminMetaParserFailure,
  responseForAdminMetaFailure,
} from "./admin-meta-routes.js";
import { type FacebookOAuthGraph } from "./facebook-oauth-graph.js";
import {
  parseFacebookOAuthCompleteBody,
  parseFacebookOAuthExchangeBody,
  parseFacebookOAuthStartBody,
} from "./facebook-oauth-protocol.js";
import { type FacebookOAuthRpc } from "./facebook-oauth-rpc.js";
import { readFastifyErrorCode } from "./meta-webhook-routes.js";

const START_OPERATION = "admin.catalog.facebook_oauth.start";
const EXCHANGE_OPERATION = "admin.catalog.facebook_oauth.exchange";
const COMPLETE_OPERATION = "admin.catalog.facebook_oauth.complete";
const MAXIMUM_BODY_BYTES = 8_192;

export const FACEBOOK_OAUTH_CALLBACK_HTML = String.raw`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Conectar Facebook · AgenteFer</title>
  <script src="/admin/catalog/facebook/callback.js" defer></script>
</head>
<body>
  <main>
    <h1>Conectando Facebook</h1>
    <p id="oauth-status" role="status" aria-live="polite">Regresando al catálogo…</p>
  </main>
</body>
</html>`;

export const FACEBOOK_OAUTH_CALLBACK_JAVASCRIPT = String.raw`(() => {
  "use strict";
  const status = document.getElementById("oauth-status");
  const parameters = new URLSearchParams(window.location.search);
  const code = parameters.get("code");
  const state = parameters.get("state");
  const error = parameters.get("error");
  window.history.replaceState({}, document.title, window.location.pathname);
  const payload = { type: "agentefer.facebook-oauth", code, state, error };
  if (window.opener) {
    window.opener.postMessage(payload, window.location.origin);
  }
  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel("agentefer-facebook-oauth");
    channel.postMessage(payload);
    channel.close();
  }
  if (status) status.textContent = "Autorización recibida. Puedes cerrar esta ventana.";
  window.setTimeout(() => window.close(), 250);
})();`;

export type FacebookOAuthRouteInput = Readonly<{
  identityGateway: AdminMetaGateway;
  oauthRpc: FacebookOAuthRpc;
  oauthGraph: FacebookOAuthGraph;
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  apiPublicUrl: string;
}>;

const requireAccessToken = (request: FastifyRequest) => {
  const accessToken = parseBearerAccessToken(request.headers.authorization);
  if (accessToken === undefined) {
    throw new AdminMetaHttpError("FACEBOOK_OAUTH_SESSION_REQUIRED", "authentication", 401);
  }
  return accessToken;
};

const requireJsonContentType = (request: FastifyRequest): void => {
  const contentType = request.headers["content-type"];
  const mediaType =
    typeof contentType === "string" ? contentType.split(";", 1)[0]?.trim() : undefined;
  if (mediaType !== "application/json") {
    throw new AdminMetaHttpError("FACEBOOK_OAUTH_MEDIA_TYPE_REQUIRED", "validation", 415);
  }
};

const sendFailure = (reply: FastifyReply, error: unknown): void => {
  const failure = classifyAdminMetaFailure(error);
  if (failure.statusCode === 503) reply.header("retry-after", "2");
  reply.code(failure.statusCode).send(responseForAdminMetaFailure(failure.statusCode));
};

const recordFailure = (
  input: FacebookOAuthRouteInput,
  operation: string,
  startedAt: number,
  error: unknown,
): void => {
  const failure = classifyAdminMetaFailure(error);
  input.metrics.recordCompleted({
    operation,
    outcome: "failed",
    errorCategory: failure.error.category,
    durationMilliseconds: performance.now() - startedAt,
  });
  input.logger.error(`${operation}.failed`, failure.error, { http_status: failure.statusCode });
};

const completeSuccess = (
  input: FacebookOAuthRouteInput,
  operation: string,
  startedAt: number,
  attributes: Readonly<Record<string, string | number>>,
): void => {
  input.metrics.recordCompleted({
    operation,
    outcome: "succeeded",
    durationMilliseconds: performance.now() - startedAt,
  });
  input.logger.info(`${operation}.completed`, "succeeded", attributes);
};

const handleStart = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: FacebookOAuthRouteInput,
): Promise<void> => {
  const body = parseFacebookOAuthStartBody(request.body);
  const scope = createCorrelationScope({ organizationId: body?.organizationId });
  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(START_OPERATION);
    try {
      requireJsonContentType(request);
      if (body === undefined) {
        throw new AdminMetaHttpError("FACEBOOK_OAUTH_START_INVALID", "validation", 400);
      }
      const identity = await input.identityGateway.authenticate(requireAccessToken(request));
      const state = randomBytes(32).toString("base64url");
      const redirectUri = new URL(
        "/admin/catalog/facebook/callback",
        input.apiPublicUrl,
      ).toString();
      const session = await input.oauthRpc.begin({
        organizationId: body.organizationId,
        actorUserId: identity.userId,
        state,
        redirectUri,
      });
      const authorizationUrl = input.oauthGraph.createAuthorizationUrl({
        apiVersion: session.apiVersion,
        externalAppId: session.externalAppId,
        redirectUri,
        state,
      });
      completeSuccess(input, START_OPERATION, startedAt, {
        organization_id: body.organizationId,
        actor_user_id: identity.userId,
        oauth_session_id: session.oauthSessionId,
      });
      reply.code(201).send({ authorizationUrl });
    } catch (error) {
      recordFailure(input, START_OPERATION, startedAt, error);
      sendFailure(reply, error);
    }
  });
};

const handleExchange = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: FacebookOAuthRouteInput,
): Promise<void> => {
  const scope = createCorrelationScope();
  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(EXCHANGE_OPERATION);
    let failureInput:
      | Readonly<{
          oauthSessionId: string;
          actorUserId: string;
          exchangeLeaseToken: string;
        }>
      | undefined;
    try {
      requireJsonContentType(request);
      const body = parseFacebookOAuthExchangeBody(request.body);
      if (body === undefined) {
        throw new AdminMetaHttpError("FACEBOOK_OAUTH_EXCHANGE_INVALID", "validation", 400);
      }
      const identity = await input.identityGateway.authenticate(requireAccessToken(request));
      const claimed = await input.oauthRpc.claimExchange({
        state: body.state,
        actorUserId: identity.userId,
      });
      failureInput = Object.freeze({
        oauthSessionId: claimed.oauthSessionId,
        actorUserId: identity.userId,
        exchangeLeaseToken: claimed.exchangeLeaseToken,
      });
      const authorization = await input.oauthGraph.exchangeCodeAndListPages({
        apiVersion: claimed.apiVersion,
        externalAppId: claimed.externalAppId,
        appSecret: claimed.appSecret,
        redirectUri: claimed.redirectUri,
        code: body.code,
      });
      await input.oauthRpc.stagePages({
        oauthSessionId: claimed.oauthSessionId,
        actorUserId: identity.userId,
        exchangeLeaseToken: claimed.exchangeLeaseToken,
        candidates: authorization.candidates,
        tokenBundle: authorization.tokenBundle,
      });
      completeSuccess(input, EXCHANGE_OPERATION, startedAt, {
        organization_id: claimed.organizationId,
        actor_user_id: identity.userId,
        oauth_session_id: claimed.oauthSessionId,
        page_count: authorization.candidates.length,
      });
      reply.code(200).send({
        oauthSessionId: claimed.oauthSessionId,
        pages: authorization.candidates,
      });
    } catch (error) {
      if (failureInput !== undefined) {
        try {
          await input.oauthRpc.failExchange(failureInput);
        } catch {
          input.logger.error("admin.catalog.facebook_oauth.failure_recording_failed", "failed", {
            oauth_session_id: failureInput.oauthSessionId,
          });
        }
      }
      recordFailure(input, EXCHANGE_OPERATION, startedAt, error);
      sendFailure(reply, error);
    }
  });
};

const handleComplete = async (
  request: FastifyRequest,
  reply: FastifyReply,
  input: FacebookOAuthRouteInput,
): Promise<void> => {
  const scope = createCorrelationScope();
  await runWithCorrelation(scope, async () => {
    const startedAt = performance.now();
    input.metrics.recordStarted(COMPLETE_OPERATION);
    try {
      requireJsonContentType(request);
      const body = parseFacebookOAuthCompleteBody(request.body);
      if (body === undefined) {
        throw new AdminMetaHttpError("FACEBOOK_OAUTH_COMPLETE_INVALID", "validation", 400);
      }
      const identity = await input.identityGateway.authenticate(requireAccessToken(request));
      const result = await input.oauthRpc.complete({ ...body, actorUserId: identity.userId });
      completeSuccess(input, COMPLETE_OPERATION, startedAt, {
        actor_user_id: identity.userId,
        oauth_session_id: body.oauthSessionId,
        social_connection_id: result.socialConnectionId,
      });
      reply.code(200).send(result);
    } catch (error) {
      recordFailure(input, COMPLETE_OPERATION, startedAt, error);
      sendFailure(reply, error);
    }
  });
};

export function registerFacebookOAuthRoutes(
  application: FastifyInstance,
  input: FacebookOAuthRouteInput,
): void {
  const plugin: FastifyPluginCallback = (scope, _options, done) => {
    scope.addHook("onSend", (_request, reply, payload, hookDone) => {
      reply.header("cache-control", "no-store, max-age=0");
      reply.header(
        "content-security-policy",
        "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'",
      );
      reply.header("cross-origin-opener-policy", "same-origin-allow-popups");
      reply.header("cross-origin-resource-policy", "same-site");
      reply.header("permissions-policy", "camera=(), microphone=(), geolocation=()");
      reply.header("referrer-policy", "no-referrer");
      reply.header("x-content-type-options", "nosniff");
      reply.header("x-frame-options", "DENY");
      reply.header("x-robots-tag", "noindex, nofollow, noarchive");
      hookDone(null, payload);
    });
    scope.setErrorHandler((error, _request, reply) => {
      const failure = classifyAdminMetaParserFailure(readFastifyErrorCode(error));
      reply.code(failure.statusCode).send(responseForAdminMetaFailure(failure.statusCode));
    });
    scope.get("/admin/catalog/facebook/callback", (_request, reply) => {
      reply.type("text/html; charset=utf-8").code(200).send(FACEBOOK_OAUTH_CALLBACK_HTML);
    });
    scope.get("/admin/catalog/facebook/callback.js", (_request, reply) => {
      reply
        .type("text/javascript; charset=utf-8")
        .code(200)
        .send(FACEBOOK_OAUTH_CALLBACK_JAVASCRIPT);
    });
    scope.post(
      "/admin/catalog/facebook/oauth/start",
      { bodyLimit: MAXIMUM_BODY_BYTES },
      (request, reply) => handleStart(request, reply, input),
    );
    scope.post(
      "/admin/catalog/facebook/oauth/exchange",
      { bodyLimit: MAXIMUM_BODY_BYTES },
      (request, reply) => handleExchange(request, reply, input),
    );
    scope.post(
      "/admin/catalog/facebook/oauth/complete",
      { bodyLimit: MAXIMUM_BODY_BYTES },
      (request, reply) => handleComplete(request, reply, input),
    );
    done();
  };
  application.register(plugin);
}
