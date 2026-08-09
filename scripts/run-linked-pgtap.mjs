import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildLinkedPgtapCollector } from "../packages/database/dist/linked-pgtap.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const requestedTest = process.argv[2] ?? "supabase/tests/b2_003_universal_catalog_test.sql";
const testPath = path.resolve(repositoryRoot, requestedTest);
const testRoot = `${path.join(repositoryRoot, "supabase", "tests")}${path.sep}`;
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "linked pgTAP runner must be invoked through npm");
const npxExecutable = path.join(path.dirname(npmExecutable), "npx-cli.js");
const npxCommand = process.execPath;
const npxArguments = [npxExecutable, "--yes", "supabase@2.111.0"];
const maxBuffer = 50 * 1024 * 1024;

assert.ok(testPath.startsWith(testRoot), "linked pgTAP file must stay inside supabase/tests");
assert.ok(testPath.endsWith(".sql"), "linked pgTAP file must use the .sql extension");

const projectRef = (
  await readFile(path.join(repositoryRoot, "supabase", ".temp", "project-ref"), "utf8")
).trim();
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
assert.equal(linkedProjects[0]?.ref, projectRef, "CLI linked ref must match local link state");
assert.equal(linkedProjects[0]?.name, "AgenteFer", "linked project must be AgenteFer");

const source = await readFile(testPath, "utf8");
const collectedSql = buildLinkedPgtapCollector(source);
const temporaryDirectory = path.join(repositoryRoot, "tmp");
const temporaryFile = path.join(temporaryDirectory, `linked-pgtap-${process.pid}.sql`);
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportFile = path.join(reportDirectory, "linked-pgtap-summary.json");

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
assert.equal(queryResult.status, 0, "linked pgTAP SQL execution must succeed");

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
      projectRef,
      test: path.relative(repositoryRoot, testPath).replaceAll(path.sep, "/"),
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

assert.ok(Number.isSafeInteger(plannedTests), "linked pgTAP output must contain a plan");
assert.equal(failedLines.length, 0, "linked pgTAP must have zero failures");
assert.equal(passedTests, plannedTests, "every planned linked pgTAP assertion must pass");

console.log(`Linked pgTAP verified: ${passedTests}/${plannedTests} passed on AgenteFer.`);
