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
  ],
  "B2-001 through B2-008 must remain ordered, reviewable production migrations",
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
  ["B2-004", pricingMigration],
  ["B2-004 timestamp hardening", pricingTimestampHardeningMigration],
  ["B2-004 index hardening", pricingIndexHardeningMigration],
  ["B2-005", inventoryMigration],
  ["B2-006", commercialMigration],
  ["B2-007", publicationMigration],
  ["B2-008", agentRuntimeMigration],
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

for (const [name, databaseTest] of [
  ["B2-001", foundationDatabaseTest],
  ["B2-002", messagingDatabaseTest],
  ["B2-003", catalogDatabaseTest],
  ["B2-004", pricingDatabaseTest],
  ["B2-005", inventoryDatabaseTest],
  ["B2-006", commercialDatabaseTest],
  ["B2-007", publicationDatabaseTest],
  ["B2-008", agentRuntimeDatabaseTest],
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
assert.ok(
  eslintConfiguration.includes('"packages/database/src/database.types.ts"'),
  "only the canonical generated type file may bypass stylistic lint",
);

console.log(
  `Database contract verified: ${migrationEntries.length} ordered production migrations, 89 forced-RLS tables, 649 pgTAP assertions, generated TypeScript schemas locked.`,
);
