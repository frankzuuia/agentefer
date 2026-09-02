begin;

create table app_private.facebook_page_credentials (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  meta_application_id uuid not null,
  social_connection_id uuid not null,
  version_number integer not null default 1,
  vault_secret_id uuid not null,
  status text not null default 'current',
  activated_at timestamptz not null default statement_timestamp(),
  token_expires_at timestamptz,
  data_access_expires_at timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  constraint facebook_page_credentials_scope_id_unique
    unique (organization_id, id),
  constraint facebook_page_credentials_application_fk
    foreign key (organization_id, meta_application_id)
    references app_private.meta_applications (organization_id, id)
    on delete restrict,
  constraint facebook_page_credentials_connection_fk
    foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id)
    on delete restrict,
  constraint facebook_page_credentials_vault_secret_fk
    foreign key (vault_secret_id)
    references vault.secrets (id)
    on delete restrict,
  constraint facebook_page_credentials_actor_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint facebook_page_credentials_version_valid check (version_number > 0),
  constraint facebook_page_credentials_status_valid check (
    status in ('current', 'revoked')
  ),
  constraint facebook_page_credentials_lifecycle_valid check (
    (status = 'current' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and revoked_at >= activated_at)
  ),
  constraint facebook_page_credentials_expiration_valid check (
    (token_expires_at is null or token_expires_at > activated_at)
    and (data_access_expires_at is null or data_access_expires_at > activated_at)
  )
);

create unique index facebook_page_credentials_current_unique
  on app_private.facebook_page_credentials (organization_id, social_connection_id)
  where status = 'current';

create unique index facebook_page_credentials_version_unique
  on app_private.facebook_page_credentials (
    organization_id,
    social_connection_id,
    version_number
  );

create index facebook_page_credentials_resolve_idx
  on app_private.facebook_page_credentials (
    organization_id,
    social_connection_id,
    status,
    version_number desc
  );

create table app_private.facebook_page_oauth_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  meta_application_id uuid not null,
  actor_user_id uuid not null,
  state_sha256 bytea not null,
  redirect_uri text not null,
  status text not null default 'initiated',
  exchange_lease_token uuid,
  exchange_lease_expires_at timestamptz,
  page_candidates jsonb not null default '[]'::jsonb,
  token_bundle_vault_secret_id uuid,
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint facebook_page_oauth_sessions_scope_id_unique
    unique (organization_id, id),
  constraint facebook_page_oauth_sessions_state_unique unique (state_sha256),
  constraint facebook_page_oauth_sessions_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint facebook_page_oauth_sessions_application_fk
    foreign key (organization_id, meta_application_id)
    references app_private.meta_applications (organization_id, id)
    on delete restrict,
  constraint facebook_page_oauth_sessions_actor_fk
    foreign key (actor_user_id)
    references auth.users (id)
    on delete restrict,
  constraint facebook_page_oauth_sessions_bundle_fk
    foreign key (token_bundle_vault_secret_id)
    references vault.secrets (id)
    on delete restrict,
  constraint facebook_page_oauth_sessions_state_valid check (
    octet_length(state_sha256) = 32
  ),
  constraint facebook_page_oauth_sessions_redirect_valid check (
    redirect_uri = btrim(redirect_uri)
    and char_length(redirect_uri) between 16 and 2048
    and starts_with(redirect_uri, 'https://')
    and strpos(redirect_uri, '#') = 0
  ),
  constraint facebook_page_oauth_sessions_status_valid check (
    status in ('initiated', 'exchanging', 'pages_ready', 'completed', 'failed', 'expired')
  ),
  constraint facebook_page_oauth_sessions_candidates_valid check (
    jsonb_typeof(page_candidates) = 'array'
    and jsonb_array_length(page_candidates) <= 100
    and octet_length(page_candidates::text) <= 65536
  ),
  constraint facebook_page_oauth_sessions_lease_valid check (
    (status = 'exchanging'
      and exchange_lease_token is not null
      and exchange_lease_expires_at is not null)
    or (status <> 'exchanging'
      and exchange_lease_token is null
      and exchange_lease_expires_at is null)
  ),
  constraint facebook_page_oauth_sessions_bundle_valid check (
    (status = 'pages_ready'
      and token_bundle_vault_secret_id is not null
      and jsonb_array_length(page_candidates) > 0)
    or (status <> 'pages_ready' and token_bundle_vault_secret_id is null)
  ),
  constraint facebook_page_oauth_sessions_completion_valid check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  constraint facebook_page_oauth_sessions_expiration_valid check (
    expires_at > created_at
    and expires_at <= created_at + interval '30 minutes'
  )
);

create index facebook_page_oauth_sessions_actor_idx
  on app_private.facebook_page_oauth_sessions (
    organization_id,
    actor_user_id,
    status,
    expires_at
  );

create function app_private.assert_facebook_oauth_owner(
  target_organization_id uuid,
  target_actor_user_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if target_actor_user_id is null or not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_actor_user_id
      and membership.status = 'active'
      and membership.role = 'owner'
  ) then
    raise exception using
      errcode = '42501',
      message = 'An active organization owner is required for Facebook OAuth';
  end if;
end;
$$;

create function app_private.expire_facebook_page_oauth_sessions()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_session record;
  expired_count integer := 0;
begin
  for expired_session in
    select session_value.id, session_value.token_bundle_vault_secret_id
    from app_private.facebook_page_oauth_sessions as session_value
    where session_value.status in ('initiated', 'exchanging', 'pages_ready')
      and session_value.expires_at <= statement_timestamp()
    for update skip locked
  loop
    update app_private.facebook_page_oauth_sessions
    set status = 'expired',
        exchange_lease_token = null,
        exchange_lease_expires_at = null,
        token_bundle_vault_secret_id = null,
        updated_at = statement_timestamp()
    where id = expired_session.id;

    if expired_session.token_bundle_vault_secret_id is not null then
      delete from vault.secrets
      where id = expired_session.token_bundle_vault_secret_id;
    end if;
    expired_count := expired_count + 1;
  end loop;

  return expired_count;
end;
$$;

create function api.begin_facebook_page_oauth(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_state text,
  target_redirect_uri text
)
returns table (
  oauth_session_id uuid,
  external_app_id text,
  api_version text
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

  insert into app_private.facebook_page_oauth_sessions (
    organization_id,
    meta_application_id,
    actor_user_id,
    state_sha256,
    redirect_uri,
    expires_at
  ) values (
    target_organization_id,
    application_record.id,
    target_actor_user_id,
    extensions.digest(convert_to(target_state, 'UTF8'), 'sha256'),
    target_redirect_uri,
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
      'meta_application_id', application_record.id
    )
  );

  return query
  select created_session_id, application_record.external_app_id, application_record.api_version;
end;
$$;

create function api.claim_facebook_page_oauth_exchange(
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
  exchange_lease_token uuid
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
    generated_lease_token;
end;
$$;

create function api.stage_facebook_page_oauth_pages(
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
  token_value jsonb;
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
    or session_record.expires_at <= statement_timestamp() then
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

  if jsonb_typeof(token_bundle) <> 'array'
    or jsonb_array_length(token_bundle) <> jsonb_array_length(target_page_candidates) then
    raise exception using errcode = '22023', message = 'Facebook token bundle is invalid';
  end if;

  for candidate_value in select value from jsonb_array_elements(target_page_candidates)
  loop
    if jsonb_typeof(candidate_value) <> 'object'
      or not (candidate_value ?& array['id', 'name', 'tasks'])
      or jsonb_typeof(candidate_value -> 'tasks') <> 'array'
      or char_length(candidate_value ->> 'id') not between 1 and 64
      or translate(candidate_value ->> 'id', '0123456789', '') <> ''
      or char_length(btrim(candidate_value ->> 'name')) not between 1 and 160
      or jsonb_array_length(candidate_value -> 'tasks') > 100 then
      raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
    end if;
    for candidate_key in select jsonb_object_keys(candidate_value)
    loop
      if candidate_key not in ('id', 'name', 'tasks') then
        raise exception using errcode = '22023', message = 'Facebook Page candidate is invalid';
      end if;
    end loop;

    select value
    into token_value
    from jsonb_array_elements(token_bundle)
    where value ->> 'id' = candidate_value ->> 'id';
    if token_value is null
      or jsonb_typeof(token_value) <> 'object'
      or not (token_value ?& array['id', 'access_token'])
      or char_length(token_value ->> 'access_token') not between 16 and 65536 then
      raise exception using errcode = '22023', message = 'Facebook Page token is invalid';
    end if;
  end loop;

  created_secret_id := vault.create_secret(
    target_token_bundle,
    concat_ws('/', 'agentefer', 'facebook-oauth', session_record.organization_id, session_record.id),
    'AgenteFer ephemeral Facebook Page OAuth token bundle',
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

create function api.fail_facebook_page_oauth(
  target_oauth_session_id uuid,
  target_actor_user_id uuid,
  target_exchange_lease_token uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  session_record app_private.facebook_page_oauth_sessions%rowtype;
begin
  select session_value.*
  into session_record
  from app_private.facebook_page_oauth_sessions as session_value
  where session_value.id = target_oauth_session_id
    and session_value.actor_user_id = target_actor_user_id
  for update;

  if not found
    or session_record.status <> 'exchanging'
    or session_record.exchange_lease_token <> target_exchange_lease_token then
    return;
  end if;

  update app_private.facebook_page_oauth_sessions
  set status = 'failed',
      exchange_lease_token = null,
      exchange_lease_expires_at = null,
      updated_at = statement_timestamp()
  where id = session_record.id;
end;
$$;

create function api.complete_facebook_page_oauth(
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

  select value ->> 'access_token'
  into page_access_token
  from jsonb_array_elements(token_bundle)
  where value ->> 'id' = target_page_id;

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
    'AgenteFer tenant-scoped Facebook Page access token',
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
      'tasks', candidate_value -> 'tasks'
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
      'page_id', target_page_id
    )
  );

  return query select created_connection_id, btrim(candidate_value ->> 'name');
end;
$$;

create or replace function api.claim_facebook_publication_job(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_organization_id uuid default null,
  target_now timestamptz default statement_timestamp()
)
returns table (
  publication_job_id uuid,
  organization_id uuid,
  publication_batch_id uuid,
  publication_id uuid,
  publication_version_id uuid,
  operation text,
  external_effect_key text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer,
  max_attempts integer,
  page_id text,
  api_version text,
  access_token text,
  headline text,
  body text,
  call_to_action text,
  content_payload jsonb,
  pricing_status text,
  price_amount numeric,
  currency_code text,
  media jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.publication_jobs%rowtype;
  publication_record app_private.publications%rowtype;
  version_record app_private.publication_versions%rowtype;
  connection_record app_private.social_connections%rowtype;
  generated_lease_token uuid;
  spacing_seconds numeric := 0;
  credential_value text;
  media_value jsonb;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'publication worker identifier is invalid';
  end if;
  if target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'publication job lease must be between 15 and 900 seconds';
  end if;

  select job_value.*
  into job_record
  from app_private.publication_jobs as job_value
  join app_private.publications as publication_value
    on publication_value.organization_id = job_value.organization_id
   and publication_value.id = job_value.publication_id
  join app_private.social_publication_dispatch_states as dispatch_value
    on dispatch_value.organization_id = publication_value.organization_id
   and dispatch_value.social_connection_id = publication_value.social_connection_id
  left join app_private.publication_batches as batch_value
    on batch_value.organization_id = job_value.organization_id
   and batch_value.id = job_value.batch_id
  join lateral (
    select capability_row.capability_constraints
    from app_private.social_capabilities as capability_row
    where capability_row.organization_id = publication_value.organization_id
      and capability_row.social_connection_id = publication_value.social_connection_id
      and capability_row.capability_code = job_value.capability_code
      and capability_row.status = 'granted'
      and (
        capability_row.valid_until is null
        or capability_row.valid_until > target_now
      )
    order by capability_row.observed_at desc, capability_row.created_at desc, capability_row.id desc
    limit 1
  ) as capability_value on true
  where job_value.status in ('pending', 'retryable')
    and job_value.operation in ('publish', 'refresh')
    and job_value.available_at <= target_now
    and job_value.attempt_count < job_value.max_attempts
    and (target_organization_id is null or job_value.organization_id = target_organization_id)
    and dispatch_value.next_dispatch_at <= target_now
    and (
      (
        batch_value.id is null
        and jsonb_typeof(
          capability_value.capability_constraints #> '{dispatch_policy,minimum_spacing_seconds}'
        ) = 'number'
        and (
          capability_value.capability_constraints #>> '{dispatch_policy,minimum_spacing_seconds}'
        )::numeric > 0
      )
      or (
        batch_value.status not in ('paused', 'cancelling', 'completed', 'partially_failed', 'cancelled')
        and jsonb_typeof(batch_value.policy_snapshot -> 'minimum_spacing_seconds') = 'number'
        and (batch_value.policy_snapshot ->> 'minimum_spacing_seconds')::numeric > 0
      )
    )
  order by job_value.priority, job_value.available_at, job_value.created_at, job_value.id
  for update of job_value, dispatch_value skip locked
  limit 1;

  if not found then
    return;
  end if;

  select publication_value.*
  into strict publication_record
  from app_private.publications as publication_value
  where publication_value.organization_id = job_record.organization_id
    and publication_value.id = job_record.publication_id;

  if job_record.batch_id is not null then
    select (batch_value.policy_snapshot ->> 'minimum_spacing_seconds')::numeric
    into spacing_seconds
    from app_private.publication_batches as batch_value
    where batch_value.organization_id = job_record.organization_id
      and batch_value.id = job_record.batch_id;
  else
    select (
      capability_value.capability_constraints #>> '{dispatch_policy,minimum_spacing_seconds}'
    )::numeric
    into spacing_seconds
    from app_private.social_capabilities as capability_value
    where capability_value.organization_id = job_record.organization_id
      and capability_value.social_connection_id = publication_record.social_connection_id
      and capability_value.capability_code = job_record.capability_code
      and capability_value.status = 'granted'
      and (
        capability_value.valid_until is null
        or capability_value.valid_until > target_now
      )
    order by capability_value.observed_at desc, capability_value.created_at desc, capability_value.id desc
    limit 1;
  end if;

  generated_lease_token := extensions.gen_random_uuid();

  update app_private.publication_jobs as claimed_job
  set status = 'processing',
      attempt_count = claimed_job.attempt_count + 1,
      lease_token = generated_lease_token,
      processing_started_at = target_now,
      lease_expires_at = target_now + make_interval(secs => target_lease_seconds),
      authorized_at = null,
      authorization_snapshot = null,
      effect_started_at = null,
      provider_request_id = null,
      last_error_class = null,
      last_error_code = null,
      last_error_summary = null
  where claimed_job.organization_id = job_record.organization_id
    and claimed_job.id = job_record.id;

  update app_private.social_publication_dispatch_states
  set next_dispatch_at = target_now + make_interval(secs => spacing_seconds::double precision),
      last_publication_job_id = job_record.id
  where app_private.social_publication_dispatch_states.organization_id = job_record.organization_id
    and app_private.social_publication_dispatch_states.social_connection_id = publication_record.social_connection_id;

  if job_record.batch_id is not null then
    update app_private.publication_batches
    set status = 'running'
    where app_private.publication_batches.organization_id = job_record.organization_id
      and app_private.publication_batches.id = job_record.batch_id
      and app_private.publication_batches.status in ('pending', 'queued');
  end if;

  select version_value.*
  into version_record
  from app_private.publication_versions as version_value
  where version_value.organization_id = job_record.organization_id
    and version_value.publication_id = job_record.publication_id
    and version_value.id = job_record.target_version_id;

  select connection_value.*
  into connection_record
  from app_private.social_connections as connection_value
  where connection_value.organization_id = job_record.organization_id
    and connection_value.id = publication_record.social_connection_id;

  select resolved_credential.decrypted_secret
  into credential_value
  from (
    select
      decrypted.decrypted_secret,
      0 as preference,
      credential_record.version_number
    from app_private.facebook_page_credentials as credential_record
    join vault.decrypted_secrets as decrypted
      on decrypted.id = credential_record.vault_secret_id
    where credential_record.organization_id = job_record.organization_id
      and credential_record.social_connection_id = publication_record.social_connection_id
      and credential_record.status = 'current'
      and connection_record.credential_reference =
        'facebook-page-credential://' || credential_record.id::text
    union all
    select
      decrypted.decrypted_secret,
      1 as preference,
      credential_record.version_number
    from app_private.meta_applications as application_value
    join app_private.meta_credential_versions as credential_record
      on credential_record.organization_id = application_value.organization_id
     and credential_record.meta_application_id = application_value.id
    join vault.decrypted_secrets as decrypted
      on decrypted.id = credential_record.vault_secret_id
    where application_value.organization_id = job_record.organization_id
      and application_value.external_app_id = connection_record.external_app_id
      and credential_record.credential_kind = 'system_user_access_token'
      and credential_record.status = 'current'
      and connection_record.credential_reference =
        'meta-credential-version://' || credential_record.id::text
  ) as resolved_credential
  order by resolved_credential.preference, resolved_credential.version_number desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'media_asset_id', publication_media_value.media_asset_id,
      'media_role', publication_media_value.media_role,
      'ordinal', publication_media_value.ordinal,
      'bucket_id', object_value.bucket_id,
      'object_path', object_value.object_path,
      'mime_type', object_value.mime_type,
      'byte_size', object_value.byte_size
    ) order by
      case publication_media_value.media_role when 'primary' then 0 else 1 end,
      publication_media_value.ordinal,
      publication_media_value.id
  ), '[]'::jsonb)
  into media_value
  from app_private.publication_media as publication_media_value
  join app_private.media_asset_objects as object_value
    on object_value.organization_id = publication_media_value.organization_id
   and object_value.media_asset_id = publication_media_value.media_asset_id
   and object_value.rendition_kind = 'storefront_webp'
   and object_value.status = 'published'
  where publication_media_value.organization_id = job_record.organization_id
    and publication_media_value.publication_version_id = job_record.target_version_id;

  perform app_private.insert_publication_event(
    job_record.organization_id,
    null,
    'publication_job',
    job_record.id,
    'publication_job.claimed',
    job_record.status,
    'processing',
    null,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'lease_token', generated_lease_token,
      'lease_expires_at', target_now + make_interval(secs => target_lease_seconds),
      'attempt_count', job_record.attempt_count + 1,
      'next_dispatch_at', target_now + make_interval(secs => spacing_seconds::double precision)
    ),
    null,
    target_now
  );

  return query select
    job_record.id,
    job_record.organization_id,
    job_record.batch_id,
    job_record.publication_id,
    job_record.target_version_id,
    job_record.operation,
    job_record.external_effect_key,
    generated_lease_token,
    target_now + make_interval(secs => target_lease_seconds),
    job_record.attempt_count + 1,
    job_record.max_attempts,
    connection_record.external_account_id,
    connection_record.api_version,
    credential_value,
    version_record.headline,
    version_record.body,
    version_record.call_to_action,
    version_record.content_payload,
    version_record.pricing_status,
    version_record.price_amount,
    version_record.currency_code,
    media_value;
end;
$$;

alter table app_private.facebook_page_credentials enable row level security;
alter table app_private.facebook_page_credentials force row level security;
alter table app_private.facebook_page_oauth_sessions enable row level security;
alter table app_private.facebook_page_oauth_sessions force row level security;

revoke all on
  app_private.facebook_page_credentials,
  app_private.facebook_page_oauth_sessions
from public, anon, authenticated, service_role;

revoke all on function app_private.assert_facebook_oauth_owner(uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function app_private.expire_facebook_page_oauth_sessions()
from public, anon, authenticated, service_role;
revoke all on function api.begin_facebook_page_oauth(uuid, uuid, text, text)
from public, anon, authenticated, service_role;
revoke all on function api.claim_facebook_page_oauth_exchange(text, uuid)
from public, anon, authenticated, service_role;
revoke all on function api.stage_facebook_page_oauth_pages(uuid, uuid, uuid, jsonb, text)
from public, anon, authenticated, service_role;
revoke all on function api.fail_facebook_page_oauth(uuid, uuid, uuid)
from public, anon, authenticated, service_role;
revoke all on function api.complete_facebook_page_oauth(uuid, uuid, text)
from public, anon, authenticated, service_role;

grant execute on function api.begin_facebook_page_oauth(uuid, uuid, text, text)
to service_role;
grant execute on function api.claim_facebook_page_oauth_exchange(text, uuid)
to service_role;
grant execute on function api.stage_facebook_page_oauth_pages(uuid, uuid, uuid, jsonb, text)
to service_role;
grant execute on function api.fail_facebook_page_oauth(uuid, uuid, uuid)
to service_role;
grant execute on function api.complete_facebook_page_oauth(uuid, uuid, text)
to service_role;

comment on table app_private.facebook_page_credentials is
  'Tenant-scoped Facebook Page access-token metadata; values live only in Supabase Vault';
comment on table app_private.facebook_page_oauth_sessions is
  'Short-lived owner-bound Facebook OAuth state and encrypted Page-selection handoff';
comment on function api.begin_facebook_page_oauth(uuid, uuid, text, text) is
  'Starts an owner-only Facebook Page OAuth session without returning application secrets';
comment on function api.complete_facebook_page_oauth(uuid, uuid, text) is
  'Atomically selects one authorized Page, stores its token in Vault and activates publishing';

commit;
