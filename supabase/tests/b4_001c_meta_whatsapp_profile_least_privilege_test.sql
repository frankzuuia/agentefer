begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(3);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.column_privileges
    where table_schema = 'app_private'
      and table_name = 'meta_whatsapp_connection_profiles'
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ),
  12,
  'authenticated can read only the twelve WhatsApp profile columns required by the API view'
);
select extensions.ok(
  not has_column_privilege(
    'authenticated',
    'app_private.meta_whatsapp_connection_profiles',
    'created_at',
    'SELECT'
  ),
  'authenticated cannot read the internal WhatsApp profile creation timestamp'
);
select extensions.ok(
  not has_column_privilege(
    'authenticated',
    'app_private.meta_whatsapp_connection_profiles',
    'updated_at',
    'SELECT'
  ),
  'authenticated cannot read the internal WhatsApp profile update timestamp'
);

select * from extensions.finish();

rollback;
