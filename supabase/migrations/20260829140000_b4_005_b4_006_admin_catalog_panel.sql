begin;

create table app_private.admin_catalog_commands (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  idempotency_key text not null,
  operation text not null,
  request_fingerprint bytea not null,
  request_payload jsonb not null,
  result_payload jsonb,
  created_by_user_id uuid not null,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  constraint admin_catalog_commands_organization_id_id_unique
    unique (organization_id, id),
  constraint admin_catalog_commands_idempotency_unique
    unique (organization_id, idempotency_key),
  constraint admin_catalog_commands_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint admin_catalog_commands_created_by_user_fk
    foreign key (organization_id, created_by_user_id)
    references app_private.organization_memberships (organization_id, user_id)
    on delete restrict,
  constraint admin_catalog_commands_idempotency_key_valid
    check (
      idempotency_key = btrim(idempotency_key)
      and char_length(idempotency_key) between 8 and 240
    ),
  constraint admin_catalog_commands_operation_valid
    check (
      operation = lower(btrim(operation))
      and operation ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
    ),
  constraint admin_catalog_commands_fingerprint_valid
    check (octet_length(request_fingerprint) = 32),
  constraint admin_catalog_commands_payload_valid
    check (
      jsonb_typeof(request_payload) = 'object'
      and octet_length(request_payload::text) <= 131072
    ),
  constraint admin_catalog_commands_result_valid
    check (
      (result_payload is null and completed_at is null)
      or (
        result_payload is not null
        and jsonb_typeof(result_payload) = 'object'
        and octet_length(result_payload::text) <= 131072
        and completed_at is not null
        and completed_at >= created_at
      )
    )
);

create index admin_catalog_commands_actor_idx
  on app_private.admin_catalog_commands (
    organization_id,
    created_by_user_id,
    created_at desc,
    id
  );

alter table app_private.admin_catalog_commands enable row level security;
alter table app_private.admin_catalog_commands force row level security;

create function app_private.claim_admin_catalog_command(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_idempotency_key text,
  target_operation text,
  target_request_payload jsonb
)
returns table (
  admin_catalog_command_id uuid,
  was_replayed boolean,
  previous_result_payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_command app_private.admin_catalog_commands%rowtype;
  target_fingerprint bytea;
begin
  if target_actor_user_id is null then
    raise exception using errcode = '42501', message = 'admin catalog actor is required';
  end if;
  if target_idempotency_key is null
    or target_idempotency_key <> btrim(target_idempotency_key)
    or char_length(target_idempotency_key) not between 8 and 240
    or target_operation is null
    or target_operation <> lower(btrim(target_operation))
    or target_operation !~ '^[a-z0-9][a-z0-9._-]{0,126}$'
    or target_request_payload is null
    or jsonb_typeof(target_request_payload) <> 'object'
    or octet_length(target_request_payload::text) > 131072 then
    raise exception using errcode = '22023', message = 'admin catalog command is invalid';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );

  target_fingerprint := extensions.digest(target_request_payload::text, 'sha256');
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      target_organization_id::text || ':admin-catalog:' || target_idempotency_key,
      0
    )
  );

  select command_value.* into existing_command
  from app_private.admin_catalog_commands as command_value
  where command_value.organization_id = target_organization_id
    and command_value.idempotency_key = target_idempotency_key
  for update;

  if found then
    if existing_command.operation <> target_operation
      or existing_command.request_fingerprint <> target_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'admin catalog idempotency key was reused with another request';
    end if;
    if existing_command.completed_at is null then
      raise exception using
        errcode = '40001',
        message = 'admin catalog command is incomplete and must be retried';
    end if;
    return query
      select existing_command.id, true, existing_command.result_payload;
    return;
  end if;

  insert into app_private.admin_catalog_commands (
    organization_id,
    idempotency_key,
    operation,
    request_fingerprint,
    request_payload,
    created_by_user_id
  ) values (
    target_organization_id,
    target_idempotency_key,
    target_operation,
    target_fingerprint,
    target_request_payload,
    target_actor_user_id
  )
  returning id into admin_catalog_command_id;

  was_replayed := false;
  previous_result_payload := null;
  return next;
end;
$$;

create function app_private.complete_admin_catalog_command(
  target_organization_id uuid,
  target_admin_catalog_command_id uuid,
  target_result_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_result_payload is null
    or jsonb_typeof(target_result_payload) <> 'object'
    or octet_length(target_result_payload::text) > 131072 then
    raise exception using errcode = '22023', message = 'admin catalog result is invalid';
  end if;

  update app_private.admin_catalog_commands
  set
    result_payload = target_result_payload,
    completed_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_admin_catalog_command_id
    and completed_at is null;

  if not found then
    raise exception using errcode = 'P0002', message = 'admin catalog command was not found';
  end if;
end;
$$;

create function api.get_facebook_catalog_admin_page(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_social_connection_id uuid default null,
  target_status text default 'all',
  target_search text default null,
  target_page_size integer default 12,
  target_cursor_updated_at timestamptz default null,
  target_cursor_variant_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_search text := nullif(btrim(coalesce(target_search, '')), '');
  connection_count integer;
  selected_connection_id uuid;
  connections_payload jsonb;
  summary_payload jsonb;
  batches_payload jsonb;
  all_items jsonb;
  page_items jsonb;
  has_more boolean;
  last_item jsonb;
  next_cursor jsonb;
begin
  if target_actor_user_id is null then
    raise exception using errcode = '42501', message = 'admin catalog actor is required';
  end if;
  if target_status not in ('all', 'draft', 'active', 'paused', 'archived')
    or target_page_size not between 1 and 24
    or char_length(coalesce(normalized_search, '')) > 160
    or ((target_cursor_updated_at is null) <> (target_cursor_variant_id is null)) then
    raise exception using errcode = '22023', message = 'admin catalog page request is invalid';
  end if;

  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );

  select
    count(*)::integer,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', connection_value.id,
          'name', connection_value.display_name,
          'status', connection_value.status
        ) order by connection_value.display_name, connection_value.id
      ),
      '[]'::jsonb
    )
  into connection_count, connections_payload
  from app_private.social_connections as connection_value
  where connection_value.organization_id = target_organization_id
    and connection_value.surface = 'facebook_page'
    and connection_value.status = 'active';

  if target_social_connection_id is not null then
    if not exists (
      select 1
      from app_private.social_connections as connection_value
      where connection_value.organization_id = target_organization_id
        and connection_value.id = target_social_connection_id
        and connection_value.surface = 'facebook_page'
        and connection_value.status = 'active'
    ) then
      raise exception using errcode = 'P0002', message = 'facebook page connection was not found';
    end if;
    selected_connection_id := target_social_connection_id;
  elsif connection_count = 1 then
    selected_connection_id := (connections_payload -> 0 ->> 'id')::uuid;
  end if;

  select jsonb_build_object(
    'total', count(*)::integer,
    'active', count(*) filter (where variant_value.status = 'active')::integer,
    'paused', count(*) filter (where variant_value.status = 'paused')::integer,
    'draft', count(*) filter (where variant_value.status = 'draft')::integer,
    'archived', count(*) filter (where variant_value.status = 'archived')::integer,
    'facebookErrors', count(*) filter (
      where selected_connection_id is not null
        and latest_job.status in ('blocked', 'failed', 'uncertain')
    )::integer
  ) into summary_payload
  from app_private.product_variants as variant_value
  join app_private.products as product_value
    on product_value.organization_id = variant_value.organization_id
   and product_value.id = variant_value.product_id
  left join app_private.publications as publication_value
    on publication_value.organization_id = variant_value.organization_id
   and publication_value.variant_id = variant_value.id
   and publication_value.social_connection_id = selected_connection_id
   and publication_value.status <> 'retired'
  left join lateral (
    select job_value.status
    from app_private.publication_jobs as job_value
    where job_value.organization_id = publication_value.organization_id
      and job_value.publication_id = publication_value.id
    order by job_value.created_at desc, job_value.id desc
    limit 1
  ) as latest_job on true
  where variant_value.organization_id = target_organization_id
    and product_value.status <> 'archived';

  select coalesce(jsonb_agg(batch_payload order by created_at desc, id desc), '[]'::jsonb)
  into batches_payload
  from (
    select
      batch_value.id,
      batch_value.created_at,
      jsonb_build_object(
        'id', batch_value.id,
        'operation', batch_value.requested_operation,
        'status', batch_value.status,
        'createdAt', batch_value.created_at,
        'completedAt', batch_value.completed_at,
        'total', job_counts.total,
        'pending', job_counts.pending,
        'processing', job_counts.processing,
        'succeeded', job_counts.succeeded,
        'failed', job_counts.failed,
        'uncertain', job_counts.uncertain
      ) as batch_payload
    from app_private.publication_batches as batch_value
    left join lateral (
      select
        count(*)::integer as total,
        count(*) filter (where job_value.status in ('pending', 'retryable'))::integer as pending,
        count(*) filter (where job_value.status = 'processing')::integer as processing,
        count(*) filter (where job_value.status = 'succeeded')::integer as succeeded,
        count(*) filter (where job_value.status in ('blocked', 'failed', 'cancelled'))::integer as failed,
        count(*) filter (where job_value.status = 'uncertain')::integer as uncertain
      from app_private.publication_jobs as job_value
      where job_value.organization_id = batch_value.organization_id
        and job_value.batch_id = batch_value.id
    ) as job_counts on true
    where batch_value.organization_id = target_organization_id
      and batch_value.social_connection_id = selected_connection_id
    order by batch_value.created_at desc, batch_value.id desc
    limit 6
  ) as recent_batches;

  select coalesce(jsonb_agg(item_payload order by updated_at desc, variant_id desc), '[]'::jsonb)
  into all_items
  from (
    select
      variant_value.id as variant_id,
      variant_value.updated_at,
      jsonb_build_object(
        'productId', product_value.id,
        'variantId', variant_value.id,
        'productName', product_value.name,
        'variantName', variant_value.name,
        'productDescription', product_value.description,
        'variantDescription', variant_value.description,
        'productStatus', product_value.status,
        'variantStatus', variant_value.status,
        'sku', sku_value.sku,
        'category', jsonb_build_object(
          'id', category_value.id,
          'code', category_value.code,
          'name', category_value.name
        ),
        'prices', coalesce(price_values.prices, '[]'::jsonb),
        'media', coalesce(media_values.media, '[]'::jsonb),
        'facebook', case
          when publication_value.id is null then null
          else jsonb_build_object(
            'publicationId', publication_value.id,
            'publicationStatus', publication_value.status,
            'versionId', version_value.id,
            'versionStatus', version_value.status,
            'pricingStatus', version_value.pricing_status,
            'priceAmount', version_value.price_amount::text,
            'currencyCode', version_value.currency_code,
            'instanceId', instance_value.id,
            'externalUrl', instance_value.external_url,
            'facebookStatus', instance_value.status,
            'latestJobId', latest_job.id,
            'latestJobStatus', latest_job.status,
            'lastErrorCode', latest_job.last_error_code,
            'effectCertainty', latest_job.effect_certainty,
            'availableActions', case
              when latest_job.status = 'uncertain' then jsonb_build_array('reconcile')
              when latest_job.status = 'blocked' then jsonb_build_array('retry')
              when latest_job.status = 'failed'
                and latest_job.effect_certainty in ('not_started', 'confirmed_not_applied')
                then jsonb_build_array('retry')
              when latest_job.status = 'failed' then jsonb_build_array('reconcile')
              when publication_value.status = 'active'
                and version_value.status = 'approved'
                and variant_value.status = 'active'
                and product_value.status = 'active'
                and instance_value.id is null then jsonb_build_array('publish', 'pause')
              when publication_value.status = 'active'
                and version_value.status = 'approved'
                and variant_value.status = 'active'
                and product_value.status = 'active' then jsonb_build_array('refresh', 'pause')
              when publication_value.status = 'paused' then jsonb_build_array('resume')
              else '[]'::jsonb
            end
          )
        end,
        'createdAt', variant_value.created_at,
        'updatedAt', variant_value.updated_at
      ) as item_payload
    from app_private.product_variants as variant_value
    join app_private.products as product_value
      on product_value.organization_id = variant_value.organization_id
     and product_value.id = variant_value.product_id
    join app_private.catalog_categories as category_value
      on category_value.organization_id = product_value.organization_id
     and category_value.id = product_value.category_id
    left join lateral (
      select sku_row.sku
      from app_private.variant_skus as sku_row
      where sku_row.organization_id = variant_value.organization_id
        and sku_row.variant_id = variant_value.id
        and sku_row.status = 'current'
      order by sku_row.effective_at desc, sku_row.id desc
      limit 1
    ) as sku_value on true
    left join app_private.publications as publication_value
      on publication_value.organization_id = variant_value.organization_id
     and publication_value.variant_id = variant_value.id
     and publication_value.social_connection_id = selected_connection_id
     and publication_value.status <> 'retired'
    left join app_private.publication_versions as version_value
      on version_value.organization_id = publication_value.organization_id
     and version_value.id = publication_value.current_version_id
    left join lateral (
      select instance_row.id, instance_row.external_url, instance_row.status
      from app_private.publication_instances as instance_row
      where instance_row.organization_id = publication_value.organization_id
        and instance_row.publication_id = publication_value.id
        and instance_row.status <> 'deleted'
      order by instance_row.created_at desc, instance_row.id desc
      limit 1
    ) as instance_value on true
    left join lateral (
      select
        job_row.id,
        job_row.status,
        job_row.last_error_code,
        effect_value.effect_certainty
      from app_private.publication_jobs as job_row
      left join lateral (
        select event_value.event_payload ->> 'effect_certainty' as effect_certainty
        from app_private.publication_events as event_value
        where event_value.organization_id = job_row.organization_id
          and event_value.job_id = job_row.id
          and event_value.event_type = 'publication_job.result_recorded'
        order by event_value.occurred_at desc, event_value.id desc
        limit 1
      ) as effect_value on true
      where job_row.organization_id = publication_value.organization_id
        and job_row.publication_id = publication_value.id
      order by job_row.created_at desc, job_row.id desc
      limit 1
    ) as latest_job on true
    left join lateral (
      select coalesce(
        jsonb_agg(price_payload order by quantity_min, unit_name, price_tier_id),
        '[]'::jsonb
      ) as prices
      from (
        select
          tier_value.id as price_tier_id,
          tier_value.quantity_min,
          unit_value.name_singular as unit_name,
          jsonb_build_object(
            'id', tier_value.id,
            'unitId', tier_value.unit_id,
            'unitName', unit_value.name_singular,
            'unitSymbol', unit_value.symbol,
            'quantityMin', tier_value.quantity_min::text,
            'quantityMax', tier_value.quantity_max::text,
            'pricingStatus', tier_value.pricing_status,
            'calculationMethod', tier_value.calculation_method,
            'amount', tier_value.price_amount::text,
            'currencyCode', book_value.currency_code
          ) as price_payload
        from app_private.price_tiers as tier_value
        join app_private.price_books as book_value
          on book_value.organization_id = tier_value.organization_id
         and book_value.id = tier_value.price_book_id
         and book_value.status = 'active'
         and book_value.is_default
        join app_private.catalog_units as unit_value
          on unit_value.organization_id = tier_value.organization_id
         and unit_value.id = tier_value.unit_id
        where tier_value.organization_id = variant_value.organization_id
          and tier_value.variant_id = variant_value.id
          and tier_value.superseded_at is null
          and tier_value.valid_from <= statement_timestamp()
          and (tier_value.valid_until is null or tier_value.valid_until > statement_timestamp())
        order by tier_value.quantity_min, unit_value.name_singular, tier_value.id
        limit 20
      ) as current_prices
    ) as price_values on true
    left join lateral (
      select coalesce(
        jsonb_agg(media_payload order by source_priority, role_priority, ordinal, relation_id),
        '[]'::jsonb
      ) as media
      from (
        select
          relation_value.id as relation_id,
          case when relation_value.variant_id = variant_value.id then 0 else 1 end as source_priority,
          case relation_value.media_role when 'primary' then 0 when 'gallery' then 1 else 2 end
            as role_priority,
          relation_value.ordinal,
          jsonb_build_object(
            'id', relation_value.id,
            'role', relation_value.media_role,
            'ordinal', relation_value.ordinal,
            'altText', relation_value.alt_text,
            'bucketId', object_value.bucket_id,
            'objectPath', object_value.object_path,
            'width', object_value.width_pixels,
            'height', object_value.height_pixels
          ) as media_payload
        from app_private.product_media as relation_value
        join app_private.media_asset_objects as object_value
          on object_value.organization_id = relation_value.organization_id
         and object_value.media_asset_id = relation_value.media_asset_id
         and object_value.rendition_kind = 'storefront_webp'
         and object_value.status = 'published'
        where relation_value.organization_id = variant_value.organization_id
          and relation_value.product_id = product_value.id
          and relation_value.status = 'approved'
          and (relation_value.variant_id = variant_value.id or relation_value.variant_id is null)
        order by source_priority, role_priority, relation_value.ordinal, relation_value.id
        limit 8
      ) as approved_media
    ) as media_values on true
    where variant_value.organization_id = target_organization_id
      and (target_status = 'all' or variant_value.status = target_status)
      and (
        normalized_search is null
        or position(lower(normalized_search) in lower(
          product_value.name || ' ' || variant_value.name || ' ' || coalesce(sku_value.sku, '')
        )) > 0
      )
      and (
        target_cursor_updated_at is null
        or (variant_value.updated_at, variant_value.id)
          < (target_cursor_updated_at, target_cursor_variant_id)
      )
    order by variant_value.updated_at desc, variant_value.id desc
    limit target_page_size + 1
  ) as paged_items;

  has_more := jsonb_array_length(all_items) > target_page_size;
  select coalesce(jsonb_agg(item_value order by item_ordinal), '[]'::jsonb)
  into page_items
  from jsonb_array_elements(all_items) with ordinality as page_value(item_value, item_ordinal)
  where item_ordinal <= target_page_size;

  if has_more and jsonb_array_length(page_items) > 0 then
    last_item := page_items -> (jsonb_array_length(page_items) - 1);
    next_cursor := jsonb_build_object(
      'updatedAt', last_item ->> 'updatedAt',
      'variantId', last_item ->> 'variantId'
    );
  end if;

  return jsonb_build_object(
    'summary', summary_payload,
    'connections', connections_payload,
    'selectedConnectionId', selected_connection_id,
    'items', page_items,
    'batches', batches_payload,
    'hasMore', has_more,
    'nextCursor', next_cursor
  );
end;
$$;

create function api.admin_set_catalog_offer_status(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_variant_id uuid,
  target_status text,
  target_reason text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  variant_record app_private.product_variants%rowtype;
  publication_record record;
  publication_count integer := 0;
  result_payload jsonb;
begin
  if target_status not in ('active', 'paused')
    or target_reason is null
    or target_reason <> btrim(target_reason)
    or char_length(target_reason) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'admin catalog status request is invalid';
  end if;

  select * into command_claim
  from app_private.claim_admin_catalog_command(
    target_organization_id,
    target_actor_user_id,
    target_idempotency_key,
    'catalog.offer_status',
    jsonb_build_object(
      'variant_id', target_variant_id,
      'status', target_status,
      'reason', target_reason
    )
  );
  if command_claim.was_replayed then
    return command_claim.previous_result_payload || jsonb_build_object('wasReplayed', true);
  end if;

  select variant_value.* into variant_record
  from app_private.product_variants as variant_value
  join app_private.products as product_value
    on product_value.organization_id = variant_value.organization_id
   and product_value.id = variant_value.product_id
  where variant_value.organization_id = target_organization_id
    and variant_value.id = target_variant_id
    and variant_value.status <> 'archived'
    and product_value.status <> 'archived'
  for update of variant_value;
  if not found then
    raise exception using errcode = 'P0002', message = 'catalog offer was not found';
  end if;

  update app_private.product_variants
  set status = target_status
  where organization_id = target_organization_id
    and id = target_variant_id
    and status <> target_status;

  for publication_record in
    select publication_value.id, publication_value.status
    from app_private.publications as publication_value
    where publication_value.organization_id = target_organization_id
      and publication_value.variant_id = target_variant_id
      and publication_value.status <> 'retired'
    order by publication_value.id
    for update
  loop
    if publication_record.status <> target_status then
      perform api.transition_publication(
        target_organization_id,
        publication_record.id,
        target_idempotency_key || ':publication:' || publication_record.id::text,
        target_status,
        target_reason,
        target_actor_user_id
      );
    end if;
    publication_count := publication_count + 1;
  end loop;

  result_payload := jsonb_build_object(
    'variantId', target_variant_id,
    'previousStatus', variant_record.status,
    'status', target_status,
    'publicationsTransitioned', publication_count,
    'wasReplayed', false
  );
  perform app_private.complete_admin_catalog_command(
    target_organization_id,
    command_claim.admin_catalog_command_id,
    result_payload
  );
  return result_payload;
end;
$$;

create function api.admin_enqueue_facebook_publication(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_variant_id uuid,
  target_social_connection_id uuid,
  target_operation text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  publication_record record;
  dispatch_policy jsonb;
  enqueued record;
begin
  if target_actor_user_id is null or target_operation not in ('publish', 'refresh') then
    raise exception using errcode = '22023', message = 'admin publication request is invalid';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );

  select
    publication_value.id,
    publication_value.current_version_id,
    instance_value.id as instance_id
  into publication_record
  from app_private.publications as publication_value
  join app_private.social_connections as connection_value
    on connection_value.organization_id = publication_value.organization_id
   and connection_value.id = publication_value.social_connection_id
   and connection_value.surface = 'facebook_page'
   and connection_value.status = 'active'
  join app_private.publication_versions as version_value
    on version_value.organization_id = publication_value.organization_id
   and version_value.id = publication_value.current_version_id
   and version_value.status = 'approved'
  join app_private.product_variants as variant_value
    on variant_value.organization_id = publication_value.organization_id
   and variant_value.id = publication_value.variant_id
   and variant_value.status = 'active'
  join app_private.products as product_value
    on product_value.organization_id = variant_value.organization_id
   and product_value.id = variant_value.product_id
   and product_value.status = 'active'
  left join lateral (
    select instance_row.id
    from app_private.publication_instances as instance_row
    where instance_row.organization_id = publication_value.organization_id
      and instance_row.publication_id = publication_value.id
      and instance_row.status <> 'deleted'
    order by instance_row.created_at desc, instance_row.id desc
    limit 1
  ) as instance_value on true
  where publication_value.organization_id = target_organization_id
    and publication_value.variant_id = target_variant_id
    and publication_value.social_connection_id = target_social_connection_id
    and publication_value.status = 'active'
    and (
      (target_operation = 'publish' and instance_value.id is null)
      or (target_operation = 'refresh' and instance_value.id is not null)
    );
  if not found then
    raise exception using errcode = 'P0002', message = 'facebook publication is not ready';
  end if;

  dispatch_policy := app_private.facebook_dispatch_policy_for_agent(
    target_organization_id,
    target_social_connection_id
  );
  if dispatch_policy is null then
    raise exception using errcode = '55000', message = 'facebook dispatch policy is not ready';
  end if;

  select * into enqueued
  from api.enqueue_publication_job(
    target_organization_id,
    target_idempotency_key || ':enqueue',
    publication_record.id,
    target_operation,
    'page.post.create',
    'publication-effect-' || encode(
      extensions.digest(
        convert_to(target_organization_id::text || ':' || target_idempotency_key, 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    publication_record.current_version_id,
    null,
    statement_timestamp(),
    (dispatch_policy ->> 'priority')::integer,
    (dispatch_policy ->> 'max_attempts')::integer,
    target_actor_user_id
  );

  return jsonb_build_object(
    'accepted', true,
    'publicationJobId', enqueued.publication_job_id,
    'publicationId', publication_record.id,
    'operation', target_operation,
    'wasReplayed', enqueued.was_replayed
  );
end;
$$;

create function api.admin_enqueue_facebook_catalog(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_social_connection_id uuid,
  target_operation text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dispatch_policy jsonb;
  publication_ids jsonb;
  enqueued record;
begin
  if target_actor_user_id is null or target_operation not in ('publish', 'refresh') then
    raise exception using errcode = '22023', message = 'admin catalog publication request is invalid';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );

  dispatch_policy := app_private.facebook_dispatch_policy_for_agent(
    target_organization_id,
    target_social_connection_id
  );
  if dispatch_policy is null then
    raise exception using errcode = '55000', message = 'facebook dispatch policy is not ready';
  end if;

  select coalesce(jsonb_agg(publication_value.id order by publication_value.id), '[]'::jsonb)
  into publication_ids
  from app_private.publications as publication_value
  join app_private.publication_versions as version_value
    on version_value.organization_id = publication_value.organization_id
   and version_value.id = publication_value.current_version_id
   and version_value.status = 'approved'
  join app_private.product_variants as variant_value
    on variant_value.organization_id = publication_value.organization_id
   and variant_value.id = publication_value.variant_id
   and variant_value.status = 'active'
  join app_private.products as product_value
    on product_value.organization_id = variant_value.organization_id
   and product_value.id = variant_value.product_id
   and product_value.status = 'active'
  left join lateral (
    select instance_row.id
    from app_private.publication_instances as instance_row
    where instance_row.organization_id = publication_value.organization_id
      and instance_row.publication_id = publication_value.id
      and instance_row.status <> 'deleted'
    order by instance_row.created_at desc, instance_row.id desc
    limit 1
  ) as instance_value on true
  where publication_value.organization_id = target_organization_id
    and publication_value.social_connection_id = target_social_connection_id
    and publication_value.status = 'active'
    and (
      (target_operation = 'publish' and instance_value.id is null)
      or (target_operation = 'refresh' and instance_value.id is not null)
    );

  select * into enqueued
  from api.enqueue_publication_batch(
    target_organization_id,
    target_idempotency_key || ':batch',
    target_social_connection_id,
    target_operation,
    'manual',
    publication_ids,
    jsonb_build_object('scope', 'eligible_active_catalog', 'operation', target_operation),
    dispatch_policy,
    statement_timestamp(),
    (dispatch_policy ->> 'priority')::integer,
    (dispatch_policy ->> 'max_attempts')::integer,
    null, null, null, null,
    target_actor_user_id
  );

  return jsonb_build_object(
    'accepted', true,
    'publicationBatchId', enqueued.publication_batch_id,
    'jobsCreated', enqueued.jobs_created,
    'operation', target_operation,
    'wasReplayed', enqueued.was_replayed
  );
end;
$$;

create function api.admin_retry_facebook_publication(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_publication_job_id uuid,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  retried record;
begin
  if target_actor_user_id is null then
    raise exception using errcode = '42501', message = 'admin catalog actor is required';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );
  select * into retried
  from api.retry_publication_job(
    target_organization_id,
    target_publication_job_id,
    target_idempotency_key || ':retry',
    statement_timestamp(),
    target_actor_user_id
  );
  return jsonb_build_object(
    'accepted', true,
    'publicationJobId', retried.publication_job_id,
    'retryOfJobId', retried.retry_of_job_id,
    'wasReplayed', retried.was_replayed
  );
end;
$$;

create function api.admin_set_facebook_batch_state(
  target_organization_id uuid,
  target_actor_user_id uuid,
  target_publication_batch_id uuid,
  target_action text,
  target_reason text,
  target_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  transitioned record;
begin
  if target_actor_user_id is null
    or target_action not in ('pause', 'resume')
    or target_reason is null
    or target_reason <> btrim(target_reason)
    or char_length(target_reason) not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'admin batch state request is invalid';
  end if;
  perform app_private.assert_publication_actor(
    target_organization_id,
    target_actor_user_id,
    array['owner', 'admin']::text[]
  );
  select * into transitioned
  from api.transition_publication_batch_pause(
    target_organization_id,
    target_publication_batch_id,
    target_idempotency_key || ':batch-state',
    target_action,
    target_reason,
    statement_timestamp(),
    target_actor_user_id
  );
  return jsonb_build_object(
    'accepted', true,
    'publicationBatchId', transitioned.publication_batch_id,
    'status', transitioned.status,
    'wasReplayed', transitioned.was_replayed
  );
end;
$$;

revoke all on app_private.admin_catalog_commands from public, anon, authenticated;
revoke all on function app_private.claim_admin_catalog_command(uuid, uuid, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function app_private.complete_admin_catalog_command(uuid, uuid, jsonb)
  from public, anon, authenticated;

revoke all on function api.get_facebook_catalog_admin_page(
  uuid, uuid, uuid, text, text, integer, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function api.admin_set_catalog_offer_status(
  uuid, uuid, uuid, text, text, text
) from public, anon, authenticated;
revoke all on function api.admin_enqueue_facebook_publication(
  uuid, uuid, uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function api.admin_enqueue_facebook_catalog(
  uuid, uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function api.admin_retry_facebook_publication(
  uuid, uuid, uuid, text
) from public, anon, authenticated;
revoke all on function api.admin_set_facebook_batch_state(
  uuid, uuid, uuid, text, text, text
) from public, anon, authenticated;

grant execute on function api.get_facebook_catalog_admin_page(
  uuid, uuid, uuid, text, text, integer, timestamptz, uuid
) to service_role;
grant execute on function api.admin_set_catalog_offer_status(
  uuid, uuid, uuid, text, text, text
) to service_role;
grant execute on function api.admin_enqueue_facebook_publication(
  uuid, uuid, uuid, uuid, text, text
) to service_role;
grant execute on function api.admin_enqueue_facebook_catalog(
  uuid, uuid, uuid, text, text
) to service_role;
grant execute on function api.admin_retry_facebook_publication(
  uuid, uuid, uuid, text
) to service_role;
grant execute on function api.admin_set_facebook_batch_state(
  uuid, uuid, uuid, text, text, text
) to service_role;

comment on table app_private.admin_catalog_commands is
  'Idempotent and auditable owner/admin commands issued by the authenticated mobile catalog panel';
comment on function api.get_facebook_catalog_admin_page(
  uuid, uuid, uuid, text, text, integer, timestamptz, uuid
) is
  'Returns one bounded cursor-paginated catalog page with approved WebP object references, current prices, Facebook state and recent batches';
comment on function api.admin_enqueue_facebook_catalog(uuid, uuid, uuid, text, text) is
  'Enqueues the eligible active catalog using the same frozen Facebook pacing policy as the owner WhatsApp tool';

commit;
