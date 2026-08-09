begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(85);

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

-- Physical production contract.
select extensions.has_table('app_private', 'channel_connections', 'channel_connections table exists');
select extensions.has_table('app_private', 'contacts', 'contacts table exists');
select extensions.has_table('app_private', 'channel_identities', 'channel_identities table exists');
select extensions.has_table('app_private', 'inbound_events', 'inbound_events table exists');
select extensions.has_table('app_private', 'conversations', 'conversations table exists');
select extensions.has_table(
  'app_private',
  'conversation_participants',
  'conversation_participants table exists'
);
select extensions.has_table('app_private', 'messages', 'messages table exists');
select extensions.has_table(
  'app_private',
  'message_delivery_events',
  'message_delivery_events table exists'
);
select extensions.has_table('app_private', 'consents', 'consents table exists');
select extensions.has_table('app_private', 'outbox_events', 'outbox_events table exists');

select extensions.has_view('api', 'channel_connections', 'channel_connections API view exists');
select extensions.has_view('api', 'contacts', 'contacts API view exists');
select extensions.has_view('api', 'channel_identities', 'channel_identities API view exists');
select extensions.has_view('api', 'conversations', 'conversations API view exists');
select extensions.has_view(
  'api',
  'conversation_participants',
  'conversation_participants API view exists'
);
select extensions.has_view('api', 'messages', 'messages API view exists');
select extensions.has_view(
  'api',
  'message_delivery_events',
  'message_delivery_events API view exists'
);
select extensions.has_view('api', 'consents', 'consents API view exists');

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
      and relation.relrowsecurity
  ),
  10,
  'RLS is enabled on every B2-002 private table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
      and relation.relforcerowsecurity
  ),
  10,
  'RLS is forced on every B2-002 private table'
);

select extensions.is(
  (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
  ),
  array[
    'channel_connections_admin_select',
    'channel_identities_operator_select',
    'consents_operator_select',
    'contacts_operator_select',
    'conversation_participants_operator_select',
    'conversations_operator_select',
    'message_delivery_events_operator_select',
    'messages_operator_select'
  ]::text[],
  'the exact eight authenticated read policies exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in ('inbound_events', 'outbox_events')
  ),
  0,
  'raw inbox and outbox have no authenticated RLS policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  8,
  'every B2-002 API view uses caller RLS and a security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname in ('app_private', 'api')
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
      and (
        has_table_privilege('anon', relation.oid, 'SELECT')
        or has_table_privilege('anon', relation.oid, 'INSERT')
        or has_table_privilege('anon', relation.oid, 'UPDATE')
        or has_table_privilege('anon', relation.oid, 'DELETE')
      )
  ),
  0,
  'anon has no B2-002 table or view privilege'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents'
      )
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  8,
  'authenticated can select only the normalized B2-002 base relations'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('inbound_events', 'outbox_events')
      and has_table_privilege('authenticated', relation.oid, 'SELECT')
  ),
  0,
  'authenticated cannot select raw inbox or outbox'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
      and (
        has_table_privilege('authenticated', relation.oid, 'INSERT')
        or has_table_privilege('authenticated', relation.oid, 'UPDATE')
        or has_table_privilege('authenticated', relation.oid, 'DELETE')
      )
  ),
  0,
  'authenticated has no B2-002 direct mutation privilege'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'channel_connections',
        'contacts',
        'channel_identities',
        'inbound_events',
        'conversations',
        'conversation_participants',
        'messages',
        'message_delivery_events',
        'consents',
        'outbox_events'
      )
      and has_table_privilege('service_role', relation.oid, 'DELETE')
  ),
  0,
  'service_role has no destructive delete privilege on B2-002 tables'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in ('message_delivery_events', 'consents')
      and has_table_privilege('service_role', relation.oid, 'UPDATE')
  ),
  0,
  'append-only delivery and consent ledgers cannot be updated by service_role'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.proname in (
        'prevent_channel_connection_reassignment',
        'prevent_organization_reassignment',
        'prevent_channel_identity_reassignment',
        'prevent_inbound_event_core_rewrite',
        'prevent_conversation_reassignment',
        'prevent_participant_reassignment',
        'assert_open_conversation_primary_participant',
        'prevent_message_core_rewrite',
        'prevent_outbox_event_core_rewrite'
      )
      and exists (
        select 1
        from unnest(function.proconfig) as configuration(option)
        where configuration.option like 'search_path=%'
      )
  ),
  9,
  'every B2-002 trigger function pins an empty search_path'
);

select extensions.is(
  (
    select array_agg(function.proname order by function.proname)
    from pg_catalog.pg_proc as function
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = function.pronamespace
    where namespace.nspname = 'app_private'
      and function.proname in (
        'assert_active_owner',
        'assert_open_conversation_primary_participant',
        'provision_user_profile'
      )
      and function.prosecdef
  ),
  array[
    'assert_active_owner',
    'assert_open_conversation_primary_participant',
    'provision_user_profile'
  ]::name[],
  'the three audited cross-table trigger functions remain security definer'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_trigger as trigger
    inner join pg_catalog.pg_class as relation
      on relation.oid = trigger.tgrelid
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and trigger.tgname in (
        'conversations_require_primary_participant',
        'conversation_participants_preserve_primary'
      )
      and trigger.tgdeferrable
      and trigger.tginitdeferred
  ),
  2,
  'primary participant constraints are deferred for atomic conversation creation'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as index
    inner join pg_catalog.pg_namespace as namespace
      on namespace.oid = index.relnamespace
    where namespace.nspname = 'app_private'
      and index.relname in (
        'channel_connections_operational_sender_unique',
        'channel_identities_current_subject_unique',
        'inbound_events_claim_idx',
        'conversations_open_identity_unique',
        'conversation_participants_active_identity_unique',
        'messages_external_message_unique',
        'message_delivery_events_message_timeline_idx',
        'consents_identity_current_idx',
        'outbox_events_claim_idx',
        'outbox_events_message_send_unique'
      )
  ),
  10,
  'critical scope, timeline and claim indexes exist'
);

-- Ephemeral QA identities and tenants. The enclosing transaction rolls every row back.
insert into auth.users (id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid);

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    '11111111-1111-4111-8111-111111111111'::uuid,
    'Organization Alpha',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '22222222-2222-4222-8222-222222222222'::uuid,
    'Organization Beta',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  );

insert into app_private.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values
  (
    '31111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'owner',
    'active',
    now()
  ),
  (
    '32222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
    'owner',
    'active',
    now()
  ),
  (
    '33333333-3333-4333-8333-333333333333'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'cccccccc-cccc-4ccc-8ccc-cccccccccccc'::uuid,
    'operator',
    'active',
    now()
  ),
  (
    '34444444-4444-4444-8444-444444444444'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
    'viewer',
    'active',
    now()
  );

set constraints all immediate;

insert into app_private.channel_connections (
  id,
  organization_id,
  provider,
  channel,
  external_app_id,
  external_account_id,
  external_sender_id,
  display_name,
  api_version,
  credential_reference,
  webhook_secret_reference,
  status,
  connected_at,
  last_verified_at,
  created_by_user_id
)
values
  (
    '51111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'meta',
    'whatsapp',
    'qa-app-alpha',
    'qa-waba-alpha',
    'qa-phone-alpha',
    'QA WhatsApp Alpha',
    'v24.0',
    'secret-ref://qa/meta-token-alpha',
    'secret-ref://qa/meta-app-secret-alpha',
    'active',
    now(),
    now(),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '52222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'meta',
    'messenger',
    'qa-app-beta',
    'qa-page-beta',
    'qa-page-beta',
    'QA Messenger Beta',
    'v24.0',
    'secret-ref://qa/meta-token-beta',
    'secret-ref://qa/meta-app-secret-beta',
    'active',
    now(),
    now(),
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
  );

insert into app_private.contacts (id, organization_id, display_name)
values
  (
    '61111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    'QA Contact Alpha'
  ),
  (
    '62222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    'QA Contact Beta'
  );

insert into app_private.channel_identities (
  id,
  organization_id,
  channel_connection_id,
  external_subject_id,
  principal_type,
  contact_id,
  member_user_id,
  trust_level,
  display_name,
  verified_at,
  linked_by_user_id
)
values
  (
    '71111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    'qa-wa-contact-alpha',
    'contact',
    '61111111-1111-4111-8111-111111111111'::uuid,
    null,
    'provider_observed',
    'QA Contact Alpha',
    null,
    null
  ),
  (
    '71111111-1111-4111-8111-111111111112'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    'qa-wa-owner-alpha',
    'member',
    null,
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
    'verified_member',
    'QA Owner Alpha',
    now(),
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
  ),
  (
    '72222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '52222222-2222-4222-8222-222222222222'::uuid,
    'qa-psid-contact-beta',
    'contact',
    '62222222-2222-4222-8222-222222222222'::uuid,
    null,
    'provider_observed',
    'QA Contact Beta',
    null,
    null
  );

insert into app_private.inbound_events (
  id,
  organization_id,
  channel_connection_id,
  event_type,
  provider_event_id,
  deduplication_key,
  payload_sha256,
  payload,
  provider_occurred_at,
  signature_verified_at,
  request_id
)
values
  (
    'a1111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    'messages',
    'qa-event-alpha',
    decode(repeat('01', 32), 'hex'),
    decode(repeat('02', 32), 'hex'),
    '{"object":"whatsapp_business_account","qa":true}'::jsonb,
    now(),
    now(),
    'qa-request-alpha'
  ),
  (
    'a2222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '52222222-2222-4222-8222-222222222222'::uuid,
    'messages',
    'qa-event-beta',
    decode(repeat('03', 32), 'hex'),
    decode(repeat('04', 32), 'hex'),
    '{"object":"page","qa":true}'::jsonb,
    now(),
    now(),
    'qa-request-beta'
  );

set constraints all deferred;

insert into app_private.conversations (
  id,
  organization_id,
  channel_connection_id,
  primary_channel_identity_id,
  provider_thread_id,
  origin_kind,
  origin_external_id,
  origin_context
)
values
  (
    '81111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    '71111111-1111-4111-8111-111111111111'::uuid,
    null,
    'post',
    'qa-post-alpha',
    '{"source":"qa"}'::jsonb
  ),
  (
    '82222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '52222222-2222-4222-8222-222222222222'::uuid,
    '72222222-2222-4222-8222-222222222222'::uuid,
    'qa-thread-beta',
    null,
    null,
    '{}'::jsonb
  );

insert into app_private.conversation_participants (
  id,
  organization_id,
  channel_connection_id,
  conversation_id,
  participant_kind,
  participant_role,
  channel_identity_id,
  agent_key
)
values
  (
    '91111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    '81111111-1111-4111-8111-111111111111'::uuid,
    'identity',
    'customer',
    '71111111-1111-4111-8111-111111111111'::uuid,
    null
  ),
  (
    '91111111-1111-4111-8111-111111111112'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    '81111111-1111-4111-8111-111111111111'::uuid,
    'agent',
    'agent',
    null,
    'sales-assistant'
  ),
  (
    '92222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '52222222-2222-4222-8222-222222222222'::uuid,
    '82222222-2222-4222-8222-222222222222'::uuid,
    'identity',
    'customer',
    '72222222-2222-4222-8222-222222222222'::uuid,
    null
  );

set constraints all immediate;

insert into app_private.messages (
  id,
  organization_id,
  channel_connection_id,
  conversation_id,
  sender_participant_id,
  source_inbound_event_id,
  direction,
  content_kind,
  provider_message_type,
  external_message_id,
  deduplication_key,
  content,
  status,
  provider_occurred_at,
  received_at
)
values
  (
    'b1111111-1111-4111-8111-111111111111'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    '81111111-1111-4111-8111-111111111111'::uuid,
    '91111111-1111-4111-8111-111111111111'::uuid,
    'a1111111-1111-4111-8111-111111111111'::uuid,
    'inbound',
    'text',
    'text',
    'qa-wamid-alpha-inbound',
    decode(repeat('05', 32), 'hex'),
    '{"text":"QA inbound alpha"}'::jsonb,
    'received',
    now(),
    now()
  ),
  (
    'b1111111-1111-4111-8111-111111111112'::uuid,
    '11111111-1111-4111-8111-111111111111'::uuid,
    '51111111-1111-4111-8111-111111111111'::uuid,
    '81111111-1111-4111-8111-111111111111'::uuid,
    '91111111-1111-4111-8111-111111111112'::uuid,
    null,
    'outbound',
    'text',
    'text',
    'qa-wamid-alpha-outbound',
    decode(repeat('06', 32), 'hex'),
    '{"text":"QA outbound alpha"}'::jsonb,
    'queued',
    null,
    null
  ),
  (
    'b2222222-2222-4222-8222-222222222222'::uuid,
    '22222222-2222-4222-8222-222222222222'::uuid,
    '52222222-2222-4222-8222-222222222222'::uuid,
    '82222222-2222-4222-8222-222222222222'::uuid,
    '92222222-2222-4222-8222-222222222222'::uuid,
    'a2222222-2222-4222-8222-222222222222'::uuid,
    'inbound',
    'text',
    'text',
    'qa-mid-beta-inbound',
    decode(repeat('07', 32), 'hex'),
    '{"text":"QA inbound beta"}'::jsonb,
    'received',
    now(),
    now()
  );

insert into app_private.message_delivery_events (
  id,
  organization_id,
  channel_connection_id,
  message_id,
  source_inbound_event_id,
  deduplication_key,
  status,
  provider_occurred_at
)
values (
  'c1111111-1111-4111-8111-111111111111'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '51111111-1111-4111-8111-111111111111'::uuid,
  'b1111111-1111-4111-8111-111111111112'::uuid,
  'a1111111-1111-4111-8111-111111111111'::uuid,
  decode(repeat('08', 32), 'hex'),
  'delivered',
  now()
);

insert into app_private.consents (
  id,
  organization_id,
  channel_connection_id,
  channel_identity_id,
  evidence_message_id,
  purpose,
  decision,
  source,
  deduplication_key,
  effective_at
)
values (
  'd1111111-1111-4111-8111-111111111111'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '51111111-1111-4111-8111-111111111111'::uuid,
  '71111111-1111-4111-8111-111111111111'::uuid,
  'b1111111-1111-4111-8111-111111111111'::uuid,
  'customer_service',
  'granted',
  'inbound_message',
  decode(repeat('09', 32), 'hex'),
  now()
);

insert into app_private.outbox_events (
  id,
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
  policy_evaluated_at
)
values (
  'e1111111-1111-4111-8111-111111111111'::uuid,
  '11111111-1111-4111-8111-111111111111'::uuid,
  '51111111-1111-4111-8111-111111111111'::uuid,
  '81111111-1111-4111-8111-111111111111'::uuid,
  'b1111111-1111-4111-8111-111111111112'::uuid,
  '71111111-1111-4111-8111-111111111111'::uuid,
  'message.send',
  decode(repeat('0a', 32), 'hex'),
  '{"message_reference":"b1111111-1111-4111-8111-111111111112"}'::jsonb,
  'allowed',
  'customer_service_window',
  now()
);

select extensions.is(
  (select count(*)::integer from app_private.channel_connections),
  2,
  'both valid channel connections satisfy the production schema'
);

select extensions.is(
  (select count(*)::integer from app_private.channel_identities),
  3,
  'contact and verified member identities satisfy scoped principal constraints'
);

select extensions.is(
  (select count(*)::integer from app_private.conversations),
  2,
  'both valid conversations have primary participants'
);

select extensions.is(
  (select count(*)::integer from app_private.messages),
  3,
  'inbound and outbound messages satisfy direction-specific states'
);

select extensions.is(
  (select count(*)::integer from app_private.outbox_events),
  1,
  'one allowed idempotent send intent exists'
);

-- Constraints, scope and idempotency.
select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_connections (
      organization_id, provider, channel, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      'meta',
      'whatsapp',
      'active'
    )$$,
  '23514',
  'active connection requires verified provider identifiers and secret references'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_connections (
      organization_id, provider, channel, external_sender_id
    ) values (
      '22222222-2222-4222-8222-222222222222'::uuid,
      'meta',
      'whatsapp',
      'qa-phone-alpha'
    )$$,
  '23505',
  'one operational sender cannot be assigned to two organizations'
);

select pg_temp.throws_sqlstate(
  $$update app_private.channel_connections
    set external_sender_id = 'different-sender'
    where id = '51111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'established channel routing identifiers are immutable'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_identities (
      organization_id, channel_connection_id, external_subject_id,
      principal_type, trust_level
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'missing-principal', 'contact', 'provider_observed'
    )$$,
  '23514',
  'channel identity requires exactly one principal'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_identities (
      organization_id, channel_connection_id, external_subject_id,
      principal_type, member_user_id, trust_level
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'unverified-member', 'member',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      'provider_observed'
    )$$,
  '23514',
  'member identity cannot be created as merely provider observed'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_identities (
      organization_id, channel_connection_id, external_subject_id,
      principal_type, contact_id, trust_level
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'cross-tenant-contact', 'contact',
      '62222222-2222-4222-8222-222222222222'::uuid,
      'provider_observed'
    )$$,
  '23503',
  'identity cannot link a contact from another organization'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_identities (
      organization_id, channel_connection_id, external_subject_id,
      principal_type, contact_id, trust_level
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'qa-wa-contact-alpha', 'contact',
      '61111111-1111-4111-8111-111111111111'::uuid,
      'provider_observed'
    )$$,
  '23505',
  'external subject is unique inside an operational connection'
);

select pg_temp.throws_sqlstate(
  $$update app_private.channel_identities
    set contact_id = '62222222-2222-4222-8222-222222222222'::uuid
    where id = '71111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'channel identity principal cannot be reassigned'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.inbound_events (
      organization_id, channel_connection_id, event_type,
      deduplication_key, payload_sha256, payload,
      signature_verified_at, request_id
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'messages', decode(repeat('01', 32), 'hex'),
      decode(repeat('0b', 32), 'hex'), '{}'::jsonb,
      now(), 'duplicate-request'
    )$$,
  '23505',
  'duplicate webhook delivery is rejected per connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.inbound_events (
      organization_id, channel_connection_id, event_type,
      deduplication_key, payload_sha256, payload,
      signature_verified_at, request_id
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'messages', decode('01', 'hex'),
      decode(repeat('0c', 32), 'hex'), '{}'::jsonb,
      now(), 'short-hash-request'
    )$$,
  '23514',
  'inbox deduplication key must be a SHA-256 value'
);

select pg_temp.throws_sqlstate(
  $$update app_private.inbound_events
    set payload = '{"rewritten":true}'::jsonb
    where id = 'a1111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'accepted inbox evidence cannot be rewritten'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.conversations (
      organization_id, channel_connection_id, primary_channel_identity_id
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '72222222-2222-4222-8222-222222222222'::uuid
    )$$,
  '23503',
  'conversation cannot use an identity from another connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.conversations (
      organization_id, channel_connection_id, primary_channel_identity_id
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '71111111-1111-4111-8111-111111111111'::uuid
    )$$,
  '23505',
  'one identity cannot receive duplicate open conversations'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.conversations (
      organization_id, channel_connection_id, primary_channel_identity_id,
      origin_kind
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '71111111-1111-4111-8111-111111111112'::uuid,
      'post'
    )$$,
  '23514',
  'conversation origin kind requires an external origin ID'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.conversations (
      id, organization_id, channel_connection_id, primary_channel_identity_id,
      status, closed_at
    ) values (
      '83333333-3333-4333-8333-333333333333'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '71111111-1111-4111-8111-111111111112'::uuid,
      'open', null
    )$$,
  '23514',
  'open conversation cannot commit without its primary participant'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.conversation_participants (
      organization_id, channel_connection_id, conversation_id,
      participant_kind, participant_role, channel_identity_id
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      'identity', 'customer',
      '72222222-2222-4222-8222-222222222222'::uuid
    )$$,
  '23503',
  'participant cannot use an identity from another connection'
);

select pg_temp.throws_sqlstate(
  $$update app_private.conversation_participants
    set left_at = now()
    where id = '91111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'open conversation cannot lose its primary active participant'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.messages (
      organization_id, channel_connection_id, conversation_id,
      sender_participant_id, direction, content_kind,
      deduplication_key, content, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      '92222222-2222-4222-8222-222222222222'::uuid,
      'outbound', 'text', decode(repeat('0d', 32), 'hex'),
      '{"text":"wrong sender"}'::jsonb, 'draft'
    )$$,
  '23503',
  'message sender must belong to the same conversation and connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.messages (
      organization_id, channel_connection_id, conversation_id,
      sender_participant_id, direction, content_kind,
      deduplication_key, content, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      '91111111-1111-4111-8111-111111111112'::uuid,
      'outbound', 'text', decode(repeat('06', 32), 'hex'),
      '{"text":"duplicate"}'::jsonb, 'draft'
    )$$,
  '23505',
  'message deduplication is scoped to its connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.messages (
      organization_id, channel_connection_id, conversation_id,
      sender_participant_id, direction, content_kind, external_message_id,
      deduplication_key, content, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      '91111111-1111-4111-8111-111111111112'::uuid,
      'outbound', 'text', 'qa-wamid-alpha-outbound',
      decode(repeat('0e', 32), 'hex'),
      '{"text":"duplicate external"}'::jsonb, 'draft'
    )$$,
  '23505',
  'external message ID is unique inside a connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.messages (
      organization_id, channel_connection_id, conversation_id,
      sender_participant_id, direction, content_kind,
      deduplication_key, content, status, received_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      '91111111-1111-4111-8111-111111111111'::uuid,
      'inbound', 'text', decode(repeat('0f', 32), 'hex'),
      '{"text":"invalid state"}'::jsonb, 'sent', now()
    )$$,
  '23514',
  'inbound message cannot claim an outbound delivery state'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.messages (
      organization_id, channel_connection_id, conversation_id,
      sender_participant_id, direction, content_kind,
      deduplication_key, content, status
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      '91111111-1111-4111-8111-111111111112'::uuid,
      'outbound', 'text', decode(repeat('10', 32), 'hex'),
      '[]'::jsonb, 'draft'
    )$$,
  '23514',
  'message content must remain a bounded JSON object'
);

select pg_temp.throws_sqlstate(
  $$update app_private.messages
    set content = '{"text":"rewritten"}'::jsonb
    where id = 'b1111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'accepted message content cannot be rewritten'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.message_delivery_events (
      organization_id, channel_connection_id, message_id,
      deduplication_key, status, provider_occurred_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'b1111111-1111-4111-8111-111111111112'::uuid,
      decode(repeat('08', 32), 'hex'), 'delivered', now()
    )$$,
  '23505',
  'delivery event deduplication prevents repeated state effects'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.message_delivery_events (
      organization_id, channel_connection_id, message_id,
      deduplication_key, status, provider_occurred_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'b1111111-1111-4111-8111-111111111112'::uuid,
      decode(repeat('11', 32), 'hex'), 'queued', now()
    )$$,
  '23514',
  'provider delivery status is constrained independently from message state'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.consents (
      organization_id, channel_connection_id, channel_identity_id,
      purpose, decision, source, deduplication_key, effective_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '71111111-1111-4111-8111-111111111111'::uuid,
      'customer_service', 'granted', 'inbound_message',
      decode(repeat('09', 32), 'hex'), now()
    )$$,
  '23505',
  'consent evidence is deduplicated per connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.consents (
      organization_id, channel_connection_id, channel_identity_id,
      purpose, decision, source, deduplication_key,
      effective_at, expires_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '71111111-1111-4111-8111-111111111111'::uuid,
      'customer_service', 'granted', 'inbound_message',
      decode(repeat('12', 32), 'hex'), now(), now()
    )$$,
  '23514',
  'consent expiry must follow its effective time'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.outbox_events (
      organization_id, channel_connection_id, conversation_id,
      message_id, destination_identity_id, operation,
      idempotency_key, policy_status, policy_basis, policy_evaluated_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      '81111111-1111-4111-8111-111111111111'::uuid,
      'b1111111-1111-4111-8111-111111111112'::uuid,
      '71111111-1111-4111-8111-111111111111'::uuid,
      'message.send', decode(repeat('13', 32), 'hex'),
      'allowed', 'customer_service_window', now()
    )$$,
  '23505',
  'one outbound message cannot receive two send effects'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.outbox_events (
      organization_id, channel_connection_id, operation,
      idempotency_key
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'message.mark_read', decode(repeat('0a', 32), 'hex')
    )$$,
  '23505',
  'outbox idempotency key cannot be reused within a connection'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.outbox_events (
      organization_id, channel_connection_id, operation,
      idempotency_key, status, processing_started_at, lease_expires_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'message.mark_read', decode(repeat('14', 32), 'hex'),
      'processing', now(), now() + interval '1 minute'
    )$$,
  '23514',
  'outbox cannot process while policy is pending'
);

select pg_temp.throws_sqlstate(
  $$insert into app_private.outbox_events (
      organization_id, channel_connection_id, operation,
      idempotency_key, policy_status, status, completed_at
    ) values (
      '11111111-1111-4111-8111-111111111111'::uuid,
      '51111111-1111-4111-8111-111111111111'::uuid,
      'message.mark_read', decode(repeat('15', 32), 'hex'),
      'blocked', 'blocked', now()
    )$$,
  '23514',
  'blocked policy requires an evaluated reason and time'
);

select pg_temp.throws_sqlstate(
  $$update app_private.outbox_events
    set payload = '{"rewritten":true}'::jsonb
    where id = 'e1111111-1111-4111-8111-111111111111'::uuid$$,
  '23514',
  'outbox effect payload and idempotency contract cannot be rewritten'
);

-- Positive and negative RLS matrix.
set local role authenticated;
set local request.jwt.claim.sub = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select extensions.is(
  (select count(*)::integer from api.channel_connections),
  1,
  'owner sees only their channel connection'
);

select extensions.is(
  (select count(*)::integer from api.contacts),
  1,
  'owner sees only their organization contact'
);

select extensions.is(
  (select count(*)::integer from api.messages),
  2,
  'owner sees only messages from their organization'
);

select pg_temp.throws_sqlstate(
  $$select * from app_private.inbound_events$$,
  '42501',
  'owner cannot read raw inbox evidence'
);

select pg_temp.throws_sqlstate(
  $$select * from app_private.outbox_events$$,
  '42501',
  'owner cannot read raw outbox effects'
);

select pg_temp.throws_sqlstate(
  $$update app_private.messages set status = 'failed'$$,
  '42501',
  'authenticated owner cannot mutate messages directly'
);

reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

select extensions.is(
  (select count(*)::integer from api.channel_connections),
  0,
  'operator cannot read connection configuration'
);

select extensions.is(
  (select count(*)::integer from api.messages),
  2,
  'operator can read normalized conversations for their organization'
);

reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

select extensions.is(
  (select count(*)::integer from api.contacts),
  0,
  'viewer cannot read customer PII'
);

select extensions.is(
  (select count(*)::integer from api.messages),
  0,
  'viewer cannot read conversations'
);

reset role;
reset request.jwt.claim.sub;

set local role authenticated;
set local request.jwt.claim.sub = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select extensions.is(
  (select count(*)::integer from api.messages),
  1,
  'second owner sees only the second organization message'
);

reset role;
reset request.jwt.claim.sub;

set local role anon;

select pg_temp.throws_sqlstate(
  $$select * from api.messages$$,
  '42501',
  'anon cannot read messaging API views'
);

reset role;

set local role service_role;

select extensions.is(
  (select count(*)::integer from api.messages),
  3,
  'service_role can read both organizations for authorized backend workflows'
);

select pg_temp.throws_sqlstate(
  $$update app_private.message_delivery_events set status = 'read'$$,
  '42501',
  'service_role cannot rewrite append-only delivery history'
);

select pg_temp.throws_sqlstate(
  $$delete from app_private.messages$$,
  '42501',
  'service_role cannot delete message history'
);

reset role;

select * from extensions.finish();
rollback;
