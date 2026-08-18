import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedMigrationPgtapCollector } from "../packages/database/dist/linked-pgtap.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const explicitMigration = process.argv[2];
const explicitTest = process.argv[3];
const migrationDirectory = path.join(repositoryRoot, "supabase", "migrations");
const testDirectory = path.join(repositoryRoot, "supabase", "tests");
const migrationRoot = `${migrationDirectory}${path.sep}`;
const testRoot = `${testDirectory}${path.sep}`;
const expectedProjectRef = "hprdctmblmfcoagugvyp";
const expectedProjectName = "AgenteFer";
const npmExecutable = process.env.npm_execpath;
const maxBuffer = 50 * 1024 * 1024;

assert.ok(npmExecutable, "linked migration rehearsal must be invoked through npm");
assert.equal(
  explicitMigration === undefined,
  explicitTest === undefined,
  "migration and pgTAP test must be supplied together or selected automatically",
);

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

if (projectsResult.error) {
  throw projectsResult.error;
}
assert.equal(projectsResult.status, 0, "Supabase project identity query must succeed");

const projects = JSON.parse(projectsResult.stdout);
const linkedProjects = projects.filter((project) => project.linked === true);
assert.equal(linkedProjects.length, 1, "exactly one Supabase project must be linked");
assert.equal(linkedProjects[0]?.ref, expectedProjectRef, "CLI linked ref must be AgenteFer");
assert.equal(linkedProjects[0]?.name, expectedProjectName, "linked project must be AgenteFer");

const temporaryDirectory = path.join(repositoryRoot, "tmp");
await mkdir(temporaryDirectory, { recursive: true });

const selectPendingMigration = async () => {
  const historyFile = path.join(temporaryDirectory, `linked-migration-history-${process.pid}.sql`);
  await writeFile(
    historyFile,
    "select version from supabase_migrations.schema_migrations order by version;\n",
    "utf8",
  );

  let historyResult;
  try {
    historyResult = spawnSync(
      npxCommand,
      [
        ...npxArguments,
        "db",
        "query",
        "--linked",
        "--file",
        historyFile,
        "--output-format",
        "json",
      ],
      { cwd: repositoryRoot, encoding: "utf8", maxBuffer },
    );
  } finally {
    await rm(historyFile, { force: true });
  }

  assert.equal(historyResult.status, 0, "linked migration history query must succeed");
  const remoteVersions = new Set(
    JSON.parse(historyResult.stdout).rows.map((row) => String(row.version)),
  );
  const migrationFiles = (await readdir(migrationDirectory))
    .filter(
      (fileName) =>
        fileName.endsWith(".sql") &&
        fileName.length > 19 &&
        fileName[14] === "_" &&
        Array.from(fileName.slice(0, 14)).every(
          (character) => character >= "0" && character <= "9",
        ),
    )
    .sort();
  const pendingFiles = migrationFiles.filter(
    (fileName) => !remoteVersions.has(fileName.slice(0, 14)),
  );

  assert.equal(
    pendingFiles.length,
    1,
    "automatic linked rehearsal requires exactly one pending local migration",
  );
  const migrationFile = pendingFiles[0];
  assert.ok(migrationFile, "pending migration filename must exist");
  const testFile = `${migrationFile.slice(15, -4)}_test.sql`;

  return Object.freeze({
    migration: path.join("supabase", "migrations", migrationFile),
    test: path.join("supabase", "tests", testFile),
  });
};

const selected =
  explicitMigration === undefined
    ? await selectPendingMigration()
    : Object.freeze({ migration: explicitMigration, test: explicitTest });
const migrationPath = path.resolve(repositoryRoot, selected.migration);
const testPath = path.resolve(repositoryRoot, selected.test);

assert.ok(
  migrationPath.startsWith(migrationRoot),
  "migration must stay inside supabase/migrations",
);
assert.ok(testPath.startsWith(testRoot), "pgTAP test must stay inside supabase/tests");
assert.ok(migrationPath.endsWith(".sql"), "migration must use the .sql extension");
assert.ok(testPath.endsWith(".sql"), "pgTAP test must use the .sql extension");

const [migrationSource, testSource] = await Promise.all([
  readFile(migrationPath, "utf8"),
  readFile(testPath, "utf8"),
]);
const collectedSql = buildLinkedMigrationPgtapCollector(migrationSource, testSource);
const temporaryFile = path.join(
  temporaryDirectory,
  `linked-migration-rehearsal-${process.pid}.sql`,
);
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportFile = path.join(reportDirectory, "linked-migration-rehearsal.json");

await mkdir(temporaryDirectory, { recursive: true });
await writeFile(temporaryFile, collectedSql, "utf8");

let queryResult;
try {
  queryResult = spawnSync(
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

if (queryResult.error) {
  throw queryResult.error;
}
if (queryResult.status !== 0) {
  const diagnostic = `${queryResult.stdout ?? ""}\n${queryResult.stderr ?? ""}`
    .trim()
    .split("\n")
    .slice(-80)
    .join("\n");
  process.stderr.write(`${diagnostic}\n`);
}
assert.equal(queryResult.status, 0, "linked migration rehearsal must succeed");

const response = JSON.parse(queryResult.stdout);
const tapLines = response.rows.map((row) => row.result);
const failedLines = tapLines.filter(
  (line) => line.startsWith("not ok") || line.includes("# Looks like you failed"),
);
const planLine = tapLines.find((line) => line.startsWith("1.."));
const plannedTests = Number.parseInt(planLine?.slice(3) ?? "", 10);
const passedTests = tapLines.filter((line) => line.startsWith("ok ")).length;

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  reportFile,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projectName: expectedProjectName,
      projectRef: expectedProjectRef,
      migration: path.relative(repositoryRoot, migrationPath).replaceAll(path.sep, "/"),
      test: path.relative(repositoryRoot, testPath).replaceAll(path.sep, "/"),
      transactionOutcome: "rolled_back",
      plannedTests,
      passedTests,
      failedTests: failedLines.length,
      tapLines,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

if (failedLines.length > 0) {
  process.stderr.write(`${tapLines.join("\n")}\n`);
}

assert.ok(Number.isSafeInteger(plannedTests), "linked rehearsal output must contain a plan");
assert.equal(failedLines.length, 0, "linked migration pgTAP must have zero failures");
assert.equal(passedTests, plannedTests, "every linked migration pgTAP assertion must pass");

console.log(
  `Linked migration rehearsal verified: ${passedTests}/${plannedTests} passed and rolled back on ${expectedProjectName}.`,
);
