begin;

-- =============================================================================
-- Fix: catalog_edit_offer_for_owner received mediaAssetId from the LLM and
-- tried to cast it to UUID. When the agent sent the WhatsApp provider_media_id
-- (a bigint text like 1597767892006397) by mistake, the cast failed with
-- invalid_media_asset_id. The agent then surfaced "✅ Cambios aplicados"
-- anyway, leaving the catalog untouched and the user convinced the change
-- happened. Resolve the mediaAssetId through either shape before the
-- verification step:
--   1. Try to parse it as a UUID.
--   2. If it looks like a provider_media_id (digits, length), look it up via
--      media_ingest_requests joined with the messages of the owner's
--      conversation.
--   3. If neither matches, fall back to the most recent verified media
--      asset in the agent's own conversation so the owner gets the photo
--      they just sent without having to repeat themselves.
-- The lookup joins through the message's conversation_id, so cross-tenant
-- leaks are impossible.
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
  raw_asset_id_text text;
  resolved_asset_id uuid;
  resolved_via text;
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
    -- The wrapper ALWAYS forces allowPublic=true for agent-driven photo
    -- attachments. If the owner wants a private photo, they use the admin UI
    -- panel directly (which bypasses this wrapper).
    changes := jsonb_set(changes, '{allowPublic}', 'true'::jsonb, false);

    raw_asset_id_text := changes->>'mediaAssetId';
    if raw_asset_id_text is null or btrim(raw_asset_id_text) = '' then
      return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_media_asset_id'));
    end if;

    -- Path 1: LLM passed the actual media_asset_id UUID.
    begin
      resolved_asset_id := raw_asset_id_text::uuid;
      resolved_via := 'media_asset_id';
    exception when invalid_text_representation then
      resolved_asset_id := null;
      resolved_via := null;
    end;

    -- Path 2: LLM passed the WhatsApp provider_media_id (digits). Resolve it
    -- to media_asset_id via media_ingest_requests, scoped to the owner's
    -- conversation so a leak across tenants is impossible.
    if resolved_asset_id is null and raw_asset_id_text ~ '^[0-9]+$' then
      select q.media_asset_id into resolved_asset_id
        from app_private.media_ingest_requests q
        join app_private.messages m
          on m.organization_id = q.organization_id and m.id = q.message_id
        where q.organization_id = target_organization_id
          and m.conversation_id = owner_run.conversation_id
          and q.provider_media_id = raw_asset_id_text
          and q.media_asset_id is not null
        order by q.created_at desc
        limit 1;
      if resolved_asset_id is not null then
        resolved_via := 'provider_media_id';
      end if;
    end if;

    -- Path 3: LLM passed something else (typo, hallucination). Fall back to
    -- the most recent verified media asset in this conversation.
    if resolved_asset_id is null then
      select q.media_asset_id into resolved_asset_id
        from app_private.media_ingest_requests q
        join app_private.messages m
          on m.organization_id = q.organization_id and m.id = q.message_id
        where q.organization_id = target_organization_id
          and m.conversation_id = owner_run.conversation_id
          and q.media_asset_id is not null
          and q.status = 'succeeded'
        order by q.created_at desc
        limit 1;
      if resolved_asset_id is not null then
        resolved_via := 'recent_conversation_asset';
      end if;
    end if;

    if resolved_asset_id is null then
      return jsonb_build_object(
        'ok', false,
        'error', jsonb_build_object(
          'code', 'photo_not_in_owner_conversation',
          'detail', format('Could not resolve mediaAssetId=%s in this conversation.', raw_asset_id_text)
        )
      );
    end if;

    -- Re-inject the resolved UUID so admin_edit_catalog_offer sees the right value.
    changes := jsonb_set(changes, '{mediaAssetId}', to_jsonb(resolved_asset_id::text), false);

    -- Verify the asset exists, is verified, and belongs to this org.
    if not exists(
      select 1 from app_private.media_assets ma
        where ma.organization_id = target_organization_id
          and ma.id = resolved_asset_id
          and ma.ingest_status = 'verified'
    ) then
      return jsonb_build_object(
        'ok', false,
        'error', jsonb_build_object(
          'code', 'media_asset_not_verified',
          'detail', format('Resolved mediaAssetId=%s but it is not verified yet.', resolved_asset_id)
        )
      );
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
