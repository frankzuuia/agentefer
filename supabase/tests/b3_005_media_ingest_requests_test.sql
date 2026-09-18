begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(16);

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

select extensions.has_table('app_private', 'media_ingest_requests', 'media ingest requests table exists');
select extensions.col_not_null('app_private', 'media_ingest_requests', 'provider_media_id', 'provider media id is required');
select extensions.col_not_null('app_private', 'media_ingest_requests', 'status', 'media request status is required');
select extensions.has_index(
  'app_private',
  'media_ingest_requests',
  'media_ingest_requests_claim_idx',
  'claim index exists'
);
select extensions.function_privs_are(
  'api',
  'claim_whatsapp_media_ingest',
  ARRAY['text','integer','integer','uuid'],
  'public',
  ARRAY[]::text[],
  'claim function is not public'
);
select extensions.function_privs_are(
  'api',
  'complete_whatsapp_media_ingest',
  ARRAY['uuid','uuid','text','uuid','uuid'],
  'public',
  ARRAY[]::text[],
  'complete function is not public'
);
select extensions.function_privs_are(
  'api',
  'complete_whatsapp_media_ingest_v2',
  ARRAY['uuid','uuid','text','uuid','uuid','bytea'],
  'public',
  ARRAY[]::text[],
  'content-addressed complete function is not public'
);
select extensions.function_privs_are(
  'api',
  'fail_whatsapp_media_ingest',
  ARRAY['uuid','uuid','text','uuid','text','boolean','integer','integer'],
  'public',
  ARRAY[]::text[],
  'failure function is not public'
);
select extensions.has_function('api', 'claim_whatsapp_media_ingest', ARRAY['text','integer','integer','uuid'], 'claim function exists');
select extensions.has_function('api', 'complete_whatsapp_media_ingest', ARRAY['uuid','uuid','text','uuid','uuid'], 'complete function exists');
select extensions.has_function('api', 'complete_whatsapp_media_ingest_v2', ARRAY['uuid','uuid','text','uuid','uuid','bytea'], 'content-addressed complete function exists');
select extensions.has_function('api', 'fail_whatsapp_media_ingest', ARRAY['uuid','uuid','text','uuid','text','boolean','integer','integer'], 'failure function exists');
select extensions.has_trigger('app_private', 'messages', 'messages_enqueue_whatsapp_image_ingest', 'message trigger enqueues image ingest');
select extensions.has_function('api', 'get_whatsapp_media_visual_inputs', ARRAY['uuid','uuid','text','uuid','uuid[]'], 'visual input function exists');
select extensions.function_privs_are(
  'api',
  'get_whatsapp_media_visual_inputs',
  ARRAY['uuid','uuid','text','uuid','uuid[]'],
  'public',
  ARRAY[]::text[],
  'visual input function is not public'
);
select pg_temp.throws_sqlstate(
  $$select * from api.complete_whatsapp_media_ingest_v2(null, null, null, null, null, null)$$,
  '22023',
  'content-addressed completion rejects missing identity evidence'
);

select * from extensions.finish();
rollback;
