begin;

-- =============================================================================
-- Hard-delete a product_media row and, if no other product references the
-- underlying media_asset, cascade the cleanup into media_asset_objects,
-- media_assets, media_ingest_requests, admin_catalog_image_uploads,
-- catalog_evidence_media, catalog_storefront_jobs, publication_media,
-- and storage.objects. Owner-only. Service-role grants only.
-- =============================================================================

create function api.admin_purge_product_media(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_product_media_id uuid,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_media_asset_id uuid;
  resolved_variant_id uuid;
  resolved_product_id uuid;
  remaining_product_media_count integer;
  source_object_path text;
  analysis_object_path text;
  asset_deleted boolean := false;
  storage_deleted boolean := false;
  bucket_id_value text := 'agentefer-catalog-private';
  audit_event jsonb;
begin
  if target_organization_id is null
    or target_actor_user_id is null
    or target_product_media_id is null
    or target_idempotency_key is null
    or btrim(target_idempotency_key) = ''
    or char_length(target_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'product photo purge arguments are invalid';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id, target_actor_user_id, array['owner']::text[]
  );

  select pm.media_asset_id, pm.variant_id, pm.product_id
    into resolved_media_asset_id, resolved_variant_id, resolved_product_id
    from app_private.product_media as pm
    where pm.organization_id = target_organization_id
      and pm.id = target_product_media_id
      and pm.status in ('draft', 'approved', 'retired')
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'product photo was not found';
  end if;

  delete from app_private.product_media as pm
    where pm.organization_id = target_organization_id
      and pm.id = target_product_media_id;

  select count(*) into remaining_product_media_count
    from app_private.product_media as pm
    where pm.organization_id = target_organization_id
      and pm.media_asset_id = resolved_media_asset_id;

  if remaining_product_media_count = 0 then
    select
      max(case when mao.rendition_kind = 'source_original' then mao.object_path end),
      max(case when mao.rendition_kind = 'analysis_webp' then mao.object_path end)
      into source_object_path, analysis_object_path
    from app_private.media_asset_objects as mao
    where mao.organization_id = target_organization_id
      and mao.media_asset_id = resolved_media_asset_id;

    if source_object_path is not null then
      delete from storage.objects as so
        where so.bucket_id = bucket_id_value
          and so.name = source_object_path;
    end if;
    if analysis_object_path is not null then
      delete from storage.objects as so
        where so.bucket_id = bucket_id_value
          and so.name = analysis_object_path;
    end if;

    delete from app_private.media_asset_objects as mao
      where mao.organization_id = target_organization_id
        and mao.media_asset_id = resolved_media_asset_id;

    delete from app_private.media_ingest_requests as mir
      where mir.organization_id = target_organization_id
        and mir.media_asset_id = resolved_media_asset_id;

    delete from app_private.admin_catalog_image_uploads as aciu
      where aciu.organization_id = target_organization_id
        and aciu.media_asset_id = resolved_media_asset_id;

    delete from app_private.catalog_evidence_media as cem
      where cem.organization_id = target_organization_id
        and cem.media_asset_id = resolved_media_asset_id;

    delete from app_private.catalog_storefront_jobs as csj
      where csj.organization_id = target_organization_id
        and csj.media_asset_id = resolved_media_asset_id;

    delete from app_private.publication_media as pm
      where pm.organization_id = target_organization_id
        and pm.media_asset_id = resolved_media_asset_id;

    delete from app_private.media_assets as ma
      where ma.organization_id = target_organization_id
        and ma.id = resolved_media_asset_id;

    asset_deleted := true;
    if source_object_path is not null or analysis_object_path is not null then
      storage_deleted := true;
    end if;
  end if;

  audit_event := jsonb_build_object(
    'product_media_id', target_product_media_id,
    'media_asset_id', resolved_media_asset_id,
    'variant_id', resolved_variant_id,
    'product_id', resolved_product_id,
    'asset_deleted', asset_deleted,
    'storage_deleted', storage_deleted,
    'remaining_product_media_count', remaining_product_media_count,
    'source_object_path', source_object_path,
    'analysis_object_path', analysis_object_path
  );

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'catalog.photo.purged', 'member',
    target_actor_user_id, target_idempotency_key, null, audit_event
  );

  return jsonb_build_object(
    'productMediaId', target_product_media_id,
    'mediaAssetId', resolved_media_asset_id,
    'assetDeleted', asset_deleted,
    'storageDeleted', storage_deleted
  );
end;
$$;

revoke all on function api.admin_purge_product_media(uuid, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function api.admin_purge_product_media(uuid, uuid, uuid, text)
  to service_role;

notify pgrst, 'reload schema';

commit;
