begin;

create table app_private.media_ingest_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  message_id uuid not null,
  provider_media_id text not null,
  declared_mime_type text,
  declared_sha256_hex text,
  declared_file_size bigint,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  media_asset_id uuid,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_ingest_requests_organization_id_id_unique
    unique (organization_id, id),
  constraint media_ingest_requests_message_unique
    unique (organization_id, message_id),
  constraint media_ingest_requests_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint media_ingest_requests_message_fk
    foreign key (organization_id, channel_connection_id, message_id)
    references app_private.messages (
      organization_id, channel_connection_id, id
    )
    on delete restrict,
  constraint media_ingest_requests_asset_fk
    foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id)
    on delete restrict,
  constraint media_ingest_requests_provider_id_valid
    check (
      provider_media_id = btrim(provider_media_id)
      and char_length(provider_media_id) between 1 and 512
    ),
  constraint media_ingest_requests_mime_valid
    check (
      declared_mime_type is null
      or declared_mime_type in ('image/jpeg', 'image/png', 'image/webp')
    ),
  constraint media_ingest_requests_hash_valid
    check (
      declared_sha256_hex is null
      or (
        char_length(declared_sha256_hex) = 64
        and declared_sha256_hex = lower(declared_sha256_hex)
        and declared_sha256_hex ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint media_ingest_requests_size_valid
    check (declared_file_size is null or declared_file_size between 1 and 5242880),
  constraint media_ingest_requests_status_valid
    check (status in ('pending', 'processing', 'retryable', 'succeeded', 'rejected', 'dead_letter')),
  constraint media_ingest_requests_attempt_valid
    check (attempt_count between 0 and 100),
  constraint media_ingest_requests_lease_shape_valid
    check (
      (status = 'processing' and lease_owner is not null and lease_token is not null and lease_expires_at is not null)
      or (status <> 'processing' and lease_owner is null and lease_token is null and lease_expires_at is null)
    ),
  constraint media_ingest_requests_completion_shape_valid
    check (
      (status = 'succeeded' and media_asset_id is not null and completed_at is not null)
      or (status <> 'succeeded' and media_asset_id is null)
    )
);

create index media_ingest_requests_claim_idx
  on app_private.media_ingest_requests (status, available_at, created_at, id)
  where status in ('pending', 'retryable', 'processing');

create index media_ingest_requests_tenant_claim_idx
  on app_private.media_ingest_requests (organization_id, status, available_at, id)
  where status in ('pending', 'retryable', 'processing');

create trigger media_ingest_requests_set_updated_at
before update on app_private.media_ingest_requests
for each row execute function app_private.set_updated_at();

create function app_private.enqueue_whatsapp_image_ingest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  image_record jsonb;
  media_id text;
  declared_mime text;
  declared_hash text;
  declared_size bigint;
begin
  if new.direction <> 'inbound'
    or new.content_kind <> 'media'
    or new.provider_message_type <> 'image'
    or new.status <> 'received'
    or jsonb_typeof(new.content -> 'image') <> 'object' then
    return new;
  end if;

  image_record := new.content -> 'image';
  media_id := image_record ->> 'id';
  if media_id is null or btrim(media_id) = '' or char_length(media_id) > 512 then
    return new;
  end if;

  declared_mime := image_record ->> 'mime_type';
  if declared_mime is not null and declared_mime not in ('image/jpeg', 'image/png', 'image/webp') then
    declared_mime := null;
  end if;

  declared_hash := image_record ->> 'sha256';
  if declared_hash is not null
    and (
      char_length(declared_hash) <> 64
      or declared_hash <> lower(declared_hash)
      or declared_hash !~ '^[0-9a-f]{64}$'
    ) then
    declared_hash := null;
  end if;

  begin
    declared_size := (image_record ->> 'file_size')::bigint;
  exception when invalid_text_representation or numeric_value_out_of_range then
    declared_size := null;
  end;
  if declared_size is not null and declared_size not between 1 and 5242880 then
    declared_size := null;
  end if;

  insert into app_private.media_ingest_requests (
    organization_id,
    channel_connection_id,
    message_id,
    provider_media_id,
    declared_mime_type,
    declared_sha256_hex,
    declared_file_size
  ) values (
    new.organization_id,
    new.channel_connection_id,
    new.id,
    btrim(media_id),
    declared_mime,
    declared_hash,
    declared_size
  ) on conflict (organization_id, message_id) do nothing;

  update app_private.messages
  set status = 'processed',
      processed_at = coalesce(processed_at, statement_timestamp()),
      updated_at = statement_timestamp()
  where organization_id = new.organization_id
    and channel_connection_id = new.channel_connection_id
    and id = new.id
    and status = 'received';

  return new;
end;
$$;

create trigger messages_enqueue_whatsapp_image_ingest
after insert on app_private.messages
for each row execute function app_private.enqueue_whatsapp_image_ingest();

insert into app_private.media_ingest_requests (
  organization_id,
  channel_connection_id,
  message_id,
  provider_media_id,
  declared_mime_type,
  declared_sha256_hex,
  declared_file_size
)
select
  message_value.organization_id,
  message_value.channel_connection_id,
  message_value.id,
  btrim(message_value.content #>> '{image,id}'),
  case
    when message_value.content #>> '{image,mime_type}' in ('image/jpeg', 'image/png', 'image/webp')
      then message_value.content #>> '{image,mime_type}'
    else null
  end,
  case
    when message_value.content #>> '{image,sha256}' ~ '^[0-9a-f]{64}$'
      then message_value.content #>> '{image,sha256}'
    else null
  end,
  case
    when (message_value.content #>> '{image,file_size}') ~ '^[0-9]+$'
      and char_length(message_value.content #>> '{image,file_size}') <= 18
      and (message_value.content #>> '{image,file_size}')::bigint between 1 and 5242880
      then (message_value.content #>> '{image,file_size}')::bigint
    else null
  end
from app_private.messages as message_value
where message_value.direction = 'inbound'
  and message_value.content_kind = 'media'
  and message_value.provider_message_type = 'image'
  and message_value.status in ('received', 'processed')
  and jsonb_typeof(message_value.content #> '{image}') = 'object'
  and jsonb_typeof(message_value.content #> '{image,id}') = 'string'
  and btrim(message_value.content #>> '{image,id}') <> ''
on conflict (organization_id, message_id) do nothing;

update app_private.messages as message_value
set status = 'processed',
    processed_at = coalesce(message_value.processed_at, statement_timestamp()),
    updated_at = statement_timestamp()
where message_value.direction = 'inbound'
  and message_value.content_kind = 'media'
  and message_value.provider_message_type = 'image'
  and message_value.status = 'received'
  and exists (
    select 1
    from app_private.media_ingest_requests as request_value
    where request_value.organization_id = message_value.organization_id
      and request_value.message_id = message_value.id
  );

create function api.claim_whatsapp_media_ingest(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8,
  target_organization_id uuid default null
)
returns table (
  organization_id uuid,
  request_id uuid,
  channel_connection_id uuid,
  message_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_number integer,
  api_version text,
  phone_number_id text,
  provider_media_id text,
  declared_mime_type text,
  declared_sha256_hex text,
  declared_file_size bigint,
  correlation_id text,
  trace_id text,
  access_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record app_private.media_ingest_requests%rowtype;
  connection_record app_private.channel_connections%rowtype;
  claimed_lease_token uuid;
  claimed_lease_expires_at timestamptz;
  access_token_value text;
  correlation_value text;
  trace_value text;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_lease_seconds not between 15 and 900
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'media ingest claim parameters are invalid';
  end if;

  with exhausted as (
    update app_private.media_ingest_requests as request_value
    set status = 'dead_letter',
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = 'attempt_budget_exhausted',
        updated_at = statement_timestamp()
    where (target_organization_id is null or request_value.organization_id = target_organization_id)
      and request_value.attempt_count >= target_max_attempts
      and (
        (request_value.status in ('pending', 'retryable') and request_value.available_at <= statement_timestamp())
        or (request_value.status = 'processing' and request_value.lease_expires_at <= statement_timestamp())
      )
    returning request_value.id
  )
  select request_value.*
  into request_record
  from app_private.media_ingest_requests as request_value
  where (target_organization_id is null or request_value.organization_id = target_organization_id)
    and request_value.attempt_count < target_max_attempts
    and (
      (request_value.status in ('pending', 'retryable') and request_value.available_at <= statement_timestamp())
      or (request_value.status = 'processing' and request_value.lease_expires_at <= statement_timestamp())
    )
  order by request_value.available_at, request_value.created_at, request_value.id
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  select connection_value.*
  into connection_record
  from app_private.channel_connections as connection_value
  where connection_value.organization_id = request_record.organization_id
    and connection_value.id = request_record.channel_connection_id
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active';

  if not found then
    update app_private.media_ingest_requests
    set status = 'dead_letter',
        last_error_code = 'active_whatsapp_connection_not_found',
        updated_at = statement_timestamp()
    where organization_id = request_record.organization_id and id = request_record.id;
    return;
  end if;

  select secret_value.decrypted_secret
  into access_token_value
  from app_private.meta_credential_versions as credential_value
  join vault.decrypted_secrets as secret_value
    on secret_value.id = credential_value.vault_secret_id
  where credential_value.organization_id = request_record.organization_id
    and credential_value.channel_connection_id = request_record.channel_connection_id
    and credential_value.credential_kind = 'channel_access_token'
    and credential_value.status = 'current'
    and connection_record.credential_reference = 'meta-credential-version://' || credential_value.id::text
  order by credential_value.version_number desc
  limit 1;

  if access_token_value is null then
    update app_private.media_ingest_requests
    set status = 'retryable',
        last_error_code = 'current_whatsapp_credential_not_found',
        available_at = statement_timestamp() + interval '30 seconds',
        updated_at = statement_timestamp()
    where organization_id = request_record.organization_id and id = request_record.id;
    return;
  end if;

  select coalesce(inbound_value.request_id, 'message:' || request_record.message_id::text), inbound_value.trace_id
  into correlation_value, trace_value
  from app_private.messages as message_value
  left join app_private.inbound_events as inbound_value
    on inbound_value.organization_id = message_value.organization_id
   and inbound_value.channel_connection_id = message_value.channel_connection_id
   and inbound_value.id = message_value.source_inbound_event_id
  where message_value.organization_id = request_record.organization_id
    and message_value.channel_connection_id = request_record.channel_connection_id
    and message_value.id = request_record.message_id;

  claimed_lease_token := extensions.gen_random_uuid();
  claimed_lease_expires_at := statement_timestamp() + pg_catalog.make_interval(secs => target_lease_seconds);

  update app_private.media_ingest_requests
  set status = 'processing',
      attempt_count = attempt_count + 1,
      processing_started_at = statement_timestamp(),
      lease_owner = target_worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = claimed_lease_expires_at,
      last_error_code = null,
      updated_at = statement_timestamp()
  where organization_id = request_record.organization_id and id = request_record.id;

  perform app_private.insert_agent_audit_event(
    request_record.organization_id,
    'media.ingest.request_claimed',
    'worker',
    null,
    correlation_value,
    trace_value,
    jsonb_build_object(
      'request_id', request_record.id,
      'message_id', request_record.message_id,
      'attempt_number', request_record.attempt_count + 1,
      'lease_expires_at', claimed_lease_expires_at
    )
  );

  organization_id := request_record.organization_id;
  request_id := request_record.id;
  channel_connection_id := request_record.channel_connection_id;
  message_id := request_record.message_id;
  lease_token := claimed_lease_token;
  lease_expires_at := claimed_lease_expires_at;
  attempt_number := request_record.attempt_count + 1;
  api_version := connection_record.api_version;
  phone_number_id := connection_record.external_sender_id;
  provider_media_id := request_record.provider_media_id;
  declared_mime_type := request_record.declared_mime_type;
  declared_sha256_hex := request_record.declared_sha256_hex;
  declared_file_size := request_record.declared_file_size;
  correlation_id := correlation_value;
  trace_id := trace_value;
  access_token := access_token_value;
  return next;
end;
$$;

create function api.complete_whatsapp_media_ingest(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_media_asset_id uuid
)
returns table (request_id uuid, status text, media_asset_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record app_private.media_ingest_requests%rowtype;
  asset_record app_private.media_assets%rowtype;
  was_replay boolean := false;
begin
  if target_organization_id is null
    or target_request_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_media_asset_id is null then
    raise exception using errcode = '22023', message = 'media ingest completion arguments are invalid';
  end if;

  select * into request_record
  from app_private.media_ingest_requests
  where organization_id = target_organization_id and id = target_request_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'media ingest request was not found';
  end if;

  if request_record.status = 'succeeded' then
    if request_record.media_asset_id is distinct from target_media_asset_id then
      raise exception using errcode = '23514', message = 'media ingest completion replay conflicts';
    end if;
    was_replay := true;
  elsif request_record.status <> 'processing'
    or request_record.lease_owner is distinct from target_worker_id
    or request_record.lease_token is distinct from target_lease_token
    or request_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'media ingest request lease is invalid';
  else
    select * into asset_record
    from app_private.media_assets
    where organization_id = target_organization_id and id = target_media_asset_id;
    if not found or asset_record.source_message_id is distinct from request_record.message_id
      or asset_record.ingest_status <> 'verified' then
      raise exception using errcode = '23514', message = 'verified media asset is required';
    end if;

    update app_private.media_ingest_requests
    set status = 'succeeded',
        media_asset_id = target_media_asset_id,
        completed_at = statement_timestamp(),
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = null,
        updated_at = statement_timestamp()
    where organization_id = target_organization_id and id = target_request_id;

    update app_private.messages
    set status = 'received',
        processed_at = null,
        updated_at = statement_timestamp()
    where organization_id = target_organization_id
      and channel_connection_id = request_record.channel_connection_id
      and id = request_record.message_id
      and status = 'processed';

    perform app_private.insert_agent_audit_event(
      target_organization_id,
      'media.ingest.request_succeeded',
      'worker',
      null,
      'media-request:' || target_request_id::text,
      null,
      jsonb_build_object('request_id', target_request_id, 'media_asset_id', target_media_asset_id)
    );
  end if;

  request_id := target_request_id;
  status := 'succeeded';
  media_asset_id := target_media_asset_id;
  was_replayed := was_replay;
  return next;
end;
$$;

create function api.fail_whatsapp_media_ingest(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_error_code text,
  target_retryable boolean,
  target_retry_delay_seconds integer default 30,
  target_max_attempts integer default 8
)
returns table (request_id uuid, status text, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record app_private.media_ingest_requests%rowtype;
  next_status text;
begin
  if target_organization_id is null
    or target_request_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_error_code is null
    or btrim(target_error_code) = ''
    or char_length(target_error_code) > 160
    or target_retry_delay_seconds not between 1 and 86400
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'media ingest failure arguments are invalid';
  end if;

  select * into request_record
  from app_private.media_ingest_requests
  where organization_id = target_organization_id and id = target_request_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'media ingest request was not found';
  end if;

  if request_record.status in ('succeeded', 'rejected', 'dead_letter') then
    request_id := request_record.id;
    status := request_record.status;
    was_replayed := true;
    return next;
    return;
  end if;
  if request_record.status <> 'processing'
    or request_record.lease_owner is distinct from target_worker_id
    or request_record.lease_token is distinct from target_lease_token
    or request_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'media ingest failure lease is invalid';
  end if;

  next_status := case when target_retryable and request_record.attempt_count < target_max_attempts
    then 'retryable' else case when target_retryable then 'dead_letter' else 'rejected' end end;
  update app_private.media_ingest_requests
  set status = next_status,
      available_at = case when next_status = 'retryable'
        then statement_timestamp() + pg_catalog.make_interval(secs => target_retry_delay_seconds)
        else available_at end,
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = btrim(target_error_code),
      completed_at = case when next_status in ('rejected', 'dead_letter') then statement_timestamp() else null end,
      updated_at = statement_timestamp()
  where organization_id = target_organization_id and id = target_request_id;

  if next_status in ('rejected', 'dead_letter') then
    update app_private.messages
    set status = 'received',
        processed_at = null,
        updated_at = statement_timestamp()
    where organization_id = target_organization_id
      and channel_connection_id = request_record.channel_connection_id
      and id = request_record.message_id
      and status = 'processed';
  end if;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'media.ingest.request_failed',
    'worker',
    null,
    'media-request:' || target_request_id::text,
    null,
    jsonb_build_object(
      'request_id', target_request_id,
      'error_code', btrim(target_error_code),
      'status', next_status,
      'attempt_number', request_record.attempt_count
    )
  );

  request_id := target_request_id;
  status := next_status;
  was_replayed := false;
  return next;
end;
$$;

create function api.get_whatsapp_media_visual_inputs(
  target_organization_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_message_ids uuid[]
)
returns table (
  message_id uuid,
  media_asset_id uuid,
  analysis_sha256_hex text,
  mime_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.job_attempts%rowtype;
begin
  if target_organization_id is null
    or target_job_attempt_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_message_ids is null
    or cardinality(target_message_ids) > 24 then
    raise exception using errcode = '22023', message = 'media visual input arguments are invalid';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id
    and attempt_value.worker_id = target_worker_id
    and attempt_value.lease_token = target_lease_token
    and attempt_value.status = 'running'
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'media visual input lease is invalid';
  end if;

  return query
  select
    request_value.message_id,
    request_value.media_asset_id,
    encode(object_value.content_sha256, 'hex') as analysis_sha256_hex,
    object_value.mime_type
  from app_private.media_ingest_requests as request_value
  join app_private.media_asset_objects as object_value
    on object_value.organization_id = request_value.organization_id
   and object_value.media_asset_id = request_value.media_asset_id
   and object_value.rendition_kind = 'analysis_webp'
   and object_value.status = 'verified'
  where request_value.organization_id = target_organization_id
    and request_value.message_id = any(target_message_ids)
    and request_value.status = 'succeeded'
    and request_value.media_asset_id is not null
  order by request_value.message_id;
end;
$$;

alter table app_private.media_ingest_requests enable row level security;
alter table app_private.media_ingest_requests force row level security;

revoke all on table app_private.media_ingest_requests from public, anon, authenticated, service_role;
revoke all on function app_private.enqueue_whatsapp_image_ingest() from public, anon, authenticated, service_role;
revoke all on function api.claim_whatsapp_media_ingest(text, integer, integer, uuid) from public, anon, authenticated, service_role;
revoke all on function api.complete_whatsapp_media_ingest(uuid, uuid, text, uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function api.fail_whatsapp_media_ingest(uuid, uuid, text, uuid, text, boolean, integer, integer) from public, anon, authenticated, service_role;
revoke all on function api.get_whatsapp_media_visual_inputs(uuid, uuid, text, uuid, uuid[]) from public, anon, authenticated, service_role;

grant execute on function api.claim_whatsapp_media_ingest(text, integer, integer, uuid) to service_role;
grant execute on function api.complete_whatsapp_media_ingest(uuid, uuid, text, uuid, uuid) to service_role;
grant execute on function api.fail_whatsapp_media_ingest(uuid, uuid, text, uuid, text, boolean, integer, integer) to service_role;
grant execute on function api.get_whatsapp_media_visual_inputs(uuid, uuid, text, uuid, uuid[]) to service_role;

comment on table app_private.media_ingest_requests is
  'Durable tenant-scoped WhatsApp image ingestion leases; binary data and credentials never persist here';
comment on function api.claim_whatsapp_media_ingest(text, integer, integer, uuid) is
  'Claims one WhatsApp image and exposes the current Vault token only to the leased service worker';
comment on function api.complete_whatsapp_media_ingest(uuid, uuid, text, uuid, uuid) is
  'Completes an image request only after a verified media asset with Storage objects exists';
comment on function api.fail_whatsapp_media_ingest(uuid, uuid, text, uuid, text, boolean, integer, integer) is
  'Idempotently transitions a leased image request to retryable, rejected, or dead letter';
comment on function api.get_whatsapp_media_visual_inputs(uuid, uuid, text, uuid, uuid[]) is
  'Returns only verified private analysis renditions for the active tenant-scoped agent lease';

notify pgrst, 'reload schema';

commit;
