begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(49);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
set search_path = ''
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
select extensions.has_schema('app_private', 'app_private schema exists');
select extensions.has_schema('api', 'api schema exists');
select extensions.has_table('app_private', 'organizations', 'organizations table exists');
select extensions.has_table('app_private', 'user_profiles', 'user_profiles table exists');
select extensions.has_table(
  'app_private',
  'organization_memberships',
  'organization_memberships table exists'
);
select extensions.has_table(
  'app_private',
  'business_profiles',
  'business_profiles table exists'
);
select extensions.has_view('api', 'organizations', 'organizations API view exists');
select extensions.has_view('api', 'user_profiles', 'user_profiles API view exists');
select extensions.has_view(
  'api',
  'organization_memberships',
  'organization_memberships API view exists'
);
select extensions.has_view('api', 'business_profiles', 'business_profiles API view exists');

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'organizations',
        'user_profiles',
        'organization_memberships',
        'business_profiles'
      )
      and relation.relrowsecurity
  ),
  4,
  'RLS is enabled on every private table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'organizations',
        'user_profiles',
        'organization_memberships',
        'business_profiles'
      )
      and relation.relforcerowsecurity
  ),
  4,
  'RLS is forced on every private table'
);

select extensions.is(
  (
    select array_agg(policyname order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
  ),
  array[
    'business_profiles_member_select',
    'organization_memberships_self_select',
    'organizations_member_select',
    'user_profiles_self_select'
  ]::text[],
  'the exact authenticated read policies exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and relation.relname in (
        'organizations',
        'user_profiles',
        'organization_memberships',
        'business_profiles'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  4,
  'every API view executes with caller RLS and a security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('app_private', 'api')
      and relation.relname in (
        'organizations',
        'user_profiles',
        'organization_memberships',
        'business_profiles'
      )
      and (
        has_table_privilege('anon', relation.oid, 'SELECT')
        or has_table_privilege('anon', relation.oid, 'INSERT')
        or has_table_privilege('anon', relation.oid, 'UPDATE')
        or has_table_privilege('anon', relation.oid, 'DELETE')
      )
  ),
  0,
  'anon has no application table or view privileges'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_namespace as namespace
    where namespace.nspname in ('app_private', 'api')
      and has_schema_privilege('anon', namespace.oid, 'USAGE')
  ),
  0,
  'anon has no application schema usage'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind = 'r'
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  4,
  'authenticated receives read access to all private relations for RLS evaluation'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind = 'r'
      and (
        has_table_privilege('authenticated', relation.oid, 'INSERT')
        or has_table_privilege('authenticated', relation.oid, 'UPDATE')
        or has_table_privilege('authenticated', relation.oid, 'DELETE')
      )
  ),
  0,
  'authenticated has no direct mutation privilege'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  4,
  'authenticated can read all API views subject to RLS'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind = 'r'
      and has_table_privilege('service_role', relation.oid, 'SELECT')
      and has_table_privilege('service_role', relation.oid, 'INSERT')
      and has_table_privilege('service_role', relation.oid, 'UPDATE')
      and has_table_privilege('service_role', relation.oid, 'DELETE')
  ),
  4,
  'service_role has explicit backend CRUD privileges'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.proname in (
        'set_updated_at',
        'provision_user_profile',
        'prevent_membership_reassignment',
        'assert_active_owner'
      )
      and exists (
        select 1
        from unnest(function.proconfig) as configuration(option)
        where configuration.option like 'search_path=%'
      )
  ),
  4,
  'every trigger function pins an empty search_path'
);

select extensions.is(
  (
    select array_agg(function.proname order by function.proname)
    from pg_catalog.pg_proc as function
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.prosecdef
  ),
  array['assert_active_owner', 'provision_user_profile']::name[],
  'only the two audited trigger functions are security definer'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger as trigger
    inner join pg_catalog.pg_class as relation
      on relation.oid = trigger.tgrelid
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'auth'
      and relation.relname = 'users'
      and trigger.tgname = 'auth_user_provision_profile'
      and not trigger.tgisinternal
  ),
  1,
  'auth.users provisions an application profile'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger as trigger
    inner join pg_catalog.pg_class as relation
      on relation.oid = trigger.tgrelid
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and trigger.tgname in (
        'organizations_require_active_owner',
        'organization_memberships_preserve_active_owner'
      )
      and trigger.tgdeferrable
      and trigger.tginitdeferred
  ),
  2,
  'active-owner constraint triggers are deferred for atomic onboarding'
);

select extensions.is(
  (
    select array_agg(index.relname order by index.relname)
    from pg_catalog.pg_class as index
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = index.relnamespace
    where namespace.nspname = 'app_private'
      and index.relname in (
        'organizations_created_by_user_idx',
        'organization_memberships_active_user_organization_idx',
        'organization_memberships_user_idx',
        'organization_memberships_active_owner_idx',
        'organization_memberships_invited_by_user_idx',
        'business_profiles_created_by_user_idx'
      )
  ),
  array[
    'business_profiles_created_by_user_idx',
    'organization_memberships_active_owner_idx',
    'organization_memberships_active_user_organization_idx',
    'organization_memberships_invited_by_user_idx',
    'organization_memberships_user_idx',
    'organizations_created_by_user_idx'
  ]::name[],
  'explicit authorization and foreign-key indexes exist'
);

-- Ephemeral QA identities. The enclosing transaction rolls every row back.
insert into auth.users (id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid);

select extensions.is(
  (
    select count(*)::integer
    from app_private.user_profiles
    where user_id in (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )
  ),
  2,
  'the Auth trigger provisions both application profiles'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.user_profiles
    where user_id in (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )
      and preferred_name is null
      and preferred_locale is null
      and accessibility_preferences = '{}'::jsonb
  ),
  2,
  'profile provisioning does not trust or copy Auth metadata'
);

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Organization Alpha',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Organization Beta',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  );

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
    '31111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'owner',
    'active',
    now()
  ),
  (
    '32222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'owner',
    'active',
    now()
  );

insert into app_private.business_profiles (
  id,
  organization_id,
  public_name,
  time_zone,
  default_locale,
  created_by_user_id
)
values
  (
    '41111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Business Alpha',
    'America/Tijuana',
    'es-MX',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '42222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Business Beta',
    'America/Tijuana',
    'es-MX',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  );

set constraints all immediate;

select extensions.is(
  (select count(*)::integer from app_private.organizations),
  2,
  'the valid organization fixtures satisfy the production schema'
);

select extensions.is(
  (select count(*)::integer from app_private.business_profiles),
  2,
  'the valid business fixtures satisfy the production schema'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organizations (name) values (' padded ')$$,
  '23514',
  'organization names reject surrounding whitespace'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organizations (name, status) values ('Invalid status', 'deleted')$$,
  '23514',
  'organization status is constrained'
);

select pg_temp.throws_sqlstate(
  $$update app_private.user_profiles
    set accessibility_preferences = '[]'::jsonb
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid$$,
  '23514',
  'accessibility preferences must remain a JSON object'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organization_memberships (
      organization_id, user_id, role, status, joined_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'salesperson',
      'active',
      now()
    )$$,
  '23514',
  'membership role is constrained'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organization_memberships (
      organization_id, user_id, role, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
      'operator',
      'active'
    )$$,
  '23514',
  'active membership requires joined_at'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organization_memberships (
      organization_id, user_id, role, status, joined_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'owner',
      'active',
      now()
    )$$,
  '23505',
  'one user cannot receive duplicate membership in an organization'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.business_profiles (organization_id, public_name)
    values ('11111111-1111-4111-8111-111111111111'::uuid, 'Duplicate')$$,
  '23505',
  'one organization cannot receive duplicate business profiles'
);

select pg_temp.throws_sqlstate(
  $$update app_private.organization_memberships
    set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    where id = '31111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'membership identity cannot be reassigned'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organizations (name) values ('Ownerless')$$,
  '23514',
  'an organization cannot finish a statement without an active owner once constraints are immediate'
);

select pg_temp.throws_sqlstate(
  $$update app_private.organization_memberships
    set role = 'admin'
    where id = '31111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'the final active owner cannot be demoted'
);

select pg_temp.throws_sqlstate(
  $$delete from app_private.organization_memberships
    where id = '31111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'the final active owner cannot be deleted'
);

update app_private.organizations
set name = 'Organization Alpha Updated'
where id = '11111111-1111-4111-8111-111111111111'::uuid;

select extensions.ok(
  (
    select updated_at > created_at
    from app_private.organizations
    where id = '11111111-1111-4111-8111-111111111111'::uuid
  ),
  'updated_at advances automatically on mutation'
);

set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select extensions.is(
  (select count(*)::integer from api.organizations),
  1,
  'authenticated user sees only their organization through the API'
);

select extensions.is(
  (select count(*)::integer from api.user_profiles),
  1,
  'authenticated user sees only their own profile through the API'
);

select extensions.is(
  (select count(*)::integer from api.organization_memberships),
  1,
  'authenticated user sees only their own membership through the API'
);

select extensions.is(
  (select count(*)::integer from api.business_profiles),
  1,
  'authenticated user sees only their business profile through the API'
);

select extensions.is(
  (select name from api.organizations),
  'Organization Alpha Updated',
  'RLS does not leak the second organization'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.organizations (name) values ('Unauthorized mutation')$$,
  '42501',
  'authenticated cannot mutate private tables directly'
);

reset role;
reset request.jwt.claim.sub;

set local role anon;

select pg_temp.throws_sqlstate(
  $$select * from api.organizations$$,
  '42501',
  'anon cannot read the private API surface'
);

reset role;

set local role service_role;

select extensions.is(
  (select count(*)::integer from api.organizations),
  2,
  'service_role can operate across organizations for the authorized backend'
);

reset role;

select * from extensions.finish();
rollback;
