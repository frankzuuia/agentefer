begin;

create function api.complete_whatsapp_media_ingest_v2(
  target_organization_id uuid,
  target_request_id uuid,
  target_worker_id text,
  target_lease_token uuid,
  target_media_asset_id uuid,
  target_content_sha256 bytea
)
returns table (request_id uuid, status text, media_asset_id uuid, was_replayed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_record app_private.media_ingest_requests%rowtype;
  asset_record app_private.media_assets%rowtype;
  was_replay boolean := false;
begin
  if target_organization_id is null
    or target_request_id is null
    or target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or target_lease_token is null
    or target_media_asset_id is null
    or target_content_sha256 is null
    or octet_length(target_content_sha256) <> 32 then
    raise exception using errcode = '22023', message = 'media ingest completion arguments are invalid';
  end if;

  select request_value.* into request_record
  from app_private.media_ingest_requests as request_value
  where request_value.organization_id = target_organization_id
    and request_value.id = target_request_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'media ingest request was not found';
  end if;

  select asset_value.* into asset_record
  from app_private.media_assets as asset_value
  where asset_value.organization_id = target_organization_id
    and asset_value.id = target_media_asset_id
  for update;
  if not found
    or asset_record.content_sha256 is distinct from target_content_sha256
    or asset_record.ingest_status <> 'verified' then
    raise exception using errcode = '23514', message = 'verified content-addressed media asset is required';
  end if;

  if request_record.status = 'succeeded' then
    if request_record.media_asset_id is distinct from target_media_asset_id then
      raise exception using errcode = '23514', message = 'media ingest completion replay conflicts';
    end if;
    was_replay := true;
  elsif request_record.status <> 'processing'
    or request_record.lease_owner is distinct from target_worker_id
    or request_record.lease_token is distinct from target_lease_token
    or request_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '42501', message = 'media ingest request lease is invalid';
  else
    update app_private.media_ingest_requests as request_update
    set status = 'succeeded',
        media_asset_id = target_media_asset_id,
        completed_at = statement_timestamp(),
        processing_started_at = null,
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        last_error_code = null,
        updated_at = statement_timestamp()
    where request_update.organization_id = target_organization_id
      and request_update.id = target_request_id;

    update app_private.messages as message_update
    set status = 'received',
        processed_at = null,
        updated_at = statement_timestamp()
    where message_update.organization_id = target_organization_id
      and message_update.channel_connection_id = request_record.channel_connection_id
      and message_update.id = request_record.message_id
      and message_update.status = 'processed';

    perform app_private.insert_agent_audit_event(
      target_organization_id,
      'media.ingest.request_succeeded',
      'worker',
      null,
      'media-request:' || target_request_id::text,
      null,
      jsonb_build_object('request_id', target_request_id, 'media_asset_id', target_media_asset_id)
    );
  end if;

  request_id := target_request_id;
  status := 'succeeded';
  media_asset_id := target_media_asset_id;
  was_replayed := was_replay;
  return next;
end;
$$;

revoke all on function api.complete_whatsapp_media_ingest_v2(uuid, uuid, text, uuid, uuid, bytea)
from public, anon, authenticated, service_role;
grant execute on function api.complete_whatsapp_media_ingest_v2(uuid, uuid, text, uuid, uuid, bytea)
to service_role;

notify pgrst, 'reload schema';

commit;
