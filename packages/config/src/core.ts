import { z } from "zod";

export type RawEnvironment = Readonly<Record<string, string | undefined>>;
export type ApplicationEnvironment = "local" | "test" | "staging" | "production";
export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";
export type ProcessName = "web" | "api" | "worker";

export interface ConfigurationIssue {
  readonly variable: string;
  readonly code: string;
  readonly message: string;
}

export class EnvironmentConfigurationError extends Error {
  readonly processName: ProcessName;
  readonly issues: readonly ConfigurationIssue[];

  constructor(processName: ProcessName, issues: readonly ConfigurationIssue[]) {
    const safeSummary = issues.map((issue) => `${issue.variable}: ${issue.message}`).join("; ");

    super(`Invalid ${processName} environment configuration: ${safeSummary}`);
    this.name = "EnvironmentConfigurationError";
    this.processName = processName;
    this.issues = Object.freeze([...issues]);
  }
}

export class SensitiveValue {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
    Object.freeze(this);
  }

  reveal(): string {
    return this.#value;
  }

  toJSON(): string {
    return "[REDACTED]";
  }

  toString(): string {
    return "[REDACTED]";
  }
}

export const applicationEnvironmentSchema = z.enum(["local", "test", "staging", "production"]);

export const logLevelSchema = z.enum(["trace", "debug", "info", "warn", "error", "fatal"]);

export const requiredTextSchema = z.string().trim().min(1, "is required");

const blankToUndefined = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim();
  return normalized.length === 0 ? undefined : normalized;
};

export const optionalTextSchema = z.preprocess(blankToUndefined, requiredTextSchema.optional());

export const httpUrlSchema = requiredTextSchema
  .pipe(z.url("must be an absolute URL"))
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "must use http or https");

export const optionalHttpUrlSchema = z.preprocess(blankToUndefined, httpUrlSchema.optional());

export const positiveIntegerSchema = requiredTextSchema
  .refine((value) => {
    const numericValue = Number(value);
    return Number.isSafeInteger(numericValue) && numericValue > 0;
  }, "must be a positive safe integer")
  .transform((value) => Number(value));

export const secretTextSchema = requiredTextSchema.transform((value) => new SensitiveValue(value));

export const optionalSecretTextSchema = z.preprocess(blankToUndefined, secretTextSchema.optional());

export const optionalCommitShaSchema = optionalTextSchema;

export const supabaseProjectRefSchema = requiredTextSchema.refine((value) => {
  if (value.length < 10 || value.length > 40) {
    return false;
  }

  for (const character of value) {
    const isLowercaseAlphaNumeric =
      (character >= "0" && character <= "9") || (character >= "a" && character <= "z");
    if (!isLowercaseAlphaNumeric) {
      return false;
    }
  }

  return true;
}, "must be a lowercase Supabase project ref");

export const supabasePublishableKeySchema = requiredTextSchema.refine(
  (value) => value.startsWith("sb_publishable_"),
  "must be a current sb_publishable_ key",
);

export const supabaseSecretKeySchema = requiredTextSchema
  .refine((value) => value.startsWith("sb_secret_"), "must be a current sb_secret_ key")
  .transform((value) => new SensitiveValue(value));

export const selectEnvironment = (
  source: RawEnvironment,
  variableNames: readonly string[],
): Record<string, string | undefined> =>
  Object.fromEntries(variableNames.map((name) => [name, source[name]]));

export const parseEnvironmentSchema = <T>(
  processName: ProcessName,
  schema: z.ZodType<T>,
  source: RawEnvironment,
  variableNames: readonly string[],
): T => {
  const result = schema.safeParse(selectEnvironment(source, variableNames));

  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map<ConfigurationIssue>((issue) => ({
    variable: String(issue.path[0] ?? "environment"),
    code: issue.code,
    message: issue.message,
  }));

  throw new EnvironmentConfigurationError(processName, issues);
};

const isFullGitSha = (value: string): boolean => {
  if (value.length !== 40) {
    return false;
  }

  for (const character of value.toLowerCase()) {
    const isHexadecimal =
      (character >= "0" && character <= "9") || (character >= "a" && character <= "f");
    if (!isHexadecimal) {
      return false;
    }
  }

  return true;
};

export const validateDeploymentMetadata = (
  environment: ApplicationEnvironment,
  commitSha: string | undefined,
  context: z.RefinementCtx,
): void => {
  if (environment === "local" || environment === "test") {
    return;
  }

  if (commitSha === undefined) {
    context.addIssue({
      code: "custom",
      path: ["DEPLOYMENT_COMMIT_SHA"],
      message: "is required in staging and production",
    });
    return;
  }

  if (!isFullGitSha(commitSha)) {
    context.addIssue({
      code: "custom",
      path: ["DEPLOYMENT_COMMIT_SHA"],
      message: "must be a full 40-character Git commit SHA",
    });
  }
};

export const validateTransportSecurity = (
  environment: ApplicationEnvironment,
  urls: readonly (readonly [variable: string, value: string | undefined])[],
  context: z.RefinementCtx,
): void => {
  if (environment === "local" || environment === "test") {
    return;
  }

  for (const [variable, value] of urls) {
    if (value !== undefined && new URL(value).protocol !== "https:") {
      context.addIssue({
        code: "custom",
        path: [variable],
        message: "must use https in staging and production",
      });
    }
  }
};

export const validateSupabaseProjectBoundary = (
  environment: ApplicationEnvironment,
  url: string,
  projectRef: string,
  urlVariable: string,
  context: z.RefinementCtx,
): void => {
  if (environment === "local" || environment === "test") {
    return;
  }

  const expectedHostname = `${projectRef}.supabase.co`;
  if (new URL(url).hostname !== expectedHostname) {
    context.addIssue({
      code: "custom",
      path: [urlVariable],
      message: "does not match the declared Supabase project ref",
    });
  }
};

const allowedPublicKeyVariables = new Set(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]);

const secretNameMarkers = [
  "SECRET",
  "TOKEN",
  "PASSWORD",
  "PRIVATE",
  "SERVICE_ROLE",
  "OPENAI",
  "MINIMAX",
];

export const assertNoSecretLikePublicVariables = (source: RawEnvironment): void => {
  const issues: ConfigurationIssue[] = [];

  for (const [name, value] of Object.entries(source)) {
    if (!name.startsWith("NEXT_PUBLIC_") || value?.trim().length === 0) {
      continue;
    }

    const looksLikeKey = name.endsWith("_KEY");
    const hasSecretMarker = secretNameMarkers.some((marker) => name.includes(marker));
    const explicitlyAllowed = allowedPublicKeyVariables.has(name);

    if ((looksLikeKey || hasSecretMarker) && !explicitlyAllowed) {
      issues.push({
        variable: name,
        code: "public_secret_exposure",
        message: "looks secret and cannot be exposed through NEXT_PUBLIC_",
      });
    }
  }

  if (issues.length > 0) {
    throw new EnvironmentConfigurationError("web", issues);
  }
};
