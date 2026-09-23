import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedRef = "hprdctmblmfcoagugvyp";
const expectedName = "AgenteFer";
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "invoke through npm run test:database:linked:b3-006w-mutations");
const npx = path.join(path.dirname(npmExecutable), "npx-cli.js");
const runSupabase = (args) =>
  spawnSync(process.execPath, [npx, "--yes", "supabase@2.111.0", ...args], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });

assert.equal(
  (await readFile(path.join(root, "supabase/.temp/project-ref"), "utf8")).trim(),
  expectedRef,
  "the linked Supabase project must be AgenteFer",
);
const identity = runSupabase(["projects", "list", "--output", "json"]);
assert.equal(identity.status, 0, "Supabase project identity lookup failed");
const linked = JSON.parse(identity.stdout).filter((project) => project.linked === true);
assert.equal(linked.length, 1, "exactly one project must be linked");
assert.equal(linked[0]?.ref, expectedRef);
assert.equal(linked[0]?.name, expectedName);

const migration = (
  await readFile(
    path.join(root, "supabase/migrations/20260923140000_b3_006w_owner_agent_catalog_integrity.sql"),
    "utf8",
  )
).replaceAll("\r\n", "\n");
const tests = await readFile(
  path.join(root, "supabase/tests/b3_006a_conversational_catalog_test.sql"),
  "utf8",
);
const mutants = [
  [
    "persist-item-wrapped-product-collections",
    "if not app_private.catalog_proposal_shape_valid(proposal_value) then",
    "if false then",
  ],
  [
    "allow-two-variants-from-the-same-product-in-photo-batch",
    "if matched_products <> cardinality(target_variant_ids) then",
    "if false then",
  ],
  [
    "misclassify-rejected-tool-result-as-success",
    "when resolved_result->'ok' = 'true'::jsonb then 'succeeded'",
    "when true then 'succeeded'",
  ],
];
const tempDirectory = path.join(root, "tmp");
const reportDirectory = path.join(root, "reports/database-quality");
await mkdir(tempDirectory, { recursive: true });
await mkdir(reportDirectory, { recursive: true });
const outcomes = [];

for (const [label, find, replacement] of [["baseline", "", ""], ...mutants]) {
  assert.ok(label === "baseline" || migration.includes(find), `missing mutation target: ${label}`);
  const candidate = label === "baseline" ? migration : migration.replace(find, replacement);
  const file = path.join(tempDirectory, `b3-006w-mutation-${process.pid}.sql`);
  await writeFile(file, buildLinkedMigrationPgtapCollector(candidate, tests), "utf8");
  let result;
  try {
    result = runSupabase(["db", "query", "--linked", "--file", file, "--output-format", "json"]);
  } finally {
    await rm(file, { force: true });
  }
  assert.equal(
    result.status,
    0,
    `${label}: SQL execution failed: ${result.stderr}\n${result.stdout}`,
  );
  const lines = JSON.parse(result.stdout).rows.map((row) => row.result);
  const planned = lines.find((line) => line.startsWith("1.."));
  const failures = lines.filter(
    (line) => line.startsWith("not ok ") || line.includes("# Looks like"),
  );
  const passed = lines.filter((line) => line.startsWith("ok ")).length;
  assert.ok(planned, `${label}: pgTAP plan missing`);
  assert.equal(
    label === "baseline" ? failures.length === 0 : failures.length > 0,
    true,
    `${label}: expected a clean baseline or a test-detected mutation`,
  );
  outcomes.push({
    label,
    planned: Number(planned.slice(3)),
    passed,
    failed: failures.length,
    transactionOutcome: "rolled_back_per_mutant",
  });
  process.stdout.write(
    `${label}: ${passed}/${planned.slice(3)} passed, ${failures.length} failures\n`,
  );
}

await writeFile(
  path.join(reportDirectory, "b3-006w-mutations.json"),
  `${JSON.stringify({ projectRef: expectedRef, transactionOutcome: "rolled_back_per_mutant", outcomes }, null, 2)}\n`,
  "utf8",
);
