import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: ["packages/ai/src/provider.ts:508-558"],
  jsonReporter: { fileName: "reports/mutation/b3-006u-tool-continuation.json" },
  testFiles: ["packages/ai/test/provider.test.ts"],
  vitest: { ...baseConfiguration.vitest, related: true },
};
