import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const startupTimeoutMs = 10_000;
const shutdownTimeoutMs = 5_000;
const diagnosticLimit = 8_192;

const selectOperatingSystemEnvironment = () => {
  const selected = {};
  for (const name of ["PATH", "Path", "SystemRoot", "WINDIR", "TEMP", "TMP"]) {
    const value = process.env[name];
    if (value !== undefined) {
      selected[name] = value;
    }
  }
  return selected;
};

const reserveTcpPort = async () => {
  const server = createServer();

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen({ host: "127.0.0.1", port: 0 }, resolve);
  });

  const address = server.address();
  assert.ok(address !== null && typeof address !== "string", "expected an ephemeral TCP address");

  await new Promise((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });

  return address.port;
};

const collectBoundedDiagnostics = (child) => {
  let diagnostics = "";
  const append = (chunk) => {
    diagnostics = `${diagnostics}${chunk.toString("utf8")}`.slice(-diagnosticLimit);
  };

  child.stdout.on("data", append);
  child.stderr.on("data", append);
  return () => diagnostics;
};

const waitForHealthy = async (child, baseUrl, diagnostics) => {
  const deadline = Date.now() + startupTimeoutMs;
  let lastFailure = "no response received";

  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`process exited before readiness\n${diagnostics()}`);
    }

    try {
      const response = await fetch(`${baseUrl}/health/ready`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) {
        assert.deepEqual(await response.json(), { status: "ready" });
        return;
      }
      lastFailure = `readiness returned HTTP ${String(response.status)}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : "unknown readiness error";
    }

    await delay(50);
  }

  throw new Error(`readiness timed out: ${lastFailure}\n${diagnostics()}`);
};

const stopProcess = async (child, exitPromise, diagnostics) => {
  assert.ok(child.kill("SIGTERM"), "failed to deliver SIGTERM to child process");

  const result = await Promise.race([
    exitPromise,
    delay(shutdownTimeoutMs).then(() => {
      throw new Error(`process did not stop after SIGTERM\n${diagnostics()}`);
    }),
  ]);

  if (process.platform !== "win32") {
    assert.deepEqual(
      result,
      { code: 0, signal: null },
      `process did not shut down gracefully\n${diagnostics()}`,
    );
  }
};

const verifyRuntime = async ({ name, entrypoint, environment, port }) => {
  const child = spawn(process.execPath, ["--enable-source-maps", entrypoint], {
    cwd: repositoryRoot,
    env: {
      ...selectOperatingSystemEnvironment(),
      NODE_ENV: "production",
      ...environment,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const diagnostics = collectBoundedDiagnostics(child);
  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  try {
    const baseUrl = `http://127.0.0.1:${String(port)}`;
    await waitForHealthy(child, baseUrl, diagnostics);

    const liveResponse = await fetch(`${baseUrl}/health/live`, {
      signal: AbortSignal.timeout(1_000),
    });
    assert.equal(liveResponse.status, 200);
    assert.deepEqual(await liveResponse.json(), { status: "live" });

    await stopProcess(child, exitPromise, diagnostics);
    console.log(`${name} process runtime verified on ephemeral TCP port.`);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await exitPromise;
    }
  }
};

const apiPort = await reserveTcpPort();
await verifyRuntime({
  name: "API",
  entrypoint: path.join(repositoryRoot, "apps", "api", "dist", "main.js"),
  port: apiPort,
  environment: {
    APP_ENV: "test",
    LOG_LEVEL: "error",
    API_HOST: "127.0.0.1",
    API_PORT: String(apiPort),
    API_PUBLIC_URL: `http://127.0.0.1:${String(apiPort)}`,
    WEB_PUBLIC_URL: "http://127.0.0.1:3000",
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PROJECT_REF: "agenteferprocesstest",
    SUPABASE_PUBLISHABLE_KEY: ["sb", "publishable", "process", "test", "only"].join("_"),
    SUPABASE_SECRET_KEY: ["sb", "secret", "api", "process", "test", "only"].join("_"),
  },
});

const workerPort = await reserveTcpPort();
await verifyRuntime({
  name: "Worker",
  entrypoint: path.join(repositoryRoot, "apps", "worker", "dist", "main.js"),
  port: workerPort,
  environment: {
    APP_ENV: "test",
    LOG_LEVEL: "error",
    WORKER_HEALTH_HOST: "127.0.0.1",
    WORKER_HEALTH_PORT: String(workerPort),
    SUPABASE_URL: "http://127.0.0.1:54321",
    SUPABASE_PROJECT_REF: "agenteferprocesstest",
    SUPABASE_SECRET_KEY: ["sb", "secret", "worker", "process", "test", "only"].join("_"),
    AI_MODEL: "future-provider:process-test-model",
    AI_MAX_OUTPUT_TOKENS: "8192",
    AI_TURN_TIMEOUT_MS: "120000",
    AI_MAX_TOOL_ROUNDS: "12",
    AI_CACHE_MODE: "auto",
    AI_FALLBACK_MODELS: "[]",
  },
});
