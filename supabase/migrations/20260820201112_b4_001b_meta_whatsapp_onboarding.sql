begin;

-- A channel connection remains the canonical provider identity. This profile
-- stores only non-secret WhatsApp facts observed from Meta so operators can
-- identify the connection and automation can monitor token health later.
create table app_private.meta_whatsapp_connection_profiles (
  channel_connection_id uuid primary key,
  organization_id uuid not null,
  display_phone_number text not null,
  verified_name text not null,
  quality_rating text,
  name_status text,
  token_type text not null,
  granted_scopes text[] not null,
  token_expires_at timestamptz,
  data_access_expires_at timestamptz,
  subscribed_at timestamptz not null default statement_timestamp(),
  last_validated_at timestamptz not null default statement_timestamp(),
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint meta_whatsapp_profiles_scope_id_unique
    unique (organization_id, channel_connection_id),
  constraint meta_whatsapp_profiles_channel_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint meta_whatsapp_profiles_display_phone_valid check (
    display_phone_number = btrim(display_phone_number)
    and char_length(display_phone_number) between 1 and 64
  ),
  constraint meta_whatsapp_profiles_verified_name_valid check (
    verified_name = btrim(verified_name)
    and char_length(verified_name) between 1 and 160
  ),
  constraint meta_whatsapp_profiles_quality_rating_valid check (
    quality_rating is null
    or (
      quality_rating = btrim(quality_rating)
      and char_length(quality_rating) between 1 and 64
    )
  ),
  constraint meta_whatsapp_profiles_name_status_valid check (
    name_status is null
    or (
      name_status = btrim(name_status)
      and char_length(name_status) between 1 and 64
    )
  ),
  constraint meta_whatsapp_profiles_token_type_valid check (
    token_type = btrim(token_type)
    and char_length(token_type) between 1 and 64
  ),
  constraint meta_whatsapp_profiles_scopes_valid check (
    cardinality(granted_scopes) between 2 and 100
    and granted_scopes @> array[
      'whatsapp_business_management',
      'whatsapp_business_messaging'
    ]::text[]
  ),
  constraint meta_whatsapp_profiles_expiry_valid check (
    (token_expires_at is null or token_expires_at > last_validated_at)
    and (
      data_access_expires_at is null
      or data_access_expires_at > last_validated_at
    )
  ),
  constraint meta_whatsapp_profiles_timestamps_valid check (
    subscribed_at >= created_at
    and last_validated_at >= created_at
    and updated_at >= created_at
  )
);

create trigger meta_whatsapp_connection_profiles_set_updated_at
before update on app_private.meta_whatsapp_connection_profiles
for each row execute function app_private.set_updated_at();

create function app_private.validate_meta_whatsapp_profile_connection()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform 1
  from app_private.channel_connections as connection_value
  where connection_value.organization_id = new.organization_id
    and connection_value.id = new.channel_connection_id
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.meta_application_id is not null
    and connection_value.external_account_id is not null
    and connection_value.external_sender_id is not null
    and connection_value.status in ('pending_verification', 'active');

  if not found then
    raise exception using
      errcode = '23514',
      message = 'WhatsApp profile requires an operational Meta WhatsApp connection';
  end if;

  return new;
end;
$$;

create trigger meta_whatsapp_connection_profiles_validate_connection
before insert or update on app_private.meta_whatsapp_connection_profiles
for each row execute function app_private.validate_meta_whatsapp_profile_connection();

create function app_private.reject_meta_whatsapp_profile_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id then
    raise exception using
      errcode = '23514',
      message = 'WhatsApp profile ownership is immutable';
  end if;

  return new;
end;
$$;

create trigger meta_whatsapp_connection_profiles_prevent_reassignment
before update on app_private.meta_whatsapp_connection_profiles
for each row execute function app_private.reject_meta_whatsapp_profile_reassignment();

create function api.register_meta_whatsapp_connection(
  target_organization_id uuid,
  target_meta_application_id uuid,
  target_waba_id text,
  target_phone_number_id text,
  target_display_phone_number text,
  target_verified_name text,
  target_quality_rating text,
  target_name_status text,
  target_token_type text,
  target_granted_scopes text[],
  target_token_expires_at timestamptz,
  target_data_access_expires_at timestamptz,
  target_access_token text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  channel_connection_id uuid,
  display_phone_number text,
  verified_name text,
  connection_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_now timestamptz := statement_timestamp();
  target_application app_private.meta_applications;
  target_endpoint app_private.meta_webhook_endpoints;
  target_connection app_private.channel_connections;
  target_credential app_private.meta_credential_versions;
  normalized_scopes text[];
begin
  if target_actor_user_id is not null and not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_actor_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  ) then
    raise exception using
      errcode = '42501',
      message = 'An active organization owner or admin is required';
  end if;

  if target_waba_id is null
    or target_waba_id <> btrim(target_waba_id)
    or char_length(target_waba_id) not between 1 and 64
    or char_length(translate(target_waba_id, '0123456789', '')) <> 0
    or target_phone_number_id is null
    or target_phone_number_id <> btrim(target_phone_number_id)
    or char_length(target_phone_number_id) not between 1 and 64
    or char_length(translate(target_phone_number_id, '0123456789', '')) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'Meta WABA and phone number identifiers must be decimal identifiers';
  end if;

  if target_display_phone_number is null
    or target_display_phone_number <> btrim(target_display_phone_number)
    or char_length(target_display_phone_number) not between 1 and 64
    or target_verified_name is null
    or target_verified_name <> btrim(target_verified_name)
    or char_length(target_verified_name) not between 1 and 160
    or target_token_type is null
    or target_token_type <> btrim(target_token_type)
    or char_length(target_token_type) not between 1 and 64 then
    raise exception using
      errcode = '22023',
      message = 'Observed WhatsApp profile metadata is invalid';
  end if;

  if target_quality_rating is not null and (
    target_quality_rating <> btrim(target_quality_rating)
    or char_length(target_quality_rating) not between 1 and 64
  ) then
    raise exception using
      errcode = '22023',
      message = 'Observed WhatsApp quality rating is invalid';
  end if;

  if target_name_status is not null and (
    target_name_status <> btrim(target_name_status)
    or char_length(target_name_status) not between 1 and 64
  ) then
    raise exception using
      errcode = '22023',
      message = 'Observed WhatsApp name status is invalid';
  end if;

  if exists (
    select 1
    from unnest(coalesce(target_granted_scopes, '{}'::text[])) as scope_value
    where scope_value is null
      or scope_value <> btrim(scope_value)
      or char_length(scope_value) not between 1 and 160
  ) then
    raise exception using
      errcode = '22023',
      message = 'Observed Meta permission metadata is invalid';
  end if;

  select coalesce(array_agg(scope_value order by scope_value), '{}'::text[])
  into normalized_scopes
  from (
    select distinct btrim(scope_value) as scope_value
    from unnest(coalesce(target_granted_scopes, '{}'::text[])) as scope_value
    where scope_value = btrim(scope_value)
      and char_length(scope_value) between 1 and 160
  ) as normalized;

  if cardinality(normalized_scopes) > 100
    or not normalized_scopes @> array[
      'whatsapp_business_management',
      'whatsapp_business_messaging'
    ]::text[] then
    raise exception using
      errcode = '22023',
      message = 'Required WhatsApp permissions were not validated';
  end if;

  if (target_token_expires_at is not null and target_token_expires_at <= target_now)
    or (
      target_data_access_expires_at is not null
      and target_data_access_expires_at <= target_now
    ) then
    raise exception using
      errcode = '22023',
      message = 'An expired Meta token cannot activate a WhatsApp connection';
  end if;

  select application_value.*
  into target_application
  from app_private.meta_applications as application_value
  where application_value.organization_id = target_organization_id
    and application_value.id = target_meta_application_id
    and application_value.status = 'active'
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'A verified active Meta application is required';
  end if;

  select endpoint_value.*
  into target_endpoint
  from app_private.meta_webhook_endpoints as endpoint_value
  where endpoint_value.organization_id = target_organization_id
    and endpoint_value.meta_application_id = target_application.id
    and endpoint_value.status = 'active'
    and endpoint_value.verified_at is not null
  for update;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'A verified active Meta webhook endpoint is required';
  end if;

  insert into app_private.channel_connections (
    organization_id,
    provider,
    channel,
    external_app_id,
    external_account_id,
    external_sender_id,
    display_name,
    api_version,
    status,
    created_by_user_id,
    meta_application_id
  ) values (
    target_organization_id,
    'meta',
    'whatsapp',
    target_application.external_app_id,
    target_waba_id,
    target_phone_number_id,
    target_verified_name,
    target_application.api_version,
    'pending_verification',
    target_actor_user_id,
    target_application.id
  )
  returning * into target_connection;

  target_credential := app_private.insert_meta_credential_version(
    target_organization_id,
    target_application.id,
    null,
    target_connection.id,
    'channel_access_token',
    target_access_token,
    target_actor_user_id,
    0
  );

  insert into app_private.meta_whatsapp_connection_profiles (
    channel_connection_id,
    organization_id,
    display_phone_number,
    verified_name,
    quality_rating,
    name_status,
    token_type,
    granted_scopes,
    token_expires_at,
    data_access_expires_at,
    subscribed_at,
    last_validated_at,
    created_at,
    updated_at
  ) values (
    target_connection.id,
    target_organization_id,
    target_display_phone_number,
    target_verified_name,
    target_quality_rating,
    target_name_status,
    target_token_type,
    normalized_scopes,
    target_token_expires_at,
    target_data_access_expires_at,
    target_now,
    target_now,
    target_now,
    target_now
  );

  update app_private.channel_connections
  set credential_reference = 'meta-credential-version://' || target_credential.id::text,
      webhook_secret_reference = 'meta-webhook-endpoint://' || target_endpoint.id::text,
      status = 'active',
      connected_at = target_now,
      last_verified_at = target_now,
      updated_at = target_now
  where organization_id = target_organization_id
    and id = target_connection.id
  returning * into target_connection;

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
    'meta.whatsapp.connection_registered',
    case when target_actor_user_id is null then 'system' else 'member' end,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'meta_application_id', target_application.id,
      'channel_connection_id', target_connection.id,
      'waba_id', target_waba_id,
      'phone_number_id', target_phone_number_id,
      'token_type', target_token_type,
      'granted_scopes', to_jsonb(normalized_scopes),
      'token_expires_at', target_token_expires_at,
      'data_access_expires_at', target_data_access_expires_at
    )
  );

  return query
  select
    target_connection.id,
    target_display_phone_number,
    target_verified_name,
    target_connection.status;
end;
$$;

alter table app_private.meta_whatsapp_connection_profiles enable row level security;
alter table app_private.meta_whatsapp_connection_profiles force row level security;

create policy meta_whatsapp_connection_profiles_admin_select
on app_private.meta_whatsapp_connection_profiles
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = meta_whatsapp_connection_profiles.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create view api.meta_whatsapp_connections
with (security_invoker = true, security_barrier = true)
as
select
  connection_value.id,
  connection_value.organization_id,
  connection_value.meta_application_id,
  connection_value.external_app_id,
  connection_value.external_account_id as waba_id,
  connection_value.external_sender_id as phone_number_id,
  profile_value.display_phone_number,
  profile_value.verified_name,
  profile_value.quality_rating,
  profile_value.name_status,
  profile_value.token_type,
  profile_value.granted_scopes,
  profile_value.token_expires_at,
  profile_value.data_access_expires_at,
  profile_value.subscribed_at,
  profile_value.last_validated_at,
  connection_value.api_version,
  connection_value.status,
  connection_value.connected_at,
  connection_value.disabled_at,
  connection_value.created_at,
  connection_value.updated_at
from app_private.channel_connections as connection_value
join app_private.meta_whatsapp_connection_profiles as profile_value
  on profile_value.organization_id = connection_value.organization_id
 and profile_value.channel_connection_id = connection_value.id
where connection_value.provider = 'meta'
  and connection_value.channel = 'whatsapp';

revoke all on app_private.meta_whatsapp_connection_profiles
  from public, anon, authenticated, service_role;
revoke all on api.meta_whatsapp_connections
  from public, anon, authenticated, service_role;
revoke all on function api.register_meta_whatsapp_connection(
  uuid, uuid, text, text, text, text, text, text, text, text[],
  timestamptz, timestamptz, text, uuid, text, text
) from public, anon, authenticated, service_role;

grant select on app_private.meta_whatsapp_connection_profiles
  to authenticated, service_role;
grant select on api.meta_whatsapp_connections
  to authenticated, service_role;
grant execute on function api.register_meta_whatsapp_connection(
  uuid, uuid, text, text, text, text, text, text, text, text[],
  timestamptz, timestamptz, text, uuid, text, text
) to service_role;

comment on table app_private.meta_whatsapp_connection_profiles is
  'Non-secret Meta-validated WhatsApp connection facts and token health metadata';
comment on function api.register_meta_whatsapp_connection(
  uuid, uuid, text, text, text, text, text, text, text, text[],
  timestamptz, timestamptz, text, uuid, text, text
) is
  'Atomically activates a tenant WhatsApp connection and stores its access token only in Vault';

notify pgrst, 'reload schema';

commit;
