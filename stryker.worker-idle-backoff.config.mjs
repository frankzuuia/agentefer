import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: ["apps/worker/src/adaptive-polling.ts"],
  jsonReporter: { fileName: "reports/mutation/worker-idle-backoff.json" },
  testFiles: ["apps/worker/test/adaptive-polling.test.ts"],
  vitest: { ...baseConfiguration.vitest, related: true },
};
