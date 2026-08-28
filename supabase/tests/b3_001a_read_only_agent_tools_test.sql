begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(46);

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

select extensions.has_function(
  'api', 'prepare_customer_assistant_read_tools', array['integer'],
  'bounded customer tool preparation RPC exists'
);
select extensions.has_function(
  'api', 'get_agent_turn_tool_context', array['uuid', 'uuid', 'uuid', 'text', 'uuid'],
  'leased native tool context RPC exists'
);
select extensions.has_function(
  'api', 'execute_whatsapp_read_only_tool_call',
  array[
    'uuid', 'uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'text', 'text',
    'integer', 'jsonb', 'jsonb', 'jsonb'
  ],
  'atomic WhatsApp read-only tool execution RPC exists'
);

select extensions.ok(
  has_function_privilege(
    'service_role', 'api.prepare_customer_assistant_read_tools(integer)', 'EXECUTE'
  ),
  'service role can prepare native tool registries'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated', 'api.prepare_customer_assistant_read_tools(integer)', 'EXECUTE'
  ),
  'authenticated users cannot prepare native tool registries'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.get_agent_turn_tool_context(uuid,uuid,uuid,text,uuid)',
    'EXECUTE'
  ),
  'service role can read a leased turn tool context'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.get_agent_turn_tool_context(uuid,uuid,uuid,text,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot read internal tool history'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.execute_whatsapp_read_only_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'service role can execute one authorized read-only tool call'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.execute_whatsapp_read_only_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'authenticated users cannot forge tool execution'
);
select extensions.ok(
  not has_function_privilege(
    'service_role', 'app_private.catalog_search_for_agent(uuid,jsonb)', 'EXECUTE'
  ),
  'service role cannot bypass the atomic tool execution boundary for search'
);
select extensions.ok(
  not has_function_privilege(
    'service_role', 'app_private.catalog_offer_for_agent(uuid,jsonb)', 'EXECUTE'
  ),
  'service role cannot bypass the atomic tool execution boundary for offers'
);

set local role postgres;

insert into auth.users (id)
values
  ('b3010000-0000-4000-8000-000000000001'),
  ('b3010000-0000-4000-8000-000000000002');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    'b3011000-0000-4000-8000-000000000001',
    'B3 Read Tools Alpha',
    'b3010000-0000-4000-8000-000000000001'
  ),
  (
    'b3011000-0000-4000-8000-000000000002',
    'B3 Read Tools Beta',
    'b3010000-0000-4000-8000-000000000002'
  );

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    'b3011100-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'b3010000-0000-4000-8000-000000000001',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b3011100-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'b3010000-0000-4000-8000-000000000002',
    'owner', 'active', statement_timestamp()
  );

set constraints all immediate;

create temporary table pg_temp.b301_policy_versions (
  organization_id uuid primary key,
  policy_version_id uuid not null
) on commit drop;

insert into pg_temp.b301_policy_versions
values
  (
    'b3011000-0000-4000-8000-000000000001',
    app_private.ensure_customer_assistant_read_tools(
      'b3011000-0000-4000-8000-000000000001'
    )
  ),
  (
    'b3011000-0000-4000-8000-000000000002',
    app_private.ensure_customer_assistant_read_tools(
      'b3011000-0000-4000-8000-000000000002'
    )
  );

select extensions.ok(
  (select policy_version_id is not null from pg_temp.b301_policy_versions
   where organization_id = 'b3011000-0000-4000-8000-000000000001'),
  'tool bootstrap returns an immutable policy version'
);
select extensions.is(
  app_private.ensure_customer_assistant_read_tools(
    'b3011000-0000-4000-8000-000000000001'
  ),
  (select policy_version_id from pg_temp.b301_policy_versions
   where organization_id = 'b3011000-0000-4000-8000-000000000001'),
  'tool bootstrap is idempotent for an unchanged organization'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.tool_contracts
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and tool_name in (
        'conversation_get_context', 'catalog_search', 'catalog_get_offer'
      )
      and status = 'active'
  ),
  3,
  'one organization owns exactly three active B3-001A contracts'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.agent_policy_tools
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and policy_version_id = (
        select policy_version_id from pg_temp.b301_policy_versions
        where organization_id = 'b3011000-0000-4000-8000-000000000001'
      )
  ),
  3,
  'current customer policy binds all three read-only tools'
);

set local role service_role;
select extensions.is(
  (
    select organizations_failed
    from api.prepare_customer_assistant_read_tools(100)
  ),
  0,
  'bounded preparation completes without silently failed organizations'
);

set local role postgres;

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  (
    'b3012000-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'water_storage', 'Almacenamiento de agua', 'active'
  ),
  (
    'b3012000-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'private_goods', 'Productos privados Beta', 'active'
  );

insert into app_private.catalog_units (
  id, organization_id, code, name_singular, name_plural,
  symbol, quantity_kind, decimal_scale, status
)
values
  (
    'b3012100-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'piece', 'pieza', 'piezas', 'pza', 'count', 0, 'active'
  ),
  (
    'b3012100-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'piece', 'pieza', 'piezas', 'pza', 'count', 0, 'active'
  );

insert into app_private.products (id, organization_id, category_id, name, description, status)
values
  (
    'b3012200-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'b3012000-0000-4000-8000-000000000001',
    'Tinaco X62', 'Tinaco reforzado para almacenamiento de agua', 'active'
  ),
  (
    'b3012200-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'b3012000-0000-4000-8000-000000000002',
    'Producto Secreto Beta', 'No debe cruzar organizaciones', 'active'
  );

insert into app_private.product_variants (
  id, organization_id, product_id, name, description, status
)
values
  (
    'b3012300-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'b3012200-0000-4000-8000-000000000001',
    'Tinaco X62 azul', 'Presentación individual', 'draft'
  ),
  (
    'b3012300-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'b3012200-0000-4000-8000-000000000002',
    'Variante Beta', 'Solo organización Beta', 'draft'
  );

insert into app_private.variant_skus (id, organization_id, variant_id, sku, status)
values
  (
    'b3012400-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'b3012300-0000-4000-8000-000000000001',
    'TIN-X62', 'current'
  ),
  (
    'b3012400-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'b3012300-0000-4000-8000-000000000002',
    'BETA-SECRET', 'current'
  );

update app_private.product_variants
set status = 'active'
where id in (
  'b3012300-0000-4000-8000-000000000001',
  'b3012300-0000-4000-8000-000000000002'
);

insert into app_private.catalog_evidence (
  id, organization_id, evidence_kind, content, created_by_user_id
)
values (
  'b3012500-0000-4000-8000-000000000001',
  'b3011000-0000-4000-8000-000000000001',
  'owner_confirmation',
  '{"instruction":"Tinaco X62 por pieza cuesta 1700"}'::jsonb,
  'b3010000-0000-4000-8000-000000000001'
);

insert into app_private.price_books (
  id, organization_id, code, name, currency_code, status, is_default, created_by_user_id
)
values
  (
    'b3012600-0000-4000-8000-000000000001',
    'b3011000-0000-4000-8000-000000000001',
    'retail', 'Venta al público', 'MXN', 'active', true,
    'b3010000-0000-4000-8000-000000000001'
  ),
  (
    'b3012600-0000-4000-8000-000000000002',
    'b3011000-0000-4000-8000-000000000002',
    'retail', 'Venta privada Beta', 'MXN', 'active', true,
    'b3010000-0000-4000-8000-000000000002'
  );

insert into app_private.price_tiers (
  id, organization_id, price_book_id, variant_id, unit_id,
  quantity_min, quantity_max, pricing_status, calculation_method,
  price_amount, valid_from, valid_until, evidence_id, created_by_user_id
)
values (
  'b3012700-0000-4000-8000-000000000001',
  'b3011000-0000-4000-8000-000000000001',
  'b3012600-0000-4000-8000-000000000001',
  'b3012300-0000-4000-8000-000000000001',
  'b3012100-0000-4000-8000-000000000001',
  1, 1, 'priced', 'fixed_total', 1700,
  '2026-01-01 00:00:00+00', '2027-01-01 00:00:00+00',
  'b3012500-0000-4000-8000-000000000001',
  'b3010000-0000-4000-8000-000000000001'
);

select extensions.is(
  jsonb_array_length(
    app_private.catalog_search_for_agent(
      'b3011000-0000-4000-8000-000000000001',
      '{"query":"Tinaco X62"}'::jsonb
    ) -> 'matches'
  ),
  1,
  'catalog search finds the active product in its own organization'
);
select extensions.is(
  jsonb_array_length(
    app_private.catalog_search_for_agent(
      'b3011000-0000-4000-8000-000000000001',
      '{"query":"Producto Secreto Beta"}'::jsonb
    ) -> 'matches'
  ),
  0,
  'catalog search cannot leak a matching product from another organization'
);
select extensions.is(
  app_private.catalog_search_for_agent(
    'b3011000-0000-4000-8000-000000000001',
    '{"query":"Tinaco","limit":99}'::jsonb
  ) #>> '{error,code}',
  'invalid_arguments',
  'catalog search rejects a provider limit outside the reviewed contract'
);
select extensions.is(
  app_private.catalog_offer_for_agent(
    'b3011000-0000-4000-8000-000000000001',
    '{"variant_id":"b3012300-0000-4000-8000-000000000001","unit_id":"b3012100-0000-4000-8000-000000000001","quantity":1}'::jsonb
  ) #>> '{price,status}',
  'priced',
  'exact quantity one resolves its configured pricing status'
);
select extensions.is(
  (
    app_private.catalog_offer_for_agent(
      'b3011000-0000-4000-8000-000000000001',
      '{"variant_id":"b3012300-0000-4000-8000-000000000001","unit_id":"b3012100-0000-4000-8000-000000000001","quantity":1}'::jsonb
    ) #>> '{price,total_amount}'
  )::numeric,
  1700::numeric,
  'exact quantity one returns the evidence-backed total without arithmetic guessing'
);
select extensions.is(
  app_private.catalog_offer_for_agent(
    'b3011000-0000-4000-8000-000000000001',
    '{"variant_id":"b3012300-0000-4000-8000-000000000001","unit_id":"b3012100-0000-4000-8000-000000000001","quantity":2}'::jsonb
  ) #>> '{price,status}',
  'not_configured',
  'an unconfigured quantity returns not_configured instead of an invented price'
);
select extensions.is(
  app_private.catalog_offer_for_agent(
    'b3011000-0000-4000-8000-000000000001',
    '{"variant_id":"b3012300-0000-4000-8000-000000000002","unit_id":"b3012100-0000-4000-8000-000000000002","quantity":1}'::jsonb
  ) #>> '{error,code}',
  'offer_not_found',
  'offer resolution cannot cross organization boundaries'
);

set local role service_role;

select * from api.register_meta_application(
  'b3011000-0000-4000-8000-000000000001',
  '216409300301001', 'B3 Read Tools App', 'v26.0',
  'b301-app-secret-0123456789abcdef',
  'b301-verify-token-0123456789',
  'b3010000-0000-4000-8000-000000000001',
  'b301-register-app', 'b301-register-app-trace'
);

select * from api.accept_meta_webhook_challenge(
  (
    select endpoint_key from api.meta_webhook_endpoints
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
  ),
  'subscribe', 'b301-verify-token-0123456789',
  'b301-challenge', 'b301-challenge-trace'
);

select * from api.register_meta_whatsapp_connection(
  'b3011000-0000-4000-8000-000000000001',
  (
    select id from api.meta_applications
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and external_app_id = '216409300301001'
  ),
  '105616013301001', '112038437301001', '+52 664 555 3010',
  'B3 Read Tools WhatsApp', 'GREEN', 'APPROVED', 'SYSTEM_USER',
  array['whatsapp_business_management', 'whatsapp_business_messaging'],
  statement_timestamp() + interval '30 days',
  statement_timestamp() + interval '30 days',
  'b301-whatsapp-access-token-0123456789abcdef',
  'b3010000-0000-4000-8000-000000000001',
  'b301-register-channel', 'b301-register-channel-trace'
);

set local role postgres;
set constraints all deferred;

insert into app_private.contacts (
  id, organization_id, display_name, preferred_locale, status
)
values (
  'b3013000-0000-4000-8000-000000000001',
  'b3011000-0000-4000-8000-000000000001',
  'Cliente B301', 'es-MX', 'active'
);

insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name, status, last_seen_at
)
select
  'b3013100-0000-4000-8000-000000000001',
  'b3011000-0000-4000-8000-000000000001',
  connection_value.id, '5216645553010', 'contact',
  'b3013000-0000-4000-8000-000000000001',
  'provider_observed', 'Cliente B301', 'active', statement_timestamp()
from app_private.channel_connections as connection_value
where connection_value.organization_id = 'b3011000-0000-4000-8000-000000000001'
  and connection_value.channel = 'whatsapp';

insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  status, opened_at, last_activity_at, last_inbound_at,
  service_window_expires_at, origin_kind, origin_external_id, origin_context,
  created_at, updated_at
)
select
  'b3013200-0000-4000-8000-000000000001',
  identity_value.organization_id, identity_value.channel_connection_id, identity_value.id,
  'open', statement_timestamp(), statement_timestamp(), statement_timestamp(),
  statement_timestamp() + interval '24 hours',
  'publication', 'facebook-post-b301',
  '{"title":"Tinaco X62","source":"facebook"}'::jsonb,
  statement_timestamp(), statement_timestamp()
from app_private.channel_identities as identity_value
where identity_value.id = 'b3013100-0000-4000-8000-000000000001';

insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id, joined_at, created_at
)
select
  'b3013300-0000-4000-8000-000000000001',
  conversation_value.organization_id, conversation_value.channel_connection_id,
  conversation_value.id, 'identity', 'customer',
  conversation_value.primary_channel_identity_id,
  statement_timestamp(), statement_timestamp()
from app_private.conversations as conversation_value
where conversation_value.id = 'b3013200-0000-4000-8000-000000000001';

insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b3013400-0000-4000-8000-000000000001',
  participant_value.organization_id, participant_value.channel_connection_id,
  participant_value.conversation_id, participant_value.id,
  'inbound', 'text', 'text', 'wamid.B301.catalog.1',
  extensions.digest(convert_to('b301-message-1', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', '¿Cuánto cuesta el Tinaco X62?')),
  '{}'::jsonb, 'received', statement_timestamp(), statement_timestamp(),
  statement_timestamp(), statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b3013300-0000-4000-8000-000000000001';

create temporary table pg_temp.b301_turn_claims (
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
) on commit drop;
grant select, insert, delete on pg_temp.b301_turn_claims to service_role;

set local role service_role;
insert into pg_temp.b301_turn_claims
select * from api.claim_whatsapp_agent_turn(
  'b301-worker', 'minimax', 'MiniMax-M3',
  'minimax', 'MiniMax-M3', null, 120,
  'b3011000-0000-4000-8000-000000000001'
);

select extensions.is(
  (select count(*)::integer from pg_temp.b301_turn_claims),
  1,
  'one real inbound customer message claims one cognitive turn'
);

create temporary table pg_temp.b301_tool_context (
  tool_definitions jsonb,
  tool_history jsonb,
  next_tool_round integer
) on commit drop;
grant select, insert, delete on pg_temp.b301_tool_context to service_role;

insert into pg_temp.b301_tool_context
select * from api.get_agent_turn_tool_context(
  (select organization_id from pg_temp.b301_turn_claims),
  (select agent_run_id from pg_temp.b301_turn_claims),
  (select job_attempt_id from pg_temp.b301_turn_claims),
  'b301-worker',
  (select lease_token from pg_temp.b301_turn_claims)
);

select extensions.is(
  (select jsonb_array_length(tool_definitions) from pg_temp.b301_tool_context),
  3,
  'leased turn receives exactly the three tools frozen in its policy'
);
select extensions.is(
  (select jsonb_array_length(tool_history) from pg_temp.b301_tool_context),
  0,
  'first provider attempt has no invented tool history'
);
select extensions.is(
  (select next_tool_round from pg_temp.b301_tool_context),
  1,
  'first provider attempt starts at tool round one'
);

create temporary table pg_temp.b301_tool_result (
  tool_execution_id uuid,
  tool_status text,
  tool_result jsonb,
  run_status text,
  job_status text,
  was_replayed boolean
) on commit drop;
grant select, insert on pg_temp.b301_tool_result to service_role;

insert into pg_temp.b301_tool_result
select * from api.execute_whatsapp_read_only_tool_call(
  (select organization_id from pg_temp.b301_turn_claims),
  (select agent_run_id from pg_temp.b301_turn_claims),
  (select job_attempt_id from pg_temp.b301_turn_claims),
  'b301-worker',
  (select lease_token from pg_temp.b301_turn_claims),
  'minimax', 'minimax-request-b301-tool-1', 'call-b301-context-1',
  'conversation_get_context', 1, '{}'::jsonb,
  '{"role":"assistant","content":"","reasoning_details":[{"type":"text","text":"encrypted-provider-state"}],"tool_calls":[{"id":"call-b301-context-1","type":"function","function":{"name":"conversation_get_context","arguments":"{}"}}]}'::jsonb,
  '{"total_tokens":20}'::jsonb
);

select extensions.is(
  (select tool_status from pg_temp.b301_tool_result),
  'succeeded',
  'authorized read-only handler executes successfully'
);
select extensions.is(
  (select tool_result #>> '{contact,display_name}' from pg_temp.b301_tool_result),
  'Cliente B301',
  'conversation context returns the current tenant contact'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer from app_private.tool_executions
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and provider_tool_call_id = 'call-b301-context-1'
  ),
  1,
  'one provider call produces exactly one durable ledger entry'
);
select extensions.is(
  (
    select count(*)::integer from app_private.agent_messages
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and run_id = (select agent_run_id from pg_temp.b301_turn_claims)
      and message_kind in ('tool_call', 'tool_result')
  ),
  2,
  'tool call and trusted result are both durably paired'
);
select extensions.is(
  (
    select run_value.status || '|' || job_value.status
    from app_private.agent_runs as run_value
    join app_private.agent_jobs as job_value
      on job_value.organization_id = run_value.organization_id
     and job_value.run_id = run_value.id
    where run_value.id = (select agent_run_id from pg_temp.b301_turn_claims)
  ),
  'waiting_provider|retryable',
  'successful tool execution requeues the same run for provider continuation'
);

set local role service_role;
delete from pg_temp.b301_turn_claims;
insert into pg_temp.b301_turn_claims
select * from api.claim_whatsapp_agent_turn(
  'b301-worker', 'minimax', 'MiniMax-M3',
  'minimax', 'MiniMax-M3', null, 120,
  'b3011000-0000-4000-8000-000000000001'
);

select extensions.is(
  (select count(*)::integer from pg_temp.b301_turn_claims),
  1,
  'tool-resumed run receives a new leased provider attempt'
);

delete from pg_temp.b301_tool_context;
insert into pg_temp.b301_tool_context
select * from api.get_agent_turn_tool_context(
  (select organization_id from pg_temp.b301_turn_claims),
  (select agent_run_id from pg_temp.b301_turn_claims),
  (select job_attempt_id from pg_temp.b301_turn_claims),
  'b301-worker',
  (select lease_token from pg_temp.b301_turn_claims)
);

select extensions.is(
  (select jsonb_array_length(tool_history) from pg_temp.b301_tool_context),
  1,
  'continuation receives exactly one paired durable tool exchange'
);
select extensions.is(
  (select next_tool_round from pg_temp.b301_tool_context),
  2,
  'continuation advances to the next sequential tool round'
);
select extensions.is(
  (select tool_history #>> '{0,call,provider}' from pg_temp.b301_tool_context),
  'minimax',
  'provider-specific continuation state preserves its provenance'
);
select extensions.is(
  (
    select tool_history #>> '{0,call,provider_state,reasoning_details,0,text}'
    from pg_temp.b301_tool_context
  ),
  'encrypted-provider-state',
  'provider continuation state is paired durably without exposing it to customer text'
);

select pg_temp.throws_sqlstate(
  format(
    'select * from api.execute_whatsapp_read_only_tool_call(%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid,%L,%L,%L,%L,%s,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select organization_id::text from pg_temp.b301_turn_claims),
    (select agent_run_id::text from pg_temp.b301_turn_claims),
    (select job_attempt_id::text from pg_temp.b301_turn_claims),
    'b301-worker',
    (select lease_token::text from pg_temp.b301_turn_claims),
    'minimax', 'minimax-request-b301-wrong-round', 'call-b301-wrong-round-1',
    'conversation_get_context', 99, '{}',
    '{"role":"assistant","tool_calls":[]}', '{}'
  ),
  '42501',
  'a model cannot skip or repeat the sequential tool round'
);

select pg_temp.throws_sqlstate(
  format(
    'select * from api.get_agent_turn_tool_context(%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid)',
    'b3011000-0000-4000-8000-000000000002',
    (select agent_run_id::text from pg_temp.b301_turn_claims),
    (select job_attempt_id::text from pg_temp.b301_turn_claims),
    'b301-worker',
    (select lease_token::text from pg_temp.b301_turn_claims)
  ),
  '42501',
  'another organization cannot read a leased tool context'
);

select pg_temp.throws_sqlstate(
  format(
    'select * from api.execute_whatsapp_read_only_tool_call(%L::uuid,%L::uuid,%L::uuid,%L,%L::uuid,%L,%L,%L,%L,%s,%L::jsonb,%L::jsonb,%L::jsonb)',
    (select organization_id::text from pg_temp.b301_turn_claims),
    (select agent_run_id::text from pg_temp.b301_turn_claims),
    (select job_attempt_id::text from pg_temp.b301_turn_claims),
    'b301-worker',
    (select lease_token::text from pg_temp.b301_turn_claims),
    'minimax', 'minimax-request-b301-unknown', 'call-b301-unknown-1',
    'catalog_delete_everything', 2, '{}',
    '{"role":"assistant","tool_calls":[]}', '{}'
  ),
  '42501',
  'a model cannot execute a tool absent from its frozen policy'
);

set local role postgres;
update app_private.agent_runs
set budget_status = 'exceeded'
where organization_id = 'b3011000-0000-4000-8000-000000000001'
  and id = (select agent_run_id from pg_temp.b301_turn_claims);

set local role service_role;
create temporary table pg_temp.b301_blocked_tool_result (
  tool_execution_id uuid,
  tool_status text,
  tool_result jsonb,
  run_status text,
  job_status text,
  was_replayed boolean
) on commit drop;
grant select, insert on pg_temp.b301_blocked_tool_result to service_role;

insert into pg_temp.b301_blocked_tool_result
select * from api.execute_whatsapp_read_only_tool_call(
  (select organization_id from pg_temp.b301_turn_claims),
  (select agent_run_id from pg_temp.b301_turn_claims),
  (select job_attempt_id from pg_temp.b301_turn_claims),
  'b301-worker',
  (select lease_token from pg_temp.b301_turn_claims),
  'minimax', 'minimax-request-b301-budget-blocked', 'call-b301-budget-blocked-1',
  'conversation_get_context', 2, '{}'::jsonb,
  '{"role":"assistant","tool_calls":[{"id":"call-b301-budget-blocked-1","type":"function","function":{"name":"conversation_get_context","arguments":"{}"}}]}'::jsonb,
  '{"total_tokens":8}'::jsonb
);

select extensions.is(
  (select tool_status from pg_temp.b301_blocked_tool_result),
  'blocked',
  'an exceeded run budget blocks an otherwise valid read-only tool'
);
select extensions.is(
  (select tool_result #>> '{error,code}' from pg_temp.b301_blocked_tool_result),
  'tool_not_authorized',
  'a blocked authorization returns a durable machine-readable error'
);
select extensions.is(
  (select tool_result #>> '{error,reason}' from pg_temp.b301_blocked_tool_result),
  'cost_budget_not_authorized',
  'the blocked result preserves the exact policy reason'
);

set local role postgres;
update app_private.agent_runs
set budget_status = 'within'
where organization_id = 'b3011000-0000-4000-8000-000000000001'
  and id = (select agent_run_id from pg_temp.b301_turn_claims);

set local role service_role;
delete from pg_temp.b301_turn_claims;
insert into pg_temp.b301_turn_claims
select * from api.claim_whatsapp_agent_turn(
  'b301-worker', 'minimax', 'MiniMax-M3',
  'minimax', 'MiniMax-M3', null, 120,
  'b3011000-0000-4000-8000-000000000001'
);
select extensions.is(
  (select count(*)::integer from pg_temp.b301_turn_claims),
  1,
  'a blocked tool result resumes through a fresh leased provider attempt'
);

select extensions.is(
  (
    select outbound_message_count
    from api.complete_whatsapp_agent_turn(
      (select organization_id from pg_temp.b301_turn_claims),
      (select job_attempt_id from pg_temp.b301_turn_claims),
      'b301-worker',
      (select lease_token from pg_temp.b301_turn_claims),
      'El Tinaco X62 cuesta $1,700 por una pieza.',
      'minimax-request-b301-final',
      '{"total_tokens":32}'::jsonb
    )
  ),
  1,
  'final LLM-visible text creates one outbound message after tool continuation'
);

set local role postgres;
select extensions.is(
  (
    select status from app_private.agent_runs
    where organization_id = 'b3011000-0000-4000-8000-000000000001'
      and id = (select agent_run_id from pg_temp.b301_turn_claims)
  ),
  'completed',
  'the durable run completes only after the LLM returns final visible text'
);

select * from extensions.finish();

rollback;
