begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(95);

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
  'app_private', 'resolve_whatsapp_agent_actor', array['uuid', 'uuid', 'uuid'],
  'exact WhatsApp actor resolver exists'
);
select extensions.has_function(
  'api', 'link_whatsapp_member_identity',
  array['uuid', 'text', 'uuid', 'uuid', 'uuid', 'text', 'text'],
  'idempotent member identity link RPC exists'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.link_whatsapp_member_identity(uuid,text,uuid,uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'service role can execute the authenticated admin identity link boundary'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.link_whatsapp_member_identity(uuid,text,uuid,uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the privileged identity link RPC directly'
);
select extensions.ok(
  not has_function_privilege(
    'service_role',
    'app_private.resolve_whatsapp_agent_actor(uuid,uuid,uuid)',
    'EXECUTE'
  ),
  'service role cannot bypass the WhatsApp claim boundary with the private resolver'
);

set local role postgres;

insert into auth.users (id)
values
  ('b3060000-0000-4000-8000-000000000001'),
  ('b3060000-0000-4000-8000-000000000002'),
  ('b3060000-0000-4000-8000-000000000003');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    'b3061000-0000-4000-8000-000000000001',
    'B3 Actor Resolution Alpha',
    'b3060000-0000-4000-8000-000000000001'
  ),
  (
    'b3061000-0000-4000-8000-000000000002',
    'B3 Actor Resolution Beta',
    'b3060000-0000-4000-8000-000000000002'
  );

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    'b3061100-0000-4000-8000-000000000001',
    'b3061000-0000-4000-8000-000000000001',
    'b3060000-0000-4000-8000-000000000001',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b3061100-0000-4000-8000-000000000002',
    'b3061000-0000-4000-8000-000000000002',
    'b3060000-0000-4000-8000-000000000002',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b3061100-0000-4000-8000-000000000003',
    'b3061000-0000-4000-8000-000000000001',
    'b3060000-0000-4000-8000-000000000003',
    'owner', 'active', statement_timestamp()
  );

set constraints all immediate;

select app_private.ensure_customer_assistant_read_tools(
  'b3061000-0000-4000-8000-000000000001'
);

select extensions.ok(
  app_private.customer_assistant_read_tools_ready(
    'b3061000-0000-4000-8000-000000000001'
  ),
  'current store-assistant policy exposes all read tools to contacts and members'
);

select pg_temp.throws_sqlstate(
  $$select * from api.create_agent_policy_version(
    'b3061000-0000-4000-8000-000000000001',
    'b306-invalid-contact-role-gate',
    'b306.invalid.role.gate',
    'Invalid contact role gate',
    (
      select version_value.prompt_version_id
      from app_private.agent_policies as policy_value
      join app_private.agent_policy_versions as version_value
        on version_value.organization_id = policy_value.organization_id
       and version_value.id = policy_value.current_version_id
      where policy_value.organization_id = 'b3061000-0000-4000-8000-000000000001'
        and policy_value.policy_key = 'customer_assistant'
    ),
    8, 4, 1, 120000, 'explicit', 0.05000000, 'MXN', 'block', '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'tool_contract_version_id', (
        select current_version_id
        from app_private.tool_contracts
        where organization_id = 'b3061000-0000-4000-8000-000000000001'
          and tool_name = 'catalog_search'
      ),
      'allowed_actor_kinds', jsonb_build_array('contact', 'member'),
      'required_membership_roles', jsonb_build_array('owner'),
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object()
    )),
    null, false,
    'b3060000-0000-4000-8000-000000000001',
    'b306-invalid-role-gate', null
  )$$,
  '23514',
  'a role-gated policy binding cannot include contact actors'
);

set local role service_role;

select * from api.register_meta_application(
  'b3061000-0000-4000-8000-000000000001',
  '216409300302001', 'B3 Actor Resolution App', 'v26.0',
  'b306-app-secret-0123456789abcdef',
  'b306-verify-token-0123456789',
  'b3060000-0000-4000-8000-000000000001',
  'b306-register-app', 'b306-register-app-trace'
);

select * from api.accept_meta_webhook_challenge(
  (
    select endpoint_key from api.meta_webhook_endpoints
    where organization_id = 'b3061000-0000-4000-8000-000000000001'
  ),
  'subscribe', 'b306-verify-token-0123456789',
  'b306-challenge', 'b306-challenge-trace'
);

select * from api.register_meta_whatsapp_connection(
  'b3061000-0000-4000-8000-000000000001',
  (
    select id from api.meta_applications
    where organization_id = 'b3061000-0000-4000-8000-000000000001'
      and external_app_id = '216409300302001'
  ),
  '105616013302001', '112038437302001', '+52 664 555 3020',
  'B3 Actor Resolution WhatsApp', 'GREEN', 'APPROVED', 'SYSTEM_USER',
  array['whatsapp_business_management', 'whatsapp_business_messaging'],
  statement_timestamp() + interval '30 days',
  statement_timestamp() + interval '30 days',
  'b306-whatsapp-access-token-0123456789abcdef',
  'b3060000-0000-4000-8000-000000000001',
  'b306-register-channel', 'b306-register-channel-trace'
);

set local role postgres;
set constraints all deferred;

insert into app_private.contacts (id, organization_id, display_name, status)
values
  (
    'b3062000-0000-4000-8000-000000000001',
    'b3061000-0000-4000-8000-000000000001',
    'Cuenta de prueba', 'active'
  ),
  (
    'b3062000-0000-4000-8000-000000000002',
    'b3061000-0000-4000-8000-000000000001',
    'Contacto que suplanta', 'active'
  );

insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name, status, last_seen_at
)
select
  'b3062100-0000-4000-8000-000000000001',
  'b3061000-0000-4000-8000-000000000001',
  connection_value.id, '5216645553021', 'contact',
  'b3062000-0000-4000-8000-000000000001',
  'provider_observed', 'Cuenta de prueba', 'active', statement_timestamp()
from app_private.channel_connections as connection_value
where connection_value.organization_id = 'b3061000-0000-4000-8000-000000000001'
  and connection_value.channel = 'whatsapp';

insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  status, opened_at, last_activity_at, last_inbound_at,
  service_window_expires_at, created_at, updated_at
)
select
  'b3062200-0000-4000-8000-000000000001',
  identity_value.organization_id, identity_value.channel_connection_id, identity_value.id,
  'open', statement_timestamp(), statement_timestamp(), statement_timestamp(),
  statement_timestamp() + interval '24 hours', statement_timestamp(), statement_timestamp()
from app_private.channel_identities as identity_value
where identity_value.id = 'b3062100-0000-4000-8000-000000000001';

insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id, joined_at, created_at
)
select
  'b3062300-0000-4000-8000-000000000001',
  conversation_value.organization_id, conversation_value.channel_connection_id,
  conversation_value.id, 'identity', 'customer',
  conversation_value.primary_channel_identity_id,
  statement_timestamp(), statement_timestamp()
from app_private.conversations as conversation_value
where conversation_value.id = 'b3062200-0000-4000-8000-000000000001';

insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b3062400-0000-4000-8000-000000000001',
  participant_value.organization_id, participant_value.channel_connection_id,
  participant_value.conversation_id, participant_value.id,
  'inbound', 'text', 'text', 'wamid.B306.contact.1',
  extensions.digest(convert_to('b306-contact-message-1', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', 'Quiero ver productos')),
  '{}'::jsonb, 'received', statement_timestamp(), statement_timestamp(),
  statement_timestamp(), statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b3062300-0000-4000-8000-000000000001';

set constraints all immediate;

create temporary table pg_temp.b306_turn_claims (
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
grant select, insert, delete on pg_temp.b306_turn_claims to service_role;

create temporary table pg_temp.b306_tool_context (
  tool_definitions jsonb,
  tool_history jsonb,
  next_tool_round integer
) on commit drop;
grant select, insert, delete on pg_temp.b306_tool_context to service_role;

set local role service_role;

insert into pg_temp.b306_turn_claims
select * from api.claim_whatsapp_agent_turn(
  'b306-worker-contact', 'minimax', 'MiniMax-M3',
  'minimax', 'MiniMax-M3', null, 120,
  'b3061000-0000-4000-8000-000000000001'
);

select extensions.is(
  (select count(*)::integer from pg_temp.b306_turn_claims),
  1,
  'the observed test account claims one contact turn'
);
select extensions.is(
  (
    select actor_kind from app_private.agent_runs
    where id = (select agent_run_id from pg_temp.b306_turn_claims)
  ),
  'contact',
  'an observed account is a contact before explicit member linking'
);

insert into pg_temp.b306_tool_context
select * from api.get_agent_turn_tool_context(
  (select organization_id from pg_temp.b306_turn_claims),
  (select agent_run_id from pg_temp.b306_turn_claims),
  (select job_attempt_id from pg_temp.b306_turn_claims),
  'b306-worker-contact',
  (select lease_token from pg_temp.b306_turn_claims)
);

select extensions.is(
  (select jsonb_array_length(tool_definitions) from pg_temp.b306_tool_context),
  3,
  'a customer receives all three commercial read tools'
);
select extensions.is(
  (
    select snapshot.actor_kind
    from app_private.agent_runs as run_value
    join app_private.conversation_agent_snapshots as snapshot
      on snapshot.organization_id = run_value.organization_id
     and snapshot.id = run_value.conversation_snapshot_id
    where run_value.id = (select agent_run_id from pg_temp.b306_turn_claims)
  ),
  'contact',
  'the customer run freezes the contact snapshot lane'
);

select extensions.is(
  (
    select outbound_message_count
    from api.complete_whatsapp_agent_turn(
      (select organization_id from pg_temp.b306_turn_claims),
      (select job_attempt_id from pg_temp.b306_turn_claims),
      'b306-worker-contact',
      (select lease_token from pg_temp.b306_turn_claims),
      'Te ayudo a revisar el catálogo.',
      'b306-provider-contact-complete',
      '{}'::jsonb
    )
  ),
  1,
  'the contact turn is closed before the explicit identity transition'
);

create temporary table pg_temp.b306_link_result (
  channel_identity_id uuid,
  member_user_id uuid,
  was_replayed boolean
) on commit drop;
grant select, insert, delete on pg_temp.b306_link_result to service_role;

insert into pg_temp.b306_link_result
select * from api.link_whatsapp_member_identity(
  'b3061000-0000-4000-8000-000000000001',
  'b306-link-test-account',
  'b3062100-0000-4000-8000-000000000001',
  'b3060000-0000-4000-8000-000000000001',
  'b3060000-0000-4000-8000-000000000001',
  'b306-link-correlation',
  'b306-link-trace'
);

set local role postgres;

select extensions.is(
  (select status from app_private.channel_identities
   where id = 'b3062100-0000-4000-8000-000000000001'),
  'revoked',
  'linking revokes the observed contact identity without rewriting its principal'
);
select extensions.is(
  (select status from app_private.conversations
   where id = 'b3062200-0000-4000-8000-000000000001'),
  'closed',
  'linking closes the prior contact conversation while preserving it'
);
select extensions.ok(
  (
    select principal_type = 'member'
      and trust_level = 'verified_member'
      and status = 'active'
      and member_user_id = 'b3060000-0000-4000-8000-000000000001'
    from app_private.channel_identities
    where id = (select channel_identity_id from pg_temp.b306_link_result)
  ),
  'linking creates one active verified identity for the owner membership'
);
select extensions.ok(
  (
    select metadata_safe::text not like '%5216645553021%'
    from app_private.audit_events
    where organization_id = 'b3061000-0000-4000-8000-000000000001'
      and event_type = 'whatsapp_identity.member_linked'
  ),
  'identity-link audit metadata does not persist the provider phone subject'
);

set local role service_role;
delete from pg_temp.b306_link_result;
insert into pg_temp.b306_link_result
select * from api.link_whatsapp_member_identity(
  'b3061000-0000-4000-8000-000000000001',
  'b306-link-test-account',
  'b3062100-0000-4000-8000-000000000001',
  'b3060000-0000-4000-8000-000000000001',
  'b3060000-0000-4000-8000-000000000001',
  'b306-link-correlation',
  'b306-link-trace'
);

select extensions.ok(
  (select was_replayed from pg_temp.b306_link_result),
  'the exact member-link retry replays instead of creating another transition'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer
    from app_private.channel_identities
    where organization_id = 'b3061000-0000-4000-8000-000000000001'
      and external_subject_id = '5216645553021'
      and principal_type = 'member'
  ),
  1,
  'idempotent replay leaves exactly one verified member identity'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = 'b3061000-0000-4000-8000-000000000001'
      and event_type = 'whatsapp_identity.member_linked'
  ),
  1,
  'idempotent replay leaves exactly one identity-link audit transition'
);

set constraints all deferred;
insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  status, opened_at, last_activity_at, last_inbound_at,
  service_window_expires_at, created_at, updated_at
)
select
  'b3062200-0000-4000-8000-000000000002',
  identity_value.organization_id, identity_value.channel_connection_id, identity_value.id,
  'open', statement_timestamp(), statement_timestamp(), statement_timestamp(),
  statement_timestamp() + interval '24 hours', statement_timestamp(), statement_timestamp()
from app_private.channel_identities as identity_value
where identity_value.id = (select channel_identity_id from pg_temp.b306_link_result);

insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id, joined_at, created_at
)
select
  'b3062300-0000-4000-8000-000000000002',
  conversation_value.organization_id, conversation_value.channel_connection_id,
  conversation_value.id, 'identity', 'member',
  conversation_value.primary_channel_identity_id,
  statement_timestamp(), statement_timestamp()
from app_private.conversations as conversation_value
where conversation_value.id = 'b3062200-0000-4000-8000-000000000002';

insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b3062400-0000-4000-8000-000000000002',
  participant_value.organization_id, participant_value.channel_connection_id,
  participant_value.conversation_id, participant_value.id,
  'inbound', 'text', 'text', 'wamid.B306.member.1',
  extensions.digest(convert_to('b306-member-message-1', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', 'Ayúdame a administrar la tienda')),
  '{}'::jsonb, 'received', statement_timestamp(), statement_timestamp(),
  statement_timestamp(), statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b3062300-0000-4000-8000-000000000002';
set constraints all immediate;

set local role service_role;
delete from pg_temp.b306_turn_claims;
delete from pg_temp.b306_tool_context;
insert into pg_temp.b306_turn_claims
select * from api.claim_whatsapp_agent_turn(
  'b306-worker-member', 'minimax', 'MiniMax-M3',
  'minimax', 'MiniMax-M3', null, 120,
  'b3061000-0000-4000-8000-000000000001'
);

select extensions.is(
  (select count(*)::integer from pg_temp.b306_turn_claims),
  1,
  'the next message from the linked account claims one member turn'
);
select extensions.ok(
  (
    select actor_kind = 'member'
      and actor_user_id = 'b3060000-0000-4000-8000-000000000001'
    from app_private.agent_runs
    where id = (select agent_run_id from pg_temp.b306_turn_claims)
  ),
  'the verified account freezes the real owner user as the run actor'
);
select extensions.is(
  (
    select trust_level from app_private.agent_messages
    where run_id = (select agent_run_id from pg_temp.b306_turn_claims)
      and message_kind = 'input'
  ),
  'trusted_member',
  'the cognitive input records verified member trust instead of external trust'
);

insert into pg_temp.b306_tool_context
select * from api.get_agent_turn_tool_context(
  (select organization_id from pg_temp.b306_turn_claims),
  (select agent_run_id from pg_temp.b306_turn_claims),
  (select job_attempt_id from pg_temp.b306_turn_claims),
  'b306-worker-member',
  (select lease_token from pg_temp.b306_turn_claims)
);

select extensions.is(
  (select jsonb_array_length(tool_definitions) from pg_temp.b306_tool_context),
  3,
  'the owner retains the same commercial resources needed to sell'
);
select extensions.ok(
  (
    select snapshot.actor_kind = 'member' and snapshot.actor_lane_enforced
    from app_private.agent_runs as run_value
    join app_private.conversation_agent_snapshots as snapshot
      on snapshot.organization_id = run_value.organization_id
     and snapshot.id = run_value.conversation_snapshot_id
    where run_value.id = (select agent_run_id from pg_temp.b306_turn_claims)
  ),
  'the verified owner run freezes an enforced member snapshot lane'
);

-- B3-006A functional journey; actor/channel setup comes from the real B3-002A fixture.
set local role postgres;
select app_private.ensure_customer_assistant_ingestion_tools('b3061000-0000-4000-8000-000000000001');
select extensions.is((select count(*)::integer from app_private.tool_contracts where organization_id='b3061000-0000-4000-8000-000000000001' and tool_name in ('catalog_ingestion_context','catalog_save_draft','catalog_apply_draft')),3,'all three native ingestion contracts registered');
select extensions.is(app_private.ensure_customer_assistant_ingestion_tools('b3061000-0000-4000-8000-000000000001'),(select current_version_id from app_private.agent_policies where organization_id='b3061000-0000-4000-8000-000000000001' and policy_key='customer_assistant'),'preparation is idempotent');
create temporary table pg_temp.ingestion_draft(result jsonb);
create temporary table pg_temp.ingestion_proposal(value jsonb);
insert into pg_temp.ingestion_proposal values($json$
{"units":[
 {"code":"piece","name_singular":"Pieza","name_plural":"Piezas","quantity_kind":"count","decimal_scale":0},
 {"code":"set","name_singular":"Set","name_plural":"Sets","quantity_kind":"count","decimal_scale":0}],
 "products":[{"key":"wheels","category":{"code":"wheels","name":"Ruedas"},"name":"Ruedas transaccionales",
 "attributes":[{"code":"brand","name":"Marca","value_type":"text","value":"Roadtrack"}],
 "variants":[
  {"key":"tyre","name":"Llanta","sku":"B306-TYRE","inventory":{"unit_code":"piece","opening_quantity":12,"location":{"code":"test","name":"Prueba"}},
   "prices":[{"unit_code":"piece","currency_code":"MXN","quantity_min":1,"pricing_status":"on_request"},{"unit_code":"set","currency_code":"MXN","quantity_min":1,"quantity_max":1,"pricing_status":"priced","calculation_method":"fixed_total","price_amount":11500}],
   "compositions":[{"unit_code":"piece","components":[{"variant_key":"tyre","quantity":1}]},{"unit_code":"set","components":[{"variant_key":"tyre","quantity":4}]}]},
  {"key":"rim","name":"Rin","sku":"B306-RIM","inventory":{"unit_code":"piece","opening_quantity":8,"location":{"code":"test","name":"Prueba"}},
   "prices":[{"unit_code":"piece","currency_code":"MXN","quantity_min":1,"pricing_status":"on_request"}],
   "compositions":[{"unit_code":"piece","components":[{"variant_key":"rim","quantity":1}]}]},
  {"key":"combo","name":"Combo","sku":"B306-COMBO",
   "prices":[{"unit_code":"set","currency_code":"MXN","quantity_min":1,"pricing_status":"on_request"}],
   "compositions":[{"unit_code":"set","components":[{"variant_key":"tyre","quantity":4},{"variant_key":"rim","quantity":4}]}]}
 ]}]}
$json$::jsonb);
create function pg_temp.save_draft(args jsonb, execution text) returns jsonb language sql as $$
 select app_private.catalog_save_draft_for_owner('b3061000-0000-4000-8000-000000000001',
 (select agent_run_id from pg_temp.b306_turn_claims),execution,args);
$$;
create function pg_temp.apply_draft(args jsonb) returns jsonb language sql as $$
 select app_private.catalog_apply_draft_for_owner('b3061000-0000-4000-8000-000000000001',
 (select agent_run_id from pg_temp.b306_turn_claims),'b306-apply',args);
$$;
select extensions.ok(not has_function_privilege('service_role','app_private.catalog_apply_draft_for_owner(uuid,uuid,text,jsonb)','EXECUTE'),'no bypass of leased tools');
select extensions.ok(not app_private.catalog_proposal_json_safe('{"image":"data:image/webp,AAAA"}'),'data URI rejected');
select extensions.ok(app_private.catalog_proposal_json_safe('{"notes":"Dato de la foto"}'),'ordinary cognitive JSON accepted');
insert into pg_temp.ingestion_draft select pg_temp.save_draft('{"proposal":{},"unresolved_fields":["modalidad"]}','b306-save-1');
select extensions.is((select result->>'status' from pg_temp.ingestion_draft),'collecting','A01 collecting');
select extensions.is(pg_temp.save_draft('{"proposal":{},"unresolved_fields":["modalidad"]}','b306-save-1'),(select result from pg_temp.ingestion_draft),'A07 replay same result');
select pg_temp.throws_sqlstate($$select pg_temp.save_draft('{"proposal":{"notes":"changed"},"unresolved_fields":[]}','b306-save-1')$$,'23514','A07 conflicting replay');
select pg_temp.throws_sqlstate($$select pg_temp.save_draft('{"proposal":{},"unresolved_fields":[]}','b306-duplicate')$$,'40001','A07 no duplicate initial draft');
select pg_temp.throws_sqlstate($$select pg_temp.save_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',99,'proposal',jsonb_build_object(),'unresolved_fields',jsonb_build_array()),'b306-stale')$$,'40001','A08 stale save rejected');
update pg_temp.ingestion_draft set result=pg_temp.save_draft(jsonb_build_object('draft_id',result->>'draft_id','expected_revision',1,'proposal',(select value from pg_temp.ingestion_proposal),'unresolved_fields',jsonb_build_array()),'b306-save-2');
select extensions.is((select result->>'revision' from pg_temp.ingestion_draft),'2','A02 revision advances');
select extensions.is((select result->>'status' from pg_temp.ingestion_draft),'needs_confirmation','A13 still requires confirmation');
select pg_temp.throws_sqlstate($$select pg_temp.apply_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',2,'owner_confirmed',true))$$,'42501','A13 same message cannot confirm');
select extensions.is((select count(*)::integer from app_private.products where organization_id='b3061000-0000-4000-8000-000000000001'),0,'no products before confirmation');
select api.complete_whatsapp_agent_turn((select organization_id from pg_temp.b306_turn_claims),(select job_attempt_id from pg_temp.b306_turn_claims),'b306-worker-member',(select lease_token from pg_temp.b306_turn_claims),'Resumen para confirmar.','b306-summary','{}');
-- No HTTP is executed: SQL outbox and transactional input records are rolled back.
insert into app_private.messages(id,organization_id,channel_connection_id,conversation_id,sender_participant_id,direction,content_kind,provider_message_type,external_message_id,deduplication_key,content,provider_context,status,provider_occurred_at,received_at,created_at,updated_at)
select 'b3062400-0000-4000-8000-000000000004',organization_id,channel_connection_id,conversation_id,id,
 'inbound','text','text','wamid.B306.confirm',extensions.digest('b306-confirm','sha256'),'{"text":{"body":"Confirmo el resumen"}}','{}','received',statement_timestamp(),statement_timestamp(),statement_timestamp(),statement_timestamp()
from app_private.conversation_participants where id='b3062300-0000-4000-8000-000000000002';
delete from pg_temp.b306_turn_claims;
insert into pg_temp.b306_turn_claims select * from api.claim_whatsapp_agent_turn('b306-worker-confirm','minimax','MiniMax-M3','minimax','MiniMax-M3',null,120,'b3061000-0000-4000-8000-000000000001');
select extensions.is((select count(*)::integer from pg_temp.b306_turn_claims),1,'confirmation claims a separate run');
select extensions.is((select jsonb_array_length(tool_definitions) from api.get_agent_turn_tool_context(
 (select organization_id from pg_temp.b306_turn_claims),(select agent_run_id from pg_temp.b306_turn_claims),
 (select job_attempt_id from pg_temp.b306_turn_claims),'b306-worker-confirm',(select lease_token from pg_temp.b306_turn_claims))),13,'existing owner chat adopts native tools on its next run');
select extensions.is((select count(*)::integer from app_private.conversation_agent_snapshots where organization_id='b3061000-0000-4000-8000-000000000001' and actor_kind='member'),2,'old snapshot preserved when upgrading owner policy');
select extensions.is((app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'{}')->'drafts'->0->>'revision'),'2','A03 persisted context across runs');
select pg_temp.throws_sqlstate($$select pg_temp.apply_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',1,'owner_confirmed',true))$$,'40001','A08 stale apply rejected');
select pg_temp.throws_sqlstate($$select pg_temp.apply_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',2,'owner_confirmed',false))$$,'42501','A13 confirmation required');
create temporary table pg_temp.ingestion_applied as select pg_temp.apply_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',2,'owner_confirmed',true)) as result;
select extensions.is((select result->>'catalog_status' from pg_temp.ingestion_applied),'draft','A04 catalog remains draft');
select extensions.is((select count(*)::integer from app_private.product_variants where organization_id='b3061000-0000-4000-8000-000000000001'),3,'A04 sellable identities');
select extensions.is((select count(*)::integer from app_private.inventory_items where organization_id='b3061000-0000-4000-8000-000000000001'),2,'A06 combo adds no stock item');
select extensions.is((select sum(on_hand_quantity)::integer from app_private.inventory_balances where organization_id='b3061000-0000-4000-8000-000000000001'),20,'A06 physical stock only');
select extensions.is((select count(*)::integer from app_private.inventory_compositions where organization_id='b3061000-0000-4000-8000-000000000001' and status='active'),4,'A06 compositions for each sale unit');
select extensions.is((select count(*)::integer from app_private.price_tiers where organization_id='b3061000-0000-4000-8000-000000000001' and pricing_status='on_request' and price_amount is null),3,'A05 no invented individual prices');
select extensions.is((select count(*)::integer from app_private.product_attribute_values where organization_id='b3061000-0000-4000-8000-000000000001' and value_text='Roadtrack'),1,'typed specifications saved');
select extensions.is(pg_temp.apply_draft(jsonb_build_object('draft_id',(select result->>'draft_id' from pg_temp.ingestion_draft),'expected_revision',2,'owner_confirmed',true)),(select result from pg_temp.ingestion_applied),'A07 apply replay returns original mapping');
select extensions.is((select count(*)::integer from app_private.products where organization_id='b3061000-0000-4000-8000-000000000001'),1,'A07 no duplicate product');
select extensions.is((select count(*)::integer from app_private.publications where organization_id='b3061000-0000-4000-8000-000000000001'),0,'A16 no implicit Facebook publication');
select pg_temp.throws_sqlstate($$select app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000002',(select agent_run_id from pg_temp.b306_turn_claims),'{}')$$,'42501','A10 cross-tenant context rejected');
update app_private.organization_memberships set role='admin' where organization_id='b3061000-0000-4000-8000-000000000001' and user_id='b3060000-0000-4000-8000-000000000001';
select pg_temp.throws_sqlstate($$select app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'{}')$$,'42501','A09 admin cannot use owner tools');
update app_private.organization_memberships set role='owner' where organization_id='b3061000-0000-4000-8000-000000000001' and user_id='b3060000-0000-4000-8000-000000000001';
create temporary table pg_temp.ingestion_conflict(id uuid);
with inserted as (
 insert into app_private.catalog_ingestion_drafts(organization_id,source_conversation_id,source_message_id,last_source_message_id,status,proposal,created_by_user_id)
 select 'b3061000-0000-4000-8000-000000000001','b3062200-0000-4000-8000-000000000002',
 'b3062400-0000-4000-8000-000000000002','b3062400-0000-4000-8000-000000000002','needs_confirmation',value,
 'b3060000-0000-4000-8000-000000000001' from pg_temp.ingestion_proposal returning id
) insert into pg_temp.ingestion_conflict select id from inserted;
select extensions.is(app_private.catalog_ingestion_execute('catalog.ingestion.apply.owner.v1',
 'b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'b306-conflict',
 jsonb_build_object('draft_id',(select id from pg_temp.ingestion_conflict),'expected_revision',1,'owner_confirmed',true))->'error'->>'code',
 'catalog_identity_conflict','A12 duplicate SKU returns recoverable tool error');
select extensions.is((select count(*)::integer from app_private.products where organization_id='b3061000-0000-4000-8000-000000000001'),1,'A12 failed application rolls back all partial products');
select extensions.is((select status from app_private.catalog_ingestion_drafts where id=(select id from pg_temp.ingestion_conflict)),'needs_confirmation','A12 failed draft stays recoverable');
-- Real PostgreSQL rejection paths. These are operational inputs, not external media fixtures.
create function pg_temp.apply_proposal(proposal_value jsonb) returns jsonb language plpgsql as $$
declare draft_id_value uuid;
begin
  insert into app_private.catalog_ingestion_drafts(organization_id,source_conversation_id,
    source_message_id,last_source_message_id,status,proposal,created_by_user_id)
  values('b3061000-0000-4000-8000-000000000001','b3062200-0000-4000-8000-000000000002',
    'b3062400-0000-4000-8000-000000000002','b3062400-0000-4000-8000-000000000002',
    'needs_confirmation',proposal_value,'b3060000-0000-4000-8000-000000000001') returning id into draft_id_value;
  return app_private.catalog_ingestion_execute('catalog.ingestion.apply.owner.v1',
    'b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),
    'negative-contract:'||draft_id_value::text,
    jsonb_build_object('draft_id',draft_id_value,'expected_revision',1,'owner_confirmed',true));
end;
$$;
create temporary table pg_temp.unkeyed_proposal as
select value #- '{products,0,variants,0,sku}' #- '{products,0,variants,1,sku}'
  #- '{products,0,variants,2,sku}' as value from pg_temp.ingestion_proposal;
select extensions.is(
  pg_temp.apply_proposal(jsonb_set((select value from pg_temp.unkeyed_proposal),test.path,test.value))
    ->'error'->>'code',test.error_code,test.label)
from (values
  ('{products}'::text[],'[]'::jsonb,'catalog_contract_invalid','A14 empty products rejected'),
  ('{products,0,variants,1,key}','"tyre"','catalog_contract_invalid','A14 duplicate variant key rejected'),
  ('{products,0,variants,0,inventory,opening_quantity}','-1','catalog_contract_invalid','A14 negative opening stock rejected'),
  ('{products,0,variants,0,compositions}','[]','catalog_contract_invalid','A06 no sale without inventory composition'),
  ('{products,0,variants,2,compositions}','[]','catalog_contract_invalid','A06 no combo sale without composition'),
  ('{products,0,variants,2,compositions,0,components,0,variant_key}','"combo"','catalog_contract_invalid','A06 no combo self-consumption'),
  ('{products,0,variants,0,prices,0,currency_code}','"INVALID"','catalog_contract_invalid','A14 invalid currency rejected'),
  ('{products,0,variants,0,prices,0,price_amount}','100','catalog_contract_invalid','A05 on-request cannot conceal a numeric price'),
  ('{products,0,variants,0,inventory}','{}','catalog_contract_invalid','A14 missing opening inventory contract rejected'),
  ('{products,0,media}','[{"media_asset_id":"b3069999-0000-4000-8000-000000000001","role":"primary","ordinal":0,"allow_public":false}]','not_authorized_or_confirmation_missing','A10 unverified media identity rejected'),
  ('{products,0,media}','[{"url":"https://untrusted.example.invalid/photo.webp"}]','catalog_contract_invalid','A10 arbitrary media URL rejected'),
  ('{units,0,name_singular}','"Renamed"','catalog_contract_invalid','A18 no overwrite of unit dictionary contract'),
  ('{products,0,attributes}','[{"name":"Missing code","value_type":"text","value":"x"}]','catalog_contract_invalid','A14 incomplete attribute rejected'),
  ('{products,0,variants,0,prices}','[]','catalog_contract_invalid','A05 absent price requires clarification')
) as test(path,value,error_code,label);
select extensions.is((select count(*)::integer from app_private.products where organization_id='b3061000-0000-4000-8000-000000000001'),1,'A14 all rejected proposals leave no partial products');
select extensions.is((select sum(on_hand_quantity)::integer from app_private.inventory_balances where organization_id='b3061000-0000-4000-8000-000000000001'),20,'A14 all rejected proposals leave stock unchanged');
select extensions.is(jsonb_array_length(api.get_facebook_catalog_admin_page(
  'b3061000-0000-4000-8000-000000000001','b3060000-0000-4000-8000-000000000001')->'items'),3,'owner panel includes all three draft offers');
update app_private.organization_memberships set role='admin' where organization_id='b3061000-0000-4000-8000-000000000001' and user_id='b3060000-0000-4000-8000-000000000001';
select pg_temp.throws_sqlstate($$select api.get_facebook_catalog_admin_page('b3061000-0000-4000-8000-000000000001','b3060000-0000-4000-8000-000000000001')$$,'42501','private panel is owner-only even for another membership role');
update app_private.organization_memberships set role='owner' where organization_id='b3061000-0000-4000-8000-000000000001' and user_id='b3060000-0000-4000-8000-000000000001';
select pg_temp.throws_sqlstate($$select app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'{"offset":-1}')$$,'22023','context rejects negative pagination');
select pg_temp.throws_sqlstate($$select app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'{"offset":1000001}')$$,'22023','context rejects unbounded pagination');
select extensions.ok(not has_table_privilege('service_role','app_private.catalog_ingestion_commands','INSERT,UPDATE,DELETE,SELECT'),'command ledger has no direct backend bypass');
create temporary table pg_temp.ingestion_auto_skus as select pg_temp.apply_proposal(value) as result from pg_temp.unkeyed_proposal;
select extensions.is((select result->>'ok' from pg_temp.ingestion_auto_skus),'true','A04 complete proposal does not require the owner to invent SKUs');
select extensions.is((select count(distinct variant->>'sku')::integer from pg_temp.ingestion_auto_skus,
  lateral jsonb_array_elements(result->'products'->0->'variants') as variant),3,'A04 three distinct automatic SKUs');
select extensions.is((select count(*)::integer from app_private.publications where organization_id='b3061000-0000-4000-8000-000000000001'),0,'A16 automatic SKU creation still does not publish');
create temporary table pg_temp.ingestion_native_failure as select * from api.execute_whatsapp_tool_call(
 'b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),
 (select job_attempt_id from pg_temp.b306_turn_claims),'b306-worker-confirm',(select lease_token from pg_temp.b306_turn_claims),
 'minimax','b306-native-request','b306-native-call','catalog_apply_draft',1,
 jsonb_build_object('draft_id',(select id from pg_temp.ingestion_conflict),'expected_revision',1,'owner_confirmed',true),'{}','{}');
select extensions.is((select tool_status from pg_temp.ingestion_native_failure),'failed','native dispatcher returns failed on rejected application');
select extensions.is((select tool_result->'error'->>'code' from pg_temp.ingestion_native_failure),'catalog_identity_conflict','native continuation preserves actionable error');
select extensions.is((select effect_certainty from app_private.tool_executions where id=(select tool_execution_id from pg_temp.ingestion_native_failure)),'confirmed_not_applied','failed tool never claims confirmed effect');
select extensions.is((select count(*)::integer from app_private.agent_messages where run_id=(select agent_run_id from pg_temp.b306_turn_claims) and message_kind='tool_result'),1,'tool result is durable for the next provider attempt');
select pg_temp.throws_sqlstate($$select app_private.catalog_ingestion_context_for_owner('b3061000-0000-4000-8000-000000000001',(select agent_run_id from pg_temp.b306_turn_claims),'{}')$$,'42501','completed native call cannot bypass runtime phase ownership');

-- B3-006E: WhatsApp does not render markdown tables. The agent used to emit pipe tables when
-- summarizing catalog drafts, which arrived at the customer as raw |---|---| characters. Pin the
-- formatting rule into the customer_assistant.system prompt and verify it survives idempotently.
select extensions.ok(
  exists (
    select 1
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'
      and strpos(content_template, '## Formato de respuesta en WhatsApp') > 0
  ),
  'E1 customer_assistant.system prompt includes the WhatsApp formatting rule'
);
select extensions.ok(
  exists (
    select 1
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'
      and strpos(content_template, 'no renderiza tablas markdown') > 0
  ),
  'E2 the rule explicitly forbids markdown pipe tables'
);
select extensions.ok(
  exists (
    select 1
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'
      and strpos(content_template, 'blockquotes') > 0
      and strpos(content_template, 'headings') > 0
  ),
  'E3 the rule explicitly forbids blockquotes and headings'
);
select extensions.ok(
  exists (
    select 1
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'
      and strpos(content_template, 'viñetas') > 0
      and strpos(content_template, 'numeración') > 0
  ),
  'E4 the rule tells the agent to use bullets or numbered lists'
);
select extensions.is(
  (select encode(content_hash, 'hex')
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'),
  encode(extensions.digest(
    convert_to(
      (select content_template
        from app_private.prompt_versions
        where prompt_key = 'customer_assistant.system'
          and organization_id = 'b3061000-0000-4000-8000-000000000001'),
      'UTF8'
    ),
    'sha256'
  ), 'hex'),
  'E5 content_hash matches sha256 of content_template'
);

do $$
declare
  before_length integer;
  after_length integer;
begin
  set local search_path = '';

  select length(content_template) into before_length
  from app_private.prompt_versions
  where prompt_key = 'customer_assistant.system'
    and organization_id = 'b3061000-0000-4000-8000-000000000001';

  update app_private.prompt_versions
  set content_template = content_template,
      content_hash = content_hash
  where prompt_key = 'customer_assistant.system'
    and organization_id = 'b3061000-0000-4000-8000-000000000001';

  select length(content_template) into after_length
  from app_private.prompt_versions
  where prompt_key = 'customer_assistant.system'
    and organization_id = 'b3061000-0000-4000-8000-000000000001';
end
$$;

select extensions.is(
  (select count(*)::integer
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'),
  1,
  'E6 idempotent re-apply does not create duplicate prompt rows'
);
select extensions.is(
  (select (length(content_template) - strpos(content_template, '## Formato de respuesta en WhatsApp') + 1)::integer
    from app_private.prompt_versions
    where prompt_key = 'customer_assistant.system'
      and organization_id = 'b3061000-0000-4000-8000-000000000001'),
  1,
  'E7 the formatting rule marker appears in the prompt template'
);

select * from extensions.finish();
rollback;
