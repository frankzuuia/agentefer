begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(47);

select extensions.has_column(
  'app_private', 'outbox_events', 'lease_owner',
  'WhatsApp outbox has a private worker lease owner'
);
select extensions.has_column(
  'app_private', 'outbox_events', 'lease_token',
  'WhatsApp outbox has an unguessable lease token'
);
select extensions.has_function(
  'app_private', 'ensure_customer_assistant_policy', array['uuid'],
  'tenant policy bootstrap exists outside the Data API'
);
select extensions.has_function(
  'api', 'claim_whatsapp_agent_turn',
  array['text', 'text', 'text', 'text', 'text', 'text', 'integer', 'uuid'],
  'durable WhatsApp agent turn claim exists'
);
select extensions.has_function(
  'api', 'recover_expired_whatsapp_agent_turns',
  array['text', 'integer', 'integer', 'uuid'],
  'bounded WhatsApp cognitive lease recovery exists'
);
select extensions.has_function(
  'api', 'complete_whatsapp_agent_turn',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'jsonb'],
  'atomic WhatsApp agent completion exists'
);
select extensions.has_function(
  'api', 'checkpoint_whatsapp_agent_turn',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'jsonb'],
  'output-limit checkpoint RPC exists'
);
select extensions.has_function(
  'api', 'claim_whatsapp_outbox_event', array['text', 'integer', 'integer', 'uuid'],
  'tenant-scoped WhatsApp outbox claim exists'
);
select extensions.has_function(
  'api', 'record_whatsapp_outbox_result',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text', 'text', 'integer'],
  'WhatsApp provider result settlement exists'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)',
    'EXECUTE'
  ),
  'service role can claim cognitive turns'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot claim cognitive turns'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.recover_expired_whatsapp_agent_turns(text,integer,integer,uuid)',
    'EXECUTE'
  ),
  'service role can recover expired cognitive leases'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.recover_expired_whatsapp_agent_turns(text,integer,integer,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot operate lease recovery'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.complete_whatsapp_agent_turn(uuid,uuid,text,uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  'service role can complete cognitive turns'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.complete_whatsapp_agent_turn(uuid,uuid,text,uuid,text,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated users cannot forge cognitive completions'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_whatsapp_outbox_event(text,integer,integer,uuid)',
    'EXECUTE'
  ),
  'service role can claim WhatsApp effects'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_whatsapp_outbox_event(text,integer,integer,uuid)',
    'EXECUTE'
  ),
  'authenticated users cannot retrieve a channel credential'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.record_whatsapp_outbox_result(uuid,uuid,text,uuid,text,text,text,integer)',
    'EXECUTE'
  ),
  'service role can settle WhatsApp effects'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.record_whatsapp_outbox_result(uuid,uuid,text,uuid,text,text,text,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot settle WhatsApp effects'
);

set local role postgres;

insert into auth.users (id)
values ('b4040000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4041000-0000-4000-8000-000000000001',
  'B4 WhatsApp AI Alpha',
  'b4040000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values (
  'b4041000-0000-4000-8000-000000000002',
  'b4041000-0000-4000-8000-000000000001',
  'b4040000-0000-4000-8000-000000000001',
  'owner',
  'active',
  statement_timestamp()
);

set constraints all immediate;
set local role service_role;

select *
from api.register_meta_application(
  'b4041000-0000-4000-8000-000000000001',
  '216409300084004',
  'B4 WhatsApp AI App',
  'v26.0',
  'b404-app-secret-0123456789abcdef',
  'b404-verify-token-0123456789',
  'b4040000-0000-4000-8000-000000000001',
  'b404-register-app',
  'b404-register-app-trace'
);

select *
from api.accept_meta_webhook_challenge(
  (
    select endpoint_key
    from api.meta_webhook_endpoints
    where organization_id = 'b4041000-0000-4000-8000-000000000001'
  ),
  'subscribe',
  'b404-verify-token-0123456789',
  'b404-challenge',
  'b404-challenge-trace'
);

select *
from api.register_meta_whatsapp_connection(
  'b4041000-0000-4000-8000-000000000001',
  (
    select id
    from api.meta_applications
    where organization_id = 'b4041000-0000-4000-8000-000000000001'
      and external_app_id = '216409300084004'
  ),
  '105616013008004',
  '112038437449404',
  '+52 664 555 0404',
  'B4 WhatsApp AI',
  'GREEN',
  'APPROVED',
  'SYSTEM_USER',
  array['whatsapp_business_management', 'whatsapp_business_messaging'],
  statement_timestamp() + interval '30 days',
  statement_timestamp() + interval '30 days',
  'b404-whatsapp-access-token-0123456789abcdef',
  'b4040000-0000-4000-8000-000000000001',
  'b404-register-channel',
  'b404-register-channel-trace'
);

set local role postgres;
set constraints all deferred;

insert into app_private.contacts (
  id, organization_id, display_name, preferred_locale, status
)
values (
  'b4042000-0000-4000-8000-000000000001',
  'b4041000-0000-4000-8000-000000000001',
  'Cliente B404',
  'es-MX',
  'active'
);

insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name, status, last_seen_at
)
select
  'b4043000-0000-4000-8000-000000000001',
  'b4041000-0000-4000-8000-000000000001',
  connection_value.id,
  '5216645550404',
  'contact',
  'b4042000-0000-4000-8000-000000000001',
  'provider_observed',
  'Cliente B404',
  'active',
  statement_timestamp()
from app_private.channel_connections as connection_value
where connection_value.organization_id = 'b4041000-0000-4000-8000-000000000001'
  and connection_value.channel = 'whatsapp';

insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  status, opened_at, last_activity_at, last_inbound_at,
  service_window_expires_at, created_at, updated_at
)
select
  'b4044000-0000-4000-8000-000000000001',
  'b4041000-0000-4000-8000-000000000001',
  identity_value.channel_connection_id,
  identity_value.id,
  'open',
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp() + interval '24 hours',
  statement_timestamp(),
  statement_timestamp()
from app_private.channel_identities as identity_value
where identity_value.id = 'b4043000-0000-4000-8000-000000000001';

insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id,
  joined_at, created_at
)
select
  'b4045000-0000-4000-8000-000000000001',
  conversation_value.organization_id,
  conversation_value.channel_connection_id,
  conversation_value.id,
  'identity',
  'customer',
  conversation_value.primary_channel_identity_id,
  statement_timestamp(),
  statement_timestamp()
from app_private.conversations as conversation_value
where conversation_value.id = 'b4044000-0000-4000-8000-000000000001';

insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b4046000-0000-4000-8000-000000000001',
  participant_value.organization_id,
  participant_value.channel_connection_id,
  participant_value.conversation_id,
  participant_value.id,
  'inbound',
  'text',
  'text',
  'wamid.B404.hello.1',
  extensions.digest(convert_to('b404-message-1', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', 'hola')),
  '{}'::jsonb,
  'received',
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b4045000-0000-4000-8000-000000000001';

select extensions.ok(
  app_private.ensure_customer_assistant_policy(
    'b4041000-0000-4000-8000-000000000001'
  ) is not null,
  'policy bootstrap creates the initial tenant policy'
);

create temporary table pg_temp.b404_policy_ids (
  policy_version_id uuid primary key
) on commit drop;
insert into pg_temp.b404_policy_ids
select app_private.ensure_customer_assistant_policy(
  'b4041000-0000-4000-8000-000000000001'
);

select extensions.is(
  app_private.ensure_customer_assistant_policy(
    'b4041000-0000-4000-8000-000000000001'
  ),
  (select policy_version_id from pg_temp.b404_policy_ids),
  'policy bootstrap is idempotent'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.agent_policies
    where organization_id = 'b4041000-0000-4000-8000-000000000001'
      and policy_key = 'customer_assistant'
  ),
  1,
  'one organization receives exactly one customer assistant policy'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.prompt_versions
    where organization_id = 'b4041000-0000-4000-8000-000000000001'
      and prompt_key = 'customer_assistant.system'
  ),
  1,
  'idempotent bootstrap creates one prompt version'
);

create temporary table pg_temp.b404_turn_claims (
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
grant select, insert on pg_temp.b404_turn_claims to service_role;

set local role service_role;
insert into pg_temp.b404_turn_claims
select *
from api.claim_whatsapp_agent_turn(
  'b404-worker-ai',
  'minimax',
  'MiniMax-M3',
  'minimax',
  'MiniMax-M3',
  null,
  120,
  'b4041000-0000-4000-8000-000000000001'::uuid
);

select extensions.is(
  (select count(*)::integer from pg_temp.b404_turn_claims),
  1,
  'one normalized inbound message claims one cognitive turn'
);
select extensions.is(
  (select provider from pg_temp.b404_turn_claims),
  'minimax',
  'claim preserves the configured provider'
);
select extensions.is(
  (select model from pg_temp.b404_turn_claims),
  'MiniMax-M3',
  'claim preserves the exact configured model ID'
);
select extensions.is(
  (select conversation_history #>> '{0,content,text,body}' from pg_temp.b404_turn_claims),
  'hola',
  'claim returns real untrusted conversation content to the cognitive adapter'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer
    from app_private.agent_runs
    where organization_id = 'b4041000-0000-4000-8000-000000000001'
      and trigger_message_id = 'b4046000-0000-4000-8000-000000000001'
  ),
  1,
  'a trigger message is represented by one durable agent run'
);

set local role service_role;
select extensions.is(
  (
    select count(*)::integer
    from api.claim_whatsapp_agent_turn(
      'b404-worker-ai-other',
      'openai',
      'future-model',
      'openai',
      'future-model',
      null,
      120,
      'b4041000-0000-4000-8000-000000000001'::uuid
    )
  ),
  0,
  'a processing trigger cannot be claimed twice'
);

select extensions.is(
  (
    select outbound_message_count
    from api.complete_whatsapp_agent_turn(
      (select organization_id from pg_temp.b404_turn_claims),
      (select job_attempt_id from pg_temp.b404_turn_claims),
      'b404-worker-ai',
      (select lease_token from pg_temp.b404_turn_claims),
      '¡Hola! ¿Qué producto estás buscando?',
      'minimax-request-b404-1',
      jsonb_build_object('total_tokens', 20)
    )
  ),
  1,
  'provider-visible output creates one transport-sized message'
);

set local role postgres;
select extensions.is(
  (
    select status
    from app_private.messages
    where direction = 'outbound'
      and provider_context ->> 'agent_run_id' = (
        select agent_run_id::text from pg_temp.b404_turn_claims
      )
  ),
  'queued',
  'in-window assistant output is queued for transport'
);
select extensions.is(
  (
    select policy_status || '|' || status
    from app_private.outbox_events
    where payload ->> 'agent_run_id' = (
      select agent_run_id::text from pg_temp.b404_turn_claims
    )
  ),
  'allowed|pending',
  'outbox policy gate records the open customer service window'
);

create temporary table pg_temp.b404_outbox_claims (
  organization_id uuid,
  outbox_event_id uuid,
  message_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_number integer,
  api_version text,
  phone_number_id text,
  destination text,
  payload jsonb,
  access_token text,
  correlation_id text
) on commit drop;
grant select, insert on pg_temp.b404_outbox_claims to service_role;

set local role service_role;
insert into pg_temp.b404_outbox_claims
select * from api.claim_whatsapp_outbox_event(
  'b404-worker-outbox',
  120,
  8,
  'b4041000-0000-4000-8000-000000000001'::uuid
);

select extensions.is(
  (select count(*)::integer from pg_temp.b404_outbox_claims),
  1,
  'one approved outbox effect receives one lease'
);
select extensions.is(
  (select destination from pg_temp.b404_outbox_claims),
  '5216645550404',
  'outbox destination comes from the conversation tenant identity'
);
select extensions.ok(
  extensions.digest(
    convert_to((select access_token from pg_temp.b404_outbox_claims), 'UTF8'),
    'sha256'
  ) = extensions.digest(
    convert_to('b404-whatsapp-access-token-0123456789abcdef', 'UTF8'),
    'sha256'
  ),
  'outbox claim resolves the exact channel token from Vault'
);

select extensions.is(
  (
    select outbox_status || '|' || message_status
    from api.record_whatsapp_outbox_result(
      (select organization_id from pg_temp.b404_outbox_claims),
      (select outbox_event_id from pg_temp.b404_outbox_claims),
      'b404-worker-outbox',
      (select lease_token from pg_temp.b404_outbox_claims),
      'succeeded',
      'wamid.B404.reply.1',
      null,
      5
    )
  ),
  'succeeded|accepted',
  'confirmed Meta response atomically settles outbox and message state'
);

set local role postgres;
select extensions.is(
  (
    select status
    from app_private.messages
    where external_message_id = 'wamid.B404.reply.1'
  ),
  'accepted',
  'provider wamid is persisted on the outbound domain message'
);
select extensions.ok(
  not exists (
    select 1
    from app_private.outbox_events
    where payload::text like '%b404-whatsapp-access-token%'
  ),
  'decrypted Vault token is never persisted in the outbox payload'
);

insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b4046000-0000-4000-8000-000000000002',
  participant_value.organization_id,
  participant_value.channel_connection_id,
  participant_value.conversation_id,
  participant_value.id,
  'inbound',
  'text',
  'text',
  'wamid.B404.expired.2',
  extensions.digest(convert_to('b404-message-2', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', 'hola de nuevo')),
  '{}'::jsonb,
  'received',
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b4045000-0000-4000-8000-000000000001';

truncate pg_temp.b404_turn_claims;
set local role service_role;
insert into pg_temp.b404_turn_claims
select *
from api.claim_whatsapp_agent_turn(
  'b404-worker-expired',
  'openai',
  'future-openai-model',
  'openai',
  'future-openai-model',
  null,
  120,
  'b4041000-0000-4000-8000-000000000001'::uuid
);
select extensions.is(
  (select count(*)::integer from pg_temp.b404_turn_claims),
  1,
  'a later inbound message receives its own cognitive run'
);

set local role postgres;
update app_private.conversations
set service_window_expires_at = statement_timestamp() - interval '1 second'
where id = 'b4044000-0000-4000-8000-000000000001';

set local role service_role;
select extensions.is(
  (
    select outbound_message_count
    from api.complete_whatsapp_agent_turn(
      (select organization_id from pg_temp.b404_turn_claims),
      (select job_attempt_id from pg_temp.b404_turn_claims),
      'b404-worker-expired',
      (select lease_token from pg_temp.b404_turn_claims),
      'Respuesta que requiere plantilla fuera de ventana',
      'openai-request-b404-2',
      '{}'::jsonb
    )
  ),
  1,
  'LLM output remains durable even when transport policy blocks it'
);

set local role postgres;
select extensions.is(
  (
    select policy_status || '|' || status
    from app_private.outbox_events
    where payload ->> 'agent_run_id' = (
      select agent_run_id::text from pg_temp.b404_turn_claims
    )
  ),
  'blocked|blocked',
  'expired service window blocks a free-form WhatsApp send'
);

set local role service_role;
select extensions.is(
  (
    select count(*)::integer
    from api.claim_whatsapp_outbox_event(
      'b404-worker-outbox-expired',
      120,
      8,
      'b4041000-0000-4000-8000-000000000001'::uuid
    )
  ),
  0,
  'blocked outbox effects are never disclosed to the transport worker'
);

select extensions.ok(
  pg_get_functiondef(
    'api.claim_whatsapp_agent_turn(text,text,text,text,text,text,integer,uuid)'::regprocedure
  ) not ilike '%access_token%',
  'cognitive turn claim cannot read or return Meta access tokens'
);

set local role postgres;
insert into app_private.messages (
  id, organization_id, channel_connection_id, conversation_id,
  sender_participant_id, direction, content_kind, provider_message_type,
  external_message_id, deduplication_key, content, provider_context,
  status, provider_occurred_at, received_at, created_at, updated_at
)
select
  'b4046000-0000-4000-8000-000000000003',
  participant_value.organization_id,
  participant_value.channel_connection_id,
  participant_value.conversation_id,
  participant_value.id,
  'inbound',
  'text',
  'text',
  'wamid.B404.recovery.3',
  extensions.digest(convert_to('b404-message-3', 'UTF8'), 'sha256'),
  jsonb_build_object('text', jsonb_build_object('body', 'recuperar turno')),
  '{}'::jsonb,
  'received',
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp(),
  statement_timestamp()
from app_private.conversation_participants as participant_value
where participant_value.id = 'b4045000-0000-4000-8000-000000000001';

truncate pg_temp.b404_turn_claims;
set local role service_role;
insert into pg_temp.b404_turn_claims
select *
from api.claim_whatsapp_agent_turn(
  'b404-worker-crashed',
  'minimax',
  'MiniMax-M3',
  'minimax',
  'MiniMax-M3',
  null,
  690,
  'b4041000-0000-4000-8000-000000000001'::uuid
);
select extensions.is(
  (select count(*)::integer from pg_temp.b404_turn_claims),
  1,
  'a third inbound turn receives the lease that will be recovered'
);

set local role postgres;
update app_private.agent_jobs
set lease_expires_at = statement_timestamp() - interval '1 second'
where id = (select agent_job_id from pg_temp.b404_turn_claims);

create temporary table pg_temp.b404_recoveries (
  scanned_count integer,
  recovered_count integer,
  retryable_count integer,
  failed_count integer,
  uncertain_count integer
) on commit drop;
grant select, insert on pg_temp.b404_recoveries to service_role;

set local role service_role;
insert into pg_temp.b404_recoveries
select *
from api.recover_expired_whatsapp_agent_turns(
  'b404-recovery-controller',
  5,
  25,
  'b4041000-0000-4000-8000-000000000001'::uuid
);
select extensions.is(
  (
    select scanned_count || '|' || recovered_count || '|' || retryable_count || '|' ||
      failed_count || '|' || uncertain_count
    from pg_temp.b404_recoveries
  ),
  '1|1|1|0|0',
  'expired pre-effect WhatsApp lease is recovered as retryable exactly once'
);

set local role postgres;
select extensions.is(
  (
    select job_value.status || '|' || run_value.status || '|' ||
      (job_value.worker_id is null)::text || '|' ||
      (job_value.lease_token is null)::text || '|' ||
      (job_value.lease_expires_at is null)::text
    from app_private.agent_jobs as job_value
    join app_private.agent_runs as run_value
      on run_value.organization_id = job_value.organization_id
     and run_value.id = job_value.run_id
    where job_value.id = (select agent_job_id from pg_temp.b404_turn_claims)
  ),
  'retryable|waiting_provider|true|true|true',
  'automatic recovery clears ownership and restores durable retry states'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.agent_runs
    where trigger_message_id = 'b4046000-0000-4000-8000-000000000003'
  ),
  1,
  'lease recovery never creates a duplicate run for the same inbound message'
);

select * from extensions.finish();
rollback;
