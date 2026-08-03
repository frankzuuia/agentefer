import { setImmediate as waitForTurn } from "node:timers/promises";

import { isSpanContextValid, trace } from "@opentelemetry/api";
import { describe, expect, it } from "vitest";

import {
  createCorrelationScope,
  extractCorrelation,
  getActiveCorrelation,
  injectCorrelation,
  runWithCorrelation,
} from "../src/correlation.js";
import { OperationalError } from "../src/errors.js";

describe("API to worker correlation contract", () => {
  it("propagates W3C trace context and safe business identifiers", () => {
    const apiScope = createCorrelationScope({
      requestId: "request-001",
      organizationId: "organization-001",
      conversationId: "conversation-001",
      jobId: "job-001",
      agentRunId: "agent-run-001",
    });
    const carrier = injectCorrelation(apiScope, { event_version: "1" });
    const workerScope = extractCorrelation(carrier);
    const workerSpanContext = trace.getSpanContext(workerScope.telemetryContext);

    expect(carrier.event_version).toBe("1");
    expect(carrier.traceparent?.split("-")[1]).toBe(apiScope.identifiers.traceId);
    expect(workerScope.identifiers).toEqual(apiScope.identifiers);
    expect(workerSpanContext).toBeDefined();
    expect(workerSpanContext === undefined || isSpanContextValid(workerSpanContext)).toBe(true);
    expect(workerSpanContext?.isRemote).toBe(true);
  });

  it("fails closed when trace context or required correlation is altered", () => {
    const validCarrier = injectCorrelation(createCorrelationScope({ requestId: "request-002" }));
    const missingTrace = { ...validCarrier };
    const missingRequest = { ...validCarrier };
    delete missingTrace.traceparent;
    delete missingRequest["x-agentefer-request-id"];

    expect(() => extractCorrelation(missingTrace)).toThrow(OperationalError);
    expect(() => extractCorrelation(missingRequest)).toThrow(OperationalError);
  });

  it("isolates correlation across concurrent asynchronous work", async () => {
    const first = createCorrelationScope({ requestId: "request-concurrent-a" });
    const second = createCorrelationScope({ requestId: "request-concurrent-b" });

    const [firstResult, secondResult] = await Promise.all([
      runWithCorrelation(first, async () => {
        await waitForTurn();
        return getActiveCorrelation()?.identifiers.requestId;
      }),
      runWithCorrelation(second, async () => {
        await waitForTurn();
        return getActiveCorrelation()?.identifiers.requestId;
      }),
    ]);

    expect(firstResult).toBe("request-concurrent-a");
    expect(secondResult).toBe("request-concurrent-b");
    expect(getActiveCorrelation()).toBeUndefined();
  });
});
