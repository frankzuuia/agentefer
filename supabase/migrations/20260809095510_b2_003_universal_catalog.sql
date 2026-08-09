begin;

alter table app_private.conversations
  add constraint conversations_organization_id_id_unique
  unique (organization_id, id);

alter table app_private.messages
  add constraint messages_organization_id_id_unique
  unique (organization_id, id);

create table app_private.catalog_categories (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'draft',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_categories_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_categories_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint catalog_categories_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_categories_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint catalog_categories_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint catalog_categories_description_valid
    check (
      description is null
      or (
        description = btrim(description)
        and char_length(description) between 1 and 4000
      )
    ),
  constraint catalog_categories_status_valid
    check (status in ('draft', 'active', 'retired'))
);

create unique index catalog_categories_organization_code_unique
  on app_private.catalog_categories (organization_id, lower(code));

create table app_private.catalog_units (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name_singular text not null,
  name_plural text not null,
  symbol text,
  quantity_kind text not null,
  decimal_scale smallint not null default 0,
  status text not null default 'active',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_units_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_units_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint catalog_units_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_units_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint catalog_units_names_valid
    check (
      name_singular = btrim(name_singular)
      and char_length(name_singular) between 1 and 100
      and name_plural = btrim(name_plural)
      and char_length(name_plural) between 1 and 100
    ),
  constraint catalog_units_symbol_valid
    check (
      symbol is null
      or (symbol = btrim(symbol) and char_length(symbol) between 1 and 24)
    ),
  constraint catalog_units_quantity_kind_valid
    check (
      quantity_kind = lower(btrim(quantity_kind))
      and quantity_kind ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint catalog_units_decimal_scale_valid
    check (decimal_scale between 0 and 9),
  constraint catalog_units_status_valid
    check (status in ('active', 'retired'))
);

create unique index catalog_units_organization_code_unique
  on app_private.catalog_units (organization_id, lower(code));

create table app_private.catalog_attribute_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  category_id uuid not null,
  code text not null,
  name text not null,
  description text,
  scope text not null,
  value_type text not null,
  cardinality_min smallint not null default 0,
  cardinality_max smallint not null default 1,
  allows_unit boolean not null default false,
  required_on_activation boolean not null default false,
  is_public boolean not null default true,
  is_filterable boolean not null default false,
  is_searchable boolean not null default true,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_attribute_definitions_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_attribute_definitions_organization_category_code_unique
    unique (organization_id, category_id, code),
  constraint catalog_attribute_definitions_category_fk
    foreign key (organization_id, category_id)
    references app_private.catalog_categories (organization_id, id)
    on delete restrict,
  constraint catalog_attribute_definitions_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_attribute_definitions_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint catalog_attribute_definitions_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint catalog_attribute_definitions_description_valid
    check (
      description is null
      or (
        description = btrim(description)
        and char_length(description) between 1 and 4000
      )
    ),
  constraint catalog_attribute_definitions_scope_valid
    check (scope in ('product', 'variant')),
  constraint catalog_attribute_definitions_value_type_valid
    check (
      value_type in ('text', 'integer', 'decimal', 'boolean', 'date', 'timestamp', 'option')
    ),
  constraint catalog_attribute_definitions_cardinality_valid
    check (
      cardinality_min between 0 and cardinality_max
      and cardinality_max between 1 and 100
      and (not required_on_activation or cardinality_min > 0)
    ),
  constraint catalog_attribute_definitions_unit_contract_valid
    check (value_type in ('integer', 'decimal') or not allows_unit),
  constraint catalog_attribute_definitions_sort_order_valid
    check (sort_order between -1000000 and 1000000),
  constraint catalog_attribute_definitions_status_valid
    check (status in ('active', 'retired'))
);

create index catalog_attribute_definitions_category_scope_idx
  on app_private.catalog_attribute_definitions (
    organization_id,
    category_id,
    scope,
    sort_order,
    id
  )
  where status = 'active';

create table app_private.catalog_attribute_options (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  attribute_definition_id uuid not null,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_attribute_options_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_attribute_options_definition_code_unique
    unique (organization_id, attribute_definition_id, code),
  constraint catalog_attribute_options_definition_fk
    foreign key (organization_id, attribute_definition_id)
    references app_private.catalog_attribute_definitions (organization_id, id)
    on delete restrict,
  constraint catalog_attribute_options_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint catalog_attribute_options_label_valid
    check (label = btrim(label) and char_length(label) between 1 and 160),
  constraint catalog_attribute_options_sort_order_valid
    check (sort_order between -1000000 and 1000000),
  constraint catalog_attribute_options_status_valid
    check (status in ('active', 'retired'))
);

create table app_private.catalog_attribute_allowed_units (
  organization_id uuid not null,
  attribute_definition_id uuid not null,
  unit_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, attribute_definition_id, unit_id),
  constraint catalog_attribute_allowed_units_definition_fk
    foreign key (organization_id, attribute_definition_id)
    references app_private.catalog_attribute_definitions (organization_id, id)
    on delete restrict,
  constraint catalog_attribute_allowed_units_unit_fk
    foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict
);

create table app_private.media_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  content_sha256 bytea not null,
  mime_type text not null,
  byte_size bigint not null,
  width_pixels integer,
  height_pixels integer,
  duration_milliseconds bigint,
  original_file_name text,
  source_kind text not null,
  source_message_id uuid,
  ingest_status text not null default 'received',
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_organization_id_id_unique
    unique (organization_id, id),
  constraint media_assets_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint media_assets_source_message_fk
    foreign key (organization_id, source_message_id)
    references app_private.messages (organization_id, id)
    on delete restrict,
  constraint media_assets_content_sha256_valid
    check (octet_length(content_sha256) = 32),
  constraint media_assets_mime_type_valid
    check (
      mime_type = lower(btrim(mime_type))
      and mime_type ~ '^[a-z0-9][a-z0-9!#$&^_.+-]*/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$'
    ),
  constraint media_assets_byte_size_valid
    check (byte_size between 1 and 1073741824),
  constraint media_assets_dimensions_valid
    check (
      (width_pixels is null and height_pixels is null)
      or (
        width_pixels between 1 and 100000
        and height_pixels between 1 and 100000
      )
    ),
  constraint media_assets_duration_valid
    check (duration_milliseconds is null or duration_milliseconds > 0),
  constraint media_assets_original_file_name_valid
    check (
      original_file_name is null
      or (
        original_file_name = btrim(original_file_name)
        and char_length(original_file_name) between 1 and 255
      )
    ),
  constraint media_assets_source_kind_valid
    check (source_kind in ('message', 'authorized_upload', 'authorized_import')),
  constraint media_assets_source_message_required
    check (source_kind <> 'message' or source_message_id is not null),
  constraint media_assets_ingest_status_valid
    check (ingest_status in ('received', 'verified', 'rejected', 'quarantined')),
  constraint media_assets_analyzed_at_valid
    check (analyzed_at is null or analyzed_at >= created_at)
);

create unique index media_assets_organization_hash_unique
  on app_private.media_assets (organization_id, content_sha256);

create table app_private.catalog_evidence (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  evidence_kind text not null,
  source_message_id uuid,
  content jsonb not null,
  model_provider text,
  model_name text,
  provider_request_id text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint catalog_evidence_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_evidence_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint catalog_evidence_source_message_fk
    foreign key (organization_id, source_message_id)
    references app_private.messages (organization_id, id)
    on delete restrict,
  constraint catalog_evidence_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_evidence_kind_valid
    check (
      evidence_kind in (
        'owner_instruction',
        'customer_message',
        'media_observation',
        'model_analysis',
        'owner_confirmation',
        'system_observation'
      )
    ),
  constraint catalog_evidence_content_object
    check (jsonb_typeof(content) = 'object'),
  constraint catalog_evidence_model_attribution_valid
    check (
      (evidence_kind = 'model_analysis' and model_provider is not null and model_name is not null)
      or (evidence_kind <> 'model_analysis' and model_provider is null and model_name is null)
    ),
  constraint catalog_evidence_model_provider_valid
    check (
      model_provider is null
      or (
        model_provider = lower(btrim(model_provider))
        and char_length(model_provider) between 1 and 80
      )
    ),
  constraint catalog_evidence_model_name_valid
    check (
      model_name is null
      or (model_name = btrim(model_name) and char_length(model_name) between 1 and 200)
    ),
  constraint catalog_evidence_provider_request_id_valid
    check (
      provider_request_id is null
      or (
        provider_request_id = btrim(provider_request_id)
        and char_length(provider_request_id) between 1 and 255
      )
    )
);

create table app_private.catalog_evidence_media (
  organization_id uuid not null,
  evidence_id uuid not null,
  media_asset_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (organization_id, evidence_id, media_asset_id),
  constraint catalog_evidence_media_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint catalog_evidence_media_asset_fk
    foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id)
    on delete restrict
);

create table app_private.products (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  category_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_organization_id_id_unique
    unique (organization_id, id),
  constraint products_category_fk
    foreign key (organization_id, category_id)
    references app_private.catalog_categories (organization_id, id)
    on delete restrict,
  constraint products_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint products_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint products_description_valid
    check (
      description is null
      or (
        description = btrim(description)
        and char_length(description) between 1 and 10000
      )
    ),
  constraint products_status_valid
    check (status in ('draft', 'active', 'paused', 'archived'))
);

create index products_organization_category_status_idx
  on app_private.products (organization_id, category_id, status, id);

create index products_search_idx
  on app_private.products
  using gin (to_tsvector('simple', name || ' ' || coalesce(description, '')));

create table app_private.product_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null,
  name text not null,
  description text,
  status text not null default 'draft',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_organization_id_id_unique
    unique (organization_id, id),
  constraint product_variants_product_fk
    foreign key (organization_id, product_id)
    references app_private.products (organization_id, id)
    on delete restrict,
  constraint product_variants_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint product_variants_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 240),
  constraint product_variants_description_valid
    check (
      description is null
      or (
        description = btrim(description)
        and char_length(description) between 1 and 10000
      )
    ),
  constraint product_variants_status_valid
    check (status in ('draft', 'active', 'paused', 'archived'))
);

create index product_variants_organization_product_status_idx
  on app_private.product_variants (organization_id, product_id, status, id);

create table app_private.variant_skus (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  variant_id uuid not null,
  sku text not null,
  status text not null default 'current',
  effective_at timestamptz not null default now(),
  retired_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variant_skus_organization_id_id_unique
    unique (organization_id, id),
  constraint variant_skus_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint variant_skus_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint variant_skus_sku_valid
    check (sku = btrim(sku) and char_length(sku) between 1 and 100),
  constraint variant_skus_status_valid
    check (status in ('current', 'reserved')),
  constraint variant_skus_retirement_valid
    check (
      (status = 'current' and retired_at is null)
      or (status = 'reserved' and retired_at is not null and retired_at >= effective_at)
    )
);

create unique index variant_skus_organization_sku_unique
  on app_private.variant_skus (organization_id, lower(sku));

create unique index variant_skus_one_current_per_variant
  on app_private.variant_skus (organization_id, variant_id)
  where status = 'current';

create table app_private.product_attribute_values (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null,
  attribute_definition_id uuid not null,
  ordinal smallint not null default 0,
  certainty text not null default 'confirmed',
  value_text text,
  value_integer bigint,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_timestamp timestamptz,
  option_id uuid,
  unit_id uuid,
  evidence_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_attribute_values_organization_id_id_unique
    unique (organization_id, id),
  constraint product_attribute_values_slot_unique
    unique (organization_id, product_id, attribute_definition_id, ordinal),
  constraint product_attribute_values_product_fk
    foreign key (organization_id, product_id)
    references app_private.products (organization_id, id)
    on delete restrict,
  constraint product_attribute_values_definition_fk
    foreign key (organization_id, attribute_definition_id)
    references app_private.catalog_attribute_definitions (organization_id, id)
    on delete restrict,
  constraint product_attribute_values_option_fk
    foreign key (organization_id, option_id)
    references app_private.catalog_attribute_options (organization_id, id)
    on delete restrict,
  constraint product_attribute_values_unit_fk
    foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict,
  constraint product_attribute_values_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint product_attribute_values_ordinal_valid
    check (ordinal between 0 and 99),
  constraint product_attribute_values_certainty_valid
    check (certainty in ('proposed', 'confirmed', 'unknown')),
  constraint product_attribute_values_typed_shape
    check (
      (certainty = 'unknown' and num_nonnulls(
        value_text,
        value_integer,
        value_decimal,
        value_boolean,
        value_date,
        value_timestamp,
        option_id
      ) = 0)
      or (certainty in ('proposed', 'confirmed') and num_nonnulls(
        value_text,
        value_integer,
        value_decimal,
        value_boolean,
        value_date,
        value_timestamp,
        option_id
      ) = 1)
    )
);

create table app_private.variant_attribute_values (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  variant_id uuid not null,
  attribute_definition_id uuid not null,
  ordinal smallint not null default 0,
  certainty text not null default 'confirmed',
  value_text text,
  value_integer bigint,
  value_decimal numeric,
  value_boolean boolean,
  value_date date,
  value_timestamp timestamptz,
  option_id uuid,
  unit_id uuid,
  evidence_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint variant_attribute_values_organization_id_id_unique
    unique (organization_id, id),
  constraint variant_attribute_values_slot_unique
    unique (organization_id, variant_id, attribute_definition_id, ordinal),
  constraint variant_attribute_values_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint variant_attribute_values_definition_fk
    foreign key (organization_id, attribute_definition_id)
    references app_private.catalog_attribute_definitions (organization_id, id)
    on delete restrict,
  constraint variant_attribute_values_option_fk
    foreign key (organization_id, option_id)
    references app_private.catalog_attribute_options (organization_id, id)
    on delete restrict,
  constraint variant_attribute_values_unit_fk
    foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict,
  constraint variant_attribute_values_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint variant_attribute_values_ordinal_valid
    check (ordinal between 0 and 99),
  constraint variant_attribute_values_certainty_valid
    check (certainty in ('proposed', 'confirmed', 'unknown')),
  constraint variant_attribute_values_typed_shape
    check (
      (certainty = 'unknown' and num_nonnulls(
        value_text,
        value_integer,
        value_decimal,
        value_boolean,
        value_date,
        value_timestamp,
        option_id
      ) = 0)
      or (certainty in ('proposed', 'confirmed') and num_nonnulls(
        value_text,
        value_integer,
        value_decimal,
        value_boolean,
        value_date,
        value_timestamp,
        option_id
      ) = 1)
    )
);

create table app_private.catalog_ingestion_drafts (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  category_id uuid,
  source_conversation_id uuid,
  source_message_id uuid,
  status text not null default 'collecting',
  proposal jsonb not null default '{}'::jsonb,
  unresolved_fields jsonb not null default '[]'::jsonb,
  confidence numeric(6, 5),
  applied_product_id uuid,
  applied_variant_id uuid,
  revision integer not null default 1,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_ingestion_drafts_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_ingestion_drafts_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint catalog_ingestion_drafts_category_fk
    foreign key (organization_id, category_id)
    references app_private.catalog_categories (organization_id, id)
    on delete restrict,
  constraint catalog_ingestion_drafts_source_conversation_fk
    foreign key (organization_id, source_conversation_id)
    references app_private.conversations (organization_id, id)
    on delete restrict,
  constraint catalog_ingestion_drafts_source_message_fk
    foreign key (organization_id, source_message_id)
    references app_private.messages (organization_id, id)
    on delete restrict,
  constraint catalog_ingestion_drafts_applied_product_fk
    foreign key (organization_id, applied_product_id)
    references app_private.products (organization_id, id)
    on delete restrict,
  constraint catalog_ingestion_drafts_applied_variant_fk
    foreign key (organization_id, applied_variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint catalog_ingestion_drafts_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_ingestion_drafts_status_valid
    check (
      status in (
        'collecting',
        'needs_confirmation',
        'ready',
        'applied',
        'rejected',
        'superseded'
      )
    ),
  constraint catalog_ingestion_drafts_proposal_object
    check (jsonb_typeof(proposal) = 'object'),
  constraint catalog_ingestion_drafts_unresolved_fields_array
    check (jsonb_typeof(unresolved_fields) = 'array'),
  constraint catalog_ingestion_drafts_confidence_valid
    check (confidence is null or confidence between 0 and 1),
  constraint catalog_ingestion_drafts_revision_valid
    check (revision > 0),
  constraint catalog_ingestion_drafts_application_valid
    check (
      (
        status = 'applied'
        and applied_product_id is not null
        and applied_variant_id is not null
        and unresolved_fields = '[]'::jsonb
      )
      or (
        status <> 'applied'
        and applied_product_id is null
        and applied_variant_id is null
      )
    )
);

create index catalog_ingestion_drafts_work_queue_idx
  on app_private.catalog_ingestion_drafts (organization_id, status, updated_at, id)
  where status in ('collecting', 'needs_confirmation', 'ready');

create table app_private.catalog_candidate_matches (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  draft_id uuid not null,
  candidate_kind text not null,
  candidate_product_id uuid,
  candidate_variant_id uuid,
  rank integer not null,
  confidence numeric(6, 5),
  differences jsonb not null default '{}'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_candidate_matches_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_candidate_matches_draft_rank_unique
    unique (organization_id, draft_id, rank),
  constraint catalog_candidate_matches_draft_fk
    foreign key (organization_id, draft_id)
    references app_private.catalog_ingestion_drafts (organization_id, id)
    on delete restrict,
  constraint catalog_candidate_matches_product_fk
    foreign key (organization_id, candidate_product_id)
    references app_private.products (organization_id, id)
    on delete restrict,
  constraint catalog_candidate_matches_variant_fk
    foreign key (organization_id, candidate_variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint catalog_candidate_matches_kind_target_valid
    check (
      (candidate_kind = 'product' and candidate_product_id is not null and candidate_variant_id is null)
      or (candidate_kind = 'variant' and candidate_product_id is null and candidate_variant_id is not null)
    ),
  constraint catalog_candidate_matches_rank_valid
    check (rank > 0),
  constraint catalog_candidate_matches_confidence_valid
    check (confidence is null or confidence between 0 and 1),
  constraint catalog_candidate_matches_differences_object
    check (jsonb_typeof(differences) = 'object'),
  constraint catalog_candidate_matches_status_valid
    check (status in ('proposed', 'selected', 'rejected', 'expired'))
);

create unique index catalog_candidate_matches_product_unique
  on app_private.catalog_candidate_matches (
    organization_id,
    draft_id,
    candidate_product_id
  )
  where candidate_product_id is not null;

create unique index catalog_candidate_matches_variant_unique
  on app_private.catalog_candidate_matches (
    organization_id,
    draft_id,
    candidate_variant_id
  )
  where candidate_variant_id is not null;

create unique index catalog_candidate_matches_one_selected
  on app_private.catalog_candidate_matches (organization_id, draft_id)
  where status = 'selected';

create table app_private.catalog_resolution_decisions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  draft_id uuid not null,
  decision text not null,
  selected_candidate_match_id uuid,
  evidence_id uuid not null,
  rationale text,
  decided_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint catalog_resolution_decisions_organization_id_id_unique
    unique (organization_id, id),
  constraint catalog_resolution_decisions_draft_unique
    unique (organization_id, draft_id),
  constraint catalog_resolution_decisions_draft_fk
    foreign key (organization_id, draft_id)
    references app_private.catalog_ingestion_drafts (organization_id, id)
    on delete restrict,
  constraint catalog_resolution_decisions_candidate_fk
    foreign key (organization_id, selected_candidate_match_id)
    references app_private.catalog_candidate_matches (organization_id, id)
    on delete restrict,
  constraint catalog_resolution_decisions_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint catalog_resolution_decisions_decided_by_user_fk
    foreign key (decided_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint catalog_resolution_decisions_decision_valid
    check (decision in ('reuse_candidate', 'create_new', 'reject')),
  constraint catalog_resolution_decisions_candidate_required
    check (
      (decision = 'reuse_candidate' and selected_candidate_match_id is not null)
      or (decision in ('create_new', 'reject') and selected_candidate_match_id is null)
    ),
  constraint catalog_resolution_decisions_rationale_valid
    check (
      rationale is null
      or (rationale = btrim(rationale) and char_length(rationale) between 1 and 4000)
    )
);

create function app_private.prevent_catalog_scope_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception using errcode = '23514', message = 'catalog organization scope is immutable';
  end if;

  if tg_table_name = 'catalog_categories' and new.code is distinct from old.code then
    raise exception using errcode = '23514', message = 'category code is immutable';
  elsif tg_table_name = 'catalog_units' and (
    new.code is distinct from old.code
    or new.quantity_kind is distinct from old.quantity_kind
    or new.decimal_scale is distinct from old.decimal_scale
  ) then
    raise exception using errcode = '23514', message = 'unit identity and precision are immutable';
  elsif tg_table_name = 'products' and new.category_id is distinct from old.category_id then
    raise exception using errcode = '23514', message = 'product category is immutable';
  elsif tg_table_name = 'product_variants' and new.product_id is distinct from old.product_id then
    raise exception using errcode = '23514', message = 'variant product is immutable';
  elsif tg_table_name = 'catalog_ingestion_drafts' and (
    new.source_conversation_id is distinct from old.source_conversation_id
    or new.source_message_id is distinct from old.source_message_id
  ) then
    raise exception using errcode = '23514', message = 'draft source evidence is immutable';
  end if;

  return new;
end;
$$;

create function app_private.prevent_attribute_definition_contract_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.category_id is distinct from old.category_id
    or new.code is distinct from old.code
    or new.scope is distinct from old.scope
    or new.value_type is distinct from old.value_type then
    raise exception using
      errcode = '23514',
      message = 'attribute category, code, scope and value type are immutable';
  end if;

  if (
    new.cardinality_min is distinct from old.cardinality_min
    or new.cardinality_max is distinct from old.cardinality_max
    or new.allows_unit is distinct from old.allows_unit
    or new.required_on_activation is distinct from old.required_on_activation
    or new.status is distinct from old.status
  ) and exists (
    select 1
    from app_private.products as product
    where product.organization_id = old.organization_id
      and product.category_id = old.category_id
      and product.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'attribute activation contract cannot change while category has active products';
  end if;

  return new;
end;
$$;

create function app_private.prevent_media_asset_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.content_sha256 is distinct from old.content_sha256
    or new.mime_type is distinct from old.mime_type
    or new.byte_size is distinct from old.byte_size
    or new.source_kind is distinct from old.source_kind
    or new.source_message_id is distinct from old.source_message_id then
    raise exception using
      errcode = '23514',
      message = 'accepted media identity and provenance are immutable';
  end if;

  return new;
end;
$$;

create function app_private.reject_immutable_catalog_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '23514', message = tg_table_name || ' rows are append-only';
end;
$$;

create function app_private.prevent_variant_sku_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.variant_id is distinct from old.variant_id
    or new.sku is distinct from old.sku
    or new.effective_at is distinct from old.effective_at then
    raise exception using errcode = '23514', message = 'SKU identity is immutable';
  end if;

  return new;
end;
$$;

create function app_private.validate_catalog_attribute_value()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  definition app_private.catalog_attribute_definitions%rowtype;
  parent_category_id uuid;
  populated_type text;
begin
  select * into definition
  from app_private.catalog_attribute_definitions
  where organization_id = new.organization_id
    and id = new.attribute_definition_id;

  if not found or definition.status <> 'active' then
    raise exception using errcode = '23514', message = 'attribute definition must be active';
  end if;

  if tg_table_name = 'product_attribute_values' then
    if definition.scope <> 'product' then
      raise exception using errcode = '23514', message = 'attribute scope does not match product';
    end if;

    select category_id into parent_category_id
    from app_private.products
    where organization_id = new.organization_id and id = new.product_id;
  else
    if definition.scope <> 'variant' then
      raise exception using errcode = '23514', message = 'attribute scope does not match variant';
    end if;

    select product.category_id into parent_category_id
    from app_private.product_variants as variant
    join app_private.products as product
      on product.organization_id = variant.organization_id
      and product.id = variant.product_id
    where variant.organization_id = new.organization_id and variant.id = new.variant_id;
  end if;

  if parent_category_id is null or parent_category_id <> definition.category_id then
    raise exception using errcode = '23514', message = 'attribute category does not match catalog parent';
  end if;

  if new.ordinal >= definition.cardinality_max then
    raise exception using errcode = '23514', message = 'attribute ordinal exceeds configured cardinality';
  end if;

  if new.certainty <> 'unknown' then
    populated_type := case
      when new.value_text is not null then 'text'
      when new.value_integer is not null then 'integer'
      when new.value_decimal is not null then 'decimal'
      when new.value_boolean is not null then 'boolean'
      when new.value_date is not null then 'date'
      when new.value_timestamp is not null then 'timestamp'
      when new.option_id is not null then 'option'
    end;

    if populated_type is distinct from definition.value_type then
      raise exception using errcode = '23514', message = 'attribute value does not match configured type';
    end if;
  end if;

  if new.option_id is not null and not exists (
    select 1
    from app_private.catalog_attribute_options as option_value
    where option_value.organization_id = new.organization_id
      and option_value.id = new.option_id
      and option_value.attribute_definition_id = new.attribute_definition_id
      and option_value.status = 'active'
  ) then
    raise exception using errcode = '23514', message = 'attribute option is not active for definition';
  end if;

  if new.unit_id is not null and (
    not definition.allows_unit
    or not exists (
      select 1
      from app_private.catalog_attribute_allowed_units as allowed_unit
      join app_private.catalog_units as unit_value
        on unit_value.organization_id = allowed_unit.organization_id
        and unit_value.id = allowed_unit.unit_id
      where allowed_unit.organization_id = new.organization_id
        and allowed_unit.attribute_definition_id = new.attribute_definition_id
        and allowed_unit.unit_id = new.unit_id
        and unit_value.status = 'active'
    )
  ) then
    raise exception using errcode = '23514', message = 'unit is not active and allowed for attribute';
  end if;

  if new.unit_id is null and definition.allows_unit and new.certainty <> 'unknown' then
    raise exception using errcode = '23514', message = 'configured attribute unit is required';
  end if;

  return new;
end;
$$;

create function app_private.assert_product_catalog_ready(
  target_organization_id uuid,
  target_product_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_category_id uuid;
  target_status text;
begin
  select category_id, status into target_category_id, target_status
  from app_private.products
  where organization_id = target_organization_id and id = target_product_id;

  if target_status = 'active' then
    if not exists (
      select 1
      from app_private.catalog_categories
      where organization_id = target_organization_id
        and id = target_category_id
        and status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'active product requires active category';
    end if;

    if exists (
      select 1
      from app_private.catalog_attribute_definitions as definition
      where definition.organization_id = target_organization_id
        and definition.category_id = target_category_id
        and definition.scope = 'product'
        and definition.status = 'active'
        and definition.required_on_activation
        and (
          select count(*)
          from app_private.product_attribute_values as attribute_value
          where attribute_value.organization_id = target_organization_id
            and attribute_value.product_id = target_product_id
            and attribute_value.attribute_definition_id = definition.id
            and attribute_value.certainty = 'confirmed'
        ) < definition.cardinality_min
    ) then
      raise exception using errcode = '23514', message = 'active product requires confirmed configured attributes';
    end if;
  end if;
end;
$$;

create function app_private.assert_variant_catalog_ready(
  target_organization_id uuid,
  target_variant_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product_id uuid;
  target_category_id uuid;
  target_status text;
begin
  select variant.product_id, product.category_id, variant.status
    into target_product_id, target_category_id, target_status
  from app_private.product_variants as variant
  join app_private.products as product
    on product.organization_id = variant.organization_id
    and product.id = variant.product_id
  where variant.organization_id = target_organization_id and variant.id = target_variant_id;

  if target_status = 'active' then
    if not exists (
      select 1 from app_private.products
      where organization_id = target_organization_id
        and id = target_product_id
        and status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'active variant requires active product';
    end if;

    if not exists (
      select 1 from app_private.variant_skus
      where organization_id = target_organization_id
        and variant_id = target_variant_id
        and status = 'current'
    ) then
      raise exception using errcode = '23514', message = 'active variant requires a current SKU';
    end if;

    if exists (
      select 1
      from app_private.catalog_attribute_definitions as definition
      where definition.organization_id = target_organization_id
        and definition.category_id = target_category_id
        and definition.scope = 'variant'
        and definition.status = 'active'
        and definition.required_on_activation
        and (
          select count(*)
          from app_private.variant_attribute_values as attribute_value
          where attribute_value.organization_id = target_organization_id
            and attribute_value.variant_id = target_variant_id
            and attribute_value.attribute_definition_id = definition.id
            and attribute_value.certainty = 'confirmed'
        ) < definition.cardinality_min
    ) then
      raise exception using errcode = '23514', message = 'active variant requires confirmed configured attributes';
    end if;
  end if;
end;
$$;

create function app_private.validate_product_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if not exists (
      select 1 from app_private.catalog_categories
      where organization_id = new.organization_id and id = new.category_id and status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'active product requires active category';
    end if;

    if exists (
      select 1
      from app_private.catalog_attribute_definitions as definition
      where definition.organization_id = new.organization_id
        and definition.category_id = new.category_id
        and definition.scope = 'product'
        and definition.status = 'active'
        and definition.required_on_activation
        and (
          select count(*)
          from app_private.product_attribute_values as attribute_value
          where attribute_value.organization_id = new.organization_id
            and attribute_value.product_id = new.id
            and attribute_value.attribute_definition_id = definition.id
            and attribute_value.certainty = 'confirmed'
        ) < definition.cardinality_min
    ) then
      raise exception using errcode = '23514', message = 'active product requires confirmed configured attributes';
    end if;
  end if;

  return new;
end;
$$;

create function app_private.validate_variant_activation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    if not exists (
      select 1 from app_private.products
      where organization_id = new.organization_id and id = new.product_id and status = 'active'
    ) then
      raise exception using errcode = '23514', message = 'active variant requires active product';
    end if;

    if not exists (
      select 1 from app_private.variant_skus
      where organization_id = new.organization_id and variant_id = new.id and status = 'current'
    ) then
      raise exception using errcode = '23514', message = 'active variant requires a current SKU';
    end if;

    if exists (
      select 1
      from app_private.catalog_attribute_definitions as definition
      join app_private.products as product
        on product.organization_id = new.organization_id
        and product.id = new.product_id
        and product.category_id = definition.category_id
      where definition.organization_id = new.organization_id
        and definition.scope = 'variant'
        and definition.status = 'active'
        and definition.required_on_activation
        and (
          select count(*)
          from app_private.variant_attribute_values as attribute_value
          where attribute_value.organization_id = new.organization_id
            and attribute_value.variant_id = new.id
            and attribute_value.attribute_definition_id = definition.id
            and attribute_value.certainty = 'confirmed'
        ) < definition.cardinality_min
    ) then
      raise exception using errcode = '23514', message = 'active variant requires confirmed configured attributes';
    end if;
  end if;

  return new;
end;
$$;

create function app_private.revalidate_active_catalog_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'product_attribute_values' then
    perform app_private.assert_product_catalog_ready(
      coalesce(new.organization_id, old.organization_id),
      coalesce(new.product_id, old.product_id)
    );
  else
    perform app_private.assert_variant_catalog_ready(
      coalesce(new.organization_id, old.organization_id),
      coalesce(new.variant_id, old.variant_id)
    );
  end if;

  return null;
end;
$$;

create function app_private.revalidate_catalog_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  catalog_row record;
begin
  if tg_table_name = 'catalog_categories' then
    for catalog_row in
      select product.organization_id, product.id
      from app_private.products as product
      where product.organization_id = new.organization_id
        and product.category_id = new.id
        and product.status = 'active'
    loop
      perform app_private.assert_product_catalog_ready(
        catalog_row.organization_id,
        catalog_row.id
      );
    end loop;
  elsif tg_table_name = 'products' then
    perform app_private.assert_product_catalog_ready(new.organization_id, new.id);

    for catalog_row in
      select variant.organization_id, variant.id
      from app_private.product_variants as variant
      where variant.organization_id = new.organization_id
        and variant.product_id = new.id
        and variant.status = 'active'
    loop
      perform app_private.assert_variant_catalog_ready(
        catalog_row.organization_id,
        catalog_row.id
      );
    end loop;
  else
    perform app_private.assert_variant_catalog_ready(
      coalesce(new.organization_id, old.organization_id),
      coalesce(new.variant_id, old.variant_id)
    );
  end if;

  return null;
end;
$$;

create function app_private.validate_resolution_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.selected_candidate_match_id is not null and not exists (
    select 1
    from app_private.catalog_candidate_matches as candidate
    where candidate.organization_id = new.organization_id
      and candidate.id = new.selected_candidate_match_id
      and candidate.draft_id = new.draft_id
  ) then
    raise exception using errcode = '23514', message = 'selected candidate does not belong to draft';
  end if;

  return new;
end;
$$;

create trigger catalog_categories_set_updated_at
before update on app_private.catalog_categories
for each row execute function app_private.set_updated_at();
create trigger catalog_units_set_updated_at
before update on app_private.catalog_units
for each row execute function app_private.set_updated_at();
create trigger catalog_attribute_definitions_set_updated_at
before update on app_private.catalog_attribute_definitions
for each row execute function app_private.set_updated_at();
create trigger catalog_attribute_options_set_updated_at
before update on app_private.catalog_attribute_options
for each row execute function app_private.set_updated_at();
create trigger media_assets_set_updated_at
before update on app_private.media_assets
for each row execute function app_private.set_updated_at();
create trigger products_set_updated_at
before update on app_private.products
for each row execute function app_private.set_updated_at();
create trigger product_variants_set_updated_at
before update on app_private.product_variants
for each row execute function app_private.set_updated_at();
create trigger variant_skus_set_updated_at
before update on app_private.variant_skus
for each row execute function app_private.set_updated_at();
create trigger product_attribute_values_set_updated_at
before update on app_private.product_attribute_values
for each row execute function app_private.set_updated_at();
create trigger variant_attribute_values_set_updated_at
before update on app_private.variant_attribute_values
for each row execute function app_private.set_updated_at();
create trigger catalog_ingestion_drafts_set_updated_at
before update on app_private.catalog_ingestion_drafts
for each row execute function app_private.set_updated_at();
create trigger catalog_candidate_matches_set_updated_at
before update on app_private.catalog_candidate_matches
for each row execute function app_private.set_updated_at();

create trigger catalog_categories_prevent_reassignment
before update on app_private.catalog_categories
for each row execute function app_private.prevent_catalog_scope_reassignment();
create trigger catalog_units_prevent_reassignment
before update on app_private.catalog_units
for each row execute function app_private.prevent_catalog_scope_reassignment();
create trigger products_prevent_reassignment
before update on app_private.products
for each row execute function app_private.prevent_catalog_scope_reassignment();
create trigger product_variants_prevent_reassignment
before update on app_private.product_variants
for each row execute function app_private.prevent_catalog_scope_reassignment();
create trigger catalog_ingestion_drafts_prevent_reassignment
before update on app_private.catalog_ingestion_drafts
for each row execute function app_private.prevent_catalog_scope_reassignment();
create trigger catalog_attribute_definitions_prevent_contract_rewrite
before update on app_private.catalog_attribute_definitions
for each row execute function app_private.prevent_attribute_definition_contract_rewrite();
create trigger media_assets_prevent_core_rewrite
before update on app_private.media_assets
for each row execute function app_private.prevent_media_asset_core_rewrite();
create trigger variant_skus_prevent_core_rewrite
before update on app_private.variant_skus
for each row execute function app_private.prevent_variant_sku_core_rewrite();
create trigger catalog_evidence_reject_update
before update on app_private.catalog_evidence
for each row execute function app_private.reject_immutable_catalog_update();
create trigger catalog_resolution_decisions_reject_update
before update on app_private.catalog_resolution_decisions
for each row execute function app_private.reject_immutable_catalog_update();

create trigger product_attribute_values_validate
before insert or update on app_private.product_attribute_values
for each row execute function app_private.validate_catalog_attribute_value();
create trigger variant_attribute_values_validate
before insert or update on app_private.variant_attribute_values
for each row execute function app_private.validate_catalog_attribute_value();
create trigger products_validate_activation
before insert or update on app_private.products
for each row execute function app_private.validate_product_activation();
create trigger product_variants_validate_activation
before insert or update on app_private.product_variants
for each row execute function app_private.validate_variant_activation();
create trigger catalog_resolution_decisions_validate
before insert on app_private.catalog_resolution_decisions
for each row execute function app_private.validate_resolution_decision();

create constraint trigger product_attribute_values_preserve_active_parent
after insert or update or delete on app_private.product_attribute_values
deferrable initially deferred
for each row execute function app_private.revalidate_active_catalog_parent();
create constraint trigger variant_attribute_values_preserve_active_parent
after insert or update or delete on app_private.variant_attribute_values
deferrable initially deferred
for each row execute function app_private.revalidate_active_catalog_parent();
create constraint trigger catalog_categories_preserve_active_products
after update on app_private.catalog_categories
deferrable initially deferred
for each row execute function app_private.revalidate_catalog_hierarchy();
create constraint trigger products_preserve_active_variants
after update on app_private.products
deferrable initially deferred
for each row execute function app_private.revalidate_catalog_hierarchy();
create constraint trigger variant_skus_preserve_active_variant
after insert or update or delete on app_private.variant_skus
deferrable initially deferred
for each row execute function app_private.revalidate_catalog_hierarchy();

alter table app_private.catalog_categories enable row level security;
alter table app_private.catalog_categories force row level security;
alter table app_private.catalog_units enable row level security;
alter table app_private.catalog_units force row level security;
alter table app_private.catalog_attribute_definitions enable row level security;
alter table app_private.catalog_attribute_definitions force row level security;
alter table app_private.catalog_attribute_options enable row level security;
alter table app_private.catalog_attribute_options force row level security;
alter table app_private.catalog_attribute_allowed_units enable row level security;
alter table app_private.catalog_attribute_allowed_units force row level security;
alter table app_private.media_assets enable row level security;
alter table app_private.media_assets force row level security;
alter table app_private.catalog_evidence enable row level security;
alter table app_private.catalog_evidence force row level security;
alter table app_private.catalog_evidence_media enable row level security;
alter table app_private.catalog_evidence_media force row level security;
alter table app_private.products enable row level security;
alter table app_private.products force row level security;
alter table app_private.product_variants enable row level security;
alter table app_private.product_variants force row level security;
alter table app_private.variant_skus enable row level security;
alter table app_private.variant_skus force row level security;
alter table app_private.product_attribute_values enable row level security;
alter table app_private.product_attribute_values force row level security;
alter table app_private.variant_attribute_values enable row level security;
alter table app_private.variant_attribute_values force row level security;
alter table app_private.catalog_ingestion_drafts enable row level security;
alter table app_private.catalog_ingestion_drafts force row level security;
alter table app_private.catalog_candidate_matches enable row level security;
alter table app_private.catalog_candidate_matches force row level security;
alter table app_private.catalog_resolution_decisions enable row level security;
alter table app_private.catalog_resolution_decisions force row level security;

create policy catalog_categories_member_select
on app_private.catalog_categories for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_categories.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy catalog_units_member_select
on app_private.catalog_units for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_units.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy catalog_attribute_definitions_member_select
on app_private.catalog_attribute_definitions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_attribute_definitions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy catalog_attribute_options_member_select
on app_private.catalog_attribute_options for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_attribute_options.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy catalog_attribute_allowed_units_member_select
on app_private.catalog_attribute_allowed_units for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_attribute_allowed_units.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy media_assets_operator_select
on app_private.media_assets for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = media_assets.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy catalog_evidence_operator_select
on app_private.catalog_evidence for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_evidence.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy catalog_evidence_media_operator_select
on app_private.catalog_evidence_media for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_evidence_media.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy products_member_select
on app_private.products for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = products.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy product_variants_member_select
on app_private.product_variants for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = product_variants.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy variant_skus_member_select
on app_private.variant_skus for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = variant_skus.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy product_attribute_values_member_select
on app_private.product_attribute_values for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = product_attribute_values.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy variant_attribute_values_member_select
on app_private.variant_attribute_values for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = variant_attribute_values.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
));
create policy catalog_ingestion_drafts_operator_select
on app_private.catalog_ingestion_drafts for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_ingestion_drafts.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy catalog_candidate_matches_operator_select
on app_private.catalog_candidate_matches for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_candidate_matches.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));
create policy catalog_resolution_decisions_operator_select
on app_private.catalog_resolution_decisions for select to authenticated
using (exists (
  select 1 from app_private.organization_memberships as membership
  where membership.organization_id = catalog_resolution_decisions.organization_id
    and membership.user_id = (select auth.uid()) and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create view api.catalog_categories
with (security_invoker = true, security_barrier = true)
as select id, organization_id, code, name, description, status, created_at, updated_at
from app_private.catalog_categories;
create view api.catalog_units
with (security_invoker = true, security_barrier = true)
as select id, organization_id, code, name_singular, name_plural, symbol, quantity_kind,
  decimal_scale, status, created_at, updated_at
from app_private.catalog_units;
create view api.catalog_attribute_definitions
with (security_invoker = true, security_barrier = true)
as select id, organization_id, category_id, code, name, description, scope, value_type,
  cardinality_min, cardinality_max, allows_unit, required_on_activation, is_public,
  is_filterable, is_searchable, sort_order, status, created_at, updated_at
from app_private.catalog_attribute_definitions;
create view api.catalog_attribute_options
with (security_invoker = true, security_barrier = true)
as select id, organization_id, attribute_definition_id, code, label, sort_order, status,
  created_at, updated_at
from app_private.catalog_attribute_options;
create view api.catalog_attribute_allowed_units
with (security_invoker = true, security_barrier = true)
as select organization_id, attribute_definition_id, unit_id, created_at
from app_private.catalog_attribute_allowed_units;
create view api.media_assets
with (security_invoker = true, security_barrier = true)
as select id, organization_id, mime_type, byte_size, width_pixels, height_pixels,
  duration_milliseconds, original_file_name, source_kind, source_message_id, ingest_status,
  analyzed_at, created_at, updated_at
from app_private.media_assets;
create view api.products
with (security_invoker = true, security_barrier = true)
as select id, organization_id, category_id, name, description, status, created_at, updated_at
from app_private.products;
create view api.product_variants
with (security_invoker = true, security_barrier = true)
as select id, organization_id, product_id, name, description, status, created_at, updated_at
from app_private.product_variants;
create view api.variant_skus
with (security_invoker = true, security_barrier = true)
as select id, organization_id, variant_id, sku, status, effective_at, retired_at,
  created_at, updated_at
from app_private.variant_skus;
create view api.product_attribute_values
with (security_invoker = true, security_barrier = true)
as select id, organization_id, product_id, attribute_definition_id, ordinal, certainty,
  value_text, value_integer, value_decimal, value_boolean, value_date, value_timestamp,
  option_id, unit_id, evidence_id, created_at, updated_at
from app_private.product_attribute_values;
create view api.variant_attribute_values
with (security_invoker = true, security_barrier = true)
as select id, organization_id, variant_id, attribute_definition_id, ordinal, certainty,
  value_text, value_integer, value_decimal, value_boolean, value_date, value_timestamp,
  option_id, unit_id, evidence_id, created_at, updated_at
from app_private.variant_attribute_values;
create view api.catalog_ingestion_drafts
with (security_invoker = true, security_barrier = true)
as select id, organization_id, category_id, source_conversation_id, source_message_id, status,
  proposal, unresolved_fields, confidence, applied_product_id, applied_variant_id, revision,
  created_at, updated_at
from app_private.catalog_ingestion_drafts;
create view api.catalog_candidate_matches
with (security_invoker = true, security_barrier = true)
as select id, organization_id, draft_id, candidate_kind, candidate_product_id,
  candidate_variant_id, rank, confidence, differences, status, created_at, updated_at
from app_private.catalog_candidate_matches;
create view api.catalog_resolution_decisions
with (security_invoker = true, security_barrier = true)
as select id, organization_id, draft_id, decision, selected_candidate_match_id, evidence_id,
  rationale, decided_by_user_id, created_at
from app_private.catalog_resolution_decisions;

revoke all on
  app_private.catalog_categories,
  app_private.catalog_units,
  app_private.catalog_attribute_definitions,
  app_private.catalog_attribute_options,
  app_private.catalog_attribute_allowed_units,
  app_private.media_assets,
  app_private.catalog_evidence,
  app_private.catalog_evidence_media,
  app_private.products,
  app_private.product_variants,
  app_private.variant_skus,
  app_private.product_attribute_values,
  app_private.variant_attribute_values,
  app_private.catalog_ingestion_drafts,
  app_private.catalog_candidate_matches,
  app_private.catalog_resolution_decisions
from public, anon, authenticated, service_role;

revoke all on
  api.catalog_categories,
  api.catalog_units,
  api.catalog_attribute_definitions,
  api.catalog_attribute_options,
  api.catalog_attribute_allowed_units,
  api.media_assets,
  api.products,
  api.product_variants,
  api.variant_skus,
  api.product_attribute_values,
  api.variant_attribute_values,
  api.catalog_ingestion_drafts,
  api.catalog_candidate_matches,
  api.catalog_resolution_decisions
from public, anon, authenticated, service_role;

grant select on
  app_private.catalog_categories,
  app_private.catalog_units,
  app_private.catalog_attribute_definitions,
  app_private.catalog_attribute_options,
  app_private.catalog_attribute_allowed_units,
  app_private.media_assets,
  app_private.catalog_evidence,
  app_private.catalog_evidence_media,
  app_private.products,
  app_private.product_variants,
  app_private.variant_skus,
  app_private.product_attribute_values,
  app_private.variant_attribute_values,
  app_private.catalog_ingestion_drafts,
  app_private.catalog_candidate_matches,
  app_private.catalog_resolution_decisions
to authenticated;

grant select, insert, update on
  app_private.catalog_categories,
  app_private.catalog_units,
  app_private.catalog_attribute_definitions,
  app_private.catalog_attribute_options,
  app_private.media_assets,
  app_private.products,
  app_private.product_variants,
  app_private.variant_skus,
  app_private.product_attribute_values,
  app_private.variant_attribute_values,
  app_private.catalog_ingestion_drafts,
  app_private.catalog_candidate_matches
to service_role;

grant select, insert on
  app_private.catalog_attribute_allowed_units,
  app_private.catalog_evidence,
  app_private.catalog_evidence_media,
  app_private.catalog_resolution_decisions
to service_role;

grant select on
  api.catalog_categories,
  api.catalog_units,
  api.catalog_attribute_definitions,
  api.catalog_attribute_options,
  api.catalog_attribute_allowed_units,
  api.media_assets,
  api.products,
  api.product_variants,
  api.variant_skus,
  api.product_attribute_values,
  api.variant_attribute_values,
  api.catalog_ingestion_drafts,
  api.catalog_candidate_matches,
  api.catalog_resolution_decisions
to authenticated, service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;
revoke all on all functions in schema app_private
  from public, anon, authenticated, service_role;
revoke all on all functions in schema api
  from public, anon, authenticated, service_role;

comment on table app_private.catalog_categories is
  'Organization-defined catalog taxonomy; adding a commercial category never requires a deploy';
comment on table app_private.catalog_units is
  'Organization-defined measurement vocabulary shared by typed catalog attributes';
comment on table app_private.catalog_attribute_definitions is
  'Data-driven typed attribute contract scoped to product or variant';
comment on table app_private.catalog_attribute_options is
  'Configured options for option-valued attributes; no commercial option is compiled into code';
comment on table app_private.catalog_attribute_allowed_units is
  'Explicit unit allowlist for numeric attributes';
comment on table app_private.media_assets is
  'Verified media metadata and provenance only; storage paths and buckets belong to B2-010';
comment on table app_private.catalog_evidence is
  'Append-only evidence for cognitive proposals and owner confirmations; never authoritative by itself';
comment on table app_private.catalog_evidence_media is
  'Append-only relation between catalog evidence and verified media assets';
comment on table app_private.products is
  'Category-neutral product identity; pricing and inventory are deliberately separate';
comment on table app_private.product_variants is
  'Distinct sellable configuration under a product; commercial options are attribute data';
comment on table app_private.variant_skus is
  'Organization-wide case-insensitive SKU ledger; retired identifiers remain reserved';
comment on table app_private.product_attribute_values is
  'Typed product facts with explicit certainty and evidence';
comment on table app_private.variant_attribute_values is
  'Typed variant facts with explicit certainty and evidence';
comment on table app_private.catalog_ingestion_drafts is
  'Non-authoritative cognitive workspace; unresolved facts prevent application';
comment on table app_private.catalog_candidate_matches is
  'Explicit reusable product or variant candidates produced before deduplication decisions';
comment on table app_private.catalog_resolution_decisions is
  'Append-only explicit decision selecting a candidate, creating new, or rejecting a draft';

commit;
