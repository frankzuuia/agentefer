import { z } from "zod";

import {
  applicationEnvironmentSchema,
  httpUrlSchema,
  logLevelSchema,
  optionalCommitShaSchema,
  parseEnvironmentSchema,
  positiveIntegerSchema,
  requiredTextSchema,
  supabaseProjectRefSchema,
  supabasePublishableKeySchema,
  supabaseSecretKeySchema,
  validateDeploymentMetadata,
  validateSupabaseProjectBoundary,
  validateTransportSecurity,
  type RawEnvironment,
} from "./core.js";

export const apiEnvironmentVariables = [
  "APP_ENV",
  "LOG_LEVEL",
  "DEPLOYMENT_COMMIT_SHA",
  "API_HOST",
  "API_PORT",
  "API_PUBLIC_URL",
  "WEB_PUBLIC_URL",
  "SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
] as const;

const apiEnvironmentSchema = z
  .object({
    APP_ENV: applicationEnvironmentSchema,
    LOG_LEVEL: logLevelSchema,
    DEPLOYMENT_COMMIT_SHA: optionalCommitShaSchema,
    API_HOST: requiredTextSchema,
    API_PORT: positiveIntegerSchema.refine((value) => value <= 65_535, "must be a valid TCP port"),
    API_PUBLIC_URL: httpUrlSchema,
    WEB_PUBLIC_URL: httpUrlSchema,
    SUPABASE_URL: httpUrlSchema,
    SUPABASE_PROJECT_REF: supabaseProjectRefSchema,
    SUPABASE_PUBLISHABLE_KEY: supabasePublishableKeySchema,
    SUPABASE_SECRET_KEY: supabaseSecretKeySchema,
  })
  .superRefine((environment, context) => {
    validateDeploymentMetadata(environment.APP_ENV, environment.DEPLOYMENT_COMMIT_SHA, context);
    validateTransportSecurity(
      environment.APP_ENV,
      [
        ["API_PUBLIC_URL", environment.API_PUBLIC_URL],
        ["WEB_PUBLIC_URL", environment.WEB_PUBLIC_URL],
        ["SUPABASE_URL", environment.SUPABASE_URL],
      ],
      context,
    );
    validateSupabaseProjectBoundary(
      environment.APP_ENV,
      environment.SUPABASE_URL,
      environment.SUPABASE_PROJECT_REF,
      "SUPABASE_URL",
      context,
    );
  })
  .transform((environment) => ({
    runtime: {
      environment: environment.APP_ENV,
      logLevel: environment.LOG_LEVEL,
      deploymentCommitSha: environment.DEPLOYMENT_COMMIT_SHA,
    },
    server: {
      host: environment.API_HOST,
      port: environment.API_PORT,
      publicUrl: environment.API_PUBLIC_URL,
      webOrigin: environment.WEB_PUBLIC_URL,
    },
    supabase: {
      url: environment.SUPABASE_URL,
      projectRef: environment.SUPABASE_PROJECT_REF,
      publishableKey: environment.SUPABASE_PUBLISHABLE_KEY,
      secretKey: environment.SUPABASE_SECRET_KEY,
    },
  }));

export type ApiEnvironment = z.output<typeof apiEnvironmentSchema>;

export const parseApiEnvironment = (source: RawEnvironment): ApiEnvironment =>
  parseEnvironmentSchema("api", apiEnvironmentSchema, source, apiEnvironmentVariables);
