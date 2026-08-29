import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/api/src/admin-catalog-gateway.ts:364-404",
    "apps/api/src/admin-catalog-gateway.ts:553-571",
    "apps/api/src/admin-catalog-gateway.ts:630-647",
    "apps/api/src/admin-catalog-protocol.ts:114-166",
    "apps/api/src/admin-catalog-protocol.ts:168-290",
    "apps/api/src/admin-catalog-routes.ts:73-88",
    "apps/api/src/admin-catalog-routes.ts:129-173",
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
    fileName: "reports/mutation/b4-005-b4-006-admin-catalog.json",
  },
  testFiles: [
    "apps/api/test/admin-catalog-gateway.test.ts",
    "apps/api/test/admin-catalog-protocol.test.ts",
    "apps/api/test/admin-catalog-routes.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
