import {
  CognitiveProviderError,
  type CognitiveProvider,
  type CognitiveTurnResult,
} from "@agentefer/ai";
import { type OperationalMetrics, type StructuredLogger } from "@agentefer/observability";
import { describe, expect, it } from "vitest";

import {
  drainPublicationNotificationsOnce,
  type CreatePublicationNotificationProcessorInput,
} from "../src/publication-notification-processor.js";
import {
  type ClaimedPublicationBatchNotification,
  type FacebookPublicationRpcClient,
} from "../src/facebook-publication-rpc.js";

const ids = Object.freeze({
  organization: "b4005700-0000-4000-8000-000000000001",
  subscription: "b4005700-0000-4000-8000-000000000002",
  batch: "b4005700-0000-4000-8000-000000000003",
  lease: "b4005700-0000-4000-8000-000000000004",
});

const claim: ClaimedPublicationBatchNotification = Object.freeze({
  organizationId: ids.organization,
  subscriptionId: ids.subscription,
  publicationBatchId: ids.batch,
  leaseToken: ids.lease,
  leaseExpiresAt: "2026-08-29T18:00:00.000Z",
  attemptCount: 1,
  provider: "openai",
  model: "notification-contract-model",
  reasoningEffort: "high",
  systemPrompt: "Eres el asistente comercial autorizado de la tienda.",
  summaryPayload: Object.freeze({
    status: "partially_failed",
    total: 4,
    succeeded: 3,
    failed: 1,
    failed_items: [{ sku: "RIN-15-001", can_retry: true }],
  }),
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

const turnResult = (
  terminationReason: CognitiveTurnResult["terminationReason"],
  visibleText: string,
): CognitiveTurnResult =>
  Object.freeze({
    providerRequestId: "provider-request-contract-test",
    visibleText,
    terminationReason,
    toolCalls: Object.freeze([]),
    metadataSafe: Object.freeze({}),
  });

const createHarness = (provider: CognitiveProvider) => {
  const events: { operation: string; input?: unknown }[] = [];
  let claimed = false;
  const rpcClient: FacebookPublicationRpcClient = Object.freeze({
    recoverExpiredJobs: () =>
      Promise.resolve({ scannedCount: 0, retryableCount: 0, failedCount: 0, uncertainCount: 0 }),
    claimJob: () => Promise.resolve(undefined),
    authorizeJob: () =>
      Promise.resolve({ status: "allowed" as const, snapshot: Object.freeze({}) }),
    markEffectStarted: () => Promise.resolve(),
    recordRateLimitObservation: () => Promise.resolve(),
    recordJobResult: () => Promise.resolve(),
    reconcileBatch: () => Promise.resolve(),
    reconcileDueBatches: () =>
      Promise.resolve({ scannedCount: 0, terminalCount: 0, notificationsReady: 0 }),
    claimBatchNotification(input) {
      events.push({ operation: "claim", input });
      if (claimed) {
        return Promise.resolve(undefined);
      }
      claimed = true;
      return Promise.resolve(claim);
    },
    completeBatchNotification(input) {
      events.push({ operation: "complete", input });
      return Promise.resolve();
    },
    failBatchNotification(input) {
      events.push({ operation: "fail", input });
      return Promise.resolve();
    },
  });
  const input: CreatePublicationNotificationProcessorInput = {
    configuration: {
      workerId: "publication-summary-contract-worker",
      pollIntervalMilliseconds: 60_000,
      leaseSeconds: 900,
      retryDelaySeconds: 5,
      batchSize: 25,
      turnTimeoutMilliseconds: 120_000,
      maxContinuationRounds: 12,
    },
    providers: new Map([["openai", provider]]),
    rpcClient,
    logger,
    metrics,
    onOperationalStateChange: () => undefined,
  };
  return Object.freeze({ events, input });
};

describe("publication batch terminal notification processor", () => {
  it("asks the originating model for the durable summary and queues it exactly once", async () => {
    let providerInput: Parameters<CognitiveProvider["executeTurn"]>[0] | undefined;
    const harness = createHarness({
      executeTurn(input) {
        providerInput = input;
        return Promise.resolve(
          turnResult("completed", "Se publicaron 3 de 4 productos; 1 puede reintentarse."),
        );
      },
    });

    const result = await drainPublicationNotificationsOnce(
      harness.input,
      new AbortController().signal,
    );

    expect(result.notificationCount).toBe(1);
    expect(harness.events.map((event) => event.operation)).toEqual(["claim", "complete", "claim"]);
    expect(harness.events.find((event) => event.operation === "complete")?.input).toMatchObject({
      claim,
      visibleText: "Se publicaron 3 de 4 productos; 1 puede reintentarse.",
      providerRequestId: "provider-request-contract-test",
    });
    expect(providerInput).toMatchObject({
      model: claim.model,
      systemPrompt: claim.systemPrompt,
      reasoningEffort: claim.reasoningEffort,
      continuationParts: [],
    });
    expect(providerInput?.tools).toBeUndefined();
    expect(JSON.stringify(providerInput?.conversation)).toContain("RIN-15-001");
  });

  it("continues provider output without losing the prior partial text", async () => {
    const continuationInputs: string[][] = [];
    let callCount = 0;
    const harness = createHarness({
      executeTurn(input) {
        continuationInputs.push([...input.continuationParts]);
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve(turnResult("output_limit", "Primera parte."));
        }
        if (callCount === 2) {
          return Promise.resolve(turnResult("output_limit", " Segunda parte."));
        }
        return Promise.resolve(turnResult("completed", " Tercera parte."));
      },
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(continuationInputs).toEqual([
      [],
      ["Primera parte."],
      ["Primera parte.", " Segunda parte."],
    ]);
    expect(harness.events.find((event) => event.operation === "complete")?.input).toMatchObject({
      visibleText: "Primera parte. Segunda parte. Tercera parte.",
    });
  });

  it("does not persist an empty continuation fragment", async () => {
    const continuationInputs: string[][] = [];
    let callCount = 0;
    const harness = createHarness({
      executeTurn(input) {
        continuationInputs.push([...input.continuationParts]);
        callCount += 1;
        return Promise.resolve(
          callCount === 1
            ? turnResult("output_limit", "")
            : turnResult("completed", "Resumen final."),
        );
      },
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(continuationInputs).toEqual([[], []]);
  });

  it("stops at the configured continuation ceiling and schedules a durable retry", async () => {
    let callCount = 0;
    const harness = createHarness({
      executeTurn: () => {
        callCount += 1;
        return Promise.resolve(turnResult("output_limit", "Fragmento."));
      },
    });
    const input = {
      ...harness.input,
      configuration: { ...harness.input.configuration, maxContinuationRounds: 2 },
    };

    await drainPublicationNotificationsOnce(input, new AbortController().signal);

    expect(callCount).toBe(2);
    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "publication_summary_continuation_ceiling_reached",
      retryable: true,
    });
  });

  it("does not retry content filtered output", async () => {
    const harness = createHarness({
      executeTurn: () => Promise.resolve(turnResult("content_filter", "")),
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "publication_summary_content_filter",
      retryable: false,
    });
  });

  it("retries provider termination but never a cancelled turn", async () => {
    const providerFailure = createHarness({
      executeTurn: () => Promise.resolve(turnResult("provider_error", "")),
    });
    await drainPublicationNotificationsOnce(providerFailure.input, new AbortController().signal);
    expect(providerFailure.events.find((event) => event.operation === "fail")?.input).toMatchObject(
      {
        errorCode: "publication_summary_provider_error",
        retryable: true,
      },
    );

    const cancelled = createHarness({
      executeTurn: () => Promise.resolve(turnResult("cancelled", "")),
    });
    await drainPublicationNotificationsOnce(cancelled.input, new AbortController().signal);
    expect(cancelled.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "publication_summary_cancelled",
      retryable: false,
    });
  });

  it("trims a valid summary before persisting it", async () => {
    const harness = createHarness({
      executeTurn: () => Promise.resolve(turnResult("completed", "  Resumen final.  ")),
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "complete")?.input).toMatchObject({
      visibleText: "Resumen final.",
    });
  });

  it("accepts exact WhatsApp boundaries and rejects empty or oversized summaries", async () => {
    for (const text of ["x", "x".repeat(4_000)]) {
      const accepted = createHarness({
        executeTurn: () => Promise.resolve(turnResult("completed", text)),
      });
      await drainPublicationNotificationsOnce(accepted.input, new AbortController().signal);
      expect(accepted.events.map((event) => event.operation)).toContain("complete");
    }

    for (const text of ["", "x".repeat(4_001)]) {
      const rejected = createHarness({
        executeTurn: () => Promise.resolve(turnResult("completed", text)),
      });
      await drainPublicationNotificationsOnce(rejected.input, new AbortController().signal);
      expect(rejected.events.find((event) => event.operation === "fail")?.input).toMatchObject({
        errorCode: "publication_summary_visible_text_invalid",
        retryable: true,
      });
    }
  });

  it("schedules provider failures for durable retry", async () => {
    const harness = createHarness({
      executeTurn: () =>
        Promise.reject(new CognitiveProviderError({ code: "provider_http_429", retryable: true })),
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "provider_http_429",
      retryable: true,
    });
  });

  it("does not retry a non-retryable cognitive provider failure", async () => {
    const harness = createHarness({
      executeTurn: () =>
        Promise.reject(
          new CognitiveProviderError({ code: "provider_contract_invalid", retryable: false }),
        ),
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "provider_contract_invalid",
      retryable: false,
    });
  });

  it("retries an unexpected internal provider adapter failure", async () => {
    const harness = createHarness({
      executeTurn: () => Promise.reject(new Error("adapter failure")),
    });

    await drainPublicationNotificationsOnce(harness.input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "publication_summary_internal_failure",
      retryable: true,
    });
  });

  it("fails closed when the originating provider is not configured", async () => {
    const harness = createHarness({ executeTurn: () => Promise.reject(new Error("unreachable")) });
    const input = { ...harness.input, providers: new Map<string, CognitiveProvider>() };

    await drainPublicationNotificationsOnce(input, new AbortController().signal);

    expect(harness.events.find((event) => event.operation === "fail")?.input).toMatchObject({
      errorCode: "publication_summary_provider_adapter_not_configured",
      retryable: false,
    });
  });
});
