import { createServer } from "node:net";

import { expect, it } from "vitest";

import type { WorkerRuntime } from "../src/runtime.js";

const reservePort = async (): Promise<number> => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected an ephemeral TCP address");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
  return address.port;
};

it("boots the real worker entrypoint and handles its registered termination signal", async () => {
  const port = await reservePort();
  const originalEnvironment = { ...process.env };
  const previousSigint = new Set(process.listeners("SIGINT"));
  const previousSigterm = new Set(process.listeners("SIGTERM"));
  let runtime: WorkerRuntime | undefined;

  Object.assign(process.env, {
    APP_ENV: "test",
    LOG_LEVEL: "error",
    WORKER_HEALTH_HOST: "127.0.0.1",
    WORKER_HEALTH_PORT: String(port),
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PROJECT_REF: "agenteferworkermain",
    SUPABASE_SECRET_KEY: ["sb", "secret", "worker", "main", "test"].join("_"),
    AI_MODEL: "future-provider:main-test-model",
    AI_TURN_TIMEOUT_MS: "120000",
    AI_MAX_TOOL_ROUNDS: "12",
    AI_CACHE_MODE: "auto",
    AI_FALLBACK_MODELS: "[]",
  });

  try {
    const entrypoint = await import("../src/main.js");
    runtime = await entrypoint.workerRuntimePromise;
    if (runtime === undefined) {
      throw new Error("worker entrypoint failed to start");
    }

    const readyUrl = `http://127.0.0.1:${String(port)}/health/ready`;
    const readyResponse = await fetch(readyUrl, { signal: AbortSignal.timeout(1_000) });
    expect(readyResponse.status).toBe(200);
    await readyResponse.arrayBuffer();

    const terminationListener = process
      .listeners("SIGTERM")
      .find((listener) => !previousSigterm.has(listener));
    if (terminationListener === undefined) {
      throw new Error("worker did not register its SIGTERM listener");
    }

    terminationListener("SIGTERM");
    await runtime.shutdown("SIGTERM");
    await expect(
      fetch(readyUrl, { signal: AbortSignal.timeout(1_000) }),
    ).rejects.toThrow();
  } finally {
    await runtime?.shutdown("SIGTERM");
    for (const listener of process.listeners("SIGINT")) {
      if (!previousSigint.has(listener)) {
        process.removeListener("SIGINT", listener);
      }
    }
    for (const listener of process.listeners("SIGTERM")) {
      if (!previousSigterm.has(listener)) {
        process.removeListener("SIGTERM", listener);
      }
    }
    process.env = originalEnvironment;
  }
});
