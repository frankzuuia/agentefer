import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const config = await readFile(path.join(repositoryRoot, "supabase", "config.toml"), "utf8");
const projectLine = config
  .split("\n")
  .map((line) => line.trim())
  .find((line) => line.startsWith('project_id = "'));

assert.equal(
  projectLine,
  'project_id = "agentefer"',
  "database mutations require AgenteFer local project",
);

const containerName = "supabase_db_agentefer";
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportPath = path.join(reportDirectory, "mutation-summary.json");
const mutants = [
  {
    name: "remove organization-wide SKU uniqueness",
    sql: "drop index app_private.variant_skus_organization_sku_unique;",
    test: "supabase/tests/b2_003_universal_catalog_test.sql",
  },
  {
    name: "remove product tenant read policy",
    sql: "drop policy products_member_select on app_private.products;",
    test: "supabase/tests/b2_003_universal_catalog_test.sql",
  },
  {
    name: "remove variant activation validator",
    sql: "drop trigger product_variants_validate_activation on app_private.product_variants;",
    test: "supabase/tests/b2_003_universal_catalog_test.sql",
  },
  {
    name: "remove current price overlap exclusion",
    sql: "alter table app_private.price_tiers drop constraint price_tiers_no_current_overlap;",
    test: "supabase/tests/b2_004_pricing_test.sql",
  },
  {
    name: "remove price tier tenant read policy",
    sql: "drop policy price_tiers_member_select on app_private.price_tiers;",
    test: "supabase/tests/b2_004_pricing_test.sql",
  },
  {
    name: "remove price tier semantic validator",
    sql: "drop trigger price_tiers_validate on app_private.price_tiers;",
    test: "supabase/tests/b2_004_pricing_test.sql",
  },
];

const run = (command, args, capture = false) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  return result;
};

const requireSuccess = (command, args) => {
  const result = run(command, args);
  assert.equal(result.status, 0, `${command} ${args.join(" ")} must succeed`);
};

const outcomes = [];
let executionError;
let recoveryError;

try {
  requireSuccess("docker", ["inspect", containerName]);

  for (const mutant of mutants) {
    requireSuccess("supabase", ["db", "reset", "--local", "--no-seed"]);
    requireSuccess("docker", [
      "exec",
      containerName,
      "psql",
      "--no-psqlrc",
      "--set=ON_ERROR_STOP=1",
      "--username=postgres",
      "--dbname=postgres",
      "--command",
      mutant.sql,
    ]);

    const testResult = run("supabase", ["test", "db", "--local", mutant.test], true);
    const killed = testResult.status !== 0;
    const diagnostic = `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(-30)
      .join("\n");

    outcomes.push({ name: mutant.name, test: mutant.test, killed, diagnostic });
  }
} catch (error) {
  executionError = error;
} finally {
  try {
    requireSuccess("supabase", ["db", "reset", "--local", "--no-seed"]);
    requireSuccess("supabase", ["test", "db", "--local", "supabase/tests"]);
  } catch (error) {
    recoveryError = error;
  }
}

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      killed: outcomes.filter((outcome) => outcome.killed).length,
      total: mutants.length,
      score:
        outcomes.length === 0
          ? 0
          : (outcomes.filter((outcome) => outcome.killed).length / mutants.length) * 100,
      outcomes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (recoveryError) {
  throw recoveryError;
}
if (executionError) {
  throw executionError;
}

assert.equal(outcomes.length, mutants.length, "every database mutant must execute");
assert.ok(
  outcomes.every((outcome) => outcome.killed),
  "pgTAP must kill every database mutant",
);

console.log(`Database mutation gate verified: ${mutants.length}/${mutants.length} killed (100%).`);
