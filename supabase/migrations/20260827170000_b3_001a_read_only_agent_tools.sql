begin;

create function app_private.catalog_search_for_agent(
  target_organization_id uuid,
  target_arguments jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_query text;
  target_limit integer;
  search_query tsquery;
  matches jsonb;
begin
  if target_arguments is null or jsonb_typeof(target_arguments) <> 'object' then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  target_query := btrim(coalesce(target_arguments ->> 'query', ''));
  begin
    target_limit := coalesce((target_arguments ->> 'limit')::integer, 5);
  exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_limit'));
  end;

  if char_length(target_query) not between 1 and 500 or target_limit not between 1 and 20 then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  search_query := websearch_to_tsquery('simple', target_query);

  with candidates as (
    select
      product_value.id as product_id,
      product_value.name as product_name,
      product_value.description as product_description,
      variant_value.id as variant_id,
      variant_value.name as variant_name,
      variant_value.description as variant_description,
      sku_value.sku,
      category_value.id as category_id,
      category_value.code as category_code,
      category_value.name as category_name,
      to_tsvector(
        'simple',
        concat_ws(
          ' ', product_value.name, product_value.description,
          variant_value.name, variant_value.description, sku_value.sku,
          coalesce((
            select string_agg(
              concat_ws(
                ' ', definition_value.name, attribute_value.value_text,
                attribute_value.value_integer::text, attribute_value.value_decimal::text,
                option_value.label, unit_value.name_singular, unit_value.symbol
              ),
              ' '
            )
            from app_private.variant_attribute_values as attribute_value
            join app_private.catalog_attribute_definitions as definition_value
              on definition_value.organization_id = attribute_value.organization_id
             and definition_value.id = attribute_value.attribute_definition_id
            left join app_private.catalog_attribute_options as option_value
              on option_value.organization_id = attribute_value.organization_id
             and option_value.id = attribute_value.option_id
            left join app_private.catalog_units as unit_value
              on unit_value.organization_id = attribute_value.organization_id
             and unit_value.id = attribute_value.unit_id
            where attribute_value.organization_id = target_organization_id
              and attribute_value.variant_id = variant_value.id
              and attribute_value.certainty = 'confirmed'
              and definition_value.status = 'active'
              and definition_value.is_searchable
          ), '')
        )
      ) as search_document
    from app_private.products as product_value
    join app_private.product_variants as variant_value
      on variant_value.organization_id = product_value.organization_id
     and variant_value.product_id = product_value.id
    join app_private.catalog_categories as category_value
      on category_value.organization_id = product_value.organization_id
     and category_value.id = product_value.category_id
    left join app_private.variant_skus as sku_value
      on sku_value.organization_id = variant_value.organization_id
     and sku_value.variant_id = variant_value.id
     and sku_value.status = 'current'
    where product_value.organization_id = target_organization_id
      and product_value.status = 'active'
      and variant_value.status = 'active'
      and category_value.status = 'active'
  ), ranked as (
    select candidate_value.*,
      case when lower(coalesce(candidate_value.sku, '')) = lower(target_query) then 1 else 0 end
        as exact_sku,
      ts_rank_cd(candidate_value.search_document, search_query) as relevance
    from candidates as candidate_value
    where candidate_value.search_document @@ search_query
       or lower(coalesce(candidate_value.sku, '')) = lower(target_query)
    order by exact_sku desc, relevance desc, candidate_value.product_name, candidate_value.variant_name
    limit target_limit
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', ranked_value.product_id,
        'product_name', ranked_value.product_name,
        'product_description', ranked_value.product_description,
        'variant_id', ranked_value.variant_id,
        'variant_name', ranked_value.variant_name,
        'variant_description', ranked_value.variant_description,
        'sku', ranked_value.sku,
        'category', jsonb_build_object(
          'id', ranked_value.category_id,
          'code', ranked_value.category_code,
          'name', ranked_value.category_name
        ),
        'attributes', coalesce((
          select jsonb_agg(
            jsonb_strip_nulls(jsonb_build_object(
              'code', definition_value.code,
              'name', definition_value.name,
              'value_type', definition_value.value_type,
              'value_text', attribute_value.value_text,
              'value_integer', attribute_value.value_integer,
              'value_decimal', attribute_value.value_decimal,
              'value_boolean', attribute_value.value_boolean,
              'value_date', attribute_value.value_date,
              'value_timestamp', attribute_value.value_timestamp,
              'option', option_value.label,
              'unit_id', unit_value.id,
              'unit', unit_value.name_singular,
              'symbol', unit_value.symbol
            )) order by definition_value.sort_order, definition_value.code, attribute_value.ordinal
          )
          from app_private.variant_attribute_values as attribute_value
          join app_private.catalog_attribute_definitions as definition_value
            on definition_value.organization_id = attribute_value.organization_id
           and definition_value.id = attribute_value.attribute_definition_id
          left join app_private.catalog_attribute_options as option_value
            on option_value.organization_id = attribute_value.organization_id
           and option_value.id = attribute_value.option_id
          left join app_private.catalog_units as unit_value
            on unit_value.organization_id = attribute_value.organization_id
           and unit_value.id = attribute_value.unit_id
          where attribute_value.organization_id = target_organization_id
            and attribute_value.variant_id = ranked_value.variant_id
            and attribute_value.certainty = 'confirmed'
            and definition_value.status = 'active'
            and definition_value.is_public
        ), '[]'::jsonb),
        'availability', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'unit_id', unit_value.id,
              'unit', unit_value.name_plural,
              'symbol', unit_value.symbol,
              'available_quantity', availability_value.available_quantity,
              'updated_at', availability_value.balance_updated_at
            ) order by unit_value.code
          )
          from api.inventory_availability as availability_value
          join app_private.catalog_units as unit_value
            on unit_value.organization_id = availability_value.organization_id
           and unit_value.id = availability_value.inventory_unit_id
          where availability_value.organization_id = target_organization_id
            and availability_value.variant_id = ranked_value.variant_id
            and unit_value.status = 'active'
        ), '[]'::jsonb)
      ) order by ranked_value.exact_sku desc, ranked_value.relevance desc,
        ranked_value.product_name, ranked_value.variant_name
    ),
    '[]'::jsonb
  ) into matches
  from ranked as ranked_value;

  return jsonb_build_object('ok', true, 'query', target_query, 'matches', matches);
end;
$$;

create function app_private.catalog_offer_for_agent(
  target_organization_id uuid,
  target_arguments jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_variant_id uuid;
  target_unit_id uuid;
  target_quantity numeric;
  variant_record record;
  price_book_record record;
  quote_record record;
  availability_value numeric;
  availability_tracked boolean := false;
  availability_updated_at timestamptz;
begin
  if target_arguments is null or jsonb_typeof(target_arguments) <> 'object' then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  begin
    target_variant_id := (target_arguments ->> 'variant_id')::uuid;
    target_unit_id := (target_arguments ->> 'unit_id')::uuid;
    target_quantity := (target_arguments ->> 'quantity')::numeric;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end;

  if target_quantity is null or target_quantity <= 0 or target_quantity > 1000000000000
    or scale(target_quantity) > 9 then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_quantity'));
  end if;

  select
    variant_value.id as variant_id,
    variant_value.name as variant_name,
    product_value.id as product_id,
    product_value.name as product_name,
    sku_value.sku,
    unit_value.code as unit_code,
    unit_value.name_singular as unit_name,
    unit_value.symbol as unit_symbol,
    unit_value.decimal_scale
  into variant_record
  from app_private.product_variants as variant_value
  join app_private.products as product_value
    on product_value.organization_id = variant_value.organization_id
   and product_value.id = variant_value.product_id
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = variant_value.organization_id
   and unit_value.id = target_unit_id
  left join app_private.variant_skus as sku_value
    on sku_value.organization_id = variant_value.organization_id
   and sku_value.variant_id = variant_value.id
   and sku_value.status = 'current'
  where variant_value.organization_id = target_organization_id
    and variant_value.id = target_variant_id
    and variant_value.status = 'active'
    and product_value.status = 'active'
    and unit_value.status = 'active';

  if not found or trunc(target_quantity, variant_record.decimal_scale) <> target_quantity then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'offer_not_found'));
  end if;

  select
    null::uuid as price_tier_id,
    null::text as pricing_status,
    null::text as currency_code,
    null::text as calculation_method,
    null::numeric as price_amount,
    null::numeric as total_amount,
    null::timestamptz as valid_from,
    null::timestamptz as valid_until
  into quote_record;

  select book_value.id, book_value.currency_code
  into price_book_record
  from app_private.price_books as book_value
  where book_value.organization_id = target_organization_id
    and book_value.status = 'active'
    and book_value.is_default
  order by book_value.created_at, book_value.id
  limit 1;

  if found then
    select * into quote_record
    from api.resolve_price_quote(
      price_book_record.id,
      target_variant_id,
      target_unit_id,
      target_quantity,
      statement_timestamp()
    );
  end if;

  select composition_value.available_sale_quantity
  into availability_value
  from api.inventory_composition_availability as composition_value
  where composition_value.organization_id = target_organization_id
    and composition_value.offered_variant_id = target_variant_id
    and composition_value.sale_unit_id = target_unit_id
  order by composition_value.composition_id
  limit 1;
  if found then
    availability_tracked := true;
  else
    select sum(item_value.available_quantity), max(item_value.balance_updated_at)
    into availability_value, availability_updated_at
    from api.inventory_availability as item_value
    where item_value.organization_id = target_organization_id
      and item_value.variant_id = target_variant_id
      and item_value.inventory_unit_id = target_unit_id;
    availability_tracked := availability_value is not null;
  end if;

  return jsonb_build_object(
    'ok', true,
    'product', jsonb_build_object(
      'product_id', variant_record.product_id,
      'product_name', variant_record.product_name,
      'variant_id', variant_record.variant_id,
      'variant_name', variant_record.variant_name,
      'sku', variant_record.sku
    ),
    'request', jsonb_build_object(
      'unit_id', target_unit_id,
      'unit_code', variant_record.unit_code,
      'unit_name', variant_record.unit_name,
      'unit_symbol', variant_record.unit_symbol,
      'quantity', target_quantity
    ),
    'price', case
      when quote_record.price_tier_id is null then jsonb_build_object(
        'status', 'not_configured',
        'currency_code', price_book_record.currency_code
      )
      else jsonb_strip_nulls(jsonb_build_object(
        'status', quote_record.pricing_status,
        'currency_code', quote_record.currency_code,
        'calculation_method', quote_record.calculation_method,
        'price_amount', quote_record.price_amount,
        'total_amount', quote_record.total_amount,
        'valid_from', quote_record.valid_from,
        'valid_until', quote_record.valid_until
      ))
    end,
    'inventory', jsonb_build_object(
      'tracked', availability_tracked,
      'available_quantity', availability_value,
      'updated_at', availability_updated_at
    )
  );
end;
$$;

create function app_private.conversation_context_for_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_arguments jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  context_record record;
begin
  if target_arguments is null or target_arguments <> '{}'::jsonb then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  select
    conversation_value.id as conversation_id,
    conversation_value.status,
    conversation_value.opened_at,
    conversation_value.last_activity_at,
    conversation_value.last_inbound_at,
    conversation_value.last_outbound_at,
    conversation_value.service_window_expires_at,
    conversation_value.origin_kind,
    conversation_value.origin_external_id,
    conversation_value.origin_context,
    identity_value.display_name,
    identity_value.principal_type,
    identity_value.trust_level,
    contact_value.preferred_locale
  into context_record
  from app_private.agent_runs as run_value
  join app_private.conversations as conversation_value
    on conversation_value.organization_id = run_value.organization_id
   and conversation_value.channel_connection_id = run_value.channel_connection_id
   and conversation_value.id = run_value.conversation_id
  join app_private.channel_identities as identity_value
    on identity_value.organization_id = conversation_value.organization_id
   and identity_value.channel_connection_id = conversation_value.channel_connection_id
   and identity_value.id = conversation_value.primary_channel_identity_id
  left join app_private.contacts as contact_value
    on contact_value.organization_id = identity_value.organization_id
   and contact_value.id = identity_value.contact_id
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'context_not_found'));
  end if;

  return jsonb_build_object(
    'ok', true,
    'conversation', jsonb_strip_nulls(jsonb_build_object(
      'conversation_id', context_record.conversation_id,
      'status', context_record.status,
      'opened_at', context_record.opened_at,
      'last_activity_at', context_record.last_activity_at,
      'last_inbound_at', context_record.last_inbound_at,
      'last_outbound_at', context_record.last_outbound_at,
      'service_window_expires_at', context_record.service_window_expires_at,
      'origin_kind', context_record.origin_kind,
      'origin_external_id', context_record.origin_external_id,
      'origin_context', context_record.origin_context
    )),
    'contact', jsonb_strip_nulls(jsonb_build_object(
      'display_name', context_record.display_name,
      'principal_type', context_record.principal_type,
      'trust_level', context_record.trust_level,
      'preferred_locale', context_record.preferred_locale
    ))
  );
end;
$$;

create function app_private.ensure_customer_assistant_read_tools(
  target_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_actor_user_id uuid;
  selected_policy_id uuid;
  selected_policy_version app_private.agent_policy_versions%rowtype;
  selected_policy_version_id uuid;
  selected_contract_version_id uuid;
  selected_contract_id uuid;
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

    select contract_value.id, contract_value.current_version_id, version_value.contract_hash
    into selected_contract_id, selected_contract_version_id, selected_contract_hash
    from app_private.tool_contracts as contract_value
    left join app_private.tool_contract_versions as version_value
      on version_value.organization_id = contract_value.organization_id
     and version_value.id = contract_value.current_version_id
    where contract_value.organization_id = target_organization_id
      and contract_value.tool_name = definition_record.tool_name;

    if selected_contract_version_id is null
      or selected_contract_hash is distinct from expected_contract_hash then
      select registered.tool_contract_id, registered.tool_contract_version_id
      into selected_contract_id, selected_contract_version_id
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
    selected_contract_id := null;
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
  selected_policy_id := selected_policy_version.policy_id;

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

create function api.prepare_customer_assistant_read_tools(
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
    order by organization_value.created_at, organization_value.id
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

create function api.get_agent_turn_tool_context(
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

create function api.execute_whatsapp_read_only_tool_call(
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
  result_message_record record;
  attempt_result_record record;
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

  select * into result_message_record
  from api.append_agent_message(
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

  select * into attempt_result_record
  from api.record_agent_attempt_result(
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

revoke all on function app_private.catalog_search_for_agent(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.catalog_offer_for_agent(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.conversation_context_for_agent(uuid, uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.ensure_customer_assistant_read_tools(uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.prepare_customer_assistant_read_tools(integer)
  from public, anon, authenticated, service_role;
revoke all on function api.get_agent_turn_tool_context(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.execute_whatsapp_read_only_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) from public, anon, authenticated, service_role;

grant execute on function api.prepare_customer_assistant_read_tools(integer) to service_role;
grant execute on function api.get_agent_turn_tool_context(uuid, uuid, uuid, text, uuid)
  to service_role;
grant execute on function api.execute_whatsapp_read_only_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) to service_role;

comment on function app_private.catalog_search_for_agent(uuid, jsonb) is
  'Tenant-scoped universal catalog search selected cognitively through native tool calling.';
comment on function app_private.catalog_offer_for_agent(uuid, jsonb) is
  'Resolves an exact quantity price and availability without guessing across price tiers.';
comment on function app_private.conversation_context_for_agent(uuid, uuid, jsonb) is
  'Returns only the current run conversation context and preserved Meta origin.';
comment on function app_private.ensure_customer_assistant_read_tools(uuid) is
  'Idempotently versions the customer assistant policy with the B3-001A read-only tools.';
comment on function api.prepare_customer_assistant_read_tools(integer) is
  'Prepares active organizations before worker claims so first runs receive frozen tool bindings.';
comment on function api.get_agent_turn_tool_context(uuid, uuid, uuid, text, uuid) is
  'Returns authorized native definitions and durable tool history only for the active leased attempt.';
comment on function api.execute_whatsapp_read_only_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) is 'Atomically persists, authorizes, executes and resumes one read-only WhatsApp native tool call.';

notify pgrst, 'reload schema';

commit;
