begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(5);

select extensions.has_function(
  'app_private',
  'route_ready_whatsapp_image_to_vision',
  ARRAY[]::text[],
  'vision routing trigger function exists'
);
select extensions.has_trigger(
  'app_private',
  'agent_runs',
  'agent_runs_route_ready_whatsapp_image_to_vision',
  'ready WhatsApp image runs use the vision model before job creation'
);
select extensions.function_privs_are(
  'app_private',
  'route_ready_whatsapp_image_to_vision',
  ARRAY[]::text[],
  'public',
  ARRAY[]::text[],
  'vision routing trigger is not public'
);
select extensions.ok(
  pg_get_functiondef(
    'app_private.route_ready_whatsapp_image_to_vision()'::regprocedure
  ) like '%new.provider := new.vision_provider%'
    and pg_get_functiondef(
      'app_private.route_ready_whatsapp_image_to_vision()'::regprocedure
    ) like '%request_value.status = ''succeeded''%',
  'routing requires a succeeded media ingest before selecting vision'
);
select extensions.ok(
  pg_get_functiondef(
    'app_private.route_ready_whatsapp_image_to_vision()'::regprocedure
  ) like '%message_value.provider_message_type = ''image''%',
  'routing is restricted to WhatsApp image messages'
);

select * from extensions.finish();
rollback;
