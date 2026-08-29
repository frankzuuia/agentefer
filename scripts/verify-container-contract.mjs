import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const approvedNodeImage =
  "node:24.18.0-bookworm-slim@sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d";
const dockerfilePaths = ["apps/api/Dockerfile", "apps/worker/Dockerfile"];
const containerTargets = new Map([
  ["apps/api/Dockerfile", "@agentefer/api"],
  ["apps/worker/Dockerfile", "@agentefer/worker"],
]);

const workspaceManifestPaths = [];
const workspaceManifestsByName = new Map();
for (const workspaceRoot of ["apps", "packages"]) {
  const entries = await readdir(path.join(repositoryRoot, workspaceRoot), {
    withFileTypes: true,
  });

  for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
    const manifestPath = `${workspaceRoot}/${entry.name}/package.json`;
    const manifest = JSON.parse(await readFile(path.join(repositoryRoot, manifestPath), "utf8"));
    assert.equal(typeof manifest.name, "string", `${manifestPath} must declare a workspace name`);
    workspaceManifestPaths.push(manifestPath);
    workspaceManifestsByName.set(manifest.name, {
      directoryPath: `${workspaceRoot}/${entry.name}`,
      manifestPath,
      productionDependencies: Object.keys(manifest.dependencies ?? {}),
    });
  }
}

workspaceManifestPaths.sort();
const dockerfilesByPath = new Map();

for (const relativeDockerfilePath of dockerfilePaths) {
  const dockerfile = await readFile(path.join(repositoryRoot, relativeDockerfilePath), "utf8");
  dockerfilesByPath.set(relativeDockerfilePath, dockerfile);

  assert.equal(
    dockerfile.split(`FROM ${approvedNodeImage}`).length - 1,
    2,
    `${relativeDockerfilePath} must pin the approved image in toolchain and runtime`,
  );
  assert.ok(
    dockerfile.includes("npm install --global npm@11.16.0 --ignore-scripts"),
    `${relativeDockerfilePath} must align the exact npm toolchain`,
  );
  assert.ok(
    dockerfile.includes("npm ci --omit=dev --ignore-scripts"),
    `${relativeDockerfilePath} must install a scriptless production tree`,
  );
  assert.ok(
    dockerfile.includes("FROM ") && dockerfile.includes(" AS runtime"),
    `${relativeDockerfilePath} must define a final runtime stage`,
  );
  assert.ok(dockerfile.includes("USER node"), `${relativeDockerfilePath} must run as node`);
  assert.ok(
    dockerfile.includes("STOPSIGNAL SIGTERM"),
    `${relativeDockerfilePath} must declare graceful termination`,
  );
  assert.ok(
    dockerfile.includes("HEALTHCHECK ") && dockerfile.includes("/health/ready"),
    `${relativeDockerfilePath} must probe readiness`,
  );
  assert.ok(
    dockerfile.includes('CMD ["node", "--enable-source-maps"'),
    `${relativeDockerfilePath} must use an exec-form Node command`,
  );
  assert.ok(!dockerfile.includes("COPY . ."), `${relativeDockerfilePath} cannot copy the repo`);
  assert.ok(!dockerfile.includes(":latest"), `${relativeDockerfilePath} cannot use latest tags`);

  for (const manifestPath of workspaceManifestPaths) {
    const copyInstruction = `COPY ${manifestPath} ./${manifestPath}`;
    assert.equal(
      dockerfile.split(copyInstruction).length - 1,
      2,
      `${relativeDockerfilePath} must copy ${manifestPath} in both dependency stages`,
    );
  }
}

const collectInternalProductionClosure = (rootWorkspaceName) => {
  const closure = new Set();
  const visit = (workspaceName) => {
    if (closure.has(workspaceName)) {
      return;
    }
    const workspace = workspaceManifestsByName.get(workspaceName);
    assert.ok(workspace, `container target ${workspaceName} must be a known workspace`);
    closure.add(workspaceName);
    for (const dependencyName of workspace.productionDependencies) {
      if (workspaceManifestsByName.has(dependencyName)) {
        visit(dependencyName);
      }
    }
  };
  visit(rootWorkspaceName);
  return [...closure].sort();
};

for (const [relativeDockerfilePath, targetWorkspaceName] of containerTargets) {
  const dockerfile = dockerfilesByPath.get(relativeDockerfilePath);
  assert.equal(typeof dockerfile, "string", `${relativeDockerfilePath} must be loaded`);

  for (const workspaceName of collectInternalProductionClosure(targetWorkspaceName)) {
    const workspace = workspaceManifestsByName.get(workspaceName);
    assert.ok(workspace, `${workspaceName} must remain available during container verification`);

    assert.ok(
      dockerfile.includes(`COPY ${workspace.directoryPath} ./${workspace.directoryPath}`),
      `${relativeDockerfilePath} build stage must copy production dependency ${workspaceName}`,
    );
    assert.ok(
      dockerfile.includes(`--workspace ${workspaceName}`),
      `${relativeDockerfilePath} production install must include ${workspaceName}`,
    );
    assert.ok(
      dockerfile.includes(
        `COPY --from=production-dependencies --chown=node:node /workspace/${workspace.manifestPath} ./${workspace.manifestPath}`,
      ),
      `${relativeDockerfilePath} runtime must include the manifest for ${workspaceName}`,
    );
    assert.ok(
      dockerfile.includes(
        `COPY --from=build --chown=node:node /workspace/${workspace.directoryPath}/dist ./${workspace.directoryPath}/dist`,
      ),
      `${relativeDockerfilePath} runtime must include the build for ${workspaceName}`,
    );
  }
}

const dockerIgnore = await readFile(path.join(repositoryRoot, ".dockerignore"), "utf8");
for (const requiredExclusion of [".git/", ".env.*", "**/node_modules/", "**/dist/"]) {
  assert.ok(
    dockerIgnore.split("\n").includes(requiredExclusion),
    `.dockerignore must contain ${requiredExclusion}`,
  );
}

const compose = await readFile(path.join(repositoryRoot, "compose.yaml"), "utf8");
for (const requiredControl of [
  "read_only: true",
  "no-new-privileges:true",
  "pids_limit: 256",
  "stop_grace_period: 30s",
]) {
  assert.equal(
    compose.split(requiredControl).length - 1,
    2,
    `compose must apply ${requiredControl} to both services`,
  );
}
assert.equal(
  compose.split("cap_drop:").length - 1,
  2,
  "compose must drop capabilities for both services",
);
assert.equal(
  compose.split("tmpfs:").length - 1,
  2,
  "compose must provide bounded temporary storage for both services",
);
assert.equal(compose.split("ports:").length - 1, 1, "only the API may publish a host port");
assert.ok(
  compose.includes('"127.0.0.1:${AGENTEFER_API_PORT:-3001}:3001"'),
  "local API binding must remain loopback-only",
);

const qualityWorkflow = await readFile(
  path.join(repositoryRoot, ".github", "workflows", "quality.yml"),
  "utf8",
);
for (const requiredApiRuntimeVariable of [
  "--env META_WEBHOOK_RPC_TIMEOUT_MS=100",
  "--env META_WEBHOOK_MAX_BODY_BYTES=1048576",
]) {
  assert.ok(
    qualityWorkflow.includes(requiredApiRuntimeVariable),
    `container CI must pass the required API runtime variable: ${requiredApiRuntimeVariable}`,
  );
}
for (const requiredWorkerRuntimeVariable of [
  "--env WORKER_META_INBOUND_ENABLED=false",
  "--env WORKER_WHATSAPP_AI_ENABLED=false",
  "--env WORKER_FACEBOOK_PUBLICATION_ENABLED=false",
]) {
  assert.ok(
    qualityWorkflow.includes(requiredWorkerRuntimeVariable),
    `container CI must pass the required worker runtime variable: ${requiredWorkerRuntimeVariable}`,
  );
}

console.log(
  `Container contract verified: ${dockerfilePaths.length} Dockerfiles, ${workspaceManifestPaths.length} workspace manifests.`,
);
