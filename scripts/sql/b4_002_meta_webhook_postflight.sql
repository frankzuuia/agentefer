select
  (
    select count(*)
    from app_private.organizations
    where name like 'B4 Webhook %'
  ) as qa_organizations,
  (
    select count(*)
    from app_private.meta_webhook_deliveries
    where first_request_id like 'b402-%'
  ) as qa_deliveries,
  (
    select count(*)
    from vault.secrets
    where name like 'agentefer/%b4-webhook%'
  ) as qa_vault_secrets,
  (
    select count(*)
    from supabase_migrations.schema_migrations
  ) as applied_migrations,
  (
    select count(*)
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relkind in ('r', 'p')
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ) as forced_rls_tables;
