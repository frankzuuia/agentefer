begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values
  (
    'agentefer-catalog-private',
    'agentefer-catalog-private',
    false,
    26214400,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
  ),
  (
    'agentefer-catalog-public',
    'agentefer-catalog-public',
    true,
    10485760,
    array['image/webp']::text[]
  )
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types,
    updated_at = statement_timestamp();

create table app_private.media_asset_objects (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  media_asset_id uuid not null,
  rendition_kind text not null,
  bucket_id text not null,
  object_path text not null,
  content_sha256 bytea not null,
  mime_type text not null,
  byte_size bigint not null,
  width_pixels integer not null,
  height_pixels integer not null,
  derivation_spec jsonb not null default '{}'::jsonb,
  status text not null,
  verified_at timestamptz not null default statement_timestamp(),
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint media_asset_objects_organization_id_id_unique
    unique (organization_id, id),
  constraint media_asset_objects_asset_fk
    foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id)
    on delete restrict,
  constraint media_asset_objects_bucket_fk
    foreign key (bucket_id)
    references storage.buckets (id)
    on delete restrict,
  constraint media_asset_objects_storage_identity_unique
    unique (bucket_id, object_path),
  constraint media_asset_objects_content_identity_unique
    unique (organization_id, media_asset_id, rendition_kind, content_sha256),
  constraint media_asset_objects_rendition_valid
    check (
      rendition_kind in (
        'source_original',
        'analysis_webp',
        'storefront_webp',
        'whatsapp_jpeg'
      )
    ),
  constraint media_asset_objects_hash_valid
    check (octet_length(content_sha256) = 32),
  constraint media_asset_objects_mime_valid
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  constraint media_asset_objects_size_valid
    check (
      byte_size between 1 and 26214400
      and (bucket_id <> 'agentefer-catalog-public' or byte_size <= 10485760)
    ),
  constraint media_asset_objects_dimensions_valid
    check (
      width_pixels between 1 and 100000
      and height_pixels between 1 and 100000
      and width_pixels::bigint * height_pixels::bigint <= 50000000
      and (
        rendition_kind = 'source_original'
        or greatest(width_pixels, height_pixels) <= 2500
      )
    ),
  constraint media_asset_objects_derivation_spec_valid
    check (
      jsonb_typeof(derivation_spec) = 'object'
      and octet_length(derivation_spec::text) <= 16384
      and (
        (rendition_kind = 'source_original' and derivation_spec = '{}'::jsonb)
        or (rendition_kind <> 'source_original' and derivation_spec <> '{}'::jsonb)
      )
    ),
  constraint media_asset_objects_status_valid
    check (status in ('verified', 'published', 'quarantined', 'retired', 'missing')),
  constraint media_asset_objects_bucket_rendition_valid
    check (
      (
        rendition_kind = 'source_original'
        and bucket_id = 'agentefer-catalog-private'
        and mime_type in ('image/jpeg', 'image/png', 'image/webp')
        and status in ('verified', 'quarantined', 'retired', 'missing')
      )
      or (
        rendition_kind = 'analysis_webp'
        and bucket_id = 'agentefer-catalog-private'
        and mime_type = 'image/webp'
        and status in ('verified', 'quarantined', 'retired', 'missing')
      )
      or (
        rendition_kind = 'whatsapp_jpeg'
        and bucket_id = 'agentefer-catalog-private'
        and mime_type = 'image/jpeg'
        and status in ('verified', 'quarantined', 'retired', 'missing')
      )
      or (
        rendition_kind = 'storefront_webp'
        and bucket_id = 'agentefer-catalog-public'
        and mime_type = 'image/webp'
        and status in ('published', 'retired', 'missing')
      )
    ),
  constraint media_asset_objects_path_valid
    check (
      object_path = organization_id::text
        || '/' || media_asset_id::text
        || '/' || rendition_kind
        || '/' || lower(encode(content_sha256, 'hex'))
        || case mime_type
          when 'image/jpeg' then '.jpg'
          when 'image/png' then '.png'
          when 'image/webp' then '.webp'
        end
    ),
  constraint media_asset_objects_lifecycle_valid
    check (
      verified_at >= created_at
      and (
        (status = 'published' and published_at is not null and published_at >= verified_at)
        or (status <> 'published' and rendition_kind <> 'storefront_webp' and published_at is null)
        or (status in ('retired', 'missing') and rendition_kind = 'storefront_webp'
          and published_at is not null and published_at >= verified_at)
      )
      and (
        (status = 'retired' and retired_at is not null and retired_at >= verified_at)
        or (status <> 'retired' and retired_at is null)
      )
    )
);

create unique index media_asset_objects_one_live_rendition
  on app_private.media_asset_objects (organization_id, media_asset_id, rendition_kind)
  where status in ('verified', 'published');
create index media_asset_objects_asset_status_idx
  on app_private.media_asset_objects (
    organization_id,
    media_asset_id,
    rendition_kind,
    status
  );
create index media_asset_objects_bucket_fk_idx
  on app_private.media_asset_objects (bucket_id);

create table app_private.product_media (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  product_id uuid not null,
  variant_id uuid,
  media_asset_id uuid not null,
  media_role text not null default 'gallery',
  ordinal integer not null,
  alt_text text,
  status text not null default 'draft',
  created_by_user_id uuid not null,
  approved_by_user_id uuid,
  approved_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint product_media_organization_id_id_unique
    unique (organization_id, id),
  constraint product_media_product_fk
    foreign key (organization_id, product_id)
    references app_private.products (organization_id, id)
    on delete restrict,
  constraint product_media_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint product_media_asset_fk
    foreign key (organization_id, media_asset_id)
    references app_private.media_assets (organization_id, id)
    on delete restrict,
  constraint product_media_created_by_user_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint product_media_approved_by_user_fk
    foreign key (organization_id, approved_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint product_media_role_valid
    check (media_role in ('primary', 'gallery', 'detail')),
  constraint product_media_ordinal_valid
    check (ordinal between 0 and 99),
  constraint product_media_alt_text_valid
    check (
      alt_text is null
      or (alt_text = btrim(alt_text) and char_length(alt_text) between 1 and 2000)
    ),
  constraint product_media_status_valid
    check (status in ('draft', 'approved', 'retired')),
  constraint product_media_lifecycle_valid
    check (
      (
        status = 'draft'
        and approved_by_user_id is null
        and approved_at is null
        and retired_at is null
      )
      or (
        status = 'approved'
        and approved_by_user_id is not null
        and approved_at is not null
        and approved_at >= created_at
        and retired_at is null
      )
      or (
        status = 'retired'
        and retired_at is not null
        and retired_at >= created_at
        and (
          (approved_by_user_id is null and approved_at is null)
          or (
            approved_by_user_id is not null
            and approved_at is not null
            and approved_at >= created_at
            and retired_at >= approved_at
          )
        )
      )
    )
);

create unique index product_media_product_ordinal_unique
  on app_private.product_media (organization_id, product_id, ordinal)
  where variant_id is null and status <> 'retired';
create unique index product_media_variant_ordinal_unique
  on app_private.product_media (organization_id, product_id, variant_id, ordinal)
  where variant_id is not null and status <> 'retired';
create unique index product_media_product_asset_unique
  on app_private.product_media (organization_id, product_id, media_asset_id)
  where variant_id is null and status <> 'retired';
create unique index product_media_variant_asset_unique
  on app_private.product_media (organization_id, product_id, variant_id, media_asset_id)
  where variant_id is not null and status <> 'retired';
create unique index product_media_one_product_primary
  on app_private.product_media (organization_id, product_id)
  where variant_id is null and media_role = 'primary' and status <> 'retired';
create unique index product_media_one_variant_primary
  on app_private.product_media (organization_id, product_id, variant_id)
  where variant_id is not null and media_role = 'primary' and status <> 'retired';
create index product_media_asset_fk_idx
  on app_private.product_media (organization_id, media_asset_id);
create index product_media_created_by_fk_idx
  on app_private.product_media (organization_id, created_by_user_id);
create index product_media_approved_by_fk_idx
  on app_private.product_media (organization_id, approved_by_user_id)
  where approved_by_user_id is not null;

create function app_private.media_actor_is_authorized(
  target_organization_id uuid,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when target_actor_kind = 'worker' then target_actor_user_id is null
    when target_actor_kind = 'member' and target_actor_user_id is not null then exists (
      select 1
      from app_private.organization_memberships as membership
      where membership.organization_id = target_organization_id
        and membership.user_id = target_actor_user_id
        and membership.status = 'active'
        and membership.role = any(target_allowed_roles)
    )
    else false
  end;
$$;

create function app_private.validate_media_asset_object_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('verified', 'published') and not exists (
    select 1
    from storage.objects as object_value
    where object_value.bucket_id = new.bucket_id
      and object_value.name = new.object_path
      and (to_jsonb(object_value) ->> 'archived_at') is null
      and not coalesce(
        (to_jsonb(object_value) ->> 'is_delete_marker')::boolean,
        false
      )
  ) then
    raise exception using
      errcode = '23514',
      message = 'media object is not present in the configured Storage bucket';
  end if;

  return new;
end;
$$;

create function app_private.prevent_media_asset_object_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.media_asset_id is distinct from old.media_asset_id
    or new.rendition_kind is distinct from old.rendition_kind
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path
    or new.content_sha256 is distinct from old.content_sha256
    or new.mime_type is distinct from old.mime_type
    or new.byte_size is distinct from old.byte_size
    or new.width_pixels is distinct from old.width_pixels
    or new.height_pixels is distinct from old.height_pixels
    or new.derivation_spec is distinct from old.derivation_spec
    or new.verified_at is distinct from old.verified_at
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'media object identity is immutable';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'verified' and new.status in ('quarantined', 'retired', 'missing'))
    or (old.status = 'quarantined' and new.status = 'retired')
    or (old.status = 'published' and new.status in ('retired', 'missing'))
    or (old.status = 'missing' and new.status in ('verified', 'published', 'retired'))
  ) then
    raise exception using errcode = '23514', message = 'media object status transition is invalid';
  end if;

  if new.status = 'published' and new.published_at is null then
    new.published_at := statement_timestamp();
  elsif old.published_at is not null and new.published_at is distinct from old.published_at then
    raise exception using errcode = '23514', message = 'media publication timestamp is immutable';
  end if;

  if new.status = 'retired' and new.retired_at is null then
    new.retired_at := statement_timestamp();
  elsif old.retired_at is not null and new.retired_at is distinct from old.retired_at then
    raise exception using errcode = '23514', message = 'media retirement timestamp is immutable';
  end if;

  return new;
end;
$$;

create function app_private.ensure_verified_media_asset_has_objects()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ingest_status = 'verified' and (
    not exists (
      select 1
      from app_private.media_asset_objects as object_value
      where object_value.organization_id = new.organization_id
        and object_value.media_asset_id = new.id
        and object_value.rendition_kind = 'source_original'
        and object_value.status = 'verified'
    )
    or not exists (
      select 1
      from app_private.media_asset_objects as object_value
      where object_value.organization_id = new.organization_id
        and object_value.media_asset_id = new.id
        and object_value.rendition_kind = 'analysis_webp'
        and object_value.status = 'verified'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'verified media asset requires original and analysis WebP objects';
  end if;

  return null;
end;
$$;

create function app_private.validate_product_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant_product_id uuid;
  target_asset_status text;
begin
  if new.variant_id is not null then
    select variant_value.product_id
    into target_variant_product_id
    from app_private.product_variants as variant_value
    where variant_value.organization_id = new.organization_id
      and variant_value.id = new.variant_id;

    if target_variant_product_id is distinct from new.product_id then
      raise exception using errcode = '23514', message = 'media variant does not belong to product';
    end if;
  end if;

  select asset_value.ingest_status
  into target_asset_status
  from app_private.media_assets as asset_value
  where asset_value.organization_id = new.organization_id
    and asset_value.id = new.media_asset_id;

  if target_asset_status is distinct from 'verified'
    or not exists (
      select 1
      from app_private.media_asset_objects as object_value
      where object_value.organization_id = new.organization_id
        and object_value.media_asset_id = new.media_asset_id
        and object_value.rendition_kind = 'analysis_webp'
        and object_value.status = 'verified'
    ) then
    raise exception using errcode = '23514', message = 'product media requires a verified asset';
  end if;

  if not app_private.media_actor_is_authorized(
    new.organization_id,
    'member',
    new.created_by_user_id,
    array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception using errcode = '42501', message = 'product media creator is not authorized';
  end if;

  if new.status = 'approved' and not app_private.media_actor_is_authorized(
    new.organization_id,
    'member',
    new.approved_by_user_id,
    array['owner', 'admin']::text[]
  ) then
    raise exception using errcode = '42501', message = 'product media approver is not authorized';
  end if;

  return new;
end;
$$;

create function app_private.prevent_product_media_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.product_id is distinct from old.product_id
    or new.variant_id is distinct from old.variant_id
    or new.media_asset_id is distinct from old.media_asset_id
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using errcode = '23514', message = 'product media identity is immutable';
  end if;

  if new.status is distinct from old.status and not (
    (old.status = 'draft' and new.status in ('approved', 'retired'))
    or (old.status = 'approved' and new.status = 'retired')
  ) then
    raise exception using errcode = '23514', message = 'product media status transition is invalid';
  end if;

  if old.status = 'approved'
    and new.status = 'approved'
    and (
      new.media_role is distinct from old.media_role
      or new.ordinal is distinct from old.ordinal
      or new.alt_text is distinct from old.alt_text
    )
    and (
      new.approved_by_user_id is null
      or new.approved_at is null
      or new.approved_at <= old.approved_at
    ) then
    raise exception using errcode = '23514', message = 'approved presentation change requires reapproval';
  end if;

  if old.approved_at is not null
    and new.status <> 'approved'
    and (
      new.approved_at is distinct from old.approved_at
      or new.approved_by_user_id is distinct from old.approved_by_user_id
    ) then
    raise exception using errcode = '23514', message = 'product media approval evidence is immutable';
  end if;

  if new.status = 'retired' and new.retired_at is null then
    new.retired_at := statement_timestamp();
  elsif old.retired_at is not null and new.retired_at is distinct from old.retired_at then
    raise exception using errcode = '23514', message = 'product media retirement timestamp is immutable';
  end if;

  return new;
end;
$$;

create function app_private.reject_media_history_delete()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using errcode = '42501', message = 'media history cannot be deleted';
end;
$$;

create trigger media_asset_objects_validate_storage
before insert or update of status on app_private.media_asset_objects
for each row execute function app_private.validate_media_asset_object_storage();
create trigger media_asset_objects_prevent_rewrite
before update on app_private.media_asset_objects
for each row execute function app_private.prevent_media_asset_object_rewrite();
create trigger media_asset_objects_set_updated_at
before update on app_private.media_asset_objects
for each row execute function app_private.set_updated_at();
create trigger media_asset_objects_reject_delete
before delete on app_private.media_asset_objects
for each row execute function app_private.reject_media_history_delete();

create constraint trigger media_assets_require_storage_objects
after insert or update of ingest_status on app_private.media_assets
deferrable initially deferred
for each row execute function app_private.ensure_verified_media_asset_has_objects();

create trigger product_media_validate
before insert or update on app_private.product_media
for each row execute function app_private.validate_product_media();
create trigger product_media_prevent_reassignment
before update on app_private.product_media
for each row execute function app_private.prevent_product_media_reassignment();
create trigger product_media_set_updated_at
before update on app_private.product_media
for each row execute function app_private.set_updated_at();
create trigger product_media_reject_delete
before delete on app_private.product_media
for each row execute function app_private.reject_media_history_delete();

create function api.begin_media_asset_ingest(
  target_organization_id uuid,
  target_content_sha256 bytea,
  target_mime_type text,
  target_byte_size bigint,
  target_width_pixels integer,
  target_height_pixels integer,
  target_original_file_name text,
  target_source_kind text,
  target_source_message_id uuid,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  media_asset_id uuid,
  ingest_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset_record app_private.media_assets%rowtype;
begin
  if target_organization_id is null
    or target_content_sha256 is null
    or octet_length(target_content_sha256) <> 32
    or target_mime_type not in ('image/jpeg', 'image/png', 'image/webp')
    or target_byte_size is null
    or target_byte_size not between 1 and 26214400
    or target_width_pixels is null
    or target_height_pixels is null
    or target_width_pixels not between 1 and 100000
    or target_height_pixels not between 1 and 100000
    or target_width_pixels::bigint * target_height_pixels::bigint > 50000000
    or target_source_kind not in ('message', 'authorized_upload', 'authorized_import')
    or (target_source_kind = 'message' and target_source_message_id is null)
    or target_correlation_id is null
    or btrim(target_correlation_id) = '' then
    raise exception using errcode = '22023', message = 'media ingest arguments are invalid';
  end if;

  if not app_private.media_actor_is_authorized(
    target_organization_id,
    target_actor_kind,
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception using errcode = '42501', message = 'media ingest actor is not authorized';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':media:' || encode(target_content_sha256, 'hex'),
      0
    )
  );

  select asset_value.*
  into asset_record
  from app_private.media_assets as asset_value
  where asset_value.organization_id = target_organization_id
    and asset_value.content_sha256 = target_content_sha256
  for update;

  if found then
    if asset_record.mime_type is distinct from target_mime_type
      or asset_record.byte_size is distinct from target_byte_size
      or asset_record.width_pixels is distinct from target_width_pixels
      or asset_record.height_pixels is distinct from target_height_pixels then
      raise exception using errcode = '23514', message = 'media hash replay metadata conflicts';
    end if;

    media_asset_id := asset_record.id;
    ingest_status := asset_record.ingest_status;
    was_replayed := true;
    return next;
    return;
  end if;

  insert into app_private.media_assets (
    organization_id,
    content_sha256,
    mime_type,
    byte_size,
    width_pixels,
    height_pixels,
    original_file_name,
    source_kind,
    source_message_id,
    ingest_status
  ) values (
    target_organization_id,
    target_content_sha256,
    target_mime_type,
    target_byte_size,
    target_width_pixels,
    target_height_pixels,
    target_original_file_name,
    target_source_kind,
    target_source_message_id,
    'received'
  )
  returning * into asset_record;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'media.ingest.started',
    target_actor_kind,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'media_asset_id', asset_record.id,
      'mime_type', asset_record.mime_type,
      'byte_size', asset_record.byte_size,
      'width_pixels', asset_record.width_pixels,
      'height_pixels', asset_record.height_pixels,
      'source_kind', asset_record.source_kind
    )
  );

  media_asset_id := asset_record.id;
  ingest_status := asset_record.ingest_status;
  was_replayed := false;
  return next;
end;
$$;

create function api.register_media_asset_object(
  target_organization_id uuid,
  target_media_asset_id uuid,
  target_rendition_kind text,
  target_bucket_id text,
  target_object_path text,
  target_content_sha256 bytea,
  target_mime_type text,
  target_byte_size bigint,
  target_width_pixels integer,
  target_height_pixels integer,
  target_derivation_spec jsonb,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  media_asset_object_id uuid,
  object_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  object_record app_private.media_asset_objects%rowtype;
  target_status text;
begin
  if not app_private.media_actor_is_authorized(
    target_organization_id,
    target_actor_kind,
    target_actor_user_id,
    case
      when target_rendition_kind = 'storefront_webp'
        then array['owner', 'admin']::text[]
      else array['owner', 'admin', 'operator']::text[]
    end
  ) then
    raise exception using errcode = '42501', message = 'media object actor is not authorized';
  end if;

  target_status := case
    when target_rendition_kind = 'storefront_webp' then 'published'
    else 'verified'
  end;

  if target_rendition_kind = 'storefront_webp' and not exists (
    select 1
    from app_private.product_media as relation_value
    where relation_value.organization_id = target_organization_id
      and relation_value.media_asset_id = target_media_asset_id
      and relation_value.status = 'approved'
  ) then
    raise exception using errcode = '42501', message = 'storefront media requires approved product media';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_bucket_id || ':' || target_object_path, 0)
  );

  select object_value.*
  into object_record
  from app_private.media_asset_objects as object_value
  where object_value.bucket_id = target_bucket_id
    and object_value.object_path = target_object_path
  for update;

  if found then
    if object_record.organization_id is distinct from target_organization_id
      or object_record.media_asset_id is distinct from target_media_asset_id
      or object_record.rendition_kind is distinct from target_rendition_kind
      or object_record.content_sha256 is distinct from target_content_sha256
      or object_record.mime_type is distinct from target_mime_type
      or object_record.byte_size is distinct from target_byte_size
      or object_record.width_pixels is distinct from target_width_pixels
      or object_record.height_pixels is distinct from target_height_pixels
      or object_record.derivation_spec is distinct from target_derivation_spec then
      raise exception using errcode = '23514', message = 'media object path replay conflicts';
    end if;

    media_asset_object_id := object_record.id;
    object_status := object_record.status;
    was_replayed := true;
    return next;
    return;
  end if;

  insert into app_private.media_asset_objects (
    organization_id,
    media_asset_id,
    rendition_kind,
    bucket_id,
    object_path,
    content_sha256,
    mime_type,
    byte_size,
    width_pixels,
    height_pixels,
    derivation_spec,
    status,
    published_at
  ) values (
    target_organization_id,
    target_media_asset_id,
    target_rendition_kind,
    target_bucket_id,
    target_object_path,
    target_content_sha256,
    target_mime_type,
    target_byte_size,
    target_width_pixels,
    target_height_pixels,
    target_derivation_spec,
    target_status,
    case when target_status = 'published' then statement_timestamp() else null end
  )
  returning * into object_record;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    case
      when target_status = 'published' then 'media.storage.published'
      else 'media.storage.registered'
    end,
    target_actor_kind,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'media_asset_id', target_media_asset_id,
      'media_asset_object_id', object_record.id,
      'rendition_kind', object_record.rendition_kind,
      'mime_type', object_record.mime_type,
      'byte_size', object_record.byte_size,
      'status', object_record.status
    )
  );

  media_asset_object_id := object_record.id;
  object_status := object_record.status;
  was_replayed := false;
  return next;
end;
$$;

create function api.complete_media_asset_ingest(
  target_organization_id uuid,
  target_media_asset_id uuid,
  target_actor_kind text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  media_asset_id uuid,
  ingest_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  asset_record app_private.media_assets%rowtype;
begin
  if not app_private.media_actor_is_authorized(
    target_organization_id,
    target_actor_kind,
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception using errcode = '42501', message = 'media completion actor is not authorized';
  end if;

  select asset_value.*
  into asset_record
  from app_private.media_assets as asset_value
  where asset_value.organization_id = target_organization_id
    and asset_value.id = target_media_asset_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'media asset was not found';
  end if;

  if asset_record.ingest_status = 'verified' then
    media_asset_id := asset_record.id;
    ingest_status := asset_record.ingest_status;
    was_replayed := true;
    return next;
    return;
  end if;

  if asset_record.ingest_status <> 'received' then
    raise exception using errcode = '23514', message = 'media asset cannot be completed from current state';
  end if;

  update app_private.media_assets
  set ingest_status = 'verified'
  where organization_id = target_organization_id
    and id = target_media_asset_id
  returning * into asset_record;

  set constraints app_private.media_assets_require_storage_objects immediate;
  set constraints app_private.media_assets_require_storage_objects deferred;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'media.ingest.verified',
    target_actor_kind,
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object('media_asset_id', asset_record.id)
  );

  media_asset_id := asset_record.id;
  ingest_status := asset_record.ingest_status;
  was_replayed := false;
  return next;
end;
$$;

create function api.link_product_media(
  target_organization_id uuid,
  target_product_id uuid,
  target_variant_id uuid,
  target_media_asset_id uuid,
  target_media_role text,
  target_ordinal integer,
  target_alt_text text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  product_media_id uuid,
  media_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation_record app_private.product_media%rowtype;
begin
  if not app_private.media_actor_is_authorized(
    target_organization_id,
    'member',
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception using errcode = '42501', message = 'product media actor is not authorized';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text
        || ':product-media:' || target_product_id::text
        || ':' || coalesce(target_variant_id::text, 'product')
        || ':' || target_media_asset_id::text,
      0
    )
  );

  select relation_value.*
  into relation_record
  from app_private.product_media as relation_value
  where relation_value.organization_id = target_organization_id
    and relation_value.product_id = target_product_id
    and relation_value.variant_id is not distinct from target_variant_id
    and relation_value.media_asset_id = target_media_asset_id
    and relation_value.status <> 'retired'
  for update;

  if found then
    if relation_record.media_role is distinct from target_media_role
      or relation_record.ordinal is distinct from target_ordinal
      or relation_record.alt_text is distinct from target_alt_text then
      raise exception using errcode = '23514', message = 'product media replay conflicts';
    end if;

    product_media_id := relation_record.id;
    media_status := relation_record.status;
    was_replayed := true;
    return next;
    return;
  end if;

  insert into app_private.product_media (
    organization_id,
    product_id,
    variant_id,
    media_asset_id,
    media_role,
    ordinal,
    alt_text,
    status,
    created_by_user_id
  ) values (
    target_organization_id,
    target_product_id,
    target_variant_id,
    target_media_asset_id,
    target_media_role,
    target_ordinal,
    target_alt_text,
    'draft',
    target_actor_user_id
  )
  returning * into relation_record;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'media.gallery.linked',
    'member',
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_strip_nulls(jsonb_build_object(
      'product_media_id', relation_record.id,
      'product_id', relation_record.product_id,
      'variant_id', relation_record.variant_id,
      'media_asset_id', relation_record.media_asset_id,
      'media_role', relation_record.media_role,
      'ordinal', relation_record.ordinal
    ))
  );

  product_media_id := relation_record.id;
  media_status := relation_record.status;
  was_replayed := false;
  return next;
end;
$$;

create function api.transition_product_media(
  target_organization_id uuid,
  target_product_media_id uuid,
  target_expected_updated_at timestamptz,
  target_status text,
  target_actor_user_id uuid,
  target_correlation_id text,
  target_trace_id text default null
)
returns table (
  product_media_id uuid,
  media_status text,
  updated_at timestamptz,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  relation_record app_private.product_media%rowtype;
begin
  if target_status not in ('approved', 'retired')
    or not app_private.media_actor_is_authorized(
      target_organization_id,
      'member',
      target_actor_user_id,
      array['owner', 'admin']::text[]
    ) then
    raise exception using errcode = '42501', message = 'product media transition is not authorized';
  end if;

  select relation_value.*
  into relation_record
  from app_private.product_media as relation_value
  where relation_value.organization_id = target_organization_id
    and relation_value.id = target_product_media_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'product media was not found';
  end if;

  if relation_record.status = target_status then
    product_media_id := relation_record.id;
    media_status := relation_record.status;
    updated_at := relation_record.updated_at;
    was_replayed := true;
    return next;
    return;
  end if;

  if target_expected_updated_at is distinct from relation_record.updated_at then
    raise exception using errcode = '40001', message = 'product media version is stale';
  end if;

  update app_private.product_media
  set status = target_status,
      approved_by_user_id = case
        when target_status = 'approved' then target_actor_user_id
        else approved_by_user_id
      end,
      approved_at = case
        when target_status = 'approved' then statement_timestamp()
        else approved_at
      end,
      retired_at = case
        when target_status = 'retired' then statement_timestamp()
        else null
      end
  where organization_id = target_organization_id
    and id = target_product_media_id
  returning * into relation_record;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    case
      when target_status = 'approved' then 'media.gallery.approved'
      else 'media.gallery.retired'
    end,
    'member',
    target_actor_user_id,
    target_correlation_id,
    target_trace_id,
    jsonb_build_object(
      'product_media_id', relation_record.id,
      'product_id', relation_record.product_id,
      'media_asset_id', relation_record.media_asset_id,
      'status', relation_record.status
    )
  );

  product_media_id := relation_record.id;
  media_status := relation_record.status;
  updated_at := relation_record.updated_at;
  was_replayed := false;
  return next;
end;
$$;

alter table app_private.media_asset_objects enable row level security;
alter table app_private.media_asset_objects force row level security;
alter table app_private.product_media enable row level security;
alter table app_private.product_media force row level security;

create policy media_asset_objects_operator_select
on app_private.media_asset_objects for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = media_asset_objects.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy product_media_member_select
on app_private.product_media for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = product_media.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy agentefer_catalog_private_member_read
on storage.objects for select to authenticated
using (
  bucket_id = 'agentefer-catalog-private'
  and exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id::text = split_part(storage.objects.name, '/', 1)
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  )
);

create view api.media_asset_objects
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  media_asset_id,
  rendition_kind,
  bucket_id,
  object_path,
  mime_type,
  byte_size,
  width_pixels,
  height_pixels,
  derivation_spec,
  status,
  verified_at,
  published_at,
  retired_at,
  created_at,
  updated_at
from app_private.media_asset_objects;

create view api.product_media
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  product_id,
  variant_id,
  media_asset_id,
  media_role,
  ordinal,
  alt_text,
  status,
  approved_by_user_id,
  approved_at,
  retired_at,
  created_at,
  updated_at
from app_private.product_media;

revoke all on
  app_private.media_asset_objects,
  app_private.product_media
from public, anon, authenticated, service_role;

revoke all on
  api.media_asset_objects,
  api.product_media
from public, anon, authenticated, service_role;

grant select on
  app_private.media_asset_objects,
  app_private.product_media
to authenticated;

grant select, insert, update on
  app_private.media_asset_objects,
  app_private.product_media
to service_role;

grant select on
  api.media_asset_objects,
  api.product_media
to authenticated, service_role;

revoke all on function app_private.media_actor_is_authorized(uuid, text, uuid, text[])
from public, anon, authenticated, service_role;
revoke all on function app_private.validate_media_asset_object_storage()
from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_media_asset_object_rewrite()
from public, anon, authenticated, service_role;
revoke all on function app_private.ensure_verified_media_asset_has_objects()
from public, anon, authenticated, service_role;
revoke all on function app_private.validate_product_media()
from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_product_media_reassignment()
from public, anon, authenticated, service_role;
revoke all on function app_private.reject_media_history_delete()
from public, anon, authenticated, service_role;

revoke all on function api.begin_media_asset_ingest(
  uuid, bytea, text, bigint, integer, integer, text, text, uuid,
  text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.register_media_asset_object(
  uuid, uuid, text, text, text, bytea, text, bigint, integer, integer,
  jsonb, text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.complete_media_asset_ingest(
  uuid, uuid, text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.link_product_media(
  uuid, uuid, uuid, uuid, text, integer, text, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function api.transition_product_media(
  uuid, uuid, timestamptz, text, uuid, text, text
) from public, anon, authenticated, service_role;

grant execute on function api.begin_media_asset_ingest(
  uuid, bytea, text, bigint, integer, integer, text, text, uuid,
  text, uuid, text, text
) to service_role;
grant execute on function api.register_media_asset_object(
  uuid, uuid, text, text, text, bytea, text, bigint, integer, integer,
  jsonb, text, uuid, text, text
) to service_role;
grant execute on function api.complete_media_asset_ingest(
  uuid, uuid, text, uuid, text, text
) to service_role;
grant execute on function api.link_product_media(
  uuid, uuid, uuid, uuid, text, integer, text, uuid, text, text
) to service_role;
grant execute on function api.transition_product_media(
  uuid, uuid, timestamptz, text, uuid, text, text
) to service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;

comment on table app_private.media_asset_objects is
  'Immutable Supabase Storage object registry; bytes and signed URLs are never stored in PostgreSQL';
comment on table app_private.product_media is
  'Explicit product or variant gallery relation with approval and tenant-safe media provenance';
comment on function api.begin_media_asset_ingest(
  uuid, bytea, text, bigint, integer, integer, text, text, uuid,
  text, uuid, text, text
) is 'Idempotently reserves media identity by tenant and SHA-256 without storing file bytes';
comment on function api.register_media_asset_object(
  uuid, uuid, text, text, text, bytea, text, bigint, integer, integer,
  jsonb, text, uuid, text, text
) is 'Registers an existing immutable Storage object and blocks public media before approval';
comment on function api.complete_media_asset_ingest(
  uuid, uuid, text, uuid, text, text
) is 'Marks media verified only after private original and analysis WebP objects exist';
comment on function api.link_product_media(
  uuid, uuid, uuid, uuid, text, integer, text, uuid, text, text
) is 'Idempotently links verified media to a product or one of its variants as a draft';
comment on function api.transition_product_media(
  uuid, uuid, timestamptz, text, uuid, text, text
) is 'Optimistically approves or retires gallery media with owner/admin authorization';

commit;
