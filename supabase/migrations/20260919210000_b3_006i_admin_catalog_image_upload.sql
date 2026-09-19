begin;

-- =============================================================================
-- Admin catalog image upload pipeline.
-- Lets an owner/admin/operator upload an image from the admin catalog modal,
-- stream it directly into the private bucket, and let a worker transcode it
-- into WebP before the image is attached to a product variant via
-- admin_edit_catalog_offer(add_photo).
-- =============================================================================

create table app_private.admin_catalog_image_uploads (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  actor_user_id uuid not null,
  variant_id uuid not null,
  media_asset_id uuid not null,

  source_object_path text not null,
  source_sha256_hex text not null,
  source_mime_type text not null,
  source_byte_size bigint not null,
  source_width_pixels integer not null,
  source_height_pixels integer not null,

  scope text not null,
  allow_public boolean not null,
  alt_text text,

  idempotency_key text not null,

  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default statement_timestamp(),
  processing_started_at timestamptz,
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,

  analysis_object_path text,
  analysis_sha256_hex text,
  analysis_mime_type text,
  analysis_byte_size bigint,
  analysis_width_pixels integer,
  analysis_height_pixels integer,

  product_media_id uuid,
  last_error_code text,
  completed_at timestamptz,

  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),

  constraint admin_catalog_image_uploads_organization_id_id_unique
    unique (organization_id, id),

  constraint admin_catalog_image_uploads_idempotency_unique
    unique (organization_id, actor_user_id, idempotency_key),

  constraint admin_catalog_image_uploads_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,

  constraint admin_catalog_image_uploads_asset_fk
    foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id)
    on delete restrict,

  constraint admin_catalog_image_uploads_actor_fk
    foreign key (organization_id, actor_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,

  constraint admin_catalog_image_uploads_sha256_valid
    check (
      char_length(source_sha256_hex) = 64
      and source_sha256_hex = lower(source_sha256_hex)
      and source_sha256_hex ~ '^[0-9a-f]{64}$'
    ),

  constraint admin_catalog_image_uploads_mime_valid
    check (source_mime_type in ('image/jpeg', 'image/png', 'image/webp')),

  constraint admin_catalog_image_uploads_size_valid
    check (source_byte_size between 1 and 26214400),

  constraint admin_catalog_image_uploads_dimensions_valid
    check (
      source_width_pixels between 1 and 100000
      and source_height_pixels between 1 and 100000
      and source_width_pixels::bigint * source_height_pixels::bigint <= 50000000
    ),

  constraint admin_catalog_image_uploads_scope_valid
    check (scope in ('product', 'variant')),

  constraint admin_catalog_image_uploads_alt_text_valid
    check (
      alt_text is null
      or (alt_text = btrim(alt_text) and char_length(alt_text) between 1 and 2000)
    ),

  constraint admin_catalog_image_uploads_idempotency_key_valid
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 8 and 200
    ),

  constraint admin_catalog_image_uploads_status_valid
    check (
      status in (
        'pending',
        'processing',
        'succeeded',
        'failed',
        'retryable',
        'dead_letter'
      )
    ),

  constraint admin_catalog_image_uploads_attempt_valid
    check (attempt_count between 0 and 100),

  constraint admin_catalog_image_uploads_lease_shape_valid
    check (
      (
        status = 'processing'
        and lease_owner is not null
        and lease_token is not null
        and lease_expires_at is not null
      )
      or (
        status <> 'processing'
        and lease_owner is null
        and lease_token is null
        and lease_expires_at is null
      )
    ),

  constraint admin_catalog_image_uploads_completion_shape_valid
    check (
      (
        status = 'succeeded'
        and product_media_id is not null
        and completed_at is not null
      )
      or (status <> 'succeeded')
    ),

  constraint admin_catalog_image_uploads_failure_shape_valid
    check (
      (
        status in ('failed', 'dead_letter')
        and last_error_code is not null
      )
      or (status not in ('failed', 'dead_letter'))
    ),

  constraint admin_catalog_image_uploads_analysis_shape_valid
    check (
      (
        status = 'succeeded'
        and analysis_object_path is not null
        and analysis_sha256_hex is not null
        and analysis_mime_type = 'image/webp'
        and analysis_byte_size is not null
        and analysis_width_pixels is not null
        and analysis_height_pixels is not null
        and greatest(analysis_width_pixels, analysis_height_pixels) <= 2500
      )
      or (status <> 'succeeded')
    ),

  constraint admin_catalog_image_uploads_allow_public_shape_valid
    check (allow_public is not null)
);

create index admin_catalog_image_uploads_claim_idx
  on app_private.admin_catalog_image_uploads (status, available_at, created_at, id)
  where status in ('pending', 'retryable', 'processing');

create index admin_catalog_image_uploads_tenant_claim_idx
  on app_private.admin_catalog_image_uploads (organization_id, status, available_at, id)
  where status in ('pending', 'retryable', 'processing');

create index admin_catalog_image_uploads_asset_fk_idx
  on app_private.admin_catalog_image_uploads (organization_id, media_asset_id);

create index admin_catalog_image_uploads_variant_fk_idx
  on app_private.admin_catalog_image_uploads (organization_id, variant_id);

create trigger admin_catalog_image_uploads_set_updated_at
before update on app_private.admin_catalog_image_uploads
for each row execute function app_private.set_updated_at();

-- =============================================================================
-- prepare_admin_catalog_image_upload
-- Owner/admin/operator requests the canonical storage path for an image and
-- registers a media_asset row + an upload queue row in one shot. Idempotent on
-- (organization_id, actor_user_id, idempotency_key): a replay with the same key
-- and identical payload returns the previously issued upload.
-- =============================================================================
create function api.prepare_admin_catalog_image_upload(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_variant_id uuid,
  target_source_sha256_hex text,
  target_source_mime_type text,
  target_source_byte_size bigint,
  target_source_width_pixels integer,
  target_source_height_pixels integer,
  target_scope text,
  target_allow_public boolean,
  target_alt_text text,
  target_idempotency_key text
)
returns table (
  upload_id uuid,
  media_asset_id uuid,
  source_object_path text,
  status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload_record app_private.admin_catalog_image_uploads%rowtype;
  source_bytea bytea;
  ingest_result record;
  computed_object_path text;
  computed_file_name text;
begin
  if target_organization_id is null
    or target_actor_user_id is null
    or target_variant_id is null
    or target_source_sha256_hex is null
    or char_length(target_source_sha256_hex) <> 64
    or target_source_sha256_hex <> lower(target_source_sha256_hex)
    or target_source_sha256_hex !~ '^[0-9a-f]{64}$'
    or target_source_mime_type is null
    or target_source_mime_type not in ('image/jpeg', 'image/png', 'image/webp')
    or target_source_byte_size is null
    or target_source_byte_size not between 1 and 26214400
    or target_source_width_pixels is null
    or target_source_width_pixels not between 1 and 100000
    or target_source_height_pixels is null
    or target_source_height_pixels not between 1 and 100000
    or target_source_width_pixels::bigint * target_source_height_pixels::bigint > 50000000
    or target_scope is null
    or target_scope not in ('product', 'variant')
    or target_allow_public is null
    or (
      target_alt_text is not null
      and (
        target_alt_text <> btrim(target_alt_text)
        or char_length(target_alt_text) < 1
        or char_length(target_alt_text) > 2000
      )
    )
    or target_idempotency_key is null
    or btrim(target_idempotency_key) = ''
    or char_length(target_idempotency_key) < 8
    or char_length(target_idempotency_key) > 200 then
    raise exception using errcode = '22023',
      message = 'admin catalog image upload arguments are invalid';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  );

  select upload_value.*
  into upload_record
  from app_private.admin_catalog_image_uploads as upload_value
  where upload_value.organization_id = target_organization_id
    and upload_value.actor_user_id = target_actor_user_id
    and upload_value.idempotency_key = target_idempotency_key
  for update;

  if found then
    if upload_record.variant_id is distinct from target_variant_id
      or upload_record.source_sha256_hex is distinct from target_source_sha256_hex
      or upload_record.source_mime_type is distinct from target_source_mime_type
      or upload_record.source_byte_size is distinct from target_source_byte_size
      or upload_record.source_width_pixels is distinct from target_source_width_pixels
      or upload_record.source_height_pixels is distinct from target_source_height_pixels
      or upload_record.scope is distinct from target_scope
      or upload_record.allow_public is distinct from target_allow_public
      or upload_record.alt_text is distinct from target_alt_text then
      raise exception using errcode = '23514',
        message = 'admin catalog image upload idempotency replay conflicts';
    end if;

    upload_id := upload_record.id;
    media_asset_id := upload_record.media_asset_id;
    source_object_path := upload_record.source_object_path;
    status := upload_record.status;
    was_replayed := true;
    return next;
    return;
  end if;

  if not exists (
    select 1
    from app_private.product_variants as variant_value
    where variant_value.organization_id = target_organization_id
      and variant_value.id = target_variant_id
      and variant_value.status <> 'archived'
  ) then
    raise exception using errcode = 'P0002',
      message = 'catalog variant was not found';
  end if;

  source_bytea := decode(target_source_sha256_hex, 'hex');
  computed_file_name := lower(target_source_sha256_hex) || case target_source_mime_type
    when 'image/jpeg' then '.jpg'
    when 'image/png' then '.png'
    when 'image/webp' then '.webp'
  end;

  select *
  into ingest_result
  from api.begin_media_asset_ingest(
    target_organization_id,
    source_bytea,
    target_source_mime_type,
    target_source_byte_size,
    target_source_width_pixels,
    target_source_height_pixels,
    computed_file_name,
    'authorized_upload',
    null,
    'member',
    target_actor_user_id,
    target_idempotency_key
  );

  -- Canonical object_path MUST match media_asset_objects_path_valid:
  --   orgId/assetId/rendition_kind/sha256hex.ext
  computed_object_path := target_organization_id::text
    || '/' || (ingest_result.media_asset_id)::text
    || '/source_original/'
    || lower(target_source_sha256_hex)
    || case target_source_mime_type
      when 'image/jpeg' then '.jpg'
      when 'image/png' then '.png'
      when 'image/webp' then '.webp'
    end;

  insert into app_private.admin_catalog_image_uploads (
    organization_id,
    actor_user_id,
    variant_id,
    media_asset_id,
    source_object_path,
    source_sha256_hex,
    source_mime_type,
    source_byte_size,
    source_width_pixels,
    source_height_pixels,
    scope,
    allow_public,
    alt_text,
    idempotency_key,
    status,
    available_at
  ) values (
    target_organization_id,
    target_actor_user_id,
    target_variant_id,
    (ingest_result.media_asset_id),
    computed_object_path,
    target_source_sha256_hex,
    target_source_mime_type,
    target_source_byte_size,
    target_source_width_pixels,
    target_source_height_pixels,
    target_scope,
    target_allow_public,
    target_alt_text,
    target_idempotency_key,
    'pending',
    statement_timestamp()
  )
  returning * into upload_record;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'admin_catalog_image_upload.prepared',
    'member',
    target_actor_user_id,
    'admin-catalog-image-upload:' || upload_record.id::text,
    null,
    jsonb_build_object(
      'upload_id', upload_record.id,
      'media_asset_id', upload_record.media_asset_id,
      'variant_id', target_variant_id,
      'scope', target_scope,
      'allow_public', target_allow_public,
      'was_replayed', false
    )
  );

  upload_id := upload_record.id;
  media_asset_id := upload_record.media_asset_id;
  source_object_path := upload_record.source_object_path;
  status := upload_record.status;
  was_replayed := false;
  return next;
end;
$$;

revoke all on function api.prepare_admin_catalog_image_upload(
  uuid, uuid, uuid, text, text, bigint, integer, integer, text, boolean, text, text
) from public, anon, authenticated;
grant execute on function api.prepare_admin_catalog_image_upload(
  uuid, uuid, uuid, text, text, bigint, integer, integer, text, boolean, text, text
) to service_role;

-- =============================================================================
-- claim_admin_catalog_image_upload
-- Worker leases the next ready upload. Mirrors the WhatsApp media-ingest claim
-- pattern so workers can poll tenant-scoped without skipping each other.
-- =============================================================================
create function api.claim_admin_catalog_image_upload(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_max_attempts integer default 8,
  target_organization_id uuid default null
)
returns table (
  upload_id uuid,
  organization_id uuid,
  actor_user_id uuid,
  variant_id uuid,
  media_asset_id uuid,
  source_object_path text,
  source_sha256_hex text,
  source_mime_type text,
  source_byte_size bigint,
  source_width_pixels integer,
  source_height_pixels integer,
  scope text,
  allow_public boolean,
  alt_text text,
  attempt_number integer,
  lease_token uuid,
  lease_expires_at timestamptz,
  correlation_id text,
  trace_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload_record app_private.admin_catalog_image_uploads%rowtype;
  claimed_lease_token uuid;
  claimed_lease_expires_at timestamptz;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_lease_seconds is null
    or target_lease_seconds not between 15 and 900
    or target_max_attempts is null
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023',
      message = 'admin catalog image upload claim parameters are invalid';
  end if;

  with exhausted as (
    update app_private.admin_catalog_image_uploads as upload_value
    set status = 'dead_letter',
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = 'attempt_budget_exhausted',
        updated_at = statement_timestamp()
    where (target_organization_id is null
        or upload_value.organization_id = target_organization_id)
      and upload_value.attempt_count >= target_max_attempts
      and (
        (upload_value.status in ('pending', 'retryable')
          and upload_value.available_at <= statement_timestamp())
        or (upload_value.status = 'processing'
          and upload_value.lease_expires_at <= statement_timestamp())
      )
    returning upload_value.id
  )
  select upload_value.*
  into upload_record
  from app_private.admin_catalog_image_uploads as upload_value
  where (target_organization_id is null
      or upload_value.organization_id = target_organization_id)
    and upload_value.attempt_count < target_max_attempts
    and (
      (upload_value.status in ('pending', 'retryable')
        and upload_value.available_at <= statement_timestamp())
      or (upload_value.status = 'processing'
        and upload_value.lease_expires_at <= statement_timestamp())
    )
  order by upload_value.available_at, upload_value.created_at, upload_value.id
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  if not exists (
    select 1
    from app_private.product_variants as variant_value
    where variant_value.organization_id = upload_record.organization_id
      and variant_value.id = upload_record.variant_id
      and variant_value.status <> 'archived'
  ) then
    update app_private.admin_catalog_image_uploads
    set status = 'dead_letter',
        last_error_code = 'catalog_variant_archived',
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        updated_at = statement_timestamp()
    where organization_id = upload_record.organization_id
      and id = upload_record.id;
    return;
  end if;

  claimed_lease_token := extensions.gen_random_uuid();
  claimed_lease_expires_at := statement_timestamp()
    + pg_catalog.make_interval(secs => target_lease_seconds);

  update app_private.admin_catalog_image_uploads
  set status = 'processing',
      attempt_count = upload_record.attempt_count + 1,
      processing_started_at = statement_timestamp(),
      lease_owner = target_worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = claimed_lease_expires_at,
      last_error_code = null,
      updated_at = statement_timestamp()
  where organization_id = upload_record.organization_id
    and id = upload_record.id;

  perform app_private.insert_agent_audit_event(
    upload_record.organization_id,
    'admin_catalog_image_upload.claim_accepted',
    'worker',
    null,
    'admin-catalog-image-upload:' || upload_record.id::text,
    null,
    jsonb_build_object(
      'upload_id', upload_record.id,
      'attempt_number', upload_record.attempt_count + 1,
      'lease_expires_at', claimed_lease_expires_at
    )
  );

  upload_id := upload_record.id;
  organization_id := upload_record.organization_id;
  actor_user_id := upload_record.actor_user_id;
  variant_id := upload_record.variant_id;
  media_asset_id := upload_record.media_asset_id;
  source_object_path := upload_record.source_object_path;
  source_sha256_hex := upload_record.source_sha256_hex;
  source_mime_type := upload_record.source_mime_type;
  source_byte_size := upload_record.source_byte_size;
  source_width_pixels := upload_record.source_width_pixels;
  source_height_pixels := upload_record.source_height_pixels;
  scope := upload_record.scope;
  allow_public := upload_record.allow_public;
  alt_text := upload_record.alt_text;
  attempt_number := upload_record.attempt_count + 1;
  lease_token := claimed_lease_token;
  lease_expires_at := claimed_lease_expires_at;
  correlation_id := 'admin-catalog-image-upload:' || upload_record.id::text;
  trace_id := null;
  return next;
end;
$$;

revoke all on function api.claim_admin_catalog_image_upload(
  text, integer, integer, uuid
) from public, anon, authenticated;
grant execute on function api.claim_admin_catalog_image_upload(
  text, integer, integer, uuid
) to service_role;

-- =============================================================================
-- complete_admin_catalog_image_upload
-- Worker finished transcoding. Registers source_original + analysis_webp
-- renditions, marks the asset verified, and attaches the photo to the variant.
-- Idempotent on the asset/path uniqueness; the add_photo call is skipped if the
-- asset is already attached to the same scope (re-upload case).
-- =============================================================================
create function api.complete_admin_catalog_image_upload(
  target_organization_id uuid,
  target_upload_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_analysis_sha256_hex text,
  target_analysis_mime_type text,
  target_analysis_byte_size bigint,
  target_analysis_width_pixels integer,
  target_analysis_height_pixels integer,
  target_analysis_object_path text,
  target_trace_id text default null
)
returns table (
  upload_id uuid,
  status text,
  product_media_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload_record app_private.admin_catalog_image_uploads%rowtype;
  source_bytea bytea;
  analysis_bytea bytea;
  source_register record;
  analysis_register record;
  source_object_status text;
  analysis_object_status text;
  edit_result jsonb;
  computed_product_media_id uuid;
  computed_asset_id uuid;
  already_attached boolean := false;
begin
  if target_organization_id is null
    or target_upload_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_analysis_sha256_hex is null
    or char_length(target_analysis_sha256_hex) <> 64
    or target_analysis_sha256_hex <> lower(target_analysis_sha256_hex)
    or target_analysis_sha256_hex !~ '^[0-9a-f]{64}$'
    or target_analysis_mime_type is null
    or target_analysis_mime_type <> 'image/webp'
    or target_analysis_byte_size is null
    or target_analysis_byte_size not between 1 and 26214400
    or target_analysis_width_pixels is null
    or target_analysis_width_pixels not between 1 and 100000
    or target_analysis_height_pixels is null
    or target_analysis_height_pixels not between 1 and 100000
    or target_analysis_width_pixels::bigint * target_analysis_height_pixels::bigint > 50000000
    or greatest(target_analysis_width_pixels, target_analysis_height_pixels) > 2500
    or target_analysis_object_path is null
    or btrim(target_analysis_object_path) = ''
    or char_length(target_analysis_object_path) > 1024 then
    raise exception using errcode = '22023',
      message = 'admin catalog image upload completion arguments are invalid';
  end if;

  select upload_value.*
  into upload_record
  from app_private.admin_catalog_image_uploads as upload_value
  where upload_value.organization_id = target_organization_id
    and upload_value.id = target_upload_id
  for update;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'admin catalog image upload was not found';
  end if;

  if upload_record.status = 'succeeded' then
    if upload_record.analysis_sha256_hex is distinct from target_analysis_sha256_hex
      or upload_record.analysis_object_path is distinct from target_analysis_object_path
      or upload_record.analysis_byte_size is distinct from target_analysis_byte_size
      or upload_record.analysis_width_pixels is distinct from target_analysis_width_pixels
      or upload_record.analysis_height_pixels is distinct from target_analysis_height_pixels then
      raise exception using errcode = '23514',
        message = 'admin catalog image upload completion replay conflicts';
    end if;
    upload_id := upload_record.id;
    status := upload_record.status;
    product_media_id := upload_record.product_media_id;
    was_replayed := true;
    return next;
    return;
  end if;

  if upload_record.status <> 'processing'
    or upload_record.lease_owner is distinct from target_worker_id
    or upload_record.lease_token is distinct from target_lease_token
    or upload_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501',
      message = 'admin catalog image upload lease is invalid';
  end if;

  computed_asset_id := upload_record.media_asset_id;
  source_bytea := decode(upload_record.source_sha256_hex, 'hex');
  analysis_bytea := decode(target_analysis_sha256_hex, 'hex');

  select *
  into source_register
  from api.register_media_asset_object(
    target_organization_id,
    computed_asset_id,
    'source_original',
    'agentefer-catalog-private',
    upload_record.source_object_path,
    source_bytea,
    upload_record.source_mime_type,
    upload_record.source_byte_size,
    upload_record.source_width_pixels,
    upload_record.source_height_pixels,
    '{}'::jsonb,
    'member',
    upload_record.actor_user_id,
    upload_record.idempotency_key || ':source'
  );
  source_object_status := source_register.object_status;

  select *
  into analysis_register
  from api.register_media_asset_object(
    target_organization_id,
    computed_asset_id,
    'analysis_webp',
    'agentefer-catalog-private',
    target_analysis_object_path,
    analysis_bytea,
    target_analysis_mime_type,
    target_analysis_byte_size,
    target_analysis_width_pixels,
    target_analysis_height_pixels,
    jsonb_build_object(
      'kind', 'analysis_webp',
      'source', 'sharp',
      'quality', 85,
      'effort', 4,
      'max_dimension', 2500
    ),
    'member',
    upload_record.actor_user_id,
    upload_record.idempotency_key || ':analysis'
  );
  analysis_object_status := analysis_register.object_status;

  update app_private.media_assets
  set ingest_status = 'verified',
      analyzed_at = statement_timestamp(),
      updated_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = computed_asset_id;

  -- If the same asset is already attached to the same scope, treat as success.
  select pm.id
  into computed_product_media_id
  from app_private.product_media as pm
  where pm.organization_id = target_organization_id
    and pm.media_asset_id = computed_asset_id
    and (
      (upload_record.scope = 'variant' and pm.variant_id = upload_record.variant_id)
      or (upload_record.scope = 'product' and pm.variant_id is null)
    )
    and pm.status <> 'retired'
  limit 1;

  if computed_product_media_id is null then
    edit_result := api.admin_edit_catalog_offer(
      target_organization_id,
      upload_record.actor_user_id,
      upload_record.variant_id,
      'add_photo',
      jsonb_build_object(
        'mediaAssetId', computed_asset_id,
        'scope', upload_record.scope,
        'allowPublic', upload_record.allow_public,
        'altText', upload_record.alt_text
      ),
      upload_record.idempotency_key || ':edit'
    );
    computed_product_media_id :=
      (edit_result -> 'result' ->> 'productMediaId')::uuid;
    already_attached := false;
  else
    already_attached := true;
  end if;

  update app_private.admin_catalog_image_uploads
  set status = 'succeeded',
      analysis_object_path = target_analysis_object_path,
      analysis_sha256_hex = target_analysis_sha256_hex,
      analysis_mime_type = target_analysis_mime_type,
      analysis_byte_size = target_analysis_byte_size,
      analysis_width_pixels = target_analysis_width_pixels,
      analysis_height_pixels = target_analysis_height_pixels,
      product_media_id = computed_product_media_id,
      completed_at = statement_timestamp(),
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = null,
      updated_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = upload_record.id;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'admin_catalog_image_upload.completed',
    'worker',
    null,
    'admin-catalog-image-upload:' || upload_record.id::text,
    target_trace_id,
    jsonb_build_object(
      'upload_id', upload_record.id,
      'media_asset_id', computed_asset_id,
      'product_media_id', computed_product_media_id,
      'source_object_status', source_object_status,
      'analysis_object_status', analysis_object_status,
      'already_attached', already_attached
    )
  );

  upload_id := upload_record.id;
  status := 'succeeded';
  product_media_id := computed_product_media_id;
  was_replayed := false;
  return next;
end;
$$;

revoke all on function api.complete_admin_catalog_image_upload(
  uuid, uuid, text, uuid, text, text, bigint, integer, integer, text, text
) from public, anon, authenticated;
grant execute on function api.complete_admin_catalog_image_upload(
  uuid, uuid, text, uuid, text, text, bigint, integer, integer, text, text
) to service_role;

-- =============================================================================
-- fail_admin_catalog_image_upload
-- Worker reports a transient or terminal failure. Retryable failures go back
-- to the queue with a delay; otherwise the upload goes to dead_letter.
-- =============================================================================
create function api.fail_admin_catalog_image_upload(
  target_organization_id uuid,
  target_upload_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_error_code text,
  target_retryable boolean,
  target_retry_delay_seconds integer default 30,
  target_max_attempts integer default 8,
  target_trace_id text default null
)
returns table (
  upload_id uuid,
  status text,
  next_attempt_at timestamptz,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload_record app_private.admin_catalog_image_uploads%rowtype;
  next_status text;
  next_attempt timestamptz;
begin
  if target_organization_id is null
    or target_upload_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_error_code is null
    or btrim(target_error_code) = ''
    or char_length(target_error_code) > 200
    or target_retry_delay_seconds is null
    or target_retry_delay_seconds not between 0 and 3600
    or target_max_attempts is null
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode = '22023',
      message = 'admin catalog image upload failure arguments are invalid';
  end if;

  select upload_value.*
  into upload_record
  from app_private.admin_catalog_image_uploads as upload_value
  where upload_value.organization_id = target_organization_id
    and upload_value.id = target_upload_id
  for update;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'admin catalog image upload was not found';
  end if;

  if upload_record.status = 'succeeded' then
    raise exception using errcode = '23514',
      message = 'admin catalog image upload already succeeded';
  end if;

  if upload_record.status <> 'processing'
    or upload_record.lease_owner is distinct from target_worker_id
    or upload_record.lease_token is distinct from target_lease_token
    or upload_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501',
      message = 'admin catalog image upload lease is invalid';
  end if;

  if target_retryable and upload_record.attempt_count < target_max_attempts then
    next_status := 'retryable';
    next_attempt := statement_timestamp()
      + pg_catalog.make_interval(secs => target_retry_delay_seconds);
  else
    next_status := 'dead_letter';
    next_attempt := null;
  end if;

  update app_private.admin_catalog_image_uploads
  set status = next_status,
      available_at = coalesce(next_attempt, available_at),
      processing_started_at = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = target_error_code,
      updated_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = upload_record.id;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    case
      when next_status = 'retryable'
        then 'admin_catalog_image_upload.retry_scheduled'
      else 'admin_catalog_image_upload.dead_letter'
    end,
    'worker',
    null,
    'admin-catalog-image-upload:' || upload_record.id::text,
    target_trace_id,
    jsonb_build_object(
      'upload_id', upload_record.id,
      'attempt_count', upload_record.attempt_count,
      'error_code', target_error_code,
      'retryable', target_retryable,
      'next_attempt_at', next_attempt
    )
  );

  upload_id := upload_record.id;
  status := next_status;
  next_attempt_at := next_attempt;
  was_replayed := false;
  return next;
end;
$$;

revoke all on function api.fail_admin_catalog_image_upload(
  uuid, uuid, text, uuid, text, boolean, integer, integer, text
) from public, anon, authenticated;
grant execute on function api.fail_admin_catalog_image_upload(
  uuid, uuid, text, uuid, text, boolean, integer, integer, text
) to service_role;

-- =============================================================================
-- get_admin_catalog_image_upload_status
-- Browser polls this endpoint to know when the worker is done.
-- =============================================================================
create function api.get_admin_catalog_image_upload_status(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_upload_id uuid
)
returns table (
  upload_id uuid,
  media_asset_id uuid,
  product_media_id uuid,
  status text,
  last_error_code text,
  attempt_count integer,
  analysis_object_path text,
  created_at timestamptz,
  updated_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  upload_record app_private.admin_catalog_image_uploads%rowtype;
begin
  if target_organization_id is null
    or target_actor_user_id is null
    or target_upload_id is null then
    raise exception using errcode = '22023',
      message = 'admin catalog image upload status arguments are invalid';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  );

  select upload_value.*
  into upload_record
  from app_private.admin_catalog_image_uploads as upload_value
  where upload_value.organization_id = target_organization_id
    and upload_value.id = target_upload_id;

  if not found then
    raise exception using errcode = 'P0002',
      message = 'admin catalog image upload was not found';
  end if;

  upload_id := upload_record.id;
  media_asset_id := upload_record.media_asset_id;
  product_media_id := upload_record.product_media_id;
  status := upload_record.status;
  last_error_code := upload_record.last_error_code;
  attempt_count := upload_record.attempt_count;
  analysis_object_path := upload_record.analysis_object_path;
  created_at := upload_record.created_at;
  updated_at := upload_record.updated_at;
  completed_at := upload_record.completed_at;
  return next;
end;
$$;

revoke all on function api.get_admin_catalog_image_upload_status(
  uuid, uuid, uuid
) from public, anon, authenticated;
grant execute on function api.get_admin_catalog_image_upload_status(
  uuid, uuid, uuid
) to service_role;

notify pgrst, 'reload schema';

commit;
