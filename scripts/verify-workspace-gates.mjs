import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const sourceDirectories = ["src", "app"];
const testDirectories = ["test", "tests", "__tests__"];
const codeExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);

const readManifest = async (manifestPath) => JSON.parse(await readFile(manifestPath, "utf8"));

const directoryContainsCode = async (directoryPath) => {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory() && (await directoryContainsCode(entryPath))) {
      return true;
    }
    if (entry.isFile() && codeExtensions.has(path.extname(entry.name))) {
      return true;
    }
  }

  return false;
};

const rootManifest = await readManifest(path.join(repositoryRoot, "package.json"));
const requiredRootScripts = [
  "format:check",
  "lint",
  "typecheck",
  "test",
  "build",
  "audit",
  "verify",
  "verify:ci-policy",
  "verify:documentation-contract",
];

for (const scriptName of requiredRootScripts) {
  assert.equal(
    typeof rootManifest.scripts?.[scriptName],
    "string",
    `root package is missing ${scriptName}`,
  );
}

assert.ok(
  rootManifest.scripts.test.includes("npm run verify:documentation-contract"),
  "the root test pipeline must execute the documentation contract",
);

const activeWorkspaces = [];
const deferredWorkspaces = [];

for (const workspaceRoot of ["apps", "packages"]) {
  const absoluteWorkspaceRoot = path.join(repositoryRoot, workspaceRoot);
  const workspaceEntries = await readdir(absoluteWorkspaceRoot, { withFileTypes: true });

  for (const entry of workspaceEntries.filter((candidate) => candidate.isDirectory())) {
    const workspacePath = path.join(absoluteWorkspaceRoot, entry.name);
    const manifest = await readManifest(path.join(workspacePath, "package.json"));
    const hasSource = (
      await Promise.all(
        sourceDirectories.map((directoryName) =>
          directoryContainsCode(path.join(workspacePath, directoryName)),
        ),
      )
    ).some(Boolean);
    const hasTests = (
      await Promise.all(
        testDirectories.map((directoryName) =>
          directoryContainsCode(path.join(workspacePath, directoryName)),
        ),
      )
    ).some(Boolean);

    if (!hasSource && !hasTests) {
      deferredWorkspaces.push(manifest.name);
      continue;
    }

    const requiredScripts = new Set(["lint", "typecheck", "build"]);
    if (hasTests) {
      requiredScripts.add("test");
    }

    for (const scriptName of requiredScripts) {
      assert.equal(
        typeof manifest.scripts?.[scriptName],
        "string",
        `${manifest.name} has code but is missing ${scriptName}`,
      );
      assert.ok(
        manifest.scripts[scriptName].trim().length > 0,
        `${manifest.name} has an empty ${scriptName} script`,
      );
    }

    activeWorkspaces.push(manifest.name);
  }
}

console.log(`Workspace quality gates verified: ${activeWorkspaces.join(", ")}.`);
console.log(`Structurally deferred empty workspaces: ${deferredWorkspaces.length}.`);
