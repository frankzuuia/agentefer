import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createWhatsAppAiRpcClient,
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
    { direction: "inbound", content_kind: "text", content: { text: { body: "hola" } } },
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

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("WhatsApp AI Supabase RPC contract", () => {
  it("claims and validates a cognitive turn without exposing the backend key", async () => {
    let requestBody: Record<string, unknown> | undefined;
    let apiKeyHeader: string | undefined;
    const server = await startServer(async (request, response) => {
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
