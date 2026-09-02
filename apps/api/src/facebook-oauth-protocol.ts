import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

export type FacebookOAuthStartBody = Readonly<{
  organizationId: string;
}>;

export type FacebookOAuthExchangeBody = Readonly<{
  state: string;
  code: string;
}>;

export type FacebookOAuthCompleteBody = Readonly<{
  oauthSessionId: string;
  pageId: string;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOnlyKeys = (
  value: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
): boolean => Object.keys(value).every((key) => allowedKeys.includes(key));

const readBoundedText = (
  value: Readonly<Record<string, unknown>>,
  field: string,
  minimumLength: number,
  maximumLength: number,
): string | undefined => {
  const candidate = value[field];
  if (typeof candidate !== "string" || candidate !== candidate.trim()) {
    return undefined;
  }
  if (candidate.length < minimumLength || candidate.length > maximumLength) {
    return undefined;
  }
  for (const character of candidate) {
    const codePoint = character.charCodeAt(0);
    if (codePoint < 32 || codePoint === 127) {
      return undefined;
    }
  }
  return candidate;
};

const readAsciiDecimalIdentifier = (
  value: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const candidate = readBoundedText(value, field, 1, 64);
  if (candidate === undefined) {
    return undefined;
  }
  for (const character of candidate) {
    if (character < "0" || character > "9") {
      return undefined;
    }
  }
  return candidate;
};

export const parseFacebookOAuthStartBody = (value: unknown): FacebookOAuthStartBody | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["organizationId"])) {
    return undefined;
  }
  const organizationId = parseMetaEndpointKey(value.organizationId);
  return organizationId === undefined ? undefined : Object.freeze({ organizationId });
};

export const parseFacebookOAuthExchangeBody = (
  value: unknown,
): FacebookOAuthExchangeBody | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["state", "code"])) {
    return undefined;
  }
  const state = readBoundedText(value, "state", 32, 128);
  const code = readBoundedText(value, "code", 8, 4_096);
  return state === undefined || code === undefined ? undefined : Object.freeze({ state, code });
};

export const parseFacebookOAuthCompleteBody = (
  value: unknown,
): FacebookOAuthCompleteBody | undefined => {
  if (!isRecord(value) || !hasOnlyKeys(value, ["oauthSessionId", "pageId"])) {
    return undefined;
  }
  const oauthSessionId = parseMetaEndpointKey(value.oauthSessionId);
  const pageId = readAsciiDecimalIdentifier(value, "pageId");
  return oauthSessionId === undefined || pageId === undefined
    ? undefined
    : Object.freeze({ oauthSessionId, pageId });
};
