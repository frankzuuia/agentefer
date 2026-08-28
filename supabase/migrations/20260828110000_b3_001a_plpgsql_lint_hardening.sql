begin;

-- Semantic-preserving PL/pgSQL lint hardening. The public contracts,
-- authorization boundaries and durable side effects remain unchanged.
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
        'b3-001a:tool:' || definition_record.tool_name || ':' || encode(expected_contract_hash, 'hex'),
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
        'b3-001a:tool-bootstrap:' || target_organization_id::text,
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
      and policy_tool.allowed_actor_kinds @> array['contact']::text[]
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
      'allowed_actor_kinds', jsonb_build_array('contact'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'current_conversation')
    ),
    jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> 'catalog_search',
      'allowed_actor_kinds', jsonb_build_array('contact'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'active_catalog')
    ),
    jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> 'catalog_get_offer',
      'allowed_actor_kinds', jsonb_build_array('contact'),
      'required_membership_roles', '[]'::jsonb,
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object('scope', 'active_catalog')
    )
  );

  select * into created_policy
  from api.create_agent_policy_version(
    target_organization_id,
    'b3-001a:policy:' || encode(extensions.digest(
      convert_to(selected_policy_version.id::text || tool_versions::text, 'UTF8'), 'sha256'
    ), 'hex'),
    'customer_assistant',
    'Asistente comercial para clientes',
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
    'b3-001a:policy-bootstrap:' || target_organization_id::text,
    null
  );

  return created_policy.agent_policy_version_id;
end;
$$;

create or replace function api.execute_whatsapp_read_only_tool_call(
  target_organization_id uuid,
  target_run_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_provider text,
  target_provider_request_id text,
  target_provider_tool_call_id text,
  target_tool_name text,
  target_tool_round integer,
  target_arguments_safe jsonb,
  target_provider_state jsonb,
  target_response_metadata_safe jsonb
)
returns table (
  tool_execution_id uuid,
  tool_status text,
  tool_result jsonb,
  run_status text,
  job_status text,
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
  proposal_record record;
  authorization_record record;
  contract_record record;
  call_message_record record;
  resumed_record record;
  call_content jsonb;
  result_content jsonb;
  execution_key text;
  resolved_result jsonb;
  resolved_status text;
begin
  if target_provider_state is null
    or jsonb_typeof(target_provider_state) not in ('object', 'array')
    or octet_length(target_provider_state::text) > 900000
    or target_response_metadata_safe is null
    or jsonb_typeof(target_response_metadata_safe) <> 'object'
    or target_arguments_safe is null
    or jsonb_typeof(target_arguments_safe) <> 'object' then
    raise exception using errcode = '22023', message = 'tool continuation payload is invalid';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id
  for update;
  if not found or attempt_record.run_id <> target_run_id
    or attempt_record.status <> 'running'
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token
    or attempt_record.provider is distinct from target_provider then
    raise exception using errcode = '42501', message = 'tool execution attempt lease is invalid';
  end if;

  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = attempt_record.job_id
  for update;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
  for update;

  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or run_record.status <> 'running'
    or target_tool_round <> run_record.tool_round_count + 1 then
    raise exception using errcode = '42501', message = 'tool execution job lease or round is invalid';
  end if;

  execution_key := 'tool:' || encode(extensions.digest(
    convert_to(
      target_organization_id::text || ':' || target_run_id::text || ':' ||
      target_provider_tool_call_id,
      'UTF8'
    ),
    'sha256'
  ), 'hex');

  select * into proposal_record
  from api.propose_tool_execution(
    target_organization_id,
    target_run_id,
    target_job_attempt_id,
    target_tool_name,
    target_provider_tool_call_id,
    execution_key,
    null,
    target_tool_round,
    target_arguments_safe
  );

  select * into authorization_record
  from api.authorize_tool_execution(target_organization_id, proposal_record.tool_execution_id);

  call_content := jsonb_build_object(
    'provider', target_provider,
    'provider_request_id', target_provider_request_id,
    'provider_state', target_provider_state,
    'tool_call', jsonb_build_object(
      'id', target_provider_tool_call_id,
      'name', target_tool_name,
      'arguments', target_arguments_safe
    )
  );

  select * into call_message_record
  from api.append_agent_message(
    target_organization_id,
    target_run_id,
    'tool-call:' || target_provider_tool_call_id,
    'assistant',
    'tool_call',
    'provider',
    null, null, null,
    target_provider_tool_call_id,
    call_content
  );

  if authorization_record.authorization_status = 'allowed' then
    select version_value.handler_key
    into contract_record
    from app_private.tool_executions as execution_value
    join app_private.tool_contract_versions as version_value
      on version_value.organization_id = execution_value.organization_id
     and version_value.tool_contract_id = execution_value.tool_contract_id
     and version_value.id = execution_value.tool_contract_version_id
    where execution_value.organization_id = target_organization_id
      and execution_value.id = proposal_record.tool_execution_id;

    resolved_result := case contract_record.handler_key
      when 'conversation.context.read.v1' then app_private.conversation_context_for_agent(
        target_organization_id, target_run_id, target_arguments_safe
      )
      when 'catalog.search.read.v1' then app_private.catalog_search_for_agent(
        target_organization_id, target_arguments_safe
      )
      when 'catalog.offer.read.v1' then app_private.catalog_offer_for_agent(
        target_organization_id, target_arguments_safe
      )
      else jsonb_build_object(
        'ok', false,
        'error', jsonb_build_object('code', 'handler_not_available')
      )
    end;

    perform api.record_tool_execution_result(
      target_organization_id,
      proposal_record.tool_execution_id,
      'succeeded',
      'confirmed_applied',
      resolved_result,
      null,
      null
    );
    resolved_status := 'succeeded';
  else
    resolved_result := jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'tool_not_authorized',
        'reason', authorization_record.authorization_reason
      )
    );
    resolved_status := 'blocked';
  end if;

  result_content := jsonb_build_object(
    'provider_tool_call_id', target_provider_tool_call_id,
    'tool_name', target_tool_name,
    'status', resolved_status,
    'result', resolved_result
  );

  perform api.append_agent_message(
    target_organization_id,
    target_run_id,
    'tool-result:' || target_provider_tool_call_id,
    'tool',
    'tool_result',
    'trusted_tool',
    null, null, null,
    'result:' || target_provider_tool_call_id,
    result_content
  );

  perform api.record_agent_attempt_result(
    target_organization_id,
    target_job_attempt_id,
    target_worker_id,
    target_lease_token,
    'tool_calls',
    'execute_tools',
    target_provider_request_id,
    target_response_metadata_safe,
    'agent-message://' || call_message_record.agent_message_id::text,
    extensions.digest(call_content::text, 'sha256'),
    null
  );

  select * into resumed_record
  from api.resume_agent_run_after_tools(target_organization_id, job_record.id);

  tool_execution_id := proposal_record.tool_execution_id;
  tool_status := resolved_status;
  tool_result := resolved_result;
  run_status := resumed_record.run_status;
  job_status := resumed_record.job_status;
  was_replayed := proposal_record.was_replayed;
  return next;
end;
$$;

create or replace function api.complete_whatsapp_agent_turn(
  target_organization_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_visible_text text,
  target_provider_request_id text,
  target_response_metadata_safe jsonb default '{}'::jsonb
)
returns table (
  agent_run_id uuid,
  outbound_message_count integer,
  outbox_event_ids uuid[],
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
  conversation_record app_private.conversations%rowtype;
  agent_participant_id uuid;
  first_message_id uuid;
  outbound_message_id uuid;
  outbox_event_id uuid;
  chunk_text text;
  chunk_count integer;
  delivery_allowed boolean;
begin
  if target_visible_text is null
    or target_visible_text <> btrim(target_visible_text)
    or char_length(target_visible_text) < 1
    or octet_length(target_visible_text) > 262000
    or target_response_metadata_safe is null
    or jsonb_typeof(target_response_metadata_safe) <> 'object'
    or octet_length(target_response_metadata_safe::text) > 65536 then
    raise exception using errcode = '22023', message = 'assistant result is invalid';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'agent attempt not found';
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
    select
      count(*)::integer,
      array_agg(outbox_value.id order by outbox_value.created_at, outbox_value.id)
    into outbound_message_count, outbox_event_ids
    from app_private.outbox_events as outbox_value
    where outbox_value.organization_id = target_organization_id
      and outbox_value.channel_connection_id = run_record.channel_connection_id
      and outbox_value.payload ->> 'agent_run_id' = run_record.id::text;

    if run_record.status = 'completed' and outbound_message_count > 0 then
      agent_run_id := run_record.id;
      was_replayed := true;
      return next;
      return;
    end if;
    raise exception using errcode = '23514', message = 'agent attempt is already terminal';
  end if;

  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or job_record.lease_expires_at <= statement_timestamp()
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token then
    raise exception using errcode = '42501', message = 'agent completion lease is invalid or expired';
  end if;

  select * into conversation_record
  from app_private.conversations as conversation_value
  where conversation_value.organization_id = target_organization_id
    and conversation_value.channel_connection_id = run_record.channel_connection_id
    and conversation_value.id = run_record.conversation_id
  for update;

  if not found or conversation_record.status <> 'open' then
    raise exception using errcode = '55000', message = 'conversation is not open';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':' || run_record.conversation_id::text || ':agent-participant',
      0
    )
  );

  select participant_value.id
  into agent_participant_id
  from app_private.conversation_participants as participant_value
  where participant_value.organization_id = target_organization_id
    and participant_value.channel_connection_id = run_record.channel_connection_id
    and participant_value.conversation_id = run_record.conversation_id
    and participant_value.participant_kind = 'agent'
    and participant_value.agent_key = 'customer_assistant'
    and participant_value.left_at is null;

  if agent_participant_id is null then
    insert into app_private.conversation_participants (
      organization_id,
      channel_connection_id,
      conversation_id,
      participant_kind,
      participant_role,
      agent_key
    ) values (
      target_organization_id,
      run_record.channel_connection_id,
      run_record.conversation_id,
      'agent',
      'agent',
      'customer_assistant'
    )
    returning id into agent_participant_id;
  end if;

  chunk_count := pg_catalog.ceil(char_length(target_visible_text)::numeric / 4000)::integer;
  delivery_allowed := conversation_record.service_window_expires_at > statement_timestamp();
  outbox_event_ids := '{}'::uuid[];

  for chunk_ordinal in 1..chunk_count loop
    chunk_text := pg_catalog.substr(
      target_visible_text,
      ((chunk_ordinal - 1) * 4000) + 1,
      4000
    );

    insert into app_private.messages (
      organization_id,
      channel_connection_id,
      conversation_id,
      sender_participant_id,
      reply_to_message_id,
      direction,
      content_kind,
      provider_message_type,
      deduplication_key,
      content,
      provider_context,
      status
    ) values (
      target_organization_id,
      run_record.channel_connection_id,
      run_record.conversation_id,
      agent_participant_id,
      run_record.trigger_message_id,
      'outbound',
      'text',
      'text',
      extensions.digest(
        convert_to('agent-reply:' || run_record.id::text || ':' || chunk_ordinal::text, 'UTF8'),
        'sha256'
      ),
      jsonb_build_object('text', jsonb_build_object('body', chunk_text)),
      jsonb_build_object(
        'agent_run_id', run_record.id,
        'chunk_ordinal', chunk_ordinal,
        'chunk_count', chunk_count
      ),
      case when delivery_allowed then 'queued' else 'blocked' end
    )
    returning id into outbound_message_id;

    first_message_id := coalesce(first_message_id, outbound_message_id);

    insert into app_private.outbox_events (
      organization_id,
      channel_connection_id,
      conversation_id,
      message_id,
      destination_identity_id,
      operation,
      idempotency_key,
      payload,
      policy_status,
      policy_basis,
      policy_evaluated_at,
      status,
      completed_at
    ) values (
      target_organization_id,
      run_record.channel_connection_id,
      run_record.conversation_id,
      outbound_message_id,
      conversation_record.primary_channel_identity_id,
      'message.send',
      extensions.digest(
        convert_to('whatsapp-send:' || outbound_message_id::text, 'UTF8'),
        'sha256'
      ),
      jsonb_build_object(
        'agent_run_id', run_record.id,
        'type', 'text',
        'text', jsonb_build_object('body', chunk_text),
        'chunk_ordinal', chunk_ordinal,
        'chunk_count', chunk_count
      ),
      case when delivery_allowed then 'allowed' else 'blocked' end,
      case when delivery_allowed then 'customer_service_window' else 'service_window_expired' end,
      statement_timestamp(),
      case when delivery_allowed then 'pending' else 'blocked' end,
      case when delivery_allowed then null else statement_timestamp() end
    )
    returning id into outbox_event_id;

    outbox_event_ids := array_append(outbox_event_ids, outbox_event_id);
  end loop;

  perform api.append_agent_message(
    target_organization_id,
    run_record.id,
    'assistant:' || run_record.id::text,
    'assistant',
    'output',
    'provider',
    run_record.channel_connection_id,
    run_record.conversation_id,
    first_message_id,
    target_provider_request_id,
    jsonb_build_object('text', target_visible_text)
  );

  perform api.record_agent_attempt_result(
    target_organization_id,
    target_job_attempt_id,
    target_worker_id,
    target_lease_token,
    'completed',
    'finish',
    target_provider_request_id,
    target_response_metadata_safe,
    null,
    null,
    null
  );

  update app_private.messages
  set status = 'processed',
      processed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where organization_id = target_organization_id
    and channel_connection_id = run_record.channel_connection_id
    and id = run_record.trigger_message_id
    and direction = 'inbound'
    and status = 'received';

  agent_run_id := run_record.id;
  outbound_message_count := chunk_count;
  was_replayed := false;
  return next;
end;
$$;

create or replace function api.checkpoint_whatsapp_agent_turn(
  target_organization_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_partial_text text,
  target_provider_request_id text,
  target_response_metadata_safe jsonb default '{}'::jsonb
)
returns table (
  agent_run_id uuid,
  checkpoint_reference text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.job_attempts%rowtype;
  run_record app_private.agent_runs%rowtype;
  checkpoint_message record;
  checkpoint_hash bytea;
  checkpoint_value text;
begin
  if target_partial_text is null
    or octet_length(target_partial_text) > 262000
    or target_response_metadata_safe is null
    or jsonb_typeof(target_response_metadata_safe) <> 'object' then
    raise exception using errcode = '22023', message = 'agent checkpoint is invalid';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'agent attempt not found';
  end if;

  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = attempt_record.run_id;

  select * into checkpoint_message
  from api.append_agent_message(
    target_organization_id,
    run_record.id,
    'checkpoint:' || target_job_attempt_id::text,
    'assistant',
    'checkpoint',
    'provider',
    null,
    null,
    null,
    target_provider_request_id,
    jsonb_build_object('text', target_partial_text)
  );

  checkpoint_value := 'agent-message://' || checkpoint_message.agent_message_id::text;
  checkpoint_hash := extensions.digest(
    convert_to(jsonb_build_object('text', target_partial_text)::text, 'UTF8'),
    'sha256'
  );

  perform api.record_agent_attempt_result(
    target_organization_id,
    target_job_attempt_id,
    target_worker_id,
    target_lease_token,
    'output_limit',
    'continue_from_checkpoint',
    target_provider_request_id,
    target_response_metadata_safe,
    checkpoint_value,
    checkpoint_hash,
    null
  );

  agent_run_id := run_record.id;
  checkpoint_reference := checkpoint_value;
  was_replayed := checkpoint_message.was_replayed;
  return next;
end;
$$;

notify pgrst, 'reload schema';

commit;
