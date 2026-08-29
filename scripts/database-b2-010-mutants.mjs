export const b2010DatabaseMutants = Object.freeze([
  Object.freeze({
    name: "expose media ingestion RPCs to authenticated callers",
    sql: `grant execute on function api.begin_media_asset_ingest(
      uuid, bytea, text, bigint, integer, integer, text, text, uuid,
      text, uuid, text, text
    ) to authenticated;`,
  }),
  Object.freeze({
    name: "require a user identity for the trusted media worker",
    find: "    when target_actor_kind = 'worker' then target_actor_user_id is null",
    replacement: "    when target_actor_kind = 'worker' then target_actor_user_id is not null",
  }),
  Object.freeze({
    name: "accept media registry rows without a physical Storage object",
    find: "  if new.status in ('verified', 'published') and not exists (",
    replacement: "  if false and not exists (",
  }),
  Object.freeze({
    name: "verify media when only one required private rendition exists",
    find: `    )
    or not exists (
      select 1
      from app_private.media_asset_objects as object_value
      where object_value.organization_id = new.organization_id
        and object_value.media_asset_id = new.id
        and object_value.rendition_kind = 'analysis_webp'`,
    replacement: `    )
    and not exists (
      select 1
      from app_private.media_asset_objects as object_value
      where object_value.organization_id = new.organization_id
        and object_value.media_asset_id = new.id
        and object_value.rendition_kind = 'analysis_webp'`,
  }),
  Object.freeze({
    name: "disable media hash idempotent replay",
    find: `  where asset_value.organization_id = target_organization_id
    and asset_value.content_sha256 = target_content_sha256
  for update;

  if found then`,
    replacement: `  where asset_value.organization_id = target_organization_id
    and asset_value.content_sha256 = target_content_sha256
  for update;

  if false then`,
  }),
  Object.freeze({
    name: "disable immutable object path idempotent replay",
    find: `  where object_value.bucket_id = target_bucket_id
    and object_value.object_path = target_object_path
  for update;

  if found then`,
    replacement: `  where object_value.bucket_id = target_bucket_id
    and object_value.object_path = target_object_path
  for update;

  if false then`,
  }),
  Object.freeze({
    name: "allow operators to publish storefront derivatives",
    find: `    case
      when target_rendition_kind = 'storefront_webp'
        then array['owner', 'admin']::text[]
      else array['owner', 'admin', 'operator']::text[]
    end`,
    replacement: `    case
      when target_rendition_kind = 'storefront_webp'
        then array['owner', 'admin', 'operator']::text[]
      else array['owner', 'admin', 'operator']::text[]
    end`,
  }),
  Object.freeze({
    name: "publish storefront media before gallery approval",
    find: "  if target_rendition_kind = 'storefront_webp' and not exists (",
    replacement: "  if false and not exists (",
  }),
  Object.freeze({
    name: "allow viewers to mutate the product gallery",
    find: `  if not app_private.media_actor_is_authorized(
    target_organization_id,
    'member',
    target_actor_user_id,
    array['owner', 'admin', 'operator']::text[]
  ) then
    raise exception using errcode = '42501', message = 'product media actor is not authorized';`,
    replacement: `  if not app_private.media_actor_is_authorized(
    target_organization_id,
    'member',
    target_actor_user_id,
    array['owner', 'admin', 'operator', 'viewer']::text[]
  ) then
    raise exception using errcode = '42501', message = 'product media actor is not authorized';`,
  }),
  Object.freeze({
    name: "allow operators to approve product gallery media",
    find: `      target_actor_user_id,
      array['owner', 'admin']::text[]
    ) then
    raise exception using errcode = '42501', message = 'product media transition is not authorized';`,
    replacement: `      target_actor_user_id,
      array['owner', 'admin', 'operator']::text[]
    ) then
    raise exception using errcode = '42501', message = 'product media transition is not authorized';`,
  }),
  Object.freeze({
    name: "disable optimistic concurrency for product media transitions",
    find: `  if target_expected_updated_at is distinct from relation_record.updated_at then
    raise exception using errcode = '40001', message = 'product media version is stale';
  end if;`,
    replacement: `  if false then
    raise exception using errcode = '40001', message = 'product media version is stale';
  end if;`,
  }),
  Object.freeze({
    name: "remove tenant scope from private media object reads",
    find: "  where membership.organization_id = media_asset_objects.organization_id",
    replacement: "  where membership.organization_id is not null",
  }),
  Object.freeze({
    name: "remove tenant scope from product gallery reads",
    find: "  where membership.organization_id = product_media.organization_id",
    replacement: "  where membership.organization_id is not null",
  }),
  Object.freeze({
    name: "remove tenant path scope from private Storage reads",
    find: "    where membership.organization_id::text = split_part(storage.objects.name, '/', 1)",
    replacement: "    where membership.organization_id is not null",
  }),
  Object.freeze({
    name: "leak immutable object paths into media audit metadata",
    find: `      'media_asset_object_id', object_record.id,
      'rendition_kind', object_record.rendition_kind,`,
    replacement: `      'media_asset_object_id', object_record.id,
      'object_path', object_record.object_path,
      'rendition_kind', object_record.rendition_kind,`,
  }),
  Object.freeze({
    name: "allow deletion of append-only media history",
    sql: `drop trigger media_asset_objects_reject_delete
      on app_private.media_asset_objects;
    drop trigger product_media_reject_delete
      on app_private.product_media;`,
  }),
]);
