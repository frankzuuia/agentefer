import {
  CognitiveProviderError,
  type CognitiveProvider,
  type CognitiveTurnResult,
} from "@agentefer/ai";
import { SensitiveValue } from "@agentefer/config";
import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";
import { describe, expect, it } from "vitest";

import {
  createWhatsAppAiProcessor,
  drainWhatsAppAiOnce,
  type CreateWhatsAppAiProcessorInput,
} from "../src/whatsapp-ai-processor.js";
import {
  type ClaimedAgentTurn,
  type ClaimedOutboxEvent,
  type WhatsAppAiRpcClient,
} from "../src/whatsapp-ai-rpc.js";
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
    { direction: "inbound", contentKind: "text", content: { text: { body: "hola" } } },
  ],
  continuationParts: [],
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
  completed: string[];
  checkpoints: string[];
  agentFailures: Readonly<Record<string, unknown>>[];
  outboxOutcomes: Readonly<Record<string, unknown>>[];
}

const createRpcContract = (
  input: Readonly<{
    turns?: ClaimedAgentTurn[];
    outbox?: ClaimedOutboxEvent[];
  }> = {},
): Readonly<{ client: WhatsAppAiRpcClient; evidence: RpcEvidence }> => {
  const turns = [...(input.turns ?? [])];
  const outbox = [...(input.outbox ?? [])];
  const evidence: RpcEvidence = {
    completed: [],
    checkpoints: [],
    agentFailures: [],
    outboxOutcomes: [],
  };
  const client: WhatsAppAiRpcClient = {
    claimAgentTurn: () => Promise.resolve(turns.shift()),
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
  graphClient:
    input.graph ??
    ({
      sendMessage: () => Promise.resolve({ providerMessageId: "wamid.1" }),
    } satisfies WhatsAppGraphClient),
  logger: createStructuredLogger({ component: "whatsapp-ai-test", level: "fatal" }),
  metrics: createOperationalMetrics({ component: "whatsapp-ai-test" }),
  onOperationalStateChange: () => undefined,
});

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

    expect(cycle).toEqual({ turnCount: 1, outboxCount: 1 });
    expect(rpc.evidence.completed).toEqual(["Hola"]);
    expect(rpc.evidence.outboxOutcomes).toMatchObject([
      { outcome: "succeeded", providerMessageId: "wamid.1" },
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
    ["tool_calls", "unauthorized_provider_tool_call", "halt_safely"],
    ["provider_error", "provider_incomplete_response", "retry_provider"],
  ] as const)("settles %s safely", async (termination, errorCode, disposition) => {
    const rpc = createRpcContract({ turns: [agentClaim()] });
    await drainWhatsAppAiOnce(
      createInput({ rpc: rpc.client, provider: providerReturning(result(termination)) }),
      new AbortController().signal,
    );

    expect(rpc.evidence.agentFailures).toMatchObject([{ errorCode, disposition }]);
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
        Promise.reject(
          new CognitiveProviderError({ code: "provider_http_429", retryable: true }),
        ),
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
});
