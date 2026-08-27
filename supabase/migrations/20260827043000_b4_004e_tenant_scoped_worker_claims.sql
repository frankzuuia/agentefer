begin;

drop function api.claim_whatsapp_agent_turn(text, text, text, text, text, text, integer);

create function api.claim_whatsapp_agent_turn(
  target_worker_id text,
  target_provider text,
  target_model text,
  target_vision_provider text,
  target_vision_model text,
  target_reasoning_effort text,
  target_lease_seconds integer default 120,
  target_organization_id uuid default null
)
returns table (
  organization_id uuid,
  agent_job_id uuid,
  agent_run_id uuid,
  job_attempt_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_number integer,
  provider text,
  model text,
  reasoning_effort text,
  system_prompt text,
  conversation_history jsonb,
  continuation_parts jsonb,
  channel_connection_id uuid,
  conversation_id uuid,
  trigger_message_id uuid,
  correlation_id text,
  trace_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_organization_id uuid;
  candidate_message record;
  enqueued record;
  claimed record;
  attempt_record record;
  run_record app_private.agent_runs%rowtype;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_provider is null
    or target_provider <> lower(btrim(target_provider))
    or target_provider !~ '^[a-z0-9][a-z0-9_-]{0,79}$'
    or target_model is null
    or target_model <> btrim(target_model)
    or char_length(target_model) not between 1 and 200
    or target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'agent turn claim parameters are invalid';
  end if;

  select job_value.organization_id
  into candidate_organization_id
  from app_private.agent_jobs as job_value
  join app_private.agent_runs as run_value
    on run_value.organization_id = job_value.organization_id
   and run_value.id = job_value.run_id
  join app_private.channel_connections as connection_value
    on connection_value.organization_id = run_value.organization_id
   and connection_value.id = run_value.channel_connection_id
  where (target_organization_id is null or job_value.organization_id = target_organization_id)
    and job_value.status in ('pending', 'retryable')
    and job_value.available_at <= statement_timestamp()
    and job_value.attempt_count < job_value.max_attempts
    and run_value.run_kind = 'conversation_turn'
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active'
  order by job_value.priority, job_value.available_at, job_value.created_at, job_value.id
  limit 1;

  if candidate_organization_id is null then
    select
      message_value.organization_id,
      message_value.channel_connection_id,
      message_value.conversation_id,
      message_value.id as message_id,
      message_value.source_inbound_event_id,
      message_value.content,
      message_value.external_message_id,
      conversation_value.primary_channel_identity_id,
      coalesce(inbound_value.request_id, 'message:' || message_value.id::text)
        as message_correlation_id,
      inbound_value.trace_id as message_trace_id
    into candidate_message
    from app_private.messages as message_value
    join app_private.conversations as conversation_value
      on conversation_value.organization_id = message_value.organization_id
     and conversation_value.channel_connection_id = message_value.channel_connection_id
     and conversation_value.id = message_value.conversation_id
    join app_private.channel_connections as connection_value
      on connection_value.organization_id = message_value.organization_id
     and connection_value.id = message_value.channel_connection_id
    left join app_private.inbound_events as inbound_value
      on inbound_value.organization_id = message_value.organization_id
     and inbound_value.channel_connection_id = message_value.channel_connection_id
     and inbound_value.id = message_value.source_inbound_event_id
    where (target_organization_id is null or message_value.organization_id = target_organization_id)
      and message_value.direction = 'inbound'
      and message_value.status = 'received'
      and conversation_value.status = 'open'
      and connection_value.provider = 'meta'
      and connection_value.channel = 'whatsapp'
      and connection_value.status = 'active'
      and not exists (
        select 1
        from app_private.agent_runs as existing_run
        where existing_run.organization_id = message_value.organization_id
          and existing_run.channel_connection_id = message_value.channel_connection_id
          and existing_run.trigger_message_id = message_value.id
      )
    order by message_value.received_at, message_value.created_at, message_value.id
    for update of message_value skip locked
    limit 1;

    if not found then
      return;
    end if;

    perform app_private.ensure_customer_assistant_policy(candidate_message.organization_id);

    select * into enqueued
    from api.enqueue_agent_run(
      candidate_message.organization_id,
      'whatsapp-turn:' || candidate_message.message_id::text,
      'whatsapp-turn:' || candidate_message.message_id::text,
      'conversation_turn',
      'customer_assistant',
      target_provider,
      target_model,
      target_vision_provider,
      target_vision_model,
      target_reasoning_effort,
      null,
      candidate_message.channel_connection_id,
      candidate_message.conversation_id,
      candidate_message.message_id,
      candidate_message.source_inbound_event_id,
      'contact',
      null,
      candidate_message.primary_channel_identity_id,
      100,
      jsonb_build_object(
        'trigger_message_id', candidate_message.message_id,
        'channel', 'whatsapp',
        'source', 'customer_inbound'
      ),
      candidate_message.message_correlation_id,
      candidate_message.message_trace_id
    );

    perform api.append_agent_message(
      candidate_message.organization_id,
      enqueued.agent_run_id,
      'inbound:' || candidate_message.message_id::text,
      'user',
      'input',
      'untrusted_external',
      candidate_message.channel_connection_id,
      candidate_message.conversation_id,
      candidate_message.message_id,
      candidate_message.external_message_id,
      candidate_message.content
    );

    candidate_organization_id := candidate_message.organization_id;
  end if;

  select * into claimed
  from api.claim_agent_job(
    candidate_organization_id,
    target_worker_id,
    target_lease_seconds
  );

  if not found then
    return;
  end if;

  select * into attempt_record
  from api.start_agent_job_attempt(
    candidate_organization_id,
    claimed.agent_job_id,
    target_worker_id,
    claimed.lease_token,
    0,
    jsonb_build_object('transport', 'whatsapp')
  );

  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = candidate_organization_id
    and run_value.id = claimed.agent_run_id;

  organization_id := candidate_organization_id;
  agent_job_id := claimed.agent_job_id;
  agent_run_id := claimed.agent_run_id;
  job_attempt_id := attempt_record.job_attempt_id;
  lease_token := claimed.lease_token;
  lease_expires_at := claimed.lease_expires_at;
  attempt_number := attempt_record.attempt_number;
  provider := attempt_record.provider;
  model := attempt_record.model;
  reasoning_effort := run_record.reasoning_effort;
  channel_connection_id := run_record.channel_connection_id;
  conversation_id := run_record.conversation_id;
  trigger_message_id := run_record.trigger_message_id;
  correlation_id := run_record.correlation_id;
  trace_id := run_record.trace_id;

  select prompt_value.content_template
  into system_prompt
  from app_private.agent_policy_versions as version_value
  join app_private.prompt_versions as prompt_value
    on prompt_value.organization_id = version_value.organization_id
   and prompt_value.id = version_value.prompt_version_id
  where version_value.organization_id = run_record.organization_id
    and version_value.id = run_record.policy_version_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'message_id', history_value.id,
        'direction', history_value.direction,
        'content_kind', history_value.content_kind,
        'content', history_value.content,
        'occurred_at', coalesce(history_value.provider_occurred_at, history_value.created_at)
      ) order by history_value.timeline_at, history_value.created_at, history_value.id
    ),
    '[]'::jsonb
  )
  into conversation_history
  from (
    select
      message_value.*,
      coalesce(message_value.provider_occurred_at, message_value.created_at) as timeline_at
    from app_private.messages as message_value
    where message_value.organization_id = run_record.organization_id
      and message_value.channel_connection_id = run_record.channel_connection_id
      and message_value.conversation_id = run_record.conversation_id
      and message_value.direction in ('inbound', 'outbound')
      and message_value.status not in ('draft', 'failed', 'blocked', 'cancelled')
    order by
      coalesce(message_value.provider_occurred_at, message_value.created_at) desc,
      message_value.created_at desc,
      message_value.id desc
    limit 24
  ) as history_value;

  select coalesce(
    jsonb_agg(message_value.content order by message_value.sequence_number),
    '[]'::jsonb
  )
  into continuation_parts
  from app_private.agent_messages as message_value
  where message_value.organization_id = run_record.organization_id
    and message_value.run_id = run_record.id
    and message_value.message_kind = 'checkpoint'
    and message_value.message_role = 'assistant';

  return next;
end;
$$;

drop function api.claim_whatsapp_outbox_event(text, integer, integer);

create function api.claim_whatsapp_outbox_event(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8,
  target_organization_id uuid default null
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
    where (target_organization_id is null or outbox_value.organization_id = target_organization_id)
      and outbox_value.organization_id = conversation_value.organization_id
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
    where (target_organization_id is null or outbox_value.organization_id = target_organization_id)
      and outbox_value.operation = 'message.send'
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
  where (target_organization_id is null or outbox_value.organization_id = target_organization_id)
    and outbox_value.operation = 'message.send'
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

revoke all on function api.claim_whatsapp_agent_turn(
  text, text, text, text, text, text, integer, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.claim_whatsapp_outbox_event(text, integer, integer, uuid)
  from public, anon, authenticated, service_role;

grant execute on function api.claim_whatsapp_agent_turn(
  text, text, text, text, text, text, integer, uuid
) to service_role;
grant execute on function api.claim_whatsapp_outbox_event(text, integer, integer, uuid)
  to service_role;

comment on function api.claim_whatsapp_agent_turn(
  text, text, text, text, text, text, integer, uuid
) is 'Claims one WhatsApp cognitive turn globally or inside one explicit tenant scope for deterministic sharding and production-safe QA.';
comment on function api.claim_whatsapp_outbox_event(text, integer, integer, uuid)
  is 'Claims one approved WhatsApp effect globally or inside one explicit tenant scope without disclosing another tenant credential.';

notify pgrst, 'reload schema';

commit;
