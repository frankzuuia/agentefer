begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(84);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
set search_path = extensions, pg_catalog
as $$
declare
  actual_sqlstate text;
begin
  execute statement;
  return extensions.fail(description || ' (the statement did not fail)');
exception
  when others then
    get stacked diagnostics actual_sqlstate = returned_sqlstate;
    return extensions.is(actual_sqlstate, expected_sqlstate, description);
end;
$$;

grant execute on function pg_temp.throws_sqlstate(text, text, text)
  to anon, authenticated, service_role;

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      ) and relation.relkind = 'r'
  ),
  20,
  'all twenty B2-008 private tables exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      ) and relation.relkind = 'v'
  ),
  20,
  'all twenty B2-008 API views exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'create_business_configuration_version', 'rollback_business_configuration',
        'register_prompt_version', 'register_tool_contract_version',
        'create_agent_policy_version', 'enqueue_agent_run', 'claim_agent_job',
        'start_agent_job_attempt', 'append_agent_message',
        'propose_tool_execution', 'authorize_tool_execution',
        'mark_tool_effect_started', 'record_tool_execution_result',
        'resume_agent_run_after_tools', 'record_usage_event',
        'record_error_event', 'record_agent_attempt_result',
        'recover_expired_agent_job'
      )
  ),
  18,
  'all eighteen B2-008 runtime RPCs exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      ) and relation.relrowsecurity and relation.relforcerowsecurity
  ),
  20,
  'RLS is enabled and forced on all B2-008 tables'
);

select extensions.is(
  (
    select count(*)::integer from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      )
  ),
  20,
  'every B2-008 table has one tenant-aware read policy'
);

select extensions.is(
  (
    select coalesce(string_agg(
      foreign_key.conrelid::regclass::text || ':' || foreign_key.conname,
      ', ' order by foreign_key.conrelid::regclass::text, foreign_key.conname
    ), '')
    from pg_catalog.pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conrelid in (
        'app_private.agent_commands'::regclass,
        'app_private.business_configurations'::regclass,
        'app_private.business_configuration_versions'::regclass,
        'app_private.prompt_versions'::regclass,
        'app_private.tool_contracts'::regclass,
        'app_private.tool_contract_versions'::regclass,
        'app_private.agent_policies'::regclass,
        'app_private.agent_policy_versions'::regclass,
        'app_private.agent_policy_tools'::regclass,
        'app_private.conversation_agent_snapshots'::regclass,
        'app_private.agent_runs'::regclass,
        'app_private.agent_run_configurations'::regclass,
        'app_private.agent_messages'::regclass,
        'app_private.agent_jobs'::regclass,
        'app_private.job_attempts'::regclass,
        'app_private.tool_executions'::regclass,
        'app_private.usage_events'::regclass,
        'app_private.error_events'::regclass,
        'app_private.memory_entries'::regclass,
        'app_private.audit_events'::regclass
      )
      and not exists (
        select 1 from pg_catalog.pg_index as index_value
        where index_value.indrelid = foreign_key.conrelid
          and index_value.indisvalid and index_value.indisready
          and (string_to_array(index_value.indkey::text, ' ')::smallint[])
            [1:cardinality(foreign_key.conkey)] = foreign_key.conkey
      )
  ),
  '',
  'every B2-008 foreign key column is indexed'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      ) and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  20,
  'all B2-008 API views preserve caller RLS and security barrier'
);

select extensions.is(
  (
    select count(*)::integer from information_schema.role_table_grants
    where table_schema in ('app_private', 'api')
      and table_name in (
        'agent_commands', 'business_configurations',
        'business_configuration_versions', 'prompt_versions',
        'tool_contracts', 'tool_contract_versions', 'agent_policies',
        'agent_policy_versions', 'agent_policy_tools',
        'conversation_agent_snapshots', 'agent_runs',
        'agent_run_configurations', 'agent_messages', 'agent_jobs',
        'job_attempts', 'tool_executions', 'usage_events', 'error_events',
        'memory_entries', 'audit_events'
      ) and grantee in ('PUBLIC', 'anon')
  ),
  0,
  'public and anon have no B2-008 relation privileges'
);

select extensions.is(
  (
    select count(*)::integer from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'create_business_configuration_version', 'rollback_business_configuration',
        'register_prompt_version', 'register_tool_contract_version',
        'create_agent_policy_version', 'enqueue_agent_run', 'claim_agent_job',
        'start_agent_job_attempt', 'append_agent_message',
        'propose_tool_execution', 'authorize_tool_execution',
        'mark_tool_effect_started', 'record_tool_execution_result',
        'resume_agent_run_after_tools', 'record_usage_event',
        'record_error_event', 'record_agent_attempt_result',
        'recover_expired_agent_job'
      ) and grantee = 'service_role' and privilege_type = 'EXECUTE'
  ),
  18,
  'service role alone receives all B2-008 execution grants'
);

select extensions.is(
  (
    select count(*)::integer from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'create_business_configuration_version', 'rollback_business_configuration',
        'register_prompt_version', 'register_tool_contract_version',
        'create_agent_policy_version', 'enqueue_agent_run', 'claim_agent_job',
        'start_agent_job_attempt', 'append_agent_message',
        'propose_tool_execution', 'authorize_tool_execution',
        'mark_tool_effect_started', 'record_tool_execution_result',
        'resume_agent_run_after_tools', 'record_usage_event',
        'record_error_event', 'record_agent_attempt_result',
        'recover_expired_agent_job'
      ) and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'browser roles cannot execute B2-008 service tools'
);

select extensions.ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'api' and (
      (table_name = 'prompt_versions' and column_name = 'content_template')
      or (table_name = 'agent_messages' and column_name = 'content')
      or (table_name = 'memory_entries' and column_name = 'content')
      or (table_name = 'tool_executions' and column_name in ('arguments_safe', 'result_safe'))
      or (table_name = 'agent_jobs' and column_name in (
        'payload_safe', 'lease_token', 'checkpoint_reference', 'checkpoint_hash'
      ))
      or (table_name = 'agent_runs' and column_name in (
        'cache_key_hash', 'provider_state_reference', 'provider_state_hash'
      ))
    )
  ),
  'private cognitive payloads are absent from API views'
);

set local role postgres;

insert into auth.users (id)
values
  ('81000000-0000-4000-8000-000000000001'),
  ('81000000-0000-4000-8000-000000000002'),
  ('82000000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    '81000000-0000-4000-8000-000000000010', 'B2-008 Organization A',
    '81000000-0000-4000-8000-000000000001'
  ),
  (
    '82000000-0000-4000-8000-000000000010', 'B2-008 Organization B',
    '82000000-0000-4000-8000-000000000001'
  );

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    '81000000-0000-4000-8000-000000000011',
    '81000000-0000-4000-8000-000000000010',
    '81000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  ),
  (
    '81000000-0000-4000-8000-000000000012',
    '81000000-0000-4000-8000-000000000010',
    '81000000-0000-4000-8000-000000000002', 'operator', 'active', statement_timestamp()
  ),
  (
    '82000000-0000-4000-8000-000000000011',
    '82000000-0000-4000-8000-000000000010',
    '82000000-0000-4000-8000-000000000001', 'owner', 'active', statement_timestamp()
  );

insert into app_private.meta_applications (
  id, organization_id, external_app_id, display_name, api_version, status,
  created_by_user_id
)
values (
  '81000000-0000-4000-8000-000000000015',
  '81000000-0000-4000-8000-000000000010',
  'qa-agent-app', 'QA Agent Meta App', 'v24.0', 'active',
  '81000000-0000-4000-8000-000000000001'
);

insert into app_private.channel_connections (
  id, organization_id, provider, channel, meta_application_id, external_app_id,
  external_account_id, external_sender_id, display_name, api_version,
  credential_reference, webhook_secret_reference, status,
  connected_at, last_verified_at, created_by_user_id
)
values (
  '81000000-0000-4000-8000-000000000020',
  '81000000-0000-4000-8000-000000000010',
  'meta', 'whatsapp', '81000000-0000-4000-8000-000000000015',
  'qa-agent-app', 'qa-agent-waba', 'qa-agent-phone',
  'QA Agent WhatsApp', 'v24.0', 'secret-ref://qa/agent-token',
  'secret-ref://qa/agent-webhook', 'active', statement_timestamp(),
  statement_timestamp(), '81000000-0000-4000-8000-000000000001'
);

insert into app_private.contacts (id, organization_id, display_name)
values (
  '81000000-0000-4000-8000-000000000021',
  '81000000-0000-4000-8000-000000000010', 'QA Runtime Contact'
);

insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name
)
values (
  '81000000-0000-4000-8000-000000000022',
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000020', 'qa-runtime-contact',
  'contact', '81000000-0000-4000-8000-000000000021',
  'provider_observed', 'QA Runtime Contact'
);

insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  provider_thread_id, origin_context
)
values (
  '81000000-0000-4000-8000-000000000023',
  '81000000-0000-4000-8000-000000000010',
  '81000000-0000-4000-8000-000000000020',
  '81000000-0000-4000-8000-000000000022', 'qa-runtime-thread', '{"qa":true}'
);

select extensions.lives_ok(
  $$select * from api.create_business_configuration_version(
    '81000000-0000-4000-8000-000000000010', 'cfg-create-v1',
    'sales.behavior', 'Sales behavior', 'agent.business_config', 1,
    '{"catalog_first":true,"handoff_mode":"owner_choice"}',
    'agent.business_config/v1', null, true,
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-v1', null
  )$$,
  'business configuration version is created and activated atomically'
);

select extensions.ok(
  (select was_replayed from api.create_business_configuration_version(
    '81000000-0000-4000-8000-000000000010', 'cfg-create-v1',
    'sales.behavior', 'Sales behavior', 'agent.business_config', 1,
    '{"catalog_first":true,"handoff_mode":"owner_choice"}',
    'agent.business_config/v1', null, true,
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-v1', null
  )),
  'identical configuration command replays without a second version'
);

select pg_temp.throws_sqlstate(
  $$select * from api.create_business_configuration_version(
    '81000000-0000-4000-8000-000000000010', 'cfg-create-v1',
    'sales.behavior', 'Different name', 'agent.business_config', 1,
    '{"catalog_first":false}', 'agent.business_config/v1', null, true,
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-conflict', null
  )$$,
  '23505',
  'configuration idempotency key rejects a different payload'
);

select extensions.lives_ok(
  $$select * from api.create_business_configuration_version(
    '81000000-0000-4000-8000-000000000010', 'cfg-create-v2',
    'sales.behavior', 'Sales behavior', 'agent.business_config', 2,
    '{"catalog_first":true,"handoff_mode":"agent_closes"}',
    'agent.business_config/v2',
    (select current_version_id from app_private.business_configurations
      where configuration_key = 'sales.behavior'), true,
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-v2', null
  )$$,
  'optimistic configuration version two activates from the exact current version'
);

select extensions.lives_ok(
  $$select * from api.rollback_business_configuration(
    '81000000-0000-4000-8000-000000000010', 'cfg-rollback-v1',
    (select id from app_private.business_configurations
      where configuration_key = 'sales.behavior'),
    (select id from app_private.business_configuration_versions
      where version_number = 1),
    (select current_version_id from app_private.business_configurations
      where configuration_key = 'sales.behavior'),
    'QA rollback evidence',
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-rollback', null
  )$$,
  'rollback creates a new immutable version instead of rewriting history'
);

select extensions.is(
  (select count(*)::integer from app_private.business_configuration_versions),
  3,
  'configuration create, change and rollback preserve three versions'
);

select extensions.lives_ok(
  $$select * from api.register_prompt_version(
    '81000000-0000-4000-8000-000000000010', 'prompt-sales-v1',
    'sales.assistant', 'markdown',
    'Razona con el catálogo y usa tool calling nativo. No inventes existencias.',
    '81000000-0000-4000-8000-000000000001', 'corr-prompt', null
  )$$,
  'private prompt version is registered with its content hash'
);

select extensions.ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'api' and table_name = 'prompt_versions'
      and column_name = 'content_template'
  ),
  'prompt content remains absent from authenticated API metadata'
);

select extensions.lives_ok(
  $$select * from api.register_tool_contract_version(
    '81000000-0000-4000-8000-000000000010', 'tool-catalog-v1',
    'catalog.upsert_product', 'Upsert catalog product',
    'Creates or updates one exact universal catalog product.',
    '{"type":"object","additionalProperties":true}',
    '{"type":"object","additionalProperties":true}',
    'external_effect', 'catalog.upsert_product', null, 'active',
    '81000000-0000-4000-8000-000000000001', 'corr-tool-catalog', null
  )$$,
  'external catalog tool contract is registered'
);

select extensions.lives_ok(
  $$select * from api.register_tool_contract_version(
    '81000000-0000-4000-8000-000000000010', 'tool-admin-v1',
    'admin.read_private_metrics', 'Read private metrics',
    'Reads owner-only operational metrics.',
    '{"type":"object","additionalProperties":false}',
    '{"type":"object","additionalProperties":true}',
    'read_only', 'admin.read_private_metrics', null, 'active',
    '81000000-0000-4000-8000-000000000001', 'corr-tool-admin', null
  )$$,
  'owner-only read tool contract is registered independently'
);

select pg_temp.throws_sqlstate(
  $$select * from api.create_agent_policy_version(
    '81000000-0000-4000-8000-000000000010', 'policy-invalid-route',
    'sales.default', 'Sales default',
    (select id from app_private.prompt_versions where prompt_key = 'sales.assistant'),
    8, 4, 4, 120000, 'explicit', 0.05000000, 'MXN', 'block',
    '{"provider":"minimax","model":"MiniMax-M2.7-highspeed"}', '[]',
    null, true, '81000000-0000-4000-8000-000000000001',
    'corr-policy-invalid', null
  )$$,
  '22023',
  'fallback route must be an ordered JSON array'
);

select extensions.lives_ok(
  $$select * from api.create_agent_policy_version(
    '81000000-0000-4000-8000-000000000010', 'policy-sales-v1',
    'sales.default', 'Sales default',
    (select id from app_private.prompt_versions where prompt_key = 'sales.assistant'),
    8, 4, 4, 120000, 'explicit', 0.05000000, 'MXN', 'block',
    '[{"provider":"minimax","model":"MiniMax-M2.7-highspeed"}]',
    jsonb_build_array(
      jsonb_build_object(
        'tool_contract_version_id',
        (select current_version_id from app_private.tool_contracts
          where tool_name = 'catalog.upsert_product'),
        'allowed_actor_kinds', jsonb_build_array('member', 'contact'),
        'required_membership_roles', jsonb_build_array('owner', 'admin', 'operator'),
        'allowed_channels', jsonb_build_array('whatsapp'),
        'authorization_constraints', jsonb_build_object('handler_authorizes_scope', true)
      ),
      jsonb_build_object(
        'tool_contract_version_id',
        (select current_version_id from app_private.tool_contracts
          where tool_name = 'admin.read_private_metrics'),
        'allowed_actor_kinds', jsonb_build_array('member'),
        'required_membership_roles', jsonb_build_array('owner', 'admin'),
        'allowed_channels', jsonb_build_array(),
        'authorization_constraints', jsonb_build_object()
      )
    ),
    null, true, '81000000-0000-4000-8000-000000000001',
    'corr-policy-v1', null
  )$$,
  'active policy pins prompt, cache, budget, fallback and exact tool versions'
);

select extensions.is(
  (select count(*)::integer from app_private.agent_policy_tools),
  2,
  'policy contains exactly the two native tool bindings requested by the LLM contract'
);

select extensions.lives_ok(
  $$select * from api.enqueue_agent_run(
    '81000000-0000-4000-8000-000000000010', 'run-owner-create',
    'owner-command-001', 'owner_command', 'sales.default',
    'openai', 'luna-medium-2026-08', 'minimax', 'MiniMax-M3', 'medium',
    decode(repeat('31', 32), 'hex'), null, null, null, null,
    'member', '81000000-0000-4000-8000-000000000001', null,
    10, '{"request":"show_inventory"}', 'corr-owner-run', 'trace-owner-run'
  )$$,
  'owner run accepts an arbitrary future model and independent vision model'
);

select extensions.ok(
  (select was_replayed from api.enqueue_agent_run(
    '81000000-0000-4000-8000-000000000010', 'run-owner-create',
    'owner-command-001', 'owner_command', 'sales.default',
    'openai', 'luna-medium-2026-08', 'minimax', 'MiniMax-M3', 'medium',
    decode(repeat('31', 32), 'hex'), null, null, null, null,
    'member', '81000000-0000-4000-8000-000000000001', null,
    10, '{"request":"show_inventory"}', 'corr-owner-run', 'trace-owner-run'
  )),
  'identical run enqueue command replays without duplicate work'
);

select extensions.is(
  (select provider || ':' || model || ':' || cache_mode
    from app_private.agent_runs where run_key = 'owner-command-001'),
  'openai:luna-medium-2026-08:explicit',
  'run freezes exact provider, future model name and policy cache mode'
);

select extensions.is(
  (select count(*)::integer from app_private.agent_run_configurations
    where run_id = (select id from app_private.agent_runs
      where run_key = 'owner-command-001')),
  1,
  'owner run pins the exact active business configuration version'
);

select extensions.lives_ok(
  $$select * from api.claim_agent_job(
    '81000000-0000-4000-8000-000000000010', 'worker-owner', 120
  )$$,
  'worker atomically claims the highest-priority pending run'
);

select extensions.lives_ok(
  $$select * from api.start_agent_job_attempt(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs where worker_id = 'worker-owner'),
    'worker-owner',
    (select lease_token from app_private.agent_jobs where worker_id = 'worker-owner'),
    0, '{"transport":"responses-compatible"}'
  )$$,
  'primary provider attempt starts only under the active lease'
);

select extensions.lives_ok(
  $$select * from api.append_agent_message(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    'owner-input-001', 'user', 'input', 'trusted_member',
    null, null, null, null, '{"parts":[{"type":"text","text":"Muestra mi inventario"}]}'
  )$$,
  'trusted owner message is appended as immutable cognitive input'
);

select extensions.ok(
  (select was_replayed from api.append_agent_message(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    'owner-input-001', 'user', 'input', 'trusted_member',
    null, null, null, null, '{"parts":[{"type":"text","text":"Muestra mi inventario"}]}'
  )),
  'identical message key replays without duplicating sequence numbers'
);

select pg_temp.throws_sqlstate(
  $$select * from api.append_agent_message(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    'owner-input-001', 'user', 'input', 'trusted_member',
    null, null, null, null, '{"parts":[{"type":"text","text":"Different"}]}'
  )$$,
  '23505',
  'message key cannot be reused with changed content'
);

select extensions.lives_ok(
  $$select * from api.record_usage_event(
    '81000000-0000-4000-8000-000000000010', 'usage-owner-primary',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-owner'),
    null, 'openai', 'luna-medium-2026-08', 'response.generate', 1,
    1200, 320, 100, 600, 0, 1620, 'known', 0.01000000, 'MXN', 850,
    '{"finish_reason":"stop"}'
  )$$,
  'known provider usage and cache tokens are recorded without provider-specific columns'
);

select extensions.is(
  (select budget_status from app_private.agent_runs where run_key = 'owner-command-001'),
  'within',
  'known cumulative cost below the frozen policy remains within budget'
);

select extensions.lives_ok(
  $$select * from api.record_agent_attempt_result(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.job_attempts where worker_id = 'worker-owner'),
    'worker-owner',
    (select lease_token from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'owner-command-001')),
    'completed', 'finish', 'provider-owner-request', '{"finish_reason":"stop"}',
    null, null, null
  )$$,
  'completed owner attempt closes job and run atomically'
);

select extensions.is(
  (select status from app_private.agent_runs where run_key = 'owner-command-001'),
  'completed',
  'owner run reaches completed terminal state'
);

select extensions.lives_ok(
  $$select * from api.record_error_event(
    '81000000-0000-4000-8000-000000000010', 'error-owner-observation',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    null, null, null, 'catalog_optional_field_missing', 'validation', false,
    'info', null, null, 'Optional catalog field was absent and no action failed.',
    null, 'corr-owner-run', 'trace-owner-run'
  )$$,
  'redacted informational error evidence can be attached after run completion'
);

select extensions.ok(
  (select was_replayed from api.record_error_event(
    '81000000-0000-4000-8000-000000000010', 'error-owner-observation',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    null, null, null, 'catalog_optional_field_missing', 'validation', false,
    'info', null, null, 'Optional catalog field was absent and no action failed.',
    null, 'corr-owner-run', 'trace-owner-run'
  )),
  'identical error key replays without duplicate incidents'
);

select extensions.lives_ok(
  $$select * from api.enqueue_agent_run(
    '81000000-0000-4000-8000-000000000010', 'run-contact-create',
    'contact-turn-001', 'conversation_turn', 'sales.default',
    'openai', 'luna-medium-2026-08', 'minimax', 'MiniMax-M3', 'medium',
    decode(repeat('32', 32), 'hex'),
    '81000000-0000-4000-8000-000000000020',
    '81000000-0000-4000-8000-000000000023', null, null,
    'contact', null, '81000000-0000-4000-8000-000000000022',
    20, '{"origin":"whatsapp_customer"}', 'corr-contact-run', 'trace-contact-run'
  )$$,
  'active WhatsApp contact starts a conversation run with sticky snapshot'
);

select extensions.is(
  (select count(*)::integer from app_private.conversation_agent_snapshots),
  1,
  'first conversation turn creates exactly one sticky snapshot'
);

select extensions.lives_ok(
  $$select * from api.claim_agent_job(
    '81000000-0000-4000-8000-000000000010', 'worker-contact', 120
  )$$,
  'contact run job is claimed after the completed owner job'
);

select extensions.lives_ok(
  $$select * from api.start_agent_job_attempt(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs where worker_id = 'worker-contact'),
    'worker-contact',
    (select lease_token from app_private.agent_jobs where worker_id = 'worker-contact'),
    0, '{"transport":"responses-compatible"}'
  )$$,
  'contact turn starts on the primary frozen model'
);

select extensions.lives_ok(
  $$select * from api.append_agent_message(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'contact-turn-001'),
    'contact-input-001', 'user', 'input', 'untrusted_external',
    null, null, null, 'provider-item-contact-001',
    '{"parts":[{"type":"text","text":"Quiero cuatro piezas con rin"}]}'
  )$$,
  'customer content is durably labeled untrusted external input'
);

select extensions.lives_ok(
  $$select * from api.propose_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'contact-turn-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-contact'),
    'catalog.upsert_product', 'provider-call-catalog-001',
    'execution-catalog-001', 'external-catalog-001', 1,
    '{"sku":"TINACO-X62","price":1700}'
  )$$,
  'LLM-proposed catalog tool is resolved through the frozen native contract'
);

select extensions.lives_ok(
  $$select * from api.propose_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'contact-turn-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-contact'),
    'admin.read_private_metrics', 'provider-call-admin-001',
    'execution-admin-001', null, 1, '{}'
  )$$,
  'LLM may propose a bound tool before deterministic authorization decides access'
);

select pg_temp.throws_sqlstate(
  $$select * from api.propose_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'contact-turn-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-contact'),
    'catalog.upsert_product', 'provider-call-catalog-duplicate',
    'execution-catalog-duplicate', 'external-catalog-001', 1,
    '{"sku":"TINACO-X62","price":1700}'
  )$$,
  '23505',
  'one external effect key cannot authorize two distinct tool executions'
);

select extensions.is(
  (select authorization_status from api.authorize_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-catalog-001'))),
  'allowed',
  'contact catalog tool is allowed by actor and WhatsApp channel policy'
);

select extensions.is(
  (select authorization_status from api.authorize_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-admin-001'))),
  'blocked',
  'contact cannot execute the owner-only administrative tool'
);

select extensions.lives_ok(
  $$select * from api.mark_tool_effect_started(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-catalog-001'), 'tool-worker-contact'
  )$$,
  'external catalog effect receives a durable pre-call start marker'
);

select extensions.lives_ok(
  $$select * from api.record_tool_execution_result(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-catalog-001'),
    'succeeded', 'confirmed_applied', '{"product_id":"catalog-product-001"}',
    null, null
  )$$,
  'external tool stores confirmed result evidence after its start marker'
);

select extensions.ok(
  (select was_replayed from api.record_tool_execution_result(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-catalog-001'),
    'succeeded', 'confirmed_applied', '{"product_id":"catalog-product-001"}',
    null, null
  )),
  'identical tool result replay does not repeat an external effect'
);

select extensions.lives_ok(
  $$select * from api.record_agent_attempt_result(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.job_attempts where worker_id = 'worker-contact'),
    'worker-contact',
    (select lease_token from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'contact-turn-001')),
    'tool_calls', 'execute_tools', 'provider-contact-request-1',
    '{"finish_reason":"tool_calls"}', 'checkpoint://contact/turn-1',
    decode(repeat('41', 32), 'hex'), null
  )$$,
  'tool-call provider attempt closes with a durable continuation checkpoint'
);

select extensions.is(
  (select run_status from api.resume_agent_run_after_tools(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'contact-turn-001')))),
  'waiting_provider',
  'completed tool round queues a provider continuation without duplicate effects'
);

select extensions.lives_ok(
  $$select * from api.claim_agent_job(
    '81000000-0000-4000-8000-000000000010', 'worker-contact-fallback', 120
  )$$,
  'continuation job is reclaimed under a new lease'
);

select extensions.is(
  (select provider || ':' || model from api.start_agent_job_attempt(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs where worker_id = 'worker-contact-fallback'),
    'worker-contact-fallback',
    (select lease_token from app_private.agent_jobs where worker_id = 'worker-contact-fallback'),
    1, '{"continuation":true}'
  )),
  'minimax:MiniMax-M2.7-highspeed',
  'fallback ordinal resolves exact MiniMax family model from frozen route'
);

select extensions.lives_ok(
  $$select * from api.record_usage_event(
    '81000000-0000-4000-8000-000000000010', 'usage-contact-fallback',
    (select id from app_private.agent_runs where run_key = 'contact-turn-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-contact-fallback'),
    null, 'minimax', 'MiniMax-M2.7-highspeed', 'response.continue', 1,
    900, 220, null, 500, null, 1120, 'unknown', null, null, 700,
    '{"cache_hit":true}'
  )$$,
  'unknown provider cost is recorded as unknown and never fabricated as zero'
);

select extensions.is(
  (select budget_status from app_private.agent_runs where run_key = 'contact-turn-001'),
  'unknown',
  'unknown cost moves frozen blocking policy into explicit unknown budget state'
);

select extensions.lives_ok(
  $$select * from api.record_agent_attempt_result(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.job_attempts where worker_id = 'worker-contact-fallback'),
    'worker-contact-fallback',
    (select lease_token from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'contact-turn-001')),
    'completed', 'finish', 'provider-contact-request-2',
    '{"finish_reason":"stop"}', null, null, null
  )$$,
  'fallback attempt can close the conversation turn successfully'
);

select extensions.ok(
  (select was_replayed from api.record_usage_event(
    '81000000-0000-4000-8000-000000000010', 'usage-owner-primary',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-owner'),
    null, 'openai', 'luna-medium-2026-08', 'response.generate', 1,
    1200, 320, 100, 600, 0, 1620, 'known', 0.01000000, 'MXN', 850,
    '{"finish_reason":"stop"}'
  )),
  'identical usage key replays without charging the run twice'
);

select pg_temp.throws_sqlstate(
  $$select * from api.record_usage_event(
    '81000000-0000-4000-8000-000000000010', 'usage-owner-primary',
    (select id from app_private.agent_runs where run_key = 'owner-command-001'),
    (select id from app_private.job_attempts where worker_id = 'worker-owner'),
    null, 'openai', 'luna-medium-2026-08', 'response.generate', 1,
    1200, 320, 100, 600, 0, 1620, 'known', 0.02000000, 'MXN', 850,
    '{"finish_reason":"stop"}'
  )$$,
  '23505',
  'usage key cannot be replayed with a different cost'
);

select extensions.lives_ok(
  $$select * from api.create_business_configuration_version(
    '81000000-0000-4000-8000-000000000010', 'cfg-create-v4',
    'sales.behavior', 'Sales behavior', 'agent.business_config', 3,
    '{"catalog_first":true,"handoff_mode":"owner_filters"}',
    'agent.business_config/v3',
    (select current_version_id from app_private.business_configurations
      where configuration_key = 'sales.behavior'), true,
    '81000000-0000-4000-8000-000000000001', 'corr-cfg-v4', null
  )$$,
  'later business configuration activates without rewriting conversation snapshot'
);

select extensions.lives_ok(
  $$select * from api.enqueue_agent_run(
    '81000000-0000-4000-8000-000000000010', 'run-recovery-safe-create',
    'owner-recovery-safe', 'owner_command', 'sales.default',
    'openai', 'luna-medium-2026-08', null, null, 'medium', null,
    null, null, null, null, 'member',
    '81000000-0000-4000-8000-000000000001', null,
    5, '{"recovery_case":"before_effect"}', 'corr-recovery-safe', null
  )$$,
  'safe recovery run is durably enqueued'
);

select extensions.lives_ok(
  $$select * from api.claim_agent_job(
    '81000000-0000-4000-8000-000000000010', 'worker-recovery-safe', 120
  )$$,
  'safe recovery job receives a lease'
);

select extensions.lives_ok(
  $$select * from api.start_agent_job_attempt(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs where worker_id = 'worker-recovery-safe'),
    'worker-recovery-safe',
    (select lease_token from app_private.agent_jobs where worker_id = 'worker-recovery-safe'),
    0, '{}'
  )$$,
  'safe recovery attempt starts before simulated worker loss'
);

update app_private.agent_jobs
set lease_expires_at = statement_timestamp() - interval '1 second'
where worker_id = 'worker-recovery-safe';

select extensions.is(
  (select recovery_disposition from api.recover_expired_agent_job(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'owner-recovery-safe')),
    'recovery-controller', 3600
  )),
  'retry_before_effect',
  'expired lease before an external effect is safely retryable'
);

select extensions.is(
  (select status from app_private.agent_jobs
    where run_id = (select id from app_private.agent_runs where run_key = 'owner-recovery-safe')),
  'retryable',
  'safe recovery leaves durable job retryable with a delayed availability'
);

select extensions.ok(
  not (select recovered from api.recover_expired_agent_job(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'owner-recovery-safe')),
    'recovery-controller', 3600
  )),
  'repeated recovery does not mutate an already recovered job'
);

select extensions.lives_ok(
  $$select * from api.enqueue_agent_run(
    '81000000-0000-4000-8000-000000000010', 'run-contact-recovery-create',
    'contact-turn-recovery', 'conversation_turn', 'sales.default',
    'openai', 'luna-medium-2026-08', 'minimax', 'MiniMax-M3', 'medium',
    decode(repeat('33', 32), 'hex'),
    '81000000-0000-4000-8000-000000000020',
    '81000000-0000-4000-8000-000000000023', null, null,
    'contact', null, '81000000-0000-4000-8000-000000000022',
    5, '{"recovery_case":"after_effect_start"}',
    'corr-recovery-uncertain', 'trace-recovery-uncertain'
  )$$,
  'second contact turn reuses the existing conversation snapshot'
);

select extensions.is(
  (
    select count(distinct conversation_snapshot_id)::integer
    from app_private.agent_runs
    where run_key in ('contact-turn-001', 'contact-turn-recovery')
  ),
  1,
  'all turns in one conversation share the exact same policy snapshot'
);

select extensions.is(
  (
    select count(distinct configuration_version_id)::integer
    from app_private.agent_run_configurations
    where run_id in (
      select id from app_private.agent_runs
      where run_key in ('contact-turn-001', 'contact-turn-recovery')
    )
  ),
  1,
  'later configuration activation does not silently alter an existing conversation'
);

select extensions.lives_ok(
  $$select * from api.claim_agent_job(
    '81000000-0000-4000-8000-000000000010', 'worker-recovery-uncertain', 120
  )$$,
  'uncertain recovery job is claimed while delayed safe retry remains unavailable'
);

select extensions.lives_ok(
  $$select * from api.start_agent_job_attempt(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs where worker_id = 'worker-recovery-uncertain'),
    'worker-recovery-uncertain',
    (select lease_token from app_private.agent_jobs where worker_id = 'worker-recovery-uncertain'),
    0, '{}'
  )$$,
  'uncertain recovery attempt starts normally'
);

select extensions.lives_ok(
  $$select * from api.propose_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_runs where run_key = 'contact-turn-recovery'),
    (select id from app_private.job_attempts where worker_id = 'worker-recovery-uncertain'),
    'catalog.upsert_product', 'provider-call-recovery-001',
    'execution-recovery-001', 'external-recovery-001', 1,
    '{"sku":"TINACO-362","inventory_delta":2}'
  )$$,
  'recovery scenario records the exact external tool proposal'
);

select extensions.is(
  (select authorization_status from api.authorize_tool_execution(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-recovery-001'))),
  'allowed',
  'recovery external tool passes deterministic policy authorization'
);

select extensions.lives_ok(
  $$select * from api.mark_tool_effect_started(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.tool_executions
      where execution_key = 'execution-recovery-001'), 'tool-worker-recovery'
  )$$,
  'recovery external effect is durably marked before simulated crash'
);

update app_private.agent_jobs
set lease_expires_at = statement_timestamp() - interval '1 second'
where worker_id = 'worker-recovery-uncertain';

select extensions.is(
  (select recovery_disposition from api.recover_expired_agent_job(
    '81000000-0000-4000-8000-000000000010',
    (select id from app_private.agent_jobs
      where run_id = (select id from app_private.agent_runs where run_key = 'contact-turn-recovery')),
    'recovery-controller', 5
  )),
  'halt_uncertain_effect',
  'expired lease after external start halts instead of blind retry'
);

select extensions.is(
  (select status || ':' || effect_certainty from app_private.tool_executions
    where execution_key = 'execution-recovery-001'),
  'uncertain:uncertain',
  'crashed external tool is terminally marked uncertain rather than left executing'
);

select extensions.is(
  (select status || ':' || external_effect_state from app_private.agent_jobs
    where run_id = (select id from app_private.agent_runs where run_key = 'contact-turn-recovery')),
  'uncertain:uncertain',
  'job preserves uncertain external effect evidence for human reconciliation'
);

select pg_temp.throws_sqlstate(
  $$update app_private.prompt_versions set content_template = 'tampered'
    where prompt_key = 'sales.assistant'$$,
  '23514',
  'immutable prompt history rejects direct rewriting even as postgres'
);

select pg_temp.throws_sqlstate(
  $$update app_private.agent_messages set content = '{"tampered":true}'
    where message_key = 'contact-input-001'$$,
  '23514',
  'immutable cognitive message history rejects direct rewriting'
);

set local role authenticated;
select set_config(
  'request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true
);

select extensions.ok(
  (select count(*) > 0 from api.agent_runs),
  'authenticated owner can read reduced runtime metadata for own organization'
);

select pg_temp.throws_sqlstate(
  $$select content_template from app_private.prompt_versions$$,
  '42501',
  'authenticated owner cannot read private prompt body directly'
);

select set_config(
  'request.jwt.claim.sub', '82000000-0000-4000-8000-000000000001', true
);

select extensions.is(
  (select count(*)::integer from api.agent_runs),
  0,
  'RLS prevents another organization owner from observing runtime rows'
);

reset role;

select * from extensions.finish();
rollback;
