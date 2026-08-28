export const b3001aPreparationDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "expose private read-tool readiness to the worker role",
    sql: `grant execute on function app_private.customer_assistant_read_tools_ready(uuid)
      to service_role;`,
  }),
  Object.freeze({
    name: "accept an incomplete two-tool policy as ready",
    find: "      select count(*) = 3",
    replacement: "      select count(*) = 2",
  }),
  Object.freeze({
    name: "treat a disabled tool contract as ready",
    find: "        and contract_value.status = 'active'",
    replacement: "        and contract_value.status in ('active', 'disabled')",
  }),
  Object.freeze({
    name: "prepare organizations whose active policy is already ready",
    find: "      and not app_private.customer_assistant_read_tools_ready(organization_value.id)",
    replacement: "      and organization_value.id is not null",
  }),
  Object.freeze({
    name: "remove preparation failure cooldown",
    find: `          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '5 minutes'
      )
    order by
      not (`,
    replacement: `          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '0 minutes'
      )
    order by
      not (`,
  }),
  Object.freeze({
    name: "enqueue a new turn without preparing native read tools",
    find: `      perform app_private.ensure_customer_assistant_read_tools(
        candidate_message.organization_id
      );`,
    replacement: `      perform app_private.ensure_customer_assistant_policy(
        candidate_message.organization_id
      );`,
  }),
  Object.freeze({
    name: "remove claim failure cooldown",
    find: `          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '5 minutes'
      )
    order by message_value.received_at`,
    replacement: `          and failure_event.event_type = 'customer_assistant.read_tools_prepare_failed'
          and failure_event.occurred_at > statement_timestamp() - interval '0 minutes'
      )
    order by message_value.received_at`,
  }),
  Object.freeze({
    name: "remove tenant scope from claim preparation failures",
    find: "        where failure_event.organization_id = message_value.organization_id",
    replacement: "        where failure_event.organization_id is not null",
  }),
]);
