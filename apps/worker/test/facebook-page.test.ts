import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import {
  createFacebookPageClient,
  FacebookPageError,
  readFacebookUsageSnapshot,
  type FacebookPagePublishRequest,
} from "../src/facebook-page.js";

const servers: Server[] = [];

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse, body: string) => void,
): Promise<string> => {
  const server = createServer((request, response) => {
    request.setEncoding("utf8");
    let body = "";
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      handler(request, response, body);
    });
  });
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${String(address.port)}/`;
};

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
    server.closeAllConnections();
  });

const writeJson = (
  response: ServerResponse,
  status: number,
  body: unknown,
  headers: Readonly<Record<string, string>> = {},
): void => {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
};

const request = (
  overrides: Partial<FacebookPagePublishRequest> = {},
): FacebookPagePublishRequest => ({
  pageId: "123456789012345",
  apiVersion: "v26.0",
  accessToken: new SensitiveValue("facebook-page-token-test"),
  message: "Combo Roadtrack con rin Fuel.",
  primaryImageUrl: new URL(
    "https://agenteferprojectref.supabase.co/storage/v1/object/public/agentefer-catalog-public/product/image.webp",
  ),
  ...overrides,
});

const textOnlyRequest = (): FacebookPagePublishRequest => {
  const { primaryImageUrl: _primaryImageUrl, ...withoutImage } = request();
  void _primaryImageUrl;
  return withoutImage;
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

describe("Facebook Page Graph transport", () => {
  it("publishes the approved primary WebP through the exact Page photos endpoint", async () => {
    let receivedAuthorization: string | undefined;
    let receivedBody = "";
    const origin = await startServer((incoming, response, body) => {
      expect(incoming.url).toBe("/v26.0/123456789012345/photos");
      receivedAuthorization = incoming.headers.authorization;
      receivedBody = body;
      writeJson(
        response,
        200,
        { id: "photo-1", post_id: "page-post-1" },
        { "x-fb-request-id": "meta-request-1", "x-page-usage": '{"call_count":12}' },
      );
    });

    const result = await createFacebookPageClient(origin).publish(request());
    const form = new URLSearchParams(receivedBody);

    expect(receivedAuthorization).toBe("Bearer facebook-page-token-test");
    expect(form.get("url")).toContain("/agentefer-catalog-public/product/image.webp");
    expect(form.get("caption")).toBe("Combo Roadtrack con rin Fuel.");
    expect(form.get("published")).toBe("true");
    expect(receivedBody).not.toContain("facebook-page-token-test");
    expect(result).toEqual({
      externalPublicationId: "page-post-1",
      providerRequestId: "meta-request-1",
      usageSnapshot: { page: { call_count: 12 } },
      responseSummary: {
        endpoint_kind: "photos",
        graph_object_id_present: true,
        graph_post_id_present: true,
      },
    });
  });

  it("publishes a text-only approved version through Page feed", async () => {
    const origin = await startServer((incoming, response, body) => {
      expect(incoming.url).toBe("/v26.0/123456789012345/feed");
      const form = new URLSearchParams(body);
      expect(form.get("message")).toBe("Combo Roadtrack con rin Fuel.");
      expect(form.has("url")).toBe(false);
      writeJson(response, 200, { id: "page-post-text" });
    });

    await expect(
      createFacebookPageClient(origin).publish(textOnlyRequest()),
    ).resolves.toMatchObject({ externalPublicationId: "page-post-text" });
  });

  it("normalizes Retry-After and usage headers without persisting raw headers", async () => {
    const origin = await startServer((_incoming, response) => {
      writeJson(
        response,
        429,
        { error: { code: 4 } },
        {
          "retry-after": "120",
          "x-fb-request-id": "meta-rate-limit-request",
          "x-page-usage": '{"call_count":99,"total_time":87}',
          "x-app-usage": '{"call_count":45}',
        },
      );
    });

    const error = await createFacebookPageClient(origin)
      .publish(request())
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(FacebookPageError);
    expect(error).toMatchObject({
      kind: "rate_limited",
      effectCertainty: "confirmed_not_applied",
      providerRequestId: "meta-rate-limit-request",
      usageSnapshot: {
        page: { call_count: 99, total_time: 87 },
        application: { call_count: 45 },
      },
    });
    expect(Date.parse((error as FacebookPageError).retryAfterAt ?? "")).toBeGreaterThan(Date.now());
  });

  it.each([
    [400, "invalid", "confirmed_not_applied"],
    [401, "rejected", "confirmed_not_applied"],
    [503, "uncertain", "unknown"],
  ] as const)("classifies HTTP %s as %s with %s certainty", async (status, kind, certainty) => {
    const origin = await startServer((_incoming, response) => {
      writeJson(response, status, { error: { code: status } });
    });

    await expect(createFacebookPageClient(origin).publish(request())).rejects.toMatchObject({
      kind,
      effectCertainty: certainty,
    });
  });

  it("classifies either Page authorization status as rejected", async () => {
    for (const status of [401, 403]) {
      const origin = await startServer((_incoming, response) => {
        writeJson(response, status, { error: { code: status } });
      });

      await expect(createFacebookPageClient(origin).publish(request())).rejects.toMatchObject({
        kind: "rejected",
        effectCertainty: "confirmed_not_applied",
      });
    }
  });

  it("treats a successful response without an external ID as uncertain", async () => {
    const origin = await startServer((_incoming, response) => {
      writeJson(response, 200, { success: true });
    });

    await expect(createFacebookPageClient(origin).publish(request())).rejects.toMatchObject({
      kind: "uncertain",
      effectCertainty: "unknown",
    });
  });

  it("fails closed before network I/O for unsafe identifiers and private media URLs", async () => {
    await expect(
      createFacebookPageClient().publish(request({ apiVersion: "../secret" })),
    ).rejects.toMatchObject({ kind: "invalid", effectCertainty: "confirmed_not_applied" });
    await expect(
      createFacebookPageClient().publish(
        request({ primaryImageUrl: new URL("http://internal.invalid/private.webp") }),
      ),
    ).rejects.toMatchObject({ kind: "invalid", effectCertainty: "confirmed_not_applied" });
  });

  it("drops malformed or oversized usage headers", () => {
    const headers = new Headers({
      "x-page-usage": "not-json",
      "x-app-usage": `{"value":"${"x".repeat(33_000)}"}`,
      "x-business-use-case-usage": '{"page":[{"call_count":2}]}',
    });

    expect(readFacebookUsageSnapshot(headers)).toEqual({
      business: { page: [{ call_count: 2 }] },
    });
  });
});
