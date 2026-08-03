import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const dependencySections = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
];

const readManifest = async (manifestPath) => JSON.parse(await readFile(manifestPath, "utf8"));

async function discoverWorkspaces() {
  const workspaces = new Map();

  for (const workspaceRoot of ["apps", "packages"]) {
    const absoluteRoot = path.join(repositoryRoot, workspaceRoot);
    const entries = await readdir(absoluteRoot, { withFileTypes: true });

    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      const directory = path.join(absoluteRoot, entry.name);
      const manifest = await readManifest(path.join(directory, "package.json"));

      if (workspaces.has(manifest.name)) {
        throw new Error(`Duplicate workspace name: ${manifest.name}`);
      }

      workspaces.set(manifest.name, { directory, manifest });
    }
  }

  return workspaces;
}

function internalDependencies(workspace, workspaces) {
  const names = new Set();

  for (const section of dependencySections) {
    for (const dependencyName of Object.keys(workspace.manifest[section] ?? {})) {
      if (workspaces.has(dependencyName)) {
        names.add(dependencyName);
      }
    }
  }

  return [...names].sort();
}

function collectRequiredDependencies(targetNames, workspaces) {
  const required = new Set();

  const collect = (workspaceName) => {
    const workspace = workspaces.get(workspaceName);
    if (workspace === undefined) {
      throw new Error(`Unknown workspace target: ${workspaceName}`);
    }

    for (const dependencyName of internalDependencies(workspace, workspaces)) {
      if (!required.has(dependencyName)) {
        required.add(dependencyName);
        collect(dependencyName);
      }
    }
  };

  for (const targetName of targetNames) {
    collect(targetName);
  }

  return required;
}

function topologicalBuildOrder(required, workspaces) {
  const permanent = new Set();
  const temporary = new Set();
  const order = [];

  const visit = (workspaceName) => {
    if (permanent.has(workspaceName)) {
      return;
    }
    if (temporary.has(workspaceName)) {
      throw new Error(`Internal workspace dependency cycle at ${workspaceName}`);
    }

    temporary.add(workspaceName);
    const workspace = workspaces.get(workspaceName);
    if (workspace === undefined) {
      throw new Error(`Unknown internal dependency: ${workspaceName}`);
    }

    for (const dependencyName of internalDependencies(workspace, workspaces)) {
      if (required.has(dependencyName)) {
        visit(dependencyName);
      }
    }

    temporary.delete(workspaceName);
    permanent.add(workspaceName);
    order.push(workspaceName);
  };

  for (const workspaceName of [...required].sort()) {
    visit(workspaceName);
  }

  return order;
}

async function buildWorkspace(workspaceName) {
  const npmCliPath = process.env.npm_execpath;
  if (npmCliPath === undefined) {
    throw new Error("Dependency preparation must run through an npm script");
  }

  const child = spawn(
    process.execPath,
    [npmCliPath, "run", "build", "--workspace", workspaceName],
    {
      cwd: repositoryRoot,
      stdio: "inherit",
      windowsHide: true,
    },
  );
  const [exitCode, signal] = await once(child, "exit");

  if (exitCode !== 0) {
    throw new Error(
      `Build failed for ${workspaceName} (exit=${String(exitCode)}, signal=${String(signal)})`,
    );
  }
}

const argumentsList = process.argv.slice(2);
const verifyOnly = argumentsList.includes("--verify");
const requestedTargets = argumentsList.filter((argument) => argument !== "--verify");
const workspaces = await discoverWorkspaces();
const targetNames = requestedTargets.length > 0 ? requestedTargets : [...workspaces.keys()];
const required = collectRequiredDependencies(targetNames, workspaces);
const buildOrder = topologicalBuildOrder(required, workspaces);

for (const workspaceName of buildOrder) {
  const workspace = workspaces.get(workspaceName);
  if (typeof workspace?.manifest.scripts?.build !== "string") {
    throw new Error(`Internal dependency ${workspaceName} does not define a build script`);
  }
}

if (verifyOnly) {
  console.log(
    `Internal dependency build graph verified: ${buildOrder.length} buildable workspace(s).`,
  );
} else {
  for (const workspaceName of buildOrder) {
    await buildWorkspace(workspaceName);
  }
}
