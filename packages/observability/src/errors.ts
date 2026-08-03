import { assertSafeIdentifier } from "./identifier.js";

export const ERROR_CATEGORIES = [
  "validation",
  "authentication",
  "authorization",
  "conflict",
  "rate_limit",
  "dependency",
  "timeout",
  "internal",
] as const;

export const ERROR_SEVERITIES = ["warning", "error", "critical"] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];
export type ErrorSeverity = (typeof ERROR_SEVERITIES)[number];

const errorCategorySet: ReadonlySet<string> = new Set(ERROR_CATEGORIES);
const errorSeveritySet: ReadonlySet<string> = new Set(ERROR_SEVERITIES);

export interface OperationalErrorOptions {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly retryable: boolean;
  readonly severity: ErrorSeverity;
  readonly cause?: unknown;
}

export type SafeErrorRecord = Readonly<{
  error_code: string;
  error_category: ErrorCategory;
  error_retryable: boolean;
  error_severity: ErrorSeverity;
}>;

export class OperationalError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly severity: ErrorSeverity;

  public constructor(options: OperationalErrorOptions) {
    const code = assertSafeIdentifier(options.code, "error code", 96);

    if (!errorCategorySet.has(options.category) || !errorSeveritySet.has(options.severity)) {
      throw new TypeError("operational error taxonomy is invalid");
    }

    super(code, { cause: options.cause });

    this.name = "OperationalError";
    this.code = code;
    this.category = options.category;
    this.retryable = options.retryable;
    this.severity = options.severity;
  }
}

export function toSafeErrorRecord(error: unknown): SafeErrorRecord {
  if (error instanceof OperationalError) {
    return Object.freeze({
      error_code: error.code,
      error_category: error.category,
      error_retryable: error.retryable,
      error_severity: error.severity,
    });
  }

  return Object.freeze({
    error_code: "UNCLASSIFIED_ERROR",
    error_category: "internal",
    error_retryable: false,
    error_severity: "error",
  });
}
