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

select extensions.has_column(
  'app_private',
  'meta_applications',
  'facebook_business_login_configuration_id',
  'Meta applications store the non-secret Business Login configuration identifier'
);
select extensions.has_column(
  'app_private',
  'facebook_page_oauth_sessions',
  'facebook_business_login_configuration_id',
  'OAuth sessions snapshot the Business Login configuration identifier'
);
select extensions.has_function(
  'api',
  'configure_facebook_business_login',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text'],
  'the owner-only Business Login configuration RPC exists'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.configure_facebook_business_login(uuid,uuid,text,uuid,text,text)',
    'EXECUTE'
  ),
  'service_role can execute the backend-only configuration RPC'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.configure_facebook_business_login(uuid,uuid,text,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass the API configuration route'
);
select extensions.ok(
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'meta_applications'
      and column_name = 'facebook_business_login_configuration_id'
  ),
  'the owner-visible Meta application view exposes configuration readiness'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4087000-0000-4000-8000-000000000001'),
  ('b4087000-0000-4000-8000-000000000002'),
  ('b4087000-0000-4000-8000-000000000003');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4087100-0000-4000-8000-000000000001',
  'B4 Business Login',
  'b4087000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    'b4087200-0000-4000-8000-000000000001',
    'b4087100-0000-4000-8000-000000000001',
    'b4087000-0000-4000-8000-000000000001',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b4087200-0000-4000-8000-000000000002',
    'b4087100-0000-4000-8000-000000000001',
    'b4087000-0000-4000-8000-000000000002',
    'admin', 'active', statement_timestamp()
  );

set constraints all immediate;
set local role service_role;

create temporary table pg_temp.meta_application (
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  endpoint_key uuid
) on commit drop;

grant select, insert on pg_temp.meta_application to service_role;

insert into pg_temp.meta_application
select * from api.register_meta_application(
  'b4087100-0000-4000-8000-000000000001',
  '408700000000001',
  'AgenteFer Business Login',
  'v26.0',
  'business-login-app-secret-0123456789',
  'business-login-verify-token-0123456789',
  'b4087000-0000-4000-8000-000000000001',
  'b408-register-meta-application',
  'b408-register-meta-trace'
);

reset role;
set local role postgres;

update app_private.meta_applications
set status = 'active'
where id = (select meta_application_id from pg_temp.meta_application);

set local role service_role;

select pg_temp.throws_sqlstate(
  $$select * from api.begin_facebook_page_oauth(
    'b4087100-0000-4000-8000-000000000001',
    'b4087000-0000-4000-8000-000000000001',
    'missing-config-state-01234567890123456789',
    'https://agentefer.example.test/admin/catalog/facebook/callback'
  )$$,
  '55000',
  'OAuth fails closed before the application has a Business Login configuration'
);

select pg_temp.throws_sqlstate(
  format(
    'select api.configure_facebook_business_login(%L,%L,%L,%L,%L,%L)',
    'b4087100-0000-4000-8000-000000000001',
    (select meta_application_id from pg_temp.meta_application),
    'not-decimal',
    'b4087000-0000-4000-8000-000000000001',
    'b408-invalid-configuration',
    'b408-invalid-trace'
  ),
  '22023',
  'configuration identifiers must be bounded decimal Meta identifiers'
);

select pg_temp.throws_sqlstate(
  format(
    'select api.configure_facebook_business_login(%L,%L,%L,%L,%L,%L)',
    'b4087100-0000-4000-8000-000000000001',
    (select meta_application_id from pg_temp.meta_application),
    '408788888888001',
    'b4087000-0000-4000-8000-000000000002',
    'b408-admin-configuration',
    'b408-admin-trace'
  ),
  '42501',
  'an organization admin cannot configure persistent Facebook access'
);

select pg_temp.throws_sqlstate(
  format(
    'select api.configure_facebook_business_login(%L,%L,%L,%L,%L,%L)',
    'b4087100-0000-4000-8000-000000000001',
    (select meta_application_id from pg_temp.meta_application),
    '408788888888001',
    'b4087000-0000-4000-8000-000000000003',
    'b408-outsider-configuration',
    'b408-outsider-trace'
  ),
  '42501',
  'a user outside the organization cannot configure persistent Facebook access'
);

select pg_temp.throws_sqlstate(
  $$select api.configure_facebook_business_login(
    'b4087100-0000-4000-8000-000000000001',
    'b4087300-0000-4000-8000-000000000099',
    '408788888888001',
    'b4087000-0000-4000-8000-000000000001',
    'b408-wrong-application',
    'b408-wrong-application-trace'
  )$$,
  '42501',
  'an owner cannot configure an application outside the exact tenant scope'
);

select api.configure_facebook_business_login(
  'b4087100-0000-4000-8000-000000000001',
  (select meta_application_id from pg_temp.meta_application),
  '408788888888001',
  'b4087000-0000-4000-8000-000000000001',
  'b408-owner-configuration',
  'b408-owner-configuration-trace'
);

reset role;
set local role postgres;

select extensions.is(
  (
    select facebook_business_login_configuration_id
    from app_private.meta_applications
    where id = (select meta_application_id from pg_temp.meta_application)
  ),
  '408788888888001',
  'the exact active Meta application stores its configuration identifier'
);
select extensions.is(
  (
    select metadata_safe ->> 'configuration_changed'
    from app_private.audit_events
    where correlation_id = 'b408-owner-configuration'
  ),
  'true',
  'configuration changes are audited without storing secrets'
);
select extensions.ok(
  (
    select not metadata_safe ? 'configuration_id'
    from app_private.audit_events
    where correlation_id = 'b408-owner-configuration'
  ),
  'audit metadata does not duplicate the provider configuration identifier'
);

create temporary table pg_temp.facebook_oauth_begin (
  oauth_session_id uuid,
  external_app_id text,
  api_version text,
  configuration_id text
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

insert into pg_temp.facebook_oauth_begin
select * from api.begin_facebook_page_oauth(
  'b4087100-0000-4000-8000-000000000001',
  'b4087000-0000-4000-8000-000000000001',
  'owner-system-state-0123456789012345678901',
  'https://agentefer.example.test/admin/catalog/facebook/callback'
);

reset role;
set local role postgres;

select extensions.is(
  (select configuration_id from pg_temp.facebook_oauth_begin),
  '408788888888001',
  'begin returns the configured Meta Business Login identifier to the backend'
);
select extensions.is(
  (
    select facebook_business_login_configuration_id
    from app_private.facebook_page_oauth_sessions
    where id = (select oauth_session_id from pg_temp.facebook_oauth_begin)
  ),
  '408788888888001',
  'the OAuth session snapshots its configuration against time-of-check changes'
);

update app_private.meta_applications
set facebook_business_login_configuration_id = '408788888888002'
where id = (select meta_application_id from pg_temp.meta_application);

select extensions.is(
  (
    select facebook_business_login_configuration_id
    from app_private.facebook_page_oauth_sessions
    where id = (select oauth_session_id from pg_temp.facebook_oauth_begin)
  ),
  '408788888888001',
  'an application update cannot change an already-started OAuth authorization contract'
);

set local role service_role;

insert into pg_temp.facebook_oauth_claim
select * from api.claim_facebook_page_oauth_exchange(
  'owner-system-state-0123456789012345678901',
  'b4087000-0000-4000-8000-000000000001'
);

select pg_temp.throws_sqlstate(
  format(
    'select api.stage_facebook_page_oauth_pages(%L,%L,%L,%L::jsonb,%L)',
    (select oauth_session_id from pg_temp.facebook_oauth_claim),
    'b4087000-0000-4000-8000-000000000001',
    (select exchange_lease_token from pg_temp.facebook_oauth_claim),
    '[{"id":"408799999999001","name":"Página Fer","tasks":["CREATE_CONTENT"]}]',
    '[{"id":"408799999999001","access_token":"legacy-user-token-0123456789"}]'
  ),
  '22023',
  'the legacy user-token bundle is rejected by the Business Login contract'
);

select api.stage_facebook_page_oauth_pages(
  (select oauth_session_id from pg_temp.facebook_oauth_claim),
  'b4087000-0000-4000-8000-000000000001',
  (select exchange_lease_token from pg_temp.facebook_oauth_claim),
  jsonb_build_array(jsonb_build_object(
    'id', '408799999999001',
    'name', 'Página Fer',
    'tasks', jsonb_build_array('CREATE_CONTENT', 'ANALYZE')
  )),
  jsonb_build_object(
    'token_type', 'business_integration_system_user',
    'access_token', 'business-system-user-token-0123456789',
    'page_ids', jsonb_build_array('408799999999001')
  )::text
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
  'a validated Business Login token bundle is staged in Vault'
);

set local role service_role;

insert into pg_temp.facebook_oauth_complete
select * from api.complete_facebook_page_oauth(
  (select oauth_session_id from pg_temp.facebook_oauth_claim),
  'b4087000-0000-4000-8000-000000000001',
  '408799999999001'
);

reset role;
set local role postgres;

select extensions.is(
  (select page_name from pg_temp.facebook_oauth_complete),
  'Página Fer',
  'legacy CREATE_CONTENT provider evidence activates the selected Page'
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
  'business-system-user-token-0123456789',
  'the persistent business system-user token is encrypted in tenant-scoped Vault storage'
);
select extensions.is(
  (
    select evidence_summary ->> 'token_type'
    from app_private.social_capabilities
    where social_connection_id = (
      select social_connection_id from pg_temp.facebook_oauth_complete
    )
      and capability_code = 'page.post.create'
    order by created_at desc
    limit 1
  ),
  'business_integration_system_user',
  'the publication capability records the provider token class'
);
select extensions.is(
  (
    select count(*)::integer
    from vault.secrets
    where name like 'agentefer/facebook-oauth/%'
  ),
  0,
  'the ephemeral selection bundle is destroyed after atomic activation'
);

select * from extensions.finish();

rollback;
