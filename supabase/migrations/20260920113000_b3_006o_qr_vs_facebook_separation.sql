begin;

-- Add allow_public to each photo in catalog_recent_for_owner_agent
-- (the RPC behind catalog_manage_context and catalog_resolve_recent).
-- Also expose the Facebook publication state per variant so the agent can
-- see whether the product is published on Facebook or only active in the
-- QR storefront. These are two independent surfaces and the prompt now
-- treats them as such.

create or replace function app_private.catalog_recent_for_owner_agent(
  target_organization_id uuid, target_arguments jsonb
)
returns jsonb language plpgsql stable security definer set search_path as $$
declare
  target_variant_id uuid;
  details jsonb;
begin
  if target_arguments is null or jsonb_typeof(target_arguments) <> object then
    return jsonb_build_object(ok, false, error, jsonb_build_object(code, invalid_arguments));
  end if;
  if not target_arguments ? variant_id then
    return app_private.catalog_recent_for_owner_agent_base(target_organization_id, target_arguments);
  end if;
  if target_arguments - array[variant_id] <> array[]::text[]::jsonb then
    return jsonb_build_object(ok, false, error, jsonb_build_object(code, invalid_arguments));
  end if;
  begin
    target_variant_id := (target_arguments ->> variant_id) :: uuid;
  exception when invalid_text_representation then
    return jsonb_build_object(ok, false, error, jsonb_build_object(code, invalid_variant_id));
  end;

  select jsonb_build_object(
    product_id, p.id,
    product_name, p.name,
    product_description, p.description,
    product_status, p.status,
    variant_id, v.id,
    variant_name, v.name,
    variant_description, v.description,
    variant_status, v.status,
    qr_catalog_note, variant_status controls whether the product is visible in the QR storefront. It does NOT publish the product on Facebook.,
    facebook_surface_note, Facebook publication is independent. catalog_publish_offer publishes this specific product on the connected Facebook page. catalog_set_offer_status (set_status=active) does NOT publish on Facebook.,
    prices, coalesce(
      (select jsonb_agg(jsonb_build_object(
        price_tier_id, t.id,
        unit_id, t.unit_id,
        unit_name, u.name_singular,
        quantity_min, t.quantity_min,
        quantity_max, t.quantity_max,
        pricing_status, t.pricing_status,
        amount, t.price_amount,
        currency_code, b.currency_code)
       order by t.quantity_min, t.id)
       from app_private.price_tiers t
       join app_private.catalog_units u on u.organization_id = t.organization_id and u.id = t.unit_id
       join app_private.price_books b on b.organization_id = t.organization_id and b.id = t.price_book_id
       where t.organization_id = target_organization_id and t.variant_id = v.id
         and t.superseded_at is null and t.valid_from <= statement_timestamp()
         and (t.valid_until is null or t.valid_until > statement_timestamp())
         and b.status = active),
      array[]::jsonb),
    photos, coalesce(
      (select jsonb_agg(jsonb_build_object(
        product_media_id, m.id,
        media_asset_id, m.media_asset_id,
        scope, case when m.variant_id is null then product else variant end,
        role, m.media_role,
        ordinal, m.ordinal,
        alt_text, m.alt_text,
        status, m.status,
        allow_public, m.allow_public,
        is_primary, m.is_primary)
       order by case when m.is_primary then 0 else 1 end, case when m.variant_id is null then 1 else 0 end, m.ordinal, m.id)
       from app_private.product_media m
       where m.organization_id = target_organization_id and m.product_id = p.id
         and (m.variant_id is null or m.variant_id = v.id) and m.status <> retired),
      array[]::jsonb),
    facebook_publication, coalesce(
      (select jsonb_build_object(
        instance_id, fpi.id,
        facebook_status, fpi.facebook_status,
        publication_status, fpi.publication_status,
        external_url, fpi.external_url,
        last_job_status, (
          select j.status from app_private.facebook_publication_jobs j
            where j.organization_id = target_organization_id
              and j.publication_instance_id = fpi.id
            order by j.created_at desc limit 1
        ),
        last_error_code, (
          select j.last_error_code from app_private.facebook_publication_jobs j
            where j.organization_id = target_organization_id
              and j.publication_instance_id = fpi.id
            order by j.created_at desc limit 1
        ),
        available_actions, coalesce(
          (select jsonb_agg(distinct pa.action)
            from app_private.facebook_publication_actions pa
           where pa.organization_id = target_organization_id
             and pa.publication_instance_id = fpi.id),
          array[]::jsonb))
       from app_private.facebook_publication_instances fpi
       where fpi.organization_id = target_organization_id
         and fpi.variant_id = v.id
      limit 1),
      jsonb_build_object(
        instance_id, null,
        facebook_status, not_published,
        publication_status, draft,
        external_url, null,
        last_job_status, null,
        last_error_code, null,
        available_actions, array[publish]::jsonb))
  ) into details
  from app_private.product_variants v
  join app_private.products p on p.organization_id = v.organization_id and p.id = v.product_id
  where v.organization_id = target_organization_id and v.id = target_variant_id
    and v.status <> archived and p.status <> archived;
  if details is null then
    return jsonb_build_object(ok, false, error, jsonb_build_object(code, offer_not_found));
  end if;
  return jsonb_build_object(ok, true, offer, details);
end;
$$;

notify pgrst, reload schema;

commit;
