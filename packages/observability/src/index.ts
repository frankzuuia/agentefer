export {
  correlationLogFields,
  createCorrelationScope,
  extractCorrelation,
  getActiveCorrelation,
  injectCorrelation,
  runWithCorrelation,
  type CorrelationCarrier,
  type CorrelationIdentifiers,
  type CorrelationScope,
  type CreateCorrelationScopeInput,
} from "./correlation.js";
export {
  ERROR_CATEGORIES,
  ERROR_SEVERITIES,
  OperationalError,
  toSafeErrorRecord,
  type ErrorCategory,
  type ErrorSeverity,
  type OperationalErrorOptions,
  type SafeErrorRecord,
} from "./errors.js";
export { assertSafeIdentifier, isSafeIdentifier } from "./identifier.js";
export {
  LOG_OUTCOMES,
  createStructuredLogger,
  type CreateStructuredLoggerInput,
  type LogAttributes,
  type LogOutcome,
  type StructuredLogger,
} from "./logger.js";
export {
  METRIC_OUTCOMES,
  createOperationalMetrics,
  type CompletedOperation,
  type CreateOperationalMetricsInput,
  type MetricOutcome,
  type OperationalMetrics,
} from "./metrics.js";
export { LOG_REDACTION_MARKER, sanitizeForLog, sanitizeLogAttributes } from "./redaction.js";
export { createReadinessState, type ReadinessState } from "./readiness.js";
