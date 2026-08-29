begin;

-- B3-002A: a WhatsApp message never chooses its own authority. The immutable
-- channel identity and its current tenant membership determine the run actor.

alter table app_private.agent_policy_tools
  add constraint agent_policy_tools_role_gate_member_only check (
    cardinality(required_membership_roles) = 0
    or (
      allowed_actor_kinds <@ array['member']::text[]
      and allowed_actor_kinds @> array['member']::text[]
    )
  ) not valid;

-- Historical snapshots were created before actor-aware policy lanes existed.
-- They remain the contact lane because every automated WhatsApp claim was
-- previously persisted as contact. New rows must state and enforce their lane.
alter table app_private.conversation_agent_snapshots
  add column actor_kind text not null default 'contact',
  add column actor_lane_enforced boolean not null default false;

alter table app_private.conversation_agent_snapshots
  alter column actor_kind drop default,
  alter column actor_lane_enforced drop default,
  drop constraint conversation_agent_snapshots_conversation_unique,
  add constraint conversation_agent_snapshots_actor_kind_valid check (
    actor_kind in ('contact', 'member', 'system', 'scheduler')
  ),
  add constraint conversation_agent_snapshots_actor_lane_enforced check (
    actor_lane_enforced
  ) not valid,
  add constraint conversation_agent_snapshots_actor_lane_unique
    unique (organization_id, channel_connection_id, conversation_id, actor_kind);

create function app_private.resolve_whatsapp_agent_actor(
  target_organization_id uuid,
  target_channel_connection_id uuid,
  target_conversation_id uuid
)
returns table (
  actor_kind text,
  actor_user_id uuid,
  actor_channel_identity_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    identity_value.principal_type,
    identity_value.member_user_id,
    identity_value.id
  from app_private.conversations as conversation_value
  join app_private.channel_connections as connection_value
    on connection_value.organization_id = conversation_value.organization_id
   and connection_value.id = conversation_value.channel_connection_id
  join app_private.channel_identities as identity_value
    on identity_value.organization_id = conversation_value.organization_id
   and identity_value.channel_connection_id = conversation_value.channel_connection_id
   and identity_value.id = conversation_value.primary_channel_identity_id
  left join app_private.organization_memberships as membership
    on membership.organization_id = identity_value.organization_id
   and membership.user_id = identity_value.member_user_id
  where conversation_value.organization_id = target_organization_id
    and conversation_value.channel_connection_id = target_channel_connection_id
    and conversation_value.id = target_conversation_id
    and conversation_value.status = 'open'
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active'
    and identity_value.status = 'active'
    and (
      (
        identity_value.principal_type = 'contact'
        and identity_value.trust_level = 'provider_observed'
        and identity_value.contact_id is not null
        and identity_value.member_user_id is null
      )
      or (
        identity_value.principal_type = 'member'
        and identity_value.trust_level = 'verified_member'
        and identity_value.member_user_id is not null
        and identity_value.verified_at is not null
        and membership.status = 'active'
        and membership.role in ('owner', 'admin', 'operator')
      )
    );
$$;

create function app_private.whatsapp_agent_run_actor_is_current(
  target_organization_id uuid,
  target_run_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from app_private.agent_runs as run_value
    cross join lateral app_private.resolve_whatsapp_agent_actor(
      run_value.organization_id,
      run_value.channel_connection_id,
      run_value.conversation_id
    ) as resolved_actor
    where run_value.organization_id = target_organization_id
      and run_value.id = target_run_id
      and resolved_actor.actor_kind = run_value.actor_kind
      and resolved_actor.actor_user_id is not distinct from run_value.actor_user_id
      and resolved_actor.actor_channel_identity_id
        is not distinct from run_value.actor_channel_identity_id
  );
$$;

create or replace function app_private.validate_agent_run()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot_policy_id uuid;
  snapshot_actor_kind text;
  snapshot_actor_lane_enforced boolean;
begin
  if not app_private.agent_model_route_is_valid(new.fallback_models) then
    raise exception using errcode = '22023', message = 'agent run fallback route is invalid';
  end if;

  if new.conversation_snapshot_id is not null then
    select snapshot.policy_version_id, snapshot.actor_kind, snapshot.actor_lane_enforced
    into snapshot_policy_id, snapshot_actor_kind, snapshot_actor_lane_enforced
    from app_private.conversation_agent_snapshots as snapshot
    where snapshot.organization_id = new.organization_id
      and snapshot.id = new.conversation_snapshot_id
      and snapshot.channel_connection_id = new.channel_connection_id
      and snapshot.conversation_id = new.conversation_id;
    if snapshot_policy_id is distinct from new.policy_version_id then
      raise exception using errcode = '23514', message = 'agent run does not match conversation snapshot';
    end if;
    if snapshot_actor_lane_enforced
      and snapshot_actor_kind is distinct from new.actor_kind then
      raise exception using errcode = '23514', message = 'agent run does not match snapshot actor lane';
    end if;
  end if;

  if tg_op = 'INSERT'
    and new.run_kind = 'conversation_turn'
    and new.actor_kind in ('contact', 'member')
    and not exists (
      select 1
      from app_private.conversations as conversation_value
      join app_private.channel_identities as identity_value
        on identity_value.organization_id = conversation_value.organization_id
       and identity_value.channel_connection_id = conversation_value.channel_connection_id
       and identity_value.id = conversation_value.primary_channel_identity_id
      left join app_private.organization_memberships as membership
        on membership.organization_id = identity_value.organization_id
       and membership.user_id = identity_value.member_user_id
      where conversation_value.organization_id = new.organization_id
        and conversation_value.channel_connection_id = new.channel_connection_id
        and conversation_value.id = new.conversation_id
        and conversation_value.status = 'open'
        and identity_value.id = new.actor_channel_identity_id
        and identity_value.status = 'active'
        and identity_value.principal_type = new.actor_kind
        and (
          (
            new.actor_kind = 'contact'
            and new.actor_user_id is null
            and identity_value.trust_level = 'provider_observed'
            and identity_value.contact_id is not null
            and identity_value.member_user_id is null
          )
          or (
            new.actor_kind = 'member'
            and new.actor_user_id = identity_value.member_user_id
            and identity_value.trust_level = 'verified_member'
            and identity_value.verified_at is not null
            and membership.status = 'active'
            and membership.role in ('owner', 'admin', 'operator')
          )
        )
    ) then
    raise exception using
      errcode = '42501',
      message = 'conversation run actor does not match an active channel identity';
  end if;

  return new;
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
    and app_private.whatsapp_agent_run_actor_is_current(
      run_value.organization_id,
      run_value.id
    )
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
      resolved_actor.actor_kind,
      resolved_actor.actor_user_id,
      resolved_actor.actor_channel_identity_id,
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
    cross join lateral app_private.resolve_whatsapp_agent_actor(
      message_value.organization_id,
      message_value.channel_connection_id,
      message_value.conversation_id
    ) as resolved_actor
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
      candidate_message.actor_kind,
      candidate_message.actor_user_id,
      candidate_message.actor_channel_identity_id,
      100,
      jsonb_build_object(
        'trigger_message_id', candidate_message.message_id,
        'channel', 'whatsapp',
        'source', 'store_inbound',
        'actor_kind', candidate_message.actor_kind
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
      case
        when candidate_message.actor_kind = 'member' then 'trusted_member'
        else 'untrusted_external'
      end,
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

revoke all on function app_private.resolve_whatsapp_agent_actor(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.whatsapp_agent_run_actor_is_current(uuid, uuid)
  from public, anon, authenticated, service_role;

comment on function app_private.resolve_whatsapp_agent_actor(uuid, uuid, uuid) is
  'Resolves a WhatsApp conversation actor only from its active immutable identity and, for members, a current authorized tenant membership.';
comment on function app_private.whatsapp_agent_run_actor_is_current(uuid, uuid) is
  'Revalidates that a WhatsApp run still matches the active exact conversation identity and current tenant membership.';
comment on function api.enqueue_agent_run(uuid, text, text, text, text, text, text, text, text, text, bytea, uuid, uuid, uuid, uuid, text, uuid, uuid, integer, jsonb, text, text) is
  'Enqueues an idempotent agent run and freezes policy/configuration in an actor-specific immutable conversation lane.';
comment on function api.get_agent_turn_tool_context(uuid, uuid, uuid, text, uuid) is
  'Returns only current contracts authorized for the frozen run actor, current membership role, channel, lease and WhatsApp identity.';
comment on function api.authorize_tool_execution(uuid, uuid) is
  'Revalidates contract state, actor kind, active member role, current WhatsApp identity, channel and budget immediately before execution.';
comment on function api.claim_whatsapp_agent_turn(text, text, text, text, text, text, integer, uuid) is
  'Claims a WhatsApp turn using the exact active channel identity; verified operators run as members and all other valid shoppers run as contacts.';

create or replace function api.enqueue_agent_run(
  target_organization_id uuid,
  target_idempotency_key text,
  target_run_key text,
  target_run_kind text,
  target_policy_key text,
  target_provider text,
  target_model text,
  target_vision_provider text,
  target_vision_model text,
  target_reasoning_effort text,
  target_cache_key_hash bytea,
  target_channel_connection_id uuid,
  target_conversation_id uuid,
  target_trigger_message_id uuid,
  target_source_inbound_event_id uuid,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_actor_channel_identity_id uuid,
  target_priority integer,
  target_payload_safe jsonb,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  agent_run_id uuid,
  agent_job_id uuid,
  conversation_snapshot_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_run_id uuid;
  target_job_id uuid;
  target_snapshot_id uuid;
  target_snapshot_policy_version_id uuid;
  target_configuration_snapshot jsonb;
  policy_record record;
  request_payload jsonb;
begin
  if target_payload_safe is null or jsonb_typeof(target_payload_safe) <> 'object' then
    raise exception using errcode = '22023', message = 'agent job payload must be an object';
  end if;
  if target_run_kind = 'conversation_turn' and target_conversation_id is null then
    raise exception using errcode = '22023', message = 'conversation turn requires a conversation';
  end if;
  if target_conversation_id is not null and target_channel_connection_id is null then
    raise exception using errcode = '22023', message = 'conversation run requires a channel connection';
  end if;
  if target_run_kind = 'conversation_turn'
    and target_actor_kind in ('contact', 'member')
    and target_actor_channel_identity_id is null then
    raise exception using errcode = '22023', message = 'conversation actor requires channel identity';
  end if;
  if target_run_kind = 'conversation_turn'
    and target_actor_kind = 'member'
    and target_actor_user_id is null then
    raise exception using errcode = '22023', message = 'member conversation actor requires user identity';
  end if;

  request_payload := jsonb_build_object(
    'run_key', target_run_key,
    'run_kind', target_run_kind,
    'policy_key', target_policy_key,
    'provider', target_provider,
    'model', target_model,
    'vision_provider', target_vision_provider,
    'vision_model', target_vision_model,
    'reasoning_effort', target_reasoning_effort,
    'cache_key_hash', case when target_cache_key_hash is null then null
      else encode(target_cache_key_hash, 'hex') end,
    'channel_connection_id', target_channel_connection_id,
    'conversation_id', target_conversation_id,
    'trigger_message_id', target_trigger_message_id,
    'source_inbound_event_id', target_source_inbound_event_id,
    'actor_kind', target_actor_kind,
    'actor_user_id', target_actor_user_id,
    'actor_channel_identity_id', target_actor_channel_identity_id,
    'priority', target_priority,
    'payload_safe', target_payload_safe,
    'correlation_id', target_correlation_id,
    'trace_id', target_trace_id
  );

  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id,
    target_idempotency_key,
    'agent_run.enqueue',
    request_payload,
    case when target_actor_kind = 'member' then target_actor_user_id else null end,
    array['owner', 'admin', 'operator']::text[],
    target_actor_kind <> 'member'
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select run_value.id, job_value.id, run_value.conversation_snapshot_id
    into agent_run_id, agent_job_id, conversation_snapshot_id
    from app_private.agent_commands as command_value
    join app_private.agent_runs as run_value
      on run_value.organization_id = command_value.organization_id
     and run_value.id = command_value.result_id
    join app_private.agent_jobs as job_value
      on job_value.organization_id = run_value.organization_id
     and job_value.run_id = run_value.id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    was_replayed := true;
    return next;
    return;
  end if;

  if target_conversation_id is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      target_organization_id::text || ':' || target_channel_connection_id::text || ':' ||
      target_conversation_id::text, 0
    ));

    if not exists (
      select 1
      from app_private.conversations as conversation_value
      where conversation_value.organization_id = target_organization_id
        and conversation_value.channel_connection_id = target_channel_connection_id
        and conversation_value.id = target_conversation_id
        and conversation_value.status = 'open'
        and (
          target_run_kind <> 'conversation_turn'
          or target_actor_kind not in ('contact', 'member')
          or conversation_value.primary_channel_identity_id = target_actor_channel_identity_id
        )
    ) then
      raise exception using errcode = '42501', message = 'agent conversation is unavailable for this actor';
    end if;

    if target_run_kind = 'conversation_turn'
      and target_actor_kind in ('contact', 'member')
      and not exists (
        select 1
        from app_private.channel_identities as identity_value
        left join app_private.organization_memberships as membership
          on membership.organization_id = identity_value.organization_id
         and membership.user_id = identity_value.member_user_id
        where identity_value.organization_id = target_organization_id
          and identity_value.channel_connection_id = target_channel_connection_id
          and identity_value.id = target_actor_channel_identity_id
          and identity_value.status = 'active'
          and identity_value.principal_type = target_actor_kind
          and (
            (
              target_actor_kind = 'contact'
              and target_actor_user_id is null
              and identity_value.trust_level = 'provider_observed'
              and identity_value.contact_id is not null
              and identity_value.member_user_id is null
            )
            or (
              target_actor_kind = 'member'
              and identity_value.trust_level = 'verified_member'
              and identity_value.verified_at is not null
              and identity_value.member_user_id = target_actor_user_id
              and membership.status = 'active'
              and membership.role in ('owner', 'admin', 'operator')
            )
          )
      ) then
      raise exception using errcode = '42501', message = 'agent conversation identity is not authorized';
    end if;

    select snapshot.id, snapshot.configuration_snapshot, snapshot.policy_version_id
    into target_snapshot_id, target_configuration_snapshot, target_snapshot_policy_version_id
    from app_private.conversation_agent_snapshots as snapshot
    where snapshot.organization_id = target_organization_id
      and snapshot.channel_connection_id = target_channel_connection_id
      and snapshot.conversation_id = target_conversation_id
      and snapshot.actor_kind = target_actor_kind;

    if target_snapshot_id is not null then
      select version_value.*, policy_value.policy_key
      into policy_record
      from app_private.agent_policy_versions as version_value
      join app_private.agent_policies as policy_value
        on policy_value.organization_id = version_value.organization_id
       and policy_value.id = version_value.policy_id
      where version_value.organization_id = target_organization_id
        and version_value.id = target_snapshot_policy_version_id;
      if not found then
        raise exception using errcode = '23514', message = 'conversation agent snapshot policy is missing';
      end if;
      if policy_record.policy_key <> target_policy_key then
        raise exception using
          errcode = '40001',
          message = 'conversation actor lane is pinned to a different agent policy';
      end if;
    end if;
  end if;

  if target_snapshot_id is null then
    select version_value.*, policy_value.policy_key
    into policy_record
    from app_private.agent_policies as policy_value
    join app_private.agent_policy_versions as version_value
      on version_value.organization_id = policy_value.organization_id
     and version_value.policy_id = policy_value.id
     and version_value.id = policy_value.current_version_id
    where policy_value.organization_id = target_organization_id
      and policy_value.policy_key = target_policy_key
      and policy_value.status = 'active';
    if not found then
      raise exception using errcode = 'P0002', message = 'active agent policy not found';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
      'configuration_id', configuration_value.id,
      'configuration_version_id', configuration_value.current_version_id
    ) order by configuration_value.configuration_key), '[]'::jsonb)
    into target_configuration_snapshot
    from app_private.business_configurations as configuration_value
    where configuration_value.organization_id = target_organization_id
      and configuration_value.status = 'active';

    if target_conversation_id is not null then
      insert into app_private.conversation_agent_snapshots (
        organization_id, channel_connection_id, conversation_id,
        policy_version_id, configuration_snapshot, actor_kind, actor_lane_enforced
      ) values (
        target_organization_id, target_channel_connection_id, target_conversation_id,
        policy_record.id, target_configuration_snapshot, target_actor_kind, true
      ) returning id into target_snapshot_id;
    end if;
  end if;

  insert into app_private.agent_runs (
    organization_id, run_key, run_kind,
    channel_connection_id, conversation_id, trigger_message_id,
    source_inbound_event_id, conversation_snapshot_id,
    actor_kind, actor_user_id, actor_channel_identity_id,
    policy_version_id, provider, model, vision_provider, vision_model,
    reasoning_effort, cache_mode, cache_key_hash, fallback_models,
    max_tool_rounds, max_provider_attempts, max_parallel_tools,
    turn_timeout_ms, max_cost_amount, cost_currency, unknown_cost_behavior,
    correlation_id, trace_id
  ) values (
    target_organization_id, target_run_key, target_run_kind,
    target_channel_connection_id, target_conversation_id, target_trigger_message_id,
    target_source_inbound_event_id, target_snapshot_id,
    target_actor_kind, target_actor_user_id, target_actor_channel_identity_id,
    policy_record.id, target_provider, target_model, target_vision_provider, target_vision_model,
    target_reasoning_effort, policy_record.cache_mode, target_cache_key_hash,
    policy_record.fallback_models, policy_record.max_tool_rounds,
    policy_record.max_provider_attempts, policy_record.max_parallel_tools,
    policy_record.turn_timeout_ms, policy_record.max_cost_amount,
    policy_record.cost_currency, policy_record.unknown_cost_behavior,
    target_correlation_id, target_trace_id
  ) returning id into target_run_id;

  insert into app_private.agent_run_configurations (
    organization_id, run_id, configuration_id, configuration_version_id
  )
  select target_organization_id, target_run_id,
         (item.value ->> 'configuration_id')::uuid,
         (item.value ->> 'configuration_version_id')::uuid
  from jsonb_array_elements(target_configuration_snapshot) as item(value);

  insert into app_private.agent_jobs (
    organization_id, run_id, idempotency_key, job_kind,
    priority, max_attempts, payload_safe
  ) values (
    target_organization_id, target_run_id,
    'agent-job:' || encode(extensions.digest(convert_to(target_idempotency_key, 'UTF8'), 'sha256'), 'hex'),
    'agent_turn', target_priority, policy_record.max_provider_attempts, target_payload_safe
  ) returning id into target_job_id;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id, 'agent_run', target_run_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_run.enqueued', target_actor_kind,
    case when target_actor_kind = 'member' then target_actor_user_id else null end,
    target_correlation_id, target_trace_id,
    jsonb_build_object(
      'run_key', target_run_key,
      'run_kind', target_run_kind,
      'policy_version_id', policy_record.id,
      'policy_key', policy_record.policy_key,
      'provider', target_provider,
      'model', target_model,
      'conversation_snapshot_id', target_snapshot_id,
      'snapshot_actor_kind', target_actor_kind
    ), target_run_id, target_job_id
  );
  agent_run_id := target_run_id;
  agent_job_id := target_job_id;
  conversation_snapshot_id := target_snapshot_id;
  was_replayed := false;
  return next;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'agent configuration snapshot UUID is invalid';
end;
$$;

create or replace function app_private.customer_assistant_read_tools_ready(
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
        and policy_tool.allowed_actor_kinds @> array['contact', 'member']::text[]
        and policy_tool.allowed_channels @> array['whatsapp']::text[]
    );
$$;

create or replace function app_private.ensure_customer_assistant_read_tools(
  target_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_actor_user_id uuid;
  selected_policy_version app_private.agent_policy_versions%rowtype;
  selected_contract_version_id uuid;
  selected_contract_hash bytea;
  expected_contract_hash bytea;
  definition_record record;
  tool_versions jsonb := '{}'::jsonb;
  target_bindings jsonb;
  created_policy record;
begin
  if target_organization_id is null then
    raise exception using errcode = '22023', message = 'organization is required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':customer-read-tools', 0)
  );

  perform app_private.ensure_customer_assistant_policy(target_organization_id);

  select membership.user_id
  into selected_actor_user_id
  from app_private.organization_memberships as membership
  where membership.organization_id = target_organization_id
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
  order by case membership.role when 'owner' then 0 else 1 end,
    membership.created_at, membership.user_id
  limit 1;

  if selected_actor_user_id is null then
    raise exception using errcode = '55000', message = 'organization needs an active owner or admin';
  end if;

  for definition_record in
    select * from jsonb_to_recordset(jsonb_build_array(
      jsonb_build_object(
        'tool_name', 'conversation_get_context',
        'display_name', 'Contexto de conversación',
        'description', 'Consulta el contexto durable de la conversación actual, incluida la referencia de la publicación y la ventana de servicio. Úsala cuando necesites confirmar de dónde llegó el cliente o su contexto actual.',
        'handler_key', 'conversation.context.read.v1',
        'input_schema', jsonb_build_object(
          'type', 'object', 'properties', jsonb_build_object(),
          'additionalProperties', false
        ),
        'output_schema', jsonb_build_object('type', 'object', 'additionalProperties', true)
      ),
      jsonb_build_object(
        'tool_name', 'catalog_search',
        'display_name', 'Buscar catálogo',
        'description', 'Busca productos y variantes activas del catálogo real de este negocio. Úsala antes de afirmar que existe un producto, recomendar alternativas o buscar por nombre, descripción, SKU o especificaciones.',
        'handler_key', 'catalog.search.read.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'query', jsonb_build_object('type', 'string', 'minLength', 1, 'maxLength', 500),
            'limit', jsonb_build_object('type', 'integer', 'minimum', 1, 'maximum', 20)
          ),
          'required', jsonb_build_array('query'),
          'additionalProperties', false
        ),
        'output_schema', jsonb_build_object('type', 'object', 'additionalProperties', true)
      ),
      jsonb_build_object(
        'tool_name', 'catalog_get_offer',
        'display_name', 'Consultar oferta exacta',
        'description', 'Obtiene precio vigente y existencia para una variante, unidad y cantidad exactas. Úsala después de identificar la variante; nunca deduzcas el precio de una cantidad usando otra.',
        'handler_key', 'catalog.offer.read.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'variant_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'unit_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'quantity', jsonb_build_object('type', 'number', 'exclusiveMinimum', 0)
          ),
          'required', jsonb_build_array('variant_id', 'unit_id', 'quantity'),
          'additionalProperties', false
        ),
        'output_schema', jsonb_build_object('type', 'object', 'additionalProperties', true)
      )
    )) as tool_definition(
      tool_name text,
      display_name text,
      description text,
      handler_key text,
      input_schema jsonb,
      output_schema jsonb
    )
  loop
    expected_contract_hash := extensions.digest(jsonb_build_object(
      'description', definition_record.description,
      'input_schema', definition_record.input_schema,
      'output_schema', definition_record.output_schema,
      'effect_class', 'read_only',
      'handler_key', definition_record.handler_key
    )::text, 'sha256');

    select contract_value.current_version_id, version_value.contract_hash
    into selected_contract_version_id, selected_contract_hash
    from app_private.tool_contracts as contract_value
    left join app_private.tool_contract_versions as version_value
      on version_value.organization_id = contract_value.organization_id
     and version_value.id = contract_value.current_version_id
    where contract_value.organization_id = target_organization_id
      and contract_value.tool_name = definition_record.tool_name;

    if selected_contract_version_id is null
      or selected_contract_hash is distinct from expected_contract_hash then
      select registered.tool_contract_version_id
      into selected_contract_version_id
      from api.register_tool_contract_version(
        target_organization_id,
        'b3-002a:tool:' || definition_record.tool_name || ':' || encode(expected_contract_hash, 'hex'),
        definition_record.tool_name,
        definition_record.display_name,
        definition_record.description,
        definition_record.input_schema,
        definition_record.output_schema,
        'read_only',
        definition_record.handler_key,
        selected_contract_version_id,
        'active',
        selected_actor_user_id,
        'b3-002a:tool-bootstrap:' || target_organization_id::text,
        null
      ) as registered;
    end if;

    tool_versions := tool_versions || jsonb_build_object(
      definition_record.tool_name, selected_contract_version_id
    );
    selected_contract_version_id := null;
    selected_contract_hash := null;
  end loop;

  select version_value.*
  into selected_policy_version
  from app_private.agent_policies as policy_value
  join app_private.agent_policy_versions as version_value
    on version_value.organization_id = policy_value.organization_id
   and version_value.id = policy_value.current_version_id
  where policy_value.organization_id = target_organization_id
    and policy_value.policy_key = 'customer_assistant'
    and policy_value.status = 'active'
  for update of policy_value;

  if not found then
    raise exception using errcode = '55000', message = 'customer assistant policy bootstrap failed';
  end if;

  if (
    select count(*) = 3
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = target_organization_id
      and policy_tool.policy_version_id = selected_policy_version.id
      and contract_value.tool_name in (
        'conversation_get_context', 'catalog_search', 'catalog_get_offer'
      )
      and policy_tool.tool_contract_version_id = (tool_versions ->> contract_value.tool_name)::uuid
      and policy_tool.allowed_actor_kinds @> array['contact', 'member']::text[]
      and policy_tool.allowed_channels @> array['whatsapp']::text[]
  ) then
    return selected_policy_version.id;
  end if;

  select coalesce(jsonb_agg(binding_value order by tool_name), '[]'::jsonb)
  into target_bindings
  from (
    select contract_value.tool_name,
      jsonb_build_object(
        'tool_contract_version_id', policy_tool.tool_contract_version_id,
        'allowed_actor_kinds', to_jsonb(policy_tool.allowed_actor_kinds),
        'required_membership_roles', to_jsonb(policy_tool.required_membership_roles),
        'allowed_channels', to_jsonb(policy_tool.allowed_channels),
        'authorization_constraints', policy_tool.authorization_constraints
      ) as binding_value
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = target_organization_id
      and policy_tool.policy_version_id = selected_policy_version.id
      and contract_value.tool_name not in (
        'conversation_get_context', 'catalog_search', 'catalog_get_offer'
      )
  ) as existing_binding;

  target_bindings := target_bindings || jsonb_build_array(
    jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> 'conversation_get_context',
      'allowed_actor_kinds', jsonb_build_array('contact', 'member'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'current_conversation')
    ),
    jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> 'catalog_search',
      'allowed_actor_kinds', jsonb_build_array('contact', 'member'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'active_catalog')
    ),
    jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> 'catalog_get_offer',
      'allowed_actor_kinds', jsonb_build_array('contact', 'member'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'active_catalog')
    )
  );

  select * into created_policy
  from api.create_agent_policy_version(
    target_organization_id,
    'b3-002a:policy:' || encode(extensions.digest(
      convert_to(
        selected_policy_version.id::text || tool_versions::text || ':contact+member',
        'UTF8'
      ),
      'sha256'
    ), 'hex'),
    'customer_assistant',
    'Asistente comercial de tienda',
    selected_policy_version.prompt_version_id,
    selected_policy_version.max_tool_rounds,
    selected_policy_version.max_provider_attempts,
    selected_policy_version.max_parallel_tools,
    selected_policy_version.turn_timeout_ms,
    selected_policy_version.cache_mode,
    selected_policy_version.max_cost_amount,
    selected_policy_version.cost_currency,
    selected_policy_version.unknown_cost_behavior,
    selected_policy_version.fallback_models,
    target_bindings,
    selected_policy_version.id,
    true,
    selected_actor_user_id,
    'b3-002a:policy-bootstrap:' || target_organization_id::text,
    null
  );

  return created_policy.agent_policy_version_id;
end;
$$;

create or replace function api.get_agent_turn_tool_context(
  target_organization_id uuid,
  target_run_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid
)
returns table (
  tool_definitions jsonb,
  tool_history jsonb,
  next_tool_round integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  job_record app_private.agent_jobs%rowtype;
begin
  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id;

  if not found or attempt_record.run_id <> target_run_id
    or attempt_record.status <> 'running'
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token then
    raise exception using errcode = '42501', message = 'agent tool context attempt lease is invalid';
  end if;

  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = attempt_record.job_id;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id;

  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or run_record.status <> 'running' then
    raise exception using errcode = '42501', message = 'agent tool context job lease is invalid';
  end if;

  next_tool_round := run_record.tool_round_count + 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'name', contract_value.tool_name,
      'description', version_value.description,
      'parameters', version_value.input_schema
    ) order by contract_value.tool_name
  ), '[]'::jsonb)
  into tool_definitions
  from app_private.agent_policy_tools as policy_tool
  join app_private.tool_contracts as contract_value
    on contract_value.organization_id = policy_tool.organization_id
   and contract_value.id = policy_tool.tool_contract_id
  join app_private.tool_contract_versions as version_value
    on version_value.organization_id = policy_tool.organization_id
   and version_value.id = policy_tool.tool_contract_version_id
  left join app_private.channel_connections as connection_value
    on connection_value.organization_id = run_record.organization_id
   and connection_value.id = run_record.channel_connection_id
  where policy_tool.organization_id = target_organization_id
    and policy_tool.policy_version_id = run_record.policy_version_id
    and contract_value.status = 'active'
    and run_record.actor_kind = any(policy_tool.allowed_actor_kinds)
    and (
      (
        run_record.actor_kind = 'member'
        and exists (
          select 1
          from app_private.organization_memberships as membership
          where membership.organization_id = target_organization_id
            and membership.user_id = run_record.actor_user_id
            and membership.status = 'active'
            and (
              cardinality(policy_tool.required_membership_roles) = 0
              or membership.role = any(policy_tool.required_membership_roles)
            )
        )
      )
      or (
        run_record.actor_kind <> 'member'
        and cardinality(policy_tool.required_membership_roles) = 0
      )
    )
    and (
      connection_value.id is null
      or connection_value.provider <> 'meta'
      or connection_value.channel <> 'whatsapp'
      or app_private.whatsapp_agent_run_actor_is_current(
        target_organization_id,
        target_run_id
      )
    )
    and (
      cardinality(policy_tool.allowed_channels) = 0
      or connection_value.channel = any(policy_tool.allowed_channels)
    )
    and next_tool_round <= run_record.max_tool_rounds;

  select coalesce(jsonb_agg(
    jsonb_build_object('call', call_message.content, 'result', result_message.content)
    order by call_message.sequence_number
  ), '[]'::jsonb)
  into tool_history
  from app_private.agent_messages as call_message
  join app_private.agent_messages as result_message
    on result_message.organization_id = call_message.organization_id
   and result_message.run_id = call_message.run_id
   and result_message.message_kind = 'tool_result'
   and result_message.content ->> 'provider_tool_call_id'
       = call_message.content #>> '{tool_call,id}'
  where call_message.organization_id = target_organization_id
    and call_message.run_id = target_run_id
    and call_message.message_kind = 'tool_call';

  return next;
end;
$$;

create or replace function api.authorize_tool_execution(
  target_organization_id uuid,
  target_tool_execution_id uuid
)
returns table (
  tool_execution_id uuid,
  status text,
  authorization_status text,
  authorization_reason text,
  authorization_constraints jsonb,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_record app_private.tool_executions%rowtype;
  run_record app_private.agent_runs%rowtype;
  policy_tool_record app_private.agent_policy_tools%rowtype;
  contract_status text;
  channel_name text;
  channel_provider text;
  actor_role text;
  target_allowed boolean := true;
  target_reason text := 'policy_allowed';
begin
  select * into execution_record
  from app_private.tool_executions as execution_value
  where execution_value.organization_id = target_organization_id
    and execution_value.id = target_tool_execution_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tool execution not found';
  end if;

  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = execution_record.run_id
  for update;
  select * into policy_tool_record
  from app_private.agent_policy_tools as policy_tool
  where policy_tool.organization_id = target_organization_id
    and policy_tool.id = execution_record.policy_tool_id;

  if execution_record.authorization_status <> 'pending' then
    tool_execution_id := execution_record.id;
    status := execution_record.status;
    authorization_status := execution_record.authorization_status;
    authorization_reason := execution_record.authorization_reason;
    authorization_constraints := policy_tool_record.authorization_constraints;
    was_replayed := true;
    return next;
    return;
  end if;

  select contract_value.status into contract_status
  from app_private.tool_contracts as contract_value
  where contract_value.organization_id = target_organization_id
    and contract_value.id = execution_record.tool_contract_id;

  if contract_status is distinct from 'active' then
    target_allowed := false;
    target_reason := 'tool_emergency_disabled';
  elsif not (run_record.actor_kind = any(policy_tool_record.allowed_actor_kinds)) then
    target_allowed := false;
    target_reason := 'actor_kind_not_allowed';
  end if;

  if target_allowed and run_record.actor_kind = 'member' then
    select membership.role into actor_role
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = run_record.actor_user_id
      and membership.status = 'active';

    if actor_role is null then
      target_allowed := false;
      target_reason := 'member_inactive';
    elsif cardinality(policy_tool_record.required_membership_roles) > 0
      and not (actor_role = any(policy_tool_record.required_membership_roles)) then
      target_allowed := false;
      target_reason := 'member_role_not_allowed';
    end if;
  elsif target_allowed
    and cardinality(policy_tool_record.required_membership_roles) > 0 then
    target_allowed := false;
    target_reason := 'member_role_required';
  end if;

  select connection.channel, connection.provider
  into channel_name, channel_provider
  from app_private.channel_connections as connection
  where connection.organization_id = target_organization_id
    and connection.id = run_record.channel_connection_id
    and connection.status = 'active';

  if target_allowed
    and channel_provider = 'meta'
    and channel_name = 'whatsapp'
    and not app_private.whatsapp_agent_run_actor_is_current(
      target_organization_id,
      run_record.id
    ) then
    target_allowed := false;
    target_reason := 'whatsapp_actor_not_current';
  end if;

  if target_allowed and cardinality(policy_tool_record.allowed_channels) > 0 then
    if channel_name is null or not (channel_name = any(policy_tool_record.allowed_channels)) then
      target_allowed := false;
      target_reason := 'channel_not_allowed';
    end if;
  end if;

  if target_allowed and (
    run_record.budget_status = 'exceeded'
    or (run_record.budget_status = 'unknown' and run_record.unknown_cost_behavior = 'block')
  ) then
    target_allowed := false;
    target_reason := 'cost_budget_not_authorized';
  end if;

  update app_private.tool_executions
  set status = case when target_allowed then 'authorized' else 'blocked' end,
      authorization_status = case when target_allowed then 'allowed' else 'blocked' end,
      authorization_reason = target_reason,
      authorized_at = statement_timestamp(),
      completed_at = case when target_allowed then null else statement_timestamp() end,
      effect_certainty = case when target_allowed then effect_certainty else 'confirmed_not_applied' end
  where organization_id = target_organization_id and id = execution_record.id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'tool_execution.authorization_decided', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'authorization_status', case when target_allowed then 'allowed' else 'blocked' end,
      'authorization_reason', target_reason
    ), run_record.id, null, execution_record.job_attempt_id,
    execution_record.id
  );
  tool_execution_id := execution_record.id;
  status := case when target_allowed then 'authorized' else 'blocked' end;
  authorization_status := case when target_allowed then 'allowed' else 'blocked' end;
  authorization_reason := target_reason;
  authorization_constraints := policy_tool_record.authorization_constraints;
  was_replayed := false;
  return next;
end;
$$;

create function api.link_whatsapp_member_identity(
  target_organization_id uuid,
  target_idempotency_key text,
  target_channel_identity_id uuid,
  target_member_user_id uuid,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  channel_identity_id uuid,
  member_user_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  existing_command app_private.agent_commands%rowtype;
  source_identity app_private.channel_identities%rowtype;
  created_identity app_private.channel_identities%rowtype;
  request_payload jsonb;
  target_now timestamptz := statement_timestamp();
begin
  request_payload := jsonb_build_object(
    'channel_identity_id', target_channel_identity_id,
    'member_user_id', target_member_user_id
  );

  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id,
    target_idempotency_key,
    'whatsapp_identity.link_member',
    request_payload,
    target_actor_user_id,
    array['owner', 'admin']::text[],
    false
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select * into existing_command
    from app_private.agent_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;

    select identity_value.* into created_identity
    from app_private.channel_identities as identity_value
    where identity_value.organization_id = target_organization_id
      and identity_value.id = existing_command.result_id
      and identity_value.principal_type = 'member'
      and identity_value.member_user_id = target_member_user_id;
    if not found then
      raise exception using errcode = '23514', message = 'linked member identity result is unavailable';
    end if;

    channel_identity_id := created_identity.id;
    member_user_id := created_identity.member_user_id;
    was_replayed := true;
    return next;
    return;
  end if;

  if not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_member_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  ) then
    raise exception using errcode = '42501', message = 'target member is not active or eligible for WhatsApp operations';
  end if;

  select identity_value.* into source_identity
  from app_private.channel_identities as identity_value
  join app_private.channel_connections as connection_value
    on connection_value.organization_id = identity_value.organization_id
   and connection_value.id = identity_value.channel_connection_id
  where identity_value.organization_id = target_organization_id
    and identity_value.id = target_channel_identity_id
    and identity_value.principal_type = 'contact'
    and identity_value.trust_level = 'provider_observed'
    and identity_value.status in ('active', 'blocked')
    and connection_value.provider = 'meta'
    and connection_value.channel = 'whatsapp'
    and connection_value.status = 'active';
  if not found then
    raise exception using errcode = 'P0002', message = 'eligible WhatsApp contact identity not found';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    source_identity.channel_connection_id::text || ':' || source_identity.external_subject_id,
    0
  ));

  select identity_value.* into source_identity
  from app_private.channel_identities as identity_value
  where identity_value.organization_id = target_organization_id
    and identity_value.channel_connection_id = source_identity.channel_connection_id
    and identity_value.id = target_channel_identity_id
    and identity_value.principal_type = 'contact'
    and identity_value.trust_level = 'provider_observed'
    and identity_value.status in ('active', 'blocked')
  for update;
  if not found then
    raise exception using errcode = '40001', message = 'WhatsApp identity changed while it was being linked';
  end if;

  update app_private.conversations
  set status = 'closed',
      closed_at = greatest(target_now, opened_at),
      updated_at = greatest(target_now, updated_at)
  where organization_id = target_organization_id
    and channel_connection_id = source_identity.channel_connection_id
    and primary_channel_identity_id = source_identity.id
    and status = 'open';

  update app_private.channel_identities
  set status = 'revoked',
      revoked_at = greatest(target_now, created_at),
      updated_at = greatest(target_now, updated_at)
  where organization_id = target_organization_id
    and channel_connection_id = source_identity.channel_connection_id
    and id = source_identity.id;

  insert into app_private.channel_identities (
    organization_id,
    channel_connection_id,
    external_subject_id,
    principal_type,
    member_user_id,
    trust_level,
    display_name,
    status,
    verified_at,
    linked_by_user_id,
    last_seen_at,
    created_at,
    updated_at
  ) values (
    target_organization_id,
    source_identity.channel_connection_id,
    source_identity.external_subject_id,
    'member',
    target_member_user_id,
    'verified_member',
    source_identity.display_name,
    'active',
    target_now,
    target_actor_user_id,
    greatest(target_now, coalesce(source_identity.last_seen_at, target_now)),
    target_now,
    target_now
  ) returning * into created_identity;

  perform app_private.complete_agent_command(
    target_organization_id,
    target_command_id,
    'channel_identity',
    created_identity.id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'whatsapp_identity.member_linked',
    'member',
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'previous_channel_identity_id', source_identity.id,
      'channel_identity_id', created_identity.id,
      'member_user_id', target_member_user_id,
      'channel_connection_id', source_identity.channel_connection_id
    )
  );

  channel_identity_id := created_identity.id;
  member_user_id := created_identity.member_user_id;
  was_replayed := false;
  return next;
end;
$$;

revoke all on function api.link_whatsapp_member_identity(uuid, text, uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function api.link_whatsapp_member_identity(uuid, text, uuid, uuid, uuid, text, text)
  to service_role;

comment on function api.link_whatsapp_member_identity(uuid, text, uuid, uuid, uuid, text, text) is
  'Idempotently replaces an observed WhatsApp contact identity with a verified active member identity while preserving closed conversation history.';

notify pgrst, 'reload schema';

commit;
