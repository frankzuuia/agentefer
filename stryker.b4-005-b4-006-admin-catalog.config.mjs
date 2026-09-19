import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/api/src/admin-catalog-gateway.ts:690-694",
    "apps/api/src/admin-catalog-gateway.ts:770-800",
    "apps/api/src/admin-catalog-protocol.ts:114-166",
    "apps/api/src/admin-catalog-protocol.ts:168-271",
    "apps/api/src/admin-catalog-routes.ts:73-88",
    "apps/api/src/admin-catalog-routes.ts:129-156",
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
