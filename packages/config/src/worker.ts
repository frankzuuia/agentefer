import { z } from "zod";

import {
  applicationEnvironmentSchema,
  httpUrlSchema,
  logLevelSchema,
  optionalCommitShaSchema,
  optionalHttpUrlSchema,
  optionalSecretTextSchema,
  optionalTextSchema,
  parseEnvironmentSchema,
  positiveIntegerSchema,
  requiredTextSchema,
  supabaseProjectRefSchema,
  supabaseSecretKeySchema,
  validateDeploymentMetadata,
  validateSupabaseProjectBoundary,
  validateTransportSecurity,
  type RawEnvironment,
} from "./core.js";

export interface ModelSelector {
  readonly provider: string;
  readonly model: string;
  readonly canonical: string;
}

export const aiSafetyCeilings = Object.freeze({
  maxOutputTokens: 1_000_000,
  turnTimeoutMs: 600_000,
  maxToolRounds: 64,
  maxFallbackModels: 8,
});

const isProviderCharacter = (character: string): boolean =>
  (character >= "a" && character <= "z") ||
  (character >= "0" && character <= "9") ||
  character === "-" ||
  character === "_";

const modelSelectorSchema = requiredTextSchema
  .superRefine((value, context) => {
    const separatorIndex = value.indexOf(":");
    const hasProvider = separatorIndex > 0;
    const hasModel = separatorIndex < value.length - 1;

    if (!hasProvider || !hasModel) {
      context.addIssue({
        code: "custom",
        message: "must use provider:model with both parts present",
      });
      return;
    }

    const provider = value.slice(0, separatorIndex).toLowerCase();
    for (const character of provider) {
      if (!isProviderCharacter(character)) {
        context.addIssue({
          code: "custom",
          message: "contains an invalid provider identifier",
        });
        break;
      }
    }
  })
  .transform<ModelSelector>((value) => {
    const separatorIndex = value.indexOf(":");
    const provider = value.slice(0, separatorIndex).toLowerCase();
    const model = value.slice(separatorIndex + 1);

    return Object.freeze({
      provider,
      model,
      canonical: `${provider}:${model}`,
    });
  });

const optionalModelSelectorSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  modelSelectorSchema.optional(),
);

const modelSelectorListSchema = z.preprocess((value) => {
  if (value === undefined) {
    return [];
  }

  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  if (normalized.length === 0) {
    return [];
  }

  try {
    return JSON.parse(normalized) as unknown;
  } catch {
    return value;
  }
}, z.array(modelSelectorSchema).max(aiSafetyCeilings.maxFallbackModels));

export const workerEnvironmentVariables = [
  "APP_ENV",
  "LOG_LEVEL",
  "DEPLOYMENT_COMMIT_SHA",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_SECRET_KEY",
  "AI_MODEL",
  "AI_VISION_MODEL",
  "AI_REASONING_EFFORT",
  "AI_MAX_OUTPUT_TOKENS",
  "AI_TURN_TIMEOUT_MS",
  "AI_MAX_TOOL_ROUNDS",
  "AI_CACHE_MODE",
  "AI_FALLBACK_MODELS",
  "OPENAI_API_KEY",
  "OPENAI_API_BASE_URL",
  "MINIMAX_API_KEY",
  "MINIMAX_API_BASE_URL",
] as const;

const workerEnvironmentSchema = z
  .object({
    APP_ENV: applicationEnvironmentSchema,
    LOG_LEVEL: logLevelSchema,
    DEPLOYMENT_COMMIT_SHA: optionalCommitShaSchema,
    SUPABASE_URL: httpUrlSchema,
    SUPABASE_PROJECT_REF: supabaseProjectRefSchema,
    SUPABASE_SECRET_KEY: supabaseSecretKeySchema,
    AI_MODEL: modelSelectorSchema,
    AI_VISION_MODEL: optionalModelSelectorSchema,
    AI_REASONING_EFFORT: optionalTextSchema,
    AI_MAX_OUTPUT_TOKENS: positiveIntegerSchema.refine(
      (value) => value <= aiSafetyCeilings.maxOutputTokens,
      "exceeds the absolute safety ceiling",
    ),
    AI_TURN_TIMEOUT_MS: positiveIntegerSchema.refine(
      (value) => value <= aiSafetyCeilings.turnTimeoutMs,
      "exceeds the absolute safety ceiling",
    ),
    AI_MAX_TOOL_ROUNDS: positiveIntegerSchema.refine(
      (value) => value <= aiSafetyCeilings.maxToolRounds,
      "exceeds the absolute safety ceiling",
    ),
    AI_CACHE_MODE: z.enum(["off", "auto", "explicit"]),
    AI_FALLBACK_MODELS: modelSelectorListSchema,
    OPENAI_API_KEY: optionalSecretTextSchema,
    OPENAI_API_BASE_URL: optionalHttpUrlSchema,
    MINIMAX_API_KEY: optionalSecretTextSchema,
    MINIMAX_API_BASE_URL: optionalHttpUrlSchema,
  })
  .superRefine((environment, context) => {
    validateDeploymentMetadata(environment.APP_ENV, environment.DEPLOYMENT_COMMIT_SHA, context);
    validateTransportSecurity(
      environment.APP_ENV,
      [
        ["SUPABASE_URL", environment.SUPABASE_URL],
        ["OPENAI_API_BASE_URL", environment.OPENAI_API_BASE_URL],
        ["MINIMAX_API_BASE_URL", environment.MINIMAX_API_BASE_URL],
      ],
      context,
    );
    validateSupabaseProjectBoundary(
      environment.APP_ENV,
      environment.SUPABASE_URL,
      environment.SUPABASE_PROJECT_REF,
      "SUPABASE_URL",
      context,
    );

    const selectedProviders = new Set([
      environment.AI_MODEL.provider,
      environment.AI_VISION_MODEL?.provider,
      ...environment.AI_FALLBACK_MODELS.map((selector) => selector.provider),
    ]);
    selectedProviders.delete(undefined);

    if (selectedProviders.has("openai") && environment.OPENAI_API_KEY === undefined) {
      context.addIssue({
        code: "custom",
        path: ["OPENAI_API_KEY"],
        message: "is required because an OpenAI model is selected",
      });
    }

    if (selectedProviders.has("minimax") && environment.MINIMAX_API_KEY === undefined) {
      context.addIssue({
        code: "custom",
        path: ["MINIMAX_API_KEY"],
        message: "is required because a MiniMax model is selected",
      });
    }
  })
  .transform((environment) => {
    const visionModel = environment.AI_VISION_MODEL ?? environment.AI_MODEL;

    return {
      runtime: {
        environment: environment.APP_ENV,
        logLevel: environment.LOG_LEVEL,
        deploymentCommitSha: environment.DEPLOYMENT_COMMIT_SHA,
      },
      supabase: {
        url: environment.SUPABASE_URL,
        projectRef: environment.SUPABASE_PROJECT_REF,
        secretKey: environment.SUPABASE_SECRET_KEY,
      },
      ai: {
        model: environment.AI_MODEL,
        visionModel,
        visionModelInherited: environment.AI_VISION_MODEL === undefined,
        reasoningEffort: environment.AI_REASONING_EFFORT,
        cacheMode: environment.AI_CACHE_MODE,
        fallbackModels: environment.AI_FALLBACK_MODELS,
        limits: {
          maxOutputTokens: environment.AI_MAX_OUTPUT_TOKENS,
          turnTimeoutMs: environment.AI_TURN_TIMEOUT_MS,
          maxToolRounds: environment.AI_MAX_TOOL_ROUNDS,
        },
        credentials: {
          openaiApiKey: environment.OPENAI_API_KEY,
          minimaxApiKey: environment.MINIMAX_API_KEY,
        },
        endpoints: {
          openai: environment.OPENAI_API_BASE_URL,
          minimax: environment.MINIMAX_API_BASE_URL,
        },
      },
    };
  });

export type WorkerEnvironment = z.output<typeof workerEnvironmentSchema>;

export const parseWorkerEnvironment = (source: RawEnvironment): WorkerEnvironment =>
  parseEnvironmentSchema("worker", workerEnvironmentSchema, source, workerEnvironmentVariables);
