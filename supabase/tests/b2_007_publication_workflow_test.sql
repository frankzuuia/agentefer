begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(83);

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

select extensions.has_table('app_private', 'publication_commands', 'publication command ledger exists');
select extensions.has_table('app_private', 'social_connections', 'social connections table exists');
select extensions.has_table('app_private', 'social_capabilities', 'social capabilities table exists');
select extensions.has_table('app_private', 'publications', 'logical publications table exists');
select extensions.has_table('app_private', 'publication_versions', 'publication versions table exists');
select extensions.has_table('app_private', 'publication_media', 'publication media table exists');
select extensions.has_table('app_private', 'publication_schedules', 'publication schedules table exists');
select extensions.has_table('app_private', 'publication_batches', 'publication batches table exists');
select extensions.has_table('app_private', 'publication_jobs', 'publication jobs table exists');
select extensions.has_table('app_private', 'publication_instances', 'publication instances table exists');
select extensions.has_table('app_private', 'publication_events', 'publication event ledger exists');

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'publication_commands', 'social_connections', 'social_capabilities',
        'current_social_capabilities', 'publications', 'publication_versions',
        'publication_media', 'publication_schedules', 'publication_batches',
        'publication_jobs', 'publication_instances', 'publication_origin_lookup',
        'publication_events'
      )
      and relation.relkind = 'v'
  ),
  13,
  'all thirteen B2-007 API views exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'register_social_connection', 'observe_social_capability',
        'transition_social_connection', 'create_publication',
        'create_publication_version', 'approve_publication_version',
        'create_publication_schedule', 'transition_publication_schedule',
        'enqueue_publication_batch', 'claim_publication_job',
        'transition_publication', 'enqueue_publication_job',
        'authorize_publication_job', 'mark_publication_effect_started',
        'record_publication_job_result', 'recover_expired_publication_job',
        'cancel_publication_batch', 'reconcile_publication_batch'
      )
  ),
  18,
  'all eighteen B2-007 service tool RPCs exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'publication_commands', 'social_connections', 'social_capabilities',
        'publications', 'publication_versions', 'publication_media',
        'publication_schedules', 'publication_batches', 'publication_jobs',
        'publication_instances', 'publication_events'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  11,
  'RLS is enabled and forced on every B2-007 table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'publication_commands', 'social_connections', 'social_capabilities',
        'publications', 'publication_versions', 'publication_media',
        'publication_schedules', 'publication_batches', 'publication_jobs',
        'publication_instances', 'publication_events'
      )
  ),
  11,
  'every B2-007 table has one tenant and role-aware read policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conrelid in (
        'app_private.publication_commands'::regclass,
        'app_private.social_connections'::regclass,
        'app_private.social_capabilities'::regclass,
        'app_private.publications'::regclass,
        'app_private.publication_versions'::regclass,
        'app_private.publication_media'::regclass,
        'app_private.publication_schedules'::regclass,
        'app_private.publication_batches'::regclass,
        'app_private.publication_jobs'::regclass,
        'app_private.publication_instances'::regclass,
        'app_private.publication_events'::regclass
      )
      and not exists (
        select 1
        from pg_catalog.pg_index as index_value
        where index_value.indrelid = foreign_key.conrelid
          and index_value.indisvalid
          and index_value.indisready
          and (string_to_array(index_value.indkey::text, ' ')::smallint[])
            [1:cardinality(foreign_key.conkey)] = foreign_key.conkey
      )
  ),
  0,
  'every B2-007 foreign key column is indexed'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'publication_commands', 'social_connections', 'social_capabilities',
        'current_social_capabilities', 'publications', 'publication_versions',
        'publication_media', 'publication_schedules', 'publication_batches',
        'publication_jobs', 'publication_instances', 'publication_origin_lookup',
        'publication_events'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  13,
  'all B2-007 API views preserve caller RLS and security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema in ('app_private', 'api')
      and table_name in (
        'publication_commands', 'social_connections', 'social_capabilities',
        'current_social_capabilities', 'publications', 'publication_versions',
        'publication_media', 'publication_schedules', 'publication_batches',
        'publication_jobs', 'publication_instances', 'publication_origin_lookup',
        'publication_events'
      )
      and grantee in ('PUBLIC', 'anon')
  ),
  0,
  'public and anon have no B2-007 relation privileges'
);

select extensions.ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'social_connections'
      and column_name = 'credential_reference'
  ),
  'credential references are absent from the API view'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'register_social_connection', 'observe_social_capability',
        'transition_social_connection', 'create_publication',
        'create_publication_version', 'approve_publication_version',
        'create_publication_schedule', 'transition_publication_schedule',
        'enqueue_publication_batch', 'claim_publication_job',
        'transition_publication', 'enqueue_publication_job',
        'authorize_publication_job', 'mark_publication_effect_started',
        'record_publication_job_result', 'recover_expired_publication_job',
        'cancel_publication_batch', 'reconcile_publication_batch'
      )
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  18,
  'service role alone receives all B2-007 tool execution grants'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'register_social_connection', 'observe_social_capability',
        'transition_social_connection', 'create_publication',
        'create_publication_version', 'approve_publication_version',
        'create_publication_schedule', 'transition_publication_schedule',
        'enqueue_publication_batch', 'claim_publication_job',
        'transition_publication', 'enqueue_publication_job',
        'authorize_publication_job', 'mark_publication_effect_started',
        'record_publication_job_result', 'recover_expired_publication_job',
        'cancel_publication_batch', 'reconcile_publication_batch'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'browser roles cannot execute B2-007 service tools'
);

-- Transactional fixtures exercise universal products, pricing, inventory and tenant boundaries.
set local role postgres;

insert into auth.users (id)
values
  ('71000000-0000-4000-8000-000000000001'),
  ('71000000-0000-4000-8000-000000000002'),
  ('71000000-0000-4000-8000-000000000003'),
  ('72000000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    '71000000-0000-4000-8000-000000000010', 'B2-007 Organization A',
    '71000000-0000-4000-8000-000000000001'
  ),
  (
    '72000000-0000-4000-8000-000000000010', 'B2-007 Organization B',
    '72000000-0000-4000-8000-000000000001'
  );

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    '71000000-0000-4000-8000-000000000011', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  ),
  (
    '71000000-0000-4000-8000-000000000012', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000002', 'operator', 'active', statement_timestamp()
  ),
  (
    '71000000-0000-4000-8000-000000000013', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000003', 'viewer', 'active', statement_timestamp()
  ),
  (
    '72000000-0000-4000-8000-000000000011', '72000000-0000-4000-8000-000000000010',
    '72000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  );

set constraints all immediate;

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  (
    '71000000-0000-4000-8000-000000000100', '71000000-0000-4000-8000-000000000010',
    'general', 'Cualquier producto', 'active'
  ),
  (
    '72000000-0000-4000-8000-000000000100', '72000000-0000-4000-8000-000000000010',
    'general', 'Privado B', 'active'
  );

insert into app_private.catalog_units (
  id, organization_id, code, name_singular, name_plural, symbol, quantity_kind,
  decimal_scale, status
)
values
  (
    '71000000-0000-4000-8000-000000000110', '71000000-0000-4000-8000-000000000010',
    'piece', 'pieza', 'piezas', 'pz', 'count', 0, 'active'
  ),
  (
    '72000000-0000-4000-8000-000000000110', '72000000-0000-4000-8000-000000000010',
    'piece', 'pieza', 'piezas', 'pz', 'count', 0, 'active'
  );

insert into app_private.products (id, organization_id, category_id, name, status)
values
  (
    '71000000-0000-4000-8000-000000000150', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000100', 'Producto universal publicable', 'active'
  ),
  (
    '72000000-0000-4000-8000-000000000150', '72000000-0000-4000-8000-000000000010',
    '72000000-0000-4000-8000-000000000100', 'Producto privado B', 'active'
  );

insert into app_private.product_variants (id, organization_id, product_id, name, status)
values
  (
    '71000000-0000-4000-8000-000000000160', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000150', 'Presentacion publicable', 'draft'
  ),
  (
    '72000000-0000-4000-8000-000000000160', '72000000-0000-4000-8000-000000000010',
    '72000000-0000-4000-8000-000000000150', 'Presentacion privada B', 'draft'
  );

insert into app_private.variant_skus (id, organization_id, variant_id, sku, status)
values
  (
    '71000000-0000-4000-8000-000000000170', '71000000-0000-4000-8000-000000000010',
    '71000000-0000-4000-8000-000000000160', 'B2007-UNIVERSAL', 'current'
  ),
  (
    '72000000-0000-4000-8000-000000000170', '72000000-0000-4000-8000-000000000010',
    '72000000-0000-4000-8000-000000000160', 'B2007-PRIVATE', 'current'
  );

update app_private.product_variants
set status = 'active'
where id in (
  '71000000-0000-4000-8000-000000000160',
  '72000000-0000-4000-8000-000000000160'
);

insert into app_private.catalog_evidence (
  id, organization_id, evidence_kind, content, created_by_user_id
)
values (
  '71000000-0000-4000-8000-000000000180',
  '71000000-0000-4000-8000-000000000010',
  'owner_confirmation', '{"instruction":"B2-007 production price"}',
  '71000000-0000-4000-8000-000000000001'
);

insert into app_private.price_books (
  id, organization_id, code, name, currency_code, status, is_default, created_by_user_id
)
values (
  '71000000-0000-4000-8000-000000000200',
  '71000000-0000-4000-8000-000000000010',
  'retail', 'Venta', 'MXN', 'active', true,
  '71000000-0000-4000-8000-000000000001'
);

insert into app_private.price_tiers (
  id, organization_id, price_book_id, variant_id, unit_id, quantity_min,
  quantity_max, pricing_status, calculation_method, price_amount, valid_from,
  valid_until, evidence_id, created_by_user_id
)
values (
  '71000000-0000-4000-8000-000000000300',
  '71000000-0000-4000-8000-000000000010',
  '71000000-0000-4000-8000-000000000200',
  '71000000-0000-4000-8000-000000000160',
  '71000000-0000-4000-8000-000000000110',
  1, null, 'priced', 'per_unit', 1700,
  '2026-01-01 00:00:00+00', '2030-01-01 00:00:00+00',
  '71000000-0000-4000-8000-000000000180',
  '71000000-0000-4000-8000-000000000001'
);

insert into app_private.inventory_items (
  id, organization_id, variant_id, inventory_unit_id, created_by_user_id
)
values (
  '71000000-0000-4000-8000-000000000400',
  '71000000-0000-4000-8000-000000000010',
  '71000000-0000-4000-8000-000000000160',
  '71000000-0000-4000-8000-000000000110',
  '71000000-0000-4000-8000-000000000001'
);

insert into app_private.inventory_locations (
  id, organization_id, code, name, created_by_user_id
)
values (
  '71000000-0000-4000-8000-000000000410',
  '71000000-0000-4000-8000-000000000010',
  'publication_qa', 'Publication QA',
  '71000000-0000-4000-8000-000000000001'
);

set local role service_role;

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '71000000-0000-4000-8000-000000000010', 'b2-007-stock-initial',
    'receipt', 'B2-007 initial inventory',
    $json$[{"inventory_item_id":"71000000-0000-4000-8000-000000000400","location_id":"71000000-0000-4000-8000-000000000410","effect":"delta","quantity":10}]$json$::jsonb,
    null, null, '71000000-0000-4000-8000-000000000001'
  )$$,
  'publication fixture uses real inventory movement API'
);

select set_config(
  'test.b2007_connection_observed_at',
  (statement_timestamp() + interval '1 hour')::text,
  true
);
select set_config(
  'test.b2007_connection_a',
  (
    select social_connection_id::text
    from api.register_social_connection(
      '71000000-0000-4000-8000-000000000010', 'b2-007-connection-a', 'active',
      'b2-007-app-a', 'b2-007-page-a', 'Pagina A', 'v24.0',
      'secret-ref://agentefer/meta/page-a', null,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select set_config(
  'test.b2007_connection_alt',
  (
    select social_connection_id::text
    from api.register_social_connection(
      '71000000-0000-4000-8000-000000000010', 'b2-007-connection-alt', 'active',
      'b2-007-app-alt', 'b2-007-page-alt', 'Pagina alternativa', 'v24.0',
      'secret-ref://agentefer/meta/page-alt', null,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);

select extensions.is(
  (
    select status from app_private.social_connections
    where id = current_setting('test.b2007_connection_a')::uuid
  ),
  'active',
  'owner registers a complete active Facebook Page connection'
);
-- Regression: an idempotent replay must reuse the original observed timestamps;
-- generating a new statement timestamp represents a different request by design.
select extensions.ok(
  (
    select was_replayed from api.register_social_connection(
      '71000000-0000-4000-8000-000000000010', 'b2-007-connection-a', 'active',
      'b2-007-app-a', 'b2-007-page-a', 'Pagina A', 'v24.0',
      'secret-ref://agentefer/meta/page-a', null,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      current_setting('test.b2007_connection_observed_at')::timestamptz,
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  'identical social connection command replays without duplication'
);
select pg_temp.throws_sqlstate(
  $$select * from api.register_social_connection(
    '71000000-0000-4000-8000-000000000010', 'b2-007-connection-a', 'draft',
    null, null, null, null, null, null, null, null,
    '71000000-0000-4000-8000-000000000001'
  )$$,
  '23505',
  'social connection idempotency key rejects a different request'
);

select set_config(
  'test.b2007_capability_granted',
  (
    select social_capability_id::text
    from api.observe_social_capability(
      '71000000-0000-4000-8000-000000000010', 'b2-007-capability-granted',
      current_setting('test.b2007_connection_a')::uuid,
      'page.post.create', 'granted', 'provider_probe',
      '{"max_media":10}', '{"probe":"successful"}',
      statement_timestamp(), statement_timestamp() + interval '1 day',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select extensions.is(
  (
    select status from api.current_social_capabilities
    where id = current_setting('test.b2007_capability_granted')::uuid
  ),
  'granted',
  'latest provider probe grants the required native capability'
);
set local role postgres;
select pg_temp.throws_sqlstate(
  $$update app_private.social_capabilities set status = 'revoked'
    where id = current_setting('test.b2007_capability_granted')::uuid$$,
  '23514',
  'capability observations are append-only evidence'
);
set local role service_role;

select set_config(
  'test.b2007_publication_a',
  (
    select publication_id::text
    from api.create_publication(
      '71000000-0000-4000-8000-000000000010', 'b2-007-publication-a',
      current_setting('test.b2007_connection_a')::uuid,
      '71000000-0000-4000-8000-000000000160',
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.is(
  (
    select status from app_private.publications
    where id = current_setting('test.b2007_publication_a')::uuid
  ),
  'draft',
  'operator creates one logical draft publication for a universal catalog offer'
);
select extensions.ok(
  (
    select was_replayed from api.create_publication(
      '71000000-0000-4000-8000-000000000010', 'b2-007-publication-a',
      current_setting('test.b2007_connection_a')::uuid,
      '71000000-0000-4000-8000-000000000160',
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  'identical publication creation replays'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_publication(
    '71000000-0000-4000-8000-000000000010', 'b2-007-publication-duplicate',
    current_setting('test.b2007_connection_a')::uuid,
    '71000000-0000-4000-8000-000000000160',
    '71000000-0000-4000-8000-000000000002'
  )$$,
  '23505',
  'only one operational publication exists per connection and variant'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_publication(
    '71000000-0000-4000-8000-000000000010', 'b2-007-publication-cross-tenant',
    current_setting('test.b2007_connection_a')::uuid,
    '72000000-0000-4000-8000-000000000160',
    '71000000-0000-4000-8000-000000000002'
  )$$,
  '23514',
  'publication creation rejects a variant from another organization'
);

select set_config(
  'test.b2007_version_a',
  (
    select publication_version_id::text
    from api.create_publication_version(
      '71000000-0000-4000-8000-000000000010', 'b2-007-version-a',
      current_setting('test.b2007_publication_a')::uuid,
      'Producto disponible. Precio por pieza.', 'Producto universal',
      'Enviar mensaje', '{"source":"owner_instruction"}',
      '71000000-0000-4000-8000-000000000300', '[]'::jsonb,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.is(
  (
    select concat(pricing_status, ':', price_amount, ':', currency_code)
    from app_private.publication_versions
    where id = current_setting('test.b2007_version_a')::uuid
  ),
  'priced:1700:MXN',
  'publication version freezes the current catalog price provenance'
);
select extensions.ok(
  (
    select was_replayed from api.create_publication_version(
      '71000000-0000-4000-8000-000000000010', 'b2-007-version-a',
      current_setting('test.b2007_publication_a')::uuid,
      'Producto disponible. Precio por pieza.', 'Producto universal',
      'Enviar mensaje', '{"source":"owner_instruction"}',
      '71000000-0000-4000-8000-000000000300', '[]'::jsonb,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  'identical publication version command replays'
);
select pg_temp.throws_sqlstate(
  $$select * from api.approve_publication_version(
    '71000000-0000-4000-8000-000000000010', 'b2-007-viewer-approval',
    current_setting('test.b2007_version_a')::uuid, 'active', 'viewer attempt',
    '71000000-0000-4000-8000-000000000003'
  )$$,
  '42501',
  'viewer cannot approve content for external publication'
);
select extensions.lives_ok(
  $$select * from api.approve_publication_version(
    '71000000-0000-4000-8000-000000000010', 'b2-007-approve-a',
    current_setting('test.b2007_version_a')::uuid, 'active', 'owner approved',
    '71000000-0000-4000-8000-000000000001'
  )$$,
  'owner approves the exact immutable version for publication'
);
select extensions.is(
  (
    select concat(publication_value.status, ':', version_value.status)
    from app_private.publications as publication_value
    join app_private.publication_versions as version_value
      on version_value.id = publication_value.current_version_id
    where publication_value.id = current_setting('test.b2007_publication_a')::uuid
  ),
  'active:approved',
  'approval atomically activates publication and selected version'
);
set local role postgres;
select pg_temp.throws_sqlstate(
  $$update app_private.publication_versions set body = 'tampered'
    where id = current_setting('test.b2007_version_a')::uuid$$,
  '23514',
  'approved publication snapshot cannot be rewritten'
);
select pg_temp.throws_sqlstate(
  $$delete from app_private.publication_events
    where organization_id = '71000000-0000-4000-8000-000000000010'$$,
  '23514',
  'publication audit events cannot be erased'
);
set local role service_role;

-- A worker receives a lease, reauthorizes current facts, starts one effect and records provenance.
select set_config(
  'test.b2007_publish_scheduled_for',
  statement_timestamp()::text,
  true
);
select set_config(
  'test.b2007_publish_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-publish',
      current_setting('test.b2007_publication_a')::uuid,
      'publish', 'page.post.create', 'b2-007-effect-publish',
      current_setting('test.b2007_version_a')::uuid, null,
      current_setting('test.b2007_publish_scheduled_for')::timestamptz, 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.ok(
  (
    select was_replayed from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-publish',
      current_setting('test.b2007_publication_a')::uuid,
      'publish', 'page.post.create', 'b2-007-effect-publish',
      current_setting('test.b2007_version_a')::uuid, null,
      current_setting('test.b2007_publish_scheduled_for')::timestamptz, 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  'identical job enqueue replays without another external effect'
);
select pg_temp.throws_sqlstate(
  $$select * from api.enqueue_publication_job(
    '71000000-0000-4000-8000-000000000010', 'b2-007-job-publish',
    current_setting('test.b2007_publication_a')::uuid,
    'refresh', 'page.post.create', 'b2-007-effect-other',
    current_setting('test.b2007_version_a')::uuid, null,
    statement_timestamp(), 10, 4,
    '71000000-0000-4000-8000-000000000002'
  )$$,
  '23505',
  'job idempotency key cannot represent a different requested effect'
);

select set_config(
  'test.b2007_publish_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_publish_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select status from app_private.publication_jobs
    where id = current_setting('test.b2007_publish_job')::uuid
  ),
  'processing',
  'worker claim leases exactly the queued publication job'
);
select extensions.is(
  (
    select authorization_status
    from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_publish_job')::uuid,
      current_setting('test.b2007_publish_lease')::uuid,
      statement_timestamp()
    )
  ),
  'allowed',
  'last-moment authorization allows current connection capability price and stock'
);
select extensions.ok(
  (
    select (authorization_snapshot->>'price_is_current')::boolean
      and (authorization_snapshot->>'direct_available_quantity')::numeric = 10
    from app_private.publication_jobs
    where id = current_setting('test.b2007_publish_job')::uuid
  ),
  'authorization persists exact price and availability evidence'
);
select set_config(
  'test.b2007_effect_started_at',
  api.mark_publication_effect_started(
    '71000000-0000-4000-8000-000000000010',
    current_setting('test.b2007_publish_job')::uuid,
    current_setting('test.b2007_publish_lease')::uuid,
    statement_timestamp()
  )::text,
  true
);
select extensions.is(
  api.mark_publication_effect_started(
    '71000000-0000-4000-8000-000000000010',
    current_setting('test.b2007_publish_job')::uuid,
    current_setting('test.b2007_publish_lease')::uuid,
    statement_timestamp()
  )::text,
  current_setting('test.b2007_effect_started_at'),
  'effect-start marker is idempotent inside the active lease'
);
select extensions.is(
  (
    select status from api.record_publication_job_result(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_publish_job')::uuid,
      current_setting('test.b2007_publish_lease')::uuid,
      'succeeded', 'confirmed_applied', 'provider-request-a',
      'facebook-post-a', 'https://facebook.invalid/post-a', 'published',
      '{"provider":"meta"}', null, null, null, null, statement_timestamp()
    )
  ),
  'succeeded',
  'confirmed provider result completes the publication job'
);
select extensions.is(
  (
    select count(*)::integer from app_private.publication_instances
    where publication_id = current_setting('test.b2007_publication_a')::uuid
      and external_publication_id = 'facebook-post-a'
      and status = 'published'
  ),
  1,
  'successful publish creates one immutable provider instance'
);
select extensions.is(
  (
    select external_publication_id from api.publication_origin_lookup
    where publication_id = current_setting('test.b2007_publication_a')::uuid
      and external_publication_id = 'facebook-post-a'
  ),
  'facebook-post-a',
  'origin lookup can route an inbound Messenger lead to its exact publication'
);

-- Refresh creates a new provider instance; it never rewrites the original post identity.
select set_config(
  'test.b2007_refresh_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-refresh',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-refresh',
      current_setting('test.b2007_version_a')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_refresh_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_refresh_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_status from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_refresh_job')::uuid,
      current_setting('test.b2007_refresh_lease')::uuid,
      statement_timestamp()
    )
  ),
  'allowed',
  'refresh is reauthorized against current business facts'
);
select api.mark_publication_effect_started(
  '71000000-0000-4000-8000-000000000010',
  current_setting('test.b2007_refresh_job')::uuid,
  current_setting('test.b2007_refresh_lease')::uuid,
  statement_timestamp()
);
select extensions.is(
  (
    select status from api.record_publication_job_result(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_refresh_job')::uuid,
      current_setting('test.b2007_refresh_lease')::uuid,
      'succeeded', 'confirmed_applied', 'provider-request-b',
      'facebook-post-b', 'https://facebook.invalid/post-b', 'published',
      '{"provider":"meta"}', null, null, null, null, statement_timestamp()
    )
  ),
  'succeeded',
  'refresh records a second confirmed external publication'
);
select extensions.is(
  (
    select count(*)::integer from app_private.publication_instances
    where publication_id = current_setting('test.b2007_publication_a')::uuid
      and status = 'published'
  ),
  2,
  'refresh preserves both provider instances for audit and lead attribution'
);

-- Revocation observed after enqueue blocks the job before any external effect.
select set_config(
  'test.b2007_capability_revoked',
  (
    select social_capability_id::text
    from api.observe_social_capability(
      '71000000-0000-4000-8000-000000000010', 'b2-007-capability-revoked',
      current_setting('test.b2007_connection_a')::uuid,
      'page.post.create', 'revoked', 'provider_webhook', '{}'::jsonb,
      '{"reason":"provider_revoked"}', statement_timestamp() + interval '1 second', null,
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select set_config(
  'test.b2007_revoked_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-revoked',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-revoked',
      current_setting('test.b2007_version_a')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_revoked_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_revoked_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_reason from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_revoked_job')::uuid,
      current_setting('test.b2007_revoked_lease')::uuid,
      statement_timestamp()
    )
  ),
  'required_capability_not_granted',
  'provider revocation blocks a previously queued job before effect start'
);
select extensions.is(
  (
    select status from app_private.publication_jobs
    where id = current_setting('test.b2007_revoked_job')::uuid
  ),
  'blocked',
  'blocked authorization terminally records the policy decision'
);

select set_config(
  'test.b2007_capability_regranted',
  (
    select social_capability_id::text
    from api.observe_social_capability(
      '71000000-0000-4000-8000-000000000010', 'b2-007-capability-regranted',
      current_setting('test.b2007_connection_a')::uuid,
      'page.post.create', 'granted', 'provider_probe', '{}'::jsonb,
      '{"probe":"recovered"}', statement_timestamp() + interval '2 seconds',
      statement_timestamp() + interval '1 day',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select extensions.is(
  (
    select status from api.current_social_capabilities
    where id = current_setting('test.b2007_capability_regranted')::uuid
  ),
  'granted',
  'a newer verified observation can restore capability without rewriting history'
);

-- Lease recovery distinguishes a safe retry from an unknown external side effect.
select set_config(
  'test.b2007_retry_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-retry',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-retry',
      current_setting('test.b2007_version_a')::uuid, null,
      statement_timestamp(), 20, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_retry_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 15, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_retry_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select status from api.recover_expired_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_retry_job')::uuid,
      statement_timestamp() + interval '16 seconds'
    )
  ),
  'retryable',
  'expired lease before effect start is safely retryable'
);

select set_config(
  'test.b2007_uncertain_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-uncertain',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-uncertain',
      current_setting('test.b2007_version_a')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_uncertain_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 15, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_uncertain_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_status from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_uncertain_job')::uuid,
      current_setting('test.b2007_uncertain_lease')::uuid,
      statement_timestamp()
    )
  ),
  'allowed',
  'worker must authorize before marking a possible provider effect'
);
select api.mark_publication_effect_started(
  '71000000-0000-4000-8000-000000000010',
  current_setting('test.b2007_uncertain_job')::uuid,
  current_setting('test.b2007_uncertain_lease')::uuid,
  statement_timestamp()
);
select extensions.is(
  (
    select status from api.recover_expired_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_uncertain_job')::uuid,
      statement_timestamp() + interval '16 seconds'
    )
  ),
  'uncertain',
  'expired lease after effect start becomes uncertain and is never blindly retried'
);
select extensions.is(
  (
    select last_error_code from app_private.publication_jobs
    where id = current_setting('test.b2007_uncertain_job')::uuid
  ),
  'worker_lost_after_effect_started',
  'uncertain job preserves the exact recovery reason for reconciliation'
);

-- Batch cancellation removes pending work while preserving immutable history.
select set_config(
  'test.b2007_batch_requested_for',
  (statement_timestamp() + interval '1 hour')::text,
  true
);
select set_config(
  'test.b2007_batch_a',
  (
    select publication_batch_id::text
    from api.enqueue_publication_batch(
      '71000000-0000-4000-8000-000000000010', 'b2-007-batch-a',
      current_setting('test.b2007_connection_a')::uuid,
      'refresh', 'manual',
      jsonb_build_array(current_setting('test.b2007_publication_a')::uuid),
      '{"scope":"selected"}', '{"spacing_seconds":300}',
      current_setting('test.b2007_batch_requested_for')::timestamptz, 100, 4,
      null, null, null, null,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.is(
  (
    select jobs_created from api.enqueue_publication_batch(
      '71000000-0000-4000-8000-000000000010', 'b2-007-batch-a',
      current_setting('test.b2007_connection_a')::uuid,
      'refresh', 'manual',
      jsonb_build_array(current_setting('test.b2007_publication_a')::uuid),
      '{"scope":"selected"}', '{"spacing_seconds":300}',
      current_setting('test.b2007_batch_requested_for')::timestamptz, 100, 4,
      null, null, null, null,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  1,
  'batch replay reports its one previously expanded publication job'
);
select extensions.is(
  (
    select concat(jobs_cancelled, ':', jobs_in_flight, ':', status)
    from api.cancel_publication_batch(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_batch_a')::uuid,
      'b2-007-batch-a-cancel', 'owner cancelled campaign',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  '1:0:cancelled',
  'batch cancellation cancels pending jobs and reaches a terminal state'
);

-- Validated schedules advance one exact generation/occurrence and remain idempotent.
select set_config(
  'test.b2007_schedule_occurrence',
  (statement_timestamp() + interval '2 hours')::text,
  true
);
select set_config(
  'test.b2007_schedule_a',
  (
    select publication_schedule_id::text
    from api.create_publication_schedule(
      '71000000-0000-4000-8000-000000000010', 'b2-007-schedule-a',
      current_setting('test.b2007_connection_a')::uuid,
      'catalog_refresh', 'Republicar catalogo', 'America/Tijuana', '0 14,18 * * *',
      'refresh', '{"scope":"active_catalog"}', '{"spacing_seconds":300}',
      'valid', 'active',
      current_setting('test.b2007_schedule_occurrence')::timestamptz,
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select extensions.is(
  (
    select concat(status, ':', validation_status, ':', generation)
    from app_private.publication_schedules
    where id = current_setting('test.b2007_schedule_a')::uuid
  ),
  'active:valid:1',
  'validated schedule becomes active with generation one'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_publication_schedule(
    '71000000-0000-4000-8000-000000000010', 'b2-007-schedule-invalid-zone',
    current_setting('test.b2007_connection_a')::uuid,
    'bad_zone', 'Zona invalida', 'Mars/Olympus', '0 14 * * *',
    'refresh', '{}'::jsonb, '{}'::jsonb, 'valid', 'active',
    statement_timestamp() + interval '3 hours',
    '71000000-0000-4000-8000-000000000001'
  )$$,
  '22023',
  'schedule rejects an unknown IANA timezone'
);
select set_config(
  'test.b2007_schedule_batch',
  (
    select publication_batch_id::text
    from api.enqueue_publication_batch(
      '71000000-0000-4000-8000-000000000010', 'b2-007-schedule-occurrence-a',
      current_setting('test.b2007_connection_a')::uuid,
      'refresh', 'schedule',
      jsonb_build_array(current_setting('test.b2007_publication_a')::uuid),
      '{"scope":"active_catalog"}', '{"spacing_seconds":300}',
      current_setting('test.b2007_schedule_occurrence')::timestamptz,
      100, 4, current_setting('test.b2007_schedule_a')::uuid, 1,
      current_setting('test.b2007_schedule_occurrence')::timestamptz,
      current_setting('test.b2007_schedule_occurrence')::timestamptz + interval '4 hours',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  true
);
select extensions.is(
  (
    select count(*)::integer from app_private.publication_jobs
    where batch_id = current_setting('test.b2007_schedule_batch')::uuid
  ),
  1,
  'one due schedule occurrence expands one selected active publication'
);
select extensions.is(
  (
    select concat(
      last_enqueued_at = current_setting('test.b2007_schedule_occurrence')::timestamptz,
      ':',
      next_run_at = current_setting('test.b2007_schedule_occurrence')::timestamptz
        + interval '4 hours'
    )
    from app_private.publication_schedules
    where id = current_setting('test.b2007_schedule_a')::uuid
  ),
  't:t',
  'schedule atomically records its occurrence and advances the next run'
);
select extensions.ok(
  (
    select was_replayed from api.enqueue_publication_batch(
      '71000000-0000-4000-8000-000000000010', 'b2-007-schedule-occurrence-a',
      current_setting('test.b2007_connection_a')::uuid,
      'refresh', 'schedule',
      jsonb_build_array(current_setting('test.b2007_publication_a')::uuid),
      '{"scope":"active_catalog"}', '{"spacing_seconds":300}',
      current_setting('test.b2007_schedule_occurrence')::timestamptz,
      100, 4, current_setting('test.b2007_schedule_a')::uuid, 1,
      current_setting('test.b2007_schedule_occurrence')::timestamptz,
      current_setting('test.b2007_schedule_occurrence')::timestamptz + interval '4 hours',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  'same schedule occurrence replays without duplicate jobs'
);
select pg_temp.throws_sqlstate(
  $$select * from api.enqueue_publication_batch(
    '71000000-0000-4000-8000-000000000010', 'b2-007-schedule-occurrence-stale',
    current_setting('test.b2007_connection_a')::uuid,
    'refresh', 'schedule',
    jsonb_build_array(current_setting('test.b2007_publication_a')::uuid),
    '{"scope":"active_catalog"}', '{"spacing_seconds":300}',
    current_setting('test.b2007_schedule_occurrence')::timestamptz,
    100, 4, current_setting('test.b2007_schedule_a')::uuid, 1,
    current_setting('test.b2007_schedule_occurrence')::timestamptz,
    current_setting('test.b2007_schedule_occurrence')::timestamptz + interval '4 hours',
    '71000000-0000-4000-8000-000000000001'
  )$$,
  '23514',
  'stale scheduler cannot enqueue an occurrence after next_run advanced'
);
select extensions.is(
  (
    select status from api.cancel_publication_batch(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_schedule_batch')::uuid,
      'b2-007-schedule-batch-cancel', 'QA cleanup of future scheduled job',
      '71000000-0000-4000-8000-000000000001'
    )
  ),
  'cancelled',
  'scheduled future job can be cancelled without losing its audit trail'
);

-- Authorization rejects facts that changed after enqueue instead of publishing stale claims.
select set_config(
  'test.b2007_price_stale_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-price-stale',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-price-stale',
      current_setting('test.b2007_version_a')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.lives_ok(
  $$update app_private.price_tiers
    set superseded_at = statement_timestamp()
    where id = '71000000-0000-4000-8000-000000000300'$$,
  'owner-confirmed price tier can be superseded once'
);
select extensions.lives_ok(
  $$insert into app_private.price_tiers (
      id, organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, valid_until, supersedes_price_tier_id, evidence_id, created_by_user_id
    ) values (
      '71000000-0000-4000-8000-000000000301',
      '71000000-0000-4000-8000-000000000010',
      '71000000-0000-4000-8000-000000000200',
      '71000000-0000-4000-8000-000000000160',
      '71000000-0000-4000-8000-000000000110',
      1, null, 'priced', 'per_unit', 1800,
      '2026-01-01 00:00:00+00', '2030-01-01 00:00:00+00',
      '71000000-0000-4000-8000-000000000300',
      '71000000-0000-4000-8000-000000000180',
      '71000000-0000-4000-8000-000000000001'
    )$$,
  'replacement price tier preserves predecessor and evidence'
);
select set_config(
  'test.b2007_price_stale_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_price_stale_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_reason from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_price_stale_job')::uuid,
      current_setting('test.b2007_price_stale_lease')::uuid,
      statement_timestamp()
    )
  ),
  'price_snapshot_stale',
  'queued publication is blocked when its exact price tier was superseded'
);

select set_config(
  'test.b2007_version_b',
  (
    select publication_version_id::text
    from api.create_publication_version(
      '71000000-0000-4000-8000-000000000010', 'b2-007-version-b',
      current_setting('test.b2007_publication_a')::uuid,
      'Producto disponible. Nuevo precio por pieza.', 'Producto universal',
      'Enviar mensaje', '{"source":"owner_price_change"}',
      '71000000-0000-4000-8000-000000000301', '[]'::jsonb,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select extensions.is(
  (
    select price_amount from app_private.publication_versions
    where id = current_setting('test.b2007_version_b')::uuid
  ),
  1800::numeric,
  'new publication version snapshots the replacement price'
);
select extensions.lives_ok(
  $$select * from api.approve_publication_version(
    '71000000-0000-4000-8000-000000000010', 'b2-007-approve-b',
    current_setting('test.b2007_version_b')::uuid, 'active', 'new price approved',
    '71000000-0000-4000-8000-000000000001'
  )$$,
  'owner atomically supersedes the old content version with the new price'
);

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '71000000-0000-4000-8000-000000000010', 'b2-007-stock-depleted',
    'sale', 'all units sold',
    $json$[{"inventory_item_id":"71000000-0000-4000-8000-000000000400","location_id":"71000000-0000-4000-8000-000000000410","effect":"delta","quantity":-10}]$json$::jsonb,
    null, null, '71000000-0000-4000-8000-000000000001'
  )$$,
  'real inventory movement records that all units were sold'
);
select set_config(
  'test.b2007_stock_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-stock-empty',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-stock-empty',
      current_setting('test.b2007_version_b')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_stock_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_stock_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_reason from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_stock_job')::uuid,
      current_setting('test.b2007_stock_lease')::uuid,
      statement_timestamp()
    )
  ),
  'stock_unavailable',
  'tracked zero stock blocks a queued publication before provider effect'
);
select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '71000000-0000-4000-8000-000000000010', 'b2-007-stock-restored',
    'receipt', 'new units arrived',
    $json$[{"inventory_item_id":"71000000-0000-4000-8000-000000000400","location_id":"71000000-0000-4000-8000-000000000410","effect":"delta","quantity":10}]$json$::jsonb,
    null, null, '71000000-0000-4000-8000-000000000001'
  )$$,
  'new receipt restores publishable stock through the inventory ledger'
);

select set_config(
  'test.b2007_catalog_stale_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-catalog-stale',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-catalog-stale',
      current_setting('test.b2007_version_b')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
set local role postgres;
select extensions.lives_ok(
  $$update app_private.product_variants
    set name = 'Presentacion publicable actualizada'
    where id = '71000000-0000-4000-8000-000000000160'$$,
  'catalog fact change advances the variant snapshot timestamp'
);
set local role service_role;
select set_config(
  'test.b2007_catalog_stale_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_catalog_stale_job')::uuid
  ),
  true
);
select extensions.is(
  (
    select authorization_reason from api.authorize_publication_job(
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_catalog_stale_job')::uuid,
      current_setting('test.b2007_catalog_stale_lease')::uuid,
      statement_timestamp()
    )
  ),
  'catalog_snapshot_stale',
  'catalog change after version approval blocks stale publication content'
);
select pg_temp.throws_sqlstate(
  $$select * from api.enqueue_publication_job(
    '71000000-0000-4000-8000-000000000010', 'b2-007-job-uncertain-duplicate-effect',
    current_setting('test.b2007_publication_a')::uuid,
    'refresh', 'page.post.create', 'b2-007-effect-uncertain',
    current_setting('test.b2007_version_b')::uuid, null,
    statement_timestamp(), 10, 4,
    '71000000-0000-4000-8000-000000000002'
  )$$,
  '23505',
  'unknown external effect key cannot be enqueued again for a blind retry'
);

-- Mutation guards prove that effect contracts, instance provenance and current versions are enforced.
set local role postgres;
select pg_temp.throws_sqlstate(
  $$update app_private.publication_jobs
    set external_effect_key = 'b2-007-tampered-effect'
    where id = current_setting('test.b2007_publish_job')::uuid$$,
  '23514',
  'publication job effect contract cannot be rewritten after enqueue'
);
set local role service_role;

select set_config(
  'test.b2007_provenance_job',
  (
    select publication_job_id::text
    from api.enqueue_publication_job(
      '71000000-0000-4000-8000-000000000010', 'b2-007-job-provenance',
      current_setting('test.b2007_publication_a')::uuid,
      'refresh', 'page.post.create', 'b2-007-effect-provenance',
      current_setting('test.b2007_version_b')::uuid, null,
      statement_timestamp(), 10, 4,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
select set_config(
  'test.b2007_provenance_lease',
  (
    select lease_token::text
    from api.claim_publication_job('b2-007-worker-a', 120, statement_timestamp())
    where publication_job_id = current_setting('test.b2007_provenance_job')::uuid
  ),
  true
);
set local role postgres;
select pg_temp.throws_sqlstate(
  $$insert into app_private.publication_instances (
      organization_id, social_connection_id, publication_id, publication_version_id,
      creation_job_id, external_publication_id, external_url, status,
      provider_created_at, provider_updated_at, last_reconciled_at, response_summary
    ) values (
      '71000000-0000-4000-8000-000000000010',
      current_setting('test.b2007_connection_alt')::uuid,
      current_setting('test.b2007_publication_a')::uuid,
      current_setting('test.b2007_version_b')::uuid,
      current_setting('test.b2007_provenance_job')::uuid,
      'facebook-forged-provenance', 'https://facebook.invalid/forged', 'published',
      statement_timestamp(), statement_timestamp(), statement_timestamp(),
      '{"source":"forged"}'::jsonb
    )$$,
  '23514',
  'publication instance rejects a different connection than its exact processing job'
);
set local role service_role;

select set_config(
  'test.b2007_version_draft',
  (
    select publication_version_id::text
    from api.create_publication_version(
      '71000000-0000-4000-8000-000000000010', 'b2-007-version-draft',
      current_setting('test.b2007_publication_a')::uuid,
      'Borrador posterior al cambio de catalogo.', 'Borrador no aprobado',
      'Enviar mensaje', '{"source":"draft_mutation_guard"}',
      '71000000-0000-4000-8000-000000000301', '[]'::jsonb,
      '71000000-0000-4000-8000-000000000002'
    )
  ),
  true
);
set local role postgres;
select pg_temp.throws_sqlstate(
  $$update app_private.publications
    set current_version_id = current_setting('test.b2007_version_draft')::uuid
    where id = current_setting('test.b2007_publication_a')::uuid$$,
  '23514',
  'publication current version cannot point to an unapproved draft'
);
set local role service_role;

-- RLS exposes projections to the owning tenant only and never grants browser mutation tools.
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000003', true);
select extensions.ok(
  exists (
    select 1 from api.publications
    where organization_id = '71000000-0000-4000-8000-000000000010'
  ),
  'viewer reads publication projections for the own organization'
);
select extensions.is(
  (
    select count(*)::integer from api.publications
    where organization_id = '72000000-0000-4000-8000-000000000010'
  ),
  0,
  'RLS hides every other organization publication'
);
select extensions.is(
  (
    select count(*)::integer from api.social_connections
    where organization_id = '72000000-0000-4000-8000-000000000010'
  ),
  0,
  'RLS hides every other organization social connection'
);

select * from extensions.finish();

rollback;
