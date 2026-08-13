begin;

-- B2-009 corrective hardening: preserve the table-by-table backend contract
-- established by B2-001..B2-008. Business mutations continue through audited
-- API routines; service_role only receives direct DML where the domain allows it.

do $$
begin
  if (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) <> 89 then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role correction requires 89 forced-RLS private tables';
  end if;
end;
$$;

revoke all on all tables in schema app_private from service_role;
revoke all on all sequences in schema app_private from service_role;
revoke all on all sequences in schema api from service_role;

grant select on all tables in schema app_private to service_role;

grant insert on
  app_private.organizations,
  app_private.user_profiles,
  app_private.organization_memberships,
  app_private.business_profiles,
  app_private.channel_connections,
  app_private.contacts,
  app_private.channel_identities,
  app_private.inbound_events,
  app_private.conversations,
  app_private.conversation_participants,
  app_private.messages,
  app_private.outbox_events,
  app_private.message_delivery_events,
  app_private.consents,
  app_private.catalog_categories,
  app_private.catalog_units,
  app_private.catalog_attribute_definitions,
  app_private.catalog_attribute_options,
  app_private.media_assets,
  app_private.products,
  app_private.product_variants,
  app_private.variant_skus,
  app_private.product_attribute_values,
  app_private.variant_attribute_values,
  app_private.catalog_ingestion_drafts,
  app_private.catalog_candidate_matches,
  app_private.catalog_attribute_allowed_units,
  app_private.catalog_evidence,
  app_private.catalog_evidence_media,
  app_private.catalog_resolution_decisions,
  app_private.price_books,
  app_private.price_tiers,
  app_private.inventory_items,
  app_private.inventory_locations,
  app_private.inventory_compositions,
  app_private.inventory_composition_components
to service_role;

grant update on
  app_private.organizations,
  app_private.user_profiles,
  app_private.organization_memberships,
  app_private.business_profiles,
  app_private.channel_connections,
  app_private.contacts,
  app_private.channel_identities,
  app_private.inbound_events,
  app_private.conversations,
  app_private.conversation_participants,
  app_private.messages,
  app_private.outbox_events,
  app_private.catalog_categories,
  app_private.catalog_units,
  app_private.catalog_attribute_definitions,
  app_private.catalog_attribute_options,
  app_private.media_assets,
  app_private.products,
  app_private.product_variants,
  app_private.variant_skus,
  app_private.product_attribute_values,
  app_private.variant_attribute_values,
  app_private.catalog_ingestion_drafts,
  app_private.catalog_candidate_matches,
  app_private.price_books,
  app_private.price_tiers,
  app_private.inventory_items,
  app_private.inventory_locations,
  app_private.inventory_compositions
to service_role;

grant delete on
  app_private.organizations,
  app_private.user_profiles,
  app_private.organization_memberships,
  app_private.business_profiles
to service_role;

do $$
declare
  violations text;
begin
  if (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and has_table_privilege('service_role', relation.oid, 'SELECT')
  ) <> 89 then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role correction expected SELECT on 89 private tables';
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('service_role', relation.oid, 'INSERT') is distinct from (
      relation.relname = any(array[
        'organizations', 'user_profiles', 'organization_memberships', 'business_profiles',
        'channel_connections', 'contacts', 'channel_identities', 'inbound_events',
        'conversations', 'conversation_participants', 'messages', 'outbox_events',
        'message_delivery_events', 'consents', 'catalog_categories', 'catalog_units',
        'catalog_attribute_definitions', 'catalog_attribute_options', 'media_assets',
        'products', 'product_variants', 'variant_skus', 'product_attribute_values',
        'variant_attribute_values', 'catalog_ingestion_drafts', 'catalog_candidate_matches',
        'catalog_attribute_allowed_units', 'catalog_evidence', 'catalog_evidence_media',
        'catalog_resolution_decisions', 'price_books', 'price_tiers', 'inventory_items',
        'inventory_locations', 'inventory_compositions', 'inventory_composition_components'
      ]::text[])
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role INSERT matrix diverged',
      detail = violations;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('service_role', relation.oid, 'UPDATE') is distinct from (
      relation.relname = any(array[
        'organizations', 'user_profiles', 'organization_memberships', 'business_profiles',
        'channel_connections', 'contacts', 'channel_identities', 'inbound_events',
        'conversations', 'conversation_participants', 'messages', 'outbox_events',
        'catalog_categories', 'catalog_units', 'catalog_attribute_definitions',
        'catalog_attribute_options', 'media_assets', 'products', 'product_variants',
        'variant_skus', 'product_attribute_values', 'variant_attribute_values',
        'catalog_ingestion_drafts', 'catalog_candidate_matches', 'price_books', 'price_tiers',
        'inventory_items', 'inventory_locations', 'inventory_compositions'
      ]::text[])
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role UPDATE matrix diverged',
      detail = violations;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and has_table_privilege('service_role', relation.oid, 'DELETE') is distinct from (
      relation.relname = any(array[
        'organizations', 'user_profiles', 'organization_memberships', 'business_profiles'
      ]::text[])
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role DELETE matrix diverged',
      detail = violations;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and (
      has_table_privilege('service_role', relation.oid, 'TRUNCATE')
      or has_table_privilege('service_role', relation.oid, 'REFERENCES')
      or has_table_privilege('service_role', relation.oid, 'TRIGGER')
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role received unsafe table privileges',
      detail = violations;
  end if;

  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by namespace.nspname, relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('app_private', 'api')
    and relation.relkind = 'S'
    and (
      has_sequence_privilege('service_role', relation.oid, 'USAGE')
      or has_sequence_privilege('service_role', relation.oid, 'SELECT')
      or has_sequence_privilege('service_role', relation.oid, 'UPDATE')
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 service-role received unneeded sequence privileges',
      detail = violations;
  end if;
end;
$$;

comment on schema app_private is
  'AgenteFer internal tenant data; browser grants are view-derived and service grants preserve domain least privilege';

commit;
