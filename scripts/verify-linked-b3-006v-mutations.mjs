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
assert.ok(npmExecutable, "invoke through npm run test:database:linked:b3-006v-mutations");
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

const migration = (await readFile(
  path.join(root, "supabase/migrations/20260922210000_b3_006v_owner_catalog_activation.sql"),
  "utf8",
)).replaceAll("\r\n", "\n");
const tests = await readFile(
  path.join(root, "supabase/tests/b3_006a_conversational_catalog_test.sql"),
  "utf8",
);
const mutants = [
  ["applied-history-guard", "if draft_status = 'applied' then", "if false then"],
  [
    "activate-confirmed-offers",
    `activation := api.admin_edit_catalog_offer(
        target_organization_id,
        owner_run.actor_user_id,
        variant_id_value,
        'set_status',
        '{"status":"active"}'::jsonb,
        'catalog-confirm-active:' || (target_arguments->>'draft_id') || ':' || variant_id_value::text
      );`,
    `activation := '{"ok":true}'::jsonb;`,
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
  const file = path.join(tempDirectory, `b3-006v-mutation-${process.pid}.sql`);
  await writeFile(file, buildLinkedMigrationPgtapCollector(candidate, tests), "utf8");
  let result;
  try {
    result = runSupabase(["db", "query", "--linked", "--file", file, "--output-format", "json"]);
  } finally {
    await rm(file, { force: true });
  }
  assert.equal(result.status, 0, `${label}: SQL execution failed`);
  const lines = JSON.parse(result.stdout).rows.map((row) => row.result);
  const planned = lines.find((line) => line.startsWith("1.."));
  const failures = lines.filter((line) => line.startsWith("not ok") || line.includes("# Looks like"));
  const passed = lines.filter((line) => line.startsWith("ok ")).length;
  assert.ok(planned, `${label}: pgTAP plan missing`);
  assert.equal(label === "baseline" ? failures.length === 0 : failures.length > 0, true,
    `${label}: expected a clean baseline or a test-detected mutation`);
  outcomes.push({ label, planned: Number(planned.slice(3)), passed, failed: failures.length });
  process.stdout.write(`${label}: ${passed}/${planned.slice(3)} passed, ${failures.length} failures\n`);
}

await writeFile(
  path.join(reportDirectory, "b3-006v-mutations.json"),
  `${JSON.stringify({ projectRef: expectedRef, transaction: "rollback", outcomes }, null, 2)}\n`,
  "utf8",
);
