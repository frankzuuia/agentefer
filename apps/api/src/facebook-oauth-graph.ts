import { SensitiveValue, type SensitiveValue as SensitiveValueType } from "@agentefer/config";

import { AdminMetaGatewayError } from "./admin-meta-gateway.js";
import { type FacebookPageCandidate } from "./facebook-oauth-rpc.js";

const MAXIMUM_RESPONSE_BYTES = 262_144;
const MAXIMUM_PAGE_COUNT = 100;
const MAXIMUM_PAGE_TASKS = 100;
const REQUIRED_SCOPES = Object.freeze([
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
]);
const CONTENT_TASKS = Object.freeze([
  "PROFILE_PLUS_CREATE_CONTENT",
  "PROFILE_PLUS_FULL_CONTROL",
  "PROFILE_PLUS_MANAGE",
]);

export type FacebookOAuthGraphResult = Readonly<{
  candidates: readonly FacebookPageCandidate[];
  tokenBundle: SensitiveValueType;
}>;

export type FacebookOAuthGraph = Readonly<{
  createAuthorizationUrl(input: {
    apiVersion: string;
    externalAppId: string;
    redirectUri: string;
    state: string;
  }): string;
  exchangeCodeAndListPages(input: {
    apiVersion: string;
    externalAppId: string;
    appSecret: SensitiveValueType;
    redirectUri: string;
    code: string;
  }): Promise<FacebookOAuthGraphResult>;
}>;

export type CreateFacebookOAuthGraphInput = Readonly<{
  graphBaseUrl: string;
  dialogBaseUrl: string;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasControlCharacter = (value: string): boolean => {
  for (const character of value) {
    const codePoint = character.charCodeAt(0);
    if (codePoint < 32 || codePoint === 127) return true;
  }
  return false;
};

const readText = (value: unknown, maximumLength: number): string => {
  if (typeof value !== "string") throw new AdminMetaGatewayError("dependency");
  const normalized = value.trim();
  if (
    normalized.length < 1 ||
    normalized.length > maximumLength ||
    hasControlCharacter(normalized)
  ) {
    throw new AdminMetaGatewayError("dependency");
  }
  return normalized;
};

const isGraphApiVersion = (value: string): boolean => {
  if (value.length < 4 || !value.startsWith("v")) return false;
  let decimalPointSeen = false;
  let digitBeforeDecimal = false;
  let digitAfterDecimal = false;
  for (const character of value.slice(1)) {
    if (character === ".") {
      if (decimalPointSeen || !digitBeforeDecimal) return false;
      decimalPointSeen = true;
    } else if (character >= "0" && character <= "9") {
      if (decimalPointSeen) digitAfterDecimal = true;
      else digitBeforeDecimal = true;
    } else {
      return false;
    }
  }
  return decimalPointSeen && digitAfterDecimal;
};

const readAsciiDecimalIdentifier = (value: unknown): string => {
  const identifier = readText(value, 64);
  for (const character of identifier) {
    if (character < "0" || character > "9") throw new AdminMetaGatewayError("dependency");
  }
  return identifier;
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
  if (bytes.byteLength > MAXIMUM_RESPONSE_BYTES) throw new AdminMetaGatewayError("dependency");
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new AdminMetaGatewayError("dependency", error);
  }
};

const failureKindForStatus = (status: number) => {
  if (status === 401 || status === 403) return "unauthorized" as const;
  if (status === 400 || status === 404 || status === 422) return "invalid" as const;
  return "dependency" as const;
};

export function createFacebookOAuthGraph(input: CreateFacebookOAuthGraphInput): FacebookOAuthGraph {
  const graphBaseUrl = new URL(input.graphBaseUrl);
  graphBaseUrl.search = "";
  graphBaseUrl.hash = "";
  const dialogBaseUrl = new URL(input.dialogBaseUrl);
  dialogBaseUrl.search = "";
  dialogBaseUrl.hash = "";

  const createVersionedUrl = (baseUrl: URL, apiVersion: string, path: string): URL => {
    if (!isGraphApiVersion(apiVersion)) throw new AdminMetaGatewayError("invalid");
    const url = new URL(baseUrl);
    url.pathname = `/${apiVersion}/${path}`;
    return url;
  };

  const execute = async (url: URL, request: RequestInit): Promise<unknown> => {
    let response: Response;
    try {
      const headers = new Headers(request.headers);
      headers.set("accept", "application/json");
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
      throw new AdminMetaGatewayError(kind, error);
    }
    const value = await decodeJsonResponse(response);
    if (!response.ok) throw new AdminMetaGatewayError(failureKindForStatus(response.status));
    return value;
  };

  const exchangeToken = async (
    apiVersion: string,
    fields: Readonly<Record<string, string>>,
  ): Promise<SensitiveValueType> => {
    const url = createVersionedUrl(graphBaseUrl, apiVersion, "oauth/access_token");
    const value = await execute(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields).toString(),
    });
    if (!isRecord(value)) throw new AdminMetaGatewayError("dependency");
    return new SensitiveValue(readText(value.access_token, 65_536));
  };

  return Object.freeze({
    createAuthorizationUrl(authorizeInput) {
      const url = createVersionedUrl(dialogBaseUrl, authorizeInput.apiVersion, "dialog/oauth");
      url.searchParams.set("client_id", authorizeInput.externalAppId);
      url.searchParams.set("redirect_uri", authorizeInput.redirectUri);
      url.searchParams.set("state", authorizeInput.state);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", REQUIRED_SCOPES.join(","));
      return url.toString();
    },
    async exchangeCodeAndListPages(exchangeInput) {
      const shortLivedToken = await exchangeToken(exchangeInput.apiVersion, {
        client_id: exchangeInput.externalAppId,
        client_secret: exchangeInput.appSecret.reveal(),
        redirect_uri: exchangeInput.redirectUri,
        code: exchangeInput.code,
      });
      const longLivedToken = await exchangeToken(exchangeInput.apiVersion, {
        grant_type: "fb_exchange_token",
        client_id: exchangeInput.externalAppId,
        client_secret: exchangeInput.appSecret.reveal(),
        fb_exchange_token: shortLivedToken.reveal(),
      });
      const pagesUrl = createVersionedUrl(graphBaseUrl, exchangeInput.apiVersion, "me/accounts");
      pagesUrl.searchParams.set("fields", "id,name,access_token,tasks");
      pagesUrl.searchParams.set("limit", String(MAXIMUM_PAGE_COUNT));
      const pagesValue = await execute(pagesUrl, {
        method: "GET",
        headers: { authorization: `Bearer ${longLivedToken.reveal()}` },
      });
      if (!isRecord(pagesValue) || !Array.isArray(pagesValue.data)) {
        throw new AdminMetaGatewayError("dependency");
      }
      if (pagesValue.data.length > MAXIMUM_PAGE_COUNT) {
        throw new AdminMetaGatewayError("unauthorized");
      }

      const candidates: FacebookPageCandidate[] = [];
      const tokenBundle: { id: string; access_token: string }[] = [];
      const seenIds = new Set<string>();
      for (const pageValue of pagesValue.data) {
        if (!isRecord(pageValue) || !Array.isArray(pageValue.tasks)) {
          throw new AdminMetaGatewayError("dependency");
        }
        if (pageValue.tasks.length > MAXIMUM_PAGE_TASKS) {
          throw new AdminMetaGatewayError("dependency");
        }
        const id = readAsciiDecimalIdentifier(pageValue.id);
        const name = readText(pageValue.name, 160);
        const accessToken = readText(pageValue.access_token, 65_536);
        const tasks = Object.freeze(
          [...new Set(pageValue.tasks.map((task) => readText(task, 160)))].sort(),
        );
        if (seenIds.has(id)) throw new AdminMetaGatewayError("dependency");
        seenIds.add(id);
        if (!CONTENT_TASKS.some((task) => tasks.includes(task))) continue;
        candidates.push(Object.freeze({ id, name, tasks }));
        tokenBundle.push({ id, access_token: accessToken });
      }
      if (candidates.length < 1) throw new AdminMetaGatewayError("unauthorized");
      return Object.freeze({
        candidates: Object.freeze(candidates),
        tokenBundle: new SensitiveValue(JSON.stringify(tokenBundle)),
      });
    },
  });
}
