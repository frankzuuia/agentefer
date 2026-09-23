begin;

-- =============================================================================
-- The B3-006R resolver exists but is not the live WhatsApp handler. Preserve
-- its private boundary and assert the actual owner-tool route separately.
-- =============================================================================

create extension if not exists pgtap with schema extensions;

select extensions.plan(11);

-- Each assertion below is wrapped in a CTE that captures (passed, description)
-- so we can rerun the file and see exactly which one failed.

-- 1. Signature matches the documented (uuid, uuid, text, jsonb) shape.
select extensions.has_function(
  'app_private',
  'catalog_edit_offer_for_owner',
  array['uuid', 'uuid', 'text', 'jsonb'],
  'catalog_edit_offer_for_owner has the documented signature'
);

-- 2a. This unbound resolver must not be directly executable by service_role.
select extensions.ok(
  not has_function_privilege(
    'service_role',
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)',
    'EXECUTE'
  ),
  'service_role cannot directly execute the unbound resolver'
);

select extensions.ok(
  pg_get_functiondef(
    'api.execute_whatsapp_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)'::regprocedure
  ) like '%catalog_set_offer_status_for_owner_agent%'
  and pg_get_functiondef(
    'api.execute_whatsapp_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)'::regprocedure
  ) not like '%catalog_edit_offer_for_owner%',
  'the live WhatsApp executor dispatches to the owner status wrapper, not the unbound resolver'
);

select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_set_offer_status_for_owner_agent(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%target_asset_id:=(changes->>''mediaAssetId'')::uuid%'
  and pg_get_functiondef(
    'app_private.catalog_set_offer_status_for_owner_agent(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%m.conversation_id=owner_run.conversation_id%',
  'the live owner wrapper requires an asset UUID from the same conversation'
);

-- 2b. authenticated/anon cannot.
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'anon',
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)',
    'EXECUTE'
  ),
  'authenticated and anon callers cannot drive the wrapper'
);

-- 3. Source forces allowPublic=true on every add_photo.
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%jsonb_set(changes, ''{allowPublic}'', ''true''%',
  'add_photo always overrides allowPublic to true'
);

-- 4. Source resolves provider_media_id via digits-only heuristic.
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%raw_asset_id_text ~ ''^[0-9]+$''%'
  and pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%q\.provider_media_id = raw_asset_id_text%',
  'digits-only mediaAssetId is resolved via media_ingest_requests.provider_media_id'
);

-- 5. Source filters by owner_run.conversation_id (cross-tenant safety).
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%m.conversation_id = owner_run.conversation_id%',
  'provider_media_id lookup is scoped to the owner conversation'
);

-- 6. Source has the recent-fallback path using succeeded status.
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%q\.status = ''succeeded''%'
  and pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%order by q\.created_at desc%'
  and pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%limit 1%',
  'fallback path uses most recent succeeded media asset in the owner conversation'
);

-- 7. Source re-injects the resolved UUID before calling the downstream RPC.
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%jsonb_set(changes, ''{mediaAssetId}'', to_jsonb(resolved_asset_id::text)%',
  'wrapper re-injects resolved_asset_id into changes.mediaAssetId before downstream call'
);

-- 8. Source validates the resolved asset exists and is verified before
-- passing the changes downstream.
select extensions.ok(
  pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%ma\.ingest_status = ''verified''%'
  and pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%where ma\.organization_id = target_organization_id%'
  and pg_get_functiondef(
    'app_private.catalog_edit_offer_for_owner(uuid,uuid,text,jsonb)'::regprocedure
  ) like '%and ma\.id = resolved_asset_id%',
  'wrapper validates media_assets.ingest_status=verified before forwarding'
);

select * from extensions.finish();
rollback;
