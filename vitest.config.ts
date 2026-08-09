import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["apps/**/test/**/*.test.ts", "packages/**/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: [
        "apps/api/src/**/*.ts",
        "apps/worker/src/**/*.ts",
        "packages/ai/src/**/*.ts",
        "packages/config/src/**/*.ts",
        "packages/database/src/linked-pgtap.ts",
        "packages/observability/src/**/*.ts",
      ],
      exclude: ["**/*.d.ts"],
      reporter: ["text", "json-summary", "lcov"],
      reportsDirectory: "coverage",
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 85,
      },
    },
  },
});
