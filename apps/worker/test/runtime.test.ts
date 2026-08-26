import { createServer, type Server } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { startWorker } from "../src/runtime.js";

const occupiedServers: Server[] = [];

const reservePort = async (): Promise<number> => {
  const server = createServer();
  occupiedServers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Expected an ephemeral TCP address");
  }
  return address.port;
};

const releaseServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
  occupiedServers.splice(occupiedServers.indexOf(server), 1);
};

const workerEnvironment = (port: number) => ({
  APP_ENV: "test",
  LOG_LEVEL: "error",
  WORKER_HEALTH_HOST: "127.0.0.1",
  WORKER_HEALTH_PORT: String(port),
  WORKER_META_INBOUND_ENABLED: "false",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PROJECT_REF: "agenteferworkertest",
  SUPABASE_SECRET_KEY: ["sb", "secret", "worker", "runtime", "test"].join("_"),
  AI_MODEL: "future-provider:runtime-test-model",
  AI_TURN_TIMEOUT_MS: "120000",
  AI_MAX_TOOL_ROUNDS: "12",
  AI_CACHE_MODE: "auto",
  AI_FALLBACK_MODELS: "[]",
});

afterEach(async () => {
  await Promise.all(occupiedServers.splice(0).map(releaseServer));
});

describe("worker production runtime", () => {
  it("starts on a real TCP port and shuts down idempotently", async () => {
    const port = await reservePort();
    const reservedServer = occupiedServers[0];
    if (reservedServer === undefined) {
      throw new Error("Reserved TCP server was not tracked");
    }
    await releaseServer(reservedServer);
    const runtime = await startWorker(workerEnvironment(port));

    const response = await fetch(`http://127.0.0.1:${String(port)}/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });

    await Promise.all([runtime.shutdown("SIGTERM"), runtime.shutdown("SIGINT")]);
    await expect(fetch(`http://127.0.0.1:${String(port)}/health/live`)).rejects.toThrow();
  });

  it("fails closed when the configured port is already occupied", async () => {
    const port = await reservePort();

    await expect(startWorker(workerEnvironment(port))).rejects.toMatchObject({
      code: "EADDRINUSE",
    });
  });
});
