begin;

select extensions.plan(12);

select has_table('app_private', 'media_ingest_requests', 'media ingest requests table exists');
select col_not_null('app_private', 'media_ingest_requests', 'provider_media_id', 'provider media id is required');
select col_not_null('app_private', 'media_ingest_requests', 'status', 'media request status is required');
select has_index('app_private', 'media_ingest_requests_claim_idx', 'claim index exists');
select function_privs_are(
  'api',
  'claim_whatsapp_media_ingest',
  ARRAY['text','integer','integer','uuid'],
  'public',
  ARRAY[]::text[],
  'claim function is not public'
);
select function_privs_are(
  'api',
  'complete_whatsapp_media_ingest',
  ARRAY['uuid','uuid','text','uuid','uuid'],
  'public',
  ARRAY[]::text[],
  'complete function is not public'
);
select function_privs_are(
  'api',
  'fail_whatsapp_media_ingest',
  ARRAY['uuid','uuid','text','uuid','text','boolean','integer','integer'],
  'public',
  ARRAY[]::text[],
  'failure function is not public'
);
select has_function('api', 'claim_whatsapp_media_ingest', ARRAY['text','integer','integer','uuid'], 'claim function exists');
select has_function('api', 'complete_whatsapp_media_ingest', ARRAY['uuid','uuid','text','uuid','uuid'], 'complete function exists');
select has_function('api', 'fail_whatsapp_media_ingest', ARRAY['uuid','uuid','text','uuid','text','boolean','integer','integer'], 'failure function exists');
select has_trigger('app_private', 'messages', 'messages_enqueue_whatsapp_image_ingest', 'message trigger enqueues image ingest');
select has_function('api', 'get_whatsapp_media_visual_inputs', ARRAY['uuid','uuid','text','uuid','uuid[]'], 'visual input function exists');
select function_privs_are(
  'api',
  'get_whatsapp_media_visual_inputs',
  ARRAY['uuid','uuid','text','uuid','uuid[]'],
  'public',
  ARRAY[]::text[],
  'visual input function is not public'
);

select * from finish();
rollback;
