begin;

create index audit_events_read_tools_prepare_failure_idx
  on app_private.audit_events (organization_id, occurred_at desc)
  where event_type = 'customer_assistant.read_tools_prepare_failed';

create function app_private.customer_assistant_read_tools_ready(
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_organization_id is not null
    and (
      select count(*) = 3
      from app_private.agent_policies as policy_value
      join app_private.agent_policy_tools as policy_tool
        on policy_tool.organization_id = policy_value.organization_id
       and policy_tool.policy_version_id = policy_value.current_version_id
      join app_private.tool_contracts as contract_value
        on contract_value.organization_id = policy_tool.organization_id
       and contract_value.id = policy_tool.tool_contract_id
      where policy_value.organization_id = target_organization_id
        and policy_value.policy_key = 'customer_assistant'
        and policy_value.status = 'active'
        and contract_value.status = 'active'
        and contract_value.tool_name in (
          'conversation_get_context', 'catalog_search', 'catalog_get_offer'
        )
        and policy_tool.tool_contract_version_id = contract_value.current_version_id
        and policy_tool.allowed_actor_kinds @> array['contact']::text[]
        and policy_tool.allowed_channels @> array['whatsapp']::text[]
    );
$$;

create or replace function api.prepare_customer_assistant_read_tools(
  target_limit integer default 100
)
returns table (
  organizations_prepared integer,
  organizations_failed integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_record record;
  prepared_count integer := 0;
  failed_count integer := 0;
begin
  if target_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'preparation limit is invalid';
  end if;

  for organization_record in
    select organization_value.id
    from app_private.organizations as organization_value
    where organization_value.status = 'active'
      and exists (
        select 1
        from app_private.organization_memberships as membership
        where membership.organization_id = organization_value.id
          and membership.status = 'active'
          and membership.role in ('owner', 'admin')
      )
      and not app_private.customer_assistant_read_tools_ready(organization_value.id)
      and not exists (
        select 1
        from app_private.audit_events as failure_event
        where failure_event.organization_id = organization_value.id
          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '5 minutes'
      )
    order by
      not (
        exists (
          select 1
          from app_private.agent_jobs as job_value
          join app_private.agent_runs as run_value
            on run_value.organization_id = job_value.organization_id
           and run_value.id = job_value.run_id
          join app_private.channel_connections as connection_value
            on connection_value.organization_id = run_value.organization_id
           and connection_value.id = run_value.channel_connection_id
          where job_value.organization_id = organization_value.id
            and job_value.status in ('pending', 'retryable')
            and job_value.available_at <= statement_timestamp()
            and job_value.attempt_count < job_value.max_attempts
            and run_value.run_kind = 'conversation_turn'
            and connection_value.provider = 'meta'
            and connection_value.channel = 'whatsapp'
            and connection_value.status = 'active'
        )
        or exists (
          select 1
          from app_private.messages as message_value
          join app_private.conversations as conversation_value
            on conversation_value.organization_id = message_value.organization_id
           and conversation_value.channel_connection_id = message_value.channel_connection_id
           and conversation_value.id = message_value.conversation_id
          join app_private.channel_connections as connection_value
            on connection_value.organization_id = message_value.organization_id
           and connection_value.id = message_value.channel_connection_id
          where message_value.organization_id = organization_value.id
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
        )
      ),
      organization_value.created_at,
      organization_value.id
    limit target_limit
  loop
    begin
      perform app_private.ensure_customer_assistant_read_tools(organization_record.id);
      prepared_count := prepared_count + 1;
    exception when others then
      failed_count := failed_count + 1;
      perform app_private.insert_agent_audit_event(
        organization_record.id,
        'customer_assistant.read_tools_prepare_failed',
        'system',
        null,
        'b3-001a:prepare:' || organization_record.id::text,
        null,
        jsonb_build_object('sqlstate', sqlstate)
      );
    end;
  end loop;

  organizations_prepared := prepared_count;
  organizations_failed := failed_count;
  return next;
end;
$$;

create or replace function api.claim_whatsapp_agent_turn(
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
      and not exists (
        select 1
        from app_private.audit_events as failure_event
        where failure_event.organization_id = message_value.organization_id
          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '5 minutes'
      )
    order by message_value.received_at, message_value.created_at, message_value.id
    for update of message_value skip locked
    limit 1;

    if not found then
      return;
    end if;

    begin
      perform app_private.ensure_customer_assistant_read_tools(
        candidate_message.organization_id
      );
    exception when others then
      perform app_private.insert_agent_audit_event(
        candidate_message.organization_id,
        'customer_assistant.read_tools_prepare_failed',
        'worker',
        null,
        candidate_message.message_correlation_id,
        candidate_message.message_trace_id,
        jsonb_build_object('sqlstate', sqlstate)
      );
      return;
    end;

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

revoke all on function app_private.customer_assistant_read_tools_ready(uuid)
  from public, anon, authenticated, service_role;

comment on function app_private.customer_assistant_read_tools_ready(uuid) is
  'Checks whether the active customer assistant policy binds the current three WhatsApp read-only tool contracts.';
comment on function api.prepare_customer_assistant_read_tools(integer) is
  'Prepares only missing customer-assistant read tools in bounded fair batches, prioritizing actionable WhatsApp work and cooling down isolated tenant failures.';
comment on function api.claim_whatsapp_agent_turn(text, text, text, text, text, text, integer, uuid) is
  'Claims one tenant-scoped WhatsApp cognitive turn and atomically prepares native read tools before freezing every new conversation run.';

notify pgrst, 'reload schema';

commit;
