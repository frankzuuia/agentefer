import { isSafeIdentifier } from "./identifier.js";

export const LOG_REDACTION_MARKER = "[REDACTED]" as const;

const LOG_CIRCULAR_MARKER = "[CIRCULAR]" as const;
const LOG_LIMIT_MARKER = "[LIMIT_REACHED]" as const;
const LOG_UNSUPPORTED_MARKER = "[UNSUPPORTED]" as const;
const MAXIMUM_ARRAY_LENGTH = 25;
const MAXIMUM_DEPTH = 6;
const MAXIMUM_OBJECT_KEYS = 50;
const MAXIMUM_SAFE_STRING_LENGTH = 512;
const MAXIMUM_TOTAL_NODES = 500;

const SENSITIVE_KEY_FRAGMENTS = [
  "accesstoken",
  "apikey",
  "audio",
  "authorization",
  "body",
  "clientname",
  "content",
  "cookie",
  "credential",
  "customername",
  "document",
  "email",
  "firstname",
  "fullname",
  "image",
  "lastname",
  "media",
  "message",
  "mobile",
  "ocr",
  "password",
  "passwd",
  "payload",
  "phone",
  "privatekey",
  "prompt",
  "raw",
  "refreshtoken",
  "secret",
  "session",
  "setcookie",
  "telephone",
  "text",
  "token",
  "transcript",
  "whatsapp",
] as const;

const CREDENTIAL_PREFIXES = [
  "basic ",
  "bearer ",
  "eyj",
  "gho_",
  "ghp_",
  "github_pat_",
  "sk-",
  "sb_secret_",
] as const;

interface SanitizationState {
  readonly seen: WeakSet<object>;
  visitedNodes: number;
}

function normalizeKey(key: string): string {
  let normalized = "";

  for (const character of key.toLowerCase()) {
    const code = character.charCodeAt(0);
    const isDigit = code >= 48 && code <= 57;
    const isLetter = code >= 97 && code <= 122;

    if (isDigit || isLetter) {
      normalized += character;
    }
  }

  return normalized;
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);

  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function isIdentifierKey(key: string): boolean {
  const normalized = normalizeKey(key);

  return normalized === "id" || normalized.endsWith("id");
}

function looksLikePhoneNumber(value: string): boolean {
  const trimmed = value.trim();
  let digitCount = 0;

  for (const character of trimmed) {
    const code = character.charCodeAt(0);
    const isDigit = code >= 48 && code <= 57;
    const isSeparator =
      character === "+" ||
      character === " " ||
      character === "-" ||
      character === "." ||
      character === "(" ||
      character === ")";

    if (!isDigit && !isSeparator) {
      return false;
    }

    digitCount += Number(isDigit);
  }

  return digitCount >= 7 && digitCount <= 15;
}

function looksLikeEmailAddress(value: string): boolean {
  const atIndex = value.indexOf("@");

  return (
    atIndex > 0 &&
    atIndex === value.lastIndexOf("@") &&
    atIndex < value.length - 1 &&
    !value.includes(" ")
  );
}

function looksLikeOpaqueSecret(value: string): boolean {
  if (value.length < 24 || value.includes(" ")) {
    return false;
  }

  let hasLowercase = false;
  let hasUppercase = false;
  let hasDigit = false;
  let hasSymbol = false;

  for (const character of value) {
    const code = character.charCodeAt(0);
    hasDigit ||= code >= 48 && code <= 57;
    hasUppercase ||= code >= 65 && code <= 90;
    hasLowercase ||= code >= 97 && code <= 122;
    hasSymbol ||= !(
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122)
    );
  }

  return Number(hasLowercase) + Number(hasUppercase) + Number(hasDigit) + Number(hasSymbol) >= 3;
}

function isCredentialValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();

  return CREDENTIAL_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

function sanitizeString(value: string, key: string | undefined): string {
  if (key !== undefined && isSensitiveKey(key)) {
    return LOG_REDACTION_MARKER;
  }

  if (key !== undefined && isIdentifierKey(key) && isSafeIdentifier(value)) {
    return value;
  }

  if (
    value.length > MAXIMUM_SAFE_STRING_LENGTH ||
    looksLikePhoneNumber(value) ||
    looksLikeEmailAddress(value) ||
    looksLikeOpaqueSecret(value) ||
    isCredentialValue(value)
  ) {
    return LOG_REDACTION_MARKER;
  }

  return value;
}

function sanitizePropertyKey(key: string, index: number): string {
  if (isCredentialValue(key) || looksLikeEmailAddress(key) || looksLikePhoneNumber(key)) {
    return `redacted_field_${String(index)}`;
  }

  return key.length <= 128 ? key : `oversized_field_${String(index)}`;
}

function sanitizeObject(
  value: object,
  depth: number,
  state: SanitizationState,
): Record<string, unknown> | string {
  if (state.seen.has(value)) {
    return LOG_CIRCULAR_MARKER;
  }

  if (depth >= MAXIMUM_DEPTH || state.visitedNodes >= MAXIMUM_TOTAL_NODES) {
    return LOG_LIMIT_MARKER;
  }

  if (value instanceof Error) {
    return {
      error_type: isSafeIdentifier(value.name, 64) ? value.name : "Error",
      message: LOG_REDACTION_MARKER,
      stack: LOG_REDACTION_MARKER,
    };
  }

  if (value instanceof Date) {
    return { date: value.toISOString() };
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return LOG_REDACTION_MARKER;
  }

  state.seen.add(value);
  const sanitized: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
  const descriptors = Object.entries(Object.getOwnPropertyDescriptors(value)).slice(
    0,
    MAXIMUM_OBJECT_KEYS,
  );

  descriptors.forEach(([unsafeKey, descriptor], index) => {
    const key = sanitizePropertyKey(unsafeKey, index);
    sanitized[key] =
      "value" in descriptor
        ? sanitizeValue(descriptor.value, key, depth + 1, state)
        : LOG_UNSUPPORTED_MARKER;
  });

  state.seen.delete(value);
  return sanitized;
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  depth: number,
  state: SanitizationState,
): unknown {
  state.visitedNodes += 1;

  if (state.visitedNodes > MAXIMUM_TOTAL_NODES) {
    return LOG_LIMIT_MARKER;
  }

  if (key !== undefined && isSensitiveKey(key)) {
    return LOG_REDACTION_MARKER;
  }

  if (typeof value === "string") {
    return sanitizeString(value, key);
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : LOG_UNSUPPORTED_MARKER;
  }

  if (typeof value === "boolean" || value === null) {
    return value;
  }

  if (typeof value === "bigint") {
    return sanitizeString(value.toString(), key);
  }

  if (Array.isArray(value)) {
    if (depth >= MAXIMUM_DEPTH) {
      return LOG_LIMIT_MARKER;
    }

    return value
      .slice(0, MAXIMUM_ARRAY_LENGTH)
      .map((item) => sanitizeValue(item, key, depth + 1, state));
  }

  if (typeof value === "object") {
    return sanitizeObject(value, depth, state);
  }

  return value === undefined ? undefined : LOG_UNSUPPORTED_MARKER;
}

export function sanitizeForLog(value: unknown): unknown {
  return sanitizeValue(value, undefined, 0, {
    seen: new WeakSet(),
    visitedNodes: 0,
  });
}

export function sanitizeLogAttributes(
  attributes: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  const sanitized = sanitizeForLog(attributes);

  return typeof sanitized === "object" && sanitized !== null
    ? (sanitized as Readonly<Record<string, unknown>>)
    : Object.freeze({ sanitization: LOG_LIMIT_MARKER });
}
