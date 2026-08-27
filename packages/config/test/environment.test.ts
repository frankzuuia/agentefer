import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  apiEnvironmentVariables,
  EnvironmentConfigurationError,
  parseApiEnvironment,
  parseWebEnvironment,
  parseWorkerEnvironment,
  type RawEnvironment,
  webEnvironmentVariables,
  workerEnvironmentVariables,
} from "../src/index.js";

const projectRef = "agenteferprojectref";
const deploymentCommitSha = "a".repeat(40);
const supabaseUrl = `https://${projectRef}.supabase.co`;
const apiSupabaseTestSecret = ["sb", "secret", "api", "unit", "test", "only"].join("_");
const workerSupabaseTestSecret = ["sb", "secret", "worker", "unit", "test", "only"].join("_");

const validWebEnvironment = (): RawEnvironment => ({
  APP_ENV: "staging",
  LOG_LEVEL: "info",
  DEPLOYMENT_COMMIT_SHA: deploymentCommitSha,
  NEXT_PUBLIC_APP_URL: "https://catalogo.example.test",
  NEXT_PUBLIC_API_URL: "https://api.example.test",
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PROJECT_REF: projectRef,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test_only",
});

const validApiEnvironment = (): RawEnvironment => ({
  APP_ENV: "staging",
  LOG_LEVEL: "info",
  DEPLOYMENT_COMMIT_SHA: deploymentCommitSha,
  API_HOST: "0.0.0.0",
  API_PORT: "3001",
  API_PUBLIC_URL: "https://api.example.test",
  WEB_PUBLIC_URL: "https://catalogo.example.test",
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PROJECT_REF: projectRef,
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_unit_test_only",
  SUPABASE_SECRET_KEY: apiSupabaseTestSecret,
  META_WEBHOOK_RPC_TIMEOUT_MS: "3500",
  META_WEBHOOK_MAX_BODY_BYTES: "1048576",
});

const validWorkerEnvironment = (): RawEnvironment => ({
  APP_ENV: "staging",
  LOG_LEVEL: "info",
  DEPLOYMENT_COMMIT_SHA: deploymentCommitSha,
  WORKER_HEALTH_HOST: "0.0.0.0",
  WORKER_HEALTH_PORT: "3002",
  SUPABASE_URL: supabaseUrl,
  SUPABASE_PROJECT_REF: projectRef,
  SUPABASE_SECRET_KEY: workerSupabaseTestSecret,
  AI_MODEL: "openai:gpt-5.6-luna",
  AI_VISION_MODEL: "minimax:MiniMax-M3",
  AI_REASONING_EFFORT: "medium",
  AI_TURN_TIMEOUT_MS: "120000",
  AI_MAX_TOOL_ROUNDS: "12",
  AI_CACHE_MODE: "auto",
  AI_FALLBACK_MODELS: '["minimax:MiniMax-M2.7-highspeed"]',
  OPENAI_API_KEY: "openai-unit-test-key",
  MINIMAX_API_KEY: "minimax-unit-test-key",
});

const captureConfigurationError = (operation: () => unknown): Error => {
  try {
    operation();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
  }

  throw new Error("Expected configuration parsing to fail");
};

const readExampleVariableNames = (relativePath: string): readonly string[] =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .map((line) => line.slice(0, line.indexOf("=")));

describe("environment example contracts", () => {
  it("keeps the web example synchronized with the parser", () => {
    expect(readExampleVariableNames("../../../apps/web/.env.example")).toEqual(
      webEnvironmentVariables,
    );
  });

  it("keeps the API example synchronized with the parser", () => {
    expect(readExampleVariableNames("../../../apps/api/.env.example")).toEqual(
      apiEnvironmentVariables,
    );
  });

  it("keeps the worker example synchronized with the parser", () => {
    expect(readExampleVariableNames("../../../apps/worker/.env.example")).toEqual(
      workerEnvironmentVariables,
    );
  });
});

describe("web environment", () => {
  it("accepts only the public Supabase key and typed public URLs", () => {
    const configuration = parseWebEnvironment(validWebEnvironment());

    expect(configuration.runtime.environment).toBe("staging");
    expect(configuration.public.supabaseProjectRef).toBe(projectRef);
    expect(configuration.public.supabasePublishableKey).toBe("sb_publishable_unit_test_only");
  });

  it("blocks secret-looking NEXT_PUBLIC variables without leaking the value", () => {
    const exposedValue = "do-not-print-this-unit-test-value";
    const environment = {
      ...validWebEnvironment(),
      NEXT_PUBLIC_OPENAI_API_KEY: exposedValue,
    };

    const error = captureConfigurationError(() => parseWebEnvironment(environment));

    expect(error).toBeInstanceOf(EnvironmentConfigurationError);
    expect(error.message).toContain("NEXT_PUBLIC_OPENAI_API_KEY");
    expect(error.message).not.toContain(exposedValue);
  });

  it("rejects insecure transport in staging", () => {
    const environment = {
      ...validWebEnvironment(),
      NEXT_PUBLIC_API_URL: "http://api.example.test",
    };

    expect(() => parseWebEnvironment(environment)).toThrow(
      "must use https in staging and production",
    );
  });
});

describe("api environment", () => {
  it("parses the port and redacts the privileged key on serialization", () => {
    const configuration = parseApiEnvironment(validApiEnvironment());

    expect(configuration.server.port).toBe(3001);
    expect(configuration.metaWebhook).toEqual({
      rpcTimeoutMilliseconds: 3500,
      maximumBodyBytes: 1_048_576,
    });
    expect(configuration.supabase.secretKey.reveal()).toBe(apiSupabaseTestSecret);
    expect(JSON.stringify(configuration)).not.toContain(apiSupabaseTestSecret);
    expect(JSON.stringify(configuration)).toContain("[REDACTED]");
  });

  it("rejects a Supabase URL from a different declared project", () => {
    const environment = {
      ...validApiEnvironment(),
      SUPABASE_PROJECT_REF: "differentprojectref",
    };

    expect(() => parseApiEnvironment(environment)).toThrow(
      "does not match the declared Supabase project ref",
    );
  });

  it("rejects a webhook dependency timeout above the Meta response budget", () => {
    expect(() =>
      parseApiEnvironment({
        ...validApiEnvironment(),
        META_WEBHOOK_RPC_TIMEOUT_MS: "4001",
      }),
    ).toThrow("must not exceed Meta's four-second persistence budget");
  });

  it.each(["1", "1048577"])(
    "rejects a webhook body limit outside the certified database envelope: %s",
    (maximumBodyBytes) => {
      expect(() =>
        parseApiEnvironment({
          ...validApiEnvironment(),
          META_WEBHOOK_MAX_BODY_BYTES: maximumBodyBytes,
        }),
      ).toThrow("must be between 2 bytes and the one MiB database envelope limit");
    },
  );
});

describe("worker environment", () => {
  it("preserves exact OpenAI, MiniMax vision and fallback model IDs", () => {
    const configuration = parseWorkerEnvironment(validWorkerEnvironment());

    expect(configuration.health).toEqual({ host: "0.0.0.0", port: 3002 });
    expect(configuration.metaInbound).toEqual({
      enabled: true,
      rpcTimeoutMilliseconds: 5_000,
      pollIntervalMilliseconds: 1_000,
      leaseSeconds: 120,
      maxAttempts: 8,
      retryDelaySeconds: 5,
      batchSize: 25,
    });
    expect(configuration.whatsappAi).toEqual({
      enabled: true,
      rpcTimeoutMilliseconds: 5_000,
      pollIntervalMilliseconds: 1_000,
      leaseSeconds: 155,
      maxAttempts: 8,
      retryDelaySeconds: 5,
      batchSize: 25,
    });
    expect(configuration.ai.model.canonical).toBe("openai:gpt-5.6-luna");
    expect(configuration.ai.visionModel.canonical).toBe("minimax:MiniMax-M3");
    expect(configuration.ai.fallbackModels[0]?.canonical).toBe("minimax:MiniMax-M2.7-highspeed");
    expect(configuration.ai.cacheMode).toBe("auto");
    expect(configuration.ai.visionModelInherited).toBe(false);
  });

  it("derives the cognitive lease from the full turn, persistence RPC and safety margin", () => {
    const configuration = parseWorkerEnvironment({
      ...validWorkerEnvironment(),
      AI_TURN_TIMEOUT_MS: "600000",
      WORKER_META_RPC_TIMEOUT_MS: "60000",
      WORKER_META_LEASE_SECONDS: "15",
    });

    expect(configuration.metaInbound.leaseSeconds).toBe(15);
    expect(configuration.whatsappAi.leaseSeconds).toBe(690);
  });

  it("preserves a longer operator lease when it exceeds the cognitive minimum", () => {
    const configuration = parseWorkerEnvironment({
      ...validWorkerEnvironment(),
      WORKER_META_LEASE_SECONDS: "300",
    });

    expect(configuration.whatsappAi.leaseSeconds).toBe(300);
  });

  it("switches to an arbitrary MiniMax model and inherits it for vision", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_MODEL: "minimax:MiniMax-M2.7-highspeed",
      AI_VISION_MODEL: "",
      AI_FALLBACK_MODELS: "",
      OPENAI_API_KEY: "",
    };

    const configuration = parseWorkerEnvironment(environment);

    expect(configuration.ai.model.model).toBe("MiniMax-M2.7-highspeed");
    expect(configuration.ai.visionModel).toEqual(configuration.ai.model);
    expect(configuration.ai.visionModelInherited).toBe(true);
    expect(configuration.ai.fallbackModels).toEqual([]);
  });

  it("requires the credential for every selected known provider", () => {
    const environment = {
      ...validWorkerEnvironment(),
      MINIMAX_API_KEY: "",
    };

    expect(() => parseWorkerEnvironment(environment)).toThrow(
      "MINIMAX_API_KEY: is required because a MiniMax model is selected",
    );
  });

  it("accepts a structurally valid future provider for adapter readiness", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_MODEL: "future-provider:Future-Model-1",
      AI_VISION_MODEL: "",
      AI_FALLBACK_MODELS: "",
      OPENAI_API_KEY: "",
      MINIMAX_API_KEY: "",
    };

    const configuration = parseWorkerEnvironment(environment);

    expect(configuration.ai.model.provider).toBe("future-provider");
    expect(configuration.ai.model.model).toBe("Future-Model-1");
  });

  it("rejects invalid fallback JSON", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_FALLBACK_MODELS: "not-json",
    };

    expect(() => parseWorkerEnvironment(environment)).toThrow("AI_FALLBACK_MODELS");
  });

  it.each([":missing-provider", "missing-model:", "bad provider:model", "bad!provider:model"])(
    "rejects an invalid provider:model selector: %s",
    (model) => {
      const environment = {
        ...validWorkerEnvironment(),
        AI_MODEL: model,
      };

      expect(() => parseWorkerEnvironment(environment)).toThrow("AI_MODEL");
    },
  );

  it("normalizes only the provider identifier while preserving the exact model ID", () => {
    const configuration = parseWorkerEnvironment({
      ...validWorkerEnvironment(),
      AI_MODEL: "FutureProvider:Case-Sensitive-Model",
      AI_VISION_MODEL: "",
      AI_FALLBACK_MODELS: "",
      OPENAI_API_KEY: "",
      MINIMAX_API_KEY: "",
    });

    expect(configuration.ai.model.canonical).toBe("futureprovider:Case-Sensitive-Model");
  });

  it("rejects a structurally invalid selector inside valid fallback JSON", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_FALLBACK_MODELS: '["missing-separator"]',
    };

    expect(() => parseWorkerEnvironment(environment)).toThrow("AI_FALLBACK_MODELS");
  });

  it("requires the OpenAI credential when it is selected only as fallback", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_MODEL: "minimax:MiniMax-M2.7-highspeed",
      AI_VISION_MODEL: "",
      AI_FALLBACK_MODELS: '["openai:gpt-5.6-luna"]',
      OPENAI_API_KEY: "",
    };

    expect(() => parseWorkerEnvironment(environment)).toThrow(
      "OPENAI_API_KEY: is required because an OpenAI model is selected",
    );
  });

  it("rejects limits above the absolute safety ceiling", () => {
    const environment = {
      ...validWorkerEnvironment(),
      AI_MAX_TOOL_ROUNDS: "65",
    };

    expect(() => parseWorkerEnvironment(environment)).toThrow(
      "exceeds the absolute safety ceiling",
    );
  });

  it("supports disabling only the inbound loop while preserving typed operational controls", () => {
    const configuration = parseWorkerEnvironment({
      ...validWorkerEnvironment(),
      WORKER_META_INBOUND_ENABLED: "false",
      WORKER_WHATSAPP_AI_ENABLED: "false",
      WORKER_META_RPC_TIMEOUT_MS: "250",
      WORKER_META_POLL_INTERVAL_MS: "100",
      WORKER_META_LEASE_SECONDS: "15",
      WORKER_META_MAX_ATTEMPTS: "100",
      WORKER_META_RETRY_DELAY_SECONDS: "0",
      WORKER_META_BATCH_SIZE: "100",
    });

    expect(configuration.metaInbound).toEqual({
      enabled: false,
      rpcTimeoutMilliseconds: 250,
      pollIntervalMilliseconds: 100,
      leaseSeconds: 15,
      maxAttempts: 100,
      retryDelaySeconds: 0,
      batchSize: 100,
    });
    expect(configuration.whatsappAi.enabled).toBe(false);
  });

  it.each([
    ["WORKER_META_RPC_TIMEOUT_MS", "249"],
    ["WORKER_META_POLL_INTERVAL_MS", "99"],
    ["WORKER_META_LEASE_SECONDS", "14"],
    ["WORKER_META_MAX_ATTEMPTS", "101"],
    ["WORKER_META_RETRY_DELAY_SECONDS", "3601"],
    ["WORKER_META_BATCH_SIZE", "101"],
  ] as const)("rejects an unsafe worker operational boundary for %s", (variable, value) => {
    expect(() =>
      parseWorkerEnvironment({
        ...validWorkerEnvironment(),
        [variable]: value,
      }),
    ).toThrow(variable);
  });

  it("never serializes provider or Supabase secrets", () => {
    const configuration = parseWorkerEnvironment(validWorkerEnvironment());
    const serialized = JSON.stringify(configuration);

    expect(serialized).not.toContain("openai-unit-test-key");
    expect(serialized).not.toContain("minimax-unit-test-key");
    expect(serialized).not.toContain(workerSupabaseTestSecret);
  });
});

describe("shared environment boundary validation", () => {
  it.each(["short", "UPPERCASEPROJECT", "invalid-project!", "a".repeat(41)])(
    "rejects an invalid Supabase project ref: %s",
    (invalidProjectRef) => {
      expect(() =>
        parseApiEnvironment({
          ...validApiEnvironment(),
          SUPABASE_PROJECT_REF: invalidProjectRef,
        }),
      ).toThrow("SUPABASE_PROJECT_REF");
    },
  );

  it("requires deployment metadata outside local and test", () => {
    expect(() =>
      parseApiEnvironment({
        ...validApiEnvironment(),
        DEPLOYMENT_COMMIT_SHA: "",
      }),
    ).toThrow("DEPLOYMENT_COMMIT_SHA: is required in staging and production");

    expect(() =>
      parseApiEnvironment({
        ...validApiEnvironment(),
        DEPLOYMENT_COMMIT_SHA: "not-a-full-sha",
      }),
    ).toThrow("must be a full 40-character Git commit SHA");
  });

  it.each(["0", "-1", "1.5", String(Number.MAX_SAFE_INTEGER + 1)])(
    "rejects a non-positive-safe integer port: %s",
    (port) => {
      expect(() =>
        parseApiEnvironment({
          ...validApiEnvironment(),
          API_PORT: port,
        }),
      ).toThrow("must be a positive safe integer");
    },
  );

  it("rejects an absolute URL with a non-HTTP transport", () => {
    expect(() =>
      parseApiEnvironment({
        ...validApiEnvironment(),
        API_PUBLIC_URL: "ftp://api.example.test",
      }),
    ).toThrow("must use http or https");
  });

  it("allows local HTTP and ignores blank public variables", () => {
    const configuration = parseWebEnvironment({
      ...validWebEnvironment(),
      APP_ENV: "local",
      DEPLOYMENT_COMMIT_SHA: "",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001",
      NEXT_PUBLIC_UNUSED_SECRET: "",
    });

    expect(configuration.runtime.environment).toBe("local");
  });
});
