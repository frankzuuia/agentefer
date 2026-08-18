begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(48);

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
  'meta_webhook_deliveries',
  'private authenticated Meta delivery inbox exists'
);
select extensions.ok(
  (
    select relation.relrowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_webhook_deliveries'
  ),
  'Meta delivery inbox has RLS enabled'
);
select extensions.ok(
  (
    select relation.relforcerowsecurity
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname = 'meta_webhook_deliveries'
  ),
  'Meta delivery inbox has forced RLS'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename = 'meta_webhook_deliveries'
  ),
  0,
  'authenticated deliveries remain backend-only with default deny'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.accept_meta_webhook_challenge(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service role can execute the atomic Meta challenge RPC'
);
select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'api.accept_meta_webhook_challenge(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated callers cannot execute the Meta challenge RPC'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.ingest_meta_webhook_delivery(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service role can execute authenticated Meta ingestion'
);
select extensions.ok(
  not has_function_privilege(
    'anon',
    'api.ingest_meta_webhook_delivery(uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'anonymous callers cannot execute authenticated Meta ingestion'
);
select extensions.ok(
  not has_table_privilege(
    'service_role',
    'app_private.meta_webhook_deliveries',
    'SELECT'
  ),
  'service role cannot read raw Meta delivery payloads directly'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname = 'meta_webhook_deliveries'
  ),
  0,
  'raw Meta deliveries have no Data API table or view projection'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'meta_webhook_deliveries_endpoint_payload_unique'
  ),
  'endpoint and raw payload hash enforce provider replay idempotency'
);
select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'meta_credential_versions_scope_application_id_unique'
  ),
  'credential evidence has a composite tenant and application identity'
);

set local role postgres;

insert into auth.users (id)
values
  ('b4020000-0000-4000-8000-000000000001'),
  ('b4020000-0000-4000-8000-000000000002');

insert into app_private.organizations (id, name, created_by_user_id)
values
  (
    'b4021000-0000-4000-8000-000000000001',
    'B4 Webhook Alpha',
    'b4020000-0000-4000-8000-000000000001'
  ),
  (
    'b4022000-0000-4000-8000-000000000001',
    'B4 Webhook Beta',
    'b4020000-0000-4000-8000-000000000002'
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
    'b4021000-0000-4000-8000-000000000002',
    'b4021000-0000-4000-8000-000000000001',
    'b4020000-0000-4000-8000-000000000001',
    'owner',
    'active',
    statement_timestamp()
  ),
  (
    'b4022000-0000-4000-8000-000000000002',
    'b4022000-0000-4000-8000-000000000001',
    'b4020000-0000-4000-8000-000000000002',
    'owner',
    'active',
    statement_timestamp()
  );

set constraints all immediate;
set local role service_role;

select * from api.register_meta_application(
  'b4021000-0000-4000-8000-000000000001',
  'b4-webhook-alpha-app',
  'B4 Webhook Alpha App',
  'v26.0',
  'alpha-app-secret-v1',
  'alpha-verify-token-value',
  'b4020000-0000-4000-8000-000000000001',
  'b4-webhook-alpha-register',
  'b402alpha-register'
);

select * from api.register_meta_application(
  'b4022000-0000-4000-8000-000000000001',
  'b4-webhook-beta-app',
  'B4 Webhook Beta App',
  'v26.0',
  'beta-app-secret-v1',
  'beta-verify-token-value',
  'b4020000-0000-4000-8000-000000000002',
  'b4-webhook-beta-register',
  'b402beta-register'
);

select pg_temp.throws_sqlstate(
  format(
    'select * from api.accept_meta_webhook_challenge(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'unsubscribe',
    'alpha-verify-token-value',
    'b402-invalid-mode',
    'b402-invalid-mode-trace'
  ),
  '42501',
  'non-subscribe Meta challenge modes fail closed'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.accept_meta_webhook_challenge(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'subscribe',
    'beta-verify-token-value',
    'b402-cross-token',
    'b402-cross-token-trace'
  ),
  '42501',
  'a different tenant verify token cannot activate an endpoint'
);
select extensions.lives_ok(
  format(
    'select * from api.accept_meta_webhook_challenge(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'subscribe',
    'alpha-verify-token-value',
    'b402-alpha-challenge',
    'b402alpha-challenge-trace'
  ),
  'Alpha endpoint accepts its own Vault-backed challenge atomically'
);
select extensions.lives_ok(
  format(
    'select * from api.accept_meta_webhook_challenge(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key
      from api.meta_webhook_endpoints
      where organization_id = 'b4022000-0000-4000-8000-000000000001'
    ),
    'subscribe',
    'beta-verify-token-value',
    'b402-beta-challenge',
    'b402beta-challenge-trace'
  ),
  'Beta endpoint accepts its independent Vault-backed challenge atomically'
);
select extensions.is(
  (select count(*)::integer from api.meta_webhook_endpoints where status = 'active'),
  2,
  'both tenant endpoints become independently active'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where event_type = 'meta.webhook.verified'
      and organization_id in (
        'b4021000-0000-4000-8000-000000000001',
        'b4022000-0000-4000-8000-000000000001'
      )
  ),
  2,
  'successful challenge activation produces tenant-scoped audit evidence'
);

select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(
      convert_to(
        '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
        'UTF8'
      ),
      'base64'
    ),
    repeat('0', 64),
    'b402-invalid-signature',
    'b402-invalid-signature-trace'
  ),
  '42501',
  'an invalid raw-body signature is rejected before persistence'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, %L)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4022000-0000-4000-8000-000000000001'
    ),
    encode(
      convert_to(
        '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
        'UTF8'
      ),
      'base64'
    ),
    encode(
      extensions.hmac(
        convert_to(
          '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
          'UTF8'
        ),
        convert_to('alpha-app-secret-v1', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    'b402-cross-signature',
    'b402-cross-signature-trace'
  ),
  '42501',
  'an Alpha signature cannot authenticate the Beta endpoint'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    '%%%%',
    repeat('0', 64),
    'b402-invalid-base64'
  ),
  '22023',
  'invalid base64 is rejected without leaking decoder details'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'e30=',
    repeat('g', 64),
    'b402-invalid-hex'
  ),
  '22023',
  'non-hex signature input is rejected before decoding'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(convert_to('{"object":', 'UTF8'), 'base64'),
    encode(
      extensions.hmac(
        convert_to('{"object":', 'UTF8'),
        convert_to('alpha-app-secret-v1', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    'b402-malformed-json'
  ),
  '22023',
  'signed malformed JSON is rejected without persistence'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(convert_to('[]', 'UTF8'), 'base64'),
    encode(
      extensions.hmac(
        convert_to('[]', 'UTF8'),
        convert_to('alpha-app-secret-v1', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    'b402-array-payload'
  ),
  '22023',
  'signed non-object JSON is rejected'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(convert_to('{"object":"page","entry":[]}', 'UTF8'), 'base64'),
    encode(
      extensions.hmac(
        convert_to('{"object":"page","entry":[]}', 'UTF8'),
        convert_to('alpha-app-secret-v1', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    'b402-empty-entry'
  ),
  '22023',
  'signed payloads without entries are rejected'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(convert_to(bounded_payload.body, 'UTF8'), 'base64'),
    encode(
      extensions.hmac(
        convert_to(bounded_payload.body, 'UTF8'),
        convert_to('alpha-app-secret-v1', 'UTF8'),
        'sha256'
      ),
      'hex'
    ),
    'b402-too-many-entries'
  ),
  '22023',
  'signed batches above one hundred entries are rejected'
)
from (
  select jsonb_build_object(
    'object',
    'page',
    'entry',
    (select jsonb_agg(jsonb_build_object('id', sequence_value)) from generate_series(1, 101) as sequence_value)
  )::text as body
) as bounded_payload;
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    encode(convert_to(repeat('a', 1048577), 'UTF8'), 'base64'),
    repeat('0', 64),
    'b402-oversized-body'
  ),
  '22023',
  'raw bodies above one MiB are rejected before cryptographic work'
);
select pg_temp.throws_sqlstate(
  format(
    'select * from api.ingest_meta_webhook_delivery(%L::uuid, %L, %L, %L, null)',
    (
      select endpoint_key from api.meta_webhook_endpoints
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'e30=',
    repeat('0', 64),
    ' padded-request '
  ),
  '22023',
  'unsafe request correlation is rejected'
);

select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4021000-0000-4000-8000-000000000001'
      ),
      encode(
        convert_to(
          '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
          'UTF8'
        ),
        'base64'
      ),
      encode(
        extensions.hmac(
          convert_to(
            '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
            'UTF8'
          ),
          convert_to('alpha-app-secret-v1', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b402-alpha-first',
      'b402alpha-first-trace'
    )
  ),
  false,
  'a valid first delivery is persisted as new work'
);

set local role postgres;

select extensions.is(
  (
    select count(*)::integer
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  1,
  'first valid Alpha delivery creates exactly one private inbox row'
);
select extensions.is(
  (
    select provider_object_type
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  'whatsapp_business_account',
  'provider object type is derived from the signed bytes'
);
select extensions.is(
  (
    select encode(payload_sha256, 'hex')
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  encode(
    extensions.digest(
      convert_to(
        '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  ),
  'stored SHA-256 evidence is calculated from the exact signed bytes'
);
select extensions.is(
  (
    select payload
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}'::jsonb,
  'stored JSON is parsed from the authenticated raw body'
);

set local role service_role;

select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4021000-0000-4000-8000-000000000001'
      ),
      encode(
        convert_to(
          '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
          'UTF8'
        ),
        'base64'
      ),
      encode(
        extensions.hmac(
          convert_to(
            '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
            'UTF8'
          ),
          convert_to('alpha-app-secret-v1', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b402-alpha-replay',
      'b402alpha-replay-trace'
    )
  ),
  true,
  'an exact provider retry is identified as a replay'
);

set local role postgres;

select extensions.is(
  (
    select delivery_count
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  2,
  'replay increments delivery evidence without duplicating work'
);
select extensions.is(
  (
    select latest_request_id
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
  ),
  'b402-alpha-replay',
  'replay preserves the latest correlation without mutating first evidence'
);

set local role service_role;

select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4022000-0000-4000-8000-000000000001'
      ),
      encode(
        convert_to(
          '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
          'UTF8'
        ),
        'base64'
      ),
      encode(
        extensions.hmac(
          convert_to(
            '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
            'UTF8'
          ),
          convert_to('beta-app-secret-v1', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b402-beta-same-body',
      'b402beta-same-body-trace'
    )
  ),
  false,
  'the same bytes at another tenant endpoint create independent work'
);
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4021000-0000-4000-8000-000000000001'
      ),
      encode(
        convert_to(
          '{ "object": "whatsapp_business_account", "entry": [{"id":"alpha-waba","changes":[]}] }',
          'UTF8'
        ),
        'base64'
      ),
      encode(
        extensions.hmac(
          convert_to(
            '{ "object": "whatsapp_business_account", "entry": [{"id":"alpha-waba","changes":[]}] }',
            'UTF8'
          ),
          convert_to('alpha-app-secret-v1', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b402-alpha-distinct-bytes',
      'b402alpha-distinct-trace'
    )
  ),
  false,
  'different signed bytes remain distinct before channel event normalization'
);

set local role postgres;

select extensions.is(
  (
    select count(*)::integer
    from app_private.meta_webhook_deliveries
    where organization_id in (
      'b4021000-0000-4000-8000-000000000001',
      'b4022000-0000-4000-8000-000000000001'
    )
  ),
  3,
  'invalid attempts create no rows and endpoint-scoped valid deliveries remain isolated'
);

set local role service_role;

select extensions.lives_ok(
  format(
    'select * from api.rotate_meta_credential(%L::uuid, %L::uuid, null, null, %L, %L, 300, %L::uuid, %L, %L)',
    'b4021000-0000-4000-8000-000000000001',
    (
      select id from api.meta_applications
      where organization_id = 'b4021000-0000-4000-8000-000000000001'
    ),
    'app_secret',
    'alpha-app-secret-v2',
    'b4020000-0000-4000-8000-000000000001',
    'b402-alpha-secret-rotate',
    'b402alpha-rotate-trace'
  ),
  'App Secret rotation succeeds without redeploying the endpoint'
);
select extensions.is(
  (
    select replayed
    from api.ingest_meta_webhook_delivery(
      (
        select endpoint_key from api.meta_webhook_endpoints
        where organization_id = 'b4021000-0000-4000-8000-000000000001'
      ),
      encode(
        convert_to(
          '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
          'UTF8'
        ),
        'base64'
      ),
      encode(
        extensions.hmac(
          convert_to(
            '{"object":"whatsapp_business_account","entry":[{"id":"alpha-waba","changes":[]}]}',
            'UTF8'
          ),
          convert_to('alpha-app-secret-v2', 'UTF8'),
          'sha256'
        ),
        'hex'
      ),
      'b402-alpha-v2-replay',
      'b402alpha-v2-replay-trace'
    )
  ),
  true,
  'a retry signed by the rotated App Secret resolves the existing delivery'
);

set local role postgres;

select extensions.is(
  (
    select delivery_count
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
      and first_request_id = 'b402-alpha-first'
  ),
  3,
  'credential rotation does not reset replay accounting'
);
select extensions.ok(
  (
    select initial_credential_version_id <> latest_credential_version_id
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
      and first_request_id = 'b402-alpha-first'
  ),
  'delivery preserves initial and latest credential evidence across rotation'
);

set local role service_role;

select pg_temp.throws_sqlstate(
  $$insert into app_private.meta_webhook_deliveries (
      organization_id,
      meta_application_id,
      webhook_endpoint_id,
      initial_credential_version_id,
      latest_credential_version_id,
      provider_object_type,
      payload_sha256,
      payload,
      first_request_id,
      latest_request_id
    ) values (
      'b4021000-0000-4000-8000-000000000001',
      'b4021000-0000-4000-8000-000000000001',
      'b4021000-0000-4000-8000-000000000001',
      'b4021000-0000-4000-8000-000000000001',
      'b4021000-0000-4000-8000-000000000001',
      'page',
      decode(repeat('00', 32), 'hex'),
      '{"object":"page","entry":[{}]}'::jsonb,
      'b402-direct-insert',
      'b402-direct-insert'
    )$$,
  '42501',
  'service role cannot bypass authenticated ingestion with direct DML'
);

set local role postgres;

select pg_temp.throws_sqlstate(
  $$update app_private.meta_webhook_deliveries
    set payload = '{"object":"page","entry":[{"tampered":true}]}'::jsonb
    where first_request_id = 'b402-alpha-first'$$,
  '23514',
  'even the table owner cannot mutate authenticated delivery evidence'
);
select extensions.is(
  (
    select first_request_id
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
      and first_request_id = 'b402-alpha-first'
  ),
  'b402-alpha-first',
  'first receipt correlation remains immutable after replay and rotation'
);
select extensions.is(
  (
    select status
    from app_private.meta_webhook_deliveries
    where organization_id = 'b4021000-0000-4000-8000-000000000001'
      and first_request_id = 'b402-alpha-first'
  ),
  'received',
  'authenticated delivery remains durable work for asynchronous B4-003 routing'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.meta_webhook_deliveries
    where first_request_id like 'b402-invalid%'
       or first_request_id like 'b402-cross%'
  ),
  0,
  'rejected signatures and malformed envelopes leave no delivery residue'
);

select * from extensions.finish();

rollback;
