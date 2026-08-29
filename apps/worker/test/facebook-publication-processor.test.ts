import { SensitiveValue } from "@agentefer/config";
import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";
import { describe, expect, it } from "vitest";

import {
  createCatalogPublicMediaUrl,
  drainFacebookPublicationsOnce,
} from "../src/facebook-publication-processor.js";
import {
  FacebookPageError,
  type FacebookPageClient,
  type FacebookPagePublishResult,
} from "../src/facebook-page.js";
import {
  type ClaimedFacebookPublicationJob,
  type FacebookPublicationRpcClient,
  type PublicationAuthorization,
} from "../src/facebook-publication-rpc.js";

const ids = Object.freeze({
  organization: "b4005600-0000-4000-8000-000000000001",
  job: "b4005600-0000-4000-8000-000000000002",
  batch: "b4005600-0000-4000-8000-000000000003",
  publication: "b4005600-0000-4000-8000-000000000004",
  version: "b4005600-0000-4000-8000-000000000005",
  lease: "b4005600-0000-4000-8000-000000000006",
  media: "b4005600-0000-4000-8000-000000000007",
});

const claim = (
  overrides: Partial<ClaimedFacebookPublicationJob> = {},
): ClaimedFacebookPublicationJob => ({
  organizationId: ids.organization,
  publicationJobId: ids.job,
  publicationBatchId: ids.batch,
  publicationId: ids.publication,
  publicationVersionId: ids.version,
  operation: "publish",
  externalEffectKey: "publication-effect-contract-test",
  leaseToken: ids.lease,
  leaseExpiresAt: "2026-08-29T18:00:00.000Z",
  attemptCount: 1,
  maxAttempts: 8,
  pageId: "123456789012345",
  apiVersion: "v26.0",
  accessToken: new SensitiveValue("facebook-page-token-contract-test"),
  headline: "Combo Roadtrack M/T + Rin Fuel 15",
  body: "Incluye llantas, rines, instalación y garantía por escrito.",
  callToAction: "Escríbenos para confirmar disponibilidad.",
  contentPayload: { source: "approved_publication_version" },
  pricingStatus: "on_request",
  media: [
    {
      mediaAssetId: ids.media,
      mediaRole: "primary",
      ordinal: 0,
      bucketId: "agentefer-catalog-public",
      objectPath: `${ids.organization}/products/combo principal.webp`,
      mimeType: "image/webp",
      byteSize: 123_456,
    },
  ],
  ...overrides,
});

const logger: StructuredLogger = Object.freeze({
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
});

const metrics: OperationalMetrics = Object.freeze({
  recordStarted: () => undefined,
  recordCompleted: () => undefined,
});

type HarnessOptions = Readonly<{
  claimedJob?: ClaimedFacebookPublicationJob;
  authorization?: PublicationAuthorization;
  publish?: (signal?: AbortSignal) => Promise<FacebookPagePublishResult>;
}>;

const createHarness = (options: HarnessOptions = {}) => {
  const events: Readonly<{ operation: string; input?: unknown }>[] = [];
  let claimed = false;
  const claimedJob = options.claimedJob ?? claim();
  const rpcClient: FacebookPublicationRpcClient = Object.freeze({
    recoverExpiredJobs(input) {
      events.push({ operation: "recover", input });
      return Promise.resolve({
        scannedCount: 0,
        retryableCount: 0,
        failedCount: 0,
        uncertainCount: 0,
      });
    },
    claimJob(input) {
      events.push({ operation: "claim", input });
      if (claimed) {
        return Promise.resolve(undefined);
      }
      claimed = true;
      return Promise.resolve(claimedJob);
    },
    authorizeJob(input) {
      events.push({ operation: "authorize", input });
      return Promise.resolve(
        options.authorization ?? { status: "allowed", snapshot: { decision: "allowed" } },
      );
    },
    markEffectStarted(input) {
      events.push({ operation: "effect_started", input });
      return Promise.resolve();
    },
    recordRateLimitObservation(input) {
      events.push({ operation: "rate_observation", input });
      return Promise.resolve();
    },
    recordJobResult(input) {
      events.push({ operation: "job_result", input });
      return Promise.resolve();
    },
    reconcileBatch(input) {
      events.push({ operation: "reconcile_batch", input });
      return Promise.resolve();
    },
    reconcileDueBatches(input) {
      events.push({ operation: "reconcile_due", input });
      return Promise.resolve({ scannedCount: 0, terminalCount: 0, notificationsReady: 0 });
    },
    claimBatchNotification() {
      return Promise.resolve(undefined);
    },
    completeBatchNotification() {
      return Promise.resolve();
    },
    failBatchNotification() {
      return Promise.resolve();
    },
  });
  const pageClient: FacebookPageClient = Object.freeze({
    publish(request, signal) {
      events.push({ operation: "graph_publish", input: request });
      return options.publish === undefined
        ? Promise.resolve({
            externalPublicationId: "facebook-post-contract-test",
            providerRequestId: "meta-request-contract-test",
            usageSnapshot: {},
            responseSummary: { endpoint_kind: "photos" },
          })
        : options.publish(signal);
    },
  });
  return Object.freeze({
    events,
    input: {
      configuration: {
        workerId: "facebook-publication-contract-worker",
        supabaseUrl: "https://agenteferprojectref.supabase.co",
        pollIntervalMilliseconds: 60_000,
        leaseSeconds: 120,
        retryDelaySeconds: 5,
        batchSize: 25,
      },
      rpcClient,
      pageClient,
      logger,
      metrics,
      onOperationalStateChange: () => undefined,
    },
  });
};

describe("Facebook publication durable processor", () => {
  it("builds an encoded public Storage URL and rejects any other bucket", () => {
    const [media] = claim().media;
    if (media === undefined) {
      throw new TypeError("The contract fixture requires media");
    }
    expect(
      createCatalogPublicMediaUrl("https://agenteferprojectref.supabase.co", media).toString(),
    ).toBe(
      `https://agenteferprojectref.supabase.co/storage/v1/object/public/agentefer-catalog-public/${ids.organization}/products/combo%20principal.webp`,
    );
    expect(() =>
      createCatalogPublicMediaUrl("https://agenteferprojectref.supabase.co", {
        ...media,
        bucketId: "private-originals",
      }),
    ).toThrow(FacebookPageError);
  });

  it("reauthorizes, starts the effect, publishes and records confirmed success", async () => {
    const harness = createHarness();

    const result = await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(result.publicationCount).toBe(1);
    expect(harness.events.map((event) => event.operation)).toEqual([
      "recover",
      "claim",
      "authorize",
      "effect_started",
      "graph_publish",
      "job_result",
      "reconcile_batch",
      "claim",
      "reconcile_due",
    ]);
    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "succeeded",
      effectCertainty: "confirmed_applied",
      externalPublicationId: "facebook-post-contract-test",
      instanceStatus: "published",
      responseSummary: { approved_media_count: 1, published_media_count: 1 },
    });
    const graphInput = harness.events.find((event) => event.operation === "graph_publish")?.input;
    expect(JSON.stringify(graphInput)).not.toContain("facebook-page-token-contract-test");
  });

  it("does not start an effect when late authorization blocks the offer", async () => {
    const harness = createHarness({
      authorization: {
        status: "blocked",
        reason: "catalog_offer_not_active",
        snapshot: { decision: "blocked" },
      },
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.map((event) => event.operation)).not.toContain("effect_started");
    expect(harness.events.map((event) => event.operation)).not.toContain("graph_publish");
    expect(harness.events.map((event) => event.operation)).not.toContain("job_result");
    expect(harness.events.map((event) => event.operation)).toContain("reconcile_batch");
  });

  it("blocks incomplete credentials before marking the external effect", async () => {
    const { accessToken: _accessToken, ...incompleteClaim } = claim();
    void _accessToken;
    const harness = createHarness({ claimedJob: incompleteClaim });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.map((event) => event.operation)).not.toContain("effect_started");
    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "blocked",
      effectCertainty: "not_started",
      errorCode: "facebook_publication_payload_incomplete",
    });
  });

  it("records provider pacing and schedules a safe retry after rate limiting", async () => {
    const retryAfterAt = new Date(Date.now() + 120_000).toISOString();
    const harness = createHarness({
      publish: () =>
        Promise.reject(
          new FacebookPageError("rate_limited", {
            effectCertainty: "confirmed_not_applied",
            providerRequestId: "meta-rate-limit-request",
            retryAfterAt,
            usageSnapshot: { page: { call_count: 99 } },
          }),
        ),
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(
      harness.events.find((event) => event.operation === "rate_observation")?.input,
    ).toMatchObject({
      source: "provider_error",
      retryAfterAt,
      blockedUntil: retryAfterAt,
      usageSnapshot: { page: { call_count: 99 } },
    });
    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "retryable",
      effectCertainty: "confirmed_not_applied",
      retryAt: retryAfterAt,
    });
  });

  it("does not retry a rate limit after the configured attempt ceiling", async () => {
    const harness = createHarness({
      claimedJob: claim({ attemptCount: 8, maxAttempts: 8 }),
      publish: () =>
        Promise.reject(
          new FacebookPageError("rate_limited", {
            effectCertainty: "confirmed_not_applied",
            providerRequestId: "meta-rate-limit-final-attempt",
          }),
        ),
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "failed",
      effectCertainty: "confirmed_not_applied",
      errorClass: "provider",
    });
    expect(
      harness.events.some(
        (event) =>
          event.operation === "job_result" &&
          typeof event.input === "object" &&
          event.input !== null &&
          "outcome" in event.input &&
          event.input.outcome === "retryable",
      ),
    ).toBe(false);
  });

  it("does not turn a confirmed invalid provider rejection into a retry", async () => {
    const harness = createHarness({
      publish: () =>
        Promise.reject(
          new FacebookPageError("invalid", {
            effectCertainty: "confirmed_not_applied",
          }),
        ),
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "failed",
      effectCertainty: "confirmed_not_applied",
      errorClass: "provider",
    });
  });

  it("blocks an authorization rejection instead of classifying it as provider failure", async () => {
    const harness = createHarness({
      publish: () =>
        Promise.reject(
          new FacebookPageError("rejected", {
            effectCertainty: "confirmed_not_applied",
          }),
        ),
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "blocked",
      effectCertainty: "confirmed_not_applied",
      errorClass: "authorization",
    });
  });

  it("marks an unknown post-effect failure uncertain and never retryable", async () => {
    const harness = createHarness({
      publish: () =>
        Promise.reject(
          new FacebookPageError("uncertain", {
            effectCertainty: "unknown",
            providerRequestId: "meta-uncertain-request",
          }),
        ),
    });

    await drainFacebookPublicationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "job_result")?.input).toMatchObject({
      outcome: "uncertain",
      effectCertainty: "unknown",
      errorCode: "FACEBOOK_PAGE_EFFECT_UNCERTAIN",
    });
    expect(
      harness.events.some(
        (event) =>
          event.operation === "job_result" &&
          typeof event.input === "object" &&
          event.input !== null &&
          "outcome" in event.input &&
          event.input.outcome === "retryable",
      ),
    ).toBe(false);
  });
});
