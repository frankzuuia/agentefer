begin;

-- =============================================================================
-- Fix: catalog owner wants up to 8 photos per product (instead of 1), and
-- add_photo should default allowPublic=true so the agent stops hallucinating
-- "foto interna" as if it were a separate state.
-- =============================================================================

create or replace function api.admin_edit_catalog_offer(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_variant_id uuid,
  target_operation text,
  target_changes jsonb,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  offer app_private.product_variants%rowtype;
  target_asset_id uuid;
  target_scope text;
  target_allow_public boolean;
  target_alt_text text;
  photo app_private.product_media%rowtype;
  photo_count integer;
  response jsonb;
  claim_row app_private.admin_catalog_commands%rowtype;
  variant_id_value uuid;
begin
  perform app_private.assert_publication_actor(
    target_organization_id, target_actor_user_id, array['owner']::text[]
  );

  if target_idempotency_key is null
    or btrim(target_idempotency_key) = ''
    or char_length(target_idempotency_key) not between 8 and 200 then
    raise exception using errcode = '22023', message = 'catalog command idempotency key is invalid';
  end if;

  select * into claim_row from app_private.admin_catalog_commands
    where organization_id = target_organization_id
      and idempotency_key = target_idempotency_key
    for update;
  if found then
    response := jsonb_build_object('replayed', true, 'result', claim_row.result);
    return response;
  end if;

  if target_operation not in ('set_status','edit_text','set_price','set_primary_photo','remove_photo','purge_photo','add_photo') then
    raise exception using errcode = '22023', message = 'catalog operation is not authorized';
  end if;

  select * into offer from app_private.product_variants
    where organization_id = target_organization_id and id = target_variant_id
    for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'catalog variant was not found';
  end if;

  response := jsonb_build_object('ok', true);

  if target_operation = 'set_status' then
    if target_changes - array['status'] <> '{}'::jsonb
      or not (target_changes ?& array['status'])
      or not (target_changes->>'status' in ('active','paused','archived','draft')) then
      raise exception using errcode = '22023', message = 'catalog status contract is invalid';
    end if;
    update app_private.product_variants
      set status = target_changes->>'status',
          effective_at = case when target_changes->>'status' = 'active' then statement_timestamp() else effective_at end,
          retired_at = case when target_changes->>'status' in ('archived','retired') then statement_timestamp() else retired_at end,
          updated_at = statement_timestamp()
      where organization_id = target_organization_id and id = offer.id;
    response := jsonb_build_object('ok', true, 'variantId', offer.id, 'status', target_changes->>'status');

  elsif target_operation = 'edit_text' then
    if target_changes - array['name','description','shortDescription'] <> '{}'::jsonb
      or not (target_changes ? 'name' or target_changes ? 'description' or target_changes ? 'shortDescription') then
      raise exception using errcode = '22023', message = 'catalog text contract is invalid';
    end if;
    update app_private.product_variants
      set name = coalesce(target_changes->>'name', name),
          description = case when target_changes ? 'description' then target_changes->>'description' else description end,
          short_description = case when target_changes ? 'shortDescription' then target_changes->>'shortDescription' else short_description end,
          updated_at = statement_timestamp()
      where organization_id = target_organization_id and id = offer.id;
    response := jsonb_build_object('ok', true, 'variantId', offer.id);

  elsif target_operation = 'set_price' then
    if target_changes - array['pricingStatus','amount'] <> '{}'::jsonb
      or not target_changes ?& array['pricingStatus','amount'])
      or not (target_changes->>'pricingStatus' in ('priced','on_request','hidden'))
      or jsonb_typeof(target_changes->'amount') <> 'number' then
      raise exception using errcode = '22023', message = 'catalog price contract is invalid';
    end if;
    insert into app_private.variant_pricings(organization_id, variant_id, pricing_status, amount, currency, effective_at)
      values (target_organization_id, offer.id, target_changes->>'pricingStatus', (target_changes->'amount')::numeric, 'MXN', statement_timestamp());
    response := jsonb_build_object('ok', true, 'variantId', offer.id, 'pricingStatus', target_changes->>'pricingStatus');

  elsif target_operation in ('set_primary_photo','remove_photo','purge_photo') then
    select * into photo from app_private.product_media
      where organization_id = target_organization_id and id = (target_changes->>'productMediaId')::uuid
        and (target_operation <> 'purge_photo' or status in ('draft','approved','retired'))
        and (variant_id = offer.id or variant_id is null)
      for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'catalog photo was not found';
    end if;

    if target_operation = 'set_primary_photo' then
      update app_private.product_media set is_primary = false
        where organization_id = target_organization_id and variant_id = photo.variant_id
          and id <> photo.id and is_primary = true and status in ('draft','approved');
      update app_private.product_media set is_primary = true, updated_at = statement_timestamp()
        where organization_id = target_organization_id and id = photo.id;
      response := jsonb_build_object('productMediaId', photo.id, 'isPrimary', true);

    elsif target_operation = 'remove_photo' then
      update app_private.product_media set status = 'retired', retired_at = statement_timestamp()
        where organization_id = target_organization_id and id = photo.id;
      response := jsonb_build_object('productMediaId', photo.id, 'status', 'retired');

    else
      raise exception using errcode = '22023', message = 'purge_photo is handled by admin_purge_product_media';
    end if;

  elsif target_operation = 'add_photo' then
    if target_changes - array['mediaAssetId','scope','altText','allowPublic'] <> '{}'::jsonb
      or not target_changes ?& array['mediaAssetId','scope'] then
      raise exception using errcode = '22023', message = 'photo attachment contract is invalid';
    end if;
    target_scope := target_changes->>'scope';
    target_alt_text := case when target_changes ? 'altText' and jsonb_typeof(target_changes->'altText') = 'string'
                              then target_changes->>'altText' end;
    if target_scope not in ('product','variant')
      or (target_changes ? 'allowPublic' and jsonb_typeof(target_changes->'allowPublic') <> 'boolean') then
      raise exception using errcode = '22023', message = 'photo attachment contract is invalid';
    end if;
    target_allow_public := case when target_changes ? 'allowPublic'
                              then (target_changes->>'allowPublic')::boolean
                              else true end;
    begin
      target_asset_id := (target_changes->>'mediaAssetId')::uuid;
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'media asset id is not a uuid';
    end;
    if target_asset_id is null then
      raise exception using errcode = '22023', message = 'media asset id is required';
    end if;
    if not exists(
      select 1 from app_private.media_assets ma
      where ma.organization_id = target_organization_id
        and ma.id = target_asset_id
        and ma.ingest_status = 'verified'
    ) then
      raise exception using errcode = 'P0002', message = 'media asset is not available';
    end if;
    select count(*) into photo_count from app_private.product_media
      where organization_id = target_organization_id
        and (variant_id = offer.id or (target_scope = 'product' and variant_id is null))
        and status in ('draft','approved');
    if photo_count >= 8 then
      raise exception using errcode = '23514', message = 'product already has the maximum of 8 photos';
    end if;
    insert into app_private.product_media(
      organization_id, product_id, variant_id, media_asset_id, scope, alt_text, allow_public,
      status, is_primary, created_by_user_id, approved_by_user_id, approved_at
    ) values (
      target_organization_id, offer.product_id,
      case when target_scope = 'variant' then offer.id else null end,
      target_asset_id, target_scope, target_alt_text, target_allow_public,
      'approved', false, target_actor_user_id, target_actor_user_id, statement_timestamp()
    )
    returning id into variant_id_value;
    response := jsonb_build_object(
      'productMediaId', variant_id_value,
      'mediaAssetId', target_asset_id,
      'scope', target_scope,
      'allowPublic', target_allow_public,
      'photosAfter', photo_count + 1
    );
  end if;

  insert into app_private.admin_catalog_commands(
    organization_id, variant_id, operation, idempotency_key, payload, result, actor_user_id
  ) values (
    target_organization_id, offer.id, target_operation, target_idempotency_key, target_changes, response, target_actor_user_id
  );

  perform app_private.insert_agent_audit_event(
    target_organization_id, 'catalog.command.applied', 'member',
    target_actor_user_id, target_idempotency_key, null,
    jsonb_build_object(
      'variant_id', offer.id, 'operation', target_operation, 'changes', target_changes, 'result', response
    )
  );

  return response;
end;
$$;

-- The prompt content lives in app_private.prompt_versions as text. We
-- apply the targeted edits via Python/Node because the prompt is too large
-- for inline SQL dollar-quoted strings. The companion script
-- scripts/refresh-customer-assistant-prompt.mjs reads the current row,
-- applies three text replacements, recomputes the content_hash, and bumps
-- the version. Run it with: node scripts/refresh-customer-assistant-prompt.mjs

notify pgrst, 'reload schema';

commit;
