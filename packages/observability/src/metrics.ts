import {
  metrics,
  type Attributes,
  type Counter,
  type Histogram,
  type Meter,
} from "@opentelemetry/api";

import { type ErrorCategory } from "./errors.js";
import { assertSafeIdentifier } from "./identifier.js";

export const METRIC_OUTCOMES = ["succeeded", "failed", "cancelled"] as const;

export type MetricOutcome = (typeof METRIC_OUTCOMES)[number];

type CompletedOperationBase = Readonly<{
  operation: string;
  durationMilliseconds: number;
}>;

export type CompletedOperation = CompletedOperationBase &
  (
    | Readonly<{
        outcome: "succeeded" | "cancelled";
        errorCategory?: never;
      }>
    | Readonly<{
        outcome: "failed";
        errorCategory: ErrorCategory;
      }>
  );

export type CreateOperationalMetricsInput = Readonly<{
  component: string;
  version?: string | undefined;
  meter?: Meter | undefined;
}>;

export type OperationalMetrics = Readonly<{
  recordStarted(operation: string): void;
  recordCompleted(operation: CompletedOperation): void;
}>;

function assertDuration(durationMilliseconds: number): number {
  if (!Number.isFinite(durationMilliseconds) || durationMilliseconds < 0) {
    throw new TypeError("durationMilliseconds must be a finite non-negative number");
  }

  return durationMilliseconds;
}

function createBaseAttributes(component: string, operation: string): Attributes {
  return {
    "service.component": component,
    "operation.name": assertSafeIdentifier(operation, "operation", 96),
  };
}

function createInstruments(meter: Meter): Readonly<{
  started: Counter;
  completed: Counter;
  duration: Histogram;
}> {
  return Object.freeze({
    started: meter.createCounter("agentefer.operation.started", {
      description: "Number of operations started by an AgenteFer component.",
      unit: "{operation}",
    }),
    completed: meter.createCounter("agentefer.operation.completed", {
      description: "Number of operations completed by outcome.",
      unit: "{operation}",
    }),
    duration: meter.createHistogram("agentefer.operation.duration", {
      description: "Completed operation duration in milliseconds.",
      unit: "ms",
    }),
  });
}

export function createOperationalMetrics(input: CreateOperationalMetricsInput): OperationalMetrics {
  const component = assertSafeIdentifier(input.component, "component", 64);
  const meterName = `agentefer.${component}`;
  const meter =
    input.meter ??
    metrics.getMeter(
      meterName,
      input.version === undefined ? undefined : assertSafeIdentifier(input.version, "version", 32),
    );
  const instruments = createInstruments(meter);

  return Object.freeze({
    recordStarted(operation) {
      instruments.started.add(1, createBaseAttributes(component, operation));
    },
    recordCompleted(operation) {
      const durationMilliseconds = assertDuration(operation.durationMilliseconds);
      const attributes: Attributes = {
        ...createBaseAttributes(component, operation.operation),
        "operation.outcome": operation.outcome,
      };

      if (operation.outcome === "failed") {
        attributes["error.category"] = operation.errorCategory;
      }

      instruments.completed.add(1, attributes);
      instruments.duration.record(durationMilliseconds, attributes);
    },
  });
}
