import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/media-ingest-processor.ts:80-119",
    "apps/worker/src/media-ingest-processor.ts:140-145",
    "apps/worker/src/media-ingest-processor.ts:205-219",
    "apps/worker/src/media-ingest-rpc.ts:250-255",
    "apps/worker/src/media-ingest-rpc.ts:302-309",
    "apps/worker/src/whatsapp-media.ts:265-273",
    "apps/worker/src/whatsapp-media.ts:284-295",
    "apps/worker/src/whatsapp-media.ts:311-317",
    "apps/worker/src/whatsapp-media.ts:344-355",
    "apps/worker/src/whatsapp-media.ts:379-408",
    "apps/worker/src/whatsapp-media.ts:425-432",
    "apps/worker/src/whatsapp-ai-processor.ts:92-111",
    "packages/ai/src/provider.ts:252-269",
    "packages/ai/src/provider.ts:631-643",
  ],
  mutator: {
    excludedMutations: [
      "ArrayDeclaration",
      "ArithmeticOperator",
      "ArrowFunction",
      "BlockStatement",
      "MethodExpression",
      "ObjectLiteral",
      "OptionalChaining",
      "StringLiteral",
    ],
  },
  jsonReporter: {
    fileName: "reports/mutation/b3-005-whatsapp-multimodal-critical.json",
  },
  testFiles: [
    "apps/worker/test/media-ingest-processor.test.ts",
    "apps/worker/test/media-ingest-rpc.test.ts",
    "apps/worker/test/whatsapp-media.test.ts",
    "apps/worker/test/whatsapp-ai-processor.test.ts",
    "packages/ai/test/provider.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
