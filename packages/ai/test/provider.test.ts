import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  CognitiveProviderError,
  createCognitiveProviderRegistry,
  createMiniMaxProvider,
  createOpenAiProvider,
} from "../src/index.js";

type TestServer = Readonly<{
  baseUrl: string;
  close(): Promise<void>;
}>;

const servers: TestServer[] = [];

const readRequestJson = async (request: IncomingMessage): Promise<unknown> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") {
      throw new TypeError("Expected a UTF-8 request body");
    }
    body += chunk;
  }
  return JSON.parse(body) as unknown;
};

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => Promise<void> | void,
): Promise<TestServer> => {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response)).catch((error: unknown) => {
      response.statusCode = 500;
      response.end(
        JSON.stringify({ test_error: error instanceof Error ? error.message : "error" }),
      );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result: TestServer = Object.freeze({
    baseUrl: `http://127.0.0.1:${String(address.port)}/v1/`,
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

const respondJson = (response: ServerResponse, status: number, value: unknown): void => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(value));
};

const apiKey = new SensitiveValue("provider-test-secret");
const conversation = [
  { direction: "inbound" as const, contentKind: "text", content: { text: { body: "Hola" } } },
];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("OpenAI Responses adapter", () => {
  it("sends the exact model and native tools without imposing an output cap", async () => {
    let capturedBody: unknown;
    let capturedAuthorization: string | undefined;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/v1/responses");
      capturedAuthorization = request.headers.authorization;
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "resp_123",
        status: "completed",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "¡Hola! ¿En qué puedo ayudarte?" }],
          },
        ],
        usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
      });
    });
    const provider = createOpenAiProvider({ apiKey, baseUrl: server.baseUrl });

    const result = await provider.executeTurn({
      model: "future-openai-model",
      systemPrompt: "Atiende al cliente.",
      conversation,
      continuationParts: [],
      reasoningEffort: "medium",
      tools: [
        {
          name: "catalog_search",
          description: "Busca productos autorizados.",
          parameters: { type: "object", properties: {} },
        },
      ],
    });

    expect(capturedAuthorization).toBe("Bearer provider-test-secret");
    expect(capturedBody).toEqual({
      model: "future-openai-model",
      instructions: "Atiende al cliente.",
      input: [
        {
          role: "user",
          content: "Hola",
        },
      ],
      reasoning: { effort: "medium" },
      store: false,
      tools: [
        {
          type: "function",
          name: "catalog_search",
          description: "Busca productos autorizados.",
          parameters: { type: "object", properties: {} },
          strict: false,
        },
      ],
    });
    expect(capturedBody).not.toHaveProperty("max_output_tokens");
    expect(result).toEqual({
      providerRequestId: "resp_123",
      visibleText: "¡Hola! ¿En qué puedo ayudarte?",
      terminationReason: "completed",
      toolCalls: [],
      metadataSafe: {
        status: "completed",
        usage: { input_tokens: 12, output_tokens: 8, total_tokens: 20 },
      },
    });
  });

  it("normalizes native function calls without parsing their arguments", async () => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "resp_tool",
        status: "completed",
        output: [
          {
            type: "function_call",
            call_id: "call_1",
            name: "catalog_search",
            arguments: '{"query":"tinaco"}',
          },
        ],
      });
    });
    const provider = createOpenAiProvider({ apiKey, baseUrl: server.baseUrl });

    const result = await provider.executeTurn({
      model: "gpt-test",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
    });

    expect(result.terminationReason).toBe("tool_calls");
    expect(result.toolCalls).toEqual([
      { id: "call_1", name: "catalog_search", argumentsJson: '{"query":"tinaco"}' },
    ]);
    expect(capturedBody).not.toHaveProperty("tools");
    expect(capturedBody).not.toHaveProperty("reasoning");
  });

  it("preserves outbound roles and continuation instructions exactly", async () => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "resp_continuation",
        status: "completed",
        output: [],
      });
    });

    await createOpenAiProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "gpt-future",
      systemPrompt: "Sistema exacto",
      conversation: [
        {
          direction: "outbound",
          contentKind: "text",
          content: { text: { body: "Respuesta anterior" } },
        },
      ],
      continuationParts: ["Parte uno", "Parte dos"],
    });

    expect(capturedBody).toEqual({
      model: "gpt-future",
      instructions: "Sistema exacto",
      input: [
        {
          role: "assistant",
          content: "Respuesta anterior",
        },
        { role: "assistant", content: "Parte uno" },
        { role: "assistant", content: "Parte dos" },
        {
          role: "user",
          content: "Continúa exactamente desde la respuesta parcial anterior sin repetirla.",
        },
      ],
      store: false,
    });
  });

  it("filters unsafe or invalid usage counters", async () => {
    const server = await startServer((_request, response) => {
      respondJson(response, 200, {
        id: "resp_usage",
        status: "completed",
        output: [],
        usage: {
          input_tokens: 0,
          output_tokens: -1,
          total_tokens: 1.5,
          prompt_tokens: "12",
          completion_tokens: 7,
          secret_internal_counter: 999,
        },
      });
    });

    const result = await createOpenAiProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "gpt-test",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
    });

    expect(result.metadataSafe).toEqual({
      status: "completed",
      usage: { input_tokens: 0, completion_tokens: 7 },
    });
  });

  it.each([
    ["max_output_tokens", "output_limit"],
    ["content_filter", "content_filter"],
    ["unknown", "provider_error"],
  ] as const)("maps incomplete reason %s to %s", async (reason, expected) => {
    const server = await startServer((_request, response) => {
      respondJson(response, 200, {
        id: `resp_${reason}`,
        status: "incomplete",
        incomplete_details: { reason },
        output: [],
      });
    });

    const result = await createOpenAiProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "gpt-test",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
    });

    expect(result.terminationReason).toBe(expected);
  });
});

describe("MiniMax OpenAI-compatible adapter", () => {
  it("preserves the exact model and continuation context", async () => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      expect(request.url).toBe("/v1/chat/completions");
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "minimax_123",
        choices: [{ finish_reason: "stop", message: { content: "Qué tal, ¿qué buscas?" } }],
        usage: { prompt_tokens: 10, completion_tokens: 6, total_tokens: 16 },
      });
    });
    const provider = createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl });

    const result = await provider.executeTurn({
      model: "MiniMax-M2.7-highspeed",
      systemPrompt: "Atiende.",
      conversation,
      continuationParts: ["Respuesta parcial"],
      tools: [],
    });

    expect(capturedBody).toEqual({
      model: "MiniMax-M2.7-highspeed",
      messages: [
        { role: "system", content: "Atiende." },
        {
          role: "user",
          content: "Hola",
        },
        { role: "assistant", content: "Respuesta parcial" },
        {
          role: "user",
          content: "Continúa exactamente desde la respuesta parcial anterior sin repetirla.",
        },
      ],
      reasoning_split: true,
    });
    expect(capturedBody).not.toHaveProperty("max_tokens");
    expect(result.visibleText).toBe("Qué tal, ¿qué buscas?");
    expect(result.terminationReason).toBe("completed");
  });

  it.each([
    ["length", "output_limit"],
    ["content_filter", "content_filter"],
    ["unexpected", "provider_error"],
  ] as const)("maps finish reason %s to %s", async (finishReason, expected) => {
    const server = await startServer((_request, response) => {
      respondJson(response, 200, {
        id: "minimax_finish",
        choices: [{ finish_reason: finishReason, message: { content: "partial" } }],
      });
    });

    const result = await createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "MiniMax-Future",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
    });

    expect(result.terminationReason).toBe(expected);
  });

  it("normalizes compatible tool calls", async () => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "minimax_tool",
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: "",
              tool_calls: [
                {
                  id: "tool_1",
                  function: { name: "catalog_search", arguments: '{"query":"llanta"}' },
                },
              ],
            },
          },
        ],
      });
    });

    const result = await createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "MiniMax-M3",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
      tools: [
        {
          name: "catalog_search",
          description: "Busca",
          parameters: { type: "object" },
        },
      ],
    });

    expect(result.terminationReason).toBe("tool_calls");
    expect(result.toolCalls[0]).toEqual({
      id: "tool_1",
      name: "catalog_search",
      argumentsJson: '{"query":"llanta"}',
    });
    expect(capturedBody).toEqual({
      model: "MiniMax-M3",
      messages: [
        { role: "system", content: "system" },
        {
          role: "user",
          content: "Hola",
        },
      ],
      reasoning_split: true,
      tools: [
        {
          type: "function",
          function: {
            name: "catalog_search",
            description: "Busca",
            parameters: { type: "object" },
          },
        },
      ],
    });
  });

  it("keeps MiniMax reasoning outside the customer-visible response", async () => {
    const privateReasoning = "The user asks who I am; introduce the business assistant.";
    const server = await startServer((_request, response) => {
      respondJson(response, 200, {
        id: "minimax_reasoning_split",
        choices: [
          {
            finish_reason: "stop",
            message: {
              content: "¡Hola! Soy el asistente comercial de este negocio. ¿En qué puedo ayudarte?",
              reasoning_details: [{ type: "text", text: privateReasoning }],
            },
          },
        ],
      });
    });

    const result = await createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "MiniMax-M3",
      systemPrompt: "Responde de forma natural.",
      conversation,
      continuationParts: [],
    });

    expect(result.visibleText).toBe(
      "¡Hola! Soy el asistente comercial de este negocio. ¿En qué puedo ayudarte?",
    );
    expect(JSON.stringify(result)).not.toContain(privateReasoning);
  });
});

describe("provider-neutral conversation serialization", () => {
  it("preserves the structured envelope for non-text channel content", async () => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "minimax_media",
        choices: [{ finish_reason: "stop", message: { content: "Recibí la imagen." } }],
      });
    });

    await createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "MiniMax-M3",
      systemPrompt: "Atiende.",
      conversation: [
        {
          direction: "inbound",
          contentKind: "media",
          content: {
            media: { kind: "image", object_key: "tenant/image.jpg" },
            text: { body: "Leyenda que pertenece al sobre multimedia" },
          },
        },
      ],
      continuationParts: [],
    });

    expect(capturedBody).toEqual({
      model: "MiniMax-M3",
      messages: [
        { role: "system", content: "Atiende." },
        {
          role: "user",
          content: JSON.stringify({
            content_kind: "media",
            content: {
              media: { kind: "image", object_key: "tenant/image.jpg" },
              text: { body: "Leyenda que pertenece al sobre multimedia" },
            },
          }),
        },
      ],
      reasoning_split: true,
    });
  });

  it.each([
    ["non-record content", "raw-text"],
    ["non-record text member", { text: 7 }],
    ["non-text body", { text: { body: 7 } }],
  ] as const)("fails closed for malformed text with %s", async (_caseName, content) => {
    let capturedBody: unknown;
    const server = await startServer(async (request, response) => {
      capturedBody = await readRequestJson(request);
      respondJson(response, 200, {
        id: "minimax_malformed_text",
        choices: [{ finish_reason: "stop", message: { content: "No pude leer el mensaje." } }],
      });
    });

    await createMiniMaxProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "MiniMax-M3",
      systemPrompt: "Atiende.",
      conversation: [{ direction: "inbound", contentKind: "text", content }],
      continuationParts: [],
    });

    expect(capturedBody).toEqual({
      model: "MiniMax-M3",
      messages: [
        { role: "system", content: "Atiende." },
        {
          role: "user",
          content: JSON.stringify({ content_kind: "text", content }),
        },
      ],
      reasoning_split: true,
    });
  });
});

describe("provider failure and registry boundaries", () => {
  it.each([
    [401, false, "provider_http_401"],
    [429, true, "provider_http_429"],
    [503, true, "provider_http_503"],
  ] as const)("classifies HTTP %s", async (status, retryable, code) => {
    const server = await startServer((_request, response) => {
      respondJson(response, status, { error: { message: "not exposed" } });
    });
    const operation = createOpenAiProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
      model: "gpt-test",
      systemPrompt: "system",
      conversation,
      continuationParts: [],
    });

    await expect(operation).rejects.toMatchObject({ code, retryable });
  });

  it("rejects malformed provider JSON", async () => {
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.end("not-json");
    });

    await expect(
      createOpenAiProvider({ apiKey, baseUrl: server.baseUrl }).executeTurn({
        model: "gpt-test",
        systemPrompt: "system",
        conversation,
        continuationParts: [],
      }),
    ).rejects.toBeInstanceOf(CognitiveProviderError);
  });

  it("distinguishes caller cancellation from a retryable transport failure", async () => {
    const cancelledController = new AbortController();
    cancelledController.abort();

    await expect(
      createOpenAiProvider({ apiKey, baseUrl: "http://127.0.0.1:1/v1/" }).executeTurn({
        model: "gpt-test",
        systemPrompt: "system",
        conversation,
        continuationParts: [],
        signal: cancelledController.signal,
      }),
    ).rejects.toMatchObject({
      code: "provider_request_cancelled",
      retryable: false,
      effectCertain: true,
    });

    await expect(
      createMiniMaxProvider({ apiKey, baseUrl: "http://127.0.0.1:1/v1/" }).executeTurn({
        model: "MiniMax-Test",
        systemPrompt: "system",
        conversation,
        continuationParts: [],
      }),
    ).rejects.toMatchObject({
      code: "provider_transport_failed",
      retryable: true,
      effectCertain: true,
    });
  });

  it("registers only providers with supplied credentials", () => {
    const registry = createCognitiveProviderRegistry({
      minimax: { apiKey, baseUrl: "https://api.example.test/v1/" },
    });

    expect(registry.has("minimax")).toBe(true);
    expect(registry.has("openai")).toBe(false);

    const openAiOnly = createCognitiveProviderRegistry({
      openai: { apiKey, baseUrl: "https://api.example.test/v1/" },
    });
    expect([...openAiOnly.keys()]).toEqual(["openai"]);

    const both = createCognitiveProviderRegistry({
      openai: { apiKey, baseUrl: "https://openai.example.test/v1/" },
      minimax: { apiKey, baseUrl: "https://minimax.example.test/v1/" },
    });
    expect([...both.keys()]).toEqual(["openai", "minimax"]);

    expect(createCognitiveProviderRegistry({}).size).toBe(0);
  });
});
