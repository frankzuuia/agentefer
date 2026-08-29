import baseConfiguration from "./stryker.config.mjs";

export default {
  ...baseConfiguration,
  mutate: ["apps/worker/src/media-storage.ts"],
  jsonReporter: {
    fileName: "reports/mutation/b2-010-media-storage.json",
  },
};
