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
});
