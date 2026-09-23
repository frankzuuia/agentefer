import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "packages/ai/src/provider.ts:509-510",
    "packages/ai/src/provider.ts:525-527",
    "packages/ai/src/provider.ts:544-547",
    "packages/ai/src/provider.ts:557-557",
  ],
  jsonReporter: { fileName: "reports/mutation/b3-006u-tool-continuation.json" },
  testFiles: ["packages/ai/test/provider.test.ts"],
  vitest: { ...baseConfiguration.vitest, related: true },
};
