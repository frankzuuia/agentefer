import { SensitiveValue } from "@agentefer/config";

import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const MINIMUM_SECRET_LENGTH = 16;
const MAXIMUM_SECRET_LENGTH = 65_536;
const MAXIMUM_ACCESS_TOKEN_LENGTH = 16_384;

export type AdminMetaRegistrationInput = Readonly<{
  organizationId: string;
  externalAppId: string;
  displayName: string;
  apiVersion: string;
  appSecret: SensitiveValue;
  webhookVerifyToken: SensitiveValue;
}>;

export type AdminOrganizationQuery = Readonly<{
  organizationId: string;
}>;

export type AdminMetaWhatsAppRegistrationInput = Readonly<{
  organizationId: string;
  metaApplicationId: string;
  wabaId: string;
  phoneNumberId: string;
  accessToken: SensitiveValue;
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

const readBoundedText = (
  source: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
  minimumLength = 1,
): string | undefined => {
  const value = source[field];
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  if (
    normalized.length < minimumLength ||
    normalized.length > maximumLength ||
    hasControlCharacter(normalized)
  ) {
    return undefined;
  }

  return normalized;
};

const readSecret = (
  source: Readonly<Record<string, unknown>>,
  field: string,
): SensitiveValue | undefined => {
  const value = source[field];
  if (
    typeof value !== "string" ||
    value.length < MINIMUM_SECRET_LENGTH ||
    value.length > MAXIMUM_SECRET_LENGTH
  ) {
    return undefined;
  }

  return new SensitiveValue(value);
};

const readMetaNumericIdentifier = (
  source: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = readBoundedText(source, field, 64);
  if (value === undefined) {
    return undefined;
  }
  for (const character of value) {
    if (character < "0" || character > "9") {
      return undefined;
    }
  }
  return value;
};

const readGraphApiVersion = (
  source: Readonly<Record<string, unknown>>,
  field: string,
): string | undefined => {
  const value = readBoundedText(source, field, 32, 4);
  if (!value?.startsWith("v")) {
    return undefined;
  }

  let decimalPointSeen = false;
  let digitBeforeDecimal = false;
  let digitAfterDecimal = false;
  for (const character of value.slice(1)) {
    if (character === ".") {
      if (decimalPointSeen || !digitBeforeDecimal) {
        return undefined;
      }
      decimalPointSeen = true;
      continue;
    }
    if (character < "0" || character > "9") {
      return undefined;
    }
    if (decimalPointSeen) {
      digitAfterDecimal = true;
    } else {
      digitBeforeDecimal = true;
    }
  }

  return decimalPointSeen && digitAfterDecimal ? value : undefined;
};

export const parseBearerAccessToken = (authorization: unknown): SensitiveValue | undefined => {
  if (typeof authorization !== "string" || !authorization.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.slice("Bearer ".length);
  if (
    token.length < 1 ||
    token.length > MAXIMUM_ACCESS_TOKEN_LENGTH ||
    hasControlCharacter(token)
  ) {
    return undefined;
  }

  for (const character of token) {
    if (character === " ") {
      return undefined;
    }
  }

  return new SensitiveValue(token);
};

export const parseAdminMetaRegistrationBody = (
  value: unknown,
): AdminMetaRegistrationInput | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  if (Object.keys(value).length !== 6) {
    return undefined;
  }

  const organizationId = parseMetaEndpointKey(value.organizationId);
  const externalAppId = readMetaNumericIdentifier(value, "externalAppId");
  const displayName = readBoundedText(value, "displayName", 160);
  const apiVersion = readGraphApiVersion(value, "apiVersion");
  const appSecret = readSecret(value, "appSecret");
  const webhookVerifyToken = readSecret(value, "webhookVerifyToken");

  if (
    organizationId === undefined ||
    externalAppId === undefined ||
    displayName === undefined ||
    apiVersion === undefined ||
    appSecret === undefined ||
    webhookVerifyToken === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    organizationId,
    externalAppId,
    displayName,
    apiVersion,
    appSecret,
    webhookVerifyToken,
  });
};

export const parseAdminOrganizationQuery = (value: unknown): AdminOrganizationQuery | undefined => {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    return undefined;
  }

  const organizationId = parseMetaEndpointKey(value.organizationId);
  return organizationId === undefined ? undefined : Object.freeze({ organizationId });
};

export const parseAdminMetaWhatsAppRegistrationBody = (
  value: unknown,
): AdminMetaWhatsAppRegistrationInput | undefined => {
  if (!isRecord(value) || Object.keys(value).length !== 5) {
    return undefined;
  }

  const organizationId = parseMetaEndpointKey(value.organizationId);
  const metaApplicationId = parseMetaEndpointKey(value.metaApplicationId);
  const wabaId = readMetaNumericIdentifier(value, "wabaId");
  const phoneNumberId = readMetaNumericIdentifier(value, "phoneNumberId");
  const accessToken = readSecret(value, "accessToken");

  if (
    organizationId === undefined ||
    metaApplicationId === undefined ||
    wabaId === undefined ||
    phoneNumberId === undefined ||
    accessToken === undefined
  ) {
    return undefined;
  }

  return Object.freeze({
    organizationId,
    metaApplicationId,
    wabaId,
    phoneNumberId,
    accessToken,
  });
};
