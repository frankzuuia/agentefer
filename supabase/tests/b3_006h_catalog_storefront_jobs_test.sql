begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(14);

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

select extensions.has_function(
  'api',
  'claim_catalog_storefront_job',
  array['text', 'integer', 'integer'],
  'storefront claim function exists'
);
select extensions.has_function(
  'api',
  'complete_catalog_storefront_job',
  array['uuid', 'text', 'uuid'],
  'storefront completion function exists'
);
select extensions.has_function(
  'api',
  'fail_catalog_storefront_job',
  array['uuid', 'text', 'uuid', 'text', 'boolean', 'integer', 'integer'],
  'storefront failure function exists'
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
  not has_function_privilege(
    'anon',
    'api.claim_catalog_storefront_job(text,integer,integer)',
    'EXECUTE'
  ),
  'anonymous callers cannot claim storefront jobs'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.claim_catalog_storefront_job(text,integer,integer)',
    'EXECUTE'
  ),
  'browser sessions cannot claim storefront jobs'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.complete_catalog_storefront_job(uuid,text,uuid)',
    'EXECUTE'
  ),
  'browser sessions cannot complete storefront jobs'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.fail_catalog_storefront_job(uuid,text,uuid,text,boolean,integer,integer)',
    'EXECUTE'
  ),
  'browser sessions cannot fail storefront jobs'
);

select * from extensions.finish();
rollback;
