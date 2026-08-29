import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createFacebookPublicationRpcClient } from "../src/facebook-publication-rpc.js";

const servers: Server[] = [];
const secret = "supabase-service-secret-facebook-publication";
const ids = {
  organization: "b4051000-0000-4000-8000-000000000001",
  job: "b4052000-0000-4000-8000-000000000001",
  batch: "b4053000-0000-4000-8000-000000000001",
  publication: "b4054000-0000-4000-8000-000000000001",
  version: "b4055000-0000-4000-8000-000000000001",
  lease: "b4056000-0000-4000-8000-000000000001",
  media: "b4057000-0000-4000-8000-000000000001",
  subscription: "b4058000-0000-4000-8000-000000000001",
  message: "b4059000-0000-4000-8000-000000000001",
  outbox: "b405a000-0000-4000-8000-000000000001",
} as const;

const readBody = async (request: IncomingMessage): Promise<Readonly<Record<string, unknown>>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("Expected UTF-8 request body");
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
};

const respond = (response: ServerResponse, value: unknown, status = 200): void => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json",
  });
  response.end(body);
};

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void,
): Promise<string> => {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => response.destroy());
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
};

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error === undefined) resolve();
            else reject(error);
          });
          server.closeAllConnections();
        }),
    ),
  );
});

const createClient = (supabaseUrl: string, timeoutMilliseconds = 1_000) =>
  createFacebookPublicationRpcClient({
    supabaseUrl,
    secretKey: new SensitiveValue(secret),
    timeoutMilliseconds,
  });

const claimedJobRow = {
  organization_id: ids.organization,
  publication_job_id: ids.job,
  publication_batch_id: ids.batch,
  publication_id: ids.publication,
  publication_version_id: ids.version,
  operation: "publish",
  external_effect_key: "facebook:publication:b405",
  lease_token: ids.lease,
  lease_expires_at: "2026-08-29T20:00:00.000Z",
  attempt_count: 1,
  max_attempts: 5,
  page_id: "123456789",
  api_version: "v26.0",
  access_token: "facebook-page-access-token",
  headline: "Combo Roadtrack + Fuel",
  body: "Cuatro llantas y cuatro rines.",
  call_to_action: "Enviar mensaje",
  content_payload: { product: "combo" },
  pricing_status: "priced",
  price_amount: "22500.000000",
  currency_code: "MXN",
  media: [
    {
      media_asset_id: ids.media,
      media_role: "primary",
      ordinal: 0,
      bucket_id: "agentefer-catalog-public",
      object_path: `${ids.organization}/${ids.media}/storefront_webp/hash.webp`,
      mime_type: "image/webp",
      byte_size: 120_000,
    },
  ],
} as const;

const notificationRow = {
  organization_id: ids.organization,
  publication_batch_subscription_id: ids.subscription,
  publication_batch_id: ids.batch,
  lease_token: ids.lease,
  lease_expires_at: "2026-08-29T20:00:00.000Z",
  attempt_count: 1,
  provider: "openai",
  model: "gpt-5.6-terra",
  reasoning_effort: "medium",
  system_prompt: "Resume el lote sin perder el hilo de la conversación.",
  summary_payload: { total: 5, succeeded: 5 },
} as const;

describe("Facebook publication Supabase RPC contract over real TCP", () => {
  it("executes every privileged RPC with exact paths, service headers and tenant bodies", async () => {
    const requests: {
      path: string;
      body: Readonly<Record<string, unknown>>;
    }[] = [];
    const responses: Readonly<Record<string, unknown>> = {
      recover_expired_facebook_publication_jobs: [
        { scanned_count: 3, retryable_count: 1, failed_count: 1, uncertain_count: 1 },
      ],
      claim_facebook_publication_job: [claimedJobRow],
      authorize_publication_job: [
        { authorization_status: "allowed", authorization_reason: null, authorization_snapshot: {} },
      ],
      mark_publication_effect_started: "2026-08-29T19:00:00.000Z",
      record_social_rate_limit_observation: [{}],
      record_publication_job_result: [{ publication_job_id: ids.job, status: "succeeded" }],
      reconcile_publication_batch_notifications: [
        {
          publication_batch_id: ids.batch,
          status: "completed",
          job_counts: { succeeded: 1 },
          notifications_ready: 1,
        },
      ],
      reconcile_due_publication_batches: [
        { scanned_count: 2, terminal_count: 1, notifications_ready: 1 },
      ],
      claim_publication_batch_notification: [notificationRow],
      complete_publication_batch_notification: [
        {
          publication_batch_subscription_id: ids.subscription,
          status: "completed",
          message_id: ids.message,
          outbox_event_id: ids.outbox,
        },
      ],
      fail_publication_batch_notification: [
        { publication_batch_subscription_id: ids.subscription, status: "retryable" },
      ],
    };
    const url = await startServer(async (request, response) => {
      expect(request.method).toBe("POST");
      expect(request.headers.apikey).toBe(secret);
      expect(request.headers["accept-profile"]).toBe("api");
      expect(request.headers["content-profile"]).toBe("api");
      const path = request.url ?? "";
      const name = path.split("/").at(-1) ?? "";
      requests.push({ path, body: await readBody(request) });
      respond(response, responses[name]);
    });
    const client = createClient(url);

    await expect(client.recoverExpiredJobs({ limit: 25 })).resolves.toEqual({
      scannedCount: 3,
      retryableCount: 1,
      failedCount: 1,
      uncertainCount: 1,
    });
    const claim = await client.claimJob({
      workerId: "worker-publications-1",
      leaseSeconds: 120,
      organizationId: ids.organization,
    });
    expect(claim).toMatchObject({
      organizationId: ids.organization,
      publicationJobId: ids.job,
      publicationBatchId: ids.batch,
      operation: "publish",
      priceAmount: 22_500,
      media: [{ mediaAssetId: ids.media, mimeType: "image/webp" }],
    });
    expect(claim?.accessToken?.reveal()).toBe("facebook-page-access-token");
    if (claim === undefined) throw new TypeError("Expected a claimed publication job");
    const requiredClaim = claim;
    await expect(client.authorizeJob({ claim: requiredClaim })).resolves.toEqual({
      status: "allowed",
      snapshot: {},
    });
    await client.markEffectStarted({ claim: requiredClaim });
    await client.recordRateLimitObservation({
      claim: requiredClaim,
      source: "provider_headers",
      providerRequestId: "meta-request-1",
      retryAfterAt: "2026-08-29T19:05:00.000Z",
      blockedUntil: "2026-08-29T19:10:00.000Z",
      usageSnapshot: { call_count: 10 },
    });
    await client.recordJobResult({
      claim: requiredClaim,
      outcome: "succeeded",
      effectCertainty: "confirmed_applied",
      providerRequestId: "meta-request-1",
      externalPublicationId: "facebook-post-1",
      externalUrl: "https://www.facebook.com/posts/1",
      instanceStatus: "published",
      responseSummary: { id: "facebook-post-1" },
    });
    await client.reconcileBatch({
      organizationId: ids.organization,
      publicationBatchId: ids.batch,
    });
    await expect(client.reconcileDueBatches({ limit: 10 })).resolves.toEqual({
      scannedCount: 2,
      terminalCount: 1,
      notificationsReady: 1,
    });
    const notification = await client.claimBatchNotification({
      workerId: "worker-notifications-1",
      leaseSeconds: 120,
      organizationId: ids.organization,
    });
    expect(notification).toMatchObject({
      subscriptionId: ids.subscription,
      reasoningEffort: "medium",
      summaryPayload: { total: 5, succeeded: 5 },
    });
    if (notification === undefined) throw new TypeError("Expected a claimed batch notification");
    const requiredNotification = notification;
    await client.completeBatchNotification({
      claim: requiredNotification,
      visibleText: "Se publicaron los 5 productos.",
      providerRequestId: "llm-summary-1",
    });
    await client.failBatchNotification({
      claim: requiredNotification,
      errorCode: "SUMMARY_PROVIDER_TIMEOUT",
      retryable: true,
      retryAt: "2026-08-29T19:15:00.000Z",
    });

    expect(requests.map((request) => request.path)).toEqual([
      "/rest/v1/rpc/recover_expired_facebook_publication_jobs",
      "/rest/v1/rpc/claim_facebook_publication_job",
      "/rest/v1/rpc/authorize_publication_job",
      "/rest/v1/rpc/mark_publication_effect_started",
      "/rest/v1/rpc/record_social_rate_limit_observation",
      "/rest/v1/rpc/record_publication_job_result",
      "/rest/v1/rpc/reconcile_publication_batch_notifications",
      "/rest/v1/rpc/reconcile_due_publication_batches",
      "/rest/v1/rpc/claim_publication_batch_notification",
      "/rest/v1/rpc/complete_publication_batch_notification",
      "/rest/v1/rpc/fail_publication_batch_notification",
    ]);
    expect(requests.every((request) => request.body.target_organization_id !== undefined)).toBe(
      true,
    );
  });

  it("returns no work for empty job and notification claims", async () => {
    const url = await startServer((_request, response) => {
      respond(response, []);
    });
    const client = createClient(url);
    await expect(
      client.claimJob({ workerId: "worker-1", leaseSeconds: 60 }),
    ).resolves.toBeUndefined();
    await expect(
      client.claimBatchNotification({ workerId: "worker-1", leaseSeconds: 60 }),
    ).resolves.toBeUndefined();
  });

  it.each([
    [400, "invalid"],
    [413, "invalid"],
    [422, "invalid"],
    [401, "rejected"],
    [403, "rejected"],
    [503, "dependency"],
  ] as const)("classifies an RPC HTTP %i response as %s", async (status, kind) => {
    const url = await startServer((_request, response) => {
      respond(response, {}, status);
    });
    await expect(createClient(url).recoverExpiredJobs({ limit: 1 })).rejects.toMatchObject({
      kind,
    });
  });

  it("rejects an oversized response before decoding it", async () => {
    const url = await startServer((_request, response) => {
      response.writeHead(200, {
        "content-length": 1_048_577,
        "content-type": "application/json",
      });
      response.end("[]");
    });
    await expect(createClient(url).recoverExpiredJobs({ limit: 1 })).rejects.toMatchObject({
      kind: "dependency",
    });
  });

  it("distinguishes caller cancellation, transport failure and timeout", async () => {
    const hangingUrl = await startServer(() => undefined);
    const controller = new AbortController();
    controller.abort();
    await expect(
      createClient(hangingUrl).recoverExpiredJobs({ limit: 1, signal: controller.signal }),
    ).rejects.toMatchObject({ kind: "cancelled" });
    await expect(
      createClient("http://127.0.0.1:9").recoverExpiredJobs({ limit: 1 }),
    ).rejects.toMatchObject({
      kind: "dependency",
    });
    await expect(
      createClient(hangingUrl, 10).recoverExpiredJobs({ limit: 1 }),
    ).rejects.toMatchObject({
      kind: "timeout",
    });
  });
});
