begin;

create function api.recover_expired_whatsapp_agent_turns(
  target_worker_id text,
  target_retry_delay_seconds integer default 5,
  target_limit integer default 25,
  target_organization_id uuid default null
)
returns table (
  scanned_count integer,
  recovered_count integer,
  retryable_count integer,
  failed_count integer,
  uncertain_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate record;
  recovery record;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 1 and 160
    or target_retry_delay_seconds not between 0 and 3600
    or target_limit not between 1 and 100 then
    raise exception using errcode = '22023', message = 'WhatsApp agent recovery parameters are invalid';
  end if;

  scanned_count := 0;
  recovered_count := 0;
  retryable_count := 0;
  failed_count := 0;
  uncertain_count := 0;

  for candidate in
    select job_value.organization_id, job_value.id as agent_job_id
    from app_private.agent_jobs as job_value
    join app_private.agent_runs as run_value
      on run_value.organization_id = job_value.organization_id
     and run_value.id = job_value.run_id
    join app_private.channel_connections as connection_value
      on connection_value.organization_id = run_value.organization_id
     and connection_value.id = run_value.channel_connection_id
    where (target_organization_id is null or job_value.organization_id = target_organization_id)
      and job_value.status = 'processing'
      and job_value.lease_expires_at <= statement_timestamp()
      and run_value.run_kind = 'conversation_turn'
      and connection_value.provider = 'meta'
      and connection_value.channel = 'whatsapp'
      and connection_value.status = 'active'
    order by job_value.lease_expires_at, job_value.id
    for update of job_value skip locked
    limit target_limit
  loop
    scanned_count := scanned_count + 1;

    select * into recovery
    from api.recover_expired_agent_job(
      candidate.organization_id,
      candidate.agent_job_id,
      target_worker_id,
      target_retry_delay_seconds
    );

    if recovery.recovered then
      recovered_count := recovered_count + 1;
      retryable_count := retryable_count + case when recovery.job_status = 'retryable' then 1 else 0 end;
      failed_count := failed_count + case when recovery.job_status = 'failed' then 1 else 0 end;
      uncertain_count := uncertain_count + case when recovery.job_status = 'uncertain' then 1 else 0 end;
    end if;
  end loop;

  return next;
end;
$$;

revoke all on function api.recover_expired_whatsapp_agent_turns(text, integer, integer, uuid)
  from public, anon, authenticated, service_role;
grant execute on function api.recover_expired_whatsapp_agent_turns(text, integer, integer, uuid)
  to service_role;

comment on function api.recover_expired_whatsapp_agent_turns(text, integer, integer, uuid)
  is 'Recovers expired Meta WhatsApp cognitive leases in bounded tenant-safe batches without exposing conversation content or credentials.';

notify pgrst, 'reload schema';

commit;
