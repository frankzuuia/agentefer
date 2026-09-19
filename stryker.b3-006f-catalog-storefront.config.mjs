import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/worker/src/catalog-storefront-processor.ts:48-117",
    "apps/worker/src/catalog-storefront-rpc.ts:94-200",
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
    fileName: "reports/mutation/b3-006f-catalog-storefront.json",
  },
  testFiles: [
    "apps/worker/test/catalog-storefront-processor.test.ts",
    "apps/worker/test/catalog-storefront-rpc.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
