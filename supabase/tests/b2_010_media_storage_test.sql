begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(58);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
as $$
declare
  actual_sqlstate text;
begin
  execute statement;
  return extensions.fail(description || ' (statement did not fail)');
exception
  when others then
    get stacked diagnostics actual_sqlstate = returned_sqlstate;
    return extensions.is(actual_sqlstate, expected_sqlstate, description);
end;
$$;

grant execute on function pg_temp.throws_sqlstate(text, text, text)
  to anon, authenticated, service_role;

-- Physical storage and relational contracts.
select extensions.has_table(
  'app_private',
  'media_asset_objects',
  'immutable media object registry exists'
);
select extensions.has_table(
  'app_private',
  'product_media',
  'product and variant gallery relation exists'
);
select extensions.has_view('api', 'media_asset_objects', 'media object API view exists');
select extensions.has_view('api', 'product_media', 'product media API view exists');
select extensions.has_function(
  'api',
  'begin_media_asset_ingest',
  array[
    'uuid', 'bytea', 'text', 'bigint', 'integer', 'integer', 'text',
    'text', 'uuid', 'text', 'uuid', 'text', 'text'
  ],
  'media ingest reservation RPC exists'
);
select extensions.has_function(
  'api',
  'register_media_asset_object',
  array[
    'uuid', 'uuid', 'text', 'text', 'text', 'bytea', 'text', 'bigint',
    'integer', 'integer', 'jsonb', 'text', 'uuid', 'text', 'text'
  ],
  'media object registration RPC exists'
);
select extensions.has_function(
  'api',
  'complete_media_asset_ingest',
  array['uuid', 'uuid', 'text', 'uuid', 'text', 'text'],
  'media verification RPC exists'
);
select extensions.has_function(
  'api',
  'link_product_media',
  array['uuid', 'uuid', 'uuid', 'uuid', 'text', 'integer', 'text', 'uuid', 'text', 'text'],
  'product gallery linking RPC exists'
);
select extensions.has_function(
  'api',
  'transition_product_media',
  array['uuid', 'uuid', 'timestamp with time zone', 'text', 'uuid', 'text', 'text'],
  'product gallery approval RPC exists'
);

select extensions.is(
  (
    select (not public)::text || ':' || file_size_limit::text
    from storage.buckets
    where id = 'agentefer-catalog-private'
  ),
  'true:26214400',
  'private catalog bucket has the exact privacy and size contract'
);
select extensions.is(
  (
    select public::text || ':' || file_size_limit::text
    from storage.buckets
    where id = 'agentefer-catalog-public'
  ),
  'true:10485760',
  'public storefront bucket has the exact public and size contract'
);
select extensions.is(
  (
    select allowed_mime_types
    from storage.buckets
    where id = 'agentefer-catalog-private'
  ),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'private bucket accepts only supported image formats'
);
select extensions.is(
  (
    select allowed_mime_types
    from storage.buckets
    where id = 'agentefer-catalog-public'
  ),
  array['image/webp']::text[],
  'public bucket accepts only storefront WebP'
);
select extensions.is(
  (
    select count(*)::integer
    from information_schema.columns
    where table_schema = 'app_private'
      and table_name in ('media_asset_objects', 'product_media')
      and column_name in (
        'base64', 'bytes', 'blob', 'public_url', 'signed_url', 'download_url'
      )
  ),
  0,
  'database stores neither image bytes nor durable delivery URLs'
);
select extensions.ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'app_private.media_asset_objects'::regclass
  ),
  'media object registry forces RLS'
);
select extensions.ok(
  (
    select relrowsecurity and relforcerowsecurity
    from pg_catalog.pg_class
    where oid = 'app_private.product_media'::regclass
  ),
  'product gallery forces RLS'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'agentefer_catalog_private_member_read'
  ),
  1,
  'private Storage objects have a tenant-scoped read policy'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.begin_media_asset_ingest(uuid,bytea,text,bigint,integer,integer,text,text,uuid,text,uuid,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'api.begin_media_asset_ingest(uuid,bytea,text,bigint,integer,integer,text,text,uuid,text,uuid,text,text)',
    'EXECUTE'
  ),
  'only the trusted backend can execute media ingestion RPCs'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.link_product_media(uuid,uuid,uuid,uuid,text,integer,text,uuid,text,text)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'api.link_product_media(uuid,uuid,uuid,uuid,text,integer,text,uuid,text,text)',
    'EXECUTE'
  ),
  'gallery writes are tool-only operations'
);

-- Transactional identities and tenant fixtures.
set local role postgres;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password)
values
  ('51000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2-010-owner-a@example.invalid', ''),
  ('51000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2-010-operator-a@example.invalid', ''),
  ('51000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2-010-viewer-a@example.invalid', ''),
  ('52000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b2-010-owner-b@example.invalid', '');

set local role service_role;

insert into app_private.organizations (id, name)
values
  ('51000000-0000-4000-8000-000000000010', 'B2-010 Organization A'),
  ('52000000-0000-4000-8000-000000000010', 'B2-010 Organization B');

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  ('51000000-0000-4000-8000-000000000011', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000001', 'owner', 'active', now()),
  ('51000000-0000-4000-8000-000000000012', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000002', 'operator', 'active', now()),
  ('51000000-0000-4000-8000-000000000013', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000003', 'viewer', 'active', now()),
  ('52000000-0000-4000-8000-000000000011', '52000000-0000-4000-8000-000000000010', '52000000-0000-4000-8000-000000000001', 'owner', 'active', now());

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  ('51000000-0000-4000-8000-000000000100', '51000000-0000-4000-8000-000000000010', 'media_fixture', 'Media fixture', 'active'),
  ('52000000-0000-4000-8000-000000000100', '52000000-0000-4000-8000-000000000010', 'media_fixture', 'Media fixture', 'active');

insert into app_private.products (id, organization_id, category_id, name)
values
  ('51000000-0000-4000-8000-000000000150', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000100', 'Media product A'),
  ('51000000-0000-4000-8000-000000000151', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000100', 'Other media product A'),
  ('52000000-0000-4000-8000-000000000150', '52000000-0000-4000-8000-000000000010', '52000000-0000-4000-8000-000000000100', 'Media product B');

insert into app_private.product_variants (id, organization_id, product_id, name)
values
  ('51000000-0000-4000-8000-000000000160', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000150', 'Media variant A'),
  ('51000000-0000-4000-8000-000000000161', '51000000-0000-4000-8000-000000000010', '51000000-0000-4000-8000-000000000151', 'Other media variant A');

-- Ingest reservation is validated before locks and is tenant-scoped/idempotent.
select pg_temp.throws_sqlstate(
  $$select * from api.begin_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      null,
      'image/jpeg',
      1024,
      640,
      480,
      'invalid.jpg',
      'authorized_upload',
      null,
      'worker',
      null,
      'b2-010-invalid',
      'trace-b2-010-invalid'
    )$$,
  '22023',
  'null content hash is rejected before ingest locking'
);

create temporary table b2_010_asset_a on commit drop as
select *
from api.begin_media_asset_ingest(
  '51000000-0000-4000-8000-000000000010',
  extensions.digest(convert_to('b2-010-source-a', 'UTF8'), 'sha256'),
  'image/jpeg',
  4096,
  1200,
  900,
  'source-a.jpg',
  'authorized_upload',
  null,
  'worker',
  null,
  'b2-010-ingest-a',
  'trace-b2-010-a'
);

select extensions.is(
  (select ingest_status from b2_010_asset_a),
  'received',
  'new media begins in received state'
);
select extensions.is(
  (select was_replayed from b2_010_asset_a),
  false,
  'first media ingest reservation is not a replay'
);
select extensions.is(
  (
    select was_replayed
    from api.begin_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      extensions.digest(convert_to('b2-010-source-a', 'UTF8'), 'sha256'),
      'image/jpeg',
      4096,
      1200,
      900,
      'renamed-source-a.jpg',
      'authorized_upload',
      null,
      'worker',
      null,
      'b2-010-ingest-a-replay',
      'trace-b2-010-a'
    )
  ),
  true,
  'same tenant and content hash replay the media identity'
);
select pg_temp.throws_sqlstate(
  $$select * from api.begin_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      extensions.digest(convert_to('b2-010-source-a', 'UTF8'), 'sha256'),
      'image/jpeg',
      4097,
      1200,
      900,
      'source-a.jpg',
      'authorized_upload',
      null,
      'worker',
      null,
      'b2-010-ingest-conflict',
      'trace-b2-010-a'
    )$$,
  '23514',
  'same hash with conflicting byte metadata is rejected'
);

-- Storage bytes must exist before relational registration.
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      %L,
      'source_original',
      'agentefer-catalog-private',
      %L,
      decode(%L, 'hex'),
      'image/jpeg',
      4096,
      1200,
      900,
      '{}'::jsonb,
      'worker',
      null,
      'b2-010-missing-object',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a),
    '51000000-0000-4000-8000-000000000010/'
      || (select media_asset_id::text from b2_010_asset_a)
      || '/source_original/'
      || encode(extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'), 'hex')
      || '.jpg',
    encode(extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'), 'hex')
  ),
  '23514',
  'registry rejects metadata when the Storage object does not exist'
);

set local role postgres;

insert into storage.objects (id, bucket_id, name, metadata)
values
  (
    '51000000-0000-4000-8000-000000000201',
    'agentefer-catalog-private',
    '51000000-0000-4000-8000-000000000010/'
      || (select media_asset_id::text from b2_010_asset_a)
      || '/source_original/'
      || encode(extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'), 'hex')
      || '.jpg',
    '{"mimetype":"image/jpeg","size":4096}'::jsonb
  ),
  (
    '51000000-0000-4000-8000-000000000202',
    'agentefer-catalog-private',
    '51000000-0000-4000-8000-000000000010/'
      || (select media_asset_id::text from b2_010_asset_a)
      || '/analysis_webp/'
      || encode(extensions.digest(convert_to('b2-010-analysis-a', 'UTF8'), 'sha256'), 'hex')
      || '.webp',
    '{"mimetype":"image/webp","size":2048}'::jsonb
  );

set local role service_role;

create temporary table b2_010_original_a on commit drop as
select *
from api.register_media_asset_object(
  '51000000-0000-4000-8000-000000000010',
  (select media_asset_id from b2_010_asset_a),
  'source_original',
  'agentefer-catalog-private',
  '51000000-0000-4000-8000-000000000010/'
    || (select media_asset_id::text from b2_010_asset_a)
    || '/source_original/'
    || encode(extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'), 'hex')
    || '.jpg',
  extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'),
  'image/jpeg',
  4096,
  1200,
  900,
  '{}'::jsonb,
  'worker',
  null,
  'b2-010-register-original',
  'trace-b2-010-a'
);

select extensions.is(
  (select object_status from b2_010_original_a),
  'verified',
  'registered original becomes verified metadata'
);
select extensions.is(
  (
    select was_replayed
    from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      (select media_asset_id from b2_010_asset_a),
      'source_original',
      'agentefer-catalog-private',
      '51000000-0000-4000-8000-000000000010/'
        || (select media_asset_id::text from b2_010_asset_a)
        || '/source_original/'
        || encode(extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'), 'hex')
        || '.jpg',
      extensions.digest(convert_to('b2-010-original-a', 'UTF8'), 'sha256'),
      'image/jpeg',
      4096,
      1200,
      900,
      '{}'::jsonb,
      'worker',
      null,
      'b2-010-register-original-replay',
      'trace-b2-010-a'
    )
  ),
  true,
  'object path replay is idempotent'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      %L,
      'analysis_webp',
      'agentefer-catalog-private',
      'wrong/path.webp',
      decode(%L, 'hex'),
      'image/webp',
      2048,
      1000,
      750,
      '{"codec":"webp","purpose":"analysis"}'::jsonb,
      'worker',
      null,
      'b2-010-wrong-path',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a),
    encode(extensions.digest(convert_to('b2-010-analysis-a', 'UTF8'), 'sha256'), 'hex')
  ),
  '23514',
  'object registry rejects paths outside the canonical tenant layout'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.complete_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      %L,
      'worker',
      null,
      'b2-010-complete-too-early',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a)
  ),
  '23514',
  'asset cannot verify before both required private renditions exist'
);

select *
from api.register_media_asset_object(
  '51000000-0000-4000-8000-000000000010',
  (select media_asset_id from b2_010_asset_a),
  'analysis_webp',
  'agentefer-catalog-private',
  '51000000-0000-4000-8000-000000000010/'
    || (select media_asset_id::text from b2_010_asset_a)
    || '/analysis_webp/'
    || encode(extensions.digest(convert_to('b2-010-analysis-a', 'UTF8'), 'sha256'), 'hex')
    || '.webp',
  extensions.digest(convert_to('b2-010-analysis-a', 'UTF8'), 'sha256'),
  'image/webp',
  2048,
  1000,
  750,
  '{"codec":"webp","purpose":"analysis"}'::jsonb,
  'worker',
  null,
  'b2-010-register-analysis',
  'trace-b2-010-a'
);

select extensions.is(
  (
    select ingest_status
    from api.complete_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      (select media_asset_id from b2_010_asset_a),
      'worker',
      null,
      'b2-010-complete',
      'trace-b2-010-a'
    )
  ),
  'verified',
  'asset verifies after original and analysis WebP are registered'
);
select extensions.is(
  (
    select was_replayed
    from api.complete_media_asset_ingest(
      '51000000-0000-4000-8000-000000000010',
      (select media_asset_id from b2_010_asset_a),
      'worker',
      null,
      'b2-010-complete-replay',
      'trace-b2-010-a'
    )
  ),
  true,
  'media verification replay is idempotent'
);

-- Product gallery linking, approval and publication boundaries.
create temporary table b2_010_product_media_a on commit drop as
select *
from api.link_product_media(
  '51000000-0000-4000-8000-000000000010',
  '51000000-0000-4000-8000-000000000150',
  null,
  (select media_asset_id from b2_010_asset_a),
  'primary',
  0,
  'Product viewed from the front',
  '51000000-0000-4000-8000-000000000002',
  'b2-010-link',
  'trace-b2-010-a'
);

select extensions.is(
  (select media_status from b2_010_product_media_a),
  'draft',
  'operator links verified media as an approval-pending draft'
);
select extensions.is(
  (
    select was_replayed
    from api.link_product_media(
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000150',
      null,
      (select media_asset_id from b2_010_asset_a),
      'primary',
      0,
      'Product viewed from the front',
      '51000000-0000-4000-8000-000000000002',
      'b2-010-link-replay',
      'trace-b2-010-a'
    )
  ),
  true,
  'same product media link replays without duplicating the gallery row'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.link_product_media(
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000150',
      null,
      %L,
      'gallery',
      1,
      null,
      '51000000-0000-4000-8000-000000000003',
      'b2-010-viewer-link',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a)
  ),
  '42501',
  'viewer cannot mutate product gallery'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.link_product_media(
      '52000000-0000-4000-8000-000000000010',
      '52000000-0000-4000-8000-000000000150',
      null,
      %L,
      'gallery',
      0,
      null,
      '52000000-0000-4000-8000-000000000001',
      'b2-010-cross-tenant',
      'trace-b2-010-b'
    )$statement$,
    (select media_asset_id from b2_010_asset_a)
  ),
  '23514',
  'cross-tenant media cannot be attached to another organization product'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.link_product_media(
      '51000000-0000-4000-8000-000000000010',
      '51000000-0000-4000-8000-000000000150',
      '51000000-0000-4000-8000-000000000161',
      %L,
      'gallery',
      1,
      null,
      '51000000-0000-4000-8000-000000000002',
      'b2-010-wrong-variant',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a)
  ),
  '23514',
  'variant media must belong to the selected product'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      %L,
      'storefront_webp',
      'agentefer-catalog-public',
      %L,
      decode(%L, 'hex'),
      'image/webp',
      1900,
      1000,
      750,
      '{"codec":"webp","purpose":"storefront"}'::jsonb,
      'worker',
      null,
      'b2-010-public-too-early',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a),
    '51000000-0000-4000-8000-000000000010/'
      || (select media_asset_id::text from b2_010_asset_a)
      || '/storefront_webp/'
      || encode(extensions.digest(convert_to('b2-010-storefront-a', 'UTF8'), 'sha256'), 'hex')
      || '.webp',
    encode(extensions.digest(convert_to('b2-010-storefront-a', 'UTF8'), 'sha256'), 'hex')
  ),
  '42501',
  'public storefront object is blocked before product media approval'
);
select extensions.throws_ok(
  format(
    $statement$select * from api.transition_product_media(
      '51000000-0000-4000-8000-000000000010',
      %L,
      %L::timestamptz,
      'approved',
      '51000000-0000-4000-8000-000000000002',
      'b2-010-operator-approve',
      'trace-b2-010-a'
    )$statement$,
    (select product_media_id from b2_010_product_media_a),
    (select updated_at from app_private.product_media where id = (select product_media_id from b2_010_product_media_a))
  ),
  '42501',
  'product media transition is not authorized',
  'operator cannot approve product media'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.transition_product_media(
      '51000000-0000-4000-8000-000000000010',
      %L,
      (%L::timestamptz - interval '1 millisecond'),
      'approved',
      '51000000-0000-4000-8000-000000000001',
      'b2-010-stale-approve',
      'trace-b2-010-a'
    )$statement$,
    (select product_media_id from b2_010_product_media_a),
    (
      select updated_at
      from app_private.product_media
      where id = (select product_media_id from b2_010_product_media_a)
    )
  ),
  '40001',
  'stale product media approval is rejected without changing gallery state'
);

create temporary table b2_010_approved_a on commit drop as
select *
from api.transition_product_media(
  '51000000-0000-4000-8000-000000000010',
  (select product_media_id from b2_010_product_media_a),
  (
    select updated_at
    from app_private.product_media
    where id = (select product_media_id from b2_010_product_media_a)
  ),
  'approved',
  '51000000-0000-4000-8000-000000000001',
  'b2-010-owner-approve',
  'trace-b2-010-a'
);

select extensions.is(
  (select media_status from b2_010_approved_a),
  'approved',
  'owner can approve product media'
);
select extensions.is(
  (
    select was_replayed
    from api.transition_product_media(
      '51000000-0000-4000-8000-000000000010',
      (select product_media_id from b2_010_product_media_a),
      (select updated_at from b2_010_approved_a),
      'approved',
      '51000000-0000-4000-8000-000000000001',
      'b2-010-owner-approve-replay',
      'trace-b2-010-a'
    )
  ),
  true,
  'approval replay is idempotent'
);

set local role postgres;

insert into storage.objects (id, bucket_id, name, metadata)
values (
  '51000000-0000-4000-8000-000000000203',
  'agentefer-catalog-public',
  '51000000-0000-4000-8000-000000000010/'
    || (select media_asset_id::text from b2_010_asset_a)
    || '/storefront_webp/'
    || encode(extensions.digest(convert_to('b2-010-storefront-a', 'UTF8'), 'sha256'), 'hex')
    || '.webp',
  '{"mimetype":"image/webp","size":1900}'::jsonb
);

set local role service_role;

select extensions.is(
  (
    select object_status
    from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      (select media_asset_id from b2_010_asset_a),
      'storefront_webp',
      'agentefer-catalog-public',
      '51000000-0000-4000-8000-000000000010/'
        || (select media_asset_id::text from b2_010_asset_a)
        || '/storefront_webp/'
        || encode(extensions.digest(convert_to('b2-010-storefront-a', 'UTF8'), 'sha256'), 'hex')
        || '.webp',
      extensions.digest(convert_to('b2-010-storefront-a', 'UTF8'), 'sha256'),
      'image/webp',
      1900,
      1000,
      750,
      '{"codec":"webp","purpose":"storefront"}'::jsonb,
      'worker',
      null,
      'b2-010-public-after-approval',
      'trace-b2-010-a'
    )
  ),
  'published',
  'approved gallery media can register its public storefront WebP'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$select * from api.register_media_asset_object(
      '51000000-0000-4000-8000-000000000010',
      %L,
      'storefront_webp',
      'agentefer-catalog-public',
      %L,
      decode(%L, 'hex'),
      'image/webp',
      1900,
      1000,
      750,
      '{"codec":"webp","purpose":"storefront"}'::jsonb,
      'member',
      '51000000-0000-4000-8000-000000000002',
      'b2-010-operator-publish',
      'trace-b2-010-a'
    )$statement$,
    (select media_asset_id from b2_010_asset_a),
    '51000000-0000-4000-8000-000000000010/'
      || (select media_asset_id::text from b2_010_asset_a)
      || '/storefront_webp/'
      || encode(extensions.digest(convert_to('b2-010-operator-storefront-a', 'UTF8'), 'sha256'), 'hex')
      || '.webp',
    encode(extensions.digest(convert_to('b2-010-operator-storefront-a', 'UTF8'), 'sha256'), 'hex')
  ),
  '42501',
  'operator cannot publish a public storefront derivative'
);

-- RLS tenant isolation and append-only history.
set local role authenticated;
select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from api.media_asset_objects),
  3,
  'owner sees every registered object from own organization'
);
select extensions.is(
  (select count(*)::integer from api.product_media),
  1,
  'owner sees own product gallery relation'
);
select extensions.is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'agentefer-catalog-private'
  ),
  2,
  'owner can read own private Storage metadata through tenant path policy'
);

select set_config('request.jwt.claim.sub', '51000000-0000-4000-8000-000000000003', true);

select extensions.is(
  (select count(*)::integer from api.media_asset_objects),
  0,
  'viewer cannot read private media object locations'
);
select extensions.is(
  (select count(*)::integer from api.product_media),
  1,
  'viewer can read approved product gallery metadata for own organization'
);
select extensions.is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'agentefer-catalog-private'
  ),
  0,
  'viewer cannot read private Storage object metadata'
);

select set_config('request.jwt.claim.sub', '52000000-0000-4000-8000-000000000001', true);

select extensions.is(
  (select count(*)::integer from api.media_asset_objects),
  0,
  'other organization owner cannot read media object registry rows'
);
select extensions.is(
  (select count(*)::integer from api.product_media),
  0,
  'other organization owner cannot read product gallery rows'
);
select extensions.is(
  (
    select count(*)::integer
    from storage.objects
    where bucket_id = 'agentefer-catalog-private'
  ),
  0,
  'other organization owner cannot read private Storage metadata'
);

set local role service_role;

select pg_temp.throws_sqlstate(
  format(
    $statement$update app_private.media_asset_objects
      set object_path = 'rewritten/path.jpg'
      where id = %L$statement$,
    (select media_asset_object_id from b2_010_original_a)
  ),
  '23514',
  'verified media object identity cannot be rewritten'
);

set local role postgres;

select pg_temp.throws_sqlstate(
  format(
    $statement$delete from app_private.media_asset_objects where id = %L$statement$,
    (select media_asset_object_id from b2_010_original_a)
  ),
  '42501',
  'media object history cannot be deleted'
);
select pg_temp.throws_sqlstate(
  format(
    $statement$delete from app_private.product_media where id = %L$statement$,
    (select product_media_id from b2_010_product_media_a)
  ),
  '42501',
  'product gallery history cannot be deleted'
);

set local role service_role;

select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = '51000000-0000-4000-8000-000000000010'
      and event_type in (
        'media.ingest.started',
        'media.storage.registered',
        'media.ingest.verified',
        'media.gallery.linked',
        'media.gallery.approved',
        'media.storage.published'
      )
  ),
  7,
  'each successful media lifecycle transition is audit recorded once'
);
select extensions.is(
  (
    select count(*)::integer
    from app_private.audit_events
    where organization_id = '51000000-0000-4000-8000-000000000010'
      and (
        metadata_safe ? 'object_path'
        or metadata_safe ? 'signed_url'
        or metadata_safe ? 'public_url'
      )
  ),
  0,
  'audit events do not persist object paths or delivery URLs'
);
select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as function_value
    inner join pg_catalog.pg_namespace as namespace_value
      on namespace_value.oid = function_value.pronamespace
    where namespace_value.nspname in ('app_private', 'api')
      and function_value.prosecdef
      and not (
        'search_path=""' = any(coalesce(function_value.proconfig, '{}'::text[]))
      )
  ),
  0,
  'all security-definer functions still pin an empty search_path'
);

select * from extensions.finish();
rollback;
