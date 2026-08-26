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
    "20260809200347_b2_004_pricing.sql",
    "20260809201842_b2_004_monotonic_updated_at.sql",
    "20260810155350_b2_004_price_book_creator_index.sql",
    "20260811214250_b2_005_inventory.sql",
    "20260811230632_b2_006_commercial_workflow.sql",
    "20260812132809_b2_007_publication_workflow.sql",
    "20260812152500_b2_008_agent_runtime.sql",
    "20260813150805_b2_009_authorization_hardening.sql",
    "20260813152105_b2_009_service_role_least_privilege.sql",
    "20260813192925_b4_001_meta_vault_credentials.sql",
    "20260813203100_b4_001_constant_time_lint_hardening.sql",
    "20260817173316_b4_002_meta_webhook_ingress.sql",
    "20260820201112_b4_001b_meta_whatsapp_onboarding.sql",
    "20260820223000_b4_001c_meta_whatsapp_profile_least_privilege.sql",
    "20260825094500_b4_003a_meta_whatsapp_inbound.sql",
  ],
  "B2-001 through B4-003A must remain ordered, reviewable production migrations",
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
const pricingMigration = await readFile(path.join(migrationDirectory, migrationEntries[4]), "utf8");
const pricingTimestampHardeningMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[5]),
  "utf8",
);
const pricingIndexHardeningMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[6]),
  "utf8",
);
const inventoryMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[7]),
  "utf8",
);
const commercialMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[8]),
  "utf8",
);
const publicationMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[9]),
  "utf8",
);
const agentRuntimeMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[10]),
  "utf8",
);
const authorizationMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[11]),
  "utf8",
);
const serviceRoleLeastPrivilegeMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[12]),
  "utf8",
);
const metaVaultMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[13]),
  "utf8",
);
const metaVaultLintHardeningMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[14]),
  "utf8",
);
const metaWebhookIngressMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[15]),
  "utf8",
);
const metaWhatsAppOnboardingMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[16]),
  "utf8",
);
const metaWhatsAppProfileLeastPrivilegeMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[17]),
  "utf8",
);
const metaWhatsAppInboundMigration = await readFile(
  path.join(migrationDirectory, migrationEntries[18]),
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
const pricingDatabaseTest = await readFile(
  path.join(testDirectory, "b2_004_pricing_test.sql"),
  "utf8",
);
const inventoryDatabaseTest = await readFile(
  path.join(testDirectory, "b2_005_inventory_test.sql"),
  "utf8",
);
const commercialDatabaseTest = await readFile(
  path.join(testDirectory, "b2_006_commercial_workflow_test.sql"),
  "utf8",
);
const publicationDatabaseTest = await readFile(
  path.join(testDirectory, "b2_007_publication_workflow_test.sql"),
  "utf8",
);
const agentRuntimeDatabaseTest = await readFile(
  path.join(testDirectory, "b2_008_agent_runtime_test.sql"),
  "utf8",
);
const authorizationDatabaseTest = await readFile(
  path.join(testDirectory, "b2_009_authorization_test.sql"),
  "utf8",
);
const metaVaultDatabaseTest = await readFile(
  path.join(testDirectory, "b4_001_meta_vault_credentials_test.sql"),
  "utf8",
);
const metaWebhookIngressDatabaseTest = await readFile(
  path.join(testDirectory, "b4_002_meta_webhook_ingress_test.sql"),
  "utf8",
);
const metaWhatsAppOnboardingDatabaseTest = await readFile(
  path.join(testDirectory, "b4_001b_meta_whatsapp_onboarding_test.sql"),
  "utf8",
);
const metaWhatsAppProfileLeastPrivilegeDatabaseTest = await readFile(
  path.join(testDirectory, "b4_001c_meta_whatsapp_profile_least_privilege_test.sql"),
  "utf8",
);
const metaWhatsAppInboundDatabaseTest = await readFile(
  path.join(testDirectory, "b4_003a_meta_whatsapp_inbound_test.sql"),
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
const generatedApiTypes = generatedTypes.slice(
  generatedTypes.indexOf("  api: {"),
  generatedTypes.indexOf("  app_private: {"),
);
const databaseIndex = await readFile(
  path.join(repositoryRoot, "packages", "database", "src", "index.ts"),
  "utf8",
);
const databaseManifest = JSON.parse(
  await readFile(path.join(repositoryRoot, "packages", "database", "package.json"), "utf8"),
);
const rootManifest = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
const b4MutationCatalog = await readFile(
  path.join(repositoryRoot, "scripts", "database-b4-mutants.mjs"),
  "utf8",
);
const linkedB4MutationRunner = await readFile(
  path.join(repositoryRoot, "scripts", "verify-linked-database-mutations.mjs"),
  "utf8",
);
const b4001bMutationCatalog = await readFile(
  path.join(repositoryRoot, "scripts", "database-b4-001b-mutants.mjs"),
  "utf8",
);
const b4001cMutationCatalog = await readFile(
  path.join(repositoryRoot, "scripts", "database-b4-001c-mutants.mjs"),
  "utf8",
);
const b4003aMutationCatalog = await readFile(
  path.join(repositoryRoot, "scripts", "database-b4-003a-mutants.mjs"),
  "utf8",
);
const linkedB4003aMutationRunner = await readFile(
  path.join(repositoryRoot, "scripts", "verify-linked-pending-database-mutations.mjs"),
  "utf8",
);
const databaseConcurrencyScript = await readFile(
  path.join(repositoryRoot, "scripts", "verify-database-concurrency.mjs"),
  "utf8",
);
const eslintConfiguration = await readFile(path.join(repositoryRoot, "eslint.config.mjs"), "utf8");

for (const [name, migration] of [
  ["B2-001", foundationMigration],
  ["B2-002", messagingMigration],
  ["B2-003", catalogMigration],
  ["B2-003 trigger hardening", catalogTriggerHardeningMigration],
  ["B2-004", pricingMigration],
  ["B2-004 timestamp hardening", pricingTimestampHardeningMigration],
  ["B2-004 index hardening", pricingIndexHardeningMigration],
  ["B2-005", inventoryMigration],
  ["B2-006", commercialMigration],
  ["B2-007", publicationMigration],
  ["B2-008", agentRuntimeMigration],
  ["B2-009", authorizationMigration],
  ["B2-009 service-role least privilege", serviceRoleLeastPrivilegeMigration],
  ["B4-001 Meta Vault credentials", metaVaultMigration],
  ["B4-001 constant-time lint hardening", metaVaultLintHardeningMigration],
  ["B4-002 Meta webhook ingress", metaWebhookIngressMigration],
  ["B4-001B Meta WhatsApp onboarding", metaWhatsAppOnboardingMigration],
  ["B4-001C Meta WhatsApp profile least privilege", metaWhatsAppProfileLeastPrivilegeMigration],
  ["B4-003A Meta WhatsApp inbound", metaWhatsAppInboundMigration],
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

const requiredPricingMigrationStatements = [
  "create extension if not exists btree_gist with schema extensions;",
  "create table app_private.price_books (",
  "create table app_private.price_tiers (",
  "create unique index price_books_one_active_default_per_organization",
  "constraint price_tiers_no_current_overlap",
  "deferrable initially immediate",
  "create function app_private.validate_price_tier()",
  "create trigger price_tiers_validate",
  "create policy price_books_member_select",
  "create policy price_tiers_member_select",
  "create view api.price_books",
  "create view api.price_tiers",
  "create view api.price_tier_changes",
  "create function api.resolve_price_quote(",
  "pricing tiers are rows, never fixed quantity columns",
  "price interpretation belongs to LLM tool calling",
  "stock and package composition belong to B2-005",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredPricingMigrationStatements) {
  assert.ok(
    pricingMigration.includes(statement),
    `B2-004 database migration must include: ${statement}`,
  );
}

assert.equal(
  pricingMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  3,
  "all three B2-004 API views must preserve caller RLS",
);
assert.equal(
  pricingMigration.split("force row level security;").length - 1,
  2,
  "both B2-004 private relations must force RLS",
);
assert.equal(
  pricingMigration.split("create policy ").length - 1,
  2,
  "both B2-004 private relations must define an authenticated read policy",
);
assert.equal(
  pricingMigration.includes("to anon"),
  false,
  "B2-004 cannot grant application access to anon",
);
for (const forbiddenFixedPriceColumn of [
  "price_for_one",
  "price_for_two",
  "price_for_three",
  "price_for_four",
  "single_price",
  "package_price",
]) {
  assert.equal(
    pricingMigration.includes(forbiddenFixedPriceColumn),
    false,
    `B2-004 pricing cannot compile fixed commercial columns: ${forbiddenFixedPriceColumn}`,
  );
}

for (const statement of [
  "create or replace function app_private.set_updated_at()",
  "pg_catalog.clock_timestamp()",
  "old.updated_at + interval '1 microsecond'",
  "strictly monotonic row update timestamp",
]) {
  assert.ok(
    pricingTimestampHardeningMigration.includes(statement),
    `B2-004 timestamp hardening must include: ${statement}`,
  );
}

const requiredMetaVaultMigrationStatements = [
  "alter role authenticator set pgrst.db_schemas = 'api, graphql_public';",
  "create table app_private.meta_applications (",
  "create table app_private.meta_webhook_endpoints (",
  "create table app_private.meta_credential_versions (",
  "alter table app_private.meta_applications force row level security;",
  "alter table app_private.meta_webhook_endpoints force row level security;",
  "alter table app_private.meta_credential_versions force row level security;",
  "create function api.register_meta_application(",
  "create function api.rotate_meta_credential(",
  "create function api.verify_meta_webhook_challenge(",
  "create function api.verify_meta_webhook_signature(",
  "create function api.confirm_meta_webhook_verification(",
  "vault.create_secret(",
  "join vault.decrypted_secrets",
  "notify pgrst, 'reload config';",
];

for (const statement of requiredMetaVaultMigrationStatements) {
  assert.ok(
    metaVaultMigration.includes(statement),
    `B4-001 Meta Vault migration must include: ${statement}`,
  );
}
for (const forbiddenSchema of ["public", "app_private", "vault"]) {
  assert.equal(
    metaVaultMigration.includes(
      `alter role authenticator set pgrst.db_schemas = '${forbiddenSchema}'`,
    ),
    false,
    `B4-001 cannot expose ${forbiddenSchema} as its Data API schema set`,
  );
}
for (const hardeningStatement of [
  "create or replace function app_private.constant_time_bytea_equal(",
  "for byte_index in 0..(value_length - 1) loop",
  "get_byte(left_value, byte_index) # get_byte(right_value, byte_index)",
]) {
  assert.ok(
    metaVaultLintHardeningMigration.includes(hardeningStatement),
    `B4-001 lint hardening must include: ${hardeningStatement}`,
  );
}
assert.equal(
  metaVaultLintHardeningMigration.includes("byte_index integer;"),
  false,
  "B4-001 lint hardening cannot redeclare the implicit FOR-loop variable",
);

const requiredMetaWebhookIngressMigrationStatements = [
  "create table app_private.meta_webhook_deliveries (",
  "meta_webhook_deliveries_endpoint_payload_unique",
  "create function api.accept_meta_webhook_challenge(",
  "create function api.ingest_meta_webhook_delivery(",
  "from api.verify_meta_webhook_signature(",
  "payload_hash := extensions.digest(raw_body, 'sha256');",
  "on conflict on constraint meta_webhook_deliveries_endpoint_payload_unique do nothing",
  "alter table app_private.meta_webhook_deliveries force row level security;",
  "revoke all on app_private.meta_webhook_deliveries",
  "grant execute on function api.ingest_meta_webhook_delivery(uuid, text, text, text, text)",
  "notify pgrst, 'reload schema';",
];

for (const statement of requiredMetaWebhookIngressMigrationStatements) {
  assert.ok(
    metaWebhookIngressMigration.includes(statement),
    `B4-002 Meta webhook ingress migration must include: ${statement}`,
  );
}
for (const forbiddenStatement of [
  "create view api.meta_webhook_deliveries",
  "grant select on app_private.meta_webhook_deliveries to service_role",
  "grant insert on app_private.meta_webhook_deliveries to service_role",
]) {
  assert.equal(
    metaWebhookIngressMigration.includes(forbiddenStatement),
    false,
    `B4-002 cannot expose or bypass the private delivery inbox: ${forbiddenStatement}`,
  );
}

for (const statement of [
  "revoke select on app_private.meta_whatsapp_connection_profiles",
  "from authenticated;",
  "grant select (",
  "display_phone_number,",
  "last_validated_at",
  ") on app_private.meta_whatsapp_connection_profiles",
  "to authenticated;",
  "notify pgrst, 'reload schema';",
]) {
  assert.ok(
    metaWhatsAppProfileLeastPrivilegeMigration.includes(statement),
    `B4-001C Meta WhatsApp profile least-privilege migration must include: ${statement}`,
  );
}
for (const forbiddenColumn of ["created_at", "updated_at"]) {
  const grantBlock = metaWhatsAppProfileLeastPrivilegeMigration.slice(
    metaWhatsAppProfileLeastPrivilegeMigration.indexOf("grant select ("),
    metaWhatsAppProfileLeastPrivilegeMigration.indexOf(
      ") on app_private.meta_whatsapp_connection_profiles",
    ),
  );
  assert.equal(
    grantBlock.includes(forbiddenColumn),
    false,
    `B4-001C cannot grant authenticated access to internal profile column: ${forbiddenColumn}`,
  );
}

for (const statement of [
  "meta_webhook_deliveries_lease_shape_valid",
  "inbound_events_lease_shape_valid",
  "meta_webhook_deliveries_object_claim_idx",
  "inbound_events_type_claim_idx",
  "create function api.claim_meta_webhook_delivery(",
  "create function api.route_meta_whatsapp_delivery(",
  "create function api.fail_meta_webhook_delivery(",
  "create function api.claim_meta_whatsapp_message_event(",
  "create function api.normalize_meta_whatsapp_message(",
  "create function api.fail_meta_whatsapp_message_event(",
  "for update skip locked",
  "and connection_value.external_account_id = waba_id",
  "and connection_value.external_sender_id = phone_number_id",
  "target_now timestamptz := clock_timestamp();",
  "grant execute on function api.claim_meta_webhook_delivery(text, text, integer, integer)",
  "to service_role;",
  "notify pgrst, 'reload schema';",
]) {
  assert.ok(
    metaWhatsAppInboundMigration.includes(statement),
    `B4-003A Meta WhatsApp inbound migration must include: ${statement}`,
  );
}
for (const forbiddenStatement of [
  "grant execute on function api.claim_meta_webhook_delivery(text, text, integer, integer)\n  to authenticated",
  "grant execute on function api.normalize_meta_whatsapp_message(uuid, uuid)\n  to authenticated",
  "payload jsonb,\n  attempt_number integer",
]) {
  assert.equal(
    metaWhatsAppInboundMigration.includes(forbiddenStatement),
    false,
    `B4-003A cannot widen its private worker boundary: ${forbiddenStatement}`,
  );
}
assert.equal(
  metaWhatsAppInboundMigration.split("            available_at,").length - 1,
  2,
  "B4-003A must set explicit event availability for message and status routing",
);
assert.equal(
  metaWhatsAppInboundMigration.split(
    "            delivery_record.signature_verified_at,\n            delivery_record.first_received_at,",
  ).length - 1,
  2,
  "B4-003A event availability must equal the authenticated delivery receipt time",
);

const requiredMetaWhatsAppOnboardingMigrationStatements = [
  "create table app_private.meta_whatsapp_connection_profiles (",
  "create function api.register_meta_whatsapp_connection(",
  "create trigger meta_whatsapp_connection_profiles_validate_connection",
  "create trigger meta_whatsapp_connection_profiles_prevent_reassignment",
  "alter table app_private.meta_whatsapp_connection_profiles force row level security;",
  "create policy meta_whatsapp_connection_profiles_admin_select",
  "create view api.meta_whatsapp_connections",
  "or not normalized_scopes @> array[",
  "'whatsapp_business_management',",
  "'whatsapp_business_messaging'",
  "target_credential := app_private.insert_meta_credential_version(",
  "grant execute on function api.register_meta_whatsapp_connection(",
  "to service_role;",
  "notify pgrst, 'reload schema';",
];

for (const statement of requiredMetaWhatsAppOnboardingMigrationStatements) {
  assert.ok(
    metaWhatsAppOnboardingMigration.includes(statement),
    `B4-001B Meta WhatsApp onboarding migration must include: ${statement}`,
  );
}
for (const forbiddenStatement of [
  "grant execute on function api.register_meta_whatsapp_connection(\n  uuid, uuid, text, text, text, text, text, text, text, text[],\n  timestamptz, timestamptz, text, uuid, text, text\n) to authenticated",
  "target_access_token as access_token",
  "vault_secret_id",
]) {
  assert.equal(
    metaWhatsAppOnboardingMigration.includes(forbiddenStatement),
    false,
    `B4-001B cannot expose or delegate WhatsApp secrets: ${forbiddenStatement}`,
  );
}

for (const statement of [
  "create index price_books_created_by_user_idx",
  "on app_private.price_books (created_by_user_id)",
  "where created_by_user_id is not null",
  "without scanning every price book",
]) {
  assert.ok(
    pricingIndexHardeningMigration.includes(statement),
    `B2-004 index hardening must include: ${statement}`,
  );
}

const requiredInventoryMigrationStatements = [
  "create table app_private.inventory_items (",
  "create table app_private.inventory_locations (",
  "create table app_private.inventory_compositions (",
  "create table app_private.inventory_composition_components (",
  "create table app_private.inventory_commands (",
  "create table app_private.inventory_balances (",
  "create table app_private.inventory_operations (",
  "create table app_private.inventory_movements (",
  "create table app_private.inventory_reservations (",
  "create table app_private.inventory_reservation_lines (",
  "create table app_private.inventory_reservation_events (",
  "create table app_private.inventory_reservation_event_lines (",
  "available_quantity numeric generated always as",
  "create unique index inventory_compositions_one_active_offer_unit",
  "create index inventory_reservations_open_expiration_idx",
  "create function app_private.claim_inventory_command(",
  "order by balance.inventory_item_id, balance.location_id",
  "for update of balance",
  "create function api.apply_inventory_movement(",
  "create function api.apply_inventory_composition_movement(",
  "create function api.create_inventory_reservation(",
  "create function api.create_inventory_composition_reservation(",
  "create function api.transition_inventory_reservation(",
  "create function api.resolve_inventory_requirements(",
  "create view api.inventory_composition_availability",
  "inventory idempotency key was reused with a different request",
  "intent interpretation belongs to LLM tool calling",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredInventoryMigrationStatements) {
  assert.ok(
    inventoryMigration.includes(statement),
    `B2-005 database migration must include: ${statement}`,
  );
}

assert.equal(
  inventoryMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  13,
  "all thirteen B2-005 API views must preserve caller RLS",
);
assert.equal(
  inventoryMigration.split("force row level security;").length - 1,
  12,
  "all twelve B2-005 private relations must force RLS",
);
assert.equal(
  inventoryMigration.split("create policy ").length - 1,
  12,
  "every B2-005 private relation must define an authenticated read policy",
);
assert.equal(
  inventoryMigration.includes("to anon"),
  false,
  "B2-005 cannot grant application access to anon",
);
for (const forbiddenProductSpecificColumn of [
  "tire_size",
  "rim_size",
  "tank_capacity",
  "with_rim",
  "without_rim",
]) {
  assert.equal(
    inventoryMigration.includes(forbiddenProductSpecificColumn),
    false,
    `B2-005 inventory cannot compile product-specific column: ${forbiddenProductSpecificColumn}`,
  );
}

const requiredCommercialMigrationStatements = [
  "create table app_private.commercial_commands (",
  "create table app_private.contact_methods (",
  "create table app_private.pending_requests (",
  "create table app_private.leads (",
  "create table app_private.lead_interests (",
  "create table app_private.opportunities (",
  "create table app_private.conversation_assignments (",
  "create table app_private.handoffs (",
  "create table app_private.orders (",
  "create table app_private.order_lines (",
  "create table app_private.order_reservation_links (",
  "create table app_private.sales (",
  "create table app_private.sale_lines (",
  "create table app_private.commercial_events (",
  "value_ciphertext bytea not null",
  "reverses_sale_line_id uuid",
  "create unique index conversation_assignments_one_active_conversation",
  "create unique index handoffs_one_pending_opportunity",
  "create function app_private.claim_commercial_command(",
  "create function app_private.assert_sale_inventory_operation(",
  "create function app_private.validate_sale_line_reference()",
  "create function api.create_pending_request(",
  "create function api.resolve_pending_request(",
  "create function api.create_handoff(",
  "create function api.transition_handoff(",
  "create function api.create_order(",
  "create function api.record_sale(",
  "create function api.reconcile_sale_inventory(",
  "notification_channel_connection_id uuid",
  "handoff target is already the active assignee",
  "sale would exceed remaining order quantity",
  "reversal would exceed unreversed original quantity",
  "sale amount must match the immutable order quote",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredCommercialMigrationStatements) {
  assert.ok(
    commercialMigration.includes(statement),
    `B2-006 database migration must include: ${statement}`,
  );
}

assert.equal(
  commercialMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  14,
  "all fourteen B2-006 API views must preserve caller RLS",
);
assert.equal(
  commercialMigration.split("force row level security;").length - 1,
  14,
  "all fourteen B2-006 private relations must force RLS",
);
assert.equal(
  commercialMigration.split("create policy ").length - 1,
  14,
  "every B2-006 private relation must define an authenticated read policy",
);
assert.equal(
  commercialMigration.includes("revoke all on all functions in schema"),
  false,
  "B2-006 cannot revoke previously certified API functions globally",
);
for (const forbiddenCommercialState of [
  "payment_status",
  "paid_at",
  "tax_amount",
  "shipping_amount",
]) {
  assert.equal(
    commercialMigration.includes(forbiddenCommercialState),
    false,
    `B2-006 cannot fabricate undecided payment, tax or shipping state: ${forbiddenCommercialState}`,
  );
}

const requiredPublicationMigrationStatements = [
  "create table app_private.publication_commands (",
  "create table app_private.social_connections (",
  "create table app_private.social_capabilities (",
  "create table app_private.publications (",
  "create table app_private.publication_versions (",
  "create table app_private.publication_media (",
  "create table app_private.publication_schedules (",
  "create table app_private.publication_batches (",
  "create table app_private.publication_jobs (",
  "create table app_private.publication_instances (",
  "create table app_private.publication_events (",
  "constraint publication_jobs_external_effect_unique unique",
  "create unique index publications_one_operational_offer",
  "create unique index publication_batches_schedule_occurrence_unique",
  "create trigger social_capabilities_reject_update",
  "create trigger publication_versions_prevent_rewrite",
  "create trigger publication_jobs_prevent_core_rewrite",
  "create trigger publication_instances_validate",
  "create trigger publication_events_reject_update",
  "create function api.register_social_connection(",
  "create function api.observe_social_capability(",
  "create function api.create_publication(",
  "create function api.create_publication_version(",
  "create function api.approve_publication_version(",
  "create function api.create_publication_schedule(",
  "create function api.enqueue_publication_batch(",
  "create function api.claim_publication_job(",
  "create function api.authorize_publication_job(",
  "create function api.mark_publication_effect_started(",
  "create function api.record_publication_job_result(",
  "create function api.recover_expired_publication_job(",
  "create function api.cancel_publication_batch(",
  "create function api.reconcile_publication_batch(",
  "catalog_snapshot_stale",
  "price_snapshot_stale",
  "stock_unavailable",
  "worker_lost_after_effect_started",
  "publication_batches_connection_fk_idx",
  "publication_instances_version_fk_idx",
  "publication_jobs_version_scope_fk_idx",
  "from public, anon, authenticated, service_role;",
];

for (const statement of requiredPublicationMigrationStatements) {
  assert.ok(
    publicationMigration.includes(statement),
    `B2-007 database migration must include: ${statement}`,
  );
}

assert.equal(
  publicationMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  13,
  "all thirteen B2-007 API views must preserve caller RLS",
);
assert.equal(
  publicationMigration.split("force row level security;").length - 1,
  11,
  "all eleven B2-007 private relations must force RLS",
);
assert.equal(
  publicationMigration.split("create policy ").length - 1,
  11,
  "every B2-007 private relation must define an authenticated read policy",
);
assert.equal(
  publicationMigration.includes("revoke all on all functions in schema"),
  false,
  "B2-007 cannot revoke previously certified API functions globally",
);

const socialConnectionView = publicationMigration.slice(
  publicationMigration.indexOf("create view api.social_connections"),
  publicationMigration.indexOf("create view api.social_capabilities"),
);
assert.equal(
  socialConnectionView.includes("credential_reference"),
  false,
  "B2-007 social connection API view cannot expose credential references",
);

for (const forbiddenProductSpecificColumn of [
  "tire_size",
  "rim_size",
  "tank_capacity",
  "with_rim",
  "without_rim",
]) {
  assert.equal(
    publicationMigration.includes(forbiddenProductSpecificColumn),
    false,
    `B2-007 publications cannot compile product-specific column: ${forbiddenProductSpecificColumn}`,
  );
}

const requiredAgentRuntimeMigrationStatements = [
  "create table app_private.agent_commands (",
  "create table app_private.business_configurations (",
  "create table app_private.business_configuration_versions (",
  "create table app_private.prompt_versions (",
  "create table app_private.tool_contracts (",
  "create table app_private.tool_contract_versions (",
  "create table app_private.agent_policies (",
  "create table app_private.agent_policy_versions (",
  "create table app_private.agent_policy_tools (",
  "create table app_private.conversation_agent_snapshots (",
  "create table app_private.agent_runs (",
  "create table app_private.agent_run_configurations (",
  "create table app_private.agent_messages (",
  "create table app_private.agent_jobs (",
  "create table app_private.job_attempts (",
  "create table app_private.tool_executions (",
  "create table app_private.usage_events (",
  "create table app_private.error_events (",
  "create table app_private.memory_entries (",
  "create table app_private.audit_events (",
  "create function api.create_business_configuration_version(",
  "create function api.rollback_business_configuration(",
  "create function api.register_prompt_version(",
  "create function api.register_tool_contract_version(",
  "create function api.create_agent_policy_version(",
  "create function api.enqueue_agent_run(",
  "create function api.claim_agent_job(",
  "create function api.start_agent_job_attempt(",
  "create function api.append_agent_message(",
  "create function api.propose_tool_execution(",
  "create function api.authorize_tool_execution(",
  "create function api.mark_tool_effect_started(",
  "create function api.record_tool_execution_result(",
  "create function api.resume_agent_run_after_tools(",
  "create function api.record_usage_event(",
  "create function api.record_error_event(",
  "create function api.record_agent_attempt_result(",
  "create function api.recover_expired_agent_job(",
  "agent_model_route_is_valid",
  "conversation is pinned to a different agent policy",
  "tool_emergency_disabled",
  "cost_budget_not_authorized",
  "external_effect_uncertain",
  "job_attempts_job_run_fk_idx",
];

for (const statement of requiredAgentRuntimeMigrationStatements) {
  assert.ok(
    agentRuntimeMigration.includes(statement),
    `B2-008 database migration must include: ${statement}`,
  );
}

assert.equal(
  agentRuntimeMigration.split("with (security_invoker = true, security_barrier = true)").length - 1,
  20,
  "all twenty B2-008 API views must preserve caller RLS",
);
assert.equal(
  agentRuntimeMigration.split("force row level security;").length - 1,
  20,
  "all twenty B2-008 private relations must force RLS",
);
assert.equal(
  agentRuntimeMigration.split("create policy ").length - 1,
  20,
  "every B2-008 private relation must define an authenticated read policy",
);
assert.equal(
  agentRuntimeMigration.split("create function api.").length - 1,
  18,
  "B2-008 must expose exactly eighteen service-only runtime RPCs",
);
assert.equal(
  agentRuntimeMigration.includes("revoke all on all functions in schema"),
  false,
  "B2-008 cannot revoke previously certified API functions globally",
);
for (const forbiddenProviderBinding of ["gpt-", "MiniMax-M", "luna-medium"]) {
  assert.equal(
    agentRuntimeMigration.includes(forbiddenProviderBinding),
    false,
    `B2-008 schema cannot hardcode provider model identity: ${forbiddenProviderBinding}`,
  );
}

const requiredAuthorizationMigrationStatements = [
  "alter default privileges for role postgres\n  revoke execute on functions from public;",
  "alter default privileges for role postgres in schema app_private",
  "revoke all on all tables in schema app_private from public, anon, authenticated, service_role;",
  "revoke all on all functions in schema api from public, anon, authenticated, service_role;",
  "from information_schema.view_column_usage as usage",
  "grant select (%s) on table %I.%I to authenticated",
  "grant select, insert, update, delete on all tables in schema app_private to service_role;",
  "has_sequence_privilege('anon', relation.oid, 'USAGE')",
  "B2-009 postflight detected authenticated columns outside the API projection",
  "grant execute on function api.resolve_price_quote(",
  "grant execute on function api.resolve_inventory_requirements(",
];

for (const statement of requiredAuthorizationMigrationStatements) {
  assert.ok(
    authorizationMigration.includes(statement),
    `B2-009 authorization migration must include: ${statement}`,
  );
}
assert.equal(
  authorizationMigration.includes("grant all on all tables in schema app_private to authenticated"),
  false,
  "B2-009 cannot grant browser identities blanket private-table access",
);
assert.equal(
  authorizationMigration.includes("grant usage on schema api to anon"),
  false,
  "B2-009 cannot expose the tenant API schema anonymously",
);

for (const statement of [
  "revoke all on all tables in schema app_private from service_role;",
  "grant select on all tables in schema app_private to service_role;",
  "B2-009 service-role INSERT matrix diverged",
  "B2-009 service-role UPDATE matrix diverged",
  "B2-009 service-role DELETE matrix diverged",
  "B2-009 service-role received unsafe table privileges",
  "B2-009 service-role received unneeded sequence privileges",
]) {
  assert.ok(
    serviceRoleLeastPrivilegeMigration.includes(statement),
    `B2-009 service-role correction must include: ${statement}`,
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

const requiredPricingTestStatements = [
  "select extensions.plan(66);",
  "set local role authenticated;",
  "set local role anon;",
  "set local role service_role;",
  "four-unit package keeps its explicit total instead of deriving 6800",
  "open quantity tier supports arbitrary permitted quantities",
  "overlapping quantity and validity are rejected without priority guessing",
  "typed audit view preserves the previous amount",
  "anonymous quote resolution remains disabled before B6",
  "service role cannot erase price tier history",
  "every B2-004 foreign key column is indexed",
  "select * from extensions.finish();",
];

for (const statement of requiredPricingTestStatements) {
  assert.ok(
    pricingDatabaseTest.includes(statement),
    `B2-004 database test must include: ${statement}`,
  );
}

const requiredInventoryTestStatements = [
  "select extensions.plan(110);",
  "set local role authenticated;",
  "set local role service_role;",
  "set local role postgres;",
  "same command replays despite input line order",
  "movement cannot make stock negative",
  "package allocation must exactly match every declared component",
  "absolute count cannot reduce stock below active reservations",
  "partial reservation consumption commits",
  "reservation cannot expire before its deadline",
  "package reservation supports explicit multi-location allocation",
  "service role cannot edit balance projection directly",
  "RLS does not leak another organization inventory",
  "every B2-005 foreign key column is indexed",
  "select * from extensions.finish();",
];

for (const statement of requiredInventoryTestStatements) {
  assert.ok(
    inventoryDatabaseTest.includes(statement),
    `B2-005 database test must include: ${statement}`,
  );
}

const requiredCommercialTestStatements = [
  "select extensions.plan(97);",
  "set local role authenticated;",
  "set local role service_role;",
  "set local role postgres;",
  "same pending request command replays",
  "resolution does not falsely claim message delivery",
  "lead captures multiple interests without fabricating catalog identity",
  "pending handoff does not change responsibility",
  "handoff cannot target the already active assignee",
  "checkout does not fabricate a sale",
  "on-request order remains pending_quote with null amounts",
  "sale cannot exceed remaining order quantity",
  "cumulative reversals cannot exceed original sale line quantity",
  "ordinary sale cannot receive a line that claims to reverse history",
  "pending sale inventory can be reconciled with one exact physical operation",
  "real inventory operation with wrong direction cannot reconcile sale",
  "web order notification can use Fer channel independently from order origin",
  "RLS does not leak another organization orders",
  "every B2-006 foreign key column is indexed",
  "select * from extensions.finish();",
];

for (const statement of requiredCommercialTestStatements) {
  assert.ok(
    commercialDatabaseTest.includes(statement),
    `B2-006 database test must include: ${statement}`,
  );
}

const requiredPublicationTestStatements = [
  "select extensions.plan(83);",
  "set local role authenticated;",
  "set local role service_role;",
  "set local role postgres;",
  "every B2-007 foreign key column is indexed",
  "viewer cannot approve content for external publication",
  "last-moment authorization allows current connection capability price and stock",
  "refresh preserves both provider instances for audit and lead attribution",
  "provider revocation blocks a previously queued job before effect start",
  "expired lease before effect start is safely retryable",
  "expired lease after effect start becomes uncertain and is never blindly retried",
  "same schedule occurrence replays without duplicate jobs",
  "queued publication is blocked when its exact price tier was superseded",
  "tracked zero stock blocks a queued publication before provider effect",
  "catalog change after version approval blocks stale publication content",
  "unknown external effect key cannot be enqueued again for a blind retry",
  "publication job effect contract cannot be rewritten after enqueue",
  "publication instance rejects a different connection than its exact processing job",
  "publication current version cannot point to an unapproved draft",
  "RLS hides every other organization publication",
  "select * from extensions.finish();",
];

for (const statement of requiredPublicationTestStatements) {
  assert.ok(
    publicationDatabaseTest.includes(statement),
    `B2-007 database test must include: ${statement}`,
  );
}

const requiredAgentRuntimeTestStatements = [
  "select extensions.plan(84);",
  "set local role authenticated;",
  "set local role postgres;",
  "every B2-008 foreign key column is indexed",
  "owner run accepts an arbitrary future model and independent vision model",
  "fallback ordinal resolves exact MiniMax family model from frozen route",
  "contact cannot execute the owner-only administrative tool",
  "unknown provider cost is recorded as unknown and never fabricated as zero",
  "identical tool result replay does not repeat an external effect",
  "expired lease before an external effect is safely retryable",
  "expired lease after external start halts instead of blind retry",
  "crashed external tool is terminally marked uncertain rather than left executing",
  "later configuration activation does not silently alter an existing conversation",
  "authenticated owner cannot read private prompt body directly",
  "RLS prevents another organization owner from observing runtime rows",
  "select * from extensions.finish();",
];

for (const statement of requiredAgentRuntimeTestStatements) {
  assert.ok(
    agentRuntimeDatabaseTest.includes(statement),
    `B2-008 database test must include: ${statement}`,
  );
}

const requiredAuthorizationTestStatements = [
  "select extensions.plan(82);",
  "set local role authenticated;",
  "set local role anon;",
  "set local role service_role;",
  "owner does not receive another organization business",
  "operator cannot see admin-class rows",
  "viewer cannot see operator-class rows",
  "suspended member cannot see member-class rows",
  "invited member cannot see tenant data before activation",
  "authenticated cannot execute mutating worker RPCs",
  "authenticated cannot read the hidden prompt template column",
  "service_role cannot read tenant Vault references from credential metadata",
  "tenant Vault references are absent from the Data API projection",
  "new API functions require an explicit authenticated signature grant",
  "service_role can insert only into the 36 reviewed entry tables",
  "service_role can update only the 29 reviewed mutable tables",
  "service_role can delete only from the four reviewed foundation tables",
  "no third application routine is executable by authenticated",
  "select * from extensions.finish();",
];

for (const statement of requiredAuthorizationTestStatements) {
  assert.ok(
    authorizationDatabaseTest.includes(statement),
    `B2-009 database test must include: ${statement}`,
  );
}

const requiredMetaVaultTestStatements = [
  "select extensions.plan(51);",
  "set local role authenticated;",
  "set local role service_role;",
  "anonymous callers cannot decrypt Vault secrets",
  "authenticated callers cannot decrypt Vault secrets",
  "PostgREST exposes only the reviewed api and graphql schemas",
  "service_role cannot read Vault references from AgenteFer credential metadata",
  "service_role cannot bypass audited credential version creation",
  "an incorrect verify token cannot pass the Meta challenge",
  "Alpha challenge matches only its Vault verify token",
  "valid Alpha raw-body HMAC resolves only the Alpha application",
  "altering one raw-body byte invalidates the signature",
  "Alpha App Secret cannot authenticate the Beta endpoint",
  "retiring App Secret remains valid during the configured overlap",
  "new current App Secret validates immediately after rotation",
  "revoked verify token stops authenticating immediately",
  "new verify token authenticates without redeploying the API",
  "audit events never contain credential values",
  "RLS prevents Alpha owner from observing Beta metadata",
  "credential history remains append-only even for table owner operations",
  "an active channel cannot exist without its tenant Meta application link",
  "a channel cannot link a Meta application owned by another organization",
  "select * from extensions.finish();",
];

assert.equal(
  metaVaultDatabaseTest.split("(select count(*)::integer from api.meta_applications),").length - 1,
  1,
  "B4-001 preserves only the authenticated RLS visibility count as an unqualified application query",
);
for (const unscopedAssertion of [
  "(select count(distinct endpoint_key)::integer from api.meta_webhook_endpoints),",
  "(select count(*)::integer from api.meta_webhook_endpoints where status = 'active'),",
]) {
  assert.equal(
    metaVaultDatabaseTest.includes(unscopedAssertion),
    false,
    `B4-001 fixtures cannot count tenant data globally: ${unscopedAssertion}`,
  );
}

for (const statement of requiredMetaVaultTestStatements) {
  assert.ok(
    metaVaultDatabaseTest.includes(statement),
    `B4-001 Meta Vault database test must include: ${statement}`,
  );
}

const requiredMetaWebhookIngressTestStatements = [
  "select extensions.plan(48);",
  "private authenticated Meta delivery inbox exists",
  "authenticated deliveries remain backend-only with default deny",
  "non-subscribe Meta challenge modes fail closed",
  "a different tenant verify token cannot activate an endpoint",
  "an invalid raw-body signature is rejected before persistence",
  "an Alpha signature cannot authenticate the Beta endpoint",
  "signed batches above one hundred entries are rejected",
  "raw bodies above one MiB are rejected before cryptographic work",
  "an exact provider retry is identified as a replay",
  "the same bytes at another tenant endpoint create independent work",
  "credential rotation does not reset replay accounting",
  "service role cannot bypass authenticated ingestion with direct DML",
  "even the table owner cannot mutate authenticated delivery evidence",
  "select * from extensions.finish();",
];

for (const statement of requiredMetaWebhookIngressTestStatements) {
  assert.ok(
    metaWebhookIngressDatabaseTest.includes(statement),
    `B4-002 Meta webhook ingress database test must include: ${statement}`,
  );
}
assert.equal(
  metaWebhookIngressDatabaseTest.includes(
    "(select count(*)::integer from api.meta_webhook_endpoints where status = 'active'),",
  ),
  false,
  "B4-002 fixtures cannot count active endpoints across real tenant data",
);

const requiredMetaWhatsAppOnboardingTestStatements = [
  "select extensions.plan(36);",
  "WhatsApp connection profiles have RLS forced",
  "only the tenant admin read policy exists for WhatsApp profiles",
  "authenticated callers cannot inject WhatsApp tokens",
  "the WhatsApp API projection exposes no secret or opaque secret reference",
  "both documented WhatsApp permissions are mandatory",
  "Alpha owner cannot observe Beta WhatsApp metadata",
  "one operational phone number cannot belong to two tenants",
  "all rejected registrations roll back without adding Vault secrets",
  "select * from extensions.finish();",
];

for (const statement of requiredMetaWhatsAppOnboardingTestStatements) {
  assert.ok(
    metaWhatsAppOnboardingDatabaseTest.includes(statement),
    `B4-001B Meta WhatsApp onboarding database test must include: ${statement}`,
  );
}

for (const statement of [
  "select extensions.plan(3);",
  "authenticated can read only the twelve WhatsApp profile columns required by the API view",
  "authenticated cannot read the internal WhatsApp profile creation timestamp",
  "authenticated cannot read the internal WhatsApp profile update timestamp",
  "select * from extensions.finish();",
]) {
  assert.ok(
    metaWhatsAppProfileLeastPrivilegeDatabaseTest.includes(statement),
    `B4-001C Meta WhatsApp profile least-privilege database test must include: ${statement}`,
  );
}

for (const statement of [
  "select extensions.plan(78);",
  "raw customer payload never crosses the database claim boundary",
  "a concurrent worker cannot claim the active lease",
  "an expired event lease is safely reclaimed with a new attempt",
  "unknown WABA fails exact tenant connection routing",
  "routing envelope fields stay outside LLM-visible message content",
  "verified owner identity remains a member instead of becoming a customer",
  "operational audit events never copy customer identifiers or content",
  "select * from extensions.finish();",
]) {
  assert.ok(
    metaWhatsAppInboundDatabaseTest.includes(statement),
    `B4-003A Meta WhatsApp inbound database test must include: ${statement}`,
  );
}

for (const [name, databaseTest] of [
  ["B2-001", foundationDatabaseTest],
  ["B2-002", messagingDatabaseTest],
  ["B2-003", catalogDatabaseTest],
  ["B2-004", pricingDatabaseTest],
  ["B2-005", inventoryDatabaseTest],
  ["B2-006", commercialDatabaseTest],
  ["B2-007", publicationDatabaseTest],
  ["B2-008", agentRuntimeDatabaseTest],
  ["B2-009", authorizationDatabaseTest],
  ["B4-001", metaVaultDatabaseTest],
  ["B4-002", metaWebhookIngressDatabaseTest],
  ["B4-001B", metaWhatsAppOnboardingDatabaseTest],
  ["B4-001C", metaWhatsAppProfileLeastPrivilegeDatabaseTest],
  ["B4-003A", metaWhatsAppInboundDatabaseTest],
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
  'node ./scripts/normalize-database-types.mjs "$generated_types"',
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

assert.ok(
  databaseConcurrencyScript.includes("select * from api.register_meta_application("),
  "concurrency fixtures must register Meta applications through the audited Vault RPC",
);
assert.equal(
  databaseConcurrencyScript.includes("insert into app_private.meta_applications"),
  false,
  "concurrency fixtures cannot bypass the audited Meta application registration RPC",
);

for (const schema of ["api", "app_private"]) {
  assert.ok(generatedTypes.includes(`  ${schema}: {`), `generated types must include ${schema}`);
}
for (const generatedInventoryContract of [
  "inventory_balances: {",
  "inventory_compositions: {",
  "inventory_movements: {",
  "inventory_reservations: {",
  "apply_inventory_movement: {",
  "transition_inventory_reservation: {",
]) {
  assert.ok(
    generatedTypes.includes(generatedInventoryContract),
    `generated database types must include B2-005 contract: ${generatedInventoryContract}`,
  );
}
for (const generatedCommercialContract of [
  "commercial_commands: {",
  "contact_methods: {",
  "pending_requests: {",
  "conversation_assignments: {",
  "handoffs: {",
  "orders: {",
  "order_lines: {",
  "sales: {",
  "sale_lines: {",
  "create_pending_request: {",
  "transition_handoff: {",
  "create_order: {",
  "record_sale: {",
  "reconcile_sale_inventory: {",
]) {
  assert.ok(
    generatedTypes.includes(generatedCommercialContract),
    `generated database types must include B2-006 contract: ${generatedCommercialContract}`,
  );
}
for (const generatedPublicationContract of [
  "publication_batches: {",
  "publication_commands: {",
  "publication_instances: {",
  "publication_jobs: {",
  "publication_origin_lookup: {",
  "publication_schedules: {",
  "publication_versions: {",
  "publications: {",
  "social_capabilities: {",
  "social_connections: {",
  "authorize_publication_job: {",
  "record_publication_job_result: {",
]) {
  assert.ok(
    generatedTypes.includes(generatedPublicationContract),
    `generated database types must include B2-007 contract: ${generatedPublicationContract}`,
  );
}
for (const generatedAgentRuntimeContract of [
  "agent_runs: {",
  "agent_jobs: {",
  "agent_messages: {",
  "agent_policies: {",
  "agent_policy_versions: {",
  "tool_contracts: {",
  "tool_executions: {",
  "usage_events: {",
  "error_events: {",
  "enqueue_agent_run: {",
  "authorize_tool_execution: {",
  "record_agent_attempt_result: {",
  "recover_expired_agent_job: {",
]) {
  assert.ok(
    generatedTypes.includes(generatedAgentRuntimeContract),
    `generated database types must include B2-008 contract: ${generatedAgentRuntimeContract}`,
  );
}
for (const generatedMetaVaultContract of [
  "meta_applications: {",
  "meta_credential_versions: {",
  "meta_webhook_endpoints: {",
  "confirm_meta_webhook_verification: {",
  "register_meta_application: {",
  "rotate_meta_credential: {",
  "verify_meta_webhook_challenge: {",
  "verify_meta_webhook_signature: {",
]) {
  assert.ok(
    generatedApiTypes.includes(generatedMetaVaultContract),
    `generated API types must include B4-001 contract: ${generatedMetaVaultContract}`,
  );
}
for (const privateMetaColumn of ["vault_secret_id", "decrypted_secret"]) {
  assert.equal(
    generatedApiTypes.includes(privateMetaColumn),
    false,
    `generated API types cannot expose Meta private column: ${privateMetaColumn}`,
  );
}
assert.equal(
  generatedTypes.includes("  public: {"),
  false,
  "generated application types cannot silently fall back to public",
);
assert.equal(
  generatedTypes.includes("  __InternalSupabase: {"),
  false,
  "canonical database types cannot couple schema drift to the PostgREST runtime version",
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
assert.ok(
  databaseIndex.includes("normalizeGeneratedDatabaseTypes"),
  "database package must export its shared generated-type normalizer",
);
for (const scriptName of ["build", "lint", "test", "typecheck"]) {
  assert.equal(
    typeof databaseManifest.scripts?.[scriptName],
    "string",
    `database package must define ${scriptName}`,
  );
}
assert.equal(
  rootManifest.scripts?.["database:types:linked"],
  "npm run build --workspace @agentefer/database && node ./scripts/sync-linked-database-types.mjs",
  "root package must expose controlled linked type synchronization",
);
assert.equal(
  rootManifest.scripts?.["test:database:linked:rehearsal"],
  "npm run build --workspace @agentefer/database && node ./scripts/verify-linked-migration.mjs",
  "root package must expose controlled linked migration rehearsal",
);
assert.equal(
  rootManifest.scripts?.["test:database:linked:mutations"],
  "npm run build --workspace @agentefer/database && node ./scripts/verify-linked-database-mutations.mjs",
  "root package must expose controlled linked B4 mutation testing",
);
assert.equal(
  rootManifest.scripts?.["test:database:linked:pending-mutations"],
  "npm run build --workspace @agentefer/database && node ./scripts/verify-linked-pending-database-mutations.mjs",
  "root package must expose controlled pending WhatsApp mutation testing",
);
assert.equal(
  b4MutationCatalog.split('name: "').length - 1,
  23,
  "B4 must preserve eleven Vault mutants and twelve authenticated ingress mutants",
);
for (const mutationGuard of [
  "remove forced RLS from Meta applications",
  "expose Vault reference through the safe credential view",
  "allow service role to bypass audited credential insertion",
  "remove channel to tenant Meta application foreign key",
  "expose Vault in the PostgREST schema list",
  "disable valid Meta challenge resolution",
  "disable valid Meta raw-body HMAC resolution",
  "remove forced RLS from authenticated Meta deliveries",
  "allow service role to read authenticated Meta delivery payloads",
  "remove authenticated Meta replay uniqueness",
  "remove authenticated Meta credential scope identity and evidence links",
  "remove authenticated Meta delivery evidence immutability",
  "expose raw Meta delivery ingestion to anonymous callers",
  "disable atomic Meta challenge acceptance",
  "disable atomic authenticated Meta delivery persistence",
]) {
  assert.ok(
    b4MutationCatalog.includes(mutationGuard),
    `B4 mutation catalog must include: ${mutationGuard}`,
  );
}
for (const runnerGuard of [
  'const expectedProjectRef = "hprdctmblmfcoagugvyp";',
  'const expectedProjectName = "AgenteFer";',
  'transactionOutcome: "rolled_back_per_mutant"',
  "B4 mutation must apply successfully before its test can kill it",
  '"20260817173316"',
  "new Set(b4DatabaseMutants.map((mutant) => mutant.test))",
  "testSources.get(mutant.test)",
  "B4 mutation test must remain inside the AgenteFer Supabase test directory",
]) {
  assert.ok(
    linkedB4MutationRunner.includes(runnerGuard),
    `linked B4 mutation runner must include: ${runnerGuard}`,
  );
}
assert.equal(
  b4001bMutationCatalog.split('name: "').length - 1,
  6,
  "B4-001B must preserve six WhatsApp onboarding database mutants",
);
for (const mutationGuard of [
  "remove forced RLS from WhatsApp connection profiles",
  "remove WhatsApp connection tenant policy",
  "remove WhatsApp operational connection integrity trigger",
  "remove WhatsApp tenant reassignment guard",
  "revoke the audited WhatsApp registrar from service role",
  "expose the token-bearing WhatsApp registrar to authenticated callers",
]) {
  assert.ok(
    b4001bMutationCatalog.includes(mutationGuard),
    `B4-001B mutation catalog must include: ${mutationGuard}`,
  );
}
assert.equal(
  b4001cMutationCatalog.split('name: "').length - 1,
  4,
  "B4-001C must preserve four WhatsApp profile least-privilege database mutants",
);
for (const mutationGuard of [
  "restore broad authenticated WhatsApp profile reads",
  "remove one API-required authenticated WhatsApp profile column",
  "expose the internal WhatsApp profile creation timestamp",
  "expose the internal WhatsApp profile update timestamp",
]) {
  assert.ok(
    b4001cMutationCatalog.includes(mutationGuard),
    `B4-001C mutation catalog must include: ${mutationGuard}`,
  );
}
for (const runnerGuard of [
  'const expectedProjectRef = "hprdctmblmfcoagugvyp";',
  'const expectedProjectName = "AgenteFer";',
  'transactionOutcome: "rolled_back_per_mutant"',
  "20260825094500_b4_003a_meta_whatsapp_inbound.sql",
  "b4_003a_meta_whatsapp_inbound_test.sql",
  "buildLinkedMigrationPgtapCollector",
  "mutateMigration",
  "must target exactly one migration fragment",
  "outcomes.every((outcome) => outcome.killed)",
]) {
  assert.ok(
    linkedB4003aMutationRunner.includes(runnerGuard),
    `linked B4-003A mutation runner must include: ${runnerGuard}`,
  );
}
assert.equal(
  b4003aMutationCatalog.split('name: "').length - 1,
  12,
  "B4-003A must preserve twelve WhatsApp inbound database mutants",
);
for (const mutationGuard of [
  "remove raw delivery lease lifecycle constraint",
  "remove normalized event lease lifecycle constraint",
  "remove raw delivery operational claim index",
  "remove normalized event operational claim index",
  "revoke raw delivery claim authority from service role",
  "expose WhatsApp normalization authority to authenticated callers",
  "expose raw customer payload through the worker claim boundary",
  "route a WhatsApp delivery without exact WABA ownership",
  "copy provider sender identity into LLM-visible message content",
  "downgrade verified owner identity to customer participant",
  "use transaction time for WhatsApp message lease expiry",
  "make routed message available before authenticated receipt",
]) {
  assert.ok(
    b4003aMutationCatalog.includes(mutationGuard),
    `B4-003A mutation catalog must include: ${mutationGuard}`,
  );
}
assert.ok(
  eslintConfiguration.includes('"packages/database/src/database.types.ts"'),
  "only the canonical generated type file may bypass stylistic lint",
);

console.log(
  `Database contract verified: ${migrationEntries.length} ordered production migrations, 94 forced-RLS tables, 947 pgTAP assertions, generated TypeScript schemas locked.`,
);
