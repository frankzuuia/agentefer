import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/facebook-page.ts:198-204",
    "apps/worker/src/facebook-page.ts:208-209",
    "apps/worker/src/facebook-page.ts:219-222",
    "apps/worker/src/facebook-publication-processor.ts:206-210",
    "apps/worker/src/facebook-publication-processor.ts:222-230",
    "apps/worker/src/facebook-publication-processor.ts:243-246",
    "apps/worker/src/facebook-publication-processor.ts:250-250",
    "apps/worker/src/publication-notification-processor.ts:91-92",
    "apps/worker/src/publication-notification-processor.ts:105-105",
    "apps/worker/src/publication-notification-processor.ts:126-139",
    "apps/worker/src/publication-notification-processor.ts:172-179",
    "apps/worker/src/publication-notification-processor.ts:189-197",
  ],
  mutator: {
    excludedMutations: [
      "ArrayDeclaration",
      "ArithmeticOperator",
      "BlockStatement",
      "MethodExpression",
      "ObjectLiteral",
      "OptionalChaining",
      "StringLiteral",
    ],
  },
  jsonReporter: {
    fileName: "reports/mutation/b4-005-b4-006-facebook-publication.json",
  },
  testFiles: [
    "apps/worker/test/facebook-page.test.ts",
    "apps/worker/test/facebook-publication-processor.test.ts",
    "apps/worker/test/publication-notification-processor.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
