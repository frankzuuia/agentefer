import baseConfiguration from "./stryker.config.mjs";

export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/media-ingest-processor.ts:127-145",
    "apps/worker/src/media-ingest-processor.ts:147-204",
    "apps/worker/src/media-ingest-processor.ts:205-269",
    "apps/worker/src/media-ingest-rpc.ts:313-365",
    "apps/worker/src/media-ingest-rpc.ts:367-425",
    "apps/worker/src/media-ingest-rpc.ts:427-470",
    "apps/worker/src/whatsapp-media.ts:265-335",
    "apps/worker/src/whatsapp-media.ts:339-440",
    "apps/worker/src/whatsapp-ai-processor.ts:73-121",
    "packages/ai/src/provider.ts:213-301",
    "packages/ai/src/provider.ts:631-643",
  ],
  jsonReporter: {
    fileName: "reports/mutation/b3-005-whatsapp-multimodal.json",
  },
  testFiles: [
    "apps/worker/test/media-ingest-processor.test.ts",
    "apps/worker/test/media-ingest-rpc.test.ts",
    "apps/worker/test/whatsapp-media.test.ts",
    "apps/worker/test/whatsapp-ai-rpc.test.ts",
    "apps/worker/test/whatsapp-ai-processor.test.ts",
    "packages/ai/test/provider.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
