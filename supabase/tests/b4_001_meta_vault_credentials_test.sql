begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(51);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
set search_path = extensions, pg_catalog
as $$
declare
  actual_sqlstate text;
begin
  execute statement;
  return extensions.fail(description || ' (the statement did not fail)');
exception
  when others then
    get stacked diagnostics actual_sqlstate = returned_sqlstate;
    return extensions.is(actual_sqlstate, expected_sqlstate, description);
end;
$$;

grant execute on function pg_temp.throws_sqlstate(text, text, text)
  to anon, authenticated, service_role;

select extensions.has_table(
  'app_private', 'meta_applications', 'tenant-owned Meta application table exists'
);
select extensions.has_table(
  'app_private', 'meta_webhook_endpoints', 'opaque Meta webhook endpoint table exists'
);
select extensions.has_table(
  'app_private', 'meta_credential_versions', 'versioned Vault credential metadata table exists'
);
select extensions.has_view(
  'api', 'meta_applications', 'safe Meta application API view exists'
);
select extensions.has_view(
  'api', 'meta_webhook_endpoints', 'safe Meta webhook API view exists'
);
select extensions.has_view(
  'api', 'meta_credential_versions', 'safe credential lifecycle API view exists'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'meta_applications', 'meta_webhook_endpoints', 'meta_credential_versions'
      )
      and relation.relrowsecurity
  ),
  3,
  'RLS is enabled on all Meta credential metadata tables'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'meta_applications', 'meta_webhook_endpoints', 'meta_credential_versions'
      )
      and relation.relforcerowsecurity
  ),
  3,
  'RLS is forced on all Meta credential metadata tables'
);
select extensions.is(
  (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'meta_applications', 'meta_webhook_endpoints', 'meta_credential_versions'
      )
  ),
  array[
    'meta_applications_admin_select',
    'meta_credential_versions_admin_select',
    'meta_webhook_endpoints_admin_select'
  ]::text[],
  'exact tenant-admin read policies protect Meta credential metadata'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'meta_credential_versions'
      and column_name = 'vault_secret_id'
  ),
  0,
  'Vault UUIDs are absent from the API projection'
);
select extensions.ok(
  not has_table_privilege('anon', 'vault.decrypted_secrets', 'SELECT'),
  'anonymous callers cannot decrypt Vault secrets'
);
select extensions.ok(
  not has_table_privilege('authenticated', 'vault.decrypted_secrets', 'SELECT'),
  'authenticated callers cannot decrypt Vault secrets'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'api'
      and column_name in ('vault_secret_id', 'decrypted_secret', 'secret')
  ),
  0,
  'the complete Data API projection contains no Vault or decrypted secret column'
);
select extensions.is(
  (
    select setting_value
    from pg_catalog.pg_db_role_setting as role_setting
    cross join lateral unnest(role_setting.setconfig) as setting_value
    where role_setting.setrole = 'authenticator'::regrole
      and setting_value like 'pgrst.db_schemas=%'
  ),
  'pgrst.db_schemas=api, graphql_public',
  'PostgREST exposes only the reviewed api and graphql schemas'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.register_meta_application(uuid,text,text,text,text,text,uuid,text,text)',
    'EXECUTE'
  ),
  'service_role can call the audited application registrar'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.register_meta_application(uuid,text,text,text,text,text,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated callers cannot inject Meta credentials'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4000000-0000-4000-8000-000000000001'),
  ('b4000000-0000-4000-8000-000000000002');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    'b4100000-0000-4000-8000-000000000001',
    'B4 Vault Alpha',
    'b4000000-0000-4000-8000-000000000001'
  ),
  (
    'b4200000-0000-4000-8000-000000000001',
    'B4 Vault Beta',
    'b4000000-0000-4000-8000-000000000002'
  );

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  (
    'b4100000-0000-4000-8000-000000000002',
    'b4100000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-000000000001',
    'owner', 'active', statement_timestamp()
  ),
  (
    'b4200000-0000-4000-8000-000000000002',
    'b4200000-0000-4000-8000-000000000001',
    'b4000000-0000-4000-8000-000000000002',
    'owner', 'active', statement_timestamp()
  );

set constraints all immediate;
set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4100000-0000-4000-8000-000000000001',
      'b4-alpha-meta-app',
      'B4 Alpha Meta App',
      'v26.0',
      'alpha-app-secret-0123456789abcdef',
      'alpha-verify-token-0123456789',
      'b4000000-0000-4000-8000-000000000001',
      'b4-register-alpha',
      'b4-trace-alpha'
    )
  ),
  1,
  'Alpha application and initial Vault credentials register atomically'
);
select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4200000-0000-4000-8000-000000000001',
      'b4-beta-meta-app',
      'B4 Beta Meta App',
      'v26.0',
      'beta-app-secret-0123456789abcdef',
      'beta-verify-token-0123456789',
      'b4000000-0000-4000-8000-000000000002',
      'b4-register-beta',
      'b4-trace-beta'
    )
  ),
  1,
  'Beta application receives an independent endpoint and Vault credentials'
);
select extensions.is(
  (select count(*)::integer from api.meta_applications),
  2,
  'both tenant applications exist without sharing a row'
);
select extensions.is(
  (select count(distinct endpoint_key)::integer from api.meta_webhook_endpoints),
  2,
  'each Meta application receives a different unguessable endpoint key'
);

reset role;
set local role postgres;

select extensions.is(
  (
    select count(*)::integer
    from vault.secrets as secret_value
    where secret_value.name like 'agentefer/meta/b4%'
      and secret_value.secret not in (
        'alpha-app-secret-0123456789abcdef',
        'alpha-verify-token-0123456789',
        'beta-app-secret-0123456789abcdef',
        'beta-verify-token-0123456789'
      )
  ),
  4,
  'Vault persists the four initial credentials only as ciphertext'
);

set local role service_role;
select pg_temp.throws_sqlstate(
  $$select vault_secret_id from app_private.meta_credential_versions limit 1$$,
  '42501',
  'service_role cannot read Vault references from AgenteFer credential metadata'
);
select pg_temp.throws_sqlstate(
  $$insert into app_private.meta_credential_versions (
      organization_id, meta_application_id, credential_kind,
      version_number, vault_secret_id, status
    ) values (
      'b4100000-0000-4000-8000-000000000001',
      (select id from api.meta_applications
       where organization_id = 'b4100000-0000-4000-8000-000000000001'),
      'app_secret', 99, extensions.gen_random_uuid(), 'current'
    )$$,
  '42501',
  'service_role cannot bypass audited credential version creation'
);

select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_challenge(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      'wrong-alpha-verify-token'
    )
  ),
  0,
  'an incorrect verify token cannot pass the Meta challenge'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_challenge(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      'alpha-verify-token-0123456789'
    )
  ),
  1,
  'Alpha challenge matches only its Vault verify token'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_challenge(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4200000-0000-4000-8000-000000000001'
      ),
      'beta-verify-token-0123456789'
    )
  ),
  1,
  'Beta challenge matches its separate Vault verify token'
);

select extensions.lives_ok(
  format(
    'select api.confirm_meta_webhook_verification(%L::uuid, %L::uuid, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4100000-0000-4000-8000-000000000001'
    ),
    (
      select credential_version_id
      from api.verify_meta_webhook_challenge(
        (
          select endpoint_key
          from api.meta_webhook_endpoints
          where organization_id = 'b4100000-0000-4000-8000-000000000001'
        ),
        'alpha-verify-token-0123456789'
      )
    ),
    'b4-confirm-alpha',
    'b4-trace-confirm-alpha'
  ),
  'Alpha endpoint records provider verification evidence'
);
select extensions.lives_ok(
  format(
    'select api.confirm_meta_webhook_verification(%L::uuid, %L::uuid, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4200000-0000-4000-8000-000000000001'
    ),
    (
      select credential_version_id
      from api.verify_meta_webhook_challenge(
        (
          select endpoint_key
          from api.meta_webhook_endpoints
          where organization_id = 'b4200000-0000-4000-8000-000000000001'
        ),
        'beta-verify-token-0123456789'
      )
    ),
    'b4-confirm-beta',
    'b4-trace-confirm-beta'
  ),
  'Beta endpoint verifies without affecting Alpha'
);
select extensions.is(
  (select count(*)::integer from api.meta_webhook_endpoints where status = 'active'),
  2,
  'both verified webhook endpoints become independently active'
);

select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      convert_to('{"object":"whatsapp_business_account","tenant":"alpha"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"object":"whatsapp_business_account","tenant":"alpha"}', 'UTF8'),
        convert_to('alpha-app-secret-0123456789abcdef', 'UTF8'),
        'sha256'
      )
    )
  ),
  1,
  'valid Alpha raw-body HMAC resolves only the Alpha application'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      convert_to('{"object":"whatsapp_business_account","tenant":"altered"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"object":"whatsapp_business_account","tenant":"alpha"}', 'UTF8'),
        convert_to('alpha-app-secret-0123456789abcdef', 'UTF8'),
        'sha256'
      )
    )
  ),
  0,
  'altering one raw-body byte invalidates the signature'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4200000-0000-4000-8000-000000000001'
      ),
      convert_to('{"object":"whatsapp_business_account","tenant":"alpha"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"object":"whatsapp_business_account","tenant":"alpha"}', 'UTF8'),
        convert_to('alpha-app-secret-0123456789abcdef', 'UTF8'),
        'sha256'
      )
    )
  ),
  0,
  'Alpha App Secret cannot authenticate the Beta endpoint'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key
        from api.meta_webhook_endpoints
        where organization_id = 'b4200000-0000-4000-8000-000000000001'
      ),
      convert_to('{"object":"whatsapp_business_account","tenant":"beta"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"object":"whatsapp_business_account","tenant":"beta"}', 'UTF8'),
        convert_to('beta-app-secret-0123456789abcdef', 'UTF8'),
        'sha256'
      )
    )
  ),
  1,
  'Beta raw-body HMAC authenticates with only the Beta App Secret'
);

select extensions.is(
  (
    select count(*)::integer
    from api.rotate_meta_credential(
      'b4100000-0000-4000-8000-000000000001',
      (
        select id from api.meta_applications
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      null,
      null,
      'app_secret',
      'alpha-app-secret-rotated-abcdef012345',
      3600,
      'b4000000-0000-4000-8000-000000000001',
      'b4-rotate-alpha-secret',
      'b4-trace-rotate-alpha'
    )
  ),
  1,
  'App Secret rotation creates one new current version atomically'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      convert_to('{"rotation":"overlap"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"rotation":"overlap"}', 'UTF8'),
        convert_to('alpha-app-secret-0123456789abcdef', 'UTF8'),
        'sha256'
      )
    )
  ),
  1,
  'retiring App Secret remains valid during the configured overlap'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_signature(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      convert_to('{"rotation":"overlap"}', 'UTF8'),
      extensions.hmac(
        convert_to('{"rotation":"overlap"}', 'UTF8'),
        convert_to('alpha-app-secret-rotated-abcdef012345', 'UTF8'),
        'sha256'
      )
    )
  ),
  1,
  'new current App Secret validates immediately after rotation'
);
select extensions.is(
  (
    select count(*)::integer
    from api.meta_credential_versions
    where organization_id = 'b4100000-0000-4000-8000-000000000001'
      and credential_kind = 'app_secret'
      and status in ('current', 'retiring')
  ),
  2,
  'rotation preserves exactly one current and one retiring App Secret'
);

select extensions.is(
  (
    select count(*)::integer
    from api.rotate_meta_credential(
      'b4100000-0000-4000-8000-000000000001',
      (
        select id from api.meta_applications
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      (
        select id from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      null,
      'webhook_verify_token',
      'alpha-verify-token-rotated-012345',
      0,
      'b4000000-0000-4000-8000-000000000001',
      'b4-rotate-alpha-verify',
      'b4-trace-rotate-verify'
    )
  ),
  1,
  'verify-token rotation can revoke the previous value without overlap'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_challenge(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      'alpha-verify-token-0123456789'
    )
  ),
  0,
  'revoked verify token stops authenticating immediately'
);
select extensions.is(
  (
    select count(*)::integer
    from api.verify_meta_webhook_challenge(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4100000-0000-4000-8000-000000000001'
      ),
      'alpha-verify-token-rotated-012345'
    )
  ),
  1,
  'new verify token authenticates without redeploying the API'
);
select extensions.is(
  (
    select count(*)::integer
    from vault.secrets as secret_value
    where secret_value.name like 'agentefer/meta/b4%'
  ),
  6,
  'each rotation appends a distinct encrypted Vault version'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events as event_value
    where event_value.organization_id in (
      'b4100000-0000-4000-8000-000000000001',
      'b4200000-0000-4000-8000-000000000001'
    )
      and (
        event_value.metadata_safe::text like '%alpha-app-secret%'
        or event_value.metadata_safe::text like '%alpha-verify-token%'
        or event_value.metadata_safe::text like '%beta-app-secret%'
        or event_value.metadata_safe::text like '%beta-verify-token%'
      )
  ),
  0,
  'audit events never contain credential values'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'b4000000-0000-4000-8000-000000000001';
select extensions.is(
  (select count(*)::integer from api.meta_applications),
  1,
  'Alpha owner sees only the Alpha Meta application'
);
select extensions.is(
  (
    select count(*)::integer
    from api.meta_applications
    where organization_id = 'b4200000-0000-4000-8000-000000000001'
  ),
  0,
  'RLS prevents Alpha owner from observing Beta metadata'
);
select extensions.is(
  (select count(*)::integer from api.meta_credential_versions),
  4,
  'Alpha owner sees safe lifecycle metadata for only Alpha versions'
);

reset role;
set local role postgres;
select pg_temp.throws_sqlstate(
  $$delete from app_private.meta_credential_versions
    where organization_id = 'b4100000-0000-4000-8000-000000000001'$$,
  '23514',
  'credential history remains append-only even for table owner operations'
);

set local role service_role;
select pg_temp.throws_sqlstate(
  $$delete from app_private.meta_credential_versions
    where organization_id = 'b4100000-0000-4000-8000-000000000001'$$,
  '42501',
  'service_role has no direct destructive credential privilege'
);
select pg_temp.throws_sqlstate(
  $$insert into app_private.channel_connections (
      organization_id, provider, channel, external_app_id, external_account_id,
      external_sender_id, display_name, api_version, credential_reference,
      webhook_secret_reference, status, connected_at, last_verified_at
    ) values (
      'b4100000-0000-4000-8000-000000000001',
      'meta', 'whatsapp', 'b4-alpha-meta-app', 'b4-alpha-waba',
      'b4-alpha-phone', 'Missing Meta App Link', 'v26.0',
      'vault-ref://token', 'vault-ref://secret', 'active',
      statement_timestamp(), statement_timestamp()
    )$$,
  '23514',
  'an active channel cannot exist without its tenant Meta application link'
);
select pg_temp.throws_sqlstate(
  format(
    'insert into app_private.channel_connections (
       organization_id, provider, channel, meta_application_id,
       external_app_id, external_account_id, external_sender_id,
       display_name, api_version, credential_reference,
       webhook_secret_reference, status, connected_at, last_verified_at
     ) values (
       %L::uuid, %L, %L, %L::uuid, %L, %L, %L, %L, %L, %L, %L, %L,
       statement_timestamp(), statement_timestamp()
     )',
    'b4100000-0000-4000-8000-000000000001',
    'meta',
    'whatsapp',
    (
      select id from api.meta_applications
      where organization_id = 'b4200000-0000-4000-8000-000000000001'
    ),
    'b4-alpha-meta-app',
    'b4-alpha-waba-cross',
    'b4-alpha-phone-cross',
    'Cross Tenant Meta Link',
    'v26.0',
    'vault-ref://token',
    'vault-ref://secret',
    'active'
  ),
  '23503',
  'a channel cannot link a Meta application owned by another organization'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = 'b4100000-0000-4000-8000-000000000001'
      and event_type in (
        'meta.credentials.application_registered',
        'meta.webhook.verified',
        'meta.credentials.rotated'
      )
  ),
  4,
  'Alpha credential registration, verification and rotations are fully audited'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = 'b4200000-0000-4000-8000-000000000001'
      and event_type in (
        'meta.credentials.application_registered',
        'meta.webhook.verified',
        'meta.credentials.rotated'
      )
  ),
  2,
  'Beta maintains an independent credential audit trail'
);

select * from extensions.finish();

rollback;
