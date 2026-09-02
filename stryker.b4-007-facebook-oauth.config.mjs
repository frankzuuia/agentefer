import baseConfiguration from "./stryker.config.mjs";

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  ...baseConfiguration,
  mutate: [
    "apps/api/src/facebook-oauth-protocol.ts:31-116",
    "apps/api/src/facebook-oauth-graph.ts:71-95",
    "apps/api/src/facebook-oauth-graph.ts:184-237",
    "apps/api/src/facebook-oauth-rpc.ts:128-135",
    "apps/api/src/facebook-oauth-rpc.ts:174-245",
    "apps/api/src/facebook-oauth-routes.ts:138-285",
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
    fileName: "reports/mutation/b4-007-facebook-oauth.json",
  },
  testFiles: [
    "apps/api/test/facebook-oauth-protocol.test.ts",
    "apps/api/test/facebook-oauth-graph.test.ts",
    "apps/api/test/facebook-oauth-rpc.test.ts",
    "apps/api/test/admin-catalog-routes.test.ts",
  ],
  vitest: {
    ...baseConfiguration.vitest,
    related: true,
  },
};
