begin;

create function app_private.route_ready_whatsapp_image_to_vision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.run_kind = 'conversation_turn'
    and new.vision_provider is not null
    and new.vision_model is not null
    and exists (
      select 1
      from app_private.messages as message_value
      join app_private.media_ingest_requests as request_value
        on request_value.organization_id = message_value.organization_id
       and request_value.message_id = message_value.id
       and request_value.status = 'succeeded'
      where message_value.organization_id = new.organization_id
        and message_value.channel_connection_id = new.channel_connection_id
        and message_value.id = new.trigger_message_id
        and message_value.direction = 'inbound'
        and message_value.provider_message_type = 'image'
    ) then
    new.provider := new.vision_provider;
    new.model := new.vision_model;
  end if;
  return new;
end;
$$;

create trigger agent_runs_route_ready_whatsapp_image_to_vision
before insert on app_private.agent_runs
for each row
execute function app_private.route_ready_whatsapp_image_to_vision();

alter table app_private.agent_runs enable row level security;
alter table app_private.agent_runs force row level security;

revoke all on function app_private.route_ready_whatsapp_image_to_vision() from public, anon, authenticated, service_role;

comment on function app_private.route_ready_whatsapp_image_to_vision() is
  'Selects the configured vision model only for WhatsApp image turns whose private media ingest is verified';

notify pgrst, 'reload schema';

commit;
