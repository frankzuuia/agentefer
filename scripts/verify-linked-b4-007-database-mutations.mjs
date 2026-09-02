import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";
import { b4007DatabaseMutants } from "./database-b4-007-mutants.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const expectedProjectRef = "hprdctmblmfcoagugvyp";
const expectedProjectName = "AgenteFer";
const migrationRelativePath = "supabase/migrations/20260901090000_b4_007_facebook_page_oauth.sql";
const testRelativePath = "supabase/tests/b4_007_facebook_page_oauth_test.sql";
const npmExecutable = process.env.npm_execpath;
const maxBuffer = 50 * 1024 * 1024;

assert.ok(npmExecutable, "B4-007 mutation testing must be invoked through npm");
const npxCommand = process.execPath;
const npxArguments = [
  path.join(path.dirname(npmExecutable), "npx-cli.js"),
  "--yes",
  "supabase@2.111.0",
];
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

const migrationPath = path.join(repositoryRoot, migrationRelativePath);
const testPath = path.join(repositoryRoot, testRelativePath);
const [migrationSource, testSource] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(testPath, "utf8"),
]);
const temporaryDirectory = path.join(repositoryRoot, "tmp");
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportFile = path.join(reportDirectory, "linked-b4-007-mutation-summary.json");
const outcomes = [];
await mkdir(temporaryDirectory, { recursive: true });

for (const [index, mutant] of b4007DatabaseMutants.entries()) {
  const occurrences = migrationSource.split(mutant.find).length - 1;
  assert.equal(occurrences, 1, `${mutant.name} must target exactly one migration fragment`);
  const mutatedSource = migrationSource.replace(mutant.find, mutant.replacement);
  const collectedSql = buildLinkedMigrationPgtapCollector(mutatedSource, testSource);
  const temporaryFile = path.join(
    temporaryDirectory,
    `linked-b4-007-mutation-${process.pid}-${index}.sql`,
  );
  await writeFile(temporaryFile, collectedSql, "utf8");

  let result;
  try {
    result = spawnSync(
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
  if (result.error) throw result.error;

  let killed = result.status !== 0;
  let diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
    .trim()
    .split("\n")
    .slice(-20)
    .join("\n");
  if (result.status === 0) {
    const tapLines = JSON.parse(result.stdout).rows.map((row) => row.result);
    const failedLines = tapLines.filter(
      (line) => line.startsWith("not ok") || line.includes("# Looks like you failed"),
    );
    killed = failedLines.length > 0;
    diagnostic = failedLines.slice(-12).join("\n");
  }
  outcomes.push({ name: mutant.name, killed, diagnostic });
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
      migration: migrationRelativePath,
      test: testRelativePath,
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

assert.ok(
  outcomes.every((outcome) => outcome.killed),
  "B4-007 pgTAP must kill every Facebook OAuth database mutant",
);
console.log(
  `Linked B4-007 database mutation gate verified: ${outcomes.length}/${outcomes.length} killed (100%) and rolled back on ${expectedProjectName}.`,
);
