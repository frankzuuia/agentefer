import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "invoke through npm run test:database:linked:b3-006k");

const migrationSource = await readFile(
  path.join(root, "supabase/migrations/20260919233000_b3_006k_admin_catalog_image_uploads_rls.sql"),
  "utf8",
);
const pgtapSource = await readFile(
  path.join(root, "supabase/tests/b3_006k_admin_catalog_image_uploads_rls_test.sql"),
  "utf8",
);
const outcomes = [];
await mkdir(path.join(root, "tmp"), { recursive: true });
await mkdir(path.join(root, "reports/database-quality"), { recursive: true });

async function validate(label, mutation = "") {
  assert.equal(
    (await readFile(path.join(root, "supabase/.temp/project-ref"), "utf8")).trim(),
    "hprdctmblmfcoagugvyp",
  );
  const file = path.join(root, "tmp", `b3-006k-${process.pid}.sql`);
  const collector = buildLinkedMigrationPgtapCollector(migrationSource, pgtapSource, mutation);
  await writeFile(file, collector, "utf8");
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
    process.stderr.write(result.stdout.slice(0, 5000));
  }
  assert.equal(
    result.status,
    0,
    `${label}: SQL must execute before interpreting assertions: ${result.stderr}`,
  );
  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `${label}: supabase CLI stdout is not valid JSON: ${error.message}\nstdout=${result.stdout?.slice(0, 500)}`,
    );
  }
  const rows = Array.isArray(parsed) ? parsed : (parsed.rows ?? []);
  const lines = rows.map((row) => row.result);
  const failures = lines.filter(
    (line) => line.startsWith("not ok") || line.includes("# Looks like"),
  );
  const assertions = lines.filter(
    (line) => line.startsWith("ok ") || line.startsWith("not ok "),
  ).length;
  assert.ok(assertions > 0, `${label}: pgTAP must produce at least one assertion`);
  outcomes.push({
    label,
    assertions,
    failures,
    durationMilliseconds: Math.round(performance.now() - started),
  });
  await writeFile(
    path.join(root, "reports/database-quality", `b3-006k-baseline.json`),
    JSON.stringify(
      { projectRef: "hprdctmblmfcoagugvyp", transaction: "rollback", outcomes },
      null,
      2,
    ) + "\n",
  );
  process.stdout.write(`${label}: ${assertions} assertions, ${failures.length} failures\n`);
}

await validate("baseline");
