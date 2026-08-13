begin;

-- Meta credentials are tenant-owned metadata whose values live only in
-- Supabase Vault. Application rows, webhook endpoints and credential versions
-- intentionally have separate lifecycles so rotation never requires a deploy.

-- Keep the Data API surface explicit and reproducible from migrations. Neither
-- app_private nor vault is exposed; service code reaches only reviewed api
-- views and RPCs through PostgREST.
alter role authenticator set pgrst.db_schemas = 'api, graphql_public';

create table app_private.meta_applications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  external_app_id text not null,
  display_name text not null,
  api_version text not null,
  status text not null default 'pending_verification',
  created_by_user_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  disabled_at timestamptz,
  constraint meta_applications_scope_id_unique
    unique (organization_id, id),
  constraint meta_applications_scope_external_unique
    unique (organization_id, id, external_app_id),
  constraint meta_applications_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint meta_applications_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint meta_applications_external_app_id_valid check (
    external_app_id = btrim(external_app_id)
    and char_length(external_app_id) between 1 and 255
  ),
  constraint meta_applications_display_name_valid check (
    display_name = btrim(display_name)
    and char_length(display_name) between 1 and 160
  ),
  constraint meta_applications_api_version_valid check (
    api_version = btrim(api_version)
    and char_length(api_version) between 2 and 32
  ),
  constraint meta_applications_status_valid check (
    status in ('pending_verification', 'active', 'suspended', 'revoked', 'archived')
  ),
  constraint meta_applications_disabled_at_valid check (
    (status in ('suspended', 'revoked', 'archived') and disabled_at is not null)
    or (status in ('pending_verification', 'active') and disabled_at is null)
  )
);

create unique index meta_applications_operational_external_unique
  on app_private.meta_applications (external_app_id)
  where status not in ('revoked', 'archived');

create index meta_applications_created_by_user_idx
  on app_private.meta_applications (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.meta_webhook_endpoints (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  meta_application_id uuid not null,
  endpoint_key uuid not null default extensions.gen_random_uuid(),
  status text not null default 'pending_verification',
  verified_at timestamptz,
  last_challenge_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint meta_webhook_endpoints_scope_id_unique
    unique (organization_id, id),
  constraint meta_webhook_endpoints_scope_application_id_unique
    unique (organization_id, meta_application_id, id),
  constraint meta_webhook_endpoints_endpoint_key_unique unique (endpoint_key),
  constraint meta_webhook_endpoints_application_unique unique (meta_application_id),
  constraint meta_webhook_endpoints_application_fk
    foreign key (organization_id, meta_application_id)
    references app_private.meta_applications (organization_id, id)
    on delete restrict,
  constraint meta_webhook_endpoints_status_valid check (
    status in ('pending_verification', 'active', 'suspended', 'revoked')
  ),
  constraint meta_webhook_endpoints_verified_shape check (
    status <> 'active' or verified_at is not null
  ),
  constraint meta_webhook_endpoints_disabled_at_valid check (
    (status in ('suspended', 'revoked') and disabled_at is not null)
    or (status in ('pending_verification', 'active') and disabled_at is null)
  ),
  constraint meta_webhook_endpoints_timestamps_valid check (
    (verified_at is null or verified_at >= created_at)
    and (last_challenge_at is null or last_challenge_at >= created_at)
    and (disabled_at is null or disabled_at >= created_at)
  )
);

create table app_private.meta_credential_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  meta_application_id uuid not null,
  webhook_endpoint_id uuid,
  channel_connection_id uuid,
  credential_kind text not null,
  version_number integer not null,
  vault_secret_id uuid not null,
  status text not null default 'current',
  activated_at timestamptz not null default statement_timestamp(),
  retire_after timestamptz,
  revoked_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default statement_timestamp(),
  constraint meta_credential_versions_scope_id_unique
    unique (organization_id, id),
  constraint meta_credential_versions_application_fk
    foreign key (organization_id, meta_application_id)
    references app_private.meta_applications (organization_id, id)
    on delete restrict,
  constraint meta_credential_versions_webhook_fk
    foreign key (organization_id, meta_application_id, webhook_endpoint_id)
    references app_private.meta_webhook_endpoints (
      organization_id,
      meta_application_id,
      id
    )
    on delete restrict,
  constraint meta_credential_versions_channel_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint meta_credential_versions_vault_secret_fk
    foreign key (vault_secret_id)
    references vault.secrets (id)
    on delete restrict,
  constraint meta_credential_versions_vault_secret_unique unique (vault_secret_id),
  constraint meta_credential_versions_version_valid check (version_number > 0),
  constraint meta_credential_versions_kind_valid check (
    credential_kind in (
      'app_secret',
      'webhook_verify_token',
      'system_user_access_token',
      'channel_access_token'
    )
  ),
  constraint meta_credential_versions_scope_shape check (
    (
      credential_kind = 'app_secret'
      and webhook_endpoint_id is null
      and channel_connection_id is null
    )
    or (
      credential_kind = 'webhook_verify_token'
      and webhook_endpoint_id is not null
      and channel_connection_id is null
    )
    or (
      credential_kind = 'system_user_access_token'
      and webhook_endpoint_id is null
      and channel_connection_id is null
    )
    or (
      credential_kind = 'channel_access_token'
      and webhook_endpoint_id is null
      and channel_connection_id is not null
    )
  ),
  constraint meta_credential_versions_status_valid check (
    status in ('current', 'retiring', 'revoked')
  ),
  constraint meta_credential_versions_lifecycle_valid check (
    (
      status = 'current'
      and retire_after is null
      and revoked_at is null
    )
    or (
      status = 'retiring'
      and retire_after is not null
      and retire_after > activated_at
      and revoked_at is null
    )
    or (
      status = 'revoked'
      and retire_after is null
      and revoked_at is not null
      and revoked_at >= activated_at
    )
  ),
  constraint meta_credential_versions_activated_at_valid check (
    activated_at >= created_at
  )
);

create unique index meta_credential_versions_current_unique
  on app_private.meta_credential_versions (
    meta_application_id,
    coalesce(webhook_endpoint_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(channel_connection_id, '00000000-0000-0000-0000-000000000000'::uuid),
    credential_kind
  )
  where status = 'current';

create unique index meta_credential_versions_number_unique
  on app_private.meta_credential_versions (
    meta_application_id,
    coalesce(webhook_endpoint_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(channel_connection_id, '00000000-0000-0000-0000-000000000000'::uuid),
    credential_kind,
    version_number
  );

create index meta_credential_versions_resolve_idx
  on app_private.meta_credential_versions (
    meta_application_id,
    credential_kind,
    status,
    retire_after,
    version_number desc
  );

create index meta_credential_versions_created_by_user_idx
  on app_private.meta_credential_versions (created_by_user_id)
  where created_by_user_id is not null;

alter table app_private.channel_connections
  add column meta_application_id uuid;

alter table app_private.channel_connections
  add constraint channel_connections_meta_application_fk
  foreign key (organization_id, meta_application_id, external_app_id)
  references app_private.meta_applications (
    organization_id,
    id,
    external_app_id
  )
  on delete restrict;

alter table app_private.channel_connections
  add constraint channel_connections_meta_application_required check (
    status <> 'active' or meta_application_id is not null
  );

create index channel_connections_meta_application_idx
  on app_private.channel_connections (organization_id, meta_application_id)
  where meta_application_id is not null;

create or replace view api.channel_connections
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  provider,
  channel,
  external_app_id,
  external_account_id,
  external_sender_id,
  display_name,
  api_version,
  status,
  connected_at,
  last_verified_at,
  disabled_at,
  created_at,
  updated_at,
  meta_application_id
from app_private.channel_connections;

create trigger meta_applications_set_updated_at
before update on app_private.meta_applications
for each row execute function app_private.set_updated_at();

create trigger meta_webhook_endpoints_set_updated_at
before update on app_private.meta_webhook_endpoints
for each row execute function app_private.set_updated_at();

create function app_private.prevent_meta_application_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.external_app_id is distinct from old.external_app_id then
    raise exception using
      errcode = '23514',
      message = 'Meta application organization and external identity are immutable';
  end if;

  return new;
end;
$$;

create trigger meta_applications_prevent_reassignment
before update on app_private.meta_applications
for each row execute function app_private.prevent_meta_application_reassignment();

create function app_private.prevent_meta_webhook_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.meta_application_id is distinct from old.meta_application_id
    or new.endpoint_key is distinct from old.endpoint_key then
    raise exception using
      errcode = '23514',
      message = 'Meta webhook ownership and endpoint key are immutable';
  end if;

  return new;
end;
$$;

create trigger meta_webhook_endpoints_prevent_reassignment
before update on app_private.meta_webhook_endpoints
for each row execute function app_private.prevent_meta_webhook_reassignment();

create function app_private.reject_meta_credential_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.meta_application_id is distinct from old.meta_application_id
    or new.webhook_endpoint_id is distinct from old.webhook_endpoint_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.credential_kind is distinct from old.credential_kind
    or new.version_number is distinct from old.version_number
    or new.vault_secret_id is distinct from old.vault_secret_id
    or new.activated_at is distinct from old.activated_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Meta credential version identity is immutable';
  end if;

  return new;
end;
$$;

create trigger meta_credential_versions_reject_rewrite
before update on app_private.meta_credential_versions
for each row execute function app_private.reject_meta_credential_rewrite();

create function app_private.reject_meta_credential_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '23514',
    message = 'Meta credential history is append-only';
end;
$$;

create trigger meta_credential_versions_reject_delete
before delete on app_private.meta_credential_versions
for each row execute function app_private.reject_meta_credential_delete();

create function app_private.constant_time_bytea_equal(
  left_value bytea,
  right_value bytea
)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  difference integer := 0;
  byte_index integer;
  value_length integer := octet_length(left_value);
begin
  if value_length <> octet_length(right_value) then
    return false;
  end if;

  if value_length = 0 then
    return true;
  end if;

  for byte_index in 0..(value_length - 1) loop
    difference := difference | (
      get_byte(left_value, byte_index) # get_byte(right_value, byte_index)
    );
  end loop;

  return difference = 0;
end;
$$;

create function app_private.insert_meta_credential_version(
  target_organization_id uuid,
  target_meta_application_id uuid,
  target_webhook_endpoint_id uuid,
  target_channel_connection_id uuid,
  target_credential_kind text,
  target_secret_value text,
  target_actor_user_id uuid,
  target_overlap_seconds integer
)
returns app_private.meta_credential_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_now timestamptz := statement_timestamp();
  target_next_version integer;
  target_secret_name text;
  target_vault_secret_id uuid;
  target_version app_private.meta_credential_versions;
begin
  if target_secret_value is null
    or char_length(target_secret_value) < 16
    or char_length(target_secret_value) > 65536 then
    raise exception using
      errcode = '22023',
      message = 'Meta credential value has an invalid length';
  end if;

  if target_overlap_seconds is null
    or target_overlap_seconds < 0
    or target_overlap_seconds > 86400 then
    raise exception using
      errcode = '22023',
      message = 'Meta credential overlap must be between 0 and 86400 seconds';
  end if;

  perform 1
  from app_private.meta_applications as application_value
  where application_value.organization_id = target_organization_id
    and application_value.id = target_meta_application_id
    and application_value.status not in ('revoked', 'archived')
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'Operational Meta application was not found in the organization';
  end if;

  if target_webhook_endpoint_id is not null then
    perform 1
    from app_private.meta_webhook_endpoints as endpoint_value
    where endpoint_value.organization_id = target_organization_id
      and endpoint_value.meta_application_id = target_meta_application_id
      and endpoint_value.id = target_webhook_endpoint_id
      and endpoint_value.status <> 'revoked';

    if not found then
      raise exception using
        errcode = '23503',
        message = 'Operational Meta webhook endpoint was not found in the application';
    end if;
  end if;

  if target_channel_connection_id is not null then
    perform 1
    from app_private.channel_connections as connection_value
    where connection_value.organization_id = target_organization_id
      and connection_value.meta_application_id = target_meta_application_id
      and connection_value.id = target_channel_connection_id
      and connection_value.status not in ('revoked', 'archived');

    if not found then
      raise exception using
        errcode = '23503',
        message = 'Operational Meta channel connection was not found in the application';
    end if;
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_next_version
  from app_private.meta_credential_versions as version_value
  where version_value.meta_application_id = target_meta_application_id
    and version_value.webhook_endpoint_id is not distinct from target_webhook_endpoint_id
    and version_value.channel_connection_id is not distinct from target_channel_connection_id
    and version_value.credential_kind = target_credential_kind;

  if target_overlap_seconds = 0 then
    update app_private.meta_credential_versions
    set status = 'revoked',
        retire_after = null,
        revoked_at = target_now
    where meta_application_id = target_meta_application_id
      and webhook_endpoint_id is not distinct from target_webhook_endpoint_id
      and channel_connection_id is not distinct from target_channel_connection_id
      and credential_kind = target_credential_kind
      and status in ('current', 'retiring');
  else
    update app_private.meta_credential_versions
    set status = 'retiring',
        retire_after = target_now + make_interval(secs => target_overlap_seconds),
        revoked_at = null
    where meta_application_id = target_meta_application_id
      and webhook_endpoint_id is not distinct from target_webhook_endpoint_id
      and channel_connection_id is not distinct from target_channel_connection_id
      and credential_kind = target_credential_kind
      and status = 'current';
  end if;

  target_secret_name := concat_ws(
    '/',
    'agentefer',
    'meta',
    target_organization_id::text,
    target_meta_application_id::text,
    coalesce(target_webhook_endpoint_id::text, 'application'),
    coalesce(target_channel_connection_id::text, 'shared'),
    target_credential_kind,
    'v' || target_next_version::text
  );

  target_vault_secret_id := vault.create_secret(
    target_secret_value,
    target_secret_name,
    'AgenteFer tenant-scoped Meta credential',
    null
  );

  insert into app_private.meta_credential_versions (
    organization_id,
    meta_application_id,
    webhook_endpoint_id,
    channel_connection_id,
    credential_kind,
    version_number,
    vault_secret_id,
    status,
    activated_at,
    created_by_user_id,
    created_at
  ) values (
    target_organization_id,
    target_meta_application_id,
    target_webhook_endpoint_id,
    target_channel_connection_id,
    target_credential_kind,
    target_next_version,
    target_vault_secret_id,
    'current',
    target_now,
    target_actor_user_id,
    target_now
  )
  returning * into target_version;

  return target_version;
end;
$$;

create function api.register_meta_application(
  target_organization_id uuid,
  target_external_app_id text,
  target_display_name text,
  target_api_version text,
  target_app_secret text,
  target_webhook_verify_token text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  endpoint_key uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_application app_private.meta_applications;
  target_endpoint app_private.meta_webhook_endpoints;
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

  insert into app_private.meta_applications (
    organization_id,
    external_app_id,
    display_name,
    api_version,
    status,
    created_by_user_id
  ) values (
    target_organization_id,
    target_external_app_id,
    target_display_name,
    target_api_version,
    'pending_verification',
    target_actor_user_id
  )
  returning * into target_application;

  insert into app_private.meta_webhook_endpoints (
    organization_id,
    meta_application_id,
    status
  ) values (
    target_organization_id,
    target_application.id,
    'pending_verification'
  )
  returning * into target_endpoint;

  perform app_private.insert_meta_credential_version(
    target_organization_id,
    target_application.id,
    null,
    null,
    'app_secret',
    target_app_secret,
    target_actor_user_id,
    0
  );

  perform app_private.insert_meta_credential_version(
    target_organization_id,
    target_application.id,
    target_endpoint.id,
    null,
    'webhook_verify_token',
    target_webhook_verify_token,
    target_actor_user_id,
    0
  );

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
    'meta.credentials.application_registered',
    case when target_actor_user_id is null then 'system' else 'member' end,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'meta_application_id', target_application.id,
      'webhook_endpoint_id', target_endpoint.id,
      'external_app_id', target_application.external_app_id,
      'credential_kinds', jsonb_build_array('app_secret', 'webhook_verify_token')
    )
  );

  return query
  select target_application.id, target_endpoint.id, target_endpoint.endpoint_key;
end;
$$;

create function api.rotate_meta_credential(
  target_organization_id uuid,
  target_meta_application_id uuid,
  target_webhook_endpoint_id uuid,
  target_channel_connection_id uuid,
  target_credential_kind text,
  target_secret_value text,
  target_overlap_seconds integer,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  credential_version_id uuid,
  version_number integer,
  activated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_version app_private.meta_credential_versions;
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

  target_version := app_private.insert_meta_credential_version(
    target_organization_id,
    target_meta_application_id,
    target_webhook_endpoint_id,
    target_channel_connection_id,
    target_credential_kind,
    target_secret_value,
    target_actor_user_id,
    target_overlap_seconds
  );

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
    'meta.credentials.rotated',
    case when target_actor_user_id is null then 'system' else 'member' end,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'meta_application_id', target_meta_application_id,
      'webhook_endpoint_id', target_webhook_endpoint_id,
      'channel_connection_id', target_channel_connection_id,
      'credential_kind', target_credential_kind,
      'credential_version_id', target_version.id,
      'version_number', target_version.version_number,
      'overlap_seconds', target_overlap_seconds
    )
  );

  return query
  select target_version.id, target_version.version_number, target_version.activated_at;
end;
$$;

create function api.verify_meta_webhook_challenge(
  target_endpoint_key uuid,
  target_verify_token text
)
returns table (
  organization_id uuid,
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  external_app_id text,
  credential_version_id uuid
)
language sql
security definer
set search_path = ''
as $$
  select
    endpoint_value.organization_id,
    endpoint_value.meta_application_id,
    endpoint_value.id,
    application_value.external_app_id,
    version_value.id
  from app_private.meta_webhook_endpoints as endpoint_value
  join app_private.meta_applications as application_value
    on application_value.organization_id = endpoint_value.organization_id
   and application_value.id = endpoint_value.meta_application_id
  join app_private.meta_credential_versions as version_value
    on version_value.organization_id = endpoint_value.organization_id
   and version_value.meta_application_id = endpoint_value.meta_application_id
   and version_value.webhook_endpoint_id = endpoint_value.id
   and version_value.credential_kind = 'webhook_verify_token'
  join vault.decrypted_secrets as secret_value
    on secret_value.id = version_value.vault_secret_id
  where endpoint_value.endpoint_key = target_endpoint_key
    and endpoint_value.status in ('pending_verification', 'active')
    and application_value.status in ('pending_verification', 'active')
    and target_verify_token is not null
    and octet_length(target_verify_token) between 16 and 512
    and app_private.constant_time_bytea_equal(
      extensions.digest(convert_to(target_verify_token, 'UTF8'), 'sha256'),
      extensions.digest(convert_to(secret_value.decrypted_secret, 'UTF8'), 'sha256')
    )
    and (
      version_value.status = 'current'
      or (
        version_value.status = 'retiring'
        and version_value.retire_after > statement_timestamp()
      )
    )
  order by version_value.version_number desc;
$$;

create function api.verify_meta_webhook_signature(
  target_endpoint_key uuid,
  target_raw_body bytea,
  target_signature bytea
)
returns table (
  organization_id uuid,
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  external_app_id text,
  credential_version_id uuid
)
language sql
security definer
set search_path = ''
as $$
  select
    endpoint_value.organization_id,
    endpoint_value.meta_application_id,
    endpoint_value.id,
    application_value.external_app_id,
    version_value.id
  from app_private.meta_webhook_endpoints as endpoint_value
  join app_private.meta_applications as application_value
    on application_value.organization_id = endpoint_value.organization_id
   and application_value.id = endpoint_value.meta_application_id
  join app_private.meta_credential_versions as version_value
    on version_value.organization_id = endpoint_value.organization_id
   and version_value.meta_application_id = endpoint_value.meta_application_id
   and version_value.webhook_endpoint_id is null
   and version_value.channel_connection_id is null
   and version_value.credential_kind = 'app_secret'
  join vault.decrypted_secrets as secret_value
    on secret_value.id = version_value.vault_secret_id
  where endpoint_value.endpoint_key = target_endpoint_key
    and endpoint_value.status = 'active'
    and application_value.status = 'active'
    and target_raw_body is not null
    and octet_length(target_raw_body) between 2 and 1048576
    and target_signature is not null
    and octet_length(target_signature) = 32
    and app_private.constant_time_bytea_equal(
      extensions.hmac(
        target_raw_body,
        convert_to(secret_value.decrypted_secret, 'UTF8'),
        'sha256'
      ),
      target_signature
    )
    and (
      version_value.status = 'current'
      or (
        version_value.status = 'retiring'
        and version_value.retire_after > statement_timestamp()
      )
    )
  order by version_value.version_number desc;
$$;

create function api.confirm_meta_webhook_verification(
  target_endpoint_key uuid,
  target_credential_version_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_endpoint app_private.meta_webhook_endpoints;
begin
  select endpoint_value.*
  into target_endpoint
  from app_private.meta_webhook_endpoints as endpoint_value
  join app_private.meta_credential_versions as version_value
    on version_value.organization_id = endpoint_value.organization_id
   and version_value.meta_application_id = endpoint_value.meta_application_id
   and version_value.webhook_endpoint_id = endpoint_value.id
  where endpoint_value.endpoint_key = target_endpoint_key
    and version_value.id = target_credential_version_id
    and version_value.credential_kind = 'webhook_verify_token'
    and (
      version_value.status = 'current'
      or (
        version_value.status = 'retiring'
        and version_value.retire_after > statement_timestamp()
      )
    )
  for update of endpoint_value;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Meta webhook verification evidence is invalid';
  end if;

  update app_private.meta_webhook_endpoints
  set status = 'active',
      verified_at = coalesce(verified_at, statement_timestamp()),
      last_challenge_at = statement_timestamp(),
      disabled_at = null
  where id = target_endpoint.id;

  update app_private.meta_applications
  set status = 'active',
      disabled_at = null
  where organization_id = target_endpoint.organization_id
    and id = target_endpoint.meta_application_id
    and status = 'pending_verification';

  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    correlation_id,
    trace_id,
    metadata_safe
  ) values (
    target_endpoint.organization_id,
    'meta.webhook.verified',
    'provider',
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'meta_application_id', target_endpoint.meta_application_id,
      'webhook_endpoint_id', target_endpoint.id,
      'credential_version_id', target_credential_version_id
    )
  );
end;
$$;

alter table app_private.meta_applications enable row level security;
alter table app_private.meta_applications force row level security;
alter table app_private.meta_webhook_endpoints enable row level security;
alter table app_private.meta_webhook_endpoints force row level security;
alter table app_private.meta_credential_versions enable row level security;
alter table app_private.meta_credential_versions force row level security;

create policy meta_applications_admin_select
on app_private.meta_applications
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = meta_applications.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create policy meta_webhook_endpoints_admin_select
on app_private.meta_webhook_endpoints
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = meta_webhook_endpoints.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create policy meta_credential_versions_admin_select
on app_private.meta_credential_versions
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = meta_credential_versions.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create view api.meta_applications
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
  disabled_at
from app_private.meta_applications;

create view api.meta_webhook_endpoints
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  meta_application_id,
  endpoint_key,
  status,
  verified_at,
  last_challenge_at,
  disabled_at,
  created_at,
  updated_at
from app_private.meta_webhook_endpoints;

create view api.meta_credential_versions
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  meta_application_id,
  webhook_endpoint_id,
  channel_connection_id,
  credential_kind,
  version_number,
  status,
  activated_at,
  retire_after,
  revoked_at,
  created_by_user_id,
  created_at
from app_private.meta_credential_versions;

revoke all on
  app_private.meta_applications,
  app_private.meta_webhook_endpoints,
  app_private.meta_credential_versions
from public, anon, authenticated, service_role;

revoke all on
  api.meta_applications,
  api.meta_webhook_endpoints,
  api.meta_credential_versions
from public, anon, authenticated, service_role;

revoke all on function api.register_meta_application(
  uuid, text, text, text, text, text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.rotate_meta_credential(
  uuid, uuid, uuid, uuid, text, text, integer, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.verify_meta_webhook_challenge(uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function api.verify_meta_webhook_signature(uuid, bytea, bytea)
  from public, anon, authenticated, service_role;
revoke all on function api.confirm_meta_webhook_verification(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;

grant select on
  app_private.meta_applications,
  app_private.meta_webhook_endpoints
to service_role;

grant select on
  api.meta_applications,
  api.meta_webhook_endpoints,
  api.meta_credential_versions
to authenticated, service_role;

grant execute on function api.register_meta_application(
  uuid, text, text, text, text, text, uuid, text, text
) to service_role;
grant execute on function api.rotate_meta_credential(
  uuid, uuid, uuid, uuid, text, text, integer, uuid, text, text
) to service_role;
grant execute on function api.verify_meta_webhook_challenge(uuid, text)
  to service_role;
grant execute on function api.verify_meta_webhook_signature(uuid, bytea, bytea)
  to service_role;
grant execute on function api.confirm_meta_webhook_verification(uuid, uuid, text, text)
  to service_role;

grant select (
  id,
  organization_id,
  external_app_id,
  display_name,
  api_version,
  status,
  created_by_user_id,
  created_at,
  updated_at,
  disabled_at
) on app_private.meta_applications to authenticated;

grant select (
  id,
  organization_id,
  meta_application_id,
  endpoint_key,
  status,
  verified_at,
  last_challenge_at,
  disabled_at,
  created_at,
  updated_at
) on app_private.meta_webhook_endpoints to authenticated;

grant select (
  id,
  organization_id,
  meta_application_id,
  webhook_endpoint_id,
  channel_connection_id,
  credential_kind,
  version_number,
  status,
  activated_at,
  retire_after,
  revoked_at,
  created_by_user_id,
  created_at
) on app_private.meta_credential_versions to authenticated, service_role;

grant select (meta_application_id)
  on app_private.channel_connections
  to authenticated;

comment on table app_private.meta_applications is
  'Tenant-owned Meta application identity; credential values live only in Supabase Vault';
comment on table app_private.meta_webhook_endpoints is
  'Opaque tenant-scoped Meta callback endpoint with an independently rotatable verify token';
comment on table app_private.meta_credential_versions is
  'Append-only credential lifecycle metadata; vault_secret_id is private and no secret value is stored here';
comment on function api.verify_meta_webhook_challenge(uuid, text) is
  'Service-only verifier; compares a candidate against active Vault material without returning the secret';
comment on function api.verify_meta_webhook_signature(uuid, bytea, bytea) is
  'Service-only verifier; validates raw-body Meta HMAC with active Vault material without returning the secret';

notify pgrst, 'reload config';

commit;
