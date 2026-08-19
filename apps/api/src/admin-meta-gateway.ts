import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const MAXIMUM_RESPONSE_BYTES = 65_536;
const MAXIMUM_ORGANIZATIONS = 100;

export const ADMIN_META_GATEWAY_FAILURE_KINDS = [
  "invalid",
  "unauthenticated",
  "unauthorized",
  "conflict",
  "timeout",
  "dependency",
] as const;

export type AdminMetaGatewayFailureKind = (typeof ADMIN_META_GATEWAY_FAILURE_KINDS)[number];

export class AdminMetaGatewayError extends OperationalError {
  readonly kind: AdminMetaGatewayFailureKind;

  constructor(kind: AdminMetaGatewayFailureKind, cause?: unknown) {
    const attributes =
      kind === "invalid"
        ? {
            code: "ADMIN_META_GATEWAY_INVALID",
            category: "validation" as const,
            retryable: false,
            severity: "warning" as const,
          }
        : kind === "unauthenticated"
          ? {
              code: "ADMIN_META_GATEWAY_UNAUTHENTICATED",
              category: "authentication" as const,
              retryable: false,
              severity: "warning" as const,
            }
          : kind === "unauthorized"
            ? {
                code: "ADMIN_META_GATEWAY_UNAUTHORIZED",
                category: "authorization" as const,
                retryable: false,
                severity: "warning" as const,
              }
            : kind === "conflict"
              ? {
                  code: "ADMIN_META_GATEWAY_CONFLICT",
                  category: "conflict" as const,
                  retryable: false,
                  severity: "warning" as const,
                }
              : kind === "timeout"
                ? {
                    code: "ADMIN_META_GATEWAY_TIMEOUT",
                    category: "timeout" as const,
                    retryable: true,
                    severity: "error" as const,
                  }
                : {
                    code: "ADMIN_META_GATEWAY_DEPENDENCY",
                    category: "dependency" as const,
                    retryable: true,
                    severity: "error" as const,
                  };

    super({ ...attributes, cause });
    this.name = "AdminMetaGatewayError";
    this.kind = kind;
  }
}

export type AdminIdentity = Readonly<{
  userId: string;
}>;

export type AdminOrganization = Readonly<{
  id: string;
  name: string;
  status: "active";
}>;

export type RegisterAdminMetaApplicationInput = Readonly<{
  organizationId: string;
  externalAppId: string;
  displayName: string;
  apiVersion: string;
  appSecret: SensitiveValue;
  webhookVerifyToken: SensitiveValue;
  actorUserId: string;
  requestId: string;
  traceId: string;
}>;

export type RegisteredAdminMetaApplication = Readonly<{
  metaApplicationId: string;
  webhookEndpointId: string;
  endpointKey: string;
}>;

export type AdminMetaGateway = Readonly<{
  authenticate(accessToken: SensitiveValue): Promise<AdminIdentity>;
  listOrganizations(accessToken: SensitiveValue): Promise<readonly AdminOrganization[]>;
  registerMetaApplication(
    input: RegisterAdminMetaApplicationInput,
  ): Promise<RegisteredAdminMetaApplication>;
}>;

export type CreateAdminMetaGatewayInput = Readonly<{
  supabaseUrl: string;
  publishableKey: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

type RequestOperation = "authenticate" | "organizations" | "register";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readUuid = (value: Readonly<Record<string, unknown>>, field: string): string => {
  const candidate = parseMetaEndpointKey(value[field]);
  if (candidate === undefined) {
    throw new AdminMetaGatewayError("dependency");
  }

  return candidate;
};

const readText = (
  value: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string => {
  const candidate = value[field];
  if (typeof candidate !== "string") {
    throw new AdminMetaGatewayError("dependency");
  }

  const normalized = candidate.trim();
  if (normalized.length < 1 || normalized.length > maximumLength) {
    throw new AdminMetaGatewayError("dependency");
  }

  return normalized;
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

const failureKindForResponse = (
  operation: RequestOperation,
  status: number,
): AdminMetaGatewayFailureKind => {
  if (operation === "authenticate" && (status === 400 || status === 401 || status === 403)) {
    return "unauthenticated";
  }

  if (status === 401) {
    return "unauthenticated";
  }

  if (status === 403) {
    return "unauthorized";
  }

  if (operation === "register" && status === 409) {
    return "conflict";
  }

  if (status === 400 || status === 413 || status === 422) {
    return "invalid";
  }

  return "dependency";
};

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw new AdminMetaGatewayError("dependency");
  }

  return value[0];
};

export function createAdminMetaGateway(input: CreateAdminMetaGatewayInput): AdminMetaGateway {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";

  const execute = async (
    operation: RequestOperation,
    url: URL,
    request: RequestInit,
  ): Promise<unknown> => {
    let response: Response;
    try {
      response = await fetch(url, {
        ...request,
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
      throw new AdminMetaGatewayError(failureKindForResponse(operation, response.status));
    }

    return decodeJsonResponse(response);
  };

  return Object.freeze({
    async authenticate(accessToken) {
      const url = new URL(baseUrl);
      url.pathname = "/auth/v1/user";

      const value = await execute("authenticate", url, {
        method: "GET",
        headers: {
          accept: "application/json",
          apikey: input.publishableKey,
          authorization: `Bearer ${accessToken.reveal()}`,
        },
      });

      if (!isRecord(value)) {
        throw new AdminMetaGatewayError("dependency");
      }

      return Object.freeze({ userId: readUuid(value, "id") });
    },

    async listOrganizations(accessToken) {
      const url = new URL(baseUrl);
      url.pathname = "/rest/v1/organizations";
      url.searchParams.set("select", "id,name,status");
      url.searchParams.set("status", "eq.active");
      url.searchParams.set("order", "name.asc");
      url.searchParams.set("limit", String(MAXIMUM_ORGANIZATIONS));

      const value = await execute("organizations", url, {
        method: "GET",
        headers: {
          accept: "application/json",
          "accept-profile": "api",
          apikey: input.publishableKey,
          authorization: `Bearer ${accessToken.reveal()}`,
        },
      });

      if (!Array.isArray(value) || value.length > MAXIMUM_ORGANIZATIONS) {
        throw new AdminMetaGatewayError("dependency");
      }

      return Object.freeze(
        value.map((row) => {
          if (!isRecord(row) || row.status !== "active") {
            throw new AdminMetaGatewayError("dependency");
          }

          return Object.freeze({
            id: readUuid(row, "id"),
            name: readText(row, "name", 160),
            status: "active" as const,
          });
        }),
      );
    },

    async registerMetaApplication(inputValue) {
      const url = new URL(baseUrl);
      url.pathname = "/rest/v1/rpc/register_meta_application";

      const value = await execute("register", url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-profile": "api",
          apikey: input.secretKey.reveal(),
          "content-profile": "api",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          target_organization_id: inputValue.organizationId,
          target_external_app_id: inputValue.externalAppId,
          target_display_name: inputValue.displayName,
          target_api_version: inputValue.apiVersion,
          target_app_secret: inputValue.appSecret.reveal(),
          target_webhook_verify_token: inputValue.webhookVerifyToken.reveal(),
          target_actor_user_id: inputValue.actorUserId,
          target_correlation_id: inputValue.requestId,
          target_trace_id: inputValue.traceId,
        }),
      });

      const row = readSingleRow(value);
      return Object.freeze({
        metaApplicationId: readUuid(row, "meta_application_id"),
        webhookEndpointId: readUuid(row, "webhook_endpoint_id"),
        endpointKey: readUuid(row, "endpoint_key"),
      });
    },
  });
}
