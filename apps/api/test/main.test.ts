import { createServer } from "node:net";

import { afterAll, beforeAll, expect, it } from "vitest";

import type { ApiRuntime } from "../src/runtime.js";

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

const originalEnvironment = { ...process.env };
const previousSigint = new Set(process.listeners("SIGINT"));
const previousSigterm = new Set(process.listeners("SIGTERM"));
let readyUrl: string;
let runtime: ApiRuntime | undefined;

beforeAll(async () => {
  const port = await reservePort();

  Object.assign(process.env, {
    APP_ENV: "test",
    LOG_LEVEL: "error",
    API_HOST: "127.0.0.1",
    API_PORT: String(port),
    API_PUBLIC_URL: `http://127.0.0.1:${String(port)}`,
    WEB_PUBLIC_URL: "http://127.0.0.1:3000",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PROJECT_REF: "agenteferapimain",
    SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "api", "main", "test"].join("_"),
    SUPABASE_SECRET_KEY: ["sb", "secret", "api", "main", "test"].join("_"),
    META_WEBHOOK_RPC_TIMEOUT_MS: "1000",
    META_WEBHOOK_MAX_BODY_BYTES: "1048576",
  });

  const entrypoint = await import("../src/main.js");
  runtime = await entrypoint.apiRuntimePromise;
  if (runtime === undefined) {
    throw new Error("API entrypoint failed to start");
  }

  readyUrl = `http://127.0.0.1:${String(port)}/health/ready`;
});

afterAll(async () => {
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
});

it("boots the real API entrypoint and handles its registered termination signal", async () => {
  if (runtime === undefined) {
    throw new Error("API entrypoint runtime is unavailable");
  }

  const readyResponse = await fetch(readyUrl, { signal: AbortSignal.timeout(1_000) });
  expect(readyResponse.status).toBe(200);
  await readyResponse.arrayBuffer();

  const terminationListener = process
    .listeners("SIGTERM")
    .find((listener) => !previousSigterm.has(listener));
  if (terminationListener === undefined) {
    throw new Error("API did not register its SIGTERM listener");
  }

  terminationListener("SIGTERM");
  await runtime.shutdown("SIGTERM");
  await expect(fetch(readyUrl, { signal: AbortSignal.timeout(1_000) })).rejects.toThrow();
});
