begin;

-- A Meta callback can contain events for more than one Page or WhatsApp
-- sender. Persist the authenticated delivery at the opaque webhook endpoint
-- boundary first; B4-003 will normalize each entry to its channel connection.

alter table app_private.meta_credential_versions
  add constraint meta_credential_versions_scope_application_id_unique
  unique (organization_id, meta_application_id, id);

create table app_private.meta_webhook_deliveries (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  meta_application_id uuid not null,
  webhook_endpoint_id uuid not null,
  initial_credential_version_id uuid not null,
  latest_credential_version_id uuid not null,
  provider_object_type text not null,
  payload_sha256 bytea not null,
  payload jsonb not null,
  status text not null default 'received',
  delivery_count integer not null default 1,
  attempt_count integer not null default 0,
  first_received_at timestamptz not null default statement_timestamp(),
  last_received_at timestamptz not null default statement_timestamp(),
  signature_verified_at timestamptz not null default statement_timestamp(),
  available_at timestamptz not null default statement_timestamp(),
  processing_started_at timestamptz,
  completed_at timestamptz,
  last_error_code text,
  first_request_id text not null,
  latest_request_id text not null,
  first_trace_id text,
  latest_trace_id text,
  updated_at timestamptz not null default statement_timestamp(),
  constraint meta_webhook_deliveries_scope_id_unique
    unique (organization_id, id),
  constraint meta_webhook_deliveries_endpoint_payload_unique
    unique (webhook_endpoint_id, payload_sha256),
  constraint meta_webhook_deliveries_application_fk
    foreign key (organization_id, meta_application_id)
    references app_private.meta_applications (organization_id, id)
    on delete restrict,
  constraint meta_webhook_deliveries_endpoint_fk
    foreign key (organization_id, meta_application_id, webhook_endpoint_id)
    references app_private.meta_webhook_endpoints (
      organization_id,
      meta_application_id,
      id
    )
    on delete restrict,
  constraint meta_webhook_deliveries_initial_credential_fk
    foreign key (
      organization_id,
      meta_application_id,
      initial_credential_version_id
    )
    references app_private.meta_credential_versions (
      organization_id,
      meta_application_id,
      id
    )
    on delete restrict,
  constraint meta_webhook_deliveries_latest_credential_fk
    foreign key (
      organization_id,
      meta_application_id,
      latest_credential_version_id
    )
    references app_private.meta_credential_versions (
      organization_id,
      meta_application_id,
      id
    )
    on delete restrict,
  constraint meta_webhook_deliveries_object_type_valid check (
    provider_object_type = btrim(provider_object_type)
    and char_length(provider_object_type) between 1 and 160
  ),
  constraint meta_webhook_deliveries_payload_sha256_valid
    check (octet_length(payload_sha256) = 32),
  constraint meta_webhook_deliveries_payload_valid check (
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload -> 'object') = 'string'
    and jsonb_typeof(payload -> 'entry') = 'array'
    and jsonb_array_length(payload -> 'entry') between 1 and 100
    and octet_length(payload::text) <= 1048576
  ),
  constraint meta_webhook_deliveries_status_valid check (
    status in (
      'received',
      'processing',
      'retryable',
      'routed',
      'ignored',
      'dead_letter'
    )
  ),
  constraint meta_webhook_deliveries_delivery_count_valid
    check (delivery_count > 0),
  constraint meta_webhook_deliveries_attempt_count_valid
    check (attempt_count >= 0),
  constraint meta_webhook_deliveries_lifecycle_valid check (
    (status <> 'processing' or processing_started_at is not null)
    and (
      status not in ('routed', 'ignored', 'dead_letter')
      or completed_at is not null
    )
  ),
  constraint meta_webhook_deliveries_error_code_valid check (
    last_error_code is null
    or (
      last_error_code = btrim(last_error_code)
      and char_length(last_error_code) between 1 and 120
    )
  ),
  constraint meta_webhook_deliveries_first_request_valid check (
    first_request_id = btrim(first_request_id)
    and char_length(first_request_id) between 1 and 128
  ),
  constraint meta_webhook_deliveries_latest_request_valid check (
    latest_request_id = btrim(latest_request_id)
    and char_length(latest_request_id) between 1 and 128
  ),
  constraint meta_webhook_deliveries_first_trace_valid check (
    first_trace_id is null
    or (
      first_trace_id = btrim(first_trace_id)
      and char_length(first_trace_id) between 1 and 128
    )
  ),
  constraint meta_webhook_deliveries_latest_trace_valid check (
    latest_trace_id is null
    or (
      latest_trace_id = btrim(latest_trace_id)
      and char_length(latest_trace_id) between 1 and 128
    )
  ),
  constraint meta_webhook_deliveries_timestamps_valid check (
    signature_verified_at <= first_received_at
    and last_received_at >= first_received_at
    and available_at >= first_received_at
    and (
      processing_started_at is null
      or processing_started_at >= first_received_at
    )
    and (completed_at is null or completed_at >= first_received_at)
    and updated_at >= first_received_at
  )
);

create index meta_webhook_deliveries_claim_idx
  on app_private.meta_webhook_deliveries (available_at, first_received_at, id)
  where status in ('received', 'retryable');

create index meta_webhook_deliveries_application_timeline_idx
  on app_private.meta_webhook_deliveries (
    organization_id,
    meta_application_id,
    last_received_at desc,
    id
  );

create function app_private.reject_meta_webhook_delivery_core_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.meta_application_id is distinct from old.meta_application_id
    or new.webhook_endpoint_id is distinct from old.webhook_endpoint_id
    or new.initial_credential_version_id is distinct from old.initial_credential_version_id
    or new.provider_object_type is distinct from old.provider_object_type
    or new.payload_sha256 is distinct from old.payload_sha256
    or new.payload is distinct from old.payload
    or new.first_received_at is distinct from old.first_received_at
    or new.signature_verified_at is distinct from old.signature_verified_at
    or new.first_request_id is distinct from old.first_request_id
    or new.first_trace_id is distinct from old.first_trace_id then
    raise exception using
      errcode = '23514',
      message = 'Meta webhook authenticated delivery evidence is immutable';
  end if;

  return new;
end;
$$;

create trigger meta_webhook_deliveries_reject_core_mutation
before update on app_private.meta_webhook_deliveries
for each row execute function app_private.reject_meta_webhook_delivery_core_mutation();

create function api.accept_meta_webhook_challenge(
  target_endpoint_key uuid,
  target_mode text,
  target_verify_token text,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  organization_id uuid,
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  external_app_id text,
  credential_version_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  verification record;
begin
  if target_mode is distinct from 'subscribe' then
    raise exception using
      errcode = '42501',
      message = 'Meta webhook challenge is invalid';
  end if;

  if target_correlation_id is null
    or target_correlation_id <> btrim(target_correlation_id)
    or char_length(target_correlation_id) not between 1 and 128
    or (
      target_trace_id is not null
      and (
        target_trace_id <> btrim(target_trace_id)
        or char_length(target_trace_id) not between 1 and 128
      )
    ) then
    raise exception using
      errcode = '22023',
      message = 'Meta webhook correlation is invalid';
  end if;

  select challenge.*
  into verification
  from api.verify_meta_webhook_challenge(
    target_endpoint_key,
    target_verify_token
  ) as challenge
  limit 1;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Meta webhook challenge is invalid';
  end if;

  perform api.confirm_meta_webhook_verification(
    target_endpoint_key,
    verification.credential_version_id,
    target_correlation_id,
    target_trace_id
  );

  return query
  select
    verification.organization_id,
    verification.meta_application_id,
    verification.webhook_endpoint_id,
    verification.external_app_id,
    verification.credential_version_id;
end;
$$;

create function api.ingest_meta_webhook_delivery(
  target_endpoint_key uuid,
  target_raw_body_base64 text,
  target_signature_hex text,
  target_request_id text,
  target_trace_id text default null
)
returns table (
  delivery_id uuid,
  organization_id uuid,
  meta_application_id uuid,
  webhook_endpoint_id uuid,
  credential_version_id uuid,
  provider_object_type text,
  replayed boolean,
  delivery_count integer,
  delivery_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_body bytea;
  signature_value bytea;
  payload_value jsonb;
  payload_hash bytea;
  object_type text;
  verification record;
  delivery app_private.meta_webhook_deliveries;
begin
  if target_raw_body_base64 is null
    or char_length(target_raw_body_base64) not between 4 and 1398104
    or target_signature_hex is null
    or char_length(target_signature_hex) <> 64
    or translate(lower(target_signature_hex), '0123456789abcdef', '') <> ''
    or target_request_id is null
    or target_request_id <> btrim(target_request_id)
    or char_length(target_request_id) not between 1 and 128
    or (
      target_trace_id is not null
      and (
        target_trace_id <> btrim(target_trace_id)
        or char_length(target_trace_id) not between 1 and 128
      )
    ) then
    raise exception using
      errcode = '22023',
      message = 'Meta webhook envelope is invalid';
  end if;

  begin
    raw_body := decode(target_raw_body_base64, 'base64');
    signature_value := decode(target_signature_hex, 'hex');
  exception
    when data_exception then
      raise exception using
        errcode = '22023',
        message = 'Meta webhook envelope is invalid';
  end;

  if octet_length(raw_body) not between 2 and 1048576
    or octet_length(signature_value) <> 32 then
    raise exception using
      errcode = '22023',
      message = 'Meta webhook envelope is invalid';
  end if;

  select signature_check.*
  into verification
  from api.verify_meta_webhook_signature(
    target_endpoint_key,
    raw_body,
    signature_value
  ) as signature_check
  limit 1;

  if not found then
    raise exception using
      errcode = '42501',
      message = 'Meta webhook signature is invalid';
  end if;

  begin
    payload_value := convert_from(raw_body, 'UTF8')::jsonb;
  exception
    when data_exception then
      raise exception using
        errcode = '22023',
        message = 'Meta webhook payload is invalid';
  end;

  if jsonb_typeof(payload_value) is distinct from 'object'
    or jsonb_typeof(payload_value -> 'object') is distinct from 'string'
    or jsonb_typeof(payload_value -> 'entry') is distinct from 'array'
    or jsonb_array_length(payload_value -> 'entry') not between 1 and 100 then
    raise exception using
      errcode = '22023',
      message = 'Meta webhook payload is invalid';
  end if;

  object_type := payload_value ->> 'object';

  if object_type is null
    or object_type <> btrim(object_type)
    or char_length(object_type) not between 1 and 160 then
    raise exception using
      errcode = '22023',
      message = 'Meta webhook payload is invalid';
  end if;

  payload_hash := extensions.digest(raw_body, 'sha256');

  insert into app_private.meta_webhook_deliveries (
    organization_id,
    meta_application_id,
    webhook_endpoint_id,
    initial_credential_version_id,
    latest_credential_version_id,
    provider_object_type,
    payload_sha256,
    payload,
    signature_verified_at,
    first_request_id,
    latest_request_id,
    first_trace_id,
    latest_trace_id
  ) values (
    verification.organization_id,
    verification.meta_application_id,
    verification.webhook_endpoint_id,
    verification.credential_version_id,
    verification.credential_version_id,
    object_type,
    payload_hash,
    payload_value,
    statement_timestamp(),
    target_request_id,
    target_request_id,
    target_trace_id,
    target_trace_id
  )
  on conflict on constraint meta_webhook_deliveries_endpoint_payload_unique do nothing
  returning * into delivery;

  if found then
    return query
    select
      delivery.id,
      delivery.organization_id,
      delivery.meta_application_id,
      delivery.webhook_endpoint_id,
      delivery.latest_credential_version_id,
      delivery.provider_object_type,
      false,
      delivery.delivery_count,
      delivery.status;
    return;
  end if;

  update app_private.meta_webhook_deliveries as existing_delivery
  set latest_credential_version_id = verification.credential_version_id,
      delivery_count = existing_delivery.delivery_count + 1,
      last_received_at = statement_timestamp(),
      latest_request_id = target_request_id,
      latest_trace_id = target_trace_id,
      updated_at = statement_timestamp()
  where existing_delivery.webhook_endpoint_id = verification.webhook_endpoint_id
    and existing_delivery.payload_sha256 = payload_hash
  returning existing_delivery.* into delivery;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'Meta webhook replay resolution must be retried';
  end if;

  return query
  select
    delivery.id,
    delivery.organization_id,
    delivery.meta_application_id,
    delivery.webhook_endpoint_id,
    delivery.latest_credential_version_id,
    delivery.provider_object_type,
    true,
    delivery.delivery_count,
    delivery.status;
end;
$$;

alter table app_private.meta_webhook_deliveries enable row level security;
alter table app_private.meta_webhook_deliveries force row level security;

revoke all on app_private.meta_webhook_deliveries
  from public, anon, authenticated, service_role;
revoke all on function app_private.reject_meta_webhook_delivery_core_mutation()
  from public, anon, authenticated, service_role;
revoke all on function api.accept_meta_webhook_challenge(uuid, text, text, text, text)
  from public, anon, authenticated, service_role;
revoke all on function api.ingest_meta_webhook_delivery(uuid, text, text, text, text)
  from public, anon, authenticated, service_role;

grant execute on function api.accept_meta_webhook_challenge(uuid, text, text, text, text)
  to service_role;
grant execute on function api.ingest_meta_webhook_delivery(uuid, text, text, text, text)
  to service_role;

comment on table app_private.meta_webhook_deliveries is
  'Private authenticated Meta delivery inbox; routing to channel-scoped inbound events occurs asynchronously';
comment on function api.accept_meta_webhook_challenge(uuid, text, text, text, text) is
  'Service-only atomic Meta challenge verification and endpoint activation using Vault material';
comment on function api.ingest_meta_webhook_delivery(uuid, text, text, text, text) is
  'Service-only raw-body HMAC verification, bounded JSON ingestion and idempotent replay accounting';

notify pgrst, 'reload schema';

commit;
