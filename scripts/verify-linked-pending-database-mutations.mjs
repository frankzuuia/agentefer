import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";
import { b4003aDatabaseMutants } from "./database-b4-003a-mutants.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const expectedProjectRef = "hprdctmblmfcoagugvyp";
const expectedProjectName = "AgenteFer";
const migrationRelativePath =
  "supabase/migrations/20260825094500_b4_003a_meta_whatsapp_inbound.sql";
const testRelativePath = "supabase/tests/b4_003a_meta_whatsapp_inbound_test.sql";
const npmExecutable = process.env.npm_execpath;
const maxBuffer = 50 * 1024 * 1024;

assert.ok(npmExecutable, "pending mutation testing must be invoked through npm");

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
const reportFile = path.join(reportDirectory, "linked-b4-003a-mutation-summary.json");
const outcomes = [];

await mkdir(temporaryDirectory, { recursive: true });

const mutateMigration = (mutant) => {
  if (mutant.sql !== undefined) {
    assert.equal(mutant.find, undefined, `${mutant.name} cannot mix SQL and source mutation`);
    return Object.freeze({ source: migrationSource, additionalSql: mutant.sql });
  }

  assert.equal(typeof mutant.find, "string", `${mutant.name} must define a source target`);
  assert.equal(
    typeof mutant.replacement,
    "string",
    `${mutant.name} must define a source replacement`,
  );
  const occurrences = migrationSource.split(mutant.find).length - 1;
  assert.equal(occurrences, 1, `${mutant.name} must target exactly one migration fragment`);

  return Object.freeze({
    source: migrationSource.replace(mutant.find, mutant.replacement),
    additionalSql: undefined,
  });
};

for (const [index, mutant] of b4003aDatabaseMutants.entries()) {
  const mutation = mutateMigration(mutant);
  const collectedSql = buildLinkedMigrationPgtapCollector(
    mutation.source,
    testSource,
    mutation.additionalSql,
  );
  const temporaryFile = path.join(
    temporaryDirectory,
    `linked-b4-003a-mutation-${process.pid}-${index}.sql`,
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

  if (result.error) {
    throw result.error;
  }

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

assert.equal(
  outcomes.length,
  b4003aDatabaseMutants.length,
  "every pending WhatsApp inbound database mutant must execute",
);
assert.ok(
  outcomes.every((outcome) => outcome.killed),
  "WhatsApp inbound pgTAP must kill every pending database mutant",
);

console.log(
  `Linked pending WhatsApp inbound mutation gate verified: ${outcomes.length}/${outcomes.length} killed (100%) and rolled back on ${expectedProjectName}.`,
);
