import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";

import { expect, it } from "vitest";

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

const waitForReady = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // The real process adapter may still be binding its TCP listener.
    }
    await delay(10);
  }
  throw new Error("worker main module did not become ready");
};

it("boots the real worker entrypoint and handles its registered termination signal", async () => {
  const port = await reservePort();
  const originalEnvironment = { ...process.env };
  const previousSigint = new Set(process.listeners("SIGINT"));
  const previousSigterm = new Set(process.listeners("SIGTERM"));

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
    await import("../src/main.js");
    const readyUrl = `http://127.0.0.1:${String(port)}/health/ready`;
    await waitForReady(readyUrl);

    const terminationListener = process
      .listeners("SIGTERM")
      .find((listener) => !previousSigterm.has(listener));
    if (terminationListener === undefined) {
      throw new Error("worker did not register its SIGTERM listener");
    }

    terminationListener("SIGTERM");
    await expect(waitForReady(readyUrl)).rejects.toThrow("did not become ready");
  } finally {
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
