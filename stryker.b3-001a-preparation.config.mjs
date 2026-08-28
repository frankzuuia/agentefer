import baseConfiguration from "./stryker.config.mjs";

export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/whatsapp-ai-processor.ts:360-390",
    "apps/worker/src/whatsapp-ai-processor.ts:465-477",
  ],
  jsonReporter: {
    fileName: "reports/mutation/b3-001a-preparation-worker.json",
  },
};
