begin;

-- =============================================================================
-- Fix: b3_006p introduced a variable overwrite bug. The wrapper declared
-- target_variant_id uuid, then later did
--   select ma.id into target_variant_id from app_private.media_assets where ...
-- which overwrote the variant id with the media asset id. Then the call to
-- api.admin_edit_catalog_offer(target_variant_id, ...) used the asset id as a
-- variant id, the lookup found nothing, and the RPC raised an exception. The
-- agent logged the call as success anyway, so the catalog was never updated.
--
-- Use a separate local variable for the validated asset id so the variant id
-- survives the asset-existence check.
-- =============================================================================

create or replace function app_private.catalog_edit_offer_for_owner(
  target_organization_id uuid, target_run_id uuid, target_execution_key text, target_arguments jsonb
)
returns jsonb language plpgsql security definer set search_path to ''
as $fn$
declare
  owner_run app_private.agent_runs%rowtype;
  target_variant_id uuid;
  target_operation text;
  changes jsonb;
  chat_asset_id uuid;
  validated_asset_id uuid;
begin
  target_variant_id := (target_arguments->>'variant_id')::uuid;
  target_operation := target_arguments->>'operation';
  changes := target_arguments->'changes';
  if target_variant_id is null or target_operation is null or changes is null then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  select * into owner_run from app_private.agent_runs r
    where r.id = target_run_id and r.organization_id = target_organization_id
      and r.actor_kind = 'member';
  if not found then
    raise exception using errcode = '42501', message = 'owner agent run is required';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id, owner_run.actor_user_id, array['owner']::text[]
  );

  if target_operation = 'add_photo' then
    changes := jsonb_set(changes, '{allowPublic}', 'true'::jsonb, false);
    begin
      chat_asset_id := (changes->>'mediaAssetId')::uuid;
    exception when invalid_text_representation then
      return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_media_asset_id'));
    end;
    if chat_asset_id is null then
      return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_media_asset_id'));
    end if;
    select ma.id into validated_asset_id
      from app_private.media_assets ma
      where ma.organization_id = target_organization_id
        and ma.id = chat_asset_id
        and ma.ingest_status = 'verified';
    if validated_asset_id is null then
      return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'photo_not_in_owner_conversation'));
    end if;
  end if;

  return api.admin_edit_catalog_offer(
    target_organization_id, owner_run.actor_user_id,
    target_variant_id, target_operation, changes, target_execution_key
  );
end;
$fn$;

notify pgrst, 'reload schema';

commit;
