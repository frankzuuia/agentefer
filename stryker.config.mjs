/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    "apps/api/src/admin-meta-gateway.ts",
    "apps/api/src/admin-meta-protocol.ts",
    "apps/api/src/admin-meta-routes.ts",
    "apps/api/src/meta-graph-gateway.ts",
    "apps/api/src/meta-webhook-protocol.ts",
    "apps/api/src/meta-webhook-routes.ts",
    "apps/api/src/meta-webhook-rpc.ts",
    "packages/ai/src/**/*.ts",
    "!packages/ai/src/index.ts",
    "packages/database/src/type-normalizer.ts",
  ],
  ignorePatterns: [
    ".npm/**",
    ".stryker-tmp/**",
    "coverage/**",
    "reports/**",
    "docs/**",
    "supabase/**",
  ],
  disableTypeChecks: "{apps/api/src,packages/ai/src,packages/database/src}/**/*.ts",
  testRunner: "vitest",
  vitest: {
    configFile: "vitest.config.ts",
    related: false,
  },
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  thresholds: {
    high: 90,
    low: 90,
    break: 90,
  },
  concurrency: 2,
};
