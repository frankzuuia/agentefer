import { describe, expect, it } from "vitest";

import { LOG_REDACTION_MARKER, sanitizeForLog, sanitizeLogAttributes } from "../src/redaction.js";

describe("central log redaction", () => {
  it("redacts secrets, PII and raw content without mutating the source", () => {
    const authorization = ["Bearer", "secret-provider-token"].join(" ");
    const apiKey = ["sk", "secret-value-1234567890"].join("-");
    const source = {
      request_id: "018f47bb-1537-7b2d-b13c-21f6f8f0031a",
      attempt: 2,
      headers: {
        authorization,
      },
      customer_phone: "+52 (664) 123-4567",
      email: "buyer@example.test",
      prompt: "customer supplied prompt",
      nested: {
        raw_body: "private webhook body",
        api_key: apiKey,
      },
    };

    const sanitized = sanitizeLogAttributes(source);
    const serialized = JSON.stringify(sanitized);

    expect(serialized).toContain(source.request_id);
    expect(serialized).toContain('"attempt":2');
    expect(serialized).not.toContain("secret-provider-token");
    expect(serialized).not.toContain("664");
    expect(serialized).not.toContain("buyer@example.test");
    expect(serialized).not.toContain("customer supplied prompt");
    expect(serialized).not.toContain("private webhook body");
    expect(serialized).not.toContain("sk-secret-value");
    expect(source.headers.authorization).toBe(authorization);
  });

  it("does not execute accessors or serialize binary content", () => {
    let getterExecutions = 0;
    const source = {
      binary: Buffer.from("private-media"),
    } as Record<string, unknown>;

    Object.defineProperty(source, "computed", {
      enumerable: true,
      get() {
        getterExecutions += 1;
        return "private-value";
      },
    });

    const serialized = JSON.stringify(sanitizeForLog(source));

    expect(getterExecutions).toBe(0);
    expect(serialized).not.toContain("private-media");
    expect(serialized).not.toContain("private-value");
  });

  it("redacts sensitive containers regardless of their value type", () => {
    const source = {
      raw_body: {
        neutral_field: "private object content",
      },
      prompt: ["private", "array", "content"],
    };
    const serialized = JSON.stringify(sanitizeForLog(source));

    expect(serialized).not.toContain("private object content");
    expect(serialized).not.toContain("array");
    expect(serialized).toContain(LOG_REDACTION_MARKER);
  });

  it("terminates safely for circular and oversized structures", () => {
    const circular: Record<string, unknown> = { safe_count: 1 };
    circular.self = circular;
    const oversized = Array.from({ length: 40 }, (_, index) => index);

    expect(JSON.stringify(sanitizeForLog(circular))).toContain("[CIRCULAR]");
    expect(sanitizeForLog(oversized)).toHaveLength(25);
  });

  it("redacts phone-like bigint values", () => {
    expect(sanitizeForLog(6_641_234_567n)).toBe(LOG_REDACTION_MARKER);
  });

  it("distinguishes malformed contact-like strings from real PII", () => {
    expect(sanitizeForLog("plain-value")).toBe("plain-value");
    expect(sanitizeForLog("@missing-local")).toBe("@missing-local");
    expect(sanitizeForLog("missing-domain@")).toBe("missing-domain@");
    expect(sanitizeForLog("two@markers@example.test")).toBe("two@markers@example.test");
    expect(sanitizeForLog("space before@example.test")).toBe("space before@example.test");
    expect(sanitizeForLog("buyer@example.test")).toBe(LOG_REDACTION_MARKER);
    expect(sanitizeForLog("123-45")).toBe("123-45");
    expect(sanitizeForLog("123-456-7890")).toBe(LOG_REDACTION_MARKER);
    expect(sanitizeForLog("123-456-invalid")).toBe("123-456-invalid");
  });

  it("redacts opaque credentials only when their entropy shape is suspicious", () => {
    expect(sanitizeForLog("short-A1!")).toBe("short-A1!");
    expect(sanitizeForLog("this value contains spaces A1!")).toBe("this value contains spaces A1!");
    expect(sanitizeForLog("abcdefghijklmnopqrstuvwx")).toBe("abcdefghijklmnopqrstuvwx");
    expect(sanitizeForLog("abcdefghijklmnopQRSTUVWX1")).toBe(LOG_REDACTION_MARKER);
    expect(sanitizeForLog("Bearer provider-secret-value")).toBe(LOG_REDACTION_MARKER);
  });

  it("sanitizes unsafe property names and supported scalar/object variants", () => {
    const unsafeProperties: Record<string, unknown> = {
      "buyer@example.test": "safe",
      "+52 664 123 4567": "safe",
      [["Bearer", "property-secret-value"].join(" ")]: "safe",
      ["x".repeat(129)]: "safe",
      finite: 42,
      infinite: Number.POSITIVE_INFINITY,
      enabled: true,
      empty: null,
      missing: undefined,
      unsupported: Symbol("private"),
      occurred_at: new Date("2026-08-09T00:00:00.000Z"),
      failure: new TypeError("private failure"),
    };

    const sanitized = sanitizeLogAttributes(unsafeProperties);
    const serialized = JSON.stringify(sanitized);

    expect(Object.keys(sanitized)).toContain("redacted_field_0");
    expect(Object.keys(sanitized)).toContain("redacted_field_1");
    expect(Object.keys(sanitized)).toContain("redacted_field_2");
    expect(Object.keys(sanitized)).toContain("oversized_field_3");
    expect(serialized).toContain('"finite":42');
    expect(serialized).toContain("[UNSUPPORTED]");
    expect(serialized).toContain("2026-08-09T00:00:00.000Z");
    expect(serialized).not.toContain("private failure");
  });

  it("limits deeply nested arrays and returns a safe container for non-objects", () => {
    let nested: unknown = "leaf";
    for (let depth = 0; depth < 12; depth += 1) {
      nested = [nested];
    }

    expect(JSON.stringify(sanitizeForLog(nested))).toContain("[LIMIT_REACHED]");
    expect(sanitizeLogAttributes({ value: false })).toEqual({ value: false });
  });
});
