begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(82);

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

-- Global ACL, RLS and API-surface contract.
select extensions.ok(
  not has_schema_privilege('anon', 'app_private', 'USAGE'),
  'anon cannot use the private schema'
);
select extensions.ok(
  not has_schema_privilege('anon', 'api', 'USAGE'),
  'anon cannot use the tenant API schema'
);
select extensions.ok(
  has_schema_privilege('authenticated', 'app_private', 'USAGE'),
  'authenticated can resolve security-invoker view dependencies'
);
select extensions.ok(
  has_schema_privilege('authenticated', 'api', 'USAGE'),
  'authenticated can use the explicit tenant API schema'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
  ),
  96,
  'the private data model contains the 96 reviewed tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
  ),
  96,
  'RLS is enabled on every private table'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and relation.relforcerowsecurity
  ),
  96,
  'RLS is forced on every private table'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private'),
  93,
  'the reviewed tenant read-policy set is complete'
);
select extensions.is(
  (
    select string_agg(relation.relname, ', ' order by relation.relname)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and not exists (
        select 1 from pg_catalog.pg_policy as policy where policy.polrelid = relation.oid
      )
  ),
  'inbound_events, meta_webhook_deliveries, outbox_events',
  'only authenticated backend inbox and outbox tables remain default deny without read policies'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private' and cmd = 'SELECT'),
  93,
  'every private policy is read-only'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and roles = array['authenticated']::name[]
  ),
  93,
  'every private policy targets authenticated users only'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and coalesce(qual, '') like '%SELECT auth.uid()%'
  ),
  93,
  'every private policy uses the init-plan auth.uid pattern'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and (
        coalesce(qual, '') ~* 'auth\.jwt|user_metadata|raw_user_meta_data'
        or coalesce(with_check, '') ~* 'auth\.jwt|user_metadata|raw_user_meta_data'
      )
  ),
  0,
  'authorization never trusts mutable JWT metadata'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api' and relation.relkind = 'v'
  ),
  95,
  'the explicit API surface contains the 95 reviewed views'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  95,
  'every API view invokes caller RLS and acts as a security barrier'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.view_column_usage as usage
    where usage.view_schema = 'api'
      and usage.table_schema = 'app_private'
      and not has_column_privilege(
        'authenticated',
        format('%I.%I', usage.table_schema, usage.table_name),
        usage.column_name,
        'SELECT'
      )
  ),
  0,
  'authenticated has every base-column grant required by API views'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.column_privileges as grant_row
    where grant_row.table_schema = 'app_private'
      and grant_row.grantee = 'authenticated'
      and grant_row.privilege_type = 'SELECT'
      and not exists (
        select 1
        from information_schema.view_column_usage as usage
        where usage.view_schema = 'api'
          and usage.table_schema = grant_row.table_schema
          and usage.table_name = grant_row.table_name
          and usage.column_name = grant_row.column_name
      )
  ),
  0,
  'authenticated has no base-column grants outside API projections'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname in ('app_private', 'api')
      and relation.relkind in ('r', 'p', 'v', 'm')
      and (
        has_table_privilege('anon', relation.oid, 'SELECT')
        or has_table_privilege('anon', relation.oid, 'INSERT')
        or has_table_privilege('anon', relation.oid, 'UPDATE')
        or has_table_privilege('anon', relation.oid, 'DELETE')
      )
  ),
  0,
  'anon has no application relation privileges'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and (
        has_table_privilege('authenticated', relation.oid, 'INSERT')
        or has_table_privilege('authenticated', relation.oid, 'UPDATE')
        or has_table_privilege('authenticated', relation.oid, 'DELETE')
        or has_table_privilege('authenticated', relation.oid, 'TRUNCATE')
        or has_table_privilege('authenticated', relation.oid, 'REFERENCES')
        or has_table_privilege('authenticated', relation.oid, 'TRIGGER')
      )
  ),
  0,
  'authenticated has no direct private-table write privilege'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  95,
  'authenticated can select every reviewed API view'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    cross join lateral aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as acl
    where namespace.nspname in ('app_private', 'api')
      and procedure.prokind = 'f'
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  0,
  'PUBLIC cannot execute application functions'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('app_private', 'api')
      and procedure.prokind = 'f'
      and has_function_privilege('anon', procedure.oid, 'EXECUTE')
  ),
  0,
  'anon cannot execute application functions'
);
select extensions.is(
  (
    select string_agg(
      format('%s(%s)', procedure.proname, pg_get_function_identity_arguments(procedure.oid)),
      ', ' order by procedure.proname
    )
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.prokind = 'f'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  'resolve_inventory_requirements(target_organization_id uuid, target_composition_id uuid, target_sale_quantity numeric), resolve_price_quote(target_price_book_id uuid, target_variant_id uuid, target_unit_id uuid, target_quantity numeric, target_at timestamp with time zone)',
  'authenticated can execute only the two reviewed read resolvers'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.prokind = 'f'
      and not has_function_privilege('service_role', procedure.oid, 'EXECUTE')
  ),
  0,
  'service_role can execute every API routine'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('app_private', 'api')
      and procedure.prokind = 'f'
      and procedure.prosecdef
      and not ('search_path=""' = any(coalesce(procedure.proconfig, array[]::text[])))
  ),
  0,
  'every SECURITY DEFINER routine pins an empty search_path'
);
select extensions.ok(
  to_regclass('app_private.organization_memberships_active_user_organization_idx') is not null,
  'the active-membership RLS lookup index exists'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('inbound_events', 'meta_webhook_deliveries', 'outbox_events')
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  0,
  'authenticated backend inbox and outbox remain unreadable to authenticated users'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'app_private.prompt_versions', 'content_template', 'SELECT'),
  'authenticated cannot read prompt content from the private table'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'prompt_versions'
      and column_name = 'content_template'
  ),
  0,
  'prompt content is absent from the API projection'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private' and policyname like '%_admin_select'),
  16,
  'the reviewed admin policy class contains 16 policies'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private' and policyname like '%_operator_select'),
  32,
  'the reviewed operator policy class contains 32 policies'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private' and policyname like '%_member_select'),
  41,
  'the reviewed member policy class contains 41 policies'
);
select extensions.is(
  (select count(*)::integer from pg_catalog.pg_policies where schemaname = 'app_private' and policyname like '%_self_select'),
  2,
  'the reviewed self policy class contains two policies'
);

-- PostgreSQL object defaults are tested by creating and removing real probes.
create table app_private.b2_009_default_table_probe (id bigint primary key);
create sequence app_private.b2_009_default_sequence_probe;
create function api.b2_009_default_function_probe()
returns integer
language sql
security invoker
set search_path = ''
as $$ select 1 $$;

select extensions.ok(
  not exists (
    select 1
    from pg_catalog.pg_class as relation
    cross join lateral aclexplode(coalesce(relation.relacl, acldefault('r', relation.relowner))) as acl
    where relation.oid = 'app_private.b2_009_default_table_probe'::regclass
      and acl.grantee = 0
      and acl.privilege_type = 'SELECT'
  ),
  'new private tables do not default to PUBLIC access'
);
select extensions.ok(
  not has_table_privilege('anon', 'app_private.b2_009_default_table_probe', 'SELECT'),
  'new private tables do not default to anon access'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'app_private.b2_009_default_table_probe', 'SELECT'),
  'new private tables do not default to authenticated access'
);
select extensions.ok(
  not has_table_privilege('service_role', 'app_private.b2_009_default_table_probe', 'SELECT'),
  'new private tables require an explicit backend grant'
);
select extensions.ok(
  not exists (
    select 1
    from pg_catalog.pg_class as relation
    cross join lateral aclexplode(coalesce(relation.relacl, acldefault('S', relation.relowner))) as acl
    where relation.oid = 'app_private.b2_009_default_sequence_probe'::regclass
      and acl.grantee = 0
      and acl.privilege_type in ('USAGE', 'SELECT', 'UPDATE')
  )
  and not has_sequence_privilege('anon', 'app_private.b2_009_default_sequence_probe', 'USAGE')
  and not has_sequence_privilege('authenticated', 'app_private.b2_009_default_sequence_probe', 'USAGE')
  and not has_sequence_privilege('service_role', 'app_private.b2_009_default_sequence_probe', 'USAGE'),
  'new private sequences require explicit grants'
);
select extensions.ok(
  not exists (
    select 1
    from pg_catalog.pg_proc as procedure
    cross join lateral aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as acl
    where procedure.oid = 'api.b2_009_default_function_probe()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ),
  'new API functions do not default to PUBLIC execution'
);
select extensions.ok(
  not has_function_privilege('anon', 'api.b2_009_default_function_probe()', 'EXECUTE'),
  'new API functions do not default to anon execution'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'api.b2_009_default_function_probe()', 'EXECUTE'),
  'new API functions require an explicit authenticated signature grant'
);
select extensions.ok(
  not has_function_privilege('service_role', 'api.b2_009_default_function_probe()', 'EXECUTE'),
  'new API functions require an explicit backend signature grant'
);
select extensions.ok(
  not exists (
    select 1
    from pg_catalog.pg_namespace as namespace
    cross join lateral aclexplode(coalesce(namespace.nspacl, acldefault('n', namespace.nspowner))) as acl
    where namespace.nspname = 'public'
      and acl.grantee = 0
      and acl.privilege_type = 'CREATE'
  ),
  'PUBLIC cannot create objects in the public schema'
);

drop function api.b2_009_default_function_probe();
drop sequence app_private.b2_009_default_sequence_probe;
drop table app_private.b2_009_default_table_probe;

-- Transactional real-schema fixtures. Auth user triggers create the self profiles.
set local role postgres;

insert into auth.users (id)
values
  ('a9000000-0000-4000-8000-000000000001'),
  ('a9000000-0000-4000-8000-000000000002'),
  ('a9000000-0000-4000-8000-000000000003'),
  ('a9000000-0000-4000-8000-000000000004'),
  ('a9000000-0000-4000-8000-000000000005'),
  ('a9000000-0000-4000-8000-000000000006'),
  ('a9000000-0000-4000-8000-000000000007'),
  ('b9000000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values
  ('a9000000-0000-4000-8000-000000000010', 'B2-009 Organization A', 'a9000000-0000-4000-8000-000000000001'),
  ('b9000000-0000-4000-8000-000000000010', 'B2-009 Organization B', 'b9000000-0000-4000-8000-000000000001');

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  ('a9000000-0000-4000-8000-000000000011', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000001', 'owner', 'active', now()),
  ('a9000000-0000-4000-8000-000000000012', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000002', 'admin', 'active', now()),
  ('a9000000-0000-4000-8000-000000000013', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000003', 'operator', 'active', now()),
  ('a9000000-0000-4000-8000-000000000014', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000004', 'viewer', 'active', now()),
  ('a9000000-0000-4000-8000-000000000015', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000005', 'operator', 'suspended', now()),
  ('a9000000-0000-4000-8000-000000000016', 'a9000000-0000-4000-8000-000000000010', 'a9000000-0000-4000-8000-000000000006', 'admin', 'invited', null),
  ('b9000000-0000-4000-8000-000000000011', 'b9000000-0000-4000-8000-000000000010', 'b9000000-0000-4000-8000-000000000001', 'owner', 'active', now());

set constraints all immediate;

insert into app_private.business_profiles (organization_id, public_name, created_by_user_id)
values
  ('a9000000-0000-4000-8000-000000000010', 'B2-009 Business A', 'a9000000-0000-4000-8000-000000000001'),
  ('b9000000-0000-4000-8000-000000000010', 'B2-009 Business B', 'b9000000-0000-4000-8000-000000000001');

insert into app_private.contacts (organization_id, display_name)
values
  ('a9000000-0000-4000-8000-000000000010', 'B2-009 Contact A'),
  ('b9000000-0000-4000-8000-000000000010', 'B2-009 Contact B');

insert into app_private.channel_connections (organization_id, provider, channel, display_name)
values
  ('a9000000-0000-4000-8000-000000000010', 'meta', 'whatsapp', 'B2-009 Channel A'),
  ('b9000000-0000-4000-8000-000000000010', 'meta', 'messenger', 'B2-009 Channel B');

-- Owner A: member, operator and admin surfaces, isolated from B.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000001', true);
select extensions.is((select count(*)::integer from api.business_profiles), 1, 'owner sees one member-class row in its organization');
select extensions.is((select count(*)::integer from api.contacts), 1, 'owner sees one operator-class row in its organization');
select extensions.is((select count(*)::integer from api.channel_connections), 1, 'owner sees one admin-class row in its organization');
select extensions.is((select public_name from api.business_profiles), 'B2-009 Business A', 'owner does not receive another organization business');
select extensions.is((select count(*)::integer from api.user_profiles), 1, 'owner sees only its own user profile');

-- Admin A: all three classes.
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000002', true);
select extensions.is((select count(*)::integer from api.business_profiles), 1, 'admin sees member-class rows');
select extensions.is((select count(*)::integer from api.contacts), 1, 'admin sees operator-class rows');
select extensions.is((select count(*)::integer from api.channel_connections), 1, 'admin sees admin-class rows');

-- Operator A: member and operator, never admin.
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000003', true);
select extensions.is((select count(*)::integer from api.business_profiles), 1, 'operator sees member-class rows');
select extensions.is((select count(*)::integer from api.contacts), 1, 'operator sees operator-class rows');
select extensions.is((select count(*)::integer from api.channel_connections), 0, 'operator cannot see admin-class rows');

-- Viewer A: member only.
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000004', true);
select extensions.is((select count(*)::integer from api.business_profiles), 1, 'viewer sees member-class rows');
select extensions.is((select count(*)::integer from api.contacts), 0, 'viewer cannot see operator-class rows');
select extensions.is((select count(*)::integer from api.channel_connections), 0, 'viewer cannot see admin-class rows');

-- Suspended, invited and outsider identities do not gain tenant visibility.
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000005', true);
select extensions.is((select count(*)::integer from api.business_profiles), 0, 'suspended member cannot see member-class rows');
select extensions.is((select count(*)::integer from api.contacts), 0, 'suspended member cannot see operator-class rows');
select extensions.is((select count(*)::integer from api.channel_connections), 0, 'suspended member cannot see admin-class rows');

select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000006', true);
select extensions.is((select count(*)::integer from api.business_profiles), 0, 'invited member cannot see tenant data before activation');

select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000007', true);
select extensions.is((select count(*)::integer from api.business_profiles), 0, 'outsider cannot see member-class rows');
select extensions.is((select count(*)::integer from api.contacts), 0, 'outsider cannot see operator-class rows');
select extensions.is((select count(*)::integer from api.channel_connections), 0, 'outsider cannot see admin-class rows');

-- The second tenant sees only its own data.
select set_config('request.jwt.claim.sub', 'b9000000-0000-4000-8000-000000000001', true);
select extensions.is((select public_name from api.business_profiles), 'B2-009 Business B', 'organization B owner sees only organization B');

-- Browser identities cannot bypass tool calling with direct DML or mutating RPCs.
select set_config('request.jwt.claim.sub', 'a9000000-0000-4000-8000-000000000001', true);
select pg_temp.throws_sqlstate(
  $$insert into app_private.contacts (organization_id, display_name) values ('a9000000-0000-4000-8000-000000000010', 'Unauthorized')$$,
  '42501',
  'authenticated cannot insert directly into private tables'
);
select pg_temp.throws_sqlstate(
  $$update app_private.organizations set name = 'Unauthorized' where id = 'a9000000-0000-4000-8000-000000000010'$$,
  '42501',
  'authenticated cannot update private tables directly'
);
select pg_temp.throws_sqlstate(
  $$delete from app_private.business_profiles where organization_id = 'a9000000-0000-4000-8000-000000000010'$$,
  '42501',
  'authenticated cannot delete private rows directly'
);
select pg_temp.throws_sqlstate(
  $$select * from api.claim_agent_job('a9000000-0000-4000-8000-000000000010', 'unauthorized-worker', 120)$$,
  '42501',
  'authenticated cannot execute mutating worker RPCs'
);
select pg_temp.throws_sqlstate(
  $$select content_template from app_private.prompt_versions limit 1$$,
  '42501',
  'authenticated cannot read the hidden prompt template column'
);

reset role;
reset request.jwt.claim.sub;

set local role anon;
select pg_temp.throws_sqlstate(
  $$select * from api.business_profiles$$,
  '42501',
  'anon cannot query the tenant API surface'
);
reset role;

-- Backend scope is explicit and complete; RLS bypass belongs only to the trusted worker role.
set local role service_role;
select extensions.is((select count(*)::integer from api.business_profiles), 2, 'service_role can inspect both tenant rows for backend work');
reset role;
select extensions.ok(
  has_function_privilege('service_role', 'api.claim_agent_job(uuid,text,integer)', 'EXECUTE'),
  'service_role can execute the worker claim RPC'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and has_table_privilege('service_role', relation.oid, 'SELECT')
  ),
  94,
  'service_role can fully read 94 reviewed private tables'
);
select extensions.ok(
  not has_column_privilege(
    'service_role',
    'app_private.meta_credential_versions',
    'vault_secret_id',
    'SELECT'
  ),
  'service_role cannot read tenant Vault references from credential metadata'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'meta_credential_versions'
      and column_name = 'vault_secret_id'
  ),
  0,
  'tenant Vault references are absent from the Data API projection'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and has_table_privilege('service_role', relation.oid, 'INSERT')
  ),
  38,
  'service_role can insert only into the 38 reviewed entry tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and has_table_privilege('service_role', relation.oid, 'UPDATE')
  ),
  31,
  'service_role can update only the 31 reviewed mutable tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and has_table_privilege('service_role', relation.oid, 'DELETE')
  ),
  4,
  'service_role can delete only from the four reviewed foundation tables'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'api.resolve_price_quote(uuid,uuid,uuid,numeric,timestamp with time zone)',
    'EXECUTE'
  ),
  'authenticated can execute the certified price resolver'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'api.resolve_inventory_requirements(uuid,uuid,numeric)',
    'EXECUTE'
  ),
  'authenticated can execute the certified inventory resolver'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname in ('app_private', 'api')
      and procedure.prokind = 'f'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ),
  2,
  'no third application routine is executable by authenticated'
);

select * from extensions.finish();
rollback;
