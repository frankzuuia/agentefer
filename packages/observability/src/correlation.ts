import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes, randomUUID } from "node:crypto";

import {
  ROOT_CONTEXT,
  TraceFlags,
  context,
  isSpanContextValid,
  trace,
  type Context,
  type SpanContext,
  type TextMapGetter,
  type TextMapSetter,
} from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";

import { OperationalError } from "./errors.js";
import { assertSafeIdentifier } from "./identifier.js";

const REQUEST_ID_FIELD = "x-agentefer-request-id";
const ORGANIZATION_ID_FIELD = "x-agentefer-organization-id";
const CONVERSATION_ID_FIELD = "x-agentefer-conversation-id";
const JOB_ID_FIELD = "x-agentefer-job-id";
const AGENT_RUN_ID_FIELD = "x-agentefer-agent-run-id";

const propagator = new W3CTraceContextPropagator();
const storage = new AsyncLocalStorage<CorrelationScope>();

export type CorrelationIdentifiers = Readonly<{
  requestId: string;
  traceId: string;
  organizationId?: string;
  conversationId?: string;
  jobId?: string;
  agentRunId?: string;
}>;

export type CorrelationScope = Readonly<{
  identifiers: CorrelationIdentifiers;
  telemetryContext: Context;
}>;

export type CreateCorrelationScopeInput = Readonly<{
  requestId?: string | undefined;
  organizationId?: string | undefined;
  conversationId?: string | undefined;
  jobId?: string | undefined;
  agentRunId?: string | undefined;
  telemetryContext?: Context | undefined;
}>;

export type CorrelationCarrier = Record<string, string>;

const carrierSetter: TextMapSetter<CorrelationCarrier> = {
  set(carrier, key, value) {
    carrier[key] = value;
  },
};

const carrierGetter: TextMapGetter<Readonly<CorrelationCarrier>> = {
  keys(carrier) {
    return Object.keys(carrier);
  },
  get(carrier, key) {
    return carrier[key];
  },
};

function createSpanContext(): SpanContext {
  return {
    traceId: randomBytes(16).toString("hex"),
    spanId: randomBytes(8).toString("hex"),
    traceFlags: TraceFlags.SAMPLED,
    isRemote: false,
  };
}

function requireCarrierValue(carrier: Readonly<CorrelationCarrier>, fieldName: string): string {
  const value = carrier[fieldName];

  if (value === undefined) {
    throw new OperationalError({
      code: "OBS_CORRELATION_FIELD_MISSING",
      category: "validation",
      retryable: false,
      severity: "warning",
    });
  }

  return assertSafeIdentifier(value, fieldName);
}

function optionalCarrierValue(
  carrier: Readonly<CorrelationCarrier>,
  fieldName: string,
): string | undefined {
  const value = carrier[fieldName];

  return value === undefined ? undefined : assertSafeIdentifier(value, fieldName);
}

function assignOptionalIdentifier(
  identifiers: {
    organizationId?: string;
    conversationId?: string;
    jobId?: string;
    agentRunId?: string;
  },
  key: "organizationId" | "conversationId" | "jobId" | "agentRunId",
  value: string | undefined,
): void {
  if (value !== undefined) {
    identifiers[key] = assertSafeIdentifier(value, key);
  }
}

function setOptionalCarrierValue(
  carrier: CorrelationCarrier,
  fieldName: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    carrier[fieldName] = value;
  }
}

export function createCorrelationScope(input: CreateCorrelationScopeInput = {}): CorrelationScope {
  const candidateContext = input.telemetryContext ?? context.active();
  const candidateSpanContext = trace.getSpanContext(candidateContext);
  const spanContext =
    candidateSpanContext !== undefined && isSpanContextValid(candidateSpanContext)
      ? candidateSpanContext
      : createSpanContext();
  const telemetryContext =
    candidateSpanContext !== undefined && isSpanContextValid(candidateSpanContext)
      ? candidateContext
      : trace.setSpanContext(candidateContext, spanContext);
  const identifiers: {
    requestId: string;
    traceId: string;
    organizationId?: string;
    conversationId?: string;
    jobId?: string;
    agentRunId?: string;
  } = {
    requestId: assertSafeIdentifier(input.requestId ?? randomUUID(), "requestId"),
    traceId: spanContext.traceId,
  };

  assignOptionalIdentifier(identifiers, "organizationId", input.organizationId);
  assignOptionalIdentifier(identifiers, "conversationId", input.conversationId);
  assignOptionalIdentifier(identifiers, "jobId", input.jobId);
  assignOptionalIdentifier(identifiers, "agentRunId", input.agentRunId);

  return Object.freeze({
    identifiers: Object.freeze(identifiers),
    telemetryContext,
  });
}

export function injectCorrelation(
  scope: CorrelationScope,
  initialCarrier: Readonly<CorrelationCarrier> = {},
): CorrelationCarrier {
  const carrier = Object.assign(Object.create(null) as CorrelationCarrier, initialCarrier);
  const identifiers = scope.identifiers;

  propagator.inject(scope.telemetryContext, carrier, carrierSetter);
  carrier[REQUEST_ID_FIELD] = identifiers.requestId;
  setOptionalCarrierValue(carrier, ORGANIZATION_ID_FIELD, identifiers.organizationId);
  setOptionalCarrierValue(carrier, CONVERSATION_ID_FIELD, identifiers.conversationId);
  setOptionalCarrierValue(carrier, JOB_ID_FIELD, identifiers.jobId);
  setOptionalCarrierValue(carrier, AGENT_RUN_ID_FIELD, identifiers.agentRunId);

  return carrier;
}

export function extractCorrelation(carrier: Readonly<CorrelationCarrier>): CorrelationScope {
  const telemetryContext = propagator.extract(ROOT_CONTEXT, carrier, carrierGetter);
  const spanContext = trace.getSpanContext(telemetryContext);

  if (spanContext === undefined || !isSpanContextValid(spanContext)) {
    throw new OperationalError({
      code: "OBS_TRACE_CONTEXT_INVALID",
      category: "validation",
      retryable: false,
      severity: "warning",
    });
  }

  return createCorrelationScope({
    requestId: requireCarrierValue(carrier, REQUEST_ID_FIELD),
    organizationId: optionalCarrierValue(carrier, ORGANIZATION_ID_FIELD),
    conversationId: optionalCarrierValue(carrier, CONVERSATION_ID_FIELD),
    jobId: optionalCarrierValue(carrier, JOB_ID_FIELD),
    agentRunId: optionalCarrierValue(carrier, AGENT_RUN_ID_FIELD),
    telemetryContext,
  });
}

export function runWithCorrelation<Result>(
  scope: CorrelationScope,
  callback: () => Result,
): Result {
  return context.with(scope.telemetryContext, () => storage.run(scope, callback));
}

export function getActiveCorrelation(): CorrelationScope | undefined {
  return storage.getStore();
}

export function correlationLogFields(
  scope: CorrelationScope | undefined = getActiveCorrelation(),
): Readonly<Record<string, string>> {
  if (scope === undefined) {
    return Object.freeze({});
  }

  const fields: Record<string, string> = {
    request_id: scope.identifiers.requestId,
    trace_id: scope.identifiers.traceId,
  };

  setOptionalCarrierValue(fields, "organization_id", scope.identifiers.organizationId);
  setOptionalCarrierValue(fields, "conversation_id", scope.identifiers.conversationId);
  setOptionalCarrierValue(fields, "job_id", scope.identifiers.jobId);
  setOptionalCarrierValue(fields, "agent_run_id", scope.identifiers.agentRunId);

  return Object.freeze(fields);
}
