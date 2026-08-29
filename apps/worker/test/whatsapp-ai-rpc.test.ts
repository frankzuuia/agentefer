import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createWhatsAppAiRpcClient,
  WhatsAppAiRpcError,
  type ClaimedAgentTurn,
  type ClaimedOutboxEvent,
} from "../src/whatsapp-ai-rpc.js";

type TestServer = Readonly<{ url: string; close(): Promise<void> }>;
const servers: TestServer[] = [];

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void,
): Promise<TestServer> => {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response));
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result = Object.freeze({
    url: `http://127.0.0.1:${String(address.port)}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) {
            resolve();
          } else {
            reject(error);
          }
        });
      }),
  });
  servers.push(result);
  return result;
};

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected a UTF-8 request body");
    }
    body += chunk;
  }
  return JSON.parse(body) as Record<string, unknown>;
};

const respond = (response: ServerResponse, value: unknown, status = 200): void => {
  response.statusCode = status;
  response.end(JSON.stringify(value));
};

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

const turnRow = {
  organization_id: uuids.organization,
  agent_job_id: uuids.job,
  agent_run_id: uuids.run,
  job_attempt_id: uuids.attempt,
  lease_token: uuids.lease,
  lease_expires_at: "2026-08-27T01:00:00.000Z",
  attempt_number: 1,
  provider: "minimax",
  model: "MiniMax-M3",
  reasoning_effort: null,
  system_prompt: "System prompt",
  conversation_history: [
    {
      message_id: uuids.inboundMessage,
      direction: "inbound",
      content_kind: "text",
      content: { text: { body: "hola" } },
    },
  ],
  continuation_parts: [],
  channel_connection_id: uuids.connection,
  conversation_id: uuids.conversation,
  trigger_message_id: uuids.trigger,
  correlation_id: "correlation-1",
  trace_id: null,
};

const turnClaim = (): ClaimedAgentTurn => ({
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

const emptyToolContextRow = {
  tool_definitions: [],
  tool_history: [],
  next_tool_round: 1,
} as const;

const isToolContextRequest = (request: IncomingMessage): boolean =>
  request.url === "/rest/v1/rpc/get_agent_turn_tool_context";

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

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("WhatsApp AI Supabase RPC contract", () => {
  it("preserves versioned cognitive content with boundary whitespace exactly", async () => {
    const systemPrompt = "\nSystem prompt\n";
    const continuationText = "\nPartial answer\n";
    const server = await startServer((request, response) => {
      if (isToolContextRequest(request)) {
        respond(response, [emptyToolContextRow]);
        return;
      }
      respond(response, [
        {
          ...turnRow,
          system_prompt: systemPrompt,
          continuation_parts: [{ text: continuationText }],
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const result = await client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    expect(result?.systemPrompt).toBe(systemPrompt);
    expect(result?.continuationParts).toEqual([continuationText]);
  });

  it("rejects cognitive content containing only whitespace", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [{ ...turnRow, system_prompt: "\n\t\n" }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const operation = client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    await expect(operation).rejects.toMatchObject({
      operation: "claim_whatsapp_agent_turn",
      phase: "response_contract",
      field: "system_prompt",
    } satisfies Partial<WhatsAppAiRpcError>);
  });

  it("rejects a non-string system prompt through the safe response contract", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [{ ...turnRow, system_prompt: null }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const operation = client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    await expect(operation).rejects.toMatchObject({
      operation: "claim_whatsapp_agent_turn",
      phase: "response_contract",
      field: "system_prompt",
    } satisfies Partial<WhatsAppAiRpcError>);
  });

  it("accepts a one-character non-whitespace system prompt", async () => {
    const server = await startServer((request, response) => {
      if (isToolContextRequest(request)) {
        respond(response, [emptyToolContextRow]);
        return;
      }
      respond(response, [{ ...turnRow, system_prompt: "x" }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.claimAgentTurn({
        workerId: "worker-1",
        model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
        visionModel: {
          provider: "minimax",
          model: "MiniMax-M3",
          canonical: "minimax:MiniMax-M3",
        },
        leaseSeconds: 120,
      }),
    ).resolves.toMatchObject({ systemPrompt: "x" });
  });

  it("accepts a system prompt at the exact transport boundary", async () => {
    const systemPrompt = "x".repeat(262_144);
    const server = await startServer((request, response) => {
      if (isToolContextRequest(request)) {
        respond(response, [emptyToolContextRow]);
        return;
      }
      respond(response, [{ ...turnRow, system_prompt: systemPrompt }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const result = await client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    expect(result?.systemPrompt.length).toBe(262_144);
  });

  it("rejects a system prompt above the transport boundary", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [{ ...turnRow, system_prompt: "x".repeat(262_145) }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const operation = client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    await expect(operation).rejects.toMatchObject({
      operation: "claim_whatsapp_agent_turn",
      phase: "response_contract",
      field: "system_prompt",
    } satisfies Partial<WhatsAppAiRpcError>);
  });

  it("reports only safe operation, phase and field evidence for an invalid response", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [{ ...turnRow, model: null }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const operation = client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    await expect(operation).rejects.toMatchObject({
      operation: "claim_whatsapp_agent_turn",
      phase: "response_contract",
      field: "model",
      status: undefined,
    } satisfies Partial<WhatsAppAiRpcError>);
    await expect(operation).rejects.toBeInstanceOf(WhatsAppAiRpcError);
  });

  it("recovers expired cognitive leases through the tenant-safe RPC", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/rest/v1/rpc/recover_expired_whatsapp_agent_turns");
      requestBody = await readJson(request);
      respond(response, [
        {
          scanned_count: 2,
          recovered_count: 2,
          retryable_count: 2,
          failed_count: 0,
          uncertain_count: 0,
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.recoverExpiredAgentTurns({
        workerId: "worker-1",
        retryDelaySeconds: 5,
        limit: 25,
      }),
    ).resolves.toEqual({
      scannedCount: 2,
      recoveredCount: 2,
      retryableCount: 2,
      failedCount: 0,
      uncertainCount: 0,
    });
    expect(requestBody).toMatchObject({
      target_worker_id: "worker-1",
      target_retry_delay_seconds: 5,
      target_limit: 25,
      target_organization_id: null,
    });
  });

  it("claims and validates a cognitive turn without exposing the backend key", async () => {
    let requestBody: Record<string, unknown> | undefined;
    let apiKeyHeader: string | undefined;
    const server = await startServer(async (request, response) => {
      if (isToolContextRequest(request)) {
        const toolRequestBody = await readJson(request);
        expect(toolRequestBody).toMatchObject({
          target_organization_id: uuids.organization,
          target_run_id: uuids.run,
          target_job_attempt_id: uuids.attempt,
          target_worker_id: "worker-1",
          target_lease_token: uuids.lease,
        });
        respond(response, [emptyToolContextRow]);
        return;
      }
      expect(request.url).toBe("/rest/v1/rpc/claim_whatsapp_agent_turn");
      apiKeyHeader = request.headers.apikey as string | undefined;
      requestBody = await readJson(request);
      respond(response, [turnRow]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const result = await client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    expect(apiKeyHeader).toBe("supabase-secret-test");
    expect(requestBody).toMatchObject({
      target_provider: "minimax",
      target_model: "MiniMax-M3",
      target_reasoning_effort: null,
      target_organization_id: null,
    });
    expect(result).toEqual(turnClaim());
  });

  it("loads only verified visual renditions for the active cognitive lease", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/rest/v1/rpc/get_whatsapp_media_visual_inputs");
      requestBody = await readJson(request);
      respond(response, [
        {
          message_id: uuids.inboundMessage,
          media_asset_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          analysis_sha256_hex: "a".repeat(64),
          mime_type: "image/webp",
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.getMediaVisualInputs({
        claim: turnClaim(),
        workerId: "worker-1",
        messageIds: [uuids.inboundMessage],
      }),
    ).resolves.toEqual([
      {
        messageId: uuids.inboundMessage,
        mediaAssetId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        analysisSha256Hex: "a".repeat(64),
        mimeType: "image/webp",
      },
    ]);
    expect(requestBody).toEqual({
      target_organization_id: uuids.organization,
      target_job_attempt_id: uuids.attempt,
      target_worker_id: "worker-1",
      target_lease_token: uuids.lease,
      target_message_ids: [uuids.inboundMessage],
    });
  });

  it("returns undefined when no turn or outbox work is available", async () => {
    const server = await startServer((_request, response) => {
      respond(response, []);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.claimAgentTurn({
        workerId: "worker-1",
        model: { provider: "minimax", model: "M", canonical: "minimax:M" },
        visionModel: { provider: "minimax", model: "M", canonical: "minimax:M" },
        leaseSeconds: 120,
      }),
    ).resolves.toBeUndefined();
    await expect(
      client.claimOutboxEvent({ workerId: "worker-1", leaseSeconds: 120, maxAttempts: 8 }),
    ).resolves.toBeUndefined();
  });

  it("prepares tenant tool registries through the bounded service-role RPC", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/rest/v1/rpc/prepare_customer_assistant_tools");
      requestBody = await readJson(request);
      respond(response, [{ organizations_prepared: 2, organizations_failed: 0 }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(client.prepareAgentTools({})).resolves.toEqual({
      organizationsPrepared: 2,
      organizationsFailed: 0,
    });
    expect(requestBody).toEqual({ target_limit: 100 });
  });

  it("loads authorized tools and validates durable call-result provenance", async () => {
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
    const server = await startServer((_request, response) => {
      if (isToolContextRequest(_request)) {
        respond(response, [
          {
            tool_definitions: [
              {
                name: "catalog_search",
                description: "Busca ofertas activas.",
                parameters: { type: "object", required: ["query"] },
              },
            ],
            tool_history: [
              {
                call: {
                  provider: "minimax",
                  provider_state: providerState,
                  tool_call: {
                    id: "call-1",
                    name: "catalog_search",
                    arguments: { query: "tinaco" },
                  },
                },
                result: {
                  provider_tool_call_id: "call-1",
                  tool_name: "catalog_search",
                  result: { ok: true, matches: [] },
                },
              },
            ],
            next_tool_round: 2,
          },
        ]);
        return;
      }
      respond(response, [turnRow]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const claimed = await client.claimAgentTurn({
      workerId: "worker-1",
      model: { provider: "minimax", model: "MiniMax-M3", canonical: "minimax:MiniMax-M3" },
      visionModel: {
        provider: "minimax",
        model: "MiniMax-M3",
        canonical: "minimax:MiniMax-M3",
      },
      leaseSeconds: 120,
    });

    expect(claimed?.toolDefinitions).toEqual([
      {
        name: "catalog_search",
        description: "Busca ofertas activas.",
        parameters: { type: "object", required: ["query"] },
      },
    ]);
    expect(claimed?.toolHistory).toEqual([
      {
        provider: "minimax",
        providerState,
        call: {
          id: "call-1",
          name: "catalog_search",
          argumentsJson: '{"query":"tinaco"}',
        },
        result: { ok: true, matches: [] },
      },
    ]);
    expect(claimed?.nextToolRound).toBe(2);
  });

  it.each([
    ["provider call ID", "call-other", "catalog_search"],
    ["tool name", "call-1", "catalog_get_offer"],
  ])(
    "rejects durable tool history whose result %s does not match its call",
    async (_scenario, resultCallId, resultToolName) => {
      const server = await startServer((request, response) => {
        if (isToolContextRequest(request)) {
          respond(response, [
            {
              tool_definitions: [],
              tool_history: [
                {
                  call: {
                    provider: "openai",
                    provider_state: [],
                    tool_call: { id: "call-1", name: "catalog_search", arguments: {} },
                  },
                  result: {
                    provider_tool_call_id: resultCallId,
                    tool_name: resultToolName,
                    result: { ok: true },
                  },
                },
              ],
              next_tool_round: 2,
            },
          ]);
          return;
        }
        respond(response, [turnRow]);
      });
      const client = createWhatsAppAiRpcClient({
        supabaseUrl: server.url,
        secretKey: new SensitiveValue("supabase-secret-test"),
        timeoutMilliseconds: 1_000,
      });

      await expect(
        client.claimAgentTurn({
          workerId: "worker-1",
          model: { provider: "openai", model: "gpt-future", canonical: "openai:gpt-future" },
          visionModel: {
            provider: "openai",
            model: "gpt-future",
            canonical: "openai:gpt-future",
          },
          leaseSeconds: 120,
        }),
      ).rejects.toMatchObject({
        operation: "get_agent_turn_tool_context",
        phase: "response_contract",
        field: "tool_history.provenance",
      } satisfies Partial<WhatsAppAiRpcError>);
    },
  );

  it.each([
    {
      scenario: "tool definitions are not an array",
      context: { ...emptyToolContextRow, tool_definitions: {} },
      field: "tool_definitions",
    },
    {
      scenario: "a tool definition is not an object",
      context: { ...emptyToolContextRow, tool_definitions: [null] },
      field: "tool_definitions.item",
    },
    {
      scenario: "tool history is not an array",
      context: { ...emptyToolContextRow, tool_history: {} },
      field: "tool_history",
    },
    {
      scenario: "a tool history exchange is not an object",
      context: { ...emptyToolContextRow, tool_history: [null] },
      field: "tool_history.item",
    },
    {
      scenario: "a durable tool result has an invalid shape",
      context: {
        ...emptyToolContextRow,
        tool_history: [
          {
            call: {
              provider: "openai",
              provider_state: [],
              tool_call: { id: "call-1", name: "catalog_search", arguments: {} },
            },
            result: {
              provider_tool_call_id: "call-1",
              tool_name: "catalog_search",
              result: "invalid",
            },
          },
        ],
      },
      field: "tool_history.result",
    },
    {
      scenario: "durable provider state is neither an object nor an array",
      context: {
        ...emptyToolContextRow,
        tool_history: [
          {
            call: {
              provider: "openai",
              provider_state: "invalid",
              tool_call: { id: "call-1", name: "catalog_search", arguments: {} },
            },
            result: {
              provider_tool_call_id: "call-1",
              tool_name: "catalog_search",
              result: { ok: true },
            },
          },
        ],
      },
      field: "tool_history.provider_state",
    },
  ])("rejects a malformed durable tool context: $scenario", async ({ context, field }) => {
    const server = await startServer((request, response) => {
      respond(response, isToolContextRequest(request) ? [context] : [turnRow]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.claimAgentTurn({
        workerId: "worker-1",
        model: { provider: "openai", model: "gpt-future", canonical: "openai:gpt-future" },
        visionModel: {
          provider: "openai",
          model: "gpt-future",
          canonical: "openai:gpt-future",
        },
        leaseSeconds: 120,
      }),
    ).rejects.toMatchObject({
      operation: "get_agent_turn_tool_context",
      phase: "response_contract",
      field,
    } satisfies Partial<WhatsAppAiRpcError>);
  });

  it("sends an exact tool execution envelope and validates the atomic outcome", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/rest/v1/rpc/execute_whatsapp_tool_call");
      requestBody = await readJson(request);
      respond(response, [
        {
          tool_execution_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          tool_status: "succeeded",
          tool_result: { ok: true, matches: [] },
          run_status: "waiting_provider",
          job_status: "retryable",
          was_replayed: false,
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });
    const providerState = { role: "assistant", tool_calls: [] };

    await expect(
      client.executeToolCall({
        claim: turnClaim(),
        workerId: "worker-1",
        providerRequestId: "provider-request-1",
        providerToolCallId: "call-1",
        toolName: "catalog_search",
        argumentsSafe: { query: "tinaco" },
        providerState,
        responseMetadataSafe: { total_tokens: 12 },
      }),
    ).resolves.toBeUndefined();
    expect(requestBody).toMatchObject({
      target_organization_id: uuids.organization,
      target_run_id: uuids.run,
      target_job_attempt_id: uuids.attempt,
      target_worker_id: "worker-1",
      target_lease_token: uuids.lease,
      target_provider: "minimax",
      target_provider_request_id: "provider-request-1",
      target_provider_tool_call_id: "call-1",
      target_tool_name: "catalog_search",
      target_tool_round: 1,
      target_arguments_safe: { query: "tinaco" },
      target_provider_state: providerState,
      target_response_metadata_safe: { total_tokens: 12 },
    });
  });

  it("rejects an atomic tool execution response with a malformed result", async () => {
    const server = await startServer((_request, response) => {
      respond(response, [
        {
          tool_execution_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          tool_status: "succeeded",
          tool_result: "invalid",
          run_status: "waiting_provider",
          job_status: "retryable",
          was_replayed: false,
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.executeToolCall({
        claim: turnClaim(),
        workerId: "worker-1",
        providerRequestId: "provider-request-1",
        providerToolCallId: "call-1",
        toolName: "catalog_search",
        argumentsSafe: {},
        providerState: [],
        responseMetadataSafe: {},
      }),
    ).rejects.toMatchObject({
      operation: "execute_whatsapp_tool_call",
      phase: "response_contract",
      field: "tool_result",
    } satisfies Partial<WhatsAppAiRpcError>);
  });

  it("persists completed and checkpointed provider evidence", async () => {
    const requestedPaths: string[] = [];
    const server = await startServer(async (request, response) => {
      requestedPaths.push(request.url ?? "");
      await readJson(request);
      if (request.url?.endsWith("complete_whatsapp_agent_turn") === true) {
        respond(response, [
          {
            agent_run_id: uuids.run,
            outbound_message_count: 1,
            outbox_event_ids: [uuids.outbox],
            was_replayed: false,
          },
        ]);
        return;
      }
      respond(response, [
        {
          agent_run_id: uuids.run,
          checkpoint_reference: "agent-message://checkpoint",
          was_replayed: false,
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.completeAgentTurn({
        claim: turnClaim(),
        workerId: "worker-1",
        visibleText: "Respuesta",
        providerRequestId: "provider-1",
        responseMetadataSafe: { total_tokens: 10 },
      }),
    ).resolves.toEqual({
      agentRunId: uuids.run,
      outboundMessageCount: 1,
      outboxEventIds: [uuids.outbox],
      wasReplayed: false,
    });
    await expect(
      client.checkpointAgentTurn({
        claim: turnClaim(),
        workerId: "worker-1",
        partialText: "Parcial",
        providerRequestId: "provider-2",
        responseMetadataSafe: {},
      }),
    ).resolves.toBeUndefined();
    expect(requestedPaths).toEqual([
      "/rest/v1/rpc/complete_whatsapp_agent_turn",
      "/rest/v1/rpc/checkpoint_whatsapp_agent_turn",
    ]);
  });

  it("settles provider and outbox outcomes through reviewed RPCs", async () => {
    const bodies: Record<string, unknown>[] = [];
    const server = await startServer(async (request, response) => {
      bodies.push(await readJson(request));
      respond(response, [{ status: "ok" }]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await client.settleAgentFailure({
      claim: turnClaim(),
      workerId: "worker-1",
      terminationReason: "provider_error",
      disposition: "retry_provider",
      errorCode: "provider_timeout",
    });
    await client.settleOutboxEvent({
      claim: outboxClaim(),
      workerId: "worker-1",
      outcome: "succeeded",
      providerMessageId: "wamid.1",
      retryDelaySeconds: 5,
    });

    expect(bodies[0]).toMatchObject({
      target_termination_reason: "provider_error",
      target_disposition: "retry_provider",
      target_last_error_code: "provider_timeout",
    });
    expect(bodies[1]).toMatchObject({
      target_outcome: "succeeded",
      target_provider_message_id: "wamid.1",
    });
  });

  it("claims an outbox token as a redacted SensitiveValue", async () => {
    let requestBody: Record<string, unknown> | undefined;
    const server = await startServer(async (request, response) => {
      requestBody = await readJson(request);
      respond(response, [
        {
          organization_id: uuids.organization,
          outbox_event_id: uuids.outbox,
          message_id: uuids.message,
          lease_token: uuids.lease,
          lease_expires_at: "2026-08-27T01:00:00.000Z",
          attempt_number: 1,
          api_version: "v26.0",
          phone_number_id: "123456",
          destination: "5213312345678",
          payload: { type: "text", text: { body: "respuesta" } },
          access_token: "vault-token",
          correlation_id: `outbox:${uuids.outbox}`,
        },
      ]);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    const result = await client.claimOutboxEvent({
      workerId: "worker-1",
      leaseSeconds: 120,
      maxAttempts: 8,
    });

    expect(result?.accessToken.reveal()).toBe("vault-token");
    expect(JSON.stringify(result)).not.toContain("vault-token");
    expect(requestBody).toMatchObject({ target_organization_id: null });
  });

  it.each([
    [400, "invalid"],
    [401, "rejected"],
    [503, "dependency"],
  ] as const)("classifies PostgREST HTTP %s as %s", async (status, kind) => {
    const server = await startServer((_request, response) => {
      respond(response, {}, status);
    });
    const client = createWhatsAppAiRpcClient({
      supabaseUrl: server.url,
      secretKey: new SensitiveValue("supabase-secret-test"),
      timeoutMilliseconds: 1_000,
    });

    await expect(
      client.claimOutboxEvent({ workerId: "worker-1", leaseSeconds: 120, maxAttempts: 8 }),
    ).rejects.toMatchObject({ kind });
  });
});
