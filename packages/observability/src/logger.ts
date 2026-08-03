import pino, {
  type DestinationStream,
  type Level,
  type Logger as PinoLogger,
  type LoggerOptions,
} from "pino";

import { correlationLogFields } from "./correlation.js";
import { toSafeErrorRecord } from "./errors.js";
import { assertSafeIdentifier } from "./identifier.js";
import { LOG_REDACTION_MARKER, sanitizeLogAttributes } from "./redaction.js";

const DEFENSE_IN_DEPTH_REDACTION_PATHS = [
  "authorization",
  "cookie",
  "password",
  "secret",
  "token",
  "*.authorization",
  "*.cookie",
  "*.password",
  "*.secret",
  "*.token",
  "attributes.*.authorization",
  "attributes.*.cookie",
  "attributes.*.password",
  "attributes.*.secret",
  "attributes.*.token",
] as const;

export const LOG_OUTCOMES = ["observed", "started", "succeeded", "failed", "cancelled"] as const;

export type LogOutcome = (typeof LOG_OUTCOMES)[number];
export type LogAttributes = Readonly<Record<string, unknown>>;

export type CreateStructuredLoggerInput = Readonly<{
  component: string;
  environment?: string | undefined;
  level?: Level | undefined;
  destination?: DestinationStream | undefined;
}>;

export type StructuredLogger = Readonly<{
  debug(event: string, outcome?: LogOutcome, attributes?: LogAttributes): void;
  info(event: string, outcome?: LogOutcome, attributes?: LogAttributes): void;
  warn(event: string, outcome?: LogOutcome, attributes?: LogAttributes): void;
  error(event: string, error: unknown, attributes?: LogAttributes): void;
}>;

function createPinoLogger(input: CreateStructuredLoggerInput): PinoLogger {
  const component = assertSafeIdentifier(input.component, "component", 64);
  const base: Record<string, string> = { component };

  if (input.environment !== undefined) {
    base.environment = assertSafeIdentifier(input.environment, "environment", 32);
  }

  const options: LoggerOptions = {
    base,
    level: input.level ?? "info",
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    redact: {
      paths: [...DEFENSE_IN_DEPTH_REDACTION_PATHS],
      censor: LOG_REDACTION_MARKER,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  return input.destination === undefined ? pino(options) : pino(options, input.destination);
}

function writeLog(
  logger: PinoLogger,
  level: "debug" | "info" | "warn",
  event: string,
  outcome: LogOutcome,
  attributes: LogAttributes,
): void {
  logger[level]({
    ...correlationLogFields(),
    event: assertSafeIdentifier(event, "event", 128),
    outcome,
    attributes: sanitizeLogAttributes(attributes),
  });
}

export function createStructuredLogger(input: CreateStructuredLoggerInput): StructuredLogger {
  const logger = createPinoLogger(input);

  return Object.freeze({
    debug(event, outcome = "observed", attributes = {}) {
      writeLog(logger, "debug", event, outcome, attributes);
    },
    info(event, outcome = "observed", attributes = {}) {
      writeLog(logger, "info", event, outcome, attributes);
    },
    warn(event, outcome = "observed", attributes = {}) {
      writeLog(logger, "warn", event, outcome, attributes);
    },
    error(event, error, attributes = {}) {
      logger.error({
        ...correlationLogFields(),
        ...toSafeErrorRecord(error),
        event: assertSafeIdentifier(event, "event", 128),
        outcome: "failed",
        attributes: sanitizeLogAttributes(attributes),
      });
    },
  });
}
