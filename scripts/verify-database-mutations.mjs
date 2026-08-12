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
  {
    name: "remove price book creator foreign-key index",
    sql: "drop index app_private.price_books_created_by_user_idx;",
    test: "supabase/tests/b2_004_pricing_test.sql",
  },
  {
    name: "remove one-active-composition uniqueness",
    sql: "drop index app_private.inventory_compositions_one_active_offer_unit;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove composition component precision validator",
    sql: "drop trigger inventory_composition_components_validate on app_private.inventory_composition_components;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove global inventory idempotency uniqueness",
    sql: "alter table app_private.inventory_commands drop constraint inventory_commands_idempotency_unique;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove nonnegative balance constraint",
    sql: "alter table app_private.inventory_balances drop constraint inventory_balances_quantities_valid;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove inventory balance tenant read policy",
    sql: "drop policy inventory_balances_member_select on app_private.inventory_balances;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove immutable movement trigger",
    sql: "drop trigger inventory_movements_reject_update on app_private.inventory_movements;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove immutable reservation event trigger",
    sql: "drop trigger inventory_reservation_events_reject_update on app_private.inventory_reservation_events;",
    test: "supabase/tests/b2_005_inventory_test.sql",
  },
  {
    name: "remove order tenant read policy",
    sql: "drop policy orders_member_select on app_private.orders;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove pending request creator foreign-key index",
    sql: "drop index app_private.pending_requests_created_by_user_idx;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove both active assignment uniqueness guards",
    sql: "drop index app_private.conversation_assignments_one_active_opportunity; drop index app_private.conversation_assignments_one_active_conversation;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove immutable order snapshot trigger",
    sql: "drop trigger orders_prevent_core_rewrite on app_private.orders;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove sale line reversal reference validator",
    sql: "drop trigger sale_lines_validate_reference on app_private.sale_lines;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove immutable sale header trigger",
    sql: "drop trigger sales_reject_update on app_private.sales;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove immutable sale line trigger",
    sql: "drop trigger sale_lines_reject_update on app_private.sale_lines;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove immutable commercial event trigger",
    sql: "drop trigger commercial_events_reject_update on app_private.commercial_events;",
    test: "supabase/tests/b2_006_commercial_workflow_test.sql",
  },
  {
    name: "remove one-operational-publication uniqueness",
    sql: "drop index app_private.publications_one_operational_offer;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove publication external-effect uniqueness",
    sql: "alter table app_private.publication_jobs drop constraint publication_jobs_external_effect_unique;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove immutable social capability trigger",
    sql: "drop trigger social_capabilities_reject_update on app_private.social_capabilities;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove immutable publication version trigger",
    sql: "drop trigger publication_versions_prevent_rewrite on app_private.publication_versions;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove immutable publication event trigger",
    sql: "drop trigger publication_events_reject_update on app_private.publication_events;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove immutable publication job contract trigger",
    sql: "drop trigger publication_jobs_prevent_core_rewrite on app_private.publication_jobs;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove publication instance provenance validator",
    sql: "drop trigger publication_instances_validate on app_private.publication_instances;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove current publication version validator",
    sql: "drop trigger publications_validate_current_version on app_private.publications;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove publication batch connection foreign-key index",
    sql: "drop index app_private.publication_batches_connection_fk_idx;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove publication tenant read policy",
    sql: "drop policy publications_member_select on app_private.publications;",
    test: "supabase/tests/b2_007_publication_workflow_test.sql",
  },
  {
    name: "remove agent attempt composite foreign-key index",
    sql: "drop index app_private.job_attempts_job_run_fk_idx;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
  },
  {
    name: "remove immutable prompt history trigger",
    sql: "drop trigger prompt_versions_reject_update on app_private.prompt_versions;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
  },
  {
    name: "remove immutable cognitive message trigger",
    sql: "drop trigger agent_messages_reject_update on app_private.agent_messages;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
  },
  {
    name: "remove external tool effect uniqueness",
    sql: "drop index app_private.tool_executions_external_effect_unique;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
  },
  {
    name: "remove agent run tenant read policy",
    sql: "drop policy agent_runs_operator_select on app_private.agent_runs;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
  },
  {
    name: "remove forced RLS from agent runs",
    sql: "alter table app_private.agent_runs no force row level security;",
    test: "supabase/tests/b2_008_agent_runtime_test.sql",
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
