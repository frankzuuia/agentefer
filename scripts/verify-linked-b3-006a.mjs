import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "rehearsal";
assert.ok(["rehearsal", "mutations", "regression"].includes(mode));
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "invoke through npm run test:database:linked:b3-006a");
const source = await readFile(
  path.join(root, "supabase/migrations/20260907130000_b3_006a_conversational_catalog.sql"),
  "utf8",
);
const test = await readFile(
  path.join(root, "supabase/tests/b3_006a_conversational_catalog_test.sql"),
  "utf8",
);
const outcomes = [];
await mkdir(path.join(root, "tmp"), { recursive: true });
await mkdir(path.join(root, "reports/database-quality"), { recursive: true });
async function validate(label, migration, mutant = false, testSource = test) {
  assert.equal(
    (await readFile(path.join(root, "supabase/.temp/project-ref"), "utf8")).trim(),
    "hprdctmblmfcoagugvyp",
  );
  const file = path.join(root, "tmp", `b3-006a-${process.pid}.sql`);
  await writeFile(file, buildLinkedMigrationPgtapCollector(migration, testSource), "utf8");
  const started = performance.now();
  let result;
  try {
    result = spawnSync(
      process.execPath,
      [
        path.join(path.dirname(npmExecutable), "npx-cli.js"),
        "--yes",
        "supabase@2.111.0",
        "db",
        "query",
        "--linked",
        "--file",
        file,
        "--output-format",
        "json",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
    );
  } finally {
    await rm(file, { force: true });
  }
  if (result.status !== 0) {
    // The runner executes only the transactional test file, never secret-inspection queries.
    process.stderr.write(result.stdout.slice(0, 5000));
  }
  assert.equal(
    result.status,
    0,
    `${label}: SQL must execute before interpreting assertions: ${result.stderr}`,
  );
  const lines = JSON.parse(result.stdout).rows.map((row) => row.result);
  const failures = lines.filter(
    (line) => line.startsWith("not ok") || line.includes("# Looks like"),
  );
  const assertions = lines.filter(
    (line) => line.startsWith("ok ") || line.startsWith("not ok "),
  ).length;
  assert.ok(assertions > 0);
  outcomes.push({
    label,
    assertions,
    failures,
    mutant,
    durationMilliseconds: Math.round(performance.now() - started),
  });
  await writeFile(
    path.join(root, "reports/database-quality", `b3-006a-${mode}.json`),
    JSON.stringify(
      { projectRef: "hprdctmblmfcoagugvyp", transaction: "rollback", outcomes },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(`${label}: ${assertions} assertions, ${failures.length} failures\n`);
  assert.equal(failures.length > 0, mutant, failures.join("\n"));
}
await validate("baseline", source);
if (mode === "regression") {
  for (const file of (await readdir(path.join(root, "supabase/tests")))
    .filter((name) => name.endsWith(".sql") && name !== "b3_006a_conversational_catalog_test.sql")
    .sort()) {
    await validate(
      file,
      source,
      false,
      await readFile(path.join(root, "supabase/tests", file), "utf8"),
    );
  }
}
if (mode === "mutations") {
  const mutants = [
    ["same-message-confirmation", "d.last_source_message_id=r.trigger_message_id", "false"],
    [
      "stale-revision",
      "d.revision is distinct from (target_arguments->>'expected_revision')::integer",
      "false",
    ],
    [
      "replay-hash",
      "previous.arguments_hash is distinct from extensions.digest(target_arguments::text,'sha256')",
      "false",
    ],
    ["base64-payload", "or starts_with(lower(value#>>'{}'),'data:')", "or false"],
    [
      "owner-only",
      "and m.role='owner' and m.status='active'",
      "and m.role in ('owner','admin') and m.status='active'",
    ],
    ["priced-composition-required", "if price_count>0 then", "if false then"],
  ];
  for (const [label, find, replacement] of mutants) {
    assert.ok(source.includes(find), `mutation target missing: ${label}`);
    await validate(label, source.replaceAll(find, replacement), true);
  }
}
