begin;

create or replace function api.claim_whatsapp_outbox_event(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8
)
returns table (
  organization_id uuid,
  outbox_event_id uuid,
  message_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_number integer,
  api_version text,
  phone_number_id text,
  destination text,
  payload jsonb,
  access_token text,
  correlation_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record app_private.outbox_events%rowtype;
  connection_record app_private.channel_connections%rowtype;
  claimed_lease_token uuid;
  claimed_lease_expires_at timestamptz;
  destination_value text;
  access_token_value text;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_lease_seconds not between 15 and 900
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023', message = 'outbox claim parameters are invalid';
  end if;

  with expired_window as (
    update app_private.outbox_events as outbox_value
    set policy_status = 'blocked',
        policy_basis = 'service_window_expired',
        policy_evaluated_at = statement_timestamp(),
        status = 'blocked',
        completed_at = statement_timestamp(),
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = 'service_window_expired',
        updated_at = statement_timestamp()
    from app_private.conversations as conversation_value
    where outbox_value.organization_id = conversation_value.organization_id
      and outbox_value.channel_connection_id = conversation_value.channel_connection_id
      and outbox_value.conversation_id = conversation_value.id
      and outbox_value.operation = 'message.send'
      and outbox_value.status in ('pending', 'retryable')
      and outbox_value.policy_status = 'allowed'
      and conversation_value.service_window_expires_at <= statement_timestamp()
    returning outbox_value.organization_id, outbox_value.channel_connection_id, outbox_value.message_id
  )
  update app_private.messages as message_value
  set status = 'blocked',
      updated_at = statement_timestamp()
  from expired_window
  where message_value.organization_id = expired_window.organization_id
    and message_value.channel_connection_id = expired_window.channel_connection_id
    and message_value.id = expired_window.message_id
    and message_value.direction = 'outbound'
    and message_value.status = 'queued';

  with exhausted as (
    update app_private.outbox_events as outbox_value
    set status = 'failed',
        completed_at = statement_timestamp(),
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = 'attempt_budget_exhausted',
        updated_at = statement_timestamp()
    where outbox_value.operation = 'message.send'
      and outbox_value.attempt_count >= target_max_attempts
      and (
        (outbox_value.status in ('pending', 'retryable') and outbox_value.available_at <= statement_timestamp())
        or (outbox_value.status = 'processing' and outbox_value.lease_expires_at <= statement_timestamp())
      )
    returning outbox_value.organization_id, outbox_value.channel_connection_id, outbox_value.message_id
  )
  update app_private.messages as message_value
  set status = 'failed',
      updated_at = statement_timestamp()
  from exhausted
  where message_value.organization_id = exhausted.organization_id
    and message_value.channel_connection_id = exhausted.channel_connection_id
    and message_value.id = exhausted.message_id
    and message_value.direction = 'outbound'
    and message_value.status = 'queued';

  select outbox_value.*
  into event_record
  from app_private.outbox_events as outbox_value
  join app_private.conversations as conversation_value
    on conversation_value.organization_id = outbox_value.organization_id
   and conversation_value.channel_connection_id = outbox_value.channel_connection_id
   and conversation_value.id = outbox_value.conversation_id
  where outbox_value.operation = 'message.send'
    and outbox_value.policy_status = 'allowed'
    and outbox_value.attempt_count < target_max_attempts
    and conversation_value.status = 'open'
    and conversation_value.service_window_expires_at > statement_timestamp()
    and (
      (outbox_value.status in ('pending', 'retryable') and outbox_value.available_at <= statement_timestamp())
      or (outbox_value.status = 'processing' and outbox_value.lease_expires_at <= statement_timestamp())
    )
  order by outbox_value.available_at, outbox_value.created_at, outbox_value.id
  for update of outbox_value skip locked
  limit 1;

  if not found then
    return;
  end if;

  select * into connection_record
  from app_private.channel_connections as connection_value
  where connection_value.organization_id = event_record.organization_id
    and connection_value.id = event_record.channel_connection_id
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active';

  if not found then
    raise exception using errcode = '55000', message = 'active WhatsApp connection not found';
  end if;

  select identity_value.external_subject_id
  into destination_value
  from app_private.channel_identities as identity_value
  where identity_value.organization_id = event_record.organization_id
    and identity_value.channel_connection_id = event_record.channel_connection_id
    and identity_value.id = event_record.destination_identity_id
    and identity_value.status = 'active';

  if destination_value is null then
    raise exception using errcode = '55000', message = 'active WhatsApp destination not found';
  end if;

  select secret_value.decrypted_secret
  into access_token_value
  from app_private.meta_credential_versions as credential_value
  join vault.decrypted_secrets as secret_value
    on secret_value.id = credential_value.vault_secret_id
  where credential_value.organization_id = event_record.organization_id
    and credential_value.channel_connection_id = event_record.channel_connection_id
    and credential_value.credential_kind = 'channel_access_token'
    and credential_value.status = 'current'
    and connection_record.credential_reference = 'meta-credential-version://' || credential_value.id::text
  order by credential_value.version_number desc
  limit 1;

  if access_token_value is null then
    raise exception using errcode = '55000', message = 'current WhatsApp credential not found';
  end if;

  claimed_lease_token := extensions.gen_random_uuid();
  claimed_lease_expires_at := statement_timestamp() + pg_catalog.make_interval(secs => target_lease_seconds);

  update app_private.outbox_events as claimed_outbox
  set status = 'processing',
      attempt_count = claimed_outbox.attempt_count + 1,
      processing_started_at = statement_timestamp(),
      lease_owner = target_worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = claimed_lease_expires_at,
      last_error_code = null,
      updated_at = statement_timestamp()
  where claimed_outbox.organization_id = event_record.organization_id
    and claimed_outbox.channel_connection_id = event_record.channel_connection_id
    and claimed_outbox.id = event_record.id;

  perform app_private.insert_agent_audit_event(
    event_record.organization_id,
    'whatsapp.outbox.claimed',
    'worker',
    null,
    'outbox:' || event_record.id::text,
    null,
    jsonb_build_object(
      'outbox_event_id', event_record.id,
      'attempt_number', event_record.attempt_count + 1,
      'lease_expires_at', claimed_lease_expires_at
    ),
    null,
    null,
    null,
    null,
    null,
    null,
    event_record.channel_connection_id,
    event_record.id
  );

  organization_id := event_record.organization_id;
  outbox_event_id := event_record.id;
  message_id := event_record.message_id;
  lease_token := claimed_lease_token;
  lease_expires_at := claimed_lease_expires_at;
  attempt_number := event_record.attempt_count + 1;
  api_version := connection_record.api_version;
  phone_number_id := connection_record.external_sender_id;
  destination := destination_value;
  payload := event_record.payload - 'agent_run_id' - 'chunk_ordinal' - 'chunk_count';
  access_token := access_token_value;
  correlation_id := 'outbox:' || event_record.id::text;
  return next;
end;
$$;

revoke all on function api.claim_whatsapp_outbox_event(text, integer, integer)
  from public, anon, authenticated, service_role;

grant execute on function api.claim_whatsapp_outbox_event(text, integer, integer)
  to service_role;

comment on function api.claim_whatsapp_outbox_event(text, integer, integer)
  is 'Claims one approved WhatsApp effect with fully qualified lease mutation identifiers and reveals its tenant Vault token only to the backend worker response.';

notify pgrst, 'reload schema';

commit;
