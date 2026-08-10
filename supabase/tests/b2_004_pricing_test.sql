begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(66);

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
select extensions.has_table('app_private', 'price_books', 'price_books table exists');
select extensions.has_table('app_private', 'price_tiers', 'price_tiers table exists');
select extensions.has_view('api', 'price_books', 'price_books API view exists');
select extensions.has_view('api', 'price_tiers', 'price_tiers API view exists');
select extensions.has_view('api', 'price_tier_changes', 'price_tier_changes API view exists');
select extensions.has_function(
  'api',
  'resolve_price_quote',
  array['uuid', 'uuid', 'uuid', 'numeric', 'timestamp with time zone'],
  'exact quote resolver exists'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('price_books', 'price_tiers')
      and relation.relrowsecurity
  ),
  2,
  'RLS is enabled on both B2-004 tables'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('price_books', 'price_tiers')
      and relation.relforcerowsecurity
  ),
  2,
  'RLS is forced on both B2-004 tables'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in ('price_books', 'price_tiers')
  ),
  2,
  'each B2-004 table has exactly one authenticated read policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in ('price_books', 'price_tiers', 'price_tier_changes')
      and relation.relkind = 'v'
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  3,
  'all B2-004 API views preserve caller RLS and security barrier'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as catalog_constraint
    join pg_catalog.pg_class as relation on relation.oid = catalog_constraint.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'price_tiers'
      and catalog_constraint.conname = 'price_tiers_no_current_overlap'
      and catalog_constraint.contype = 'x'
      and catalog_constraint.condeferrable
  ),
  'current pricing overlap is protected by a deferrable exclusion constraint'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_extension
    where extname = 'btree_gist'
  ),
  'btree_gist is installed for scalar plus range exclusion'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name = 'price_tiers'
      and column_name in ('quantity_min', 'quantity_max', 'price_amount')
      and data_type = 'numeric'
  ),
  3,
  'money and quantities use exact numeric columns'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conrelid in (
        'app_private.price_books'::regclass,
        'app_private.price_tiers'::regclass
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
  'every B2-004 foreign key column is indexed'
);

select extensions.ok(
  has_table_privilege('authenticated', 'app_private.price_tiers', 'SELECT')
    and not has_table_privilege('authenticated', 'app_private.price_tiers', 'INSERT')
    and not has_table_privilege('authenticated', 'app_private.price_tiers', 'UPDATE')
    and not has_table_privilege('authenticated', 'app_private.price_tiers', 'DELETE'),
  'authenticated receives read-only private pricing access for invoker views'
);

select extensions.ok(
  has_table_privilege('service_role', 'app_private.price_tiers', 'SELECT')
    and has_table_privilege('service_role', 'app_private.price_tiers', 'INSERT')
    and has_table_privilege('service_role', 'app_private.price_tiers', 'UPDATE')
    and not has_table_privilege('service_role', 'app_private.price_tiers', 'DELETE'),
  'service role can version prices but cannot erase them'
);

select extensions.ok(
  not has_table_privilege('anon', 'api.price_books', 'SELECT')
    and not has_table_privilege('anon', 'api.price_tiers', 'SELECT')
    and not has_table_privilege('anon', 'api.price_tier_changes', 'SELECT'),
  'anonymous receives no B2-004 view privileges'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'api.resolve_price_quote(uuid,uuid,uuid,numeric,timestamptz)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'anon',
      'api.resolve_price_quote(uuid,uuid,uuid,numeric,timestamptz)',
      'EXECUTE'
    ),
  'quote resolution is authenticated and never anonymous in B2-004'
);

-- Transactional identities and tenant fixtures.
set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  (
    '41000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-004-owner-a@example.invalid',
    ''
  ),
  (
    '41000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-004-viewer-a@example.invalid',
    ''
  ),
  (
    '42000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-004-owner-b@example.invalid',
    ''
  );

set local role service_role;

insert into app_private.organizations (id, name)
values
  ('41000000-0000-4000-8000-000000000010', 'B2-004 Organization A'),
  ('42000000-0000-4000-8000-000000000010', 'B2-004 Organization B');

insert into app_private.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values
  (
    '41000000-0000-4000-8000-000000000011',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '41000000-0000-4000-8000-000000000012',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000002',
    'viewer',
    'active',
    now()
  ),
  (
    '42000000-0000-4000-8000-000000000011',
    '42000000-0000-4000-8000-000000000010',
    '42000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    now()
  );

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  (
    '41000000-0000-4000-8000-000000000100',
    '41000000-0000-4000-8000-000000000010',
    'priced_item',
    'Priced item',
    'active'
  ),
  (
    '42000000-0000-4000-8000-000000000100',
    '42000000-0000-4000-8000-000000000010',
    'private_priced_item',
    'Private priced item',
    'active'
  );

insert into app_private.catalog_units (
  id,
  organization_id,
  code,
  name_singular,
  name_plural,
  quantity_kind,
  decimal_scale
)
values
  (
    '41000000-0000-4000-8000-000000000110',
    '41000000-0000-4000-8000-000000000010',
    'whole_unit',
    'whole unit',
    'whole units',
    'count',
    0
  ),
  (
    '41000000-0000-4000-8000-000000000111',
    '41000000-0000-4000-8000-000000000010',
    'divisible_unit',
    'divisible unit',
    'divisible units',
    'volume',
    2
  ),
  (
    '42000000-0000-4000-8000-000000000110',
    '42000000-0000-4000-8000-000000000010',
    'whole_unit',
    'whole unit',
    'whole units',
    'count',
    0
  );

insert into app_private.products (id, organization_id, category_id, name)
values
  (
    '41000000-0000-4000-8000-000000000150',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000100',
    'Universal priced product A'
  ),
  (
    '41000000-0000-4000-8000-000000000151',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000100',
    'Second priced product A'
  ),
  (
    '42000000-0000-4000-8000-000000000150',
    '42000000-0000-4000-8000-000000000010',
    '42000000-0000-4000-8000-000000000100',
    'Private priced product B'
  );

insert into app_private.product_variants (id, organization_id, product_id, name)
values
  (
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000150',
    'Universal priced variant A'
  ),
  (
    '41000000-0000-4000-8000-000000000161',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000151',
    'Second priced variant A'
  ),
  (
    '42000000-0000-4000-8000-000000000160',
    '42000000-0000-4000-8000-000000000010',
    '42000000-0000-4000-8000-000000000150',
    'Private priced variant B'
  );

insert into app_private.catalog_evidence (
  id,
  organization_id,
  evidence_kind,
  content,
  created_by_user_id
)
values
  (
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000010',
    'owner_confirmation',
    '{"instruction":"initial exact pricing"}'::jsonb,
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000181',
    '41000000-0000-4000-8000-000000000010',
    'owner_confirmation',
    '{"instruction":"authorized replacement"}'::jsonb,
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '42000000-0000-4000-8000-000000000180',
    '42000000-0000-4000-8000-000000000010',
    'owner_confirmation',
    '{"instruction":"private organization pricing"}'::jsonb,
    '42000000-0000-4000-8000-000000000001'
  );

insert into app_private.price_books (
  id,
  organization_id,
  code,
  name,
  currency_code,
  status,
  is_default,
  created_by_user_id
)
values
  (
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000010',
    'retail',
    'Retail',
    'MXN',
    'active',
    true,
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000201',
    '41000000-0000-4000-8000-000000000010',
    'alternate',
    'Alternate',
    'USD',
    'active',
    false,
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '42000000-0000-4000-8000-000000000200',
    '42000000-0000-4000-8000-000000000010',
    'retail',
    'Private retail',
    'MXN',
    'active',
    true,
    '42000000-0000-4000-8000-000000000001'
  );

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_books (
      organization_id, code, name, currency_code
    ) values (
      '41000000-0000-4000-8000-000000000010',
      'bad_currency',
      'Bad currency',
      'mxn'
    )$$,
  '23514',
  'price book rejects missing or malformed uppercase currency'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_books (
      organization_id, code, name, currency_code, status, is_default
    ) values (
      '41000000-0000-4000-8000-000000000010',
      'second_default',
      'Second default',
      'MXN',
      'active',
      true
    )$$,
  '23505',
  'organization has at most one active default price book'
);

select pg_temp.throws_sqlstate(
  $$update app_private.price_books
    set currency_code = 'USD'
    where id = '41000000-0000-4000-8000-000000000200'$$,
  '23514',
  'price book currency cannot be rewritten'
);

select pg_temp.throws_sqlstate(
  $$update app_private.price_books
    set status = 'retired'
    where id = '41000000-0000-4000-8000-000000000200'$$,
  '23514',
  'retired price book cannot remain the default'
);

insert into app_private.price_tiers (
  id,
  organization_id,
  price_book_id,
  variant_id,
  unit_id,
  quantity_min,
  quantity_max,
  pricing_status,
  calculation_method,
  price_amount,
  valid_from,
  valid_until,
  evidence_id,
  created_by_user_id
)
values
  (
    '41000000-0000-4000-8000-000000000300',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000110',
    1,
    1,
    'priced',
    'fixed_total',
    1700,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000301',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000110',
    4,
    4,
    'priced',
    'fixed_total',
    6000,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000302',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000110',
    5,
    null,
    'priced',
    'per_unit',
    1400,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000303',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000110',
    2,
    3,
    'on_request',
    null,
    null,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000304',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000111',
    0.01,
    null,
    'priced',
    'per_unit',
    12.345678,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000305',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000201',
    '41000000-0000-4000-8000-000000000160',
    '41000000-0000-4000-8000-000000000110',
    1,
    1,
    'priced',
    'fixed_total',
    100,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000306',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000161',
    '41000000-0000-4000-8000-000000000110',
    1,
    1,
    'priced',
    'fixed_total',
    500,
    '2026-01-01 00:00:00+00',
    '2026-06-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '41000000-0000-4000-8000-000000000307',
    '41000000-0000-4000-8000-000000000010',
    '41000000-0000-4000-8000-000000000200',
    '41000000-0000-4000-8000-000000000161',
    '41000000-0000-4000-8000-000000000110',
    1,
    1,
    'priced',
    'fixed_total',
    550,
    '2026-06-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '41000000-0000-4000-8000-000000000180',
    '41000000-0000-4000-8000-000000000001'
  ),
  (
    '42000000-0000-4000-8000-000000000300',
    '42000000-0000-4000-8000-000000000010',
    '42000000-0000-4000-8000-000000000200',
    '42000000-0000-4000-8000-000000000160',
    '42000000-0000-4000-8000-000000000110',
    1,
    1,
    'priced',
    'fixed_total',
    999,
    '2026-01-01 00:00:00+00',
    '2027-01-01 00:00:00+00',
    '42000000-0000-4000-8000-000000000180',
    '42000000-0000-4000-8000-000000000001'
  );

-- Exact deterministic quote behavior.
select extensions.is(
  (
    select price_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1,
      '2026-03-01 00:00:00+00'
    )
  ),
  1700::numeric,
  'one whole unit resolves its explicit exact amount'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1,
      '2026-03-01 00:00:00+00'
    )
  ),
  1700::numeric,
  'fixed total returns the configured amount unchanged'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      4,
      '2026-03-01 00:00:00+00'
    )
  ),
  6000::numeric,
  'four-unit package keeps its explicit total instead of deriving 6800'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      7,
      '2026-03-01 00:00:00+00'
    )
  ),
  9800::numeric,
  'quantity above four uses exact per-unit decimal arithmetic'
);

select extensions.is(
  (
    select requested_quantity
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      11,
      '2026-03-01 00:00:00+00'
    )
  ),
  11::numeric,
  'open quantity tier supports arbitrary permitted quantities'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000111',
      1.25,
      '2026-03-01 00:00:00+00'
    )
  ),
  15.4320975::numeric,
  'divisible unit multiplication remains exact beyond currency display scale'
);

select extensions.is(
  (
    select pricing_status
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      2,
      '2026-03-01 00:00:00+00'
    )
  ),
  'on_request',
  'missing price resolves as explicit on_request state'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      2,
      '2026-03-01 00:00:00+00'
    )
  ),
  null::numeric,
  'on_request never exposes an invented total'
);

select extensions.is(
  (
    select count(*)::integer
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      0,
      '2026-03-01 00:00:00+00'
    )
  ),
  0,
  'invalid or uncovered quantity returns no applicable price'
);

select extensions.is(
  (
    select price_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000161',
      '41000000-0000-4000-8000-000000000110',
      1,
      '2026-06-01 00:00:00+00'
    )
  ),
  550::numeric,
  'half-open validity chooses the second adjacent tariff at its boundary'
);

-- Invalid money, quantity and overlapping contracts.
select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, pricing_status, calculation_method, valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20, 'priced', 'per_unit', '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'priced tier requires an exact amount'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, price_amount, valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20, 21, 'on_request', 1, '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'on_request forbids a hidden amount'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, pricing_status, calculation_method, price_amount, valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20, 'priced', 'fixed_total', 1, '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'fixed_total requires an explicit exact maximum quantity'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, pricing_status, calculation_method, price_amount, valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20, 'priced', 'per_unit', 1.1234567, '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'price amount rejects more than six decimal places without rounding'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, pricing_status, calculation_method, price_amount, valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20.5, 'priced', 'per_unit', 1, '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'price tier quantity exceeds catalog unit precision'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, pricing_status, calculation_method, price_amount,
      valid_from, valid_until, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      20, 'priced', 'per_unit', 1,
      '2026-06-01 00:00:00+00', '2026-06-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23514',
  'price tier validity must have positive duration'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, valid_until, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1, 1, 'priced', 'fixed_total', 1600,
      '2026-02-01 00:00:00+00', '2026-05-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23P01',
  'overlapping quantity and validity are rejected without priority guessing'
);

select extensions.lives_ok(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, valid_until, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000161',
      '41000000-0000-4000-8000-000000000110',
      20, 30, 'priced', 'per_unit', 1200,
      '2026-01-01 00:00:00+00', '2027-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  'non-overlapping quantity range is independently configurable'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.price_tiers
    where variant_id = '41000000-0000-4000-8000-000000000161'
      and quantity_min = 1
  ),
  2,
  'adjacent half-open validity ranges coexist without overlap'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.price_tiers
    where variant_id = '41000000-0000-4000-8000-000000000160'
      and quantity_min = 1
      and price_book_id in (
        '41000000-0000-4000-8000-000000000200',
        '41000000-0000-4000-8000-000000000201'
      )
  ),
  2,
  'different price books may define independent overlapping tariffs'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '42000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      40, 40, 'priced', 'fixed_total', 1,
      '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000180'
    )$$,
  '23503',
  'tenant-aware variant reference rejects cross-organization pricing'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      40, 40, 'priced', 'fixed_total', 1,
      '2026-01-01 00:00:00+00',
      '42000000-0000-4000-8000-000000000180'
    )$$,
  '23503',
  'tenant-aware evidence reference rejects cross-organization provenance'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, supersedes_price_tier_id, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      40, 40, 'priced', 'fixed_total', 1,
      '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000300',
      '41000000-0000-4000-8000-000000000181'
    )$$,
  '23514',
  'previous price tier must be superseded before replacement'
);

-- Versioned replacement and typed previous/new audit.
select extensions.lives_ok(
  $$update app_private.price_tiers
    set superseded_at = statement_timestamp()
    where id = '41000000-0000-4000-8000-000000000300'$$,
  'current price tier can be superseded exactly once'
);

select extensions.lives_ok(
  $$insert into app_private.price_tiers (
      id, organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, valid_until, supersedes_price_tier_id, evidence_id, created_by_user_id
    ) values (
      '41000000-0000-4000-8000-000000000310',
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1, 1, 'priced', 'fixed_total', 1750,
      '2026-01-01 00:00:00+00', '2027-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000300',
      '41000000-0000-4000-8000-000000000181',
      '41000000-0000-4000-8000-000000000001'
    )$$,
  'replacement tier records a typed predecessor and new evidence'
);

select extensions.is(
  (
    select total_amount
    from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1,
      '2026-03-01 00:00:00+00'
    )
  ),
  1750::numeric,
  'quote resolver uses only the replacement current tier'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.price_tiers
    where id = '41000000-0000-4000-8000-000000000300'
      and superseded_at is null
  ),
  0,
  'previous tier no longer participates in current resolution'
);

select extensions.is(
  (
    select previous_price_amount
    from api.price_tier_changes
    where price_tier_id = '41000000-0000-4000-8000-000000000310'
  ),
  1700::numeric,
  'typed audit view preserves the previous amount'
);

select extensions.is(
  (
    select new_price_amount
    from api.price_tier_changes
    where price_tier_id = '41000000-0000-4000-8000-000000000310'
  ),
  1750::numeric,
  'typed audit view preserves the new amount'
);

select extensions.is(
  (
    select evidence_id
    from api.price_tier_changes
    where price_tier_id = '41000000-0000-4000-8000-000000000310'
  ),
  '41000000-0000-4000-8000-000000000181'::uuid,
  'typed audit view attributes replacement to immutable evidence'
);

select pg_temp.throws_sqlstate(
  $$update app_private.price_tiers
    set price_amount = 1
    where id = '41000000-0000-4000-8000-000000000310'$$,
  '23514',
  'price tier commercial facts and provenance are immutable'
);

select pg_temp.throws_sqlstate(
  $$update app_private.price_tiers
    set superseded_at = statement_timestamp()
    where id = '41000000-0000-4000-8000-000000000300'$$,
  '23514',
  'price tier can be superseded exactly once'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_tiers (
      organization_id, price_book_id, variant_id, unit_id,
      quantity_min, quantity_max, pricing_status, calculation_method, price_amount,
      valid_from, supersedes_price_tier_id, evidence_id
    ) values (
      '41000000-0000-4000-8000-000000000010',
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000111',
      40, 40, 'priced', 'fixed_total', 1,
      '2026-01-01 00:00:00+00',
      '41000000-0000-4000-8000-000000000300',
      '41000000-0000-4000-8000-000000000181'
    )$$,
  '23514',
  'superseded price tier must share book, variant and unit'
);

-- Real role behavior and tenant isolation.
set local role authenticated;
select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from api.price_books),
  2,
  'owner sees only own-organization price books'
);

select extensions.is(
  (
    select count(*)::integer
    from api.price_tiers
    where organization_id = '42000000-0000-4000-8000-000000000010'
  ),
  0,
  'owner cannot see another organization price tiers'
);

select set_config('request.jwt.claim.sub', '41000000-0000-4000-8000-000000000002', true);

select extensions.is(
  (select count(*)::integer from api.price_books),
  2,
  'viewer can read own-organization administrative pricing'
);

select set_config('request.jwt.claim.sub', '42000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from api.price_books),
  1,
  'second organization owner sees only its own price book'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.price_books (
      organization_id, code, name, currency_code
    ) values (
      '42000000-0000-4000-8000-000000000010',
      'forbidden_direct_write',
      'Forbidden direct write',
      'MXN'
    )$$,
  '42501',
  'authenticated member cannot bypass tools to mutate pricing'
);

set local role anon;

select pg_temp.throws_sqlstate(
  $$select * from api.price_books$$,
  '42501',
  'anonymous pricing administration access is denied'
);

select pg_temp.throws_sqlstate(
  $$select * from api.resolve_price_quote(
      '41000000-0000-4000-8000-000000000200',
      '41000000-0000-4000-8000-000000000160',
      '41000000-0000-4000-8000-000000000110',
      1,
      '2026-03-01 00:00:00+00'
    )$$,
  '42501',
  'anonymous quote resolution remains disabled before B6'
);

set local role service_role;

select pg_temp.throws_sqlstate(
  $$delete from app_private.price_tiers
    where id = '41000000-0000-4000-8000-000000000310'$$,
  '42501',
  'service role cannot erase price tier history'
);

select pg_temp.throws_sqlstate(
  $$delete from app_private.price_books
    where id = '41000000-0000-4000-8000-000000000201'$$,
  '42501',
  'service role cannot erase price books'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function
    join pg_catalog.pg_namespace as namespace on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.prosecdef
      and not (
        'search_path=""' = any(coalesce(function.proconfig, '{}'::text[]))
      )
  ),
  0,
  'all app_private security definer functions pin an empty search_path'
);

select extensions.ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name in ('price_books', 'price_tiers')
      and column_name in (
        'price_1', 'price_2', 'price_3', 'price_4',
        'tire_size', 'rim_size', 'tank_capacity'
      )
  ),
  'B2-004 has no fixed quantity or commercial category columns'
);

select * from extensions.finish();

rollback;
