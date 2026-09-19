begin;

-- Owner catalog edits share one scoped, idempotent transaction across panel and WhatsApp.
create function api.admin_edit_catalog_offer(
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
  claim record;
  offer app_private.product_variants%rowtype;
  product_record app_private.products%rowtype;
  tier app_private.price_tiers%rowtype;
  photo app_private.product_media%rowtype;
  linked record;
  next_ordinal integer;
  next_amount numeric;
  next_pricing text;
  next_status text;
  next_name text;
  next_description text;
  target_photo_id uuid;
  target_asset_id uuid;
  target_tier_id uuid;
  target_scope text;
  affected_id uuid;
  evidence_id uuid;
  response jsonb;
begin
  if target_operation not in ('set_status','edit_text','set_price','set_primary_photo','remove_photo','add_photo')
    or target_changes is null or jsonb_typeof(target_changes) <> 'object'
    or octet_length(target_changes::text) > 16384 then
    raise exception using errcode='22023',message='catalog edit request is invalid';
  end if;
  -- The panel is currently owner-only; the database must enforce that even with a service key.
  perform app_private.assert_publication_actor(
    target_organization_id,target_actor_user_id,array['owner']::text[]
  );
  select * into claim from app_private.claim_admin_catalog_command(
    target_organization_id,target_actor_user_id,target_idempotency_key,
    'catalog.edit.' || target_operation,
    jsonb_build_object('variant_id',target_variant_id,'changes',target_changes)
  );
  if claim.was_replayed then
    return claim.previous_result_payload || jsonb_build_object('wasReplayed',true);
  end if;

  select v.* into offer from app_private.product_variants v
  where v.organization_id=target_organization_id and v.id=target_variant_id
  for update;
  if not found or offer.status='archived' then
    raise exception using errcode='P0002',message='catalog offer was not found';
  end if;
  select p.* into product_record from app_private.products p
  where p.organization_id=target_organization_id and p.id=offer.product_id
  for update;
  if not found or product_record.status='archived' then
    raise exception using errcode='P0002',message='catalog product was not found';
  end if;

  case target_operation
    when 'set_status' then
      if target_changes - 'status' <> '{}'::jsonb
        or target_changes->>'status' not in ('active','paused') then
        raise exception using errcode='22023',message='catalog status must be active or paused';
      end if;
      next_status:=target_changes->>'status';
      if next_status='active' then
        update app_private.products set status='active'
        where organization_id=target_organization_id and id=offer.product_id and status<>'active';
      end if;
      update app_private.product_variants set status=next_status
      where organization_id=target_organization_id and id=offer.id and status<>next_status;
      -- Going active never resumes or publishes a Facebook post. Pausing suppresses existing posts.
      if next_status='paused' then
        perform api.transition_publication(
          target_organization_id,p.id,
          target_idempotency_key || ':pause:' || p.id::text,
          'paused','El dueño pausó la oferta del catálogo',target_actor_user_id
        ) from app_private.publications p
        where p.organization_id=target_organization_id and p.variant_id=offer.id
          and p.status='active';
      end if;
      response:=jsonb_build_object('status',next_status,'facebookPublished',false);

    when 'edit_text' then
      if target_changes='{}'::jsonb
        or target_changes - array['productName','productDescription','variantName','variantDescription'] <> '{}'::jsonb then
        raise exception using errcode='22023',message='catalog text fields are invalid';
      end if;
      if target_changes ? 'productName' then
        next_name:=btrim(target_changes->>'productName');
        if jsonb_typeof(target_changes->'productName')<>'string'
          or char_length(next_name) not between 1 and 240 then
          raise exception using errcode='22023',message='product name is invalid';
        end if;
        update app_private.products set name=next_name
        where organization_id=target_organization_id and id=offer.product_id;
      end if;
      if target_changes ? 'productDescription' then
        next_description:=nullif(btrim(target_changes->>'productDescription'),'');
        if jsonb_typeof(target_changes->'productDescription') not in ('string','null')
          or char_length(coalesce(next_description,''))>10000 then
          raise exception using errcode='22023',message='product description is invalid';
        end if;
        update app_private.products set description=next_description
        where organization_id=target_organization_id and id=offer.product_id;
      end if;
      if target_changes ? 'variantName' then
        next_name:=btrim(target_changes->>'variantName');
        if jsonb_typeof(target_changes->'variantName')<>'string'
          or char_length(next_name) not between 1 and 240 then
          raise exception using errcode='22023',message='offer name is invalid';
        end if;
        update app_private.product_variants set name=next_name
        where organization_id=target_organization_id and id=offer.id;
      end if;
      if target_changes ? 'variantDescription' then
        next_description:=nullif(btrim(target_changes->>'variantDescription'),'');
        if jsonb_typeof(target_changes->'variantDescription') not in ('string','null')
          or char_length(coalesce(next_description,''))>10000 then
          raise exception using errcode='22023',message='offer description is invalid';
        end if;
        update app_private.product_variants set description=next_description
        where organization_id=target_organization_id and id=offer.id;
      end if;
      response:=jsonb_build_object('updatedFields',(select jsonb_agg(key) from jsonb_object_keys(target_changes) key));

    when 'set_price' then
      if target_changes - array['priceTierId','pricingStatus','amount'] <> '{}'::jsonb
        or not target_changes ?& array['priceTierId','pricingStatus'] then
        raise exception using errcode='22023',message='price change contract is invalid';
      end if;
      target_tier_id:=(target_changes->>'priceTierId')::uuid;
      next_pricing:=target_changes->>'pricingStatus';
      if next_pricing not in ('priced','on_request')
        or (next_pricing='priced' and jsonb_typeof(target_changes->'amount')<>'number')
        or (next_pricing='on_request' and target_changes ? 'amount'
            and jsonb_typeof(target_changes->'amount')<>'null') then
        raise exception using errcode='22023',message='price status or amount is invalid';
      end if;
      next_amount:=case when next_pricing='priced' then (target_changes->>'amount')::numeric else null end;
      if next_amount is not null and (next_amount<0 or next_amount>999999999999.999999
          or scale(next_amount)>6) then
        raise exception using errcode='22023',message='price amount is outside allowed range';
      end if;
      select t.* into tier from app_private.price_tiers t
      where t.organization_id=target_organization_id and t.id=target_tier_id
        and t.variant_id=offer.id and t.superseded_at is null
        and t.valid_from<=statement_timestamp()
        and (t.valid_until is null or t.valid_until>statement_timestamp())
      for update;
      if not found then
        raise exception using errcode='P0002',message='current price tier was not found';
      end if;
      insert into app_private.catalog_evidence(
        organization_id,evidence_kind,content,created_by_user_id
      ) values (
        target_organization_id,'owner_instruction',
        jsonb_build_object('action','set_price','previous_price_tier_id',tier.id,
          'pricing_status',next_pricing,'amount',next_amount,'idempotency_key',target_idempotency_key),
        target_actor_user_id
      ) returning id into evidence_id;
      update app_private.price_tiers set superseded_at=greatest(statement_timestamp(),created_at)
      where organization_id=target_organization_id and id=tier.id;
      insert into app_private.price_tiers(
        organization_id,price_book_id,variant_id,unit_id,quantity_min,quantity_max,
        pricing_status,calculation_method,price_amount,valid_from,valid_until,
        supersedes_price_tier_id,evidence_id,created_by_user_id
      ) values (
        target_organization_id,tier.price_book_id,offer.id,tier.unit_id,
        tier.quantity_min,tier.quantity_max,next_pricing,
        case when next_pricing='priced' then tier.calculation_method else null end,
        next_amount,statement_timestamp(),tier.valid_until,tier.id,evidence_id,target_actor_user_id
      ) returning id into affected_id;
      response:=jsonb_build_object('priceTierId',affected_id,'pricingStatus',next_pricing);

    when 'set_primary_photo' then
      if target_changes - 'productMediaId' <> '{}'::jsonb then
        raise exception using errcode='22023',message='photo selection contract is invalid';
      end if;
      target_photo_id:=(target_changes->>'productMediaId')::uuid;
      select m.* into photo from app_private.product_media m
      where m.organization_id=target_organization_id and m.id=target_photo_id
        and m.product_id=offer.product_id and (m.variant_id is null or m.variant_id=offer.id)
        and m.status in ('draft','approved') for update;
      if not found then
        raise exception using errcode='P0002',message='catalog photo was not found';
      end if;
      update app_private.product_media set media_role='gallery',
        approved_by_user_id=case when status='approved' then target_actor_user_id
          else approved_by_user_id end,
        approved_at=case when status='approved' then
          greatest(statement_timestamp(),approved_at+interval '1 microsecond') else approved_at end
      where organization_id=target_organization_id and product_id=offer.product_id
        and (variant_id is not distinct from photo.variant_id
          or (photo.variant_id is null and variant_id=offer.id))
        and media_role='primary' and status<>'retired' and id<>photo.id;
      update app_private.product_media set media_role='primary',
        approved_by_user_id=case when status='approved' then target_actor_user_id
          else approved_by_user_id end,
        approved_at=case when status='approved' then
          greatest(statement_timestamp(),approved_at+interval '1 microsecond') else approved_at end
      where organization_id=target_organization_id and id=photo.id;
      if photo.status='draft' then
        select updated_at into photo.updated_at from app_private.product_media
        where organization_id=target_organization_id and id=photo.id;
        perform api.transition_product_media(target_organization_id,photo.id,
          photo.updated_at,'approved',target_actor_user_id,target_idempotency_key);
      end if;
      response:=jsonb_build_object('productMediaId',photo.id,'role','primary');

    when 'remove_photo' then
      if target_changes - 'productMediaId' <> '{}'::jsonb then
        raise exception using errcode='22023',message='photo removal contract is invalid';
      end if;
      target_photo_id:=(target_changes->>'productMediaId')::uuid;
      select m.* into photo from app_private.product_media m
      where m.organization_id=target_organization_id and m.id=target_photo_id
        and m.product_id=offer.product_id and (m.variant_id is null or m.variant_id=offer.id)
        and m.status in ('draft','approved') for update;
      if not found then
        raise exception using errcode='P0002',message='catalog photo was not found';
      end if;
      update app_private.product_media set status='retired',retired_at=statement_timestamp()
      where organization_id=target_organization_id and id=photo.id;
      response:=jsonb_build_object('productMediaId',photo.id,'status','retired');

    when 'add_photo' then
      if target_changes - array['mediaAssetId','scope','altText','allowPublic'] <> '{}'::jsonb
        or not target_changes ?& array['mediaAssetId','scope','allowPublic'] then
        raise exception using errcode='22023',message='photo attachment contract is invalid';
      end if;
      target_asset_id:=(target_changes->>'mediaAssetId')::uuid;
      target_scope:=target_changes->>'scope';
      if target_scope not in ('product','variant')
        or jsonb_typeof(target_changes->'allowPublic')<>'boolean'
        or (target_changes ? 'altText'
          and (jsonb_typeof(target_changes->'altText')<>'string'
            or char_length(btrim(target_changes->>'altText')) not between 1 and 2000))
        or not exists(select 1 from app_private.media_assets a
          where a.organization_id=target_organization_id and a.id=target_asset_id
            and a.ingest_status='verified') then
        raise exception using errcode='22023',message='photo asset is unavailable';
      end if;
      select slot into next_ordinal from generate_series(0,99) slot
      where not exists(select 1 from app_private.product_media m
        where m.organization_id=target_organization_id and m.product_id=offer.product_id
          and m.variant_id is not distinct from
            (case when target_scope='variant' then offer.id else null end)
          and m.ordinal=slot and m.status<>'retired')
      order by slot limit 1;
      if next_ordinal is null then
        raise exception using errcode='54000',message='catalog photo limit reached';
      end if;
      select * into linked from api.link_product_media(
        target_organization_id,offer.product_id,
        case when target_scope='variant' then offer.id else null end,
        target_asset_id,'gallery',next_ordinal,target_changes->>'altText',
        target_actor_user_id,target_idempotency_key
      );
      if (target_changes->>'allowPublic')::boolean then
        select updated_at into photo.updated_at from app_private.product_media
        where organization_id=target_organization_id and id=linked.product_media_id;
        perform api.transition_product_media(target_organization_id,linked.product_media_id,
          photo.updated_at,'approved',target_actor_user_id,target_idempotency_key);
      end if;
      response:=jsonb_build_object('productMediaId',linked.product_media_id,'status',
        case when (target_changes->>'allowPublic')::boolean then 'approved' else 'draft' end);
  end case;

  -- Version snapshots can no longer be mistaken for the current offer after an edit.
  if target_operation <> 'set_status' then
    update app_private.product_variants set updated_at=statement_timestamp()
    where organization_id=target_organization_id and id=offer.id;
  end if;
  perform app_private.insert_agent_audit_event(
    target_organization_id,'catalog.offer_edited','member',target_actor_user_id,
    target_idempotency_key,null,
    jsonb_build_object('variant_id',offer.id,'operation',target_operation,
      'changes',target_changes,'result',response)
  );
  response:=jsonb_build_object('ok',true,'variantId',offer.id,'operation',target_operation,
    'result',response,'wasReplayed',false);
  perform app_private.complete_admin_catalog_command(
    target_organization_id,claim.admin_catalog_command_id,response
  );
  return response;
end;
$$;

revoke all on function api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)
  from public,anon,authenticated;
grant execute on function api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)
  to service_role;

-- Keep the existing recent lookup contract, and add exact offer details for owner edits.
alter function app_private.catalog_recent_for_owner_agent(uuid,jsonb)
  rename to catalog_recent_for_owner_agent_base;

create function app_private.catalog_recent_for_owner_agent(
  target_organization_id uuid,target_arguments jsonb
)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  target_variant_id uuid;
  details jsonb;
begin
  if target_arguments is null or jsonb_typeof(target_arguments)<>'object' then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  if not target_arguments ? 'variant_id' then
    return app_private.catalog_recent_for_owner_agent_base(target_organization_id,target_arguments);
  end if;
  if target_arguments - 'variant_id'<>'{}'::jsonb then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  begin
    target_variant_id:=(target_arguments->>'variant_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_variant_id'));
  end;
  select jsonb_build_object(
    'product_id',p.id,'product_name',p.name,'product_description',p.description,
    'product_status',p.status,'variant_id',v.id,'variant_name',v.name,
    'variant_description',v.description,'variant_status',v.status,
    'prices',coalesce((select jsonb_agg(jsonb_build_object(
      'price_tier_id',t.id,'unit_id',t.unit_id,'unit_name',u.name_singular,
      'quantity_min',t.quantity_min,'quantity_max',t.quantity_max,
      'pricing_status',t.pricing_status,'amount',t.price_amount,
      'currency_code',b.currency_code) order by t.quantity_min,t.id)
      from app_private.price_tiers t join app_private.catalog_units u
        on u.organization_id=t.organization_id and u.id=t.unit_id
      join app_private.price_books b
        on b.organization_id=t.organization_id and b.id=t.price_book_id
      where t.organization_id=target_organization_id and t.variant_id=v.id
        and t.superseded_at is null and t.valid_from<=statement_timestamp()
        and (t.valid_until is null or t.valid_until>statement_timestamp())
        and b.status='active'),'[]'::jsonb),
    'photos',coalesce((select jsonb_agg(jsonb_build_object(
      'product_media_id',m.id,'media_asset_id',m.media_asset_id,
      'scope',case when m.variant_id is null then 'product' else 'variant' end,
      'role',m.media_role,'ordinal',m.ordinal,'alt_text',m.alt_text,'status',m.status)
      order by case when m.variant_id is null then 1 else 0 end,m.ordinal,m.id)
      from app_private.product_media m
      where m.organization_id=target_organization_id and m.product_id=p.id
        and (m.variant_id is null or m.variant_id=v.id) and m.status<>'retired'),'[]'::jsonb)
  ) into details
  from app_private.product_variants v join app_private.products p
    on p.organization_id=v.organization_id and p.id=v.product_id
  where v.organization_id=target_organization_id and v.id=target_variant_id
    and v.status<>'archived' and p.status<>'archived';
  if details is null then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','offer_not_found'));
  end if;
  return jsonb_build_object('ok',true,'offer',details);
end;
$$;

create or replace function app_private.catalog_set_offer_status_for_owner_agent(
  target_organization_id uuid,target_run_id uuid,target_execution_key text,target_arguments jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  owner_run app_private.agent_runs%rowtype;
  target_variant_id uuid;
  target_operation text;
  changes jsonb;
  target_asset_id uuid;
begin
  if target_arguments is null or jsonb_typeof(target_arguments)<>'object' then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  begin
    target_variant_id:=(target_arguments->>'variant_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_variant_id'));
  end;
  target_operation:=coalesce(target_arguments->>'operation','set_status');
  changes:=case when target_arguments ? 'operation' then target_arguments->'changes'
    else jsonb_build_object('status',target_arguments->>'status') end;
  if target_variant_id is null or changes is null or jsonb_typeof(changes)<>'object' then
    return jsonb_build_object('ok',false,'error',jsonb_build_object('code','invalid_arguments'));
  end if;
  select r.* into owner_run from app_private.agent_runs r
  where r.organization_id=target_organization_id and r.id=target_run_id
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
    if target_asset_id is null or not exists(
      select 1 from app_private.media_ingest_requests q
      join app_private.messages m on m.organization_id=q.organization_id and m.id=q.message_id
      where q.organization_id=target_organization_id and q.media_asset_id=target_asset_id
        and q.status='succeeded' and m.conversation_id=owner_run.conversation_id
    ) then
      return jsonb_build_object('ok',false,'error',jsonb_build_object('code','photo_not_in_owner_conversation'));
    end if;
  end if;
  return api.admin_edit_catalog_offer(target_organization_id,owner_run.actor_user_id,
    target_variant_id,target_operation,changes,target_execution_key);
end;
$$;

revoke all on function app_private.catalog_recent_for_owner_agent(uuid,jsonb),
  app_private.catalog_set_offer_status_for_owner_agent(uuid,uuid,text,jsonb)
  from public,anon,authenticated,service_role;

create function app_private.ensure_customer_assistant_catalog_edit_tools(target_organization_id uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
  owner_id uuid;
  current_policy app_private.agent_policy_versions%rowtype;
  definition jsonb;
  tool_versions jsonb:='{}'::jsonb;
  existing_version uuid;
  existing_hash bytea;
  desired_hash bytea;
  registered record;
  prompt_text text;
  prompt_id uuid;
  bindings jsonb;
  created record;
  guidance constant text:=$guide$

## Edición de catálogo del dueño
Sólo cuando el turno sea de un miembro dueño y las herramientas estén autorizadas, puedes
modificar un artículo existente. Para "último producto" usa catalog_resolve_recent; para
un artículo concreto llama catalog_manage_context con variant_id y mira sus IDs reales de
precios y fotos. Si hay varios candidatos, pregunta cuál; nunca adivines el UUID.
catalog_edit_offer cambia una sola oferta por vez: set_status activa en la tienda QR sin
publicar en Facebook; edit_text cambia nombres o descripciones; set_price reemplaza la
presentación vigente o la deja a consultar; set_primary_photo y remove_photo usan
product_media_id exacto; add_photo usa mediaAssetId del catalog_ingestion_context de la
conversación actual. Para mostrar públicamente una foto, allowPublic exige permiso explícito
del dueño. Quitar foto desvincula, no borra el archivo. Publicar Facebook es un acto separado:
usa catalog_publish_offer tras orden explícita, con without_price=true sólo si el dueño lo pide.
Jamás lo infieras de "activar". Informa el resultado real de la herramienta, no prometas éxito
si hubo error. Las conversaciones de clientes no reciben estas herramientas.
$guide$;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text||':catalog-edit-tools',0));
  perform app_private.ensure_customer_assistant_ingestion_tools(target_organization_id);
  select user_id into owner_id from app_private.organization_memberships
  where organization_id=target_organization_id and role='owner' and status='active'
  order by created_at,user_id limit 1;
  if owner_id is null then
    raise exception using errcode='42501',message='catalog edit bootstrap requires owner';
  end if;
  for definition in select value from jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('name','catalog_manage_context','effect','read_only',
      'handler','catalog.recent.owner.read.v1',
      'description','Consulta los productos recientes o, con variant_id, el detalle editable exacto: IDs de precios, fotos, nombres y estados. Sólo para el dueño. Para referencias ambiguas pregunta.',
      'schema',jsonb_build_object('type','object','properties',jsonb_build_object(
        'limit',jsonb_build_object('type','integer','minimum',1,'maximum',20),
        'variant_id',jsonb_build_object('type','string','format','uuid')),
        'additionalProperties',false)),
    jsonb_build_object('name','catalog_edit_offer','effect','internal_mutation',
      'handler','catalog.offer-status.owner.write.v1',
      'description','Edita una oferta inequívoca del dueño. operation=set_status changes={status:active|paused}; edit_text changes={productName?,productDescription?,variantName?,variantDescription?}; set_price changes={priceTierId,pricingStatus:priced|on_request,amount?}; set_primary_photo/remove_photo changes={productMediaId}; add_photo changes={mediaAssetId,scope:product|variant,allowPublic:boolean,altText?}. Obtén IDs reales con catalog_manage_context y fotos recientes con catalog_ingestion_context. Activar nunca publica en Facebook.',
      'schema',jsonb_build_object('type','object','properties',jsonb_build_object(
        'variant_id',jsonb_build_object('type','string','format','uuid'),
        'operation',jsonb_build_object('type','string','enum',jsonb_build_array(
          'set_status','edit_text','set_price','set_primary_photo','remove_photo','add_photo')),
        'changes',jsonb_build_object('type','object','additionalProperties',true)),
        'required',jsonb_build_array('variant_id','operation','changes'),
        'additionalProperties',false)),
    jsonb_build_object('name','catalog_publish_offer','effect','external_effect',
      'handler','publication.publish.owner.enqueue.v1',
      'description','Publica o actualiza una oferta activa en la página Facebook autorizada. Requiere WebP público aprobado; si falta, informa el bloqueo. without_price=true omite precio sólo en el anuncio, sin alterar la tarifa del catálogo. Si hay varias presentaciones con precio, usa source_price_tier_id exacto de catalog_manage_context. No se ejecuta al activar el catálogo.',
      'schema',jsonb_build_object('type','object','properties',jsonb_build_object(
        'variant_id',jsonb_build_object('type','string','format','uuid'),
        'social_connection_id',jsonb_build_object('type','string','format','uuid'),
        'operation',jsonb_build_object('type','string','enum',jsonb_build_array('publish','refresh')),
        'without_price',jsonb_build_object('type','boolean'),
        'source_price_tier_id',jsonb_build_object('type','string','format','uuid')),
        'required',jsonb_build_array('variant_id','operation'),
        'additionalProperties',false))
  )) loop
    desired_hash:=extensions.digest(jsonb_build_object(
      'description',definition->>'description','input_schema',definition->'schema',
      'output_schema',jsonb_build_object('type','object','additionalProperties',true),
      'effect_class',definition->>'effect','handler_key',definition->>'handler')::text,'sha256');
    select c.current_version_id,v.contract_hash into existing_version,existing_hash
    from app_private.tool_contracts c left join app_private.tool_contract_versions v
      on v.organization_id=c.organization_id and v.id=c.current_version_id
    where c.organization_id=target_organization_id and c.tool_name=definition->>'name';
    if existing_version is null or existing_hash is distinct from desired_hash then
      select * into registered from api.register_tool_contract_version(
        target_organization_id,'b3-006f:tool:'||(definition->>'name')||':'||encode(desired_hash,'hex'),
        definition->>'name',definition->>'name',definition->>'description',definition->'schema',
        jsonb_build_object('type','object','additionalProperties',true),definition->>'effect',
        definition->>'handler',existing_version,'active',owner_id,
        'b3-006f:bootstrap:'||target_organization_id::text,null);
      existing_version:=registered.tool_contract_version_id;
    end if;
    tool_versions:=tool_versions||jsonb_build_object(definition->>'name',existing_version);
  end loop;
  select v.* into current_policy from app_private.agent_policies p
  join app_private.agent_policy_versions v
    on v.organization_id=p.organization_id and v.id=p.current_version_id
  where p.organization_id=target_organization_id and p.policy_key='customer_assistant'
  for update of p;
  if not found then
    raise exception using errcode='55000',message='customer assistant policy is unavailable';
  end if;
  select content_template into prompt_text from app_private.prompt_versions
  where organization_id=target_organization_id and id=current_policy.prompt_version_id;
  if strpos(prompt_text,guidance)>0 and (
    select count(*) from app_private.agent_policy_tools b
    join app_private.tool_contracts c on c.organization_id=b.organization_id and c.id=b.tool_contract_id
    where b.organization_id=target_organization_id and b.policy_version_id=current_policy.id
      and tool_versions ? c.tool_name
      and b.tool_contract_version_id=(tool_versions->>c.tool_name)::uuid
      and b.allowed_actor_kinds=array['member']::text[]
      and b.required_membership_roles=array['owner']::text[]
      and b.allowed_channels=array['whatsapp']::text[]
  )=3 then return current_policy.id; end if;
  if strpos(prompt_text,guidance)=0 then prompt_text:=prompt_text||guidance; end if;
  select id into prompt_id from app_private.prompt_versions
  where organization_id=target_organization_id and prompt_key='customer_assistant.system'
    and content_hash=extensions.digest(convert_to(prompt_text,'UTF8'),'sha256');
  if prompt_id is null then
    insert into app_private.prompt_versions(organization_id,prompt_key,version_number,
      template_format,content_template,content_hash,created_by_user_id)
    select target_organization_id,'customer_assistant.system',coalesce(max(version_number),0)+1,
      'markdown',prompt_text,extensions.digest(convert_to(prompt_text,'UTF8'),'sha256'),owner_id
    from app_private.prompt_versions
    where organization_id=target_organization_id and prompt_key='customer_assistant.system'
    returning id into prompt_id;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'tool_contract_version_id',b.tool_contract_version_id,
    'allowed_actor_kinds',b.allowed_actor_kinds,
    'required_membership_roles',b.required_membership_roles,
    'allowed_channels',b.allowed_channels,
    'authorization_constraints',b.authorization_constraints)
    order by c.tool_name),'[]'::jsonb) into bindings
  from app_private.agent_policy_tools b join app_private.tool_contracts c
    on c.organization_id=b.organization_id and c.id=b.tool_contract_id
  where b.organization_id=target_organization_id and b.policy_version_id=current_policy.id
    and not tool_versions ? c.tool_name;
  bindings:=bindings||(select jsonb_agg(jsonb_build_object(
    'tool_contract_version_id',value,
    'allowed_actor_kinds',jsonb_build_array('member'),
    'required_membership_roles',jsonb_build_array('owner'),
    'allowed_channels',jsonb_build_array('whatsapp'),
    'authorization_constraints',jsonb_build_object(
      'scope','owner_catalog_edit','requires_current_member_identity',true)) order by key)
    from jsonb_each_text(tool_versions));
  select * into created from api.create_agent_policy_version(
    target_organization_id,
    'b3-006f:policy:'||encode(extensions.digest(
      current_policy.id::text||tool_versions::text||prompt_id::text,'sha256'),'hex'),
    'customer_assistant','Asistente comercial para clientes',prompt_id,
    current_policy.max_tool_rounds,current_policy.max_provider_attempts,
    current_policy.max_parallel_tools,current_policy.turn_timeout_ms,
    current_policy.cache_mode,current_policy.max_cost_amount,
    current_policy.cost_currency,current_policy.unknown_cost_behavior,
    current_policy.fallback_models,bindings,current_policy.id,true,owner_id,
    'b3-006f:bootstrap:'||target_organization_id::text,null);
  return created.agent_policy_version_id;
end;
$$;

revoke all on function app_private.ensure_customer_assistant_catalog_edit_tools(uuid)
  from public,anon,authenticated,service_role;

create or replace function api.prepare_customer_assistant_tools(target_limit integer default 100)
returns table (organizations_prepared integer,organizations_failed integer)
language plpgsql security definer set search_path='' as $$
declare
  organization_record record;
  prepared_count integer:=0;
  failed_count integer:=0;
begin
  if target_limit not between 1 and 1000 then
    raise exception using errcode='22023',message='preparation limit is invalid';
  end if;
  for organization_record in select o.id from app_private.organizations o
    where o.status='active' and exists(select 1 from app_private.organization_memberships m
      where m.organization_id=o.id and m.status='active' and m.role='owner')
    order by o.created_at,o.id limit target_limit
  loop
    begin
      perform app_private.ensure_customer_assistant_catalog_edit_tools(organization_record.id);
      prepared_count:=prepared_count+1;
    exception when others then
      failed_count:=failed_count+1;
      perform app_private.insert_agent_audit_event(
        organization_record.id,'customer_assistant.tools_prepare_failed','system',null,
        'b3-006f:prepare:'||organization_record.id::text,null,
        jsonb_build_object('sqlstate',sqlstate));
    end;
  end loop;
  return query select prepared_count,failed_count;
end;
$$;

do $$
declare active_org record;
begin
  for active_org in select o.id from app_private.organizations o
    where o.status='active' and exists(select 1 from app_private.organization_memberships m
      where m.organization_id=o.id and m.status='active' and m.role='owner')
    order by o.created_at,o.id
  loop
    perform app_private.ensure_customer_assistant_catalog_edit_tools(active_org.id);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
