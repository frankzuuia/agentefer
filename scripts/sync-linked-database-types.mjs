import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

import prettierConfiguration from "../prettier.config.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const npmExecutable = process.env.npm_execpath;
assert.ok(npmExecutable, "database type synchronization must be invoked through npm");

const npxExecutable = path.join(path.dirname(npmExecutable), "npx-cli.js");
const npxArguments = [npxExecutable, "--yes", "supabase@2.111.0"];
const maxBuffer = 50 * 1024 * 1024;
const projectRef = (
  await readFile(path.join(repositoryRoot, "supabase", ".temp", "project-ref"), "utf8")
).trim();

const runSupabase = (arguments_) => {
  const result = spawnSync(process.execPath, [...npxArguments, ...arguments_], {
    cwd: repositoryRoot,
    encoding: "utf8",
    maxBuffer,
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`
      .trim()
      .split("\n")
      .slice(-80)
      .join("\n");
    throw new Error(`Supabase command failed without exposing credentials:\n${diagnostic}`);
  }
  return result.stdout;
};

const projects = JSON.parse(runSupabase(["projects", "list", "--output", "json"]));
const linkedProjects = projects.filter((project) => project.linked === true);
assert.equal(linkedProjects.length, 1, "exactly one Supabase project must be linked");
assert.equal(linkedProjects[0]?.ref, projectRef, "CLI linked ref must match local link state");
assert.equal(linkedProjects[0]?.name, "AgenteFer", "linked project must be AgenteFer");

const generatedTypes = runSupabase([
  "gen",
  "types",
  "typescript",
  "--linked",
  "--schema",
  "app_private,api",
]);
const targetPath = path.join(repositoryRoot, "packages", "database", "src", "database.types.ts");
const formattedTypes = await format(generatedTypes, {
  ...prettierConfiguration,
  filepath: targetPath,
});

assert.ok(formattedTypes.includes("  app_private: {"), "generated types need app_private schema");
assert.ok(formattedTypes.includes("  api: {"), "generated types need api schema");
assert.equal(
  formattedTypes.includes("  public: {"),
  false,
  "generated application types cannot expose public schema",
);

const currentTypes = await readFile(targetPath, "utf8");
const changed = currentTypes !== formattedTypes;
if (changed) {
  await writeFile(targetPath, formattedTypes, "utf8");
}

console.log(`Linked database types synchronized for AgenteFer; drift=${changed}.`);
