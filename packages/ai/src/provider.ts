import { type SensitiveValue } from "@agentefer/config";

import { type NormalizedTerminationReason } from "./termination.js";

const MAXIMUM_PROVIDER_RESPONSE_BYTES = 2_097_152;
const MAXIMUM_TOOL_CONTINUATION_BYTES = 900_000;

export type CognitiveConversationItem = Readonly<{
  direction: "inbound" | "outbound";
  contentKind: string;
  content: unknown;
  imageInputs?: readonly Readonly<{
    imageUrl: string;
    detail?: "low" | "high" | "auto";
  }>[];
}>;

export type NativeToolDefinition = Readonly<{
  name: string;
  description: string;
  parameters: Readonly<Record<string, unknown>>;
}>;

export type CognitiveTurnRequest = Readonly<{
  model: string;
  systemPrompt: string;
  conversation: readonly CognitiveConversationItem[];
  continuationParts: readonly string[];
  toolHistory?: readonly NativeToolExchange[];
  reasoningEffort?: string;
  tools?: readonly NativeToolDefinition[];
  signal?: AbortSignal;
}>;

export type NativeToolCall = Readonly<{
  id: string;
  name: string;
  argumentsJson: string;
}>;

export type NativeToolExchange = Readonly<{
  provider: string;
  providerState: unknown;
  call: NativeToolCall;
  result: unknown;
}>;

export type CognitiveTurnResult = Readonly<{
  providerRequestId: string;
  visibleText: string;
  terminationReason: NormalizedTerminationReason;
  toolCalls: readonly NativeToolCall[];
  toolContinuationState?: unknown;
  metadataSafe: Readonly<Record<string, unknown>>;
}>;

export type CognitiveProvider = Readonly<{
  executeTurn(request: CognitiveTurnRequest): Promise<CognitiveTurnResult>;
}>;

export type CognitiveProviderName = "openai" | "minimax";

export class CognitiveProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly effectCertain: boolean;

  constructor(
    input: Readonly<{
      code: string;
      retryable: boolean;
      effectCertain?: boolean;
      cause?: unknown;
    }>,
  ) {
    super(input.code, { cause: input.cause });
    this.name = "CognitiveProviderError";
    this.code = input.code;
    this.retryable = input.retryable;
    this.effectCertain = input.effectCertain ?? true;
  }
}

type ProviderCredentials = Readonly<{
  apiKey: SensitiveValue;
  baseUrl?: string;
}>;

type ProviderResponse = Readonly<{
  status: number;
  headers: Headers;
  body: unknown;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRequiredText = (value: unknown, code: string, maximumLength = 1_048_576): string => {
  if (typeof value !== "string" || value.length < 1 || value.length > maximumLength) {
    throw new CognitiveProviderError({ code, retryable: false });
  }
  return value;
};

const readOptionalText = (value: unknown, maximumLength = 1_048_576): string | undefined =>
  typeof value === "string" && value.length <= maximumLength ? value : undefined;

const readNonNegativeInteger = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;

const createEndpoint = (
  configuredBaseUrl: string | undefined,
  fallback: string,
  path: string,
): URL => {
  const baseUrl = new URL(configuredBaseUrl ?? fallback);
  baseUrl.search = "";
  baseUrl.hash = "";
  baseUrl.pathname = baseUrl.pathname.endsWith("/") ? baseUrl.pathname : `${baseUrl.pathname}/`;
  return new URL(path, baseUrl);
};

const decodeProviderBody = async (response: Response): Promise<unknown> => {
  const advertisedLength = response.headers.get("content-length");
  if (advertisedLength !== null) {
    const parsedLength = Number(advertisedLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAXIMUM_PROVIDER_RESPONSE_BYTES
    ) {
      throw new CognitiveProviderError({ code: "provider_response_too_large", retryable: false });
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_PROVIDER_RESPONSE_BYTES) {
    throw new CognitiveProviderError({ code: "provider_response_too_large", retryable: false });
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new CognitiveProviderError({
      code: "provider_response_invalid_json",
      retryable: false,
      cause: error,
    });
  }
};

const postProviderJson = async (
  input: Readonly<{
    endpoint: URL;
    apiKey: SensitiveValue;
    body: Readonly<Record<string, unknown>>;
    signal?: AbortSignal;
  }>,
): Promise<ProviderResponse> => {
  let response: Response;
  try {
    response = await fetch(input.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${input.apiKey.reveal()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input.body),
      cache: "no-store",
      redirect: "error",
      ...(input.signal === undefined ? {} : { signal: input.signal }),
    });
  } catch (error) {
    const cancelled = input.signal?.aborted === true;
    throw new CognitiveProviderError({
      code: cancelled ? "provider_request_cancelled" : "provider_transport_failed",
      retryable: !cancelled,
      effectCertain: true,
      cause: error,
    });
  }

  const body = await decodeProviderBody(response);
  if (!response.ok) {
    throw new CognitiveProviderError({
      code: `provider_http_${String(response.status)}`,
      retryable:
        response.status === 408 ||
        response.status === 409 ||
        response.status === 429 ||
        response.status >= 500,
      effectCertain: true,
    });
  }

  return Object.freeze({ status: response.status, headers: response.headers, body });
};

const readConversationTextBody = (item: CognitiveConversationItem): string | undefined => {
  if (item.contentKind !== "text" || !isRecord(item.content)) {
    return undefined;
  }

  const text = item.content.text;
  return isRecord(text) ? readOptionalText(text.body) : undefined;
};

const serializeConversationContent = (item: CognitiveConversationItem): string =>
  readConversationTextBody(item) ??
  JSON.stringify({ content_kind: item.contentKind, content: item.content });

const imageInputParts = (
  item: CognitiveConversationItem,
): readonly Readonly<Record<string, unknown>>[] => {
  const imageInputs = item.imageInputs ?? [];
  return imageInputs.map((imageInput) => {
    let imageUrl: URL;
    try {
      imageUrl = new URL(imageInput.imageUrl);
    } catch (error) {
      throw new CognitiveProviderError({
        code: "provider_image_url_invalid",
        retryable: false,
        cause: error,
      });
    }
    if (
      (imageUrl.protocol !== "https:" && imageUrl.protocol !== "http:") ||
      imageUrl.username !== "" ||
      imageUrl.password !== "" ||
      imageInput.imageUrl.length > 8192
    ) {
      throw new CognitiveProviderError({ code: "provider_image_url_invalid", retryable: false });
    }
    return Object.freeze({
      type: "input_image",
      image_url: imageInput.imageUrl,
      ...(imageInput.detail === undefined ? {} : { detail: imageInput.detail }),
    });
  });
};

const openAiConversationItem = (
  item: CognitiveConversationItem,
): Readonly<Record<string, unknown>> => {
  const serializedContent = serializeConversationContent(item);
  const imageParts = imageInputParts(item);
  if (imageParts.length === 0) {
    return Object.freeze({
      role: item.direction === "inbound" ? "user" : "assistant",
      content: serializedContent,
    });
  }
  return Object.freeze({
    role: item.direction === "inbound" ? "user" : "assistant",
    content: Object.freeze([{ type: "input_text", text: serializedContent }, ...imageParts]),
  });
};

type VisibleTextProjection = Readonly<{
  text: string;
  format: "provider_text" | "channel_text_envelope";
}>;

type JsonDecodeResult = Readonly<{ parsed: true; value: unknown }> | Readonly<{ parsed: false }>;

const hasExactKeys = (
  value: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
): boolean => {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
};

const decodeJson = (rawText: string): JsonDecodeResult => {
  try {
    return Object.freeze({ parsed: true, value: JSON.parse(rawText) as unknown });
  } catch {
    return Object.freeze({ parsed: false });
  }
};

const projectCustomerVisibleText = (rawText: string): VisibleTextProjection => {
  const decodedResult = decodeJson(rawText);
  if (!decodedResult.parsed) {
    return Object.freeze({ text: rawText, format: "provider_text" });
  }
  const decoded = decodedResult.value;

  if (typeof decoded !== "object" || decoded === null) {
    return Object.freeze({ text: rawText, format: "provider_text" });
  }
  if (
    !isRecord(decoded) ||
    !hasExactKeys(decoded, ["content_kind", "content"]) ||
    decoded.content_kind !== "text" ||
    !isRecord(decoded.content) ||
    !hasExactKeys(decoded.content, ["text"]) ||
    !isRecord(decoded.content.text) ||
    !hasExactKeys(decoded.content.text, ["body"])
  ) {
    throw new CognitiveProviderError({
      code: "provider_visible_output_structure_invalid",
      retryable: true,
    });
  }

  const body = readOptionalText(decoded.content.text.body);
  if (body === undefined) {
    throw new CognitiveProviderError({
      code: "provider_visible_output_structure_invalid",
      retryable: true,
    });
  }
  return Object.freeze({ text: body, format: "channel_text_envelope" });
};

const toolDefinitionsForOpenAi = (
  tools: readonly NativeToolDefinition[],
): readonly Readonly<Record<string, unknown>>[] =>
  tools.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    strict: false,
  }));

const toolDefinitionsForChatCompletions = (
  tools: readonly NativeToolDefinition[],
): readonly Readonly<Record<string, unknown>>[] =>
  tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

const safeUsage = (value: unknown): Readonly<Record<string, number>> => {
  if (!isRecord(value)) {
    return Object.freeze({});
  }
  const allowedKeys = [
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "prompt_tokens",
    "completion_tokens",
  ] as const;
  return Object.freeze(
    Object.fromEntries(
      allowedKeys.flatMap((key) => {
        const count = readNonNegativeInteger(value[key]);
        return count === undefined ? [] : [[key, count]];
      }),
    ),
  );
};

const assertToolContinuationSize = (value: unknown): void => {
  if (
    new TextEncoder().encode(JSON.stringify(value)).byteLength > MAXIMUM_TOOL_CONTINUATION_BYTES
  ) {
    throw new CognitiveProviderError({
      code: "provider_tool_continuation_too_large",
      retryable: false,
    });
  }
};

const boundedToolContinuationState = <State extends object>(state: State): Readonly<State> => {
  assertToolContinuationSize(state);
  return Object.freeze(state);
};

const parseOpenAiResponse = (value: unknown): CognitiveTurnResult => {
  if (!isRecord(value)) {
    throw new CognitiveProviderError({ code: "openai_response_invalid", retryable: false });
  }

  const providerRequestId = readRequiredText(value.id, "openai_response_id_invalid", 512);
  const output = Array.isArray(value.output) ? value.output : [];
  const visibleParts: string[] = [];
  const toolCalls: NativeToolCall[] = [];

  for (const item of output) {
    if (!isRecord(item)) {
      continue;
    }
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const contentItem of item.content) {
        if (isRecord(contentItem) && contentItem.type === "output_text") {
          const text = readOptionalText(contentItem.text);
          if (text !== undefined) {
            visibleParts.push(text);
          }
        }
      }
    }
    if (item.type === "function_call") {
      toolCalls.push(
        Object.freeze({
          id: readRequiredText(item.call_id ?? item.id, "openai_tool_call_id_invalid", 512),
          name: readRequiredText(item.name, "openai_tool_name_invalid", 160),
          argumentsJson: readRequiredText(item.arguments, "openai_tool_arguments_invalid"),
        }),
      );
    }
  }

  const status = readOptionalText(value.status, 80);
  const incompleteReason = isRecord(value.incomplete_details)
    ? readOptionalText(value.incomplete_details.reason, 120)
    : undefined;
  const terminationReason: NormalizedTerminationReason =
    toolCalls.length > 0
      ? "tool_calls"
      : status === "completed"
        ? "completed"
        : incompleteReason === "max_output_tokens"
          ? "output_limit"
          : incompleteReason === "content_filter"
            ? "content_filter"
            : "provider_error";
  const rawVisibleText = visibleParts.join("");
  const visibleTextProjection =
    terminationReason === "completed"
      ? projectCustomerVisibleText(rawVisibleText)
      : Object.freeze({ text: rawVisibleText, format: "provider_text" as const });
  const toolContinuationState =
    toolCalls.length === 0 ? undefined : boundedToolContinuationState(output);

  return Object.freeze({
    providerRequestId,
    visibleText: visibleTextProjection.text,
    terminationReason,
    toolCalls: Object.freeze(toolCalls),
    ...(toolContinuationState === undefined ? {} : { toolContinuationState }),
    metadataSafe: Object.freeze({
      status: status ?? "unknown",
      visible_output_format: visibleTextProjection.format,
      usage: safeUsage(value.usage),
    }),
  });
};

const parseMiniMaxResponse = (value: unknown): CognitiveTurnResult => {
  if (!isRecord(value) || !Array.isArray(value.choices) || !isRecord(value.choices[0])) {
    throw new CognitiveProviderError({ code: "minimax_response_invalid", retryable: false });
  }

  const choice = value.choices[0];
  const message = isRecord(choice.message) ? choice.message : undefined;
  if (message === undefined) {
    throw new CognitiveProviderError({ code: "minimax_message_invalid", retryable: false });
  }
  const rawToolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
  const toolCalls = rawToolCalls.map((toolCall) => {
    if (!isRecord(toolCall) || !isRecord(toolCall.function)) {
      throw new CognitiveProviderError({ code: "minimax_tool_call_invalid", retryable: false });
    }
    return Object.freeze({
      id: readRequiredText(toolCall.id, "minimax_tool_call_id_invalid", 512),
      name: readRequiredText(toolCall.function.name, "minimax_tool_name_invalid", 160),
      argumentsJson: readRequiredText(
        toolCall.function.arguments,
        "minimax_tool_arguments_invalid",
      ),
    });
  });
  const finishReason = readOptionalText(choice.finish_reason, 120);
  const terminationReason: NormalizedTerminationReason =
    toolCalls.length > 0 || finishReason === "tool_calls"
      ? "tool_calls"
      : finishReason === "stop"
        ? "completed"
        : finishReason === "length"
          ? "output_limit"
          : finishReason === "content_filter"
            ? "content_filter"
            : "provider_error";
  const rawVisibleText = readOptionalText(message.content) ?? "";
  const visibleTextProjection =
    terminationReason === "completed"
      ? projectCustomerVisibleText(rawVisibleText)
      : Object.freeze({ text: rawVisibleText, format: "provider_text" as const });
  const toolContinuationState =
    toolCalls.length === 0 ? undefined : boundedToolContinuationState(message);

  return Object.freeze({
    providerRequestId: readRequiredText(value.id, "minimax_response_id_invalid", 512),
    visibleText: visibleTextProjection.text,
    terminationReason,
    toolCalls: Object.freeze(toolCalls),
    ...(toolContinuationState === undefined ? {} : { toolContinuationState }),
    metadataSafe: Object.freeze({
      finish_reason: finishReason ?? "unknown",
      visible_output_format: visibleTextProjection.format,
      usage: safeUsage(value.usage),
    }),
  });
};

export const createOpenAiProvider = (credentials: ProviderCredentials): CognitiveProvider => {
  const endpoint = createEndpoint(credentials.baseUrl, "https://api.openai.com/v1/", "responses");
  return Object.freeze({
    async executeTurn(request) {
      const tools = request.tools ?? [];
      const toolHistory = request.toolHistory ?? [];
      const input: Record<string, unknown>[] = request.conversation.map((item) =>
        openAiConversationItem(item),
      );
      for (const exchange of toolHistory) {
        if (exchange.provider !== "openai" || !Array.isArray(exchange.providerState)) {
          throw new CognitiveProviderError({
            code: "openai_tool_history_invalid",
            retryable: false,
          });
        }
        for (const providerItem of exchange.providerState) {
          if (!isRecord(providerItem)) {
            throw new CognitiveProviderError({
              code: "openai_tool_history_invalid",
              retryable: false,
            });
          }
          input.push({ ...providerItem });
        }
        input.push({
          type: "function_call_output",
          call_id: exchange.call.id,
          output: JSON.stringify(exchange.result),
        });
      }
      for (const part of request.continuationParts) {
        input.push({ role: "assistant", content: part });
      }
      if (request.continuationParts.length > 0) {
        input.push({
          role: "user",
          content: "Continúa exactamente desde la respuesta parcial anterior sin repetirla.",
        });
      }
      const body: Record<string, unknown> = {
        model: request.model,
        instructions: request.systemPrompt,
        input,
        store: false,
        include: ["reasoning.encrypted_content"],
      };
      if (request.reasoningEffort !== undefined) {
        body.reasoning = { effort: request.reasoningEffort };
      }
      if (tools.length > 0) {
        body.tools = toolDefinitionsForOpenAi(tools);
        body.parallel_tool_calls = false;
      }

      return parseOpenAiResponse(
        (
          await postProviderJson({
            endpoint,
            apiKey: credentials.apiKey,
            body,
            ...(request.signal === undefined ? {} : { signal: request.signal }),
          })
        ).body,
      );
    },
  });
};

export const createMiniMaxProvider = (credentials: ProviderCredentials): CognitiveProvider => {
  const endpoint = createEndpoint(
    credentials.baseUrl,
    "https://api.minimax.io/v1/",
    "chat/completions",
  );
  return Object.freeze({
    async executeTurn(request) {
      const tools = request.tools ?? [];
      const toolHistory = request.toolHistory ?? [];
      if (request.conversation.some((item) => (item.imageInputs ?? []).length > 0)) {
        throw new CognitiveProviderError({
          code: "minimax_image_input_unsupported",
          retryable: false,
        });
      }
      const messages: Record<string, unknown>[] = [
        { role: "system", content: request.systemPrompt },
        ...request.conversation.map((item) => ({
          role: item.direction === "inbound" ? "user" : "assistant",
          content: serializeConversationContent(item),
        })),
      ];
      for (const exchange of toolHistory) {
        if (exchange.provider !== "minimax" || !isRecord(exchange.providerState)) {
          throw new CognitiveProviderError({
            code: "minimax_tool_history_invalid",
            retryable: false,
          });
        }
        messages.push({ ...exchange.providerState });
        messages.push({
          role: "tool",
          tool_call_id: exchange.call.id,
          content: JSON.stringify(exchange.result),
        });
      }
      for (const part of request.continuationParts) {
        messages.push({ role: "assistant", content: part });
      }
      if (request.continuationParts.length > 0) {
        messages.push({
          role: "user",
          content: "Continúa exactamente desde la respuesta parcial anterior sin repetirla.",
        });
      }
      const body: Record<string, unknown> = {
        model: request.model,
        messages,
        reasoning_split: true,
      };
      if (tools.length > 0) {
        body.tools = toolDefinitionsForChatCompletions(tools);
      }

      return parseMiniMaxResponse(
        (
          await postProviderJson({
            endpoint,
            apiKey: credentials.apiKey,
            body,
            ...(request.signal === undefined ? {} : { signal: request.signal }),
          })
        ).body,
      );
    },
  });
};

export const createCognitiveProviderRegistry = (
  input: Readonly<{
    openai?: ProviderCredentials;
    minimax?: ProviderCredentials;
  }>,
): ReadonlyMap<string, CognitiveProvider> => {
  const providers = new Map<string, CognitiveProvider>();
  if (input.openai !== undefined) {
    providers.set("openai", createOpenAiProvider(input.openai));
  }
  if (input.minimax !== undefined) {
    providers.set("minimax", createMiniMaxProvider(input.minimax));
  }
  return providers;
};
