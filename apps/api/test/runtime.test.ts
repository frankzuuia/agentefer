import { createServer, type Server } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { startApi } from "../src/runtime.js";

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

const apiEnvironment = (port: number) => ({
  APP_ENV: "test",
  LOG_LEVEL: "error",
  API_HOST: "127.0.0.1",
  API_PORT: String(port),
  API_PUBLIC_URL: `http://127.0.0.1:${String(port)}`,
  WEB_PUBLIC_URL: "http://127.0.0.1:3000",
  SUPABASE_URL: "http://127.0.0.1:54321",
  SUPABASE_PROJECT_REF: "agenteferapitest",
  SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "api", "runtime", "test"].join("_"),
  SUPABASE_SECRET_KEY: ["sb", "secret", "api", "runtime", "test"].join("_"),
  META_WEBHOOK_RPC_TIMEOUT_MS: "1000",
  META_WEBHOOK_MAX_BODY_BYTES: "1048576",
});

afterEach(async () => {
  await Promise.all(occupiedServers.splice(0).map(releaseServer));
});

describe("API production runtime", () => {
  it("starts on a real TCP port and shuts down idempotently", async () => {
    const port = await reservePort();
    const reservedServer = occupiedServers[0];
    if (reservedServer === undefined) {
      throw new Error("Reserved TCP server was not tracked");
    }
    await releaseServer(reservedServer);
    const runtime = await startApi(apiEnvironment(port));

    const response = await fetch(`http://127.0.0.1:${String(port)}/health/ready`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });

    await Promise.all([runtime.shutdown("SIGTERM"), runtime.shutdown("SIGINT")]);
    await expect(fetch(`http://127.0.0.1:${String(port)}/health/live`)).rejects.toThrow();
  });

  it("fails closed when the configured port is already occupied", async () => {
    const port = await reservePort();

    await expect(startApi(apiEnvironment(port))).rejects.toMatchObject({ code: "EADDRINUSE" });
  });
});
