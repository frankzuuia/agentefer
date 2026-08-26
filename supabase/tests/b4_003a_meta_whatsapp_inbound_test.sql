begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(77);

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

select extensions.has_column(
  'app_private', 'meta_webhook_deliveries', 'lease_owner',
  'raw delivery inbox has a private worker lease owner'
);
select extensions.has_column(
  'app_private', 'meta_webhook_deliveries', 'lease_token',
  'raw delivery inbox has an unguessable lease token'
);
select extensions.has_column(
  'app_private', 'meta_webhook_deliveries', 'lease_expires_at',
  'raw delivery inbox has an expiring lease'
);
select extensions.has_column(
  'app_private', 'inbound_events', 'lease_owner',
  'normalized event inbox has a private worker lease owner'
);
select extensions.has_column(
  'app_private', 'inbound_events', 'lease_token',
  'normalized event inbox has an unguessable lease token'
);
select extensions.has_column(
  'app_private', 'inbound_events', 'lease_expires_at',
  'normalized event inbox has an expiring lease'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'meta_webhook_deliveries_lease_shape_valid'
  ),
  'raw delivery leases are protected by a lifecycle constraint'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'inbound_events_lease_shape_valid'
  ),
  'normalized event leases are protected by a lifecycle constraint'
);
select extensions.ok(
  to_regclass('app_private.meta_webhook_deliveries_object_claim_idx') is not null,
  'raw delivery claim path has a partial operational index'
);
select extensions.ok(
  to_regclass('app_private.inbound_events_type_claim_idx') is not null,
  'typed inbound event claim path has a partial operational index'
);

select extensions.has_function(
  'api', 'claim_meta_webhook_delivery',
  array['text', 'text', 'integer', 'integer'],
  'raw Meta delivery claim RPC exists'
);
select extensions.has_function(
  'api', 'route_meta_whatsapp_delivery',
  array['uuid', 'uuid'],
  'WhatsApp delivery router RPC exists'
);
select extensions.has_function(
  'api', 'fail_meta_webhook_delivery',
  array['uuid', 'uuid', 'text', 'boolean', 'integer', 'integer'],
  'raw delivery failure RPC exists'
);
select extensions.has_function(
  'api', 'claim_meta_whatsapp_message_event',
  array['text', 'integer', 'integer'],
  'WhatsApp message claim RPC exists'
);
select extensions.has_function(
  'api', 'normalize_meta_whatsapp_message',
  array['uuid', 'uuid'],
  'WhatsApp message normalization RPC exists'
);
select extensions.has_function(
  'api', 'fail_meta_whatsapp_message_event',
  array['uuid', 'uuid', 'text', 'boolean', 'integer', 'integer'],
  'WhatsApp message failure RPC exists'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_meta_webhook_delivery(text,text,integer,integer)',
    'EXECUTE'
  ),
  'service role can claim raw deliveries'
);
select extensions.ok(
  has_function_privilege(
    'service_role', 'api.route_meta_whatsapp_delivery(uuid,uuid)', 'EXECUTE'
  ),
  'service role can route WhatsApp deliveries'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.fail_meta_webhook_delivery(uuid,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'service role can record raw delivery failures'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_meta_whatsapp_message_event(text,integer,integer)',
    'EXECUTE'
  ),
  'service role can claim WhatsApp message events'
);
select extensions.ok(
  has_function_privilege(
    'service_role', 'api.normalize_meta_whatsapp_message(uuid,uuid)', 'EXECUTE'
  ),
  'service role can normalize WhatsApp message events'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.fail_meta_whatsapp_message_event(uuid,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'service role can record WhatsApp message failures'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_meta_webhook_delivery(text,text,integer,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot claim raw deliveries'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated', 'api.route_meta_whatsapp_delivery(uuid,uuid)', 'EXECUTE'
  ),
  'authenticated users cannot route WhatsApp deliveries'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.fail_meta_webhook_delivery(uuid,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot mutate raw delivery failures'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_meta_whatsapp_message_event(text,integer,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot claim WhatsApp events'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated', 'api.normalize_meta_whatsapp_message(uuid,uuid)', 'EXECUTE'
  ),
  'authenticated users cannot normalize WhatsApp events'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.fail_meta_whatsapp_message_event(uuid,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'authenticated users cannot mutate WhatsApp event failures'
);
select extensions.ok(
  pg_get_function_result(
    'api.claim_meta_webhook_delivery(text,text,integer,integer)'::regprocedure
  ) not ilike '%payload%',
  'raw customer payload never crosses the database claim boundary'
);

set local role postgres;

insert into auth.users (id)
values ('b4030000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4031000-0000-4000-8000-000000000001',
  'B4 WhatsApp Inbound Alpha',
  'b4030000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values (
  'b4031000-0000-4000-8000-000000000002',
  'b4031000-0000-4000-8000-000000000001',
  'b4030000-0000-4000-8000-000000000001',
  'owner',
  'active',
  statement_timestamp()
);

set constraints all immediate;
set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4031000-0000-4000-8000-000000000001',
      '216409300083003',
      'B4 WhatsApp Inbound App',
      'v26.0',
      'b403-app-secret-0123456789abcdef',
      'b403-verify-token-0123456789',
      'b4030000-0000-4000-8000-000000000001',
      'b403-register-app',
      'b403-register-app-trace'
    )
  ),
  1,
  'tenant Meta application registers through the Vault-backed RPC'
);
select extensions.lives_ok(
  format(
    'select * from api.accept_meta_webhook_challenge(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4031000-0000-4000-8000-000000000001'
    ),
    'subscribe',
    'b403-verify-token-0123456789',
    'b403-challenge',
    'b403-challenge-trace'
  ),
  'tenant webhook endpoint verifies through its Vault secret'
);
select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_whatsapp_connection(
      'b4031000-0000-4000-8000-000000000001',
      (
        select id
        from api.meta_applications
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
          and external_app_id = '216409300083003'
      ),
      '105616013007003',
      '112038437449303',
      '+52 664 555 0303',
      'B4 WhatsApp Inbound',
      'GREEN',
      'APPROVED',
      'SYSTEM_USER',
      array['whatsapp_business_management', 'whatsapp_business_messaging'],
      statement_timestamp() + interval '30 days',
      statement_timestamp() + interval '30 days',
      'b403-whatsapp-access-token-0123456789abcdef',
      'b4030000-0000-4000-8000-000000000001',
      'b403-register-channel',
      'b403-register-channel-trace'
    )
  ),
  1,
  'validated WhatsApp channel registers through the real onboarding RPC'
);

set local role postgres;

select extensions.is(
  (
    select concat_ws(
      '|', external_app_id, external_account_id, external_sender_id, status
    )
    from app_private.channel_connections
    where organization_id = 'b4031000-0000-4000-8000-000000000001'
      and channel = 'whatsapp'
  ),
  '216409300083003|105616013007003|112038437449303|active',
  'channel preserves the exact App, WABA and Phone Number routing tuple'
);

-- Restore the production default after the fixture membership integrity check.
-- Conversation and primary-participant constraint triggers are intentionally
-- deferred so both rows can be created atomically by one normalization RPC.
set constraints all deferred;

create temporary table pg_temp.b403_payloads (
  fixture_name text primary key,
  raw_body text not null
) on commit drop;

insert into pg_temp.b403_payloads (fixture_name, raw_body)
values
(
  'text',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '105616013007003',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object(
                'display_phone_number', '+52 664 555 0303',
                'phone_number_id', '112038437449303'
              ),
              'contacts', jsonb_build_array(
                jsonb_build_object(
                  'profile', jsonb_build_object('name', 'Cliente B403'),
                  'wa_id', '5216645550303'
                )
              ),
              'messages', jsonb_build_array(
                jsonb_build_object(
                  'from', '5216645550303',
                  'id', 'wamid.B403.text.1',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'text', jsonb_build_object('body', 'Mensaje confidencial B403'),
                  'type', 'text',
                  'referral', jsonb_build_object(
                    'source_id', 'publication-B403',
                    'source_type', 'ad'
                  )
                )
              )
            )
          )
        )
      )
    )
  )::text
),
(
  'text_replay',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '105616013007003',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object(
                'display_phone_number', '+52 664 555 0303',
                'phone_number_id', '112038437449303'
              ),
              'messages', jsonb_build_array(
                jsonb_build_object(
                  'from', '5216645550303',
                  'id', 'wamid.B403.text.1',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'text', jsonb_build_object('body', 'Replay que no debe reemplazar evidencia'),
                  'type', 'text'
                )
              )
            )
          )
        )
      )
    )
  )::text
),
(
  'image',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '105616013007003',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object(
                'display_phone_number', '+52 664 555 0303',
                'phone_number_id', '112038437449303'
              ),
              'messages', jsonb_build_array(
                jsonb_build_object(
                  'from', '5216645550303',
                  'id', 'wamid.B403.image.1',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'type', 'image',
                  'image', jsonb_build_object(
                    'id', 'media-B403-image-1',
                    'mime_type', 'image/jpeg',
                    'sha256', 'provider-media-digest-B403'
                  ),
                  'context', jsonb_build_object('id', 'wamid.B403.text.1')
                )
              )
            )
          )
        )
      )
    )
  )::text
),
(
  'status',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '105616013007003',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object(
                'display_phone_number', '+52 664 555 0303',
                'phone_number_id', '112038437449303'
              ),
              'statuses', jsonb_build_array(
                jsonb_build_object(
                  'id', 'wamid.B403.outbound.1',
                  'status', 'delivered',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'recipient_id', '5216645550303'
                )
              )
            )
          )
        )
      )
    )
  )::text
),
(
  'foreign_waba',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '999999999999999',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object('phone_number_id', '112038437449303'),
              'messages', jsonb_build_array(
                jsonb_build_object(
                  'from', '5216645550303',
                  'id', 'wamid.B403.foreign.1',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'type', 'text',
                  'text', jsonb_build_object('body', 'No debe cruzar tenant')
                )
              )
            )
          )
        )
      )
    )
  )::text
),
(
  'member',
  jsonb_build_object(
    'object', 'whatsapp_business_account',
    'entry', jsonb_build_array(
      jsonb_build_object(
        'id', '105616013007003',
        'changes', jsonb_build_array(
          jsonb_build_object(
            'field', 'messages',
            'value', jsonb_build_object(
              'messaging_product', 'whatsapp',
              'metadata', jsonb_build_object('phone_number_id', '112038437449303'),
              'messages', jsonb_build_array(
                jsonb_build_object(
                  'from', '5216645550399',
                  'id', 'wamid.B403.member.1',
                  'timestamp', floor(extract(epoch from statement_timestamp()))::bigint::text,
                  'type', 'text',
                  'text', jsonb_build_object('body', 'Instruccion del propietario')
                )
              )
            )
          )
        )
      )
    )
  )::text
);

grant select on pg_temp.b403_payloads to service_role;

create temporary table pg_temp.b403_delivery_claims (
  delivery_id uuid,
  organization_id uuid,
  meta_application_id uuid,
  provider_object_type text,
  attempt_number integer,
  lease_token uuid,
  lease_expires_at timestamptz,
  correlation_id text,
  trace_id text
) on commit drop;
grant select, insert, delete on pg_temp.b403_delivery_claims to service_role;

create temporary table pg_temp.b403_event_claims (
  inbound_event_id uuid,
  organization_id uuid,
  channel_connection_id uuid,
  attempt_number integer,
  lease_token uuid,
  lease_expires_at timestamptz,
  correlation_id text,
  trace_id text
) on commit drop;
grant select, insert, delete on pg_temp.b403_event_claims to service_role;

-- The linked project contains authentic historical Meta deliveries. Quarantine
-- them only inside this rollback-only transaction so claims exercise this
-- fixture deterministically without mutating persisted production evidence.
update app_private.meta_webhook_deliveries
set status = 'ignored',
    processing_started_at = null,
    lease_owner = null,
    lease_token = null,
    lease_expires_at = null,
    completed_at = statement_timestamp(),
    last_error_code = null,
    updated_at = statement_timestamp()
where status in ('received', 'processing', 'retryable');

set local role service_role;

select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'text'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'text'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-text-ingress',
      'b403-text-ingress-trace'
    )
  ),
  false,
  'signed text webhook enters through the real authenticated ingress RPC'
);

set local role postgres;
select extensions.is(
  (
    select concat_ws('|', status, delivery_count, provider_object_type)
    from app_private.meta_webhook_deliveries
    where latest_request_id = 'b403-text-ingress'
  ),
  'received|1|whatsapp_business_account',
  'authenticated text delivery waits in the raw inbox exactly once'
);

set local role service_role;
insert into pg_temp.b403_delivery_claims
select *
from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select extensions.is(
  (select count(*)::integer from pg_temp.b403_delivery_claims),
  1,
  'one worker claims the text delivery with a lease'
);
select extensions.is(
  (
    select count(*)::integer
    from api.claim_meta_webhook_delivery(
      'b403-worker-b', 'whatsapp_business_account', 120, 8
    )
  ),
  0,
  'a concurrent worker cannot claim the active lease'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.route_meta_whatsapp_delivery(%L::uuid, %L::uuid)',
    (select delivery_id from pg_temp.b403_delivery_claims),
    'b403ffff-ffff-4fff-8fff-ffffffffffff'
  ),
  '40001',
  'a wrong delivery lease token fails closed'
);
select extensions.is(
  (
    select concat_ws(
      '|', delivery_status, inserted_event_count, replayed_event_count, ignored_change_count
    )
    from api.route_meta_whatsapp_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims)
    )
  ),
  'routed|1|0|0',
  'text delivery routes into one idempotent WhatsApp message event'
);

set local role postgres;
select extensions.ok(
  (
    select status = 'routed'
      and lease_owner is null
      and lease_token is null
      and lease_expires_at is null
    from app_private.meta_webhook_deliveries
    where latest_request_id = 'b403-text-ingress'
  ),
  'successful routing clears all raw delivery lease state'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.inbound_events
    where event_type = 'whatsapp.message'
      and provider_event_id = 'wamid.B403.text.1'
  ),
  1,
  'provider message ID creates one private normalized event'
);

set local role service_role;
insert into pg_temp.b403_event_claims
select * from api.claim_meta_whatsapp_message_event('b403-worker-a', 120, 8);
select extensions.is(
  (select count(*)::integer from pg_temp.b403_event_claims),
  1,
  'one worker claims the routed text event'
);
select extensions.is(
  (
    select count(*)::integer
    from api.claim_meta_whatsapp_message_event('b403-worker-b', 120, 8)
  ),
  0,
  'a concurrent worker cannot claim the active message lease'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.normalize_meta_whatsapp_message(%L::uuid, %L::uuid)',
    (select inbound_event_id from pg_temp.b403_event_claims),
    'b403eeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ),
  '40001',
  'a wrong message lease token fails closed'
);
select extensions.is(
  (
    select concat_ws('|', content_kind, was_replayed, principal_type)
    from api.normalize_meta_whatsapp_message(
      (select inbound_event_id from pg_temp.b403_event_claims),
      (select lease_token from pg_temp.b403_event_claims)
    )
  ),
  'text|f|contact',
  'LLM-ready text evidence normalizes without interpreting customer intent'
);

set local role postgres;
select extensions.ok(
  (
    select status = 'processed'
      and lease_owner is null
      and lease_token is null
      and lease_expires_at is null
    from app_private.inbound_events
    where provider_event_id = 'wamid.B403.text.1'
  ),
  'successful normalization clears all message event lease state'
);
select extensions.is(
  (
    select concat_ws(
      '|', direction, content_kind, provider_message_type,
      content #>> '{text,body}', status
    )
    from app_private.messages
    where external_message_id = 'wamid.B403.text.1'
  ),
  'inbound|text|text|Mensaje confidencial B403|received',
  'message preserves provider content as evidence for the future LLM turn'
);
select extensions.ok(
  (
    select not (content ? 'from')
      and not (content ? 'id')
      and not (content ? 'timestamp')
      and not (content ? 'context')
      and not (content ? 'referral')
    from app_private.messages
    where external_message_id = 'wamid.B403.text.1'
  ),
  'routing envelope fields stay outside LLM-visible message content'
);
select extensions.is(
  (
    select concat_ws('|', principal_type, display_name, trust_level)
    from app_private.channel_identities
    where external_subject_id = '5216645550303'
  ),
  'contact|Cliente B403|provider_observed',
  'provider contact becomes one tenant-scoped observed identity'
);
select extensions.is(
  (
    select concat_ws('|', origin_kind, origin_external_id)
    from app_private.conversations
    where origin_external_id = 'publication-B403'
  ),
  'whatsapp.referral|publication-B403',
  'conversation preserves publication referral context for the agent'
);
select extensions.ok(
  (
    select service_window_expires_at >= last_inbound_at + interval '24 hours'
    from app_private.conversations
    where origin_external_id = 'publication-B403'
  ),
  'inbound message opens the WhatsApp twenty-four-hour service window'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.conversation_participants as participant_value
    join app_private.channel_identities as identity_value
      on identity_value.id = participant_value.channel_identity_id
    where identity_value.external_subject_id = '5216645550303'
      and participant_value.participant_role = 'customer'
      and participant_value.left_at is null
  ),
  1,
  'customer identity is attached once to its open conversation'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = 'b4031000-0000-4000-8000-000000000001'
      and event_type in (
        'meta.webhook.delivery_claimed',
        'meta.whatsapp.delivery_routed',
        'meta.whatsapp.message_claimed',
        'meta.whatsapp.message_normalized'
      )
      and (
        metadata_safe::text like '%5216645550303%'
        or metadata_safe::text like '%Mensaje confidencial B403%'
      )
  ),
  0,
  'operational audit events never copy customer identifiers or content'
);

set local role service_role;
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'text_replay'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'text_replay'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-text-replay-ingress',
      'b403-text-replay-ingress-trace'
    )
  ),
  false,
  'different signed bytes enter as independent delivery evidence'
);
delete from pg_temp.b403_delivery_claims;
insert into pg_temp.b403_delivery_claims
select * from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select extensions.is(
  (
    select concat_ws('|', delivery_status, inserted_event_count, replayed_event_count)
    from api.route_meta_whatsapp_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims)
    )
  ),
  'routed|0|1',
  'same provider message ID is recognized as an event replay'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer
    from app_private.inbound_events
    where provider_event_id = 'wamid.B403.text.1'
  ),
  1,
  'event replay never duplicates the private inbound event'
);
select extensions.is(
  (
    select content #>> '{text,body}'
    from app_private.messages
    where external_message_id = 'wamid.B403.text.1'
  ),
  'Mensaje confidencial B403',
  'event replay cannot overwrite first normalized message evidence'
);

set local role service_role;
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'image'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'image'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-image-ingress',
      'b403-image-ingress-trace'
    )
  ),
  false,
  'signed image webhook enters the authenticated raw inbox'
);
delete from pg_temp.b403_delivery_claims;
insert into pg_temp.b403_delivery_claims
select * from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select extensions.is(
  (
    select concat_ws('|', delivery_status, inserted_event_count)
    from api.route_meta_whatsapp_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims)
    )
  ),
  'routed|1',
  'image delivery routes as one message event'
);
delete from pg_temp.b403_event_claims;
insert into pg_temp.b403_event_claims
select * from api.claim_meta_whatsapp_message_event('b403-worker-a', 15, 8);

set local role postgres;
update app_private.inbound_events
set lease_expires_at = processing_started_at
  + ((clock_timestamp() - processing_started_at) / 2)
where id = (select inbound_event_id from pg_temp.b403_event_claims);

set local role service_role;
select pg_temp.throws_sqlstate(
  format(
    'select * from api.normalize_meta_whatsapp_message(%L::uuid, %L::uuid)',
    (select inbound_event_id from pg_temp.b403_event_claims),
    (select lease_token from pg_temp.b403_event_claims)
  ),
  '40001',
  'an expired message lease cannot commit normalization'
);
delete from pg_temp.b403_event_claims;
insert into pg_temp.b403_event_claims
select * from api.claim_meta_whatsapp_message_event('b403-worker-b', 120, 8);
select extensions.is(
  (select attempt_number from pg_temp.b403_event_claims),
  2,
  'an expired event lease is safely reclaimed with a new attempt'
);
select extensions.is(
  (
    select content_kind
    from api.normalize_meta_whatsapp_message(
      (select inbound_event_id from pg_temp.b403_event_claims),
      (select lease_token from pg_temp.b403_event_claims)
    )
  ),
  'media',
  'image evidence normalizes as media without downloading it in the worker'
);

set local role postgres;
select extensions.is(
  (
    select prior.external_message_id
    from app_private.messages as image_message
    join app_private.messages as prior on prior.id = image_message.reply_to_message_id
    where image_message.external_message_id = 'wamid.B403.image.1'
  ),
  'wamid.B403.text.1',
  'provider reply context links the image to the prior message'
);
select extensions.is(
  (
    select count(distinct conversation_id)::integer
    from app_private.messages
    where external_message_id in ('wamid.B403.text.1', 'wamid.B403.image.1')
  ),
  1,
  'subsequent customer messages reuse the same open conversation'
);

set local role service_role;
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'status'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'status'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-status-ingress',
      'b403-status-ingress-trace'
    )
  ),
  false,
  'signed status webhook enters through the same authenticated ingress'
);
delete from pg_temp.b403_delivery_claims;
insert into pg_temp.b403_delivery_claims
select * from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select extensions.is(
  (
    select concat_ws('|', delivery_status, inserted_event_count)
    from api.route_meta_whatsapp_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims)
    )
  ),
  'routed|1',
  'delivery status routes independently from inbound customer messages'
);

set local role postgres;
select extensions.is(
  (
    select concat_ws('|', event_type, status)
    from app_private.inbound_events
    where event_type = 'whatsapp.status'
  ),
  'whatsapp.status|received',
  'status event remains pending for the dedicated B4-004 reconciler'
);

set local role service_role;
select extensions.is(
  (
    select count(*)::integer
    from api.claim_meta_whatsapp_message_event('b403-worker-a', 120, 8)
  ),
  0,
  'message normalizer never claims delivery status events'
);

select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'foreign_waba'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'foreign_waba'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-foreign-ingress',
      'b403-foreign-ingress-trace'
    )
  ),
  false,
  'valid App signature alone does not imply a valid channel route'
);
delete from pg_temp.b403_delivery_claims;
insert into pg_temp.b403_delivery_claims
select * from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.route_meta_whatsapp_delivery(%L::uuid, %L::uuid)',
    (select delivery_id from pg_temp.b403_delivery_claims),
    (select lease_token from pg_temp.b403_delivery_claims)
  ),
  '55000',
  'unknown WABA fails exact tenant connection routing'
);
select extensions.is(
  (
    select delivery_status
    from api.fail_meta_webhook_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims),
      'route_not_found',
      false,
      0,
      8
    )
  ),
  'dead_letter',
  'non-retryable routing mismatch is dead-lettered with a safe code'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer
    from app_private.inbound_events
    where provider_event_id = 'wamid.B403.foreign.1'
  ),
  0,
  'unknown WABA cannot create an inbound event in the tenant'
);

insert into app_private.channel_identities (
  organization_id,
  channel_connection_id,
  external_subject_id,
  principal_type,
  contact_id,
  member_user_id,
  trust_level,
  display_name,
  status,
  verified_at,
  linked_by_user_id,
  last_seen_at
)
select
  'b4031000-0000-4000-8000-000000000001',
  connection_value.id,
  '5216645550399',
  'member',
  null,
  'b4030000-0000-4000-8000-000000000001',
  'verified_member',
  'Propietario B403',
  'active',
  statement_timestamp(),
  'b4030000-0000-4000-8000-000000000001',
  statement_timestamp()
from app_private.channel_connections as connection_value
where connection_value.organization_id = 'b4031000-0000-4000-8000-000000000001'
  and connection_value.channel = 'whatsapp';

set local role service_role;
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4031000-0000-4000-8000-000000000001'
      ),
      encode(convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'member'), 'UTF8'), 'base64'),
      encode(
        extensions.hmac(
          convert_to((select raw_body from pg_temp.b403_payloads where fixture_name = 'member'), 'UTF8'),
          convert_to('b403-app-secret-0123456789abcdef', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b403-member-ingress',
      'b403-member-ingress-trace'
    )
  ),
  false,
  'verified owner message enters through the same channel contract'
);
delete from pg_temp.b403_delivery_claims;
insert into pg_temp.b403_delivery_claims
select * from api.claim_meta_webhook_delivery(
  'b403-worker-a', 'whatsapp_business_account', 120, 8
);
select extensions.is(
  (
    select delivery_status
    from api.route_meta_whatsapp_delivery(
      (select delivery_id from pg_temp.b403_delivery_claims),
      (select lease_token from pg_temp.b403_delivery_claims)
    )
  ),
  'routed',
  'verified owner message routes with the exact active connection'
);
delete from pg_temp.b403_event_claims;
insert into pg_temp.b403_event_claims
select * from api.claim_meta_whatsapp_message_event('b403-worker-a', 120, 8);
select extensions.is(
  (
    select principal_type
    from api.normalize_meta_whatsapp_message(
      (select inbound_event_id from pg_temp.b403_event_claims),
      (select lease_token from pg_temp.b403_event_claims)
    )
  ),
  'member',
  'verified owner identity remains a member instead of becoming a customer'
);

set local role postgres;
select extensions.is(
  (
    select count(*)::integer
    from app_private.contacts as contact_value
    join app_private.channel_identities as identity_value
      on identity_value.contact_id = contact_value.id
    where identity_value.external_subject_id = '5216645550399'
  ),
  0,
  'verified owner identity never creates a duplicate customer contact'
);
select extensions.is(
  (
    select participant_role
    from app_private.conversation_participants as participant_value
    join app_private.channel_identities as identity_value
      on identity_value.id = participant_value.channel_identity_id
    where identity_value.external_subject_id = '5216645550399'
      and participant_value.left_at is null
  ),
  'member',
  'verified owner participates in the conversation with member authority'
);

select * from extensions.finish();
rollback;
