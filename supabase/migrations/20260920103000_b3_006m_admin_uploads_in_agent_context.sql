begin;

-- =============================================================================
-- Fix: the add_photo operation in catalog_edit_offer_for_owner used to only
-- accept photos whose media_asset_id was registered in
-- app_private.media_ingest_requests with status='succeeded' from the current
-- conversation. That excluded two real cases:
--   1. Photos uploaded by the owner through the admin UI
--      (app_private.admin_catalog_image_uploads) — these were invisible to the
--      agent and rejected by the RPC.
--   2. Race window where media_asset_id is populated but the worker has not yet
--      flipped status='succeeded'.
-- We rewrite the check to accept the asset whenever it exists and is verified,
-- regardless of which pipeline created it, and we add the admin uploads to the
-- catalog_ingestion_context so the LLM can find them in the conversation list.
-- =============================================================================

-- 1. Update the catalog_ingestion_context.images array to UNION both sources.
create or replace function app_private.catalog_ingestion_context_for_owner(
  target_organization_id uuid, target_run_id uuid, target_arguments jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r app_private.agent_runs%rowtype; page_offset integer;
begin
  r:=app_private.catalog_ingestion_owner_run(target_organization_id,target_run_id);
  page_offset:=coalesce((target_arguments->>'offset')::integer,0);
  if page_offset<0 or page_offset>1000000 then
    raise exception using errcode='22023', message='invalid context offset';
  end if;
  return jsonb_build_object('ok',true,'offset',page_offset,'page_size',25,
    'drafts',coalesce((select jsonb_agg(to_jsonb(d)) from (
      select id,status,proposal,unresolved_fields,revision,application_result
      from app_private.catalog_ingestion_drafts
      where organization_id=target_organization_id and source_conversation_id=r.conversation_id
      order by case when status in ('collecting','needs_confirmation','ready') then 0 else 1 end,
        updated_at desc,id offset page_offset limit 25
    ) d),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(to_jsonb(c)) from (
      select id,code,name,status from app_private.catalog_categories
      where organization_id=target_organization_id and status<>'retired'
      order by code offset page_offset limit 25
    ) c),'[]'::jsonb),
    'units',coalesce((select jsonb_agg(to_jsonb(u)) from (
      select id,code,name_singular,name_plural,quantity_kind,decimal_scale from app_private.catalog_units
      where organization_id=target_organization_id and status='active'
      order by code offset page_offset limit 25
    ) u),'[]'::jsonb),
    'attributes',coalesce((select jsonb_agg(to_jsonb(a)) from (
      select a.category_id,a.code,a.name,a.scope,a.value_type,a.cardinality_max,a.allows_unit,
        coalesce((select jsonb_agg(jsonb_build_object('code',u.code,'name',u.name_singular))
          from app_private.catalog_attribute_allowed_units x join app_private.catalog_units u
            on u.organization_id=x.organization_id and u.id=x.unit_id
          where x.organization_id=a.organization_id and x.attribute_definition_id=a.id),'[]') as allowed_units,
        coalesce((select jsonb_agg(jsonb_build_object('code',o.code,'label',o.label))
          from app_private.catalog_attribute_options o where o.organization_id=a.organization_id
            and o.attribute_definition_id=a.id and o.status='active'),'[]') as options
      from app_private.catalog_attribute_definitions a where a.organization_id=target_organization_id and a.status='active'
      order by a.category_id,a.code offset page_offset limit 25
    ) a),'[]'::jsonb),
    'images',coalesce((
      select jsonb_agg(combined)
      from (
        select message_id, media_asset_id, source, status, created_at from (
          select q.message_id,
                 q.media_asset_id,
                 'whatsapp'::text as source,
                 q.status,
                 q.created_at
            from app_private.media_ingest_requests q
            join app_private.messages m
              on m.organization_id=q.organization_id and m.id=q.message_id
           where q.organization_id=target_organization_id
             and m.conversation_id=r.conversation_id
             and q.media_asset_id is not null
          union all
          select null::uuid as message_id,
                 aciu.media_asset_id,
                 'admin_panel'::text as source,
                 case when ma.ingest_status='verified' then 'succeeded' else ma.ingest_status end as status,
                 aciu.created_at
            from app_private.admin_catalog_image_uploads aciu
            join app_private.media_assets ma
              on ma.organization_id=aciu.organization_id and ma.id=aciu.media_asset_id
           where aciu.organization_id=target_organization_id
             and aciu.actor_user_id = r.actor_user_id
             and aciu.media_asset_id is not null
        ) as combined
        order by created_at desc
        offset page_offset limit 25
      ) combined
    ),'[]'::jsonb));
end;
$$;

-- 2. Relax the add_photo check: accept any verified asset from the owner's
-- pipeline, regardless of which table tracked it or its current status
-- (succeeded / processing / received are all OK as long as media_asset_id is set
-- and ingest_status on the asset is 'verified').
create or replace function app_private.catalog_edit_offer_for_owner(
  target_organization_id uuid, target_run_id uuid, target_execution_key text, target_arguments jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_run app_private.agent_runs%rowtype;
  target_variant_id uuid;
  target_operation text;
  changes jsonb;
  target_asset_id uuid;
  chat_asset_id uuid;
begin
  target_variant_id:=(target_arguments->>'variant_id')::uuid;
  target_operation:=target_arguments->>'operation';
  changes:=target_arguments->'changes';
  if target_variant_id is null or target_operation is null or changes is null then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  select * into owner_run from app_private.agent_runs r
    where r.id=target_run_id and r.organization_id=target_organization_id
      and r.actor_kind='member';
  if not found then
    raise exception using errcode='42501',message='owner agent run is required';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,owner_run.actor_user_id,array['owner']::text[]
  );
  if target_operation='add_photo' then
    begin
      target_asset_id:=(changes->>'mediaAssetId')::uuid;
    exception when invalid_text_representation then
      return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_media_asset_id'));
    end;
    if target_asset_id is null then
      return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_media_asset_id'));
    end if;
    -- The asset must exist, belong to this organization, and be verified. It
    -- can come from either the WhatsApp pipeline (media_ingest_requests) or the
    -- admin panel (admin_catalog_image_uploads) — both reach media_assets.
    select ma.id into chat_asset_id
      from app_private.media_assets ma
      where ma.organization_id=target_organization_id
        and ma.id=target_asset_id
        and ma.ingest_status='verified';
    if chat_asset_id is null then
      return jsonb_build_object('ok',false,'error',jsonb_build_object('code','photo_not_in_owner_conversation'));
    end if;
  end if;
  return api.admin_edit_catalog_offer(target_organization_id,owner_run.actor_user_id,
    target_variant_id,target_operation,changes,target_execution_key);
end;
$$;

notify pgrst, 'reload schema';

commit;
