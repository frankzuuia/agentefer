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
  [
    "20260804001247_b2_001_database_foundation.sql",
    "20260804011126_b2_002_channels_messaging.sql",
    "20260809095510_b2_003_universal_catalog.sql",
    "20260809101909_b2_003_catalog_trigger_hardening.sql",
  ],
  "B2-001 through B2-003 must remain ordered, reviewable production migrations",
);

const foundationMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[0]),
  "utf8",
);
const messagingMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[1]),
  "utf8",
);
const catalogMigration = await readFile(path.join(migrationDirectory, migrationEntries[2]), "utf8");
const catalogTriggerHardeningMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[3]),
  "utf8",
);
const foundationDatabaseTest = await readFile(
  path.join(testDirectory, "b2_001_database_foundation_test.sql"),
  "utf8",
);
const messagingDatabaseTest = await readFile(
  path.join(testDirectory, "b2_002_channels_messaging_test.sql"),
  "utf8",
);
const catalogDatabaseTest = await readFile(
  path.join(testDirectory, "b2_003_universal_catalog_test.sql"),
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
const rootManifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const eslintConfiguration = await readFile(path.join(repositoryRoot, "eslint.config.mjs"), "utf8");

for (const [name, migration] of [
  ["B2-001", foundationMigration],
  ["B2-002", messagingMigration],
  ["B2-003", catalogMigration],
  ["B2-003 trigger hardening", catalogTriggerHardeningMigration],
]) {
  assert.ok(migration.startsWith("begin;\n"), `${name} migration must be atomic`);
  assert.ok(migration.trimEnd().endsWith("commit;"), `${name} migration must commit atomically`);
  assert.equal(
    migration.includes("create table public."),
    false,
    `${name} domain tables cannot be created in public`,
  );
}

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
  assert.ok(
    foundationMigration.includes(statement),
    `B2-001 database migration must include: ${statement}`,
  );
}

assert.equal(
  foundationMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  4,
  "all four B2-001 API views must preserve caller RLS",
);
assert.equal(
  foundationMigration.split("force row level security;").length - 1,
  4,
  "every B2-001 private relation must force RLS",
);
assert.equal(
  foundationMigration.includes("to anon"),
  false,
  "B2-001 cannot grant application access to anon",
);

const requiredMessagingMigrationStatements = [
  "create table app_private.channel_connections (",
  "create table app_private.contacts (",
  "create table app_private.channel_identities (",
  "create table app_private.inbound_events (",
  "create table app_private.conversations (",
  "create table app_private.conversation_participants (",
  "create table app_private.messages (",
  "create table app_private.message_delivery_events (",
  "create table app_private.consents (",
  "create table app_private.outbox_events (",
  "create unique index channel_connections_operational_sender_unique",
  "create constraint trigger conversations_require_primary_participant",
  "create constraint trigger conversation_participants_preserve_primary",
  "create policy channel_connections_admin_select",
  "create policy messages_operator_select",
  "create view api.channel_connections",
  "create view api.messages",
  "accepted inbound event evidence is immutable",
  "outbox effect scope and idempotency contract are immutable",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredMessagingMigrationStatements) {
  assert.ok(
    messagingMigration.includes(statement),
    `B2-002 database migration must include: ${statement}`,
  );
}

assert.equal(
  messagingMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  8,
  "all eight B2-002 API views must preserve caller RLS",
);
assert.equal(
  messagingMigration.split("force row level security;").length - 1,
  10,
  "every B2-002 private relation must force RLS",
);
assert.equal(
  messagingMigration.includes("to anon"),
  false,
  "B2-002 cannot grant application access to anon",
);
assert.equal(
  messagingMigration.includes("grant select on\n  app_private.inbound_events"),
  false,
  "authenticated cannot receive inbox access",
);

const requiredCatalogMigrationStatements = [
  "add constraint conversations_organization_id_id_unique",
  "add constraint messages_organization_id_id_unique",
  "create table app_private.catalog_categories (",
  "create table app_private.catalog_units (",
  "create table app_private.catalog_attribute_definitions (",
  "create table app_private.catalog_attribute_options (",
  "create table app_private.media_assets (",
  "create table app_private.catalog_evidence (",
  "create table app_private.products (",
  "create table app_private.product_variants (",
  "create table app_private.variant_skus (",
  "create table app_private.product_attribute_values (",
  "create table app_private.variant_attribute_values (",
  "create table app_private.catalog_ingestion_drafts (",
  "create table app_private.catalog_candidate_matches (",
  "create table app_private.catalog_resolution_decisions (",
  "create unique index variant_skus_organization_sku_unique",
  "create function app_private.validate_catalog_attribute_value()",
  "create function app_private.validate_resolution_decision()",
  "create policy products_member_select",
  "create policy catalog_ingestion_drafts_operator_select",
  "create view api.products",
  "create view api.catalog_ingestion_drafts",
  "adding a commercial category never requires a deploy",
  "storage paths and buckets belong to B2-010",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredCatalogMigrationStatements) {
  assert.ok(
    catalogMigration.includes(statement),
    `B2-003 database migration must include: ${statement}`,
  );
}

assert.equal(
  catalogMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  14,
  "all fourteen B2-003 API views must preserve caller RLS",
);
assert.equal(
  catalogMigration.split("force row level security;").length - 1,
  16,
  "every B2-003 private relation must force RLS",
);
assert.equal(
  catalogMigration.split("create policy ").length - 1,
  16,
  "every B2-003 private relation must define an authenticated read policy",
);
assert.equal(
  catalogMigration.includes("to anon"),
  false,
  "B2-003 cannot grant application access to anon",
);
for (const forbiddenDomainToken of ["tire", "wheel", "tinaco", "tambor", "llanta", "rin"]) {
  const compiledDomainToken = new RegExp(`(^|[^a-z])${forbiddenDomainToken}([^a-z]|$)`, "i");
  assert.equal(
    compiledDomainToken.test(catalogMigration),
    false,
    `B2-003 physical model cannot compile a commercial category: ${forbiddenDomainToken}`,
  );
}
for (const forbiddenStorageColumn of ["bucket_id", "object_path", "public_url", "signed_url"]) {
  assert.equal(
    catalogMigration.includes(forbiddenStorageColumn),
    false,
    `B2-003 cannot pre-empt the B2-010 storage lifecycle: ${forbiddenStorageColumn}`,
  );
}

const requiredCatalogTriggerHardeningStatements = [
  "drop function app_private.prevent_catalog_scope_reassignment();",
  "create function app_private.prevent_catalog_category_reassignment()",
  "create function app_private.prevent_catalog_unit_reassignment()",
  "create function app_private.prevent_product_reassignment()",
  "create function app_private.prevent_product_variant_reassignment()",
  "create function app_private.prevent_catalog_draft_reassignment()",
  "for each row execute function app_private.prevent_catalog_category_reassignment();",
  "for each row execute function app_private.prevent_catalog_unit_reassignment();",
  "for each row execute function app_private.prevent_product_reassignment();",
  "for each row execute function app_private.prevent_product_variant_reassignment();",
  "for each row execute function app_private.prevent_catalog_draft_reassignment();",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredCatalogTriggerHardeningStatements) {
  assert.ok(
    catalogTriggerHardeningMigration.includes(statement),
    `B2-003 trigger hardening migration must include: ${statement}`,
  );
}

const requiredFoundationTestStatements = [
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

for (const statement of requiredFoundationTestStatements) {
  assert.ok(
    foundationDatabaseTest.includes(statement),
    `B2-001 database test must include: ${statement}`,
  );
}

const requiredMessagingTestStatements = [
  "select extensions.plan(85);",
  "set constraints all deferred;",
  "set local role authenticated;",
  "set local role anon;",
  "set local role service_role;",
  "one operational sender cannot be assigned to two organizations",
  "duplicate webhook delivery is rejected per connection",
  "open conversation cannot commit without its primary participant",
  "outbox cannot process while policy is pending",
  "viewer cannot read customer PII",
  "service_role cannot delete message history",
  "select * from extensions.finish();",
];

for (const statement of requiredMessagingTestStatements) {
  assert.ok(
    messagingDatabaseTest.includes(statement),
    `B2-002 database test must include: ${statement}`,
  );
}

const requiredCatalogTestStatements = [
  "select extensions.plan(75);",
  "set constraints all immediate;",
  "set local role authenticated;",
  "set local role anon;",
  "set local role service_role;",
  "proposed LLM value cannot activate a variant",
  "SKU is unique per organization without case ambiguity",
  "retired SKU remains reserved and cannot be reused",
  "candidate from another draft cannot resolve ingestion",
  "viewer cannot read cognitive drafts or owner instructions",
  "service role cannot erase catalog product history",
  "select * from extensions.finish();",
];

for (const statement of requiredCatalogTestStatements) {
  assert.ok(
    catalogDatabaseTest.includes(statement),
    `B2-003 database test must include: ${statement}`,
  );
}

for (const [name, databaseTest] of [
  ["B2-001", foundationDatabaseTest],
  ["B2-002", messagingDatabaseTest],
  ["B2-003", catalogDatabaseTest],
]) {
  assert.ok(databaseTest.startsWith("begin;\n"), `${name} database tests must be transactional`);
  assert.ok(
    databaseTest.trimEnd().endsWith("rollback;"),
    `${name} database fixtures must roll back`,
  );
}

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
  "supabase/setup-cli@6ffe784b57613e98e0c04651e5fde0cec28cb1c9",
  "version: 2.111.0",
  "supabase db reset --local --no-seed",
  "supabase gen types typescript --local --schema app_private,api",
  'prettier --config "${GITHUB_WORKSPACE}/prettier.config.mjs"',
  "git diff --no-index --exit-code",
  "packages/database/src/database.types.ts",
  "actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a",
  "generated-database-types-${{ github.sha }}",
  "retention-days: 1",
  "supabase test db --local supabase/tests",
  "node ./scripts/verify-database-concurrency.mjs",
  "node ./scripts/verify-database-mutations.mjs",
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
for (const scriptName of ["build", "lint", "test", "typecheck"]) {
  assert.equal(
    typeof databaseManifest.scripts?.[scriptName],
    "string",
    `database package must define ${scriptName}`,
  );
}
assert.equal(
  rootManifest.scripts?.["database:types:linked"],
  "node ./scripts/sync-linked-database-types.mjs",
  "root package must expose controlled linked type synchronization",
);
assert.ok(
  eslintConfiguration.includes('"packages/database/src/database.types.ts"'),
  "only the canonical generated type file may bypass stylistic lint",
);

console.log(
  `Database contract verified: ${migrationEntries.length} ordered production migrations, 30 forced-RLS tables, 209 pgTAP assertions, generated TypeScript schemas locked.`,
);
