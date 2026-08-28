begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(10);

select extensions.has_function(
  'app_private',
  'ensure_customer_assistant_read_tools',
  array['uuid'],
  'read-tool policy bootstrap remains installed'
);
select extensions.has_function(
  'api',
  'execute_whatsapp_read_only_tool_call',
  array[
    'uuid', 'uuid', 'uuid', 'text', 'uuid', 'text', 'text',
    'text', 'text', 'integer', 'jsonb', 'jsonb', 'jsonb'
  ],
  'read-only native tool executor remains installed'
);
select extensions.has_function(
  'api',
  'complete_whatsapp_agent_turn',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'jsonb'],
  'agent completion RPC remains installed'
);
select extensions.has_function(
  'api',
  'checkpoint_whatsapp_agent_turn',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'jsonb'],
  'agent checkpoint RPC remains installed'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function_value
    join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = function_value.pronamespace
    where (namespace_value.nspname, function_value.proname) in (
      ('app_private', 'ensure_customer_assistant_read_tools'),
      ('api', 'execute_whatsapp_read_only_tool_call'),
      ('api', 'complete_whatsapp_agent_turn'),
      ('api', 'checkpoint_whatsapp_agent_turn')
    )
      and function_value.prosecdef
      and 'search_path=""' = any(coalesce(function_value.proconfig, '{}'::text[]))
  ),
  4,
  'all hardened functions retain SECURITY DEFINER with an empty search path'
);

select extensions.ok(
  not has_function_privilege(
    'service_role',
    'app_private.ensure_customer_assistant_read_tools(uuid)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'app_private.ensure_customer_assistant_read_tools(uuid)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'app_private.ensure_customer_assistant_read_tools(uuid)',
      'EXECUTE'
    ),
  'private read-tool bootstrap remains unreachable from API roles'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.execute_whatsapp_read_only_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  )
    and has_function_privilege(
      'service_role',
      'api.complete_whatsapp_agent_turn(uuid,uuid,text,uuid,text,text,jsonb)',
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'api.checkpoint_whatsapp_agent_turn(uuid,uuid,text,uuid,text,text,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'authenticated',
      'api.execute_whatsapp_read_only_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      'api.execute_whatsapp_read_only_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
      'EXECUTE'
    ),
  'worker RPC permissions remain service-role-only'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function_value
    join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = function_value.pronamespace
    where namespace_value.nspname = 'app_private'
      and function_value.proname = 'ensure_customer_assistant_read_tools'
      and (
        position('selected_policy_id' in function_value.prosrc) > 0
        or position('selected_policy_version_id' in function_value.prosrc) > 0
        or position('selected_contract_id' in function_value.prosrc) > 0
      )
  ),
  0,
  'read-tool bootstrap contains no unused identifier captures'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function_value
    join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = function_value.pronamespace
    where namespace_value.nspname = 'api'
      and function_value.proname = 'execute_whatsapp_read_only_tool_call'
      and (
        position('result_message_record' in function_value.prosrc) > 0
        or position('attempt_result_record' in function_value.prosrc) > 0
      )
  ),
  0,
  'read-only tool executor contains no unused result captures'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function_value
    join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = function_value.pronamespace
    where namespace_value.nspname = 'api'
      and function_value.proname in (
        'complete_whatsapp_agent_turn',
        'checkpoint_whatsapp_agent_turn'
      )
      and (
        position('result_record record' in function_value.prosrc) > 0
        or position('chunk_ordinal integer' in function_value.prosrc) > 0
      )
  ),
  0,
  'completion and checkpoint functions contain no unused or shadowed declarations'
);

select * from extensions.finish();

rollback;
