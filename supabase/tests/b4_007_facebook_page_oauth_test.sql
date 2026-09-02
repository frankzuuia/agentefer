begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(28);

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
  'app_private', 'facebook_page_credentials',
  'tenant-scoped Facebook Page credential metadata exists'
);
select extensions.has_table(
  'app_private', 'facebook_page_oauth_sessions',
  'short-lived Facebook OAuth sessions exist'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('facebook_page_credentials', 'facebook_page_oauth_sessions')
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  2,
  'RLS is enabled and forced on both Facebook OAuth tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in ('facebook_page_credentials', 'facebook_page_oauth_sessions')
  ),
  0,
  'browser roles receive no policy over OAuth state or credentials'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'begin_facebook_page_oauth',
        'claim_facebook_page_oauth_exchange',
        'stage_facebook_page_oauth_pages',
        'fail_facebook_page_oauth',
        'complete_facebook_page_oauth'
      )
  ),
  5,
  'all five reviewed Facebook OAuth RPCs exist'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'begin_facebook_page_oauth',
        'claim_facebook_page_oauth_exchange',
        'stage_facebook_page_oauth_pages',
        'fail_facebook_page_oauth',
        'complete_facebook_page_oauth'
      )
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  5,
  'service_role can execute the backend-only OAuth contract'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'begin_facebook_page_oauth',
        'claim_facebook_page_oauth_exchange',
        'stage_facebook_page_oauth_pages',
        'fail_facebook_page_oauth',
        'complete_facebook_page_oauth'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'browser roles cannot bypass the authenticated API OAuth routes'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'vault.decrypted_secrets', 'SELECT'),
  'authenticated users cannot decrypt Facebook tokens from Vault'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4077000-0000-4000-8000-000000000001'),
  ('b4077000-0000-4000-8000-000000000002'),
  ('b4077000-0000-4000-8000-000000000003');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4077100-0000-4000-8000-000000000001',
  'B4 Facebook OAuth',
  'b4077000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    'b4077200-0000-4000-8000-000000000001',
    'b4077100-0000-4000-8000-000000000001',
    'b4077000-0000-4000-8000-000000000001',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b4077200-0000-4000-8000-000000000002',
    'b4077100-0000-4000-8000-000000000001',
    'b4077000-0000-4000-8000-000000000002',
    'admin', 'active', statement_timestamp()
  );

set constraints all immediate;
set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4077100-0000-4000-8000-000000000001',
      '407700000000001',
      'AgenteFer Facebook OAuth',
      'v26.0',
      'facebook-oauth-app-secret-0123456789',
      'facebook-oauth-verify-token-0123456789',
      'b4077000-0000-4000-8000-000000000001',
      'b407-facebook-meta-app',
      'b407-facebook-meta-trace'
    )
  ),
  1,
  'the real tenant Meta application is registered with Vault-backed secrets'
);

reset role;
set local role postgres;

update app_private.meta_applications
set status = 'active'
where organization_id = 'b4077100-0000-4000-8000-000000000001';

create temporary table pg_temp.facebook_oauth_begin (
  oauth_session_id uuid,
  external_app_id text,
  api_version text
) on commit drop;

create temporary table pg_temp.facebook_oauth_claim (
  oauth_session_id uuid,
  organization_id uuid,
  external_app_id text,
  api_version text,
  redirect_uri text,
  app_secret text,
  exchange_lease_token uuid
) on commit drop;

create temporary table pg_temp.facebook_oauth_complete (
  social_connection_id uuid,
  page_name text
) on commit drop;

grant select, insert on
  pg_temp.facebook_oauth_begin,
  pg_temp.facebook_oauth_claim,
  pg_temp.facebook_oauth_complete
to service_role;

set local role service_role;

select pg_temp.throws_sqlstate(
  $$select * from api.begin_facebook_page_oauth(
    'b4077100-0000-4000-8000-000000000001',
    'b4077000-0000-4000-8000-000000000002',
    'admin-state-01234567890123456789012345678901',
    'https://agentefer.example.test/admin/catalog/facebook/callback'
  )$$,
  '42501',
  'an organization admin cannot start the owner-only Facebook OAuth flow'
);

select pg_temp.throws_sqlstate(
  $$select * from api.begin_facebook_page_oauth(
    'b4077100-0000-4000-8000-000000000001',
    'b4077000-0000-4000-8000-000000000003',
    'foreign-state-01234567890123456789012345678',
    'https://agentefer.example.test/admin/catalog/facebook/callback'
  )$$,
  '42501',
  'a user outside the organization cannot start Facebook OAuth'
);

insert into pg_temp.facebook_oauth_begin
select * from api.begin_facebook_page_oauth(
  'b4077100-0000-4000-8000-000000000001',
  'b4077000-0000-4000-8000-000000000001',
  'owner-state-01234567890123456789012345678901',
  'https://agentefer.example.test/admin/catalog/facebook/callback'
);

reset role;
set local role postgres;

select extensions.is(
  (select external_app_id || ':' || api_version from pg_temp.facebook_oauth_begin),
  '407700000000001:v26.0',
  'an owner receives only the safe Meta application identity needed for OAuth'
);
select extensions.ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name = 'facebook_page_oauth_sessions'
      and column_name in ('state', 'app_secret', 'access_token')
  ),
  'raw OAuth state and provider credentials are absent from session columns'
);

set local role service_role;

select pg_temp.throws_sqlstate(
  $$select * from api.claim_facebook_page_oauth_exchange(
    'incorrect-state-012345678901234567890123456',
    'b4077000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  'an incorrect OAuth state cannot claim the exchange'
);

insert into pg_temp.facebook_oauth_claim
select * from api.claim_facebook_page_oauth_exchange(
  'owner-state-01234567890123456789012345678901',
  'b4077000-0000-4000-8000-000000000001'
);

select extensions.is(
  (select app_secret from pg_temp.facebook_oauth_claim),
  'facebook-oauth-app-secret-0123456789',
  'only the leased backend exchange can resolve the application secret'
);
select extensions.ok(
  (select exchange_lease_token is not null from pg_temp.facebook_oauth_claim),
  'the provider exchange receives an unguessable single-use lease'
);
select pg_temp.throws_sqlstate(
  $$select * from api.claim_facebook_page_oauth_exchange(
    'owner-state-01234567890123456789012345678901',
    'b4077000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  'the same OAuth state cannot be claimed twice'
);

select api.stage_facebook_page_oauth_pages(
  (select oauth_session_id from pg_temp.facebook_oauth_claim),
  'b4077000-0000-4000-8000-000000000001',
  (select exchange_lease_token from pg_temp.facebook_oauth_claim),
  jsonb_build_array(jsonb_build_object(
    'id', '407799999999001',
    'name', 'Página Fer Pruebas',
    'tasks', jsonb_build_array('PROFILE_PLUS_CREATE_CONTENT', 'PROFILE_PLUS_MANAGE')
  )),
  jsonb_build_array(jsonb_build_object(
    'id', '407799999999001',
    'access_token', 'page-access-token-0123456789abcdef'
  ))::text
);

reset role;
set local role postgres;

select extensions.is(
  (
    select status
    from app_private.facebook_page_oauth_sessions
    where id = (select oauth_session_id from pg_temp.facebook_oauth_claim)
  ),
  'pages_ready',
  'validated Page choices are staged for owner selection'
);
select extensions.ok(
  (
    select page_candidates::text not like '%page-access-token%'
    from app_private.facebook_page_oauth_sessions
    where id = (select oauth_session_id from pg_temp.facebook_oauth_claim)
  ),
  'safe Page candidates never contain their access tokens'
);

set local role service_role;

insert into pg_temp.facebook_oauth_complete
select * from api.complete_facebook_page_oauth(
  (select oauth_session_id from pg_temp.facebook_oauth_claim),
  'b4077000-0000-4000-8000-000000000001',
  '407799999999001'
);

reset role;
set local role postgres;

select extensions.is(
  (select page_name from pg_temp.facebook_oauth_complete),
  'Página Fer Pruebas',
  'the owner-selected Page is returned after atomic activation'
);
select extensions.is(
  (
    select status
    from app_private.social_connections
    where id = (select social_connection_id from pg_temp.facebook_oauth_complete)
  ),
  'active',
  'the selected Facebook Page becomes an active social connection'
);
select extensions.ok(
  (
    select credential_reference like 'facebook-page-credential://%'
    from app_private.social_connections
    where id = (select social_connection_id from pg_temp.facebook_oauth_complete)
  ),
  'the connection references its own typed Facebook Page credential'
);
select extensions.is(
  (
    select decrypted.decrypted_secret
    from app_private.facebook_page_credentials as credential_value
    join vault.decrypted_secrets as decrypted on decrypted.id = credential_value.vault_secret_id
    where credential_value.social_connection_id = (
      select social_connection_id from pg_temp.facebook_oauth_complete
    )
  ),
  'page-access-token-0123456789abcdef',
  'the selected Page token is encrypted in Vault and resolves only on the private path'
);
select extensions.is(
  (
    select count(*)::integer
    from vault.secrets
    where name like 'agentefer/facebook-oauth/%'
  ),
  0,
  'the temporary multi-Page token bundle is destroyed after selection'
);
select extensions.is(
  (
    select status
    from app_private.facebook_page_oauth_sessions
    where id = (select oauth_session_id from pg_temp.facebook_oauth_claim)
  ),
  'completed',
  'the OAuth session is durably completed and cannot be replayed'
);
select extensions.ok(
  exists (
    select 1
    from app_private.social_capabilities
    where social_connection_id = (
      select social_connection_id from pg_temp.facebook_oauth_complete
    )
      and capability_code = 'page.post.create'
      and status = 'granted'
      and capability_constraints #>> '{dispatch_policy,minimum_spacing_seconds}' = '3600'
  ),
  'the connection receives an explicit rate-aware Page publishing capability'
);
select extensions.ok(
  pg_get_functiondef('api.claim_facebook_publication_job(text,integer,uuid,timestamptz)'::regprocedure)
    like '%facebook_page_credentials%'
  and pg_get_functiondef('api.claim_facebook_publication_job(text,integer,uuid,timestamptz)'::regprocedure)
    like '%system_user_access_token%',
  'the worker resolves connection-specific Page tokens with legacy fallback compatibility'
);

set local role service_role;
select pg_temp.throws_sqlstate(
  format(
    'select * from api.complete_facebook_page_oauth(%L, %L, %L)',
    (select oauth_session_id from pg_temp.facebook_oauth_claim),
    'b4077000-0000-4000-8000-000000000001',
    '407799999999001'
  ),
  '42501',
  'a completed OAuth selection cannot be replayed'
);

reset role;
set local role postgres;

select * from extensions.finish();

rollback;
