export const b4DatabaseMutants = [
  {
    name: "remove forced RLS from Meta applications",
    sql: "alter table app_private.meta_applications no force row level security;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "remove Meta application tenant policy",
    sql: "drop policy meta_applications_admin_select on app_private.meta_applications;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "expose Vault reference through the safe credential view",
    sql: `create or replace view api.meta_credential_versions
      with (security_invoker = true, security_barrier = true)
      as select
        id, organization_id, meta_application_id, webhook_endpoint_id,
        channel_connection_id, credential_kind, version_number, status,
        activated_at, retire_after, revoked_at, created_by_user_id, created_at,
        vault_secret_id
      from app_private.meta_credential_versions;`,
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "allow service role to read tenant Vault references",
    sql: "grant select (vault_secret_id) on app_private.meta_credential_versions to service_role;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "allow service role to bypass audited credential insertion",
    sql: "grant insert on app_private.meta_credential_versions to service_role;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "remove append-only credential deletion guard",
    sql: "drop trigger meta_credential_versions_reject_delete on app_private.meta_credential_versions;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "allow active channel without Meta application",
    sql: "alter table app_private.channel_connections drop constraint channel_connections_meta_application_required;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "remove channel to tenant Meta application foreign key",
    sql: "alter table app_private.channel_connections drop constraint channel_connections_meta_application_fk;",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "expose Vault in the PostgREST schema list",
    sql: "alter role authenticator set pgrst.db_schemas = 'api, graphql_public, vault';",
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "disable valid Meta challenge resolution",
    sql: `create or replace function api.verify_meta_webhook_challenge(
        target_endpoint_key uuid,
        target_verify_token text
      )
      returns table (
        organization_id uuid, meta_application_id uuid, webhook_endpoint_id uuid,
        external_app_id text, credential_version_id uuid
      ) language sql security definer set search_path = ''
      as $$ select null::uuid, null::uuid, null::uuid, null::text, null::uuid where false $$;`,
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
  {
    name: "disable valid Meta raw-body HMAC resolution",
    sql: `create or replace function api.verify_meta_webhook_signature(
        target_endpoint_key uuid,
        target_raw_body bytea,
        target_signature bytea
      )
      returns table (
        organization_id uuid, meta_application_id uuid, webhook_endpoint_id uuid,
        external_app_id text, credential_version_id uuid
      ) language sql security definer set search_path = ''
      as $$ select null::uuid, null::uuid, null::uuid, null::text, null::uuid where false $$;`,
    test: "supabase/tests/b4_001_meta_vault_credentials_test.sql",
  },
];
