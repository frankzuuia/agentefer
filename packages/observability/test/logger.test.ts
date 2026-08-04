import { Writable } from "node:stream";

import { describe, expect, it } from "vitest";

import { createCorrelationScope, runWithCorrelation } from "../src/correlation.js";
import { OperationalError } from "../src/errors.js";
import { createStructuredLogger } from "../src/logger.js";
import { LOG_REDACTION_MARKER } from "../src/redaction.js";

class JsonLineDestination extends Writable {
  public readonly lines: string[] = [];

  public override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.lines.push(chunk.toString("utf8"));
    callback();
  }
}

describe("structured logger", () => {
  it("emits correlated Pino JSON without secret error content", () => {
    const destination = new JsonLineDestination();
    const logger = createStructuredLogger({
      component: "worker",
      environment: "test",
      destination,
    });
    const scope = createCorrelationScope({
      requestId: "req-logger-001",
      organizationId: "org-001",
      conversationId: "conversation-001",
      jobId: "job-001",
      agentRunId: "run-001",
    });
    const providerSecret = ["Bearer", "provider-secret-1234567890"].join(" ");
    const customerPhone = "+52 664 123 4567";
    const error = new OperationalError({
      code: "PROVIDER_TEMPORARILY_UNAVAILABLE",
      category: "dependency",
      retryable: true,
      severity: "error",
      cause: new Error(`${providerSecret} ${customerPhone}`),
    });

    runWithCorrelation(scope, () => {
      logger.error("provider.request.failed", error, {
        attempt: 2,
        authorization: providerSecret,
        customer_phone: customerPhone,
        raw_body: "private provider response",
      });
    });

    expect(destination.lines).toHaveLength(1);
    const serialized = destination.lines[0] ?? "";
    const record = JSON.parse(serialized) as Record<string, unknown>;

    expect(record.component).toBe("worker");
    expect(record.environment).toBe("test");
    expect(record.request_id).toBe("req-logger-001");
    expect(record.trace_id).toBe(scope.identifiers.traceId);
    expect(record.organization_id).toBe("org-001");
    expect(record.conversation_id).toBe("conversation-001");
    expect(record.job_id).toBe("job-001");
    expect(record.agent_run_id).toBe("run-001");
    expect(record.event).toBe("provider.request.failed");
    expect(record.outcome).toBe("failed");
    expect(record.error_code).toBe("PROVIDER_TEMPORARILY_UNAVAILABLE");
    expect(record.error_category).toBe("dependency");
    expect(record.error_retryable).toBe(true);
    expect(record.attributes).toEqual({
      attempt: 2,
      authorization: LOG_REDACTION_MARKER,
      customer_phone: LOG_REDACTION_MARKER,
      raw_body: LOG_REDACTION_MARKER,
    });
    expect(serialized).not.toContain("provider-secret");
    expect(serialized).not.toContain(customerPhone);
    expect(serialized).not.toContain("private provider response");
    expect(serialized).not.toContain("Error:");
  });

  it("rejects free-form event names before writing", () => {
    const destination = new JsonLineDestination();
    const logger = createStructuredLogger({ component: "api", destination });

    expect(() => {
      logger.info("customer said hello world");
    }).toThrow(TypeError);
    expect(destination.lines).toHaveLength(0);
  });

  it("rejects invalid runtime error taxonomy values", () => {
    expect(
      () =>
        new OperationalError({
          code: "INVALID_RUNTIME_CATEGORY",
          category: "arbitrary" as "internal",
          retryable: false,
          severity: "error",
        }),
    ).toThrow(TypeError);
    expect(
      () =>
        new OperationalError({
          code: "INVALID_RUNTIME_SEVERITY",
          category: "internal",
          retryable: false,
          severity: "verbose" as "error",
        }),
    ).toThrow(TypeError);
  });
});
