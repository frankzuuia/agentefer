begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(109);

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

-- Physical production contract.
select extensions.has_table('app_private', 'inventory_items', 'inventory_items table exists');
select extensions.has_table('app_private', 'inventory_locations', 'inventory_locations table exists');
select extensions.has_table('app_private', 'inventory_compositions', 'inventory_compositions table exists');
select extensions.has_table(
  'app_private',
  'inventory_composition_components',
  'inventory_composition_components table exists'
);
select extensions.has_table('app_private', 'inventory_commands', 'inventory_commands table exists');
select extensions.has_table('app_private', 'inventory_balances', 'inventory_balances table exists');
select extensions.has_table('app_private', 'inventory_operations', 'inventory_operations table exists');
select extensions.has_table('app_private', 'inventory_movements', 'inventory_movements table exists');
select extensions.has_table('app_private', 'inventory_reservations', 'inventory_reservations table exists');
select extensions.has_table(
  'app_private',
  'inventory_reservation_lines',
  'inventory_reservation_lines table exists'
);
select extensions.has_table(
  'app_private',
  'inventory_reservation_events',
  'inventory_reservation_events table exists'
);
select extensions.has_table(
  'app_private',
  'inventory_reservation_event_lines',
  'inventory_reservation_event_lines table exists'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'inventory_items',
        'inventory_locations',
        'inventory_compositions',
        'inventory_composition_components',
        'inventory_balances',
        'inventory_availability',
        'inventory_composition_availability',
        'inventory_operations',
        'inventory_movements',
        'inventory_reservations',
        'inventory_reservation_lines',
        'inventory_reservation_events',
        'inventory_reservation_event_lines'
      )
      and relation.relkind = 'v'
  ),
  13,
  'all thirteen B2-005 API views exist'
);

select extensions.has_function(
  'api',
  'apply_inventory_movement',
  array['uuid', 'text', 'text', 'text', 'jsonb', 'text', 'text', 'uuid', 'timestamp with time zone'],
  'atomic direct movement RPC exists'
);
select extensions.has_function(
  'api',
  'apply_inventory_composition_movement',
  array[
    'uuid', 'text', 'text', 'text', 'uuid', 'numeric', 'jsonb', 'text', 'text', 'uuid',
    'timestamp with time zone'
  ],
  'atomic composition movement RPC exists'
);
select extensions.has_function(
  'api',
  'resolve_inventory_requirements',
  array['uuid', 'uuid', 'numeric'],
  'composition requirement resolver exists'
);
select extensions.has_function(
  'api',
  'create_inventory_reservation',
  array['uuid', 'text', 'timestamp with time zone', 'jsonb', 'text', 'text', 'text', 'uuid'],
  'atomic direct reservation RPC exists'
);
select extensions.has_function(
  'api',
  'create_inventory_composition_reservation',
  array[
    'uuid', 'text', 'timestamp with time zone', 'uuid', 'numeric', 'jsonb', 'text', 'text',
    'text', 'uuid'
  ],
  'atomic composition reservation RPC exists'
);
select extensions.has_function(
  'api',
  'transition_inventory_reservation',
  array['uuid', 'uuid', 'text', 'text', 'text', 'jsonb', 'uuid', 'timestamp with time zone'],
  'atomic reservation transition RPC exists'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'inventory_items',
        'inventory_locations',
        'inventory_compositions',
        'inventory_composition_components',
        'inventory_commands',
        'inventory_balances',
        'inventory_operations',
        'inventory_movements',
        'inventory_reservations',
        'inventory_reservation_lines',
        'inventory_reservation_events',
        'inventory_reservation_event_lines'
      )
      and relation.relrowsecurity
  ),
  12,
  'RLS is enabled on all B2-005 tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname like 'inventory_%'
      and relation.relkind = 'r'
      and relation.relforcerowsecurity
  ),
  12,
  'RLS is forced on all B2-005 tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename like 'inventory_%'
  ),
  12,
  'every B2-005 table has exactly one authenticated read policy'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname like 'inventory_%'
      and relation.relkind = 'v'
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  13,
  'all B2-005 API views preserve caller RLS and security barrier'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name like 'inventory_%'
      and column_name in (
        'quantity_per_sale_unit',
        'on_hand_quantity',
        'reserved_quantity',
        'available_quantity',
        'quantity_delta',
        'on_hand_quantity_after',
        'reserved_quantity_after',
        'sale_quantity',
        'consumed_quantity',
        'released_quantity',
        'quantity'
      )
      and data_type = 'numeric'
  ),
  13,
  'all B2-005 quantities use exact numeric columns'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conrelid in (
        'app_private.inventory_items'::regclass,
        'app_private.inventory_locations'::regclass,
        'app_private.inventory_compositions'::regclass,
        'app_private.inventory_composition_components'::regclass,
        'app_private.inventory_commands'::regclass,
        'app_private.inventory_balances'::regclass,
        'app_private.inventory_operations'::regclass,
        'app_private.inventory_movements'::regclass,
        'app_private.inventory_reservations'::regclass,
        'app_private.inventory_reservation_lines'::regclass,
        'app_private.inventory_reservation_events'::regclass,
        'app_private.inventory_reservation_event_lines'::regclass
      )
      and not exists (
        select 1
        from pg_catalog.pg_index as index_value
        where index_value.indrelid = foreign_key.conrelid
          and index_value.indisvalid
          and index_value.indisready
          and (
            string_to_array(index_value.indkey::text, ' ')::smallint[]
          )[1:cardinality(foreign_key.conkey)] = foreign_key.conkey
      )
  ),
  0,
  'every B2-005 foreign key column is indexed'
);

select extensions.ok(
  has_table_privilege('authenticated', 'app_private.inventory_balances', 'SELECT')
    and not has_table_privilege('authenticated', 'app_private.inventory_balances', 'INSERT')
    and not has_table_privilege('authenticated', 'app_private.inventory_balances', 'UPDATE')
    and not has_table_privilege('authenticated', 'app_private.inventory_balances', 'DELETE'),
  'authenticated receives read-only inventory access for invoker views'
);
select extensions.ok(
  has_table_privilege('service_role', 'app_private.inventory_items', 'INSERT')
    and has_table_privilege('service_role', 'app_private.inventory_items', 'UPDATE')
    and not has_table_privilege('service_role', 'app_private.inventory_items', 'DELETE')
    and has_table_privilege('service_role', 'app_private.inventory_composition_components', 'INSERT')
    and not has_table_privilege('service_role', 'app_private.inventory_composition_components', 'UPDATE'),
  'service role can configure inventory without rewriting composition history'
);
select extensions.ok(
  has_table_privilege('service_role', 'app_private.inventory_balances', 'SELECT')
    and not has_table_privilege('service_role', 'app_private.inventory_balances', 'INSERT')
    and not has_table_privilege('service_role', 'app_private.inventory_balances', 'UPDATE')
    and not has_table_privilege('service_role', 'app_private.inventory_movements', 'DELETE')
    and not has_table_privilege('service_role', 'app_private.inventory_reservations', 'UPDATE'),
  'service role cannot bypass atomic inventory RPCs or erase history'
);
select extensions.ok(
  not has_table_privilege('anon', 'api.inventory_balances', 'SELECT')
    and not has_table_privilege('anon', 'api.inventory_reservations', 'SELECT')
    and not has_table_privilege('anon', 'api.inventory_movements', 'SELECT'),
  'anonymous receives no B2-005 inventory privileges'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.apply_inventory_movement(uuid,text,text,text,jsonb,text,text,uuid,timestamptz)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'api.apply_inventory_movement(uuid,text,text,text,jsonb,text,text,uuid,timestamptz)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'api.apply_inventory_movement(uuid,text,text,text,jsonb,text,text,uuid,timestamptz)',
      'EXECUTE'
    ),
  'only service role can execute B2-005 mutators'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'api.resolve_inventory_requirements(uuid,uuid,numeric)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'api.resolve_inventory_requirements(uuid,uuid,numeric)',
      'EXECUTE'
    ),
  'authenticated members can resolve requirements while anonymous remains disabled'
);

-- Tenant, catalog and inventory fixtures.
set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  (
    '51000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'b2-005-owner-a@example.invalid', ''
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'b2-005-viewer-a@example.invalid', ''
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'b2-005-operator-a@example.invalid', ''
  ),
  (
    '52000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'b2-005-owner-b@example.invalid', ''
  );

insert into app_private.organizations (id, name, created_by_user_id)
values
  ('51000000-0000-4000-8000-000000000010', 'B2-005 Organization A', '51000000-0000-4000-8000-000000000001'),
  ('52000000-0000-4000-8000-000000000010', 'B2-005 Organization B', '52000000-0000-4000-8000-000000000001');

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    '51000000-0000-4000-8000-000000000020', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  ),
  (
    '51000000-0000-4000-8000-000000000021', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000002', 'viewer', 'active', statement_timestamp()
  ),
  (
    '51000000-0000-4000-8000-000000000022', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000003', 'operator', 'active', statement_timestamp()
  ),
  (
    '52000000-0000-4000-8000-000000000020', '52000000-0000-4000-8000-000000000010',
    '52000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  );

set constraints all immediate;

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  ('51000000-0000-4000-8000-000000000100', '51000000-0000-4000-8000-000000000010', 'general', 'General A', 'active'),
  ('52000000-0000-4000-8000-000000000100', '52000000-0000-4000-8000-000000000010', 'general', 'General B', 'active');

insert into app_private.catalog_units (
  id, organization_id, code, name_singular, name_plural, symbol, quantity_kind,
  decimal_scale, status
)
values
  (
    '51000000-0000-4000-8000-000000000110', '51000000-0000-4000-8000-000000000010',
    'piece', 'pieza', 'piezas', 'pz', 'count', 0, 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000111', '51000000-0000-4000-8000-000000000010',
    'liter', 'litro', 'litros', 'L', 'volume', 2, 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000112', '51000000-0000-4000-8000-000000000010',
    'package', 'paquete', 'paquetes', 'paq', 'count', 0, 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000113', '51000000-0000-4000-8000-000000000010',
    'retired', 'retirada', 'retiradas', null, 'count', 0, 'retired'
  ),
  (
    '52000000-0000-4000-8000-000000000110', '52000000-0000-4000-8000-000000000010',
    'piece', 'pieza', 'piezas', 'pz', 'count', 0, 'active'
  );

insert into app_private.products (id, organization_id, category_id, name, status)
values
  (
    '51000000-0000-4000-8000-000000000150', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000100', 'Componente A', 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000151', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000100', 'Componente B', 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000152', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000100', 'Combo universal', 'active'
  ),
  (
    '51000000-0000-4000-8000-000000000153', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000100', 'Producto fraccionable', 'active'
  ),
  (
    '52000000-0000-4000-8000-000000000150', '52000000-0000-4000-8000-000000000010',
    '52000000-0000-4000-8000-000000000100', 'Producto B', 'active'
  );

insert into app_private.product_variants (id, organization_id, product_id, name, status)
values
  (
    '51000000-0000-4000-8000-000000000160', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000150', 'Componente A estándar', 'draft'
  ),
  (
    '51000000-0000-4000-8000-000000000161', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000151', 'Componente B estándar', 'draft'
  ),
  (
    '51000000-0000-4000-8000-000000000162', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000152', 'Combo A+B', 'draft'
  ),
  (
    '51000000-0000-4000-8000-000000000163', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000153', 'Volumen estándar', 'draft'
  ),
  (
    '52000000-0000-4000-8000-000000000160', '52000000-0000-4000-8000-000000000010',
    '52000000-0000-4000-8000-000000000150', 'Producto B estándar', 'draft'
  );

insert into app_private.variant_skus (id, organization_id, variant_id, sku)
values
  ('51000000-0000-4000-8000-000000000170', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000160', 'B2005-A'),
  ('51000000-0000-4000-8000-000000000171', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000161', 'B2005-B'),
  ('51000000-0000-4000-8000-000000000172', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000162', 'B2005-COMBO'),
  ('51000000-0000-4000-8000-000000000173', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000163', 'B2005-VOLUME'),
  ('52000000-0000-4000-8000-000000000170', '52000000-0000-4000-8000-000000000010', '52000000-0000-4000-8000-000000000160', 'B2005-TENANT-B');

update app_private.product_variants
set status = 'active'
where id in (
  '51000000-0000-4000-8000-000000000160',
  '51000000-0000-4000-8000-000000000161',
  '51000000-0000-4000-8000-000000000162',
  '51000000-0000-4000-8000-000000000163',
  '52000000-0000-4000-8000-000000000160'
);

insert into app_private.inventory_items (
  id, organization_id, variant_id, inventory_unit_id, created_by_user_id
)
values
  (
    '51000000-0000-4000-8000-000000000200', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000160', '51000000-0000-4000-8000-000000000110',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '51000000-0000-4000-8000-000000000201', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000161', '51000000-0000-4000-8000-000000000110',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '51000000-0000-4000-8000-000000000202', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000163', '51000000-0000-4000-8000-000000000111',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '52000000-0000-4000-8000-000000000200', '52000000-0000-4000-8000-000000000010',
    '52000000-0000-4000-8000-000000000160', '52000000-0000-4000-8000-000000000110',
    '52000000-0000-4000-8000-000000000001'
  );

insert into app_private.inventory_locations (
  id, organization_id, code, name, created_by_user_id
)
values
  (
    '51000000-0000-4000-8000-000000000210', '51000000-0000-4000-8000-000000000010',
    'main', 'Principal', '51000000-0000-4000-8000-000000000001'
  ),
  (
    '51000000-0000-4000-8000-000000000211', '51000000-0000-4000-8000-000000000010',
    'secondary', 'Secundaria', '51000000-0000-4000-8000-000000000001'
  ),
  (
    '52000000-0000-4000-8000-000000000210', '52000000-0000-4000-8000-000000000010',
    'main', 'Principal B', '52000000-0000-4000-8000-000000000001'
  );

insert into app_private.inventory_compositions (
  id, organization_id, offered_variant_id, sale_unit_id, created_by_user_id
)
values
  (
    '51000000-0000-4000-8000-000000000220', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000162', '51000000-0000-4000-8000-000000000112',
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '51000000-0000-4000-8000-000000000229', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000160', '51000000-0000-4000-8000-000000000110',
    '51000000-0000-4000-8000-000000000001'
  );

insert into app_private.inventory_composition_components (
  id, organization_id, composition_id, inventory_item_id, quantity_per_sale_unit,
  created_by_user_id
)
values
  (
    '51000000-0000-4000-8000-000000000230', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000220', '51000000-0000-4000-8000-000000000200', 4,
    '51000000-0000-4000-8000-000000000001'
  ),
  (
    '51000000-0000-4000-8000-000000000231', '51000000-0000-4000-8000-000000000010',
    '51000000-0000-4000-8000-000000000220', '51000000-0000-4000-8000-000000000201', 1,
    '51000000-0000-4000-8000-000000000001'
  );

select pg_temp.throws_sqlstate(
  $$insert into app_private.inventory_items (
      organization_id, variant_id, inventory_unit_id
    ) values (
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000162',
      '51000000-0000-4000-8000-000000000113'
    )$$,
  '23514',
  'active inventory item rejects a retired inventory unit'
);

select pg_temp.throws_sqlstate(
  $$update app_private.inventory_compositions
    set status = 'active', effective_at = clock_timestamp()
    where id = '51000000-0000-4000-8000-000000000229'$$,
  '23514',
  'empty inventory composition cannot activate'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.inventory_composition_components (
      organization_id, composition_id, inventory_item_id, quantity_per_sale_unit
    ) values (
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000229',
      '51000000-0000-4000-8000-000000000200',
      0.5
    )$$,
  '23514',
  'indivisible component quantity rejects fractions without rounding'
);

select extensions.lives_ok(
  $$update app_private.inventory_compositions
    set status = 'active', effective_at = clock_timestamp()
    where id = '51000000-0000-4000-8000-000000000220'$$,
  'declared multi-component package activates'
);

select extensions.is(
  (
    select required_quantity
    from api.resolve_inventory_requirements(
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000220',
      1
    )
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
  ),
  4::numeric,
  'package resolver returns four units of component A'
);
select extensions.is(
  (
    select required_quantity
    from api.resolve_inventory_requirements(
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000220',
      1
    )
    where inventory_item_id = '51000000-0000-4000-8000-000000000201'
  ),
  1::numeric,
  'package resolver returns one unit of component B'
);

insert into app_private.inventory_compositions (
  id, organization_id, offered_variant_id, sale_unit_id
)
values (
  '51000000-0000-4000-8000-000000000221',
  '51000000-0000-4000-8000-000000000010',
  '51000000-0000-4000-8000-000000000162',
  '51000000-0000-4000-8000-000000000112'
);
insert into app_private.inventory_composition_components (
  id, organization_id, composition_id, inventory_item_id, quantity_per_sale_unit
)
values (
  '51000000-0000-4000-8000-000000000232',
  '51000000-0000-4000-8000-000000000010',
  '51000000-0000-4000-8000-000000000221',
  '51000000-0000-4000-8000-000000000200',
  1
);

select pg_temp.throws_sqlstate(
  $$update app_private.inventory_compositions
    set status = 'active', effective_at = clock_timestamp()
    where id = '51000000-0000-4000-8000-000000000221'$$,
  '23505',
  'only one active composition exists per variant and sale unit'
);
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_composition_components
    set quantity_per_sale_unit = 2
    where id = '51000000-0000-4000-8000-000000000230'$$,
  '23514',
  'composition components are append-only'
);
select pg_temp.throws_sqlstate(
  $$insert into app_private.inventory_composition_components (
      organization_id, composition_id, inventory_item_id, quantity_per_sale_unit
    ) values (
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000229',
      '52000000-0000-4000-8000-000000000200',
      1
    )$$,
  '23514',
  'tenant-aware component validator rejects another organization'
);
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_items
    set status = 'retired', retired_at = clock_timestamp()
    where id = '51000000-0000-4000-8000-000000000200'$$,
  '23514',
  'component used by an active package cannot be retired'
);
select pg_temp.throws_sqlstate(
  $$update app_private.catalog_units
    set status = 'retired'
    where id = '51000000-0000-4000-8000-000000000110'$$,
  '23514',
  'unit used by active inventory cannot be retired'
);

-- Atomic movements, replay and composition consumption.
set local role service_role;

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-receive-initial',
    'receipt',
    'initial fixture receipt',
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":10},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":5},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000202","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":20.50}
    ]$json$::jsonb,
    null, null, '51000000-0000-4000-8000-000000000001'
  )$$,
  'multi-line receipt commits atomically'
);
select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '52000000-0000-4000-8000-000000000010',
    'b2-005-receive-tenant-b',
    'receipt',
    'tenant B fixture receipt',
    $json$[
      {"inventory_item_id":"52000000-0000-4000-8000-000000000200","location_id":"52000000-0000-4000-8000-000000000210","effect":"delta","quantity":3}
    ]$json$::jsonb,
    null, null, '52000000-0000-4000-8000-000000000001'
  )$$,
  'second tenant stock is independent'
);

select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  10::numeric,
  'receipt produces exact physical stock'
);
select extensions.is(
  (
    select on_hand_quantity_after
    from app_private.inventory_movements
    where inventory_item_id = '51000000-0000-4000-8000-000000000202'
  ),
  20.50::numeric,
  'movement preserves exact fractional after-image'
);
select extensions.is(
  (
    select replayed
    from api.apply_inventory_movement(
      '51000000-0000-4000-8000-000000000010',
      'b2-005-receive-initial',
      'receipt',
      'initial fixture receipt',
      $json$[
        {"inventory_item_id":"51000000-0000-4000-8000-000000000202","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":20.50},
        {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":10},
        {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":5}
      ]$json$::jsonb,
      null, null, '51000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'same command replays despite input line order'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inventory_operations
    where operation_code = 'receipt'
      and organization_id = '51000000-0000-4000-8000-000000000010'
  ),
  1,
  'replay does not duplicate the physical operation'
);
select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-receive-initial',
    'receipt',
    'initial fixture receipt',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":11}]'::jsonb
  )$$,
  '23505',
  'same idempotency key with another request is rejected'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  10::numeric,
  'idempotency conflict leaves the first stock result unchanged'
);
select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-oversell',
    'sale',
    'must rollback',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":-11}]'::jsonb
  )$$,
  '23514',
  'movement cannot make stock negative'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inventory_commands
    where command_code = 'inventory.movement'
  ),
  2,
  'failed movement rolls its command claim back while successful tenant commands remain'
);

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-set-eight',
    'physical_count',
    'Fer sets exact inventory',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"set","quantity":8}]'::jsonb,
    null, null, '51000000-0000-4000-8000-000000000001'
  )$$,
  'absolute set is calculated under lock'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  8::numeric,
  'absolute set stores requested physical quantity'
);
select extensions.is(
  (
    select quantity_delta
    from app_private.inventory_movements as movement
    join app_private.inventory_operations as operation
      on operation.organization_id = movement.organization_id
      and operation.id = movement.operation_id
    where operation.operation_code = 'physical_count'
  ),
  (-2)::numeric,
  'absolute set records the actual delta instead of rewriting history'
);

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-transfer',
    'transfer',
    'atomic warehouse transfer',
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000211","effect":"delta","quantity":2},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":-2}
    ]$json$::jsonb,
    null, null, '51000000-0000-4000-8000-000000000001'
  )$$,
  'transfer confirms source and destination in one operation'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  6::numeric,
  'transfer subtracts source stock'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000211'
  ),
  2::numeric,
  'transfer adds destination stock'
);

select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_composition_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-bad-combo',
    'sale',
    'wrong package must rollback',
    '51000000-0000-4000-8000-000000000220',
    1,
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":4},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","quantity":2}
    ]$json$::jsonb
  )$$,
  '23514',
  'package allocation must exactly match every declared component'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000201'
  ),
  5::numeric,
  'invalid package leaves every component unchanged'
);

select extensions.lives_ok(
  $$select * from api.apply_inventory_composition_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-combo-sale',
    'sale',
    'one declared package sold',
    '51000000-0000-4000-8000-000000000220',
    1,
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":4},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}
    ]$json$::jsonb,
    'external_sale', 'sale-005', '51000000-0000-4000-8000-000000000001'
  )$$,
  'declared package consumes all components atomically'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  2::numeric,
  'package sale consumes four units of component A'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000201'
  ),
  4::numeric,
  'package sale consumes one unit of component B'
);
select extensions.is(
  (
    select composition_id
    from app_private.inventory_operations
    where reference_id = 'sale-005'
  ),
  '51000000-0000-4000-8000-000000000220'::uuid,
  'package operation preserves exact composition provenance'
);

select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-bad-fraction',
    'adjustment',
    'invalid fraction',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000202","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":0.001}]'::jsonb
  )$$,
  '23514',
  'movement rejects quantity beyond configured unit precision'
);
select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-cross-tenant',
    'adjustment',
    'cross tenant must fail',
    '[{"inventory_item_id":"52000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":1}]'::jsonb
  )$$,
  '23514',
  'movement rejects cross-organization resources'
);
select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-viewer-actor',
    'adjustment',
    'viewer must fail',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"delta","quantity":1}]'::jsonb,
    null, null, '51000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  'viewer cannot be attributed as an inventory mutation actor'
);

-- Reservations, partial lifecycle and expiration.
select extensions.lives_ok(
  $$select * from api.create_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-reserve-two',
    clock_timestamp() + interval '1 hour',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":2}]'::jsonb,
    'customer requests last two units',
    'conversation', 'conversation-005', '51000000-0000-4000-8000-000000000001'
  )$$,
  'reservation atomically claims available stock'
);
select extensions.is(
  (
    select status
    from app_private.inventory_reservations
    where reference_id = 'conversation-005'
  ),
  'active',
  'new reservation starts active'
);
select extensions.is(
  (
    select reserved_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  2::numeric,
  'reservation updates the locked balance projection'
);
select extensions.is(
  (
    select replayed
    from api.create_inventory_reservation(
      '51000000-0000-4000-8000-000000000010',
      'b2-005-reserve-two',
      (
        select expires_at
        from app_private.inventory_reservations
        where reference_id = 'conversation-005'
      ),
      '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":2}]'::jsonb,
      'customer requests last two units',
      'conversation', 'conversation-005', '51000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'identical reservation retry returns replay'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inventory_reservation_events
    where reservation_id = (
      select id from app_private.inventory_reservations where reference_id = 'conversation-005'
    )
  ),
  1,
  'reservation replay does not duplicate its created event'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-reserve-two',
    (select expires_at from app_private.inventory_reservations where reference_id = 'conversation-005'),
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}]'::jsonb,
    'customer requests last two units',
    'conversation', 'conversation-005', '51000000-0000-4000-8000-000000000001'
  )$$,
  '23505',
  'reservation idempotency key rejects changed allocation'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-over-reserve',
    clock_timestamp() + interval '1 hour',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}]'::jsonb,
    'no stock remains'
  )$$,
  '23514',
  'reservation cannot exceed available stock'
);
select pg_temp.throws_sqlstate(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-set-below-reserved',
    'physical_count',
    'must preserve customer promise',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","effect":"set","quantity":1}]'::jsonb
  )$$,
  '23514',
  'absolute count cannot reduce stock below active reservations'
);

select extensions.lives_ok(
  $$select * from api.transition_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    (select id from app_private.inventory_reservations where reference_id = 'conversation-005'),
    'b2-005-consume-one',
    'consume',
    'customer buys one unit',
    jsonb_build_array(jsonb_build_object(
      'reservation_line_id',
      (select id from app_private.inventory_reservation_lines where reservation_id = (
        select id from app_private.inventory_reservations where reference_id = 'conversation-005'
      )),
      'quantity', 1
    )),
    '51000000-0000-4000-8000-000000000001'
  )$$,
  'partial reservation consumption commits'
);
select extensions.is(
  (
    select status
    from app_private.inventory_reservations
    where reference_id = 'conversation-005'
  ),
  'partially_consumed',
  'partial consumption preserves an open remainder'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  1::numeric,
  'consumption reduces physical stock once'
);
select extensions.is(
  (
    select reserved_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  1::numeric,
  'consumption reduces reserved stock in the same transaction'
);

select extensions.lives_ok(
  $$select * from api.transition_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    (select id from app_private.inventory_reservations where reference_id = 'conversation-005'),
    'b2-005-release-rest',
    'release',
    'customer cancels remaining unit',
    null,
    '51000000-0000-4000-8000-000000000001'
  )$$,
  'remaining reservation releases atomically'
);
select extensions.is(
  (
    select status
    from app_private.inventory_reservations
    where reference_id = 'conversation-005'
  ),
  'closed',
  'mixed consumed and released reservation closes explicitly'
);
select extensions.is(
  (
    select reserved_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  0::numeric,
  'release frees only the unconsumed remainder'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inventory_reservation_events
    where reservation_id = (
      select id from app_private.inventory_reservations where reference_id = 'conversation-005'
    )
  ),
  3,
  'created, consumed and released transitions remain append-only'
);
select extensions.is(
  (
    select replayed
    from api.transition_inventory_reservation(
      '51000000-0000-4000-8000-000000000010',
      (select id from app_private.inventory_reservations where reference_id = 'conversation-005'),
      'b2-005-release-rest',
      'release',
      'customer cancels remaining unit',
      null,
      '51000000-0000-4000-8000-000000000001'
    )
  ),
  true,
  'terminal transition remains safely replayable'
);

select extensions.lives_ok(
  $$select * from api.create_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-expiring-reservation',
    clock_timestamp() + interval '10 seconds',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}]'::jsonb,
    'temporary customer hold',
    'conversation', 'conversation-expire', '51000000-0000-4000-8000-000000000001'
  )$$,
  'expiring reservation is created'
);
select pg_temp.throws_sqlstate(
  $$select * from api.transition_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    (select id from app_private.inventory_reservations where reference_id = 'conversation-expire'),
    'b2-005-expire-too-early',
    'expire',
    'must be due',
    null,
    '51000000-0000-4000-8000-000000000001',
    (select expires_at - interval '1 microsecond' from app_private.inventory_reservations where reference_id = 'conversation-expire')
  )$$,
  '23514',
  'reservation cannot expire before its deadline'
);
select extensions.lives_ok(
  $$select * from api.transition_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    (select id from app_private.inventory_reservations where reference_id = 'conversation-expire'),
    'b2-005-expire-due',
    'expire',
    'hold expired',
    null,
    '51000000-0000-4000-8000-000000000001',
    (select expires_at + interval '1 microsecond' from app_private.inventory_reservations where reference_id = 'conversation-expire')
  )$$,
  'expired reservation releases its full remainder'
);
select extensions.is(
  (
    select status
    from app_private.inventory_reservations
    where reference_id = 'conversation-expire'
  ),
  'expired',
  'expiration records an explicit terminal status'
);
select extensions.is(
  (
    select reserved_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000201'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  0::numeric,
  'expiration releases reserved projection without reducing physical stock'
);

select extensions.lives_ok(
  $$select * from api.apply_inventory_movement(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-restock-secondary',
    'receipt',
    'restock for package reservation',
    '[{"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000211","effect":"delta","quantity":2}]'::jsonb,
    null, null, '51000000-0000-4000-8000-000000000001'
  )$$,
  'replenishment reactivates physical availability without publication side effects'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_inventory_composition_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-bad-combo-reservation',
    clock_timestamp() + interval '1 hour',
    '51000000-0000-4000-8000-000000000220',
    1,
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":1},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}
    ]$json$::jsonb,
    'wrong package reservation'
  )$$,
  '23514',
  'package reservation rejects incomplete component allocation'
);
select extensions.lives_ok(
  $$select * from api.create_inventory_composition_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-combo-reservation',
    clock_timestamp() + interval '1 hour',
    '51000000-0000-4000-8000-000000000220',
    1,
    $json$[
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000210","quantity":1},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000200","location_id":"51000000-0000-4000-8000-000000000211","quantity":3},
      {"inventory_item_id":"51000000-0000-4000-8000-000000000201","location_id":"51000000-0000-4000-8000-000000000210","quantity":1}
    ]$json$::jsonb,
    'one package held across explicit locations',
    'order', 'order-combo-005', '51000000-0000-4000-8000-000000000001'
  )$$,
  'package reservation supports explicit multi-location allocation'
);
select extensions.is(
  (
    select composition_id
    from app_private.inventory_reservations
    where reference_id = 'order-combo-005'
  ),
  '51000000-0000-4000-8000-000000000220'::uuid,
  'package reservation preserves composition provenance'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_inventory_reservation(
    '51000000-0000-4000-8000-000000000010',
    'b2-005-cross-tenant-reservation',
    clock_timestamp() + interval '1 hour',
    '[{"inventory_item_id":"52000000-0000-4000-8000-000000000200","location_id":"52000000-0000-4000-8000-000000000210","quantity":1}]'::jsonb,
    'cross tenant must fail'
  )$$,
  '23514',
  'reservation rejects another organization resources'
);

-- Security, history and independent commercial state.
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_balances set on_hand_quantity = 999$$,
  '42501',
  'service role cannot edit balance projection directly'
);
select pg_temp.throws_sqlstate(
  $$delete from app_private.inventory_movements$$,
  '42501',
  'service role cannot delete movement history'
);
select pg_temp.throws_sqlstate(
  $$delete from app_private.inventory_reservations$$,
  '42501',
  'service role cannot delete reservation history'
);

set local role postgres;

select pg_temp.throws_sqlstate(
  $$update app_private.inventory_balances
    set on_hand_quantity = -1
    where inventory_item_id = '51000000-0000-4000-8000-000000000202'$$,
  '23514',
  'database check rejects a negative balance projection even for maintenance'
);
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_movements
    set quantity_delta = 999
    where organization_id = '51000000-0000-4000-8000-000000000010'$$,
  '23514',
  'inventory movements remain append-only even for privileged maintenance'
);
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_reservation_events
    set action = 'release'
    where organization_id = '51000000-0000-4000-8000-000000000010'$$,
  '23514',
  'reservation events remain append-only'
);
select pg_temp.throws_sqlstate(
  $$update app_private.inventory_locations
    set status = 'inactive'
    where id = '51000000-0000-4000-8000-000000000210'$$,
  '23514',
  'location with active package reservation cannot become unavailable'
);
select extensions.lives_ok(
  $$update app_private.product_variants
    set status = 'paused'
    where id = '51000000-0000-4000-8000-000000000160'$$,
  'commercial variant can pause independently of stock'
);
select extensions.is(
  (
    select on_hand_quantity
    from app_private.inventory_balances
    where inventory_item_id = '51000000-0000-4000-8000-000000000200'
      and location_id = '51000000-0000-4000-8000-000000000210'
  ),
  1::numeric,
  'commercial pause does not fabricate an inventory movement'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inventory_balances
    where on_hand_quantity < 0
      or reserved_quantity < 0
      or available_quantity < 0
  ),
  0,
  'no balance is negative after sales, transfers and reservations'
);
select extensions.is(
  (
    select available_sale_quantity
    from api.inventory_composition_availability
    where composition_id = '51000000-0000-4000-8000-000000000220'
  ),
  0::numeric,
  'composition availability reflects active package reservation'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000002',
  true
);
select extensions.ok(
  exists (
    select 1
    from api.inventory_balances
    where organization_id = '51000000-0000-4000-8000-000000000010'
  ),
  'viewer member can read own organization inventory'
);
select extensions.is(
  (
    select count(*)::integer
    from api.inventory_balances
    where organization_id = '52000000-0000-4000-8000-000000000010'
  ),
  0,
  'RLS does not leak another organization inventory'
);
select extensions.is(
  (select count(*)::integer from app_private.inventory_commands),
  0,
  'viewer cannot read internal idempotency commands'
);

select set_config(
  'request.jwt.claim.sub',
  '51000000-0000-4000-8000-000000000003',
  true
);
select extensions.ok(
  exists (
    select 1
    from app_private.inventory_commands
    where organization_id = '51000000-0000-4000-8000-000000000010'
  ),
  'operator can audit own organization idempotency commands'
);

select * from extensions.finish();

rollback;
