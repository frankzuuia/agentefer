import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_RESPONSE_BYTES = 65_536;
const MAXIMUM_PHONE_PAGES = 50;
const PHONE_PAGE_SIZE = 100;
const MAXIMUM_SCOPES = 100;
const REQUIRED_WHATSAPP_SCOPES = Object.freeze([
  "whatsapp_business_management",
  "whatsapp_business_messaging",
]);

export const META_GRAPH_GATEWAY_FAILURE_KINDS = [
  "invalid",
  "unauthorized",
  "timeout",
  "dependency",
] as const;

export type MetaGraphGatewayFailureKind = (typeof META_GRAPH_GATEWAY_FAILURE_KINDS)[number];

export const META_GRAPH_GATEWAY_STAGES = [
  "token_debug",
  "phone_lookup",
  "waba_subscription",
] as const;

export type MetaGraphGatewayStage = (typeof META_GRAPH_GATEWAY_STAGES)[number];

export const META_GRAPH_GATEWAY_CHECKPOINTS = [
  "provider_request",
  "provider_response",
  "token_response",
  "token_identity",
  "token_permissions",
  "token_asset_grants",
  "token_metadata",
  "phone_response",
  "phone_pagination",
  "phone_identity",
  "subscription_response",
] as const;

export type MetaGraphGatewayCheckpoint = (typeof META_GRAPH_GATEWAY_CHECKPOINTS)[number];

type MetaGraphGatewayDiagnostics = Readonly<{
  stage?: MetaGraphGatewayStage;
  checkpoint?: MetaGraphGatewayCheckpoint;
  providerStatus?: number;
  providerErrorCode?: number;
}>;

export class MetaGraphGatewayError extends OperationalError {
  readonly kind: MetaGraphGatewayFailureKind;
  readonly stage: MetaGraphGatewayStage | undefined;
  readonly checkpoint: MetaGraphGatewayCheckpoint | undefined;
  readonly providerStatus: number | undefined;
  readonly providerErrorCode: number | undefined;

  constructor(
    kind: MetaGraphGatewayFailureKind,
    cause?: unknown,
    diagnostics: MetaGraphGatewayDiagnostics = {},
  ) {
    const attributes =
      kind === "invalid"
        ? {
            code: "META_GRAPH_INVALID",
            category: "validation" as const,
            retryable: false,
            severity: "warning" as const,
          }
        : kind === "unauthorized"
          ? {
              code: "META_GRAPH_UNAUTHORIZED",
              category: "authorization" as const,
              retryable: false,
              severity: "warning" as const,
            }
          : kind === "timeout"
            ? {
                code: "META_GRAPH_TIMEOUT",
                category: "timeout" as const,
                retryable: true,
                severity: "error" as const,
              }
            : {
                code: "META_GRAPH_DEPENDENCY",
                category: "dependency" as const,
                retryable: true,
                severity: "error" as const,
              };

    super({ ...attributes, cause });
    this.name = "MetaGraphGatewayError";
    this.kind = kind;
    this.stage = diagnostics.stage;
    this.checkpoint = diagnostics.checkpoint;
    this.providerStatus = diagnostics.providerStatus;
    this.providerErrorCode = diagnostics.providerErrorCode;
  }
}

export type ValidateMetaWhatsAppConnectionInput = Readonly<{
  apiVersion: string;
  expectedAppId: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: SensitiveValue;
}>;

export type ValidatedMetaWhatsAppConnection = Readonly<{
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating?: string;
  nameStatus?: string;
  tokenType: string;
  grantedScopes: readonly string[];
  tokenExpiresAt?: string;
  dataAccessExpiresAt?: string;
}>;

export type MetaGraphGateway = Readonly<{
  validateAndSubscribeWhatsAppConnection(
    input: ValidateMetaWhatsAppConnectionInput,
  ): Promise<ValidatedMetaWhatsAppConnection>;
}>;

export type CreateMetaGraphGatewayInput = Readonly<{
  baseUrl: string;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (code < 32 || code === 127) {
      return true;
    }
  }

  return false;
};

const readText = (value: unknown, maximumLength: number): string => {
  if (typeof value !== "string") {
    throw new MetaGraphGatewayError("dependency");
  }

  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > maximumLength ||
    hasControlCharacter(normalized)
  ) {
    throw new MetaGraphGatewayError("dependency");
  }

  return normalized;
};

const readOptionalText = (value: unknown, maximumLength: number): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return readText(value, maximumLength);
};

const isGraphApiVersion = (value: string): boolean => {
  if (value.length < 4 || !value.startsWith("v")) {
    return false;
  }

  let decimalPointSeen = false;
  let digitBeforeDecimal = false;
  let digitAfterDecimal = false;
  for (const character of value.slice(1)) {
    if (character === ".") {
      if (decimalPointSeen || !digitBeforeDecimal) {
        return false;
      }
      decimalPointSeen = true;
      continue;
    }

    if (character < "0" || character > "9") {
      return false;
    }
    if (decimalPointSeen) {
      digitAfterDecimal = true;
    } else {
      digitBeforeDecimal = true;
    }
  }

  return decimalPointSeen && digitAfterDecimal;
};

const isAsciiDecimalIdentifier = (value: string): boolean => {
  if (value.length < 1 || value.length > 64) {
    return false;
  }
  for (const character of value) {
    if (character < "0" || character > "9") {
      return false;
    }
  }
  return true;
};

const decodeJsonResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > MAXIMUM_RESPONSE_BYTES
    ) {
      throw new MetaGraphGatewayError("dependency");
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    throw new MetaGraphGatewayError("dependency");
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new MetaGraphGatewayError("dependency", error);
  }
};

const readMetaErrorCode = (value: unknown): number | undefined => {
  if (!isRecord(value) || !isRecord(value.error)) {
    return undefined;
  }

  const code = value.error.code;
  return typeof code === "number" && Number.isSafeInteger(code) ? code : undefined;
};

const failureKindForResponse = (
  status: number,
  responseValue: unknown,
): MetaGraphGatewayFailureKind => {
  if (status === 401 || status === 403) {
    return "unauthorized";
  }

  if (status === 400) {
    const metaErrorCode = readMetaErrorCode(responseValue);
    if (
      metaErrorCode === 10 ||
      metaErrorCode === 190 ||
      metaErrorCode === 200 ||
      metaErrorCode === 294
    ) {
      return "unauthorized";
    }
    return "invalid";
  }

  if (status === 404 || status === 422) {
    return "invalid";
  }

  return "dependency";
};

const unixTimestampToIso = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === 0) {
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new MetaGraphGatewayError("dependency");
  }

  const milliseconds = value * 1_000;
  const timestamp = new Date(milliseconds);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new MetaGraphGatewayError("dependency");
  }

  return timestamp.toISOString();
};

const readScopes = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || value.length > MAXIMUM_SCOPES) {
    throw new MetaGraphGatewayError("dependency");
  }

  const scopes = [...new Set(value.map((scope) => readText(scope, 160)))].sort();
  for (const requiredScope of REQUIRED_WHATSAPP_SCOPES) {
    if (!scopes.includes(requiredScope)) {
      throw new MetaGraphGatewayError("unauthorized");
    }
  }

  return Object.freeze(scopes);
};

const assertGranularWabaScope = (value: unknown, wabaId: string): void => {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value) || value.length > MAXIMUM_SCOPES) {
    throw new MetaGraphGatewayError("dependency");
  }

  for (const item of value) {
    if (!isRecord(item)) {
      throw new MetaGraphGatewayError("dependency");
    }
    const scope = readText(item.scope, 160);
    if (scope !== "whatsapp_business_management") {
      continue;
    }
    if (!Array.isArray(item.target_ids) || item.target_ids.length > 10_000) {
      throw new MetaGraphGatewayError("dependency");
    }
    const targetIds = item.target_ids.map((targetId) => readText(targetId, 64));
    if (!targetIds.includes(wabaId)) {
      throw new MetaGraphGatewayError("unauthorized");
    }
  }
};

export function createMetaGraphGateway(input: CreateMetaGraphGatewayInput): MetaGraphGateway {
  const baseUrl = new URL(input.baseUrl);
  baseUrl.search = "";
  baseUrl.hash = "";

  const execute = async (
    url: URL,
    accessToken: SensitiveValue,
    stage: MetaGraphGatewayStage,
    request: RequestInit = {},
  ): Promise<unknown> => {
    let response: Response;
    try {
      const headers = new Headers(request.headers);
      headers.set("accept", "application/json");
      headers.set("authorization", `Bearer ${accessToken.reveal()}`);
      response = await fetch(url, {
        ...request,
        cache: "no-store",
        redirect: "error",
        headers,
        signal: AbortSignal.timeout(input.timeoutMilliseconds),
      });
    } catch (error) {
      const kind =
        error instanceof Error && error.name === "TimeoutError" ? "timeout" : "dependency";
      throw new MetaGraphGatewayError(kind, error, {
        stage,
        checkpoint: "provider_request",
      });
    }

    let responseValue: unknown;
    try {
      responseValue = await decodeJsonResponse(response);
    } catch (error) {
      const kind = error instanceof MetaGraphGatewayError ? error.kind : "dependency";
      const cause = error instanceof MetaGraphGatewayError ? error.cause : error;
      throw new MetaGraphGatewayError(kind, cause, {
        stage,
        checkpoint: "provider_response",
        providerStatus: response.status,
      });
    }

    if (!response.ok) {
      const providerErrorCode = readMetaErrorCode(responseValue);
      throw new MetaGraphGatewayError(
        failureKindForResponse(response.status, responseValue),
        undefined,
        {
          stage,
          checkpoint: "provider_response",
          providerStatus: response.status,
          ...(providerErrorCode === undefined ? {} : { providerErrorCode }),
        },
      );
    }

    return responseValue;
  };

  const createVersionedUrl = (apiVersion: string, path: string): URL => {
    if (!isGraphApiVersion(apiVersion)) {
      throw new MetaGraphGatewayError("invalid");
    }
    const url = new URL(baseUrl);
    url.pathname = `/${apiVersion}/${path}`;
    return url;
  };

  return Object.freeze({
    async validateAndSubscribeWhatsAppConnection(inputValue) {
      if (
        !isAsciiDecimalIdentifier(inputValue.wabaId) ||
        !isAsciiDecimalIdentifier(inputValue.phoneNumberId)
      ) {
        throw new MetaGraphGatewayError("invalid");
      }

      let stage: MetaGraphGatewayStage = "token_debug";
      let checkpoint: MetaGraphGatewayCheckpoint = "token_response";

      try {
        const debugUrl = createVersionedUrl(inputValue.apiVersion, "debug_token");
        debugUrl.searchParams.set("input_token", inputValue.accessToken.reveal());
        const debugValue = await execute(debugUrl, inputValue.accessToken, stage);
        if (!isRecord(debugValue) || !isRecord(debugValue.data)) {
          throw new MetaGraphGatewayError("dependency");
        }

        const tokenData = debugValue.data;
        checkpoint = "token_identity";
        if (tokenData.is_valid !== true) {
          throw new MetaGraphGatewayError("unauthorized");
        }
        if (readText(tokenData.app_id, 255) !== inputValue.expectedAppId) {
          throw new MetaGraphGatewayError("unauthorized");
        }

        checkpoint = "token_permissions";
        const grantedScopes = readScopes(tokenData.scopes);
        checkpoint = "token_asset_grants";
        assertGranularWabaScope(tokenData.granular_scopes, inputValue.wabaId);
        checkpoint = "token_metadata";
        const tokenType = readText(tokenData.type, 64);
        const tokenExpiresAt = unixTimestampToIso(tokenData.expires_at);
        const dataAccessExpiresAt = unixTimestampToIso(tokenData.data_access_expires_at);
        const now = Date.now();
        if (
          (tokenExpiresAt !== undefined && Date.parse(tokenExpiresAt) <= now) ||
          (dataAccessExpiresAt !== undefined && Date.parse(dataAccessExpiresAt) <= now)
        ) {
          throw new MetaGraphGatewayError("unauthorized");
        }

        stage = "phone_lookup";
        checkpoint = "phone_response";
        let phone:
          | Readonly<{
              displayPhoneNumber: string;
              verifiedName: string;
              qualityRating?: string;
              nameStatus?: string;
            }>
          | undefined;
        let after: string | undefined;
        const seenCursors = new Set<string>();

        for (let page = 0; page < MAXIMUM_PHONE_PAGES; page += 1) {
          const phoneUrl = createVersionedUrl(
            inputValue.apiVersion,
            `${inputValue.wabaId}/phone_numbers`,
          );
          phoneUrl.searchParams.set(
            "fields",
            "id,display_phone_number,verified_name,quality_rating,name_status",
          );
          phoneUrl.searchParams.set("limit", String(PHONE_PAGE_SIZE));
          if (after !== undefined) {
            phoneUrl.searchParams.set("after", after);
          }

          const phonePage = await execute(phoneUrl, inputValue.accessToken, stage);
          if (!isRecord(phonePage) || !Array.isArray(phonePage.data)) {
            throw new MetaGraphGatewayError("dependency");
          }
          if (phonePage.data.length > PHONE_PAGE_SIZE) {
            throw new MetaGraphGatewayError("dependency");
          }

          for (const candidate of phonePage.data) {
            if (!isRecord(candidate)) {
              throw new MetaGraphGatewayError("dependency");
            }
            if (readText(candidate.id, 64) !== inputValue.phoneNumberId) {
              continue;
            }
            const qualityRating = readOptionalText(candidate.quality_rating, 64);
            const nameStatus = readOptionalText(candidate.name_status, 64);
            phone = Object.freeze({
              displayPhoneNumber: readText(candidate.display_phone_number, 64),
              verifiedName: readText(candidate.verified_name, 160),
              ...(qualityRating === undefined ? {} : { qualityRating }),
              ...(nameStatus === undefined ? {} : { nameStatus }),
            });
            break;
          }

          if (phone !== undefined) {
            break;
          }

          const paging = phonePage.paging;
          checkpoint = "phone_pagination";
          if (
            !isRecord(paging) ||
            !isRecord(paging.cursors) ||
            paging.cursors.after === undefined
          ) {
            throw new MetaGraphGatewayError("invalid");
          }
          after = readText(paging.cursors.after, 4_096);
          if (seenCursors.has(after)) {
            throw new MetaGraphGatewayError("dependency");
          }
          seenCursors.add(after);
          checkpoint = "phone_response";
        }

        if (phone === undefined) {
          checkpoint = "phone_identity";
          throw new MetaGraphGatewayError("dependency");
        }

        stage = "waba_subscription";
        checkpoint = "subscription_response";
        const subscriptionUrl = createVersionedUrl(
          inputValue.apiVersion,
          `${inputValue.wabaId}/subscribed_apps`,
        );
        const subscriptionValue = await execute(subscriptionUrl, inputValue.accessToken, stage, {
          method: "POST",
        });
        if (!isRecord(subscriptionValue) || subscriptionValue.success !== true) {
          throw new MetaGraphGatewayError("dependency");
        }

        return Object.freeze({
          ...phone,
          tokenType,
          grantedScopes,
          ...(tokenExpiresAt === undefined ? {} : { tokenExpiresAt }),
          ...(dataAccessExpiresAt === undefined ? {} : { dataAccessExpiresAt }),
        });
      } catch (error) {
        if (error instanceof MetaGraphGatewayError && error.stage === undefined) {
          throw new MetaGraphGatewayError(error.kind, error.cause, {
            stage,
            checkpoint,
          });
        }
        throw error;
      }
    },
  });
}
