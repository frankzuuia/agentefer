import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "..");
const supabaseDirectory = path.join(repositoryRoot, "supabase");
const migrationDirectory = path.join(supabaseDirectory, "migrations");
const testDirectory = path.join(supabaseDirectory, "tests");

const migrationEntries = (await readdir(migrationDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

assert.deepEqual(
  migrationEntries,
  ["20260803233822_b2_001_database_foundation.sql"],
  "B2-001 must remain one ordered, reviewable production migration",
);

const migration = await readFile(path.join(migrationDirectory, migrationEntries[0]), "utf8");
const databaseTest = await readFile(
  path.join(testDirectory, "b2_001_database_foundation_test.sql"),
  "utf8",
);
const config = await readFile(path.join(supabaseDirectory, "config.toml"), "utf8");
const qualityWorkflow = await readFile(
  path.join(repositoryRoot, ".github", "workflows", "quality.yml"),
  "utf8",
);
const generatedTypes = await readFile(
  path.join(repositoryRoot, "packages", "database", "src", "database.types.ts"),
  "utf8",
);
const databaseIndex = await readFile(
  path.join(repositoryRoot, "packages", "database", "src", "index.ts"),
  "utf8",
);
const databaseManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "packages", "database", "package.json"), "utf8"),
);
const eslintConfiguration = await readFile(path.join(repositoryRoot, "eslint.config.mjs"), "utf8");

assert.ok(migration.startsWith("begin;\n"), "the migration must be atomic");
assert.ok(migration.trimEnd().endsWith("commit;"), "the migration must commit atomically");
assert.equal(
  migration.includes("create table public."),
  false,
  "domain tables cannot be created in public",
);

const requiredMigrationStatements = [
  "create schema app_private authorization postgres;",
  "create schema api authorization postgres;",
  "create table app_private.organizations (",
  "create table app_private.user_profiles (",
  "create table app_private.organization_memberships (",
  "create table app_private.business_profiles (",
  "alter table app_private.organizations force row level security;",
  "alter table app_private.user_profiles force row level security;",
  "alter table app_private.organization_memberships force row level security;",
  "alter table app_private.business_profiles force row level security;",
  "create policy organizations_member_select",
  "create policy user_profiles_self_select",
  "create policy organization_memberships_self_select",
  "create policy business_profiles_member_select",
  "with (security_invoker = true, security_barrier = true)",
  "revoke all on all tables in schema app_private from public, anon;",
  "revoke all on all tables in schema api from public, anon;",
  "organization requires at least one active owner",
  "create index organization_memberships_user_idx",
];

for (const statement of requiredMigrationStatements) {
  assert.ok(migration.includes(statement), `database migration must include: ${statement}`);
}

assert.equal(
  migration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  4,
  "all four API views must preserve caller RLS",
);
assert.equal(
  migration.split("force row level security;").length - 1,
  4,
  "every private relation must force RLS",
);
assert.equal(
  migration.includes("to anon"),
  false,
  "the database foundation cannot grant application access to anon",
);

const requiredTestStatements = [
  "select extensions.plan(49);",
  "set constraints all immediate;",
  "set local role authenticated;",
  "set local role anon;",
  "set local role service_role;",
  "RLS does not leak the second organization",
  "authenticated cannot mutate private tables directly",
  "the final active owner cannot be deleted",
  "select * from extensions.finish();",
];

for (const statement of requiredTestStatements) {
  assert.ok(databaseTest.includes(statement), `database test must include: ${statement}`);
}

assert.ok(databaseTest.startsWith("begin;\n"), "database tests must be transactional");
assert.ok(databaseTest.trimEnd().endsWith("rollback;"), "database fixtures must roll back");

const requiredConfigStatements = [
  'schemas = ["api", "graphql_public"]',
  'extra_search_path = ["api", "extensions"]',
  "[db.seed]",
  "sql_paths = []",
  "[experimental.pgdelta]",
];

for (const statement of requiredConfigStatements) {
  assert.ok(config.includes(statement), `Supabase config must include: ${statement}`);
}

const seedSection = config.slice(config.indexOf("[db.seed]"), config.indexOf("[realtime]"));
assert.ok(seedSection.includes("enabled = false"), "automatic database seeds must remain disabled");
const pgdeltaSection = config.slice(config.indexOf("[experimental.pgdelta]"));
assert.ok(pgdeltaSection.includes("enabled = false"), "experimental pgdelta must remain disabled");

const requiredWorkflowStatements = [
  "database:\n    name: Database contract",
  "supabase/setup-cli@ab058987d8d6c725971f6cf9d0b5c98467e30bd1",
  "version: 2.111.0",
  "supabase db reset --local --no-seed",
  "supabase gen types typescript --local --schema app_private,api",
  'prettier --config "${GITHUB_WORKSPACE}/prettier.config.mjs"',
  "git diff --no-index --exit-code",
  "packages/database/src/database.types.ts",
  "supabase test db --local supabase/tests",
  "supabase db lint --local --schema app_private,api --level warning --fail-on error",
  "supabase db advisors --local --type all --level warn --fail-on warn",
];

for (const statement of requiredWorkflowStatements) {
  assert.ok(qualityWorkflow.includes(statement), `database CI must include: ${statement}`);
}

for (const schema of ["api", "app_private"]) {
  assert.ok(generatedTypes.includes(`  ${schema}: {`), `generated types must include ${schema}`);
}
assert.equal(
  generatedTypes.includes("  public: {"),
  false,
  "generated application types cannot silently fall back to public",
);
for (const exportedType of [
  "CompositeTypes",
  "Database",
  "Enums",
  "Json",
  "Tables",
  "TablesInsert",
  "TablesUpdate",
]) {
  assert.ok(databaseIndex.includes(exportedType), `database package must export ${exportedType}`);
}
for (const scriptName of ["build", "lint", "typecheck"]) {
  assert.equal(
    typeof databaseManifest.scripts?.[scriptName],
    "string",
    `database package must define ${scriptName}`,
  );
}
assert.ok(
  eslintConfiguration.includes('"packages/database/src/database.types.ts"'),
  "only the canonical generated type file may bypass stylistic lint",
);

console.log(
  `Database contract verified: ${migrationEntries.length} production migration, 4 forced-RLS tables, 49 pgTAP assertions, generated TypeScript schemas locked.`,
);
