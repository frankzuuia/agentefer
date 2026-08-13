begin;

-- B2-009 closes the complete application privilege surface after B2-001..B2-008.
-- Intent remains cognitive in the LLM. PostgreSQL only enforces identity, tenant,
-- role, object privileges, row visibility and deterministic domain invariants.

do $$
declare
  violations text;
begin
  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and (not relation.relrowsecurity or not relation.relforcerowsecurity);

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 preflight rejected private tables without forced RLS',
      detail = violations;
  end if;

  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'api'
    and relation.relkind = 'v'
    and not (
      coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 preflight rejected unsafe API views',
      detail = violations;
  end if;

  select string_agg(format('%I.%I:%I', policy.schemaname, policy.tablename, policy.policyname), ', ' order by policy.tablename, policy.policyname)
  into violations
  from pg_catalog.pg_policies as policy
  where policy.schemaname = 'app_private'
    and (
      policy.cmd <> 'SELECT'
      or policy.roles <> array['authenticated']::name[]
      or coalesce(policy.qual, '') not like '%SELECT auth.uid()%'
      or coalesce(policy.qual, '') ~* 'auth\.jwt|user_metadata|raw_user_meta_data'
      or coalesce(policy.with_check, '') ~* 'auth\.jwt|user_metadata|raw_user_meta_data'
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 preflight rejected an unsafe RLS policy',
      detail = violations;
  end if;

  if (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
  ) <> 89 then
    raise exception using errcode = '55000', message = 'B2-009 expected exactly 89 private tables';
  end if;

  if (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relkind = 'v'
  ) <> 89 then
    raise exception using errcode = '55000', message = 'B2-009 expected exactly 89 API views';
  end if;

  if (select count(*) from pg_catalog.pg_policies where schemaname = 'app_private') <> 87 then
    raise exception using errcode = '55000', message = 'B2-009 expected exactly 87 tenant read policies';
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and not exists (
      select 1
      from pg_catalog.pg_policy as policy
      where policy.polrelid = relation.oid
    );

  if violations is distinct from 'inbound_events, outbox_events' then
    raise exception using
      errcode = '55000',
      message = 'B2-009 backend-only default-deny table set changed',
      detail = coalesce(violations, '<none>');
  end if;

  select string_agg(
    format('%I.%I(%s)', namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid)),
    ', ' order by namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid)
  )
  into violations
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('app_private', 'api')
    and procedure.prokind = 'f'
    and procedure.prosecdef
    and not ('search_path=""' = any(coalesce(procedure.proconfig, array[]::text[])));

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 preflight rejected SECURITY DEFINER routines without an empty search_path',
      detail = violations;
  end if;
end;
$$;

-- Preserve the opt-in Data API model even if platform defaults differ by project age.
-- Function EXECUTE is a PostgreSQL global PUBLIC default; a schema-local revoke
-- cannot subtract it, so future postgres-owned routines must start closed globally.
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on functions from public, anon, authenticated, service_role;

revoke create on schema public from public;
revoke all on schema app_private from public, anon, authenticated, service_role;
revoke all on schema api from public, anon, authenticated, service_role;
revoke all on all tables in schema app_private from public, anon, authenticated, service_role;
revoke all on all tables in schema api from public, anon, authenticated, service_role;
revoke all on all sequences in schema app_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema api from public, anon, authenticated, service_role;
revoke all on all functions in schema app_private from public, anon, authenticated, service_role;
revoke all on all functions in schema api from public, anon, authenticated, service_role;

grant usage on schema app_private, api to authenticated, service_role;

-- A security-invoker view needs privileges on every base column it references.
-- Derive the smallest complete set from the committed API views after the global revoke.
do $$
declare
  dependency record;
begin
  for dependency in
    select
      usage.table_schema,
      usage.table_name,
      string_agg(quote_ident(usage.column_name), ', ' order by usage.column_name) as columns
    from information_schema.view_column_usage as usage
    where usage.view_schema = 'api'
      and usage.table_schema = 'app_private'
    group by usage.table_schema, usage.table_name
    order by usage.table_schema, usage.table_name
  loop
    execute format(
      'grant select (%s) on table %I.%I to authenticated',
      dependency.columns,
      dependency.table_schema,
      dependency.table_name
    );
  end loop;
end;
$$;

grant select on all tables in schema api to authenticated, service_role;
grant select, insert, update, delete on all tables in schema app_private to service_role;
grant usage, select, update on all sequences in schema app_private to service_role;
grant execute on all functions in schema api to service_role;

grant execute on function api.resolve_price_quote(
  uuid, uuid, uuid, numeric, timestamp with time zone
) to authenticated;
grant execute on function api.resolve_inventory_requirements(
  uuid, uuid, numeric
) to authenticated;

do $$
declare
  violations text;
begin
  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by namespace.nspname, relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('app_private', 'api')
    and relation.relkind in ('r', 'p', 'v', 'm')
    and (
      has_table_privilege('anon', relation.oid, 'SELECT')
      or has_table_privilege('anon', relation.oid, 'INSERT')
      or has_table_privilege('anon', relation.oid, 'UPDATE')
      or has_table_privilege('anon', relation.oid, 'DELETE')
      or has_table_privilege('anon', relation.oid, 'TRUNCATE')
      or has_table_privilege('anon', relation.oid, 'REFERENCES')
      or has_table_privilege('anon', relation.oid, 'TRIGGER')
    );

  if violations is not null
    or has_schema_privilege('anon', 'app_private', 'USAGE')
    or has_schema_privilege('anon', 'api', 'USAGE') then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected anonymous application access',
      detail = coalesce(violations, '<schema usage>');
  end if;

  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ' order by namespace.nspname, relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname in ('app_private', 'api')
    and relation.relkind = 'S'
    and (
      has_sequence_privilege('anon', relation.oid, 'USAGE')
      or has_sequence_privilege('anon', relation.oid, 'SELECT')
      or has_sequence_privilege('anon', relation.oid, 'UPDATE')
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected anonymous sequence access',
      detail = violations;
  end if;

  select string_agg(relation.relname, ', ' order by relation.relname)
  into violations
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'app_private'
    and relation.relkind in ('r', 'p')
    and (
      has_table_privilege('authenticated', relation.oid, 'INSERT')
      or has_table_privilege('authenticated', relation.oid, 'UPDATE')
      or has_table_privilege('authenticated', relation.oid, 'DELETE')
      or has_table_privilege('authenticated', relation.oid, 'TRUNCATE')
      or has_table_privilege('authenticated', relation.oid, 'REFERENCES')
      or has_table_privilege('authenticated', relation.oid, 'TRIGGER')
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected direct authenticated writes',
      detail = violations;
  end if;

  select string_agg(
    format('%I.%I.%I', usage.table_schema, usage.table_name, usage.column_name),
    ', ' order by usage.table_name, usage.column_name
  )
  into violations
  from information_schema.view_column_usage as usage
  where usage.view_schema = 'api'
    and usage.table_schema = 'app_private'
    and not has_column_privilege(
      'authenticated',
      format('%I.%I', usage.table_schema, usage.table_name),
      usage.column_name,
      'SELECT'
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight found an unusable security-invoker view dependency',
      detail = violations;
  end if;

  select string_agg(
    format('%I.%I.%I', grant_row.table_schema, grant_row.table_name, grant_row.column_name),
    ', ' order by grant_row.table_name, grant_row.column_name
  )
  into violations
  from information_schema.column_privileges as grant_row
  where grant_row.table_schema = 'app_private'
    and grant_row.grantee = 'authenticated'
    and grant_row.privilege_type = 'SELECT'
    and not exists (
      select 1
      from information_schema.view_column_usage as usage
      where usage.view_schema = 'api'
        and usage.table_schema = grant_row.table_schema
        and usage.table_name = grant_row.table_name
        and usage.column_name = grant_row.column_name
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected authenticated columns outside the API projection',
      detail = violations;
  end if;

  select string_agg(
    format('%I.%I(%s)', namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid)),
    ', ' order by namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid)
  )
  into violations
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('app_private', 'api')
    and procedure.prokind = 'f'
    and (
      has_function_privilege('anon', procedure.oid, 'EXECUTE')
      or exists (
        select 1
        from aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as acl
        where acl.grantee = 0
          and acl.privilege_type = 'EXECUTE'
      )
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected PUBLIC or anon function execution',
      detail = violations;
  end if;

  select string_agg(
    format('%I.%I(%s)', namespace.nspname, procedure.proname, pg_get_function_identity_arguments(procedure.oid)),
    ', ' order by procedure.proname, pg_get_function_identity_arguments(procedure.oid)
  )
  into violations
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname in ('app_private', 'api')
    and procedure.prokind = 'f'
    and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
    and not (
      namespace.nspname = 'api'
      and procedure.proname in ('resolve_price_quote', 'resolve_inventory_requirements')
    );

  if violations is not null then
    raise exception using
      errcode = '55000',
      message = 'B2-009 postflight detected an unexpected authenticated routine',
      detail = violations;
  end if;

  if (
    select count(*)
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.prokind = 'f'
      and has_function_privilege('authenticated', procedure.oid, 'EXECUTE')
  ) <> 2 then
    raise exception using errcode = '55000', message = 'B2-009 expected exactly two authenticated read resolvers';
  end if;
end;
$$;

comment on schema app_private is
  'AgenteFer internal tenant data; not exposed by Data API and closed by B2-009 least-privilege grants';
comment on schema api is
  'AgenteFer explicit Data API surface; security-invoker views and signature-scoped RPC execution only';

commit;
