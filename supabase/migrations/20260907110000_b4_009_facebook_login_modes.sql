begin;

alter table app_private.meta_applications
  add column facebook_login_mode text not null default 'business_integration_system_user'
  check (facebook_login_mode in ('business_integration_system_user', 'user_page'));
alter table app_private.facebook_page_oauth_sessions
  add column facebook_login_mode text not null default 'business_integration_system_user'
  check (facebook_login_mode in ('business_integration_system_user', 'user_page'));

create or replace view api.meta_applications
with (security_invoker = true, security_barrier = true) as
select id, organization_id, external_app_id, display_name, api_version, status,
  created_by_user_id, created_at, updated_at, disabled_at,
  facebook_business_login_configuration_id, facebook_login_mode
from app_private.meta_applications;
grant select (facebook_login_mode) on app_private.meta_applications to authenticated;

create or replace function api.configure_facebook_login(
  target_organization_id uuid,
  target_meta_application_id uuid,
  target_configuration_id text,
  target_login_mode text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_configuration_id text;
  previous_login_mode text;
begin
  perform app_private.assert_facebook_oauth_owner(
    target_organization_id,
    target_actor_user_id
  );

  if target_login_mode is null
    or target_login_mode not in ('business_integration_system_user', 'user_page')
    or target_configuration_id is null
    or target_configuration_id <> btrim(target_configuration_id)
    or char_length(target_configuration_id) not between 1 and 64
    or translate(target_configuration_id, '0123456789', '') <> ''
    or target_correlation_id is null
    or target_correlation_id <> btrim(target_correlation_id)
    or char_length(target_correlation_id) not between 1 and 200
    or target_trace_id is not null and (
      target_trace_id <> btrim(target_trace_id)
      or char_length(target_trace_id) not between 1 and 200
    ) then
    raise exception using
      errcode = '22023',
      message = 'Facebook Business Login configuration is invalid';
  end if;

  select application_value.facebook_business_login_configuration_id, application_value.facebook_login_mode
  into previous_configuration_id, previous_login_mode
  from app_private.meta_applications as application_value
  where application_value.organization_id = target_organization_id
    and application_value.id = target_meta_application_id
    and application_value.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Active Meta application was not found in the organization';
  end if;

  update app_private.meta_applications
  set facebook_business_login_configuration_id = target_configuration_id,
      facebook_login_mode = target_login_mode
  where organization_id = target_organization_id
    and id = target_meta_application_id;

  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    actor_user_id,
    correlation_id,
    trace_id,
    metadata_safe
  ) values (
    target_organization_id,
    'facebook.business_login.configured',
    'member',
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'meta_application_id', target_meta_application_id,
      'configuration_changed', previous_configuration_id is distinct from target_configuration_id,
      'login_mode', target_login_mode,
      'mode_changed', previous_login_mode is distinct from target_login_mode
    )
  );
end;
$$;

create or replace function api.configure_facebook_business_login(
  target_organization_id uuid, target_meta_application_id uuid, target_configuration_id text,
  target_actor_user_id uuid, target_correlation_id text, target_trace_id text default null
) returns void language sql security definer set search_path = '' as $$
  select api.configure_facebook_login(target_organization_id, target_meta_application_id,
    target_configuration_id, 'business_integration_system_user', target_actor_user_id,
    target_correlation_id, target_trace_id);
$$;

create or replace function api.begin_facebook_page_oauth(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_state text,
  target_redirect_uri text
)
returns table (
  oauth_session_id uuid,
  external_app_id text,
  api_version text,
  configuration_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_count integer;
  application_record app_private.meta_applications%rowtype;
  created_session_id uuid;
begin
  perform app_private.assert_facebook_oauth_owner(
    target_organization_id,
    target_actor_user_id
  );
  perform app_private.expire_facebook_page_oauth_sessions();

  if target_state is null
    or target_state <> btrim(target_state)
    or char_length(target_state) not between 32 and 128
    or target_redirect_uri is null
    or target_redirect_uri <> btrim(target_redirect_uri)
    or char_length(target_redirect_uri) not between 16 and 2048
    or not starts_with(target_redirect_uri, 'https://')
    or strpos(target_redirect_uri, '#') <> 0 then
    raise exception using errcode = '22023', message = 'Facebook OAuth request is invalid';
  end if;

  select count(*)::integer
  into application_count
  from app_private.meta_applications as application_value
  where application_value.organization_id = target_organization_id
    and application_value.status = 'active';

  if application_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'Facebook OAuth requires exactly one active Meta application';
  end if;

  select application_value.*
  into strict application_record
  from app_private.meta_applications as application_value
  where application_value.organization_id = target_organization_id
    and application_value.status = 'active';

  if application_record.facebook_business_login_configuration_id is null then
    raise exception using
      errcode = '55000',
      message = 'Facebook Business Login configuration is unavailable';
  end if;

  insert into app_private.facebook_page_oauth_sessions (
    organization_id,
    meta_application_id,
    actor_user_id,
    state_sha256,
    redirect_uri,
    facebook_business_login_configuration_id,
    facebook_login_mode,
    expires_at
  ) values (
    target_organization_id,
    application_record.id,
    target_actor_user_id,
    extensions.digest(convert_to(target_state, 'UTF8'), 'sha256'),
    target_redirect_uri,
    application_record.facebook_business_login_configuration_id,
    application_record.facebook_login_mode,
    statement_timestamp() + interval '10 minutes'
  )
  returning id into created_session_id;

  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    actor_user_id,
    correlation_id,
    metadata_safe
  ) values (
    target_organization_id,
    'facebook.oauth.started',
    'member',
    target_actor_user_id,
    created_session_id::text,
    jsonb_build_object(
      'oauth_session_id', created_session_id,
      'meta_application_id', application_record.id,
      'token_type', application_record.facebook_login_mode
    )
  );

  return query select
    created_session_id,
    application_record.external_app_id,
    application_record.api_version,
    application_record.facebook_business_login_configuration_id;
end;
$$;

drop function api.claim_facebook_page_oauth_exchange(text, uuid);
create or replace function api.claim_facebook_page_oauth_exchange(
  target_state text,
  target_actor_user_id uuid
)
returns table (
  oauth_session_id uuid,
  organization_id uuid,
  external_app_id text,
  api_version text,
  redirect_uri text,
  app_secret text,
  exchange_lease_token uuid,
  login_mode text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record app_private.facebook_page_oauth_sessions%rowtype;
  application_record app_private.meta_applications%rowtype;
  secret_value text;
  generated_lease_token uuid := extensions.gen_random_uuid();
begin
  if target_state is null
    or target_state <> btrim(target_state)
    or char_length(target_state) not between 32 and 128 then
    raise exception using errcode = '22023', message = 'Facebook OAuth state is invalid';
  end if;

  select session_value.*
  into session_record
  from app_private.facebook_page_oauth_sessions as session_value
  where session_value.state_sha256 = extensions.digest(convert_to(target_state, 'UTF8'), 'sha256')
    and session_value.actor_user_id = target_actor_user_id
  for update;

  if not found
    or session_record.status <> 'initiated'
    or session_record.expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'Facebook OAuth state is invalid or expired';
  end if;

  perform app_private.assert_facebook_oauth_owner(
    session_record.organization_id,
    target_actor_user_id
  );

  select application_value.*
  into strict application_record
  from app_private.meta_applications as application_value
  where application_value.organization_id = session_record.organization_id
    and application_value.id = session_record.meta_application_id
    and application_value.status = 'active';

  select decrypted.decrypted_secret
  into secret_value
  from app_private.meta_credential_versions as credential_value
  join vault.decrypted_secrets as decrypted
    on decrypted.id = credential_value.vault_secret_id
  where credential_value.organization_id = session_record.organization_id
    and credential_value.meta_application_id = session_record.meta_application_id
    and credential_value.webhook_endpoint_id is null
    and credential_value.channel_connection_id is null
    and credential_value.credential_kind = 'app_secret'
    and credential_value.status = 'current'
  order by credential_value.version_number desc
  limit 1;

  if secret_value is null then
    raise exception using errcode = '55000', message = 'Meta application secret is unavailable';
  end if;

  update app_private.facebook_page_oauth_sessions
  set status = 'exchanging',
      exchange_lease_token = generated_lease_token,
      exchange_lease_expires_at = statement_timestamp() + interval '2 minutes',
      updated_at = statement_timestamp()
  where id = session_record.id;

  return query select
    session_record.id,
    session_record.organization_id,
    application_record.external_app_id,
    application_record.api_version,
    session_record.redirect_uri,
    secret_value,
    generated_lease_token,
    session_record.facebook_login_mode;
end;
$$;

create function app_private.validate_facebook_oauth_bundle(
  bundle jsonb, expected_mode text, candidates jsonb
)
returns void language plpgsql immutable security invoker set search_path = '' as $$
declare
  candidate jsonb;
  credential jsonb;
  field_name text;
  expected_keys text[];
begin
  if expected_mode is null or expected_mode not in ('business_integration_system_user','user_page')
    or jsonb_typeof(bundle) is distinct from 'object'
    or bundle ->> 'token_type' is distinct from expected_mode
    or jsonb_typeof(candidates) is distinct from 'array'
    or jsonb_array_length(candidates) not between 1 and 100
    or jsonb_typeof(bundle -> 'page_ids') is distinct from 'array'
    or jsonb_array_length(bundle -> 'page_ids') <> jsonb_array_length(candidates) then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end if;
  expected_keys := case expected_mode when 'user_page' then array['token_type','page_ids','page_tokens']
    else array['token_type','page_ids','access_token'] end;
  if not (bundle ?& expected_keys) then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end if;
  for field_name in select jsonb_object_keys(bundle) loop
    if not field_name = any(expected_keys) then
      raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
    end if;
  end loop;
  if exists (select 1 from jsonb_array_elements(bundle -> 'page_ids') as p(value)
    where jsonb_typeof(p.value) is distinct from 'string'
      or char_length(p.value #>> '{}') not between 1 and 64
      or translate(p.value #>> '{}','0123456789','') <> '')
    or (select count(distinct value) from jsonb_array_elements(bundle -> 'page_ids'))
      <> jsonb_array_length(candidates) then
    raise exception using errcode = '22023', message = 'Facebook page identifiers are invalid';
  end if;
  for candidate in select value from jsonb_array_elements(candidates) loop
    if jsonb_typeof(candidate) is distinct from 'object'
      or not (candidate ?& array['id','name','tasks'])
      or jsonb_typeof(candidate -> 'id') is distinct from 'string'
      or jsonb_typeof(candidate -> 'name') is distinct from 'string'
      or char_length(btrim(candidate ->> 'name')) not between 1 and 160
      or not (bundle -> 'page_ids') ? (candidate ->> 'id')
      or jsonb_typeof(candidate -> 'tasks') is distinct from 'array'
      or jsonb_array_length(candidate -> 'tasks') > 100
      or exists (select 1 from jsonb_array_elements(candidate -> 'tasks') as task(value)
        where jsonb_typeof(task.value) is distinct from 'string') then
      raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
    end if;
    for field_name in select jsonb_object_keys(candidate) loop
      if field_name not in ('id','name','tasks') then
        raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
      end if;
    end loop;
  end loop;
  if (select count(distinct value ->> 'id') from jsonb_array_elements(candidates))
    <> jsonb_array_length(candidates) then
    raise exception using errcode = '22023', message = 'Facebook Page candidates are duplicated';
  end if;
  if expected_mode = 'user_page' then
    if jsonb_typeof(bundle -> 'page_tokens') is distinct from 'array'
      or jsonb_array_length(bundle -> 'page_tokens') <> jsonb_array_length(candidates) then
      raise exception using errcode = '22023', message = 'Facebook Page credentials are invalid';
    end if;
    for credential in select value from jsonb_array_elements(bundle -> 'page_tokens') loop
      if jsonb_typeof(credential) is distinct from 'object'
        or not (credential ?& array['id','access_token'])
        or jsonb_typeof(credential -> 'id') is distinct from 'string'
        or not (bundle -> 'page_ids') ? (credential ->> 'id')
        or jsonb_typeof(credential -> 'access_token') is distinct from 'string'
        or char_length(credential ->> 'access_token') not between 16 and 65536 then
        raise exception using errcode = '22023', message = 'Facebook Page credential is invalid';
      end if;
      for field_name in select jsonb_object_keys(credential) loop
        if field_name not in ('id','access_token') then
          raise exception using errcode = '22023', message = 'Facebook Page credential is invalid';
        end if;
      end loop;
    end loop;
    if (select count(distinct value ->> 'id') from jsonb_array_elements(bundle -> 'page_tokens'))
      <> jsonb_array_length(candidates) then
      raise exception using errcode = '22023', message = 'Facebook Page credentials are duplicated';
    end if;
  elsif jsonb_typeof(bundle -> 'access_token') is distinct from 'string'
    or char_length(bundle ->> 'access_token') not between 16 and 65536 then
    raise exception using errcode = '22023', message = 'Facebook system credential is invalid';
  end if;
end;
$$;


create or replace function api.stage_facebook_page_oauth_pages(
  target_oauth_session_id uuid,
  target_actor_user_id uuid,
  target_exchange_lease_token uuid,
  target_page_candidates jsonb,
  target_token_bundle text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record app_private.facebook_page_oauth_sessions%rowtype;
  token_bundle jsonb;
  created_secret_id uuid;
begin
  select session_value.*
  into session_record
  from app_private.facebook_page_oauth_sessions as session_value
  where session_value.id = target_oauth_session_id
    and session_value.actor_user_id = target_actor_user_id
  for update;

  if not found
    or session_record.status <> 'exchanging'
    or session_record.exchange_lease_token is distinct from target_exchange_lease_token
    or session_record.exchange_lease_expires_at <= statement_timestamp()
    or session_record.expires_at <= statement_timestamp()
    or session_record.facebook_business_login_configuration_id is null then
    raise exception using errcode = '42501', message = 'Facebook OAuth exchange lease is invalid';
  end if;

  perform app_private.assert_facebook_oauth_owner(
    session_record.organization_id,
    target_actor_user_id
  );

  if target_page_candidates is null
    or jsonb_typeof(target_page_candidates) <> 'array'
    or jsonb_array_length(target_page_candidates) not between 1 and 100
    or octet_length(target_page_candidates::text) > 65536
    or target_token_bundle is null
    or octet_length(target_token_bundle) not between 16 and 262144 then
    raise exception using errcode = '22023', message = 'Facebook Page candidates are invalid';
  end if;

  begin
    token_bundle := target_token_bundle::jsonb;
  exception when others then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end;

  perform app_private.validate_facebook_oauth_bundle(
    token_bundle, session_record.facebook_login_mode, target_page_candidates
  );

  created_secret_id := vault.create_secret(
    target_token_bundle,
    concat_ws('/', 'agentefer', 'facebook-oauth', session_record.organization_id, session_record.id),
    'AgenteFer ephemeral Facebook Business Login token bundle',
    null
  );

  update app_private.facebook_page_oauth_sessions
  set status = 'pages_ready',
      exchange_lease_token = null,
      exchange_lease_expires_at = null,
      page_candidates = target_page_candidates,
      token_bundle_vault_secret_id = created_secret_id,
      expires_at = least(expires_at, statement_timestamp() + interval '10 minutes'),
      updated_at = statement_timestamp()
  where id = session_record.id;
end;
$$;

create or replace function api.complete_facebook_page_oauth(
  target_oauth_session_id uuid,
  target_actor_user_id uuid,
  target_page_id text
)
returns table (
  social_connection_id uuid,
  page_name text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record app_private.facebook_page_oauth_sessions%rowtype;
  application_record app_private.meta_applications%rowtype;
  candidate_value jsonb;
  token_bundle jsonb;
  page_access_token text;
  page_credential_id uuid;
  page_vault_secret_id uuid;
  created_connection_id uuid;
  publish_capability boolean;
  bundle_secret_id uuid;
begin
  select session_value.*
  into session_record
  from app_private.facebook_page_oauth_sessions as session_value
  where session_value.id = target_oauth_session_id
    and session_value.actor_user_id = target_actor_user_id
  for update;

  if not found
    or session_record.status <> 'pages_ready'
    or session_record.expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'Facebook Page selection is invalid or expired';
  end if;

  perform app_private.assert_facebook_oauth_owner(
    session_record.organization_id,
    target_actor_user_id
  );

  if target_page_id is null
    or char_length(target_page_id) not between 1 and 64
    or translate(target_page_id, '0123456789', '') <> '' then
    raise exception using errcode = '22023', message = 'Facebook Page identifier is invalid';
  end if;

  select value
  into candidate_value
  from jsonb_array_elements(session_record.page_candidates)
  where value ->> 'id' = target_page_id;

  if candidate_value is null then
    raise exception using errcode = '42501', message = 'Facebook Page was not authorized';
  end if;

  publish_capability := (candidate_value -> 'tasks') ?| array[
    'CREATE_CONTENT',
    'MANAGE',
    'PROFILE_PLUS_CREATE_CONTENT',
    'PROFILE_PLUS_FULL_CONTROL',
    'PROFILE_PLUS_MANAGE'
  ];
  if not publish_capability then
    raise exception using errcode = '42501', message = 'Facebook Page cannot create content';
  end if;

  select application_value.*
  into strict application_record
  from app_private.meta_applications as application_value
  where application_value.organization_id = session_record.organization_id
    and application_value.id = session_record.meta_application_id
    and application_value.status = 'active';

  select decrypted.decrypted_secret::jsonb
  into token_bundle
  from vault.decrypted_secrets as decrypted
  where decrypted.id = session_record.token_bundle_vault_secret_id;

  perform app_private.validate_facebook_oauth_bundle(
    token_bundle, session_record.facebook_login_mode, session_record.page_candidates
  );
  if session_record.facebook_login_mode = 'user_page' then
    select value ->> 'access_token' into strict page_access_token
    from jsonb_array_elements(token_bundle -> 'page_tokens')
    where value ->> 'id' = target_page_id;
  else
    page_access_token := token_bundle ->> 'access_token';
  end if;
  if page_access_token is null or char_length(page_access_token) not between 16 and 65536 then
    raise exception using errcode = '55000', message = 'Facebook Page credential is unavailable';
  end if;

  select result.social_connection_id
  into created_connection_id
  from api.register_social_connection(
    session_record.organization_id,
    'facebook-oauth-register-' || session_record.id::text,
    'pending_verification',
    application_record.external_app_id,
    target_page_id,
    btrim(candidate_value ->> 'name'),
    application_record.api_version,
    null,
    null,
    null,
    null,
    target_actor_user_id
  ) as result;

  page_vault_secret_id := vault.create_secret(
    page_access_token,
    concat_ws(
      '/',
      'agentefer',
      'meta',
      session_record.organization_id,
      session_record.meta_application_id,
      'facebook-page',
      created_connection_id,
      'v1'
    ),
    'AgenteFer tenant-scoped Facebook Page publication credential',
    null
  );

  insert into app_private.facebook_page_credentials (
    organization_id,
    meta_application_id,
    social_connection_id,
    vault_secret_id,
    created_by_user_id
  ) values (
    session_record.organization_id,
    session_record.meta_application_id,
    created_connection_id,
    page_vault_secret_id,
    target_actor_user_id
  )
  returning id into page_credential_id;

  perform api.transition_social_connection(
    session_record.organization_id,
    created_connection_id,
    'facebook-oauth-activate-' || session_record.id::text,
    'active',
    'facebook_oauth_verified',
    application_record.external_app_id,
    target_page_id,
    btrim(candidate_value ->> 'name'),
    application_record.api_version,
    'facebook-page-credential://' || page_credential_id::text,
    null,
    statement_timestamp(),
    statement_timestamp(),
    target_actor_user_id
  );

  perform api.observe_social_capability(
    session_record.organization_id,
    'facebook-oauth-capability-' || session_record.id::text,
    created_connection_id,
    'page.post.create',
    'granted',
    'provider_probe',
    jsonb_build_object(
      'dispatch_policy', jsonb_build_object(
        'minimum_spacing_seconds', 3600,
        'max_attempts', 5,
        'priority', 100
      )
    ),
    jsonb_build_object(
      'provider', 'meta',
      'page_id', target_page_id,
      'tasks', candidate_value -> 'tasks',
      'token_type', session_record.facebook_login_mode
    ),
    statement_timestamp(),
    null,
    target_actor_user_id
  );

  bundle_secret_id := session_record.token_bundle_vault_secret_id;
  update app_private.facebook_page_oauth_sessions
  set status = 'completed',
      token_bundle_vault_secret_id = null,
      completed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where id = session_record.id;

  delete from vault.secrets where id = bundle_secret_id;

  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    actor_user_id,
    correlation_id,
    metadata_safe
  ) values (
    session_record.organization_id,
    'facebook.page.connected',
    'member',
    target_actor_user_id,
    session_record.id::text,
    jsonb_build_object(
      'oauth_session_id', session_record.id,
      'social_connection_id', created_connection_id,
      'meta_application_id', session_record.meta_application_id,
      'page_id', target_page_id,
      'token_type', session_record.facebook_login_mode
    )
  );

  return query select created_connection_id, btrim(candidate_value ->> 'name');
end;
$$;

revoke all on function api.configure_facebook_login(uuid,uuid,text,text,uuid,text,text)
  from public, anon, authenticated, service_role;
grant execute on function api.configure_facebook_login(uuid,uuid,text,text,uuid,text,text)
  to service_role;
revoke all on function api.claim_facebook_page_oauth_exchange(text,uuid)
  from public, anon, authenticated, service_role;
grant execute on function api.claim_facebook_page_oauth_exchange(text,uuid) to service_role;
revoke all on function app_private.validate_facebook_oauth_bundle(jsonb,text,jsonb)
  from public, anon, authenticated, service_role;

comment on column app_private.meta_applications.facebook_login_mode is
  'Explicit server-side login strategy, configured atomically with the Meta configuration ID';
comment on column app_private.facebook_page_oauth_sessions.facebook_login_mode is
  'OAuth session snapshot; a configuration change must not switch an in-flight exchange';
commit;
