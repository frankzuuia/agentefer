import { type Server } from "node:http";

import { createReadinessState } from "@agentefer/observability";
import { afterEach, describe, expect, it } from "vitest";

import {
  closeWorkerHealthServer,
  createWorkerHealthServer,
  listenWorkerHealthServer,
} from "../src/health-server.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map(async (server) => closeWorkerHealthServer(server)));
});

describe("worker internal health server over TCP", () => {
  it("separates liveness/readiness and rejects unsupported routes", async () => {
    const readiness = createReadinessState();
    const server = createWorkerHealthServer({ readiness });
    servers.push(server);
    const address = await listenWorkerHealthServer(server, {
      host: "127.0.0.1",
      port: 0,
    });
    const baseUrl = `http://127.0.0.1:${String(address.port)}`;

    const liveResponse = await fetch(`${baseUrl}/health/live`);
    const notReadyResponse = await fetch(`${baseUrl}/health/ready`);

    expect(liveResponse.status).toBe(200);
    expect(await liveResponse.json()).toEqual({ status: "live" });
    expect(liveResponse.headers.get("cache-control")).toBe("no-store");
    expect(notReadyResponse.status).toBe(503);
    expect(await notReadyResponse.json()).toEqual({ status: "not_ready" });

    readiness.markReady();
    const readyResponse = await fetch(`${baseUrl}/health/ready`);
    expect(readyResponse.status).toBe(200);
    expect(await readyResponse.json()).toEqual({ status: "ready" });

    const methodResponse = await fetch(`${baseUrl}/health/live`, { method: "POST" });
    const missingResponse = await fetch(`${baseUrl}/private-details`);

    expect(methodResponse.status).toBe(405);
    expect(methodResponse.headers.get("allow")).toBe("GET");
    expect(await methodResponse.json()).toEqual({ status: "method_not_allowed" });
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ status: "not_found" });
  });
});
