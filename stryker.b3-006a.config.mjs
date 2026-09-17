import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: ["apps/api/src/catalog-private-media.ts", "apps/worker/src/media-storage.ts:91-121"],
  jsonReporter: { fileName: "reports/mutation/b3-006a-private-media.json" },
  testFiles: [
    "apps/api/test/catalog-private-media.test.ts",
    "apps/worker/test/private-media-signature.test.ts",
  ],
  vitest: { ...baseConfiguration.vitest, related: true },
};
