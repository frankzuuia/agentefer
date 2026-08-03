import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");

const expectedPackages = new Map([
  ["apps/api", "@agentefer/api"],
  ["apps/web", "@agentefer/web"],
  ["apps/worker", "@agentefer/worker"],
  ["packages/ai", "@agentefer/ai"],
  ["packages/config", "@agentefer/config"],
  ["packages/contracts", "@agentefer/contracts"],
  ["packages/database", "@agentefer/database"],
  ["packages/domain", "@agentefer/domain"],
  ["packages/observability", "@agentefer/observability"],
]);

const allowedInternalDependencies = new Map([
  [
    "@agentefer/api",
    new Set([
      "@agentefer/config",
      "@agentefer/contracts",
      "@agentefer/database",
      "@agentefer/domain",
      "@agentefer/observability",
    ]),
  ],
  [
    "@agentefer/web",
    new Set([
      "@agentefer/config",
      "@agentefer/contracts",
      "@agentefer/domain",
      "@agentefer/observability",
    ]),
  ],
  [
    "@agentefer/worker",
    new Set([
      "@agentefer/ai",
      "@agentefer/config",
      "@agentefer/contracts",
      "@agentefer/database",
      "@agentefer/domain",
      "@agentefer/observability",
    ]),
  ],
  ["@agentefer/ai", new Set(["@agentefer/contracts", "@agentefer/observability"])],
  ["@agentefer/config", new Set()],
  ["@agentefer/contracts", new Set(["@agentefer/domain"])],
  ["@agentefer/database", new Set(["@agentefer/domain", "@agentefer/observability"])],
  ["@agentefer/domain", new Set()],
  ["@agentefer/observability", new Set()],
]);

const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

async function readManifest(manifestPath) {
  const content = await readFile(manifestPath, "utf8");
  return JSON.parse(content);
}

const rootManifest = await readManifest(path.join(repositoryRoot, "package.json"));

assert.equal(rootManifest.name, "@agentefer/root");
assert.equal(rootManifest.private, true);
assert.deepEqual([...rootManifest.workspaces].sort(), ["apps/*", "packages/*"]);

const discoveredPackages = new Map();

for (const workspaceRoot of ["apps", "packages"]) {
  const absoluteWorkspaceRoot = path.join(repositoryRoot, workspaceRoot);
  const entries = await readdir(absoluteWorkspaceRoot, {
    withFileTypes: true,
  });

  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const relativePackagePath = workspaceRoot + "/" + entry.name;
    const manifestPath = path.join(absoluteWorkspaceRoot, entry.name, "package.json");
    const manifest = await readManifest(manifestPath);
    discoveredPackages.set(relativePackagePath, manifest);
  }
}

assert.deepEqual([...discoveredPackages.keys()].sort(), [...expectedPackages.keys()].sort());

const packageNames = [];

for (const [relativePackagePath, manifest] of discoveredPackages) {
  const expectedName = expectedPackages.get(relativePackagePath);
  assert.equal(manifest.name, expectedName);
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, "module");
  assert.equal(manifest.engines?.node, rootManifest.engines.node);

  packageNames.push(manifest.name);

  const allowedDependencies = allowedInternalDependencies.get(manifest.name);
  assert.ok(allowedDependencies);

  for (const dependencySection of dependencySections) {
    const dependencies = Object.keys(manifest[dependencySection] ?? {});
    const internalDependencies = dependencies.filter((dependencyName) =>
      dependencyName.startsWith("@agentefer/"),
    );

    for (const dependencyName of internalDependencies) {
      assert.ok(
        allowedDependencies.has(dependencyName),
        manifest.name + " cannot depend on " + dependencyName,
      );
    }
  }
}

assert.equal(new Set(packageNames).size, expectedPackages.size);

console.log("AgenteFer workspace boundary verified: " + discoveredPackages.size + " packages.");
