import { type AddressInfo } from "node:net";

import { createReadinessState } from "@agentefer/observability";
import { afterEach, describe, expect, it } from "vitest";

import { buildApi } from "../src/app.js";

const applications: ReturnType<typeof buildApi>[] = [];

afterEach(async () => {
  await Promise.all(applications.splice(0).map(async (application) => application.close()));
});

describe("API health endpoints over TCP", () => {
  it("separates liveness from readiness without exposing internals", async () => {
    const readiness = createReadinessState();
    const application = buildApi({ readiness });
    applications.push(application);
    await application.listen({ host: "127.0.0.1", port: 0 });
    const address = application.server.address() as AddressInfo;
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

    readiness.markNotReady();
    const drainingResponse = await fetch(`${baseUrl}/health/ready`);

    expect(drainingResponse.status).toBe(503);
    expect(await drainingResponse.json()).toEqual({ status: "not_ready" });
  });
});
