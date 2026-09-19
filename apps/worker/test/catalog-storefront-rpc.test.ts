import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createCatalogStorefrontRpcClient } from "../src/catalog-storefront-rpc.js";

const ids = Object.freeze({
  job: "11111111-1111-4111-8111-111111111111",
  organization: "22222222-2222-4222-8222-222222222222",
  asset: "33333333-3333-4333-8333-333333333333",
  lease: "44444444-4444-4444-8444-444444444444",
});
const hash = "a".repeat(64);
const servers: { close(): Promise<void> }[] = [];

const readJson = async (request: IncomingMessage): Promise<Record<string, unknown>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("expected UTF-8 request body");
    body += chunk;
  }
  return JSON.parse(body) as Record<string, unknown>;
};

const startServer = async (
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
    body: Record<string, unknown>,
  ) => void,
): Promise<{ url: string; requests: Record<string, unknown>[] }> => {
  const requests: Record<string, unknown>[] = [];
  const server = createServer((request, response) => {
    void readJson(request).then((body) => {
      requests.push(body);
      handler(request, response, body);
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  const result = {
    url: `http://127.0.0.1:${String(address.port)}`,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error === undefined) resolve();
          else reject(error);
        });
      }),
  };
  servers.push(result);
  return result;
};

const respond = (response: ServerResponse, body: unknown, status = 200): void => {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(body));
};

const createClient = (url: string) =>
  createCatalogStorefrontRpcClient({
    supabaseUrl: url,
    secretKey: new SensitiveValue("catalog-storefront-rpc-secret"),
    timeoutMilliseconds: 1_000,
  });

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("catalog storefront Supabase RPC contract", () => {
  it("claims, completes and reports failures with the exact scoped payloads", async () => {
    const server = await startServer((request, response) => {
      if (request.url?.endsWith("claim_catalog_storefront_job") === true) {
        respond(response, [
          {
            job_id: ids.job,
            organization_id: ids.organization,
            media_asset_id: ids.asset,
            analysis_sha256_hex: hash,
            analysis_byte_size: 12,
            analysis_width: 800,
            analysis_height: 600,
            lease_token: ids.lease,
            attempt_number: 2,
          },
        ]);
        return;
      }
      if (request.url?.endsWith("complete_catalog_storefront_job") === true) {
        respond(response, true);
        return;
      }
      if (request.url?.endsWith("fail_catalog_storefront_job") === true) {
        respond(response, "retryable");
        return;
      }
      respond(response, null, 404);
    });
    const client = createClient(server.url);

    await expect(
      client.claim({ workerId: "storefront-worker", leaseSeconds: 120, maxAttempts: 8 }),
    ).resolves.toEqual({
      jobId: ids.job,
      organizationId: ids.organization,
      mediaAssetId: ids.asset,
      analysisSha256Hex: hash,
      analysisByteSize: 12,
      analysisWidth: 800,
      analysisHeight: 600,
      leaseToken: ids.lease,
      attemptNumber: 2,
    });
    await expect(
      client.complete({ jobId: ids.job, workerId: "storefront-worker", leaseToken: ids.lease }),
    ).resolves.toBeUndefined();
    await expect(
      client.fail({
        jobId: ids.job,
        workerId: "storefront-worker",
        leaseToken: ids.lease,
        errorCode: "STORAGE_TIMEOUT",
        retryable: true,
        retryDelaySeconds: 30,
        maxAttempts: 8,
      }),
    ).resolves.toBeUndefined();
    expect(server.requests).toEqual([
      {
        target_worker_id: "storefront-worker",
        target_lease_seconds: 120,
        target_max_attempts: 8,
      },
      {
        target_job_id: ids.job,
        target_worker_id: "storefront-worker",
        target_lease_token: ids.lease,
      },
      {
        target_job_id: ids.job,
        target_worker_id: "storefront-worker",
        target_lease_token: ids.lease,
        target_error_code: "STORAGE_TIMEOUT",
        target_retryable: true,
        target_retry_delay_seconds: 30,
        target_max_attempts: 8,
      },
    ]);
  });

  it("returns no claim for an empty queue", async () => {
    const server = await startServer((_request, response) => {
      respond(response, []);
    });
    await expect(
      createClient(server.url).claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).resolves.toBeUndefined();
  });

  it.each([
    [[{}, {}], "claim contract"],
    [["not-an-object"], "claim row contract"],
    [[{ job_id: "bad" }], "job_id"],
    [
      [
        {
          job_id: ids.job,
          organization_id: ids.organization,
          media_asset_id: ids.asset,
          analysis_sha256_hex: "z".repeat(64),
          analysis_byte_size: 12,
          analysis_width: 1,
          analysis_height: 1,
          lease_token: ids.lease,
          attempt_number: 1,
        },
      ],
      "analysis_sha256_hex",
    ],
    [
      [
        {
          job_id: ids.job,
          organization_id: ids.organization,
          media_asset_id: ids.asset,
          analysis_sha256_hex: hash,
          analysis_byte_size: 0,
          analysis_width: 1,
          analysis_height: 1,
          lease_token: ids.lease,
          attempt_number: 1,
        },
      ],
      "analysis_byte_size",
    ],
  ])("fails closed for malformed claim payload %#", async (body, message) => {
    const server = await startServer((_request, response) => {
      respond(response, body);
    });
    await expect(
      createClient(server.url).claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toThrow(message);
  });

  it("rejects invalid acknowledgements, oversized responses and HTTP failures", async () => {
    let mode = "complete";
    const server = await startServer((_request, response) => {
      if (mode === "complete") respond(response, false);
      if (mode === "fail") respond(response, "unknown");
      if (mode === "large") respond(response, "x".repeat(17_000));
      if (mode === "http") respond(response, { error: "dependency" }, 503);
    });
    const client = createClient(server.url);
    await expect(
      client.complete({ jobId: ids.job, workerId: "worker", leaseToken: ids.lease }),
    ).rejects.toThrow("complete contract");
    mode = "fail";
    await expect(
      client.fail({
        jobId: ids.job,
        workerId: "worker",
        leaseToken: ids.lease,
        errorCode: "FAIL",
        retryable: false,
        retryDelaySeconds: 1,
        maxAttempts: 1,
      }),
    ).rejects.toThrow("fail contract");
    mode = "failed";
    const acceptingServer = await startServer((_request, response) => {
      respond(response, "failed");
    });
    await expect(
      createClient(acceptingServer.url).fail({
        jobId: ids.job,
        workerId: "worker",
        leaseToken: ids.lease,
        errorCode: "TERMINAL",
        retryable: false,
        retryDelaySeconds: 1,
        maxAttempts: 1,
      }),
    ).resolves.toBeUndefined();
    mode = "large";
    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toThrow("response too large");
    mode = "http";
    await expect(
      client.claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toThrow("failed: 503");
  });

  it("rejects unsafe origins and invalid timeout configuration", () => {
    expect(() => createClient("http://example.com")).toThrow("requires HTTPS");
    expect(() => createClient("http://localhost:54321")).not.toThrow();
    expect(() =>
      createCatalogStorefrontRpcClient({
        supabaseUrl: "https://example.test",
        secretKey: new SensitiveValue("secret"),
        timeoutMilliseconds: 1,
      }),
    ).not.toThrow();
    expect(() =>
      createCatalogStorefrontRpcClient({
        supabaseUrl: "https://example.test",
        secretKey: new SensitiveValue("secret"),
        timeoutMilliseconds: 0,
      }),
    ).toThrow("timeout is invalid");
  });

  it("honors an explicit abort signal instead of replacing it with the timeout", async () => {
    const server = await startServer((_request, response) => {
      respond(response, []);
    });
    const controller = new AbortController();
    controller.abort();
    await expect(
      createClient(server.url).claim({
        workerId: "worker",
        leaseSeconds: 60,
        maxAttempts: 3,
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("allows a response exactly at the size ceiling before validating its JSON contract", async () => {
    const prefix = '[{"padding":"';
    const suffix = '"}]';
    const body = `${prefix}${"x".repeat(16_384 - prefix.length - suffix.length)}${suffix}`;
    const server = await startServer((_request, response) => {
      response.statusCode = 200;
      response.setHeader("content-type", "application/json");
      response.end(body);
    });
    await expect(
      createClient(server.url).claim({ workerId: "worker", leaseSeconds: 60, maxAttempts: 3 }),
    ).rejects.toThrow("contract: job_id");
  });
});
