begin;

alter table app_private.meta_webhook_deliveries
  add column lease_owner text,
  add column lease_token uuid,
  add column lease_expires_at timestamptz,
  add constraint meta_webhook_deliveries_lease_owner_valid check (
    lease_owner is null
    or (
      lease_owner = btrim(lease_owner)
      and char_length(lease_owner) between 1 and 160
    )
  ),
  add constraint meta_webhook_deliveries_lease_shape_valid check (
    (
      status = 'processing'
      and processing_started_at is not null
      and lease_owner is not null
      and lease_token is not null
      and lease_expires_at is not null
      and lease_expires_at > processing_started_at
    )
    or (
      status <> 'processing'
      and processing_started_at is null
      and lease_owner is null
      and lease_token is null
      and lease_expires_at is null
    )
  );

alter table app_private.inbound_events
  add column lease_owner text,
  add column lease_token uuid,
  add column lease_expires_at timestamptz,
  add constraint inbound_events_lease_owner_valid check (
    lease_owner is null
    or (
      lease_owner = btrim(lease_owner)
      and char_length(lease_owner) between 1 and 160
    )
  ),
  add constraint inbound_events_lease_shape_valid check (
    (
      status = 'processing'
      and processing_started_at is not null
      and lease_owner is not null
      and lease_token is not null
      and lease_expires_at is not null
      and lease_expires_at > processing_started_at
    )
    or (
      status <> 'processing'
      and processing_started_at is null
      and lease_owner is null
      and lease_token is null
      and lease_expires_at is null
    )
  );

create index meta_webhook_deliveries_object_claim_idx
  on app_private.meta_webhook_deliveries (
    provider_object_type,
    available_at,
    first_received_at,
    id
  )
  where status in ('received', 'retryable', 'processing');

create index inbound_events_type_claim_idx
  on app_private.inbound_events (
    event_type,
    available_at,
    received_at,
    id
  )
  where status in ('received', 'retryable', 'processing');

create function api.claim_meta_webhook_delivery(
  target_worker_id text,
  target_provider_object_type text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8
)
returns table (
  delivery_id uuid,
  organization_id uuid,
  meta_application_id uuid,
  provider_object_type text,
  attempt_number integer,
  lease_token uuid,
  lease_expires_at timestamptz,
  correlation_id text,
  trace_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_record app_private.meta_webhook_deliveries%rowtype;
  claimed_lease_token uuid;
  claimed_lease_expires_at timestamptz;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_provider_object_type is null
    or target_provider_object_type <> btrim(target_provider_object_type)
    or char_length(target_provider_object_type) not between 1 and 160
    or target_lease_seconds not between 15 and 900
    or target_max_attempts not between 1 and 100 then
    raise exception using
      errcode = '22023',
      message = 'Meta delivery claim parameters are invalid';
  end if;

  with exhausted as (
    update app_private.meta_webhook_deliveries as delivery_value
    set status = 'dead_letter',
        completed_at = clock_timestamp(),
        last_error_code = 'attempt_budget_exhausted',
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        updated_at = clock_timestamp()
    where delivery_value.provider_object_type = target_provider_object_type
      and delivery_value.attempt_count >= target_max_attempts
      and (
        (
          delivery_value.status in ('received', 'retryable')
          and delivery_value.available_at <= clock_timestamp()
        )
        or (
          delivery_value.status = 'processing'
          and delivery_value.lease_expires_at <= clock_timestamp()
        )
      )
    returning delivery_value.*
  )
  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    correlation_id,
    trace_id,
    metadata_safe
  )
  select
    exhausted.organization_id,
    'meta.webhook.delivery_dead_lettered',
    'worker',
    exhausted.latest_request_id,
    exhausted.latest_trace_id,
    jsonb_build_object(
      'delivery_id', exhausted.id,
      'reason', 'attempt_budget_exhausted',
      'attempt_count', exhausted.attempt_count
    )
  from exhausted;

  select delivery_value.*
  into delivery_record
  from app_private.meta_webhook_deliveries as delivery_value
  where delivery_value.provider_object_type = target_provider_object_type
    and delivery_value.attempt_count < target_max_attempts
    and (
      (
        delivery_value.status in ('received', 'retryable')
        and delivery_value.available_at <= clock_timestamp()
      )
      or (
        delivery_value.status = 'processing'
        and delivery_value.lease_expires_at <= clock_timestamp()
      )
    )
  order by delivery_value.available_at, delivery_value.first_received_at, delivery_value.id
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  claimed_lease_token := extensions.gen_random_uuid();
  claimed_lease_expires_at := clock_timestamp()
    + pg_catalog.make_interval(secs => target_lease_seconds);

  update app_private.meta_webhook_deliveries
  set status = 'processing',
      attempt_count = attempt_count + 1,
      processing_started_at = clock_timestamp(),
      lease_owner = target_worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = claimed_lease_expires_at,
      completed_at = null,
      last_error_code = null,
      updated_at = clock_timestamp()
  where id = delivery_record.id;

  perform app_private.insert_agent_audit_event(
    delivery_record.organization_id,
    'meta.webhook.delivery_claimed',
    'worker',
    null,
    delivery_record.latest_request_id,
    delivery_record.latest_trace_id,
    jsonb_build_object(
      'delivery_id', delivery_record.id,
      'attempt_number', delivery_record.attempt_count + 1,
      'lease_expires_at', claimed_lease_expires_at
    )
  );

  delivery_id := delivery_record.id;
  organization_id := delivery_record.organization_id;
  meta_application_id := delivery_record.meta_application_id;
  provider_object_type := delivery_record.provider_object_type;
  attempt_number := delivery_record.attempt_count + 1;
  lease_token := claimed_lease_token;
  lease_expires_at := claimed_lease_expires_at;
  correlation_id := delivery_record.latest_request_id;
  trace_id := delivery_record.latest_trace_id;
  return next;
end;
$$;

create function api.route_meta_whatsapp_delivery(
  target_delivery_id uuid,
  target_lease_token uuid
)
returns table (
  delivery_id uuid,
  delivery_status text,
  inserted_event_count integer,
  replayed_event_count integer,
  ignored_change_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_record app_private.meta_webhook_deliveries%rowtype;
  connection_record app_private.channel_connections%rowtype;
  entry_value jsonb;
  change_value jsonb;
  provider_value jsonb;
  metadata_value jsonb;
  message_value jsonb;
  status_value jsonb;
  contact_value jsonb;
  waba_id text;
  phone_number_id text;
  provider_event_id text;
  provider_timestamp text;
  provider_occurred_at timestamptz;
  event_payload jsonb;
  event_deduplication_key bytea;
  inserted_count integer := 0;
  replayed_count integer := 0;
  ignored_count integer := 0;
  parsed_event_count integer := 0;
  affected_rows integer;
  target_delivery_status text;
begin
  if target_delivery_id is null or target_lease_token is null then
    raise exception using errcode = '22023', message = 'Meta delivery lease identity is required';
  end if;

  select delivery_value.*
  into delivery_record
  from app_private.meta_webhook_deliveries as delivery_value
  where delivery_value.id = target_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Meta delivery was not found';
  end if;

  if delivery_record.status <> 'processing'
    or delivery_record.lease_token is distinct from target_lease_token
    or delivery_record.lease_expires_at <= clock_timestamp() then
    raise exception using errcode = '40001', message = 'Meta delivery lease is stale';
  end if;

  if delivery_record.provider_object_type <> 'whatsapp_business_account'
    or delivery_record.payload ->> 'object' <> 'whatsapp_business_account'
    or jsonb_typeof(delivery_record.payload -> 'entry') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Meta delivery is not a WhatsApp payload';
  end if;

  for entry_value in
    select entry_item
    from jsonb_array_elements(delivery_record.payload -> 'entry') as entry_items(entry_item)
  loop
    if jsonb_typeof(entry_value) is distinct from 'object'
      or jsonb_typeof(entry_value -> 'id') is distinct from 'string'
      or jsonb_typeof(entry_value -> 'changes') is distinct from 'array'
      or jsonb_array_length(entry_value -> 'changes') > 1000 then
      raise exception using errcode = '22023', message = 'WhatsApp entry shape is invalid';
    end if;

    waba_id := entry_value ->> 'id';
    if waba_id <> btrim(waba_id)
      or char_length(waba_id) not between 1 and 64
      or char_length(translate(waba_id, '0123456789', '')) <> 0 then
      raise exception using errcode = '22023', message = 'WhatsApp WABA identifier is invalid';
    end if;

    for change_value in
      select change_item
      from jsonb_array_elements(entry_value -> 'changes') as change_items(change_item)
    loop
      if jsonb_typeof(change_value) is distinct from 'object'
        or jsonb_typeof(change_value -> 'field') is distinct from 'string'
        or jsonb_typeof(change_value -> 'value') is distinct from 'object' then
        raise exception using errcode = '22023', message = 'WhatsApp change shape is invalid';
      end if;

      if change_value ->> 'field' <> 'messages' then
        ignored_count := ignored_count + 1;
        continue;
      end if;

      provider_value := change_value -> 'value';
      metadata_value := provider_value -> 'metadata';

      if provider_value ->> 'messaging_product' <> 'whatsapp'
        or jsonb_typeof(metadata_value) is distinct from 'object'
        or jsonb_typeof(metadata_value -> 'phone_number_id') is distinct from 'string' then
        raise exception using errcode = '22023', message = 'WhatsApp message metadata is invalid';
      end if;

      phone_number_id := metadata_value ->> 'phone_number_id';
      if phone_number_id <> btrim(phone_number_id)
        or char_length(phone_number_id) not between 1 and 64
        or char_length(translate(phone_number_id, '0123456789', '')) <> 0 then
        raise exception using errcode = '22023', message = 'WhatsApp phone number identifier is invalid';
      end if;

      select connection_value.*
      into connection_record
      from app_private.channel_connections as connection_value
      where connection_value.organization_id = delivery_record.organization_id
        and connection_value.meta_application_id = delivery_record.meta_application_id
        and connection_value.provider = 'meta'
        and connection_value.channel = 'whatsapp'
        and connection_value.external_account_id = waba_id
        and connection_value.external_sender_id = phone_number_id
        and connection_value.status = 'active';

      if not found then
        raise exception using
          errcode = '55000',
          message = 'WhatsApp delivery has no exact active tenant connection';
      end if;

      if provider_value ? 'messages' then
        if jsonb_typeof(provider_value -> 'messages') is distinct from 'array'
          or jsonb_array_length(provider_value -> 'messages') > 1000 then
          raise exception using errcode = '22023', message = 'WhatsApp messages collection is invalid';
        end if;

        for message_value in
          select message_item
          from jsonb_array_elements(provider_value -> 'messages') as message_items(message_item)
        loop
          parsed_event_count := parsed_event_count + 1;
          if parsed_event_count > 1000 then
            raise exception using errcode = '22023', message = 'WhatsApp delivery contains too many events';
          end if;

          if jsonb_typeof(message_value) is distinct from 'object'
            or jsonb_typeof(message_value -> 'id') is distinct from 'string'
            or jsonb_typeof(message_value -> 'from') is distinct from 'string'
            or jsonb_typeof(message_value -> 'timestamp') is distinct from 'string'
            or jsonb_typeof(message_value -> 'type') is distinct from 'string' then
            raise exception using errcode = '22023', message = 'WhatsApp message identity is invalid';
          end if;

          provider_event_id := message_value ->> 'id';
          provider_timestamp := message_value ->> 'timestamp';

          if provider_event_id <> btrim(provider_event_id)
            or char_length(provider_event_id) not between 1 and 512
            or (message_value ->> 'from') <> btrim(message_value ->> 'from')
            or char_length(message_value ->> 'from') not between 1 and 64
            or char_length(translate(message_value ->> 'from', '0123456789', '')) <> 0
            or (message_value ->> 'type') <> btrim(message_value ->> 'type')
            or char_length(message_value ->> 'type') not between 1 and 120
            or provider_timestamp <> btrim(provider_timestamp)
            or char_length(provider_timestamp) not between 1 and 20
            or char_length(translate(provider_timestamp, '0123456789', '')) <> 0 then
            raise exception using errcode = '22023', message = 'WhatsApp message fields are invalid';
          end if;

          provider_occurred_at := to_timestamp(provider_timestamp::double precision);
          if provider_occurred_at < timestamptz '2000-01-01 00:00:00+00'
            or provider_occurred_at > statement_timestamp() + interval '1 day' then
            raise exception using errcode = '22023', message = 'WhatsApp message timestamp is invalid';
          end if;

          contact_value := null;
          if jsonb_typeof(provider_value -> 'contacts') = 'array' then
            select contact_item
            into contact_value
            from jsonb_array_elements(provider_value -> 'contacts') as contact_items(contact_item)
            where jsonb_typeof(contact_item) = 'object'
              and contact_item ->> 'wa_id' = message_value ->> 'from'
            limit 1;
          end if;

          event_payload := jsonb_strip_nulls(
            jsonb_build_object(
              'waba_id', waba_id,
              'metadata', metadata_value,
              'contact', contact_value,
              'message', message_value
            )
          );

          if octet_length(event_payload::text) > 1048576 then
            raise exception using errcode = '22023', message = 'WhatsApp message event is too large';
          end if;

          event_deduplication_key := extensions.digest(
            convert_to('whatsapp.message:' || provider_event_id, 'UTF8'),
            'sha256'
          );

          insert into app_private.inbound_events (
            organization_id,
            channel_connection_id,
            event_type,
            provider_event_id,
            deduplication_key,
            payload_sha256,
            payload,
            provider_occurred_at,
            received_at,
            signature_verified_at,
            request_id,
            trace_id
          ) values (
            delivery_record.organization_id,
            connection_record.id,
            'whatsapp.message',
            provider_event_id,
            event_deduplication_key,
            extensions.digest(convert_to(event_payload::text, 'UTF8'), 'sha256'),
            event_payload,
            provider_occurred_at,
            delivery_record.first_received_at,
            delivery_record.signature_verified_at,
            delivery_record.latest_request_id,
            delivery_record.latest_trace_id
          )
          on conflict (channel_connection_id, deduplication_key) do nothing;

          get diagnostics affected_rows = row_count;
          if affected_rows = 1 then
            inserted_count := inserted_count + 1;
          else
            replayed_count := replayed_count + 1;
          end if;
        end loop;
      end if;

      if provider_value ? 'statuses' then
        if jsonb_typeof(provider_value -> 'statuses') is distinct from 'array'
          or jsonb_array_length(provider_value -> 'statuses') > 1000 then
          raise exception using errcode = '22023', message = 'WhatsApp statuses collection is invalid';
        end if;

        for status_value in
          select status_item
          from jsonb_array_elements(provider_value -> 'statuses') as status_items(status_item)
        loop
          parsed_event_count := parsed_event_count + 1;
          if parsed_event_count > 1000 then
            raise exception using errcode = '22023', message = 'WhatsApp delivery contains too many events';
          end if;

          if jsonb_typeof(status_value) is distinct from 'object'
            or jsonb_typeof(status_value -> 'id') is distinct from 'string'
            or jsonb_typeof(status_value -> 'status') is distinct from 'string'
            or jsonb_typeof(status_value -> 'timestamp') is distinct from 'string' then
            raise exception using errcode = '22023', message = 'WhatsApp status identity is invalid';
          end if;

          provider_event_id := status_value ->> 'id';
          provider_timestamp := status_value ->> 'timestamp';
          if provider_event_id <> btrim(provider_event_id)
            or char_length(provider_event_id) not between 1 and 512
            or (status_value ->> 'status') not in ('sent', 'delivered', 'read', 'failed', 'deleted')
            or provider_timestamp <> btrim(provider_timestamp)
            or char_length(provider_timestamp) not between 1 and 20
            or char_length(translate(provider_timestamp, '0123456789', '')) <> 0 then
            raise exception using errcode = '22023', message = 'WhatsApp status fields are invalid';
          end if;

          provider_occurred_at := to_timestamp(provider_timestamp::double precision);
          if provider_occurred_at < timestamptz '2000-01-01 00:00:00+00'
            or provider_occurred_at > statement_timestamp() + interval '1 day' then
            raise exception using errcode = '22023', message = 'WhatsApp status timestamp is invalid';
          end if;

          event_payload := jsonb_build_object(
            'waba_id', waba_id,
            'metadata', metadata_value,
            'status', status_value
          );
          event_deduplication_key := extensions.digest(
            convert_to(
              'whatsapp.status:'
              || provider_event_id
              || ':'
              || (status_value ->> 'status')
              || ':'
              || provider_timestamp,
              'UTF8'
            ),
            'sha256'
          );

          insert into app_private.inbound_events (
            organization_id,
            channel_connection_id,
            event_type,
            provider_event_id,
            deduplication_key,
            payload_sha256,
            payload,
            provider_occurred_at,
            received_at,
            signature_verified_at,
            request_id,
            trace_id
          ) values (
            delivery_record.organization_id,
            connection_record.id,
            'whatsapp.status',
            null,
            event_deduplication_key,
            extensions.digest(convert_to(event_payload::text, 'UTF8'), 'sha256'),
            event_payload,
            provider_occurred_at,
            delivery_record.first_received_at,
            delivery_record.signature_verified_at,
            delivery_record.latest_request_id,
            delivery_record.latest_trace_id
          )
          on conflict (channel_connection_id, deduplication_key) do nothing;

          get diagnostics affected_rows = row_count;
          if affected_rows = 1 then
            inserted_count := inserted_count + 1;
          else
            replayed_count := replayed_count + 1;
          end if;
        end loop;
      end if;

      if not (provider_value ? 'messages') and not (provider_value ? 'statuses') then
        ignored_count := ignored_count + 1;
      end if;
    end loop;
  end loop;

  target_delivery_status := case
    when inserted_count + replayed_count > 0 then 'routed'
    else 'ignored'
  end;

  update app_private.meta_webhook_deliveries
  set status = target_delivery_status,
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      completed_at = clock_timestamp(),
      last_error_code = null,
      updated_at = clock_timestamp()
  where id = delivery_record.id;

  perform app_private.insert_agent_audit_event(
    delivery_record.organization_id,
    'meta.whatsapp.delivery_routed',
    'worker',
    null,
    delivery_record.latest_request_id,
    delivery_record.latest_trace_id,
    jsonb_build_object(
      'delivery_id', delivery_record.id,
      'delivery_status', target_delivery_status,
      'inserted_event_count', inserted_count,
      'replayed_event_count', replayed_count,
      'ignored_change_count', ignored_count
    )
  );

  delivery_id := delivery_record.id;
  delivery_status := target_delivery_status;
  inserted_event_count := inserted_count;
  replayed_event_count := replayed_count;
  ignored_change_count := ignored_count;
  return next;
end;
$$;

create function api.fail_meta_webhook_delivery(
  target_delivery_id uuid,
  target_lease_token uuid,
  target_error_code text,
  target_retryable boolean,
  target_retry_delay_seconds integer default 5,
  target_max_attempts integer default 8
)
returns table (
  delivery_id uuid,
  delivery_status text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  delivery_record app_private.meta_webhook_deliveries%rowtype;
  target_status text;
begin
  if target_delivery_id is null
    or target_lease_token is null
    or target_error_code is null
    or target_error_code <> btrim(target_error_code)
    or char_length(target_error_code) not between 1 and 120
    or target_retryable is null
    or target_retry_delay_seconds not between 0 and 3600
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'Meta delivery failure input is invalid';
  end if;

  select delivery_value.*
  into delivery_record
  from app_private.meta_webhook_deliveries as delivery_value
  where delivery_value.id = target_delivery_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Meta delivery was not found';
  end if;
  if delivery_record.status <> 'processing'
    or delivery_record.lease_token is distinct from target_lease_token
    or delivery_record.lease_expires_at <= clock_timestamp() then
    raise exception using errcode = '40001', message = 'Meta delivery lease is stale';
  end if;

  target_status := case
    when target_retryable and delivery_record.attempt_count < target_max_attempts then 'retryable'
    else 'dead_letter'
  end;

  update app_private.meta_webhook_deliveries
  set status = target_status,
      available_at = case
        when target_status = 'retryable'
          then clock_timestamp() + pg_catalog.make_interval(secs => target_retry_delay_seconds)
        else available_at
      end,
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      completed_at = case when target_status = 'dead_letter' then clock_timestamp() else null end,
      last_error_code = target_error_code,
      updated_at = clock_timestamp()
  where id = delivery_record.id;

  perform app_private.insert_agent_audit_event(
    delivery_record.organization_id,
    case
      when target_status = 'retryable' then 'meta.webhook.delivery_retry_scheduled'
      else 'meta.webhook.delivery_dead_lettered'
    end,
    'worker',
    null,
    delivery_record.latest_request_id,
    delivery_record.latest_trace_id,
    jsonb_build_object(
      'delivery_id', delivery_record.id,
      'error_code', target_error_code,
      'attempt_count', delivery_record.attempt_count,
      'disposition', target_status
    )
  );

  delivery_id := delivery_record.id;
  delivery_status := target_status;
  attempt_count := delivery_record.attempt_count;
  return next;
end;
$$;

create function api.claim_meta_whatsapp_message_event(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8
)
returns table (
  inbound_event_id uuid,
  organization_id uuid,
  channel_connection_id uuid,
  attempt_number integer,
  lease_token uuid,
  lease_expires_at timestamptz,
  correlation_id text,
  trace_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record app_private.inbound_events%rowtype;
  claimed_lease_token uuid;
  claimed_lease_expires_at timestamptz;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_lease_seconds not between 15 and 900
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'WhatsApp event claim parameters are invalid';
  end if;

  with exhausted as (
    update app_private.inbound_events as event_value
    set status = 'dead_letter',
        processed_at = clock_timestamp(),
        last_error_code = 'attempt_budget_exhausted',
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        updated_at = clock_timestamp()
    where event_value.event_type = 'whatsapp.message'
      and event_value.attempt_count >= target_max_attempts
      and (
        (
          event_value.status in ('received', 'retryable')
          and event_value.available_at <= clock_timestamp()
        )
        or (
          event_value.status = 'processing'
          and event_value.lease_expires_at <= clock_timestamp()
        )
      )
    returning event_value.*
  )
  insert into app_private.audit_events (
    organization_id,
    event_type,
    actor_kind,
    correlation_id,
    trace_id,
    metadata_safe
  )
  select
    exhausted.organization_id,
    'meta.whatsapp.message_dead_lettered',
    'worker',
    exhausted.request_id,
    exhausted.trace_id,
    jsonb_build_object(
      'inbound_event_id', exhausted.id,
      'reason', 'attempt_budget_exhausted',
      'attempt_count', exhausted.attempt_count
    )
  from exhausted;

  select event_value.*
  into event_record
  from app_private.inbound_events as event_value
  where event_value.event_type = 'whatsapp.message'
    and event_value.attempt_count < target_max_attempts
    and (
      (
        event_value.status in ('received', 'retryable')
        and event_value.available_at <= clock_timestamp()
      )
      or (
        event_value.status = 'processing'
        and event_value.lease_expires_at <= clock_timestamp()
      )
    )
  order by event_value.available_at, event_value.received_at, event_value.id
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  claimed_lease_token := extensions.gen_random_uuid();
  claimed_lease_expires_at := clock_timestamp()
    + pg_catalog.make_interval(secs => target_lease_seconds);

  update app_private.inbound_events
  set status = 'processing',
      attempt_count = attempt_count + 1,
      processing_started_at = clock_timestamp(),
      lease_owner = target_worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = claimed_lease_expires_at,
      processed_at = null,
      last_error_code = null,
      updated_at = clock_timestamp()
  where id = event_record.id;

  perform app_private.insert_agent_audit_event(
    event_record.organization_id,
    'meta.whatsapp.message_claimed',
    'worker',
    null,
    event_record.request_id,
    event_record.trace_id,
    jsonb_build_object(
      'inbound_event_id', event_record.id,
      'channel_connection_id', event_record.channel_connection_id,
      'attempt_number', event_record.attempt_count + 1,
      'lease_expires_at', claimed_lease_expires_at
    )
  );

  inbound_event_id := event_record.id;
  organization_id := event_record.organization_id;
  channel_connection_id := event_record.channel_connection_id;
  attempt_number := event_record.attempt_count + 1;
  lease_token := claimed_lease_token;
  lease_expires_at := claimed_lease_expires_at;
  correlation_id := event_record.request_id;
  trace_id := event_record.trace_id;
  return next;
end;
$$;

create function api.normalize_meta_whatsapp_message(
  target_inbound_event_id uuid,
  target_lease_token uuid
)
returns table (
  inbound_event_id uuid,
  channel_identity_id uuid,
  conversation_id uuid,
  message_id uuid,
  content_kind text,
  was_replayed boolean,
  principal_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record app_private.inbound_events%rowtype;
  connection_record app_private.channel_connections%rowtype;
  identity_record app_private.channel_identities%rowtype;
  conversation_record app_private.conversations%rowtype;
  participant_record app_private.conversation_participants%rowtype;
  message_record app_private.messages%rowtype;
  provider_message jsonb;
  provider_contact jsonb;
  provider_metadata jsonb;
  sender_id text;
  external_message_id text;
  provider_message_type text;
  observed_display_name text;
  target_content_kind text;
  target_content jsonb;
  target_provider_context jsonb;
  target_origin_kind text;
  target_origin_external_id text;
  target_origin_context jsonb;
  target_reply_to_message_id uuid;
  target_contact_id uuid;
  target_participant_role text;
  target_message_id uuid;
  target_was_replayed boolean := false;
  target_now timestamptz := clock_timestamp();
begin
  if target_inbound_event_id is null or target_lease_token is null then
    raise exception using errcode = '22023', message = 'WhatsApp event lease identity is required';
  end if;

  select event_value.*
  into event_record
  from app_private.inbound_events as event_value
  where event_value.id = target_inbound_event_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'WhatsApp inbound event was not found';
  end if;
  if event_record.event_type <> 'whatsapp.message'
    or event_record.status <> 'processing'
    or event_record.lease_token is distinct from target_lease_token
    or event_record.lease_expires_at <= target_now then
    raise exception using errcode = '40001', message = 'WhatsApp inbound event lease is stale';
  end if;

  select connection_value.*
  into connection_record
  from app_private.channel_connections as connection_value
  where connection_value.organization_id = event_record.organization_id
    and connection_value.id = event_record.channel_connection_id
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active'
  for update;

  if not found then
    raise exception using errcode = '55000', message = 'WhatsApp connection is not active';
  end if;

  provider_message := event_record.payload -> 'message';
  provider_contact := event_record.payload -> 'contact';
  provider_metadata := event_record.payload -> 'metadata';

  if jsonb_typeof(provider_message) is distinct from 'object'
    or jsonb_typeof(provider_message -> 'id') is distinct from 'string'
    or jsonb_typeof(provider_message -> 'from') is distinct from 'string'
    or jsonb_typeof(provider_message -> 'type') is distinct from 'string'
    or jsonb_typeof(provider_metadata) is distinct from 'object'
    or provider_metadata ->> 'phone_number_id' is distinct from connection_record.external_sender_id
    or event_record.payload ->> 'waba_id' is distinct from connection_record.external_account_id then
    raise exception using errcode = '23514', message = 'WhatsApp event evidence does not match its connection';
  end if;

  sender_id := provider_message ->> 'from';
  external_message_id := provider_message ->> 'id';
  provider_message_type := provider_message ->> 'type';

  if sender_id <> btrim(sender_id)
    or char_length(sender_id) not between 1 and 64
    or char_length(translate(sender_id, '0123456789', '')) <> 0
    or external_message_id <> btrim(external_message_id)
    or char_length(external_message_id) not between 1 and 512
    or provider_message_type <> btrim(provider_message_type)
    or char_length(provider_message_type) not between 1 and 120
    or event_record.provider_event_id is distinct from external_message_id then
    raise exception using errcode = '23514', message = 'WhatsApp event evidence is inconsistent';
  end if;

  observed_display_name := case
    when jsonb_typeof(provider_contact) = 'object'
      and provider_contact ->> 'wa_id' = sender_id
      and jsonb_typeof(provider_contact #> '{profile,name}') = 'string'
      and btrim(provider_contact #>> '{profile,name}') <> ''
      and char_length(btrim(provider_contact #>> '{profile,name}')) <= 160
      then btrim(provider_contact #>> '{profile,name}')
    else null
  end;

  target_content_kind := case provider_message_type
    when 'text' then 'text'
    when 'image' then 'media'
    when 'audio' then 'media'
    when 'video' then 'media'
    when 'document' then 'media'
    when 'sticker' then 'media'
    when 'interactive' then 'interactive'
    when 'button' then 'interactive'
    when 'contacts' then 'contact'
    when 'location' then 'location'
    when 'order' then 'order'
    when 'reaction' then 'reaction'
    when 'system' then 'system'
    else 'unsupported'
  end;

  target_content := provider_message
    - 'from'
    - 'id'
    - 'timestamp'
    - 'context'
    - 'referral'
    - 'identity';
  if jsonb_typeof(target_content) is distinct from 'object' then
    target_content := jsonb_build_object('provider_type', provider_message_type);
  end if;

  target_provider_context := jsonb_strip_nulls(
    jsonb_build_object(
      'metadata', provider_metadata,
      'contact', provider_contact,
      'context', provider_message -> 'context',
      'referral', provider_message -> 'referral',
      'identity', provider_message -> 'identity'
    )
  );

  if octet_length(target_content::text) > 262144
    or octet_length(target_provider_context::text) > 65536 then
    raise exception using errcode = '22023', message = 'WhatsApp normalized message exceeds storage limits';
  end if;

  target_origin_kind := null;
  target_origin_external_id := null;
  target_origin_context := '{}'::jsonb;

  if jsonb_typeof(provider_message -> 'referral') = 'object'
    and jsonb_typeof(provider_message #> '{referral,source_id}') = 'string'
    and btrim(provider_message #>> '{referral,source_id}') <> ''
    and char_length(btrim(provider_message #>> '{referral,source_id}')) <= 512 then
    target_origin_kind := 'whatsapp.referral';
    target_origin_external_id := btrim(provider_message #>> '{referral,source_id}');
    target_origin_context := jsonb_build_object('referral', provider_message -> 'referral');
  elsif jsonb_typeof(provider_message #> '{context,referred_product}') = 'object'
    and jsonb_typeof(provider_message #> '{context,referred_product,product_retailer_id}') = 'string'
    and btrim(provider_message #>> '{context,referred_product,product_retailer_id}') <> ''
    and char_length(
      btrim(provider_message #>> '{context,referred_product,product_retailer_id}')
    ) <= 512 then
    target_origin_kind := 'whatsapp.referred_product';
    target_origin_external_id := btrim(
      provider_message #>> '{context,referred_product,product_retailer_id}'
    );
    target_origin_context := jsonb_build_object(
      'referred_product',
      provider_message #> '{context,referred_product}'
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      event_record.channel_connection_id::text || ':' || sender_id,
      0
    )
  );

  select identity_value.*
  into identity_record
  from app_private.channel_identities as identity_value
  where identity_value.organization_id = event_record.organization_id
    and identity_value.channel_connection_id = event_record.channel_connection_id
    and identity_value.external_subject_id = sender_id
    and identity_value.status <> 'revoked'
  for update;

  if not found then
    insert into app_private.contacts (
      organization_id,
      display_name,
      status,
      created_at,
      updated_at
    ) values (
      event_record.organization_id,
      observed_display_name,
      'active',
      event_record.received_at,
      event_record.received_at
    )
    returning id into target_contact_id;

    insert into app_private.channel_identities (
      organization_id,
      channel_connection_id,
      external_subject_id,
      principal_type,
      contact_id,
      trust_level,
      display_name,
      status,
      last_seen_at,
      created_at,
      updated_at
    ) values (
      event_record.organization_id,
      event_record.channel_connection_id,
      sender_id,
      'contact',
      target_contact_id,
      'provider_observed',
      observed_display_name,
      'active',
      greatest(event_record.received_at, event_record.provider_occurred_at),
      event_record.received_at,
      event_record.received_at
    )
    returning * into identity_record;
  else
    update app_private.channel_identities
    set display_name = coalesce(identity_record.display_name, observed_display_name),
        last_seen_at = greatest(
          coalesce(identity_record.last_seen_at, identity_record.created_at),
          event_record.received_at,
          event_record.provider_occurred_at
        ),
        updated_at = greatest(target_now, identity_record.updated_at)
    where organization_id = identity_record.organization_id
      and channel_connection_id = identity_record.channel_connection_id
      and id = identity_record.id
    returning * into identity_record;

    if identity_record.contact_id is not null and observed_display_name is not null then
      update app_private.contacts
      set display_name = coalesce(contacts.display_name, observed_display_name),
          updated_at = greatest(target_now, contacts.updated_at)
      where organization_id = event_record.organization_id
        and id = identity_record.contact_id;
    end if;
  end if;

  select conversation_value.*
  into conversation_record
  from app_private.conversations as conversation_value
  where conversation_value.organization_id = event_record.organization_id
    and conversation_value.channel_connection_id = event_record.channel_connection_id
    and conversation_value.primary_channel_identity_id = identity_record.id
    and conversation_value.status = 'open'
  for update;

  if not found then
    insert into app_private.conversations (
      organization_id,
      channel_connection_id,
      primary_channel_identity_id,
      status,
      opened_at,
      last_activity_at,
      last_inbound_at,
      service_window_expires_at,
      origin_kind,
      origin_external_id,
      origin_context,
      created_at,
      updated_at
    ) values (
      event_record.organization_id,
      event_record.channel_connection_id,
      identity_record.id,
      'open',
      event_record.received_at,
      event_record.received_at,
      event_record.received_at,
      event_record.received_at + interval '24 hours',
      target_origin_kind,
      target_origin_external_id,
      target_origin_context,
      event_record.received_at,
      event_record.received_at
    )
    returning * into conversation_record;
  else
    update app_private.conversations
    set last_activity_at = greatest(last_activity_at, event_record.received_at),
        last_inbound_at = greatest(
          coalesce(last_inbound_at, opened_at),
          event_record.received_at
        ),
        service_window_expires_at = greatest(
          coalesce(service_window_expires_at, opened_at),
          event_record.received_at + interval '24 hours'
        ),
        origin_kind = coalesce(conversations.origin_kind, target_origin_kind),
        origin_external_id = coalesce(
          conversations.origin_external_id,
          target_origin_external_id
        ),
        origin_context = case
          when conversations.origin_kind is null and target_origin_kind is not null
            then target_origin_context
          else conversations.origin_context
        end,
        updated_at = greatest(target_now, conversations.updated_at)
    where organization_id = conversation_record.organization_id
      and channel_connection_id = conversation_record.channel_connection_id
      and id = conversation_record.id
    returning * into conversation_record;
  end if;

  target_participant_role := case
    when identity_record.principal_type = 'member' then 'member'
    else 'customer'
  end;

  insert into app_private.conversation_participants (
    organization_id,
    channel_connection_id,
    conversation_id,
    participant_kind,
    participant_role,
    channel_identity_id,
    joined_at,
    created_at
  ) values (
    event_record.organization_id,
    event_record.channel_connection_id,
    conversation_record.id,
    'identity',
    target_participant_role,
    identity_record.id,
    event_record.received_at,
    event_record.received_at
  )
  on conflict do nothing;

  select participant_value.*
  into participant_record
  from app_private.conversation_participants as participant_value
  where participant_value.organization_id = event_record.organization_id
    and participant_value.channel_connection_id = event_record.channel_connection_id
    and participant_value.conversation_id = conversation_record.id
    and participant_value.channel_identity_id = identity_record.id
    and participant_value.left_at is null;

  if not found then
    raise exception using errcode = '40001', message = 'WhatsApp participant could not be resolved';
  end if;

  target_reply_to_message_id := null;
  if jsonb_typeof(provider_message #> '{context,id}') = 'string' then
    select prior_message.id
    into target_reply_to_message_id
    from app_private.messages as prior_message
    where prior_message.organization_id = event_record.organization_id
      and prior_message.channel_connection_id = event_record.channel_connection_id
      and prior_message.conversation_id = conversation_record.id
      and prior_message.external_message_id = provider_message #>> '{context,id}'
    limit 1;
  end if;

  insert into app_private.messages (
    organization_id,
    channel_connection_id,
    conversation_id,
    sender_participant_id,
    source_inbound_event_id,
    reply_to_message_id,
    direction,
    content_kind,
    provider_message_type,
    external_message_id,
    deduplication_key,
    content,
    provider_context,
    status,
    provider_occurred_at,
    received_at,
    created_at,
    updated_at
  ) values (
    event_record.organization_id,
    event_record.channel_connection_id,
    conversation_record.id,
    participant_record.id,
    event_record.id,
    target_reply_to_message_id,
    'inbound',
    target_content_kind,
    provider_message_type,
    external_message_id,
    extensions.digest(convert_to('whatsapp.message:' || external_message_id, 'UTF8'), 'sha256'),
    target_content,
    target_provider_context,
    'received',
    event_record.provider_occurred_at,
    event_record.received_at,
    event_record.received_at,
    event_record.received_at
  )
  on conflict (channel_connection_id, deduplication_key) do nothing
  returning id into target_message_id;

  if target_message_id is null then
    select existing_message.*
    into message_record
    from app_private.messages as existing_message
    where existing_message.organization_id = event_record.organization_id
      and existing_message.channel_connection_id = event_record.channel_connection_id
      and existing_message.external_message_id = external_message_id;

    if not found then
      raise exception using errcode = '40001', message = 'WhatsApp message replay could not be resolved';
    end if;
    target_message_id := message_record.id;
    target_was_replayed := true;
  end if;

  update app_private.inbound_events
  set status = 'processed',
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      processed_at = target_now,
      last_error_code = null,
      updated_at = target_now
  where id = event_record.id;

  perform app_private.insert_agent_audit_event(
    event_record.organization_id,
    'meta.whatsapp.message_normalized',
    'worker',
    null,
    event_record.request_id,
    event_record.trace_id,
    jsonb_build_object(
      'inbound_event_id', event_record.id,
      'channel_connection_id', event_record.channel_connection_id,
      'channel_identity_id', identity_record.id,
      'conversation_id', conversation_record.id,
      'message_id', target_message_id,
      'content_kind', target_content_kind,
      'principal_type', identity_record.principal_type,
      'was_replayed', target_was_replayed
    )
  );

  inbound_event_id := event_record.id;
  channel_identity_id := identity_record.id;
  conversation_id := conversation_record.id;
  message_id := target_message_id;
  content_kind := target_content_kind;
  was_replayed := target_was_replayed;
  principal_type := identity_record.principal_type;
  return next;
end;
$$;

create function api.fail_meta_whatsapp_message_event(
  target_inbound_event_id uuid,
  target_lease_token uuid,
  target_error_code text,
  target_retryable boolean,
  target_retry_delay_seconds integer default 5,
  target_max_attempts integer default 8
)
returns table (
  inbound_event_id uuid,
  event_status text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record app_private.inbound_events%rowtype;
  target_status text;
begin
  if target_inbound_event_id is null
    or target_lease_token is null
    or target_error_code is null
    or target_error_code <> btrim(target_error_code)
    or char_length(target_error_code) not between 1 and 120
    or target_retryable is null
    or target_retry_delay_seconds not between 0 and 3600
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'WhatsApp event failure input is invalid';
  end if;

  select event_value.*
  into event_record
  from app_private.inbound_events as event_value
  where event_value.id = target_inbound_event_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'WhatsApp inbound event was not found';
  end if;
  if event_record.event_type <> 'whatsapp.message'
    or event_record.status <> 'processing'
    or event_record.lease_token is distinct from target_lease_token
    or event_record.lease_expires_at <= clock_timestamp() then
    raise exception using errcode = '40001', message = 'WhatsApp inbound event lease is stale';
  end if;

  target_status := case
    when target_retryable and event_record.attempt_count < target_max_attempts then 'retryable'
    else 'dead_letter'
  end;

  update app_private.inbound_events
  set status = target_status,
      available_at = case
        when target_status = 'retryable'
          then clock_timestamp() + pg_catalog.make_interval(secs => target_retry_delay_seconds)
        else available_at
      end,
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      processed_at = case when target_status = 'dead_letter' then clock_timestamp() else null end,
      last_error_code = target_error_code,
      updated_at = clock_timestamp()
  where id = event_record.id;

  perform app_private.insert_agent_audit_event(
    event_record.organization_id,
    case
      when target_status = 'retryable' then 'meta.whatsapp.message_retry_scheduled'
      else 'meta.whatsapp.message_dead_lettered'
    end,
    'worker',
    null,
    event_record.request_id,
    event_record.trace_id,
    jsonb_build_object(
      'inbound_event_id', event_record.id,
      'channel_connection_id', event_record.channel_connection_id,
      'error_code', target_error_code,
      'attempt_count', event_record.attempt_count,
      'disposition', target_status
    )
  );

  inbound_event_id := event_record.id;
  event_status := target_status;
  attempt_count := event_record.attempt_count;
  return next;
end;
$$;

revoke all on function api.claim_meta_webhook_delivery(text, text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function api.route_meta_whatsapp_delivery(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.fail_meta_webhook_delivery(uuid, uuid, text, boolean, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function api.claim_meta_whatsapp_message_event(text, integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function api.normalize_meta_whatsapp_message(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.fail_meta_whatsapp_message_event(
  uuid, uuid, text, boolean, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function api.claim_meta_webhook_delivery(text, text, integer, integer)
  to service_role;
grant execute on function api.route_meta_whatsapp_delivery(uuid, uuid)
  to service_role;
grant execute on function api.fail_meta_webhook_delivery(uuid, uuid, text, boolean, integer, integer)
  to service_role;
grant execute on function api.claim_meta_whatsapp_message_event(text, integer, integer)
  to service_role;
grant execute on function api.normalize_meta_whatsapp_message(uuid, uuid)
  to service_role;
grant execute on function api.fail_meta_whatsapp_message_event(
  uuid, uuid, text, boolean, integer, integer
) to service_role;

comment on function api.claim_meta_webhook_delivery(text, text, integer, integer) is
  'Claims one authenticated Meta delivery with an expiring worker lease and bounded attempts';
comment on function api.route_meta_whatsapp_delivery(uuid, uuid) is
  'Routes a claimed WhatsApp wrapper to exact tenant-scoped idempotent inbound events';
comment on function api.claim_meta_whatsapp_message_event(text, integer, integer) is
  'Claims one WhatsApp message event for deterministic normalization';
comment on function api.normalize_meta_whatsapp_message(uuid, uuid) is
  'Normalizes provider protocol into tenant contact, identity, conversation, participant and message without interpreting intent';

notify pgrst, 'reload schema';

commit;
