begin;

create table app_private.channel_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  provider text not null,
  channel text not null,
  external_app_id text,
  external_account_id text,
  external_sender_id text,
  display_name text,
  api_version text,
  credential_reference text,
  webhook_secret_reference text,
  status text not null default 'draft',
  connected_at timestamptz,
  last_verified_at timestamptz,
  disabled_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_connections_organization_id_id_unique
    unique (organization_id, id),
  constraint channel_connections_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint channel_connections_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint channel_connections_provider_valid
    check (provider = 'meta'),
  constraint channel_connections_channel_valid
    check (channel in ('whatsapp', 'messenger')),
  constraint channel_connections_external_app_id_valid
    check (
      external_app_id is null
      or (
        external_app_id = btrim(external_app_id)
        and char_length(external_app_id) between 1 and 255
      )
    ),
  constraint channel_connections_external_account_id_valid
    check (
      external_account_id is null
      or (
        external_account_id = btrim(external_account_id)
        and char_length(external_account_id) between 1 and 255
      )
    ),
  constraint channel_connections_external_sender_id_valid
    check (
      external_sender_id is null
      or (
        external_sender_id = btrim(external_sender_id)
        and char_length(external_sender_id) between 1 and 255
      )
    ),
  constraint channel_connections_display_name_valid
    check (
      display_name is null
      or (
        display_name = btrim(display_name)
        and char_length(display_name) between 1 and 160
      )
    ),
  constraint channel_connections_api_version_valid
    check (
      api_version is null
      or (
        api_version = btrim(api_version)
        and char_length(api_version) between 1 and 32
      )
    ),
  constraint channel_connections_credential_reference_valid
    check (
      credential_reference is null
      or (
        credential_reference = btrim(credential_reference)
        and char_length(credential_reference) between 1 and 255
      )
    ),
  constraint channel_connections_webhook_secret_reference_valid
    check (
      webhook_secret_reference is null
      or (
        webhook_secret_reference = btrim(webhook_secret_reference)
        and char_length(webhook_secret_reference) between 1 and 255
      )
    ),
  constraint channel_connections_status_valid
    check (
      status in (
        'draft',
        'pending_verification',
        'active',
        'suspended',
        'revoked',
        'error',
        'archived'
      )
    ),
  constraint channel_connections_active_ready
    check (
      status <> 'active'
      or (
        external_app_id is not null
        and external_account_id is not null
        and external_sender_id is not null
        and api_version is not null
        and credential_reference is not null
        and webhook_secret_reference is not null
        and connected_at is not null
        and last_verified_at is not null
        and disabled_at is null
      )
    ),
  constraint channel_connections_disabled_at_valid
    check (
      status not in ('suspended', 'revoked', 'archived')
      or disabled_at is not null
    ),
  constraint channel_connections_timestamps_valid
    check (
      (connected_at is null or connected_at >= created_at)
      and (last_verified_at is null or last_verified_at >= created_at)
      and (disabled_at is null or disabled_at >= created_at)
    )
);

create unique index channel_connections_operational_sender_unique
  on app_private.channel_connections (provider, channel, external_sender_id)
  where external_sender_id is not null
    and status not in ('revoked', 'archived');

create index channel_connections_organization_account_idx
  on app_private.channel_connections (
    organization_id,
    provider,
    channel,
    external_account_id
  )
  where external_account_id is not null;

create index channel_connections_created_by_user_idx
  on app_private.channel_connections (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.contacts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  display_name text,
  preferred_locale text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_organization_id_id_unique
    unique (organization_id, id),
  constraint contacts_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint contacts_display_name_valid
    check (
      display_name is null
      or (
        display_name = btrim(display_name)
        and char_length(display_name) between 1 and 160
      )
    ),
  constraint contacts_preferred_locale_valid
    check (
      preferred_locale is null
      or (
        preferred_locale = btrim(preferred_locale)
        and char_length(preferred_locale) between 2 and 35
      )
    ),
  constraint contacts_status_valid
    check (status in ('active', 'blocked', 'archived'))
);

create table app_private.channel_identities (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  external_subject_id text not null,
  principal_type text not null,
  contact_id uuid,
  member_user_id uuid,
  trust_level text not null,
  display_name text,
  status text not null default 'active',
  verified_at timestamptz,
  linked_by_user_id uuid,
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint channel_identities_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint channel_identities_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint channel_identities_contact_fk
    foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id)
    on delete restrict,
  constraint channel_identities_member_fk
    foreign key (organization_id, member_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint channel_identities_linked_by_fk
    foreign key (organization_id, linked_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint channel_identities_external_subject_id_valid
    check (
      external_subject_id = btrim(external_subject_id)
      and char_length(external_subject_id) between 1 and 255
    ),
  constraint channel_identities_principal_type_valid
    check (principal_type in ('contact', 'member')),
  constraint channel_identities_principal_valid
    check (
      (
        principal_type = 'contact'
        and contact_id is not null
        and member_user_id is null
        and trust_level = 'provider_observed'
      )
      or (
        principal_type = 'member'
        and contact_id is null
        and member_user_id is not null
        and trust_level = 'verified_member'
        and verified_at is not null
        and linked_by_user_id is not null
      )
    ),
  constraint channel_identities_trust_level_valid
    check (trust_level in ('provider_observed', 'verified_member')),
  constraint channel_identities_display_name_valid
    check (
      display_name is null
      or (
        display_name = btrim(display_name)
        and char_length(display_name) between 1 and 160
      )
    ),
  constraint channel_identities_status_valid
    check (status in ('active', 'blocked', 'revoked')),
  constraint channel_identities_revoked_at_valid
    check (
      (status = 'revoked' and revoked_at is not null)
      or (status <> 'revoked' and revoked_at is null)
    ),
  constraint channel_identities_timestamps_valid
    check (
      (verified_at is null or verified_at >= created_at)
      and (last_seen_at is null or last_seen_at >= created_at)
      and (revoked_at is null or revoked_at >= created_at)
    )
);

create unique index channel_identities_current_subject_unique
  on app_private.channel_identities (
    channel_connection_id,
    external_subject_id
  )
  where status <> 'revoked';

create index channel_identities_contact_idx
  on app_private.channel_identities (organization_id, contact_id)
  where contact_id is not null;

create index channel_identities_member_idx
  on app_private.channel_identities (organization_id, member_user_id)
  where member_user_id is not null;

create index channel_identities_linked_by_idx
  on app_private.channel_identities (organization_id, linked_by_user_id)
  where linked_by_user_id is not null;

create table app_private.inbound_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  event_type text not null,
  provider_event_id text,
  deduplication_key bytea not null,
  payload_sha256 bytea not null,
  payload jsonb not null,
  provider_occurred_at timestamptz,
  received_at timestamptz not null default now(),
  signature_verified_at timestamptz not null,
  status text not null default 'received',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  last_error_code text,
  request_id text not null,
  trace_id text,
  updated_at timestamptz not null default now(),
  constraint inbound_events_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint inbound_events_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint inbound_events_connection_dedup_unique
    unique (channel_connection_id, deduplication_key),
  constraint inbound_events_event_type_valid
    check (
      event_type = btrim(event_type)
      and char_length(event_type) between 1 and 120
    ),
  constraint inbound_events_provider_event_id_valid
    check (
      provider_event_id is null
      or (
        provider_event_id = btrim(provider_event_id)
        and char_length(provider_event_id) between 1 and 512
      )
    ),
  constraint inbound_events_deduplication_key_valid
    check (octet_length(deduplication_key) = 32),
  constraint inbound_events_payload_sha256_valid
    check (octet_length(payload_sha256) = 32),
  constraint inbound_events_payload_valid
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 1048576
    ),
  constraint inbound_events_status_valid
    check (
      status in (
        'received',
        'processing',
        'retryable',
        'processed',
        'ignored',
        'dead_letter'
      )
    ),
  constraint inbound_events_attempt_count_valid
    check (attempt_count >= 0),
  constraint inbound_events_lifecycle_valid
    check (
      (status <> 'processing' or processing_started_at is not null)
      and (
        status not in ('processed', 'ignored', 'dead_letter')
        or processed_at is not null
      )
    ),
  constraint inbound_events_error_code_valid
    check (
      last_error_code is null
      or (
        last_error_code = btrim(last_error_code)
        and char_length(last_error_code) between 1 and 120
      )
    ),
  constraint inbound_events_request_id_valid
    check (
      request_id = btrim(request_id)
      and char_length(request_id) between 1 and 128
    ),
  constraint inbound_events_trace_id_valid
    check (
      trace_id is null
      or (
        trace_id = btrim(trace_id)
        and char_length(trace_id) between 1 and 128
      )
    ),
  constraint inbound_events_timestamps_valid
    check (
      signature_verified_at <= received_at
      and available_at >= received_at
      and (
        processing_started_at is null
        or processing_started_at >= received_at
      )
      and (processed_at is null or processed_at >= received_at)
    )
);

create unique index inbound_events_provider_event_unique
  on app_private.inbound_events (
    channel_connection_id,
    provider_event_id
  )
  where provider_event_id is not null;

create index inbound_events_claim_idx
  on app_private.inbound_events (available_at, received_at, id)
  where status in ('received', 'retryable');

create table app_private.conversations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  primary_channel_identity_id uuid not null,
  provider_thread_id text,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  last_activity_at timestamptz not null default now(),
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  service_window_expires_at timestamptz,
  origin_kind text,
  origin_external_id text,
  origin_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint conversations_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint conversations_primary_identity_fk
    foreign key (
      organization_id,
      channel_connection_id,
      primary_channel_identity_id
    )
    references app_private.channel_identities (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint conversations_provider_thread_id_valid
    check (
      provider_thread_id is null
      or (
        provider_thread_id = btrim(provider_thread_id)
        and char_length(provider_thread_id) between 1 and 512
      )
    ),
  constraint conversations_status_valid
    check (status in ('open', 'closed', 'archived')),
  constraint conversations_closed_at_valid
    check (
      (status = 'open' and closed_at is null)
      or (status in ('closed', 'archived') and closed_at is not null)
    ),
  constraint conversations_origin_valid
    check (
      (origin_kind is null and origin_external_id is null)
      or (
        origin_kind is not null
        and origin_kind = btrim(origin_kind)
        and char_length(origin_kind) between 1 and 64
        and origin_external_id is not null
        and origin_external_id = btrim(origin_external_id)
        and char_length(origin_external_id) between 1 and 512
      )
    ),
  constraint conversations_origin_context_valid
    check (
      jsonb_typeof(origin_context) = 'object'
      and octet_length(origin_context::text) <= 65536
    ),
  constraint conversations_timestamps_valid
    check (
      opened_at >= created_at
      and last_activity_at >= opened_at
      and (closed_at is null or closed_at >= opened_at)
      and (last_inbound_at is null or last_inbound_at >= opened_at)
      and (last_outbound_at is null or last_outbound_at >= opened_at)
    )
);

create unique index conversations_open_identity_unique
  on app_private.conversations (
    channel_connection_id,
    primary_channel_identity_id
  )
  where status = 'open';

create unique index conversations_provider_thread_unique
  on app_private.conversations (
    channel_connection_id,
    provider_thread_id
  )
  where provider_thread_id is not null;

create index conversations_primary_identity_idx
  on app_private.conversations (
    organization_id,
    channel_connection_id,
    primary_channel_identity_id
  );

create index conversations_organization_activity_idx
  on app_private.conversations (organization_id, last_activity_at desc, id);

create table app_private.conversation_participants (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  participant_kind text not null,
  participant_role text not null,
  channel_identity_id uuid,
  agent_key text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversation_participants_scope_id_unique
    unique (organization_id, channel_connection_id, conversation_id, id),
  constraint conversation_participants_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint conversation_participants_identity_fk
    foreign key (
      organization_id,
      channel_connection_id,
      channel_identity_id
    )
    references app_private.channel_identities (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint conversation_participants_kind_valid
    check (participant_kind in ('identity', 'agent')),
  constraint conversation_participants_role_valid
    check (participant_role in ('customer', 'member', 'agent')),
  constraint conversation_participants_principal_valid
    check (
      (
        participant_kind = 'identity'
        and participant_role in ('customer', 'member')
        and channel_identity_id is not null
        and agent_key is null
      )
      or (
        participant_kind = 'agent'
        and participant_role = 'agent'
        and channel_identity_id is null
        and agent_key is not null
        and agent_key = btrim(agent_key)
        and char_length(agent_key) between 1 and 120
      )
    ),
  constraint conversation_participants_left_at_valid
    check (left_at is null or left_at >= joined_at),
  constraint conversation_participants_created_at_valid
    check (joined_at >= created_at)
);

create unique index conversation_participants_active_identity_unique
  on app_private.conversation_participants (
    conversation_id,
    channel_identity_id
  )
  where channel_identity_id is not null and left_at is null;

create unique index conversation_participants_active_agent_unique
  on app_private.conversation_participants (conversation_id, agent_key)
  where agent_key is not null and left_at is null;

create index conversation_participants_identity_idx
  on app_private.conversation_participants (
    organization_id,
    channel_connection_id,
    channel_identity_id
  )
  where channel_identity_id is not null;

create table app_private.messages (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  sender_participant_id uuid not null,
  source_inbound_event_id uuid,
  reply_to_message_id uuid,
  direction text not null,
  content_kind text not null,
  provider_message_type text,
  external_message_id text,
  deduplication_key bytea not null,
  content jsonb not null,
  provider_context jsonb not null default '{}'::jsonb,
  status text not null,
  provider_occurred_at timestamptz,
  received_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint messages_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint messages_conversation_scope_id_unique
    unique (organization_id, channel_connection_id, conversation_id, id),
  constraint messages_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint messages_sender_participant_fk
    foreign key (
      organization_id,
      channel_connection_id,
      conversation_id,
      sender_participant_id
    )
    references app_private.conversation_participants (
      organization_id,
      channel_connection_id,
      conversation_id,
      id
    )
    on delete restrict,
  constraint messages_source_inbound_event_fk
    foreign key (
      organization_id,
      channel_connection_id,
      source_inbound_event_id
    )
    references app_private.inbound_events (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint messages_reply_to_fk
    foreign key (
      organization_id,
      channel_connection_id,
      conversation_id,
      reply_to_message_id
    )
    references app_private.messages (
      organization_id,
      channel_connection_id,
      conversation_id,
      id
    )
    on delete restrict,
  constraint messages_connection_dedup_unique
    unique (channel_connection_id, deduplication_key),
  constraint messages_direction_valid
    check (direction in ('inbound', 'outbound', 'internal')),
  constraint messages_content_kind_valid
    check (
      content_kind in (
        'text',
        'media',
        'interactive',
        'location',
        'contact',
        'order',
        'reaction',
        'unsupported',
        'system'
      )
    ),
  constraint messages_provider_message_type_valid
    check (
      provider_message_type is null
      or (
        provider_message_type = btrim(provider_message_type)
        and char_length(provider_message_type) between 1 and 120
      )
    ),
  constraint messages_external_message_id_valid
    check (
      external_message_id is null
      or (
        external_message_id = btrim(external_message_id)
        and char_length(external_message_id) between 1 and 512
      )
    ),
  constraint messages_deduplication_key_valid
    check (octet_length(deduplication_key) = 32),
  constraint messages_content_valid
    check (
      jsonb_typeof(content) = 'object'
      and octet_length(content::text) <= 262144
    ),
  constraint messages_provider_context_valid
    check (
      jsonb_typeof(provider_context) = 'object'
      and octet_length(provider_context::text) <= 65536
    ),
  constraint messages_status_valid
    check (
      (
        direction = 'inbound'
        and status in ('received', 'processed', 'ignored', 'failed')
      )
      or (
        direction = 'outbound'
        and status in (
          'draft',
          'queued',
          'accepted',
          'sent',
          'delivered',
          'read',
          'failed',
          'blocked',
          'cancelled'
        )
      )
      or (direction = 'internal' and status = 'recorded')
    ),
  constraint messages_inbound_timestamps_valid
    check (
      direction <> 'inbound'
      or (
        received_at is not null
        and (
          (status = 'received' and processed_at is null)
          or (status in ('processed', 'ignored', 'failed') and processed_at is not null)
        )
      )
    ),
  constraint messages_timestamps_valid
    check (
      (received_at is null or received_at >= created_at)
      and (processed_at is null or processed_at >= created_at)
    )
);

create unique index messages_external_message_unique
  on app_private.messages (channel_connection_id, external_message_id)
  where external_message_id is not null;

create index messages_conversation_timeline_idx
  on app_private.messages (
    organization_id,
    channel_connection_id,
    conversation_id,
    provider_occurred_at desc,
    created_at desc,
    id
  );

create index messages_sender_participant_idx
  on app_private.messages (
    organization_id,
    channel_connection_id,
    conversation_id,
    sender_participant_id
  );

create index messages_source_inbound_event_idx
  on app_private.messages (
    organization_id,
    channel_connection_id,
    source_inbound_event_id
  )
  where source_inbound_event_id is not null;

create index messages_reply_to_idx
  on app_private.messages (
    organization_id,
    channel_connection_id,
    conversation_id,
    reply_to_message_id
  )
  where reply_to_message_id is not null;

create table app_private.message_delivery_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  message_id uuid not null,
  source_inbound_event_id uuid,
  deduplication_key bytea not null,
  status text not null,
  provider_occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  error_code text,
  error_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint message_delivery_events_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint message_delivery_events_message_fk
    foreign key (organization_id, channel_connection_id, message_id)
    references app_private.messages (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint message_delivery_events_source_inbound_fk
    foreign key (
      organization_id,
      channel_connection_id,
      source_inbound_event_id
    )
    references app_private.inbound_events (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint message_delivery_events_connection_dedup_unique
    unique (channel_connection_id, deduplication_key),
  constraint message_delivery_events_deduplication_key_valid
    check (octet_length(deduplication_key) = 32),
  constraint message_delivery_events_status_valid
    check (
      status in ('accepted', 'sent', 'delivered', 'read', 'failed', 'deleted')
    ),
  constraint message_delivery_events_error_code_valid
    check (
      error_code is null
      or (
        error_code = btrim(error_code)
        and char_length(error_code) between 1 and 120
      )
    ),
  constraint message_delivery_events_error_details_valid
    check (
      jsonb_typeof(error_details) = 'object'
      and octet_length(error_details::text) <= 65536
    ),
  constraint message_delivery_events_timestamps_valid
    check (received_at >= created_at)
);

create index message_delivery_events_message_timeline_idx
  on app_private.message_delivery_events (
    organization_id,
    channel_connection_id,
    message_id,
    provider_occurred_at desc,
    received_at desc
  );

create index message_delivery_events_source_inbound_idx
  on app_private.message_delivery_events (
    organization_id,
    channel_connection_id,
    source_inbound_event_id
  )
  where source_inbound_event_id is not null;

create table app_private.consents (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  channel_identity_id uuid not null,
  evidence_message_id uuid,
  purpose text not null,
  decision text not null,
  source text not null,
  deduplication_key bytea not null,
  effective_at timestamptz not null,
  expires_at timestamptz,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint consents_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint consents_identity_fk
    foreign key (
      organization_id,
      channel_connection_id,
      channel_identity_id
    )
    references app_private.channel_identities (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint consents_evidence_message_fk
    foreign key (
      organization_id,
      channel_connection_id,
      evidence_message_id
    )
    references app_private.messages (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint consents_connection_dedup_unique
    unique (channel_connection_id, deduplication_key),
  constraint consents_purpose_valid
    check (
      purpose = btrim(purpose)
      and char_length(purpose) between 1 and 120
    ),
  constraint consents_decision_valid
    check (decision in ('granted', 'revoked')),
  constraint consents_source_valid
    check (
      source = btrim(source)
      and char_length(source) between 1 and 120
    ),
  constraint consents_deduplication_key_valid
    check (octet_length(deduplication_key) = 32),
  constraint consents_metadata_valid
    check (
      jsonb_typeof(metadata) = 'object'
      and octet_length(metadata::text) <= 65536
    ),
  constraint consents_timestamps_valid
    check (
      (expires_at is null or expires_at > effective_at)
      and recorded_at >= effective_at
    )
);

create index consents_identity_current_idx
  on app_private.consents (
    organization_id,
    channel_connection_id,
    channel_identity_id,
    purpose,
    effective_at desc,
    recorded_at desc
  );

create index consents_evidence_message_idx
  on app_private.consents (
    organization_id,
    channel_connection_id,
    evidence_message_id
  )
  where evidence_message_id is not null;

create table app_private.outbox_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid,
  message_id uuid,
  destination_identity_id uuid,
  operation text not null,
  idempotency_key bytea not null,
  payload jsonb not null default '{}'::jsonb,
  policy_status text not null default 'pending',
  policy_basis text,
  policy_evaluated_at timestamptz,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default now(),
  processing_started_at timestamptz,
  lease_expires_at timestamptz,
  completed_at timestamptz,
  provider_request_id text,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outbox_events_scope_id_unique
    unique (organization_id, channel_connection_id, id),
  constraint outbox_events_connection_fk
    foreign key (organization_id, channel_connection_id)
    references app_private.channel_connections (organization_id, id)
    on delete restrict,
  constraint outbox_events_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint outbox_events_message_fk
    foreign key (organization_id, channel_connection_id, message_id)
    references app_private.messages (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint outbox_events_destination_identity_fk
    foreign key (
      organization_id,
      channel_connection_id,
      destination_identity_id
    )
    references app_private.channel_identities (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint outbox_events_connection_idempotency_unique
    unique (channel_connection_id, idempotency_key),
  constraint outbox_events_operation_valid
    check (
      operation = btrim(operation)
      and char_length(operation) between 1 and 120
    ),
  constraint outbox_events_message_send_valid
    check (
      operation <> 'message.send'
      or (
        conversation_id is not null
        and message_id is not null
        and destination_identity_id is not null
      )
    ),
  constraint outbox_events_idempotency_key_valid
    check (octet_length(idempotency_key) = 32),
  constraint outbox_events_payload_valid
    check (
      jsonb_typeof(payload) = 'object'
      and octet_length(payload::text) <= 65536
    ),
  constraint outbox_events_policy_status_valid
    check (policy_status in ('pending', 'allowed', 'blocked')),
  constraint outbox_events_policy_evaluation_valid
    check (
      (
        policy_status = 'pending'
        and policy_basis is null
        and policy_evaluated_at is null
      )
      or (
        policy_status in ('allowed', 'blocked')
        and policy_basis is not null
        and policy_basis = btrim(policy_basis)
        and char_length(policy_basis) between 1 and 120
        and policy_evaluated_at is not null
      )
    ),
  constraint outbox_events_status_valid
    check (
      status in (
        'pending',
        'processing',
        'retryable',
        'succeeded',
        'blocked',
        'failed',
        'cancelled'
      )
    ),
  constraint outbox_events_attempt_count_valid
    check (attempt_count >= 0),
  constraint outbox_events_policy_gate_valid
    check (
      (status not in ('processing', 'succeeded') or policy_status = 'allowed')
      and (status <> 'blocked' or policy_status = 'blocked')
    ),
  constraint outbox_events_processing_valid
    check (
      status <> 'processing'
      or (
        processing_started_at is not null
        and lease_expires_at is not null
        and lease_expires_at > processing_started_at
      )
    ),
  constraint outbox_events_terminal_valid
    check (
      (
        status in ('succeeded', 'blocked', 'failed', 'cancelled')
        and completed_at is not null
      )
      or (
        status in ('pending', 'processing', 'retryable')
        and completed_at is null
      )
    ),
  constraint outbox_events_provider_request_id_valid
    check (
      provider_request_id is null
      or (
        provider_request_id = btrim(provider_request_id)
        and char_length(provider_request_id) between 1 and 512
      )
    ),
  constraint outbox_events_last_error_code_valid
    check (
      last_error_code is null
      or (
        last_error_code = btrim(last_error_code)
        and char_length(last_error_code) between 1 and 120
      )
    ),
  constraint outbox_events_timestamps_valid
    check (
      available_at >= created_at
      and (
        processing_started_at is null
        or processing_started_at >= created_at
      )
      and (completed_at is null or completed_at >= created_at)
      and (
        policy_evaluated_at is null
        or policy_evaluated_at >= created_at
      )
    )
);

create unique index outbox_events_message_send_unique
  on app_private.outbox_events (message_id)
  where operation = 'message.send' and message_id is not null;

create index outbox_events_claim_idx
  on app_private.outbox_events (available_at, created_at, id)
  where status in ('pending', 'retryable');

create index outbox_events_conversation_idx
  on app_private.outbox_events (
    organization_id,
    channel_connection_id,
    conversation_id
  )
  where conversation_id is not null;

create index outbox_events_message_idx
  on app_private.outbox_events (
    organization_id,
    channel_connection_id,
    message_id
  )
  where message_id is not null;

create index outbox_events_destination_identity_idx
  on app_private.outbox_events (
    organization_id,
    channel_connection_id,
    destination_identity_id
  )
  where destination_identity_id is not null;

create function app_private.prevent_channel_connection_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.provider is distinct from old.provider
    or new.channel is distinct from old.channel
    or (
      old.external_app_id is not null
      and new.external_app_id is distinct from old.external_app_id
    )
    or (
      old.external_account_id is not null
      and new.external_account_id is distinct from old.external_account_id
    )
    or (
      old.external_sender_id is not null
      and new.external_sender_id is distinct from old.external_sender_id
    ) then
    raise exception using
      errcode = '23514',
      message = 'channel connection scope and established provider identifiers are immutable';
  end if;

  return new;
end;
$$;

create trigger channel_connections_prevent_reassignment
before update on app_private.channel_connections
for each row execute function app_private.prevent_channel_connection_reassignment();

create function app_private.prevent_organization_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception using
      errcode = '23514',
      message = 'organization scope is immutable';
  end if;

  return new;
end;
$$;

create trigger contacts_prevent_reassignment
before update on app_private.contacts
for each row execute function app_private.prevent_organization_reassignment();

create function app_private.prevent_channel_identity_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.external_subject_id is distinct from old.external_subject_id
    or new.principal_type is distinct from old.principal_type
    or new.contact_id is distinct from old.contact_id
    or new.member_user_id is distinct from old.member_user_id
    or new.trust_level is distinct from old.trust_level
    or new.verified_at is distinct from old.verified_at
    or new.linked_by_user_id is distinct from old.linked_by_user_id then
    raise exception using
      errcode = '23514',
      message = 'channel identity scope and principal are immutable';
  end if;

  return new;
end;
$$;

create trigger channel_identities_prevent_reassignment
before update on app_private.channel_identities
for each row execute function app_private.prevent_channel_identity_reassignment();

create function app_private.prevent_inbound_event_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.event_type is distinct from old.event_type
    or new.provider_event_id is distinct from old.provider_event_id
    or new.deduplication_key is distinct from old.deduplication_key
    or new.payload_sha256 is distinct from old.payload_sha256
    or new.payload is distinct from old.payload
    or new.provider_occurred_at is distinct from old.provider_occurred_at
    or new.received_at is distinct from old.received_at
    or new.signature_verified_at is distinct from old.signature_verified_at
    or new.request_id is distinct from old.request_id
    or new.trace_id is distinct from old.trace_id then
    raise exception using
      errcode = '23514',
      message = 'accepted inbound event evidence is immutable';
  end if;

  return new;
end;
$$;

create trigger inbound_events_prevent_core_rewrite
before update on app_private.inbound_events
for each row execute function app_private.prevent_inbound_event_core_rewrite();

create function app_private.prevent_conversation_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.primary_channel_identity_id is distinct from old.primary_channel_identity_id
    or (
      old.provider_thread_id is not null
      and new.provider_thread_id is distinct from old.provider_thread_id
    ) then
    raise exception using
      errcode = '23514',
      message = 'conversation scope and established provider thread are immutable';
  end if;

  return new;
end;
$$;

create trigger conversations_prevent_reassignment
before update on app_private.conversations
for each row execute function app_private.prevent_conversation_reassignment();

create function app_private.prevent_participant_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.participant_kind is distinct from old.participant_kind
    or new.participant_role is distinct from old.participant_role
    or new.channel_identity_id is distinct from old.channel_identity_id
    or new.agent_key is distinct from old.agent_key
    or new.joined_at is distinct from old.joined_at
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'conversation participant scope and principal are immutable';
  end if;

  return new;
end;
$$;

create trigger conversation_participants_prevent_reassignment
before update on app_private.conversation_participants
for each row execute function app_private.prevent_participant_reassignment();

create function app_private.assert_open_conversation_primary_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_connection_id uuid;
  target_conversation_id uuid;
begin
  if tg_table_name = 'conversations' then
    target_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
    target_connection_id := case when tg_op = 'DELETE' then old.channel_connection_id else new.channel_connection_id end;
    target_conversation_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    target_organization_id := case when tg_op = 'DELETE' then old.organization_id else new.organization_id end;
    target_connection_id := case when tg_op = 'DELETE' then old.channel_connection_id else new.channel_connection_id end;
    target_conversation_id := case when tg_op = 'DELETE' then old.conversation_id else new.conversation_id end;
  end if;

  if exists (
    select 1
    from app_private.conversations as conversation
    where conversation.organization_id = target_organization_id
      and conversation.channel_connection_id = target_connection_id
      and conversation.id = target_conversation_id
      and conversation.status = 'open'
  ) and not exists (
    select 1
    from app_private.conversations as conversation
    join app_private.conversation_participants as participant
      on participant.organization_id = conversation.organization_id
      and participant.channel_connection_id = conversation.channel_connection_id
      and participant.conversation_id = conversation.id
      and participant.channel_identity_id = conversation.primary_channel_identity_id
      and participant.participant_kind = 'identity'
      and participant.left_at is null
    where conversation.organization_id = target_organization_id
      and conversation.channel_connection_id = target_connection_id
      and conversation.id = target_conversation_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'open conversation requires its primary identity as an active participant';
  end if;

  return null;
end;
$$;

create constraint trigger conversations_require_primary_participant
after insert or update on app_private.conversations
deferrable initially deferred
for each row execute function app_private.assert_open_conversation_primary_participant();

create constraint trigger conversation_participants_preserve_primary
after insert or update or delete on app_private.conversation_participants
deferrable initially deferred
for each row execute function app_private.assert_open_conversation_primary_participant();

create function app_private.prevent_message_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.sender_participant_id is distinct from old.sender_participant_id
    or new.source_inbound_event_id is distinct from old.source_inbound_event_id
    or new.reply_to_message_id is distinct from old.reply_to_message_id
    or new.direction is distinct from old.direction
    or new.content_kind is distinct from old.content_kind
    or new.provider_message_type is distinct from old.provider_message_type
    or (
      old.external_message_id is not null
      and new.external_message_id is distinct from old.external_message_id
    )
    or new.deduplication_key is distinct from old.deduplication_key
    or new.content is distinct from old.content
    or new.provider_occurred_at is distinct from old.provider_occurred_at
    or new.received_at is distinct from old.received_at
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'message scope, authorship and accepted content are immutable';
  end if;

  return new;
end;
$$;

create trigger messages_prevent_core_rewrite
before update on app_private.messages
for each row execute function app_private.prevent_message_core_rewrite();

create function app_private.prevent_outbox_event_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.message_id is distinct from old.message_id
    or new.destination_identity_id is distinct from old.destination_identity_id
    or new.operation is distinct from old.operation
    or new.idempotency_key is distinct from old.idempotency_key
    or new.payload is distinct from old.payload
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'outbox effect scope and idempotency contract are immutable';
  end if;

  return new;
end;
$$;

create trigger outbox_events_prevent_core_rewrite
before update on app_private.outbox_events
for each row execute function app_private.prevent_outbox_event_core_rewrite();

create trigger channel_connections_set_updated_at
before update on app_private.channel_connections
for each row execute function app_private.set_updated_at();

create trigger contacts_set_updated_at
before update on app_private.contacts
for each row execute function app_private.set_updated_at();

create trigger channel_identities_set_updated_at
before update on app_private.channel_identities
for each row execute function app_private.set_updated_at();

create trigger inbound_events_set_updated_at
before update on app_private.inbound_events
for each row execute function app_private.set_updated_at();

create trigger conversations_set_updated_at
before update on app_private.conversations
for each row execute function app_private.set_updated_at();

create trigger messages_set_updated_at
before update on app_private.messages
for each row execute function app_private.set_updated_at();

create trigger outbox_events_set_updated_at
before update on app_private.outbox_events
for each row execute function app_private.set_updated_at();

alter table app_private.channel_connections enable row level security;
alter table app_private.channel_connections force row level security;
alter table app_private.contacts enable row level security;
alter table app_private.contacts force row level security;
alter table app_private.channel_identities enable row level security;
alter table app_private.channel_identities force row level security;
alter table app_private.inbound_events enable row level security;
alter table app_private.inbound_events force row level security;
alter table app_private.conversations enable row level security;
alter table app_private.conversations force row level security;
alter table app_private.conversation_participants enable row level security;
alter table app_private.conversation_participants force row level security;
alter table app_private.messages enable row level security;
alter table app_private.messages force row level security;
alter table app_private.message_delivery_events enable row level security;
alter table app_private.message_delivery_events force row level security;
alter table app_private.consents enable row level security;
alter table app_private.consents force row level security;
alter table app_private.outbox_events enable row level security;
alter table app_private.outbox_events force row level security;

create policy channel_connections_admin_select
on app_private.channel_connections
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = channel_connections.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create policy contacts_operator_select
on app_private.contacts
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = contacts.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy channel_identities_operator_select
on app_private.channel_identities
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = channel_identities.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy conversations_operator_select
on app_private.conversations
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = conversations.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy conversation_participants_operator_select
on app_private.conversation_participants
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = conversation_participants.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy messages_operator_select
on app_private.messages
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = messages.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy message_delivery_events_operator_select
on app_private.message_delivery_events
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = message_delivery_events.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create policy consents_operator_select
on app_private.consents
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = consents.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create view api.channel_connections
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  provider,
  channel,
  external_app_id,
  external_account_id,
  external_sender_id,
  display_name,
  api_version,
  status,
  connected_at,
  last_verified_at,
  disabled_at,
  created_at,
  updated_at
from app_private.channel_connections;

create view api.contacts
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  display_name,
  preferred_locale,
  status,
  created_at,
  updated_at
from app_private.contacts;

create view api.channel_identities
with (security_invoker = true, security_barrier = true)
as
select
  id,
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
  last_seen_at,
  revoked_at,
  created_at,
  updated_at
from app_private.channel_identities;

create view api.conversations
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  channel_connection_id,
  primary_channel_identity_id,
  provider_thread_id,
  status,
  opened_at,
  closed_at,
  last_activity_at,
  last_inbound_at,
  last_outbound_at,
  service_window_expires_at,
  origin_kind,
  origin_external_id,
  created_at,
  updated_at
from app_private.conversations;

create view api.conversation_participants
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  channel_connection_id,
  conversation_id,
  participant_kind,
  participant_role,
  channel_identity_id,
  agent_key,
  joined_at,
  left_at,
  created_at
from app_private.conversation_participants;

create view api.messages
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  channel_connection_id,
  conversation_id,
  sender_participant_id,
  reply_to_message_id,
  direction,
  content_kind,
  provider_message_type,
  external_message_id,
  content,
  status,
  provider_occurred_at,
  received_at,
  processed_at,
  created_at,
  updated_at
from app_private.messages;

create view api.message_delivery_events
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  channel_connection_id,
  message_id,
  status,
  provider_occurred_at,
  received_at,
  error_code,
  created_at
from app_private.message_delivery_events;

create view api.consents
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  channel_connection_id,
  channel_identity_id,
  evidence_message_id,
  purpose,
  decision,
  source,
  effective_at,
  expires_at,
  recorded_at
from app_private.consents;

revoke all on
  app_private.channel_connections,
  app_private.contacts,
  app_private.channel_identities,
  app_private.inbound_events,
  app_private.conversations,
  app_private.conversation_participants,
  app_private.messages,
  app_private.message_delivery_events,
  app_private.consents,
  app_private.outbox_events
from public, anon, authenticated, service_role;

revoke all on
  api.channel_connections,
  api.contacts,
  api.channel_identities,
  api.conversations,
  api.conversation_participants,
  api.messages,
  api.message_delivery_events,
  api.consents
from public, anon, authenticated, service_role;

grant select on
  app_private.channel_connections,
  app_private.contacts,
  app_private.channel_identities,
  app_private.conversations,
  app_private.conversation_participants,
  app_private.messages,
  app_private.message_delivery_events,
  app_private.consents
to authenticated;

grant select, insert, update on
  app_private.channel_connections,
  app_private.contacts,
  app_private.channel_identities,
  app_private.inbound_events,
  app_private.conversations,
  app_private.conversation_participants,
  app_private.messages,
  app_private.outbox_events
to service_role;

grant select, insert on
  app_private.message_delivery_events,
  app_private.consents
to service_role;

grant select on
  api.channel_connections,
  api.contacts,
  api.channel_identities,
  api.conversations,
  api.conversation_participants,
  api.messages,
  api.message_delivery_events,
  api.consents
to authenticated, service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;
revoke all on all functions in schema app_private
  from public, anon, authenticated, service_role;
revoke all on all functions in schema api
  from public, anon, authenticated, service_role;

comment on table app_private.channel_connections is
  'Scoped Meta messaging endpoint; secret columns contain references only, never credential values';
comment on table app_private.contacts is
  'Organization-owned customer identity independent from channel identifiers and conversations';
comment on table app_private.channel_identities is
  'Connection-scoped external principal; member links require verified organizational membership';
comment on table app_private.inbound_events is
  'Private idempotent inbox of authenticated webhook deliveries; never exposed to authenticated users';
comment on table app_private.conversations is
  'Connection-scoped conversation with explicit primary identity and provider origin context';
comment on table app_private.conversation_participants is
  'Temporal participants for channel identities and versionable agents';
comment on table app_private.messages is
  'Normalized untrusted message content with connection-scoped idempotency';
comment on table app_private.message_delivery_events is
  'Append-only provider delivery ledger preserving provider occurrence order';
comment on table app_private.consents is
  'Append-only communication consent evidence with source, purpose and effective time';
comment on table app_private.outbox_events is
  'Private idempotent external-effect outbox gated by deterministic messaging policy';

commit;
