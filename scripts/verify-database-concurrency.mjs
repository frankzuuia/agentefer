import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const config = await readFile(path.join(repositoryRoot, "supabase", "config.toml"), "utf8");
const projectLine = config
  .split("\n")
  .map((line) => line.trim())
  .find((line) => line.startsWith('project_id = "'));

assert.equal(
  projectLine,
  'project_id = "agentefer"',
  "concurrency test requires AgenteFer local project",
);

const containerName = "supabase_db_agentefer";
const reportDirectory = path.join(repositoryRoot, "reports", "database-quality");
const reportPath = path.join(reportDirectory, "concurrency-summary.json");
const psqlArguments = (sql) => [
  "exec",
  containerName,
  "psql",
  "--no-psqlrc",
  "--set=ON_ERROR_STOP=1",
  "--username=postgres",
  "--dbname=postgres",
  "--tuples-only",
  "--no-align",
  "--command",
  sql,
];
const fixtureSql = `
begin;
insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values (
  '33000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'b2-003-concurrency@example.invalid',
  ''
);
set local role service_role;
insert into app_private.organizations (id, name)
values ('33000000-0000-4000-8000-000000000010', 'B2-003 Concurrency');
insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values (
  '33000000-0000-4000-8000-000000000011',
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000001',
  'owner',
  'active',
  now()
);
insert into app_private.catalog_categories (id, organization_id, code, name, status)
values (
  '33000000-0000-4000-8000-000000000100',
  '33000000-0000-4000-8000-000000000010',
  'concurrent_item',
  'Concurrent item',
  'active'
);
insert into app_private.products (id, organization_id, category_id, name)
values
  (
    '33000000-0000-4000-8000-000000000150',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000100',
    'Concurrent product A'
  ),
  (
    '33000000-0000-4000-8000-000000000151',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000100',
    'Concurrent product B'
  );
insert into app_private.product_variants (id, organization_id, product_id, name)
values
  (
    '33000000-0000-4000-8000-000000000160',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000150',
    'Concurrent variant A'
  ),
  (
    '33000000-0000-4000-8000-000000000161',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000151',
    'Concurrent variant B'
  );
commit;
`;

const runCaptured = (sql) =>
  new Promise((resolve, reject) => {
    const child = spawn("docker", psqlArguments(sql), {
      cwd: repositoryRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });

const runSync = (sql, capture = false) => {
  const result = spawnSync("docker", psqlArguments(sql), {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  assert.equal(result.status, 0, "concurrency fixture command must succeed");
  return result;
};

runSync(fixtureSql);

const firstWrite = runCaptured(`
begin;
set local role service_role;
insert into app_private.variant_skus (organization_id, variant_id, sku)
values (
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000160',
  'CONCURRENT-SKU'
);
select pg_sleep(2);
commit;
`);

await new Promise((resolve) => setTimeout(resolve, 250));

const secondWrite = runCaptured(`
begin;
set local role service_role;
insert into app_private.variant_skus (organization_id, variant_id, sku)
values (
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000161',
  'concurrent-sku'
);
commit;
`);

const results = await Promise.all([firstWrite, secondWrite]);
const successfulWrites = results.filter((result) => result.status === 0).length;
const failedWrites = results.filter((result) => result.status !== 0).length;
const countResult = runSync(
  `select count(*) from app_private.variant_skus
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and lower(sku) = 'concurrent-sku';`,
  true,
);
const persistedRows = Number.parseInt(countResult.stdout.trim(), 10);

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      successfulWrites,
      failedWrites,
      persistedRows,
      results: results.map((result) => ({
        status: result.status,
        diagnostic: `${result.stdout}\n${result.stderr}`.trim().split("\n").slice(-20).join("\n"),
      })),
    },
    null,
    2,
  )}\n`,
  "utf8",
);

assert.equal(successfulWrites, 1, "exactly one concurrent SKU write must commit");
assert.equal(failedWrites, 1, "exactly one concurrent SKU write must conflict");
assert.equal(persistedRows, 1, "concurrent conflict must leave exactly one SKU row");

console.log("Database concurrency verified: one commit, one conflict, one persisted SKU.");
