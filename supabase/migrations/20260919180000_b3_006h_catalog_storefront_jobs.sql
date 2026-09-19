begin;

-- A bounded, recoverable promotion queue; photo bytes remain in Storage, never Postgres.
create table app_private.catalog_storefront_jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  media_asset_id uuid not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  available_at timestamptz not null default statement_timestamp(),
  worker_id text,
  lease_token uuid,
  lease_expires_at timestamptz,
  error_code text,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint catalog_storefront_jobs_org_asset_unique unique(organization_id,media_asset_id),
  constraint catalog_storefront_jobs_asset_fk foreign key(organization_id,media_asset_id)
    references app_private.media_assets(organization_id,id) on delete restrict,
  constraint catalog_storefront_jobs_status_valid
    check(status in ('pending','processing','retryable','succeeded','failed','cancelled')),
  constraint catalog_storefront_jobs_attempt_valid check(attempt_count between 0 and 100),
  constraint catalog_storefront_jobs_lease_valid check(
    (status='processing' and worker_id is not null and lease_token is not null
      and lease_expires_at is not null)
    or (status<>'processing' and worker_id is null and lease_token is null
      and lease_expires_at is null)),
  constraint catalog_storefront_jobs_error_valid check(error_code is null or
    (error_code=btrim(error_code) and char_length(error_code) between 1 and 120))
);
create index catalog_storefront_jobs_claim_idx
  on app_private.catalog_storefront_jobs(status,available_at,created_at,id)
  where status in ('pending','retryable','processing');
alter table app_private.catalog_storefront_jobs enable row level security;
alter table app_private.catalog_storefront_jobs force row level security;
revoke all on app_private.catalog_storefront_jobs from public,anon,authenticated,service_role;

create function app_private.queue_catalog_storefront_on_approval()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='approved' and
    (tg_op='INSERT' or old.status is distinct from 'approved') and
    not exists(select 1 from app_private.media_asset_objects o
      where o.organization_id=new.organization_id and o.media_asset_id=new.media_asset_id
        and o.rendition_kind='storefront_webp' and o.status='published') then
    insert into app_private.catalog_storefront_jobs(organization_id,media_asset_id)
    values(new.organization_id,new.media_asset_id)
    on conflict(organization_id,media_asset_id) do update
      set status=case when app_private.catalog_storefront_jobs.status in ('failed','cancelled')
        then 'pending' else app_private.catalog_storefront_jobs.status end,
        attempt_count=case when app_private.catalog_storefront_jobs.status in ('failed','cancelled')
          then 0 else app_private.catalog_storefront_jobs.attempt_count end,
        error_code=case when app_private.catalog_storefront_jobs.status in ('failed','cancelled')
          then null else app_private.catalog_storefront_jobs.error_code end;
  end if;
  if new.status='retired' and tg_op='UPDATE' and old.status='approved'
    and not exists(select 1 from app_private.product_media m
      where m.organization_id=new.organization_id and m.media_asset_id=new.media_asset_id
        and m.id<>new.id and m.status='approved') then
    update app_private.catalog_storefront_jobs set status='cancelled',
      worker_id=null,lease_token=null,lease_expires_at=null
    where organization_id=new.organization_id and media_asset_id=new.media_asset_id
      and status in ('pending','retryable');
  end if;
  return new;
end;
$$;
create trigger product_media_queue_storefront
after insert or update of status on app_private.product_media
for each row execute function app_private.queue_catalog_storefront_on_approval();

insert into app_private.catalog_storefront_jobs(organization_id,media_asset_id)
select distinct m.organization_id,m.media_asset_id
from app_private.product_media m
where m.status='approved' and not exists(select 1 from app_private.media_asset_objects o
  where o.organization_id=m.organization_id and o.media_asset_id=m.media_asset_id
    and o.rendition_kind='storefront_webp' and o.status='published')
on conflict(organization_id,media_asset_id) do nothing;

create function api.claim_catalog_storefront_job(
  target_worker_id text,target_lease_seconds integer,target_max_attempts integer
)
returns table(
  job_id uuid,organization_id uuid,media_asset_id uuid,
  analysis_sha256_hex text,analysis_byte_size bigint,
  analysis_width integer,analysis_height integer,
  lease_token uuid,attempt_number integer
)
language plpgsql security definer set search_path='' as $$
declare selected_job app_private.catalog_storefront_jobs%rowtype;
begin
  if target_worker_id is null or char_length(target_worker_id) not between 1 and 120
    or target_lease_seconds not between 15 and 3600
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode='22023',message='storefront claim request is invalid';
  end if;
  update app_private.catalog_storefront_jobs j set status='failed',
    worker_id=null,lease_token=null,lease_expires_at=null,
    error_code='MAX_ATTEMPTS_EXCEEDED',updated_at=statement_timestamp()
  where j.status='processing' and j.lease_expires_at<statement_timestamp()
    and j.attempt_count>=target_max_attempts;
  select j.* into selected_job from app_private.catalog_storefront_jobs j
  where j.attempt_count<target_max_attempts
    and ((j.status in ('pending','retryable') and j.available_at<=statement_timestamp())
      or (j.status='processing' and j.lease_expires_at<statement_timestamp()))
    and exists(select 1 from app_private.product_media m
      where m.organization_id=j.organization_id and m.media_asset_id=j.media_asset_id
        and m.status='approved')
    and exists(select 1 from app_private.media_asset_objects o
      where o.organization_id=j.organization_id and o.media_asset_id=j.media_asset_id
        and o.rendition_kind='analysis_webp' and o.status='verified')
    and not exists(select 1 from app_private.media_asset_objects o
      where o.organization_id=j.organization_id and o.media_asset_id=j.media_asset_id
        and o.rendition_kind='storefront_webp' and o.status='published')
  order by j.available_at,j.created_at,j.id limit 1 for update skip locked;
  if not found then return; end if;
  update app_private.catalog_storefront_jobs j
  set status='processing',attempt_count=selected_job.attempt_count+1,
    worker_id=target_worker_id,lease_token=extensions.gen_random_uuid(),
    lease_expires_at=statement_timestamp()+make_interval(secs=>target_lease_seconds),
    error_code=null,updated_at=statement_timestamp()
  where j.id=selected_job.id returning j.id,j.organization_id,j.media_asset_id,
    j.lease_token,j.attempt_count
  into job_id,organization_id,media_asset_id,lease_token,attempt_number;
  select encode(o.content_sha256,'hex'),o.byte_size,o.width_pixels,o.height_pixels
  into analysis_sha256_hex,analysis_byte_size,analysis_width,analysis_height
  from app_private.media_asset_objects o
  where o.organization_id=selected_job.organization_id
    and o.media_asset_id=selected_job.media_asset_id
    and o.rendition_kind='analysis_webp' and o.status='verified';
  return next;
end;
$$;

create function api.complete_catalog_storefront_job(
  target_job_id uuid,target_worker_id text,target_lease_token uuid
)
returns boolean language plpgsql security definer set search_path='' as $$
declare current_job app_private.catalog_storefront_jobs%rowtype;
begin
  select * into current_job from app_private.catalog_storefront_jobs
  where id=target_job_id for update;
  if not found then raise exception using errcode='P0002',message='storefront job not found'; end if;
  if current_job.status='succeeded' then return true; end if;
  if current_job.status<>'processing' or current_job.worker_id is distinct from target_worker_id
    or current_job.lease_token is distinct from target_lease_token
    or current_job.lease_expires_at<statement_timestamp() then
    raise exception using errcode='42501',message='storefront job lease is invalid';
  end if;
  if not exists(select 1 from app_private.media_asset_objects o
    where o.organization_id=current_job.organization_id
      and o.media_asset_id=current_job.media_asset_id
      and o.rendition_kind='storefront_webp' and o.status='published') then
    raise exception using errcode='55000',message='public storefront object is not registered';
  end if;
  update app_private.catalog_storefront_jobs set status='succeeded',worker_id=null,
    lease_token=null,lease_expires_at=null,updated_at=statement_timestamp()
  where id=current_job.id;
  return true;
end;
$$;

create function api.fail_catalog_storefront_job(
  target_job_id uuid,target_worker_id text,target_lease_token uuid,
  target_error_code text,target_retryable boolean,target_retry_delay_seconds integer,
  target_max_attempts integer
)
returns text language plpgsql security definer set search_path='' as $$
declare
  current_job app_private.catalog_storefront_jobs%rowtype;
  next_status text;
begin
  if target_error_code is null or char_length(target_error_code) not between 1 and 120
    or target_retryable is null or target_retry_delay_seconds not between 1 and 86400
    or target_max_attempts not between 1 and 100 then
    raise exception using errcode='22023',message='storefront failure report is invalid';
  end if;
  select * into current_job from app_private.catalog_storefront_jobs
  where id=target_job_id for update;
  if not found or current_job.status<>'processing'
    or current_job.worker_id is distinct from target_worker_id
    or current_job.lease_token is distinct from target_lease_token then
    raise exception using errcode='42501',message='storefront job lease is invalid';
  end if;
  next_status:=case when target_retryable and current_job.attempt_count<target_max_attempts
    then 'retryable' else 'failed' end;
  update app_private.catalog_storefront_jobs set status=next_status,
    available_at=statement_timestamp()+make_interval(secs=>target_retry_delay_seconds),
    worker_id=null,lease_token=null,lease_expires_at=null,error_code=target_error_code,
    updated_at=statement_timestamp() where id=current_job.id;
  return next_status;
end;
$$;

revoke all on function app_private.queue_catalog_storefront_on_approval(),
  api.claim_catalog_storefront_job(text,integer,integer),
  api.complete_catalog_storefront_job(uuid,text,uuid),
  api.fail_catalog_storefront_job(uuid,text,uuid,text,boolean,integer,integer)
  from public,anon,authenticated;
grant execute on function api.claim_catalog_storefront_job(text,integer,integer),
  api.complete_catalog_storefront_job(uuid,text,uuid),
  api.fail_catalog_storefront_job(uuid,text,uuid,text,boolean,integer,integer)
  to service_role;

notify pgrst, 'reload schema';

commit;
