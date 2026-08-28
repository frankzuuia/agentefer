export const b3001aDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "expose customer tool preparation to authenticated callers",
    sql: `grant execute on function api.prepare_customer_assistant_read_tools(integer)
      to authenticated;`,
  }),
  Object.freeze({
    name: "expose leased tool history to authenticated callers",
    sql: `grant execute on function api.get_agent_turn_tool_context(uuid, uuid, uuid, text, uuid)
      to authenticated;`,
  }),
  Object.freeze({
    name: "expose atomic tool execution to authenticated callers",
    sql: `grant execute on function api.execute_whatsapp_read_only_tool_call(
      uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
    ) to authenticated;`,
  }),
  Object.freeze({
    name: "allow service role to bypass the atomic catalog search boundary",
    sql: `grant execute on function app_private.catalog_search_for_agent(uuid, jsonb)
      to service_role;`,
  }),
  Object.freeze({
    name: "allow service role to bypass the atomic catalog offer boundary",
    sql: `grant execute on function app_private.catalog_offer_for_agent(uuid, jsonb)
      to service_role;`,
  }),
  Object.freeze({
    name: "widen the model-controlled catalog search result limit",
    find: "target_limit not between 1 and 20",
    replacement: "target_limit not between 1 and 100",
  }),
  Object.freeze({
    name: "remove catalog search tenant isolation",
    find: `    where product_value.organization_id = target_organization_id
      and product_value.status = 'active'`,
    replacement: `    where product_value.organization_id is not null
      and product_value.status = 'active'`,
  }),
  Object.freeze({
    name: "remove catalog offer tenant isolation",
    find: `  where variant_value.organization_id = target_organization_id
    and variant_value.id = target_variant_id`,
    replacement: `  where variant_value.organization_id is not null
    and variant_value.id = target_variant_id`,
  }),
  Object.freeze({
    name: "guess an unconfigured quantity from the one-piece price",
    find: `      target_unit_id,
      target_quantity,
      statement_timestamp()`,
    replacement: `      target_unit_id,
      1::numeric,
      statement_timestamp()`,
  }),
  Object.freeze({
    name: "remove leased tool context tenant isolation",
    find: `  select * into attempt_record
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
    and run_value.id = target_run_id;`,
    replacement: `  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.id = target_job_attempt_id;

  if not found or attempt_record.run_id <> target_run_id
    or attempt_record.status <> 'running'
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token then
    raise exception using errcode = '42501', message = 'agent tool context attempt lease is invalid';
  end if;

  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.id = attempt_record.job_id;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.id = target_run_id;`,
  }),
  Object.freeze({
    name: "disable sequential tool round enforcement",
    find: "    or target_tool_round <> run_record.tool_round_count + 1 then",
    replacement: "    or false then",
  }),
  Object.freeze({
    name: "execute a tool even when policy authorization blocks it",
    find: "  if authorization_record.authorization_status = 'allowed' then",
    replacement: "  if true then",
  }),
  Object.freeze({
    name: "disconnect conversation context from its registered handler",
    find: `      when 'conversation.context.read.v1' then app_private.conversation_context_for_agent(
        target_organization_id, target_run_id, target_arguments_safe
      )`,
    replacement: `      when 'conversation.context.read.v1' then jsonb_build_object('ok', true)`,
  }),
  Object.freeze({
    name: "discard durable provider continuation state",
    find: "    'provider_state', target_provider_state,",
    replacement: "    'provider_state', '{}'::jsonb,",
  }),
  Object.freeze({
    name: "break unchanged tool bootstrap idempotency",
    find: "    select count(*) = 3",
    replacement: "    select count(*) = 2",
  }),
]);
