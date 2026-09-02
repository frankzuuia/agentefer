import { SensitiveValue, type SensitiveValue as SensitiveValueType } from "@agentefer/config";

import { AdminMetaGatewayError } from "./admin-meta-gateway.js";
import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const MAXIMUM_RESPONSE_BYTES = 65_536;

export type FacebookPageCandidate = Readonly<{
  id: string;
  name: string;
  tasks: readonly string[];
}>;

export type FacebookOAuthBeginResult = Readonly<{
  oauthSessionId: string;
  externalAppId: string;
  apiVersion: string;
}>;

export type FacebookOAuthExchangeLease = Readonly<{
  oauthSessionId: string;
  organizationId: string;
  externalAppId: string;
  apiVersion: string;
  redirectUri: string;
  appSecret: SensitiveValueType;
  exchangeLeaseToken: string;
}>;

export type FacebookOAuthCompleteResult = Readonly<{
  socialConnectionId: string;
  pageName: string;
}>;

export type FacebookOAuthRpc = Readonly<{
  begin(input: {
    organizationId: string;
    actorUserId: string;
    state: string;
    redirectUri: string;
  }): Promise<FacebookOAuthBeginResult>;
  claimExchange(input: { state: string; actorUserId: string }): Promise<FacebookOAuthExchangeLease>;
  stagePages(input: {
    oauthSessionId: string;
    actorUserId: string;
    exchangeLeaseToken: string;
    candidates: readonly FacebookPageCandidate[];
    tokenBundle: SensitiveValueType;
  }): Promise<void>;
  failExchange(input: {
    oauthSessionId: string;
    actorUserId: string;
    exchangeLeaseToken: string;
  }): Promise<void>;
  complete(input: {
    oauthSessionId: string;
    actorUserId: string;
    pageId: string;
  }): Promise<FacebookOAuthCompleteResult>;
}>;

export type CreateFacebookOAuthRpcInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValueType;
  timeoutMilliseconds: number;
}>;

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

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw new AdminMetaGatewayError("dependency");
  }
  return value[0];
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
  if (bytes.byteLength === 0) {
    return null;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new AdminMetaGatewayError("dependency", error);
  }
};

const failureKindForStatus = (status: number) => {
  if (status === 401) return "unauthenticated" as const;
  if (status === 403) return "unauthorized" as const;
  if (status === 400 || status === 404 || status === 413 || status === 422) {
    return "invalid" as const;
  }
  if (status === 409) return "conflict" as const;
  return "dependency" as const;
};

export function createFacebookOAuthRpc(input: CreateFacebookOAuthRpcInput): FacebookOAuthRpc {
  const baseUrl = new URL(input.supabaseUrl);
  baseUrl.search = "";
  baseUrl.hash = "";

  const execute = async (functionName: string, body: Readonly<Record<string, unknown>>) => {
    const url = new URL(baseUrl);
    url.pathname = `/rest/v1/rpc/${functionName}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "accept-profile": "api",
          "content-profile": "api",
          apikey: input.secretKey.reveal(),
          authorization: `Bearer ${input.secretKey.reveal()}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(input.timeoutMilliseconds),
      });
    } catch (error) {
      const kind =
        error instanceof Error && error.name === "TimeoutError" ? "timeout" : "dependency";
      throw new AdminMetaGatewayError(kind, error);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new AdminMetaGatewayError(failureKindForStatus(response.status));
    }
    return decodeJsonResponse(response);
  };

  return Object.freeze({
    async begin(beginInput) {
      const row = readSingleRow(
        await execute("begin_facebook_page_oauth", {
          target_organization_id: beginInput.organizationId,
          target_actor_user_id: beginInput.actorUserId,
          target_state: beginInput.state,
          target_redirect_uri: beginInput.redirectUri,
        }),
      );
      return Object.freeze({
        oauthSessionId: readUuid(row, "oauth_session_id"),
        externalAppId: readText(row, "external_app_id", 255),
        apiVersion: readText(row, "api_version", 16),
      });
    },
    async claimExchange(claimInput) {
      const row = readSingleRow(
        await execute("claim_facebook_page_oauth_exchange", {
          target_state: claimInput.state,
          target_actor_user_id: claimInput.actorUserId,
        }),
      );
      return Object.freeze({
        oauthSessionId: readUuid(row, "oauth_session_id"),
        organizationId: readUuid(row, "organization_id"),
        externalAppId: readText(row, "external_app_id", 255),
        apiVersion: readText(row, "api_version", 16),
        redirectUri: readText(row, "redirect_uri", 2_048),
        appSecret: new SensitiveValue(readText(row, "app_secret", 65_536)),
        exchangeLeaseToken: readUuid(row, "exchange_lease_token"),
      });
    },
    async stagePages(stageInput) {
      await execute("stage_facebook_page_oauth_pages", {
        target_oauth_session_id: stageInput.oauthSessionId,
        target_actor_user_id: stageInput.actorUserId,
        target_exchange_lease_token: stageInput.exchangeLeaseToken,
        target_page_candidates: stageInput.candidates,
        target_token_bundle: stageInput.tokenBundle.reveal(),
      });
    },
    async failExchange(failInput) {
      await execute("fail_facebook_page_oauth", {
        target_oauth_session_id: failInput.oauthSessionId,
        target_actor_user_id: failInput.actorUserId,
        target_exchange_lease_token: failInput.exchangeLeaseToken,
      });
    },
    async complete(completeInput) {
      const row = readSingleRow(
        await execute("complete_facebook_page_oauth", {
          target_oauth_session_id: completeInput.oauthSessionId,
          target_actor_user_id: completeInput.actorUserId,
          target_page_id: completeInput.pageId,
        }),
      );
      return Object.freeze({
        socialConnectionId: readUuid(row, "social_connection_id"),
        pageName: readText(row, "page_name", 160),
      });
    },
  });
}
