begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(23);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
set search_path = extensions, pg_catalog
as $$
declare
  actual_sqlstate text;
begin
  execute statement;
  return extensions.fail(description || ' (the statement did not fail)');
exception
  when others then
    get stacked diagnostics actual_sqlstate = returned_sqlstate;
    return extensions.is(actual_sqlstate, expected_sqlstate, description);
end;
$$;

grant execute on function pg_temp.throws_sqlstate(text, text, text)
  to anon, authenticated, service_role;

select extensions.has_table(
  'app_private', 'admin_catalog_commands',
  'the idempotent admin catalog command ledger exists'
);

select extensions.ok(
  (
    select relation.relrowsecurity and relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'admin_catalog_commands'
  ),
  'the admin catalog command ledger has RLS enabled and forced'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename = 'admin_catalog_commands'
  ),
  0,
  'the service-only command ledger has no browser read policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'app_private'
      and procedure.proname in (
        'claim_admin_catalog_command', 'complete_admin_catalog_command'
      )
  ),
  2,
  'both private admin catalog command helpers exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'get_facebook_catalog_admin_page', 'admin_set_catalog_offer_status',
        'admin_enqueue_facebook_publication', 'admin_enqueue_facebook_catalog',
        'admin_retry_facebook_publication', 'admin_set_facebook_batch_state'
      )
  ),
  6,
  'all six admin catalog panel RPCs exist'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'get_facebook_catalog_admin_page', 'admin_set_catalog_offer_status',
        'admin_enqueue_facebook_publication', 'admin_enqueue_facebook_catalog',
        'admin_retry_facebook_publication', 'admin_set_facebook_batch_state'
      )
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  6,
  'service_role can execute every admin catalog panel RPC'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'get_facebook_catalog_admin_page', 'admin_set_catalog_offer_status',
        'admin_enqueue_facebook_publication', 'admin_enqueue_facebook_catalog',
        'admin_retry_facebook_publication', 'admin_set_facebook_batch_state'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'browser roles cannot execute privileged admin catalog panel RPCs'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'app_private'
      and routine_name in (
        'claim_admin_catalog_command', 'complete_admin_catalog_command'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'private command helpers cannot be bypassed by application roles'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4070000-0000-4000-8000-000000000001'),
  ('b4070000-0000-4000-8000-000000000002');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4071000-0000-4000-8000-000000000001',
  'B4 Admin Catalog Panel Alpha',
  'b4070000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values (
  'b4071100-0000-4000-8000-000000000001',
  'b4071000-0000-4000-8000-000000000001',
  'b4070000-0000-4000-8000-000000000001',
  'owner', 'active', statement_timestamp()
);

set constraints all immediate;

insert into app_private.catalog_categories (
  id, organization_id, code, name, status, created_by_user_id
)
values (
  'b4072000-0000-4000-8000-000000000001',
  'b4071000-0000-4000-8000-000000000001',
  'llantas', 'Llantas', 'active',
  'b4070000-0000-4000-8000-000000000001'
);

insert into app_private.products (
  id, organization_id, category_id, name, description, status, created_by_user_id
)
values (
  'b4073000-0000-4000-8000-000000000001',
  'b4071000-0000-4000-8000-000000000001',
  'b4072000-0000-4000-8000-000000000001',
  'Producto real de ensayo', 'Descripción real para el panel', 'active',
  'b4070000-0000-4000-8000-000000000001'
);

insert into app_private.product_variants (
  id, organization_id, product_id, name, description, status, created_by_user_id,
  created_at, updated_at
)
values
  (
    'b4074000-0000-4000-8000-000000000001',
    'b4071000-0000-4000-8000-000000000001',
    'b4073000-0000-4000-8000-000000000001',
    'Variante reciente', 'Primera página', 'draft',
    'b4070000-0000-4000-8000-000000000001',
    statement_timestamp(), statement_timestamp()
  ),
  (
    'b4074000-0000-4000-8000-000000000002',
    'b4071000-0000-4000-8000-000000000001',
    'b4073000-0000-4000-8000-000000000001',
    'Variante anterior', 'Segunda página', 'draft',
    'b4070000-0000-4000-8000-000000000001',
    statement_timestamp() - interval '1 minute',
    statement_timestamp() - interval '1 minute'
  );

insert into app_private.variant_skus (
  id, organization_id, variant_id, sku, status, created_by_user_id
)
values
  (
    'b4075000-0000-4000-8000-000000000001',
    'b4071000-0000-4000-8000-000000000001',
    'b4074000-0000-4000-8000-000000000001',
    'B407-RECENT', 'current', 'b4070000-0000-4000-8000-000000000001'
  ),
  (
    'b4075000-0000-4000-8000-000000000002',
    'b4071000-0000-4000-8000-000000000001',
    'b4074000-0000-4000-8000-000000000002',
    'B407-OLDER', 'current', 'b4070000-0000-4000-8000-000000000001'
  );

update app_private.product_variants
set status = 'active'
where organization_id = 'b4071000-0000-4000-8000-000000000001'
  and id in (
    'b4074000-0000-4000-8000-000000000001',
    'b4074000-0000-4000-8000-000000000002'
  );

update app_private.product_variants
set description = 'Primera página actualizada'
where organization_id = 'b4071000-0000-4000-8000-000000000001'
  and id = 'b4074000-0000-4000-8000-000000000001';

select pg_temp.throws_sqlstate(
  $$select api.get_facebook_catalog_admin_page(
    'b4071000-0000-4000-8000-000000000001',
    'b4070000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  'a user outside the organization cannot read its admin catalog'
);

select pg_temp.throws_sqlstate(
  $$select api.get_facebook_catalog_admin_page(
    'b4071000-0000-4000-8000-000000000001',
    'b4070000-0000-4000-8000-000000000001',
    null, 'all', null, 25
  )$$,
  '22023',
  'the mobile page size cannot exceed the bounded maximum'
);

create temporary table pg_temp.b407_first_page (
  payload jsonb not null
) on commit drop;

insert into pg_temp.b407_first_page
select api.get_facebook_catalog_admin_page(
  'b4071000-0000-4000-8000-000000000001',
  'b4070000-0000-4000-8000-000000000001',
  null, 'all', null, 1
);

select extensions.is(
  (select jsonb_array_length(payload -> 'items') from pg_temp.b407_first_page),
  1,
  'the first bounded catalog page contains one item'
);

select extensions.is(
  (select payload -> 'summary' ->> 'total' from pg_temp.b407_first_page),
  '2',
  'the catalog summary counts both real variants'
);

select extensions.is(
  (select payload -> 'items' -> 0 ->> 'sku' from pg_temp.b407_first_page),
  'B407-RECENT',
  'cursor ordering returns the most recently updated variant first'
);

select extensions.ok(
  (select (payload ->> 'hasMore')::boolean from pg_temp.b407_first_page),
  'the first page reports that another page exists'
);

select extensions.ok(
  (select payload -> 'nextCursor' is not null from pg_temp.b407_first_page),
  'the first page returns an explicit next cursor'
);

create temporary table pg_temp.b407_second_page (
  payload jsonb not null
) on commit drop;

insert into pg_temp.b407_second_page
select api.get_facebook_catalog_admin_page(
  'b4071000-0000-4000-8000-000000000001',
  'b4070000-0000-4000-8000-000000000001',
  null,
  'all',
  null,
  1,
  (select (payload -> 'nextCursor' ->> 'updatedAt')::timestamptz from pg_temp.b407_first_page),
  (select (payload -> 'nextCursor' ->> 'variantId')::uuid from pg_temp.b407_first_page)
);

select extensions.is(
  (select payload -> 'items' -> 0 ->> 'sku' from pg_temp.b407_second_page),
  'B407-OLDER',
  'the explicit cursor returns the next variant without duplication'
);

select extensions.ok(
  not (select (payload ->> 'hasMore')::boolean from pg_temp.b407_second_page),
  'the final page terminates instead of creating an infinite scroll'
);

select extensions.is(
  (
    select api.admin_set_catalog_offer_status(
      'b4071000-0000-4000-8000-000000000001',
      'b4070000-0000-4000-8000-000000000001',
      'b4074000-0000-4000-8000-000000000001',
      'paused',
      'Pausa solicitada desde el panel móvil',
      'b407-panel-pause-0001'
    ) ->> 'status'
  ),
  'paused',
  'an authorized owner can pause one catalog offer atomically'
);

select extensions.is(
  (
    select status
    from app_private.product_variants
    where organization_id = 'b4071000-0000-4000-8000-000000000001'
      and id = 'b4074000-0000-4000-8000-000000000001'
  ),
  'paused',
  'the durable variant status reflects the panel pause'
);

select extensions.ok(
  (
    select (api.admin_set_catalog_offer_status(
      'b4071000-0000-4000-8000-000000000001',
      'b4070000-0000-4000-8000-000000000001',
      'b4074000-0000-4000-8000-000000000001',
      'paused',
      'Pausa solicitada desde el panel móvil',
      'b407-panel-pause-0001'
    ) ->> 'wasReplayed')::boolean
  ),
  'repeating the same panel command replays its durable result'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.admin_catalog_commands
    where organization_id = 'b4071000-0000-4000-8000-000000000001'
      and idempotency_key = 'b407-panel-pause-0001'
  ),
  1,
  'idempotent replay creates exactly one command ledger row'
);

select pg_temp.throws_sqlstate(
  $$select api.admin_set_catalog_offer_status(
    'b4071000-0000-4000-8000-000000000001',
    'b4070000-0000-4000-8000-000000000001',
    'b4074000-0000-4000-8000-000000000001',
    'active',
    'Solicitud distinta con la misma llave',
    'b407-panel-pause-0001'
  )$$,
  '23505',
  'reusing an idempotency key with another request is rejected'
);

select pg_temp.throws_sqlstate(
  $$select api.admin_set_catalog_offer_status(
    'b4071000-0000-4000-8000-000000000001',
    'b4070000-0000-4000-8000-000000000001',
    'b4074000-0000-4000-8000-000000000001',
    'archived',
    'Estado no permitido desde pausa rápida',
    'b407-panel-archive-0001'
  )$$,
  '22023',
  'the quick status control cannot archive or delete a product'
);

select * from extensions.finish();

rollback;
