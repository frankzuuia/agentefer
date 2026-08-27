begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(36);

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
  'app_private',
  'meta_whatsapp_connection_profiles',
  'non-secret WhatsApp connection profile table exists'
);
select extensions.has_view(
  'api',
  'meta_whatsapp_connections',
  'safe WhatsApp connection API view exists'
);
select extensions.ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_whatsapp_connection_profiles'
  ),
  'WhatsApp connection profiles have RLS enabled'
);
select extensions.ok(
  (
    select relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_whatsapp_connection_profiles'
  ),
  'WhatsApp connection profiles have RLS forced'
);
select extensions.is(
  (
    select array_agg(policyname::text order by policyname)
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename = 'meta_whatsapp_connection_profiles'
  ),
  array['meta_whatsapp_connection_profiles_admin_select']::text[],
  'only the tenant admin read policy exists for WhatsApp profiles'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as trigger_value
    join pg_catalog.pg_class as relation on relation.oid = trigger_value.tgrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_whatsapp_connection_profiles'
      and trigger_value.tgname = 'meta_whatsapp_connection_profiles_validate_connection'
      and not trigger_value.tgisinternal
  ),
  'WhatsApp profiles retain their operational connection integrity trigger'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_trigger as trigger_value
    join pg_catalog.pg_class as relation on relation.oid = trigger_value.tgrelid
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_whatsapp_connection_profiles'
      and trigger_value.tgname = 'meta_whatsapp_connection_profiles_prevent_reassignment'
      and not trigger_value.tgisinternal
  ),
  'WhatsApp profiles retain their tenant and connection reassignment guard'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.register_meta_whatsapp_connection(uuid,uuid,text,text,text,text,text,text,text,text[],timestamptz,timestamptz,text,uuid,text,text)',
    'EXECUTE'
  ),
  'service_role can call the audited WhatsApp registrar'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.register_meta_whatsapp_connection(uuid,uuid,text,text,text,text,text,text,text,text[],timestamptz,timestamptz,text,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated callers cannot inject WhatsApp tokens'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'api'
      and table_name = 'meta_whatsapp_connections'
      and column_name in (
        'access_token',
        'credential_reference',
        'webhook_secret_reference',
        'vault_secret_id',
        'secret'
      )
  ),
  0,
  'the WhatsApp API projection exposes no secret or opaque secret reference'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4010000-0000-4000-8000-000000000001'),
  ('b4020000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    'b4110000-0000-4000-8000-000000000001',
    'WhatsApp Alpha',
    'b4010000-0000-4000-8000-000000000001'
  ),
  (
    'b4210000-0000-4000-8000-000000000001',
    'WhatsApp Beta',
    'b4020000-0000-4000-8000-000000000001'
  );

insert into app_private.organization_memberships (
  id,
  organization_id,
  user_id,
  role,
  status,
  joined_at
)
values
  (
    'b4110000-0000-4000-8000-000000000002',
    'b4110000-0000-4000-8000-000000000001',
    'b4010000-0000-4000-8000-000000000001',
    'owner',
    'active',
    statement_timestamp()
  ),
  (
    'b4210000-0000-4000-8000-000000000002',
    'b4210000-0000-4000-8000-000000000001',
    'b4020000-0000-4000-8000-000000000001',
    'owner',
    'active',
    statement_timestamp()
  );

set constraints all immediate;
set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4110000-0000-4000-8000-000000000001',
      '216409300082701',
      'WhatsApp Alpha App',
      'v26.0',
      'alpha-app-secret-0123456789abcdef',
      'alpha-verify-token-0123456789',
      'b4010000-0000-4000-8000-000000000001',
      'whatsapp-register-alpha-app',
      'whatsapp-trace-alpha-app'
    )
  ),
  1,
  'Alpha Meta application registers before channel onboarding'
);
select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4210000-0000-4000-8000-000000000001',
      '216409300082702',
      'WhatsApp Beta App',
      'v26.0',
      'beta-app-secret-0123456789abcdef',
      'beta-verify-token-0123456789',
      'b4020000-0000-4000-8000-000000000001',
      'whatsapp-register-beta-app',
      'whatsapp-trace-beta-app'
    )
  ),
  1,
  'Beta Meta application remains tenant-isolated'
);
select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_application(
      'b4110000-0000-4000-8000-000000000001',
      '216409300082703',
      'Pending Alpha App',
      'v26.0',
      'pending-app-secret-0123456789abcdef',
      'pending-verify-token-0123456789',
      'b4010000-0000-4000-8000-000000000001',
      'whatsapp-register-pending-app',
      'whatsapp-trace-pending-app'
    )
  ),
  1,
  'a pending App exists to prove verification is mandatory'
);

reset role;
set local role postgres;

do $$
declare
  endpoint_value record;
  credential_value record;
begin
  for endpoint_value in
    select endpoint_key, organization_id
    from app_private.meta_webhook_endpoints
    where organization_id in (
      'b4110000-0000-4000-8000-000000000001'::uuid,
      'b4210000-0000-4000-8000-000000000001'::uuid
    )
      and meta_application_id in (
        select id
        from app_private.meta_applications
        where external_app_id in ('216409300082701', '216409300082702')
      )
  loop
    if endpoint_value.organization_id = 'b4110000-0000-4000-8000-000000000001'::uuid then
      select * into credential_value
      from api.verify_meta_webhook_challenge(
        endpoint_value.endpoint_key,
        'alpha-verify-token-0123456789'
      );
    else
      select * into credential_value
      from api.verify_meta_webhook_challenge(
        endpoint_value.endpoint_key,
        'beta-verify-token-0123456789'
      );
    end if;

    perform api.confirm_meta_webhook_verification(
      endpoint_value.endpoint_key,
      credential_value.credential_version_id,
      'whatsapp-confirm-app',
      'whatsapp-confirm-trace'
    );
  end loop;
end;
$$;

set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from api.register_meta_whatsapp_connection(
      'b4110000-0000-4000-8000-000000000001',
      (
        select id
        from api.meta_applications
        where organization_id = 'b4110000-0000-4000-8000-000000000001'
          and external_app_id = '216409300082701'
      ),
      '111111111111111',
      '222222222222222',
      '+52 664 555 0101',
      'Comercializadora Alpha',
      'GREEN',
      'APPROVED',
      'SYSTEM_USER',
      array[
        'whatsapp_business_messaging',
        'whatsapp_business_management',
        'whatsapp_business_messaging'
      ],
      statement_timestamp() + interval '30 days',
      statement_timestamp() + interval '30 days',
      'alpha-whatsapp-access-token-0123456789abcdef',
      'b4010000-0000-4000-8000-000000000001',
      'whatsapp-register-alpha-channel',
      'whatsapp-trace-alpha-channel'
    )
  ),
  1,
  'a Meta-validated WhatsApp connection registers atomically'
);
select extensions.is(
  (
    select concat_ws('|', provider, channel, external_app_id, external_account_id, external_sender_id, status)
    from app_private.channel_connections
    where organization_id = 'b4110000-0000-4000-8000-000000000001'
  ),
  'meta|whatsapp|216409300082701|111111111111111|222222222222222|active',
  'the active connection keeps exact App, WABA and phone routing identity'
);
select extensions.ok(
  (
    select credential_reference like 'meta-credential-version://%'
      and webhook_secret_reference like 'meta-webhook-endpoint://%'
      and credential_reference not like '%alpha-whatsapp-access-token%'
      and webhook_secret_reference not like '%alpha-whatsapp-access-token%'
    from app_private.channel_connections
    where organization_id = 'b4110000-0000-4000-8000-000000000001'
  ),
  'the channel stores only opaque credential and webhook references'
);
select extensions.is(
  (
    select concat_ws('|', display_phone_number, verified_name, quality_rating, name_status, token_type)
    from app_private.meta_whatsapp_connection_profiles
    where organization_id = 'b4110000-0000-4000-8000-000000000001'
  ),
  '+52 664 555 0101|Comercializadora Alpha|GREEN|APPROVED|SYSTEM_USER',
  'the profile persists only Meta-observed non-secret facts'
);
select extensions.is(
  (
    select granted_scopes
    from app_private.meta_whatsapp_connection_profiles
    where organization_id = 'b4110000-0000-4000-8000-000000000001'
  ),
  array['whatsapp_business_management', 'whatsapp_business_messaging']::text[],
  'permission evidence is normalized and deduplicated'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.meta_credential_versions as version_value
    join app_private.channel_connections as connection_value
      on connection_value.organization_id = version_value.organization_id
     and connection_value.id = version_value.channel_connection_id
    where version_value.organization_id = 'b4110000-0000-4000-8000-000000000001'
      and version_value.credential_kind = 'channel_access_token'
      and version_value.status = 'current'
      and connection_value.status = 'active'
  ),
  1,
  'one current Vault credential version belongs to the active channel'
);
select extensions.is(
  (
    select count(*)::integer
    from vault.secrets as secret_value
    where secret_value.name like 'agentefer/meta/b4110000-0000-4000-8000-000000000001/%/channel_access_token/v1'
      and secret_value.secret <> 'alpha-whatsapp-access-token-0123456789abcdef'
  ),
  1,
  'Vault stores the channel token only as ciphertext'
);
select extensions.is(
  (
    select count(*)::integer
    from api.meta_whatsapp_connections
    where organization_id = 'b4110000-0000-4000-8000-000000000001'::uuid
  ),
  1,
  'the service view projects the registered WhatsApp connection once'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = 'b4110000-0000-4000-8000-000000000001'
      and event_type = 'meta.whatsapp.connection_registered'
  ),
  1,
  'successful onboarding emits one tenant audit event'
);
select extensions.ok(
  not exists (
    select 1
    from app_private.audit_events
    where metadata_safe::text like '%alpha-whatsapp-access-token%'
  ),
  'audit metadata never contains the access token'
);
select pg_temp.throws_sqlstate(
  $$insert into app_private.meta_whatsapp_connection_profiles (
      channel_connection_id,
      organization_id,
      display_phone_number,
      verified_name,
      token_type,
      granted_scopes
    ) values (
      extensions.gen_random_uuid(),
      'b4110000-0000-4000-8000-000000000001',
      '+52 664 555 0199',
      'Forbidden direct insert',
      'SYSTEM_USER',
      array['whatsapp_business_management', 'whatsapp_business_messaging']
    )$$,
  '42501',
  'service_role cannot bypass the audited WhatsApp registrar'
);

reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'b4010000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::integer from api.meta_whatsapp_connections),
  1,
  'Alpha owner sees the Alpha WhatsApp connection'
);
select extensions.is(
  (
    select count(*)::integer
    from api.meta_whatsapp_connections
    where organization_id = 'b4210000-0000-4000-8000-000000000001'
  ),
  0,
  'Alpha owner cannot observe Beta WhatsApp metadata'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id
      from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    '111111111111112',
    '222222222222223',
    '+52 664 555 0102',
    'Blocked authenticated caller',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'blocked-authenticated-token-0123456789',
    'b4010000-0000-4000-8000-000000000001',
    'blocked-authenticated-call'
  ),
  '42501',
  'authenticated callers cannot invoke the secret-bearing RPC'
);

reset request.jwt.claim.sub;
reset role;
set local role authenticated;
set local "request.jwt.claim.sub" = 'b4020000-0000-4000-8000-000000000001';

select extensions.is(
  (select count(*)::integer from api.meta_whatsapp_connections),
  0,
  'Beta owner sees no Alpha WhatsApp connection'
);

reset request.jwt.claim.sub;
reset role;
set local role service_role;

select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    '111111111111113',
    '222222222222224',
    '+52 664 555 0103',
    'Wrong actor',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'wrong-actor-token-0123456789abcdef',
    'b4020000-0000-4000-8000-000000000001',
    'wrong-actor-attempt'
  ),
  '42501',
  'an owner from another tenant cannot register the connection'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    '111111111111114',
    '222222222222225',
    '+52 664 555 0104',
    'Missing permission',
    'SYSTEM_USER',
    array['whatsapp_business_management'],
    'missing-permission-token-0123456789',
    'b4010000-0000-4000-8000-000000000001',
    'missing-permission-attempt'
  ),
  '22023',
  'both documented WhatsApp permissions are mandatory'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], statement_timestamp() - interval ''1 second'', null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    '111111111111115',
    '222222222222226',
    '+52 664 555 0105',
    'Expired token',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'expired-token-0123456789abcdef',
    'b4010000-0000-4000-8000-000000000001',
    'expired-token-attempt'
  ),
  '22023',
  'an expired token cannot activate a connection'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082703'
    ),
    '111111111111116',
    '222222222222227',
    '+52 664 555 0106',
    'Pending application',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'pending-application-token-0123456789',
    'b4010000-0000-4000-8000-000000000001',
    'pending-application-attempt'
  ),
  '55000',
  'an unverified Meta application cannot activate a channel'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    'not-a-waba',
    '222222222222228',
    '+52 664 555 0107',
    'Invalid WABA',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'invalid-waba-token-0123456789abcdef',
    'b4010000-0000-4000-8000-000000000001',
    'invalid-waba-attempt'
  ),
  '22023',
  'provider identifiers must be decimal Meta IDs'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4110000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4110000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082701'
    ),
    '111111111111117',
    '222222222222229',
    '+52 664 555 0108',
    'Short token',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'short',
    'b4010000-0000-4000-8000-000000000001',
    'short-token-attempt'
  ),
  '22023',
  'short token rejection rolls back the pending connection'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.register_meta_whatsapp_connection(%L::uuid, %L::uuid, %L, %L, %L, %L, null, null, %L, %L::text[], null, null, %L, %L::uuid, %L, null)',
    'b4210000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4210000-0000-4000-8000-000000000001'
        and external_app_id = '216409300082702'
    ),
    '333333333333333',
    '222222222222222',
    '+52 664 555 0101',
    'Cross tenant duplicate',
    'SYSTEM_USER',
    array['whatsapp_business_management', 'whatsapp_business_messaging'],
    'beta-duplicate-phone-token-0123456789',
    'b4020000-0000-4000-8000-000000000001',
    'duplicate-phone-attempt'
  ),
  '23505',
  'one operational phone number cannot belong to two tenants'
);
select extensions.is(
  (
    select count(*)::integer
    from vault.secrets
    where name like 'agentefer/meta/b4110000-0000-4000-8000-000000000001/%'
       or name like 'agentefer/meta/b4210000-0000-4000-8000-000000000001/%'
  ),
  7,
  'all rejected registrations roll back without adding Vault secrets'
);

select * from extensions.finish();

rollback;
