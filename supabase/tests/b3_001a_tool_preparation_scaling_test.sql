begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(12);

select extensions.has_function(
  'app_private', 'customer_assistant_read_tools_ready', array['uuid'],
  'read-tool readiness predicate exists'
);
select extensions.ok(
  not has_function_privilege(
    'service_role', 'app_private.customer_assistant_read_tools_ready(uuid)', 'EXECUTE'
  ),
  'service role cannot bypass the private readiness boundary'
);
select extensions.ok(
  has_function_privilege(
    'service_role', 'api.prepare_customer_assistant_read_tools(integer)', 'EXECUTE'
  ),
  'service role retains the bounded preparation RPC'
);
select extensions.ok(
  to_regclass('app_private.audit_events_read_tools_prepare_failure_idx') is not null,
  'failure cooldown lookup has a dedicated partial index'
);
select extensions.is(
  app_private.customer_assistant_read_tools_ready(null),
  false,
  'a null tenant is never reported as prepared'
);

set local role postgres;

insert into auth.users (id)
values ('b3120000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id, created_at, updated_at)
values (
  'b3121000-0000-4000-8000-000000000001',
  'B3 Tool Preparation Scaling',
  'b3120000-0000-4000-8000-000000000001',
  '2000-01-01 00:00:00+00',
  '2000-01-01 00:00:00+00'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values (
  'b3121100-0000-4000-8000-000000000001',
  'b3121000-0000-4000-8000-000000000001',
  'b3120000-0000-4000-8000-000000000001',
  'owner', 'active', statement_timestamp()
);

set constraints all immediate;

select extensions.is(
  app_private.customer_assistant_read_tools_ready(
    'b3121000-0000-4000-8000-000000000001'
  ),
  false,
  'a new organization is not falsely reported as prepared'
);
select extensions.ok(
  app_private.ensure_customer_assistant_read_tools(
    'b3121000-0000-4000-8000-000000000001'
  ) is not null,
  'the real bootstrap creates a frozen policy version'
);
select extensions.is(
  app_private.customer_assistant_read_tools_ready(
    'b3121000-0000-4000-8000-000000000001'
  ),
  true,
  'the readiness predicate recognizes all current authorized bindings'
);

update app_private.tool_contracts
set status = 'disabled'
where organization_id = 'b3121000-0000-4000-8000-000000000001'
  and tool_name = 'catalog_search';

select extensions.is(
  app_private.customer_assistant_read_tools_ready(
    'b3121000-0000-4000-8000-000000000001'
  ),
  false,
  'a disabled current contract makes the policy not ready'
);

update app_private.tool_contracts
set status = 'active'
where organization_id = 'b3121000-0000-4000-8000-000000000001'
  and tool_name = 'catalog_search';

select extensions.is(
  app_private.customer_assistant_read_tools_ready(
    'b3121000-0000-4000-8000-000000000001'
  ),
  true,
  'restoring the current contract restores readiness without a new policy'
);
select extensions.ok(
  lower(pg_get_functiondef(
    'api.prepare_customer_assistant_read_tools(integer)'::regprocedure
  )) like '%customer_assistant_read_tools_ready%'
  and lower(pg_get_functiondef(
    'api.prepare_customer_assistant_read_tools(integer)'::regprocedure
  )) like '%5 minutes%'
  and lower(pg_get_functiondef(
    'api.prepare_customer_assistant_read_tools(integer)'::regprocedure
  )) like '%app_private.agent_jobs%'
  and lower(pg_get_functiondef(
    'api.prepare_customer_assistant_read_tools(integer)'::regprocedure
  )) like '%app_private.messages%',
  'bounded preparation skips ready tenants, cools failures, and prioritizes real work'
);
select extensions.ok(
  pg_get_functiondef(
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)'::regprocedure
  ) like '%ensure_customer_assistant_read_tools%'
  and pg_get_functiondef(
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)'::regprocedure
  ) like '%customer_assistant.read_tools_prepare_failed%'
  and pg_get_functiondef(
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)'::regprocedure
  ) like '%interval ''5 minutes''%'
  and pg_get_functiondef(
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)'::regprocedure
  ) like '%failure_event.organization_id = message_value.organization_id%',
  'claim prepares before enqueue and isolates recent bootstrap failures by tenant'
);

select * from extensions.finish();

rollback;
