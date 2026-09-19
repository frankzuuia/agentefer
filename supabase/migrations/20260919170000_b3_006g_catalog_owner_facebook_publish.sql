begin;

-- Preparing a publication is separate from making a draft visible in the QR catalog.
create function api.admin_publish_catalog_offer(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_variant_id uuid,
  target_social_connection_id uuid,
  target_operation text,
  target_without_price boolean,
  target_source_price_tier_id uuid,
  target_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  claim record;
  offer record;
  existing_publication app_private.publications%rowtype;
  public_photo record;
  source_price_tier_id uuid;
  price_candidate_count integer;
  price_copy text;
  body_copy text;
  publication_id_value uuid;
  version_id_value uuid;
  child_key text;
  requested_media jsonb;
  enqueued jsonb;
  result_value jsonb;
  existing_instance_id uuid;
begin
  if target_operation not in ('publish','refresh') or target_without_price is null
    or (target_without_price and target_source_price_tier_id is not null) then
    raise exception using errcode='22023',message='facebook publication request is invalid';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,target_actor_user_id,array['owner']::text[]
  );
  select * into claim from app_private.claim_admin_catalog_command(
    target_organization_id,target_actor_user_id,target_idempotency_key,
    'catalog.facebook.'||target_operation,
    jsonb_build_object('variant_id',target_variant_id,
      'social_connection_id',target_social_connection_id,
      'without_price',target_without_price,
      'source_price_tier_id',target_source_price_tier_id)
  );
  if claim.was_replayed then
    return claim.previous_result_payload||jsonb_build_object('wasReplayed',true);
  end if;
  child_key:='catalog-fb-'||encode(extensions.digest(convert_to(
    target_organization_id::text||':'||target_idempotency_key,'UTF8'),'sha256'),'hex');
  select v.id as variant_id,v.name as variant_name,p.id as product_id,
    p.name as product_name,p.description as product_description,
    v.description as variant_description into offer
  from app_private.product_variants v join app_private.products p
    on p.organization_id=v.organization_id and p.id=v.product_id
  where v.organization_id=target_organization_id and v.id=target_variant_id
    and v.status='active' and p.status='active'
  for update of v,p;
  if not found then
    raise exception using errcode='55000',message='activate the catalog offer before Facebook';
  end if;
  if not exists(select 1 from app_private.social_connections c
    where c.organization_id=target_organization_id and c.id=target_social_connection_id
      and c.surface='facebook_page' and c.status='active') then
    raise exception using errcode='55000',message='the Facebook page is not connected';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_organization_id::text||':fb-publication:'||offer.variant_id::text||
      ':'||target_social_connection_id::text,0));
  select m.media_asset_id,m.alt_text into public_photo
  from app_private.product_media m join app_private.media_asset_objects o
    on o.organization_id=m.organization_id and o.media_asset_id=m.media_asset_id
    and o.rendition_kind='storefront_webp' and o.status='published'
  where m.organization_id=target_organization_id and m.product_id=offer.product_id
    and (m.variant_id is null or m.variant_id=offer.variant_id)
    and m.status='approved'
  order by case when m.media_role='primary' then 0 else 1 end,
    case when m.variant_id=offer.variant_id then 0 else 1 end,m.ordinal,m.id
  limit 1;
  if not found then
    raise exception using errcode='55000',message='approved public WebP is not ready for Facebook';
  end if;
  requested_media:=jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
    'media_asset_id',public_photo.media_asset_id,'media_role','primary',
    'alt_text',public_photo.alt_text)));
  if not target_without_price then
    select count(*)::integer into price_candidate_count from app_private.price_tiers t
    join app_private.price_books b on b.organization_id=t.organization_id
      and b.id=t.price_book_id and b.status='active' and b.is_default
    where t.organization_id=target_organization_id and t.variant_id=offer.variant_id
      and t.superseded_at is null and t.valid_from<=statement_timestamp()
      and (t.valid_until is null or t.valid_until>statement_timestamp())
      and (target_source_price_tier_id is null or t.id=target_source_price_tier_id);
    if (target_source_price_tier_id is not null and price_candidate_count<>1)
      or (target_source_price_tier_id is null and price_candidate_count>1) then
      raise exception using errcode='55000',message='select an exact current price presentation';
    end if;
    select t.id,case when t.pricing_status='priced'
      then 'Precio: '||b.currency_code||' '||t.price_amount::text||' / '||u.name_singular
      else 'Precio a consultar' end
    into source_price_tier_id,price_copy from app_private.price_tiers t
    join app_private.price_books b on b.organization_id=t.organization_id
      and b.id=t.price_book_id and b.status='active' and b.is_default
    join app_private.catalog_units u on u.organization_id=t.organization_id
      and u.id=t.unit_id
    where t.organization_id=target_organization_id and t.variant_id=offer.variant_id
      and t.superseded_at is null and t.valid_from<=statement_timestamp()
      and (t.valid_until is null or t.valid_until>statement_timestamp())
      and (target_source_price_tier_id is null or t.id=target_source_price_tier_id)
    order by t.quantity_min,t.id limit 1;
  end if;
  body_copy:=coalesce(nullif(btrim(offer.variant_description),''),
    nullif(btrim(offer.product_description),''),offer.variant_name);
  if price_copy is not null then body_copy:=body_copy||E'\n\n'||price_copy; end if;
  select p.* into existing_publication from app_private.publications p
  where p.organization_id=target_organization_id and p.variant_id=offer.variant_id
    and p.social_connection_id=target_social_connection_id and p.status<>'retired'
  for update;
  if found then
    publication_id_value:=existing_publication.id;
    select i.id into existing_instance_id from app_private.publication_instances i
    where i.organization_id=target_organization_id and i.publication_id=publication_id_value
      and i.status<>'deleted' order by i.created_at desc,i.id desc limit 1;
  else
    select created.publication_id into publication_id_value from api.create_publication(
      target_organization_id,child_key||':create',target_social_connection_id,
      offer.variant_id,target_actor_user_id) created;
  end if;
  if (target_operation='publish' and existing_instance_id is not null)
    or (target_operation='refresh' and existing_instance_id is null) then
    raise exception using errcode='22023',message='Facebook operation does not match publication state';
  end if;
  select created.publication_version_id into version_id_value
  from api.create_publication_version(
    target_organization_id,child_key||':version',publication_id_value,
    body_copy,
    offer.product_name,null,'{}'::jsonb,source_price_tier_id,
    requested_media,target_actor_user_id) created;
  perform api.approve_publication_version(
    target_organization_id,child_key||':approve',version_id_value,'active',
    'Publicación autorizada por el dueño',target_actor_user_id);
  enqueued:=api.admin_enqueue_facebook_publication(
    target_organization_id,target_actor_user_id,offer.variant_id,
    target_social_connection_id,target_operation,child_key||':job');
  result_value:=enqueued||jsonb_build_object(
    'publicationVersionId',version_id_value,
    'withoutPrice',target_without_price,'wasReplayed',false);
  perform app_private.complete_admin_catalog_command(
    target_organization_id,claim.admin_catalog_command_id,result_value);
  return result_value;
end;
$$;

revoke all on function api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)
  from public,anon,authenticated;
grant execute on function api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)
  to service_role;

create or replace function app_private.publication_publish_for_owner_agent(
  target_organization_id uuid,target_run_id uuid,target_execution_key text,target_arguments jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner_run app_private.agent_runs%rowtype;
  target_variant_id uuid;
  target_connection_id uuid;
  requested_operation text;
  without_price boolean;
  page_count integer;
  pages jsonb;
begin
  if target_arguments is null or jsonb_typeof(target_arguments)<>'object' then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  begin
    target_variant_id:=(target_arguments->>'variant_id')::uuid;
    target_connection_id:=(target_arguments->>'social_connection_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_target'));
  end;
  requested_operation:=target_arguments->>'operation';
  without_price:=coalesce((target_arguments->>'without_price')::boolean,false);
  if target_variant_id is null or requested_operation not in ('publish','refresh') then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  select r.* into owner_run from app_private.agent_runs r
  where r.organization_id=target_organization_id and r.id=target_run_id
    and r.actor_kind='member';
  if not found then
    raise exception using errcode='42501',message='owner agent run is required';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,owner_run.actor_user_id,array['owner']::text[]);
  if target_connection_id is null then
    select count(*)::integer,coalesce(jsonb_agg(jsonb_build_object(
      'social_connection_id',c.id,'page_name',c.display_name)),'[]'::jsonb)
    into page_count,pages from app_private.social_connections c
    where c.organization_id=target_organization_id and c.surface='facebook_page'
      and c.status='active';
    if page_count<>1 then
      return jsonb_build_object('ok',false,'error',jsonb_build_object(
        'code','ambiguous_page','candidates',pages));
    end if;
    target_connection_id:=(pages->0->>'social_connection_id')::uuid;
  end if;
  return api.admin_publish_catalog_offer(target_organization_id,owner_run.actor_user_id,
    target_variant_id,target_connection_id,requested_operation,without_price,
    (target_arguments->>'source_price_tier_id')::uuid,target_execution_key);
exception when sqlstate '55000' then
  return jsonb_build_object('ok',false,'error',jsonb_build_object(
    'code','publication_not_ready','reason',sqlerrm));
end;
$$;

revoke all on function app_private.publication_publish_for_owner_agent(uuid,uuid,text,jsonb)
  from public,anon,authenticated,service_role;

notify pgrst, 'reload schema';

commit;
