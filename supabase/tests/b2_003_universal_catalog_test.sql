begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(75);

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

-- Physical production contract.
select extensions.has_table('app_private', 'catalog_categories', 'catalog_categories table exists');
select extensions.has_table('app_private', 'catalog_units', 'catalog_units table exists');
select extensions.has_table(
  'app_private',
  'catalog_attribute_definitions',
  'catalog_attribute_definitions table exists'
);
select extensions.has_table(
  'app_private',
  'catalog_attribute_options',
  'catalog_attribute_options table exists'
);
select extensions.has_table(
  'app_private',
  'catalog_attribute_allowed_units',
  'catalog_attribute_allowed_units table exists'
);
select extensions.has_table('app_private', 'media_assets', 'media_assets table exists');
select extensions.has_table('app_private', 'catalog_evidence', 'catalog_evidence table exists');
select extensions.has_table(
  'app_private',
  'catalog_evidence_media',
  'catalog_evidence_media table exists'
);
select extensions.has_table('app_private', 'products', 'products table exists');
select extensions.has_table('app_private', 'product_variants', 'product_variants table exists');
select extensions.has_table('app_private', 'variant_skus', 'variant_skus table exists');
select extensions.has_table(
  'app_private',
  'product_attribute_values',
  'product_attribute_values table exists'
);
select extensions.has_table(
  'app_private',
  'variant_attribute_values',
  'variant_attribute_values table exists'
);
select extensions.has_table(
  'app_private',
  'catalog_ingestion_drafts',
  'catalog_ingestion_drafts table exists'
);
select extensions.has_table(
  'app_private',
  'catalog_candidate_matches',
  'catalog_candidate_matches table exists'
);
select extensions.has_table(
  'app_private',
  'catalog_resolution_decisions',
  'catalog_resolution_decisions table exists'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as catalog_constraint
    join pg_catalog.pg_class as relation on relation.oid = catalog_constraint.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'conversations'
      and catalog_constraint.conname = 'conversations_organization_id_id_unique'
      and catalog_constraint.contype = 'u'
  ),
  'conversation provenance has an organization-aware unique key'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint as catalog_constraint
    join pg_catalog.pg_class as relation on relation.oid = catalog_constraint.conrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'messages'
      and catalog_constraint.conname = 'messages_organization_id_id_unique'
      and catalog_constraint.contype = 'u'
  ),
  'message provenance has an organization-aware unique key'
);

select extensions.has_view('api', 'catalog_categories', 'catalog_categories API view exists');
select extensions.has_view('api', 'catalog_units', 'catalog_units API view exists');
select extensions.has_view(
  'api',
  'catalog_attribute_definitions',
  'catalog_attribute_definitions API view exists'
);
select extensions.has_view(
  'api',
  'catalog_attribute_options',
  'catalog_attribute_options API view exists'
);
select extensions.has_view(
  'api',
  'catalog_attribute_allowed_units',
  'catalog_attribute_allowed_units API view exists'
);
select extensions.has_view('api', 'media_assets', 'media_assets API view exists');
select extensions.has_view('api', 'products', 'products API view exists');
select extensions.has_view('api', 'product_variants', 'product_variants API view exists');
select extensions.has_view('api', 'variant_skus', 'variant_skus API view exists');
select extensions.has_view(
  'api',
  'product_attribute_values',
  'product_attribute_values API view exists'
);
select extensions.has_view(
  'api',
  'variant_attribute_values',
  'variant_attribute_values API view exists'
);
select extensions.has_view(
  'api',
  'catalog_ingestion_drafts',
  'catalog_ingestion_drafts API view exists'
);
select extensions.has_view(
  'api',
  'catalog_candidate_matches',
  'catalog_candidate_matches API view exists'
);
select extensions.has_view(
  'api',
  'catalog_resolution_decisions',
  'catalog_resolution_decisions API view exists'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and relation.relrowsecurity
  ),
  16,
  'RLS is enabled on every B2-003 private table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and relation.relforcerowsecurity
  ),
  16,
  'RLS is forced on every B2-003 private table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
  ),
  16,
  'every B2-003 table has exactly one authenticated read policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  14,
  'every B2-003 API view preserves caller RLS and security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname in ('app_private', 'api')
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and (
        has_table_privilege('anon', relation.oid, 'SELECT')
        or has_table_privilege('anon', relation.oid, 'INSERT')
        or has_table_privilege('anon', relation.oid, 'UPDATE')
        or has_table_privilege('anon', relation.oid, 'DELETE')
      )
  ),
  0,
  'anonymous role has no B2-003 table or view privileges'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and (
        has_table_privilege('authenticated', relation.oid, 'INSERT')
        or has_table_privilege('authenticated', relation.oid, 'UPDATE')
        or has_table_privilege('authenticated', relation.oid, 'DELETE')
      )
  ),
  0,
  'authenticated role cannot mutate B2-003 private tables directly'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'catalog_categories',
        'catalog_units',
        'catalog_attribute_definitions',
        'catalog_attribute_options',
        'catalog_attribute_allowed_units',
        'media_assets',
        'catalog_evidence',
        'catalog_evidence_media',
        'products',
        'product_variants',
        'variant_skus',
        'product_attribute_values',
        'variant_attribute_values',
        'catalog_ingestion_drafts',
        'catalog_candidate_matches',
        'catalog_resolution_decisions'
      )
      and has_table_privilege('service_role', relation.oid, 'DELETE')
  ),
  0,
  'service_role cannot erase B2-003 history'
);

select extensions.ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name in ('media_assets', 'catalog_evidence')
      and column_name in ('bucket', 'bucket_id', 'object_path', 'public_url', 'signed_url')
  ),
  'B2-003 does not expose storage locations before B2-010'
);

-- Transactional identities and organization fixtures.
set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  (
    '31000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-003-owner-a@example.invalid',
    ''
  ),
  (
    '31000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-003-operator-a@example.invalid',
    ''
  ),
  (
    '31000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-003-viewer-a@example.invalid',
    ''
  ),
  (
    '32000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'b2-003-owner-b@example.invalid',
    ''
  );

set local role service_role;

insert into app_private.organizations (id, name)
values
  ('31000000-0000-4000-8000-000000000010', 'B2-003 Organization A'),
  ('32000000-0000-4000-8000-000000000010', 'B2-003 Organization B');

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
    '31000000-0000-4000-8000-000000000011',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    now()
  ),
  (
    '31000000-0000-4000-8000-000000000012',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000002',
    'operator',
    'active',
    now()
  ),
  (
    '31000000-0000-4000-8000-000000000013',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000003',
    'viewer',
    'active',
    now()
  ),
  (
    '32000000-0000-4000-8000-000000000011',
    '32000000-0000-4000-8000-000000000010',
    '32000000-0000-4000-8000-000000000001',
    'owner',
    'active',
    now()
  );

insert into app_private.catalog_categories (
  id,
  organization_id,
  code,
  name,
  status
)
values
  (
    '31000000-0000-4000-8000-000000000100',
    '31000000-0000-4000-8000-000000000010',
    'configurable_item',
    'Configurable item',
    'active'
  ),
  (
    '32000000-0000-4000-8000-000000000100',
    '32000000-0000-4000-8000-000000000010',
    'different_item',
    'Different item',
    'active'
  );

insert into app_private.catalog_units (
  id,
  organization_id,
  code,
  name_singular,
  name_plural,
  symbol,
  quantity_kind,
  decimal_scale
)
values (
  '31000000-0000-4000-8000-000000000110',
  '31000000-0000-4000-8000-000000000010',
  'configured_unit',
  'configured unit',
  'configured units',
  'cu',
  'configured_quantity',
  2
);

insert into app_private.catalog_attribute_definitions (
  id,
  organization_id,
  category_id,
  code,
  name,
  scope,
  value_type,
  cardinality_min,
  cardinality_max,
  allows_unit,
  required_on_activation
)
values
  (
    '31000000-0000-4000-8000-000000000120',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'maker',
    'Maker',
    'product',
    'text',
    1,
    1,
    false,
    true
  ),
  (
    '31000000-0000-4000-8000-000000000121',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'configured_capacity',
    'Configured capacity',
    'variant',
    'decimal',
    1,
    1,
    true,
    true
  ),
  (
    '31000000-0000-4000-8000-000000000122',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'configured_option',
    'Configured option',
    'variant',
    'option',
    0,
    1,
    false,
    false
  );

insert into app_private.catalog_attribute_options (
  id,
  organization_id,
  attribute_definition_id,
  code,
  label
)
values (
  '31000000-0000-4000-8000-000000000130',
  '31000000-0000-4000-8000-000000000010',
  '31000000-0000-4000-8000-000000000122',
  'configured_choice',
  'Configured choice'
);

insert into app_private.catalog_attribute_allowed_units (
  organization_id,
  attribute_definition_id,
  unit_id
)
values (
  '31000000-0000-4000-8000-000000000010',
  '31000000-0000-4000-8000-000000000121',
  '31000000-0000-4000-8000-000000000110'
);

insert into app_private.catalog_evidence (
  id,
  organization_id,
  evidence_kind,
  content,
  created_by_user_id
)
values (
  '31000000-0000-4000-8000-000000000140',
  '31000000-0000-4000-8000-000000000010',
  'owner_confirmation',
  '{"confirmation":"authorized fixture"}'::jsonb,
  '31000000-0000-4000-8000-000000000001'
);

insert into app_private.products (id, organization_id, category_id, name)
values
  (
    '31000000-0000-4000-8000-000000000150',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'Configurable product A'
  ),
  (
    '31000000-0000-4000-8000-000000000151',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'Candidate product A'
  ),
  (
    '32000000-0000-4000-8000-000000000150',
    '32000000-0000-4000-8000-000000000010',
    '32000000-0000-4000-8000-000000000100',
    'Private product B'
  );

insert into app_private.product_variants (id, organization_id, product_id, name)
values
  (
    '31000000-0000-4000-8000-000000000160',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000150',
    'Configuration A'
  ),
  (
    '31000000-0000-4000-8000-000000000161',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000151',
    'Independent configuration A'
  ),
  (
    '32000000-0000-4000-8000-000000000160',
    '32000000-0000-4000-8000-000000000010',
    '32000000-0000-4000-8000-000000000150',
    'Configuration B'
  );

insert into app_private.variant_skus (id, organization_id, variant_id, sku)
values
  (
    '31000000-0000-4000-8000-000000000170',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000160',
    'CONFIGURED-SKU'
  ),
  (
    '32000000-0000-4000-8000-000000000170',
    '32000000-0000-4000-8000-000000000010',
    '32000000-0000-4000-8000-000000000160',
    'CONFIGURED-SKU'
  );

insert into app_private.product_attribute_values (
  id,
  organization_id,
  product_id,
  attribute_definition_id,
  value_text,
  certainty,
  evidence_id
)
values (
  '31000000-0000-4000-8000-000000000180',
  '31000000-0000-4000-8000-000000000010',
  '31000000-0000-4000-8000-000000000150',
  '31000000-0000-4000-8000-000000000120',
  'Confirmed maker',
  'confirmed',
  '31000000-0000-4000-8000-000000000140'
);

insert into app_private.variant_attribute_values (
  id,
  organization_id,
  variant_id,
  attribute_definition_id,
  value_decimal,
  unit_id,
  certainty,
  evidence_id
)
values (
  '31000000-0000-4000-8000-000000000181',
  '31000000-0000-4000-8000-000000000010',
  '31000000-0000-4000-8000-000000000160',
  '31000000-0000-4000-8000-000000000121',
  42.50,
  '31000000-0000-4000-8000-000000000110',
  'proposed',
  '31000000-0000-4000-8000-000000000140'
);

-- Typed attribute and activation behavior.
select extensions.lives_ok(
  $$update app_private.products
    set status = 'active'
    where id = '31000000-0000-4000-8000-000000000150'$$,
  'product activates after required product attribute is confirmed'
);

select extensions.throws_ok(
  $$update app_private.product_variants
    set status = 'active'
    where id = '31000000-0000-4000-8000-000000000160'$$,
  '23514',
  'active variant requires confirmed configured attributes',
  'proposed LLM value cannot activate a variant'
);

select extensions.lives_ok(
  $$update app_private.variant_attribute_values
    set certainty = 'confirmed'
    where id = '31000000-0000-4000-8000-000000000181'$$,
  'owner-confirmed value can replace a proposal'
);

select extensions.lives_ok(
  $$update app_private.product_variants
    set status = 'active'
    where id = '31000000-0000-4000-8000-000000000160'$$,
  'variant activates after SKU and required variant attributes are confirmed'
);

set constraints all immediate;

select extensions.throws_ok(
  $$update app_private.variant_attribute_values
    set certainty = 'proposed'
    where id = '31000000-0000-4000-8000-000000000181'$$,
  '23514',
  'active variant requires confirmed configured attributes',
  'required confirmed value cannot be downgraded on active variant'
);

set constraints all deferred;

select pg_temp.throws_sqlstate(
  $$insert into app_private.product_attribute_values (
      organization_id,
      product_id,
      attribute_definition_id,
      value_decimal
    ) values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000151',
      '31000000-0000-4000-8000-000000000120',
      1.5
    )$$,
  '23514',
  'typed column must match configured attribute value type'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.variant_attribute_values (
      organization_id,
      variant_id,
      attribute_definition_id,
      value_decimal,
      certainty
    ) values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000160',
      '31000000-0000-4000-8000-000000000121',
      1.5,
      'confirmed'
    )$$,
  '23514',
  'configured numeric unit is required'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.variant_attribute_values (
      organization_id,
      variant_id,
      attribute_definition_id,
      ordinal,
      value_decimal,
      unit_id
    ) values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000160',
      '31000000-0000-4000-8000-000000000121',
      1,
      10,
      '31000000-0000-4000-8000-000000000110'
    )$$,
  '23514',
  'attribute ordinal cannot exceed configured cardinality'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.product_attribute_values (
      organization_id,
      product_id,
      attribute_definition_id,
      value_text
    ) values (
      '32000000-0000-4000-8000-000000000010',
      '32000000-0000-4000-8000-000000000150',
      '31000000-0000-4000-8000-000000000120',
      'forbidden cross organization value'
    )$$,
  '23514',
  'tenant-aware foreign keys reject cross-organization attribute use'
);

select extensions.throws_ok(
  $$update app_private.catalog_attribute_definitions
    set value_type = 'decimal'
    where id = '31000000-0000-4000-8000-000000000120'$$,
  '23514',
  'attribute category, code, scope and value type are immutable',
  'attribute semantic identity cannot be rewritten'
);

select extensions.throws_ok(
  $$update app_private.catalog_attribute_definitions
    set required_on_activation = false
    where id = '31000000-0000-4000-8000-000000000120'$$,
  '23514',
  'attribute activation contract cannot change while category has active products',
  'active category contract cannot be weakened silently'
);

-- SKU identity, reservation and tenant boundaries.
select pg_temp.throws_sqlstate(
  $$insert into app_private.variant_skus (organization_id, variant_id, sku)
    values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000161',
      'configured-sku'
    )$$,
  '23505',
  'SKU is unique per organization without case ambiguity'
);

select extensions.throws_ok(
  $$update app_private.variant_skus
    set sku = 'REWRITTEN-SKU'
    where id = '31000000-0000-4000-8000-000000000170'$$,
  '23514',
  'SKU identity is immutable',
  'SKU text cannot be rewritten'
);

select extensions.lives_ok(
  $$update app_private.product_variants
    set status = 'paused'
    where id = '31000000-0000-4000-8000-000000000160'$$,
  'variant can be paused before retiring its current SKU'
);

select extensions.lives_ok(
  $$update app_private.variant_skus
    set status = 'reserved', retired_at = now()
    where id = '31000000-0000-4000-8000-000000000170'$$,
  'current SKU can transition to permanently reserved history'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.variant_skus (organization_id, variant_id, sku)
    values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000160',
      'CONFIGURED-SKU'
    )$$,
  '23505',
  'retired SKU remains reserved and cannot be reused'
);

select extensions.ok(
  exists (
    select 1 from app_private.variant_skus
    where organization_id = '32000000-0000-4000-8000-000000000010'
      and sku = 'CONFIGURED-SKU'
  ),
  'same SKU text may exist in a different organization'
);

set constraints all immediate;
set constraints all deferred;

-- Evidence, drafts, candidate selection and explicit resolution.
select pg_temp.throws_sqlstate(
  $$update app_private.catalog_evidence
    set content = '{"rewritten":true}'::jsonb
    where id = '31000000-0000-4000-8000-000000000140'$$,
  '42501',
  'service role cannot rewrite accepted catalog evidence'
);

insert into app_private.catalog_ingestion_drafts (
  id,
  organization_id,
  category_id,
  status,
  proposal,
  unresolved_fields,
  confidence
)
values
  (
    '31000000-0000-4000-8000-000000000190',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'needs_confirmation',
    '{"name":"possible item"}'::jsonb,
    '["maker"]'::jsonb,
    0.72
  ),
  (
    '31000000-0000-4000-8000-000000000191',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000100',
    'collecting',
    '{}'::jsonb,
    '[]'::jsonb,
    null
  );

select pg_temp.throws_sqlstate(
  $$update app_private.catalog_ingestion_drafts
    set status = 'applied',
        applied_product_id = '31000000-0000-4000-8000-000000000150',
        applied_variant_id = '31000000-0000-4000-8000-000000000160'
    where id = '31000000-0000-4000-8000-000000000190'$$,
  '23514',
  'draft with unresolved fields cannot become applied'
);

insert into app_private.catalog_candidate_matches (
  id,
  organization_id,
  draft_id,
  candidate_kind,
  candidate_product_id,
  rank,
  confidence,
  differences
)
values
  (
    '31000000-0000-4000-8000-000000000200',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000190',
    'product',
    '31000000-0000-4000-8000-000000000150',
    1,
    0.88,
    '{"name":"close"}'::jsonb
  ),
  (
    '31000000-0000-4000-8000-000000000201',
    '31000000-0000-4000-8000-000000000010',
    '31000000-0000-4000-8000-000000000190',
    'product',
    '31000000-0000-4000-8000-000000000151',
    2,
    0.82,
    '{"name":"different"}'::jsonb
  );

select extensions.is(
  (
    select count(*)::integer
    from app_private.catalog_candidate_matches
    where draft_id = '31000000-0000-4000-8000-000000000190'
  ),
  2,
  'ambiguous draft preserves every candidate and difference for owner choice'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.catalog_resolution_decisions (
      organization_id,
      draft_id,
      decision,
      selected_candidate_match_id,
      evidence_id
    ) values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000191',
      'reuse_candidate',
      '31000000-0000-4000-8000-000000000200',
      '31000000-0000-4000-8000-000000000140'
    )$$,
  '23514',
  'candidate from another draft cannot resolve ingestion'
);

select extensions.lives_ok(
  $$insert into app_private.catalog_resolution_decisions (
      id,
      organization_id,
      draft_id,
      decision,
      selected_candidate_match_id,
      evidence_id,
      decided_by_user_id
    ) values (
      '31000000-0000-4000-8000-000000000210',
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000190',
      'reuse_candidate',
      '31000000-0000-4000-8000-000000000200',
      '31000000-0000-4000-8000-000000000140',
      '31000000-0000-4000-8000-000000000001'
    )$$,
  'explicit evidence-backed candidate decision is accepted'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.catalog_resolution_decisions (
      organization_id,
      draft_id,
      decision,
      selected_candidate_match_id,
      evidence_id
    ) values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000190',
      'reuse_candidate',
      '31000000-0000-4000-8000-000000000201',
      '31000000-0000-4000-8000-000000000140'
    )$$,
  '23505',
  'draft can have only one append-only resolution decision'
);

select pg_temp.throws_sqlstate(
  $$update app_private.catalog_resolution_decisions
    set decision = 'reject', selected_candidate_match_id = null
    where id = '31000000-0000-4000-8000-000000000210'$$,
  '42501',
  'service role cannot rewrite resolution decision'
);

select extensions.lives_ok(
  $$update app_private.catalog_ingestion_drafts
    set unresolved_fields = '[]'::jsonb,
        status = 'applied',
        applied_product_id = '31000000-0000-4000-8000-000000000150',
        applied_variant_id = '31000000-0000-4000-8000-000000000160'
    where id = '31000000-0000-4000-8000-000000000190'$$,
  'resolved draft can point to authoritative product and variant'
);

-- RLS behavior through real roles and API views.
set local role authenticated;
select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from api.products),
  2,
  'owner sees only products from organization A through API view'
);

select extensions.is(
  (select count(*)::integer from api.variant_skus),
  1,
  'owner sees only SKU ledger from organization A through API view'
);

select extensions.is(
  (select count(*)::integer from api.catalog_ingestion_drafts),
  2,
  'owner can inspect cognitive drafts in own organization'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.products (organization_id, category_id, name)
    values (
      '31000000-0000-4000-8000-000000000010',
      '31000000-0000-4000-8000-000000000100',
      'forbidden authenticated insert'
    )$$,
  '42501',
  'authenticated member cannot bypass tools to mutate catalog'
);

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000003', true);

select extensions.is(
  (select count(*)::integer from api.products),
  2,
  'viewer can read non-sensitive own-organization catalog'
);

select extensions.is(
  (select count(*)::integer from api.catalog_ingestion_drafts),
  0,
  'viewer cannot read cognitive drafts or owner instructions'
);

select set_config('request.jwt.claim.sub', '31000000-0000-4000-8000-000000000002', true);

select extensions.is(
  (select count(*)::integer from api.catalog_ingestion_drafts),
  2,
  'operator can inspect drafts needed for assisted catalog work'
);

set local role anon;

select pg_temp.throws_sqlstate(
  $$select * from api.products$$,
  '42501',
  'anonymous catalog administration access is denied'
);

set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.prosecdef
      and not (
        'search_path=""' = any(coalesce(function.proconfig, '{}'::text[]))
      )
  ),
  0,
  'all app_private security definer functions pin an empty search_path'
);

select pg_temp.throws_sqlstate(
  $$delete from app_private.products
    where id = '31000000-0000-4000-8000-000000000151'$$,
  '42501',
  'service role cannot erase catalog product history'
);

select * from extensions.finish();

rollback;
