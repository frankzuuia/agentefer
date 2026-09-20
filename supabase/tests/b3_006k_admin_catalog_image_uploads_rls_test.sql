begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(6);

-- The RLS patch must enable AND force row level security on the table.
select extensions.ok(
  (
    select relrowsecurity
    from pg_catalog.pg_class
    where oid = 'app_private.admin_catalog_image_uploads'::regclass
  ),
  'admin_catalog_image_uploads has row level security enabled'
);
select extensions.ok(
  (
    select relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'app_private.admin_catalog_image_uploads'::regclass
  ),
  'admin_catalog_image_uploads has row level security forced even for table owners'
);

-- Direct table privileges remain revoked: the table is reachable only through
-- the security definer RPCs.
select extensions.ok(
  not has_table_privilege('service_role', 'app_private.admin_catalog_image_uploads', 'SELECT, INSERT, UPDATE, DELETE'),
  'service_role has no direct privileges on the admin upload queue'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'app_private.admin_catalog_image_uploads', 'SELECT, INSERT, UPDATE, DELETE'),
  'authenticated callers have no direct privileges on the admin upload queue'
);
select extensions.ok(
  not has_table_privilege('anon', 'app_private.admin_catalog_image_uploads', 'SELECT, INSERT, UPDATE, DELETE'),
  'anonymous callers have no direct privileges on the admin upload queue'
);

-- The table comment must mention the new defense-in-depth posture.
select extensions.ok(
  (
    select obj_description(c.oid, 'pg_class') like '%RLS enforced%'
    from pg_catalog.pg_class c
    where c.oid = 'app_private.admin_catalog_image_uploads'::regclass
  ),
  'admin_catalog_image_uploads comment documents the RLS posture'
);

select * from extensions.finish();
rollback;
