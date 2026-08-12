begin;

create table app_private.agent_commands (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  idempotency_key text not null,
  operation text not null,
  request_fingerprint bytea not null,
  result_type text,
  result_id uuid,
  created_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_commands_scope_id_unique unique (organization_id, id),
  constraint agent_commands_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_commands_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint agent_commands_idempotency_unique unique (organization_id, idempotency_key),
  constraint agent_commands_idempotency_key_valid check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 1 and 180
  ),
  constraint agent_commands_operation_valid check (
    operation = btrim(operation) and char_length(operation) between 1 and 120
  ),
  constraint agent_commands_fingerprint_valid check (octet_length(request_fingerprint) = 32),
  constraint agent_commands_result_valid check (
    (completed_at is null and result_type is null and result_id is null)
    or (
      completed_at is not null and result_type is not null and result_id is not null
      and result_type = btrim(result_type) and char_length(result_type) between 1 and 80
    )
  ),
  constraint agent_commands_completed_at_valid check (
    completed_at is null or completed_at >= created_at
  )
);

create table app_private.business_configurations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  configuration_key text not null,
  display_name text not null,
  current_version_id uuid,
  status text not null default 'draft',
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint business_configurations_scope_id_unique unique (organization_id, id),
  constraint business_configurations_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint business_configurations_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint business_configurations_key_unique unique (organization_id, configuration_key),
  constraint business_configurations_key_valid check (
    configuration_key = lower(btrim(configuration_key))
    and configuration_key ~ '^[a-z][a-z0-9_.-]{0,119}$'
  ),
  constraint business_configurations_display_name_valid check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 160
  ),
  constraint business_configurations_status_valid check (status in ('draft', 'active', 'archived')),
  constraint business_configurations_current_version_valid check (
    (status = 'draft' and current_version_id is null)
    or (status in ('active', 'archived') and current_version_id is not null)
  ),
  constraint business_configurations_timestamps_valid check (updated_at >= created_at)
);

create table app_private.business_configuration_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  configuration_id uuid not null,
  version_number integer not null,
  schema_key text not null,
  schema_version integer not null,
  document jsonb not null,
  document_hash bytea not null,
  validation_contract text not null,
  source_version_id uuid,
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint business_configuration_versions_scope_id_unique
    unique (organization_id, configuration_id, id),
  constraint business_configuration_versions_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint business_configuration_versions_configuration_fk
    foreign key (organization_id, configuration_id)
    references app_private.business_configurations (organization_id, id)
    on delete restrict,
  constraint business_configuration_versions_source_fk
    foreign key (organization_id, configuration_id, source_version_id)
    references app_private.business_configuration_versions (organization_id, configuration_id, id)
    on delete restrict,
  constraint business_configuration_versions_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint business_configuration_versions_number_unique
    unique (organization_id, configuration_id, version_number),
  constraint business_configuration_versions_number_valid check (version_number > 0),
  constraint business_configuration_versions_schema_key_valid check (
    schema_key = lower(btrim(schema_key))
    and schema_key ~ '^[a-z][a-z0-9_.-]{0,119}$'
  ),
  constraint business_configuration_versions_schema_version_valid check (schema_version > 0),
  constraint business_configuration_versions_document_valid check (
    jsonb_typeof(document) = 'object' and octet_length(document::text) <= 131072
  ),
  constraint business_configuration_versions_hash_valid check (octet_length(document_hash) = 32),
  constraint business_configuration_versions_validation_contract_valid check (
    validation_contract = btrim(validation_contract)
    and char_length(validation_contract) between 1 and 160
  )
);

alter table app_private.business_configurations
  add constraint business_configurations_current_version_fk
  foreign key (organization_id, id, current_version_id)
  references app_private.business_configuration_versions (organization_id, configuration_id, id)
  on delete restrict
  deferrable initially deferred;

create table app_private.prompt_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  prompt_key text not null,
  version_number integer not null,
  template_format text not null,
  content_template text not null,
  content_hash bytea not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint prompt_versions_scope_id_unique unique (organization_id, id),
  constraint prompt_versions_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint prompt_versions_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint prompt_versions_key_version_unique
    unique (organization_id, prompt_key, version_number),
  constraint prompt_versions_key_valid check (
    prompt_key = lower(btrim(prompt_key)) and prompt_key ~ '^[a-z][a-z0-9_.-]{0,119}$'
  ),
  constraint prompt_versions_number_valid check (version_number > 0),
  constraint prompt_versions_format_valid check (template_format in ('text', 'markdown')),
  constraint prompt_versions_content_valid check (
    content_template = btrim(content_template)
    and char_length(content_template) between 1 and 262144
  ),
  constraint prompt_versions_hash_valid check (octet_length(content_hash) = 32)
);

create table app_private.tool_contracts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  tool_name text not null,
  display_name text not null,
  current_version_id uuid,
  status text not null default 'draft',
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint tool_contracts_scope_id_unique unique (organization_id, id),
  constraint tool_contracts_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint tool_contracts_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint tool_contracts_name_unique unique (organization_id, tool_name),
  constraint tool_contracts_name_valid check (
    tool_name = lower(btrim(tool_name)) and tool_name ~ '^[a-z][a-z0-9_.-]{0,119}$'
  ),
  constraint tool_contracts_display_name_valid check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 160
  ),
  constraint tool_contracts_status_valid check (
    status in ('draft', 'active', 'disabled', 'archived')
  ),
  constraint tool_contracts_current_version_valid check (
    (status = 'draft' and current_version_id is null)
    or (status in ('active', 'disabled', 'archived') and current_version_id is not null)
  ),
  constraint tool_contracts_timestamps_valid check (updated_at >= created_at)
);

create table app_private.tool_contract_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  tool_contract_id uuid not null,
  version_number integer not null,
  description text not null,
  input_schema jsonb not null,
  output_schema jsonb not null,
  effect_class text not null,
  handler_key text not null,
  contract_hash bytea not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint tool_contract_versions_scope_id_unique
    unique (organization_id, tool_contract_id, id),
  constraint tool_contract_versions_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint tool_contract_versions_contract_fk
    foreign key (organization_id, tool_contract_id)
    references app_private.tool_contracts (organization_id, id)
    on delete restrict,
  constraint tool_contract_versions_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint tool_contract_versions_number_unique
    unique (organization_id, tool_contract_id, version_number),
  constraint tool_contract_versions_number_valid check (version_number > 0),
  constraint tool_contract_versions_description_valid check (
    description = btrim(description) and char_length(description) between 1 and 4000
  ),
  constraint tool_contract_versions_input_schema_valid check (
    jsonb_typeof(input_schema) = 'object' and octet_length(input_schema::text) <= 131072
  ),
  constraint tool_contract_versions_output_schema_valid check (
    jsonb_typeof(output_schema) = 'object' and octet_length(output_schema::text) <= 131072
  ),
  constraint tool_contract_versions_effect_class_valid check (
    effect_class in ('read_only', 'internal_mutation', 'external_effect')
  ),
  constraint tool_contract_versions_handler_key_valid check (
    handler_key = lower(btrim(handler_key)) and handler_key ~ '^[a-z][a-z0-9_.-]{0,159}$'
  ),
  constraint tool_contract_versions_hash_valid check (octet_length(contract_hash) = 32)
);

alter table app_private.tool_contracts
  add constraint tool_contracts_current_version_fk
  foreign key (organization_id, id, current_version_id)
  references app_private.tool_contract_versions (organization_id, tool_contract_id, id)
  on delete restrict
  deferrable initially deferred;

create table app_private.agent_policies (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  policy_key text not null,
  display_name text not null,
  current_version_id uuid,
  status text not null default 'draft',
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint agent_policies_scope_id_unique unique (organization_id, id),
  constraint agent_policies_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_policies_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint agent_policies_key_unique unique (organization_id, policy_key),
  constraint agent_policies_key_valid check (
    policy_key = lower(btrim(policy_key)) and policy_key ~ '^[a-z][a-z0-9_.-]{0,119}$'
  ),
  constraint agent_policies_display_name_valid check (
    display_name = btrim(display_name) and char_length(display_name) between 1 and 160
  ),
  constraint agent_policies_status_valid check (
    status in ('draft', 'active', 'disabled', 'archived')
  ),
  constraint agent_policies_current_version_valid check (
    (status = 'draft' and current_version_id is null)
    or (status in ('active', 'disabled', 'archived') and current_version_id is not null)
  ),
  constraint agent_policies_timestamps_valid check (updated_at >= created_at)
);

create table app_private.agent_policy_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  policy_id uuid not null,
  version_number integer not null,
  prompt_version_id uuid not null,
  max_tool_rounds integer not null,
  max_provider_attempts integer not null,
  max_parallel_tools integer not null,
  turn_timeout_ms integer not null,
  cache_mode text not null,
  max_cost_amount numeric(20,8),
  cost_currency text,
  unknown_cost_behavior text not null,
  fallback_models jsonb not null default '[]'::jsonb,
  policy_hash bytea not null,
  created_by_user_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_policy_versions_scope_id_unique unique (organization_id, policy_id, id),
  constraint agent_policy_versions_organization_id_id_unique unique (organization_id, id),
  constraint agent_policy_versions_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_policy_versions_policy_fk
    foreign key (organization_id, policy_id)
    references app_private.agent_policies (organization_id, id)
    on delete restrict,
  constraint agent_policy_versions_prompt_fk
    foreign key (organization_id, prompt_version_id)
    references app_private.prompt_versions (organization_id, id)
    on delete restrict,
  constraint agent_policy_versions_created_by_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint agent_policy_versions_number_unique
    unique (organization_id, policy_id, version_number),
  constraint agent_policy_versions_number_valid check (version_number > 0),
  constraint agent_policy_versions_tool_rounds_valid check (max_tool_rounds between 1 and 64),
  constraint agent_policy_versions_attempts_valid check (max_provider_attempts between 1 and 32),
  constraint agent_policy_versions_parallel_tools_valid check (max_parallel_tools between 1 and 64),
  constraint agent_policy_versions_timeout_valid check (turn_timeout_ms between 1 and 600000),
  constraint agent_policy_versions_cache_mode_valid check (cache_mode in ('off', 'auto', 'explicit')),
  constraint agent_policy_versions_cost_valid check (
    (max_cost_amount is null and cost_currency is null)
    or (
      max_cost_amount > 0 and cost_currency = upper(btrim(cost_currency))
      and cost_currency ~ '^[A-Z]{3}$'
    )
  ),
  constraint agent_policy_versions_unknown_cost_valid check (
    unknown_cost_behavior in ('block', 'allow_and_alert')
  ),
  constraint agent_policy_versions_fallback_valid check (
    jsonb_typeof(fallback_models) = 'array'
    and jsonb_array_length(fallback_models) <= 8
    and octet_length(fallback_models::text) <= 16384
  ),
  constraint agent_policy_versions_hash_valid check (octet_length(policy_hash) = 32)
);

alter table app_private.agent_policies
  add constraint agent_policies_current_version_fk
  foreign key (organization_id, id, current_version_id)
  references app_private.agent_policy_versions (organization_id, policy_id, id)
  on delete restrict
  deferrable initially deferred;

create table app_private.agent_policy_tools (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  policy_version_id uuid not null,
  tool_contract_id uuid not null,
  tool_contract_version_id uuid not null,
  allowed_actor_kinds text[] not null,
  required_membership_roles text[] not null default '{}'::text[],
  allowed_channels text[] not null default '{}'::text[],
  authorization_constraints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_policy_tools_scope_id_unique unique (organization_id, id),
  constraint agent_policy_tools_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_policy_tools_policy_version_fk
    foreign key (organization_id, policy_version_id)
    references app_private.agent_policy_versions (organization_id, id)
    on delete restrict,
  constraint agent_policy_tools_contract_version_fk
    foreign key (organization_id, tool_contract_id, tool_contract_version_id)
    references app_private.tool_contract_versions (organization_id, tool_contract_id, id)
    on delete restrict,
  constraint agent_policy_tools_contract_unique
    unique (organization_id, policy_version_id, tool_contract_id),
  constraint agent_policy_tools_actor_kinds_valid check (
    cardinality(allowed_actor_kinds) between 1 and 4
    and allowed_actor_kinds <@ array['member', 'contact', 'system', 'scheduler']::text[]
  ),
  constraint agent_policy_tools_roles_valid check (
    required_membership_roles <@ array['owner', 'admin', 'operator', 'viewer']::text[]
  ),
  constraint agent_policy_tools_channels_valid check (cardinality(allowed_channels) <= 32),
  constraint agent_policy_tools_constraints_valid check (
    jsonb_typeof(authorization_constraints) = 'object'
    and octet_length(authorization_constraints::text) <= 32768
  )
);

create table app_private.conversation_agent_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  policy_version_id uuid not null,
  configuration_snapshot jsonb not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint conversation_agent_snapshots_scope_id_unique unique (organization_id, id),
  constraint conversation_agent_snapshots_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint conversation_agent_snapshots_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint conversation_agent_snapshots_policy_fk
    foreign key (organization_id, policy_version_id)
    references app_private.agent_policy_versions (organization_id, id)
    on delete restrict,
  constraint conversation_agent_snapshots_conversation_unique
    unique (organization_id, channel_connection_id, conversation_id),
  constraint conversation_agent_snapshots_configuration_valid check (
    jsonb_typeof(configuration_snapshot) = 'array'
    and jsonb_array_length(configuration_snapshot) <= 128
    and octet_length(configuration_snapshot::text) <= 65536
  )
);

create table app_private.agent_runs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_key text not null,
  run_kind text not null,
  status text not null default 'queued',
  channel_connection_id uuid,
  conversation_id uuid,
  trigger_message_id uuid,
  source_inbound_event_id uuid,
  conversation_snapshot_id uuid,
  actor_kind text not null,
  actor_user_id uuid,
  actor_channel_identity_id uuid,
  policy_version_id uuid not null,
  provider text not null,
  model text not null,
  vision_provider text,
  vision_model text,
  reasoning_effort text,
  cache_mode text not null,
  cache_key_hash bytea,
  fallback_models jsonb not null,
  max_tool_rounds integer not null,
  max_provider_attempts integer not null,
  max_parallel_tools integer not null,
  turn_timeout_ms integer not null,
  max_cost_amount numeric(20,8),
  cost_currency text,
  unknown_cost_behavior text not null,
  budget_status text not null default 'within',
  tool_round_count integer not null default 0,
  provider_attempt_count integer not null default 0,
  continuation_sequence integer not null default 0,
  provider_state_reference text,
  provider_state_hash bytea,
  last_termination_reason text,
  correlation_id text not null,
  trace_id text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint agent_runs_scope_id_unique unique (organization_id, id),
  constraint agent_runs_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_runs_run_key_unique unique (organization_id, run_key),
  constraint agent_runs_channel_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint agent_runs_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint agent_runs_trigger_message_fk
    foreign key (organization_id, channel_connection_id, conversation_id, trigger_message_id)
    references app_private.messages (organization_id, channel_connection_id, conversation_id, id)
    on delete restrict,
  constraint agent_runs_source_inbound_event_fk
    foreign key (organization_id, channel_connection_id, source_inbound_event_id)
    references app_private.inbound_events (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint agent_runs_conversation_snapshot_fk
    foreign key (organization_id, conversation_snapshot_id)
    references app_private.conversation_agent_snapshots (organization_id, id)
    on delete restrict,
  constraint agent_runs_actor_user_fk
    foreign key (organization_id, actor_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint agent_runs_actor_channel_identity_fk
    foreign key (organization_id, channel_connection_id, actor_channel_identity_id)
    references app_private.channel_identities (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint agent_runs_policy_fk
    foreign key (organization_id, policy_version_id)
    references app_private.agent_policy_versions (organization_id, id)
    on delete restrict,
  constraint agent_runs_run_key_valid check (
    run_key = btrim(run_key) and char_length(run_key) between 1 and 180
  ),
  constraint agent_runs_kind_valid check (
    run_kind in ('conversation_turn', 'owner_command', 'scheduled_task', 'system_recovery')
  ),
  constraint agent_runs_kind_actor_valid check (
    (run_kind = 'conversation_turn' and actor_kind in ('member', 'contact', 'system'))
    or (run_kind = 'owner_command' and actor_kind = 'member')
    or (run_kind = 'scheduled_task' and actor_kind = 'scheduler')
    or (run_kind = 'system_recovery' and actor_kind = 'system')
  ),
  constraint agent_runs_status_valid check (
    status in (
      'queued', 'running', 'waiting_tool', 'waiting_provider', 'waiting_handoff',
      'completed', 'failed', 'cancelled', 'uncertain'
    )
  ),
  constraint agent_runs_context_shape_valid check (
    (
      channel_connection_id is null and conversation_id is null and trigger_message_id is null
      and source_inbound_event_id is null and conversation_snapshot_id is null
      and actor_channel_identity_id is null
    )
    or (channel_connection_id is not null and (
      (conversation_id is null and trigger_message_id is null and conversation_snapshot_id is null)
      or (conversation_id is not null and conversation_snapshot_id is not null)
    ))
  ),
  constraint agent_runs_trigger_shape_valid check (
    trigger_message_id is null or conversation_id is not null
  ),
  constraint agent_runs_actor_kind_valid check (
    actor_kind in ('member', 'contact', 'system', 'scheduler')
  ),
  constraint agent_runs_actor_shape_valid check (
    (actor_kind = 'member' and actor_user_id is not null)
    or (actor_kind = 'contact' and actor_user_id is null and actor_channel_identity_id is not null)
    or (actor_kind in ('system', 'scheduler') and actor_user_id is null and actor_channel_identity_id is null)
  ),
  constraint agent_runs_provider_valid check (
    provider = lower(btrim(provider)) and provider ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
  ),
  constraint agent_runs_model_valid check (
    model = btrim(model) and char_length(model) between 1 and 200
  ),
  constraint agent_runs_vision_valid check (
    (vision_provider is null and vision_model is null)
    or (
      vision_provider = lower(btrim(vision_provider))
      and vision_provider ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
      and vision_model = btrim(vision_model)
      and char_length(vision_model) between 1 and 200
    )
  ),
  constraint agent_runs_reasoning_effort_valid check (
    reasoning_effort is null
    or (reasoning_effort = btrim(reasoning_effort) and char_length(reasoning_effort) between 1 and 80)
  ),
  constraint agent_runs_cache_mode_valid check (cache_mode in ('off', 'auto', 'explicit')),
  constraint agent_runs_cache_key_valid check (
    cache_key_hash is null or octet_length(cache_key_hash) = 32
  ),
  constraint agent_runs_fallback_valid check (
    jsonb_typeof(fallback_models) = 'array'
    and jsonb_array_length(fallback_models) <= 8
    and octet_length(fallback_models::text) <= 16384
  ),
  constraint agent_runs_limits_valid check (
    max_tool_rounds between 1 and 64
    and max_provider_attempts between 1 and 32
    and max_parallel_tools between 1 and 64
    and turn_timeout_ms between 1 and 600000
    and tool_round_count between 0 and max_tool_rounds
    and provider_attempt_count between 0 and max_provider_attempts
    and continuation_sequence >= 0
  ),
  constraint agent_runs_cost_valid check (
    (max_cost_amount is null and cost_currency is null)
    or (
      max_cost_amount > 0 and cost_currency = upper(btrim(cost_currency))
      and cost_currency ~ '^[A-Z]{3}$'
    )
  ),
  constraint agent_runs_unknown_cost_valid check (
    unknown_cost_behavior in ('block', 'allow_and_alert')
  ),
  constraint agent_runs_budget_status_valid check (
    budget_status in ('within', 'unknown', 'exceeded')
  ),
  constraint agent_runs_provider_state_valid check (
    (provider_state_reference is null and provider_state_hash is null)
    or (
      provider_state_reference is not null
      and provider_state_reference = btrim(provider_state_reference)
      and char_length(provider_state_reference) between 1 and 1024
      and provider_state_hash is not null
      and octet_length(provider_state_hash) = 32
    )
  ),
  constraint agent_runs_termination_valid check (
    last_termination_reason is null
    or last_termination_reason in (
      'completed', 'tool_calls', 'output_limit', 'context_limit',
      'content_filter', 'cancelled', 'provider_error'
    )
  ),
  constraint agent_runs_correlation_valid check (
    correlation_id = btrim(correlation_id) and char_length(correlation_id) between 1 and 128
  ),
  constraint agent_runs_trace_valid check (
    trace_id is null or (trace_id = btrim(trace_id) and char_length(trace_id) between 1 and 128)
  ),
  constraint agent_runs_lifecycle_valid check (
    (status = 'queued' or started_at is not null)
    and (
      status not in ('completed', 'failed', 'cancelled', 'uncertain')
      or completed_at is not null
    )
    and (started_at is null or started_at >= created_at)
    and (completed_at is null or completed_at >= coalesce(started_at, created_at))
    and updated_at >= created_at
  )
);

create table app_private.agent_run_configurations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  configuration_id uuid not null,
  configuration_version_id uuid not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_run_configurations_scope_id_unique unique (organization_id, id),
  constraint agent_run_configurations_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_run_configurations_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint agent_run_configurations_version_fk
    foreign key (organization_id, configuration_id, configuration_version_id)
    references app_private.business_configuration_versions (organization_id, configuration_id, id)
    on delete restrict,
  constraint agent_run_configurations_configuration_unique
    unique (organization_id, run_id, configuration_id)
);

create table app_private.agent_messages (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  message_key text not null,
  sequence_number integer not null,
  message_role text not null,
  message_kind text not null,
  trust_level text not null,
  channel_connection_id uuid,
  conversation_id uuid,
  domain_message_id uuid,
  provider_item_id text,
  content jsonb not null,
  content_hash bytea not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint agent_messages_scope_id_unique unique (organization_id, id),
  constraint agent_messages_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_messages_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint agent_messages_domain_message_fk
    foreign key (organization_id, channel_connection_id, conversation_id, domain_message_id)
    references app_private.messages (organization_id, channel_connection_id, conversation_id, id)
    on delete restrict,
  constraint agent_messages_sequence_unique unique (organization_id, run_id, sequence_number),
  constraint agent_messages_key_unique unique (organization_id, run_id, message_key),
  constraint agent_messages_key_valid check (
    message_key = btrim(message_key) and char_length(message_key) between 1 and 180
  ),
  constraint agent_messages_sequence_valid check (sequence_number > 0),
  constraint agent_messages_role_valid check (
    message_role in ('system', 'user', 'assistant', 'tool')
  ),
  constraint agent_messages_kind_valid check (
    message_kind in ('input', 'output', 'tool_call', 'tool_result', 'checkpoint', 'instruction')
  ),
  constraint agent_messages_trust_valid check (
    trust_level in ('system', 'trusted_member', 'untrusted_external', 'trusted_tool', 'provider')
  ),
  constraint agent_messages_domain_shape_valid check (
    (channel_connection_id is null and conversation_id is null and domain_message_id is null)
    or (channel_connection_id is not null and conversation_id is not null and domain_message_id is not null)
  ),
  constraint agent_messages_provider_item_valid check (
    provider_item_id is null
    or (provider_item_id = btrim(provider_item_id) and char_length(provider_item_id) between 1 and 512)
  ),
  constraint agent_messages_content_valid check (
    jsonb_typeof(content) in ('object', 'array') and octet_length(content::text) <= 1048576
  ),
  constraint agent_messages_hash_valid check (octet_length(content_hash) = 32)
);

create unique index agent_messages_provider_item_unique
  on app_private.agent_messages (organization_id, run_id, provider_item_id)
  where provider_item_id is not null;

create table app_private.agent_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  idempotency_key text not null,
  job_kind text not null,
  status text not null default 'pending',
  priority integer not null default 100,
  available_at timestamptz not null default statement_timestamp(),
  attempt_count integer not null default 0,
  max_attempts integer not null,
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  payload_safe jsonb not null default '{}'::jsonb,
  checkpoint_reference text,
  checkpoint_hash bytea,
  checkpoint_sequence integer not null default 0,
  external_effect_state text not null default 'not_started',
  last_error_code text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint agent_jobs_scope_id_unique unique (organization_id, id),
  constraint agent_jobs_scope_run_unique unique (organization_id, id, run_id),
  constraint agent_jobs_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint agent_jobs_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint agent_jobs_run_unique unique (organization_id, run_id),
  constraint agent_jobs_idempotency_unique unique (organization_id, idempotency_key),
  constraint agent_jobs_idempotency_valid check (
    idempotency_key = btrim(idempotency_key) and char_length(idempotency_key) between 1 and 180
  ),
  constraint agent_jobs_kind_valid check (
    job_kind in ('agent_turn', 'agent_continuation', 'tool_resume', 'reconciliation')
  ),
  constraint agent_jobs_status_valid check (
    status in (
      'pending', 'processing', 'waiting_tools', 'retryable', 'succeeded',
      'blocked', 'failed', 'cancelled', 'uncertain'
    )
  ),
  constraint agent_jobs_priority_valid check (priority between 1 and 1000),
  constraint agent_jobs_attempts_valid check (
    max_attempts between 1 and 32 and attempt_count between 0 and max_attempts
  ),
  constraint agent_jobs_lease_valid check (
    (
      status = 'processing' and worker_id is not null and lease_token is not null
      and lease_expires_at is not null and started_at is not null
    )
    or (
      status <> 'processing' and worker_id is null and lease_token is null
      and lease_expires_at is null
    )
  ),
  constraint agent_jobs_worker_valid check (
    worker_id is null or (worker_id = btrim(worker_id) and char_length(worker_id) between 1 and 160)
  ),
  constraint agent_jobs_payload_valid check (
    jsonb_typeof(payload_safe) = 'object' and octet_length(payload_safe::text) <= 65536
  ),
  constraint agent_jobs_checkpoint_valid check (
    checkpoint_sequence >= 0 and (
      (checkpoint_reference is null and checkpoint_hash is null)
      or (
        checkpoint_reference = btrim(checkpoint_reference)
        and char_length(checkpoint_reference) between 1 and 1024
        and checkpoint_hash is not null and octet_length(checkpoint_hash) = 32
      )
    )
  ),
  constraint agent_jobs_external_effect_valid check (
    external_effect_state in ('not_started', 'started', 'confirmed', 'uncertain')
  ),
  constraint agent_jobs_error_valid check (
    last_error_code is null
    or (last_error_code = btrim(last_error_code) and char_length(last_error_code) between 1 and 120)
  ),
  constraint agent_jobs_lifecycle_valid check (
    available_at >= created_at
    and (started_at is null or started_at >= created_at)
    and (
      status not in ('succeeded', 'blocked', 'failed', 'cancelled', 'uncertain')
      or completed_at is not null
    )
    and (completed_at is null or completed_at >= coalesce(started_at, created_at))
    and updated_at >= created_at
  )
);

create index agent_jobs_claim_idx
  on app_private.agent_jobs (priority, available_at, created_at, id)
  where status in ('pending', 'retryable');

create table app_private.job_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  job_id uuid not null,
  run_id uuid not null,
  attempt_number integer not null,
  lease_token uuid not null,
  worker_id text not null,
  provider text not null,
  model text not null,
  fallback_ordinal integer not null default 0,
  status text not null default 'running',
  termination_reason text,
  disposition text,
  provider_request_id text,
  request_metadata_safe jsonb not null default '{}'::jsonb,
  response_metadata_safe jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default statement_timestamp(),
  completed_at timestamptz,
  constraint job_attempts_scope_id_unique unique (organization_id, id),
  constraint job_attempts_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint job_attempts_job_run_fk
    foreign key (organization_id, job_id, run_id)
    references app_private.agent_jobs (organization_id, id, run_id)
    on delete restrict,
  constraint job_attempts_number_unique unique (organization_id, job_id, attempt_number),
  constraint job_attempts_lease_unique unique (organization_id, lease_token),
  constraint job_attempts_number_valid check (attempt_number > 0),
  constraint job_attempts_worker_valid check (
    worker_id = btrim(worker_id) and char_length(worker_id) between 1 and 160
  ),
  constraint job_attempts_provider_valid check (
    provider = lower(btrim(provider)) and provider ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
  ),
  constraint job_attempts_model_valid check (
    model = btrim(model) and char_length(model) between 1 and 200
  ),
  constraint job_attempts_fallback_valid check (fallback_ordinal between 0 and 8),
  constraint job_attempts_status_valid check (
    status in ('running', 'succeeded', 'failed', 'cancelled', 'uncertain')
  ),
  constraint job_attempts_termination_valid check (
    termination_reason is null
    or termination_reason in (
      'completed', 'tool_calls', 'output_limit', 'context_limit',
      'content_filter', 'cancelled', 'provider_error'
    )
  ),
  constraint job_attempts_disposition_valid check (
    disposition is null
    or disposition in (
      'finish', 'execute_tools', 'continue_from_checkpoint', 'retry_provider',
      'fallback_provider', 'halt_safely', 'await_handoff'
    )
  ),
  constraint job_attempts_provider_request_valid check (
    provider_request_id is null
    or (provider_request_id = btrim(provider_request_id) and char_length(provider_request_id) between 1 and 512)
  ),
  constraint job_attempts_request_metadata_valid check (
    jsonb_typeof(request_metadata_safe) = 'object'
    and octet_length(request_metadata_safe::text) <= 32768
  ),
  constraint job_attempts_response_metadata_valid check (
    jsonb_typeof(response_metadata_safe) = 'object'
    and octet_length(response_metadata_safe::text) <= 32768
  ),
  constraint job_attempts_lifecycle_valid check (
    (status = 'running' and termination_reason is null and disposition is null and completed_at is null)
    or (
      status <> 'running' and termination_reason is not null
      and disposition is not null and completed_at is not null
      and completed_at >= started_at
    )
  )
);

create table app_private.tool_executions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  job_attempt_id uuid not null,
  policy_tool_id uuid not null,
  tool_contract_id uuid not null,
  tool_contract_version_id uuid not null,
  provider_tool_call_id text not null,
  execution_key text not null,
  external_effect_key text,
  tool_round integer not null,
  effect_class text not null,
  status text not null default 'proposed',
  authorization_status text not null default 'pending',
  authorization_reason text,
  arguments_safe jsonb not null,
  arguments_hash bytea not null,
  result_safe jsonb,
  result_hash bytea,
  effect_certainty text not null default 'not_started',
  outbox_channel_connection_id uuid,
  outbox_event_id uuid,
  authorized_at timestamptz,
  effect_started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint tool_executions_scope_id_unique unique (organization_id, id),
  constraint tool_executions_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint tool_executions_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint tool_executions_attempt_fk
    foreign key (organization_id, job_attempt_id)
    references app_private.job_attempts (organization_id, id)
    on delete restrict,
  constraint tool_executions_policy_tool_fk
    foreign key (organization_id, policy_tool_id)
    references app_private.agent_policy_tools (organization_id, id)
    on delete restrict,
  constraint tool_executions_contract_version_fk
    foreign key (organization_id, tool_contract_id, tool_contract_version_id)
    references app_private.tool_contract_versions (organization_id, tool_contract_id, id)
    on delete restrict,
  constraint tool_executions_outbox_fk
    foreign key (organization_id, outbox_channel_connection_id, outbox_event_id)
    references app_private.outbox_events (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint tool_executions_provider_call_unique
    unique (organization_id, run_id, provider_tool_call_id),
  constraint tool_executions_execution_key_unique unique (organization_id, execution_key),
  constraint tool_executions_provider_call_valid check (
    provider_tool_call_id = btrim(provider_tool_call_id)
    and char_length(provider_tool_call_id) between 1 and 512
  ),
  constraint tool_executions_execution_key_valid check (
    execution_key = btrim(execution_key) and char_length(execution_key) between 1 and 180
  ),
  constraint tool_executions_external_effect_key_valid check (
    external_effect_key is null
    or (external_effect_key = btrim(external_effect_key) and char_length(external_effect_key) between 1 and 240)
  ),
  constraint tool_executions_round_valid check (tool_round between 1 and 64),
  constraint tool_executions_effect_class_valid check (
    effect_class in ('read_only', 'internal_mutation', 'external_effect')
    and (effect_class <> 'external_effect' or external_effect_key is not null)
  ),
  constraint tool_executions_status_valid check (
    status in ('proposed', 'authorized', 'executing', 'succeeded', 'failed', 'blocked', 'uncertain')
  ),
  constraint tool_executions_authorization_valid check (
    (authorization_status = 'pending' and authorization_reason is null and authorized_at is null)
    or (
      authorization_status in ('allowed', 'blocked')
      and authorization_reason is not null
      and authorization_reason = btrim(authorization_reason)
      and char_length(authorization_reason) between 1 and 160
      and authorized_at is not null
    )
  ),
  constraint tool_executions_arguments_valid check (
    jsonb_typeof(arguments_safe) = 'object'
    and octet_length(arguments_safe::text) <= 131072
    and octet_length(arguments_hash) = 32
  ),
  constraint tool_executions_result_valid check (
    (result_safe is null and result_hash is null)
    or (
      jsonb_typeof(result_safe) in ('object', 'array')
      and octet_length(result_safe::text) <= 262144
      and result_hash is not null and octet_length(result_hash) = 32
    )
  ),
  constraint tool_executions_effect_certainty_valid check (
    effect_certainty in (
      'not_started', 'started_unknown', 'confirmed_applied', 'confirmed_not_applied', 'uncertain'
    )
  ),
  constraint tool_executions_outbox_shape_valid check (
    (outbox_channel_connection_id is null and outbox_event_id is null)
    or (outbox_channel_connection_id is not null and outbox_event_id is not null)
  ),
  constraint tool_executions_lifecycle_valid check (
    (status = 'proposed' and authorization_status = 'pending' and completed_at is null)
    or (status = 'authorized' and authorization_status = 'allowed' and completed_at is null)
    or (status = 'executing' and authorization_status = 'allowed' and completed_at is null)
    or (
      status in ('succeeded', 'failed', 'blocked', 'uncertain')
      and completed_at is not null
    )
  ),
  constraint tool_executions_effect_timestamps_valid check (
    (effect_started_at is null or effect_started_at >= created_at)
    and (completed_at is null or completed_at >= created_at)
    and (authorized_at is null or authorized_at >= created_at)
  )
);

create unique index tool_executions_external_effect_unique
  on app_private.tool_executions (organization_id, external_effect_key)
  where external_effect_key is not null;

create table app_private.usage_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  usage_key text not null,
  run_id uuid not null,
  job_attempt_id uuid,
  tool_execution_id uuid,
  provider text not null,
  model text not null,
  operation text not null,
  request_count integer not null default 1,
  input_tokens bigint,
  output_tokens bigint,
  reasoning_tokens bigint,
  cached_input_tokens bigint,
  cache_write_input_tokens bigint,
  total_tokens bigint,
  cost_status text not null,
  cost_amount numeric(20,8),
  cost_currency text,
  latency_ms integer,
  provider_usage_safe jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint usage_events_scope_id_unique unique (organization_id, id),
  constraint usage_events_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint usage_events_key_unique unique (organization_id, usage_key),
  constraint usage_events_key_valid check (
    usage_key = btrim(usage_key) and char_length(usage_key) between 1 and 180
  ),
  constraint usage_events_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint usage_events_attempt_fk
    foreign key (organization_id, job_attempt_id)
    references app_private.job_attempts (organization_id, id)
    on delete restrict,
  constraint usage_events_tool_execution_fk
    foreign key (organization_id, tool_execution_id)
    references app_private.tool_executions (organization_id, id)
    on delete restrict,
  constraint usage_events_provider_valid check (
    provider = lower(btrim(provider)) and provider ~ '^[a-z0-9][a-z0-9_-]{0,79}$'
  ),
  constraint usage_events_model_valid check (
    model = btrim(model) and char_length(model) between 1 and 200
  ),
  constraint usage_events_operation_valid check (
    operation = btrim(operation) and char_length(operation) between 1 and 120
  ),
  constraint usage_events_request_count_valid check (request_count between 1 and 1000000),
  constraint usage_events_tokens_valid check (
    (input_tokens is null or input_tokens >= 0)
    and (output_tokens is null or output_tokens >= 0)
    and (reasoning_tokens is null or reasoning_tokens >= 0)
    and (cached_input_tokens is null or cached_input_tokens >= 0)
    and (cache_write_input_tokens is null or cache_write_input_tokens >= 0)
    and (total_tokens is null or total_tokens >= 0)
  ),
  constraint usage_events_cost_valid check (
    (cost_status = 'known' and cost_amount is not null and cost_amount >= 0
      and cost_currency = upper(btrim(cost_currency)) and cost_currency ~ '^[A-Z]{3}$')
    or (cost_status in ('unknown', 'not_applicable') and cost_amount is null and cost_currency is null)
  ),
  constraint usage_events_latency_valid check (latency_ms is null or latency_ms >= 0),
  constraint usage_events_provider_usage_valid check (
    jsonb_typeof(provider_usage_safe) = 'object'
    and octet_length(provider_usage_safe::text) <= 32768
  )
);

create table app_private.error_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  error_key text not null,
  run_id uuid,
  job_id uuid,
  job_attempt_id uuid,
  tool_execution_id uuid,
  error_code text not null,
  error_category text not null,
  retryable boolean not null,
  severity text not null,
  provider text,
  provider_request_id text,
  summary_redacted text not null,
  detail_reference text,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint error_events_scope_id_unique unique (organization_id, id),
  constraint error_events_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint error_events_key_unique unique (organization_id, error_key),
  constraint error_events_key_valid check (
    error_key = btrim(error_key) and char_length(error_key) between 1 and 180
  ),
  constraint error_events_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint error_events_job_fk
    foreign key (organization_id, job_id)
    references app_private.agent_jobs (organization_id, id)
    on delete restrict,
  constraint error_events_attempt_fk
    foreign key (organization_id, job_attempt_id)
    references app_private.job_attempts (organization_id, id)
    on delete restrict,
  constraint error_events_tool_fk
    foreign key (organization_id, tool_execution_id)
    references app_private.tool_executions (organization_id, id)
    on delete restrict,
  constraint error_events_code_valid check (
    error_code = btrim(error_code) and char_length(error_code) between 1 and 120
  ),
  constraint error_events_category_valid check (
    error_category in (
      'validation', 'authorization', 'provider', 'rate_limit', 'timeout',
      'budget', 'content_safety', 'state_conflict', 'internal', 'external_effect'
    )
  ),
  constraint error_events_severity_valid check (
    severity in ('info', 'warning', 'error', 'critical')
  ),
  constraint error_events_provider_valid check (
    provider is null
    or (provider = lower(btrim(provider)) and provider ~ '^[a-z0-9][a-z0-9_-]{0,79}$')
  ),
  constraint error_events_provider_request_valid check (
    provider_request_id is null
    or (provider_request_id = btrim(provider_request_id) and char_length(provider_request_id) between 1 and 512)
  ),
  constraint error_events_summary_valid check (
    summary_redacted = btrim(summary_redacted)
    and char_length(summary_redacted) between 1 and 2000
  ),
  constraint error_events_detail_reference_valid check (
    detail_reference is null
    or (detail_reference = btrim(detail_reference) and char_length(detail_reference) between 1 and 1024)
  )
);

create table app_private.memory_entries (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid not null,
  channel_connection_id uuid,
  conversation_id uuid,
  source_agent_message_id uuid,
  source_tool_execution_id uuid,
  scope_kind text not null,
  scope_key text not null,
  trust_level text not null,
  content jsonb not null,
  content_hash bytea not null,
  provenance_safe jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint memory_entries_scope_id_unique unique (organization_id, id),
  constraint memory_entries_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint memory_entries_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint memory_entries_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint memory_entries_source_message_fk
    foreign key (organization_id, source_agent_message_id)
    references app_private.agent_messages (organization_id, id)
    on delete restrict,
  constraint memory_entries_source_tool_fk
    foreign key (organization_id, source_tool_execution_id)
    references app_private.tool_executions (organization_id, id)
    on delete restrict,
  constraint memory_entries_scope_kind_valid check (
    scope_kind in ('business', 'conversation', 'contact', 'task')
  ),
  constraint memory_entries_scope_key_valid check (
    scope_key = btrim(scope_key) and char_length(scope_key) between 1 and 240
  ),
  constraint memory_entries_trust_valid check (
    trust_level in ('owner_confirmed', 'tool_confirmed', 'untrusted_summary')
  ),
  constraint memory_entries_content_valid check (
    jsonb_typeof(content) = 'object' and octet_length(content::text) <= 131072
  ),
  constraint memory_entries_hash_valid check (octet_length(content_hash) = 32),
  constraint memory_entries_provenance_valid check (
    jsonb_typeof(provenance_safe) = 'object'
    and octet_length(provenance_safe::text) <= 32768
  ),
  constraint memory_entries_status_valid check (status in ('active', 'revoked', 'expired')),
  constraint memory_entries_conversation_shape_valid check (
    (channel_connection_id is null and conversation_id is null)
    or (channel_connection_id is not null and conversation_id is not null)
  ),
  constraint memory_entries_lifecycle_valid check (
    (status = 'active' and revoked_at is null)
    or (status in ('revoked', 'expired') and revoked_at is not null)
  ),
  constraint memory_entries_timestamps_valid check (
    (expires_at is null or expires_at > created_at)
    and (revoked_at is null or revoked_at >= created_at)
  )
);

create table app_private.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  run_id uuid,
  job_id uuid,
  job_attempt_id uuid,
  tool_execution_id uuid,
  configuration_id uuid,
  configuration_version_id uuid,
  outbox_channel_connection_id uuid,
  outbox_event_id uuid,
  event_type text not null,
  actor_kind text not null,
  actor_user_id uuid,
  correlation_id text not null,
  trace_id text,
  metadata_safe jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default statement_timestamp(),
  constraint audit_events_scope_id_unique unique (organization_id, id),
  constraint audit_events_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint audit_events_run_fk
    foreign key (organization_id, run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint audit_events_job_fk
    foreign key (organization_id, job_id)
    references app_private.agent_jobs (organization_id, id)
    on delete restrict,
  constraint audit_events_attempt_fk
    foreign key (organization_id, job_attempt_id)
    references app_private.job_attempts (organization_id, id)
    on delete restrict,
  constraint audit_events_tool_fk
    foreign key (organization_id, tool_execution_id)
    references app_private.tool_executions (organization_id, id)
    on delete restrict,
  constraint audit_events_configuration_fk
    foreign key (organization_id, configuration_id, configuration_version_id)
    references app_private.business_configuration_versions (organization_id, configuration_id, id)
    on delete restrict,
  constraint audit_events_outbox_fk
    foreign key (organization_id, outbox_channel_connection_id, outbox_event_id)
    references app_private.outbox_events (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint audit_events_actor_user_fk
    foreign key (organization_id, actor_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint audit_events_event_type_valid check (
    event_type = btrim(event_type) and char_length(event_type) between 1 and 160
  ),
  constraint audit_events_actor_kind_valid check (
    actor_kind in ('member', 'contact', 'system', 'scheduler', 'worker', 'provider')
  ),
  constraint audit_events_actor_shape_valid check (
    (actor_kind = 'member' and actor_user_id is not null)
    or (actor_kind <> 'member' and actor_user_id is null)
  ),
  constraint audit_events_configuration_shape_valid check (
    (configuration_id is null and configuration_version_id is null)
    or (configuration_id is not null and configuration_version_id is not null)
  ),
  constraint audit_events_outbox_shape_valid check (
    (outbox_channel_connection_id is null and outbox_event_id is null)
    or (outbox_channel_connection_id is not null and outbox_event_id is not null)
  ),
  constraint audit_events_correlation_valid check (
    correlation_id = btrim(correlation_id) and char_length(correlation_id) between 1 and 128
  ),
  constraint audit_events_trace_valid check (
    trace_id is null or (trace_id = btrim(trace_id) and char_length(trace_id) between 1 and 128)
  ),
  constraint audit_events_metadata_valid check (
    jsonb_typeof(metadata_safe) = 'object' and octet_length(metadata_safe::text) <= 65536
  )
);

create index agent_commands_created_by_fk_idx
  on app_private.agent_commands (organization_id, created_by_user_id)
  where created_by_user_id is not null;
create index business_configurations_created_by_fk_idx
  on app_private.business_configurations (organization_id, created_by_user_id);
create index business_configuration_versions_created_by_fk_idx
  on app_private.business_configuration_versions (organization_id, created_by_user_id);
create index business_configuration_versions_source_fk_idx
  on app_private.business_configuration_versions (organization_id, configuration_id, source_version_id)
  where source_version_id is not null;
create index prompt_versions_created_by_fk_idx
  on app_private.prompt_versions (organization_id, created_by_user_id);
create index tool_contracts_created_by_fk_idx
  on app_private.tool_contracts (organization_id, created_by_user_id);
create index tool_contract_versions_created_by_fk_idx
  on app_private.tool_contract_versions (organization_id, created_by_user_id);
create index agent_policies_created_by_fk_idx
  on app_private.agent_policies (organization_id, created_by_user_id);
create index agent_policy_versions_prompt_fk_idx
  on app_private.agent_policy_versions (organization_id, prompt_version_id);
create index agent_policy_versions_created_by_fk_idx
  on app_private.agent_policy_versions (organization_id, created_by_user_id);
create index agent_policy_tools_contract_version_fk_idx
  on app_private.agent_policy_tools (organization_id, tool_contract_id, tool_contract_version_id);
create index conversation_agent_snapshots_policy_fk_idx
  on app_private.conversation_agent_snapshots (organization_id, policy_version_id);
create index agent_runs_conversation_fk_idx
  on app_private.agent_runs (organization_id, channel_connection_id, conversation_id)
  where conversation_id is not null;
create index agent_runs_trigger_message_fk_idx
  on app_private.agent_runs (organization_id, channel_connection_id, conversation_id, trigger_message_id)
  where trigger_message_id is not null;
create index agent_runs_source_inbound_event_fk_idx
  on app_private.agent_runs (organization_id, channel_connection_id, source_inbound_event_id)
  where source_inbound_event_id is not null;
create index agent_runs_snapshot_fk_idx
  on app_private.agent_runs (organization_id, conversation_snapshot_id)
  where conversation_snapshot_id is not null;
create index agent_runs_actor_user_fk_idx
  on app_private.agent_runs (organization_id, actor_user_id)
  where actor_user_id is not null;
create index agent_runs_actor_identity_fk_idx
  on app_private.agent_runs (organization_id, channel_connection_id, actor_channel_identity_id)
  where actor_channel_identity_id is not null;
create index agent_runs_policy_fk_idx
  on app_private.agent_runs (organization_id, policy_version_id);
create index agent_runs_status_idx
  on app_private.agent_runs (organization_id, status, created_at desc, id);
create index agent_run_configurations_version_fk_idx
  on app_private.agent_run_configurations (
    organization_id, configuration_id, configuration_version_id
  );
create index agent_messages_run_timeline_idx
  on app_private.agent_messages (organization_id, run_id, sequence_number);
create index agent_messages_domain_message_fk_idx
  on app_private.agent_messages (
    organization_id, channel_connection_id, conversation_id, domain_message_id
  ) where domain_message_id is not null;
create index job_attempts_run_fk_idx
  on app_private.job_attempts (organization_id, run_id);
create index job_attempts_job_run_fk_idx
  on app_private.job_attempts (organization_id, job_id, run_id);
create index tool_executions_attempt_fk_idx
  on app_private.tool_executions (organization_id, job_attempt_id);
create index tool_executions_policy_tool_fk_idx
  on app_private.tool_executions (organization_id, policy_tool_id);
create index tool_executions_contract_version_fk_idx
  on app_private.tool_executions (organization_id, tool_contract_id, tool_contract_version_id);
create index tool_executions_outbox_fk_idx
  on app_private.tool_executions (organization_id, outbox_channel_connection_id, outbox_event_id)
  where outbox_event_id is not null;
create index usage_events_run_time_idx
  on app_private.usage_events (organization_id, run_id, occurred_at, id);
create index usage_events_attempt_fk_idx
  on app_private.usage_events (organization_id, job_attempt_id)
  where job_attempt_id is not null;
create index usage_events_tool_fk_idx
  on app_private.usage_events (organization_id, tool_execution_id)
  where tool_execution_id is not null;
create index error_events_run_time_idx
  on app_private.error_events (organization_id, run_id, occurred_at, id)
  where run_id is not null;
create index error_events_job_fk_idx
  on app_private.error_events (organization_id, job_id)
  where job_id is not null;
create index error_events_attempt_fk_idx
  on app_private.error_events (organization_id, job_attempt_id)
  where job_attempt_id is not null;
create index error_events_tool_fk_idx
  on app_private.error_events (organization_id, tool_execution_id)
  where tool_execution_id is not null;
create index memory_entries_run_fk_idx
  on app_private.memory_entries (organization_id, run_id);
create index memory_entries_conversation_fk_idx
  on app_private.memory_entries (organization_id, channel_connection_id, conversation_id)
  where conversation_id is not null;
create index memory_entries_source_message_fk_idx
  on app_private.memory_entries (organization_id, source_agent_message_id)
  where source_agent_message_id is not null;
create index memory_entries_source_tool_fk_idx
  on app_private.memory_entries (organization_id, source_tool_execution_id)
  where source_tool_execution_id is not null;
create index memory_entries_lookup_idx
  on app_private.memory_entries (organization_id, scope_kind, scope_key, status, created_at desc);
create index audit_events_run_time_idx
  on app_private.audit_events (organization_id, run_id, occurred_at, id)
  where run_id is not null;
create index audit_events_job_fk_idx
  on app_private.audit_events (organization_id, job_id)
  where job_id is not null;
create index audit_events_attempt_fk_idx
  on app_private.audit_events (organization_id, job_attempt_id)
  where job_attempt_id is not null;
create index audit_events_tool_fk_idx
  on app_private.audit_events (organization_id, tool_execution_id)
  where tool_execution_id is not null;
create index audit_events_configuration_fk_idx
  on app_private.audit_events (organization_id, configuration_id, configuration_version_id)
  where configuration_version_id is not null;
create index audit_events_outbox_fk_idx
  on app_private.audit_events (organization_id, outbox_channel_connection_id, outbox_event_id)
  where outbox_event_id is not null;
create index audit_events_actor_user_fk_idx
  on app_private.audit_events (organization_id, actor_user_id)
  where actor_user_id is not null;

create index business_configurations_current_version_fk_idx
  on app_private.business_configurations (organization_id, id, current_version_id)
  where current_version_id is not null;
create index tool_contracts_current_version_fk_idx
  on app_private.tool_contracts (organization_id, id, current_version_id)
  where current_version_id is not null;
create index agent_policies_current_version_fk_idx
  on app_private.agent_policies (organization_id, id, current_version_id)
  where current_version_id is not null;

create function app_private.assert_agent_actor(
  target_organization_id uuid,
  target_user_id uuid,
  allowed_roles text[] default array['owner', 'admin', 'operator']::text[],
  allow_system boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    if allow_system then
      return;
    end if;
    raise exception using errcode = '42501', message = 'agent operation requires a member actor';
  end if;

  if not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  ) then
    raise exception using
      errcode = '42501',
      message = 'agent actor is not an active authorized member';
  end if;
end;
$$;

create function api.enqueue_agent_run(
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
  if target_actor_kind = 'contact' and (
    target_conversation_id is null or target_actor_channel_identity_id is null
  ) then
    raise exception using errcode = '22023', message = 'contact run requires conversation identity';
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
          target_actor_kind <> 'contact'
          or conversation_value.primary_channel_identity_id = target_actor_channel_identity_id
        )
    ) then
      raise exception using errcode = '42501', message = 'agent conversation is unavailable for this actor';
    end if;
    if target_actor_kind = 'contact' and not exists (
      select 1
      from app_private.channel_identities as identity_value
      where identity_value.organization_id = target_organization_id
        and identity_value.channel_connection_id = target_channel_connection_id
        and identity_value.id = target_actor_channel_identity_id
        and identity_value.principal_type = 'contact'
        and identity_value.status = 'active'
    ) then
      raise exception using errcode = '42501', message = 'agent contact identity is not active';
    end if;
    select snapshot.id, snapshot.configuration_snapshot, snapshot.policy_version_id
    into target_snapshot_id, target_configuration_snapshot, target_snapshot_policy_version_id
    from app_private.conversation_agent_snapshots as snapshot
    where snapshot.organization_id = target_organization_id
      and snapshot.channel_connection_id = target_channel_connection_id
      and snapshot.conversation_id = target_conversation_id;

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
          message = 'conversation is pinned to a different agent policy';
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
        policy_version_id, configuration_snapshot
      ) values (
        target_organization_id, target_channel_connection_id, target_conversation_id,
        policy_record.id, target_configuration_snapshot
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
      'conversation_snapshot_id', target_snapshot_id
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

create function api.claim_agent_job(
  target_organization_id uuid,
  target_worker_id text,
  target_lease_seconds integer default 120
)
returns table (
  agent_job_id uuid,
  agent_run_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_number integer,
  payload_safe jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  target_lease_token uuid;
  target_lease_expires_at timestamptz;
begin
  if target_worker_id is null or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'agent worker id is invalid';
  end if;
  if target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'agent lease duration is invalid';
  end if;

  select job_value.* into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.status in ('pending', 'retryable')
    and job_value.available_at <= statement_timestamp()
    and job_value.attempt_count < job_value.max_attempts
  order by job_value.priority, job_value.available_at, job_value.created_at, job_value.id
  for update skip locked
  limit 1;
  if not found then
    return;
  end if;

  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = job_record.run_id
  for update;
  if run_record.status in ('completed', 'failed', 'cancelled', 'uncertain') then
    raise exception using errcode = '23514', message = 'terminal agent run cannot be claimed';
  end if;

  target_lease_token := extensions.gen_random_uuid();
  target_lease_expires_at := statement_timestamp() + pg_catalog.make_interval(secs => target_lease_seconds);
  update app_private.agent_jobs
  set status = 'processing',
      worker_id = target_worker_id,
      lease_token = target_lease_token,
      lease_expires_at = target_lease_expires_at,
      attempt_count = attempt_count + 1,
      started_at = coalesce(started_at, statement_timestamp())
  where organization_id = target_organization_id and id = job_record.id;

  update app_private.agent_runs
  set status = 'running',
      started_at = coalesce(started_at, statement_timestamp())
  where organization_id = target_organization_id and id = job_record.run_id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_job.claimed', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'attempt_number', job_record.attempt_count + 1,
      'lease_expires_at', target_lease_expires_at
    ), job_record.run_id, job_record.id
  );
  agent_job_id := job_record.id;
  agent_run_id := job_record.run_id;
  lease_token := target_lease_token;
  lease_expires_at := target_lease_expires_at;
  attempt_number := job_record.attempt_count + 1;
  payload_safe := job_record.payload_safe;
  return next;
end;
$$;

create function api.start_agent_job_attempt(
  target_organization_id uuid,
  target_job_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_fallback_ordinal integer,
  target_request_metadata_safe jsonb default '{}'::jsonb
)
returns table (
  job_attempt_id uuid,
  agent_run_id uuid,
  provider text,
  model text,
  attempt_number integer,
  fallback_ordinal integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  target_attempt_id uuid;
  target_provider text;
  target_model text;
begin
  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = target_job_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent job not found';
  end if;
  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or job_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'agent job lease is invalid or expired';
  end if;

  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = job_record.run_id
  for update;
  if run_record.provider_attempt_count >= run_record.max_provider_attempts then
    raise exception using errcode = '23514', message = 'agent provider attempt budget is exhausted';
  end if;
  if target_fallback_ordinal = 0 then
    target_provider := run_record.provider;
    target_model := run_record.model;
  elsif target_fallback_ordinal between 1 and jsonb_array_length(run_record.fallback_models) then
    target_provider := run_record.fallback_models -> (target_fallback_ordinal - 1) ->> 'provider';
    target_model := run_record.fallback_models -> (target_fallback_ordinal - 1) ->> 'model';
  else
    raise exception using errcode = '22023', message = 'agent fallback ordinal is outside the frozen route';
  end if;

  insert into app_private.job_attempts (
    organization_id, job_id, run_id, attempt_number,
    lease_token, worker_id, provider, model, fallback_ordinal,
    request_metadata_safe
  ) values (
    target_organization_id, job_record.id, job_record.run_id, job_record.attempt_count,
    target_lease_token, target_worker_id, target_provider, target_model,
    target_fallback_ordinal, target_request_metadata_safe
  ) returning id into target_attempt_id;

  update app_private.agent_runs
  set provider_attempt_count = provider_attempt_count + 1,
      status = 'running'
  where organization_id = target_organization_id and id = job_record.run_id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_attempt.started', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'provider', target_provider,
      'model', target_model,
      'attempt_number', job_record.attempt_count,
      'fallback_ordinal', target_fallback_ordinal
    ), job_record.run_id, job_record.id, target_attempt_id
  );
  job_attempt_id := target_attempt_id;
  agent_run_id := job_record.run_id;
  provider := target_provider;
  model := target_model;
  attempt_number := job_record.attempt_count;
  fallback_ordinal := target_fallback_ordinal;
  return next;
end;
$$;

create function app_private.claim_agent_command(
  target_organization_id uuid,
  target_idempotency_key text,
  target_operation text,
  target_request_payload jsonb,
  target_created_by_user_id uuid default null,
  target_allowed_roles text[] default array['owner', 'admin', 'operator']::text[],
  target_allow_system boolean default false
)
returns table (claimed_command_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_command app_private.agent_commands%rowtype;
  target_fingerprint bytea;
begin
  if target_request_payload is null or jsonb_typeof(target_request_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'agent command payload must be an object';
  end if;

  perform app_private.assert_agent_actor(
    target_organization_id,
    target_created_by_user_id,
    target_allowed_roles,
    target_allow_system
  );

  target_fingerprint := extensions.digest(target_request_payload::text, 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':' || target_idempotency_key, 0)
  );

  select command_value.* into existing_command
  from app_private.agent_commands as command_value
  where command_value.organization_id = target_organization_id
    and command_value.idempotency_key = target_idempotency_key
  for update;

  if found then
    if existing_command.operation <> target_operation
      or existing_command.request_fingerprint <> target_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'agent idempotency key was reused with another request';
    end if;
    if existing_command.completed_at is null then
      raise exception using
        errcode = '40001',
        message = 'agent command is incomplete and must be retried';
    end if;
    return query select existing_command.id, true;
    return;
  end if;

  insert into app_private.agent_commands (
    organization_id, idempotency_key, operation, request_fingerprint, created_by_user_id
  ) values (
    target_organization_id, target_idempotency_key, target_operation,
    target_fingerprint, target_created_by_user_id
  ) returning id into claimed_command_id;

  was_replayed := false;
  return next;
end;
$$;

create function app_private.complete_agent_command(
  target_organization_id uuid,
  target_command_id uuid,
  target_result_type text,
  target_result_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update app_private.agent_commands
  set result_type = target_result_type,
      result_id = target_result_id,
      completed_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_command_id
    and completed_at is null;

  if not found then
    raise exception using errcode = '40001', message = 'agent command could not be completed';
  end if;
end;
$$;

create function app_private.insert_agent_audit_event(
  target_organization_id uuid,
  target_event_type text,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null,
  target_metadata_safe jsonb default '{}'::jsonb,
  target_run_id uuid default null,
  target_job_id uuid default null,
  target_job_attempt_id uuid default null,
  target_tool_execution_id uuid default null,
  target_configuration_id uuid default null,
  target_configuration_version_id uuid default null,
  target_outbox_channel_connection_id uuid default null,
  target_outbox_event_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event_id uuid;
begin
  insert into app_private.audit_events (
    organization_id, run_id, job_id, job_attempt_id, tool_execution_id,
    configuration_id, configuration_version_id,
    outbox_channel_connection_id, outbox_event_id,
    event_type, actor_kind, actor_user_id, correlation_id, trace_id,
    metadata_safe, occurred_at
  ) values (
    target_organization_id, target_run_id, target_job_id, target_job_attempt_id,
    target_tool_execution_id, target_configuration_id, target_configuration_version_id,
    target_outbox_channel_connection_id, target_outbox_event_id,
    target_event_type, target_actor_kind, target_actor_user_id,
    target_correlation_id, target_trace_id, target_metadata_safe, target_occurred_at
  ) returning id into target_event_id;
  return target_event_id;
end;
$$;

create function app_private.agent_model_route_is_valid(target_route jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if target_route is null or jsonb_typeof(target_route) <> 'array' then
    return false;
  end if;
  if jsonb_array_length(target_route) > 8 then
    return false;
  end if;
  if exists (
    select 1
    from jsonb_array_elements(target_route) as route(item)
    where jsonb_typeof(route.item) <> 'object'
      or not (route.item ? 'provider' and route.item ? 'model')
      or jsonb_typeof(route.item -> 'provider') <> 'string'
      or jsonb_typeof(route.item -> 'model') <> 'string'
      or (route.item ->> 'provider') <> lower(btrim(route.item ->> 'provider'))
      or (route.item ->> 'provider') !~ '^[a-z0-9][a-z0-9_-]{0,79}$'
      or (route.item ->> 'model') <> btrim(route.item ->> 'model')
      or char_length(route.item ->> 'model') not between 1 and 200
  ) then
    return false;
  end if;
  return (
    select count(*) = count(distinct (route.item ->> 'provider') || ':' || (route.item ->> 'model'))
    from jsonb_array_elements(target_route) as route(item)
  );
end;
$$;

create function app_private.reject_agent_history_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'agent history is append-only';
end;
$$;

create function app_private.prevent_agent_root_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.organization_id <> new.organization_id
    or old.created_by_user_id <> new.created_by_user_id
    or old.created_at <> new.created_at then
    raise exception using errcode = '23514', message = 'agent root identity is immutable';
  end if;

  if tg_table_name = 'business_configurations'
    and (to_jsonb(old) ->> 'configuration_key')
      is distinct from (to_jsonb(new) ->> 'configuration_key') then
    raise exception using errcode = '23514', message = 'business configuration key is immutable';
  end if;
  if tg_table_name = 'tool_contracts'
    and (to_jsonb(old) ->> 'tool_name')
      is distinct from (to_jsonb(new) ->> 'tool_name') then
    raise exception using errcode = '23514', message = 'tool contract name is immutable';
  end if;
  if tg_table_name = 'agent_policies'
    and (to_jsonb(old) ->> 'policy_key')
      is distinct from (to_jsonb(new) ->> 'policy_key') then
    raise exception using errcode = '23514', message = 'agent policy key is immutable';
  end if;
  return new;
end;
$$;

create function app_private.validate_business_configuration_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.document_hash <> extensions.digest(new.document::text, 'sha256') then
    raise exception using errcode = '23514', message = 'business configuration document hash mismatch';
  end if;
  return new;
end;
$$;

create function app_private.validate_prompt_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.content_hash <> extensions.digest(convert_to(new.content_template, 'UTF8'), 'sha256') then
    raise exception using errcode = '23514', message = 'prompt content hash mismatch';
  end if;
  return new;
end;
$$;

create function app_private.validate_tool_contract_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  expected_hash bytea;
begin
  expected_hash := extensions.digest(jsonb_build_object(
    'description', new.description,
    'input_schema', new.input_schema,
    'output_schema', new.output_schema,
    'effect_class', new.effect_class,
    'handler_key', new.handler_key
  )::text, 'sha256');
  if new.contract_hash <> expected_hash then
    raise exception using errcode = '23514', message = 'tool contract hash mismatch';
  end if;
  return new;
end;
$$;

create function app_private.validate_agent_policy_version()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not app_private.agent_model_route_is_valid(new.fallback_models) then
    raise exception using errcode = '22023', message = 'fallback model route is invalid';
  end if;
  return new;
end;
$$;

create function app_private.validate_agent_policy_tool()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  policy_owner uuid;
  contract_owner uuid;
begin
  if cardinality(new.allowed_actor_kinds) <>
    cardinality(array(select distinct value from unnest(new.allowed_actor_kinds) as value)) then
    raise exception using errcode = '22023', message = 'allowed actor kinds cannot contain duplicates';
  end if;
  if cardinality(new.required_membership_roles) <>
    cardinality(array(select distinct value from unnest(new.required_membership_roles) as value)) then
    raise exception using errcode = '22023', message = 'required roles cannot contain duplicates';
  end if;
  if cardinality(new.allowed_channels) <>
    cardinality(array(select distinct value from unnest(new.allowed_channels) as value)) then
    raise exception using errcode = '22023', message = 'allowed channels cannot contain duplicates';
  end if;
  if exists (
    select 1 from unnest(new.allowed_channels) as channel_value
    where channel_value <> lower(btrim(channel_value))
      or channel_value !~ '^[a-z][a-z0-9_.-]{0,79}$'
  ) then
    raise exception using errcode = '22023', message = 'allowed channel is invalid';
  end if;

  select policy_value.policy_id into policy_owner
  from app_private.agent_policy_versions as policy_value
  where policy_value.organization_id = new.organization_id
    and policy_value.id = new.policy_version_id;
  select version_value.tool_contract_id into contract_owner
  from app_private.tool_contract_versions as version_value
  where version_value.organization_id = new.organization_id
    and version_value.id = new.tool_contract_version_id;
  if policy_owner is null or contract_owner is distinct from new.tool_contract_id then
    raise exception using errcode = '23514', message = 'policy tool scope is invalid';
  end if;
  return new;
end;
$$;

create function app_private.validate_conversation_agent_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.configuration_snapshot is null
    or jsonb_typeof(new.configuration_snapshot) <> 'array' then
    raise exception using errcode = '22023', message = 'conversation configuration snapshot must be an array';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(new.configuration_snapshot) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or not (item.value ? 'configuration_id' and item.value ? 'configuration_version_id')
      or not exists (
        select 1
        from app_private.business_configuration_versions as version_value
        where version_value.organization_id = new.organization_id
          and version_value.configuration_id = (item.value ->> 'configuration_id')::uuid
          and version_value.id = (item.value ->> 'configuration_version_id')::uuid
      )
  ) then
    raise exception using errcode = '23514', message = 'conversation configuration snapshot is invalid';
  end if;
  if (
    select count(*)
    from jsonb_array_elements(new.configuration_snapshot) as item(value)
  ) <> (
    select count(distinct item.value ->> 'configuration_id')
    from jsonb_array_elements(new.configuration_snapshot) as item(value)
  ) then
    raise exception using errcode = '23514', message = 'conversation configuration snapshot has duplicates';
  end if;
  return new;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'conversation configuration snapshot UUID is invalid';
end;
$$;

create function app_private.validate_agent_run()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  snapshot_policy_id uuid;
begin
  if not app_private.agent_model_route_is_valid(new.fallback_models) then
    raise exception using errcode = '22023', message = 'agent run fallback route is invalid';
  end if;
  if new.conversation_snapshot_id is not null then
    select snapshot.policy_version_id into snapshot_policy_id
    from app_private.conversation_agent_snapshots as snapshot
    where snapshot.organization_id = new.organization_id
      and snapshot.id = new.conversation_snapshot_id
      and snapshot.channel_connection_id = new.channel_connection_id
      and snapshot.conversation_id = new.conversation_id;
    if snapshot_policy_id is distinct from new.policy_version_id then
      raise exception using errcode = '23514', message = 'agent run does not match conversation snapshot';
    end if;
  end if;
  return new;
end;
$$;

create function app_private.prevent_agent_run_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    old.organization_id, old.run_key, old.run_kind,
    old.channel_connection_id, old.conversation_id, old.trigger_message_id,
    old.source_inbound_event_id, old.conversation_snapshot_id,
    old.actor_kind, old.actor_user_id, old.actor_channel_identity_id,
    old.policy_version_id, old.provider, old.model, old.vision_provider, old.vision_model,
    old.reasoning_effort, old.cache_mode, old.cache_key_hash, old.fallback_models,
    old.max_tool_rounds, old.max_provider_attempts, old.max_parallel_tools,
    old.turn_timeout_ms, old.max_cost_amount, old.cost_currency,
    old.unknown_cost_behavior, old.correlation_id, old.trace_id, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_key, new.run_kind,
    new.channel_connection_id, new.conversation_id, new.trigger_message_id,
    new.source_inbound_event_id, new.conversation_snapshot_id,
    new.actor_kind, new.actor_user_id, new.actor_channel_identity_id,
    new.policy_version_id, new.provider, new.model, new.vision_provider, new.vision_model,
    new.reasoning_effort, new.cache_mode, new.cache_key_hash, new.fallback_models,
    new.max_tool_rounds, new.max_provider_attempts, new.max_parallel_tools,
    new.turn_timeout_ms, new.max_cost_amount, new.cost_currency,
    new.unknown_cost_behavior, new.correlation_id, new.trace_id, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'agent run execution contract is immutable';
  end if;
  return new;
end;
$$;

create function app_private.prevent_agent_job_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    old.organization_id, old.run_id, old.idempotency_key, old.job_kind,
    old.priority, old.max_attempts, old.payload_safe, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_id, new.idempotency_key, new.job_kind,
    new.priority, new.max_attempts, new.payload_safe, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'agent job core contract is immutable';
  end if;
  return new;
end;
$$;

create function app_private.prevent_job_attempt_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    old.organization_id, old.job_id, old.run_id, old.attempt_number,
    old.lease_token, old.worker_id, old.provider, old.model, old.fallback_ordinal,
    old.request_metadata_safe, old.started_at
  ) is distinct from row(
    new.organization_id, new.job_id, new.run_id, new.attempt_number,
    new.lease_token, new.worker_id, new.provider, new.model, new.fallback_ordinal,
    new.request_metadata_safe, new.started_at
  ) then
    raise exception using errcode = '23514', message = 'agent job attempt identity is immutable';
  end if;
  if old.status <> 'running' then
    raise exception using errcode = '23514', message = 'terminal agent job attempt is immutable';
  end if;
  return new;
end;
$$;

create function app_private.validate_tool_execution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  run_policy_id uuid;
  attempt_run_id uuid;
  policy_tool_record app_private.agent_policy_tools%rowtype;
  contract_effect_class text;
begin
  select run_value.policy_version_id into run_policy_id
  from app_private.agent_runs as run_value
  where run_value.organization_id = new.organization_id and run_value.id = new.run_id;
  select attempt_value.run_id into attempt_run_id
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = new.organization_id and attempt_value.id = new.job_attempt_id;
  select * into policy_tool_record
  from app_private.agent_policy_tools as policy_tool
  where policy_tool.organization_id = new.organization_id and policy_tool.id = new.policy_tool_id;
  select version_value.effect_class into contract_effect_class
  from app_private.tool_contract_versions as version_value
  where version_value.organization_id = new.organization_id
    and version_value.tool_contract_id = new.tool_contract_id
    and version_value.id = new.tool_contract_version_id;

  if attempt_run_id is distinct from new.run_id
    or policy_tool_record.policy_version_id is distinct from run_policy_id
    or policy_tool_record.tool_contract_id is distinct from new.tool_contract_id
    or policy_tool_record.tool_contract_version_id is distinct from new.tool_contract_version_id
    or contract_effect_class is distinct from new.effect_class then
    raise exception using errcode = '23514', message = 'tool execution provenance is invalid';
  end if;
  return new;
end;
$$;

create function app_private.prevent_tool_execution_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    old.organization_id, old.run_id, old.job_attempt_id, old.policy_tool_id,
    old.tool_contract_id, old.tool_contract_version_id, old.provider_tool_call_id,
    old.execution_key, old.external_effect_key, old.tool_round,
    old.effect_class, old.arguments_safe, old.arguments_hash, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_id, new.job_attempt_id, new.policy_tool_id,
    new.tool_contract_id, new.tool_contract_version_id, new.provider_tool_call_id,
    new.execution_key, new.external_effect_key, new.tool_round,
    new.effect_class, new.arguments_safe, new.arguments_hash, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'tool execution request is immutable';
  end if;
  if old.status in ('succeeded', 'failed', 'blocked', 'uncertain') then
    raise exception using errcode = '23514', message = 'terminal tool execution is immutable';
  end if;
  return new;
end;
$$;

create function app_private.prevent_memory_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    old.organization_id, old.run_id, old.channel_connection_id, old.conversation_id,
    old.source_agent_message_id, old.source_tool_execution_id, old.scope_kind,
    old.scope_key, old.trust_level, old.content, old.content_hash,
    old.provenance_safe, old.expires_at, old.created_at
  ) is distinct from row(
    new.organization_id, new.run_id, new.channel_connection_id, new.conversation_id,
    new.source_agent_message_id, new.source_tool_execution_id, new.scope_kind,
    new.scope_key, new.trust_level, new.content, new.content_hash,
    new.provenance_safe, new.expires_at, new.created_at
  ) then
    raise exception using errcode = '23514', message = 'memory entry content and provenance are immutable';
  end if;
  return new;
end;
$$;

create trigger business_configurations_prevent_reassignment
before update on app_private.business_configurations
for each row execute function app_private.prevent_agent_root_reassignment();
create trigger business_configurations_set_updated_at
before update on app_private.business_configurations
for each row execute function app_private.set_updated_at();
create trigger business_configuration_versions_validate
before insert on app_private.business_configuration_versions
for each row execute function app_private.validate_business_configuration_version();
create trigger business_configuration_versions_reject_update
before update or delete on app_private.business_configuration_versions
for each row execute function app_private.reject_agent_history_rewrite();
create trigger prompt_versions_validate
before insert on app_private.prompt_versions
for each row execute function app_private.validate_prompt_version();
create trigger prompt_versions_reject_update
before update or delete on app_private.prompt_versions
for each row execute function app_private.reject_agent_history_rewrite();
create trigger tool_contracts_prevent_reassignment
before update on app_private.tool_contracts
for each row execute function app_private.prevent_agent_root_reassignment();
create trigger tool_contracts_set_updated_at
before update on app_private.tool_contracts
for each row execute function app_private.set_updated_at();
create trigger tool_contract_versions_validate
before insert on app_private.tool_contract_versions
for each row execute function app_private.validate_tool_contract_version();
create trigger tool_contract_versions_reject_update
before update or delete on app_private.tool_contract_versions
for each row execute function app_private.reject_agent_history_rewrite();
create trigger agent_policies_prevent_reassignment
before update on app_private.agent_policies
for each row execute function app_private.prevent_agent_root_reassignment();
create trigger agent_policies_set_updated_at
before update on app_private.agent_policies
for each row execute function app_private.set_updated_at();
create trigger agent_policy_versions_validate
before insert on app_private.agent_policy_versions
for each row execute function app_private.validate_agent_policy_version();
create trigger agent_policy_versions_reject_update
before update or delete on app_private.agent_policy_versions
for each row execute function app_private.reject_agent_history_rewrite();
create trigger agent_policy_tools_validate
before insert on app_private.agent_policy_tools
for each row execute function app_private.validate_agent_policy_tool();
create trigger agent_policy_tools_reject_update
before update or delete on app_private.agent_policy_tools
for each row execute function app_private.reject_agent_history_rewrite();
create trigger conversation_agent_snapshots_validate
before insert on app_private.conversation_agent_snapshots
for each row execute function app_private.validate_conversation_agent_snapshot();
create trigger conversation_agent_snapshots_reject_update
before update or delete on app_private.conversation_agent_snapshots
for each row execute function app_private.reject_agent_history_rewrite();
create trigger agent_runs_validate
before insert or update on app_private.agent_runs
for each row execute function app_private.validate_agent_run();
create trigger agent_runs_prevent_core_rewrite
before update on app_private.agent_runs
for each row execute function app_private.prevent_agent_run_core_rewrite();
create trigger agent_runs_set_updated_at
before update on app_private.agent_runs
for each row execute function app_private.set_updated_at();
create trigger agent_run_configurations_reject_update
before update or delete on app_private.agent_run_configurations
for each row execute function app_private.reject_agent_history_rewrite();
create trigger agent_messages_reject_update
before update or delete on app_private.agent_messages
for each row execute function app_private.reject_agent_history_rewrite();
create trigger agent_jobs_prevent_core_rewrite
before update on app_private.agent_jobs
for each row execute function app_private.prevent_agent_job_core_rewrite();
create trigger agent_jobs_set_updated_at
before update on app_private.agent_jobs
for each row execute function app_private.set_updated_at();
create trigger job_attempts_prevent_core_rewrite
before update on app_private.job_attempts
for each row execute function app_private.prevent_job_attempt_core_rewrite();
create trigger job_attempts_reject_delete
before delete on app_private.job_attempts
for each row execute function app_private.reject_agent_history_rewrite();
create trigger tool_executions_validate
before insert or update on app_private.tool_executions
for each row execute function app_private.validate_tool_execution();
create trigger tool_executions_prevent_core_rewrite
before update on app_private.tool_executions
for each row execute function app_private.prevent_tool_execution_core_rewrite();
create trigger tool_executions_reject_delete
before delete on app_private.tool_executions
for each row execute function app_private.reject_agent_history_rewrite();
create trigger usage_events_reject_update
before update or delete on app_private.usage_events
for each row execute function app_private.reject_agent_history_rewrite();
create trigger error_events_reject_update
before update or delete on app_private.error_events
for each row execute function app_private.reject_agent_history_rewrite();
create trigger memory_entries_prevent_core_rewrite
before update on app_private.memory_entries
for each row execute function app_private.prevent_memory_core_rewrite();
create trigger memory_entries_reject_delete
before delete on app_private.memory_entries
for each row execute function app_private.reject_agent_history_rewrite();
create trigger audit_events_reject_update
before update or delete on app_private.audit_events
for each row execute function app_private.reject_agent_history_rewrite();

create function api.create_business_configuration_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_configuration_key text,
  target_display_name text,
  target_schema_key text,
  target_schema_version integer,
  target_document jsonb,
  target_validation_contract text,
  target_expected_current_version_id uuid,
  target_activate boolean,
  target_created_by_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  configuration_id uuid,
  configuration_version_id uuid,
  version_number integer,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  configuration_record app_private.business_configurations%rowtype;
  target_version_id uuid;
  target_version_number integer;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'configuration_key', target_configuration_key,
    'display_name', target_display_name,
    'schema_key', target_schema_key,
    'schema_version', target_schema_version,
    'document', target_document,
    'validation_contract', target_validation_contract,
    'expected_current_version_id', target_expected_current_version_id,
    'activate', target_activate
  );
  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id, target_idempotency_key,
    'business_configuration.version.create', request_payload,
    target_created_by_user_id, array['owner', 'admin']::text[], false
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select version_value.configuration_id, version_value.id, version_value.version_number
    into configuration_id, configuration_version_id, version_number
    from app_private.agent_commands as command_value
    join app_private.business_configuration_versions as version_value
      on version_value.organization_id = command_value.organization_id
     and version_value.id = command_value.result_id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    was_replayed := true;
    return next;
    return;
  end if;

  select configuration_value.* into configuration_record
  from app_private.business_configurations as configuration_value
  where configuration_value.organization_id = target_organization_id
    and configuration_value.configuration_key = target_configuration_key
  for update;

  if not found then
    if target_expected_current_version_id is not null then
      raise exception using errcode = '40001', message = 'business configuration did not exist at expected version';
    end if;
    insert into app_private.business_configurations (
      organization_id, configuration_key, display_name, status, created_by_user_id
    ) values (
      target_organization_id, target_configuration_key, target_display_name,
      'draft', target_created_by_user_id
    ) returning * into configuration_record;
  elsif configuration_record.current_version_id is distinct from target_expected_current_version_id then
    raise exception using errcode = '40001', message = 'business configuration current version changed';
  elsif configuration_record.status = 'archived' then
    raise exception using errcode = '23514', message = 'archived business configuration cannot receive versions';
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_version_number
  from app_private.business_configuration_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.configuration_id = configuration_record.id;

  insert into app_private.business_configuration_versions (
    organization_id, configuration_id, version_number,
    schema_key, schema_version, document, document_hash,
    validation_contract, created_by_user_id
  ) values (
    target_organization_id, configuration_record.id, target_version_number,
    target_schema_key, target_schema_version, target_document,
    extensions.digest(target_document::text, 'sha256'),
    target_validation_contract, target_created_by_user_id
  ) returning id into target_version_id;

  if target_activate then
    update app_private.business_configurations
    set current_version_id = target_version_id,
        display_name = target_display_name,
        status = 'active'
    where organization_id = target_organization_id and id = configuration_record.id;
  end if;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id,
    'business_configuration_version', target_version_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'business_configuration.version_created',
    'member', target_created_by_user_id, target_correlation_id, target_trace_id,
    jsonb_build_object(
      'configuration_key', target_configuration_key,
      'version_number', target_version_number,
      'activated', target_activate,
      'schema_key', target_schema_key,
      'schema_version', target_schema_version
    ),
    null, null, null, null, configuration_record.id, target_version_id
  );

  configuration_id := configuration_record.id;
  configuration_version_id := target_version_id;
  version_number := target_version_number;
  was_replayed := false;
  return next;
end;
$$;

create function api.rollback_business_configuration(
  target_organization_id uuid,
  target_idempotency_key text,
  target_configuration_id uuid,
  target_source_version_id uuid,
  target_expected_current_version_id uuid,
  target_reason text,
  target_created_by_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  configuration_version_id uuid,
  version_number integer,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  configuration_record app_private.business_configurations%rowtype;
  source_record app_private.business_configuration_versions%rowtype;
  target_version_id uuid;
  target_version_number integer;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'configuration_id', target_configuration_id,
    'source_version_id', target_source_version_id,
    'expected_current_version_id', target_expected_current_version_id,
    'reason', target_reason
  );
  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id, target_idempotency_key,
    'business_configuration.rollback', request_payload,
    target_created_by_user_id, array['owner', 'admin']::text[], false
  );
  target_command_id := command_claim.claimed_command_id;
  if command_claim.was_replayed then
    select version_value.id, version_value.version_number
    into configuration_version_id, version_number
    from app_private.agent_commands as command_value
    join app_private.business_configuration_versions as version_value
      on version_value.organization_id = command_value.organization_id
     and version_value.id = command_value.result_id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    was_replayed := true;
    return next;
    return;
  end if;

  select configuration_value.* into configuration_record
  from app_private.business_configurations as configuration_value
  where configuration_value.organization_id = target_organization_id
    and configuration_value.id = target_configuration_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'business configuration not found';
  end if;
  if configuration_record.status = 'archived'
    or configuration_record.current_version_id is distinct from target_expected_current_version_id then
    raise exception using errcode = '40001', message = 'business configuration cannot roll back from stale state';
  end if;

  select version_value.* into source_record
  from app_private.business_configuration_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.configuration_id = target_configuration_id
    and version_value.id = target_source_version_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'rollback source version not found';
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_version_number
  from app_private.business_configuration_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.configuration_id = target_configuration_id;

  insert into app_private.business_configuration_versions (
    organization_id, configuration_id, version_number,
    schema_key, schema_version, document, document_hash,
    validation_contract, source_version_id, created_by_user_id
  ) values (
    target_organization_id, target_configuration_id, target_version_number,
    source_record.schema_key, source_record.schema_version, source_record.document,
    source_record.document_hash, source_record.validation_contract,
    source_record.id, target_created_by_user_id
  ) returning id into target_version_id;

  update app_private.business_configurations
  set current_version_id = target_version_id, status = 'active'
  where organization_id = target_organization_id and id = target_configuration_id;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id,
    'business_configuration_version', target_version_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'business_configuration.rolled_back',
    'member', target_created_by_user_id, target_correlation_id, target_trace_id,
    jsonb_build_object(
      'source_version_id', target_source_version_id,
      'new_version_number', target_version_number,
      'reason', target_reason
    ),
    null, null, null, null, target_configuration_id, target_version_id
  );
  configuration_version_id := target_version_id;
  version_number := target_version_number;
  was_replayed := false;
  return next;
end;
$$;

create function api.register_prompt_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_prompt_key text,
  target_template_format text,
  target_content_template text,
  target_created_by_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (prompt_version_id uuid, version_number integer, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_prompt_version_id uuid;
  target_version_number integer;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'prompt_key', target_prompt_key,
    'template_format', target_template_format,
    'content_template', target_content_template
  );
  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id, target_idempotency_key,
    'prompt.version.register', request_payload,
    target_created_by_user_id, array['owner', 'admin']::text[], false
  );
  target_command_id := command_claim.claimed_command_id;
  if command_claim.was_replayed then
    select prompt_value.id, prompt_value.version_number
    into prompt_version_id, version_number
    from app_private.agent_commands as command_value
    join app_private.prompt_versions as prompt_value
      on prompt_value.organization_id = command_value.organization_id
     and prompt_value.id = command_value.result_id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    was_replayed := true;
    return next;
    return;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':prompt:' || target_prompt_key, 0)
  );
  select coalesce(max(prompt_value.version_number), 0) + 1
  into target_version_number
  from app_private.prompt_versions as prompt_value
  where prompt_value.organization_id = target_organization_id
    and prompt_value.prompt_key = target_prompt_key;

  insert into app_private.prompt_versions (
    organization_id, prompt_key, version_number, template_format,
    content_template, content_hash, created_by_user_id
  ) values (
    target_organization_id, target_prompt_key, target_version_number,
    target_template_format, target_content_template,
    extensions.digest(convert_to(target_content_template, 'UTF8'), 'sha256'),
    target_created_by_user_id
  ) returning id into target_prompt_version_id;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id, 'prompt_version', target_prompt_version_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'prompt.version_registered',
    'member', target_created_by_user_id, target_correlation_id, target_trace_id,
    jsonb_build_object(
      'prompt_key', target_prompt_key,
      'version_number', target_version_number,
      'content_hash', encode(extensions.digest(convert_to(target_content_template, 'UTF8'), 'sha256'), 'hex')
    )
  );
  prompt_version_id := target_prompt_version_id;
  version_number := target_version_number;
  was_replayed := false;
  return next;
end;
$$;

create function api.register_tool_contract_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_tool_name text,
  target_display_name text,
  target_description text,
  target_input_schema jsonb,
  target_output_schema jsonb,
  target_effect_class text,
  target_handler_key text,
  target_expected_current_version_id uuid,
  target_status text,
  target_created_by_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  tool_contract_id uuid,
  tool_contract_version_id uuid,
  version_number integer,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  contract_record app_private.tool_contracts%rowtype;
  target_version_id uuid;
  target_version_number integer;
  target_contract_hash bytea;
  request_payload jsonb;
begin
  if target_status not in ('active', 'disabled') then
    raise exception using errcode = '22023', message = 'tool contract target status is invalid';
  end if;
  request_payload := jsonb_build_object(
    'tool_name', target_tool_name,
    'display_name', target_display_name,
    'description', target_description,
    'input_schema', target_input_schema,
    'output_schema', target_output_schema,
    'effect_class', target_effect_class,
    'handler_key', target_handler_key,
    'expected_current_version_id', target_expected_current_version_id,
    'status', target_status
  );
  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id, target_idempotency_key,
    'tool_contract.version.register', request_payload,
    target_created_by_user_id, array['owner', 'admin']::text[], false
  );
  target_command_id := command_claim.claimed_command_id;
  if command_claim.was_replayed then
    select version_value.tool_contract_id, version_value.id, version_value.version_number
    into tool_contract_id, tool_contract_version_id, version_number
    from app_private.agent_commands as command_value
    join app_private.tool_contract_versions as version_value
      on version_value.organization_id = command_value.organization_id
     and version_value.id = command_value.result_id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    was_replayed := true;
    return next;
    return;
  end if;

  select contract_value.* into contract_record
  from app_private.tool_contracts as contract_value
  where contract_value.organization_id = target_organization_id
    and contract_value.tool_name = target_tool_name
  for update;
  if not found then
    if target_expected_current_version_id is not null then
      raise exception using errcode = '40001', message = 'tool contract did not exist at expected version';
    end if;
    insert into app_private.tool_contracts (
      organization_id, tool_name, display_name, status, created_by_user_id
    ) values (
      target_organization_id, target_tool_name, target_display_name,
      'draft', target_created_by_user_id
    ) returning * into contract_record;
  elsif contract_record.current_version_id is distinct from target_expected_current_version_id then
    raise exception using errcode = '40001', message = 'tool contract current version changed';
  elsif contract_record.status = 'archived' then
    raise exception using errcode = '23514', message = 'archived tool contract cannot receive versions';
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_version_number
  from app_private.tool_contract_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.tool_contract_id = contract_record.id;
  target_contract_hash := extensions.digest(jsonb_build_object(
    'description', target_description,
    'input_schema', target_input_schema,
    'output_schema', target_output_schema,
    'effect_class', target_effect_class,
    'handler_key', target_handler_key
  )::text, 'sha256');

  insert into app_private.tool_contract_versions (
    organization_id, tool_contract_id, version_number, description,
    input_schema, output_schema, effect_class, handler_key,
    contract_hash, created_by_user_id
  ) values (
    target_organization_id, contract_record.id, target_version_number,
    target_description, target_input_schema, target_output_schema,
    target_effect_class, target_handler_key, target_contract_hash,
    target_created_by_user_id
  ) returning id into target_version_id;

  update app_private.tool_contracts
  set current_version_id = target_version_id,
      display_name = target_display_name,
      status = target_status
  where organization_id = target_organization_id and id = contract_record.id;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id, 'tool_contract_version', target_version_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'tool_contract.version_registered',
    'member', target_created_by_user_id, target_correlation_id, target_trace_id,
    jsonb_build_object(
      'tool_name', target_tool_name,
      'version_number', target_version_number,
      'effect_class', target_effect_class,
      'status', target_status,
      'contract_hash', encode(target_contract_hash, 'hex')
    )
  );
  tool_contract_id := contract_record.id;
  tool_contract_version_id := target_version_id;
  version_number := target_version_number;
  was_replayed := false;
  return next;
end;
$$;

create function api.create_agent_policy_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_policy_key text,
  target_display_name text,
  target_prompt_version_id uuid,
  target_max_tool_rounds integer,
  target_max_provider_attempts integer,
  target_max_parallel_tools integer,
  target_turn_timeout_ms integer,
  target_cache_mode text,
  target_max_cost_amount numeric,
  target_cost_currency text,
  target_unknown_cost_behavior text,
  target_fallback_models jsonb,
  target_tool_bindings jsonb,
  target_expected_current_version_id uuid,
  target_activate boolean,
  target_created_by_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  agent_policy_id uuid,
  agent_policy_version_id uuid,
  version_number integer,
  tools_bound integer,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  policy_record app_private.agent_policies%rowtype;
  target_version_id uuid;
  target_version_number integer;
  target_policy_hash bytea;
  target_tools_bound integer := 0;
  request_payload jsonb;
  binding_record record;
  contract_record record;
begin
  if target_tool_bindings is null or jsonb_typeof(target_tool_bindings) <> 'array'
    or jsonb_array_length(target_tool_bindings) > 128 then
    raise exception using errcode = '22023', message = 'agent policy tool bindings are invalid';
  end if;
  if not app_private.agent_model_route_is_valid(target_fallback_models) then
    raise exception using errcode = '22023', message = 'agent policy fallback route is invalid';
  end if;
  if not exists (
    select 1 from app_private.prompt_versions as prompt_value
    where prompt_value.organization_id = target_organization_id
      and prompt_value.id = target_prompt_version_id
  ) then
    raise exception using errcode = 'P0002', message = 'agent policy prompt version not found';
  end if;

  request_payload := jsonb_build_object(
    'policy_key', target_policy_key,
    'display_name', target_display_name,
    'prompt_version_id', target_prompt_version_id,
    'max_tool_rounds', target_max_tool_rounds,
    'max_provider_attempts', target_max_provider_attempts,
    'max_parallel_tools', target_max_parallel_tools,
    'turn_timeout_ms', target_turn_timeout_ms,
    'cache_mode', target_cache_mode,
    'max_cost_amount', target_max_cost_amount,
    'cost_currency', target_cost_currency,
    'unknown_cost_behavior', target_unknown_cost_behavior,
    'fallback_models', target_fallback_models,
    'tool_bindings', target_tool_bindings,
    'expected_current_version_id', target_expected_current_version_id,
    'activate', target_activate
  );
  select * into command_claim
  from app_private.claim_agent_command(
    target_organization_id, target_idempotency_key,
    'agent_policy.version.create', request_payload,
    target_created_by_user_id, array['owner', 'admin']::text[], false
  );
  target_command_id := command_claim.claimed_command_id;
  if command_claim.was_replayed then
    select version_value.policy_id, version_value.id, version_value.version_number,
           count(policy_tool.id)::integer
    into agent_policy_id, agent_policy_version_id, version_number, tools_bound
    from app_private.agent_commands as command_value
    join app_private.agent_policy_versions as version_value
      on version_value.organization_id = command_value.organization_id
     and version_value.id = command_value.result_id
    left join app_private.agent_policy_tools as policy_tool
      on policy_tool.organization_id = version_value.organization_id
     and policy_tool.policy_version_id = version_value.id
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id
    group by version_value.policy_id, version_value.id, version_value.version_number;
    was_replayed := true;
    return next;
    return;
  end if;

  select policy_value.* into policy_record
  from app_private.agent_policies as policy_value
  where policy_value.organization_id = target_organization_id
    and policy_value.policy_key = target_policy_key
  for update;
  if not found then
    if target_expected_current_version_id is not null then
      raise exception using errcode = '40001', message = 'agent policy did not exist at expected version';
    end if;
    insert into app_private.agent_policies (
      organization_id, policy_key, display_name, status, created_by_user_id
    ) values (
      target_organization_id, target_policy_key, target_display_name,
      'draft', target_created_by_user_id
    ) returning * into policy_record;
  elsif policy_record.current_version_id is distinct from target_expected_current_version_id then
    raise exception using errcode = '40001', message = 'agent policy current version changed';
  elsif policy_record.status = 'archived' then
    raise exception using errcode = '23514', message = 'archived agent policy cannot receive versions';
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_version_number
  from app_private.agent_policy_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.policy_id = policy_record.id;
  target_policy_hash := extensions.digest(jsonb_build_object(
    'prompt_version_id', target_prompt_version_id,
    'max_tool_rounds', target_max_tool_rounds,
    'max_provider_attempts', target_max_provider_attempts,
    'max_parallel_tools', target_max_parallel_tools,
    'turn_timeout_ms', target_turn_timeout_ms,
    'cache_mode', target_cache_mode,
    'max_cost_amount', target_max_cost_amount,
    'cost_currency', target_cost_currency,
    'unknown_cost_behavior', target_unknown_cost_behavior,
    'fallback_models', target_fallback_models,
    'tool_bindings', target_tool_bindings
  )::text, 'sha256');

  insert into app_private.agent_policy_versions (
    organization_id, policy_id, version_number, prompt_version_id,
    max_tool_rounds, max_provider_attempts, max_parallel_tools,
    turn_timeout_ms, cache_mode, max_cost_amount, cost_currency,
    unknown_cost_behavior, fallback_models, policy_hash, created_by_user_id
  ) values (
    target_organization_id, policy_record.id, target_version_number,
    target_prompt_version_id, target_max_tool_rounds, target_max_provider_attempts,
    target_max_parallel_tools, target_turn_timeout_ms, target_cache_mode,
    target_max_cost_amount, target_cost_currency, target_unknown_cost_behavior,
    target_fallback_models, target_policy_hash, target_created_by_user_id
  ) returning id into target_version_id;

  for binding_record in
    select value as binding_value from jsonb_array_elements(target_tool_bindings)
  loop
    if jsonb_typeof(binding_record.binding_value) <> 'object'
      or not (binding_record.binding_value ? 'tool_contract_version_id') then
      raise exception using errcode = '22023', message = 'agent policy tool binding shape is invalid';
    end if;
    if jsonb_typeof(coalesce(
      binding_record.binding_value -> 'allowed_actor_kinds', '[]'::jsonb
    )) <> 'array'
      or jsonb_typeof(coalesce(
        binding_record.binding_value -> 'required_membership_roles', '[]'::jsonb
      )) <> 'array'
      or jsonb_typeof(coalesce(
        binding_record.binding_value -> 'allowed_channels', '[]'::jsonb
      )) <> 'array'
      or jsonb_typeof(coalesce(
        binding_record.binding_value -> 'authorization_constraints', '{}'::jsonb
      )) <> 'object' then
      raise exception using errcode = '22023', message = 'agent policy tool authorization shape is invalid';
    end if;
    select contract_value.id as tool_contract_id,
           version_value.id as tool_contract_version_id
    into contract_record
    from app_private.tool_contract_versions as version_value
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = version_value.organization_id
     and contract_value.id = version_value.tool_contract_id
    where version_value.organization_id = target_organization_id
      and version_value.id = (binding_record.binding_value ->> 'tool_contract_version_id')::uuid
      and contract_value.status = 'active';
    if not found then
      raise exception using errcode = '23514', message = 'agent policy references an inactive or missing tool contract';
    end if;

    insert into app_private.agent_policy_tools (
      organization_id, policy_version_id, tool_contract_id, tool_contract_version_id,
      allowed_actor_kinds, required_membership_roles, allowed_channels,
      authorization_constraints
    ) values (
      target_organization_id, target_version_id,
      contract_record.tool_contract_id, contract_record.tool_contract_version_id,
      array(select jsonb_array_elements_text(
        coalesce(binding_record.binding_value -> 'allowed_actor_kinds', '[]'::jsonb)
      )),
      array(select jsonb_array_elements_text(
        coalesce(binding_record.binding_value -> 'required_membership_roles', '[]'::jsonb)
      )),
      array(select jsonb_array_elements_text(
        coalesce(binding_record.binding_value -> 'allowed_channels', '[]'::jsonb)
      )),
      coalesce(binding_record.binding_value -> 'authorization_constraints', '{}'::jsonb)
    );
    target_tools_bound := target_tools_bound + 1;
  end loop;

  if target_activate then
    update app_private.agent_policies
    set current_version_id = target_version_id,
        display_name = target_display_name,
        status = 'active'
    where organization_id = target_organization_id and id = policy_record.id;
  end if;

  perform app_private.complete_agent_command(
    target_organization_id, target_command_id, 'agent_policy_version', target_version_id
  );
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_policy.version_created',
    'member', target_created_by_user_id, target_correlation_id, target_trace_id,
    jsonb_build_object(
      'policy_key', target_policy_key,
      'version_number', target_version_number,
      'tools_bound', target_tools_bound,
      'activated', target_activate,
      'policy_hash', encode(target_policy_hash, 'hex')
    )
  );
  agent_policy_id := policy_record.id;
  agent_policy_version_id := target_version_id;
  version_number := target_version_number;
  tools_bound := target_tools_bound;
  was_replayed := false;
  return next;
exception
  when invalid_text_representation then
    raise exception using errcode = '22023', message = 'agent policy tool binding UUID is invalid';
end;
$$;

create function api.append_agent_message(
  target_organization_id uuid,
  target_run_id uuid,
  target_message_key text,
  target_message_role text,
  target_message_kind text,
  target_trust_level text,
  target_channel_connection_id uuid,
  target_conversation_id uuid,
  target_domain_message_id uuid,
  target_provider_item_id text,
  target_content jsonb
)
returns table (
  agent_message_id uuid,
  sequence_number integer,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  existing_record app_private.agent_messages%rowtype;
  target_message_id uuid;
  target_sequence_number integer;
  target_content_hash bytea;
begin
  if target_content is null or jsonb_typeof(target_content) not in ('object', 'array') then
    raise exception using errcode = '22023', message = 'agent message content must be an object or array';
  end if;
  target_content_hash := extensions.digest(target_content::text, 'sha256');
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent run not found';
  end if;

  select * into existing_record
  from app_private.agent_messages as message_value
  where message_value.organization_id = target_organization_id
    and message_value.run_id = target_run_id
    and message_value.message_key = target_message_key;
  if found then
    if row(
      existing_record.message_role, existing_record.message_kind, existing_record.trust_level,
      existing_record.channel_connection_id, existing_record.conversation_id,
      existing_record.domain_message_id, existing_record.provider_item_id,
      existing_record.content_hash
    ) is distinct from row(
      target_message_role, target_message_kind, target_trust_level,
      target_channel_connection_id, target_conversation_id,
      target_domain_message_id, target_provider_item_id, target_content_hash
    ) then
      raise exception using errcode = '23505', message = 'agent message key was reused with another message';
    end if;
    agent_message_id := existing_record.id;
    sequence_number := existing_record.sequence_number;
    was_replayed := true;
    return next;
    return;
  end if;
  if run_record.status in ('completed', 'failed', 'cancelled', 'uncertain') then
    raise exception using errcode = '23514', message = 'terminal agent run cannot receive messages';
  end if;
  if target_domain_message_id is not null and row(
    target_channel_connection_id, target_conversation_id
  ) is distinct from row(
    run_record.channel_connection_id, run_record.conversation_id
  ) then
    raise exception using errcode = '23514', message = 'domain message does not belong to the agent run conversation';
  end if;

  select coalesce(max(message_value.sequence_number), 0) + 1
  into target_sequence_number
  from app_private.agent_messages as message_value
  where message_value.organization_id = target_organization_id
    and message_value.run_id = target_run_id;
  insert into app_private.agent_messages (
    organization_id, run_id, message_key, sequence_number,
    message_role, message_kind, trust_level,
    channel_connection_id, conversation_id, domain_message_id,
    provider_item_id, content, content_hash
  ) values (
    target_organization_id, target_run_id, target_message_key, target_sequence_number,
    target_message_role, target_message_kind, target_trust_level,
    target_channel_connection_id, target_conversation_id, target_domain_message_id,
    target_provider_item_id, target_content, target_content_hash
  ) returning id into target_message_id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_message.appended', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'message_id', target_message_id,
      'sequence_number', target_sequence_number,
      'message_role', target_message_role,
      'message_kind', target_message_kind,
      'content_hash', encode(target_content_hash, 'hex')
    ), target_run_id
  );
  agent_message_id := target_message_id;
  sequence_number := target_sequence_number;
  was_replayed := false;
  return next;
end;
$$;

create function api.propose_tool_execution(
  target_organization_id uuid,
  target_run_id uuid,
  target_job_attempt_id uuid,
  target_tool_name text,
  target_provider_tool_call_id text,
  target_execution_key text,
  target_external_effect_key text,
  target_tool_round integer,
  target_arguments_safe jsonb
)
returns table (
  tool_execution_id uuid,
  effect_class text,
  authorization_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  policy_tool_record record;
  existing_record app_private.tool_executions%rowtype;
  target_tool_execution_id uuid;
  target_arguments_hash bytea;
  active_round_count integer;
begin
  if target_arguments_safe is null or jsonb_typeof(target_arguments_safe) <> 'object' then
    raise exception using errcode = '22023', message = 'tool arguments must be an object';
  end if;
  target_arguments_hash := extensions.digest(target_arguments_safe::text, 'sha256');
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent run not found';
  end if;
  if run_record.status <> 'running' then
    raise exception using errcode = '23514', message = 'agent run is not accepting tool proposals';
  end if;
  if target_tool_round not between 1 and run_record.max_tool_rounds
    or target_tool_round < run_record.tool_round_count then
    raise exception using errcode = '23514', message = 'tool round is outside the frozen policy';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id;
  if not found or attempt_record.run_id <> target_run_id or attempt_record.status <> 'running' then
    raise exception using errcode = '23514', message = 'tool proposal attempt is not active for this run';
  end if;

  select policy_tool.*, contract_value.tool_name,
         contract_version.effect_class
  into policy_tool_record
  from app_private.agent_policy_tools as policy_tool
  join app_private.tool_contracts as contract_value
    on contract_value.organization_id = policy_tool.organization_id
   and contract_value.id = policy_tool.tool_contract_id
  join app_private.tool_contract_versions as contract_version
    on contract_version.organization_id = policy_tool.organization_id
   and contract_version.tool_contract_id = policy_tool.tool_contract_id
   and contract_version.id = policy_tool.tool_contract_version_id
  where policy_tool.organization_id = target_organization_id
    and policy_tool.policy_version_id = run_record.policy_version_id
    and contract_value.tool_name = target_tool_name;
  if not found then
    raise exception using errcode = '42501', message = 'tool is not bound to the frozen agent policy';
  end if;

  select * into existing_record
  from app_private.tool_executions as execution_value
  where execution_value.organization_id = target_organization_id
    and (
      (execution_value.run_id = target_run_id
        and execution_value.provider_tool_call_id = target_provider_tool_call_id)
      or execution_value.execution_key = target_execution_key
    )
  order by execution_value.created_at
  limit 1;
  if found then
    if row(
      existing_record.run_id, existing_record.job_attempt_id, existing_record.policy_tool_id,
      existing_record.provider_tool_call_id, existing_record.execution_key,
      existing_record.external_effect_key, existing_record.tool_round,
      existing_record.arguments_hash
    ) is distinct from row(
      target_run_id, target_job_attempt_id, policy_tool_record.id,
      target_provider_tool_call_id, target_execution_key,
      target_external_effect_key, target_tool_round, target_arguments_hash
    ) then
      raise exception using errcode = '23505', message = 'tool execution identity was reused with another request';
    end if;
    tool_execution_id := existing_record.id;
    effect_class := existing_record.effect_class;
    authorization_status := existing_record.authorization_status;
    was_replayed := true;
    return next;
    return;
  end if;

  select count(*) into active_round_count
  from app_private.tool_executions as execution_value
  where execution_value.organization_id = target_organization_id
    and execution_value.run_id = target_run_id
    and execution_value.tool_round = target_tool_round;
  if active_round_count >= run_record.max_parallel_tools then
    raise exception using errcode = '23514', message = 'tool proposal exceeds frozen parallel-tool limit';
  end if;

  insert into app_private.tool_executions (
    organization_id, run_id, job_attempt_id, policy_tool_id,
    tool_contract_id, tool_contract_version_id,
    provider_tool_call_id, execution_key, external_effect_key,
    tool_round, effect_class, arguments_safe, arguments_hash
  ) values (
    target_organization_id, target_run_id, target_job_attempt_id, policy_tool_record.id,
    policy_tool_record.tool_contract_id, policy_tool_record.tool_contract_version_id,
    target_provider_tool_call_id, target_execution_key, target_external_effect_key,
    target_tool_round, policy_tool_record.effect_class,
    target_arguments_safe, target_arguments_hash
  ) returning id into target_tool_execution_id;

  update app_private.agent_runs
  set tool_round_count = greatest(tool_round_count, target_tool_round)
  where organization_id = target_organization_id and id = target_run_id;
  perform app_private.insert_agent_audit_event(
    target_organization_id, 'tool_execution.proposed', 'provider', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'tool_name', target_tool_name,
      'provider_tool_call_id', target_provider_tool_call_id,
      'tool_round', target_tool_round,
      'arguments_hash', encode(target_arguments_hash, 'hex')
    ), target_run_id, attempt_record.job_id, target_job_attempt_id,
    target_tool_execution_id
  );
  tool_execution_id := target_tool_execution_id;
  effect_class := policy_tool_record.effect_class;
  authorization_status := 'pending';
  was_replayed := false;
  return next;
end;
$$;

create function api.authorize_tool_execution(
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
  if contract_status <> 'active' then
    target_allowed := false;
    target_reason := 'tool_emergency_disabled';
  elsif not (run_record.actor_kind = any(policy_tool_record.allowed_actor_kinds)) then
    target_allowed := false;
    target_reason := 'actor_kind_not_allowed';
  end if;

  if target_allowed and run_record.actor_kind = 'member'
    and cardinality(policy_tool_record.required_membership_roles) > 0 then
    select membership.role into actor_role
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = run_record.actor_user_id
      and membership.status = 'active';
    if actor_role is null
      or not (actor_role = any(policy_tool_record.required_membership_roles)) then
      target_allowed := false;
      target_reason := 'member_role_not_allowed';
    end if;
  end if;

  if target_allowed and cardinality(policy_tool_record.allowed_channels) > 0 then
    select connection.channel into channel_name
    from app_private.channel_connections as connection
    where connection.organization_id = target_organization_id
      and connection.id = run_record.channel_connection_id
      and connection.status = 'active';
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

create function api.mark_tool_effect_started(
  target_organization_id uuid,
  target_tool_execution_id uuid,
  target_worker_id text
)
returns table (
  tool_execution_id uuid,
  status text,
  effect_certainty text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_record app_private.tool_executions%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  run_record app_private.agent_runs%rowtype;
begin
  if target_worker_id is null or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'tool worker id is invalid';
  end if;
  select * into execution_record
  from app_private.tool_executions as execution_value
  where execution_value.organization_id = target_organization_id
    and execution_value.id = target_tool_execution_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tool execution not found';
  end if;
  if execution_record.effect_class <> 'external_effect' then
    raise exception using errcode = '23514', message = 'only external effects require a durable start marker';
  end if;
  if execution_record.status = 'executing'
    or execution_record.status in ('succeeded', 'failed', 'uncertain') then
    tool_execution_id := execution_record.id;
    status := execution_record.status;
    effect_certainty := execution_record.effect_certainty;
    was_replayed := true;
    return next;
    return;
  end if;
  if execution_record.status <> 'authorized'
    or execution_record.authorization_status <> 'allowed' then
    raise exception using errcode = '42501', message = 'tool execution is not authorized';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = execution_record.job_attempt_id;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = execution_record.run_id;

  update app_private.tool_executions
  set status = 'executing',
      effect_certainty = 'started_unknown',
      effect_started_at = statement_timestamp()
  where organization_id = target_organization_id and id = execution_record.id;
  update app_private.agent_jobs
  set external_effect_state = 'started'
  where organization_id = target_organization_id and id = attempt_record.job_id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'tool_execution.effect_started', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'external_effect_key', execution_record.external_effect_key
    ), run_record.id, attempt_record.job_id, attempt_record.id,
    execution_record.id
  );
  tool_execution_id := execution_record.id;
  status := 'executing';
  effect_certainty := 'started_unknown';
  was_replayed := false;
  return next;
end;
$$;

create function api.record_tool_execution_result(
  target_organization_id uuid,
  target_tool_execution_id uuid,
  target_status text,
  target_effect_certainty text,
  target_result_safe jsonb,
  target_outbox_channel_connection_id uuid default null,
  target_outbox_event_id uuid default null
)
returns table (
  tool_execution_id uuid,
  status text,
  effect_certainty text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  execution_record app_private.tool_executions%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  run_record app_private.agent_runs%rowtype;
  target_result_hash bytea;
begin
  if target_result_safe is null or jsonb_typeof(target_result_safe) not in ('object', 'array') then
    raise exception using errcode = '22023', message = 'tool result must be an object or array';
  end if;
  if row(target_status, target_effect_certainty) not in (
    row('succeeded', 'confirmed_applied'),
    row('failed', 'confirmed_not_applied'),
    row('uncertain', 'uncertain')
  ) then
    raise exception using errcode = '22023', message = 'tool terminal status and certainty are inconsistent';
  end if;
  target_result_hash := extensions.digest(target_result_safe::text, 'sha256');
  select * into execution_record
  from app_private.tool_executions as execution_value
  where execution_value.organization_id = target_organization_id
    and execution_value.id = target_tool_execution_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'tool execution not found';
  end if;

  if execution_record.status in ('succeeded', 'failed', 'blocked', 'uncertain') then
    if execution_record.status is distinct from target_status
      or execution_record.effect_certainty is distinct from target_effect_certainty
      or execution_record.result_hash is distinct from target_result_hash
      or execution_record.outbox_channel_connection_id is distinct from target_outbox_channel_connection_id
      or execution_record.outbox_event_id is distinct from target_outbox_event_id then
      raise exception using errcode = '23505', message = 'terminal tool result was replayed with different evidence';
    end if;
    tool_execution_id := execution_record.id;
    status := execution_record.status;
    effect_certainty := execution_record.effect_certainty;
    was_replayed := true;
    return next;
    return;
  end if;
  if execution_record.authorization_status <> 'allowed'
    or (
      execution_record.effect_class = 'external_effect'
      and execution_record.status <> 'executing'
    )
    or (
      execution_record.effect_class <> 'external_effect'
      and execution_record.status <> 'authorized'
    ) then
    raise exception using errcode = '42501', message = 'tool result cannot be recorded from its current state';
  end if;
  if execution_record.effect_class <> 'external_effect'
    and target_status = 'uncertain' then
    raise exception using errcode = '23514', message = 'internal and read-only tools cannot finish with external uncertainty';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = execution_record.job_attempt_id;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = execution_record.run_id;

  update app_private.tool_executions
  set status = target_status,
      result_safe = target_result_safe,
      result_hash = target_result_hash,
      effect_certainty = target_effect_certainty,
      outbox_channel_connection_id = target_outbox_channel_connection_id,
      outbox_event_id = target_outbox_event_id,
      completed_at = statement_timestamp()
  where organization_id = target_organization_id and id = execution_record.id;

  if execution_record.effect_class = 'external_effect' then
    update app_private.agent_jobs
    set external_effect_state = case
      when target_status = 'uncertain' then 'uncertain'
      else 'confirmed'
    end
    where organization_id = target_organization_id and id = attempt_record.job_id;
  end if;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'tool_execution.completed', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'status', target_status,
      'effect_certainty', target_effect_certainty,
      'result_hash', encode(target_result_hash, 'hex')
    ), run_record.id, attempt_record.job_id, attempt_record.id,
    execution_record.id, null, null,
    target_outbox_channel_connection_id, target_outbox_event_id
  );
  tool_execution_id := execution_record.id;
  status := target_status;
  effect_certainty := target_effect_certainty;
  was_replayed := false;
  return next;
end;
$$;

create function api.resume_agent_run_after_tools(
  target_organization_id uuid,
  target_job_id uuid
)
returns table (
  agent_run_id uuid,
  agent_job_id uuid,
  run_status text,
  job_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  target_tool_count integer;
  target_uncertain_count integer;
begin
  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = target_job_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent job not found';
  end if;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = job_record.run_id
  for update;

  if job_record.status <> 'waiting_tools' or run_record.status <> 'waiting_tool' then
    raise exception using errcode = '23514', message = 'agent run is not waiting for tools';
  end if;
  select count(*), count(*) filter (where execution_value.status = 'uncertain')
  into target_tool_count, target_uncertain_count
  from app_private.tool_executions as execution_value
  join app_private.job_attempts as attempt_value
    on attempt_value.organization_id = execution_value.organization_id
   and attempt_value.id = execution_value.job_attempt_id
  where execution_value.organization_id = target_organization_id
    and execution_value.run_id = run_record.id
    and attempt_value.job_id = job_record.id
    and execution_value.tool_round = run_record.tool_round_count;
  if target_tool_count = 0 then
    raise exception using errcode = '23514', message = 'agent tool round has no executions';
  end if;
  if exists (
    select 1
    from app_private.tool_executions as execution_value
    join app_private.job_attempts as attempt_value
      on attempt_value.organization_id = execution_value.organization_id
     and attempt_value.id = execution_value.job_attempt_id
    where execution_value.organization_id = target_organization_id
      and execution_value.run_id = run_record.id
      and attempt_value.job_id = job_record.id
      and execution_value.tool_round = run_record.tool_round_count
      and execution_value.status in ('proposed', 'authorized', 'executing')
  ) then
    raise exception using errcode = '23514', message = 'agent tool round still has nonterminal executions';
  end if;

  if target_uncertain_count > 0 then
    update app_private.agent_jobs
    set status = 'uncertain', worker_id = null, lease_token = null,
        lease_expires_at = null, completed_at = statement_timestamp(),
        external_effect_state = 'uncertain', last_error_code = 'external_effect_uncertain'
    where organization_id = target_organization_id and id = job_record.id;
    update app_private.agent_runs
    set status = 'uncertain', completed_at = statement_timestamp(),
        last_termination_reason = 'provider_error'
    where organization_id = target_organization_id and id = run_record.id;
    run_status := 'uncertain';
    job_status := 'uncertain';
  else
    update app_private.agent_jobs
    set status = 'retryable', worker_id = null, lease_token = null,
        lease_expires_at = null, available_at = statement_timestamp(), completed_at = null
    where organization_id = target_organization_id and id = job_record.id;
    update app_private.agent_runs
    set status = 'waiting_provider', continuation_sequence = continuation_sequence + 1
    where organization_id = target_organization_id and id = run_record.id;
    run_status := 'waiting_provider';
    job_status := 'retryable';
  end if;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_run.tools_resolved', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'tool_count', target_tool_count,
      'uncertain_count', target_uncertain_count,
      'run_status', run_status,
      'job_status', job_status
    ), run_record.id, job_record.id
  );
  agent_run_id := run_record.id;
  agent_job_id := job_record.id;
  return next;
end;
$$;

create function api.record_usage_event(
  target_organization_id uuid,
  target_usage_key text,
  target_run_id uuid,
  target_job_attempt_id uuid,
  target_tool_execution_id uuid,
  target_provider text,
  target_model text,
  target_operation text,
  target_request_count integer,
  target_input_tokens bigint,
  target_output_tokens bigint,
  target_reasoning_tokens bigint,
  target_cached_input_tokens bigint,
  target_cache_write_input_tokens bigint,
  target_total_tokens bigint,
  target_cost_status text,
  target_cost_amount numeric,
  target_cost_currency text,
  target_latency_ms integer,
  target_provider_usage_safe jsonb default '{}'::jsonb
)
returns table (
  usage_event_id uuid,
  budget_status text,
  total_known_cost numeric,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  tool_record app_private.tool_executions%rowtype;
  existing_record app_private.usage_events%rowtype;
  target_event_id uuid;
  target_known_cost numeric(20,8);
  target_has_unknown boolean;
  target_known_currency_count integer;
  target_known_currency text;
  target_budget_status text;
begin
  if target_usage_key is null or target_usage_key <> btrim(target_usage_key)
    or char_length(target_usage_key) not between 1 and 180 then
    raise exception using errcode = '22023', message = 'usage key is invalid';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_organization_id::text || ':usage:' || target_usage_key, 0
  ));
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent run not found';
  end if;

  select * into existing_record
  from app_private.usage_events as usage_value
  where usage_value.organization_id = target_organization_id
    and usage_value.usage_key = target_usage_key;
  if found then
    if row(
      existing_record.run_id, existing_record.job_attempt_id,
      existing_record.tool_execution_id, existing_record.provider,
      existing_record.model, existing_record.operation, existing_record.request_count,
      existing_record.input_tokens, existing_record.output_tokens,
      existing_record.reasoning_tokens, existing_record.cached_input_tokens,
      existing_record.cache_write_input_tokens, existing_record.total_tokens,
      existing_record.cost_status, existing_record.cost_amount,
      existing_record.cost_currency, existing_record.latency_ms,
      existing_record.provider_usage_safe
    ) is distinct from row(
      target_run_id, target_job_attempt_id, target_tool_execution_id,
      target_provider, target_model, target_operation, target_request_count,
      target_input_tokens, target_output_tokens, target_reasoning_tokens,
      target_cached_input_tokens, target_cache_write_input_tokens,
      target_total_tokens, target_cost_status, target_cost_amount,
      target_cost_currency, target_latency_ms, target_provider_usage_safe
    ) then
      raise exception using errcode = '23505', message = 'usage key was reused with another event';
    end if;
    select coalesce(sum(usage_value.cost_amount), 0)
    into total_known_cost
    from app_private.usage_events as usage_value
    where usage_value.organization_id = target_organization_id
      and usage_value.run_id = target_run_id
      and usage_value.cost_status = 'known';
    usage_event_id := existing_record.id;
    budget_status := run_record.budget_status;
    was_replayed := true;
    return next;
    return;
  end if;

  if target_job_attempt_id is not null then
    select * into attempt_record
    from app_private.job_attempts as attempt_value
    where attempt_value.organization_id = target_organization_id
      and attempt_value.id = target_job_attempt_id;
    if not found or attempt_record.run_id <> target_run_id
      or attempt_record.provider <> target_provider
      or attempt_record.model <> target_model then
      raise exception using errcode = '23514', message = 'usage attempt provenance is invalid';
    end if;
  end if;
  if target_tool_execution_id is not null then
    select * into tool_record
    from app_private.tool_executions as execution_value
    where execution_value.organization_id = target_organization_id
      and execution_value.id = target_tool_execution_id;
    if not found or tool_record.run_id <> target_run_id
      or (target_job_attempt_id is not null and tool_record.job_attempt_id <> target_job_attempt_id) then
      raise exception using errcode = '23514', message = 'usage tool provenance is invalid';
    end if;
  end if;

  insert into app_private.usage_events (
    organization_id, usage_key, run_id, job_attempt_id, tool_execution_id,
    provider, model, operation, request_count,
    input_tokens, output_tokens, reasoning_tokens, cached_input_tokens,
    cache_write_input_tokens, total_tokens, cost_status, cost_amount,
    cost_currency, latency_ms, provider_usage_safe
  ) values (
    target_organization_id, target_usage_key, target_run_id,
    target_job_attempt_id, target_tool_execution_id,
    target_provider, target_model, target_operation, target_request_count,
    target_input_tokens, target_output_tokens, target_reasoning_tokens,
    target_cached_input_tokens, target_cache_write_input_tokens,
    target_total_tokens, target_cost_status, target_cost_amount,
    target_cost_currency, target_latency_ms, target_provider_usage_safe
  ) returning id into target_event_id;

  select coalesce(sum(usage_value.cost_amount), 0),
         coalesce(bool_or(usage_value.cost_status = 'unknown'), false),
         count(distinct usage_value.cost_currency) filter (where usage_value.cost_status = 'known'),
         min(usage_value.cost_currency) filter (where usage_value.cost_status = 'known')
  into target_known_cost, target_has_unknown,
       target_known_currency_count, target_known_currency
  from app_private.usage_events as usage_value
  where usage_value.organization_id = target_organization_id
    and usage_value.run_id = target_run_id;

  if target_has_unknown then
    target_budget_status := 'unknown';
  elsif run_record.max_cost_amount is not null and (
    target_known_currency_count > 1
    or (target_known_currency is not null and target_known_currency <> run_record.cost_currency)
  ) then
    target_budget_status := 'unknown';
  elsif run_record.max_cost_amount is not null
    and target_known_cost > run_record.max_cost_amount then
    target_budget_status := 'exceeded';
  else
    target_budget_status := 'within';
  end if;
  update app_private.agent_runs
  set budget_status = target_budget_status
  where organization_id = target_organization_id and id = target_run_id;

  usage_event_id := target_event_id;
  budget_status := target_budget_status;
  total_known_cost := target_known_cost;
  was_replayed := false;
  return next;
end;
$$;

create function api.record_error_event(
  target_organization_id uuid,
  target_error_key text,
  target_run_id uuid,
  target_job_id uuid,
  target_job_attempt_id uuid,
  target_tool_execution_id uuid,
  target_error_code text,
  target_error_category text,
  target_retryable boolean,
  target_severity text,
  target_provider text,
  target_provider_request_id text,
  target_summary_redacted text,
  target_detail_reference text,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  error_event_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_record app_private.error_events%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  tool_record app_private.tool_executions%rowtype;
  job_record app_private.agent_jobs%rowtype;
  target_resolved_run_id uuid := target_run_id;
  target_resolved_job_id uuid := target_job_id;
  target_resolved_attempt_id uuid := target_job_attempt_id;
  target_event_id uuid;
begin
  if target_error_key is null or target_error_key <> btrim(target_error_key)
    or char_length(target_error_key) not between 1 and 180 then
    raise exception using errcode = '22023', message = 'error key is invalid';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_organization_id::text || ':error:' || target_error_key, 0
  ));
  select * into existing_record
  from app_private.error_events as error_value
  where error_value.organization_id = target_organization_id
    and error_value.error_key = target_error_key;
  if found then
    if row(
      existing_record.run_id, existing_record.job_id, existing_record.job_attempt_id,
      existing_record.tool_execution_id, existing_record.error_code,
      existing_record.error_category, existing_record.retryable, existing_record.severity,
      existing_record.provider, existing_record.provider_request_id,
      existing_record.summary_redacted, existing_record.detail_reference
    ) is distinct from row(
      coalesce(target_run_id, existing_record.run_id),
      coalesce(target_job_id, existing_record.job_id),
      coalesce(target_job_attempt_id, existing_record.job_attempt_id),
      target_tool_execution_id, target_error_code, target_error_category,
      target_retryable, target_severity, target_provider,
      target_provider_request_id, target_summary_redacted, target_detail_reference
    ) then
      raise exception using errcode = '23505', message = 'error key was reused with another event';
    end if;
    error_event_id := existing_record.id;
    was_replayed := true;
    return next;
    return;
  end if;

  if target_tool_execution_id is not null then
    select * into tool_record
    from app_private.tool_executions as execution_value
    where execution_value.organization_id = target_organization_id
      and execution_value.id = target_tool_execution_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'error tool execution not found';
    end if;
    target_resolved_run_id := tool_record.run_id;
    target_resolved_attempt_id := tool_record.job_attempt_id;
  end if;
  if target_resolved_attempt_id is not null then
    select * into attempt_record
    from app_private.job_attempts as attempt_value
    where attempt_value.organization_id = target_organization_id
      and attempt_value.id = target_resolved_attempt_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'error job attempt not found';
    end if;
    if target_resolved_run_id is not null
      and target_resolved_run_id <> attempt_record.run_id then
      raise exception using errcode = '23514', message = 'error attempt run provenance is invalid';
    end if;
    target_resolved_run_id := attempt_record.run_id;
    target_resolved_job_id := attempt_record.job_id;
  end if;
  if target_resolved_job_id is not null then
    select * into job_record
    from app_private.agent_jobs as job_value
    where job_value.organization_id = target_organization_id
      and job_value.id = target_resolved_job_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'error agent job not found';
    end if;
    if target_resolved_run_id is not null
      and target_resolved_run_id <> job_record.run_id then
      raise exception using errcode = '23514', message = 'error job run provenance is invalid';
    end if;
    target_resolved_run_id := job_record.run_id;
  end if;
  if target_run_id is not null and target_resolved_run_id <> target_run_id then
    raise exception using errcode = '23514', message = 'error run provenance is invalid';
  end if;
  if target_job_id is not null and target_resolved_job_id <> target_job_id then
    raise exception using errcode = '23514', message = 'error job provenance is invalid';
  end if;
  if target_job_attempt_id is not null
    and target_resolved_attempt_id <> target_job_attempt_id then
    raise exception using errcode = '23514', message = 'error attempt provenance is invalid';
  end if;

  insert into app_private.error_events (
    organization_id, error_key, run_id, job_id, job_attempt_id,
    tool_execution_id, error_code, error_category, retryable, severity,
    provider, provider_request_id, summary_redacted, detail_reference
  ) values (
    target_organization_id, target_error_key, target_resolved_run_id,
    target_resolved_job_id, target_resolved_attempt_id,
    target_tool_execution_id, target_error_code, target_error_category,
    target_retryable, target_severity, target_provider,
    target_provider_request_id, target_summary_redacted, target_detail_reference
  ) returning id into target_event_id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_error.recorded', 'worker', null,
    target_correlation_id, target_trace_id,
    jsonb_build_object(
      'error_event_id', target_event_id,
      'error_code', target_error_code,
      'error_category', target_error_category,
      'retryable', target_retryable,
      'severity', target_severity
    ), target_resolved_run_id, target_resolved_job_id,
    target_resolved_attempt_id, target_tool_execution_id
  );
  error_event_id := target_event_id;
  was_replayed := false;
  return next;
end;
$$;

create function api.record_agent_attempt_result(
  target_organization_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_termination_reason text,
  target_disposition text,
  target_provider_request_id text,
  target_response_metadata_safe jsonb,
  target_checkpoint_reference text default null,
  target_checkpoint_hash bytea default null,
  target_last_error_code text default null
)
returns table (
  job_attempt_id uuid,
  attempt_status text,
  job_status text,
  run_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.job_attempts%rowtype;
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  target_attempt_status text;
  target_job_status text;
  target_run_status text;
  target_is_terminal boolean;
begin
  if not (
    (target_termination_reason = 'completed'
      and target_disposition in ('finish', 'await_handoff'))
    or (target_termination_reason = 'tool_calls'
      and target_disposition = 'execute_tools')
    or (target_termination_reason in ('output_limit', 'context_limit')
      and target_disposition = 'continue_from_checkpoint')
    or (target_termination_reason = 'provider_error'
      and target_disposition in ('retry_provider', 'fallback_provider', 'halt_safely'))
    or (target_termination_reason = 'content_filter'
      and target_disposition in ('halt_safely', 'await_handoff'))
    or (target_termination_reason = 'cancelled'
      and target_disposition = 'halt_safely')
  ) then
    raise exception using errcode = '22023', message = 'provider termination and disposition are inconsistent';
  end if;
  if target_disposition in ('execute_tools', 'continue_from_checkpoint') and (
    target_checkpoint_reference is null or target_checkpoint_hash is null
    or octet_length(target_checkpoint_hash) <> 32
  ) then
    raise exception using errcode = '22023', message = 'agent continuation requires a durable checkpoint';
  end if;
  if target_disposition not in ('execute_tools', 'continue_from_checkpoint') and (
    target_checkpoint_reference is not null or target_checkpoint_hash is not null
  ) then
    raise exception using errcode = '22023', message = 'checkpoint is only valid for a continuation disposition';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent job attempt not found';
  end if;
  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = attempt_record.job_id
  for update;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = attempt_record.run_id
  for update;

  if attempt_record.status <> 'running' then
    if attempt_record.termination_reason is distinct from target_termination_reason
      or attempt_record.disposition is distinct from target_disposition
      or attempt_record.provider_request_id is distinct from target_provider_request_id
      or attempt_record.response_metadata_safe is distinct from target_response_metadata_safe then
      raise exception using errcode = '23505', message = 'terminal agent attempt was replayed with different evidence';
    end if;
    job_attempt_id := attempt_record.id;
    attempt_status := attempt_record.status;
    job_status := job_record.status;
    run_status := run_record.status;
    was_replayed := true;
    return next;
    return;
  end if;
  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token then
    raise exception using errcode = '42501', message = 'agent attempt result lease is invalid';
  end if;
  if target_disposition = 'execute_tools' and not exists (
    select 1
    from app_private.tool_executions as execution_value
    where execution_value.organization_id = target_organization_id
      and execution_value.job_attempt_id = attempt_record.id
  ) then
    raise exception using errcode = '23514', message = 'tool disposition has no durable tool calls';
  end if;

  target_attempt_status := case
    when target_disposition in (
      'finish', 'execute_tools', 'continue_from_checkpoint', 'await_handoff'
    ) then 'succeeded'
    else 'failed'
  end;
  target_is_terminal := false;
  if target_disposition = 'finish' then
    target_job_status := 'succeeded';
    target_run_status := 'completed';
    target_is_terminal := true;
  elsif target_disposition = 'execute_tools' then
    target_job_status := 'waiting_tools';
    target_run_status := 'waiting_tool';
  elsif target_disposition = 'continue_from_checkpoint' then
    if job_record.attempt_count >= job_record.max_attempts then
      target_job_status := 'failed';
      target_run_status := 'failed';
      target_is_terminal := true;
    else
      target_job_status := 'retryable';
      target_run_status := 'waiting_provider';
    end if;
  elsif target_disposition in ('retry_provider', 'fallback_provider') then
    if job_record.attempt_count >= job_record.max_attempts then
      target_job_status := 'failed';
      target_run_status := 'failed';
      target_is_terminal := true;
    else
      target_job_status := 'retryable';
      target_run_status := 'waiting_provider';
    end if;
  elsif target_disposition = 'await_handoff' then
    target_job_status := 'blocked';
    target_run_status := 'waiting_handoff';
  else
    target_job_status := 'failed';
    target_run_status := 'failed';
    target_is_terminal := true;
  end if;

  update app_private.job_attempts
  set status = target_attempt_status,
      termination_reason = target_termination_reason,
      disposition = target_disposition,
      provider_request_id = target_provider_request_id,
      response_metadata_safe = target_response_metadata_safe,
      completed_at = statement_timestamp()
  where organization_id = target_organization_id and id = attempt_record.id;

  update app_private.agent_jobs
  set status = target_job_status,
      worker_id = null,
      lease_token = null,
      lease_expires_at = null,
      available_at = case
        when target_job_status = 'retryable' then statement_timestamp()
        else available_at
      end,
      checkpoint_reference = case
        when target_disposition in ('execute_tools', 'continue_from_checkpoint')
          then target_checkpoint_reference
        else checkpoint_reference
      end,
      checkpoint_hash = case
        when target_disposition in ('execute_tools', 'continue_from_checkpoint')
          then target_checkpoint_hash
        else checkpoint_hash
      end,
      checkpoint_sequence = case
        when target_disposition in ('execute_tools', 'continue_from_checkpoint')
          then checkpoint_sequence + 1
        else checkpoint_sequence
      end,
      last_error_code = target_last_error_code,
      completed_at = case
        when target_job_status in ('succeeded', 'blocked', 'failed')
          then statement_timestamp()
        else null
      end
  where organization_id = target_organization_id and id = job_record.id;

  update app_private.agent_runs
  set status = target_run_status,
      provider_state_reference = case
        when target_disposition in ('execute_tools', 'continue_from_checkpoint')
          then target_checkpoint_reference
        else provider_state_reference
      end,
      provider_state_hash = case
        when target_disposition in ('execute_tools', 'continue_from_checkpoint')
          then target_checkpoint_hash
        else provider_state_hash
      end,
      continuation_sequence = case
        when target_disposition = 'continue_from_checkpoint'
          and target_run_status = 'waiting_provider'
          then continuation_sequence + 1
        else continuation_sequence
      end,
      last_termination_reason = target_termination_reason,
      completed_at = case when target_is_terminal then statement_timestamp() else null end
  where organization_id = target_organization_id and id = run_record.id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_attempt.completed', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'termination_reason', target_termination_reason,
      'disposition', target_disposition,
      'attempt_status', target_attempt_status,
      'job_status', target_job_status,
      'run_status', target_run_status,
      'provider_request_id', target_provider_request_id
    ), run_record.id, job_record.id, attempt_record.id
  );
  job_attempt_id := attempt_record.id;
  attempt_status := target_attempt_status;
  job_status := target_job_status;
  run_status := target_run_status;
  was_replayed := false;
  return next;
end;
$$;

create function api.recover_expired_agent_job(
  target_organization_id uuid,
  target_job_id uuid,
  target_recovery_worker_id text,
  target_retry_delay_seconds integer default 5
)
returns table (
  agent_run_id uuid,
  agent_job_id uuid,
  run_status text,
  job_status text,
  recovery_disposition text,
  recovered boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  attempt_record app_private.job_attempts%rowtype;
  target_run_status text;
  target_job_status text;
  target_disposition text;
  target_attempt_status text;
begin
  if target_recovery_worker_id is null
    or target_recovery_worker_id <> btrim(target_recovery_worker_id)
    or char_length(target_recovery_worker_id) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'recovery worker id is invalid';
  end if;
  if target_retry_delay_seconds not between 0 and 3600 then
    raise exception using errcode = '22023', message = 'recovery retry delay is invalid';
  end if;
  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = target_job_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'agent job not found';
  end if;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = job_record.run_id
  for update;

  if job_record.status <> 'processing'
    or job_record.lease_expires_at > statement_timestamp() then
    agent_run_id := run_record.id;
    agent_job_id := job_record.id;
    run_status := run_record.status;
    job_status := job_record.status;
    recovery_disposition := 'not_expired';
    recovered := false;
    return next;
    return;
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.job_id = job_record.id
    and attempt_value.status = 'running'
  order by attempt_value.attempt_number desc
  limit 1
  for update;

  if job_record.external_effect_state in ('started', 'uncertain') then
    target_job_status := 'uncertain';
    target_run_status := 'uncertain';
    target_disposition := 'halt_uncertain_effect';
    target_attempt_status := 'uncertain';
  elsif job_record.attempt_count >= job_record.max_attempts then
    target_job_status := 'failed';
    target_run_status := 'failed';
    target_disposition := 'attempt_budget_exhausted';
    target_attempt_status := 'failed';
  else
    target_job_status := 'retryable';
    target_run_status := 'waiting_provider';
    target_disposition := case
      when job_record.external_effect_state = 'confirmed'
        then 'retry_after_confirmed_effect'
      else 'retry_before_effect'
    end;
    target_attempt_status := 'failed';
  end if;

  if attempt_record.id is not null then
    update app_private.job_attempts
    set status = target_attempt_status,
        termination_reason = 'provider_error',
        disposition = case
          when target_attempt_status = 'uncertain' then 'halt_safely'
          when target_job_status = 'retryable' then 'retry_provider'
          else 'halt_safely'
        end,
        response_metadata_safe = jsonb_build_object(
          'recovered_by', target_recovery_worker_id,
          'reason', 'lease_expired'
        ),
        completed_at = statement_timestamp()
    where organization_id = target_organization_id and id = attempt_record.id;
  end if;

  if target_job_status = 'uncertain' and attempt_record.id is not null then
    update app_private.tool_executions
    set status = 'uncertain',
        effect_certainty = 'uncertain',
        completed_at = statement_timestamp()
    where organization_id = target_organization_id
      and job_attempt_id = attempt_record.id
      and status = 'executing';
  end if;

  update app_private.agent_jobs
  set status = target_job_status,
      worker_id = null, lease_token = null, lease_expires_at = null,
      available_at = case
        when target_job_status = 'retryable' then statement_timestamp()
          + pg_catalog.make_interval(secs => target_retry_delay_seconds)
        else available_at
      end,
      last_error_code = case
        when target_job_status = 'uncertain' then 'external_effect_uncertain'
        else 'worker_lease_expired'
      end,
      external_effect_state = case
        when target_job_status = 'uncertain' then 'uncertain'
        else external_effect_state
      end,
      completed_at = case
        when target_job_status in ('failed', 'uncertain') then statement_timestamp()
        else null
      end
  where organization_id = target_organization_id and id = job_record.id;
  update app_private.agent_runs
  set status = target_run_status,
      last_termination_reason = 'provider_error',
      completed_at = case
        when target_run_status in ('failed', 'uncertain') then statement_timestamp()
        else null
      end
  where organization_id = target_organization_id and id = run_record.id;

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'agent_job.lease_recovered', 'worker', null,
    run_record.correlation_id, run_record.trace_id,
    jsonb_build_object(
      'recovery_worker_id', target_recovery_worker_id,
      'expired_worker_id', job_record.worker_id,
      'expired_lease_token', job_record.lease_token,
      'external_effect_state', job_record.external_effect_state,
      'recovery_disposition', target_disposition
    ), run_record.id, job_record.id,
    case when attempt_record.id is null then null else attempt_record.id end
  );
  agent_run_id := run_record.id;
  agent_job_id := job_record.id;
  run_status := target_run_status;
  job_status := target_job_status;
  recovery_disposition := target_disposition;
  recovered := true;
  return next;
end;
$$;

alter table app_private.agent_commands enable row level security;
alter table app_private.agent_commands force row level security;
alter table app_private.business_configurations enable row level security;
alter table app_private.business_configurations force row level security;
alter table app_private.business_configuration_versions enable row level security;
alter table app_private.business_configuration_versions force row level security;
alter table app_private.prompt_versions enable row level security;
alter table app_private.prompt_versions force row level security;
alter table app_private.tool_contracts enable row level security;
alter table app_private.tool_contracts force row level security;
alter table app_private.tool_contract_versions enable row level security;
alter table app_private.tool_contract_versions force row level security;
alter table app_private.agent_policies enable row level security;
alter table app_private.agent_policies force row level security;
alter table app_private.agent_policy_versions enable row level security;
alter table app_private.agent_policy_versions force row level security;
alter table app_private.agent_policy_tools enable row level security;
alter table app_private.agent_policy_tools force row level security;
alter table app_private.conversation_agent_snapshots enable row level security;
alter table app_private.conversation_agent_snapshots force row level security;
alter table app_private.agent_runs enable row level security;
alter table app_private.agent_runs force row level security;
alter table app_private.agent_run_configurations enable row level security;
alter table app_private.agent_run_configurations force row level security;
alter table app_private.agent_messages enable row level security;
alter table app_private.agent_messages force row level security;
alter table app_private.agent_jobs enable row level security;
alter table app_private.agent_jobs force row level security;
alter table app_private.job_attempts enable row level security;
alter table app_private.job_attempts force row level security;
alter table app_private.tool_executions enable row level security;
alter table app_private.tool_executions force row level security;
alter table app_private.usage_events enable row level security;
alter table app_private.usage_events force row level security;
alter table app_private.error_events enable row level security;
alter table app_private.error_events force row level security;
alter table app_private.memory_entries enable row level security;
alter table app_private.memory_entries force row level security;
alter table app_private.audit_events enable row level security;
alter table app_private.audit_events force row level security;

create policy agent_commands_operator_select
on app_private.agent_commands for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_commands.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy business_configurations_admin_select
on app_private.business_configurations for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = business_configurations.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy business_configuration_versions_admin_select
on app_private.business_configuration_versions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = business_configuration_versions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy prompt_versions_admin_select
on app_private.prompt_versions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = prompt_versions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy tool_contracts_admin_select
on app_private.tool_contracts for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = tool_contracts.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy tool_contract_versions_admin_select
on app_private.tool_contract_versions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = tool_contract_versions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy agent_policies_admin_select
on app_private.agent_policies for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_policies.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy agent_policy_versions_admin_select
on app_private.agent_policy_versions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_policy_versions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy agent_policy_tools_admin_select
on app_private.agent_policy_tools for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_policy_tools.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));
create policy conversation_agent_snapshots_operator_select
on app_private.conversation_agent_snapshots for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = conversation_agent_snapshots.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy agent_runs_operator_select
on app_private.agent_runs for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_runs.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy agent_run_configurations_operator_select
on app_private.agent_run_configurations for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_run_configurations.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy agent_messages_operator_select
on app_private.agent_messages for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_messages.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy agent_jobs_operator_select
on app_private.agent_jobs for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = agent_jobs.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy job_attempts_operator_select
on app_private.job_attempts for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = job_attempts.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy tool_executions_operator_select
on app_private.tool_executions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = tool_executions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy usage_events_operator_select
on app_private.usage_events for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = usage_events.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy error_events_operator_select
on app_private.error_events for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = error_events.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy memory_entries_operator_select
on app_private.memory_entries for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = memory_entries.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy audit_events_operator_select
on app_private.audit_events for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = audit_events.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create view api.agent_commands
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
from app_private.agent_commands;

create view api.business_configurations
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, configuration_key, display_name,
  current_version_id, status, created_by_user_id, created_at, updated_at
from app_private.business_configurations;

create view api.business_configuration_versions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, configuration_id, version_number,
  schema_key, schema_version, document_hash, validation_contract,
  source_version_id, created_by_user_id, created_at
from app_private.business_configuration_versions;

create view api.prompt_versions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, prompt_key, version_number,
  template_format, content_hash, created_by_user_id, created_at
from app_private.prompt_versions;

create view api.tool_contracts
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, tool_name, display_name, current_version_id,
  status, created_by_user_id, created_at, updated_at
from app_private.tool_contracts;

create view api.tool_contract_versions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, tool_contract_id, version_number, description,
  input_schema, output_schema, effect_class, contract_hash,
  created_by_user_id, created_at
from app_private.tool_contract_versions;

create view api.agent_policies
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, policy_key, display_name, current_version_id,
  status, created_by_user_id, created_at, updated_at
from app_private.agent_policies;

create view api.agent_policy_versions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, policy_id, version_number, prompt_version_id,
  max_tool_rounds, max_provider_attempts, max_parallel_tools,
  turn_timeout_ms, cache_mode, max_cost_amount, cost_currency,
  unknown_cost_behavior, fallback_models, policy_hash,
  created_by_user_id, created_at
from app_private.agent_policy_versions;

create view api.agent_policy_tools
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, policy_version_id, tool_contract_id,
  tool_contract_version_id, allowed_actor_kinds,
  required_membership_roles, allowed_channels,
  authorization_constraints, created_at
from app_private.agent_policy_tools;

create view api.conversation_agent_snapshots
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, channel_connection_id, conversation_id,
  policy_version_id, created_at
from app_private.conversation_agent_snapshots;

create view api.agent_runs
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_key, run_kind, status,
  channel_connection_id, conversation_id, trigger_message_id,
  source_inbound_event_id, conversation_snapshot_id,
  actor_kind, actor_user_id, actor_channel_identity_id,
  policy_version_id, provider, model, vision_provider, vision_model,
  reasoning_effort, cache_mode, fallback_models,
  max_tool_rounds, max_provider_attempts, max_parallel_tools,
  turn_timeout_ms, max_cost_amount, cost_currency,
  unknown_cost_behavior, budget_status, tool_round_count,
  provider_attempt_count, continuation_sequence,
  last_termination_reason, correlation_id, trace_id,
  started_at, completed_at, created_at, updated_at
from app_private.agent_runs;

create view api.agent_run_configurations
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, configuration_id,
  configuration_version_id, created_at
from app_private.agent_run_configurations;

create view api.agent_messages
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, message_key, sequence_number,
  message_role, message_kind, trust_level,
  channel_connection_id, conversation_id, domain_message_id,
  provider_item_id, content_hash, created_at
from app_private.agent_messages;

create view api.agent_jobs
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, job_kind, status, priority,
  available_at, attempt_count, max_attempts, lease_expires_at,
  checkpoint_sequence, external_effect_state, last_error_code,
  started_at, completed_at, created_at, updated_at
from app_private.agent_jobs;

create view api.job_attempts
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, job_id, run_id, attempt_number,
  worker_id, provider, model, fallback_ordinal, status,
  termination_reason, disposition, provider_request_id,
  started_at, completed_at
from app_private.job_attempts;

create view api.tool_executions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, job_attempt_id, policy_tool_id,
  tool_contract_id, tool_contract_version_id, provider_tool_call_id,
  tool_round, effect_class, status, authorization_status,
  authorization_reason, arguments_hash, result_hash, effect_certainty,
  outbox_channel_connection_id, outbox_event_id,
  authorized_at, effect_started_at, completed_at, created_at
from app_private.tool_executions;

create view api.usage_events
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, usage_key, run_id, job_attempt_id,
  tool_execution_id, provider, model, operation, request_count,
  input_tokens, output_tokens, reasoning_tokens, cached_input_tokens,
  cache_write_input_tokens, total_tokens, cost_status, cost_amount,
  cost_currency, latency_ms, occurred_at
from app_private.usage_events;

create view api.error_events
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, error_key, run_id, job_id, job_attempt_id,
  tool_execution_id, error_code, error_category, retryable, severity,
  provider, provider_request_id, summary_redacted, occurred_at
from app_private.error_events;

create view api.memory_entries
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, channel_connection_id, conversation_id,
  source_agent_message_id, source_tool_execution_id,
  scope_kind, scope_key, trust_level, content_hash,
  status, expires_at, revoked_at, created_at
from app_private.memory_entries;

create view api.audit_events
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, run_id, job_id, job_attempt_id,
  tool_execution_id, configuration_id, configuration_version_id,
  outbox_channel_connection_id, outbox_event_id,
  event_type, actor_kind, actor_user_id, correlation_id,
  trace_id, metadata_safe, occurred_at
from app_private.audit_events;

revoke all on
  app_private.agent_commands,
  app_private.business_configurations,
  app_private.business_configuration_versions,
  app_private.prompt_versions,
  app_private.tool_contracts,
  app_private.tool_contract_versions,
  app_private.agent_policies,
  app_private.agent_policy_versions,
  app_private.agent_policy_tools,
  app_private.conversation_agent_snapshots,
  app_private.agent_runs,
  app_private.agent_run_configurations,
  app_private.agent_messages,
  app_private.agent_jobs,
  app_private.job_attempts,
  app_private.tool_executions,
  app_private.usage_events,
  app_private.error_events,
  app_private.memory_entries,
  app_private.audit_events
from public, anon, authenticated, service_role;

revoke all on
  api.agent_commands,
  api.business_configurations,
  api.business_configuration_versions,
  api.prompt_versions,
  api.tool_contracts,
  api.tool_contract_versions,
  api.agent_policies,
  api.agent_policy_versions,
  api.agent_policy_tools,
  api.conversation_agent_snapshots,
  api.agent_runs,
  api.agent_run_configurations,
  api.agent_messages,
  api.agent_jobs,
  api.job_attempts,
  api.tool_executions,
  api.usage_events,
  api.error_events,
  api.memory_entries,
  api.audit_events
from public, anon, authenticated, service_role;

grant select (
  id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
) on app_private.agent_commands to authenticated;
grant select on app_private.business_configurations to authenticated;
grant select (
  id, organization_id, configuration_id, version_number,
  schema_key, schema_version, document_hash, validation_contract,
  source_version_id, created_by_user_id, created_at
) on app_private.business_configuration_versions to authenticated;
grant select (
  id, organization_id, prompt_key, version_number,
  template_format, content_hash, created_by_user_id, created_at
) on app_private.prompt_versions to authenticated;
grant select on app_private.tool_contracts to authenticated;
grant select (
  id, organization_id, tool_contract_id, version_number, description,
  input_schema, output_schema, effect_class, contract_hash,
  created_by_user_id, created_at
) on app_private.tool_contract_versions to authenticated;
grant select on app_private.agent_policies to authenticated;
grant select on app_private.agent_policy_versions to authenticated;
grant select on app_private.agent_policy_tools to authenticated;
grant select (
  id, organization_id, channel_connection_id, conversation_id,
  policy_version_id, created_at
) on app_private.conversation_agent_snapshots to authenticated;
grant select (
  id, organization_id, run_key, run_kind, status,
  channel_connection_id, conversation_id, trigger_message_id,
  source_inbound_event_id, conversation_snapshot_id,
  actor_kind, actor_user_id, actor_channel_identity_id,
  policy_version_id, provider, model, vision_provider, vision_model,
  reasoning_effort, cache_mode, fallback_models,
  max_tool_rounds, max_provider_attempts, max_parallel_tools,
  turn_timeout_ms, max_cost_amount, cost_currency,
  unknown_cost_behavior, budget_status, tool_round_count,
  provider_attempt_count, continuation_sequence, last_termination_reason,
  correlation_id, trace_id, started_at, completed_at, created_at, updated_at
) on app_private.agent_runs to authenticated;
grant select on app_private.agent_run_configurations to authenticated;
grant select (
  id, organization_id, run_id, message_key, sequence_number,
  message_role, message_kind, trust_level,
  channel_connection_id, conversation_id, domain_message_id,
  provider_item_id, content_hash, created_at
) on app_private.agent_messages to authenticated;
grant select (
  id, organization_id, run_id, job_kind, status, priority,
  available_at, attempt_count, max_attempts, lease_expires_at,
  checkpoint_sequence, external_effect_state, last_error_code,
  started_at, completed_at, created_at, updated_at
) on app_private.agent_jobs to authenticated;
grant select (
  id, organization_id, job_id, run_id, attempt_number,
  worker_id, provider, model, fallback_ordinal, status,
  termination_reason, disposition, provider_request_id,
  started_at, completed_at
) on app_private.job_attempts to authenticated;
grant select (
  id, organization_id, run_id, job_attempt_id, policy_tool_id,
  tool_contract_id, tool_contract_version_id, provider_tool_call_id,
  tool_round, effect_class, status, authorization_status,
  authorization_reason, arguments_hash, result_hash, effect_certainty,
  outbox_channel_connection_id, outbox_event_id,
  authorized_at, effect_started_at, completed_at, created_at
) on app_private.tool_executions to authenticated;
grant select (
  id, organization_id, usage_key, run_id, job_attempt_id,
  tool_execution_id, provider, model, operation, request_count,
  input_tokens, output_tokens, reasoning_tokens, cached_input_tokens,
  cache_write_input_tokens, total_tokens, cost_status, cost_amount,
  cost_currency, latency_ms, occurred_at
) on app_private.usage_events to authenticated;
grant select (
  id, organization_id, error_key, run_id, job_id, job_attempt_id,
  tool_execution_id, error_code, error_category, retryable, severity,
  provider, provider_request_id, summary_redacted, occurred_at
) on app_private.error_events to authenticated;
grant select (
  id, organization_id, run_id, channel_connection_id, conversation_id,
  source_agent_message_id, source_tool_execution_id,
  scope_kind, scope_key, trust_level, content_hash,
  status, expires_at, revoked_at, created_at
) on app_private.memory_entries to authenticated;
grant select on app_private.audit_events to authenticated;

grant select on
  app_private.agent_commands,
  app_private.business_configurations,
  app_private.business_configuration_versions,
  app_private.prompt_versions,
  app_private.tool_contracts,
  app_private.tool_contract_versions,
  app_private.agent_policies,
  app_private.agent_policy_versions,
  app_private.agent_policy_tools,
  app_private.conversation_agent_snapshots,
  app_private.agent_runs,
  app_private.agent_run_configurations,
  app_private.agent_messages,
  app_private.agent_jobs,
  app_private.job_attempts,
  app_private.tool_executions,
  app_private.usage_events,
  app_private.error_events,
  app_private.memory_entries,
  app_private.audit_events
to service_role;

grant select on
  api.agent_commands,
  api.business_configurations,
  api.business_configuration_versions,
  api.prompt_versions,
  api.tool_contracts,
  api.tool_contract_versions,
  api.agent_policies,
  api.agent_policy_versions,
  api.agent_policy_tools,
  api.conversation_agent_snapshots,
  api.agent_runs,
  api.agent_run_configurations,
  api.agent_messages,
  api.agent_jobs,
  api.job_attempts,
  api.tool_executions,
  api.usage_events,
  api.error_events,
  api.memory_entries,
  api.audit_events
to authenticated, service_role;

do $$
declare
  function_value record;
begin
  for function_value in
    select procedure_value.oid::regprocedure as signature,
           namespace_value.nspname as schema_name
    from pg_catalog.pg_proc as procedure_value
    join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = procedure_value.pronamespace
    where (
      namespace_value.nspname = 'app_private'
      and procedure_value.proname = any(array[
        'assert_agent_actor', 'claim_agent_command', 'complete_agent_command',
        'insert_agent_audit_event', 'agent_model_route_is_valid',
        'reject_agent_history_rewrite', 'prevent_agent_root_reassignment',
        'validate_business_configuration_version', 'validate_prompt_version',
        'validate_tool_contract_version', 'validate_agent_policy_version',
        'validate_agent_policy_tool', 'validate_conversation_agent_snapshot',
        'validate_agent_run', 'prevent_agent_run_core_rewrite',
        'prevent_agent_job_core_rewrite', 'prevent_job_attempt_core_rewrite',
        'validate_tool_execution', 'prevent_tool_execution_core_rewrite',
        'prevent_memory_core_rewrite'
      ]::text[])
    ) or (
      namespace_value.nspname = 'api'
      and procedure_value.proname = any(array[
        'create_business_configuration_version', 'rollback_business_configuration',
        'register_prompt_version', 'register_tool_contract_version',
        'create_agent_policy_version', 'enqueue_agent_run', 'claim_agent_job',
        'start_agent_job_attempt', 'append_agent_message',
        'propose_tool_execution', 'authorize_tool_execution',
        'mark_tool_effect_started', 'record_tool_execution_result',
        'resume_agent_run_after_tools', 'record_usage_event',
        'record_error_event', 'record_agent_attempt_result',
        'recover_expired_agent_job'
      ]::text[])
    )
  loop
    execute format(
      'revoke all on function %s from public, anon, authenticated, service_role',
      function_value.signature
    );
    if function_value.schema_name = 'api' then
      execute format(
        'grant execute on function %s to service_role',
        function_value.signature
      );
    end if;
  end loop;
end;
$$;

comment on table app_private.agent_commands is
  'Idempotency ledger for versioned agent administration and run creation';
comment on table app_private.business_configuration_versions is
  'Immutable validated business behavior snapshots; documents never appear in public API views';
comment on table app_private.prompt_versions is
  'Immutable prompt templates with hashes; prompt bodies are private runtime material';
comment on table app_private.tool_contract_versions is
  'Provider-neutral native tool schemas and deterministic effect classifications';
comment on table app_private.agent_policy_versions is
  'Immutable agent execution limits, explicit fallback route, cache and cost policy';
comment on table app_private.conversation_agent_snapshots is
  'Sticky policy and business configuration snapshot fixed on the first conversation run';
comment on table app_private.agent_runs is
  'Provider-neutral cognitive execution ledger with exact model identity and continuation state';
comment on table app_private.agent_messages is
  'Immutable ordered cognitive message ledger; content is excluded from authenticated API views';
comment on table app_private.agent_jobs is
  'Lease-based durable run work with checkpoint and external-effect uncertainty state';
comment on table app_private.job_attempts is
  'Immutable provider attempt identity and terminal disposition evidence';
comment on table app_private.tool_executions is
  'Native tool-call ledger separating proposal, authorization, effect start and certainty';
comment on table app_private.usage_events is
  'Idempotent token, cache, latency and non-fabricated cost observations';
comment on table app_private.error_events is
  'Idempotent normalized redacted failures linked to their exact runtime provenance';
comment on table app_private.memory_entries is
  'Provenance-bound agent memory; content remains private and is written only through tools';
comment on table app_private.audit_events is
  'Append-only actor and state-transition audit ledger for the complete agent runtime';
comment on function api.authorize_tool_execution(uuid, uuid) is
  'Applies deterministic actor, role, channel, emergency-disable and budget authorization after the LLM selects a native tool';
comment on function api.mark_tool_effect_started(uuid, uuid, text) is
  'Durably marks an external side effect before the provider call so crashes never cause blind replay';
comment on function api.recover_expired_agent_job(uuid, uuid, text, integer) is
  'Recovers expired leases only when durable effect evidence makes retry safe; uncertainty halts automatically';

commit;
