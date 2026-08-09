/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: ["packages/ai/src/**/*.ts", "!packages/ai/src/index.ts"],
  ignorePatterns: [
    ".npm/**",
    ".stryker-tmp/**",
    "coverage/**",
    "reports/**",
    "docs/**",
    "supabase/**",
  ],
  disableTypeChecks: "packages/ai/src/**/*.ts",
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
