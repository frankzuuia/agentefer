import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/whatsapp-ai-processor.ts:343-385",
    "packages/ai/src/provider.ts:604-608",
    "packages/ai/src/provider.ts:676-680",
  ],
  jsonReporter: { fileName: "reports/mutation/b3-006t-required-tool-choice.json" },
  testFiles: [
    "apps/worker/test/whatsapp-ai-processor.test.ts",
    "packages/ai/test/provider.test.ts",
  ],
  vitest: { ...baseConfiguration.vitest, related: true },
};
