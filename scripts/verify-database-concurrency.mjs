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
insert into app_private.catalog_units (
  id, organization_id, code, name_singular, name_plural,
  quantity_kind, decimal_scale, status, created_by_user_id
)
values (
  '33000000-0000-4000-8000-000000000110',
  '33000000-0000-4000-8000-000000000010',
  'concurrent_unit',
  'Concurrent unit',
  'Concurrent units',
  'count',
  0,
  'active',
  '33000000-0000-4000-8000-000000000001'
);
insert into app_private.catalog_evidence (
  id, organization_id, evidence_kind, content, created_by_user_id
)
values (
  '33000000-0000-4000-8000-000000000180',
  '33000000-0000-4000-8000-000000000010',
  'owner_confirmation',
  '{"source":"B2-004 concurrency gate"}'::jsonb,
  '33000000-0000-4000-8000-000000000001'
);
insert into app_private.price_books (
  id, organization_id, code, name, currency_code,
  status, is_default, created_by_user_id
)
values (
  '33000000-0000-4000-8000-000000000200',
  '33000000-0000-4000-8000-000000000010',
  'concurrent_book',
  'Concurrent price book',
  'MXN',
  'active',
  true,
  '33000000-0000-4000-8000-000000000001'
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
insert into app_private.inventory_items (
  id, organization_id, variant_id, inventory_unit_id
)
values
  (
    '33000000-0000-4000-8000-000000000250',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000160',
    '33000000-0000-4000-8000-000000000110'
  ),
  (
    '33000000-0000-4000-8000-000000000251',
    '33000000-0000-4000-8000-000000000010',
    '33000000-0000-4000-8000-000000000161',
    '33000000-0000-4000-8000-000000000110'
  );
insert into app_private.inventory_locations (id, organization_id, code, name)
values
  (
    '33000000-0000-4000-8000-000000000260',
    '33000000-0000-4000-8000-000000000010',
    'main',
    'Main'
  ),
  (
    '33000000-0000-4000-8000-000000000261',
    '33000000-0000-4000-8000-000000000010',
    'secondary',
    'Secondary'
  );
select * from api.apply_inventory_movement(
  '33000000-0000-4000-8000-000000000010',
  'concurrency-initial-stock',
  'receipt',
  'concurrency fixture stock',
  '[
    {"inventory_item_id":"33000000-0000-4000-8000-000000000250","location_id":"33000000-0000-4000-8000-000000000260","effect":"delta","quantity":1},
    {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000260","effect":"delta","quantity":10},
    {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000261","effect":"delta","quantity":10}
  ]'::jsonb
);
commit;
`;

const commercialFixtureSql = `
begin;
set local role service_role;

update app_private.products
set status = 'active'
where id = '33000000-0000-4000-8000-000000000150';
update app_private.product_variants
set status = 'active'
where id = '33000000-0000-4000-8000-000000000160';

insert into app_private.channel_connections (
  id, organization_id, provider, channel, external_app_id, external_account_id,
  external_sender_id, display_name, api_version, credential_reference,
  webhook_secret_reference, status, connected_at, last_verified_at, created_by_user_id
) values (
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000010',
  'meta', 'whatsapp', 'concurrency-app', 'concurrency-account', 'concurrency-sender',
  'Concurrency WhatsApp', 'v24.0', 'secret-ref://concurrency/token',
  'secret-ref://concurrency/webhook', 'active', now(), now(),
  '33000000-0000-4000-8000-000000000001'
);
insert into app_private.contacts (id, organization_id, display_name)
values (
  '33000000-0000-4000-8000-000000000310',
  '33000000-0000-4000-8000-000000000010',
  'Concurrency customer'
);
insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name
) values (
  '33000000-0000-4000-8000-000000000320',
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000300',
  'concurrency-customer', 'contact',
  '33000000-0000-4000-8000-000000000310',
  'provider_observed', 'Concurrency customer'
);

set constraints all deferred;
insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  origin_kind, origin_external_id, origin_context
) values (
  '33000000-0000-4000-8000-000000000330',
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000320',
  'post', 'concurrency-post', '{"source":"concurrency"}'::jsonb
);
insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id
) values (
  '33000000-0000-4000-8000-000000000340',
  '33000000-0000-4000-8000-000000000010',
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000330',
  'identity', 'customer', '33000000-0000-4000-8000-000000000320'
);
set constraints all immediate;

select * from api.create_pending_request(
  '33000000-0000-4000-8000-000000000010', 'concurrent-pending-create',
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000330',
  '33000000-0000-4000-8000-000000000310',
  'missing_price', '["price"]'::jsonb, '{"source":"race"}'::jsonb,
  null, '33000000-0000-4000-8000-000000000160',
  '33000000-0000-4000-8000-000000000110', 1,
  clock_timestamp() + interval '1 hour',
  '33000000-0000-4000-8000-000000000001'
);
select * from api.create_lead(
  '33000000-0000-4000-8000-000000000010', 'concurrent-lead-create',
  '33000000-0000-4000-8000-000000000310', 'whatsapp',
  'Concurrency-qualified customer',
  '[{"variant_id":"33000000-0000-4000-8000-000000000160","unit_id":"33000000-0000-4000-8000-000000000110","quantity":1,"summary":"last unit","context":{"source":"race"}}]'::jsonb,
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000330',
  '33000000-0000-4000-8000-000000000001'
);
select * from api.create_opportunity(
  '33000000-0000-4000-8000-000000000010', 'concurrent-opportunity-create',
  (select result_id from app_private.commercial_commands where idempotency_key = 'concurrent-lead-create'),
  'human_handoff', 'qualified', 'Concurrency opportunity', 'agent',
  null, 'concurrency-agent', 1000, 'MXN',
  '33000000-0000-4000-8000-000000000001'
);
select * from api.create_handoff(
  '33000000-0000-4000-8000-000000000010', 'concurrent-handoff-create',
  (select result_id from app_private.commercial_commands where idempotency_key = 'concurrent-opportunity-create'),
  'member', 'Customer is ready for owner.', '{"source":"race"}'::jsonb,
  '33000000-0000-4000-8000-000000000001', null,
  '33000000-0000-4000-8000-000000000001'
);
select * from api.create_order(
  '33000000-0000-4000-8000-000000000010', 'concurrent-order-create',
  '33000000-0000-4000-8000-000000000310', 'catalog_checkout', 'human_handoff',
  jsonb_build_array(jsonb_build_object(
    'variant_id', '33000000-0000-4000-8000-000000000160',
    'unit_id', '33000000-0000-4000-8000-000000000110',
    'price_tier_id', (
      select id from app_private.price_tiers
      where organization_id = '33000000-0000-4000-8000-000000000010'
        and variant_id = '33000000-0000-4000-8000-000000000160'
        and superseded_at is null
    ),
    'quantity', 1
  )),
  '2026-08-11 12:00:00+00', null,
  (select result_id from app_private.commercial_commands where idempotency_key = 'concurrent-opportunity-create'),
  '33000000-0000-4000-8000-000000000300',
  '33000000-0000-4000-8000-000000000330', null,
  '33000000-0000-4000-8000-000000000001'
);
select * from api.transition_order(
  '33000000-0000-4000-8000-000000000010',
  (select result_id from app_private.commercial_commands where idempotency_key = 'concurrent-order-create'),
  'concurrent-order-confirm', 'confirm', 'confirmed before sale race',
  '33000000-0000-4000-8000-000000000001', statement_timestamp()
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

const verifyRace = async ({ label, firstSql, secondSql, countSql, failureMarker }) => {
  const firstWrite = runCaptured(firstSql);

  await new Promise((resolve) => setTimeout(resolve, 250));

  const secondWrite = runCaptured(secondSql);
  const results = await Promise.all([firstWrite, secondWrite]);
  const successfulWrites = results.filter((result) => result.status === 0).length;
  const failedWrites = results.filter((result) => result.status !== 0).length;
  const failedDiagnostic = results
    .filter((result) => result.status !== 0)
    .map((result) => `${result.stdout}\n${result.stderr}`)
    .join("\n");
  const countResult = runSync(countSql, true);
  const persistedRows = Number.parseInt(countResult.stdout.trim(), 10);

  assert.equal(successfulWrites, 1, `exactly one concurrent ${label} write must commit`);
  assert.equal(failedWrites, 1, `exactly one concurrent ${label} write must conflict`);
  assert.equal(persistedRows, 1, `${label} conflict must leave exactly one row`);
  assert.ok(
    failedDiagnostic.includes(failureMarker),
    `${label} conflict must come from ${failureMarker}`,
  );

  return {
    successfulWrites,
    failedWrites,
    persistedRows,
    results: results.map((result) => ({
      status: result.status,
      diagnostic: `${result.stdout}\n${result.stderr}`.trim().split("\n").slice(-20).join("\n"),
    })),
  };
};

const skuRace = await verifyRace({
  label: "SKU",
  firstSql: `
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
  `,
  secondSql: `
    begin;
    set local role service_role;
    insert into app_private.variant_skus (organization_id, variant_id, sku)
    values (
      '33000000-0000-4000-8000-000000000010',
      '33000000-0000-4000-8000-000000000161',
      'concurrent-sku'
    );
    commit;
  `,
  countSql: `select count(*) from app_private.variant_skus
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and lower(sku) = 'concurrent-sku';`,
  failureMarker: "variant_skus_organization_sku_unique",
});

const priceRace = await verifyRace({
  label: "price tier",
  firstSql: `
    begin;
    set local role service_role;
    insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method,
      price_amount, valid_from, valid_until, evidence_id
    ) values (
      '33000000-0000-4000-8000-000000000010',
      '33000000-0000-4000-8000-000000000200',
      '33000000-0000-4000-8000-000000000160',
      '33000000-0000-4000-8000-000000000110',
      1, 4, 'priced', 'per_unit',
      1000, '2026-01-01 00:00:00+00', '2027-01-01 00:00:00+00',
      '33000000-0000-4000-8000-000000000180'
    );
    select pg_sleep(2);
    commit;
  `,
  secondSql: `
    begin;
    set local role service_role;
    insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method,
      price_amount, valid_from, valid_until, evidence_id
    ) values (
      '33000000-0000-4000-8000-000000000010',
      '33000000-0000-4000-8000-000000000200',
      '33000000-0000-4000-8000-000000000160',
      '33000000-0000-4000-8000-000000000110',
      2, 3, 'priced', 'per_unit',
      2500, '2026-06-01 00:00:00+00', '2026-12-01 00:00:00+00',
      '33000000-0000-4000-8000-000000000180'
    );
    commit;
  `,
  countSql: `select count(*) from app_private.price_tiers
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and price_book_id = '33000000-0000-4000-8000-000000000200'
      and variant_id = '33000000-0000-4000-8000-000000000160'
      and unit_id = '33000000-0000-4000-8000-000000000110';`,
  failureMarker: "price_tiers_no_current_overlap",
});

runSync(commercialFixtureSql);

const pendingResolutionRace = await verifyRace({
  label: "pending-request resolution",
  firstSql: `
    begin;
    set local role service_role;
    select * from api.resolve_pending_request(
      '33000000-0000-4000-8000-000000000010',
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-pending-create'),
      'concurrent-pending-resolution-first', 'resolve', 'owner_answer',
      'First authorized answer.', 1000, 'MXN',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    select pg_sleep(2);
    commit;
  `,
  secondSql: `
    begin;
    set local role service_role;
    select * from api.resolve_pending_request(
      '33000000-0000-4000-8000-000000000010',
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-pending-create'),
      'concurrent-pending-resolution-second', 'resolve', 'owner_answer',
      'Competing authorized answer.', 1100, 'MXN',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    commit;
  `,
  countSql: `select count(*) from app_private.pending_requests
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and id = (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-pending-create')
      and status = 'resolved';`,
  failureMarker: "pending request is not open",
});

const handoffAcceptanceRace = await verifyRace({
  label: "handoff acceptance",
  firstSql: `
    begin;
    set local role service_role;
    select * from api.transition_handoff(
      '33000000-0000-4000-8000-000000000010',
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-handoff-create'),
      'concurrent-handoff-accept-first', 'accept', 'Owner accepted first.',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    select pg_sleep(2);
    commit;
  `,
  secondSql: `
    begin;
    set local role service_role;
    select * from api.transition_handoff(
      '33000000-0000-4000-8000-000000000010',
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-handoff-create'),
      'concurrent-handoff-accept-second', 'accept', 'Competing acceptance.',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    commit;
  `,
  countSql: `select count(*) from app_private.handoffs
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and id = (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-handoff-create')
      and status = 'accepted';`,
  failureMarker: "handoff is not pending",
});

const orderLastQuantityRace = await verifyRace({
  label: "last order quantity sale",
  firstSql: `
    begin;
    set local role service_role;
    select * from api.record_sale(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-order-sale-first', 'sale', 'human_close', 'MXN',
      jsonb_build_array(jsonb_build_object(
        'order_line_id', (select id from app_private.order_lines where order_id = (
          select result_id from app_private.commercial_commands
          where idempotency_key = 'concurrent-order-create'
        )),
        'variant_id', '33000000-0000-4000-8000-000000000160',
        'unit_id', '33000000-0000-4000-8000-000000000110',
        'quantity', 1, 'unit_amount', 1000, 'line_total_amount', 1000,
        'inventory_effect_status', 'pending'
      )),
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-order-create'),
      null, null, null, 'first concurrent close',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    select pg_sleep(2);
    commit;
  `,
  secondSql: `
    begin;
    set local role service_role;
    select * from api.record_sale(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-order-sale-second', 'sale', 'human_close', 'MXN',
      jsonb_build_array(jsonb_build_object(
        'order_line_id', (select id from app_private.order_lines where order_id = (
          select result_id from app_private.commercial_commands
          where idempotency_key = 'concurrent-order-create'
        )),
        'variant_id', '33000000-0000-4000-8000-000000000160',
        'unit_id', '33000000-0000-4000-8000-000000000110',
        'quantity', 1, 'unit_amount', 1000, 'line_total_amount', 1000,
        'inventory_effect_status', 'pending'
      )),
      (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-order-create'),
      null, null, null, 'second concurrent close',
      '33000000-0000-4000-8000-000000000001', statement_timestamp()
    );
    commit;
  `,
  countSql: `select count(*) from app_private.sales
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and order_id = (select result_id from app_private.commercial_commands
        where idempotency_key = 'concurrent-order-create')
      and sale_kind = 'sale';`,
  failureMarker: "sale requires a confirmed open order",
});

const reservationRace = await verifyRace({
  label: "last-unit reservation",
  firstSql: `
    begin;
    set local role service_role;
    select * from api.create_inventory_reservation(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-reservation-first',
      clock_timestamp() + interval '1 hour',
      '[{"inventory_item_id":"33000000-0000-4000-8000-000000000250","location_id":"33000000-0000-4000-8000-000000000260","quantity":1}]'::jsonb,
      'first buyer'
    );
    select pg_sleep(2);
    commit;
  `,
  secondSql: `
    begin;
    set local role service_role;
    select * from api.create_inventory_reservation(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-reservation-second',
      clock_timestamp() + interval '1 hour',
      '[{"inventory_item_id":"33000000-0000-4000-8000-000000000250","location_id":"33000000-0000-4000-8000-000000000260","quantity":1}]'::jsonb,
      'second buyer'
    );
    commit;
  `,
  countSql: `select count(*)
    from app_private.inventory_reservation_lines
    where organization_id = '33000000-0000-4000-8000-000000000010'
      and inventory_item_id = '33000000-0000-4000-8000-000000000250';`,
  failureMarker: "inventory reservation exceeds available stock",
});

const verifyOrderedInventoryWrites = async () => {
  const firstWrite = runCaptured(`
    begin;
    set local role service_role;
    select * from api.apply_inventory_movement(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-transfer-first',
      'transfer',
      'main to secondary',
      '[
        {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000261","effect":"delta","quantity":1},
        {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000260","effect":"delta","quantity":-1}
      ]'::jsonb
    );
    select pg_sleep(2);
    commit;
  `);

  await new Promise((resolve) => setTimeout(resolve, 250));

  const secondWrite = runCaptured(`
    begin;
    set local role service_role;
    select * from api.apply_inventory_movement(
      '33000000-0000-4000-8000-000000000010',
      'concurrent-transfer-second',
      'transfer',
      'secondary to main',
      '[
        {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000260","effect":"delta","quantity":1},
        {"inventory_item_id":"33000000-0000-4000-8000-000000000251","location_id":"33000000-0000-4000-8000-000000000261","effect":"delta","quantity":-1}
      ]'::jsonb
    );
    commit;
  `);

  const results = await Promise.all([firstWrite, secondWrite]);
  assert.ok(
    results.every((result) => result.status === 0),
    `ordered inventory writes must both commit without deadlock: ${results
      .map((result) => `${result.stdout}\n${result.stderr}`.trim())
      .join("\n")}`,
  );

  const finalBalances = runSync(
    `select location_id::text || ':' || on_hand_quantity::text
      from app_private.inventory_balances
      where organization_id = '33000000-0000-4000-8000-000000000010'
        and inventory_item_id = '33000000-0000-4000-8000-000000000251'
      order by location_id;`,
    true,
  )
    .stdout.trim()
    .split("\n");

  assert.deepEqual(finalBalances, [
    "33000000-0000-4000-8000-000000000260:10",
    "33000000-0000-4000-8000-000000000261:10",
  ]);

  return {
    successfulWrites: 2,
    finalBalances,
    results: results.map((result) => ({
      status: result.status,
      diagnostic: `${result.stdout}\n${result.stderr}`.trim().split("\n").slice(-20).join("\n"),
    })),
  };
};

const orderedInventoryWrites = await verifyOrderedInventoryWrites();
const invalidBalanceCount = Number.parseInt(
  runSync(
    `select count(*) from app_private.inventory_balances
      where on_hand_quantity < 0
        or reserved_quantity < 0
        or available_quantity < 0;`,
    true,
  ).stdout.trim(),
  10,
);
assert.equal(
  invalidBalanceCount,
  0,
  "concurrent inventory writes must preserve nonnegative balances",
);

await mkdir(reportDirectory, { recursive: true });
await writeFile(
  reportPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sku: skuRace,
      pricing: priceRace,
      pendingResolution: pendingResolutionRace,
      handoffAcceptance: handoffAcceptanceRace,
      orderLastQuantitySale: orderLastQuantityRace,
      reservation: reservationRace,
      orderedInventoryWrites,
      invalidBalanceCount,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  "Database concurrency verified: SKU/price conflicts, pending resolution, handoff acceptance, last order quantity, last-unit reservation, canonical lock order and nonnegative balances.",
);
