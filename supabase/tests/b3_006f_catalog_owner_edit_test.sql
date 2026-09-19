begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(24);

select extensions.has_function(
  'api',
  'admin_edit_catalog_offer',
  array['uuid', 'uuid', 'uuid', 'text', 'jsonb', 'text'],
  'owner catalog edit entry point exists'
);
select extensions.has_function(
  'api',
  'admin_publish_catalog_offer',
  array['uuid', 'uuid', 'uuid', 'uuid', 'text', 'boolean', 'uuid', 'text'],
  'owner Facebook publication entry point exists'
);
select extensions.has_function(
  'api',
  'claim_catalog_storefront_job',
  array['text', 'integer', 'integer'],
  'storefront conversion claim exists'
);
select extensions.has_function(
  'api',
  'complete_catalog_storefront_job',
  array['uuid', 'text', 'uuid'],
  'storefront conversion completion exists'
);
select extensions.has_function(
  'api',
  'fail_catalog_storefront_job',
  array['uuid', 'text', 'uuid', 'text', 'boolean', 'integer', 'integer'],
  'storefront conversion failure exists'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot edit the catalog'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)',
    'EXECUTE'
  ),
  'browser sessions cannot bypass the authenticated admin gateway'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)',
    'EXECUTE'
  ),
  'trusted API gateway can execute catalog edits'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)',
    'EXECUTE'
  ),
  'browser sessions cannot publish directly'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)',
    'EXECUTE'
  ),
  'trusted API gateway can request publication'
);

select extensions.has_table(
  'app_private',
  'catalog_storefront_jobs',
  'durable storefront jobs table exists'
);
select extensions.ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'app_private.catalog_storefront_jobs'::regclass
  ),
  'storefront jobs enforce RLS even for table owners'
);
select extensions.ok(
  not has_table_privilege('service_role', 'app_private.catalog_storefront_jobs', 'SELECT')
  and not has_table_privilege('authenticated', 'app_private.catalog_storefront_jobs', 'SELECT')
  and not has_table_privilege('anon', 'app_private.catalog_storefront_jobs', 'SELECT'),
  'storefront queue is reachable only through scoped RPCs'
);
select extensions.has_trigger(
  'app_private',
  'product_media',
  'product_media_queue_storefront',
  'approved product media enqueue immutable public renditions'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_catalog_storefront_job(text,integer,integer)',
    'EXECUTE'
  ),
  'worker can claim storefront jobs'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_catalog_storefront_job(text,integer,integer)',
    'EXECUTE'
  ),
  'owners cannot claim worker jobs from the browser'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.complete_catalog_storefront_job(uuid,text,uuid)',
    'EXECUTE'
  ),
  'worker can complete storefront jobs'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.fail_catalog_storefront_job(uuid,text,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'worker can report storefront failures'
);

select extensions.ok(
  pg_get_functiondef(
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)'::regprocedure
  ) like '%array[''owner'']::text[]%',
  'database edit command requires the owner role'
);
select extensions.ok(
  pg_get_functiondef(
    'api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)'::regprocedure
  ) like '%array[''owner'']::text[]%',
  'database publication command requires the owner role'
);
select extensions.ok(
  pg_get_functiondef(
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)'::regprocedure
  ) like '%target_operation not in (''set_status'',''edit_text'',''set_price'',''set_primary_photo'',''remove_photo'',''add_photo'')%',
  'catalog edits use an explicit operation allowlist'
);
select extensions.ok(
  pg_get_functiondef(
    'api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)'::regprocedure
  ) like '%offer.status <> ''active''%',
  'Facebook publication rejects non-active catalog offers'
);
select extensions.ok(
  pg_get_functiondef(
    'api.admin_publish_catalog_offer(uuid,uuid,uuid,uuid,text,boolean,uuid,text)'::regprocedure
  ) like '%rendition_kind = ''storefront_webp''%',
  'Facebook publication requires a public storefront rendition'
);
select extensions.ok(
  pg_get_functiondef(
    'api.admin_edit_catalog_offer(uuid,uuid,uuid,text,jsonb,text)'::regprocedure
  ) not like '%enqueue_admin_catalog_publication%',
  'activating a catalog offer does not implicitly publish to Facebook'
);

select * from extensions.finish();
rollback;
