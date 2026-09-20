import { type AdminCatalogStatus } from "./admin-catalog-gateway.js";
import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const CATALOG_STATUSES = ["all", "draft", "active", "paused", "archived"] as const;
const PUBLICATION_OPERATIONS = ["publish", "refresh"] as const;
const OFFER_STATUSES = ["active", "paused"] as const;
const BATCH_ACTIONS = ["pause", "resume"] as const;
const EDIT_OPERATIONS = [
  "set_status",
  "edit_text",
  "set_price",
  "set_primary_photo",
  "remove_photo",
  "purge_photo",
  "add_photo",
] as const;
const IMAGE_SCOPES = ["product", "variant"] as const;
const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const COMMAND_TYPES = [
  "set_status",
  "edit",
  "publish",
  "publish_all",
  "retry",
  "batch_state",
] as const;

export type AdminCatalogQuery = Readonly<{
  organizationId: string;
  socialConnectionId?: string;
  status: AdminCatalogStatus;
  search?: string;
  pageSize: number;
  cursorUpdatedAt?: string;
  cursorVariantId?: string;
}>;

export type AdminCatalogCommand =
  | Readonly<{
      type: "edit";
      organizationId: string;
      variantId: string;
      operation: (typeof EDIT_OPERATIONS)[number];
      changes: Readonly<Record<string, unknown>>;
      idempotencyKey: string;
    }>
  | Readonly<{
      type: "set_status";
      organizationId: string;
      variantId: string;
      status: "active" | "paused";
      reason: string;
      idempotencyKey: string;
    }>
  | Readonly<{
      type: "publish";
      organizationId: string;
      variantId: string;
      socialConnectionId: string;
      operation: "publish" | "refresh";
      withoutPrice: boolean;
      sourcePriceTierId?: string;
      idempotencyKey: string;
    }>
  | Readonly<{
      type: "publish_all";
      organizationId: string;
      socialConnectionId: string;
      operation: "publish" | "refresh";
      idempotencyKey: string;
    }>
  | Readonly<{
      type: "retry";
      organizationId: string;
      publicationJobId: string;
      idempotencyKey: string;
    }>
  | Readonly<{
      type: "batch_state";
      organizationId: string;
      publicationBatchId: string;
      action: "pause" | "resume";
      reason: string;
      idempotencyKey: string;
    }>;

export type AdminCatalogPrepareImageUploadBody = Readonly<{
  organizationId: string;
  sourceSha256Hex: string;
  sourceMimeType: "image/jpeg" | "image/png" | "image/webp";
  sourceByteSize: number;
  sourceWidthPixels: number;
  sourceHeightPixels: number;
  scope: "product" | "variant";
  allowPublic: boolean;
  altText?: string | null;
  idempotencyKey: string;
}>;

export type AdminCatalogImageUploadStatusQuery = Readonly<{
  organizationId: string;
  uploadId: string;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  source: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
): boolean => Object.keys(source).every((key) => allowedKeys.includes(key));

const readUuid = (source: Readonly<Record<string, unknown>>, field: string): string | undefined =>
  parseMetaEndpointKey(source[field]);

const readBoundedText = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string | undefined => {
  const value = source[field];
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  if (normalized.length < minimumLength || normalized.length > maximumLength) {
    return undefined;
  }
  for (const character of normalized) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) {
      return undefined;
    }
  }
  return normalized;
};

const readOptionalBoundedText = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string | undefined | null => {
  const value = source[field];
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return readBoundedText(source, field, 1, maximumLength);
};

const readEnum = <T extends string>(
  source: Readonly<Record<string, unknown>>,
  field: string,
  values: readonly T[],
): T | undefined => {
  const value = source[field];
  return typeof value === "string" && values.includes(value as T) ? (value as T) : undefined;
};

export const parseAdminCatalogQuery = (value: unknown): AdminCatalogQuery | undefined => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "organizationId",
      "socialConnectionId",
      "status",
      "search",
      "pageSize",
      "cursorUpdatedAt",
      "cursorVariantId",
    ])
  ) {
    return undefined;
  }
  const organizationId = readUuid(value, "organizationId");
  const socialConnectionId =
    value.socialConnectionId === undefined || value.socialConnectionId === ""
      ? null
      : readUuid(value, "socialConnectionId");
  const status = value.status === undefined ? "all" : readEnum(value, "status", CATALOG_STATUSES);
  const search = readOptionalBoundedText(value, "search", 160);
  const pageSizeValue = value.pageSize === undefined ? 12 : Number(value.pageSize);
  const cursorUpdatedAt = readOptionalBoundedText(value, "cursorUpdatedAt", 64);
  const cursorVariantId =
    value.cursorVariantId === undefined || value.cursorVariantId === ""
      ? null
      : readUuid(value, "cursorVariantId");
  if (
    organizationId === undefined ||
    socialConnectionId === undefined ||
    status === undefined ||
    search === undefined ||
    !Number.isSafeInteger(pageSizeValue) ||
    pageSizeValue < 1 ||
    pageSizeValue > 24 ||
    cursorUpdatedAt === undefined ||
    cursorVariantId === undefined ||
    (cursorUpdatedAt === null) !== (cursorVariantId === null) ||
    (cursorUpdatedAt !== null && !Number.isFinite(Date.parse(cursorUpdatedAt)))
  ) {
    return undefined;
  }
  return Object.freeze({
    organizationId,
    ...(socialConnectionId === null ? {} : { socialConnectionId }),
    status,
    ...(search === null ? {} : { search }),
    pageSize: pageSizeValue,
    ...(cursorUpdatedAt === null ? {} : { cursorUpdatedAt }),
    ...(cursorVariantId === null ? {} : { cursorVariantId }),
  });
};

export const parseAdminCatalogCommand = (value: unknown): AdminCatalogCommand | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  const type = readEnum(value, "type", COMMAND_TYPES);
  const organizationId = readUuid(value, "organizationId");
  const idempotencyKey = readBoundedText(value, "idempotencyKey", 8, 240);
  if (type === undefined || organizationId === undefined || idempotencyKey === undefined) {
    return undefined;
  }
  switch (type) {
    case "edit": {
      if (
        !hasOnlyKeys(value, [
          "type",
          "organizationId",
          "variantId",
          "operation",
          "changes",
          "idempotencyKey",
        ])
      ) {
        return undefined;
      }
      const variantId = readUuid(value, "variantId");
      const operation = readEnum(value, "operation", EDIT_OPERATIONS);
      const changes = value.changes;
      if (variantId === undefined || operation === undefined || !isRecord(changes))
        return undefined;
      const keys = Object.keys(changes);
      const photoId = readUuid(changes, "productMediaId");
      const priceId = readUuid(changes, "priceTierId");
      const assetId = readUuid(changes, "mediaAssetId");
      const valid =
        (operation === "set_status" &&
          keys.length === 1 &&
          readEnum(changes, "status", OFFER_STATUSES) !== undefined) ||
        (operation === "edit_text" &&
          keys.length > 0 &&
          hasOnlyKeys(changes, [
            "productName",
            "productDescription",
            "variantName",
            "variantDescription",
          ]) &&
          keys.every((key) =>
            key === "productDescription" || key === "variantDescription"
              ? changes[key] === null ||
                changes[key] === "" ||
                readBoundedText(changes, key, 1, 10000) !== undefined
              : readBoundedText(changes, key, 1, 240) !== undefined,
          )) ||
        (operation === "set_price" &&
          priceId !== undefined &&
          hasOnlyKeys(changes, ["priceTierId", "pricingStatus", "amount"]) &&
          (changes.pricingStatus === "on_request"
            ? changes.amount === undefined || changes.amount === null
            : changes.pricingStatus === "priced" &&
              typeof changes.amount === "number" &&
              Number.isFinite(changes.amount) &&
              changes.amount >= 0 &&
              changes.amount <= 999_999_999_999.99)) ||
        ((operation === "set_primary_photo" ||
            operation === "remove_photo" ||
            operation === "purge_photo") &&
          keys.length === 1 &&
          photoId !== undefined) ||
        (operation === "add_photo" &&
          assetId !== undefined &&
          hasOnlyKeys(changes, ["mediaAssetId", "scope", "altText", "allowPublic"]) &&
          (changes.scope === "product" || changes.scope === "variant") &&
          typeof changes.allowPublic === "boolean" &&
          (changes.altText === undefined ||
            readBoundedText(changes, "altText", 1, 2000) !== undefined));
      return valid
        ? Object.freeze({
            type,
            organizationId,
            variantId,
            operation,
            changes: Object.freeze({ ...changes }),
            idempotencyKey,
          })
        : undefined;
    }
    case "set_status": {
      if (
        !hasOnlyKeys(value, [
          "type",
          "organizationId",
          "variantId",
          "status",
          "reason",
          "idempotencyKey",
        ])
      ) {
        return undefined;
      }
      const variantId = readUuid(value, "variantId");
      const status = readEnum(value, "status", OFFER_STATUSES);
      const reason = readBoundedText(value, "reason", 1, 1000);
      return variantId === undefined || status === undefined || reason === undefined
        ? undefined
        : Object.freeze({ type, organizationId, variantId, status, reason, idempotencyKey });
    }
    case "publish": {
      if (
        !hasOnlyKeys(value, [
          "type",
          "organizationId",
          "variantId",
          "socialConnectionId",
          "operation",
          "withoutPrice",
          "sourcePriceTierId",
          "idempotencyKey",
        ])
      ) {
        return undefined;
      }
      const variantId = readUuid(value, "variantId");
      const socialConnectionId = readUuid(value, "socialConnectionId");
      const operation = readEnum(value, "operation", PUBLICATION_OPERATIONS);
      const withoutPrice = value.withoutPrice === undefined ? false : value.withoutPrice;
      const sourcePriceTierId =
        value.sourcePriceTierId === undefined ? null : readUuid(value, "sourcePriceTierId");
      return variantId === undefined ||
        socialConnectionId === undefined ||
        operation === undefined ||
        typeof withoutPrice !== "boolean" ||
        sourcePriceTierId === undefined ||
        (withoutPrice && sourcePriceTierId !== null)
        ? undefined
        : Object.freeze({
            type,
            organizationId,
            variantId,
            socialConnectionId,
            operation,
            withoutPrice,
            ...(sourcePriceTierId === null ? {} : { sourcePriceTierId }),
            idempotencyKey,
          });
    }
    case "publish_all": {
      if (
        !hasOnlyKeys(value, [
          "type",
          "organizationId",
          "socialConnectionId",
          "operation",
          "idempotencyKey",
        ])
      ) {
        return undefined;
      }
      const socialConnectionId = readUuid(value, "socialConnectionId");
      const operation = readEnum(value, "operation", PUBLICATION_OPERATIONS);
      return socialConnectionId === undefined || operation === undefined
        ? undefined
        : Object.freeze({
            type,
            organizationId,
            socialConnectionId,
            operation,
            idempotencyKey,
          });
    }
    case "retry": {
      if (!hasOnlyKeys(value, ["type", "organizationId", "publicationJobId", "idempotencyKey"])) {
        return undefined;
      }
      const publicationJobId = readUuid(value, "publicationJobId");
      return publicationJobId === undefined
        ? undefined
        : Object.freeze({
            type,
            organizationId,
            publicationJobId,
            idempotencyKey,
          });
    }
    case "batch_state": {
      if (
        !hasOnlyKeys(value, [
          "type",
          "organizationId",
          "publicationBatchId",
          "action",
          "reason",
          "idempotencyKey",
        ])
      ) {
        return undefined;
      }
      const publicationBatchId = readUuid(value, "publicationBatchId");
      const action = readEnum(value, "action", BATCH_ACTIONS);
      const reason = readBoundedText(value, "reason", 1, 1000);
      return publicationBatchId === undefined || action === undefined || reason === undefined
        ? undefined
        : Object.freeze({
            type,
            organizationId,
            publicationBatchId,
            action,
            reason,
            idempotencyKey,
          });
    }
  }
};

const HEX_SHA256_PATTERN = /^[0-9a-f]{64}$/;

export const parseAdminCatalogPrepareImageUploadBody = (
  value: unknown,
): AdminCatalogPrepareImageUploadBody | undefined => {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "organizationId",
      "sourceSha256Hex",
      "sourceMimeType",
      "sourceByteSize",
      "sourceWidthPixels",
      "sourceHeightPixels",
      "scope",
      "allowPublic",
      "altText",
      "idempotencyKey",
    ])
  ) {
    return undefined;
  }
  const organizationId = readUuid(value, "organizationId");
  const sourceSha256Hex = readBoundedText(value, "sourceSha256Hex", 64, 64);
  const sourceMimeType = readEnum(value, "sourceMimeType", IMAGE_MIME_TYPES);
  const sourceByteSize = Number(value.sourceByteSize);
  const sourceWidthPixels = Number(value.sourceWidthPixels);
  const sourceHeightPixels = Number(value.sourceHeightPixels);
  const scope = readEnum(value, "scope", IMAGE_SCOPES);
  const allowPublic = value.allowPublic;
  const altText =
    value.altText === undefined || value.altText === null || value.altText === ""
      ? null
      : readBoundedText(value, "altText", 1, 2000);
  const idempotencyKey = readBoundedText(value, "idempotencyKey", 8, 200);
  if (
    organizationId === undefined ||
    sourceSha256Hex === undefined ||
    !HEX_SHA256_PATTERN.test(sourceSha256Hex) ||
    sourceMimeType === undefined ||
    !Number.isSafeInteger(sourceByteSize) ||
    sourceByteSize < 1 ||
    sourceByteSize > 26214400 ||
    !Number.isSafeInteger(sourceWidthPixels) ||
    sourceWidthPixels < 1 ||
    sourceWidthPixels > 100000 ||
    !Number.isSafeInteger(sourceHeightPixels) ||
    sourceHeightPixels < 1 ||
    sourceHeightPixels > 100000 ||
    scope === undefined ||
    typeof allowPublic !== "boolean" ||
    altText === undefined ||
    idempotencyKey === undefined
  ) {
    return undefined;
  }
  return Object.freeze({
    organizationId,
    sourceSha256Hex: sourceSha256Hex.toLowerCase(),
    sourceMimeType,
    sourceByteSize,
    sourceWidthPixels,
    sourceHeightPixels,
    scope,
    allowPublic,
    ...(altText === null ? {} : { altText }),
    idempotencyKey,
  });
};

export const parseAdminCatalogImageUploadStatusQuery = (
  value: unknown,
): AdminCatalogImageUploadStatusQuery | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["organizationId", "uploadId"])) {
    return undefined;
  }
  const organizationId = readUuid(value, "organizationId");
  const uploadId = readUuid(value, "uploadId");
  if (organizationId === undefined || uploadId === undefined) {
    return undefined;
  }
  return Object.freeze({ organizationId, uploadId });
};
