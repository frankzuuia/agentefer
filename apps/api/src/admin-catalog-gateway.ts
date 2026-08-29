import { type SensitiveValue } from "@agentefer/config";

import { AdminMetaGatewayError } from "./admin-meta-gateway.js";
import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const MAXIMUM_RESPONSE_BYTES = 1_048_576;
const MAXIMUM_CATALOG_ITEMS = 24;
const MAXIMUM_CONNECTIONS = 100;
const MAXIMUM_BATCHES = 6;
const MAXIMUM_PRICES = 20;
const MAXIMUM_MEDIA = 8;

const OFFER_STATUSES = ["draft", "active", "paused", "archived"] as const;
const PRODUCT_STATUSES = ["draft", "active", "paused", "archived"] as const;
const CONNECTION_STATUSES = ["active"] as const;
const PUBLICATION_STATUSES = ["draft", "active", "paused", "retired"] as const;
const VERSION_STATUSES = ["draft", "approved", "superseded", "withdrawn"] as const;
const PRICING_STATUSES = ["priced", "on_request"] as const;
const PRICE_METHODS = ["fixed_total", "per_unit"] as const;
const MEDIA_ROLES = ["primary", "gallery", "detail"] as const;
const FACEBOOK_INSTANCE_STATUSES = ["published", "hidden", "sold", "unknown"] as const;
const JOB_STATUSES = [
  "pending",
  "processing",
  "retryable",
  "succeeded",
  "blocked",
  "failed",
  "cancelled",
  "uncertain",
] as const;
const BATCH_STATUSES = [
  "pending",
  "expanding",
  "queued",
  "running",
  "paused",
  "cancelling",
  "completed",
  "partially_failed",
  "cancelled",
] as const;
const PUBLICATION_OPERATIONS = ["publish", "refresh"] as const;
const AVAILABLE_ACTIONS = ["publish", "refresh", "pause", "resume", "retry", "reconcile"] as const;

export type AdminCatalogStatus = "all" | "draft" | "active" | "paused" | "archived";
export type AdminCatalogPublicationOperation = (typeof PUBLICATION_OPERATIONS)[number];

export type AdminCatalogPageInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  socialConnectionId?: string;
  status: AdminCatalogStatus;
  search?: string;
  pageSize: number;
  cursorUpdatedAt?: string;
  cursorVariantId?: string;
}>;

export type AdminCatalogConnection = Readonly<{
  id: string;
  name: string;
  status: "active";
}>;

export type AdminCatalogPrice = Readonly<{
  id: string;
  unitId: string;
  unitName: string;
  unitSymbol?: string;
  quantityMin: string;
  quantityMax?: string;
  pricingStatus: "priced" | "on_request";
  calculationMethod?: "fixed_total" | "per_unit";
  amount?: string;
  currencyCode: string;
}>;

export type AdminCatalogMedia = Readonly<{
  id: string;
  role: "primary" | "gallery" | "detail";
  ordinal: number;
  altText?: string;
  url: string;
  width: number;
  height: number;
}>;

export type AdminCatalogFacebook = Readonly<{
  publicationId: string;
  publicationStatus: "draft" | "active" | "paused" | "retired";
  versionId?: string;
  versionStatus?: "draft" | "approved" | "superseded" | "withdrawn";
  pricingStatus?: "priced" | "on_request";
  priceAmount?: string;
  currencyCode?: string;
  instanceId?: string;
  externalUrl?: string;
  facebookStatus?: "published" | "hidden" | "sold" | "unknown";
  latestJobId?: string;
  latestJobStatus?: (typeof JOB_STATUSES)[number];
  lastErrorCode?: string;
  effectCertainty?: string;
  availableActions: readonly (typeof AVAILABLE_ACTIONS)[number][];
}>;

export type AdminCatalogItem = Readonly<{
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  productDescription?: string;
  variantDescription?: string;
  productStatus: (typeof PRODUCT_STATUSES)[number];
  variantStatus: (typeof OFFER_STATUSES)[number];
  sku?: string;
  category: Readonly<{ id: string; code: string; name: string }>;
  prices: readonly AdminCatalogPrice[];
  media: readonly AdminCatalogMedia[];
  facebook?: AdminCatalogFacebook;
  createdAt: string;
  updatedAt: string;
}>;

export type AdminCatalogBatch = Readonly<{
  id: string;
  operation: AdminCatalogPublicationOperation;
  status: (typeof BATCH_STATUSES)[number];
  createdAt: string;
  completedAt?: string;
  total: number;
  pending: number;
  processing: number;
  succeeded: number;
  failed: number;
  uncertain: number;
}>;

export type AdminCatalogPage = Readonly<{
  summary: Readonly<{
    total: number;
    active: number;
    paused: number;
    draft: number;
    archived: number;
    facebookErrors: number;
  }>;
  connections: readonly AdminCatalogConnection[];
  selectedConnectionId?: string;
  items: readonly AdminCatalogItem[];
  batches: readonly AdminCatalogBatch[];
  hasMore: boolean;
  nextCursor?: Readonly<{ updatedAt: string; variantId: string }>;
}>;

export type AdminCatalogSetStatusInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  variantId: string;
  status: "active" | "paused";
  reason: string;
  idempotencyKey: string;
}>;

export type AdminCatalogPublishInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  variantId: string;
  socialConnectionId: string;
  operation: AdminCatalogPublicationOperation;
  idempotencyKey: string;
}>;

export type AdminCatalogPublishAllInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  socialConnectionId: string;
  operation: AdminCatalogPublicationOperation;
  idempotencyKey: string;
}>;

export type AdminCatalogRetryInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  publicationJobId: string;
  idempotencyKey: string;
}>;

export type AdminCatalogBatchStateInput = Readonly<{
  organizationId: string;
  actorUserId: string;
  publicationBatchId: string;
  action: "pause" | "resume";
  reason: string;
  idempotencyKey: string;
}>;

export type AdminCatalogActionResult = Readonly<Record<string, unknown>>;

export type AdminCatalogGateway = Readonly<{
  getPage(input: AdminCatalogPageInput): Promise<AdminCatalogPage>;
  setOfferStatus(input: AdminCatalogSetStatusInput): Promise<AdminCatalogActionResult>;
  publish(input: AdminCatalogPublishInput): Promise<AdminCatalogActionResult>;
  publishAll(input: AdminCatalogPublishAllInput): Promise<AdminCatalogActionResult>;
  retry(input: AdminCatalogRetryInput): Promise<AdminCatalogActionResult>;
  setBatchState(input: AdminCatalogBatchStateInput): Promise<AdminCatalogActionResult>;
}>;

export type CreateAdminCatalogGatewayInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readUuid = (source: Readonly<Record<string, unknown>>, field: string): string => {
  const parsed = parseMetaEndpointKey(source[field]);
  if (parsed === undefined) {
    throw new AdminMetaGatewayError("dependency");
  }
  return parsed;
};

const readOptionalUuid = (
  source: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = source[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  return readUuid(source, field);
};

const readText = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string => {
  const value = source[field];
  if (typeof value !== "string") {
    throw new AdminMetaGatewayError("dependency");
  }
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > maximumLength) {
    throw new AdminMetaGatewayError("dependency");
  }
  return normalized;
};

const readOptionalText = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string | undefined => {
  const value = source[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  return readText(source, field, maximumLength);
};

const readTimestamp = (source: Readonly<Record<string, unknown>>, field: string): string => {
  const value = readText(source, field, 64);
  if (!Number.isFinite(Date.parse(value))) {
    throw new AdminMetaGatewayError("dependency");
  }
  return value;
};

const readOptionalTimestamp = (
  source: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = source[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  return readTimestamp(source, field);
};

const readInteger = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximum: number,
): number => {
  const value = source[field];
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > maximum) {
    throw new AdminMetaGatewayError("dependency");
  }
  return value as number;
};

const readEnum = <T extends string>(
  source: Readonly<Record<string, unknown>>,
  field: string,
  values: readonly T[],
): T => {
  const value = source[field];
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new AdminMetaGatewayError("dependency");
  }
  return value as T;
};

const readOptionalEnum = <T extends string>(
  source: Readonly<Record<string, unknown>>,
  field: string,
  values: readonly T[],
): T | undefined => {
  const value = source[field];
  if (value === null || value === undefined) {
    return undefined;
  }
  return readEnum(source, field, values);
};

const readArray = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): readonly unknown[] => {
  const value = source[field];
  if (!Array.isArray(value) || value.length > maximumLength) {
    throw new AdminMetaGatewayError("dependency");
  }
  return value;
};

const readDecimalText = (source: Readonly<Record<string, unknown>>, field: string): string =>
  readText(source, field, 64);

const decodeJsonResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsed = Number(contentLength);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > MAXIMUM_RESPONSE_BYTES) {
      throw new AdminMetaGatewayError("dependency");
    }
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    throw new AdminMetaGatewayError("dependency");
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new AdminMetaGatewayError("dependency", error);
  }
};

const readRpcObject = (value: unknown): Readonly<Record<string, unknown>> => {
  if (isRecord(value)) {
    return value;
  }
  if (Array.isArray(value) && value.length === 1 && isRecord(value[0])) {
    return value[0];
  }
  throw new AdminMetaGatewayError("dependency");
};

const createMediaUrl = (
  baseUrl: URL,
  organizationId: string,
  bucketId: string,
  objectPath: string,
): string => {
  const objectSegments = objectPath.split("/");
  if (
    bucketId !== "agentefer-catalog-public" ||
    objectSegments.length !== 4 ||
    objectSegments[0] !== organizationId ||
    parseMetaEndpointKey(objectSegments[1]) === undefined ||
    objectSegments[2] !== "storefront_webp" ||
    !objectPath.endsWith(".webp") ||
    objectPath.includes("..") ||
    objectPath.includes("\\")
  ) {
    throw new AdminMetaGatewayError("dependency");
  }
  const url = new URL(baseUrl);
  const segments = ["storage", "v1", "object", "public", bucketId, ...objectSegments];
  url.pathname = `/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  url.search = "";
  return url.toString();
};

const parsePrice = (value: unknown): AdminCatalogPrice => {
  if (!isRecord(value)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const pricingStatus = readEnum(value, "pricingStatus", PRICING_STATUSES);
  const calculationMethod = readOptionalEnum(value, "calculationMethod", PRICE_METHODS);
  const amount = readOptionalText(value, "amount", 64);
  const unitSymbol = readOptionalText(value, "unitSymbol", 24);
  const quantityMax = readOptionalText(value, "quantityMax", 64);
  if (
    (pricingStatus === "priced" && (calculationMethod === undefined || amount === undefined)) ||
    (pricingStatus === "on_request" && (calculationMethod !== undefined || amount !== undefined))
  ) {
    throw new AdminMetaGatewayError("dependency");
  }
  return Object.freeze({
    id: readUuid(value, "id"),
    unitId: readUuid(value, "unitId"),
    unitName: readText(value, "unitName", 100),
    ...(unitSymbol === undefined ? {} : { unitSymbol }),
    quantityMin: readDecimalText(value, "quantityMin"),
    ...(quantityMax === undefined ? {} : { quantityMax }),
    pricingStatus,
    ...(calculationMethod === undefined ? {} : { calculationMethod }),
    ...(amount === undefined ? {} : { amount }),
    currencyCode: readText(value, "currencyCode", 3),
  });
};

const parseMedia = (value: unknown, baseUrl: URL, organizationId: string): AdminCatalogMedia => {
  if (!isRecord(value)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const bucketId = readText(value, "bucketId", 100);
  const objectPath = readText(value, "objectPath", 1024);
  const altText = readOptionalText(value, "altText", 2000);
  return Object.freeze({
    id: readUuid(value, "id"),
    role: readEnum(value, "role", MEDIA_ROLES),
    ordinal: readInteger(value, "ordinal", 99),
    ...(altText === undefined ? {} : { altText }),
    url: createMediaUrl(baseUrl, organizationId, bucketId, objectPath),
    width: readInteger(value, "width", 100_000),
    height: readInteger(value, "height", 100_000),
  });
};

const parseFacebook = (value: unknown): AdminCatalogFacebook | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const availableActions = readArray(value, "availableActions", AVAILABLE_ACTIONS.length).map(
    (action) => {
      if (typeof action !== "string" || !AVAILABLE_ACTIONS.includes(action as never)) {
        throw new AdminMetaGatewayError("dependency");
      }
      return action as (typeof AVAILABLE_ACTIONS)[number];
    },
  );
  const externalUrl = readOptionalText(value, "externalUrl", 4096);
  const versionId = readOptionalUuid(value, "versionId");
  const versionStatus = readOptionalEnum(value, "versionStatus", VERSION_STATUSES);
  const pricingStatus = readOptionalEnum(value, "pricingStatus", PRICING_STATUSES);
  const priceAmount = readOptionalText(value, "priceAmount", 64);
  const currencyCode = readOptionalText(value, "currencyCode", 3);
  const instanceId = readOptionalUuid(value, "instanceId");
  const facebookStatus = readOptionalEnum(value, "facebookStatus", FACEBOOK_INSTANCE_STATUSES);
  const latestJobId = readOptionalUuid(value, "latestJobId");
  const latestJobStatus = readOptionalEnum(value, "latestJobStatus", JOB_STATUSES);
  const lastErrorCode = readOptionalText(value, "lastErrorCode", 160);
  const effectCertainty = readOptionalText(value, "effectCertainty", 80);
  if (externalUrl !== undefined) {
    let parsed: URL;
    try {
      parsed = new URL(externalUrl);
    } catch (error) {
      throw new AdminMetaGatewayError("dependency", error);
    }
    if (parsed.protocol !== "https:") {
      throw new AdminMetaGatewayError("dependency");
    }
  }
  return Object.freeze({
    publicationId: readUuid(value, "publicationId"),
    publicationStatus: readEnum(value, "publicationStatus", PUBLICATION_STATUSES),
    ...(versionId === undefined ? {} : { versionId }),
    ...(versionStatus === undefined ? {} : { versionStatus }),
    ...(pricingStatus === undefined ? {} : { pricingStatus }),
    ...(priceAmount === undefined ? {} : { priceAmount }),
    ...(currencyCode === undefined ? {} : { currencyCode }),
    ...(instanceId === undefined ? {} : { instanceId }),
    ...(externalUrl === undefined ? {} : { externalUrl }),
    ...(facebookStatus === undefined ? {} : { facebookStatus }),
    ...(latestJobId === undefined ? {} : { latestJobId }),
    ...(latestJobStatus === undefined ? {} : { latestJobStatus }),
    ...(lastErrorCode === undefined ? {} : { lastErrorCode }),
    ...(effectCertainty === undefined ? {} : { effectCertainty }),
    availableActions: Object.freeze(availableActions),
  });
};

const parseCatalogItem = (
  value: unknown,
  baseUrl: URL,
  organizationId: string,
): AdminCatalogItem => {
  if (!isRecord(value) || !isRecord(value.category)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const productDescription = readOptionalText(value, "productDescription", 10_000);
  const variantDescription = readOptionalText(value, "variantDescription", 10_000);
  const sku = readOptionalText(value, "sku", 100);
  const facebook = parseFacebook(value.facebook);
  return Object.freeze({
    productId: readUuid(value, "productId"),
    variantId: readUuid(value, "variantId"),
    productName: readText(value, "productName", 240),
    variantName: readText(value, "variantName", 240),
    ...(productDescription === undefined ? {} : { productDescription }),
    ...(variantDescription === undefined ? {} : { variantDescription }),
    productStatus: readEnum(value, "productStatus", PRODUCT_STATUSES),
    variantStatus: readEnum(value, "variantStatus", OFFER_STATUSES),
    ...(sku === undefined ? {} : { sku }),
    category: Object.freeze({
      id: readUuid(value.category, "id"),
      code: readText(value.category, "code", 63),
      name: readText(value.category, "name", 160),
    }),
    prices: Object.freeze(readArray(value, "prices", MAXIMUM_PRICES).map(parsePrice)),
    media: Object.freeze(
      readArray(value, "media", MAXIMUM_MEDIA).map((media) =>
        parseMedia(media, baseUrl, organizationId),
      ),
    ),
    ...(facebook === undefined ? {} : { facebook }),
    createdAt: readTimestamp(value, "createdAt"),
    updatedAt: readTimestamp(value, "updatedAt"),
  });
};

const parseBatch = (value: unknown): AdminCatalogBatch => {
  if (!isRecord(value)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const completedAt = readOptionalTimestamp(value, "completedAt");
  return Object.freeze({
    id: readUuid(value, "id"),
    operation: readEnum(value, "operation", PUBLICATION_OPERATIONS),
    status: readEnum(value, "status", BATCH_STATUSES),
    createdAt: readTimestamp(value, "createdAt"),
    ...(completedAt === undefined ? {} : { completedAt }),
    total: readInteger(value, "total", 10_000),
    pending: readInteger(value, "pending", 10_000),
    processing: readInteger(value, "processing", 10_000),
    succeeded: readInteger(value, "succeeded", 10_000),
    failed: readInteger(value, "failed", 10_000),
    uncertain: readInteger(value, "uncertain", 10_000),
  });
};

const parsePage = (value: unknown, baseUrl: URL, organizationId: string): AdminCatalogPage => {
  const page = readRpcObject(value);
  if (!isRecord(page.summary)) {
    throw new AdminMetaGatewayError("dependency");
  }
  const selectedConnectionId = readOptionalUuid(page, "selectedConnectionId");
  let nextCursor: Readonly<{ updatedAt: string; variantId: string }> | undefined;
  if (page.nextCursor !== null && page.nextCursor !== undefined) {
    if (!isRecord(page.nextCursor)) {
      throw new AdminMetaGatewayError("dependency");
    }
    nextCursor = Object.freeze({
      updatedAt: readTimestamp(page.nextCursor, "updatedAt"),
      variantId: readUuid(page.nextCursor, "variantId"),
    });
  }
  if (typeof page.hasMore !== "boolean" || (page.hasMore && nextCursor === undefined)) {
    throw new AdminMetaGatewayError("dependency");
  }
  return Object.freeze({
    summary: Object.freeze({
      total: readInteger(page.summary, "total", 10_000_000),
      active: readInteger(page.summary, "active", 10_000_000),
      paused: readInteger(page.summary, "paused", 10_000_000),
      draft: readInteger(page.summary, "draft", 10_000_000),
      archived: readInteger(page.summary, "archived", 10_000_000),
      facebookErrors: readInteger(page.summary, "facebookErrors", 10_000_000),
    }),
    connections: Object.freeze(
      readArray(page, "connections", MAXIMUM_CONNECTIONS).map((connection) => {
        if (!isRecord(connection)) {
          throw new AdminMetaGatewayError("dependency");
        }
        return Object.freeze({
          id: readUuid(connection, "id"),
          name: readText(connection, "name", 160),
          status: readEnum(connection, "status", CONNECTION_STATUSES),
        });
      }),
    ),
    ...(selectedConnectionId === undefined ? {} : { selectedConnectionId }),
    items: Object.freeze(
      readArray(page, "items", MAXIMUM_CATALOG_ITEMS).map((item) =>
        parseCatalogItem(item, baseUrl, organizationId),
      ),
    ),
    batches: Object.freeze(readArray(page, "batches", MAXIMUM_BATCHES).map(parseBatch)),
    hasMore: page.hasMore,
    ...(nextCursor === undefined ? {} : { nextCursor }),
  });
};

export function createAdminCatalogGateway(
  input: CreateAdminCatalogGatewayInput,
): AdminCatalogGateway {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";

  const executeRpc = async (name: string, body: Readonly<Record<string, unknown>>) => {
    const url = new URL(baseUrl);
    url.pathname = `/rest/v1/rpc/${name}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-profile": "api",
          apikey: input.secretKey.reveal(),
          "content-profile": "api",
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(input.timeoutMilliseconds),
      });
    } catch (error) {
      const kind =
        error instanceof Error && error.name === "TimeoutError" ? "timeout" : "dependency";
      throw new AdminMetaGatewayError(kind, error);
    }
    if (!response.ok) {
      await response.body?.cancel();
      const kind =
        response.status === 401
          ? "unauthenticated"
          : response.status === 403
            ? "unauthorized"
            : response.status === 409
              ? "conflict"
              : response.status >= 400 && response.status < 500
                ? "invalid"
                : "dependency";
      throw new AdminMetaGatewayError(kind);
    }
    return decodeJsonResponse(response);
  };

  const executeAction = async (
    name: string,
    body: Readonly<Record<string, unknown>>,
  ): Promise<AdminCatalogActionResult> =>
    Object.freeze(readRpcObject(await executeRpc(name, body)));

  return Object.freeze({
    async getPage(pageInput) {
      const value = await executeRpc("get_facebook_catalog_admin_page", {
        target_organization_id: pageInput.organizationId,
        target_actor_user_id: pageInput.actorUserId,
        target_social_connection_id: pageInput.socialConnectionId ?? null,
        target_status: pageInput.status,
        target_search: pageInput.search ?? null,
        target_page_size: pageInput.pageSize,
        target_cursor_updated_at: pageInput.cursorUpdatedAt ?? null,
        target_cursor_variant_id: pageInput.cursorVariantId ?? null,
      });
      return parsePage(value, baseUrl, pageInput.organizationId);
    },
    setOfferStatus(actionInput) {
      return executeAction("admin_set_catalog_offer_status", {
        target_organization_id: actionInput.organizationId,
        target_actor_user_id: actionInput.actorUserId,
        target_variant_id: actionInput.variantId,
        target_status: actionInput.status,
        target_reason: actionInput.reason,
        target_idempotency_key: actionInput.idempotencyKey,
      });
    },
    publish(actionInput) {
      return executeAction("admin_enqueue_facebook_publication", {
        target_organization_id: actionInput.organizationId,
        target_actor_user_id: actionInput.actorUserId,
        target_variant_id: actionInput.variantId,
        target_social_connection_id: actionInput.socialConnectionId,
        target_operation: actionInput.operation,
        target_idempotency_key: actionInput.idempotencyKey,
      });
    },
    publishAll(actionInput) {
      return executeAction("admin_enqueue_facebook_catalog", {
        target_organization_id: actionInput.organizationId,
        target_actor_user_id: actionInput.actorUserId,
        target_social_connection_id: actionInput.socialConnectionId,
        target_operation: actionInput.operation,
        target_idempotency_key: actionInput.idempotencyKey,
      });
    },
    retry(actionInput) {
      return executeAction("admin_retry_facebook_publication", {
        target_organization_id: actionInput.organizationId,
        target_actor_user_id: actionInput.actorUserId,
        target_publication_job_id: actionInput.publicationJobId,
        target_idempotency_key: actionInput.idempotencyKey,
      });
    },
    setBatchState(actionInput) {
      return executeAction("admin_set_facebook_batch_state", {
        target_organization_id: actionInput.organizationId,
        target_actor_user_id: actionInput.actorUserId,
        target_publication_batch_id: actionInput.publicationBatchId,
        target_action: actionInput.action,
        target_reason: actionInput.reason,
        target_idempotency_key: actionInput.idempotencyKey,
      });
    },
  });
}
