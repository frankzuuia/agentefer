import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";
import { b4DatabaseMutants } from "./database-b4-mutants.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const expectedProjectRef = "hprdctmblmfcoagugvyp";
const expectedProjectName = "AgenteFer";
const npmExecutable = process.env.npm_execpath;
const maxBuffer = 50 * 1024 * 1024;

assert.ok(npmExecutable, "linked database mutations must be invoked through npm");

const npxExecutable = path.join(path.dirname(npmExecutable), "npx-cli.js");
const npxCommand = process.execPath;
const npxArguments = [npxExecutable, "--yes", "supabase@2.111.0"];
const localProjectRef = (
  await readFile(path.join(repositoryRoot, "supabase", ".temp", "project-ref"), "utf8")
).trim();

assert.equal(localProjectRef, expectedProjectRef, "local Supabase link must be AgenteFer");

const projectsResult = spawnSync(
  npxCommand,
  [...npxArguments, "projects", "list", "--output", "json"],
  { cwd: repositoryRoot, encoding: "utf8", maxBuffer },
);
assert.equal(projectsResult.status, 0, "Supabase project identity query must succeed");

const linkedProjects = JSON.parse(projectsResult.stdout).filter(
  (project) => project.linked === true,
);
assert.equal(linkedProjects.length, 1, "exactly one Supabase project must be linked");
assert.equal(linkedProjects[0]?.ref, expectedProjectRef, "CLI linked ref must be AgenteFer");
assert.equal(linkedProjects[0]?.name, expectedProjectName, "linked project must be AgenteFer");

const temporaryDirectory = path.join(repositoryRoot, "tmp");
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportFile = path.join(reportDirectory, "linked-b4-mutation-summary.json");

await mkdir(temporaryDirectory, { recursive: true });

const executeSql = async (sql, suffix) => {
  const temporaryFile = path.join(
    temporaryDirectory,
    `linked-b4-mutation-${process.pid}-${suffix}.sql`,
  );
  await writeFile(temporaryFile, sql, "utf8");

  try {
    return spawnSync(
      npxCommand,
      [
        ...npxArguments,
        "db",
        "query",
        "--linked",
        "--file",
        temporaryFile,
        "--output-format",
        "json",
      ],
      { cwd: repositoryRoot, encoding: "utf8", maxBuffer },
    );
  } finally {
    await rm(temporaryFile, { force: true });
  }
};

const migrationsResult = await executeSql(
  "select version from supabase_migrations.schema_migrations order by version;\n",
  "history",
);
assert.equal(migrationsResult.status, 0, "linked migration identity query must succeed");
const appliedMigrationVersions = JSON.parse(migrationsResult.stdout).rows.map((row) =>
  String(row.version),
);
for (const requiredMigrationVersion of ["20260813192925", "20260813203100", "20260817173316"]) {
  assert.ok(
    appliedMigrationVersions.includes(requiredMigrationVersion),
    `linked B4 mutation testing requires applied migration ${requiredMigrationVersion}`,
  );
}

const testSources = new Map();
for (const test of new Set(b4DatabaseMutants.map((mutant) => mutant.test))) {
  const absoluteTestPath = path.resolve(repositoryRoot, test);
  assert.ok(
    absoluteTestPath.startsWith(`${path.join(repositoryRoot, "supabase", "tests")}${path.sep}`),
    `B4 mutation test must remain inside the AgenteFer Supabase test directory: ${test}`,
  );
  testSources.set(test, await readFile(absoluteTestPath, "utf8"));
}
const appliedSchemaSource = "begin; select 1; commit;";
const mutationPreflightTest = `
begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(1);
select extensions.ok(true, 'mutation SQL applied inside rollback');
select * from extensions.finish();
rollback;
`;
const outcomes = [];

for (const [index, mutant] of b4DatabaseMutants.entries()) {
  const preflightSql = buildLinkedMigrationPgtapCollector(
    appliedSchemaSource,
    mutationPreflightTest,
    mutant.sql,
  );
  const preflightResult = await executeSql(preflightSql, `${index}-preflight`);
  const preflightDiagnostic = `${preflightResult.stdout ?? ""}\n${preflightResult.stderr ?? ""}`
    .trim()
    .split("\n")
    .slice(-30)
    .join("\n");
  assert.equal(
    preflightResult.status,
    0,
    `B4 mutation must apply successfully before its test can kill it: ${mutant.name}\n${preflightDiagnostic}`,
  );

  const mutatedTestSql = buildLinkedMigrationPgtapCollector(
    appliedSchemaSource,
    testSources.get(mutant.test),
    mutant.sql,
  );
  const testResult = await executeSql(mutatedTestSql, `${index}-test`);
  let killed = testResult.status !== 0;
  let diagnostic;

  if (testResult.status === 0) {
    const response = JSON.parse(testResult.stdout);
    const tapLines = response.rows.map((row) => row.result);
    const failedLines = tapLines.filter(
      (line) => line.startsWith("not ok") || line.includes("# Looks like you failed"),
    );
    killed = failedLines.length > 0;
    diagnostic = failedLines.slice(-12).join("\n");
  } else {
    diagnostic = `${testResult.stdout ?? ""}\n${testResult.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(-20)
      .join("\n");
  }

  outcomes.push({ name: mutant.name, test: mutant.test, killed, diagnostic });
  process.stdout.write(`${killed ? "killed" : "survived"}: ${mutant.name}\n`);
}

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  reportFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projectName: expectedProjectName,
      projectRef: expectedProjectRef,
      transactionOutcome: "rolled_back_per_mutant",
      killed: outcomes.filter((outcome) => outcome.killed).length,
      total: outcomes.length,
      score:
        outcomes.length === 0
          ? 0
          : (outcomes.filter((outcome) => outcome.killed).length / outcomes.length) * 100,
      outcomes,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

assert.equal(outcomes.length, b4DatabaseMutants.length, "every B4 database mutant must execute");
assert.ok(
  outcomes.every((outcome) => outcome.killed),
  "B4 pgTAP must kill every linked database mutant",
);

console.log(
  `Linked B4 database mutation gate verified: ${outcomes.length}/${outcomes.length} killed (100%) and rolled back on ${expectedProjectName}.`,
);
