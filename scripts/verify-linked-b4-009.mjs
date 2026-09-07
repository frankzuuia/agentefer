import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLinkedMigrationPgtapCollector,
  buildLinkedPgtapCollector,
} from "../packages/database/dist/linked-pgtap.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] ?? "rehearsal";
assert.ok(["rehearsal", "mutations", "after"].includes(mode));
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "invoke through the npm quality command");
const npxArgs = [path.join(path.dirname(npmExecutable), "npx-cli.js"), "--yes", "supabase@2.111.0"];
const migrationName = "20260907110000_b4_009_facebook_login_modes.sql";
const testName = "b4_009_facebook_login_modes_test.sql";
const migration = await readFile(path.join(root, "supabase/migrations", migrationName), "utf8");
const newTest = await readFile(path.join(root, "supabase/tests", testName), "utf8");
const reportDirectory = path.join(root, "reports/database-quality");
await mkdir(reportDirectory, { recursive: true });
await mkdir(path.join(root, "tmp"), { recursive: true });
const outcomes = [];

async function query(label, sql) {
  const link = (await readFile(path.join(root, "supabase/.temp/project-ref"), "utf8")).trim();
  assert.equal(link, "hprdctmblmfcoagugvyp", "only linked AgenteFer is permitted");
  const file = path.join(root, "tmp", `b4-009-${process.pid}.sql`);
  await writeFile(file, sql, "utf8");
  let result;
  try {
    result = spawnSync(
      process.execPath,
      [...npxArgs, "db", "query", "--linked", "--file", file, "--output-format", "json"],
      { cwd: root, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
    );
  } finally {
    await rm(file, { force: true });
  }
  assert.equal(
    result.status,
    0,
    `${label}: SQL execution must succeed before interpreting pgTAP: ${result.stderr}\n${result.stdout}`,
  );
  return JSON.parse(result.stdout).rows;
}

const history = await query(
  "history",
  "select version from supabase_migrations.schema_migrations where version='20260907110000';",
);
assert.equal(
  history.length,
  mode === "after" ? 1 : 0,
  "rehearsal/mutation cannot run DDL after migration application",
);
async function validate(label, source, test, mutant = false) {
  const rows = await query(
    label,
    mode === "after"
      ? buildLinkedPgtapCollector(test)
      : buildLinkedMigrationPgtapCollector(source, test),
  );
  const lines = rows.map((row) => row.result);
  const failed = lines.filter(
    (line) =>
      line.startsWith("not ok") ||
      line.includes("# Looks like you failed") ||
      line.includes("# Looks like you planned"),
  );
  const assertions = lines.filter(
    (line) => line.startsWith("ok ") || line.startsWith("not ok "),
  ).length;
  assert.ok(assertions > 0, `${label}: assertion evidence must not be empty`);
  outcomes.push({ label, assertions, failures: failed, expectedMutantFailure: mutant });
  process.stdout.write(
    `${label}: ${assertions} assertions, ${failed.length} failures${mutant ? " (mutant)" : ""}\n`,
  );
  await writeFile(
    path.join(reportDirectory, `b4-009-${mode}.json`),
    JSON.stringify(
      { mode, projectRef: "hprdctmblmfcoagugvyp", transaction: "rollback", outcomes },
      null,
      2,
    ) + "\n",
  );
  assert.equal(
    failed.length > 0,
    mutant,
    `${label}: unexpected pgTAP result: ${failed.join("\n")}`,
  );
}
if (mode === "after") {
  for (const file of (await readdir(path.join(root, "supabase/tests")))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await validate(
      file,
      migration,
      await readFile(path.join(root, "supabase/tests", file), "utf8"),
    );
  }
} else {
  await validate("baseline", migration, newTest);
  if (mode === "rehearsal") {
    for (const file of [
      "b4_007_facebook_page_oauth_test.sql",
      "b4_008_facebook_business_login_test.sql",
      "b2_009_authorization_test.sql",
    ]) {
      await validate(
        file,
        migration,
        await readFile(path.join(root, "supabase/tests", file), "utf8"),
      );
    }
  } else {
    const mutants = [
      [
        "allows-null-exchange-lease",
        "session_record.exchange_lease_token is distinct from target_exchange_lease_token",
        "session_record.exchange_lease_token <> target_exchange_lease_token",
      ],
      [
        "lost-session-mode",
        "    session_record.facebook_login_mode;",
        "    application_record.facebook_login_mode;",
      ],
      [
        "lost-mode-snapshot",
        "    application_record.facebook_login_mode,\n    statement_timestamp()",
        "    'business_integration_system_user',\n    statement_timestamp()",
      ],
      [
        "wrong-page-selection",
        "where value ->> 'id' = target_page_id;\n  else",
        "where value ->> 'id' = '409101';\n  else",
      ],
      [
        "skipped-mode-binding",
        "or bundle ->> 'token_type' is distinct from expected_mode",
        "or false",
      ],
      [
        "allows-null-credential",
        "or jsonb_typeof(credential -> 'access_token') is distinct from 'string'",
        "or false",
      ],
      [
        "allows-extra-credential-fields",
        "if field_name not in ('id','access_token') then",
        "if false then",
      ],
      [
        "allows-unselected-credential",
        "or not (bundle -> 'page_ids') ? (credential ->> 'id')",
        "or false",
      ],
      [
        "skips-ephemeral-deletion",
        "delete from vault.secrets where id = bundle_secret_id;",
        "perform 1;",
      ],
    ];
    for (const [label, find, replacement] of mutants) {
      assert.equal(migration.split(find).length, 2, `${label}: exact unique code target`);
      const marker = "-- B4-009 credential persistence journey";
      assert.ok(newTest.includes(marker));
      const mutantTest =
        label === "lost-mode-snapshot"
          ? newTest.slice(0, newTest.indexOf(marker)) +
            "select * from extensions.finish();\nrollback;\n"
          : newTest;
      await validate(label, migration.replace(find, replacement), mutantTest, true);
    }
  }
}
