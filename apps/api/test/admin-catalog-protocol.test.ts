import { describe, expect, it } from "vitest";

import { parseAdminCatalogCommand, parseAdminCatalogQuery } from "../src/admin-catalog-protocol.js";

const organizationId = "b4071000-0000-4000-8000-000000000001";
const variantId = "b4074000-0000-4000-8000-000000000001";
const connectionId = "b4076000-0000-4000-8000-000000000001";
const jobId = "b4077000-0000-4000-8000-000000000001";
const batchId = "b4078000-0000-4000-8000-000000000001";
const idempotencyKey = "b407-panel-command-0001";

describe("admin catalog protocol", () => {
  it("applies mobile-safe defaults to an exact tenant query", () => {
    expect(parseAdminCatalogQuery({ organizationId })).toEqual({
      organizationId,
      status: "all",
      pageSize: 12,
    });
  });

  it("parses a complete cursor and normalizes search", () => {
    expect(
      parseAdminCatalogQuery({
        organizationId,
        socialConnectionId: connectionId,
        status: "active",
        search: "  rin fuel  ",
        pageSize: "6",
        cursorUpdatedAt: "2026-08-29T12:00:00.000Z",
        cursorVariantId: variantId,
      }),
    ).toEqual({
      organizationId,
      socialConnectionId: connectionId,
      status: "active",
      search: "rin fuel",
      pageSize: 6,
      cursorUpdatedAt: "2026-08-29T12:00:00.000Z",
      cursorVariantId: variantId,
    });
  });

  it.each([1, 24])("accepts the inclusive page-size boundary %i", (pageSize) => {
    expect(parseAdminCatalogQuery({ organizationId, pageSize })).toMatchObject({ pageSize });
  });

  it("treats empty optional identifiers as absent instead of malformed", () => {
    expect(
      parseAdminCatalogQuery({
        organizationId,
        socialConnectionId: "",
        cursorUpdatedAt: "",
        cursorVariantId: "",
      }),
    ).toEqual({ organizationId, status: "all", pageSize: 12 });
  });

  it.each([
    { organizationId, pageSize: 0 },
    { organizationId, pageSize: 25 },
    { organizationId, pageSize: 1.5 },
    { organizationId, socialConnectionId: "not-a-uuid" },
    { organizationId, search: "x".repeat(161) },
    { organizationId, cursorUpdatedAt: "2026-08-29T12:00:00.000Z" },
    { organizationId, cursorVariantId: variantId },
    { organizationId, cursorUpdatedAt: "not-a-date", cursorVariantId: variantId },
    { organizationId, status: "deleted" },
    { organizationId, unexpected: "blocked" },
    { organizationId: "not-a-uuid" },
  ])("rejects an invalid catalog query: %j", (query) => {
    expect(parseAdminCatalogQuery(query)).toBeUndefined();
  });

  it.each([
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_status",
      changes: { status: "active" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_status",
      changes: { status: "paused" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "edit_text",
      changes: { productName: "Combo Roadtrack", productDescription: null },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "on_request" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "on_request", amount: null },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: 0 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: 999_999_999_999.99 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_primary_photo",
      changes: { productMediaId: jobId },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "remove_photo",
      changes: { productMediaId: jobId },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: { mediaAssetId: jobId, scope: "product", allowPublic: true },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: {
        mediaAssetId: jobId,
        scope: "variant",
        allowPublic: false,
        altText: "Rin Fuel de frente",
      },
      idempotencyKey,
    },
    {
      type: "set_status",
      organizationId,
      variantId,
      status: "paused",
      reason: "Pausa autorizada",
      idempotencyKey,
    },
    {
      type: "publish",
      organizationId,
      variantId,
      socialConnectionId: connectionId,
      operation: "publish",
      idempotencyKey,
    },
    {
      type: "publish_all",
      organizationId,
      socialConnectionId: connectionId,
      operation: "refresh",
      idempotencyKey,
    },
    {
      type: "retry",
      organizationId,
      publicationJobId: jobId,
      idempotencyKey,
    },
    {
      type: "batch_state",
      organizationId,
      publicationBatchId: batchId,
      action: "pause",
      reason: "Pausa autorizada",
      idempotencyKey,
    },
  ] as const)("parses the exact $type command", (command) => {
    expect(parseAdminCatalogCommand(command)).toEqual(
      command.type === "publish" ? { ...command, withoutPrice: false } : command,
    );
  });

  it.each([
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_status",
      changes: { status: "archived" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "edit_text",
      changes: { productName: " " },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: -1 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "remove_photo",
      changes: { productMediaId: jobId, purge: true },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: { mediaAssetId: jobId, scope: "other", allowPublic: true },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_status",
      changes: { status: "active", extra: true },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "edit_text",
      changes: {},
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "edit_text",
      changes: { productDescription: "x".repeat(10_001) },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "edit_text",
      changes: { variantName: null },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { pricingStatus: "priced", amount: 100 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: "100" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: Number.NaN },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "priced", amount: 1_000_000_000_000 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_price",
      changes: { priceTierId: jobId, pricingStatus: "on_request", amount: 1 },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "set_primary_photo",
      changes: { productMediaId: "bad" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: { scope: "product", allowPublic: true },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: { mediaAssetId: jobId, scope: "product" },
      idempotencyKey,
    },
    {
      type: "edit",
      organizationId,
      variantId,
      operation: "add_photo",
      changes: { mediaAssetId: jobId, scope: "product", allowPublic: true, altText: "" },
      idempotencyKey,
    },
    undefined,
    {},
    { type: "delete", organizationId, idempotencyKey },
    {
      type: "set_status",
      organizationId,
      variantId,
      status: "archived",
      reason: "x",
      idempotencyKey,
    },
    {
      type: "publish",
      organizationId,
      variantId,
      socialConnectionId: connectionId,
      operation: "archive",
      idempotencyKey,
    },
    { type: "retry", organizationId, publicationJobId: "bad", idempotencyKey },
    { type: "retry", organizationId, publicationJobId: jobId, idempotencyKey: "short" },
    { type: "retry", organizationId, publicationJobId: jobId, idempotencyKey, extra: true },
    { type: "retry", publicationJobId: jobId, idempotencyKey },
    { type: "retry", organizationId, publicationJobId: jobId },
    {
      type: "set_status",
      organizationId,
      variantId: "bad",
      status: "paused",
      reason: "x",
      idempotencyKey,
    },
    {
      type: "set_status",
      organizationId,
      variantId,
      status: "paused",
      idempotencyKey,
    },
    {
      type: "publish",
      organizationId,
      variantId: "bad",
      socialConnectionId: connectionId,
      operation: "publish",
      idempotencyKey,
    },
    {
      type: "publish",
      organizationId,
      variantId,
      socialConnectionId: "bad",
      operation: "publish",
      idempotencyKey,
    },
    {
      type: "publish_all",
      organizationId,
      socialConnectionId: "bad",
      operation: "refresh",
      idempotencyKey,
    },
    {
      type: "publish_all",
      organizationId,
      socialConnectionId: connectionId,
      operation: "bad",
      idempotencyKey,
    },
    {
      type: "batch_state",
      organizationId,
      publicationBatchId: "bad",
      action: "pause",
      reason: "x",
      idempotencyKey,
    },
    {
      type: "batch_state",
      organizationId,
      publicationBatchId: batchId,
      action: "bad",
      reason: "x",
      idempotencyKey,
    },
    {
      type: "batch_state",
      organizationId,
      publicationBatchId: batchId,
      action: "pause",
      idempotencyKey,
    },
    {
      type: "set_status",
      organizationId,
      variantId,
      status: "paused",
      reason: "x",
      idempotencyKey,
      extra: true,
    },
    {
      type: "publish_all",
      organizationId,
      socialConnectionId: connectionId,
      operation: "refresh",
      idempotencyKey,
      extra: true,
    },
    {
      type: "batch_state",
      organizationId,
      publicationBatchId: batchId,
      action: "pause",
      reason: "x",
      idempotencyKey,
      extra: true,
    },
  ])("rejects an invalid or expansive command: %j", (command) => {
    expect(parseAdminCatalogCommand(command)).toBeUndefined();
  });
});
