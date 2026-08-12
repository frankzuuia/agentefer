begin;

create extension if not exists pgcrypto with schema extensions;

create table app_private.commercial_commands (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  idempotency_key text not null,
  operation text not null,
  request_fingerprint bytea not null,
  request_payload jsonb not null,
  result_type text,
  result_id uuid,
  created_by_user_id uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint commercial_commands_organization_id_id_unique unique (organization_id, id),
  constraint commercial_commands_idempotency_unique unique (organization_id, idempotency_key),
  constraint commercial_commands_organization_fk foreign key (organization_id)
    references app_private.organizations (id) on delete restrict,
  constraint commercial_commands_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint commercial_commands_idempotency_key_valid check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 8 and 200
  ),
  constraint commercial_commands_operation_valid check (
    operation = lower(btrim(operation))
    and operation ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint commercial_commands_fingerprint_valid check (octet_length(request_fingerprint) = 32),
  constraint commercial_commands_payload_valid check (
    jsonb_typeof(request_payload) = 'object'
    and octet_length(request_payload::text) <= 262144
  ),
  constraint commercial_commands_result_valid check (
    (result_type is null and result_id is null and completed_at is null)
    or (
      result_type in (
        'contact_method', 'pending_request', 'lead', 'opportunity', 'handoff',
        'order', 'sale', 'sale_line'
      )
      and result_id is not null
      and completed_at is not null
      and completed_at >= created_at
    )
  )
);

create index commercial_commands_created_by_user_idx
  on app_private.commercial_commands (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.contact_methods (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  contact_id uuid not null,
  creation_command_id uuid not null,
  method_kind text not null,
  value_ciphertext bytea not null,
  value_fingerprint bytea not null,
  display_hint text not null,
  encryption_key_ref text not null,
  consent_purpose text not null,
  consent_source text not null,
  status text not null default 'active',
  consented_at timestamptz not null,
  revoked_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contact_methods_organization_id_id_unique unique (organization_id, id),
  constraint contact_methods_creation_command_unique unique (organization_id, creation_command_id),
  constraint contact_methods_contact_fk foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id) on delete restrict,
  constraint contact_methods_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint contact_methods_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint contact_methods_kind_valid check (method_kind in ('phone', 'whatsapp', 'email')),
  constraint contact_methods_ciphertext_valid check (octet_length(value_ciphertext) between 32 and 4096),
  constraint contact_methods_fingerprint_valid check (octet_length(value_fingerprint) = 32),
  constraint contact_methods_display_hint_valid check (
    display_hint = btrim(display_hint) and char_length(display_hint) between 2 and 80
  ),
  constraint contact_methods_key_ref_valid check (
    encryption_key_ref = btrim(encryption_key_ref)
    and char_length(encryption_key_ref) between 3 and 255
  ),
  constraint contact_methods_consent_purpose_valid check (
    consent_purpose = lower(btrim(consent_purpose))
    and consent_purpose ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint contact_methods_consent_source_valid check (
    consent_source = lower(btrim(consent_source))
    and consent_source ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint contact_methods_status_valid check (status in ('active', 'revoked')),
  constraint contact_methods_revocation_valid check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null and revoked_at >= consented_at)
  ),
  constraint contact_methods_consent_time_valid check (consented_at <= created_at + interval '5 minutes')
);

create unique index contact_methods_active_fingerprint_unique
  on app_private.contact_methods (organization_id, method_kind, value_fingerprint)
  where status = 'active';
create index contact_methods_contact_idx
  on app_private.contact_methods (organization_id, contact_id, status, id);
create index contact_methods_created_by_user_idx
  on app_private.contact_methods (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.pending_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  contact_id uuid not null,
  source_message_id uuid,
  request_kind text not null,
  status text not null default 'open',
  variant_id uuid,
  unit_id uuid,
  requested_quantity numeric,
  requested_fields jsonb not null,
  collected_context jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  resolution_kind text,
  resolution_text text,
  resolved_price_amount numeric,
  resolved_currency_code text,
  resolved_by_user_id uuid,
  resolved_at timestamptz,
  response_delivery_status text not null default 'not_requested',
  response_outbox_event_id uuid,
  responded_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pending_requests_organization_id_id_unique unique (organization_id, id),
  constraint pending_requests_creation_command_unique unique (organization_id, creation_command_id),
  constraint pending_requests_conversation_scope_id_unique
    unique (organization_id, channel_connection_id, conversation_id, id),
  constraint pending_requests_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint pending_requests_conversation_fk foreign key (
    organization_id, channel_connection_id, conversation_id
  ) references app_private.conversations (organization_id, channel_connection_id, id) on delete restrict,
  constraint pending_requests_contact_fk foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id) on delete restrict,
  constraint pending_requests_source_message_fk foreign key (
    organization_id, channel_connection_id, conversation_id, source_message_id
  ) references app_private.messages (organization_id, channel_connection_id, conversation_id, id) on delete restrict,
  constraint pending_requests_variant_fk foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id) on delete restrict,
  constraint pending_requests_unit_fk foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id) on delete restrict,
  constraint pending_requests_resolved_by_fk foreign key (organization_id, resolved_by_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint pending_requests_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint pending_requests_outbox_fk foreign key (
    organization_id, channel_connection_id, response_outbox_event_id
  ) references app_private.outbox_events (organization_id, channel_connection_id, id) on delete restrict,
  constraint pending_requests_kind_valid check (
    request_kind = lower(btrim(request_kind))
    and request_kind ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint pending_requests_status_valid check (status in ('open', 'resolved', 'cancelled', 'expired')),
  constraint pending_requests_subject_valid check (unit_id is null or variant_id is not null),
  constraint pending_requests_quantity_valid check (
    requested_quantity is null
    or (
      requested_quantity > 0 and requested_quantity <= 1000000000000
      and scale(requested_quantity) <= 9 and unit_id is not null
    )
  ),
  constraint pending_requests_fields_valid check (
    jsonb_typeof(requested_fields) = 'array'
    and jsonb_array_length(requested_fields) between 1 and 50
  ),
  constraint pending_requests_context_valid check (
    jsonb_typeof(collected_context) = 'object'
    and octet_length(collected_context::text) <= 65536
  ),
  constraint pending_requests_due_valid check (due_at is null or due_at > created_at),
  constraint pending_requests_resolution_valid check (
    (status = 'open' and resolution_kind is null and resolution_text is null
      and resolved_price_amount is null and resolved_currency_code is null
      and resolved_by_user_id is null and resolved_at is null)
    or (status = 'resolved' and resolution_kind is not null and resolution_text is not null
      and resolved_by_user_id is not null and resolved_at is not null)
    or (status in ('cancelled', 'expired') and resolution_kind is not null
      and resolution_text is not null and resolved_at is not null)
  ),
  constraint pending_requests_resolution_kind_valid check (
    resolution_kind is null
    or (resolution_kind = lower(btrim(resolution_kind))
      and resolution_kind ~ '^[a-z0-9][a-z0-9._-]{0,126}$')
  ),
  constraint pending_requests_resolution_text_valid check (
    resolution_text is null
    or (resolution_text = btrim(resolution_text) and char_length(resolution_text) between 1 and 10000)
  ),
  constraint pending_requests_resolution_price_valid check (
    (resolved_price_amount is null and resolved_currency_code is null)
    or (status = 'resolved' and resolved_price_amount >= 0
      and resolved_price_amount <= 999999999999.999999
      and scale(resolved_price_amount) <= 6
      and resolved_currency_code ~ '^[A-Z]{3}$')
  ),
  constraint pending_requests_delivery_status_valid check (
    response_delivery_status in ('not_requested', 'pending', 'queued', 'succeeded', 'failed')
  ),
  constraint pending_requests_delivery_valid check (
    (response_delivery_status = 'not_requested' and response_outbox_event_id is null and responded_at is null)
    or (response_delivery_status = 'pending' and status = 'resolved'
      and response_outbox_event_id is null and responded_at is null)
    or (response_delivery_status in ('queued', 'failed') and status = 'resolved'
      and response_outbox_event_id is not null and responded_at is null)
    or (response_delivery_status = 'succeeded' and status = 'resolved'
      and response_outbox_event_id is not null and responded_at is not null)
  )
);

create index pending_requests_open_idx
  on app_private.pending_requests (organization_id, created_at, id)
  where status = 'open';
create index pending_requests_conversation_idx
  on app_private.pending_requests (organization_id, channel_connection_id, conversation_id, status, id);
create index pending_requests_contact_idx
  on app_private.pending_requests (organization_id, contact_id, status, id);
create index pending_requests_variant_idx
  on app_private.pending_requests (organization_id, variant_id, status, id)
  where variant_id is not null;
create index pending_requests_unit_idx
  on app_private.pending_requests (organization_id, unit_id)
  where unit_id is not null;
create index pending_requests_source_message_idx
  on app_private.pending_requests (organization_id, channel_connection_id, conversation_id, source_message_id)
  where source_message_id is not null;
create index pending_requests_resolved_by_idx
  on app_private.pending_requests (organization_id, resolved_by_user_id)
  where resolved_by_user_id is not null;
create index pending_requests_created_by_user_idx
  on app_private.pending_requests (created_by_user_id)
  where created_by_user_id is not null;
create index pending_requests_outbox_idx
  on app_private.pending_requests (organization_id, channel_connection_id, response_outbox_event_id)
  where response_outbox_event_id is not null;

create table app_private.leads (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  contact_id uuid not null,
  channel_connection_id uuid,
  conversation_id uuid,
  source text not null,
  status text not null default 'open',
  summary text not null,
  captured_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_organization_id_id_unique unique (organization_id, id),
  constraint leads_creation_command_unique unique (organization_id, creation_command_id),
  constraint leads_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint leads_contact_fk foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id) on delete restrict,
  constraint leads_conversation_fk foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id) on delete restrict,
  constraint leads_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint leads_conversation_scope_valid check (
    (channel_connection_id is null and conversation_id is null)
    or (channel_connection_id is not null and conversation_id is not null)
  ),
  constraint leads_source_valid check (
    source = lower(btrim(source)) and source ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint leads_status_valid check (status in ('open', 'qualified', 'disqualified', 'converted', 'archived')),
  constraint leads_summary_valid check (summary = btrim(summary) and char_length(summary) between 1 and 10000),
  constraint leads_lifecycle_valid check (
    (status in ('open', 'qualified') and closed_at is null)
    or (status in ('disqualified', 'converted', 'archived') and closed_at is not null and closed_at >= captured_at)
  )
);

create unique index leads_one_open_conversation
  on app_private.leads (organization_id, channel_connection_id, conversation_id)
  where conversation_id is not null and status in ('open', 'qualified');
create index leads_contact_idx on app_private.leads (organization_id, contact_id, status, captured_at, id);
create index leads_conversation_idx
  on app_private.leads (organization_id, channel_connection_id, conversation_id)
  where conversation_id is not null;
create index leads_created_by_user_idx on app_private.leads (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.lead_interests (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  lead_id uuid not null,
  variant_id uuid,
  unit_id uuid,
  requested_quantity numeric,
  summary text not null,
  captured_context jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lead_interests_organization_id_id_unique unique (organization_id, id),
  constraint lead_interests_lead_fk foreign key (organization_id, lead_id)
    references app_private.leads (organization_id, id) on delete restrict,
  constraint lead_interests_variant_fk foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id) on delete restrict,
  constraint lead_interests_unit_fk foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id) on delete restrict,
  constraint lead_interests_subject_valid check (unit_id is null or variant_id is not null),
  constraint lead_interests_quantity_valid check (
    requested_quantity is null
    or (requested_quantity > 0 and requested_quantity <= 1000000000000
      and scale(requested_quantity) <= 9 and unit_id is not null)
  ),
  constraint lead_interests_summary_valid check (
    summary = btrim(summary) and char_length(summary) between 1 and 5000
  ),
  constraint lead_interests_context_valid check (
    jsonb_typeof(captured_context) = 'object' and octet_length(captured_context::text) <= 65536
  ),
  constraint lead_interests_status_valid check (status in ('active', 'satisfied', 'dropped'))
);

create index lead_interests_lead_idx on app_private.lead_interests (organization_id, lead_id, status, id);
create index lead_interests_variant_idx on app_private.lead_interests (organization_id, variant_id, status, id)
  where variant_id is not null;
create index lead_interests_unit_idx on app_private.lead_interests (organization_id, unit_id, status, id)
  where unit_id is not null;

create table app_private.opportunities (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  lead_id uuid not null,
  status text not null default 'open',
  handling_mode text not null,
  stage_code text not null,
  title text not null,
  estimated_amount numeric,
  currency_code text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint opportunities_organization_id_id_unique unique (organization_id, id),
  constraint opportunities_creation_command_unique unique (organization_id, creation_command_id),
  constraint opportunities_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint opportunities_lead_fk foreign key (organization_id, lead_id)
    references app_private.leads (organization_id, id) on delete restrict,
  constraint opportunities_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint opportunities_status_valid check (
    status in ('open', 'qualified', 'negotiating', 'won', 'lost', 'abandoned')
  ),
  constraint opportunities_handling_mode_valid check (handling_mode in ('agent_close', 'human_handoff')),
  constraint opportunities_stage_code_valid check (
    stage_code = lower(btrim(stage_code)) and stage_code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint opportunities_title_valid check (title = btrim(title) and char_length(title) between 1 and 500),
  constraint opportunities_estimate_valid check (
    (estimated_amount is null and currency_code is null)
    or (estimated_amount >= 0 and estimated_amount <= 999999999999.999999
      and scale(estimated_amount) <= 6 and currency_code ~ '^[A-Z]{3}$')
  ),
  constraint opportunities_lifecycle_valid check (
    (status in ('open', 'qualified', 'negotiating') and closed_at is null)
    or (status in ('won', 'lost', 'abandoned') and closed_at is not null and closed_at >= opened_at)
  )
);

create index opportunities_lead_idx on app_private.opportunities (organization_id, lead_id, status, opened_at, id);
create index opportunities_created_by_user_idx on app_private.opportunities (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.conversation_assignments (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  opportunity_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  assignee_kind text not null,
  member_user_id uuid,
  agent_key text,
  reason text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  constraint conversation_assignments_organization_id_id_unique unique (organization_id, id),
  constraint conversation_assignments_opportunity_fk foreign key (organization_id, opportunity_id)
    references app_private.opportunities (organization_id, id) on delete restrict,
  constraint conversation_assignments_conversation_fk foreign key (
    organization_id, channel_connection_id, conversation_id
  ) references app_private.conversations (organization_id, channel_connection_id, id) on delete restrict,
  constraint conversation_assignments_member_fk foreign key (organization_id, member_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint conversation_assignments_kind_valid check (assignee_kind in ('agent', 'member')),
  constraint conversation_assignments_principal_valid check (
    (assignee_kind = 'agent' and agent_key is not null and member_user_id is null
      and agent_key = btrim(agent_key) and char_length(agent_key) between 1 and 120)
    or (assignee_kind = 'member' and member_user_id is not null and agent_key is null)
  ),
  constraint conversation_assignments_reason_valid check (
    reason = btrim(reason) and char_length(reason) between 1 and 2000
  ),
  constraint conversation_assignments_time_valid check (
    started_at <= created_at + interval '5 minutes'
    and (ended_at is null or ended_at >= started_at)
  )
);

create unique index conversation_assignments_one_active_opportunity
  on app_private.conversation_assignments (organization_id, opportunity_id)
  where ended_at is null;
create unique index conversation_assignments_one_active_conversation
  on app_private.conversation_assignments (organization_id, channel_connection_id, conversation_id)
  where ended_at is null;
create index conversation_assignments_opportunity_idx
  on app_private.conversation_assignments (organization_id, opportunity_id, started_at, id);
create index conversation_assignments_conversation_idx
  on app_private.conversation_assignments (
    organization_id, channel_connection_id, conversation_id, started_at, id
  );
create index conversation_assignments_member_idx
  on app_private.conversation_assignments (organization_id, member_user_id, ended_at, id)
  where member_user_id is not null;

create table app_private.handoffs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  opportunity_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  from_assignment_id uuid not null,
  target_kind text not null,
  target_member_user_id uuid,
  target_agent_key text,
  status text not null default 'pending',
  reason text not null,
  context_summary jsonb not null,
  requested_by_user_id uuid,
  decided_by_user_id uuid,
  accepted_assignment_id uuid,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handoffs_organization_id_id_unique unique (organization_id, id),
  constraint handoffs_creation_command_unique unique (organization_id, creation_command_id),
  constraint handoffs_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint handoffs_opportunity_fk foreign key (organization_id, opportunity_id)
    references app_private.opportunities (organization_id, id) on delete restrict,
  constraint handoffs_conversation_fk foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id) on delete restrict,
  constraint handoffs_from_assignment_fk foreign key (organization_id, from_assignment_id)
    references app_private.conversation_assignments (organization_id, id) on delete restrict,
  constraint handoffs_target_member_fk foreign key (organization_id, target_member_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint handoffs_requested_by_fk foreign key (organization_id, requested_by_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint handoffs_decided_by_fk foreign key (organization_id, decided_by_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint handoffs_accepted_assignment_fk foreign key (organization_id, accepted_assignment_id)
    references app_private.conversation_assignments (organization_id, id) on delete restrict,
  constraint handoffs_target_kind_valid check (target_kind in ('agent', 'member')),
  constraint handoffs_target_valid check (
    (target_kind = 'agent' and target_agent_key is not null and target_member_user_id is null
      and target_agent_key = btrim(target_agent_key) and char_length(target_agent_key) between 1 and 120)
    or (target_kind = 'member' and target_member_user_id is not null and target_agent_key is null)
  ),
  constraint handoffs_status_valid check (status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
  constraint handoffs_reason_valid check (reason = btrim(reason) and char_length(reason) between 1 and 2000),
  constraint handoffs_context_valid check (
    jsonb_typeof(context_summary) = 'object' and octet_length(context_summary::text) <= 131072
  ),
  constraint handoffs_decision_valid check (
    (status = 'pending' and decided_at is null and decided_by_user_id is null and accepted_assignment_id is null)
    or (status = 'accepted' and decided_at is not null and accepted_assignment_id is not null)
    or (status in ('declined', 'cancelled', 'expired') and decided_at is not null and accepted_assignment_id is null)
  ),
  constraint handoffs_time_valid check (
    requested_at <= created_at + interval '5 minutes'
    and (decided_at is null or decided_at >= requested_at)
  )
);

create unique index handoffs_one_pending_opportunity
  on app_private.handoffs (organization_id, opportunity_id)
  where status = 'pending';
create index handoffs_conversation_idx
  on app_private.handoffs (organization_id, channel_connection_id, conversation_id, requested_at, id);
create index handoffs_opportunity_idx
  on app_private.handoffs (organization_id, opportunity_id, requested_at, id);
create index handoffs_from_assignment_idx
  on app_private.handoffs (organization_id, from_assignment_id);
create index handoffs_accepted_assignment_idx
  on app_private.handoffs (organization_id, accepted_assignment_id)
  where accepted_assignment_id is not null;
create index handoffs_target_member_idx
  on app_private.handoffs (organization_id, target_member_user_id, status, id)
  where target_member_user_id is not null;
create index handoffs_requested_by_idx on app_private.handoffs (organization_id, requested_by_user_id)
  where requested_by_user_id is not null;
create index handoffs_decided_by_idx on app_private.handoffs (organization_id, decided_by_user_id)
  where decided_by_user_id is not null;

create table app_private.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  contact_id uuid not null,
  preferred_contact_method_id uuid,
  opportunity_id uuid,
  channel_connection_id uuid,
  conversation_id uuid,
  origin text not null,
  status text not null,
  handling_mode text not null,
  currency_code text,
  subtotal_amount numeric,
  total_amount numeric,
  contact_snapshot jsonb not null,
  customer_note text,
  notification_status text not null default 'not_requested',
  notification_channel_connection_id uuid,
  notification_outbox_event_id uuid,
  notified_at timestamptz,
  submitted_at timestamptz not null default now(),
  closed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_organization_id_id_unique unique (organization_id, id),
  constraint orders_creation_command_unique unique (organization_id, creation_command_id),
  constraint orders_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint orders_contact_fk foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id) on delete restrict,
  constraint orders_contact_method_fk foreign key (organization_id, preferred_contact_method_id)
    references app_private.contact_methods (organization_id, id) on delete restrict,
  constraint orders_opportunity_fk foreign key (organization_id, opportunity_id)
    references app_private.opportunities (organization_id, id) on delete restrict,
  constraint orders_conversation_fk foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (organization_id, channel_connection_id, id) on delete restrict,
  constraint orders_notification_outbox_fk foreign key (
    organization_id, notification_channel_connection_id, notification_outbox_event_id
  ) references app_private.outbox_events (organization_id, channel_connection_id, id) on delete restrict,
  constraint orders_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint orders_conversation_scope_valid check (
    (channel_connection_id is null and conversation_id is null)
    or (channel_connection_id is not null and conversation_id is not null)
  ),
  constraint orders_origin_valid check (
    origin = lower(btrim(origin)) and origin ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint orders_status_valid check (
    status in ('pending_quote', 'pending_confirmation', 'confirmed', 'partially_fulfilled',
      'fulfilled', 'cancelled', 'expired', 'stock_unavailable')
  ),
  constraint orders_handling_mode_valid check (handling_mode in ('agent_close', 'human_handoff')),
  constraint orders_amounts_valid check (
    (currency_code is null and subtotal_amount is null and total_amount is null)
    or (currency_code ~ '^[A-Z]{3}$' and subtotal_amount >= 0 and total_amount >= subtotal_amount
      and total_amount <= 999999999999.999999 and scale(subtotal_amount) <= 6 and scale(total_amount) <= 6)
  ),
  constraint orders_contact_snapshot_valid check (
    jsonb_typeof(contact_snapshot) = 'object' and octet_length(contact_snapshot::text) <= 8192
  ),
  constraint orders_customer_note_valid check (
    customer_note is null or (customer_note = btrim(customer_note) and char_length(customer_note) between 1 and 10000)
  ),
  constraint orders_notification_status_valid check (
    notification_status in ('not_requested', 'pending', 'queued', 'succeeded', 'failed')
  ),
  constraint orders_notification_valid check (
    (notification_status in ('not_requested', 'pending')
      and notification_channel_connection_id is null
      and notification_outbox_event_id is null and notified_at is null)
    or (notification_status in ('queued', 'failed')
      and notification_channel_connection_id is not null
      and notification_outbox_event_id is not null and notified_at is null)
    or (notification_status = 'succeeded'
      and notification_channel_connection_id is not null
      and notification_outbox_event_id is not null and notified_at is not null)
  ),
  constraint orders_lifecycle_valid check (
    (status in ('pending_quote', 'pending_confirmation', 'confirmed', 'partially_fulfilled') and closed_at is null)
    or (status in ('fulfilled', 'cancelled', 'expired', 'stock_unavailable')
      and closed_at is not null and closed_at >= submitted_at)
  )
);

create index orders_contact_idx on app_private.orders (organization_id, contact_id, submitted_at, id);
create index orders_conversation_idx on app_private.orders (
  organization_id, channel_connection_id, conversation_id, submitted_at, id
) where conversation_id is not null;
create index orders_opportunity_idx on app_private.orders (organization_id, opportunity_id, status, id)
  where opportunity_id is not null;
create index orders_contact_method_idx on app_private.orders (organization_id, preferred_contact_method_id)
  where preferred_contact_method_id is not null;
create index orders_created_by_user_idx on app_private.orders (created_by_user_id)
  where created_by_user_id is not null;
create index orders_notification_outbox_idx
  on app_private.orders (
    organization_id, notification_channel_connection_id, notification_outbox_event_id
  )
  where notification_outbox_event_id is not null;

create table app_private.order_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null,
  line_number integer not null,
  variant_id uuid not null,
  unit_id uuid not null,
  price_tier_id uuid not null,
  quantity numeric not null,
  pricing_status text not null,
  calculation_method text,
  price_amount numeric,
  line_total_amount numeric,
  currency_code text not null,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  sku_snapshot text not null,
  unit_code_snapshot text not null,
  offer_snapshot jsonb not null,
  quoted_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint order_lines_organization_id_id_unique unique (organization_id, id),
  constraint order_lines_order_line_unique unique (organization_id, order_id, line_number),
  constraint order_lines_order_fk foreign key (organization_id, order_id)
    references app_private.orders (organization_id, id) on delete restrict,
  constraint order_lines_variant_fk foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id) on delete restrict,
  constraint order_lines_unit_fk foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id) on delete restrict,
  constraint order_lines_price_tier_fk foreign key (organization_id, price_tier_id)
    references app_private.price_tiers (organization_id, id) on delete restrict,
  constraint order_lines_line_number_valid check (line_number between 1 and 500),
  constraint order_lines_quantity_valid check (
    quantity > 0 and quantity <= 1000000000000 and scale(quantity) <= 9
  ),
  constraint order_lines_pricing_status_valid check (pricing_status in ('priced', 'on_request')),
  constraint order_lines_price_contract_valid check (
    (pricing_status = 'priced' and calculation_method in ('fixed_total', 'per_unit')
      and price_amount is not null and line_total_amount is not null)
    or (pricing_status = 'on_request' and calculation_method is null
      and price_amount is null and line_total_amount is null)
  ),
  constraint order_lines_amount_valid check (
    price_amount is null or (price_amount >= 0 and price_amount <= 999999999999.999999
      and line_total_amount >= 0 and line_total_amount <= 999999999999.999999
      and scale(price_amount) <= 6 and scale(line_total_amount) <= 6)
  ),
  constraint order_lines_currency_valid check (currency_code ~ '^[A-Z]{3}$'),
  constraint order_lines_names_valid check (
    product_name_snapshot = btrim(product_name_snapshot) and char_length(product_name_snapshot) between 1 and 240
    and variant_name_snapshot = btrim(variant_name_snapshot) and char_length(variant_name_snapshot) between 1 and 240
    and sku_snapshot = btrim(sku_snapshot) and char_length(sku_snapshot) between 1 and 100
    and unit_code_snapshot = btrim(unit_code_snapshot) and char_length(unit_code_snapshot) between 1 and 64
  ),
  constraint order_lines_offer_snapshot_valid check (
    jsonb_typeof(offer_snapshot) = 'object' and octet_length(offer_snapshot::text) <= 65536
  )
);

create index order_lines_variant_idx on app_private.order_lines (organization_id, variant_id, created_at, id);
create index order_lines_unit_idx on app_private.order_lines (organization_id, unit_id, created_at, id);
create index order_lines_price_tier_idx on app_private.order_lines (organization_id, price_tier_id, created_at, id);

create table app_private.order_reservation_links (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  order_id uuid not null,
  reservation_id uuid not null,
  purpose text not null,
  linked_by_user_id uuid,
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint order_reservation_links_organization_id_id_unique unique (organization_id, id),
  constraint order_reservation_links_reservation_unique unique (organization_id, reservation_id),
  constraint order_reservation_links_order_fk foreign key (organization_id, order_id)
    references app_private.orders (organization_id, id) on delete restrict,
  constraint order_reservation_links_reservation_fk foreign key (organization_id, reservation_id)
    references app_private.inventory_reservations (organization_id, id) on delete restrict,
  constraint order_reservation_links_linked_by_fk foreign key (organization_id, linked_by_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint order_reservation_links_purpose_valid check (
    purpose = lower(btrim(purpose)) and purpose ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint order_reservation_links_time_valid check (linked_at <= created_at + interval '5 minutes')
);

create index order_reservation_links_order_idx
  on app_private.order_reservation_links (organization_id, order_id, linked_at, id);
create index order_reservation_links_reservation_idx
  on app_private.order_reservation_links (organization_id, reservation_id, linked_at, id);
create index order_reservation_links_linked_by_idx
  on app_private.order_reservation_links (organization_id, linked_by_user_id)
  where linked_by_user_id is not null;

create table app_private.sales (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  order_id uuid,
  contact_id uuid,
  opportunity_id uuid,
  sale_kind text not null,
  reverses_sale_id uuid,
  source text not null,
  currency_code text not null,
  subtotal_amount numeric not null,
  total_amount numeric not null,
  note text,
  occurred_at timestamptz not null default now(),
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint sales_organization_id_id_unique unique (organization_id, id),
  constraint sales_creation_command_unique unique (organization_id, creation_command_id),
  constraint sales_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint sales_order_fk foreign key (organization_id, order_id)
    references app_private.orders (organization_id, id) on delete restrict,
  constraint sales_contact_fk foreign key (organization_id, contact_id)
    references app_private.contacts (organization_id, id) on delete restrict,
  constraint sales_opportunity_fk foreign key (organization_id, opportunity_id)
    references app_private.opportunities (organization_id, id) on delete restrict,
  constraint sales_reverses_fk foreign key (organization_id, reverses_sale_id)
    references app_private.sales (organization_id, id) on delete restrict,
  constraint sales_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint sales_kind_valid check (sale_kind in ('sale', 'reversal')),
  constraint sales_reversal_valid check (
    (sale_kind = 'sale' and reverses_sale_id is null)
    or (sale_kind = 'reversal' and reverses_sale_id is not null and reverses_sale_id <> id)
  ),
  constraint sales_source_valid check (
    source = lower(btrim(source)) and source ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint sales_currency_valid check (currency_code ~ '^[A-Z]{3}$'),
  constraint sales_amounts_valid check (
    subtotal_amount >= 0 and total_amount >= subtotal_amount
    and total_amount <= 999999999999.999999
    and scale(subtotal_amount) <= 6 and scale(total_amount) <= 6
  ),
  constraint sales_note_valid check (
    note is null or (note = btrim(note) and char_length(note) between 1 and 10000)
  ),
  constraint sales_occurred_at_valid check (occurred_at <= created_at + interval '5 minutes')
);

create index sales_reverses_idx on app_private.sales (organization_id, reverses_sale_id)
  where reverses_sale_id is not null;
create index sales_order_idx on app_private.sales (organization_id, order_id, occurred_at, id)
  where order_id is not null;
create index sales_contact_idx on app_private.sales (organization_id, contact_id, occurred_at, id)
  where contact_id is not null;
create index sales_opportunity_idx on app_private.sales (organization_id, opportunity_id, occurred_at, id)
  where opportunity_id is not null;
create index sales_created_by_user_idx on app_private.sales (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.sale_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  sale_id uuid not null,
  line_number integer not null,
  order_line_id uuid,
  reverses_sale_line_id uuid,
  variant_id uuid not null,
  unit_id uuid not null,
  quantity numeric not null,
  unit_amount numeric not null,
  line_total_amount numeric not null,
  product_name_snapshot text not null,
  variant_name_snapshot text not null,
  sku_snapshot text not null,
  unit_code_snapshot text not null,
  inventory_effect_status text not null,
  inventory_operation_id uuid,
  created_at timestamptz not null default now(),
  constraint sale_lines_organization_id_id_unique unique (organization_id, id),
  constraint sale_lines_sale_line_unique unique (organization_id, sale_id, line_number),
  constraint sale_lines_sale_fk foreign key (organization_id, sale_id)
    references app_private.sales (organization_id, id) on delete restrict,
  constraint sale_lines_order_line_fk foreign key (organization_id, order_line_id)
    references app_private.order_lines (organization_id, id) on delete restrict,
  constraint sale_lines_reverses_sale_line_fk foreign key (organization_id, reverses_sale_line_id)
    references app_private.sale_lines (organization_id, id) on delete restrict,
  constraint sale_lines_variant_fk foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id) on delete restrict,
  constraint sale_lines_unit_fk foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id) on delete restrict,
  constraint sale_lines_inventory_operation_fk foreign key (organization_id, inventory_operation_id)
    references app_private.inventory_operations (organization_id, id) on delete restrict,
  constraint sale_lines_line_number_valid check (line_number between 1 and 500),
  constraint sale_lines_quantity_valid check (
    quantity > 0 and quantity <= 1000000000000 and scale(quantity) <= 9
  ),
  constraint sale_lines_amount_valid check (
    unit_amount >= 0 and line_total_amount >= 0
    and line_total_amount <= 999999999999.999999
    and scale(unit_amount) <= 6 and scale(line_total_amount) <= 6
  ),
  constraint sale_lines_names_valid check (
    product_name_snapshot = btrim(product_name_snapshot) and char_length(product_name_snapshot) between 1 and 240
    and variant_name_snapshot = btrim(variant_name_snapshot) and char_length(variant_name_snapshot) between 1 and 240
    and sku_snapshot = btrim(sku_snapshot) and char_length(sku_snapshot) between 1 and 100
    and unit_code_snapshot = btrim(unit_code_snapshot) and char_length(unit_code_snapshot) between 1 and 64
  ),
  constraint sale_lines_inventory_effect_status_valid check (
    inventory_effect_status in ('not_required', 'pending', 'applied')
  ),
  constraint sale_lines_inventory_effect_valid check (
    (inventory_effect_status = 'applied' and inventory_operation_id is not null)
    or (inventory_effect_status in ('not_required', 'pending') and inventory_operation_id is null)
  )
);

create index sale_lines_order_line_idx on app_private.sale_lines (organization_id, order_line_id, created_at, id)
  where order_line_id is not null;
create index sale_lines_reverses_sale_line_idx
  on app_private.sale_lines (organization_id, reverses_sale_line_id, created_at, id)
  where reverses_sale_line_id is not null;
create index sale_lines_variant_idx on app_private.sale_lines (organization_id, variant_id, created_at, id);
create index sale_lines_unit_idx on app_private.sale_lines (organization_id, unit_id, created_at, id);
create unique index sale_lines_inventory_operation_unique
  on app_private.sale_lines (organization_id, inventory_operation_id)
  where inventory_operation_id is not null;

create table app_private.commercial_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  command_id uuid not null,
  pending_request_id uuid,
  lead_id uuid,
  opportunity_id uuid,
  handoff_id uuid,
  order_id uuid,
  sale_id uuid,
  event_type text not null,
  previous_status text,
  new_status text,
  reason text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_by_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint commercial_events_organization_id_id_unique unique (organization_id, id),
  constraint commercial_events_command_unique unique (organization_id, command_id),
  constraint commercial_events_command_fk foreign key (organization_id, command_id)
    references app_private.commercial_commands (organization_id, id) on delete restrict,
  constraint commercial_events_pending_request_fk foreign key (organization_id, pending_request_id)
    references app_private.pending_requests (organization_id, id) on delete restrict,
  constraint commercial_events_lead_fk foreign key (organization_id, lead_id)
    references app_private.leads (organization_id, id) on delete restrict,
  constraint commercial_events_opportunity_fk foreign key (organization_id, opportunity_id)
    references app_private.opportunities (organization_id, id) on delete restrict,
  constraint commercial_events_handoff_fk foreign key (organization_id, handoff_id)
    references app_private.handoffs (organization_id, id) on delete restrict,
  constraint commercial_events_order_fk foreign key (organization_id, order_id)
    references app_private.orders (organization_id, id) on delete restrict,
  constraint commercial_events_sale_fk foreign key (organization_id, sale_id)
    references app_private.sales (organization_id, id) on delete restrict,
  constraint commercial_events_subject_valid check (
    num_nonnulls(pending_request_id, lead_id, opportunity_id, handoff_id, order_id, sale_id) = 1
  ),
  constraint commercial_events_type_valid check (
    event_type = lower(btrim(event_type)) and event_type ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint commercial_events_status_valid check (
    (previous_status is null or (previous_status = lower(btrim(previous_status))
      and previous_status ~ '^[a-z0-9][a-z0-9._-]{0,126}$'))
    and (new_status is null or (new_status = lower(btrim(new_status))
      and new_status ~ '^[a-z0-9][a-z0-9._-]{0,126}$'))
  ),
  constraint commercial_events_reason_valid check (
    reason = btrim(reason) and char_length(reason) between 1 and 2000
  ),
  constraint commercial_events_payload_valid check (
    jsonb_typeof(event_payload) = 'object' and octet_length(event_payload::text) <= 131072
  ),
  constraint commercial_events_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint commercial_events_occurred_at_valid check (occurred_at <= created_at + interval '5 minutes')
);

create index commercial_events_pending_request_idx
  on app_private.commercial_events (organization_id, pending_request_id, occurred_at, id)
  where pending_request_id is not null;
create index commercial_events_lead_idx
  on app_private.commercial_events (organization_id, lead_id, occurred_at, id)
  where lead_id is not null;
create index commercial_events_opportunity_idx
  on app_private.commercial_events (organization_id, opportunity_id, occurred_at, id)
  where opportunity_id is not null;
create index commercial_events_handoff_idx
  on app_private.commercial_events (organization_id, handoff_id, occurred_at, id)
  where handoff_id is not null;
create index commercial_events_order_idx
  on app_private.commercial_events (organization_id, order_id, occurred_at, id)
  where order_id is not null;
create index commercial_events_sale_idx
  on app_private.commercial_events (organization_id, sale_id, occurred_at, id)
  where sale_id is not null;
create index commercial_events_created_by_user_idx
  on app_private.commercial_events (created_by_user_id)
  where created_by_user_id is not null;

create function app_private.assert_commercial_actor(
  target_organization_id uuid,
  target_user_id uuid,
  allowed_roles text[] default array['owner', 'admin', 'operator']::text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    return;
  end if;

  if not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  ) then
    raise exception using errcode = '42501', message = 'commercial actor is not an active authorized member';
  end if;
end;
$$;

create function app_private.claim_commercial_command(
  target_organization_id uuid,
  target_idempotency_key text,
  target_operation text,
  target_request_payload jsonb,
  target_created_by_user_id uuid default null
)
returns table (claimed_command_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_command app_private.commercial_commands%rowtype;
  target_fingerprint bytea;
begin
  if target_request_payload is null or jsonb_typeof(target_request_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'commercial command payload must be an object';
  end if;

  perform app_private.assert_commercial_actor(
    target_organization_id,
    target_created_by_user_id
  );

  target_fingerprint := extensions.digest(target_request_payload::text, 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':' || target_idempotency_key, 0)
  );

  select command_value.* into existing_command
  from app_private.commercial_commands as command_value
  where command_value.organization_id = target_organization_id
    and command_value.idempotency_key = target_idempotency_key
  for update;

  if found then
    if existing_command.operation <> target_operation
      or existing_command.request_fingerprint <> target_fingerprint then
      raise exception using errcode = '23505', message = 'commercial idempotency key was reused with another request';
    end if;

    if existing_command.completed_at is null then
      raise exception using errcode = '40001', message = 'commercial command is incomplete and must be retried';
    end if;

    return query select existing_command.id, true;
    return;
  end if;

  insert into app_private.commercial_commands (
    organization_id,
    idempotency_key,
    operation,
    request_fingerprint,
    request_payload,
    created_by_user_id
  ) values (
    target_organization_id,
    target_idempotency_key,
    target_operation,
    target_fingerprint,
    target_request_payload,
    target_created_by_user_id
  )
  returning id into claimed_command_id;

  was_replayed := false;
  return next;
end;
$$;

create function app_private.assert_sale_inventory_operation(
  target_organization_id uuid,
  target_inventory_operation_id uuid,
  target_variant_id uuid,
  target_unit_id uuid,
  target_quantity numeric,
  target_sale_kind text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  operation_value app_private.inventory_operations%rowtype;
  direct_quantity_delta numeric;
  every_direct_movement_matches boolean;
begin
  select operation.* into operation_value
  from app_private.inventory_operations as operation
  where operation.organization_id = target_organization_id
    and operation.id = target_inventory_operation_id;

  if not found then
    raise exception using errcode = '23514', message = 'applied inventory effect requires a real operation';
  end if;

  if operation_value.composition_id is not null then
    if not exists (
      select 1
      from app_private.inventory_compositions as composition
      where composition.organization_id = target_organization_id
        and composition.id = operation_value.composition_id
        and composition.offered_variant_id = target_variant_id
        and composition.sale_unit_id = target_unit_id
        and operation_value.sale_quantity = target_quantity
    ) or exists (
      select 1
      from app_private.inventory_movements as movement
      where movement.organization_id = target_organization_id
        and movement.operation_id = target_inventory_operation_id
        and (
          (target_sale_kind = 'sale' and movement.quantity_delta >= 0)
          or (target_sale_kind = 'reversal' and movement.quantity_delta <= 0)
        )
    ) then
      raise exception using errcode = '23514', message = 'inventory composition operation does not match sale line';
    end if;
    return;
  end if;

  select
    sum(movement.quantity_delta),
    bool_and(item.variant_id = target_variant_id and item.inventory_unit_id = target_unit_id)
  into direct_quantity_delta, every_direct_movement_matches
  from app_private.inventory_movements as movement
  join app_private.inventory_items as item
    on item.organization_id = movement.organization_id
    and item.id = movement.inventory_item_id
  where movement.organization_id = target_organization_id
    and movement.operation_id = target_inventory_operation_id;

  if direct_quantity_delta is null
    or every_direct_movement_matches is not true
    or direct_quantity_delta <> (
      case target_sale_kind
        when 'sale' then -target_quantity
        when 'reversal' then target_quantity
        else null
      end
    ) then
    raise exception using errcode = '23514', message = 'direct inventory operation does not match sale line';
  end if;
end;
$$;

create function app_private.complete_commercial_command(
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
  update app_private.commercial_commands
  set
    result_type = target_result_type,
    result_id = target_result_id,
    completed_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_command_id
    and completed_at is null;

  if not found then
    raise exception using errcode = '40001', message = 'commercial command could not be completed';
  end if;
end;
$$;

create function app_private.insert_commercial_event(
  target_organization_id uuid,
  target_command_id uuid,
  target_subject_type text,
  target_subject_id uuid,
  target_event_type text,
  target_previous_status text,
  target_new_status text,
  target_reason text,
  target_event_payload jsonb,
  target_created_by_user_id uuid,
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
  if target_subject_type not in ('pending_request', 'lead', 'opportunity', 'handoff', 'order', 'sale') then
    raise exception using errcode = '22023', message = 'invalid commercial event subject type';
  end if;

  insert into app_private.commercial_events (
    organization_id,
    command_id,
    pending_request_id,
    lead_id,
    opportunity_id,
    handoff_id,
    order_id,
    sale_id,
    event_type,
    previous_status,
    new_status,
    reason,
    event_payload,
    created_by_user_id,
    occurred_at
  ) values (
    target_organization_id,
    target_command_id,
    case when target_subject_type = 'pending_request' then target_subject_id end,
    case when target_subject_type = 'lead' then target_subject_id end,
    case when target_subject_type = 'opportunity' then target_subject_id end,
    case when target_subject_type = 'handoff' then target_subject_id end,
    case when target_subject_type = 'order' then target_subject_id end,
    case when target_subject_type = 'sale' then target_subject_id end,
    target_event_type,
    target_previous_status,
    target_new_status,
    target_reason,
    coalesce(target_event_payload, '{}'::jsonb),
    target_created_by_user_id,
    target_occurred_at
  ) returning id into target_event_id;

  return target_event_id;
end;
$$;

create function app_private.reject_commercial_history_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'commercial history is append-only';
end;
$$;

create function app_private.validate_pending_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from jsonb_array_elements(new.requested_fields) as item(value)
    where jsonb_typeof(item.value) <> 'string'
      or length(item.value #>> '{}') not between 1 and 120
      or item.value #>> '{}' <> lower(btrim(item.value #>> '{}'))
  ) or (
    select count(*) <> count(distinct item.value #>> '{}')
    from jsonb_array_elements(new.requested_fields) as item(value)
  ) then
    raise exception using errcode = '23514', message = 'pending request fields must be unique normalized strings';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.creation_command_id is distinct from old.creation_command_id
      or new.channel_connection_id is distinct from old.channel_connection_id
      or new.conversation_id is distinct from old.conversation_id
      or new.contact_id is distinct from old.contact_id
      or new.source_message_id is distinct from old.source_message_id
      or new.request_kind is distinct from old.request_kind
      or new.variant_id is distinct from old.variant_id
      or new.unit_id is distinct from old.unit_id
      or new.requested_quantity is distinct from old.requested_quantity
      or new.requested_fields is distinct from old.requested_fields
      or new.collected_context is distinct from old.collected_context
      or new.due_at is distinct from old.due_at
      or new.created_by_user_id is distinct from old.created_by_user_id
      or new.created_at is distinct from old.created_at then
      raise exception using errcode = '23514', message = 'pending request identity and collected context are immutable';
    end if;

    if old.status <> 'open' and new.status is distinct from old.status then
      raise exception using errcode = '23514', message = 'closed pending request cannot transition again';
    end if;

    if old.response_delivery_status = 'succeeded'
      and (new.response_delivery_status is distinct from old.response_delivery_status
        or new.response_outbox_event_id is distinct from old.response_outbox_event_id
        or new.responded_at is distinct from old.responded_at) then
      raise exception using errcode = '23514', message = 'successful pending response delivery is terminal';
    end if;
  end if;

  return new;
end;
$$;

create function app_private.prevent_contact_method_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.contact_id is distinct from old.contact_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.method_kind is distinct from old.method_kind
    or new.value_ciphertext is distinct from old.value_ciphertext
    or new.value_fingerprint is distinct from old.value_fingerprint
    or new.display_hint is distinct from old.display_hint
    or new.encryption_key_ref is distinct from old.encryption_key_ref
    or new.consent_purpose is distinct from old.consent_purpose
    or new.consent_source is distinct from old.consent_source
    or new.consented_at is distinct from old.consented_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'contact method encrypted identity and consent are immutable';
  end if;

  if old.status = 'revoked' and (new.status is distinct from old.status or new.revoked_at is distinct from old.revoked_at) then
    raise exception using errcode = '23514', message = 'revoked contact method is terminal';
  end if;

  return new;
end;
$$;

create function app_private.prevent_assignment_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.assignee_kind is distinct from old.assignee_kind
    or new.member_user_id is distinct from old.member_user_id
    or new.agent_key is distinct from old.agent_key
    or new.reason is distinct from old.reason
    or new.started_at is distinct from old.started_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'conversation assignment provenance is immutable';
  end if;

  if old.ended_at is not null and new.ended_at is distinct from old.ended_at then
    raise exception using errcode = '23514', message = 'closed conversation assignment is terminal';
  end if;

  return new;
end;
$$;

create function app_private.prevent_handoff_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.from_assignment_id is distinct from old.from_assignment_id
    or new.target_kind is distinct from old.target_kind
    or new.target_member_user_id is distinct from old.target_member_user_id
    or new.target_agent_key is distinct from old.target_agent_key
    or new.reason is distinct from old.reason
    or new.context_summary is distinct from old.context_summary
    or new.requested_by_user_id is distinct from old.requested_by_user_id
    or new.requested_at is distinct from old.requested_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'handoff request and context are immutable';
  end if;

  if old.status <> 'pending' and (
    new.status is distinct from old.status
    or new.decided_by_user_id is distinct from old.decided_by_user_id
    or new.accepted_assignment_id is distinct from old.accepted_assignment_id
    or new.decided_at is distinct from old.decided_at
  ) then
    raise exception using errcode = '23514', message = 'decided handoff is terminal';
  end if;

  return new;
end;
$$;

create function app_private.prevent_order_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.contact_id is distinct from old.contact_id
    or new.preferred_contact_method_id is distinct from old.preferred_contact_method_id
    or new.opportunity_id is distinct from old.opportunity_id
    or new.channel_connection_id is distinct from old.channel_connection_id
    or new.conversation_id is distinct from old.conversation_id
    or new.origin is distinct from old.origin
    or new.handling_mode is distinct from old.handling_mode
    or new.currency_code is distinct from old.currency_code
    or new.subtotal_amount is distinct from old.subtotal_amount
    or new.total_amount is distinct from old.total_amount
    or new.contact_snapshot is distinct from old.contact_snapshot
    or new.customer_note is distinct from old.customer_note
    or new.submitted_at is distinct from old.submitted_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'order request and commercial snapshot are immutable';
  end if;

  if old.closed_at is not null and not (
    old.status = 'fulfilled'
    and new.status in ('partially_fulfilled', 'confirmed')
    and new.closed_at is null
  ) and (
    new.status is distinct from old.status or new.closed_at is distinct from old.closed_at
  ) then
    raise exception using errcode = '23514', message = 'closed order is terminal';
  end if;

  if old.notification_status = 'succeeded' and (
    new.notification_status is distinct from old.notification_status
    or new.notification_outbox_event_id is distinct from old.notification_outbox_event_id
    or new.notified_at is distinct from old.notified_at
  ) then
    raise exception using errcode = '23514', message = 'successful order notification is terminal';
  end if;

  return new;
end;
$$;

create function app_private.prevent_commercial_command_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.operation is distinct from old.operation
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.request_payload is distinct from old.request_payload
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'commercial command request is immutable';
  end if;

  if old.completed_at is not null and (
    new.result_type is distinct from old.result_type
    or new.result_id is distinct from old.result_id
    or new.completed_at is distinct from old.completed_at
  ) then
    raise exception using errcode = '23514', message = 'completed commercial command is immutable';
  end if;

  return new;
end;
$$;

create function app_private.validate_sale_line_reference()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  sale_value app_private.sales%rowtype;
  original_line app_private.sale_lines%rowtype;
begin
  select sale.* into sale_value
  from app_private.sales as sale
  where sale.organization_id = new.organization_id and sale.id = new.sale_id;

  if not found then
    raise exception using errcode = '23503', message = 'sale line parent does not exist';
  end if;

  if sale_value.sale_kind = 'sale' then
    if new.reverses_sale_line_id is not null then
      raise exception using errcode = '23514', message = 'ordinary sale line cannot reverse another line';
    end if;
    return new;
  end if;

  if new.reverses_sale_line_id is null then
    raise exception using errcode = '23514', message = 'reversal line requires its original sale line';
  end if;

  select line_value.* into original_line
  from app_private.sale_lines as line_value
  where line_value.organization_id = new.organization_id
    and line_value.id = new.reverses_sale_line_id
    and line_value.sale_id = sale_value.reverses_sale_id;

  if not found
    or original_line.order_line_id is distinct from new.order_line_id
    or original_line.variant_id <> new.variant_id
    or original_line.unit_id <> new.unit_id
    or original_line.unit_amount <> new.unit_amount then
    raise exception using errcode = '23514', message = 'reversal line identity and amount must match its original';
  end if;

  return new;
end;
$$;

create function app_private.prevent_sale_line_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = '23514', message = 'sale line history is append-only';
  end if;

  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.sale_id is distinct from old.sale_id
    or new.line_number is distinct from old.line_number
    or new.order_line_id is distinct from old.order_line_id
    or new.reverses_sale_line_id is distinct from old.reverses_sale_line_id
    or new.variant_id is distinct from old.variant_id
    or new.unit_id is distinct from old.unit_id
    or new.quantity is distinct from old.quantity
    or new.unit_amount is distinct from old.unit_amount
    or new.line_total_amount is distinct from old.line_total_amount
    or new.product_name_snapshot is distinct from old.product_name_snapshot
    or new.variant_name_snapshot is distinct from old.variant_name_snapshot
    or new.sku_snapshot is distinct from old.sku_snapshot
    or new.unit_code_snapshot is distinct from old.unit_code_snapshot
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'sale line commercial snapshot is immutable';
  end if;

  if old.inventory_effect_status <> 'pending'
    or new.inventory_effect_status <> 'applied'
    or old.inventory_operation_id is not null
    or new.inventory_operation_id is null then
    raise exception using errcode = '23514', message = 'sale line inventory reconciliation transition is invalid';
  end if;

  return new;
end;
$$;

create trigger commercial_commands_prevent_core_rewrite
before update on app_private.commercial_commands
for each row execute function app_private.prevent_commercial_command_core_rewrite();

create trigger contact_methods_prevent_core_rewrite
before update on app_private.contact_methods
for each row execute function app_private.prevent_contact_method_core_rewrite();
create trigger contact_methods_set_updated_at
before update on app_private.contact_methods
for each row execute function app_private.set_updated_at();

create trigger pending_requests_validate
before insert or update on app_private.pending_requests
for each row execute function app_private.validate_pending_request();
create trigger pending_requests_set_updated_at
before update on app_private.pending_requests
for each row execute function app_private.set_updated_at();

create trigger leads_set_updated_at
before update on app_private.leads
for each row execute function app_private.set_updated_at();
create trigger lead_interests_set_updated_at
before update on app_private.lead_interests
for each row execute function app_private.set_updated_at();
create trigger opportunities_set_updated_at
before update on app_private.opportunities
for each row execute function app_private.set_updated_at();

create trigger conversation_assignments_prevent_rewrite
before update on app_private.conversation_assignments
for each row execute function app_private.prevent_assignment_rewrite();

create trigger handoffs_prevent_core_rewrite
before update on app_private.handoffs
for each row execute function app_private.prevent_handoff_core_rewrite();
create trigger handoffs_set_updated_at
before update on app_private.handoffs
for each row execute function app_private.set_updated_at();

create trigger orders_prevent_core_rewrite
before update on app_private.orders
for each row execute function app_private.prevent_order_core_rewrite();
create trigger orders_set_updated_at
before update on app_private.orders
for each row execute function app_private.set_updated_at();

create trigger order_lines_reject_update
before update or delete on app_private.order_lines
for each row execute function app_private.reject_commercial_history_rewrite();
create trigger order_reservation_links_reject_update
before update or delete on app_private.order_reservation_links
for each row execute function app_private.reject_commercial_history_rewrite();
create trigger sales_reject_update
before update or delete on app_private.sales
for each row execute function app_private.reject_commercial_history_rewrite();
create trigger sale_lines_validate_reference
before insert on app_private.sale_lines
for each row execute function app_private.validate_sale_line_reference();
create trigger sale_lines_reject_update
before update or delete on app_private.sale_lines
for each row execute function app_private.prevent_sale_line_rewrite();
create trigger commercial_events_reject_update
before update or delete on app_private.commercial_events
for each row execute function app_private.reject_commercial_history_rewrite();

create function api.register_contact_method(
  target_organization_id uuid,
  target_idempotency_key text,
  target_contact_id uuid,
  target_method_kind text,
  target_value_ciphertext bytea,
  target_value_fingerprint bytea,
  target_display_hint text,
  target_encryption_key_ref text,
  target_consent_purpose text,
  target_consent_source text,
  target_consented_at timestamptz,
  target_created_by_user_id uuid default null
)
returns table (contact_method_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  target_contact_method_id uuid;
begin
  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'contact_id', target_contact_id,
    'method_kind', target_method_kind,
    'value_fingerprint', encode(target_value_fingerprint, 'hex'),
    'display_hint', target_display_hint,
    'encryption_key_ref', target_encryption_key_ref,
    'consent_purpose', target_consent_purpose,
    'consent_source', target_consent_source,
    'consented_at', target_consented_at,
    'created_by_user_id', target_created_by_user_id
  );

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.contact_method.register',
    request_payload,
    target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_contact_method_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    insert into app_private.contact_methods (
      organization_id,
      contact_id,
      creation_command_id,
      method_kind,
      value_ciphertext,
      value_fingerprint,
      display_hint,
      encryption_key_ref,
      consent_purpose,
      consent_source,
      consented_at,
      created_by_user_id
    ) values (
      target_organization_id,
      target_contact_id,
      command_claim.claimed_command_id,
      target_method_kind,
      target_value_ciphertext,
      target_value_fingerprint,
      target_display_hint,
      target_encryption_key_ref,
      target_consent_purpose,
      target_consent_source,
      target_consented_at,
      target_created_by_user_id
    ) returning id into target_contact_method_id;

    perform app_private.complete_commercial_command(
      target_organization_id,
      command_claim.claimed_command_id,
      'contact_method',
      target_contact_method_id
    );
  end if;

  return query select target_contact_method_id, command_claim.was_replayed;
end;
$$;

create function api.create_pending_request(
  target_organization_id uuid,
  target_idempotency_key text,
  target_channel_connection_id uuid,
  target_conversation_id uuid,
  target_contact_id uuid,
  target_request_kind text,
  target_requested_fields jsonb,
  target_collected_context jsonb,
  target_source_message_id uuid default null,
  target_variant_id uuid default null,
  target_unit_id uuid default null,
  target_requested_quantity numeric default null,
  target_due_at timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (pending_request_id uuid, pending_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  target_pending_request_id uuid;
begin
  if not exists (
    select 1
    from app_private.conversations as conversation
    join app_private.channel_identities as identity_value
      on identity_value.organization_id = conversation.organization_id
      and identity_value.channel_connection_id = conversation.channel_connection_id
      and identity_value.id = conversation.primary_channel_identity_id
    where conversation.organization_id = target_organization_id
      and conversation.channel_connection_id = target_channel_connection_id
      and conversation.id = target_conversation_id
      and identity_value.contact_id = target_contact_id
      and identity_value.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'pending request contact must own the active conversation identity';
  end if;

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id,
    'channel_connection_id', target_channel_connection_id,
    'conversation_id', target_conversation_id,
    'contact_id', target_contact_id,
    'source_message_id', target_source_message_id,
    'request_kind', target_request_kind,
    'variant_id', target_variant_id,
    'unit_id', target_unit_id,
    'requested_quantity', target_requested_quantity,
    'requested_fields', target_requested_fields,
    'collected_context', target_collected_context,
    'due_at', target_due_at,
    'created_by_user_id', target_created_by_user_id
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.pending_request.create',
    request_payload,
    target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_pending_request_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    insert into app_private.pending_requests (
      organization_id,
      creation_command_id,
      channel_connection_id,
      conversation_id,
      contact_id,
      source_message_id,
      request_kind,
      variant_id,
      unit_id,
      requested_quantity,
      requested_fields,
      collected_context,
      due_at,
      created_by_user_id
    ) values (
      target_organization_id,
      command_claim.claimed_command_id,
      target_channel_connection_id,
      target_conversation_id,
      target_contact_id,
      target_source_message_id,
      target_request_kind,
      target_variant_id,
      target_unit_id,
      target_requested_quantity,
      target_requested_fields,
      target_collected_context,
      target_due_at,
      target_created_by_user_id
    ) returning id into target_pending_request_id;

    perform app_private.insert_commercial_event(
      target_organization_id,
      command_claim.claimed_command_id,
      'pending_request',
      target_pending_request_id,
      'pending_request.created',
      null,
      'open',
      'customer information request captured',
      jsonb_build_object('request_kind', target_request_kind),
      target_created_by_user_id
    );

    perform app_private.complete_commercial_command(
      target_organization_id,
      command_claim.claimed_command_id,
      'pending_request',
      target_pending_request_id
    );
  end if;

  return query
  select request_value.id, request_value.status, command_claim.was_replayed
  from app_private.pending_requests as request_value
  where request_value.organization_id = target_organization_id
    and request_value.id = target_pending_request_id;
end;
$$;

create function api.resolve_pending_request(
  target_organization_id uuid,
  target_pending_request_id uuid,
  target_idempotency_key text,
  target_action text,
  target_resolution_kind text,
  target_resolution_text text,
  target_resolved_price_amount numeric default null,
  target_resolved_currency_code text default null,
  target_resolved_by_user_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (pending_request_id uuid, pending_status text, response_delivery_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  pending_value app_private.pending_requests%rowtype;
  target_new_status text;
begin
  if target_action not in ('resolve', 'cancel', 'expire') then
    raise exception using errcode = '22023', message = 'invalid pending request action';
  end if;

  if target_action in ('resolve', 'cancel') and target_resolved_by_user_id is null then
    raise exception using errcode = '42501', message = 'pending request resolution requires an explicit member actor';
  end if;

  perform app_private.assert_commercial_actor(target_organization_id, target_resolved_by_user_id);

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id,
    'pending_request_id', target_pending_request_id,
    'action', target_action,
    'resolution_kind', target_resolution_kind,
    'resolution_text', target_resolution_text,
    'resolved_price_amount', target_resolved_price_amount,
    'resolved_currency_code', target_resolved_currency_code,
    'resolved_by_user_id', target_resolved_by_user_id,
    'occurred_at', target_occurred_at
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.pending_request.transition',
    request_payload,
    target_resolved_by_user_id
  );

  if command_claim.was_replayed then
    select request_value.* into pending_value
    from app_private.pending_requests as request_value
    where request_value.organization_id = target_organization_id
      and request_value.id = (
        select command_value.result_id
        from app_private.commercial_commands as command_value
        where command_value.organization_id = target_organization_id
          and command_value.id = command_claim.claimed_command_id
      );
  else
    select request_value.* into pending_value
    from app_private.pending_requests as request_value
    where request_value.organization_id = target_organization_id
      and request_value.id = target_pending_request_id
    for update;

    if not found then
      raise exception using errcode = 'P0002', message = 'pending request does not exist';
    end if;

    if pending_value.status <> 'open' then
      raise exception using errcode = '23514', message = 'pending request is already closed';
    end if;

    if target_action = 'expire'
      and (pending_value.due_at is null or target_occurred_at < pending_value.due_at) then
      raise exception using errcode = '23514', message = 'pending request cannot expire before its deadline';
    end if;

    target_new_status := case target_action
      when 'resolve' then 'resolved'
      when 'cancel' then 'cancelled'
      when 'expire' then 'expired'
    end;

    update app_private.pending_requests
    set
      status = target_new_status,
      resolution_kind = target_resolution_kind,
      resolution_text = target_resolution_text,
      resolved_price_amount = case when target_action = 'resolve' then target_resolved_price_amount end,
      resolved_currency_code = case when target_action = 'resolve' then target_resolved_currency_code end,
      resolved_by_user_id = target_resolved_by_user_id,
      resolved_at = target_occurred_at,
      response_delivery_status = case when target_action = 'resolve' then 'pending' else 'not_requested' end
    where organization_id = target_organization_id
      and id = target_pending_request_id
    returning * into pending_value;

    perform app_private.insert_commercial_event(
      target_organization_id,
      command_claim.claimed_command_id,
      'pending_request',
      target_pending_request_id,
      'pending_request.' || target_action,
      'open',
      target_new_status,
      target_resolution_text,
      jsonb_strip_nulls(jsonb_build_object(
        'resolution_kind', target_resolution_kind,
        'resolved_price_amount', target_resolved_price_amount,
        'resolved_currency_code', target_resolved_currency_code
      )),
      target_resolved_by_user_id,
      target_occurred_at
    );

    perform app_private.complete_commercial_command(
      target_organization_id,
      command_claim.claimed_command_id,
      'pending_request',
      target_pending_request_id
    );
  end if;

  return query select pending_value.id, pending_value.status, pending_value.response_delivery_status,
    command_claim.was_replayed;
end;
$$;

create function api.record_commercial_notification(
  target_organization_id uuid,
  target_subject_type text,
  target_subject_id uuid,
  target_idempotency_key text,
  target_outbox_event_id uuid,
  target_created_by_user_id uuid default null
)
returns table (subject_id uuid, notification_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  target_status text;
  outbox_value app_private.outbox_events%rowtype;
begin
  if target_subject_type not in ('pending_request', 'order') then
    raise exception using errcode = '22023', message = 'unsupported commercial notification subject';
  end if;

  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  select outbox.* into outbox_value
  from app_private.outbox_events as outbox
  where outbox.organization_id = target_organization_id
    and outbox.id = target_outbox_event_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'commercial notification outbox event does not exist';
  end if;

  target_status := case
    when outbox_value.status = 'succeeded' then 'succeeded'
    when outbox_value.status in ('failed', 'blocked', 'cancelled') then 'failed'
    else 'queued'
  end;

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'subject_type', target_subject_type,
    'subject_id', target_subject_id,
    'outbox_event_id', target_outbox_event_id,
    'notification_status', target_status,
    'outbox_completed_at', outbox_value.completed_at,
    'created_by_user_id', target_created_by_user_id
  );

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.notification.record',
    request_payload,
    target_created_by_user_id
  );

  if not command_claim.was_replayed then
    if target_subject_type = 'pending_request' then
      update app_private.pending_requests
      set
        response_delivery_status = target_status,
        response_outbox_event_id = target_outbox_event_id,
        responded_at = case when target_status = 'succeeded' then outbox_value.completed_at end
      where organization_id = target_organization_id
        and id = target_subject_id
        and status = 'resolved'
        and channel_connection_id = outbox_value.channel_connection_id
        and conversation_id = outbox_value.conversation_id
        and response_delivery_status in ('pending', 'queued', 'failed');
    else
      update app_private.orders as target_order
      set
        notification_status = target_status,
        notification_channel_connection_id = outbox_value.channel_connection_id,
        notification_outbox_event_id = target_outbox_event_id,
        notified_at = case when target_status = 'succeeded' then outbox_value.completed_at end
      where target_order.organization_id = target_organization_id
        and target_order.id = target_subject_id
        and target_order.notification_status in ('pending', 'queued', 'failed');
    end if;

    if not found then
      raise exception using errcode = '23514', message = 'commercial subject cannot accept this outbox notification';
    end if;

    perform app_private.insert_commercial_event(
      target_organization_id,
      command_claim.claimed_command_id,
      target_subject_type,
      target_subject_id,
      target_subject_type || '.notification_' || target_status,
      null,
      null,
      'external notification status linked from outbox',
      jsonb_build_object('outbox_event_id', target_outbox_event_id, 'notification_status', target_status),
      target_created_by_user_id
    );

    perform app_private.complete_commercial_command(
      target_organization_id,
      command_claim.claimed_command_id,
      target_subject_type,
      target_subject_id
    );
  end if;

  return query select target_subject_id, target_status, command_claim.was_replayed;
end;
$$;

create function api.create_lead(
  target_organization_id uuid,
  target_idempotency_key text,
  target_contact_id uuid,
  target_source text,
  target_summary text,
  target_interests jsonb,
  target_channel_connection_id uuid default null,
  target_conversation_id uuid default null,
  target_created_by_user_id uuid default null
)
returns table (lead_id uuid, lead_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_interests jsonb;
  request_payload jsonb;
  command_claim record;
  target_lead_id uuid;
  interest_value record;
begin
  if target_interests is null or jsonb_typeof(target_interests) <> 'array'
    or jsonb_array_length(target_interests) not between 1 and 100 then
    raise exception using errcode = '22023', message = 'lead interests must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_interests) as submitted(value)
    where jsonb_typeof(submitted.value) <> 'object'
      or submitted.value - 'variant_id' - 'unit_id' - 'quantity' - 'summary' - 'context' <> '{}'::jsonb
      or not submitted.value ? 'summary'
  ) then
    raise exception using errcode = '22023', message = 'lead interest contract is invalid';
  end if;

  if target_conversation_id is not null and not exists (
    select 1
    from app_private.conversations as conversation
    join app_private.channel_identities as identity_value
      on identity_value.organization_id = conversation.organization_id
      and identity_value.channel_connection_id = conversation.channel_connection_id
      and identity_value.id = conversation.primary_channel_identity_id
    where conversation.organization_id = target_organization_id
      and conversation.channel_connection_id = target_channel_connection_id
      and conversation.id = target_conversation_id
      and identity_value.contact_id = target_contact_id
  ) then
    raise exception using errcode = '23514', message = 'lead contact must match conversation identity';
  end if;

  select jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'variant_id', submitted.variant_id,
      'unit_id', submitted.unit_id,
      'quantity', submitted.quantity,
      'summary', submitted.summary,
      'context', coalesce(submitted.context, '{}'::jsonb)
    )) order by interest.ordinality
  ) into normalized_interests
  from jsonb_array_elements(target_interests) with ordinality as interest(value, ordinality)
  cross join lateral jsonb_to_record(interest.value) as submitted(
    variant_id uuid, unit_id uuid, quantity numeric, summary text, context jsonb
  );

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id,
    'contact_id', target_contact_id,
    'channel_connection_id', target_channel_connection_id,
    'conversation_id', target_conversation_id,
    'source', target_source,
    'summary', target_summary,
    'interests', normalized_interests,
    'created_by_user_id', target_created_by_user_id
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.lead.create',
    request_payload,
    target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_lead_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    insert into app_private.leads (
      organization_id, creation_command_id, contact_id, channel_connection_id,
      conversation_id, source, summary, created_by_user_id
    ) values (
      target_organization_id, command_claim.claimed_command_id, target_contact_id,
      target_channel_connection_id, target_conversation_id, target_source,
      target_summary, target_created_by_user_id
    ) returning id into target_lead_id;

    for interest_value in
      select * from jsonb_to_recordset(normalized_interests) as interest(
        variant_id uuid, unit_id uuid, quantity numeric, summary text, context jsonb
      )
    loop
      insert into app_private.lead_interests (
        organization_id, lead_id, variant_id, unit_id, requested_quantity,
        summary, captured_context
      ) values (
        target_organization_id, target_lead_id, interest_value.variant_id,
        interest_value.unit_id, interest_value.quantity, interest_value.summary,
        interest_value.context
      );
    end loop;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'lead', target_lead_id,
      'lead.created', null, 'open', 'customer interest captured',
      jsonb_build_object('interest_count', jsonb_array_length(normalized_interests)),
      target_created_by_user_id
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'lead', target_lead_id
    );
  end if;

  return query
  select lead_value.id, lead_value.status, command_claim.was_replayed
  from app_private.leads as lead_value
  where lead_value.organization_id = target_organization_id and lead_value.id = target_lead_id;
end;
$$;

create function api.create_opportunity(
  target_organization_id uuid,
  target_idempotency_key text,
  target_lead_id uuid,
  target_handling_mode text,
  target_stage_code text,
  target_title text,
  target_assignee_kind text,
  target_member_user_id uuid default null,
  target_agent_key text default null,
  target_estimated_amount numeric default null,
  target_currency_code text default null,
  target_created_by_user_id uuid default null
)
returns table (opportunity_id uuid, opportunity_status text, assignment_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  lead_value app_private.leads%rowtype;
  target_opportunity_id uuid;
  target_assignment_id uuid;
begin
  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  select lead_row.* into lead_value
  from app_private.leads as lead_row
  where lead_row.organization_id = target_organization_id and lead_row.id = target_lead_id;

  if not found or lead_value.conversation_id is null then
    raise exception using errcode = '23514', message = 'opportunity requires a lead with conversation context';
  end if;

  if target_assignee_kind = 'member' and not exists (
    select 1 from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_member_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  ) then
    raise exception using errcode = '42501', message = 'opportunity member assignee is not active';
  end if;

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id, 'lead_id', target_lead_id,
    'handling_mode', target_handling_mode, 'stage_code', target_stage_code,
    'title', target_title, 'assignee_kind', target_assignee_kind,
    'member_user_id', target_member_user_id, 'agent_key', target_agent_key,
    'estimated_amount', target_estimated_amount, 'currency_code', target_currency_code,
    'created_by_user_id', target_created_by_user_id
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.opportunity.create',
    request_payload, target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_opportunity_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
    select assignment.id into target_assignment_id
    from app_private.conversation_assignments as assignment
    where assignment.organization_id = target_organization_id
      and assignment.opportunity_id = target_opportunity_id
      and assignment.ended_at is null;
  else
    insert into app_private.opportunities (
      organization_id, creation_command_id, lead_id, handling_mode, stage_code,
      title, estimated_amount, currency_code, created_by_user_id
    ) values (
      target_organization_id, command_claim.claimed_command_id, target_lead_id,
      target_handling_mode, target_stage_code, target_title, target_estimated_amount,
      target_currency_code, target_created_by_user_id
    ) returning id into target_opportunity_id;

    insert into app_private.conversation_assignments (
      organization_id, opportunity_id, channel_connection_id, conversation_id,
      assignee_kind, member_user_id, agent_key, reason
    ) values (
      target_organization_id, target_opportunity_id, lead_value.channel_connection_id,
      lead_value.conversation_id, target_assignee_kind, target_member_user_id,
      target_agent_key, 'initial opportunity assignment'
    ) returning id into target_assignment_id;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'opportunity', target_opportunity_id,
      'opportunity.created', null, 'open', 'qualified commercial opportunity opened',
      jsonb_build_object('assignment_id', target_assignment_id, 'handling_mode', target_handling_mode),
      target_created_by_user_id
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'opportunity', target_opportunity_id
    );
  end if;

  return query
  select opportunity.id, opportunity.status, target_assignment_id, command_claim.was_replayed
  from app_private.opportunities as opportunity
  where opportunity.organization_id = target_organization_id and opportunity.id = target_opportunity_id;
end;
$$;

create function api.create_handoff(
  target_organization_id uuid,
  target_idempotency_key text,
  target_opportunity_id uuid,
  target_target_kind text,
  target_reason text,
  target_context_summary jsonb,
  target_target_member_user_id uuid default null,
  target_target_agent_key text default null,
  target_requested_by_user_id uuid default null
)
returns table (handoff_id uuid, handoff_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  assignment_value app_private.conversation_assignments%rowtype;
  target_handoff_id uuid;
begin
  perform app_private.assert_commercial_actor(target_organization_id, target_requested_by_user_id);

  if target_target_kind = 'member' and not exists (
    select 1 from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_target_member_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  ) then
    raise exception using errcode = '42501', message = 'handoff target member is not active';
  end if;

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id, 'opportunity_id', target_opportunity_id,
    'target_kind', target_target_kind, 'target_member_user_id', target_target_member_user_id,
    'target_agent_key', target_target_agent_key, 'reason', target_reason,
    'context_summary', target_context_summary, 'requested_by_user_id', target_requested_by_user_id
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.handoff.create',
    request_payload, target_requested_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_handoff_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    select assignment.* into assignment_value
    from app_private.conversation_assignments as assignment
    where assignment.organization_id = target_organization_id
      and assignment.opportunity_id = target_opportunity_id
      and assignment.ended_at is null
    for update;

    if not found then
      raise exception using errcode = '23514', message = 'handoff requires one active assignment';
    end if;

    if assignment_value.assignee_kind = target_target_kind
      and (
        (target_target_kind = 'member'
          and assignment_value.member_user_id = target_target_member_user_id)
        or (target_target_kind = 'agent'
          and assignment_value.agent_key = target_target_agent_key)
      ) then
      raise exception using errcode = '23514', message = 'handoff target is already the active assignee';
    end if;

    insert into app_private.handoffs (
      organization_id, creation_command_id, opportunity_id, channel_connection_id,
      conversation_id, from_assignment_id, target_kind, target_member_user_id,
      target_agent_key, reason, context_summary, requested_by_user_id
    ) values (
      target_organization_id, command_claim.claimed_command_id, target_opportunity_id,
      assignment_value.channel_connection_id, assignment_value.conversation_id,
      assignment_value.id, target_target_kind, target_target_member_user_id,
      target_target_agent_key, target_reason, target_context_summary, target_requested_by_user_id
    ) returning id into target_handoff_id;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'handoff', target_handoff_id,
      'handoff.created', null, 'pending', target_reason,
      jsonb_build_object('from_assignment_id', assignment_value.id, 'target_kind', target_target_kind),
      target_requested_by_user_id
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'handoff', target_handoff_id
    );
  end if;

  return query
  select handoff.id, handoff.status, command_claim.was_replayed
  from app_private.handoffs as handoff
  where handoff.organization_id = target_organization_id and handoff.id = target_handoff_id;
end;
$$;

create function api.transition_handoff(
  target_organization_id uuid,
  target_handoff_id uuid,
  target_idempotency_key text,
  target_action text,
  target_reason text,
  target_decided_by_user_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (handoff_id uuid, handoff_status text, active_assignment_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  handoff_value app_private.handoffs%rowtype;
  target_assignment_id uuid;
  target_new_status text;
begin
  if target_action not in ('accept', 'decline', 'cancel', 'expire') then
    raise exception using errcode = '22023', message = 'invalid handoff action';
  end if;

  if target_action in ('accept', 'decline', 'cancel') and target_decided_by_user_id is null then
    raise exception using errcode = '42501', message = 'handoff decision requires a member actor';
  end if;

  perform app_private.assert_commercial_actor(target_organization_id, target_decided_by_user_id);
  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id, 'handoff_id', target_handoff_id,
    'action', target_action, 'reason', target_reason,
    'decided_by_user_id', target_decided_by_user_id, 'occurred_at', target_occurred_at
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.handoff.transition',
    request_payload, target_decided_by_user_id
  );

  if command_claim.was_replayed then
    select handoff.* into handoff_value
    from app_private.handoffs as handoff
    where handoff.organization_id = target_organization_id
      and handoff.id = (
        select command_value.result_id from app_private.commercial_commands as command_value
        where command_value.organization_id = target_organization_id
          and command_value.id = command_claim.claimed_command_id
      );
    select assignment.id into target_assignment_id
    from app_private.conversation_assignments as assignment
    where assignment.organization_id = target_organization_id
      and assignment.opportunity_id = handoff_value.opportunity_id
      and assignment.ended_at is null;
  else
    select handoff.* into handoff_value
    from app_private.handoffs as handoff
    where handoff.organization_id = target_organization_id and handoff.id = target_handoff_id
    for update;

    if not found or handoff_value.status <> 'pending' then
      raise exception using errcode = '23514', message = 'handoff is not pending';
    end if;

    if target_action = 'accept' and handoff_value.target_kind = 'member' and not exists (
      select 1 from app_private.organization_memberships as membership
      where membership.organization_id = target_organization_id
        and membership.user_id = handoff_value.target_member_user_id
        and membership.status = 'active'
        and membership.role in ('owner', 'admin', 'operator')
    ) then
      raise exception using errcode = '42501', message = 'handoff target member is no longer active';
    end if;

    if target_action = 'accept' and handoff_value.target_kind = 'member'
      and target_decided_by_user_id <> handoff_value.target_member_user_id then
      raise exception using errcode = '42501', message = 'only the target member can accept this handoff';
    end if;

    target_new_status := case target_action
      when 'accept' then 'accepted'
      when 'decline' then 'declined'
      when 'cancel' then 'cancelled'
      when 'expire' then 'expired'
    end;

    if target_action = 'accept' then
      update app_private.conversation_assignments
      set ended_at = target_occurred_at
      where organization_id = target_organization_id
        and id = handoff_value.from_assignment_id
        and ended_at is null;

      if not found then
        raise exception using errcode = '40001', message = 'handoff source assignment is no longer active';
      end if;

      insert into app_private.conversation_assignments (
        organization_id, opportunity_id, channel_connection_id, conversation_id,
        assignee_kind, member_user_id, agent_key, reason, started_at
      ) values (
        target_organization_id, handoff_value.opportunity_id,
        handoff_value.channel_connection_id, handoff_value.conversation_id,
        handoff_value.target_kind, handoff_value.target_member_user_id,
        handoff_value.target_agent_key, target_reason, target_occurred_at
      ) returning id into target_assignment_id;
    else
      target_assignment_id := handoff_value.from_assignment_id;
    end if;

    update app_private.handoffs
    set status = target_new_status,
      decided_by_user_id = target_decided_by_user_id,
      accepted_assignment_id = case when target_action = 'accept' then target_assignment_id end,
      decided_at = target_occurred_at
    where organization_id = target_organization_id and id = target_handoff_id
    returning * into handoff_value;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'handoff', target_handoff_id,
      'handoff.' || target_action, 'pending', target_new_status, target_reason,
      jsonb_build_object('active_assignment_id', target_assignment_id),
      target_decided_by_user_id, target_occurred_at
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'handoff', target_handoff_id
    );
  end if;

  return query select handoff_value.id, handoff_value.status, target_assignment_id,
    command_claim.was_replayed;
end;
$$;

create function api.create_order(
  target_organization_id uuid,
  target_idempotency_key text,
  target_contact_id uuid,
  target_origin text,
  target_handling_mode text,
  target_lines jsonb,
  target_quoted_at timestamptz default statement_timestamp(),
  target_preferred_contact_method_id uuid default null,
  target_opportunity_id uuid default null,
  target_channel_connection_id uuid default null,
  target_conversation_id uuid default null,
  target_customer_note text default null,
  target_created_by_user_id uuid default null
)
returns table (order_id uuid, order_status text, total_amount numeric, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_lines jsonb;
  line_snapshots jsonb := '[]'::jsonb;
  request_payload jsonb;
  command_claim record;
  submitted_line record;
  quote_value record;
  contact_value app_private.contacts%rowtype;
  method_value app_private.contact_methods%rowtype;
  target_order_id uuid;
  target_status text := 'pending_confirmation';
  target_currency_code text;
  target_subtotal numeric := 0;
  target_total numeric := 0;
  target_line_number integer := 0;
  target_contact_snapshot jsonb;
begin
  if target_lines is null or jsonb_typeof(target_lines) <> 'array'
    or jsonb_array_length(target_lines) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'order lines must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_lines) as submitted(value)
    where jsonb_typeof(submitted.value) <> 'object'
      or submitted.value - 'variant_id' - 'unit_id' - 'price_tier_id' - 'quantity' <> '{}'::jsonb
      or not submitted.value ?& array['variant_id', 'unit_id', 'price_tier_id', 'quantity']
  ) then
    raise exception using errcode = '22023', message = 'order line contract is invalid';
  end if;

  select jsonb_agg(jsonb_build_object(
    'variant_id', line.variant_id,
    'unit_id', line.unit_id,
    'price_tier_id', line.price_tier_id,
    'quantity', line.quantity
  ) order by line.variant_id, line.unit_id, line.price_tier_id)
  into normalized_lines
  from (
    select submitted.variant_id, submitted.unit_id, submitted.price_tier_id,
      sum(submitted.quantity) as quantity
    from jsonb_to_recordset(target_lines) as submitted(
      variant_id uuid, unit_id uuid, price_tier_id uuid, quantity numeric
    )
    group by submitted.variant_id, submitted.unit_id, submitted.price_tier_id
  ) as line;

  if normalized_lines is null or exists (
    select 1
    from jsonb_to_recordset(normalized_lines) as line(
      variant_id uuid, unit_id uuid, price_tier_id uuid, quantity numeric
    )
    where line.variant_id is null or line.unit_id is null or line.price_tier_id is null
      or line.quantity is null or line.quantity <= 0 or line.quantity > 1000000000000
  ) then
    raise exception using errcode = '23514', message = 'order line identifiers and quantities are required';
  end if;

  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  select contact.* into contact_value
  from app_private.contacts as contact
  where contact.organization_id = target_organization_id
    and contact.id = target_contact_id
    and contact.status = 'active';

  if not found then
    raise exception using errcode = '23514', message = 'order requires an active contact';
  end if;

  if target_preferred_contact_method_id is not null then
    select method.* into method_value
    from app_private.contact_methods as method
    where method.organization_id = target_organization_id
      and method.id = target_preferred_contact_method_id
      and method.contact_id = target_contact_id
      and method.status = 'active';

    if not found then
      raise exception using errcode = '23514', message = 'order contact method must be active and belong to the contact';
    end if;
  end if;

  if target_conversation_id is not null and not exists (
    select 1
    from app_private.conversations as conversation
    join app_private.channel_identities as identity_value
      on identity_value.organization_id = conversation.organization_id
      and identity_value.channel_connection_id = conversation.channel_connection_id
      and identity_value.id = conversation.primary_channel_identity_id
    where conversation.organization_id = target_organization_id
      and conversation.channel_connection_id = target_channel_connection_id
      and conversation.id = target_conversation_id
      and identity_value.contact_id = target_contact_id
  ) then
    raise exception using errcode = '23514', message = 'order conversation does not belong to its contact';
  end if;

  if target_opportunity_id is not null and not exists (
    select 1
    from app_private.opportunities as opportunity
    join app_private.leads as lead_value
      on lead_value.organization_id = opportunity.organization_id
      and lead_value.id = opportunity.lead_id
    where opportunity.organization_id = target_organization_id
      and opportunity.id = target_opportunity_id
      and lead_value.contact_id = target_contact_id
  ) then
    raise exception using errcode = '23514', message = 'order opportunity does not belong to its contact';
  end if;

  for submitted_line in
    select * from jsonb_to_recordset(normalized_lines) as line(
      variant_id uuid, unit_id uuid, price_tier_id uuid, quantity numeric
    )
  loop
    select
      product.name as product_name,
      variant.name as variant_name,
      sku.sku,
      unit_value.code as unit_code,
      unit_value.decimal_scale,
      tier.pricing_status,
      tier.calculation_method,
      tier.price_amount,
      book.currency_code,
      case
        when tier.pricing_status = 'on_request' then null
        when tier.calculation_method = 'fixed_total' then tier.price_amount
        when tier.calculation_method = 'per_unit' then tier.price_amount * submitted_line.quantity
      end as line_total_amount
    into quote_value
    from app_private.price_tiers as tier
    join app_private.price_books as book
      on book.organization_id = tier.organization_id and book.id = tier.price_book_id
    join app_private.product_variants as variant
      on variant.organization_id = tier.organization_id and variant.id = tier.variant_id
    join app_private.products as product
      on product.organization_id = variant.organization_id and product.id = variant.product_id
    join app_private.variant_skus as sku
      on sku.organization_id = variant.organization_id and sku.variant_id = variant.id
      and sku.status = 'current'
    join app_private.catalog_units as unit_value
      on unit_value.organization_id = tier.organization_id and unit_value.id = tier.unit_id
    where tier.organization_id = target_organization_id
      and tier.id = submitted_line.price_tier_id
      and tier.variant_id = submitted_line.variant_id
      and tier.unit_id = submitted_line.unit_id
      and tier.superseded_at is null
      and tier.quantity_range @> submitted_line.quantity
      and tier.valid_during @> target_quoted_at
      and book.status = 'active'
      and product.status = 'active'
      and variant.status = 'active'
      and unit_value.status = 'active';

    if not found or trunc(submitted_line.quantity, quote_value.decimal_scale) <> submitted_line.quantity then
      raise exception using errcode = '23514', message = 'order line does not resolve to one active exact quote';
    end if;

    if target_currency_code is null then
      target_currency_code := quote_value.currency_code;
    elsif target_currency_code <> quote_value.currency_code then
      raise exception using errcode = '23514', message = 'one order cannot mix currencies';
    end if;

    if quote_value.pricing_status = 'on_request' then
      target_status := 'pending_quote';
    else
      target_subtotal := target_subtotal + quote_value.line_total_amount;
      target_total := target_total + quote_value.line_total_amount;
    end if;

    target_line_number := target_line_number + 1;
    line_snapshots := line_snapshots || jsonb_build_array(jsonb_build_object(
      'line_number', target_line_number,
      'variant_id', submitted_line.variant_id,
      'unit_id', submitted_line.unit_id,
      'price_tier_id', submitted_line.price_tier_id,
      'quantity', submitted_line.quantity,
      'pricing_status', quote_value.pricing_status,
      'calculation_method', quote_value.calculation_method,
      'price_amount', quote_value.price_amount,
      'line_total_amount', quote_value.line_total_amount,
      'currency_code', quote_value.currency_code,
      'product_name', quote_value.product_name,
      'variant_name', quote_value.variant_name,
      'sku', quote_value.sku,
      'unit_code', quote_value.unit_code
    ));
  end loop;

  if target_status = 'pending_quote' then
    target_subtotal := null;
    target_total := null;
  end if;

  target_contact_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'contact_id', target_contact_id,
    'display_name', contact_value.display_name,
    'preferred_contact_method_id', target_preferred_contact_method_id,
    'method_kind', method_value.method_kind,
    'display_hint', method_value.display_hint
  ));

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id, 'contact_id', target_contact_id,
    'preferred_contact_method_id', target_preferred_contact_method_id,
    'opportunity_id', target_opportunity_id,
    'channel_connection_id', target_channel_connection_id,
    'conversation_id', target_conversation_id, 'origin', target_origin,
    'handling_mode', target_handling_mode, 'quoted_at', target_quoted_at,
    'lines', normalized_lines, 'customer_note', target_customer_note,
    'created_by_user_id', target_created_by_user_id
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.order.create',
    request_payload, target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_order_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    insert into app_private.orders (
      organization_id, creation_command_id, contact_id, preferred_contact_method_id,
      opportunity_id, channel_connection_id, conversation_id, origin, status,
      handling_mode, currency_code, subtotal_amount, total_amount, contact_snapshot,
      customer_note, notification_status, created_by_user_id
    ) values (
      target_organization_id, command_claim.claimed_command_id, target_contact_id,
      target_preferred_contact_method_id, target_opportunity_id, target_channel_connection_id,
      target_conversation_id, target_origin, target_status, target_handling_mode,
      target_currency_code, target_subtotal, target_total, target_contact_snapshot,
      target_customer_note, 'pending', target_created_by_user_id
    ) returning id into target_order_id;

    for submitted_line in
      select * from jsonb_to_recordset(line_snapshots) as line(
        line_number integer, variant_id uuid, unit_id uuid, price_tier_id uuid,
        quantity numeric, pricing_status text, calculation_method text,
        price_amount numeric, line_total_amount numeric, currency_code text,
        product_name text, variant_name text, sku text, unit_code text
      )
    loop
      insert into app_private.order_lines (
        organization_id, order_id, line_number, variant_id, unit_id, price_tier_id,
        quantity, pricing_status, calculation_method, price_amount, line_total_amount,
        currency_code, product_name_snapshot, variant_name_snapshot, sku_snapshot,
        unit_code_snapshot, offer_snapshot, quoted_at
      ) values (
        target_organization_id, target_order_id, submitted_line.line_number,
        submitted_line.variant_id, submitted_line.unit_id, submitted_line.price_tier_id,
        submitted_line.quantity, submitted_line.pricing_status,
        submitted_line.calculation_method, submitted_line.price_amount,
        submitted_line.line_total_amount, submitted_line.currency_code,
        submitted_line.product_name, submitted_line.variant_name, submitted_line.sku,
        submitted_line.unit_code,
        jsonb_build_object(
          'product_name', submitted_line.product_name,
          'variant_name', submitted_line.variant_name,
          'sku', submitted_line.sku,
          'unit_code', submitted_line.unit_code
        ),
        target_quoted_at
      );
    end loop;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id,
      'order.created', null, target_status, 'customer order request captured',
      jsonb_build_object('line_count', target_line_number, 'origin', target_origin),
      target_created_by_user_id
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id
    );
  end if;

  return query
  select order_value.id, order_value.status, order_value.total_amount, command_claim.was_replayed
  from app_private.orders as order_value
  where order_value.organization_id = target_organization_id and order_value.id = target_order_id;
end;
$$;

create function api.link_order_reservation(
  target_organization_id uuid,
  target_order_id uuid,
  target_reservation_id uuid,
  target_idempotency_key text,
  target_purpose text,
  target_linked_by_user_id uuid default null
)
returns table (order_id uuid, reservation_id uuid, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
begin
  perform app_private.assert_commercial_actor(target_organization_id, target_linked_by_user_id);

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id, 'order_id', target_order_id,
    'reservation_id', target_reservation_id, 'purpose', target_purpose,
    'linked_by_user_id', target_linked_by_user_id
  );

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.order.link_reservation',
    request_payload, target_linked_by_user_id
  );

  if not command_claim.was_replayed then
    if not exists (
      select 1
      from app_private.inventory_reservations as reservation
      where reservation.organization_id = target_organization_id
        and reservation.id = target_reservation_id
        and reservation.reference_type = 'order'
        and reservation.reference_id = target_order_id::text
    ) then
      raise exception using errcode = '23514', message = 'reservation must explicitly reference the order';
    end if;

    insert into app_private.order_reservation_links (
      organization_id, order_id, reservation_id, purpose, linked_by_user_id
    ) values (
      target_organization_id, target_order_id, target_reservation_id,
      target_purpose, target_linked_by_user_id
    );

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id,
      'order.reservation_linked', null, null, 'inventory reservation linked to order',
      jsonb_build_object('reservation_id', target_reservation_id, 'purpose', target_purpose),
      target_linked_by_user_id
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id
    );
  end if;

  return query select target_order_id, target_reservation_id, command_claim.was_replayed;
end;
$$;

create function api.transition_order(
  target_organization_id uuid,
  target_order_id uuid,
  target_idempotency_key text,
  target_action text,
  target_reason text,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (order_id uuid, order_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  order_value app_private.orders%rowtype;
  target_new_status text;
  target_previous_status text;
begin
  if target_action not in ('confirm', 'cancel', 'expire', 'stock_unavailable') then
    raise exception using errcode = '22023', message = 'invalid order action';
  end if;
  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id, 'order_id', target_order_id,
    'action', target_action, 'reason', target_reason,
    'created_by_user_id', target_created_by_user_id, 'occurred_at', target_occurred_at
  );

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.order.transition',
    request_payload, target_created_by_user_id
  );

  if command_claim.was_replayed then
    select current_order.* into order_value
    from app_private.orders as current_order
    where current_order.organization_id = target_organization_id
      and current_order.id = (
        select command_value.result_id from app_private.commercial_commands as command_value
        where command_value.organization_id = target_organization_id
          and command_value.id = command_claim.claimed_command_id
      );
  else
    select current_order.* into order_value
    from app_private.orders as current_order
    where current_order.organization_id = target_organization_id and current_order.id = target_order_id
    for update;

    if not found or order_value.closed_at is not null then
      raise exception using errcode = '23514', message = 'order is not open';
    end if;

    if target_action = 'confirm' and order_value.status <> 'pending_confirmation' then
      raise exception using errcode = '23514', message = 'only a fully quoted order can be confirmed';
    end if;

    if target_action in ('cancel', 'expire', 'stock_unavailable')
      and order_value.status not in ('pending_quote', 'pending_confirmation', 'confirmed') then
      raise exception using errcode = '23514', message = 'order cannot enter the requested terminal state';
    end if;

    if target_action in ('cancel', 'expire', 'stock_unavailable') and exists (
      select 1 from app_private.sales as sale
      where sale.organization_id = target_organization_id
        and sale.order_id = target_order_id and sale.sale_kind = 'sale'
    ) then
      raise exception using errcode = '23514', message = 'order with recorded sales cannot be closed as unfulfilled';
    end if;

    target_new_status := case target_action
      when 'confirm' then 'confirmed'
      when 'cancel' then 'cancelled'
      when 'expire' then 'expired'
      when 'stock_unavailable' then 'stock_unavailable'
    end;

    target_previous_status := order_value.status;

    update app_private.orders
    set status = target_new_status,
      closed_at = case when target_action = 'confirm' then null else target_occurred_at end
    where organization_id = target_organization_id and id = target_order_id
    returning * into order_value;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id,
      'order.' || target_action, target_previous_status, target_new_status, target_reason,
      '{}'::jsonb, target_created_by_user_id, target_occurred_at
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'order', target_order_id
    );
  end if;

  return query select order_value.id, order_value.status, command_claim.was_replayed;
end;
$$;

create function api.record_sale(
  target_organization_id uuid,
  target_idempotency_key text,
  target_sale_kind text,
  target_source text,
  target_currency_code text,
  target_lines jsonb,
  target_order_id uuid default null,
  target_contact_id uuid default null,
  target_opportunity_id uuid default null,
  target_reverses_sale_id uuid default null,
  target_note text default null,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (sale_id uuid, order_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_lines jsonb;
  sale_line_snapshots jsonb := '[]'::jsonb;
  request_payload jsonb;
  command_claim record;
  submitted_line record;
  source_line record;
  order_value app_private.orders%rowtype;
  target_sale_id uuid;
  target_subtotal numeric := 0;
  target_total numeric := 0;
  target_line_number integer := 0;
  target_order_status text;
  fulfilled_count integer;
  positive_count integer;
  order_line_count integer;
begin
  if target_sale_kind not in ('sale', 'reversal') then
    raise exception using errcode = '22023', message = 'invalid sale kind';
  end if;
  if (target_sale_kind = 'sale') <> (target_reverses_sale_id is null) then
    raise exception using errcode = '22023', message = 'sale reversal reference does not match sale kind';
  end if;
  if target_lines is null or jsonb_typeof(target_lines) <> 'array'
    or jsonb_array_length(target_lines) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'sale lines must be a bounded array';
  end if;
  if exists (
    select 1 from jsonb_array_elements(target_lines) as submitted(value)
    where jsonb_typeof(submitted.value) <> 'object'
      or submitted.value - 'order_line_id' - 'reverses_sale_line_id'
        - 'variant_id' - 'unit_id' - 'quantity'
        - 'unit_amount' - 'line_total_amount' - 'inventory_effect_status'
        - 'inventory_operation_id' <> '{}'::jsonb
      or not submitted.value ?& array[
        'variant_id', 'unit_id', 'quantity', 'unit_amount',
        'line_total_amount', 'inventory_effect_status'
      ]
  ) then
    raise exception using errcode = '22023', message = 'sale line contract is invalid';
  end if;

  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'order_line_id', line.order_line_id,
    'reverses_sale_line_id', line.reverses_sale_line_id,
    'variant_id', line.variant_id,
    'unit_id', line.unit_id, 'quantity', line.quantity,
    'unit_amount', line.unit_amount, 'line_total_amount', line.line_total_amount,
    'inventory_effect_status', line.inventory_effect_status,
    'inventory_operation_id', line.inventory_operation_id
  )) order by line.reverses_sale_line_id nulls first, line.order_line_id nulls last,
    line.variant_id, line.unit_id, line.inventory_operation_id nulls first)
  into normalized_lines
  from jsonb_to_recordset(target_lines) as line(
    order_line_id uuid, reverses_sale_line_id uuid,
    variant_id uuid, unit_id uuid, quantity numeric,
    unit_amount numeric, line_total_amount numeric, inventory_effect_status text,
    inventory_operation_id uuid
  );

  if exists (
    select 1
    from jsonb_to_recordset(normalized_lines) as line(
      order_line_id uuid, reverses_sale_line_id uuid
    )
    where (target_sale_kind = 'sale' and line.reverses_sale_line_id is not null)
      or (target_sale_kind = 'reversal' and line.reverses_sale_line_id is null)
  ) then
    raise exception using errcode = '23514', message = 'sale line reversal identity does not match sale kind';
  end if;

  if target_sale_kind = 'sale' and target_order_id is not null and exists (
    select 1
    from jsonb_to_recordset(normalized_lines) as line(order_line_id uuid)
    group by line.order_line_id
    having line.order_line_id is null or count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'an order sale must reference each order line at most once';
  end if;

  if target_sale_kind = 'reversal' and exists (
    select 1
    from jsonb_to_recordset(normalized_lines) as line(reverses_sale_line_id uuid)
    group by line.reverses_sale_line_id
    having count(*) > 1
  ) then
    raise exception using errcode = '23514', message = 'a reversal must reference each original sale line at most once';
  end if;

  if target_currency_code is null or target_currency_code !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'sale currency code is invalid';
  end if;

  if target_order_id is not null then
    select current_order.* into order_value
    from app_private.orders as current_order
    where current_order.organization_id = target_organization_id
      and current_order.id = target_order_id;

    if not found then
      raise exception using errcode = 'P0002', message = 'sale order does not exist';
    end if;
    if target_currency_code <> order_value.currency_code then
      raise exception using errcode = '23514', message = 'sale currency must match its order';
    end if;
    if target_contact_id is not null and target_contact_id <> order_value.contact_id then
      raise exception using errcode = '23514', message = 'sale contact must match its order';
    end if;
    if target_opportunity_id is not null
      and target_opportunity_id is distinct from order_value.opportunity_id then
      raise exception using errcode = '23514', message = 'sale opportunity must match its order';
    end if;

    target_contact_id := order_value.contact_id;
    target_opportunity_id := order_value.opportunity_id;
  elsif target_contact_id is not null and target_opportunity_id is not null and not exists (
    select 1
    from app_private.opportunities as opportunity
    join app_private.leads as lead_value
      on lead_value.organization_id = opportunity.organization_id
      and lead_value.id = opportunity.lead_id
    where opportunity.organization_id = target_organization_id
      and opportunity.id = target_opportunity_id
      and lead_value.contact_id = target_contact_id
  ) then
    raise exception using errcode = '23514', message = 'external sale opportunity must belong to its contact';
  end if;

  request_payload := jsonb_strip_nulls(jsonb_build_object(
    'organization_id', target_organization_id, 'sale_kind', target_sale_kind,
    'source', target_source, 'currency_code', target_currency_code,
    'order_id', target_order_id, 'contact_id', target_contact_id,
    'opportunity_id', target_opportunity_id, 'reverses_sale_id', target_reverses_sale_id,
    'lines', normalized_lines, 'note', target_note,
    'created_by_user_id', target_created_by_user_id, 'occurred_at', target_occurred_at
  ));

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id, target_idempotency_key, 'commercial.sale.record',
    request_payload, target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_sale_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    if target_order_id is not null then
      select current_order.* into order_value
      from app_private.orders as current_order
      where current_order.organization_id = target_organization_id
        and current_order.id = target_order_id
      for update;

      if not found or (
        target_sale_kind = 'sale'
        and order_value.status not in ('confirmed', 'partially_fulfilled')
      ) then
        raise exception using errcode = '23514', message = 'sale requires a confirmed open order';
      end if;
      target_order_status := order_value.status;
    end if;

    if target_sale_kind = 'reversal' and not exists (
      select 1 from app_private.sales as original
      where original.organization_id = target_organization_id
        and original.id = target_reverses_sale_id
        and original.sale_kind = 'sale'
        and original.currency_code = target_currency_code
        and original.order_id is not distinct from target_order_id
        and original.contact_id is not distinct from target_contact_id
        and original.opportunity_id is not distinct from target_opportunity_id
    ) then
      raise exception using errcode = '23514', message = 'reversal must match one original sale';
    end if;

    for submitted_line in
      select * from jsonb_to_recordset(normalized_lines) as line(
        order_line_id uuid, reverses_sale_line_id uuid,
        variant_id uuid, unit_id uuid, quantity numeric,
        unit_amount numeric, line_total_amount numeric, inventory_effect_status text,
        inventory_operation_id uuid
      )
    loop
      if submitted_line.quantity is null or submitted_line.quantity <= 0
        or submitted_line.quantity > 1000000000000
        or submitted_line.unit_amount is null or submitted_line.unit_amount < 0
        or submitted_line.line_total_amount is null or submitted_line.line_total_amount < 0
        or submitted_line.line_total_amount <> submitted_line.unit_amount * submitted_line.quantity then
        raise exception using errcode = '23514', message = 'sale line quantity and exact total are invalid';
      end if;

      if target_sale_kind = 'reversal' then
        select
          original_line.order_line_id,
          original_line.variant_id,
          original_line.unit_id,
          original_line.quantity as source_quantity,
          original_line.unit_amount as source_unit_amount,
          original_line.product_name_snapshot,
          original_line.variant_name_snapshot,
          original_line.sku_snapshot,
          original_line.unit_code_snapshot
        into source_line
        from app_private.sale_lines as original_line
        join app_private.sales as original_sale
          on original_sale.organization_id = original_line.organization_id
          and original_sale.id = original_line.sale_id
        where original_line.organization_id = target_organization_id
          and original_line.id = submitted_line.reverses_sale_line_id
          and original_sale.id = target_reverses_sale_id
          and original_sale.sale_kind = 'sale'
        for update of original_line;

        if not found
          or source_line.order_line_id is distinct from submitted_line.order_line_id
          or source_line.variant_id <> submitted_line.variant_id
          or source_line.unit_id <> submitted_line.unit_id
          or source_line.source_unit_amount <> submitted_line.unit_amount then
          raise exception using errcode = '23514', message = 'reversal line must exactly match its original sale line';
        end if;

        if submitted_line.quantity > source_line.source_quantity - coalesce((
          select sum(reversal_line.quantity)
          from app_private.sale_lines as reversal_line
          join app_private.sales as reversal_sale
            on reversal_sale.organization_id = reversal_line.organization_id
            and reversal_sale.id = reversal_line.sale_id
          where reversal_line.organization_id = target_organization_id
            and reversal_line.reverses_sale_line_id = submitted_line.reverses_sale_line_id
            and reversal_sale.sale_kind = 'reversal'
        ), 0) then
          raise exception using errcode = '23514', message = 'reversal would exceed unreversed original quantity';
        end if;
      elsif target_order_id is not null then
        select line_value.quantity, line_value.variant_id, line_value.unit_id,
          line_value.pricing_status, line_value.calculation_method,
          line_value.price_amount, line_value.line_total_amount,
          line_value.product_name_snapshot, line_value.variant_name_snapshot,
          line_value.sku_snapshot, line_value.unit_code_snapshot
        into source_line
        from app_private.order_lines as line_value
        where line_value.organization_id = target_organization_id
          and line_value.order_id = target_order_id
          and line_value.id = submitted_line.order_line_id
          and line_value.variant_id = submitted_line.variant_id
          and line_value.unit_id = submitted_line.unit_id
        for update;

        if not found then
          raise exception using errcode = '23514', message = 'sale line does not match its order line';
        end if;

        if submitted_line.quantity > source_line.quantity - coalesce((
          select sum(case sale.sale_kind when 'sale' then sold.quantity else -sold.quantity end)
          from app_private.sale_lines as sold
          join app_private.sales as sale
            on sale.organization_id = sold.organization_id and sale.id = sold.sale_id
          where sold.organization_id = target_organization_id
            and sold.order_line_id = submitted_line.order_line_id
        ), 0) then
          raise exception using errcode = '23514', message = 'sale would exceed remaining order quantity';
        end if;

        if source_line.pricing_status <> 'priced'
          or (source_line.calculation_method = 'per_unit'
            and submitted_line.unit_amount <> source_line.price_amount)
          or (source_line.calculation_method = 'fixed_total'
            and (submitted_line.quantity <> source_line.quantity
              or submitted_line.line_total_amount <> source_line.line_total_amount)) then
          raise exception using errcode = '23514', message = 'sale amount must match the immutable order quote';
        end if;
      else
        if submitted_line.order_line_id is not null then
          raise exception using errcode = '23514', message = 'external sale cannot reference an order line';
        end if;

        select product.name as product_name_snapshot, variant.name as variant_name_snapshot,
          sku.sku as sku_snapshot, unit_value.code as unit_code_snapshot
        into source_line
        from app_private.product_variants as variant
        join app_private.products as product
          on product.organization_id = variant.organization_id and product.id = variant.product_id
        join app_private.variant_skus as sku
          on sku.organization_id = variant.organization_id and sku.variant_id = variant.id
          and sku.status = 'current'
        join app_private.catalog_units as unit_value
          on unit_value.organization_id = variant.organization_id and unit_value.id = submitted_line.unit_id
        where variant.organization_id = target_organization_id
          and variant.id = submitted_line.variant_id;

        if not found then
          raise exception using errcode = '23514', message = 'external sale line requires valid catalog references';
        end if;
      end if;

      if submitted_line.inventory_effect_status = 'applied' then
        perform app_private.assert_sale_inventory_operation(
          target_organization_id,
          submitted_line.inventory_operation_id,
          submitted_line.variant_id,
          submitted_line.unit_id,
          submitted_line.quantity,
          target_sale_kind
        );
      end if;

      target_line_number := target_line_number + 1;
      target_subtotal := target_subtotal + submitted_line.line_total_amount;
      target_total := target_total + submitted_line.line_total_amount;
      sale_line_snapshots := sale_line_snapshots || jsonb_build_array(jsonb_build_object(
        'line_number', target_line_number,
        'order_line_id', submitted_line.order_line_id,
        'reverses_sale_line_id', submitted_line.reverses_sale_line_id,
        'variant_id', submitted_line.variant_id,
        'unit_id', submitted_line.unit_id,
        'quantity', submitted_line.quantity,
        'unit_amount', submitted_line.unit_amount,
        'line_total_amount', submitted_line.line_total_amount,
        'product_name', source_line.product_name_snapshot,
        'variant_name', source_line.variant_name_snapshot,
        'sku', source_line.sku_snapshot,
        'unit_code', source_line.unit_code_snapshot,
        'inventory_effect_status', submitted_line.inventory_effect_status,
        'inventory_operation_id', submitted_line.inventory_operation_id
      ));
    end loop;

    insert into app_private.sales (
      organization_id, creation_command_id, order_id, contact_id, opportunity_id,
      sale_kind, reverses_sale_id, source, currency_code, subtotal_amount,
      total_amount, note, occurred_at, created_by_user_id
    ) values (
      target_organization_id, command_claim.claimed_command_id, target_order_id,
      target_contact_id, target_opportunity_id, target_sale_kind, target_reverses_sale_id,
      target_source, target_currency_code, target_subtotal, target_total, target_note,
      target_occurred_at, target_created_by_user_id
    ) returning id into target_sale_id;

    for submitted_line in
      select * from jsonb_to_recordset(sale_line_snapshots) as line(
        line_number integer, order_line_id uuid, reverses_sale_line_id uuid,
        variant_id uuid, unit_id uuid,
        quantity numeric, unit_amount numeric, line_total_amount numeric,
        product_name text, variant_name text, sku text, unit_code text,
        inventory_effect_status text, inventory_operation_id uuid
      )
    loop
      insert into app_private.sale_lines (
        organization_id, sale_id, line_number, order_line_id, reverses_sale_line_id,
        variant_id, unit_id,
        quantity, unit_amount, line_total_amount, product_name_snapshot,
        variant_name_snapshot, sku_snapshot, unit_code_snapshot,
        inventory_effect_status, inventory_operation_id
      ) values (
        target_organization_id, target_sale_id, submitted_line.line_number,
        submitted_line.order_line_id, submitted_line.reverses_sale_line_id,
        submitted_line.variant_id, submitted_line.unit_id,
        submitted_line.quantity, submitted_line.unit_amount,
        submitted_line.line_total_amount, submitted_line.product_name,
        submitted_line.variant_name, submitted_line.sku, submitted_line.unit_code,
        submitted_line.inventory_effect_status, submitted_line.inventory_operation_id
      );
    end loop;

    if target_order_id is not null then
      select count(*)::integer,
        count(*) filter (where net_quantity >= ordered_quantity)::integer,
        count(*) filter (where net_quantity > 0)::integer
      into order_line_count, fulfilled_count, positive_count
      from (
        select order_line.id, order_line.quantity as ordered_quantity,
          coalesce(sum(case sale.sale_kind when 'sale' then sold.quantity else -sold.quantity end), 0)
            as net_quantity
        from app_private.order_lines as order_line
        left join app_private.sale_lines as sold
          on sold.organization_id = order_line.organization_id and sold.order_line_id = order_line.id
        left join app_private.sales as sale
          on sale.organization_id = sold.organization_id and sale.id = sold.sale_id
        where order_line.organization_id = target_organization_id
          and order_line.order_id = target_order_id
        group by order_line.id, order_line.quantity
      ) as fulfillment;

      target_order_status := case
        when fulfilled_count = order_line_count then 'fulfilled'
        when positive_count > 0 then 'partially_fulfilled'
        else 'confirmed'
      end;

      update app_private.orders
      set status = target_order_status,
        closed_at = case when target_order_status = 'fulfilled' then target_occurred_at end
      where organization_id = target_organization_id and id = target_order_id;
    end if;

    perform app_private.insert_commercial_event(
      target_organization_id, command_claim.claimed_command_id, 'sale', target_sale_id,
      'sale.' || target_sale_kind, null, 'recorded',
      coalesce(target_note, 'commercial sale record created'),
      jsonb_build_object(
        'order_id', target_order_id,
        'line_count', target_line_number,
        'inventory_pending_lines', (
          select count(*) from jsonb_to_recordset(sale_line_snapshots) as line(
            inventory_effect_status text
          ) where line.inventory_effect_status = 'pending'
        )
      ),
      target_created_by_user_id, target_occurred_at
    );
    perform app_private.complete_commercial_command(
      target_organization_id, command_claim.claimed_command_id, 'sale', target_sale_id
    );
  end if;

  if target_order_id is not null then
    select current_order.status into target_order_status
    from app_private.orders as current_order
    where current_order.organization_id = target_organization_id
      and current_order.id = target_order_id;
  end if;

  return query select target_sale_id, target_order_status, command_claim.was_replayed;
end;
$$;

create function api.reconcile_sale_inventory(
  target_organization_id uuid,
  target_sale_line_id uuid,
  target_idempotency_key text,
  target_inventory_operation_id uuid,
  target_reason text,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (sale_line_id uuid, inventory_effect_status text, replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_payload jsonb;
  command_claim record;
  line_value app_private.sale_lines%rowtype;
  target_sale_id uuid;
  target_sale_kind text;
begin
  perform app_private.assert_commercial_actor(target_organization_id, target_created_by_user_id);

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'sale_line_id', target_sale_line_id,
    'inventory_operation_id', target_inventory_operation_id,
    'reason', target_reason,
    'created_by_user_id', target_created_by_user_id,
    'occurred_at', target_occurred_at
  );

  select * into command_claim
  from app_private.claim_commercial_command(
    target_organization_id,
    target_idempotency_key,
    'commercial.sale.reconcile_inventory',
    request_payload,
    target_created_by_user_id
  );

  if command_claim.was_replayed then
    select command_value.result_id into target_sale_line_id
    from app_private.commercial_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = command_claim.claimed_command_id;
  else
    select sale_line.* into line_value
    from app_private.sale_lines as sale_line
    where sale_line.organization_id = target_organization_id
      and sale_line.id = target_sale_line_id
    for update of sale_line;

    if not found or line_value.inventory_effect_status <> 'pending' then
      raise exception using errcode = '23514', message = 'sale line is not pending inventory reconciliation';
    end if;

    target_sale_id := line_value.sale_id;
    select sale.sale_kind into target_sale_kind
    from app_private.sales as sale
    where sale.organization_id = target_organization_id and sale.id = target_sale_id;

    perform app_private.assert_sale_inventory_operation(
      target_organization_id,
      target_inventory_operation_id,
      line_value.variant_id,
      line_value.unit_id,
      line_value.quantity,
      target_sale_kind
    );

    update app_private.sale_lines
    set inventory_effect_status = 'applied',
      inventory_operation_id = target_inventory_operation_id
    where organization_id = target_organization_id and id = target_sale_line_id
    returning * into line_value;

    perform app_private.insert_commercial_event(
      target_organization_id,
      command_claim.claimed_command_id,
      'sale',
      target_sale_id,
      'sale.inventory_reconciled',
      'pending',
      'applied',
      target_reason,
      jsonb_build_object(
        'sale_line_id', target_sale_line_id,
        'inventory_operation_id', target_inventory_operation_id
      ),
      target_created_by_user_id,
      target_occurred_at
    );
    perform app_private.complete_commercial_command(
      target_organization_id,
      command_claim.claimed_command_id,
      'sale_line',
      target_sale_line_id
    );
  end if;

  return query
  select current_line.id, current_line.inventory_effect_status, command_claim.was_replayed
  from app_private.sale_lines as current_line
  where current_line.organization_id = target_organization_id
    and current_line.id = target_sale_line_id;
end;
$$;

alter table app_private.commercial_commands enable row level security;
alter table app_private.commercial_commands force row level security;
alter table app_private.contact_methods enable row level security;
alter table app_private.contact_methods force row level security;
alter table app_private.pending_requests enable row level security;
alter table app_private.pending_requests force row level security;
alter table app_private.leads enable row level security;
alter table app_private.leads force row level security;
alter table app_private.lead_interests enable row level security;
alter table app_private.lead_interests force row level security;
alter table app_private.opportunities enable row level security;
alter table app_private.opportunities force row level security;
alter table app_private.conversation_assignments enable row level security;
alter table app_private.conversation_assignments force row level security;
alter table app_private.handoffs enable row level security;
alter table app_private.handoffs force row level security;
alter table app_private.orders enable row level security;
alter table app_private.orders force row level security;
alter table app_private.order_lines enable row level security;
alter table app_private.order_lines force row level security;
alter table app_private.order_reservation_links enable row level security;
alter table app_private.order_reservation_links force row level security;
alter table app_private.sales enable row level security;
alter table app_private.sales force row level security;
alter table app_private.sale_lines enable row level security;
alter table app_private.sale_lines force row level security;
alter table app_private.commercial_events enable row level security;
alter table app_private.commercial_events force row level security;

create policy commercial_commands_operator_select
on app_private.commercial_commands for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = commercial_commands.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy contact_methods_operator_select
on app_private.contact_methods for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = contact_methods.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy pending_requests_member_select
on app_private.pending_requests for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = pending_requests.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy leads_member_select
on app_private.leads for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = leads.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy lead_interests_member_select
on app_private.lead_interests for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = lead_interests.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy opportunities_member_select
on app_private.opportunities for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = opportunities.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy conversation_assignments_member_select
on app_private.conversation_assignments for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = conversation_assignments.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy handoffs_member_select
on app_private.handoffs for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = handoffs.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy orders_member_select
on app_private.orders for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = orders.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy order_lines_member_select
on app_private.order_lines for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = order_lines.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy order_reservation_links_member_select
on app_private.order_reservation_links for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = order_reservation_links.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy sales_member_select
on app_private.sales for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = sales.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy sale_lines_member_select
on app_private.sale_lines for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = sale_lines.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create policy commercial_events_member_select
on app_private.commercial_events for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = commercial_events.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));

create view api.commercial_commands
with (security_invoker = true, security_barrier = true)
as select id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
from app_private.commercial_commands;

create view api.contact_methods
with (security_invoker = true, security_barrier = true)
as select id, organization_id, contact_id, method_kind, display_hint,
  consent_purpose, consent_source, status, consented_at, revoked_at,
  created_by_user_id, created_at, updated_at
from app_private.contact_methods;

create view api.pending_requests
with (security_invoker = true, security_barrier = true)
as select id, organization_id, channel_connection_id, conversation_id,
  contact_id, source_message_id, request_kind, status, variant_id, unit_id,
  requested_quantity, requested_fields, collected_context, due_at,
  resolution_kind, resolution_text, resolved_price_amount,
  resolved_currency_code, resolved_by_user_id, resolved_at,
  response_delivery_status, response_outbox_event_id, responded_at,
  created_by_user_id, created_at, updated_at
from app_private.pending_requests;

create view api.leads
with (security_invoker = true, security_barrier = true)
as select id, organization_id, contact_id, channel_connection_id,
  conversation_id, source, status, summary, captured_at, closed_at,
  created_by_user_id, created_at, updated_at
from app_private.leads;

create view api.lead_interests
with (security_invoker = true, security_barrier = true)
as select id, organization_id, lead_id, variant_id, unit_id,
  requested_quantity, summary, captured_context, status, created_at, updated_at
from app_private.lead_interests;

create view api.opportunities
with (security_invoker = true, security_barrier = true)
as select id, organization_id, lead_id, status, handling_mode, stage_code,
  title, estimated_amount, currency_code, opened_at, closed_at,
  created_by_user_id, created_at, updated_at
from app_private.opportunities;

create view api.conversation_assignments
with (security_invoker = true, security_barrier = true)
as select id, organization_id, opportunity_id, channel_connection_id,
  conversation_id, assignee_kind, member_user_id, agent_key, reason,
  started_at, ended_at, created_at
from app_private.conversation_assignments;

create view api.handoffs
with (security_invoker = true, security_barrier = true)
as select id, organization_id, opportunity_id, channel_connection_id,
  conversation_id, from_assignment_id, target_kind, target_member_user_id,
  target_agent_key, status, reason, context_summary, requested_by_user_id,
  decided_by_user_id, accepted_assignment_id, requested_at, decided_at,
  created_at, updated_at
from app_private.handoffs;

create view api.orders
with (security_invoker = true, security_barrier = true)
as select id, organization_id, contact_id, preferred_contact_method_id,
  opportunity_id, channel_connection_id, conversation_id, origin, status,
  handling_mode, currency_code, subtotal_amount, total_amount,
  contact_snapshot, customer_note, notification_status,
  notification_channel_connection_id, notification_outbox_event_id,
  notified_at, submitted_at, closed_at,
  created_by_user_id, created_at, updated_at
from app_private.orders;

create view api.order_lines
with (security_invoker = true, security_barrier = true)
as select id, organization_id, order_id, line_number, variant_id, unit_id,
  price_tier_id, quantity, pricing_status, calculation_method, price_amount,
  line_total_amount, currency_code, product_name_snapshot,
  variant_name_snapshot, sku_snapshot, unit_code_snapshot, offer_snapshot,
  quoted_at, created_at
from app_private.order_lines;

create view api.order_reservation_links
with (security_invoker = true, security_barrier = true)
as select id, organization_id, order_id, reservation_id, purpose,
  linked_by_user_id, linked_at, created_at
from app_private.order_reservation_links;

create view api.sales
with (security_invoker = true, security_barrier = true)
as select id, organization_id, order_id, contact_id, opportunity_id,
  sale_kind, reverses_sale_id, source, currency_code, subtotal_amount,
  total_amount, note, occurred_at, created_by_user_id, created_at
from app_private.sales;

create view api.sale_lines
with (security_invoker = true, security_barrier = true)
as select id, organization_id, sale_id, line_number, order_line_id,
  reverses_sale_line_id, variant_id, unit_id, quantity, unit_amount, line_total_amount,
  product_name_snapshot, variant_name_snapshot, sku_snapshot,
  unit_code_snapshot, inventory_effect_status, inventory_operation_id, created_at
from app_private.sale_lines;

create view api.commercial_events
with (security_invoker = true, security_barrier = true)
as select id, organization_id, pending_request_id, lead_id, opportunity_id,
  handoff_id, order_id, sale_id, event_type, previous_status, new_status,
  reason, event_payload, created_by_user_id, occurred_at, created_at
from app_private.commercial_events;

revoke all on
  app_private.commercial_commands,
  app_private.contact_methods,
  app_private.pending_requests,
  app_private.leads,
  app_private.lead_interests,
  app_private.opportunities,
  app_private.conversation_assignments,
  app_private.handoffs,
  app_private.orders,
  app_private.order_lines,
  app_private.order_reservation_links,
  app_private.sales,
  app_private.sale_lines,
  app_private.commercial_events
from public, anon, authenticated, service_role;

revoke all on
  api.commercial_commands,
  api.contact_methods,
  api.pending_requests,
  api.leads,
  api.lead_interests,
  api.opportunities,
  api.conversation_assignments,
  api.handoffs,
  api.orders,
  api.order_lines,
  api.order_reservation_links,
  api.sales,
  api.sale_lines,
  api.commercial_events
from public, anon, authenticated, service_role;

grant select (
  id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
) on app_private.commercial_commands to authenticated;

grant select (
  id, organization_id, contact_id, method_kind, display_hint,
  consent_purpose, consent_source, status, consented_at, revoked_at,
  created_by_user_id, created_at, updated_at
) on app_private.contact_methods to authenticated;

grant select on
  app_private.pending_requests,
  app_private.leads,
  app_private.lead_interests,
  app_private.opportunities,
  app_private.conversation_assignments,
  app_private.handoffs,
  app_private.orders,
  app_private.order_lines,
  app_private.order_reservation_links,
  app_private.sales,
  app_private.sale_lines,
  app_private.commercial_events
to authenticated;

grant select on
  app_private.commercial_commands,
  app_private.contact_methods,
  app_private.pending_requests,
  app_private.leads,
  app_private.lead_interests,
  app_private.opportunities,
  app_private.conversation_assignments,
  app_private.handoffs,
  app_private.orders,
  app_private.order_lines,
  app_private.order_reservation_links,
  app_private.sales,
  app_private.sale_lines,
  app_private.commercial_events
to service_role;

grant select on
  api.commercial_commands,
  api.contact_methods,
  api.pending_requests,
  api.leads,
  api.lead_interests,
  api.opportunities,
  api.conversation_assignments,
  api.handoffs,
  api.orders,
  api.order_lines,
  api.order_reservation_links,
  api.sales,
  api.sale_lines,
  api.commercial_events
to authenticated, service_role;

revoke all on function app_private.assert_commercial_actor(uuid, uuid, text[])
  from public, anon, authenticated, service_role;
revoke all on function app_private.claim_commercial_command(uuid, text, text, jsonb, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.assert_sale_inventory_operation(
  uuid, uuid, uuid, uuid, numeric, text
) from public, anon, authenticated, service_role;
revoke all on function app_private.complete_commercial_command(uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.insert_commercial_event(
  uuid, uuid, text, uuid, text, text, text, text, jsonb, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function app_private.reject_commercial_history_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_pending_request()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_contact_method_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_assignment_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_handoff_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_order_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_commercial_command_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_sale_line_reference()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_sale_line_rewrite()
  from public, anon, authenticated, service_role;

revoke all on function api.register_contact_method(
  uuid, text, uuid, text, bytea, bytea, text, text, text, text, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_pending_request(
  uuid, text, uuid, uuid, uuid, text, jsonb, jsonb, uuid, uuid, uuid, numeric, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.resolve_pending_request(
  uuid, uuid, text, text, text, text, numeric, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.record_commercial_notification(
  uuid, text, uuid, text, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_lead(
  uuid, text, uuid, text, text, jsonb, uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_opportunity(
  uuid, text, uuid, text, text, text, text, uuid, text, numeric, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_handoff(
  uuid, text, uuid, text, text, jsonb, uuid, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.transition_handoff(
  uuid, uuid, text, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.create_order(
  uuid, text, uuid, text, text, jsonb, timestamptz, uuid, uuid, uuid, uuid, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.link_order_reservation(
  uuid, uuid, uuid, text, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.transition_order(
  uuid, uuid, text, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.record_sale(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, uuid, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.reconcile_sale_inventory(
  uuid, uuid, text, uuid, text, uuid, timestamptz
) from public, anon, authenticated, service_role;

grant execute on function api.register_contact_method(
  uuid, text, uuid, text, bytea, bytea, text, text, text, text, timestamptz, uuid
) to service_role;
grant execute on function api.create_pending_request(
  uuid, text, uuid, uuid, uuid, text, jsonb, jsonb, uuid, uuid, uuid, numeric, timestamptz, uuid
) to service_role;
grant execute on function api.resolve_pending_request(
  uuid, uuid, text, text, text, text, numeric, text, uuid, timestamptz
) to service_role;
grant execute on function api.record_commercial_notification(
  uuid, text, uuid, text, uuid, uuid
) to service_role;
grant execute on function api.create_lead(
  uuid, text, uuid, text, text, jsonb, uuid, uuid, uuid
) to service_role;
grant execute on function api.create_opportunity(
  uuid, text, uuid, text, text, text, text, uuid, text, numeric, text, uuid
) to service_role;
grant execute on function api.create_handoff(
  uuid, text, uuid, text, text, jsonb, uuid, text, uuid
) to service_role;
grant execute on function api.transition_handoff(
  uuid, uuid, text, text, text, uuid, timestamptz
) to service_role;
grant execute on function api.create_order(
  uuid, text, uuid, text, text, jsonb, timestamptz, uuid, uuid, uuid, uuid, text, uuid
) to service_role;
grant execute on function api.link_order_reservation(
  uuid, uuid, uuid, text, text, uuid
) to service_role;
grant execute on function api.transition_order(
  uuid, uuid, text, text, text, uuid, timestamptz
) to service_role;
grant execute on function api.record_sale(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, uuid, text, uuid, timestamptz
) to service_role;
grant execute on function api.reconcile_sale_inventory(
  uuid, uuid, text, uuid, text, uuid, timestamptz
) to service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;

comment on table app_private.commercial_commands is
  'Global idempotency ledger for explicit commercial tool contracts';
comment on table app_private.contact_methods is
  'Envelope-encrypted consented contact methods; plaintext is never stored';
comment on table app_private.pending_requests is
  'Deferred customer information requests whose resolution is separate from delivery';
comment on table app_private.leads is
  'Durable customer interest captured without equating interest to an order';
comment on table app_private.lead_interests is
  'One or more identified or explicitly unresolved interests attached to a lead';
comment on table app_private.opportunities is
  'Commercial closing process with explicit agent or human handling mode';
comment on table app_private.conversation_assignments is
  'Temporal single-owner responsibility windows for a conversation opportunity';
comment on table app_private.handoffs is
  'Reversible transfer request that changes assignment only when accepted';
comment on table app_private.orders is
  'Customer order request projection; never evidence of sale or payment';
comment on table app_private.order_lines is
  'Immutable catalog and exact price snapshots for an order request';
comment on table app_private.order_reservation_links is
  'Append-only links to inventory reservations owned by B2-005';
comment on table app_private.sales is
  'Append-only commercial sale or reversal record with no payment semantics';
comment on table app_private.sale_lines is
  'Immutable sale snapshots with explicit inventory reconciliation status';
comment on table app_private.commercial_events is
  'Append-only state and provenance ledger for commercial entities';
comment on function api.create_order(
  uuid, text, uuid, text, text, jsonb, timestamptz, uuid, uuid, uuid, uuid, text, uuid
) is 'Server-side exact quote snapshot; interpretation belongs to LLM tool calling';
comment on function api.record_sale(
  uuid, text, text, text, text, jsonb, uuid, uuid, uuid, uuid, text, uuid, timestamptz
) is 'Records sale or reversal without inferring payment and without hiding pending inventory effects';
comment on function api.reconcile_sale_inventory(
  uuid, uuid, text, uuid, text, uuid, timestamptz
) is 'Idempotently reconciles one pending sale line against one exact B2-005 inventory operation';

commit;
