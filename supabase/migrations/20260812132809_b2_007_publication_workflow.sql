begin;

create extension if not exists pgcrypto with schema extensions;

create table app_private.publication_commands (
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
  constraint publication_commands_organization_id_id_unique unique (organization_id, id),
  constraint publication_commands_idempotency_unique unique (organization_id, idempotency_key),
  constraint publication_commands_organization_fk foreign key (organization_id)
    references app_private.organizations (id) on delete restrict,
  constraint publication_commands_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_commands_idempotency_key_valid check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 8 and 240
  ),
  constraint publication_commands_operation_valid check (
    operation = lower(btrim(operation))
    and operation ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint publication_commands_fingerprint_valid check (octet_length(request_fingerprint) = 32),
  constraint publication_commands_payload_valid check (
    jsonb_typeof(request_payload) = 'object'
    and octet_length(request_payload::text) <= 262144
  ),
  constraint publication_commands_result_valid check (
    (result_type is null and result_id is null and completed_at is null)
    or (
      result_type in (
        'social_connection', 'social_capability', 'publication', 'publication_version',
        'publication_schedule', 'publication_batch', 'publication_job',
        'publication_instance'
      )
      and result_id is not null
      and completed_at is not null
      and completed_at >= created_at
    )
  )
);

create index publication_commands_created_by_user_idx
  on app_private.publication_commands (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.social_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  provider text not null default 'meta',
  surface text not null default 'facebook_page',
  external_app_id text,
  external_account_id text,
  display_name text,
  api_version text,
  credential_reference text,
  messenger_channel_connection_id uuid,
  status text not null default 'draft',
  connected_at timestamptz,
  last_verified_at timestamptz,
  disabled_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_connections_organization_id_id_unique unique (organization_id, id),
  constraint social_connections_creation_command_unique unique (organization_id, creation_command_id),
  constraint social_connections_organization_fk foreign key (organization_id)
    references app_private.organizations (id) on delete restrict,
  constraint social_connections_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint social_connections_messenger_connection_fk foreign key (
    organization_id, messenger_channel_connection_id
  ) references app_private.channel_connections (organization_id, id) on delete restrict,
  constraint social_connections_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint social_connections_provider_valid check (provider = 'meta'),
  constraint social_connections_surface_valid check (surface = 'facebook_page'),
  constraint social_connections_external_app_id_valid check (
    external_app_id is null
    or (external_app_id = btrim(external_app_id) and char_length(external_app_id) between 1 and 255)
  ),
  constraint social_connections_external_account_id_valid check (
    external_account_id is null
    or (
      external_account_id = btrim(external_account_id)
      and char_length(external_account_id) between 1 and 255
    )
  ),
  constraint social_connections_display_name_valid check (
    display_name is null
    or (display_name = btrim(display_name) and char_length(display_name) between 1 and 160)
  ),
  constraint social_connections_api_version_valid check (
    api_version is null
    or (api_version = btrim(api_version) and char_length(api_version) between 1 and 32)
  ),
  constraint social_connections_credential_reference_valid check (
    credential_reference is null
    or (
      credential_reference = btrim(credential_reference)
      and char_length(credential_reference) between 3 and 255
    )
  ),
  constraint social_connections_status_valid check (
    status in (
      'draft', 'pending_verification', 'active', 'suspended', 'revoked', 'error', 'archived'
    )
  ),
  constraint social_connections_active_ready check (
    status <> 'active'
    or (
      external_app_id is not null
      and external_account_id is not null
      and api_version is not null
      and credential_reference is not null
      and connected_at is not null
      and last_verified_at is not null
      and disabled_at is null
    )
  ),
  constraint social_connections_disabled_valid check (
    status not in ('suspended', 'revoked', 'archived') or disabled_at is not null
  ),
  constraint social_connections_timestamps_valid check (
    (connected_at is null or connected_at >= created_at)
    and (last_verified_at is null or last_verified_at >= created_at)
    and (disabled_at is null or disabled_at >= created_at)
  )
);

create unique index social_connections_operational_account_unique
  on app_private.social_connections (provider, surface, external_account_id)
  where external_account_id is not null and status not in ('revoked', 'archived');
create index social_connections_organization_status_idx
  on app_private.social_connections (organization_id, status, id);
create index social_connections_messenger_connection_idx
  on app_private.social_connections (organization_id, messenger_channel_connection_id)
  where messenger_channel_connection_id is not null;
create index social_connections_created_by_user_idx
  on app_private.social_connections (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.social_capabilities (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  social_connection_id uuid not null,
  creation_command_id uuid not null,
  capability_code text not null,
  status text not null,
  observation_source text not null,
  capability_constraints jsonb not null default '{}'::jsonb,
  evidence_summary jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  valid_until timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint social_capabilities_organization_id_id_unique unique (organization_id, id),
  constraint social_capabilities_creation_command_unique unique (organization_id, creation_command_id),
  constraint social_capabilities_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint social_capabilities_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint social_capabilities_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint social_capabilities_code_valid check (
    capability_code = lower(btrim(capability_code))
    and capability_code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint social_capabilities_status_valid check (
    status in ('unknown', 'granted', 'denied', 'revoked', 'expired')
  ),
  constraint social_capabilities_source_valid check (
    observation_source in ('provider_probe', 'manual_verification', 'provider_webhook', 'system')
  ),
  constraint social_capabilities_constraints_valid check (
    jsonb_typeof(capability_constraints) = 'object'
    and octet_length(capability_constraints::text) <= 65536
  ),
  constraint social_capabilities_evidence_valid check (
    jsonb_typeof(evidence_summary) = 'object'
    and octet_length(evidence_summary::text) <= 65536
  ),
  constraint social_capabilities_validity_valid check (
    valid_until is null or valid_until > observed_at
  ),
  constraint social_capabilities_observed_at_valid check (
    observed_at <= created_at + interval '5 minutes'
  )
);

create index social_capabilities_current_lookup_idx
  on app_private.social_capabilities (
    organization_id, social_connection_id, capability_code, observed_at desc, created_at desc, id desc
  );
create index social_capabilities_created_by_user_idx
  on app_private.social_capabilities (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publications (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  social_connection_id uuid not null,
  variant_id uuid not null,
  status text not null default 'draft',
  current_version_id uuid,
  retired_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publications_organization_id_id_unique unique (organization_id, id),
  constraint publications_creation_command_unique unique (organization_id, creation_command_id),
  constraint publications_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint publications_variant_fk foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id) on delete restrict,
  constraint publications_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publications_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publications_status_valid check (status in ('draft', 'active', 'paused', 'retired')),
  constraint publications_version_state_valid check (
    status = 'draft' or current_version_id is not null
  ),
  constraint publications_retirement_valid check (
    (status = 'retired' and retired_at is not null)
    or (status <> 'retired' and retired_at is null)
  )
);

create unique index publications_one_operational_offer
  on app_private.publications (organization_id, social_connection_id, variant_id)
  where status <> 'retired';
create index publications_variant_idx
  on app_private.publications (organization_id, variant_id, status, id);
create index publications_created_by_user_idx
  on app_private.publications (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publication_versions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  publication_id uuid not null,
  creation_command_id uuid not null,
  version_number integer not null,
  status text not null default 'draft',
  headline text,
  body text not null,
  call_to_action text,
  content_payload jsonb not null default '{}'::jsonb,
  content_sha256 bytea not null,
  source_price_tier_id uuid,
  pricing_status text not null,
  calculation_method text,
  price_amount numeric,
  currency_code text,
  source_variant_updated_at timestamptz not null,
  source_price_valid_from timestamptz,
  availability_snapshot jsonb not null default '{}'::jsonb,
  approved_by_user_id uuid,
  approved_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint publication_versions_organization_id_id_unique unique (organization_id, id),
  constraint publication_versions_publication_scope_id_unique
    unique (organization_id, publication_id, id),
  constraint publication_versions_number_unique
    unique (organization_id, publication_id, version_number),
  constraint publication_versions_creation_command_unique unique (organization_id, creation_command_id),
  constraint publication_versions_publication_fk foreign key (organization_id, publication_id)
    references app_private.publications (organization_id, id) on delete restrict,
  constraint publication_versions_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publication_versions_price_tier_fk foreign key (organization_id, source_price_tier_id)
    references app_private.price_tiers (organization_id, id) on delete restrict,
  constraint publication_versions_approved_by_fk foreign key (organization_id, approved_by_user_id)
    references app_private.organization_memberships (organization_id, user_id) on delete restrict,
  constraint publication_versions_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_versions_number_valid check (version_number > 0),
  constraint publication_versions_status_valid check (
    status in ('draft', 'approved', 'superseded', 'withdrawn')
  ),
  constraint publication_versions_headline_valid check (
    headline is null or (headline = btrim(headline) and char_length(headline) between 1 and 500)
  ),
  constraint publication_versions_body_valid check (
    body = btrim(body) and char_length(body) between 1 and 20000
  ),
  constraint publication_versions_cta_valid check (
    call_to_action is null
    or (call_to_action = btrim(call_to_action) and char_length(call_to_action) between 1 and 1000)
  ),
  constraint publication_versions_payload_valid check (
    jsonb_typeof(content_payload) = 'object'
    and octet_length(content_payload::text) <= 262144
  ),
  constraint publication_versions_content_hash_valid check (octet_length(content_sha256) = 32),
  constraint publication_versions_pricing_status_valid check (
    pricing_status in ('priced', 'on_request')
  ),
  constraint publication_versions_price_contract_valid check (
    (
      pricing_status = 'priced'
      and source_price_tier_id is not null
      and calculation_method in ('fixed_total', 'per_unit')
      and price_amount is not null
      and currency_code is not null
      and source_price_valid_from is not null
    )
    or (
      pricing_status = 'on_request'
      and calculation_method is null
      and price_amount is null
      and currency_code is null
    )
  ),
  constraint publication_versions_amount_valid check (
    price_amount is null
    or (price_amount >= 0 and price_amount <= 999999999999.999999 and scale(price_amount) <= 6)
  ),
  constraint publication_versions_currency_valid check (
    currency_code is null or currency_code ~ '^[A-Z]{3}$'
  ),
  constraint publication_versions_availability_valid check (
    jsonb_typeof(availability_snapshot) = 'object'
    and octet_length(availability_snapshot::text) <= 131072
  ),
  constraint publication_versions_approval_valid check (
    (
      status in ('approved', 'superseded')
      and approved_by_user_id is not null
      and approved_at is not null
      and approved_at >= created_at
    )
    or (
      status = 'draft'
      and approved_by_user_id is null
      and approved_at is null
    )
    or (
      status = 'withdrawn'
      and (
        (approved_by_user_id is null and approved_at is null)
        or (
          approved_by_user_id is not null
          and approved_at is not null
          and approved_at >= created_at
        )
      )
    )
  )
);

alter table app_private.publications
  add constraint publications_current_version_fk foreign key (
    organization_id, id, current_version_id
  ) references app_private.publication_versions (
    organization_id, publication_id, id
  ) on delete restrict deferrable initially deferred;

create index publication_versions_price_tier_idx
  on app_private.publication_versions (organization_id, source_price_tier_id)
  where source_price_tier_id is not null;
create index publication_versions_created_by_user_idx
  on app_private.publication_versions (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publication_media (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  publication_version_id uuid not null,
  media_asset_id uuid not null,
  ordinal integer not null,
  media_role text not null default 'gallery',
  alt_text text,
  created_at timestamptz not null default now(),
  constraint publication_media_organization_id_id_unique unique (organization_id, id),
  constraint publication_media_version_ordinal_unique
    unique (organization_id, publication_version_id, ordinal),
  constraint publication_media_version_asset_unique
    unique (organization_id, publication_version_id, media_asset_id),
  constraint publication_media_version_fk foreign key (organization_id, publication_version_id)
    references app_private.publication_versions (organization_id, id) on delete restrict,
  constraint publication_media_asset_fk foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id) on delete restrict,
  constraint publication_media_ordinal_valid check (ordinal between 0 and 99),
  constraint publication_media_role_valid check (
    media_role in ('primary', 'gallery', 'derived')
  ),
  constraint publication_media_alt_text_valid check (
    alt_text is null
    or (alt_text = btrim(alt_text) and char_length(alt_text) between 1 and 2000)
  )
);

create index publication_media_asset_idx
  on app_private.publication_media (organization_id, media_asset_id);

create table app_private.publication_schedules (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  social_connection_id uuid not null,
  code text not null,
  name text not null,
  timezone_name text not null,
  schedule_expression text not null,
  expression_kind text not null default 'cron',
  validation_status text not null default 'unvalidated',
  requested_operation text not null,
  selection_criteria jsonb not null default '{}'::jsonb,
  schedule_policy jsonb not null default '{}'::jsonb,
  status text not null default 'paused',
  generation integer not null default 1,
  next_run_at timestamptz,
  last_enqueued_at timestamptz,
  retired_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_schedules_organization_id_id_unique unique (organization_id, id),
  constraint publication_schedules_code_unique unique (organization_id, code),
  constraint publication_schedules_creation_command_unique unique (organization_id, creation_command_id),
  constraint publication_schedules_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint publication_schedules_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publication_schedules_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_schedules_code_valid check (
    code = lower(btrim(code)) and code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint publication_schedules_name_valid check (
    name = btrim(name) and char_length(name) between 1 and 160
  ),
  constraint publication_schedules_timezone_valid check (
    timezone_name = btrim(timezone_name) and char_length(timezone_name) between 1 and 120
  ),
  constraint publication_schedules_expression_valid check (
    schedule_expression = btrim(schedule_expression)
    and char_length(schedule_expression) between 1 and 240
  ),
  constraint publication_schedules_expression_kind_valid check (expression_kind = 'cron'),
  constraint publication_schedules_validation_status_valid check (
    validation_status in ('unvalidated', 'valid', 'invalid')
  ),
  constraint publication_schedules_operation_valid check (
    requested_operation in ('publish', 'refresh', 'sync')
  ),
  constraint publication_schedules_selection_valid check (
    jsonb_typeof(selection_criteria) = 'object'
    and octet_length(selection_criteria::text) <= 131072
  ),
  constraint publication_schedules_policy_valid check (
    jsonb_typeof(schedule_policy) = 'object'
    and octet_length(schedule_policy::text) <= 131072
  ),
  constraint publication_schedules_status_valid check (status in ('active', 'paused', 'retired')),
  constraint publication_schedules_generation_valid check (generation > 0),
  constraint publication_schedules_active_valid check (
    status <> 'active' or (validation_status = 'valid' and next_run_at is not null)
  ),
  constraint publication_schedules_retirement_valid check (
    (status = 'retired' and retired_at is not null)
    or (status <> 'retired' and retired_at is null)
  ),
  constraint publication_schedules_enqueue_time_valid check (
    last_enqueued_at is null or last_enqueued_at >= created_at
  )
);

create index publication_schedules_due_idx
  on app_private.publication_schedules (next_run_at, organization_id, id)
  where status = 'active';
create index publication_schedules_connection_idx
  on app_private.publication_schedules (organization_id, social_connection_id, status, id);
create index publication_schedules_created_by_user_idx
  on app_private.publication_schedules (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publication_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  social_connection_id uuid not null,
  schedule_id uuid,
  schedule_generation integer,
  trigger_kind text not null,
  requested_operation text not null,
  status text not null default 'pending',
  selection_criteria_snapshot jsonb not null,
  policy_snapshot jsonb not null default '{}'::jsonb,
  schedule_occurrence_at timestamptz,
  cancel_requested_at timestamptz,
  completed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_batches_organization_id_id_unique unique (organization_id, id),
  constraint publication_batches_creation_command_unique unique (organization_id, creation_command_id),
  constraint publication_batches_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint publication_batches_schedule_fk foreign key (organization_id, schedule_id)
    references app_private.publication_schedules (organization_id, id) on delete restrict,
  constraint publication_batches_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publication_batches_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_batches_trigger_valid check (
    trigger_kind in ('manual', 'schedule', 'catalog_sync')
  ),
  constraint publication_batches_operation_valid check (
    requested_operation in ('publish', 'refresh', 'sync', 'archive', 'reconcile')
  ),
  constraint publication_batches_status_valid check (
    status in (
      'pending', 'expanding', 'queued', 'running', 'paused', 'cancelling',
      'completed', 'partially_failed', 'cancelled'
    )
  ),
  constraint publication_batches_selection_valid check (
    jsonb_typeof(selection_criteria_snapshot) = 'object'
    and octet_length(selection_criteria_snapshot::text) <= 131072
  ),
  constraint publication_batches_policy_valid check (
    jsonb_typeof(policy_snapshot) = 'object'
    and octet_length(policy_snapshot::text) <= 131072
  ),
  constraint publication_batches_schedule_contract_valid check (
    (
      trigger_kind = 'schedule'
      and schedule_id is not null
      and schedule_generation is not null
      and schedule_occurrence_at is not null
    )
    or (
      trigger_kind <> 'schedule'
      and schedule_id is null
      and schedule_generation is null
      and schedule_occurrence_at is null
    )
  ),
  constraint publication_batches_generation_valid check (
    schedule_generation is null or schedule_generation > 0
  ),
  constraint publication_batches_terminal_valid check (
    (
      status in ('completed', 'partially_failed', 'cancelled')
      and completed_at is not null
    )
    or (
      status not in ('completed', 'partially_failed', 'cancelled')
      and completed_at is null
    )
  ),
  constraint publication_batches_cancel_valid check (
    status not in ('cancelling', 'cancelled') or cancel_requested_at is not null
  )
);

create unique index publication_batches_schedule_occurrence_unique
  on app_private.publication_batches (organization_id, schedule_id, schedule_generation, schedule_occurrence_at)
  where schedule_id is not null;
create index publication_batches_status_idx
  on app_private.publication_batches (organization_id, status, created_at, id);
create index publication_batches_created_by_user_idx
  on app_private.publication_batches (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publication_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  idempotency_key text not null,
  request_fingerprint bytea not null,
  batch_id uuid,
  schedule_id uuid,
  publication_id uuid not null,
  target_version_id uuid,
  target_instance_id uuid,
  operation text not null,
  capability_code text not null,
  external_effect_key text not null,
  status text not null default 'pending',
  priority integer not null default 100,
  attempt_count integer not null default 0,
  max_attempts integer not null default 8,
  available_at timestamptz not null default now(),
  lease_token uuid,
  processing_started_at timestamptz,
  lease_expires_at timestamptz,
  authorized_at timestamptz,
  authorization_snapshot jsonb,
  effect_started_at timestamptz,
  provider_request_id text,
  last_error_class text,
  last_error_code text,
  last_error_summary jsonb,
  completed_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_jobs_organization_id_id_unique unique (organization_id, id),
  constraint publication_jobs_creation_command_unique unique (organization_id, creation_command_id),
  constraint publication_jobs_idempotency_unique unique (organization_id, idempotency_key),
  constraint publication_jobs_external_effect_unique unique (organization_id, external_effect_key),
  constraint publication_jobs_creation_command_fk foreign key (organization_id, creation_command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publication_jobs_batch_fk foreign key (organization_id, batch_id)
    references app_private.publication_batches (organization_id, id) on delete restrict,
  constraint publication_jobs_schedule_fk foreign key (organization_id, schedule_id)
    references app_private.publication_schedules (organization_id, id) on delete restrict,
  constraint publication_jobs_publication_fk foreign key (organization_id, publication_id)
    references app_private.publications (organization_id, id) on delete restrict,
  constraint publication_jobs_target_version_fk foreign key (
    organization_id, publication_id, target_version_id
  ) references app_private.publication_versions (
    organization_id, publication_id, id
  ) on delete restrict,
  constraint publication_jobs_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_jobs_idempotency_key_valid check (
    idempotency_key = btrim(idempotency_key)
    and char_length(idempotency_key) between 8 and 240
  ),
  constraint publication_jobs_fingerprint_valid check (octet_length(request_fingerprint) = 32),
  constraint publication_jobs_operation_valid check (
    operation in ('publish', 'refresh', 'sync', 'archive', 'reconcile')
  ),
  constraint publication_jobs_version_contract_valid check (
    operation not in ('publish', 'refresh', 'sync') or target_version_id is not null
  ),
  constraint publication_jobs_instance_contract_valid check (
    (operation in ('publish', 'refresh') and target_instance_id is null)
    or (operation in ('sync', 'archive') and target_instance_id is not null)
    or operation = 'reconcile'
  ),
  constraint publication_jobs_capability_valid check (
    capability_code = lower(btrim(capability_code))
    and capability_code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint publication_jobs_external_effect_key_valid check (
    external_effect_key = btrim(external_effect_key)
    and char_length(external_effect_key) between 8 and 240
  ),
  constraint publication_jobs_status_valid check (
    status in (
      'pending', 'processing', 'retryable', 'succeeded', 'blocked', 'failed',
      'cancelled', 'uncertain'
    )
  ),
  constraint publication_jobs_priority_valid check (priority between -1000000 and 1000000),
  constraint publication_jobs_attempt_valid check (
    max_attempts between 1 and 100 and attempt_count between 0 and max_attempts
  ),
  constraint publication_jobs_processing_valid check (
    (
      status = 'processing'
      and lease_token is not null
      and processing_started_at is not null
      and lease_expires_at is not null
      and lease_expires_at > processing_started_at
      and completed_at is null
    )
    or (
      status <> 'processing'
      and lease_token is null
      and processing_started_at is null
      and lease_expires_at is null
    )
  ),
  constraint publication_jobs_terminal_valid check (
    (
      status in ('succeeded', 'blocked', 'failed', 'cancelled', 'uncertain')
      and completed_at is not null
    )
    or (
      status in ('pending', 'processing', 'retryable')
      and completed_at is null
    )
  ),
  constraint publication_jobs_authorization_valid check (
    (authorized_at is null and authorization_snapshot is null)
    or (
      authorized_at is not null
      and authorization_snapshot is not null
      and jsonb_typeof(authorization_snapshot) = 'object'
      and octet_length(authorization_snapshot::text) <= 131072
    )
  ),
  constraint publication_jobs_success_authorized check (
    status <> 'succeeded' or authorized_at is not null
  ),
  constraint publication_jobs_effect_valid check (
    effect_started_at is null
    or (authorized_at is not null and status in ('processing', 'succeeded', 'uncertain'))
  ),
  constraint publication_jobs_provider_request_valid check (
    provider_request_id is null
    or (
      provider_request_id = btrim(provider_request_id)
      and char_length(provider_request_id) between 1 and 512
    )
  ),
  constraint publication_jobs_error_class_valid check (
    last_error_class is null
    or last_error_class in ('transient', 'terminal', 'policy', 'permission', 'rate_limit', 'unknown')
  ),
  constraint publication_jobs_error_code_valid check (
    last_error_code is null
    or (last_error_code = btrim(last_error_code) and char_length(last_error_code) between 1 and 160)
  ),
  constraint publication_jobs_error_summary_valid check (
    last_error_summary is null
    or (
      jsonb_typeof(last_error_summary) = 'object'
      and octet_length(last_error_summary::text) <= 65536
    )
  ),
  constraint publication_jobs_times_valid check (
    available_at >= created_at
    and (authorized_at is null or authorized_at >= created_at)
    and (effect_started_at is null or effect_started_at >= authorized_at)
    and (completed_at is null or completed_at >= created_at)
  )
);

create index publication_jobs_claim_idx
  on app_private.publication_jobs (priority, available_at, created_at, id)
  where status in ('pending', 'retryable');
create index publication_jobs_batch_idx
  on app_private.publication_jobs (organization_id, batch_id, status, id)
  where batch_id is not null;
create index publication_jobs_schedule_idx
  on app_private.publication_jobs (organization_id, schedule_id, status, id)
  where schedule_id is not null;
create index publication_jobs_publication_idx
  on app_private.publication_jobs (organization_id, publication_id, status, id);
create index publication_jobs_target_version_idx
  on app_private.publication_jobs (organization_id, target_version_id)
  where target_version_id is not null;
create index publication_jobs_created_by_user_idx
  on app_private.publication_jobs (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.publication_instances (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  social_connection_id uuid not null,
  publication_id uuid not null,
  publication_version_id uuid not null,
  creation_job_id uuid not null,
  external_publication_id text not null,
  external_url text,
  status text not null default 'published',
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  last_reconciled_at timestamptz,
  response_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint publication_instances_organization_id_id_unique unique (organization_id, id),
  constraint publication_instances_creation_job_unique unique (organization_id, creation_job_id),
  constraint publication_instances_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint publication_instances_publication_fk foreign key (organization_id, publication_id)
    references app_private.publications (organization_id, id) on delete restrict,
  constraint publication_instances_version_fk foreign key (
    organization_id, publication_id, publication_version_id
  ) references app_private.publication_versions (
    organization_id, publication_id, id
  ) on delete restrict,
  constraint publication_instances_creation_job_fk foreign key (organization_id, creation_job_id)
    references app_private.publication_jobs (organization_id, id) on delete restrict,
  constraint publication_instances_external_id_valid check (
    external_publication_id = btrim(external_publication_id)
    and char_length(external_publication_id) between 1 and 512
  ),
  constraint publication_instances_external_url_valid check (
    external_url is null
    or (external_url = btrim(external_url) and char_length(external_url) between 1 and 4096)
  ),
  constraint publication_instances_status_valid check (
    status in ('published', 'hidden', 'sold', 'deleted', 'unknown')
  ),
  constraint publication_instances_summary_valid check (
    jsonb_typeof(response_summary) = 'object'
    and octet_length(response_summary::text) <= 131072
  ),
  constraint publication_instances_provider_times_valid check (
    (provider_updated_at is null or provider_created_at is not null)
    and (provider_updated_at is null or provider_updated_at >= provider_created_at)
    and (last_reconciled_at is null or last_reconciled_at >= created_at)
  )
);

create unique index publication_instances_external_unique
  on app_private.publication_instances (
    social_connection_id, external_publication_id
  );
create index publication_instances_publication_idx
  on app_private.publication_instances (organization_id, publication_id, status, created_at desc, id);

alter table app_private.publication_jobs
  add constraint publication_jobs_target_instance_fk foreign key (
    organization_id, target_instance_id
  ) references app_private.publication_instances (organization_id, id) on delete restrict;

create table app_private.publication_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  command_id uuid,
  social_connection_id uuid,
  publication_id uuid,
  publication_version_id uuid,
  schedule_id uuid,
  batch_id uuid,
  job_id uuid,
  instance_id uuid,
  event_type text not null,
  previous_status text,
  new_status text,
  reason text,
  event_payload jsonb not null default '{}'::jsonb,
  created_by_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint publication_events_organization_id_id_unique unique (organization_id, id),
  constraint publication_events_organization_fk foreign key (organization_id)
    references app_private.organizations (id) on delete restrict,
  constraint publication_events_command_fk foreign key (organization_id, command_id)
    references app_private.publication_commands (organization_id, id) on delete restrict,
  constraint publication_events_connection_fk foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id) on delete restrict,
  constraint publication_events_publication_fk foreign key (organization_id, publication_id)
    references app_private.publications (organization_id, id) on delete restrict,
  constraint publication_events_version_fk foreign key (organization_id, publication_version_id)
    references app_private.publication_versions (organization_id, id) on delete restrict,
  constraint publication_events_schedule_fk foreign key (organization_id, schedule_id)
    references app_private.publication_schedules (organization_id, id) on delete restrict,
  constraint publication_events_batch_fk foreign key (organization_id, batch_id)
    references app_private.publication_batches (organization_id, id) on delete restrict,
  constraint publication_events_job_fk foreign key (organization_id, job_id)
    references app_private.publication_jobs (organization_id, id) on delete restrict,
  constraint publication_events_instance_fk foreign key (organization_id, instance_id)
    references app_private.publication_instances (organization_id, id) on delete restrict,
  constraint publication_events_created_by_user_fk foreign key (created_by_user_id)
    references auth.users (id) on delete set null,
  constraint publication_events_subject_valid check (
    num_nonnulls(
      social_connection_id, publication_id, publication_version_id, schedule_id,
      batch_id, job_id, instance_id
    ) >= 1
  ),
  constraint publication_events_type_valid check (
    event_type = lower(btrim(event_type))
    and event_type ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
  ),
  constraint publication_events_status_valid check (
    (previous_status is null or char_length(previous_status) between 1 and 80)
    and (new_status is null or char_length(new_status) between 1 and 80)
  ),
  constraint publication_events_reason_valid check (
    reason is null or (reason = btrim(reason) and char_length(reason) between 1 and 2000)
  ),
  constraint publication_events_payload_valid check (
    jsonb_typeof(event_payload) = 'object'
    and octet_length(event_payload::text) <= 131072
  ),
  constraint publication_events_occurred_at_valid check (
    occurred_at <= created_at + interval '5 minutes'
  )
);

create index publication_events_connection_idx
  on app_private.publication_events (organization_id, social_connection_id, occurred_at, id)
  where social_connection_id is not null;
create index publication_events_publication_idx
  on app_private.publication_events (organization_id, publication_id, occurred_at, id)
  where publication_id is not null;
create index publication_events_schedule_idx
  on app_private.publication_events (organization_id, schedule_id, occurred_at, id)
  where schedule_id is not null;
create index publication_events_batch_idx
  on app_private.publication_events (organization_id, batch_id, occurred_at, id)
  where batch_id is not null;
create index publication_events_job_idx
  on app_private.publication_events (organization_id, job_id, occurred_at, id)
  where job_id is not null;
create index publication_events_instance_idx
  on app_private.publication_events (organization_id, instance_id, occurred_at, id)
  where instance_id is not null;
create index publication_events_created_by_user_idx
  on app_private.publication_events (created_by_user_id)
  where created_by_user_id is not null;

-- Foreign-key maintenance indexes keep parent updates/deletes bounded under production volume.
create index publication_batches_connection_fk_idx
  on app_private.publication_batches (organization_id, social_connection_id);
create index publication_events_command_fk_idx
  on app_private.publication_events (organization_id, command_id);
create index publication_events_version_fk_idx
  on app_private.publication_events (organization_id, publication_version_id);
create index publication_instances_connection_fk_idx
  on app_private.publication_instances (organization_id, social_connection_id);
create index publication_instances_version_fk_idx
  on app_private.publication_instances (
    organization_id, publication_id, publication_version_id
  );
create index publication_jobs_target_instance_fk_idx
  on app_private.publication_jobs (organization_id, target_instance_id);
create index publication_jobs_version_scope_fk_idx
  on app_private.publication_jobs (organization_id, publication_id, target_version_id);
create index publication_versions_approved_by_fk_idx
  on app_private.publication_versions (organization_id, approved_by_user_id);
create index publications_current_version_fk_idx
  on app_private.publications (organization_id, id, current_version_id);

create function app_private.assert_publication_actor(
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
    raise exception using
      errcode = '42501',
      message = 'publication actor is not an active authorized member';
  end if;
end;
$$;

create function app_private.claim_publication_command(
  target_organization_id uuid,
  target_idempotency_key text,
  target_operation text,
  target_request_payload jsonb,
  target_created_by_user_id uuid default null,
  target_allowed_roles text[] default array['owner', 'admin', 'operator']::text[]
)
returns table (claimed_command_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_command app_private.publication_commands%rowtype;
  target_fingerprint bytea;
begin
  if target_request_payload is null or jsonb_typeof(target_request_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'publication command payload must be an object';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id,
    target_created_by_user_id,
    target_allowed_roles
  );

  target_fingerprint := extensions.digest(target_request_payload::text, 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':' || target_idempotency_key, 0)
  );

  select command_value.* into existing_command
  from app_private.publication_commands as command_value
  where command_value.organization_id = target_organization_id
    and command_value.idempotency_key = target_idempotency_key
  for update;

  if found then
    if existing_command.operation <> target_operation
      or existing_command.request_fingerprint <> target_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'publication idempotency key was reused with another request';
    end if;

    if existing_command.completed_at is null then
      raise exception using
        errcode = '40001',
        message = 'publication command is incomplete and must be retried';
    end if;

    return query select existing_command.id, true;
    return;
  end if;

  insert into app_private.publication_commands (
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
  ) returning id into claimed_command_id;

  was_replayed := false;
  return next;
end;
$$;

create function app_private.complete_publication_command(
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
  update app_private.publication_commands
  set
    result_type = target_result_type,
    result_id = target_result_id,
    completed_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_command_id
    and completed_at is null;

  if not found then
    raise exception using errcode = '40001', message = 'publication command could not be completed';
  end if;
end;
$$;

create function app_private.insert_publication_event(
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
  if target_subject_type not in (
    'social_connection', 'publication', 'publication_version', 'publication_schedule',
    'publication_batch', 'publication_job', 'publication_instance'
  ) then
    raise exception using errcode = '22023', message = 'invalid publication event subject type';
  end if;

  insert into app_private.publication_events (
    organization_id,
    command_id,
    social_connection_id,
    publication_id,
    publication_version_id,
    schedule_id,
    batch_id,
    job_id,
    instance_id,
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
    case when target_subject_type = 'social_connection' then target_subject_id end,
    case when target_subject_type = 'publication' then target_subject_id end,
    case when target_subject_type = 'publication_version' then target_subject_id end,
    case when target_subject_type = 'publication_schedule' then target_subject_id end,
    case when target_subject_type = 'publication_batch' then target_subject_id end,
    case when target_subject_type = 'publication_job' then target_subject_id end,
    case when target_subject_type = 'publication_instance' then target_subject_id end,
    target_event_type,
    target_previous_status,
    target_new_status,
    target_reason,
    coalesce(target_event_payload, '{}'::jsonb),
    target_created_by_user_id,
    coalesce(target_occurred_at, statement_timestamp())
  ) returning id into target_event_id;

  return target_event_id;
end;
$$;

create function app_private.reject_publication_history_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = 'publication history is append-only';
end;
$$;

create function app_private.prevent_publication_command_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.operation is distinct from old.operation
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.request_payload is distinct from old.request_payload
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at
    or old.completed_at is not null
    or (new.completed_at is null) then
    raise exception using
      errcode = '23514',
      message = 'publication command request and completed result are immutable';
  end if;

  return new;
end;
$$;

create trigger publication_commands_prevent_core_rewrite
before update on app_private.publication_commands
for each row execute function app_private.prevent_publication_command_core_rewrite();

create function app_private.validate_social_connection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  messaging_connection app_private.channel_connections%rowtype;
begin
  if new.messenger_channel_connection_id is not null then
    select connection_value.* into messaging_connection
    from app_private.channel_connections as connection_value
    where connection_value.organization_id = new.organization_id
      and connection_value.id = new.messenger_channel_connection_id;

    if not found
      or messaging_connection.provider <> 'meta'
      or messaging_connection.channel <> 'messenger' then
      raise exception using
        errcode = '23514',
        message = 'social connection messenger link must reference a scoped Meta Messenger connection';
    end if;

    if new.external_account_id is not null
      and messaging_connection.external_account_id is not null
      and messaging_connection.external_account_id <> new.external_account_id then
      raise exception using
        errcode = '23514',
        message = 'social and messenger connections must reference the same external account';
    end if;
  end if;

  return new;
end;
$$;

create trigger social_connections_validate
before insert or update on app_private.social_connections
for each row execute function app_private.validate_social_connection();

create function app_private.prevent_social_connection_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.provider is distinct from old.provider
    or new.surface is distinct from old.surface
    or (old.external_app_id is not null and new.external_app_id is distinct from old.external_app_id)
    or (
      old.external_account_id is not null
      and new.external_account_id is distinct from old.external_account_id
    )
    or (
      old.messenger_channel_connection_id is not null
      and new.messenger_channel_connection_id is distinct from old.messenger_channel_connection_id
    )
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'social connection scope and external identity are immutable once known';
  end if;

  if old.status in ('revoked', 'archived') and new.status is distinct from old.status then
    raise exception using
      errcode = '23514',
      message = 'revoked or archived social connection cannot be reactivated';
  end if;

  return new;
end;
$$;

create trigger social_connections_prevent_reassignment
before update on app_private.social_connections
for each row execute function app_private.prevent_social_connection_reassignment();

create trigger social_capabilities_reject_update
before update or delete on app_private.social_capabilities
for each row execute function app_private.reject_publication_history_rewrite();

create function app_private.validate_publication_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant_id uuid;
  current_variant_updated_at timestamptz;
  tier_value record;
begin
  select publication_value.variant_id, variant_value.updated_at
  into target_variant_id, current_variant_updated_at
  from app_private.publications as publication_value
  join app_private.product_variants as variant_value
    on variant_value.organization_id = publication_value.organization_id
    and variant_value.id = publication_value.variant_id
  where publication_value.organization_id = new.organization_id
    and publication_value.id = new.publication_id;

  if not found then
    raise exception using errcode = '23514', message = 'publication version requires a scoped variant';
  end if;

  if new.source_variant_updated_at <> current_variant_updated_at then
    raise exception using
      errcode = '40001',
      message = 'publication version source variant snapshot is stale';
  end if;

  if new.source_price_tier_id is not null then
    select
      tier.variant_id,
      tier.pricing_status,
      tier.calculation_method,
      tier.price_amount,
      tier.valid_from,
      tier.valid_until,
      tier.superseded_at,
      book.currency_code,
      book.status as price_book_status
    into tier_value
    from app_private.price_tiers as tier
    join app_private.price_books as book
      on book.organization_id = tier.organization_id
      and book.id = tier.price_book_id
    where tier.organization_id = new.organization_id
      and tier.id = new.source_price_tier_id;

    if not found
      or tier_value.variant_id <> target_variant_id
      or tier_value.pricing_status <> new.pricing_status
      or tier_value.calculation_method is distinct from new.calculation_method
      or tier_value.price_amount is distinct from new.price_amount
      or tier_value.currency_code is distinct from new.currency_code
      or tier_value.valid_from is distinct from new.source_price_valid_from
      or tier_value.superseded_at is not null
      or tier_value.valid_from > new.created_at
      or (tier_value.valid_until is not null and tier_value.valid_until <= new.created_at)
      or tier_value.price_book_status <> 'active' then
      raise exception using
        errcode = '23514',
        message = 'publication price snapshot must match a current scoped price tier';
    end if;
  elsif new.pricing_status = 'priced' then
    raise exception using errcode = '23514', message = 'priced publication requires a source price tier';
  end if;

  return new;
end;
$$;

create trigger publication_versions_validate
before insert on app_private.publication_versions
for each row execute function app_private.validate_publication_version();

create function app_private.prevent_publication_version_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.publication_id is distinct from old.publication_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.version_number is distinct from old.version_number
    or new.headline is distinct from old.headline
    or new.body is distinct from old.body
    or new.call_to_action is distinct from old.call_to_action
    or new.content_payload is distinct from old.content_payload
    or new.content_sha256 is distinct from old.content_sha256
    or new.source_price_tier_id is distinct from old.source_price_tier_id
    or new.pricing_status is distinct from old.pricing_status
    or new.calculation_method is distinct from old.calculation_method
    or new.price_amount is distinct from old.price_amount
    or new.currency_code is distinct from old.currency_code
    or new.source_variant_updated_at is distinct from old.source_variant_updated_at
    or new.source_price_valid_from is distinct from old.source_price_valid_from
    or new.availability_snapshot is distinct from old.availability_snapshot
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication version snapshot is immutable';
  end if;

  if not (
    (old.status = 'draft' and new.status in ('approved', 'withdrawn'))
    or (old.status = 'approved' and new.status in ('superseded', 'withdrawn'))
    or (old.status = new.status)
  ) then
    raise exception using errcode = '23514', message = 'invalid publication version transition';
  end if;

  if old.status <> new.status
    and old.status <> 'draft'
    and (
      new.approved_by_user_id is distinct from old.approved_by_user_id
      or new.approved_at is distinct from old.approved_at
    ) then
    raise exception using errcode = '23514', message = 'publication approval evidence is immutable';
  end if;

  return new;
end;
$$;

create trigger publication_versions_prevent_rewrite
before update on app_private.publication_versions
for each row execute function app_private.prevent_publication_version_rewrite();

create trigger publication_media_reject_update
before update or delete on app_private.publication_media
for each row execute function app_private.reject_publication_history_rewrite();

create function app_private.validate_publication_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from app_private.media_assets as asset
    where asset.organization_id = new.organization_id
      and asset.id = new.media_asset_id
      and asset.ingest_status = 'verified'
      and asset.mime_type like 'image/%'
  ) then
    raise exception using
      errcode = '23514',
      message = 'publication media must be a verified scoped image asset';
  end if;

  return new;
end;
$$;

create trigger publication_media_validate
before insert on app_private.publication_media
for each row execute function app_private.validate_publication_media();

create function app_private.validate_publication_current_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.current_version_id is not null and not exists (
    select 1
    from app_private.publication_versions as version_value
    where version_value.organization_id = new.organization_id
      and version_value.publication_id = new.id
      and version_value.id = new.current_version_id
      and version_value.status = 'approved'
  ) then
    raise exception using
      errcode = '23514',
      message = 'publication current version must be an approved version of the same publication';
  end if;

  if new.status = 'active' and not exists (
    select 1
    from app_private.product_variants as variant_value
    join app_private.products as product_value
      on product_value.organization_id = variant_value.organization_id
      and product_value.id = variant_value.product_id
    where variant_value.organization_id = new.organization_id
      and variant_value.id = new.variant_id
      and variant_value.status = 'active'
      and product_value.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'active publication requires an active catalog product and variant';
  end if;

  return new;
end;
$$;

create trigger publications_validate_current_version
before insert or update on app_private.publications
for each row execute function app_private.validate_publication_current_version();

create function app_private.prevent_publication_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.social_connection_id is distinct from old.social_connection_id
    or new.variant_id is distinct from old.variant_id
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication scope is immutable';
  end if;

  if old.status = 'retired' and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'retired publication cannot be reactivated';
  end if;

  return new;
end;
$$;

create trigger publications_prevent_reassignment
before update on app_private.publications
for each row execute function app_private.prevent_publication_reassignment();

create function app_private.validate_publication_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names as timezone_value
    where timezone_value.name = new.timezone_name
  ) then
    raise exception using errcode = '22023', message = 'publication schedule timezone is invalid';
  end if;

  if new.status = 'active' and not exists (
    select 1
    from app_private.social_connections as connection_value
    where connection_value.organization_id = new.organization_id
      and connection_value.id = new.social_connection_id
      and connection_value.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'active publication schedule requires an active social connection';
  end if;

  return new;
end;
$$;

create trigger publication_schedules_validate
before insert or update on app_private.publication_schedules
for each row execute function app_private.validate_publication_schedule();

create function app_private.prevent_publication_schedule_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  configuration_changed boolean;
begin
  if new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.code is distinct from old.code
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication schedule identity is immutable';
  end if;

  if old.status = 'retired' and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'retired publication schedule cannot be reactivated';
  end if;

  configuration_changed :=
    new.social_connection_id is distinct from old.social_connection_id
    or new.name is distinct from old.name
    or new.timezone_name is distinct from old.timezone_name
    or new.schedule_expression is distinct from old.schedule_expression
    or new.expression_kind is distinct from old.expression_kind
    or new.requested_operation is distinct from old.requested_operation
    or new.selection_criteria is distinct from old.selection_criteria
    or new.schedule_policy is distinct from old.schedule_policy;

  if configuration_changed and new.generation <> old.generation + 1 then
    raise exception using
      errcode = '23514',
      message = 'publication schedule configuration change must increment generation once';
  end if;

  if not configuration_changed and new.generation <> old.generation then
    raise exception using
      errcode = '23514',
      message = 'publication schedule generation changes only with configuration';
  end if;

  if configuration_changed and new.validation_status <> 'unvalidated' then
    raise exception using
      errcode = '23514',
      message = 'changed publication schedule must be revalidated';
  end if;

  return new;
end;
$$;

create trigger publication_schedules_prevent_rewrite
before update on app_private.publication_schedules
for each row execute function app_private.prevent_publication_schedule_rewrite();

create function app_private.validate_publication_batch()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  schedule_value app_private.publication_schedules%rowtype;
begin
  if new.schedule_id is not null then
    select schedule_row.* into schedule_value
    from app_private.publication_schedules as schedule_row
    where schedule_row.organization_id = new.organization_id
      and schedule_row.id = new.schedule_id;

    if not found
      or schedule_value.social_connection_id <> new.social_connection_id
      or schedule_value.generation <> new.schedule_generation
      or schedule_value.requested_operation <> new.requested_operation then
      raise exception using
        errcode = '23514',
        message = 'scheduled publication batch must snapshot the exact schedule generation';
    end if;
  end if;

  return new;
end;
$$;

create trigger publication_batches_validate
before insert on app_private.publication_batches
for each row execute function app_private.validate_publication_batch();

create function app_private.prevent_publication_batch_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.social_connection_id is distinct from old.social_connection_id
    or new.schedule_id is distinct from old.schedule_id
    or new.schedule_generation is distinct from old.schedule_generation
    or new.trigger_kind is distinct from old.trigger_kind
    or new.requested_operation is distinct from old.requested_operation
    or new.selection_criteria_snapshot is distinct from old.selection_criteria_snapshot
    or new.policy_snapshot is distinct from old.policy_snapshot
    or new.schedule_occurrence_at is distinct from old.schedule_occurrence_at
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication batch request snapshot is immutable';
  end if;

  if old.status in ('completed', 'partially_failed', 'cancelled')
    and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'terminal publication batch cannot transition';
  end if;

  return new;
end;
$$;

create trigger publication_batches_prevent_rewrite
before update on app_private.publication_batches
for each row execute function app_private.prevent_publication_batch_rewrite();

create function app_private.validate_publication_job_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  publication_value app_private.publications%rowtype;
  batch_value app_private.publication_batches%rowtype;
  instance_value app_private.publication_instances%rowtype;
begin
  select publication_row.* into publication_value
  from app_private.publications as publication_row
  where publication_row.organization_id = new.organization_id
    and publication_row.id = new.publication_id;

  if not found then
    raise exception using errcode = '23514', message = 'publication job requires a scoped publication';
  end if;

  if new.batch_id is not null then
    select batch_row.* into batch_value
    from app_private.publication_batches as batch_row
    where batch_row.organization_id = new.organization_id
      and batch_row.id = new.batch_id;

    if not found
      or batch_value.social_connection_id <> publication_value.social_connection_id
      or batch_value.requested_operation <> new.operation
      or batch_value.status in ('cancelling', 'completed', 'partially_failed', 'cancelled') then
      raise exception using errcode = '23514', message = 'publication job batch scope is invalid';
    end if;
  end if;

  if new.schedule_id is not null
    and (new.batch_id is null or new.schedule_id is distinct from batch_value.schedule_id) then
    raise exception using errcode = '23514', message = 'publication job schedule must come from its batch';
  end if;

  if new.operation in ('publish', 'refresh', 'sync') and not exists (
    select 1
    from app_private.publication_versions as version_value
    where version_value.organization_id = new.organization_id
      and version_value.publication_id = new.publication_id
      and version_value.id = new.target_version_id
      and version_value.status = 'approved'
      and publication_value.current_version_id = version_value.id
      and publication_value.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'publication job must target the current approved active version';
  end if;

  if new.target_instance_id is not null then
    select instance_row.* into instance_value
    from app_private.publication_instances as instance_row
    where instance_row.organization_id = new.organization_id
      and instance_row.id = new.target_instance_id;

    if not found
      or instance_value.publication_id <> new.publication_id
      or instance_value.social_connection_id <> publication_value.social_connection_id then
      raise exception using errcode = '23514', message = 'publication job target instance scope is invalid';
    end if;
  end if;

  return new;
end;
$$;

create trigger publication_jobs_validate_scope
before insert on app_private.publication_jobs
for each row execute function app_private.validate_publication_job_scope();

create function app_private.prevent_publication_job_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.idempotency_key is distinct from old.idempotency_key
    or new.request_fingerprint is distinct from old.request_fingerprint
    or new.batch_id is distinct from old.batch_id
    or new.schedule_id is distinct from old.schedule_id
    or new.publication_id is distinct from old.publication_id
    or new.target_version_id is distinct from old.target_version_id
    or new.target_instance_id is distinct from old.target_instance_id
    or new.operation is distinct from old.operation
    or new.capability_code is distinct from old.capability_code
    or new.external_effect_key is distinct from old.external_effect_key
    or new.priority is distinct from old.priority
    or new.max_attempts is distinct from old.max_attempts
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication job effect contract is immutable';
  end if;

  if old.status in ('succeeded', 'blocked', 'failed', 'cancelled', 'uncertain')
    and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'terminal publication job cannot transition';
  end if;

  return new;
end;
$$;

create trigger publication_jobs_prevent_core_rewrite
before update on app_private.publication_jobs
for each row execute function app_private.prevent_publication_job_core_rewrite();

create function app_private.validate_publication_instance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_value app_private.publication_jobs%rowtype;
  publication_value app_private.publications%rowtype;
begin
  select job_row.* into job_value
  from app_private.publication_jobs as job_row
  where job_row.organization_id = new.organization_id
    and job_row.id = new.creation_job_id;

  select publication_row.* into publication_value
  from app_private.publications as publication_row
  where publication_row.organization_id = new.organization_id
    and publication_row.id = new.publication_id;

  if job_value.id is null
    or publication_value.id is null
    or job_value.status <> 'processing'
    or job_value.operation not in ('publish', 'refresh', 'reconcile')
    or job_value.publication_id <> new.publication_id
    or coalesce(job_value.target_version_id, publication_value.current_version_id)
      is distinct from new.publication_version_id
    or publication_value.social_connection_id <> new.social_connection_id then
    raise exception using
      errcode = '23514',
      message = 'publication instance must originate from its exact processing publish job';
  end if;

  return new;
end;
$$;

create trigger publication_instances_validate
before insert on app_private.publication_instances
for each row execute function app_private.validate_publication_instance();

create function app_private.prevent_publication_instance_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.social_connection_id is distinct from old.social_connection_id
    or new.publication_id is distinct from old.publication_id
    or new.publication_version_id is distinct from old.publication_version_id
    or new.creation_job_id is distinct from old.creation_job_id
    or new.external_publication_id is distinct from old.external_publication_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'publication instance provenance is immutable';
  end if;

  if old.status in ('deleted') and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'deleted publication instance cannot be reactivated';
  end if;

  return new;
end;
$$;

create trigger publication_instances_prevent_reassignment
before update on app_private.publication_instances
for each row execute function app_private.prevent_publication_instance_reassignment();

create trigger publication_events_reject_update
before update or delete on app_private.publication_events
for each row execute function app_private.reject_publication_history_rewrite();

create trigger publication_commands_reject_delete
before delete on app_private.publication_commands
for each row execute function app_private.reject_publication_history_rewrite();

create trigger publication_versions_reject_delete
before delete on app_private.publication_versions
for each row execute function app_private.reject_publication_history_rewrite();

create trigger publication_instances_reject_delete
before delete on app_private.publication_instances
for each row execute function app_private.reject_publication_history_rewrite();

create trigger social_connections_set_updated_at
before update on app_private.social_connections
for each row execute function app_private.set_updated_at();

create trigger publications_set_updated_at
before update on app_private.publications
for each row execute function app_private.set_updated_at();

create trigger publication_schedules_set_updated_at
before update on app_private.publication_schedules
for each row execute function app_private.set_updated_at();

create trigger publication_batches_set_updated_at
before update on app_private.publication_batches
for each row execute function app_private.set_updated_at();

create trigger publication_jobs_set_updated_at
before update on app_private.publication_jobs
for each row execute function app_private.set_updated_at();

create trigger publication_instances_set_updated_at
before update on app_private.publication_instances
for each row execute function app_private.set_updated_at();

create function app_private.publication_availability_snapshot(
  target_organization_id uuid,
  target_variant_id uuid,
  target_captured_at timestamptz default statement_timestamp()
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'captured_at', target_captured_at,
    'direct_inventory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'inventory_item_id', item.id,
          'unit_id', item.inventory_unit_id,
          'available_quantity', coalesce(balance.available_quantity, 0::numeric),
          'balance_updated_at', balance.balance_updated_at
        ) order by item.id
      )
      from app_private.inventory_items as item
      left join lateral (
        select
          sum(inventory_balance.available_quantity) as available_quantity,
          max(inventory_balance.updated_at) as balance_updated_at
        from app_private.inventory_balances as inventory_balance
        where inventory_balance.organization_id = item.organization_id
          and inventory_balance.inventory_item_id = item.id
      ) as balance on true
      where item.organization_id = target_organization_id
        and item.variant_id = target_variant_id
        and item.status = 'active'
    ), '[]'::jsonb),
    'compositions', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'composition_id', availability.composition_id,
          'unit_id', availability.sale_unit_id,
          'available_quantity', availability.available_sale_quantity
        ) order by availability.composition_id
      )
      from api.inventory_composition_availability as availability
      where availability.organization_id = target_organization_id
        and availability.offered_variant_id = target_variant_id
    ), '[]'::jsonb)
  );
$$;

create function api.register_social_connection(
  target_organization_id uuid,
  target_idempotency_key text,
  target_status text,
  target_external_app_id text default null,
  target_external_account_id text default null,
  target_display_name text default null,
  target_api_version text default null,
  target_credential_reference text default null,
  target_messenger_channel_connection_id uuid default null,
  target_connected_at timestamptz default null,
  target_last_verified_at timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (social_connection_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_connection_id uuid;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'status', target_status,
    'external_app_id', target_external_app_id,
    'external_account_id', target_external_account_id,
    'display_name', target_display_name,
    'api_version', target_api_version,
    'credential_reference', target_credential_reference,
    'messenger_channel_connection_id', target_messenger_channel_connection_id,
    'connected_at', target_connected_at,
    'last_verified_at', target_last_verified_at
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'social_connection.register',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_connection_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_connection_id, true;
    return;
  end if;

  insert into app_private.social_connections (
    organization_id,
    creation_command_id,
    external_app_id,
    external_account_id,
    display_name,
    api_version,
    credential_reference,
    messenger_channel_connection_id,
    status,
    connected_at,
    last_verified_at,
    disabled_at,
    created_by_user_id
  ) values (
    target_organization_id,
    target_command_id,
    target_external_app_id,
    target_external_account_id,
    target_display_name,
    target_api_version,
    target_credential_reference,
    target_messenger_channel_connection_id,
    target_status,
    target_connected_at,
    target_last_verified_at,
    case when target_status in ('suspended', 'revoked', 'archived') then statement_timestamp() end,
    target_created_by_user_id
  ) returning id into target_connection_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'social_connection',
    target_connection_id,
    'social_connection.registered',
    null,
    target_status,
    null,
    jsonb_build_object('surface', 'facebook_page', 'provider', 'meta'),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'social_connection',
    target_connection_id
  );

  return query select target_connection_id, false;
end;
$$;

create function api.observe_social_capability(
  target_organization_id uuid,
  target_idempotency_key text,
  target_social_connection_id uuid,
  target_capability_code text,
  target_status text,
  target_observation_source text,
  target_capability_constraints jsonb default '{}'::jsonb,
  target_evidence_summary jsonb default '{}'::jsonb,
  target_observed_at timestamptz default statement_timestamp(),
  target_valid_until timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (social_capability_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_capability_id uuid;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'social_connection_id', target_social_connection_id,
    'capability_code', target_capability_code,
    'status', target_status,
    'observation_source', target_observation_source,
    'capability_constraints', target_capability_constraints,
    'evidence_summary', target_evidence_summary,
    'observed_at', target_observed_at,
    'valid_until', target_valid_until
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'social_capability.observe',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_capability_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_capability_id, true;
    return;
  end if;

  if not exists (
    select 1
    from app_private.social_connections as connection_value
    where connection_value.organization_id = target_organization_id
      and connection_value.id = target_social_connection_id
      and connection_value.status <> 'archived'
  ) then
    raise exception using errcode = '23514', message = 'capability requires a scoped social connection';
  end if;

  insert into app_private.social_capabilities (
    organization_id,
    social_connection_id,
    creation_command_id,
    capability_code,
    status,
    observation_source,
    capability_constraints,
    evidence_summary,
    observed_at,
    valid_until,
    created_by_user_id
  ) values (
    target_organization_id,
    target_social_connection_id,
    target_command_id,
    target_capability_code,
    target_status,
    target_observation_source,
    coalesce(target_capability_constraints, '{}'::jsonb),
    coalesce(target_evidence_summary, '{}'::jsonb),
    coalesce(target_observed_at, statement_timestamp()),
    target_valid_until,
    target_created_by_user_id
  ) returning id into target_capability_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'social_connection',
    target_social_connection_id,
    'social_capability.observed',
    null,
    target_status,
    target_capability_code,
    jsonb_build_object(
      'capability_id', target_capability_id,
      'observation_source', target_observation_source,
      'valid_until', target_valid_until
    ),
    target_created_by_user_id,
    target_observed_at
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'social_capability',
    target_capability_id
  );

  return query select target_capability_id, false;
end;
$$;

create function api.transition_social_connection(
  target_organization_id uuid,
  target_social_connection_id uuid,
  target_idempotency_key text,
  target_status text,
  target_reason text,
  target_external_app_id text default null,
  target_external_account_id text default null,
  target_display_name text default null,
  target_api_version text default null,
  target_credential_reference text default null,
  target_messenger_channel_connection_id uuid default null,
  target_connected_at timestamptz default null,
  target_last_verified_at timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (social_connection_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  current_connection app_private.social_connections%rowtype;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'social_connection_id', target_social_connection_id,
    'status', target_status,
    'reason', target_reason,
    'external_app_id', target_external_app_id,
    'external_account_id', target_external_account_id,
    'display_name', target_display_name,
    'api_version', target_api_version,
    'credential_reference', target_credential_reference,
    'messenger_channel_connection_id', target_messenger_channel_connection_id,
    'connected_at', target_connected_at,
    'last_verified_at', target_last_verified_at
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'social_connection.transition',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    return query select target_social_connection_id, true;
    return;
  end if;

  select connection_value.* into current_connection
  from app_private.social_connections as connection_value
  where connection_value.organization_id = target_organization_id
    and connection_value.id = target_social_connection_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'social connection was not found';
  end if;

  update app_private.social_connections
  set
    external_app_id = coalesce(target_external_app_id, external_app_id),
    external_account_id = coalesce(target_external_account_id, external_account_id),
    display_name = coalesce(target_display_name, display_name),
    api_version = coalesce(target_api_version, api_version),
    credential_reference = coalesce(target_credential_reference, credential_reference),
    messenger_channel_connection_id = coalesce(
      target_messenger_channel_connection_id,
      messenger_channel_connection_id
    ),
    status = target_status,
    connected_at = coalesce(target_connected_at, connected_at),
    last_verified_at = coalesce(target_last_verified_at, last_verified_at),
    disabled_at = case
      when target_status in ('suspended', 'revoked', 'archived')
        then coalesce(disabled_at, statement_timestamp())
      else null
    end
  where organization_id = target_organization_id
    and id = target_social_connection_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'social_connection',
    target_social_connection_id,
    'social_connection.transitioned',
    current_connection.status,
    target_status,
    target_reason,
    '{}'::jsonb,
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'social_connection',
    target_social_connection_id
  );

  return query select target_social_connection_id, false;
end;
$$;

create function api.create_publication(
  target_organization_id uuid,
  target_idempotency_key text,
  target_social_connection_id uuid,
  target_variant_id uuid,
  target_created_by_user_id uuid default null
)
returns table (publication_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_publication_id uuid;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'social_connection_id', target_social_connection_id,
    'variant_id', target_variant_id
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication.create',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_publication_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_publication_id, true;
    return;
  end if;

  if not exists (
    select 1
    from app_private.social_connections as connection_value
    where connection_value.organization_id = target_organization_id
      and connection_value.id = target_social_connection_id
      and connection_value.status <> 'archived'
  ) or not exists (
    select 1
    from app_private.product_variants as variant_value
    where variant_value.organization_id = target_organization_id
      and variant_value.id = target_variant_id
      and variant_value.status <> 'archived'
  ) then
    raise exception using
      errcode = '23514',
      message = 'publication requires a scoped social connection and catalog variant';
  end if;

  insert into app_private.publications (
    organization_id,
    creation_command_id,
    social_connection_id,
    variant_id,
    created_by_user_id
  ) values (
    target_organization_id,
    target_command_id,
    target_social_connection_id,
    target_variant_id,
    target_created_by_user_id
  ) returning id into target_publication_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication',
    target_publication_id,
    'publication.created',
    null,
    'draft',
    null,
    jsonb_build_object('variant_id', target_variant_id),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication',
    target_publication_id
  );

  return query select target_publication_id, false;
end;
$$;

create function api.create_publication_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_publication_id uuid,
  target_body text,
  target_headline text default null,
  target_call_to_action text default null,
  target_content_payload jsonb default '{}'::jsonb,
  target_source_price_tier_id uuid default null,
  target_media jsonb default '[]'::jsonb,
  target_created_by_user_id uuid default null
)
returns table (publication_version_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_version_id uuid;
  target_version_number integer;
  target_variant_id uuid;
  target_variant_updated_at timestamptz;
  target_pricing_status text := 'on_request';
  target_calculation_method text;
  target_price_amount numeric;
  target_currency_code text;
  target_price_valid_from timestamptz;
  target_content_hash bytea;
  target_availability_snapshot jsonb;
  request_payload jsonb;
  media_value record;
begin
  if target_content_payload is null or jsonb_typeof(target_content_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'publication content payload must be an object';
  end if;
  if target_media is null or jsonb_typeof(target_media) <> 'array'
    or jsonb_array_length(target_media) > 100 then
    raise exception using errcode = '22023', message = 'publication media must be an array of at most 100 items';
  end if;

  request_payload := jsonb_build_object(
    'publication_id', target_publication_id,
    'headline', target_headline,
    'body', target_body,
    'call_to_action', target_call_to_action,
    'content_payload', target_content_payload,
    'source_price_tier_id', target_source_price_tier_id,
    'media', target_media
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_version.create',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_version_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_version_id, true;
    return;
  end if;

  select publication_value.variant_id, variant_value.updated_at
  into target_variant_id, target_variant_updated_at
  from app_private.publications as publication_value
  join app_private.product_variants as variant_value
    on variant_value.organization_id = publication_value.organization_id
    and variant_value.id = publication_value.variant_id
  where publication_value.organization_id = target_organization_id
    and publication_value.id = target_publication_id
    and publication_value.status <> 'retired'
  for update of publication_value;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication was not found or is retired';
  end if;

  if target_source_price_tier_id is not null then
    select
      tier.pricing_status,
      tier.calculation_method,
      tier.price_amount,
      book.currency_code,
      tier.valid_from
    into
      target_pricing_status,
      target_calculation_method,
      target_price_amount,
      target_currency_code,
      target_price_valid_from
    from app_private.price_tiers as tier
    join app_private.price_books as book
      on book.organization_id = tier.organization_id
      and book.id = tier.price_book_id
    where tier.organization_id = target_organization_id
      and tier.id = target_source_price_tier_id
      and tier.variant_id = target_variant_id
      and tier.superseded_at is null
      and tier.valid_from <= statement_timestamp()
      and (tier.valid_until is null or tier.valid_until > statement_timestamp())
      and book.status = 'active';

    if not found then
      raise exception using
        errcode = '23514',
        message = 'publication version requires a current scoped price tier';
    end if;
  end if;

  select coalesce(max(version_value.version_number), 0) + 1
  into target_version_number
  from app_private.publication_versions as version_value
  where version_value.organization_id = target_organization_id
    and version_value.publication_id = target_publication_id;

  target_content_hash := extensions.digest(
    jsonb_build_object(
      'headline', target_headline,
      'body', target_body,
      'call_to_action', target_call_to_action,
      'content_payload', target_content_payload,
      'source_price_tier_id', target_source_price_tier_id,
      'pricing_status', target_pricing_status,
      'calculation_method', target_calculation_method,
      'price_amount', target_price_amount,
      'currency_code', target_currency_code,
      'media', target_media
    )::text,
    'sha256'
  );
  target_availability_snapshot := app_private.publication_availability_snapshot(
    target_organization_id,
    target_variant_id,
    statement_timestamp()
  );

  insert into app_private.publication_versions (
    organization_id,
    publication_id,
    creation_command_id,
    version_number,
    headline,
    body,
    call_to_action,
    content_payload,
    content_sha256,
    source_price_tier_id,
    pricing_status,
    calculation_method,
    price_amount,
    currency_code,
    source_variant_updated_at,
    source_price_valid_from,
    availability_snapshot,
    created_by_user_id
  ) values (
    target_organization_id,
    target_publication_id,
    target_command_id,
    target_version_number,
    target_headline,
    target_body,
    target_call_to_action,
    target_content_payload,
    target_content_hash,
    target_source_price_tier_id,
    target_pricing_status,
    target_calculation_method,
    target_price_amount,
    target_currency_code,
    target_variant_updated_at,
    target_price_valid_from,
    target_availability_snapshot,
    target_created_by_user_id
  ) returning id into target_version_id;

  for media_value in
    select
      media_item.value->>'media_asset_id' as media_asset_id,
      coalesce(media_item.value->>'media_role', 'gallery') as media_role,
      media_item.value->>'alt_text' as alt_text,
      (media_item.ordinality - 1)::integer as ordinal
    from jsonb_array_elements(target_media) with ordinality as media_item(value, ordinality)
  loop
    insert into app_private.publication_media (
      organization_id,
      publication_version_id,
      media_asset_id,
      ordinal,
      media_role,
      alt_text
    ) values (
      target_organization_id,
      target_version_id,
      media_value.media_asset_id::uuid,
      media_value.ordinal,
      media_value.media_role,
      media_value.alt_text
    );
  end loop;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_version',
    target_version_id,
    'publication_version.created',
    null,
    'draft',
    null,
    jsonb_build_object(
      'publication_id', target_publication_id,
      'version_number', target_version_number,
      'pricing_status', target_pricing_status,
      'media_count', jsonb_array_length(target_media)
    ),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_version',
    target_version_id
  );

  return query select target_version_id, false;
end;
$$;

create function api.approve_publication_version(
  target_organization_id uuid,
  target_idempotency_key text,
  target_publication_version_id uuid,
  target_publication_status text,
  target_reason text,
  target_created_by_user_id uuid
)
returns table (publication_version_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_publication_id uuid;
  current_publication app_private.publications%rowtype;
  request_payload jsonb;
begin
  if target_publication_status not in ('active', 'paused') then
    raise exception using errcode = '22023', message = 'approved publication status must be active or paused';
  end if;

  request_payload := jsonb_build_object(
    'publication_version_id', target_publication_version_id,
    'publication_status', target_publication_status,
    'reason', target_reason
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_version.approve',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    return query select target_publication_version_id, true;
    return;
  end if;

  select publication_value.* into current_publication
  from app_private.publication_versions as version_value
  join app_private.publications as publication_value
    on publication_value.organization_id = version_value.organization_id
    and publication_value.id = version_value.publication_id
  where version_value.organization_id = target_organization_id
    and version_value.id = target_publication_version_id
    and version_value.status = 'draft'
    and publication_value.status <> 'retired'
  for update of publication_value, version_value;

  if not found then
    raise exception using errcode = 'P0002', message = 'draft publication version was not found';
  end if;
  target_publication_id := current_publication.id;

  if target_publication_status = 'active' and not exists (
    select 1
    from app_private.social_connections as connection_value
    where connection_value.organization_id = target_organization_id
      and connection_value.id = current_publication.social_connection_id
      and connection_value.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'active publication requires an active social connection';
  end if;

  if current_publication.current_version_id is not null then
    update app_private.publication_versions
    set status = 'superseded'
    where organization_id = target_organization_id
      and id = current_publication.current_version_id
      and status = 'approved';
  end if;

  update app_private.publication_versions
  set
    status = 'approved',
    approved_by_user_id = target_created_by_user_id,
    approved_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_publication_version_id;

  update app_private.publications
  set
    current_version_id = target_publication_version_id,
    status = target_publication_status
  where organization_id = target_organization_id
    and id = target_publication_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_version',
    target_publication_version_id,
    'publication_version.approved',
    'draft',
    'approved',
    target_reason,
    jsonb_build_object(
      'publication_id', target_publication_id,
      'publication_status', target_publication_status,
      'superseded_version_id', current_publication.current_version_id
    ),
    target_created_by_user_id
  );
  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication',
    target_publication_id,
    'publication.version_selected',
    current_publication.status,
    target_publication_status,
    target_reason,
    jsonb_build_object('publication_version_id', target_publication_version_id),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_version',
    target_publication_version_id
  );

  return query select target_publication_version_id, false;
end;
$$;

create function api.create_publication_schedule(
  target_organization_id uuid,
  target_idempotency_key text,
  target_social_connection_id uuid,
  target_code text,
  target_name text,
  target_timezone_name text,
  target_schedule_expression text,
  target_requested_operation text,
  target_selection_criteria jsonb,
  target_schedule_policy jsonb,
  target_validation_status text,
  target_status text,
  target_next_run_at timestamptz,
  target_created_by_user_id uuid
)
returns table (publication_schedule_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_schedule_id uuid;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'social_connection_id', target_social_connection_id,
    'code', target_code,
    'name', target_name,
    'timezone_name', target_timezone_name,
    'schedule_expression', target_schedule_expression,
    'requested_operation', target_requested_operation,
    'selection_criteria', target_selection_criteria,
    'schedule_policy', target_schedule_policy,
    'validation_status', target_validation_status,
    'status', target_status,
    'next_run_at', target_next_run_at
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_schedule.create',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_schedule_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_schedule_id, true;
    return;
  end if;

  insert into app_private.publication_schedules (
    organization_id,
    creation_command_id,
    social_connection_id,
    code,
    name,
    timezone_name,
    schedule_expression,
    requested_operation,
    selection_criteria,
    schedule_policy,
    validation_status,
    status,
    next_run_at,
    created_by_user_id
  ) values (
    target_organization_id,
    target_command_id,
    target_social_connection_id,
    target_code,
    target_name,
    target_timezone_name,
    target_schedule_expression,
    target_requested_operation,
    coalesce(target_selection_criteria, '{}'::jsonb),
    coalesce(target_schedule_policy, '{}'::jsonb),
    target_validation_status,
    target_status,
    target_next_run_at,
    target_created_by_user_id
  ) returning id into target_schedule_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_schedule',
    target_schedule_id,
    'publication_schedule.created',
    null,
    target_status,
    null,
    jsonb_build_object(
      'timezone_name', target_timezone_name,
      'schedule_expression', target_schedule_expression,
      'validation_status', target_validation_status,
      'next_run_at', target_next_run_at
    ),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_schedule',
    target_schedule_id
  );

  return query select target_schedule_id, false;
end;
$$;

create function api.transition_publication_schedule(
  target_organization_id uuid,
  target_publication_schedule_id uuid,
  target_idempotency_key text,
  target_status text,
  target_reason text,
  target_next_run_at timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (publication_schedule_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  schedule_value app_private.publication_schedules%rowtype;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'publication_schedule_id', target_publication_schedule_id,
    'status', target_status,
    'reason', target_reason,
    'next_run_at', target_next_run_at
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_schedule.transition',
    request_payload,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    return query select target_publication_schedule_id, true;
    return;
  end if;

  select schedule_row.* into schedule_value
  from app_private.publication_schedules as schedule_row
  where schedule_row.organization_id = target_organization_id
    and schedule_row.id = target_publication_schedule_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication schedule was not found';
  end if;

  update app_private.publication_schedules
  set
    status = target_status,
    next_run_at = case
      when target_status = 'active' then target_next_run_at
      else null
    end,
    retired_at = case when target_status = 'retired' then statement_timestamp() end
  where organization_id = target_organization_id
    and id = target_publication_schedule_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_schedule',
    target_publication_schedule_id,
    'publication_schedule.transitioned',
    schedule_value.status,
    target_status,
    target_reason,
    jsonb_build_object('next_run_at', target_next_run_at),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_schedule',
    target_publication_schedule_id
  );

  return query select target_publication_schedule_id, false;
end;
$$;

create function api.enqueue_publication_batch(
  target_organization_id uuid,
  target_idempotency_key text,
  target_social_connection_id uuid,
  target_requested_operation text,
  target_trigger_kind text,
  target_publication_ids jsonb,
  target_selection_criteria jsonb,
  target_policy_snapshot jsonb,
  target_available_at timestamptz default statement_timestamp(),
  target_priority integer default 100,
  target_max_attempts integer default 8,
  target_schedule_id uuid default null,
  target_schedule_generation integer default null,
  target_schedule_occurrence_at timestamptz default null,
  target_next_schedule_run_at timestamptz default null,
  target_created_by_user_id uuid default null
)
returns table (publication_batch_id uuid, jobs_created integer, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_batch_id uuid;
  target_jobs_created integer := 0;
  request_payload jsonb;
  schedule_value app_private.publication_schedules%rowtype;
  publication_value record;
  target_job_command_id uuid;
  target_job_id uuid;
  target_job_key text;
  target_effect_key text;
  target_instance_id uuid;
begin
  if target_publication_ids is null or jsonb_typeof(target_publication_ids) <> 'array'
    or jsonb_array_length(target_publication_ids) > 10000 then
    raise exception using
      errcode = '22023',
      message = 'publication batch targets must be an array of at most 10000 publication IDs';
  end if;
  if target_selection_criteria is null or jsonb_typeof(target_selection_criteria) <> 'object'
    or target_policy_snapshot is null or jsonb_typeof(target_policy_snapshot) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'publication batch selection and policy must be objects';
  end if;
  if target_requested_operation not in ('publish', 'refresh', 'sync') then
    raise exception using
      errcode = '22023',
      message = 'publication batch operation must be publish, refresh or sync';
  end if;

  request_payload := jsonb_build_object(
    'social_connection_id', target_social_connection_id,
    'requested_operation', target_requested_operation,
    'trigger_kind', target_trigger_kind,
    'publication_ids', target_publication_ids,
    'selection_criteria', target_selection_criteria,
    'policy_snapshot', target_policy_snapshot,
    'available_at', target_available_at,
    'priority', target_priority,
    'max_attempts', target_max_attempts,
    'schedule_id', target_schedule_id,
    'schedule_generation', target_schedule_generation,
    'schedule_occurrence_at', target_schedule_occurrence_at,
    'next_schedule_run_at', target_next_schedule_run_at
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_batch.enqueue',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_batch_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    select count(*)::integer into target_jobs_created
    from app_private.publication_jobs as job_value
    where job_value.organization_id = target_organization_id
      and job_value.batch_id = target_batch_id;
    return query select target_batch_id, target_jobs_created, true;
    return;
  end if;

  if target_trigger_kind = 'schedule' then
    select schedule_row.* into schedule_value
    from app_private.publication_schedules as schedule_row
    where schedule_row.organization_id = target_organization_id
      and schedule_row.id = target_schedule_id
    for update;

    if not found
      or schedule_value.status <> 'active'
      or schedule_value.validation_status <> 'valid'
      or schedule_value.social_connection_id <> target_social_connection_id
      or schedule_value.generation <> target_schedule_generation
      or schedule_value.requested_operation <> target_requested_operation
      or schedule_value.next_run_at is distinct from target_schedule_occurrence_at
      or target_next_schedule_run_at is null
      or target_next_schedule_run_at <= target_schedule_occurrence_at then
      raise exception using
        errcode = '23514',
        message = 'scheduled batch must advance the exact active schedule occurrence';
    end if;
  elsif target_schedule_id is not null
    or target_schedule_generation is not null
    or target_schedule_occurrence_at is not null
    or target_next_schedule_run_at is not null then
    raise exception using
      errcode = '23514',
      message = 'manual publication batch cannot carry schedule state';
  end if;

  insert into app_private.publication_batches (
    organization_id,
    creation_command_id,
    social_connection_id,
    schedule_id,
    schedule_generation,
    trigger_kind,
    requested_operation,
    status,
    selection_criteria_snapshot,
    policy_snapshot,
    schedule_occurrence_at,
    created_by_user_id
  ) values (
    target_organization_id,
    target_command_id,
    target_social_connection_id,
    target_schedule_id,
    target_schedule_generation,
    target_trigger_kind,
    target_requested_operation,
    'expanding',
    target_selection_criteria,
    target_policy_snapshot,
    target_schedule_occurrence_at,
    target_created_by_user_id
  ) returning id into target_batch_id;

  for publication_value in
    select
      publication_row.id,
      publication_row.current_version_id,
      publication_row.social_connection_id,
      publication_row.status
    from app_private.publications as publication_row
    where publication_row.organization_id = target_organization_id
      and publication_row.social_connection_id = target_social_connection_id
      and publication_row.status = 'active'
      and publication_row.current_version_id is not null
      and (
        jsonb_array_length(target_publication_ids) = 0
        or publication_row.id in (
          select target_item.value::uuid
          from jsonb_array_elements_text(target_publication_ids) as target_item(value)
        )
      )
    order by publication_row.id
    for update
  loop
    target_instance_id := null;
    if target_requested_operation = 'sync' then
      select instance_value.id into target_instance_id
      from app_private.publication_instances as instance_value
      where instance_value.organization_id = target_organization_id
        and instance_value.publication_id = publication_value.id
        and instance_value.status not in ('deleted')
      order by instance_value.created_at desc, instance_value.id desc
      limit 1;

      if target_instance_id is null then
        continue;
      end if;
    end if;

    target_job_key := 'batch-job-' || encode(
      extensions.digest(target_idempotency_key || ':' || publication_value.id::text, 'sha256'),
      'hex'
    );
    target_effect_key := 'publication-effect-' || encode(
      extensions.digest(
        target_idempotency_key || ':' || publication_value.id::text || ':' || target_requested_operation,
        'sha256'
      ),
      'hex'
    );

    insert into app_private.publication_commands (
      organization_id,
      idempotency_key,
      operation,
      request_fingerprint,
      request_payload,
      result_type,
      result_id,
      created_by_user_id,
      completed_at
    ) values (
      target_organization_id,
      target_job_key,
      'publication_job.enqueue',
      extensions.digest(
        jsonb_build_object(
          'batch_id', target_batch_id,
          'publication_id', publication_value.id,
          'version_id', publication_value.current_version_id,
          'operation', target_requested_operation,
          'instance_id', target_instance_id
        )::text,
        'sha256'
      ),
      jsonb_build_object(
        'batch_id', target_batch_id,
        'publication_id', publication_value.id,
        'version_id', publication_value.current_version_id,
        'operation', target_requested_operation,
        'instance_id', target_instance_id
      ),
      null,
      null,
      target_created_by_user_id,
      null
    ) returning id into target_job_command_id;

    insert into app_private.publication_jobs (
      organization_id,
      creation_command_id,
      idempotency_key,
      request_fingerprint,
      batch_id,
      schedule_id,
      publication_id,
      target_version_id,
      target_instance_id,
      operation,
      capability_code,
      external_effect_key,
      priority,
      max_attempts,
      available_at,
      created_by_user_id
    ) values (
      target_organization_id,
      target_job_command_id,
      target_job_key,
      extensions.digest(
        target_batch_id::text || ':' || publication_value.id::text || ':' || target_requested_operation,
        'sha256'
      ),
      target_batch_id,
      target_schedule_id,
      publication_value.id,
      publication_value.current_version_id,
      target_instance_id,
      target_requested_operation,
      case target_requested_operation
        when 'publish' then 'page.post.create'
        when 'refresh' then 'page.post.create'
        when 'sync' then 'page.post.update'
      end,
      target_effect_key,
      target_priority,
      target_max_attempts,
      coalesce(target_available_at, statement_timestamp()),
      target_created_by_user_id
    ) returning id into target_job_id;

    update app_private.publication_commands
    set
      result_type = 'publication_job',
      result_id = target_job_id,
      completed_at = statement_timestamp()
    where organization_id = target_organization_id
      and id = target_job_command_id;

    perform app_private.insert_publication_event(
      target_organization_id,
      target_job_command_id,
      'publication_job',
      target_job_id,
      'publication_job.enqueued',
      null,
      'pending',
      null,
      jsonb_build_object(
        'batch_id', target_batch_id,
        'operation', target_requested_operation,
        'publication_id', publication_value.id,
        'version_id', publication_value.current_version_id
      ),
      target_created_by_user_id
    );
    target_jobs_created := target_jobs_created + 1;
  end loop;

  update app_private.publication_batches
  set
    status = case when target_jobs_created = 0 then 'completed' else 'queued' end,
    completed_at = case when target_jobs_created = 0 then statement_timestamp() end
  where organization_id = target_organization_id
    and id = target_batch_id;

  if target_trigger_kind = 'schedule' then
    update app_private.publication_schedules
    set
      last_enqueued_at = target_schedule_occurrence_at,
      next_run_at = target_next_schedule_run_at
    where organization_id = target_organization_id
      and id = target_schedule_id;
  end if;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_batch_id,
    'publication_batch.enqueued',
    'expanding',
    case when target_jobs_created = 0 then 'completed' else 'queued' end,
    null,
    jsonb_build_object(
      'jobs_created', target_jobs_created,
      'trigger_kind', target_trigger_kind,
      'operation', target_requested_operation,
      'schedule_occurrence_at', target_schedule_occurrence_at
    ),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_batch_id
  );

  return query select target_batch_id, target_jobs_created, false;
end;
$$;

create function api.claim_publication_job(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_now timestamptz default statement_timestamp()
)
returns table (
  publication_job_id uuid,
  organization_id uuid,
  publication_id uuid,
  target_version_id uuid,
  target_instance_id uuid,
  operation text,
  capability_code text,
  external_effect_key text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_job app_private.publication_jobs%rowtype;
  generated_lease_token uuid;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'publication worker identifier is invalid';
  end if;
  if target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'publication job lease must be between 15 and 900 seconds';
  end if;

  generated_lease_token := extensions.gen_random_uuid();

  select job_value.* into claimed_job
  from app_private.publication_jobs as job_value
  left join app_private.publication_batches as batch_value
    on batch_value.organization_id = job_value.organization_id
    and batch_value.id = job_value.batch_id
  where job_value.status in ('pending', 'retryable')
    and job_value.available_at <= target_now
    and job_value.attempt_count < job_value.max_attempts
    and (
      batch_value.id is null
      or batch_value.status not in ('paused', 'cancelling', 'completed', 'partially_failed', 'cancelled')
    )
  order by job_value.priority, job_value.available_at, job_value.created_at, job_value.id
  for update of job_value skip locked
  limit 1;

  if not found then
    return;
  end if;

  update app_private.publication_jobs as claimed_target
  set
    status = 'processing',
    attempt_count = claimed_target.attempt_count + 1,
    lease_token = generated_lease_token,
    processing_started_at = target_now,
    lease_expires_at = target_now + make_interval(secs => target_lease_seconds),
    authorized_at = null,
    authorization_snapshot = null,
    effect_started_at = null,
    provider_request_id = null,
    last_error_class = null,
    last_error_code = null,
    last_error_summary = null
  where claimed_target.organization_id = claimed_job.organization_id
    and claimed_target.id = claimed_job.id;

  if claimed_job.batch_id is not null then
    update app_private.publication_batches
    set status = 'running'
    where app_private.publication_batches.organization_id = claimed_job.organization_id
      and app_private.publication_batches.id = claimed_job.batch_id
      and app_private.publication_batches.status in ('pending', 'queued');
  end if;

  perform app_private.insert_publication_event(
    claimed_job.organization_id,
    null,
    'publication_job',
    claimed_job.id,
    'publication_job.claimed',
    claimed_job.status,
    'processing',
    null,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'lease_token', generated_lease_token,
      'lease_expires_at', target_now + make_interval(secs => target_lease_seconds),
      'attempt_count', claimed_job.attempt_count + 1
    ),
    null,
    target_now
  );

  return query select
    claimed_job.id,
    claimed_job.organization_id,
    claimed_job.publication_id,
    claimed_job.target_version_id,
    claimed_job.target_instance_id,
    claimed_job.operation,
    claimed_job.capability_code,
    claimed_job.external_effect_key,
    generated_lease_token,
    target_now + make_interval(secs => target_lease_seconds),
    claimed_job.attempt_count + 1;
end;
$$;

create function api.transition_publication(
  target_organization_id uuid,
  target_publication_id uuid,
  target_idempotency_key text,
  target_status text,
  target_reason text,
  target_created_by_user_id uuid default null
)
returns table (publication_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  publication_value app_private.publications%rowtype;
  request_payload jsonb;
begin
  if target_status not in ('active', 'paused', 'retired') then
    raise exception using errcode = '22023', message = 'publication transition status is invalid';
  end if;

  request_payload := jsonb_build_object(
    'publication_id', target_publication_id,
    'status', target_status,
    'reason', target_reason
  );
  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication.transition',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    return query select target_publication_id, true;
    return;
  end if;

  select publication_row.* into publication_value
  from app_private.publications as publication_row
  where publication_row.organization_id = target_organization_id
    and publication_row.id = target_publication_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication was not found';
  end if;

  update app_private.publications
  set
    status = target_status,
    retired_at = case when target_status = 'retired' then statement_timestamp() end
  where organization_id = target_organization_id
    and id = target_publication_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication',
    target_publication_id,
    'publication.transitioned',
    publication_value.status,
    target_status,
    target_reason,
    '{}'::jsonb,
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication',
    target_publication_id
  );

  return query select target_publication_id, false;
end;
$$;

create function api.enqueue_publication_job(
  target_organization_id uuid,
  target_idempotency_key text,
  target_publication_id uuid,
  target_operation text,
  target_capability_code text,
  target_external_effect_key text,
  target_version_id uuid default null,
  target_instance_id uuid default null,
  target_available_at timestamptz default statement_timestamp(),
  target_priority integer default 100,
  target_max_attempts integer default 8,
  target_created_by_user_id uuid default null
)
returns table (publication_job_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  target_job_id uuid;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'publication_id', target_publication_id,
    'operation', target_operation,
    'capability_code', target_capability_code,
    'external_effect_key', target_external_effect_key,
    'version_id', target_version_id,
    'instance_id', target_instance_id,
    'available_at', target_available_at,
    'priority', target_priority,
    'max_attempts', target_max_attempts
  );

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_job.enqueue',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select command_value.result_id into target_job_id
    from app_private.publication_commands as command_value
    where command_value.organization_id = target_organization_id
      and command_value.id = target_command_id;
    return query select target_job_id, true;
    return;
  end if;

  insert into app_private.publication_jobs (
    organization_id,
    creation_command_id,
    idempotency_key,
    request_fingerprint,
    publication_id,
    target_version_id,
    target_instance_id,
    operation,
    capability_code,
    external_effect_key,
    priority,
    max_attempts,
    available_at,
    created_by_user_id
  ) values (
    target_organization_id,
    target_command_id,
    target_idempotency_key,
    extensions.digest(request_payload::text, 'sha256'),
    target_publication_id,
    target_version_id,
    target_instance_id,
    target_operation,
    target_capability_code,
    target_external_effect_key,
    target_priority,
    target_max_attempts,
    coalesce(target_available_at, statement_timestamp()),
    target_created_by_user_id
  ) returning id into target_job_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_job',
    target_job_id,
    'publication_job.enqueued',
    null,
    'pending',
    null,
    jsonb_build_object(
      'operation', target_operation,
      'publication_id', target_publication_id,
      'version_id', target_version_id,
      'instance_id', target_instance_id
    ),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_job',
    target_job_id
  );

  return query select target_job_id, false;
end;
$$;

create function api.authorize_publication_job(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_lease_token uuid,
  target_now timestamptz default statement_timestamp()
)
returns table (authorization_status text, authorization_reason text, authorization_snapshot jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_value app_private.publication_jobs%rowtype;
  publication_value app_private.publications%rowtype;
  connection_value app_private.social_connections%rowtype;
  version_value app_private.publication_versions%rowtype;
  variant_value record;
  capability_value record;
  price_is_current boolean := true;
  tracking_count integer := 0;
  direct_available numeric := 0;
  composed_available numeric := 0;
  availability_value jsonb;
  snapshot_value jsonb;
  block_reason text;
begin
  select job_row.* into job_value
  from app_private.publication_jobs as job_row
  where job_row.organization_id = target_organization_id
    and job_row.id = target_publication_job_id
  for update;

  if not found
    or job_value.status <> 'processing'
    or job_value.lease_token is distinct from target_lease_token
    or job_value.lease_expires_at <= target_now then
    raise exception using errcode = '40001', message = 'publication job lease is not active';
  end if;

  select publication_row.* into publication_value
  from app_private.publications as publication_row
  where publication_row.organization_id = target_organization_id
    and publication_row.id = job_value.publication_id;

  select connection_row.* into connection_value
  from app_private.social_connections as connection_row
  where connection_row.organization_id = target_organization_id
    and connection_row.id = publication_value.social_connection_id;

  if job_value.target_version_id is not null then
    select version_row.* into version_value
    from app_private.publication_versions as version_row
    where version_row.organization_id = target_organization_id
      and version_row.publication_id = job_value.publication_id
      and version_row.id = job_value.target_version_id;
  end if;

  select
    variant_row.id,
    variant_row.status as variant_status,
    variant_row.updated_at,
    product_row.status as product_status
  into variant_value
  from app_private.product_variants as variant_row
  join app_private.products as product_row
    on product_row.organization_id = variant_row.organization_id
    and product_row.id = variant_row.product_id
  where variant_row.organization_id = target_organization_id
    and variant_row.id = publication_value.variant_id;

  select
    capability_row.id,
    capability_row.status,
    capability_row.capability_constraints,
    capability_row.observed_at,
    capability_row.valid_until
  into capability_value
  from app_private.social_capabilities as capability_row
  where capability_row.organization_id = target_organization_id
    and capability_row.social_connection_id = publication_value.social_connection_id
    and capability_row.capability_code = job_value.capability_code
  order by capability_row.observed_at desc, capability_row.created_at desc, capability_row.id desc
  limit 1;

  if job_value.target_version_id is not null and version_value.source_price_tier_id is not null then
    select exists (
      select 1
      from app_private.price_tiers as tier
      join app_private.price_books as book
        on book.organization_id = tier.organization_id
        and book.id = tier.price_book_id
      where tier.organization_id = target_organization_id
        and tier.id = version_value.source_price_tier_id
        and tier.variant_id = publication_value.variant_id
        and tier.pricing_status = version_value.pricing_status
        and tier.calculation_method is not distinct from version_value.calculation_method
        and tier.price_amount is not distinct from version_value.price_amount
        and book.currency_code is not distinct from version_value.currency_code
        and tier.valid_from is not distinct from version_value.source_price_valid_from
        and tier.superseded_at is null
        and tier.valid_from <= target_now
        and (tier.valid_until is null or tier.valid_until > target_now)
        and book.status = 'active'
    ) into price_is_current;
  end if;

  select count(*)::integer, coalesce(sum(availability.available_quantity), 0::numeric)
  into tracking_count, direct_available
  from (
    select
      item.id,
      coalesce(sum(balance.available_quantity), 0::numeric) as available_quantity
    from app_private.inventory_items as item
    left join app_private.inventory_balances as balance
      on balance.organization_id = item.organization_id
      and balance.inventory_item_id = item.id
    where item.organization_id = target_organization_id
      and item.variant_id = publication_value.variant_id
      and item.status = 'active'
    group by item.id
  ) as availability;

  select
    tracking_count + count(*)::integer,
    coalesce(max(composition_availability.available_sale_quantity), 0::numeric)
  into tracking_count, composed_available
  from api.inventory_composition_availability as composition_availability
  where composition_availability.organization_id = target_organization_id
    and composition_availability.offered_variant_id = publication_value.variant_id;

  availability_value := app_private.publication_availability_snapshot(
    target_organization_id,
    publication_value.variant_id,
    target_now
  );

  if connection_value.id is null or connection_value.status <> 'active' then
    block_reason := 'social_connection_not_active';
  elsif capability_value.id is null
    or capability_value.status <> 'granted'
    or (capability_value.valid_until is not null and capability_value.valid_until <= target_now) then
    block_reason := 'required_capability_not_granted';
  elsif job_value.operation in ('publish', 'refresh', 'sync')
    and (
      publication_value.status <> 'active'
      or publication_value.current_version_id is distinct from job_value.target_version_id
      or version_value.status <> 'approved'
    ) then
    block_reason := 'publication_version_not_current';
  elsif job_value.operation in ('publish', 'refresh', 'sync')
    and (
      variant_value.id is null
      or variant_value.variant_status <> 'active'
      or variant_value.product_status <> 'active'
    ) then
    block_reason := 'catalog_offer_not_active';
  elsif job_value.operation in ('publish', 'refresh', 'sync')
    and job_value.target_version_id is not null
    and version_value.source_variant_updated_at is distinct from variant_value.updated_at then
    block_reason := 'catalog_snapshot_stale';
  elsif job_value.operation in ('publish', 'refresh', 'sync') and not price_is_current then
    block_reason := 'price_snapshot_stale';
  elsif job_value.operation in ('publish', 'refresh', 'sync')
    and tracking_count > 0
    and greatest(direct_available, composed_available) <= 0 then
    block_reason := 'stock_unavailable';
  end if;

  snapshot_value := jsonb_build_object(
    'evaluated_at', target_now,
    'connection_id', connection_value.id,
    'connection_status', connection_value.status,
    'capability_id', capability_value.id,
    'capability_status', capability_value.status,
    'capability_observed_at', capability_value.observed_at,
    'capability_valid_until', capability_value.valid_until,
    'capability_constraints', capability_value.capability_constraints,
    'publication_id', publication_value.id,
    'publication_status', publication_value.status,
    'publication_version_id', job_value.target_version_id,
    'variant_id', publication_value.variant_id,
    'variant_updated_at', variant_value.updated_at,
    'price_is_current', price_is_current,
    'inventory_tracking_count', tracking_count,
    'direct_available_quantity', direct_available,
    'composition_available_quantity', composed_available,
    'availability', availability_value,
    'decision', case when block_reason is null then 'allowed' else 'blocked' end,
    'reason', block_reason
  );

  if block_reason is not null then
    update app_private.publication_jobs
    set
      status = 'blocked',
      authorized_at = target_now,
      authorization_snapshot = snapshot_value,
      lease_token = null,
      processing_started_at = null,
      lease_expires_at = null,
      last_error_class = 'policy',
      last_error_code = block_reason,
      last_error_summary = jsonb_build_object('reason', block_reason),
      completed_at = target_now
    where organization_id = target_organization_id
      and id = target_publication_job_id;

    perform app_private.insert_publication_event(
      target_organization_id,
      null,
      'publication_job',
      target_publication_job_id,
      'publication_job.blocked',
      'processing',
      'blocked',
      block_reason,
      snapshot_value,
      null,
      target_now
    );

    return query select 'blocked'::text, block_reason, snapshot_value;
    return;
  end if;

  update app_private.publication_jobs
  set
    authorized_at = target_now,
    authorization_snapshot = snapshot_value
  where organization_id = target_organization_id
    and id = target_publication_job_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    null,
    'publication_job',
    target_publication_job_id,
    'publication_job.authorized',
    'processing',
    'processing',
    null,
    snapshot_value,
    null,
    target_now
  );

  return query select 'allowed'::text, null::text, snapshot_value;
end;
$$;

create function api.mark_publication_effect_started(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_lease_token uuid,
  target_started_at timestamptz default statement_timestamp()
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_effect_started_at timestamptz;
begin
  update app_private.publication_jobs
  set effect_started_at = coalesce(effect_started_at, target_started_at)
  where organization_id = target_organization_id
    and id = target_publication_job_id
    and status = 'processing'
    and lease_token = target_lease_token
    and lease_expires_at > target_started_at
    and authorized_at is not null
  returning effect_started_at into target_effect_started_at;

  if not found then
    raise exception using
      errcode = '40001',
      message = 'publication effect cannot start without an active authorized lease';
  end if;

  return target_effect_started_at;
end;
$$;

create function api.record_publication_job_result(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_lease_token uuid,
  target_outcome text,
  target_effect_certainty text,
  target_provider_request_id text default null,
  target_external_publication_id text default null,
  target_external_url text default null,
  target_instance_status text default null,
  target_response_summary jsonb default '{}'::jsonb,
  target_error_class text default null,
  target_error_code text default null,
  target_error_summary jsonb default null,
  target_retry_at timestamptz default null,
  target_occurred_at timestamptz default statement_timestamp()
)
returns table (publication_job_id uuid, publication_instance_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_value app_private.publication_jobs%rowtype;
  publication_value app_private.publications%rowtype;
  target_instance_id uuid;
  target_final_status text;
begin
  if target_outcome not in ('succeeded', 'retryable', 'failed', 'blocked', 'cancelled', 'uncertain') then
    raise exception using errcode = '22023', message = 'publication job outcome is invalid';
  end if;
  if target_effect_certainty not in (
    'not_started', 'confirmed_applied', 'confirmed_not_applied', 'unknown'
  ) then
    raise exception using errcode = '22023', message = 'publication effect certainty is invalid';
  end if;
  if target_response_summary is null or jsonb_typeof(target_response_summary) <> 'object'
    or (target_error_summary is not null and jsonb_typeof(target_error_summary) <> 'object') then
    raise exception using errcode = '22023', message = 'publication result summaries must be objects';
  end if;

  select job_row.* into job_value
  from app_private.publication_jobs as job_row
  where job_row.organization_id = target_organization_id
    and job_row.id = target_publication_job_id
  for update;

  if not found
    or job_value.status <> 'processing'
    or job_value.lease_token is distinct from target_lease_token then
    raise exception using errcode = '40001', message = 'publication job result lease is not active';
  end if;

  if target_outcome = 'succeeded' and target_effect_certainty <> 'confirmed_applied' then
    raise exception using errcode = '23514', message = 'successful publication requires confirmed effect';
  end if;
  if target_outcome = 'uncertain'
    and (target_effect_certainty <> 'unknown' or job_value.effect_started_at is null) then
    raise exception using errcode = '23514', message = 'uncertain publication requires a started unknown effect';
  end if;
  if target_outcome in ('retryable', 'failed', 'blocked', 'cancelled')
    and target_effect_certainty not in ('not_started', 'confirmed_not_applied') then
    raise exception using
      errcode = '23514',
      message = 'non-success publication outcome cannot hide a possible external effect';
  end if;
  if target_outcome = 'retryable'
    and (
      target_retry_at is null
      or target_retry_at <= target_occurred_at
      or job_value.attempt_count >= job_value.max_attempts
    ) then
    raise exception using errcode = '23514', message = 'retryable publication requires a future retry and attempts remaining';
  end if;
  if target_outcome <> 'retryable' and target_retry_at is not null then
    raise exception using errcode = '23514', message = 'only retryable publication can define retry time';
  end if;

  if target_outcome = 'succeeded' then
    if job_value.effect_started_at is null or job_value.authorized_at is null then
      raise exception using errcode = '23514', message = 'successful publication requires authorized started effect';
    end if;

    select publication_row.* into publication_value
    from app_private.publications as publication_row
    where publication_row.organization_id = target_organization_id
      and publication_row.id = job_value.publication_id;

    if job_value.operation in ('publish', 'refresh')
      or (job_value.operation = 'reconcile' and job_value.target_instance_id is null) then
      if target_external_publication_id is null or target_instance_status is null then
        raise exception using
          errcode = '23514',
          message = 'successful publication creation requires external identity and instance status';
      end if;

      insert into app_private.publication_instances (
        organization_id,
        social_connection_id,
        publication_id,
        publication_version_id,
        creation_job_id,
        external_publication_id,
        external_url,
        status,
        provider_created_at,
        provider_updated_at,
        last_reconciled_at,
        response_summary
      ) values (
        target_organization_id,
        publication_value.social_connection_id,
        job_value.publication_id,
        coalesce(job_value.target_version_id, publication_value.current_version_id),
        target_publication_job_id,
        target_external_publication_id,
        target_external_url,
        target_instance_status,
        target_occurred_at,
        target_occurred_at,
        target_occurred_at,
        target_response_summary
      ) returning id into target_instance_id;
    elsif job_value.target_instance_id is not null then
      update app_private.publication_instances as instance_target
      set
        external_url = coalesce(target_external_url, instance_target.external_url),
        status = coalesce(target_instance_status, instance_target.status),
        provider_updated_at = target_occurred_at,
        last_reconciled_at = target_occurred_at,
        response_summary = target_response_summary
      where instance_target.organization_id = target_organization_id
        and instance_target.id = job_value.target_instance_id
      returning id into target_instance_id;
    end if;
  end if;

  target_final_status := target_outcome;
  update app_private.publication_jobs as result_job
  set
    status = target_final_status,
    available_at = case
      when target_final_status = 'retryable' then target_retry_at
      else result_job.available_at
    end,
    lease_token = null,
    processing_started_at = null,
    lease_expires_at = null,
    effect_started_at = case
      when target_final_status in ('succeeded', 'uncertain') then result_job.effect_started_at
      else null
    end,
    provider_request_id = target_provider_request_id,
    last_error_class = target_error_class,
    last_error_code = target_error_code,
    last_error_summary = target_error_summary,
    completed_at = case when target_final_status = 'retryable' then null else target_occurred_at end
  where result_job.organization_id = target_organization_id
    and result_job.id = target_publication_job_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    null,
    'publication_job',
    target_publication_job_id,
    'publication_job.result_recorded',
    'processing',
    target_final_status,
    target_error_code,
    jsonb_build_object(
      'effect_certainty', target_effect_certainty,
      'provider_request_id', target_provider_request_id,
      'publication_instance_id', target_instance_id,
      'retry_at', target_retry_at,
      'response_summary', target_response_summary,
      'error_summary', target_error_summary
    ),
    null,
    target_occurred_at
  );

  if target_instance_id is not null then
    perform app_private.insert_publication_event(
      target_organization_id,
      null,
      'publication_instance',
      target_instance_id,
      'publication_instance.reconciled',
      null,
      target_instance_status,
      null,
      jsonb_build_object(
        'job_id', target_publication_job_id,
        'operation', job_value.operation,
        'external_publication_id', target_external_publication_id
      ),
      null,
      target_occurred_at
    );
  end if;

  return query select target_publication_job_id, target_instance_id, target_final_status;
end;
$$;

create function api.recover_expired_publication_job(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_now timestamptz default statement_timestamp()
)
returns table (publication_job_id uuid, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_value app_private.publication_jobs%rowtype;
  target_status text;
begin
  select job_row.* into job_value
  from app_private.publication_jobs as job_row
  where job_row.organization_id = target_organization_id
    and job_row.id = target_publication_job_id
  for update;

  if not found
    or job_value.status <> 'processing'
    or job_value.lease_expires_at > target_now then
    raise exception using errcode = '40001', message = 'publication job lease is not expired';
  end if;

  target_status := case
    when job_value.effect_started_at is not null then 'uncertain'
    when job_value.attempt_count < job_value.max_attempts then 'retryable'
    else 'failed'
  end;

  update app_private.publication_jobs
  set
    status = target_status,
    available_at = case when target_status = 'retryable' then target_now else available_at end,
    lease_token = null,
    processing_started_at = null,
    lease_expires_at = null,
    last_error_class = case when target_status = 'uncertain' then 'unknown' else 'transient' end,
    last_error_code = case
      when target_status = 'uncertain' then 'worker_lost_after_effect_started'
      when target_status = 'retryable' then 'worker_lease_expired_before_effect'
      else 'worker_lease_expired_attempts_exhausted'
    end,
    last_error_summary = jsonb_build_object(
      'expired_lease_token', job_value.lease_token,
      'effect_started_at', job_value.effect_started_at,
      'attempt_count', job_value.attempt_count
    ),
    completed_at = case when target_status in ('uncertain', 'failed') then target_now end
  where organization_id = target_organization_id
    and id = target_publication_job_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    null,
    'publication_job',
    target_publication_job_id,
    'publication_job.lease_recovered',
    'processing',
    target_status,
    case
      when target_status = 'uncertain' then 'worker_lost_after_effect_started'
      else 'worker_lease_expired_before_effect'
    end,
    jsonb_build_object(
      'effect_started_at', job_value.effect_started_at,
      'attempt_count', job_value.attempt_count
    ),
    null,
    target_now
  );

  return query select target_publication_job_id, target_status;
end;
$$;

create function api.cancel_publication_batch(
  target_organization_id uuid,
  target_publication_batch_id uuid,
  target_idempotency_key text,
  target_reason text,
  target_created_by_user_id uuid default null
)
returns table (
  publication_batch_id uuid,
  jobs_cancelled integer,
  jobs_in_flight integer,
  status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  batch_value app_private.publication_batches%rowtype;
  cancelled_count integer;
  in_flight_count integer;
  target_status text;
  request_payload jsonb;
begin
  request_payload := jsonb_build_object(
    'publication_batch_id', target_publication_batch_id,
    'reason', target_reason
  );
  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_batch.cancel',
    request_payload,
    target_created_by_user_id
  );
  target_command_id := command_claim.claimed_command_id;

  select batch_row.* into batch_value
  from app_private.publication_batches as batch_row
  where batch_row.organization_id = target_organization_id
    and batch_row.id = target_publication_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication batch was not found';
  end if;

  if command_claim.was_replayed then
    select count(*) filter (where job_value.status = 'cancelled')::integer,
           count(*) filter (where job_value.status in ('processing', 'uncertain'))::integer
    into cancelled_count, in_flight_count
    from app_private.publication_jobs as job_value
    where job_value.organization_id = target_organization_id
      and job_value.batch_id = target_publication_batch_id;
    return query select
      target_publication_batch_id,
      cancelled_count,
      in_flight_count,
      batch_value.status,
      true;
    return;
  end if;

  if batch_value.status in ('completed', 'partially_failed', 'cancelled') then
    raise exception using errcode = '23514', message = 'terminal publication batch cannot be cancelled';
  end if;

  update app_private.publication_jobs as cancellable_job
  set
    status = 'cancelled',
    last_error_class = 'policy',
    last_error_code = 'batch_cancelled',
    last_error_summary = jsonb_build_object('reason', target_reason),
    completed_at = statement_timestamp()
  where cancellable_job.organization_id = target_organization_id
    and cancellable_job.batch_id = target_publication_batch_id
    and cancellable_job.status in ('pending', 'retryable');
  get diagnostics cancelled_count = row_count;

  select count(*)::integer into in_flight_count
  from app_private.publication_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.batch_id = target_publication_batch_id
    and job_value.status in ('processing', 'uncertain');

  target_status := case when in_flight_count = 0 then 'cancelled' else 'cancelling' end;
  update app_private.publication_batches
  set
    status = target_status,
    cancel_requested_at = statement_timestamp(),
    completed_at = case when target_status = 'cancelled' then statement_timestamp() end
  where organization_id = target_organization_id
    and id = target_publication_batch_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_publication_batch_id,
    'publication_batch.cancel_requested',
    batch_value.status,
    target_status,
    target_reason,
    jsonb_build_object(
      'jobs_cancelled', cancelled_count,
      'jobs_in_flight', in_flight_count
    ),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_publication_batch_id
  );

  return query select
    target_publication_batch_id,
    cancelled_count,
    in_flight_count,
    target_status,
    false;
end;
$$;

create function api.reconcile_publication_batch(
  target_organization_id uuid,
  target_publication_batch_id uuid,
  target_now timestamptz default statement_timestamp()
)
returns table (publication_batch_id uuid, status text, job_counts jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_value app_private.publication_batches%rowtype;
  counts_value jsonb;
  active_count integer;
  failed_count integer;
  cancelled_count integer;
  target_status text;
begin
  select batch_row.* into batch_value
  from app_private.publication_batches as batch_row
  where batch_row.organization_id = target_organization_id
    and batch_row.id = target_publication_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication batch was not found';
  end if;

  select
    jsonb_object_agg(status_counts.status, status_counts.total),
    coalesce(sum(status_counts.total) filter (
      where status_counts.status in ('pending', 'processing', 'retryable')
    ), 0)::integer,
    coalesce(sum(status_counts.total) filter (
      where status_counts.status in ('blocked', 'failed', 'uncertain')
    ), 0)::integer,
    coalesce(sum(status_counts.total) filter (where status_counts.status = 'cancelled'), 0)::integer
  into counts_value, active_count, failed_count, cancelled_count
  from (
    select job_value.status, count(*)::integer as total
    from app_private.publication_jobs as job_value
    where job_value.organization_id = target_organization_id
      and job_value.batch_id = target_publication_batch_id
    group by job_value.status
  ) as status_counts;

  counts_value := coalesce(counts_value, '{}'::jsonb);
  target_status := case
    when active_count > 0 and batch_value.status = 'cancelling' then 'cancelling'
    when active_count > 0 then 'running'
    when batch_value.cancel_requested_at is not null and failed_count = 0 then 'cancelled'
    when failed_count > 0 then 'partially_failed'
    when cancelled_count > 0 then 'cancelled'
    else 'completed'
  end;

  if batch_value.status not in ('completed', 'partially_failed', 'cancelled') then
    update app_private.publication_batches
    set
      status = target_status,
      completed_at = case
        when target_status in ('completed', 'partially_failed', 'cancelled') then target_now
      end
    where organization_id = target_organization_id
      and id = target_publication_batch_id;

    perform app_private.insert_publication_event(
      target_organization_id,
      null,
      'publication_batch',
      target_publication_batch_id,
      'publication_batch.reconciled',
      batch_value.status,
      target_status,
      null,
      jsonb_build_object('job_counts', counts_value),
      null,
      target_now
    );
  else
    target_status := batch_value.status;
  end if;

  return query select target_publication_batch_id, target_status, counts_value;
end;
$$;

alter table app_private.publication_commands enable row level security;
alter table app_private.publication_commands force row level security;
alter table app_private.social_connections enable row level security;
alter table app_private.social_connections force row level security;
alter table app_private.social_capabilities enable row level security;
alter table app_private.social_capabilities force row level security;
alter table app_private.publications enable row level security;
alter table app_private.publications force row level security;
alter table app_private.publication_versions enable row level security;
alter table app_private.publication_versions force row level security;
alter table app_private.publication_media enable row level security;
alter table app_private.publication_media force row level security;
alter table app_private.publication_schedules enable row level security;
alter table app_private.publication_schedules force row level security;
alter table app_private.publication_batches enable row level security;
alter table app_private.publication_batches force row level security;
alter table app_private.publication_jobs enable row level security;
alter table app_private.publication_jobs force row level security;
alter table app_private.publication_instances enable row level security;
alter table app_private.publication_instances force row level security;
alter table app_private.publication_events enable row level security;
alter table app_private.publication_events force row level security;

create policy publication_commands_operator_select
on app_private.publication_commands for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_commands.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy social_connections_admin_select
on app_private.social_connections for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = social_connections.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));

create policy social_capabilities_admin_select
on app_private.social_capabilities for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = social_capabilities.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));

create policy publications_member_select
on app_private.publications for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publications.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy publication_versions_member_select
on app_private.publication_versions for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_versions.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy publication_media_member_select
on app_private.publication_media for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_media.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy publication_schedules_admin_select
on app_private.publication_schedules for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_schedules.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
));

create policy publication_batches_operator_select
on app_private.publication_batches for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_batches.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy publication_jobs_operator_select
on app_private.publication_jobs for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_jobs.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy publication_instances_member_select
on app_private.publication_instances for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_instances.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy publication_events_operator_select
on app_private.publication_events for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = publication_events.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create view api.publication_commands
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
from app_private.publication_commands;

create view api.social_connections
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, provider, surface, external_app_id, external_account_id,
  display_name, api_version, messenger_channel_connection_id, status,
  connected_at, last_verified_at, disabled_at, created_by_user_id, created_at, updated_at
from app_private.social_connections;

create view api.social_capabilities
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, capability_code, status,
  observation_source, capability_constraints, observed_at, valid_until,
  created_by_user_id, created_at
from app_private.social_capabilities;

create view api.current_social_capabilities
with (security_invoker = true, security_barrier = true)
as select distinct on (
  capability.organization_id,
  capability.social_connection_id,
  capability.capability_code
)
  capability.id,
  capability.organization_id,
  capability.social_connection_id,
  capability.capability_code,
  capability.status,
  capability.observation_source,
  capability.capability_constraints,
  capability.observed_at,
  capability.valid_until,
  capability.created_at
from app_private.social_capabilities as capability
order by
  capability.organization_id,
  capability.social_connection_id,
  capability.capability_code,
  capability.observed_at desc,
  capability.created_at desc,
  capability.id desc;

create view api.publications
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, variant_id, status,
  current_version_id, retired_at, created_by_user_id, created_at, updated_at
from app_private.publications;

create view api.publication_versions
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, publication_id, version_number, status, headline, body,
  call_to_action, content_payload, source_price_tier_id, pricing_status,
  calculation_method, price_amount, currency_code, source_variant_updated_at,
  source_price_valid_from, availability_snapshot, approved_by_user_id,
  approved_at, created_by_user_id, created_at
from app_private.publication_versions;

create view api.publication_media
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, publication_version_id, media_asset_id,
  ordinal, media_role, alt_text, created_at
from app_private.publication_media;

create view api.publication_schedules
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, code, name, timezone_name,
  schedule_expression, expression_kind, validation_status, requested_operation,
  selection_criteria, schedule_policy, status, generation, next_run_at,
  last_enqueued_at, retired_at, created_by_user_id, created_at, updated_at
from app_private.publication_schedules;

create view api.publication_batches
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, schedule_id, schedule_generation,
  trigger_kind, requested_operation, status, selection_criteria_snapshot,
  policy_snapshot, schedule_occurrence_at, cancel_requested_at, completed_at,
  created_by_user_id, created_at, updated_at
from app_private.publication_batches;

create view api.publication_jobs
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, batch_id, schedule_id, publication_id, target_version_id,
  target_instance_id, operation, capability_code, status, priority, attempt_count,
  max_attempts, available_at, processing_started_at, lease_expires_at,
  authorized_at, effect_started_at, provider_request_id, last_error_class,
  last_error_code, completed_at, created_by_user_id, created_at, updated_at
from app_private.publication_jobs;

create view api.publication_instances
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, publication_id,
  publication_version_id, creation_job_id, external_publication_id,
  external_url, status, provider_created_at, provider_updated_at,
  last_reconciled_at, created_at, updated_at
from app_private.publication_instances;

create view api.publication_origin_lookup
with (security_invoker = true, security_barrier = true)
as select
  instance.id as publication_instance_id,
  instance.organization_id,
  instance.social_connection_id,
  instance.external_publication_id,
  instance.external_url,
  instance.status as instance_status,
  publication.id as publication_id,
  publication.variant_id,
  instance.publication_version_id,
  version_value.pricing_status,
  version_value.price_amount,
  version_value.currency_code,
  instance.created_at
from app_private.publication_instances as instance
join app_private.publications as publication
  on publication.organization_id = instance.organization_id
  and publication.id = instance.publication_id
join app_private.publication_versions as version_value
  on version_value.organization_id = instance.organization_id
  and version_value.publication_id = instance.publication_id
  and version_value.id = instance.publication_version_id;

create view api.publication_events
with (security_invoker = true, security_barrier = true)
as select
  id, organization_id, social_connection_id, publication_id,
  publication_version_id, schedule_id, batch_id, job_id, instance_id,
  event_type, previous_status, new_status, reason, event_payload,
  created_by_user_id, occurred_at, created_at
from app_private.publication_events;

revoke all on
  app_private.publication_commands,
  app_private.social_connections,
  app_private.social_capabilities,
  app_private.publications,
  app_private.publication_versions,
  app_private.publication_media,
  app_private.publication_schedules,
  app_private.publication_batches,
  app_private.publication_jobs,
  app_private.publication_instances,
  app_private.publication_events
from public, anon, authenticated, service_role;

revoke all on
  api.publication_commands,
  api.social_connections,
  api.social_capabilities,
  api.current_social_capabilities,
  api.publications,
  api.publication_versions,
  api.publication_media,
  api.publication_schedules,
  api.publication_batches,
  api.publication_jobs,
  api.publication_instances,
  api.publication_origin_lookup,
  api.publication_events
from public, anon, authenticated, service_role;

grant select (
  id, organization_id, operation, result_type, result_id,
  created_by_user_id, completed_at, created_at
) on app_private.publication_commands to authenticated;

grant select (
  id, organization_id, provider, surface, external_app_id, external_account_id,
  display_name, api_version, messenger_channel_connection_id, status,
  connected_at, last_verified_at, disabled_at, created_by_user_id, created_at, updated_at
) on app_private.social_connections to authenticated;

grant select (
  id, organization_id, social_connection_id, capability_code, status,
  observation_source, capability_constraints, observed_at, valid_until,
  created_by_user_id, created_at
) on app_private.social_capabilities to authenticated;

grant select on
  app_private.publications,
  app_private.publication_versions,
  app_private.publication_media,
  app_private.publication_schedules,
  app_private.publication_batches,
  app_private.publication_jobs,
  app_private.publication_instances,
  app_private.publication_events
to authenticated;

grant select on
  app_private.publication_commands,
  app_private.social_connections,
  app_private.social_capabilities,
  app_private.publications,
  app_private.publication_versions,
  app_private.publication_media,
  app_private.publication_schedules,
  app_private.publication_batches,
  app_private.publication_jobs,
  app_private.publication_instances,
  app_private.publication_events
to service_role;

grant select on
  api.publication_commands,
  api.social_connections,
  api.social_capabilities,
  api.current_social_capabilities,
  api.publications,
  api.publication_versions,
  api.publication_media,
  api.publication_schedules,
  api.publication_batches,
  api.publication_jobs,
  api.publication_instances,
  api.publication_origin_lookup,
  api.publication_events
to authenticated, service_role;

revoke all on function app_private.assert_publication_actor(uuid, uuid, text[])
  from public, anon, authenticated, service_role;
revoke all on function app_private.claim_publication_command(uuid, text, text, jsonb, uuid, text[])
  from public, anon, authenticated, service_role;
revoke all on function app_private.complete_publication_command(uuid, uuid, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.insert_publication_event(
  uuid, uuid, text, uuid, text, text, text, text, jsonb, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function app_private.publication_availability_snapshot(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function app_private.reject_publication_history_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_command_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_social_connection()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_social_connection_reassignment()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_version()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_version_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_media()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_current_version()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_reassignment()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_schedule()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_schedule_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_batch()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_batch_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_job_scope()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_job_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_publication_instance()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_publication_instance_reassignment()
  from public, anon, authenticated, service_role;

revoke all on function api.register_social_connection(
  uuid, text, text, text, text, text, text, text, uuid, timestamptz, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.observe_social_capability(
  uuid, text, uuid, text, text, text, jsonb, jsonb, timestamptz, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.transition_social_connection(
  uuid, uuid, text, text, text, text, text, text, text, text, uuid,
  timestamptz, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_publication(uuid, text, uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.create_publication_version(
  uuid, text, uuid, text, text, text, jsonb, uuid, jsonb, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.approve_publication_version(uuid, text, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.create_publication_schedule(
  uuid, text, uuid, text, text, text, text, text, jsonb, jsonb, text, text, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.transition_publication_schedule(
  uuid, uuid, text, text, text, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.enqueue_publication_batch(
  uuid, text, uuid, text, text, jsonb, jsonb, jsonb, timestamptz, integer, integer,
  uuid, integer, timestamptz, timestamptz, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.claim_publication_job(text, integer, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function api.transition_publication(uuid, uuid, text, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.enqueue_publication_job(
  uuid, text, uuid, text, text, text, uuid, uuid, timestamptz, integer, integer, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.authorize_publication_job(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function api.mark_publication_effect_started(uuid, uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function api.record_publication_job_result(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, jsonb,
  timestamptz, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.recover_expired_publication_job(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;
revoke all on function api.cancel_publication_batch(uuid, uuid, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.reconcile_publication_batch(uuid, uuid, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function api.register_social_connection(
  uuid, text, text, text, text, text, text, text, uuid, timestamptz, timestamptz, uuid
) to service_role;
grant execute on function api.observe_social_capability(
  uuid, text, uuid, text, text, text, jsonb, jsonb, timestamptz, timestamptz, uuid
) to service_role;
grant execute on function api.transition_social_connection(
  uuid, uuid, text, text, text, text, text, text, text, text, uuid,
  timestamptz, timestamptz, uuid
) to service_role;
grant execute on function api.create_publication(uuid, text, uuid, uuid, uuid)
  to service_role;
grant execute on function api.create_publication_version(
  uuid, text, uuid, text, text, text, jsonb, uuid, jsonb, uuid
) to service_role;
grant execute on function api.approve_publication_version(uuid, text, uuid, text, text, uuid)
  to service_role;
grant execute on function api.create_publication_schedule(
  uuid, text, uuid, text, text, text, text, text, jsonb, jsonb, text, text, timestamptz, uuid
) to service_role;
grant execute on function api.transition_publication_schedule(
  uuid, uuid, text, text, text, timestamptz, uuid
) to service_role;
grant execute on function api.enqueue_publication_batch(
  uuid, text, uuid, text, text, jsonb, jsonb, jsonb, timestamptz, integer, integer,
  uuid, integer, timestamptz, timestamptz, uuid
) to service_role;
grant execute on function api.claim_publication_job(text, integer, timestamptz)
  to service_role;
grant execute on function api.transition_publication(uuid, uuid, text, text, text, uuid)
  to service_role;
grant execute on function api.enqueue_publication_job(
  uuid, text, uuid, text, text, text, uuid, uuid, timestamptz, integer, integer, uuid
) to service_role;
grant execute on function api.authorize_publication_job(uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function api.mark_publication_effect_started(uuid, uuid, uuid, timestamptz)
  to service_role;
grant execute on function api.record_publication_job_result(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, jsonb,
  timestamptz, timestamptz
) to service_role;
grant execute on function api.recover_expired_publication_job(uuid, uuid, timestamptz)
  to service_role;
grant execute on function api.cancel_publication_batch(uuid, uuid, text, text, uuid)
  to service_role;
grant execute on function api.reconcile_publication_batch(uuid, uuid, timestamptz)
  to service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;

comment on table app_private.publication_commands is
  'Idempotency ledger for explicit publication and scheduling tool contracts';
comment on table app_private.social_connections is
  'Facebook Page connection metadata with secret references only; capability is separate evidence';
comment on table app_private.social_capabilities is
  'Append-only observed capability facts; documentation alone never grants an operation';
comment on table app_private.publications is
  'Logical publication intent for one universal catalog variant on one social surface';
comment on table app_private.publication_versions is
  'Immutable approved content, price and availability evidence captured before external work';
comment on table app_private.publication_media is
  'Ordered verified image evidence attached to one immutable publication version';
comment on table app_private.publication_schedules is
  'Versioned timezone-aware scheduling contract; cron transport is attached later in B4';
comment on table app_private.publication_batches is
  'Durable expansion of one manual, scheduled or catalog-sync publication request';
comment on table app_private.publication_jobs is
  'Lease-based external effect state machine with explicit authorization and uncertainty';
comment on table app_private.publication_instances is
  'One externally observed Page publication instance; refreshing creates another instance';
comment on table app_private.publication_events is
  'Append-only publication state and provenance ledger';
comment on function api.authorize_publication_job(uuid, uuid, uuid, timestamptz) is
  'Revalidates connection, observed capability, catalog, version, price and tracked stock immediately before an external effect';
comment on function api.record_publication_job_result(
  uuid, uuid, uuid, text, text, text, text, text, text, jsonb, text, text, jsonb,
  timestamptz, timestamptz
) is 'Records provider result without blind retry after a possibly applied effect';

commit;
