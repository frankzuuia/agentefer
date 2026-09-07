begin;

alter table app_private.meta_applications
  add column facebook_business_login_configuration_id text;

alter table app_private.meta_applications
  add constraint meta_applications_facebook_business_login_configuration_valid check (
    facebook_business_login_configuration_id is null
    or (
      facebook_business_login_configuration_id = btrim(facebook_business_login_configuration_id)
      and char_length(facebook_business_login_configuration_id) between 1 and 64
      and translate(facebook_business_login_configuration_id, '0123456789', '') = ''
    )
  );

alter table app_private.facebook_page_oauth_sessions
  add column facebook_business_login_configuration_id text;

alter table app_private.facebook_page_oauth_sessions
  add constraint facebook_page_oauth_sessions_configuration_valid check (
    facebook_business_login_configuration_id is null
    or (
      facebook_business_login_configuration_id = btrim(facebook_business_login_configuration_id)
      and char_length(facebook_business_login_configuration_id) between 1 and 64
      and translate(facebook_business_login_configuration_id, '0123456789', '') = ''
    )
  );

create or replace view api.meta_applications
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  external_app_id,
  display_name,
  api_version,
  status,
  created_by_user_id,
  created_at,
  updated_at,
  disabled_at,
  facebook_business_login_configuration_id
from app_private.meta_applications;

create function api.configure_facebook_business_login(
  target_organization_id uuid,
  target_meta_application_id uuid,
  target_configuration_id text,
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
begin
  perform app_private.assert_facebook_oauth_owner(
    target_organization_id,
    target_actor_user_id
  );

  if target_configuration_id is null
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

  select application_value.facebook_business_login_configuration_id
  into previous_configuration_id
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
  set facebook_business_login_configuration_id = target_configuration_id
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
      'configuration_changed', previous_configuration_id is distinct from target_configuration_id
    )
  );
end;
$$;

drop function api.begin_facebook_page_oauth(uuid, uuid, text, text);

create function api.begin_facebook_page_oauth(
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
    expires_at
  ) values (
    target_organization_id,
    application_record.id,
    target_actor_user_id,
    extensions.digest(convert_to(target_state, 'UTF8'), 'sha256'),
    target_redirect_uri,
    application_record.facebook_business_login_configuration_id,
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
      'token_type', 'business_integration_system_user'
    )
  );

  return query select
    created_session_id,
    application_record.external_app_id,
    application_record.api_version,
    application_record.facebook_business_login_configuration_id;
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
  candidate_value jsonb;
  candidate_key text;
  token_bundle jsonb;
  bundle_key text;
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
    or session_record.exchange_lease_token <> target_exchange_lease_token
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

  if jsonb_typeof(token_bundle) <> 'object'
    or not (token_bundle ?& array['token_type', 'access_token', 'page_ids'])
    or token_bundle ->> 'token_type' <> 'business_integration_system_user'
    or char_length(token_bundle ->> 'access_token') not between 16 and 65536
    or jsonb_typeof(token_bundle -> 'page_ids') <> 'array'
    or jsonb_array_length(token_bundle -> 'page_ids') <> jsonb_array_length(target_page_candidates)
    or exists (
      select 1
      from jsonb_array_elements(token_bundle -> 'page_ids') as page_id(value)
      where jsonb_typeof(page_id.value) <> 'string'
        or char_length(page_id.value #>> '{}') not between 1 and 64
        or translate(page_id.value #>> '{}', '0123456789', '') <> ''
    ) then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end if;

  for bundle_key in select jsonb_object_keys(token_bundle)
  loop
    if bundle_key not in ('token_type', 'access_token', 'page_ids') then
      raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
    end if;
  end loop;

  for candidate_value in select value from jsonb_array_elements(target_page_candidates)
  loop
    if jsonb_typeof(candidate_value) <> 'object'
      or not (candidate_value ?& array['id', 'name', 'tasks'])
      or jsonb_typeof(candidate_value -> 'tasks') <> 'array'
      or char_length(candidate_value ->> 'id') not between 1 and 64
      or translate(candidate_value ->> 'id', '0123456789', '') <> ''
      or char_length(btrim(candidate_value ->> 'name')) not between 1 and 160
      or jsonb_array_length(candidate_value -> 'tasks') > 100
      or not (token_bundle -> 'page_ids') ? (candidate_value ->> 'id') then
      raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
    end if;
    for candidate_key in select jsonb_object_keys(candidate_value)
    loop
      if candidate_key not in ('id', 'name', 'tasks') then
        raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
      end if;
    end loop;
  end loop;

  if exists (
    select 1
    from jsonb_array_elements_text(token_bundle -> 'page_ids') as page_id(value)
    where not exists (
      select 1
      from jsonb_array_elements(target_page_candidates) as candidate(value)
      where candidate.value ->> 'id' = page_id.value
    )
  ) then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end if;

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

  if jsonb_typeof(token_bundle) <> 'object'
    or token_bundle ->> 'token_type' <> 'business_integration_system_user'
    or not (token_bundle -> 'page_ids') ? target_page_id then
    raise exception using errcode = '55000', message = 'Facebook Page credential is unavailable';
  end if;

  page_access_token := token_bundle ->> 'access_token';
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
    'AgenteFer tenant-scoped Facebook Business Integration System User token',
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
      'token_type', 'business_integration_system_user'
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
      'token_type', 'business_integration_system_user'
    )
  );

  return query select created_connection_id, btrim(candidate_value ->> 'name');
end;
$$;

revoke all on function api.configure_facebook_business_login(
  uuid, uuid, text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.begin_facebook_page_oauth(uuid, uuid, text, text)
from public, anon, authenticated, service_role;

grant execute on function api.configure_facebook_business_login(
  uuid, uuid, text, uuid, text, text
) to service_role;
grant execute on function api.begin_facebook_page_oauth(uuid, uuid, text, text)
to service_role;

comment on column app_private.meta_applications.facebook_business_login_configuration_id is
  'Non-secret Meta Facebook Login for Business configuration identifier';
comment on column app_private.facebook_page_oauth_sessions.facebook_business_login_configuration_id is
  'Immutable OAuth-session snapshot of the Meta Business Login configuration identifier';
comment on function api.configure_facebook_business_login(uuid, uuid, text, uuid, text, text) is
  'Owner-only audited registration of the Meta Facebook Login for Business configuration';
comment on function api.begin_facebook_page_oauth(uuid, uuid, text, text) is
  'Starts owner-only Facebook Business Login using the application configuration snapshot';

commit;
