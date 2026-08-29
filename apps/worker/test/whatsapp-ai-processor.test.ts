import {
  CognitiveProviderError,
  type CognitiveProvider,
  type CognitiveTurnResult,
} from "@agentefer/ai";
import { SensitiveValue } from "@agentefer/config";
import {
  createOperationalMetrics,
  createStructuredLogger,
  type CompletedOperation,
  type LogAttributes,
  type LogOutcome,
  type OperationalMetrics,
  type StructuredLogger,
} from "@agentefer/observability";
import { describe, expect, it } from "vitest";

import {
  createWhatsAppAiProcessor,
  drainWhatsAppAiOnce,
  type CreateWhatsAppAiProcessorInput,
} from "../src/whatsapp-ai-processor.js";
import {
  type ClaimedAgentTurn,
  type ClaimedOutboxEvent,
  type WhatsAppMediaVisualInput,
  type WhatsAppAiRpcClient,
} from "../src/whatsapp-ai-rpc.js";
import { type MediaStorageClient } from "../src/media-storage.js";
import { WhatsAppGraphError, type WhatsAppGraphClient } from "../src/whatsapp-graph.js";

const uuids = {
  organization: "11111111-1111-4111-8111-111111111111",
  job: "22222222-2222-4222-8222-222222222222",
  run: "33333333-3333-4333-8333-333333333333",
  attempt: "44444444-4444-4444-8444-444444444444",
  lease: "55555555-5555-4555-8555-555555555555",
  connection: "66666666-6666-4666-8666-666666666666",
  conversation: "77777777-7777-4777-8777-777777777777",
  trigger: "88888888-8888-4888-8888-888888888888",
  outbox: "99999999-9999-4999-8999-999999999999",
  message: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  inboundMessage: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
} as const;

const agentClaim = (): ClaimedAgentTurn => ({
  organizationId: uuids.organization,
  agentJobId: uuids.job,
  agentRunId: uuids.run,
  jobAttemptId: uuids.attempt,
  leaseToken: uuids.lease,
  leaseExpiresAt: "2026-08-27T01:00:00.000Z",
  attemptNumber: 1,
  provider: "minimax",
  model: "MiniMax-M3",
  systemPrompt: "System prompt",
  conversationHistory: [
    {
      messageId: uuids.inboundMessage,
      direction: "inbound",
      contentKind: "text",
      content: { text: { body: "hola" } },
    },
  ],
  continuationParts: [],
  toolDefinitions: [],
  toolHistory: [],
  nextToolRound: 1,
  channelConnectionId: uuids.connection,
  conversationId: uuids.conversation,
  triggerMessageId: uuids.trigger,
  correlationId: "correlation-1",
});

const outboxClaim = (): ClaimedOutboxEvent => ({
  organizationId: uuids.organization,
  outboxEventId: uuids.outbox,
  messageId: uuids.message,
  leaseToken: uuids.lease,
  leaseExpiresAt: "2026-08-27T01:00:00.000Z",
  attemptNumber: 1,
  apiVersion: "v26.0",
  phoneNumberId: "123456",
  destination: "5213312345678",
  payload: { type: "text", text: { body: "respuesta" } },
  accessToken: new SensitiveValue("vault-token"),
  correlationId: `outbox:${uuids.outbox}`,
});

interface RpcEvidence {
  preparationCalls: number;
  preparationSignals: (AbortSignal | undefined)[];
  recoveryCalls: number;
  completed: string[];
  checkpoints: string[];
  toolExecutions: Readonly<Record<string, unknown>>[];
  agentFailures: Readonly<Record<string, unknown>>[];
  outboxOutcomes: Readonly<Record<string, unknown>>[];
  mediaVisualInputRequests: string[][];
}

const createRpcContract = (
  input: Readonly<{
    turns?: ClaimedAgentTurn[];
    outbox?: ClaimedOutboxEvent[];
    preparationResult?: Readonly<{
      organizationsPrepared: number;
      organizationsFailed: number;
    }>;
    preparationError?: Error;
    mediaVisualInputs?: readonly WhatsAppMediaVisualInput[];
  }> = {},
): Readonly<{ client: WhatsAppAiRpcClient; evidence: RpcEvidence }> => {
  const turns = [...(input.turns ?? [])];
  const outbox = [...(input.outbox ?? [])];
  const evidence: RpcEvidence = {
    preparationCalls: 0,
    preparationSignals: [],
    recoveryCalls: 0,
    completed: [],
    checkpoints: [],
    toolExecutions: [],
    agentFailures: [],
    outboxOutcomes: [],
    mediaVisualInputRequests: [],
  };
  const client: WhatsAppAiRpcClient = {
    prepareAgentTools: (value) => {
      evidence.preparationCalls += 1;
      evidence.preparationSignals.push(value.signal);
      if (input.preparationError !== undefined) {
        return Promise.reject(input.preparationError);
      }
      return Promise.resolve(
        input.preparationResult ?? { organizationsPrepared: 1, organizationsFailed: 0 },
      );
    },
    recoverExpiredAgentTurns: () => {
      evidence.recoveryCalls += 1;
      return Promise.resolve({
        scannedCount: 0,
        recoveredCount: 0,
        retryableCount: 0,
        failedCount: 0,
        uncertainCount: 0,
      });
    },
    claimAgentTurn: () => Promise.resolve(turns.shift()),
    getMediaVisualInputs: (value) => {
      evidence.mediaVisualInputRequests.push([...value.messageIds]);
      return Promise.resolve(input.mediaVisualInputs ?? []);
    },
    completeAgentTurn: (value) => {
      evidence.completed.push(value.visibleText);
      return Promise.resolve({
        agentRunId: value.claim.agentRunId,
        outboundMessageCount: 1,
        outboxEventIds: [uuids.outbox],
        wasReplayed: false,
      });
    },
    checkpointAgentTurn: (value) => {
      evidence.checkpoints.push(value.partialText);
      return Promise.resolve();
    },
    settleAgentFailure: (value) => {
      evidence.agentFailures.push(value);
      return Promise.resolve();
    },
    executeToolCall: (value) => {
      evidence.toolExecutions.push(value);
      return Promise.resolve();
    },
    claimOutboxEvent: () => Promise.resolve(outbox.shift()),
    settleOutboxEvent: (value) => {
      evidence.outboxOutcomes.push(value);
      return Promise.resolve();
    },
  };
  return Object.freeze({ client, evidence });
};

const result = (
  terminationReason: CognitiveTurnResult["terminationReason"],
  visibleText = "Respuesta real",
): CognitiveTurnResult => ({
  providerRequestId: "provider-request-1",
  visibleText,
  terminationReason,
  toolCalls:
    terminationReason === "tool_calls"
      ? [{ id: "call-1", name: "unauthorized", argumentsJson: "{}" }]
      : [],
  metadataSafe: { total_tokens: 10 },
});

const providerReturning = (value: CognitiveTurnResult): CognitiveProvider => ({
  executeTurn: () => Promise.resolve(value),
});

const createInput = (
  input: Readonly<{
    rpc: WhatsAppAiRpcClient;
    provider?: CognitiveProvider;
    graph?: WhatsAppGraphClient;
    logger?: StructuredLogger;
    metrics?: OperationalMetrics;
    mediaStorageClient?: MediaStorageClient;
  }>,
): CreateWhatsAppAiProcessorInput => ({
  configuration: {
    workerId: "worker-test",
    pollIntervalMilliseconds: 100,
    leaseSeconds: 120,
    maxAttempts: 8,
    retryDelaySeconds: 5,
    batchSize: 25,
    turnTimeoutMilliseconds: 1_000,
    model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
    visionModel: {
      provider: "minimax",
      model: "MiniMax-M3",
      canonical: "minimax:MiniMax-M3",
    },
  },
  providers:
    input.provider === undefined
      ? new Map()
      : new Map<string, CognitiveProvider>([["minimax", input.provider]]),
  rpcClient: input.rpc,
  mediaStorageClient:
    input.mediaStorageClient ??
    ({
      uploadObject: () => Promise.reject(new Error("unused in text turn test")),
      downloadPrivateObject: () => Promise.reject(new Error("unused in text turn test")),
      createSignedPrivateUrl: () => Promise.resolve(new URL("https://storage.test/unused")),
      createPublicObjectUrl: () => new URL("https://storage.test/unused"),
    } satisfies MediaStorageClient),
  graphClient:
    input.graph ??
    ({
      sendMessage: () => Promise.resolve({ providerMessageId: "wamid.1" }),
    } satisfies WhatsAppGraphClient),
  logger: input.logger ?? createStructuredLogger({ component: "whatsapp-ai-test", level: "fatal" }),
  metrics: input.metrics ?? createOperationalMetrics({ component: "whatsapp-ai-test" }),
  onOperationalStateChange: () => undefined,
});

const createObservabilityEvidence = (): Readonly<{
  logger: StructuredLogger;
  metrics: OperationalMetrics;
  started: string[];
  completed: CompletedOperation[];
  warnings: Readonly<Record<string, unknown>>[];
}> => {
  const started: string[] = [];
  const completed: CompletedOperation[] = [];
  const warnings: Readonly<Record<string, unknown>>[] = [];
  return Object.freeze({
    started,
    completed,
    warnings,
    metrics: Object.freeze({
      recordStarted: (operation: string) => started.push(operation),
      recordCompleted: (operation: CompletedOperation) => completed.push(operation),
    }),
    logger: Object.freeze({
      debug: () => undefined,
      info: () => undefined,
      warn: (event: string, outcome: LogOutcome = "observed", attributes: LogAttributes = {}) =>
        warnings.push({ event, outcome, attributes }),
      error: () => undefined,
    }),
  });
};

describe("WhatsApp cognitive and outbox processor", () => {
  it("persists visible provider output and sends the resulting outbox", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()], outbox: [outboxClaim()] });
    const cycle = await drainWhatsAppAiOnce(
      createInput({
        rpc: rpc.client,
        provider: providerReturning(result("completed", "  Hola  ")),
      }),
      new AbortController().signal,
    );

    expect(cycle).toEqual({
      recoveredTurnCount: 0,
      uncertainRecoveryCount: 0,
      turnCount: 1,
      outboxCount: 1,
    });
    expect(rpc.evidence.recoveryCalls).toBe(1);
    expect(rpc.evidence.preparationCalls).toBe(1);
    expect(rpc.evidence.completed).toEqual(["Hola"]);
    expect(rpc.evidence.outboxOutcomes).toMatchObject([
      { outcome: "succeeded", providerMessageId: "wamid.1" },
    ]);
  });

  it("attaches a short-lived verified WebP URL to an image turn", async () => {
    const imageMessageId = uuids.inboundMessage;
    const mediaAssetId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const imageClaim: ClaimedAgentTurn = {
      ...agentClaim(),
      conversationHistory: [
        {
          messageId: imageMessageId,
          direction: "inbound",
          contentKind: "media",
          content: { type: "image", image: { id: "meta-media-1" } },
        },
      ],
    };
    const visualInput: WhatsAppMediaVisualInput = {
      messageId: imageMessageId,
      mediaAssetId,
      analysisSha256Hex: "a".repeat(64),
      mimeType: "image/webp",
    };
    const rpc = createRpcContract({ turns: [imageClaim], mediaVisualInputs: [visualInput] });
    const signedDescriptors: Readonly<Record<string, unknown>>[] = [];
    let providerRequest: Parameters<CognitiveProvider["executeTurn"]>[0] | undefined;
    const provider: CognitiveProvider = {
      executeTurn: (request) => {
        providerRequest = request;
        return Promise.resolve(result("completed"));
      },
    };
    const mediaStorageClient: MediaStorageClient = {
      uploadObject: () => Promise.reject(new Error("unused")),
      downloadPrivateObject: () => Promise.reject(new Error("unused")),
      createSignedPrivateUrl: (descriptor, expiresInSeconds) => {
        signedDescriptors.push({ descriptor, expiresInSeconds });
        return Promise.resolve(new URL("https://storage.test/signed-analysis.webp"));
      },
      createPublicObjectUrl: () => new URL("https://storage.test/public.webp"),
    };

    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider, mediaStorageClient }),
      new AbortController().signal,
    );

    expect(rpc.evidence.mediaVisualInputRequests).toEqual([[imageMessageId]]);
    expect(signedDescriptors).toMatchObject([
      {
        expiresInSeconds: 300,
        descriptor: {
          organizationId: uuids.organization,
          mediaAssetId,
          renditionKind: "analysis_webp",
          contentSha256Hex: "a".repeat(64),
          mimeType: "image/webp",
        },
      },
    ]);
    expect(providerRequest?.conversation).toEqual([
      {
        direction: "inbound",
        contentKind: "media",
        content: { type: "image", image: { id: "meta-media-1" } },
        imageInputs: [{ imageUrl: "https://storage.test/signed-analysis.webp", detail: "high" }],
      },
    ]);
  });

  it("stores output-limit text as a continuation checkpoint", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(
      createInput({
        rpc: rpc.client,
        provider: providerReturning(result("output_limit", "Parcial")),
      }),
      new AbortController().signal,
    );

    expect(rpc.evidence.checkpoints).toEqual(["Parcial"]);
    expect(rpc.evidence.completed).toEqual([]);
  });

  it.each([
    ["content_filter", "provider_content_filter", "halt_safely"],
    ["provider_error", "provider_incomplete_response", "retry_provider"],
  ] as const)("settles %s safely", async (termination, errorCode, disposition) => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(result(termination)) }),
      new AbortController().signal,
    );

    expect(rpc.evidence.agentFailures).toMatchObject([{ errorCode, disposition }]);
  });

  it("executes one native read-only tool call and persists its continuation state", async () => {
    const claim: ClaimedAgentTurn = {
      ...agentClaim(),
      toolDefinitions: [
        {
          name: "catalog_search",
          description: "Busca ofertas vigentes del catálogo autorizado.",
          parameters: { type: "object", properties: { query: { type: "string" } } },
        },
      ],
    };
    const providerState = {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call-1",
          function: { name: "catalog_search", arguments: '{"query":"tinaco"}' },
        },
      ],
    };
    const rpc = createRpcContract({ turns: [claim] });
    let providerRequest: Parameters<CognitiveProvider["executeTurn"]>[0] | undefined;
    const provider: CognitiveProvider = {
      executeTurn: (request) => {
        providerRequest = request;
        return Promise.resolve({
          providerRequestId: "provider-request-tool-1",
          visibleText: "",
          terminationReason: "tool_calls",
          toolCalls: [
            {
              id: "call-1",
              name: "catalog_search",
              argumentsJson: '{"query":"tinaco"}',
            },
          ],
          toolContinuationState: providerState,
          metadataSafe: { total_tokens: 12 },
        });
      },
    };

    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider }),
      new AbortController().signal,
    );

    expect(providerRequest?.tools).toEqual(claim.toolDefinitions);
    expect(providerRequest?.toolHistory).toEqual([]);
    expect(rpc.evidence.completed).toEqual([]);
    expect(rpc.evidence.agentFailures).toEqual([]);
    expect(rpc.evidence.toolExecutions).toMatchObject([
      {
        providerRequestId: "provider-request-tool-1",
        providerToolCallId: "call-1",
        toolName: "catalog_search",
        argumentsSafe: { query: "tinaco" },
        providerState,
      },
    ]);
  });

  it.each([
    [
      "missing continuation state",
      {
        providerRequestId: "provider-request-invalid-1",
        visibleText: "",
        terminationReason: "tool_calls" as const,
        toolCalls: [{ id: "call-1", name: "catalog_search", argumentsJson: "{}" }],
        metadataSafe: {},
      },
      "provider_tool_continuation_invalid",
    ],
    [
      "multiple calls in a sequential round",
      {
        providerRequestId: "provider-request-invalid-2",
        visibleText: "",
        terminationReason: "tool_calls" as const,
        toolCalls: [
          { id: "call-1", name: "catalog_search", argumentsJson: "{}" },
          { id: "call-2", name: "catalog_get_offer", argumentsJson: "{}" },
        ],
        toolContinuationState: { role: "assistant", tool_calls: [] },
        metadataSafe: {},
      },
      "provider_tool_continuation_invalid",
    ],
  ])("fails closed for %s", async (_scenario, providerResult, errorCode) => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(providerResult) }),
      new AbortController().signal,
    );

    expect(rpc.evidence.toolExecutions).toEqual([]);
    expect(rpc.evidence.agentFailures).toMatchObject([
      { errorCode, disposition: "halt_safely", terminationReason: "provider_error" },
    ]);
  });

  it("fails closed when native tool arguments are not valid JSON", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    const providerResult: CognitiveTurnResult = {
      providerRequestId: "provider-request-invalid-json",
      visibleText: "",
      terminationReason: "tool_calls",
      toolCalls: [{ id: "call-1", name: "catalog_search", argumentsJson: "{" }],
      toolContinuationState: { role: "assistant", tool_calls: [] },
      metadataSafe: {},
    };
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(providerResult) }),
      new AbortController().signal,
    );

    expect(rpc.evidence.toolExecutions).toEqual([]);
    expect(rpc.evidence.agentFailures).toMatchObject([
      { errorCode: "provider_tool_arguments_invalid_json", disposition: "halt_safely" },
    ]);
  });

  it.each(["[]", "null", '"tinaco"'])(
    "fails closed when native tool arguments are valid JSON but not an object: %s",
    async (argumentsJson) => {
      const rpc = createRpcContract({ turns: [agentClaim()] });
      const providerResult: CognitiveTurnResult = {
        providerRequestId: "provider-request-invalid-shape",
        visibleText: "",
        terminationReason: "tool_calls",
        toolCalls: [{ id: "call-1", name: "catalog_search", argumentsJson }],
        toolContinuationState: { role: "assistant", tool_calls: [] },
        metadataSafe: {},
      };

      await drainWhatsAppAiOnce(
        createInput({ rpc: rpc.client, provider: providerReturning(providerResult) }),
        new AbortController().signal,
      );

      expect(rpc.evidence.toolExecutions).toEqual([]);
      expect(rpc.evidence.agentFailures).toMatchObject([
        { errorCode: "provider_tool_arguments_not_object", disposition: "halt_safely" },
      ]);
    },
  );

  it("isolates a partial tenant tool preparation failure without stopping other tenants", async () => {
    const observability = createObservabilityEvidence();
    const rpc = createRpcContract({
      turns: [agentClaim()],
      preparationResult: { organizationsPrepared: 1, organizationsFailed: 1 },
    });

    const signal = new AbortController().signal;
    await expect(
      drainWhatsAppAiOnce(
        createInput({
          rpc: rpc.client,
          provider: providerReturning(result("completed")),
          logger: observability.logger,
          metrics: observability.metrics,
        }),
        signal,
      ),
    ).resolves.toMatchObject({ turnCount: 1 });
    expect(rpc.evidence.preparationCalls).toBe(1);
    expect(rpc.evidence.preparationSignals).toEqual([signal]);
    expect(rpc.evidence.recoveryCalls).toBe(1);
    expect(rpc.evidence.completed).toEqual(["Respuesta real"]);
    expect(observability.started).toContain("whatsapp.ai.tool_preparation");
    expect(observability.completed).toContainEqual(
      expect.objectContaining({
        operation: "whatsapp.ai.tool_preparation",
        outcome: "failed",
        errorCategory: "dependency",
      }),
    );
    expect(observability.warnings).toEqual([
      {
        event: "worker.whatsapp.ai.tool_preparation_partial",
        outcome: "failed",
        attributes: { organizations_prepared: 1, organizations_failed: 1 },
      },
    ]);
  });

  it("records successful tenant tool preparation without a partial-failure warning", async () => {
    const observability = createObservabilityEvidence();
    const rpc = createRpcContract();

    await drainWhatsAppAiOnce(
      createInput({
        rpc: rpc.client,
        provider: providerReturning(result("completed")),
        logger: observability.logger,
        metrics: observability.metrics,
      }),
      new AbortController().signal,
    );

    expect(observability.completed).toContainEqual(
      expect.objectContaining({
        operation: "whatsapp.ai.tool_preparation",
        outcome: "succeeded",
      }),
    );
    expect(observability.warnings).toEqual([]);
  });

  it("fails the cycle before claims when the tenant preparation RPC is unavailable", async () => {
    const observability = createObservabilityEvidence();
    const preparationError = new Error("preparation unavailable");
    const rpc = createRpcContract({
      turns: [agentClaim()],
      preparationError,
    });

    await expect(
      drainWhatsAppAiOnce(
        createInput({
          rpc: rpc.client,
          provider: providerReturning(result("completed")),
          logger: observability.logger,
          metrics: observability.metrics,
        }),
        new AbortController().signal,
      ),
    ).rejects.toBe(preparationError);
    expect(rpc.evidence.preparationCalls).toBe(1);
    expect(rpc.evidence.recoveryCalls).toBe(0);
    expect(rpc.evidence.completed).toEqual([]);
    expect(observability.completed).toContainEqual(
      expect.objectContaining({
        operation: "whatsapp.ai.tool_preparation",
        outcome: "failed",
        errorCategory: "internal",
      }),
    );
  });

  it("retries an empty completed response instead of sending it", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(result("completed", "   ")) }),
      new AbortController().signal,
    );

    expect(rpc.evidence.agentFailures).toMatchObject([
      { errorCode: "provider_visible_output_empty", disposition: "retry_provider" },
    ]);
  });

  it("fails closed when the selected provider adapter is unavailable", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(createInput({ rpc: rpc.client }), new AbortController().signal);

    expect(rpc.evidence.agentFailures).toMatchObject([
      { errorCode: "provider_adapter_not_configured", disposition: "halt_safely" },
    ]);
  });

  it.each([
    ["retryable", "retryable"],
    ["uncertain", "uncertain"],
    ["rejected", "failed"],
  ] as const)("settles a %s Graph failure as %s", async (kind, expectedOutcome) => {
    const rpc = createRpcContract({ outbox: [outboxClaim()] });
    const graph: WhatsAppGraphClient = {
      sendMessage: () => Promise.reject(new WhatsAppGraphError(kind)),
    };
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(result("completed")), graph }),
      new AbortController().signal,
    );

    expect(rpc.evidence.outboxOutcomes).toMatchObject([{ outcome: expectedOutcome }]);
  });

  it("classifies provider transport failures without inventing customer text", async () => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    const provider: CognitiveProvider = {
      executeTurn: () =>
        Promise.reject(new CognitiveProviderError({ code: "provider_http_429", retryable: true })),
    };
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider }),
      new AbortController().signal,
    );

    expect(rpc.evidence.completed).toEqual([]);
    expect(rpc.evidence.agentFailures).toMatchObject([
      { errorCode: "provider_http_429", disposition: "retry_provider" },
    ]);
  });

  it("starts once and stops its polling loop without leaving work running", async () => {
    const rpc = createRpcContract();
    const processor = createWhatsAppAiProcessor(
      createInput({ rpc: rpc.client, provider: providerReturning(result("completed")) }),
    );

    await expect(processor.start()).resolves.toBe(true);
    await expect(processor.start()).rejects.toThrow("cannot be started twice");
    await processor.stop();
  });

  it("prepares tenant tools once per worker process instead of on every poll", async () => {
    const rpc = createRpcContract();
    const baseInput = createInput({
      rpc: rpc.client,
      provider: providerReturning(result("completed")),
    });
    const processor = createWhatsAppAiProcessor({
      ...baseInput,
      configuration: { ...baseInput.configuration, pollIntervalMilliseconds: 5 },
    });

    await expect(processor.start()).resolves.toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 25));
    await processor.stop();

    expect(rpc.evidence.preparationCalls).toBe(1);
    expect(rpc.evidence.recoveryCalls).toBeGreaterThan(1);
  });
});
