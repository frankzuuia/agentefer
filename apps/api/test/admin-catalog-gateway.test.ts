import { Buffer } from "node:buffer";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { SensitiveValue } from "@agentefer/config";
import { afterEach, describe, expect, it } from "vitest";

import { createAdminCatalogGateway } from "../src/admin-catalog-gateway.js";
import { AdminMetaGatewayError } from "../src/admin-meta-gateway.js";

const servers: Server[] = [];
const serviceSecret = "sb_secret_admin_catalog_contract";
const organizationId = "b4071000-0000-4000-8000-000000000001";
const userId = "b4070000-0000-4000-8000-000000000001";
const productId = "b4073000-0000-4000-8000-000000000001";
const variantId = "b4074000-0000-4000-8000-000000000001";
const categoryId = "b4072000-0000-4000-8000-000000000001";
const connectionId = "b4076000-0000-4000-8000-000000000001";
const publicationId = "b4076100-0000-4000-8000-000000000001";
const versionId = "b4076200-0000-4000-8000-000000000001";
const jobId = "b4077000-0000-4000-8000-000000000001";
const batchId = "b4078000-0000-4000-8000-000000000001";
const mediaId = "b4079000-0000-4000-8000-000000000001";
const mediaAssetId = "b4079100-0000-4000-8000-000000000001";
const priceId = "b407a000-0000-4000-8000-000000000001";
const unitId = "b407a100-0000-4000-8000-000000000001";

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
    server.closeAllConnections();
  });
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

const startServer = async (
  handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
): Promise<string> => {
  const server = createServer();
  servers.push(server);
  server.on("request", (request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => response.destroy());
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });
  return `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`;
};

const writeJson = (response: ServerResponse, status: number, value: unknown): void => {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "content-length": Buffer.byteLength(body),
    "content-type": "application/json",
  });
  response.end(body);
};

const readBody = async (request: IncomingMessage): Promise<Readonly<Record<string, unknown>>> => {
  request.setEncoding("utf8");
  let body = "";
  for await (const chunk of request) {
    if (typeof chunk !== "string") throw new TypeError("Expected UTF-8 body");
    body += chunk;
  }
  return JSON.parse(body) as Readonly<Record<string, unknown>>;
};

interface PagePayloadOptions {
  readonly bucketId?: string;
  readonly objectPath?: string;
  readonly pageOverrides?: Readonly<Record<string, unknown>>;
  readonly priceOverrides?: Readonly<Record<string, unknown>>;
}

const pagePayload = ({
  bucketId = "agentefer-catalog-public",
  objectPath = `${organizationId}/${mediaAssetId}/storefront_webp/hash.webp`,
  pageOverrides = {},
  priceOverrides = {},
}: PagePayloadOptions = {}) => ({
  summary: { total: 1, active: 1, paused: 0, draft: 0, archived: 0, facebookErrors: 0 },
  connections: [{ id: connectionId, name: "Página Fer", status: "active" }],
  selectedConnectionId: connectionId,
  items: [
    {
      productId,
      variantId,
      productName: "Combo Roadtrack + Fuel",
      variantName: "Combo completo",
      productDescription: "Cuatro llantas y cuatro rines",
      variantDescription: null,
      productStatus: "active",
      variantStatus: "active",
      sku: "COMBO-RT315-F15-001",
      category: { id: categoryId, code: "llantas", name: "Llantas y rines" },
      prices: [
        {
          id: priceId,
          unitId,
          unitName: "set",
          unitSymbol: null,
          quantityMin: "1.000000",
          quantityMax: "1.000000",
          pricingStatus: "priced",
          calculationMethod: "fixed_total",
          amount: "22500.000000",
          currencyCode: "MXN",
          ...priceOverrides,
        },
      ],
      media: [
        {
          id: mediaId,
          role: "primary",
          ordinal: 0,
          altText: "Combo de llantas y rines",
          bucketId,
          objectPath,
          width: 1200,
          height: 1200,
        },
      ],
      facebook: {
        publicationId,
        publicationStatus: "active",
        versionId,
        versionStatus: "approved",
        pricingStatus: "priced",
        priceAmount: "22500.000000",
        currencyCode: "MXN",
        instanceId: null,
        externalUrl: null,
        facebookStatus: null,
        latestJobId: null,
        latestJobStatus: null,
        lastErrorCode: null,
        effectCertainty: null,
        availableActions: ["publish", "pause"],
      },
      createdAt: "2026-08-29T12:00:00.000Z",
      updatedAt: "2026-08-29T12:05:00.000Z",
    },
  ],
  batches: [
    {
      id: batchId,
      operation: "publish",
      status: "running",
      createdAt: "2026-08-29T12:00:00.000Z",
      completedAt: null,
      total: 1,
      pending: 1,
      processing: 0,
      succeeded: 0,
      failed: 0,
      uncertain: 0,
    },
  ],
  hasMore: false,
  nextCursor: null,
  ...pageOverrides,
});

const createGateway = (url: string) =>
  createAdminCatalogGateway({
    supabaseUrl: url,
    secretKey: new SensitiveValue(serviceSecret),
    timeoutMilliseconds: 250,
  });

describe("admin catalog Supabase gateway over real TCP", () => {
  it("loads one validated page, preserves decimal text and exposes only a public WebP URL", async () => {
    let requestBody: Readonly<Record<string, unknown>> | undefined;
    const baseUrl = await startServer(async (request, response) => {
      expect(request.url).toBe("/rest/v1/rpc/get_facebook_catalog_admin_page");
      expect(request.method).toBe("POST");
      expect(request.headers.apikey).toBe(serviceSecret);
      expect(request.headers["accept-profile"]).toBe("api");
      expect(request.headers["content-profile"]).toBe("api");
      requestBody = await readBody(request);
      writeJson(response, 200, pagePayload());
    });

    const page = await createGateway(baseUrl).getPage({
      organizationId,
      actorUserId: userId,
      socialConnectionId: connectionId,
      status: "active",
      search: "Fuel",
      pageSize: 6,
    });

    expect(requestBody).toEqual({
      target_organization_id: organizationId,
      target_actor_user_id: userId,
      target_social_connection_id: connectionId,
      target_status: "active",
      target_search: "Fuel",
      target_page_size: 6,
      target_cursor_updated_at: null,
      target_cursor_variant_id: null,
    });
    expect(page.items[0]?.prices[0]?.amount).toBe("22500.000000");
    expect(page.items[0]?.media[0]?.url).toBe(
      `${baseUrl}/storage/v1/object/public/agentefer-catalog-public/${organizationId}/${mediaAssetId}/storefront_webp/hash.webp`,
    );
    expect(JSON.stringify(page)).not.toContain(serviceSecret);
    expect(JSON.stringify(page)).not.toContain("bucketId");
    expect(JSON.stringify(page)).not.toContain("objectPath");
  });

  it.each([
    ["private", `${organizationId}/${mediaAssetId}/storefront_webp/hash.webp`],
    ["agentefer-catalog-public", `${organizationId}/${mediaAssetId}/source_original/hash.webp`],
    ["agentefer-catalog-public", `${organizationId}/../foreign/storefront_webp/hash.webp`],
    ["agentefer-catalog-public", `foreign/${mediaAssetId}/storefront_webp/hash.webp`],
    ["agentefer-catalog-public", `${organizationId}/bad-id/storefront_webp/hash.webp`],
    [
      "agentefer-catalog-public",
      `${organizationId}/${mediaAssetId}/storefront_webp/extra/hash.webp`,
    ],
    ["agentefer-catalog-public", `${organizationId}/${mediaAssetId}/storefront_webp/hash.jpg`],
    ["agentefer-catalog-public", `${organizationId}\\${mediaAssetId}\\storefront_webp\\hash.webp`],
  ])("rejects non-public or escaping media from bucket %s at %s", async (bucketId, objectPath) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, pagePayload({ bucketId, objectPath }));
    });
    await expect(
      createGateway(baseUrl).getPage({
        organizationId,
        actorUserId: userId,
        status: "all",
        pageSize: 6,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it.each([
    { pricingStatus: "priced", calculationMethod: null, amount: "22500.000000" },
    { pricingStatus: "priced", calculationMethod: "fixed_total", amount: null },
    { pricingStatus: "on_request", calculationMethod: "fixed_total", amount: null },
    { pricingStatus: "on_request", calculationMethod: null, amount: "22500.000000" },
  ])("rejects an incoherent price contract: %j", async (priceOverrides) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, pagePayload({ priceOverrides }));
    });
    await expect(
      createGateway(baseUrl).getPage({
        organizationId,
        actorUserId: userId,
        status: "all",
        pageSize: 6,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("accepts an on-request price only when method and amount are both absent", async () => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(
        response,
        200,
        pagePayload({
          priceOverrides: {
            pricingStatus: "on_request",
            calculationMethod: null,
            amount: null,
          },
        }),
      );
    });
    const page = await createGateway(baseUrl).getPage({
      organizationId,
      actorUserId: userId,
      status: "all",
      pageSize: 6,
    });
    expect(page.items[0]?.prices[0]).toEqual({
      id: priceId,
      unitId,
      unitName: "set",
      quantityMin: "1.000000",
      quantityMax: "1.000000",
      pricingStatus: "on_request",
      currencyCode: "MXN",
    });
  });

  it("preserves the exact cursor only when the server reports another page", async () => {
    const cursor = { updatedAt: "2026-08-29T12:05:00.000Z", variantId };
    const baseUrl = await startServer((_request, response) => {
      writeJson(
        response,
        200,
        pagePayload({ pageOverrides: { hasMore: true, nextCursor: cursor } }),
      );
    });
    const page = await createGateway(baseUrl).getPage({
      organizationId,
      actorUserId: userId,
      status: "all",
      pageSize: 6,
    });
    expect(page).toMatchObject({ hasMore: true, nextCursor: cursor });
  });

  it.each([
    { hasMore: true, nextCursor: null },
    { hasMore: "true", nextCursor: { updatedAt: "2026-08-29T12:05:00.000Z", variantId } },
    { hasMore: true, nextCursor: { updatedAt: "not-a-date", variantId } },
    { hasMore: true, nextCursor: { updatedAt: "2026-08-29T12:05:00.000Z", variantId: "bad" } },
  ])("rejects an inconsistent page cursor contract: %j", async (pageOverrides) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, 200, pagePayload({ pageOverrides }));
    });
    await expect(
      createGateway(baseUrl).getPage({
        organizationId,
        actorUserId: userId,
        status: "all",
        pageSize: 6,
      }),
    ).rejects.toMatchObject({ kind: "dependency" });
  });

  it("accepts an omitted next cursor when the final page has no continuation", async () => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(
        response,
        200,
        pagePayload({ pageOverrides: { hasMore: false, nextCursor: undefined } }),
      );
    });
    const page = await createGateway(baseUrl).getPage({
      organizationId,
      actorUserId: userId,
      status: "all",
      pageSize: 6,
    });
    expect(page.hasMore).toBe(false);
    expect(page).not.toHaveProperty("nextCursor");
  });

  it("sends every mutation to its exact privileged RPC with the actor and idempotency key", async () => {
    const requests: { path: string; body: Readonly<Record<string, unknown>> }[] = [];
    const baseUrl = await startServer(async (request, response) => {
      requests.push({ path: request.url ?? "", body: await readBody(request) });
      writeJson(response, 200, { accepted: true });
    });
    const gateway = createGateway(baseUrl);
    const shared = { organizationId, actorUserId: userId, idempotencyKey: "b407-command-0001" };
    await gateway.setOfferStatus({ ...shared, variantId, status: "paused", reason: "Pausa" });
    await gateway.publish({
      ...shared,
      variantId,
      socialConnectionId: connectionId,
      operation: "publish",
    });
    await gateway.publishAll({ ...shared, socialConnectionId: connectionId, operation: "refresh" });
    await gateway.retry({ ...shared, publicationJobId: jobId });
    await gateway.setBatchState({
      ...shared,
      publicationBatchId: batchId,
      action: "pause",
      reason: "Pausa",
    });

    expect(requests.map((request) => request.path)).toEqual([
      "/rest/v1/rpc/admin_set_catalog_offer_status",
      "/rest/v1/rpc/admin_enqueue_facebook_publication",
      "/rest/v1/rpc/admin_enqueue_facebook_catalog",
      "/rest/v1/rpc/admin_retry_facebook_publication",
      "/rest/v1/rpc/admin_set_facebook_batch_state",
    ]);
    expect(requests.every((request) => request.body.target_actor_user_id === userId)).toBe(true);
    expect(
      requests.every((request) => request.body.target_idempotency_key === shared.idempotencyKey),
    ).toBe(true);
  });

  it.each([
    [400, "invalid"],
    [399, "dependency"],
    [401, "unauthenticated"],
    [403, "unauthorized"],
    [409, "conflict"],
    [499, "invalid"],
    [500, "dependency"],
    [503, "dependency"],
  ] as const)("classifies Supabase status %i as %s", async (status, kind) => {
    const baseUrl = await startServer((_request, response) => {
      writeJson(response, status, {});
    });
    await expect(
      createGateway(baseUrl).getPage({
        organizationId,
        actorUserId: userId,
        status: "all",
        pageSize: 6,
      }),
    ).rejects.toMatchObject({ name: "AdminMetaGatewayError", kind });
  });

  it("rejects an oversized response before JSON decoding", async () => {
    const baseUrl = await startServer((_request, response) => {
      response.writeHead(200, { "content-length": 1_048_577, "content-type": "application/json" });
      response.end("{}");
    });
    await expect(
      createGateway(baseUrl).getPage({
        organizationId,
        actorUserId: userId,
        status: "all",
        pageSize: 6,
      }),
    ).rejects.toBeInstanceOf(AdminMetaGatewayError);
  });
});
