begin;

set local search_path = '';

-- Provider attempts are a per-round allowance. The historical counters remain
-- monotonic for audit and the unique (job_id, attempt_number) contract.
alter table app_private.agent_runs
  drop constraint agent_runs_limits_valid,
  add constraint agent_runs_limits_valid check (
    max_tool_rounds between 1 and 64
    and max_provider_attempts between 1 and 32 * (max_tool_rounds + 1)
    and max_parallel_tools between 1 and 64
    and turn_timeout_ms between 1 and 600000
    and tool_round_count between 0 and max_tool_rounds
    and provider_attempt_count between 0 and max_provider_attempts
    and continuation_sequence >= 0
  );

alter table app_private.agent_jobs
  drop constraint agent_jobs_attempts_valid,
  add constraint agent_jobs_attempts_valid check (
    max_attempts between 1 and 2080
    and attempt_count between 0 and max_attempts
  );

create function app_private.next_agent_tool_round_attempt_budget(
  current_budget integer,
  per_round_budget integer,
  completed_tool_round integer,
  maximum_tool_rounds integer
)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if per_round_budget not between 1 and 32
    or maximum_tool_rounds not between 1 and 64
    or completed_tool_round not between 1 and maximum_tool_rounds
    or current_budget < per_round_budget
    or current_budget > per_round_budget * completed_tool_round then
    raise exception using errcode = '22023', message = 'agent tool-round attempt budget is invalid';
  end if;
  return current_budget + per_round_budget;
end;
$$;

revoke all on function app_private.next_agent_tool_round_attempt_budget(integer, integer, integer, integer)
  from public, anon, authenticated, service_role;

create function app_private.replenish_agent_job_after_tools()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  per_round_budget integer;
begin
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = new.organization_id
    and run_value.id = new.run_id;
  select version_value.max_provider_attempts into per_round_budget
  from app_private.agent_policy_versions as version_value
  where version_value.organization_id = run_record.organization_id
    and version_value.id = run_record.policy_version_id;
  if per_round_budget is null then
    raise exception using errcode = '23514', message = 'agent policy attempt budget is missing';
  end if;
  new.max_attempts := app_private.next_agent_tool_round_attempt_budget(
    old.max_attempts, per_round_budget, run_record.tool_round_count, run_record.max_tool_rounds
  );
  new.last_error_code := null;
  return new;
end;
$$;

revoke all on function app_private.replenish_agent_job_after_tools()
  from public, anon, authenticated, service_role;

create trigger agent_job_replenish_after_tools
before update of status on app_private.agent_jobs
for each row when (old.status = 'waiting_tools' and new.status = 'retryable')
execute function app_private.replenish_agent_job_after_tools();

create function app_private.replenish_agent_run_after_tools()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  per_round_budget integer;
begin
  select version_value.max_provider_attempts into per_round_budget
  from app_private.agent_policy_versions as version_value
  where version_value.organization_id = new.organization_id
    and version_value.id = new.policy_version_id;
  if per_round_budget is null then
    raise exception using errcode = '23514', message = 'agent policy attempt budget is missing';
  end if;
  new.max_provider_attempts := app_private.next_agent_tool_round_attempt_budget(
    old.max_provider_attempts, per_round_budget, new.tool_round_count, new.max_tool_rounds
  );
  return new;
end;
$$;

revoke all on function app_private.replenish_agent_run_after_tools()
  from public, anon, authenticated, service_role;

create trigger agent_run_replenish_after_tools
before update of status on app_private.agent_runs
for each row when (old.status = 'waiting_tool' and new.status = 'waiting_provider')
execute function app_private.replenish_agent_run_after_tools();

-- Keep the frozen execution contract immutable. Only the exact policy-derived
-- allowance for a completed tool round may change during the resume transition.
create or replace function app_private.prevent_agent_job_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  per_round_budget integer;
begin
  if row(
    old.organization_id, old.run_id, old.idempotency_key, old.job_kind,
    old.priority, old.payload_safe, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_id, new.idempotency_key, new.job_kind,
    new.priority, new.payload_safe, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'agent job core contract is immutable';
  end if;
  if old.max_attempts is distinct from new.max_attempts then
    select * into run_record
    from app_private.agent_runs as run_value
    where run_value.organization_id = old.organization_id and run_value.id = old.run_id;
    select version_value.max_provider_attempts into per_round_budget
    from app_private.agent_policy_versions as version_value
    where version_value.organization_id = run_record.organization_id
      and version_value.id = run_record.policy_version_id;
    if old.status is distinct from 'waiting_tools'
      or new.status is distinct from 'retryable'
      or run_record.status is distinct from 'waiting_tool'
      or per_round_budget is null
      or new.max_attempts is distinct from app_private.next_agent_tool_round_attempt_budget(
        old.max_attempts, per_round_budget, run_record.tool_round_count, run_record.max_tool_rounds
      ) then
      raise exception using errcode = '23514', message = 'agent job core contract is immutable';
    end if;
  end if;
  return new;
end;
$$;

create or replace function app_private.prevent_agent_run_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  per_round_budget integer;
begin
  if row(
    old.organization_id, old.run_key, old.run_kind,
    old.channel_connection_id, old.conversation_id, old.trigger_message_id,
    old.source_inbound_event_id, old.conversation_snapshot_id,
    old.actor_kind, old.actor_user_id, old.actor_channel_identity_id,
    old.policy_version_id, old.provider, old.model, old.vision_provider, old.vision_model,
    old.reasoning_effort, old.cache_mode, old.cache_key_hash, old.fallback_models,
    old.max_tool_rounds, old.max_parallel_tools,
    old.turn_timeout_ms, old.max_cost_amount, old.cost_currency,
    old.unknown_cost_behavior, old.correlation_id, old.trace_id, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_key, new.run_kind,
    new.channel_connection_id, new.conversation_id, new.trigger_message_id,
    new.source_inbound_event_id, new.conversation_snapshot_id,
    new.actor_kind, new.actor_user_id, new.actor_channel_identity_id,
    new.policy_version_id, new.provider, new.model, new.vision_provider, new.vision_model,
    new.reasoning_effort, new.cache_mode, new.cache_key_hash, new.fallback_models,
    new.max_tool_rounds, new.max_parallel_tools,
    new.turn_timeout_ms, new.max_cost_amount, new.cost_currency,
    new.unknown_cost_behavior, new.correlation_id, new.trace_id, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'agent run execution contract is immutable';
  end if;
  if old.max_provider_attempts is distinct from new.max_provider_attempts then
    select version_value.max_provider_attempts into per_round_budget
    from app_private.agent_policy_versions as version_value
    where version_value.organization_id = old.organization_id
      and version_value.id = old.policy_version_id;
    if old.status is distinct from 'waiting_tool'
      or new.status is distinct from 'waiting_provider'
      or per_round_budget is null
      or new.max_provider_attempts is distinct from app_private.next_agent_tool_round_attempt_budget(
        old.max_provider_attempts, per_round_budget, new.tool_round_count, new.max_tool_rounds
      ) then
      raise exception using errcode = '23514', message = 'agent run execution contract is immutable';
    end if;
  end if;
  return new;
end;
$$;

commit;
