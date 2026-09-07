begin;
create extension if not exists pgtap with schema extensions;
select extensions.no_plan();

create function pg_temp.throws_sqlstate(statement text, expected text, description text)
returns text language plpgsql set search_path = extensions, pg_catalog as $$
declare actual text;
begin
  begin
    execute statement;
    raise exception using errcode = 'P4090', message = 'Rollback unexpected test success';
  exception when sqlstate 'P4090' then
    return extensions.fail(description);
  end;
exception when others then
  get stacked diagnostics actual = returned_sqlstate;
  return extensions.is(actual,expected,description);
end;
$$;
grant execute on function pg_temp.throws_sqlstate(text,text,text) to service_role;

select extensions.ok(not has_function_privilege('authenticated',
  'api.configure_facebook_login(uuid,uuid,text,text,uuid,text,text)','EXECUTE'),
  'browser cannot directly configure a login mode');
select extensions.ok(not has_function_privilege('service_role',
  'app_private.validate_facebook_oauth_bundle(jsonb,text,jsonb)','EXECUTE'),
  'the credential validator remains internal');

insert into auth.users(id) values
  ('b4090000-0000-4000-8000-000000000001'),
  ('b4090000-0000-4000-8000-000000000002'),
  ('b4090000-0000-4000-8000-000000000003');
insert into app_private.organizations(id,name,created_by_user_id) values
  ('b4091000-0000-4000-8000-000000000001','Login Modes A','b4090000-0000-4000-8000-000000000001'),
  ('b4091000-0000-4000-8000-000000000002','Login Modes B','b4090000-0000-4000-8000-000000000002');
insert into app_private.organization_memberships(organization_id,user_id,role,status,joined_at) values
  ('b4091000-0000-4000-8000-000000000001','b4090000-0000-4000-8000-000000000001','owner','active',now()),
  ('b4091000-0000-4000-8000-000000000002','b4090000-0000-4000-8000-000000000002','owner','active',now()),
  ('b4091000-0000-4000-8000-000000000001','b4090000-0000-4000-8000-000000000003','admin','active',now());
set constraints all immediate;
set local role service_role;
create temporary table pg_temp.app as select * from api.register_meta_application(
  'b4091000-0000-4000-8000-000000000001','409000000000001','Login modes test','v26.0',
  'test-app-secret-long-value-b409','test-verify-token-long-value-b409',
  'b4090000-0000-4000-8000-000000000001','b409-register',null);
reset role;
update app_private.meta_applications set status='active'
where id=(select meta_application_id from pg_temp.app);
select extensions.is((select facebook_login_mode from app_private.meta_applications
  where id=(select meta_application_id from pg_temp.app)), 'business_integration_system_user',
  'existing and newly registered apps default to the enterprise mode');
set local role service_role;

select pg_temp.throws_sqlstate(format('select api.configure_facebook_login(%L,%L,%L,%L,%L,%L)',
  'b4091000-0000-4000-8000-000000000001',(select meta_application_id from pg_temp.app),'409111',
  'user_page','b4090000-0000-4000-8000-000000000003','b409-no-admin'),
  '42501','an admin cannot choose the organization login mode');
select pg_temp.throws_sqlstate(format('select api.configure_facebook_login(%L,%L,%L,%L,%L,%L)',
  'b4091000-0000-4000-8000-000000000002',(select meta_application_id from pg_temp.app),'409111',
  'user_page','b4090000-0000-4000-8000-000000000002','b409-cross-org'),
  '42501','another organization owner cannot reconfigure this app');
select pg_temp.throws_sqlstate(format('select api.configure_facebook_login(%L,%L,%L,%L,%L,%L)',
  'b4091000-0000-4000-8000-000000000001',(select meta_application_id from pg_temp.app),'409111',
  value,'b4090000-0000-4000-8000-000000000001','b409-invalid-mode'),
  '22023','invalid login mode is rejected: ' || coalesce(value,'null'))
from (values(null::text),('automatic'),('USER_PAGE'),(' user_page')) modes(value);
select api.configure_facebook_login('b4091000-0000-4000-8000-000000000001',
  (select meta_application_id from pg_temp.app),'409111','user_page',
  'b4090000-0000-4000-8000-000000000001','b409-configure-user');
reset role;
select extensions.is((select facebook_login_mode from app_private.meta_applications
  where id=(select meta_application_id from pg_temp.app)),'user_page','owner can configure user Page mode');
select extensions.is((select metadata_safe ->> 'login_mode' from app_private.audit_events
  where correlation_id='b409-configure-user'),'user_page','mode change is audited without credentials');
set local role service_role;
create temporary table pg_temp.started as select * from api.begin_facebook_page_oauth(
  'b4091000-0000-4000-8000-000000000001','b4090000-0000-4000-8000-000000000001',
  'b409-user-state-012345678901234567890123456','https://agentefer.example.test/admin/catalog/facebook/callback');
select api.configure_facebook_business_login('b4091000-0000-4000-8000-000000000001',
  (select meta_application_id from pg_temp.app),'409222',
  'b4090000-0000-4000-8000-000000000001','b409-legacy-wrapper');
create temporary table pg_temp.claimed as select * from api.claim_facebook_page_oauth_exchange(
  'b409-user-state-012345678901234567890123456','b4090000-0000-4000-8000-000000000001');
reset role;
select extensions.is((select login_mode from pg_temp.claimed),'user_page',
  'claim preserves the session mode after the application changes');
select extensions.is((select facebook_login_mode from app_private.meta_applications
  where id=(select meta_application_id from pg_temp.app)),'business_integration_system_user',
  'legacy configuration wrapper preserves enterprise behavior');
select extensions.is((select facebook_business_login_configuration_id from app_private.facebook_page_oauth_sessions
  where id=(select oauth_session_id from pg_temp.started)),'409111','session preserves original configuration id');

create temporary table pg_temp.payload as select
  '[{"id":"409101","name":"Page A","tasks":["CREATE_CONTENT"]},{"id":"409102","name":"Page B","tasks":["MANAGE"]}]'::jsonb as candidates,
  '{"token_type":"user_page","page_ids":["409101","409102"],"page_tokens":[{"id":"409101","access_token":"page-a-credential-test-b409"},{"id":"409102","access_token":"page-b-credential-test-b409"}]}'::jsonb as bundle;
grant select on pg_temp.payload to service_role;

select extensions.lives_ok(format('select app_private.validate_facebook_oauth_bundle(%L,%L,%L)',
  bundle,'user_page',candidates),'user Page bundle is valid') from pg_temp.payload;
select pg_temp.throws_sqlstate(format('select app_private.validate_facebook_oauth_bundle(%L,%L,%L)',
  bundle,'business_integration_system_user',candidates),'22023','session mode and token bundle must match') from pg_temp.payload;
select pg_temp.throws_sqlstate(
  $$select app_private.validate_facebook_oauth_bundle(
    '{"token_type":"user_page","page_ids":["409101"],"access_token":"valid-system-token-fixture"}',
    'business_integration_system_user','[{"id":"409101","name":"Page A","tasks":["CREATE_CONTENT"]}]')$$,
  '22023','system bundle with a mismatched mode tag is rejected independently of its fields');

create temporary table pg_temp.invalid_payloads (label text, bundle jsonb, candidates jsonb);
insert into pg_temp.invalid_payloads
select 'null bundle',null,candidates from pg_temp.payload union all
select 'unknown bundle mode',jsonb_set(bundle,'{token_type}','"automatic"'),candidates from pg_temp.payload union all
select 'personal token in page bundle',bundle || '{"access_token":"personal-token-forbidden"}',candidates from pg_temp.payload union all
select 'null page token',jsonb_set(bundle,'{page_tokens,0,access_token}','null'),candidates from pg_temp.payload union all
select 'numeric page token',jsonb_set(bundle,'{page_tokens,0,access_token}','99'),candidates from pg_temp.payload union all
select 'short page token',jsonb_set(bundle,'{page_tokens,0,access_token}','"short"'),candidates from pg_temp.payload union all
select 'unselected token',jsonb_set(bundle,'{page_tokens,0,id}','"409999"'),candidates from pg_temp.payload union all
select 'duplicate token',jsonb_set(bundle,'{page_tokens,1,id}','"409101"'),candidates from pg_temp.payload union all
select 'missing token',jsonb_set(bundle,'{page_tokens}',jsonb_build_array(bundle #> '{page_tokens,0}')),candidates from pg_temp.payload union all
select 'token object instead of array',jsonb_set(bundle,'{page_tokens}','{}'),candidates from pg_temp.payload union all
select 'extra credential field',jsonb_set(bundle,'{page_tokens,0}',(bundle #> '{page_tokens,0}') || '{"secret":"bad"}'),candidates from pg_temp.payload union all
select 'duplicate page ids',jsonb_set(bundle,'{page_ids,1}','"409101"'),candidates from pg_temp.payload union all
select 'numeric page id',jsonb_set(bundle,'{page_ids,0}','409101'),candidates from pg_temp.payload union all
select 'null candidate name',bundle,jsonb_set(candidates,'{0,name}','null') from pg_temp.payload union all
select 'secret in candidate',bundle,jsonb_set(candidates,'{0}',(candidates->0) || '{"access_token":"leak"}') from pg_temp.payload union all
select 'duplicate candidate',bundle,jsonb_set(candidates,'{1,id}','"409101"') from pg_temp.payload union all
select 'candidate without matching token',bundle,jsonb_set(candidates,'{0,id}','"409999"') from pg_temp.payload union all
select 'non-string task',bundle,jsonb_set(candidates,'{0,tasks}','[12]') from pg_temp.payload;
select pg_temp.throws_sqlstate(format('select app_private.validate_facebook_oauth_bundle(%L,%L,%L)',
  bundle,'user_page',candidates),'22023',label || ' fails closed') from pg_temp.invalid_payloads;

-- B4-009 credential persistence journey
set local role service_role;
select pg_temp.throws_sqlstate(format('select api.stage_facebook_page_oauth_pages(%L,%L,%L,%L,%L)',
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000001',
  null,candidates,bundle::text),
  '42501','a null exchange lease cannot stage Page credentials') from pg_temp.payload;
select pg_temp.throws_sqlstate(format('select api.stage_facebook_page_oauth_pages(%L,%L,%L,%L,%L)',
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000002',
  (select exchange_lease_token from pg_temp.claimed),candidates,bundle::text),
  '42501','another owner cannot stage these Page credentials') from pg_temp.payload;
select api.stage_facebook_page_oauth_pages(
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000001',
  (select exchange_lease_token from pg_temp.claimed),candidates,bundle::text) from pg_temp.payload;
select pg_temp.throws_sqlstate(format('select api.complete_facebook_page_oauth(%L,%L,%L)',
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000001','409999'),
  '42501','an unselected Page cannot consume any credential');
create temporary table pg_temp.completed as select * from api.complete_facebook_page_oauth(
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000001','409102');
select pg_temp.throws_sqlstate(format('select api.complete_facebook_page_oauth(%L,%L,%L)',
  (select oauth_session_id from pg_temp.claimed),'b4090000-0000-4000-8000-000000000001','409102'),
  '42501','completion replay cannot create duplicate credentials');
reset role;
select extensions.is((select decrypted.decrypted_secret
  from app_private.facebook_page_credentials c join vault.decrypted_secrets decrypted on decrypted.id=c.vault_secret_id
  where c.social_connection_id=(select social_connection_id from pg_temp.completed)),
  'page-b-credential-test-b409','only the selected Page B token is persisted');
select extensions.is((select c.organization_id::text from app_private.facebook_page_credentials c
  where c.social_connection_id=(select social_connection_id from pg_temp.completed)),
  'b4091000-0000-4000-8000-000000000001','Page credential remains in organization A');
select extensions.ok(not exists(select 1 from vault.decrypted_secrets
  where decrypted_secret like '%page-a-credential-test-b409%'),
  'unselected Page A credential is destroyed with the ephemeral bundle');
select extensions.is((select metadata_safe ->> 'token_type' from app_private.audit_events
  where event_type='facebook.page.connected' and organization_id='b4091000-0000-4000-8000-000000000001'),
  'user_page','connection audit records the session mode, not the changed app mode');
select * from extensions.finish();
rollback;
