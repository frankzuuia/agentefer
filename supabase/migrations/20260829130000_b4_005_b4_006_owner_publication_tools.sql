begin;

create function app_private.facebook_dispatch_policy_for_agent(
  target_organization_id uuid,
  target_social_connection_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  capability_record record;
  dispatch_policy jsonb;
  spacing_seconds numeric;
  max_attempts integer;
  priority integer;
begin
  select capability_value.id, capability_value.observed_at,
    capability_value.valid_until, capability_value.capability_constraints
  into capability_record
  from app_private.social_capabilities as capability_value
  join app_private.social_connections as connection_value
    on connection_value.organization_id = capability_value.organization_id
   and connection_value.id = capability_value.social_connection_id
  where capability_value.organization_id = target_organization_id
    and capability_value.social_connection_id = target_social_connection_id
    and capability_value.capability_code = 'page.post.create'
    and capability_value.status = 'granted'
    and (capability_value.valid_until is null or capability_value.valid_until > statement_timestamp())
    and connection_value.status = 'active'
    and connection_value.surface = 'facebook_page'
  order by capability_value.observed_at desc, capability_value.created_at desc, capability_value.id desc
  limit 1;

  if not found then
    return null;
  end if;

  dispatch_policy := capability_record.capability_constraints -> 'dispatch_policy';
  if jsonb_typeof(dispatch_policy) <> 'object'
    or jsonb_typeof(dispatch_policy -> 'minimum_spacing_seconds') <> 'number'
    or jsonb_typeof(dispatch_policy -> 'max_attempts') <> 'number'
    or jsonb_typeof(dispatch_policy -> 'priority') <> 'number' then
    return null;
  end if;

  begin
    spacing_seconds := (dispatch_policy ->> 'minimum_spacing_seconds')::numeric;
    max_attempts := (dispatch_policy ->> 'max_attempts')::integer;
    priority := (dispatch_policy ->> 'priority')::integer;
  exception when invalid_text_representation or numeric_value_out_of_range then
    return null;
  end;

  if spacing_seconds <= 0 or spacing_seconds > 86400
    or max_attempts not between 1 and 100
    or priority not between -1000000 and 1000000 then
    return null;
  end if;

  return jsonb_build_object(
    'minimum_spacing_seconds', spacing_seconds,
    'max_attempts', max_attempts,
    'priority', priority,
    'capability_id', capability_record.id,
    'capability_observed_at', capability_record.observed_at,
    'capability_valid_until', capability_record.valid_until
  );
end;
$$;

create function app_private.catalog_recent_for_owner_agent(
  target_organization_id uuid,
  target_arguments jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_limit integer := 5;
  candidates jsonb;
begin
  if target_arguments is null or jsonb_typeof(target_arguments) <> 'object' then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;
  begin
    target_limit := coalesce((target_arguments ->> 'limit')::integer, 5);
  exception when invalid_text_representation or numeric_value_out_of_range then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_limit'));
  end;
  if target_limit not between 1 and 20 then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_limit'));
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', recent.product_id,
    'product_name', recent.product_name,
    'product_status', recent.product_status,
    'created_at', recent.product_created_at,
    'variants', recent.variants
  ) order by recent.product_created_at desc, recent.product_id desc), '[]'::jsonb)
  into candidates
  from (
    select product_value.id as product_id,
      product_value.name as product_name,
      product_value.status as product_status,
      product_value.created_at as product_created_at,
      coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'variant_id', variant_value.id,
        'variant_name', variant_value.name,
        'variant_status', variant_value.status,
        'sku', sku_value.sku,
        'publication_id', publication_value.id,
        'publication_status', publication_value.status,
        'social_connection_id', publication_value.social_connection_id,
        'facebook_page_name', connection_value.display_name,
        'facebook_instance_id', instance_value.external_publication_id
      )) order by variant_value.created_at, variant_value.id), '[]'::jsonb) as variants
    from app_private.products as product_value
    join app_private.product_variants as variant_value
      on variant_value.organization_id = product_value.organization_id
     and variant_value.product_id = product_value.id
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
     and publication_value.status <> 'retired'
    left join app_private.social_connections as connection_value
      on connection_value.organization_id = publication_value.organization_id
     and connection_value.id = publication_value.social_connection_id
    left join lateral (
      select instance_row.external_publication_id
      from app_private.publication_instances as instance_row
      where instance_row.organization_id = publication_value.organization_id
        and instance_row.publication_id = publication_value.id
        and instance_row.status <> 'deleted'
      order by instance_row.created_at desc, instance_row.id desc
      limit 1
    ) as instance_value on true
    where product_value.organization_id = target_organization_id
      and product_value.status <> 'archived'
      and variant_value.status <> 'archived'
    group by product_value.id, product_value.name, product_value.status, product_value.created_at
    order by product_value.created_at desc, product_value.id desc
    limit target_limit
  ) as recent;

  return jsonb_build_object('ok', true, 'candidates', candidates);
end;
$$;

create function app_private.catalog_set_offer_status_for_owner_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_execution_key text,
  target_arguments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant_id uuid;
  target_status text;
  target_reason text;
  run_record app_private.agent_runs%rowtype;
  variant_record app_private.product_variants%rowtype;
  publication_record record;
  publication_count integer := 0;
begin
  begin
    target_variant_id := (target_arguments ->> 'variant_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_variant_id'));
  end;
  target_status := target_arguments ->> 'status';
  target_reason := btrim(coalesce(target_arguments ->> 'reason', ''));
  if target_status not in ('active', 'paused') or char_length(target_reason) not between 1 and 1000 then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;

  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
    and run_value.actor_kind = 'member';
  perform app_private.assert_publication_actor(
    target_organization_id, run_record.actor_user_id, array['owner', 'admin']::text[]
  );

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
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'offer_not_found'));
  end if;

  update app_private.product_variants
  set status = target_status
  where organization_id = target_organization_id and id = target_variant_id;

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
        target_execution_key || ':publication:' || publication_record.id::text,
        target_status,
        target_reason,
        run_record.actor_user_id
      );
    end if;
    publication_count := publication_count + 1;
  end loop;

  perform app_private.insert_agent_audit_event(
    target_organization_id,
    'catalog.offer_status_changed',
    'member',
    run_record.actor_user_id,
    target_execution_key,
    run_record.trace_id,
    jsonb_build_object(
      'variant_id', target_variant_id,
      'previous_status', variant_record.status,
      'new_status', target_status,
      'publication_count', publication_count,
      'reason', target_reason
    ),
    target_run_id
  );

  return jsonb_build_object(
    'ok', true,
    'variant_id', target_variant_id,
    'previous_status', variant_record.status,
    'status', target_status,
    'publications_transitioned', publication_count
  );
end;
$$;

create function app_private.publication_publish_for_owner_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_execution_key text,
  target_arguments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_variant_id uuid;
  target_social_connection_id uuid;
  target_operation text;
  run_record app_private.agent_runs%rowtype;
  target_publications jsonb;
  target_publication_count integer;
  publication_record record;
  dispatch_policy jsonb;
  enqueued record;
begin
  begin
    target_variant_id := (target_arguments ->> 'variant_id')::uuid;
    if target_arguments ? 'social_connection_id' then
      target_social_connection_id := (target_arguments ->> 'social_connection_id')::uuid;
    end if;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_target'));
  end;
  target_operation := target_arguments ->> 'operation';
  if target_operation not in ('publish', 'refresh') then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_operation'));
  end if;

  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
    and run_value.actor_kind = 'member';
  perform app_private.assert_publication_actor(
    target_organization_id, run_record.actor_user_id, array['owner', 'admin']::text[]
  );

  select count(*)::integer,
    coalesce(jsonb_agg(jsonb_build_object(
      'publication_id', publication_value.id,
      'social_connection_id', publication_value.social_connection_id,
      'facebook_page_name', connection_value.display_name,
      'publication_status', publication_value.status,
      'version_status', version_value.status,
      'has_external_instance', instance_value.id is not null
    ) order by connection_value.display_name, publication_value.id), '[]'::jsonb)
  into target_publication_count, target_publications
  from app_private.publications as publication_value
  join app_private.social_connections as connection_value
    on connection_value.organization_id = publication_value.organization_id
   and connection_value.id = publication_value.social_connection_id
  left join app_private.publication_versions as version_value
    on version_value.organization_id = publication_value.organization_id
   and version_value.id = publication_value.current_version_id
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
    and publication_value.status = 'active'
    and version_value.status = 'approved'
    and connection_value.status = 'active'
    and (
      target_social_connection_id is null
      or publication_value.social_connection_id = target_social_connection_id
    )
    and (
      (target_operation = 'publish' and instance_value.id is null)
      or (target_operation = 'refresh' and instance_value.id is not null)
    );

  if target_publication_count <> 1 then
    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', case when target_publication_count = 0 then 'publication_not_ready' else 'ambiguous_page' end,
        'candidates', target_publications
      )
    );
  end if;

  select publication_value.id, publication_value.current_version_id,
    publication_value.social_connection_id
  into publication_record
  from app_private.publications as publication_value
  where publication_value.organization_id = target_organization_id
    and publication_value.id = (target_publications -> 0 ->> 'publication_id')::uuid;

  dispatch_policy := app_private.facebook_dispatch_policy_for_agent(
    target_organization_id, publication_record.social_connection_id
  );
  if dispatch_policy is null then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'dispatch_policy_not_ready'));
  end if;

  select * into enqueued
  from api.enqueue_publication_job(
    target_organization_id,
    target_execution_key || ':enqueue',
    publication_record.id,
    target_operation,
    'page.post.create',
    'publication-effect-' || encode(
      extensions.digest(convert_to(target_organization_id::text || ':' || target_execution_key, 'UTF8'), 'sha256'),
      'hex'
    ),
    publication_record.current_version_id,
    null,
    statement_timestamp(),
    (dispatch_policy ->> 'priority')::integer,
    (dispatch_policy ->> 'max_attempts')::integer,
    run_record.actor_user_id
  );

  return jsonb_build_object(
    'ok', true,
    'accepted', true,
    'publication_job_id', enqueued.publication_job_id,
    'publication_id', publication_record.id,
    'operation', target_operation,
    'was_replayed', enqueued.was_replayed
  );
end;
$$;

create function app_private.publication_enqueue_catalog_for_owner_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_execution_key text,
  target_arguments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_social_connection_id uuid;
  target_operation text;
  run_record app_private.agent_runs%rowtype;
  dispatch_policy jsonb;
  publication_ids jsonb;
  enqueued record;
  subscribed record;
begin
  begin
    target_social_connection_id := (target_arguments ->> 'social_connection_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_connection'));
  end;
  target_operation := target_arguments ->> 'operation';
  if target_operation not in ('publish', 'refresh') then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_operation'));
  end if;

  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
    and run_value.actor_kind = 'member';
  perform app_private.assert_publication_actor(
    target_organization_id, run_record.actor_user_id, array['owner', 'admin']::text[]
  );

  dispatch_policy := app_private.facebook_dispatch_policy_for_agent(
    target_organization_id, target_social_connection_id
  );
  if dispatch_policy is null then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'dispatch_policy_not_ready'));
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
    target_execution_key || ':batch',
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
    run_record.actor_user_id
  );

  select * into subscribed
  from api.subscribe_publication_batch(
    target_organization_id, enqueued.publication_batch_id, target_run_id
  );

  return jsonb_build_object(
    'ok', true,
    'accepted', true,
    'publication_batch_id', enqueued.publication_batch_id,
    'jobs_created', enqueued.jobs_created,
    'notification_subscription_id', subscribed.publication_batch_subscription_id,
    'was_replayed', enqueued.was_replayed
  );
end;
$$;

create function app_private.publication_status_for_owner_agent(
  target_organization_id uuid,
  target_arguments jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_batch_id uuid;
  status_value jsonb;
begin
  begin
    target_batch_id := (target_arguments ->> 'publication_batch_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_batch_id'));
  end;
  status_value := api.get_publication_batch_status(target_organization_id, target_batch_id);
  if status_value is null then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'batch_not_found'));
  end if;
  return jsonb_build_object('ok', true, 'batch', status_value);
end;
$$;

create function app_private.publication_retry_for_owner_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_execution_key text,
  target_arguments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_job_id uuid;
  run_record app_private.agent_runs%rowtype;
  retried record;
begin
  begin
    target_job_id := (target_arguments ->> 'publication_job_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_job_id'));
  end;
  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id and run_value.id = target_run_id;
  select * into retried
  from api.retry_publication_job(
    target_organization_id,
    target_job_id,
    target_execution_key || ':retry',
    statement_timestamp(),
    run_record.actor_user_id
  );
  return jsonb_build_object(
    'ok', true,
    'publication_job_id', retried.publication_job_id,
    'retry_of_job_id', retried.retry_of_job_id,
    'was_replayed', retried.was_replayed
  );
end;
$$;

create function app_private.publication_batch_state_for_owner_agent(
  target_organization_id uuid,
  target_run_id uuid,
  target_execution_key text,
  target_arguments jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_batch_id uuid;
  target_action text;
  target_reason text;
  run_record app_private.agent_runs%rowtype;
  transitioned record;
begin
  begin
    target_batch_id := (target_arguments ->> 'publication_batch_id')::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_batch_id'));
  end;
  target_action := target_arguments ->> 'action';
  target_reason := btrim(coalesce(target_arguments ->> 'reason', ''));
  if target_action not in ('pause', 'resume') or char_length(target_reason) not between 1 and 1000 then
    return jsonb_build_object('ok', false, 'error', jsonb_build_object('code', 'invalid_arguments'));
  end if;
  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id and run_value.id = target_run_id;
  select * into transitioned
  from api.transition_publication_batch_pause(
    target_organization_id,
    target_batch_id,
    target_execution_key || ':batch-state',
    target_action,
    target_reason,
    statement_timestamp(),
    run_record.actor_user_id
  );
  return jsonb_build_object(
    'ok', true,
    'publication_batch_id', transitioned.publication_batch_id,
    'status', transitioned.status,
    'was_replayed', transitioned.was_replayed
  );
end;
$$;

create function app_private.ensure_customer_assistant_publication_tools(
  target_organization_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_actor_user_id uuid;
  selected_policy_version app_private.agent_policy_versions%rowtype;
  selected_contract_version_id uuid;
  selected_contract_hash bytea;
  expected_contract_hash bytea;
  definition_record record;
  tool_versions jsonb := '{}'::jsonb;
  target_bindings jsonb;
  created_policy record;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text || ':owner-publication-tools', 0)
  );
  perform app_private.ensure_customer_assistant_read_tools(target_organization_id);

  select membership.user_id into selected_actor_user_id
  from app_private.organization_memberships as membership
  where membership.organization_id = target_organization_id
    and membership.status = 'active'
    and membership.role in ('owner', 'admin')
  order by case membership.role when 'owner' then 0 else 1 end,
    membership.created_at, membership.user_id
  limit 1;
  if selected_actor_user_id is null then
    raise exception using errcode = '55000', message = 'organization needs an active owner or admin';
  end if;

  for definition_record in
    select * from jsonb_to_recordset(jsonb_build_array(
      jsonb_build_object(
        'tool_name', 'catalog_resolve_recent',
        'display_name', 'Resolver productos recientes',
        'description', 'Devuelve las altas confirmadas más recientes del tenant con sus variantes, SKU y estado de Facebook. Úsala para resolver expresiones como último producto; si hay ambigüedad pregunta antes de mutar.',
        'effect_class', 'read_only',
        'handler_key', 'catalog.recent.owner.read.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object('limit', jsonb_build_object('type', 'integer', 'minimum', 1, 'maximum', 20)),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'catalog_set_offer_status',
        'display_name', 'Activar o pausar oferta',
        'description', 'Activa o pausa exactamente una variante y sus publicaciones vinculadas sin modificar combo o componentes distintos. Requiere variante inequívoca y razón del propietario.',
        'effect_class', 'internal_mutation',
        'handler_key', 'catalog.offer-status.owner.write.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'variant_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'status', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('active', 'paused')),
            'reason', jsonb_build_object('type', 'string', 'minLength', 1, 'maxLength', 1000)
          ),
          'required', jsonb_build_array('variant_id', 'status', 'reason'),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'publication_publish',
        'display_name', 'Publicar oferta en Facebook',
        'description', 'Acepta una publicación o actualización de una variante inequívoca en una Página autorizada. Sólo encola; el worker reautoriza precio, stock, versión, capability y credencial antes de Meta.',
        'effect_class', 'external_effect',
        'handler_key', 'publication.publish.owner.enqueue.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'variant_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'social_connection_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'operation', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('publish', 'refresh'))
          ),
          'required', jsonb_build_array('variant_id', 'operation'),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'publication_enqueue_catalog',
        'display_name', 'Publicar catálogo en Facebook',
        'description', 'Crea un lote durable de ofertas elegibles para la Página indicada y suscribe un resumen terminal. El ritmo viene de la capability versionada, nunca de una cifra supuesta.',
        'effect_class', 'external_effect',
        'handler_key', 'publication.catalog.owner.enqueue.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'social_connection_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'operation', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('publish', 'refresh'))
          ),
          'required', jsonb_build_array('social_connection_id', 'operation'),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'publication_get_status',
        'display_name', 'Consultar lote de publicaciones',
        'description', 'Consulta contadores, siguiente ventana, fallos, certeza y estado de notificación de un lote sin bloquear la conversación.',
        'effect_class', 'read_only',
        'handler_key', 'publication.batch.owner.read.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object('publication_batch_id', jsonb_build_object('type', 'string', 'format', 'uuid')),
          'required', jsonb_build_array('publication_batch_id'),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'publication_retry',
        'display_name', 'Reintentar publicación segura',
        'description', 'Reencola un job bloqueado o fallido sólo cuando la base confirma ausencia del efecto externo. Un resultado incierto se rechaza y exige conciliación.',
        'effect_class', 'external_effect',
        'handler_key', 'publication.retry.owner.enqueue.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object('publication_job_id', jsonb_build_object('type', 'string', 'format', 'uuid')),
          'required', jsonb_build_array('publication_job_id'),
          'additionalProperties', false
        )
      ),
      jsonb_build_object(
        'tool_name', 'publication_set_batch_state',
        'display_name', 'Pausar o reanudar lote',
        'description', 'Pausa o reanuda pendientes de un lote sin cancelar jobs en vuelo y conserva selección, policy y progreso originales.',
        'effect_class', 'internal_mutation',
        'handler_key', 'publication.batch-state.owner.write.v1',
        'input_schema', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'publication_batch_id', jsonb_build_object('type', 'string', 'format', 'uuid'),
            'action', jsonb_build_object('type', 'string', 'enum', jsonb_build_array('pause', 'resume')),
            'reason', jsonb_build_object('type', 'string', 'minLength', 1, 'maxLength', 1000)
          ),
          'required', jsonb_build_array('publication_batch_id', 'action', 'reason'),
          'additionalProperties', false
        )
      )
    )) as tool_definition(
      tool_name text,
      display_name text,
      description text,
      effect_class text,
      handler_key text,
      input_schema jsonb
    )
  loop
    expected_contract_hash := extensions.digest(jsonb_build_object(
      'description', definition_record.description,
      'input_schema', definition_record.input_schema,
      'output_schema', jsonb_build_object('type', 'object', 'additionalProperties', true),
      'effect_class', definition_record.effect_class,
      'handler_key', definition_record.handler_key
    )::text, 'sha256');

    select contract_value.current_version_id, version_value.contract_hash
    into selected_contract_version_id, selected_contract_hash
    from app_private.tool_contracts as contract_value
    left join app_private.tool_contract_versions as version_value
      on version_value.organization_id = contract_value.organization_id
     and version_value.id = contract_value.current_version_id
    where contract_value.organization_id = target_organization_id
      and contract_value.tool_name = definition_record.tool_name;

    if selected_contract_version_id is null
      or selected_contract_hash is distinct from expected_contract_hash then
      select registered.tool_contract_version_id
      into selected_contract_version_id
      from api.register_tool_contract_version(
        target_organization_id,
        'b4-005-006:tool:' || definition_record.tool_name || ':' || encode(expected_contract_hash, 'hex'),
        definition_record.tool_name,
        definition_record.display_name,
        definition_record.description,
        definition_record.input_schema,
        jsonb_build_object('type', 'object', 'additionalProperties', true),
        definition_record.effect_class,
        definition_record.handler_key,
        selected_contract_version_id,
        'active',
        selected_actor_user_id,
        'b4-005-006:tool-bootstrap:' || target_organization_id::text,
        null
      ) as registered;
    end if;

    tool_versions := tool_versions || jsonb_build_object(
      definition_record.tool_name, selected_contract_version_id
    );
    selected_contract_version_id := null;
    selected_contract_hash := null;
  end loop;

  select version_value.* into selected_policy_version
  from app_private.agent_policies as policy_value
  join app_private.agent_policy_versions as version_value
    on version_value.organization_id = policy_value.organization_id
   and version_value.id = policy_value.current_version_id
  where policy_value.organization_id = target_organization_id
    and policy_value.policy_key = 'customer_assistant'
    and policy_value.status = 'active'
  for update of policy_value;

  if (
    select count(*) = 7
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = target_organization_id
      and policy_tool.policy_version_id = selected_policy_version.id
      and contract_value.tool_name in (
        'catalog_resolve_recent', 'catalog_set_offer_status', 'publication_publish',
        'publication_enqueue_catalog', 'publication_get_status', 'publication_retry',
        'publication_set_batch_state'
      )
      and policy_tool.tool_contract_version_id = (tool_versions ->> contract_value.tool_name)::uuid
      and policy_tool.allowed_actor_kinds = array['member']::text[]
      and policy_tool.required_membership_roles = array['owner', 'admin']::text[]
      and policy_tool.allowed_channels = array['whatsapp']::text[]
  ) then
    return selected_policy_version.id;
  end if;

  select coalesce(jsonb_agg(binding_value order by tool_name), '[]'::jsonb)
  into target_bindings
  from (
    select contract_value.tool_name,
      jsonb_build_object(
        'tool_contract_version_id', policy_tool.tool_contract_version_id,
        'allowed_actor_kinds', to_jsonb(policy_tool.allowed_actor_kinds),
        'required_membership_roles', to_jsonb(policy_tool.required_membership_roles),
        'allowed_channels', to_jsonb(policy_tool.allowed_channels),
        'authorization_constraints', policy_tool.authorization_constraints
      ) as binding_value
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = target_organization_id
      and policy_tool.policy_version_id = selected_policy_version.id
      and contract_value.tool_name not in (
        'catalog_resolve_recent', 'catalog_set_offer_status', 'publication_publish',
        'publication_enqueue_catalog', 'publication_get_status', 'publication_retry',
        'publication_set_batch_state'
      )
  ) as existing_binding;

  target_bindings := target_bindings || (
    select jsonb_agg(jsonb_build_object(
      'tool_contract_version_id', tool_versions ->> tool_name,
      'allowed_actor_kinds', jsonb_build_array('member'),
      'required_membership_roles', jsonb_build_array('owner', 'admin'),
      'allowed_channels', jsonb_build_array('whatsapp'),
      'authorization_constraints', jsonb_build_object(
        'scope', 'tenant_facebook_page',
        'requires_current_member_identity', true
      )
    ) order by tool_name)
    from jsonb_object_keys(tool_versions) as tool_key(tool_name)
  );

  select * into created_policy
  from api.create_agent_policy_version(
    target_organization_id,
    'b4-005-006:policy:' || encode(extensions.digest(
      convert_to(selected_policy_version.id::text || tool_versions::text, 'UTF8'), 'sha256'
    ), 'hex'),
    'customer_assistant',
    'Asistente comercial para clientes',
    selected_policy_version.prompt_version_id,
    selected_policy_version.max_tool_rounds,
    selected_policy_version.max_provider_attempts,
    selected_policy_version.max_parallel_tools,
    selected_policy_version.turn_timeout_ms,
    selected_policy_version.cache_mode,
    selected_policy_version.max_cost_amount,
    selected_policy_version.cost_currency,
    selected_policy_version.unknown_cost_behavior,
    selected_policy_version.fallback_models,
    target_bindings,
    selected_policy_version.id,
    true,
    selected_actor_user_id,
    'b4-005-006:policy-bootstrap:' || target_organization_id::text,
    null
  );

  return created_policy.agent_policy_version_id;
end;
$$;

create function api.prepare_customer_assistant_tools(target_limit integer default 100)
returns table (organizations_prepared integer, organizations_failed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_record record;
  prepared_count integer := 0;
  failed_count integer := 0;
begin
  if target_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'preparation limit is invalid';
  end if;
  for organization_record in
    select organization_value.id
    from app_private.organizations as organization_value
    where organization_value.status = 'active'
      and exists (
        select 1 from app_private.organization_memberships as membership
        where membership.organization_id = organization_value.id
          and membership.status = 'active'
          and membership.role in ('owner', 'admin')
      )
    order by organization_value.created_at, organization_value.id
    limit target_limit
  loop
    begin
      perform app_private.ensure_customer_assistant_publication_tools(organization_record.id);
      prepared_count := prepared_count + 1;
    exception when others then
      failed_count := failed_count + 1;
      perform app_private.insert_agent_audit_event(
        organization_record.id,
        'customer_assistant.tools_prepare_failed',
        'system', null,
        'b4-005-006:prepare:' || organization_record.id::text,
        null,
        jsonb_build_object('sqlstate', sqlstate)
      );
    end;
  end loop;
  return query select prepared_count, failed_count;
end;
$$;

create function api.execute_whatsapp_tool_call(
  target_organization_id uuid,
  target_run_id uuid,
  target_job_attempt_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_provider text,
  target_provider_request_id text,
  target_provider_tool_call_id text,
  target_tool_name text,
  target_tool_round integer,
  target_arguments_safe jsonb,
  target_provider_state jsonb,
  target_response_metadata_safe jsonb
)
returns table (
  tool_execution_id uuid,
  tool_status text,
  tool_result jsonb,
  run_status text,
  job_status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  attempt_record app_private.job_attempts%rowtype;
  job_record app_private.agent_jobs%rowtype;
  run_record app_private.agent_runs%rowtype;
  proposal_record record;
  authorization_record record;
  contract_record record;
  call_message_record record;
  resumed_record record;
  call_content jsonb;
  result_content jsonb;
  execution_key text;
  resolved_result jsonb;
  resolved_status text;
begin
  if target_provider_state is null
    or jsonb_typeof(target_provider_state) not in ('object', 'array')
    or octet_length(target_provider_state::text) > 900000
    or target_response_metadata_safe is null
    or jsonb_typeof(target_response_metadata_safe) <> 'object'
    or target_arguments_safe is null
    or jsonb_typeof(target_arguments_safe) <> 'object' then
    raise exception using errcode = '22023', message = 'tool continuation payload is invalid';
  end if;

  select * into attempt_record
  from app_private.job_attempts as attempt_value
  where attempt_value.organization_id = target_organization_id
    and attempt_value.id = target_job_attempt_id
  for update;
  if not found or attempt_record.run_id <> target_run_id
    or attempt_record.status <> 'running'
    or attempt_record.worker_id is distinct from target_worker_id
    or attempt_record.lease_token is distinct from target_lease_token
    or attempt_record.provider is distinct from target_provider then
    raise exception using errcode = '42501', message = 'tool execution attempt lease is invalid';
  end if;

  select * into job_record
  from app_private.agent_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = attempt_record.job_id
  for update;
  select * into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_run_id
  for update;

  if job_record.status <> 'processing'
    or job_record.worker_id is distinct from target_worker_id
    or job_record.lease_token is distinct from target_lease_token
    or run_record.status <> 'running'
    or target_tool_round <> run_record.tool_round_count + 1 then
    raise exception using errcode = '42501', message = 'tool execution job lease or round is invalid';
  end if;

  execution_key := 'tool:' || encode(extensions.digest(
    convert_to(
      target_organization_id::text || ':' || target_run_id::text || ':' ||
      target_provider_tool_call_id,
      'UTF8'
    ),
    'sha256'
  ), 'hex');

  select * into proposal_record
  from api.propose_tool_execution(
    target_organization_id,
    target_run_id,
    target_job_attempt_id,
    target_tool_name,
    target_provider_tool_call_id,
    execution_key,
    null,
    target_tool_round,
    target_arguments_safe
  );
  select * into authorization_record
  from api.authorize_tool_execution(target_organization_id, proposal_record.tool_execution_id);

  call_content := jsonb_build_object(
    'provider', target_provider,
    'provider_request_id', target_provider_request_id,
    'provider_state', target_provider_state,
    'tool_call', jsonb_build_object(
      'id', target_provider_tool_call_id,
      'name', target_tool_name,
      'arguments', target_arguments_safe
    )
  );
  select * into call_message_record
  from api.append_agent_message(
    target_organization_id,
    target_run_id,
    'tool-call:' || target_provider_tool_call_id,
    'assistant',
    'tool_call',
    'provider',
    null, null, null,
    target_provider_tool_call_id,
    call_content
  );

  if authorization_record.authorization_status = 'allowed' then
    select version_value.handler_key into contract_record
    from app_private.tool_executions as execution_value
    join app_private.tool_contract_versions as version_value
      on version_value.organization_id = execution_value.organization_id
     and version_value.tool_contract_id = execution_value.tool_contract_id
     and version_value.id = execution_value.tool_contract_version_id
    where execution_value.organization_id = target_organization_id
      and execution_value.id = proposal_record.tool_execution_id;

    resolved_result := case contract_record.handler_key
      when 'conversation.context.read.v1' then app_private.conversation_context_for_agent(
        target_organization_id, target_run_id, target_arguments_safe
      )
      when 'catalog.search.read.v1' then app_private.catalog_search_for_agent(
        target_organization_id, target_arguments_safe
      )
      when 'catalog.offer.read.v1' then app_private.catalog_offer_for_agent(
        target_organization_id, target_arguments_safe
      )
      when 'catalog.recent.owner.read.v1' then app_private.catalog_recent_for_owner_agent(
        target_organization_id, target_arguments_safe
      )
      when 'catalog.offer-status.owner.write.v1' then app_private.catalog_set_offer_status_for_owner_agent(
        target_organization_id, target_run_id, execution_key, target_arguments_safe
      )
      when 'publication.publish.owner.enqueue.v1' then app_private.publication_publish_for_owner_agent(
        target_organization_id, target_run_id, execution_key, target_arguments_safe
      )
      when 'publication.catalog.owner.enqueue.v1' then app_private.publication_enqueue_catalog_for_owner_agent(
        target_organization_id, target_run_id, execution_key, target_arguments_safe
      )
      when 'publication.batch.owner.read.v1' then app_private.publication_status_for_owner_agent(
        target_organization_id, target_arguments_safe
      )
      when 'publication.retry.owner.enqueue.v1' then app_private.publication_retry_for_owner_agent(
        target_organization_id, target_run_id, execution_key, target_arguments_safe
      )
      when 'publication.batch-state.owner.write.v1' then app_private.publication_batch_state_for_owner_agent(
        target_organization_id, target_run_id, execution_key, target_arguments_safe
      )
      else jsonb_build_object(
        'ok', false,
        'error', jsonb_build_object('code', 'handler_not_available')
      )
    end;

    perform api.record_tool_execution_result(
      target_organization_id,
      proposal_record.tool_execution_id,
      'succeeded',
      'confirmed_applied',
      resolved_result,
      null,
      null
    );
    resolved_status := 'succeeded';
  else
    resolved_result := jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'tool_not_authorized',
        'reason', authorization_record.authorization_reason
      )
    );
    resolved_status := 'blocked';
  end if;

  result_content := jsonb_build_object(
    'provider_tool_call_id', target_provider_tool_call_id,
    'tool_name', target_tool_name,
    'status', resolved_status,
    'result', resolved_result
  );
  perform api.append_agent_message(
    target_organization_id,
    target_run_id,
    'tool-result:' || target_provider_tool_call_id,
    'tool',
    'tool_result',
    'trusted_tool',
    null, null, null,
    'result:' || target_provider_tool_call_id,
    result_content
  );
  perform api.record_agent_attempt_result(
    target_organization_id,
    target_job_attempt_id,
    target_worker_id,
    target_lease_token,
    'tool_calls',
    'execute_tools',
    target_provider_request_id,
    target_response_metadata_safe,
    'agent-message://' || call_message_record.agent_message_id::text,
    extensions.digest(call_content::text, 'sha256'),
    null
  );
  select * into resumed_record
  from api.resume_agent_run_after_tools(target_organization_id, job_record.id);

  tool_execution_id := proposal_record.tool_execution_id;
  tool_status := resolved_status;
  tool_result := resolved_result;
  run_status := resumed_record.run_status;
  job_status := resumed_record.job_status;
  was_replayed := proposal_record.was_replayed;
  return next;
end;
$$;

revoke all on function app_private.facebook_dispatch_policy_for_agent(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.catalog_recent_for_owner_agent(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.catalog_set_offer_status_for_owner_agent(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.publication_publish_for_owner_agent(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.publication_enqueue_catalog_for_owner_agent(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.publication_status_for_owner_agent(uuid, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.publication_retry_for_owner_agent(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.publication_batch_state_for_owner_agent(uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.ensure_customer_assistant_publication_tools(uuid)
  from public, anon, authenticated, service_role;
revoke all on function api.prepare_customer_assistant_tools(integer)
  from public, anon, authenticated, service_role;
revoke all on function api.execute_whatsapp_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) from public, anon, authenticated, service_role;

grant execute on function api.prepare_customer_assistant_tools(integer) to service_role;
grant execute on function api.execute_whatsapp_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) to service_role;

comment on function app_private.ensure_customer_assistant_publication_tools(uuid) is
  'Versions owner-only native publication tools while preserving every existing customer read binding.';
comment on function api.prepare_customer_assistant_tools(integer) is
  'Prepares read tools plus owner-only publication tools for active organizations before claims.';
comment on function api.execute_whatsapp_tool_call(
  uuid, uuid, uuid, text, uuid, text, text, text, text, integer, jsonb, jsonb, jsonb
) is 'Atomically persists, reauthorizes, executes and resumes one native WhatsApp tool call.';

notify pgrst, 'reload schema';

commit;
