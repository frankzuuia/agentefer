import { z } from "zod";

import {
  applicationEnvironmentSchema,
  assertNoSecretLikePublicVariables,
  httpUrlSchema,
  logLevelSchema,
  optionalCommitShaSchema,
  parseEnvironmentSchema,
  supabaseProjectRefSchema,
  supabasePublishableKeySchema,
  validateDeploymentMetadata,
  validateSupabaseProjectBoundary,
  validateTransportSecurity,
  type RawEnvironment,
} from "./core.js";

export const webEnvironmentVariables = [
  "APP_ENV",
  "LOG_LEVEL",
  "DEPLOYMENT_COMMIT_SHA",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PROJECT_REF",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const webEnvironmentSchema = z
  .object({
    APP_ENV: applicationEnvironmentSchema,
    LOG_LEVEL: logLevelSchema,
    DEPLOYMENT_COMMIT_SHA: optionalCommitShaSchema,
    NEXT_PUBLIC_APP_URL: httpUrlSchema,
    NEXT_PUBLIC_API_URL: httpUrlSchema,
    NEXT_PUBLIC_SUPABASE_URL: httpUrlSchema,
    NEXT_PUBLIC_SUPABASE_PROJECT_REF: supabaseProjectRefSchema,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabasePublishableKeySchema,
  })
  .superRefine((environment, context) => {
    validateDeploymentMetadata(environment.APP_ENV, environment.DEPLOYMENT_COMMIT_SHA, context);
    validateTransportSecurity(
      environment.APP_ENV,
      [
        ["NEXT_PUBLIC_APP_URL", environment.NEXT_PUBLIC_APP_URL],
        ["NEXT_PUBLIC_API_URL", environment.NEXT_PUBLIC_API_URL],
        ["NEXT_PUBLIC_SUPABASE_URL", environment.NEXT_PUBLIC_SUPABASE_URL],
      ],
      context,
    );
    validateSupabaseProjectBoundary(
      environment.APP_ENV,
      environment.NEXT_PUBLIC_SUPABASE_URL,
      environment.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
      "NEXT_PUBLIC_SUPABASE_URL",
      context,
    );
  })
  .transform((environment) => ({
    runtime: {
      environment: environment.APP_ENV,
      logLevel: environment.LOG_LEVEL,
      deploymentCommitSha: environment.DEPLOYMENT_COMMIT_SHA,
    },
    public: {
      appUrl: environment.NEXT_PUBLIC_APP_URL,
      apiUrl: environment.NEXT_PUBLIC_API_URL,
      supabaseUrl: environment.NEXT_PUBLIC_SUPABASE_URL,
      supabaseProjectRef: environment.NEXT_PUBLIC_SUPABASE_PROJECT_REF,
      supabasePublishableKey: environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  }));

export type WebEnvironment = z.output<typeof webEnvironmentSchema>;

export const parseWebEnvironment = (source: RawEnvironment): WebEnvironment => {
  assertNoSecretLikePublicVariables(source);
  return parseEnvironmentSchema("web", webEnvironmentSchema, source, webEnvironmentVariables);
};
