import {
  AggregationTemporality,
  DataPointType,
  InMemoryMetricExporter,
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { describe, expect, it } from "vitest";

import { createOperationalMetrics } from "../src/metrics.js";

describe("operational metrics", () => {
  it("records bounded attributes through the real OpenTelemetry SDK", async () => {
    const exporter = new InMemoryMetricExporter(AggregationTemporality.CUMULATIVE);
    const reader = new PeriodicExportingMetricReader({
      exporter,
      exportIntervalMillis: 60_000,
    });
    const provider = new MeterProvider({ readers: [reader] });
    const operationalMetrics = createOperationalMetrics({
      component: "worker",
      version: "1.0.0",
      meter: provider.getMeter("agentefer-test"),
    });

    try {
      expect(() => {
        operationalMetrics.recordCompleted({
          operation: "catalog.update",
          outcome: "succeeded",
          durationMilliseconds: -1,
        });
      }).toThrow(TypeError);

      operationalMetrics.recordStarted("catalog.update");
      operationalMetrics.recordCompleted({
        operation: "catalog.update",
        outcome: "succeeded",
        durationMilliseconds: 18,
      });
      operationalMetrics.recordCompleted({
        operation: "provider.request",
        outcome: "failed",
        errorCategory: "dependency",
        durationMilliseconds: 42,
      });

      await provider.forceFlush();
      const metricData = exporter
        .getMetrics()
        .flatMap((resource) => resource.scopeMetrics)
        .flatMap((scope) => scope.metrics);
      const metricNames = metricData.map((metric) => metric.descriptor.name);
      const completed = metricData.find(
        (metric) => metric.descriptor.name === "agentefer.operation.completed",
      );

      expect(metricNames).toEqual(
        expect.arrayContaining([
          "agentefer.operation.started",
          "agentefer.operation.completed",
          "agentefer.operation.duration",
        ]),
      );
      expect(completed?.dataPointType).toBe(DataPointType.SUM);

      if (completed?.dataPointType !== DataPointType.SUM) {
        throw new TypeError("completed metric did not use sum aggregation");
      }

      const successPoint = completed.dataPoints.find(
        (point) => point.attributes["operation.outcome"] === "succeeded",
      );
      const failurePoint = completed.dataPoints.find(
        (point) => point.attributes["operation.outcome"] === "failed",
      );

      expect(successPoint?.value).toBe(1);
      expect(successPoint?.attributes).toEqual({
        "service.component": "worker",
        "operation.name": "catalog.update",
        "operation.outcome": "succeeded",
      });
      expect(failurePoint?.value).toBe(1);
      expect(failurePoint?.attributes["error.category"]).toBe("dependency");
      expect(completed.dataPoints.flatMap((point) => Object.keys(point.attributes))).not.toEqual(
        expect.arrayContaining([
          "request_id",
          "trace_id",
          "organization_id",
          "conversation_id",
          "job_id",
          "agent_run_id",
        ]),
      );
    } finally {
      await provider.shutdown();
    }
  });
});
