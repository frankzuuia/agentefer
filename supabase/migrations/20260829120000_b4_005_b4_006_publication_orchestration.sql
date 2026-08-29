begin;

-- B4-005/B4-006 extends the B2-007 publication ledger. It deliberately does
-- not introduce a second queue: Page effects still use publication_jobs.

alter table app_private.publication_jobs
  add column retry_of_job_id uuid,
  add constraint publication_jobs_retry_of_fk
    foreign key (organization_id, retry_of_job_id)
    references app_private.publication_jobs (organization_id, id)
    on delete restrict,
  add constraint publication_jobs_retry_not_self check (
    retry_of_job_id is null or retry_of_job_id <> id
  );

create index publication_jobs_retry_of_idx
  on app_private.publication_jobs (organization_id, retry_of_job_id)
  where retry_of_job_id is not null;

create index publication_jobs_expired_publication_worker_idx
  on app_private.publication_jobs (lease_expires_at, organization_id, id)
  where status = 'processing';

create table app_private.social_publication_dispatch_states (
  organization_id uuid not null,
  social_connection_id uuid not null,
  next_dispatch_at timestamptz not null default statement_timestamp(),
  last_publication_job_id uuid,
  updated_at timestamptz not null default statement_timestamp(),
  primary key (organization_id, social_connection_id),
  constraint social_publication_dispatch_states_connection_fk
    foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id)
    on delete restrict,
  constraint social_publication_dispatch_states_last_job_fk
    foreign key (organization_id, last_publication_job_id)
    references app_private.publication_jobs (organization_id, id)
    on delete restrict
);

insert into app_private.social_publication_dispatch_states (
  organization_id,
  social_connection_id,
  next_dispatch_at
)
select connection_value.organization_id, connection_value.id, statement_timestamp()
from app_private.social_connections as connection_value
on conflict (organization_id, social_connection_id) do nothing;

create table app_private.social_rate_limit_observations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  social_connection_id uuid not null,
  publication_job_id uuid,
  observation_source text not null,
  provider_request_id text,
  retry_after_at timestamptz,
  blocked_until timestamptz,
  usage_snapshot jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null,
  created_at timestamptz not null default statement_timestamp(),
  constraint social_rate_limit_observations_organization_id_id_unique
    unique (organization_id, id),
  constraint social_rate_limit_observations_connection_fk
    foreign key (organization_id, social_connection_id)
    references app_private.social_connections (organization_id, id)
    on delete restrict,
  constraint social_rate_limit_observations_job_fk
    foreign key (organization_id, publication_job_id)
    references app_private.publication_jobs (organization_id, id)
    on delete restrict,
  constraint social_rate_limit_observations_source_valid check (
    observation_source in ('provider_headers', 'provider_error', 'capability_probe')
  ),
  constraint social_rate_limit_observations_provider_request_valid check (
    provider_request_id is null
    or (
      provider_request_id = btrim(provider_request_id)
      and char_length(provider_request_id) between 1 and 512
    )
  ),
  constraint social_rate_limit_observations_usage_valid check (
    jsonb_typeof(usage_snapshot) = 'object'
    and octet_length(usage_snapshot::text) <= 32768
  ),
  constraint social_rate_limit_observations_times_valid check (
    observed_at >= created_at
    and (retry_after_at is null or retry_after_at >= observed_at)
    and (blocked_until is null or blocked_until >= observed_at)
  )
);

create index social_rate_limit_observations_current_idx
  on app_private.social_rate_limit_observations (
    organization_id,
    social_connection_id,
    observed_at desc,
    id desc
  );

create table app_private.publication_batch_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  publication_batch_id uuid not null,
  origin_agent_run_id uuid not null,
  channel_connection_id uuid not null,
  conversation_id uuid not null,
  destination_identity_id uuid not null,
  status text not null default 'pending',
  attempt_count integer not null default 0,
  max_attempts integer not null default 8,
  available_at timestamptz not null default statement_timestamp(),
  lease_token uuid,
  lease_expires_at timestamptz,
  summary_payload jsonb,
  provider_request_id text,
  message_id uuid,
  outbox_event_id uuid,
  last_error_code text,
  completed_at timestamptz,
  created_at timestamptz not null default statement_timestamp(),
  updated_at timestamptz not null default statement_timestamp(),
  constraint publication_batch_subscriptions_organization_id_id_unique
    unique (organization_id, id),
  constraint publication_batch_subscriptions_batch_unique
    unique (organization_id, publication_batch_id),
  constraint publication_batch_subscriptions_batch_fk
    foreign key (organization_id, publication_batch_id)
    references app_private.publication_batches (organization_id, id)
    on delete restrict,
  constraint publication_batch_subscriptions_run_fk
    foreign key (organization_id, origin_agent_run_id)
    references app_private.agent_runs (organization_id, id)
    on delete restrict,
  constraint publication_batch_subscriptions_conversation_fk
    foreign key (organization_id, channel_connection_id, conversation_id)
    references app_private.conversations (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint publication_batch_subscriptions_destination_fk
    foreign key (organization_id, channel_connection_id, destination_identity_id)
    references app_private.channel_identities (
      organization_id,
      channel_connection_id,
      id
    )
    on delete restrict,
  constraint publication_batch_subscriptions_message_fk
    foreign key (organization_id, channel_connection_id, message_id)
    references app_private.messages (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint publication_batch_subscriptions_outbox_fk
    foreign key (organization_id, channel_connection_id, outbox_event_id)
    references app_private.outbox_events (organization_id, channel_connection_id, id)
    on delete restrict,
  constraint publication_batch_subscriptions_status_valid check (
    status in (
      'pending', 'ready', 'processing', 'retryable', 'queued',
      'blocked', 'failed', 'cancelled'
    )
  ),
  constraint publication_batch_subscriptions_attempts_valid check (
    max_attempts between 1 and 100
    and attempt_count between 0 and max_attempts
  ),
  constraint publication_batch_subscriptions_processing_valid check (
    (
      status = 'processing'
      and lease_token is not null
      and lease_expires_at is not null
      and lease_expires_at > updated_at
    )
    or (
      status <> 'processing'
      and lease_token is null
      and lease_expires_at is null
    )
  ),
  constraint publication_batch_subscriptions_summary_valid check (
    summary_payload is null
    or (
      jsonb_typeof(summary_payload) = 'object'
      and octet_length(summary_payload::text) <= 131072
    )
  ),
  constraint publication_batch_subscriptions_provider_request_valid check (
    provider_request_id is null
    or (
      provider_request_id = btrim(provider_request_id)
      and char_length(provider_request_id) between 1 and 512
    )
  ),
  constraint publication_batch_subscriptions_error_valid check (
    last_error_code is null
    or (
      last_error_code = btrim(last_error_code)
      and char_length(last_error_code) between 1 and 160
    )
  ),
  constraint publication_batch_subscriptions_delivery_shape check (
    (message_id is null and outbox_event_id is null)
    or (message_id is not null and outbox_event_id is not null)
  ),
  constraint publication_batch_subscriptions_terminal_valid check (
    (
      status in ('queued', 'blocked', 'failed', 'cancelled')
      and completed_at is not null
    )
    or (
      status in ('pending', 'ready', 'processing', 'retryable')
      and completed_at is null
    )
  )
);

create index publication_batch_subscriptions_claim_idx
  on app_private.publication_batch_subscriptions (
    available_at,
    created_at,
    id
  )
  where status in ('ready', 'retryable');

create function app_private.initialize_social_publication_dispatch_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app_private.social_publication_dispatch_states (
    organization_id,
    social_connection_id,
    next_dispatch_at
  ) values (new.organization_id, new.id, statement_timestamp())
  on conflict (organization_id, social_connection_id) do nothing;
  return new;
end;
$$;

create trigger social_connections_initialize_publication_dispatch
after insert on app_private.social_connections
for each row execute function app_private.initialize_social_publication_dispatch_state();

create function app_private.reject_social_rate_limit_observation_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception using
    errcode = '42501',
    message = 'social rate limit observations are append-only';
end;
$$;

create trigger social_rate_limit_observations_reject_update
before update on app_private.social_rate_limit_observations
for each row execute function app_private.reject_social_rate_limit_observation_rewrite();

create trigger social_rate_limit_observations_reject_delete
before delete on app_private.social_rate_limit_observations
for each row execute function app_private.reject_social_rate_limit_observation_rewrite();

create trigger social_publication_dispatch_states_set_updated_at
before update on app_private.social_publication_dispatch_states
for each row execute function app_private.set_updated_at();

create trigger publication_batch_subscriptions_set_updated_at
before update on app_private.publication_batch_subscriptions
for each row execute function app_private.set_updated_at();

alter table app_private.social_publication_dispatch_states enable row level security;
alter table app_private.social_publication_dispatch_states force row level security;
alter table app_private.social_rate_limit_observations enable row level security;
alter table app_private.social_rate_limit_observations force row level security;
alter table app_private.publication_batch_subscriptions enable row level security;
alter table app_private.publication_batch_subscriptions force row level security;

create policy social_publication_dispatch_states_admin_select
on app_private.social_publication_dispatch_states
for select to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = social_publication_dispatch_states.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create policy social_rate_limit_observations_admin_select
on app_private.social_rate_limit_observations
for select to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = social_rate_limit_observations.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create policy publication_batch_subscriptions_admin_select
on app_private.publication_batch_subscriptions
for select to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = publication_batch_subscriptions.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  )
);

create function api.record_social_rate_limit_observation(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_lease_token uuid,
  target_observation_source text,
  target_provider_request_id text,
  target_retry_after_at timestamptz,
  target_blocked_until timestamptz,
  target_usage_snapshot jsonb,
  target_observed_at timestamptz default statement_timestamp()
)
returns table (
  social_rate_limit_observation_id uuid,
  social_connection_id uuid,
  next_dispatch_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.publication_jobs%rowtype;
  target_connection_id uuid;
  target_observation_id uuid;
  target_next_dispatch_at timestamptz;
begin
  if target_usage_snapshot is null or jsonb_typeof(target_usage_snapshot) <> 'object' then
    raise exception using errcode = '22023', message = 'rate limit usage snapshot must be an object';
  end if;

  select job_value.*
  into job_record
  from app_private.publication_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = target_publication_job_id
    and job_value.status = 'processing'
    and job_value.lease_token = target_lease_token
    and job_value.lease_expires_at > target_observed_at
  for update;

  if not found then
    raise exception using errcode = '40001', message = 'rate limit observation requires an active publication lease';
  end if;

  select publication_value.social_connection_id
  into target_connection_id
  from app_private.publications as publication_value
  where publication_value.organization_id = target_organization_id
    and publication_value.id = job_record.publication_id;

  insert into app_private.social_rate_limit_observations (
    organization_id,
    social_connection_id,
    publication_job_id,
    observation_source,
    provider_request_id,
    retry_after_at,
    blocked_until,
    usage_snapshot,
    observed_at,
    created_at
  ) values (
    target_organization_id,
    target_connection_id,
    target_publication_job_id,
    target_observation_source,
    target_provider_request_id,
    target_retry_after_at,
    target_blocked_until,
    target_usage_snapshot,
    target_observed_at,
    target_observed_at
  ) returning id into target_observation_id;

  target_next_dispatch_at := greatest(
    target_observed_at,
    coalesce(target_retry_after_at, target_observed_at),
    coalesce(target_blocked_until, target_observed_at)
  );

  update app_private.social_publication_dispatch_states
  set next_dispatch_at = greatest(next_dispatch_at, target_next_dispatch_at)
  where organization_id = target_organization_id
    and social_connection_id = target_connection_id
  returning app_private.social_publication_dispatch_states.next_dispatch_at
  into target_next_dispatch_at;

  update app_private.publication_jobs as pending_job
  set available_at = greatest(pending_job.available_at, target_next_dispatch_at)
  from app_private.publications as pending_publication
  where pending_job.organization_id = target_organization_id
    and pending_job.status in ('pending', 'retryable')
    and pending_publication.organization_id = pending_job.organization_id
    and pending_publication.id = pending_job.publication_id
    and pending_publication.social_connection_id = target_connection_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    null,
    'publication_job',
    target_publication_job_id,
    'publication.rate_limit_observed',
    'processing',
    'processing',
    target_observation_source,
    jsonb_build_object(
      'observation_id', target_observation_id,
      'retry_after_at', target_retry_after_at,
      'blocked_until', target_blocked_until,
      'next_dispatch_at', target_next_dispatch_at,
      'usage', target_usage_snapshot
    ),
    null,
    target_observed_at
  );

  return query select target_observation_id, target_connection_id, target_next_dispatch_at;
end;
$$;

create function api.claim_facebook_publication_job(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_organization_id uuid default null,
  target_now timestamptz default statement_timestamp()
)
returns table (
  publication_job_id uuid,
  organization_id uuid,
  publication_batch_id uuid,
  publication_id uuid,
  publication_version_id uuid,
  operation text,
  external_effect_key text,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer,
  max_attempts integer,
  page_id text,
  api_version text,
  access_token text,
  headline text,
  body text,
  call_to_action text,
  content_payload jsonb,
  pricing_status text,
  price_amount numeric,
  currency_code text,
  media jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  job_record app_private.publication_jobs%rowtype;
  publication_record app_private.publications%rowtype;
  version_record app_private.publication_versions%rowtype;
  connection_record app_private.social_connections%rowtype;
  generated_lease_token uuid;
  spacing_seconds numeric := 0;
  credential_value text;
  media_value jsonb;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 3 and 200 then
    raise exception using errcode = '22023', message = 'publication worker identifier is invalid';
  end if;
  if target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'publication job lease must be between 15 and 900 seconds';
  end if;

  select job_value.*
  into job_record
  from app_private.publication_jobs as job_value
  join app_private.publications as publication_value
    on publication_value.organization_id = job_value.organization_id
   and publication_value.id = job_value.publication_id
  join app_private.social_publication_dispatch_states as dispatch_value
    on dispatch_value.organization_id = publication_value.organization_id
   and dispatch_value.social_connection_id = publication_value.social_connection_id
  left join app_private.publication_batches as batch_value
    on batch_value.organization_id = job_value.organization_id
   and batch_value.id = job_value.batch_id
  join lateral (
    select capability_row.capability_constraints
    from app_private.social_capabilities as capability_row
    where capability_row.organization_id = publication_value.organization_id
      and capability_row.social_connection_id = publication_value.social_connection_id
      and capability_row.capability_code = job_value.capability_code
      and capability_row.status = 'granted'
      and (
        capability_row.valid_until is null
        or capability_row.valid_until > target_now
      )
    order by capability_row.observed_at desc, capability_row.created_at desc, capability_row.id desc
    limit 1
  ) as capability_value on true
  where job_value.status in ('pending', 'retryable')
    and job_value.operation in ('publish', 'refresh')
    and job_value.available_at <= target_now
    and job_value.attempt_count < job_value.max_attempts
    and (target_organization_id is null or job_value.organization_id = target_organization_id)
    and dispatch_value.next_dispatch_at <= target_now
    and (
      (
        batch_value.id is null
        and jsonb_typeof(
          capability_value.capability_constraints #> '{dispatch_policy,minimum_spacing_seconds}'
        ) = 'number'
        and (
          capability_value.capability_constraints #>> '{dispatch_policy,minimum_spacing_seconds}'
        )::numeric > 0
      )
      or (
        batch_value.status not in ('paused', 'cancelling', 'completed', 'partially_failed', 'cancelled')
        and jsonb_typeof(batch_value.policy_snapshot -> 'minimum_spacing_seconds') = 'number'
        and (batch_value.policy_snapshot ->> 'minimum_spacing_seconds')::numeric > 0
      )
    )
  order by job_value.priority, job_value.available_at, job_value.created_at, job_value.id
  for update of job_value, dispatch_value skip locked
  limit 1;

  if not found then
    return;
  end if;

  select publication_value.*
  into strict publication_record
  from app_private.publications as publication_value
  where publication_value.organization_id = job_record.organization_id
    and publication_value.id = job_record.publication_id;

  if job_record.batch_id is not null then
    select (batch_value.policy_snapshot ->> 'minimum_spacing_seconds')::numeric
    into spacing_seconds
    from app_private.publication_batches as batch_value
    where batch_value.organization_id = job_record.organization_id
      and batch_value.id = job_record.batch_id;
  else
    select (
      capability_value.capability_constraints #>> '{dispatch_policy,minimum_spacing_seconds}'
    )::numeric
    into spacing_seconds
    from app_private.social_capabilities as capability_value
    where capability_value.organization_id = job_record.organization_id
      and capability_value.social_connection_id = publication_record.social_connection_id
      and capability_value.capability_code = job_record.capability_code
      and capability_value.status = 'granted'
      and (
        capability_value.valid_until is null
        or capability_value.valid_until > target_now
      )
    order by capability_value.observed_at desc, capability_value.created_at desc, capability_value.id desc
    limit 1;
  end if;

  generated_lease_token := extensions.gen_random_uuid();

  update app_private.publication_jobs as claimed_job
  set status = 'processing',
      attempt_count = claimed_job.attempt_count + 1,
      lease_token = generated_lease_token,
      processing_started_at = target_now,
      lease_expires_at = target_now + make_interval(secs => target_lease_seconds),
      authorized_at = null,
      authorization_snapshot = null,
      effect_started_at = null,
      provider_request_id = null,
      last_error_class = null,
      last_error_code = null,
      last_error_summary = null
  where claimed_job.organization_id = job_record.organization_id
    and claimed_job.id = job_record.id;

  update app_private.social_publication_dispatch_states
  set next_dispatch_at = target_now + make_interval(secs => spacing_seconds::double precision),
      last_publication_job_id = job_record.id
  where app_private.social_publication_dispatch_states.organization_id = job_record.organization_id
    and app_private.social_publication_dispatch_states.social_connection_id = publication_record.social_connection_id;

  if job_record.batch_id is not null then
    update app_private.publication_batches
    set status = 'running'
    where app_private.publication_batches.organization_id = job_record.organization_id
      and app_private.publication_batches.id = job_record.batch_id
      and app_private.publication_batches.status in ('pending', 'queued');
  end if;

  select version_value.*
  into version_record
  from app_private.publication_versions as version_value
  where version_value.organization_id = job_record.organization_id
    and version_value.publication_id = job_record.publication_id
    and version_value.id = job_record.target_version_id;

  select connection_value.*
  into connection_record
  from app_private.social_connections as connection_value
  where connection_value.organization_id = job_record.organization_id
    and connection_value.id = publication_record.social_connection_id;

  select secret_value.decrypted_secret
  into credential_value
  from app_private.meta_applications as application_value
  join app_private.meta_credential_versions as credential_record
    on credential_record.organization_id = application_value.organization_id
   and credential_record.meta_application_id = application_value.id
  join vault.decrypted_secrets as secret_value
    on secret_value.id = credential_record.vault_secret_id
  where application_value.organization_id = job_record.organization_id
    and application_value.external_app_id = connection_record.external_app_id
    and credential_record.credential_kind = 'system_user_access_token'
    and credential_record.status = 'current'
    and connection_record.credential_reference =
      'meta-credential-version://' || credential_record.id::text
  order by credential_record.version_number desc
  limit 1;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'media_asset_id', publication_media_value.media_asset_id,
      'media_role', publication_media_value.media_role,
      'ordinal', publication_media_value.ordinal,
      'bucket_id', object_value.bucket_id,
      'object_path', object_value.object_path,
      'mime_type', object_value.mime_type,
      'byte_size', object_value.byte_size
    ) order by
      case publication_media_value.media_role when 'primary' then 0 else 1 end,
      publication_media_value.ordinal,
      publication_media_value.id
  ), '[]'::jsonb)
  into media_value
  from app_private.publication_media as publication_media_value
  join app_private.media_asset_objects as object_value
    on object_value.organization_id = publication_media_value.organization_id
   and object_value.media_asset_id = publication_media_value.media_asset_id
   and object_value.rendition_kind = 'storefront_webp'
   and object_value.status = 'published'
  where publication_media_value.organization_id = job_record.organization_id
    and publication_media_value.publication_version_id = job_record.target_version_id;

  perform app_private.insert_publication_event(
    job_record.organization_id,
    null,
    'publication_job',
    job_record.id,
    'publication_job.claimed',
    job_record.status,
    'processing',
    null,
    jsonb_build_object(
      'worker_id', target_worker_id,
      'lease_token', generated_lease_token,
      'lease_expires_at', target_now + make_interval(secs => target_lease_seconds),
      'attempt_count', job_record.attempt_count + 1,
      'next_dispatch_at', target_now + make_interval(secs => spacing_seconds::double precision)
    ),
    null,
    target_now
  );

  return query select
    job_record.id,
    job_record.organization_id,
    job_record.batch_id,
    job_record.publication_id,
    job_record.target_version_id,
    job_record.operation,
    job_record.external_effect_key,
    generated_lease_token,
    target_now + make_interval(secs => target_lease_seconds),
    job_record.attempt_count + 1,
    job_record.max_attempts,
    connection_record.external_account_id,
    connection_record.api_version,
    credential_value,
    version_record.headline,
    version_record.body,
    version_record.call_to_action,
    version_record.content_payload,
    version_record.pricing_status,
    version_record.price_amount,
    version_record.currency_code,
    media_value;
end;
$$;

create function api.recover_expired_facebook_publication_jobs(
  target_limit integer default 100,
  target_organization_id uuid default null,
  target_now timestamptz default statement_timestamp()
)
returns table (
  scanned_count integer,
  retryable_count integer,
  failed_count integer,
  uncertain_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_job record;
  recovered_job record;
  scanned_value integer := 0;
  retryable_value integer := 0;
  failed_value integer := 0;
  uncertain_value integer := 0;
begin
  if target_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'publication recovery limit must be between 1 and 1000';
  end if;

  for expired_job in
    select job_value.organization_id, job_value.id
    from app_private.publication_jobs as job_value
    where job_value.status = 'processing'
      and job_value.lease_expires_at <= target_now
      and (target_organization_id is null or job_value.organization_id = target_organization_id)
    order by job_value.lease_expires_at, job_value.created_at, job_value.id
    for update skip locked
    limit target_limit
  loop
    select * into recovered_job
    from api.recover_expired_publication_job(
      expired_job.organization_id,
      expired_job.id,
      target_now
    );

    scanned_value := scanned_value + 1;
    retryable_value := retryable_value + case when recovered_job.status = 'retryable' then 1 else 0 end;
    failed_value := failed_value + case when recovered_job.status = 'failed' then 1 else 0 end;
    uncertain_value := uncertain_value + case when recovered_job.status = 'uncertain' then 1 else 0 end;
  end loop;

  return query select scanned_value, retryable_value, failed_value, uncertain_value;
end;
$$;

create function api.transition_publication_batch_pause(
  target_organization_id uuid,
  target_publication_batch_id uuid,
  target_idempotency_key text,
  target_action text,
  target_reason text,
  target_resume_at timestamptz default statement_timestamp(),
  target_created_by_user_id uuid default null
)
returns table (
  publication_batch_id uuid,
  status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  command_claim record;
  target_command_id uuid;
  batch_record app_private.publication_batches%rowtype;
  target_status text;
begin
  if target_action not in ('pause', 'resume') then
    raise exception using errcode = '22023', message = 'batch pause action must be pause or resume';
  end if;

  select * into command_claim
  from app_private.claim_publication_command(
    target_organization_id,
    target_idempotency_key,
    'publication_batch.' || target_action,
    jsonb_build_object(
      'publication_batch_id', target_publication_batch_id,
      'action', target_action,
      'reason', target_reason,
      'resume_at', target_resume_at
    ),
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );
  target_command_id := command_claim.claimed_command_id;

  select batch_value.*
  into batch_record
  from app_private.publication_batches as batch_value
  where batch_value.organization_id = target_organization_id
    and batch_value.id = target_publication_batch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'publication batch was not found';
  end if;

  if command_claim.was_replayed then
    return query select target_publication_batch_id, batch_record.status, true;
    return;
  end if;

  if batch_record.status in ('completed', 'partially_failed', 'cancelled', 'cancelling') then
    raise exception using errcode = '23514', message = 'terminal or cancelling publication batch cannot change pause state';
  end if;

  if target_action = 'pause' then
    target_status := 'paused';
  else
    if batch_record.status <> 'paused' then
      raise exception using errcode = '23514', message = 'only a paused publication batch can resume';
    end if;
    target_status := 'queued';
    update app_private.publication_jobs
    set available_at = greatest(available_at, target_resume_at)
    where organization_id = target_organization_id
      and batch_id = target_publication_batch_id
      and status in ('pending', 'retryable');
  end if;

  update app_private.publication_batches
  set status = target_status
  where organization_id = target_organization_id
    and id = target_publication_batch_id;

  perform app_private.insert_publication_event(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_publication_batch_id,
    'publication_batch.' || target_action || 'd',
    batch_record.status,
    target_status,
    target_reason,
    jsonb_build_object('resume_at', case when target_action = 'resume' then target_resume_at end),
    target_created_by_user_id
  );
  perform app_private.complete_publication_command(
    target_organization_id,
    target_command_id,
    'publication_batch',
    target_publication_batch_id
  );

  return query select target_publication_batch_id, target_status, false;
end;
$$;

create function api.retry_publication_job(
  target_organization_id uuid,
  target_publication_job_id uuid,
  target_idempotency_key text,
  target_available_at timestamptz default statement_timestamp(),
  target_created_by_user_id uuid default null
)
returns table (
  publication_job_id uuid,
  retry_of_job_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_job app_private.publication_jobs%rowtype;
  latest_certainty text;
  enqueued record;
  target_effect_key text;
begin
  perform app_private.assert_publication_actor(
    target_organization_id,
    target_created_by_user_id,
    array['owner', 'admin']::text[]
  );

  select job_value.*
  into source_job
  from app_private.publication_jobs as job_value
  where job_value.organization_id = target_organization_id
    and job_value.id = target_publication_job_id
  for update;

  if not found or source_job.status not in ('blocked', 'failed') then
    raise exception using errcode = '23514', message = 'only a blocked or failed publication job can be retried';
  end if;

  select event_value.event_payload ->> 'effect_certainty'
  into latest_certainty
  from app_private.publication_events as event_value
  where event_value.organization_id = target_organization_id
    and event_value.job_id = target_publication_job_id
    and event_value.event_type = 'publication_job.result_recorded'
  order by event_value.occurred_at desc, event_value.id desc
  limit 1;

  if source_job.status = 'failed'
    and latest_certainty not in ('not_started', 'confirmed_not_applied') then
    raise exception using errcode = '23514', message = 'publication retry requires confirmed absence of an external effect';
  end if;

  target_effect_key := 'publication-retry-effect-' || encode(
    extensions.digest(
      convert_to(target_organization_id::text || ':' || target_idempotency_key, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  select * into enqueued
  from api.enqueue_publication_job(
    target_organization_id,
    target_idempotency_key,
    source_job.publication_id,
    source_job.operation,
    source_job.capability_code,
    target_effect_key,
    source_job.target_version_id,
    source_job.target_instance_id,
    target_available_at,
    source_job.priority,
    source_job.max_attempts,
    target_created_by_user_id
  );

  update app_private.publication_jobs
  set retry_of_job_id = target_publication_job_id
  where organization_id = target_organization_id
    and id = enqueued.publication_job_id
    and retry_of_job_id is null;

  publication_job_id := enqueued.publication_job_id;
  retry_of_job_id := target_publication_job_id;
  was_replayed := enqueued.was_replayed;
  return next;
end;
$$;

create function api.get_publication_batch_status(
  target_organization_id uuid,
  target_publication_batch_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'batch_id', batch_value.id,
    'status', batch_value.status,
    'operation', batch_value.requested_operation,
    'created_at', batch_value.created_at,
    'completed_at', batch_value.completed_at,
    'policy', batch_value.policy_snapshot,
    'counts', coalesce(job_summary.counts, '{}'::jsonb),
    'next_available_at', job_summary.next_available_at,
    'failures', coalesce(failure_summary.failures, '[]'::jsonb),
    'notification_status', subscription_value.status,
    'notification_outbox_event_id', subscription_value.outbox_event_id
  )
  from app_private.publication_batches as batch_value
  left join lateral (
    select
      jsonb_object_agg(grouped.status, grouped.total) as counts,
      min(grouped.next_available_at) as next_available_at
    from (
      select
        job_value.status,
        count(*)::integer as total,
        min(job_value.available_at) filter (
          where job_value.status in ('pending', 'retryable')
        ) as next_available_at
      from app_private.publication_jobs as job_value
      where job_value.organization_id = batch_value.organization_id
        and job_value.batch_id = batch_value.id
      group by job_value.status
    ) as grouped
  ) as job_summary on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'job_id', failed_job.id,
        'publication_id', failed_job.publication_id,
        'status', failed_job.status,
        'error_code', failed_job.last_error_code,
        'effect_certainty', effect_value.effect_certainty,
        'can_retry',
          failed_job.status = 'blocked'
          or (
            failed_job.status = 'failed'
            and effect_value.effect_certainty in ('not_started', 'confirmed_not_applied')
          )
      )
      order by failed_job.created_at, failed_job.id
    ) as failures
    from app_private.publication_jobs as failed_job
    left join lateral (
      select event_value.event_payload ->> 'effect_certainty' as effect_certainty
      from app_private.publication_events as event_value
      where event_value.organization_id = failed_job.organization_id
        and event_value.job_id = failed_job.id
        and event_value.event_type = 'publication_job.result_recorded'
      order by event_value.occurred_at desc, event_value.id desc
      limit 1
    ) as effect_value on true
    where failed_job.organization_id = batch_value.organization_id
      and failed_job.batch_id = batch_value.id
      and failed_job.status in ('blocked', 'failed', 'uncertain')
  ) as failure_summary on true
  left join app_private.publication_batch_subscriptions as subscription_value
    on subscription_value.organization_id = batch_value.organization_id
   and subscription_value.publication_batch_id = batch_value.id
  where batch_value.organization_id = target_organization_id
    and batch_value.id = target_publication_batch_id;
$$;

create function api.subscribe_publication_batch(
  target_organization_id uuid,
  target_publication_batch_id uuid,
  target_agent_run_id uuid
)
returns table (
  publication_batch_subscription_id uuid,
  status text,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_record app_private.agent_runs%rowtype;
  conversation_record app_private.conversations%rowtype;
  subscription_record app_private.publication_batch_subscriptions%rowtype;
begin
  select run_value.*
  into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = target_organization_id
    and run_value.id = target_agent_run_id
    and run_value.actor_kind = 'member'
    and run_value.actor_user_id is not null;

  if not found or not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = run_record.actor_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin')
  ) then
    raise exception using errcode = '42501', message = 'publication batch subscription requires an active owner member run';
  end if;

  select conversation_value.*
  into conversation_record
  from app_private.conversations as conversation_value
  where conversation_value.organization_id = target_organization_id
    and conversation_value.channel_connection_id = run_record.channel_connection_id
    and conversation_value.id = run_record.conversation_id
    and conversation_value.primary_channel_identity_id = run_record.actor_channel_identity_id
    and conversation_value.status = 'open';

  if not found or not app_private.whatsapp_agent_run_actor_is_current(
    target_organization_id,
    target_agent_run_id
  ) then
    raise exception using errcode = '42501', message = 'publication batch subscription WhatsApp identity is not current';
  end if;

  insert into app_private.publication_batch_subscriptions (
    organization_id,
    publication_batch_id,
    origin_agent_run_id,
    channel_connection_id,
    conversation_id,
    destination_identity_id
  ) values (
    target_organization_id,
    target_publication_batch_id,
    target_agent_run_id,
    run_record.channel_connection_id,
    run_record.conversation_id,
    conversation_record.primary_channel_identity_id
  )
  on conflict (organization_id, publication_batch_id) do nothing
  returning * into subscription_record;

  if found then
    publication_batch_subscription_id := subscription_record.id;
    status := subscription_record.status;
    was_replayed := false;
    return next;
    return;
  end if;

  select subscription_value.*
  into subscription_record
  from app_private.publication_batch_subscriptions as subscription_value
  where subscription_value.organization_id = target_organization_id
    and subscription_value.publication_batch_id = target_publication_batch_id;

  if subscription_record.origin_agent_run_id <> target_agent_run_id then
    raise exception using errcode = '23505', message = 'publication batch already has another notification subscription';
  end if;

  publication_batch_subscription_id := subscription_record.id;
  status := subscription_record.status;
  was_replayed := true;
  return next;
end;
$$;

create function api.reconcile_publication_batch_notifications(
  target_organization_id uuid,
  target_publication_batch_id uuid,
  target_now timestamptz default statement_timestamp()
)
returns table (
  publication_batch_id uuid,
  status text,
  job_counts jsonb,
  notifications_ready integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reconciliation record;
  target_notifications_ready integer := 0;
  summary_value jsonb;
begin
  select * into reconciliation
  from api.reconcile_publication_batch(
    target_organization_id,
    target_publication_batch_id,
    target_now
  );

  if reconciliation.status in ('completed', 'partially_failed', 'cancelled') then
    summary_value := api.get_publication_batch_status(
      target_organization_id,
      target_publication_batch_id
    );

    update app_private.publication_batch_subscriptions
    set status = 'ready',
        summary_payload = summary_value,
        available_at = target_now,
        last_error_code = null
    where organization_id = target_organization_id
      and publication_batch_id = target_publication_batch_id
      and status = 'pending';
    get diagnostics target_notifications_ready = row_count;
  end if;

  return query select
    target_publication_batch_id,
    reconciliation.status,
    reconciliation.job_counts,
    target_notifications_ready;
end;
$$;

create function api.claim_publication_batch_notification(
  target_worker_id text,
  target_lease_seconds integer default 120,
  target_organization_id uuid default null
)
returns table (
  organization_id uuid,
  publication_batch_subscription_id uuid,
  publication_batch_id uuid,
  lease_token uuid,
  lease_expires_at timestamptz,
  attempt_count integer,
  provider text,
  model text,
  reasoning_effort text,
  system_prompt text,
  summary_payload jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_record app_private.publication_batch_subscriptions%rowtype;
  run_record app_private.agent_runs%rowtype;
  generated_lease_token uuid;
  system_prompt_value text;
begin
  if target_worker_id is null
    or target_worker_id <> btrim(target_worker_id)
    or char_length(target_worker_id) not between 3 and 200
    or target_lease_seconds not between 15 and 900 then
    raise exception using errcode = '22023', message = 'publication notification claim arguments are invalid';
  end if;

  update app_private.publication_batch_subscriptions as expired_subscription
  set status = case
        when expired_subscription.attempt_count < expired_subscription.max_attempts
          then 'retryable'
        else 'failed'
      end,
      available_at = statement_timestamp(),
      lease_token = null,
      lease_expires_at = null,
      last_error_code = 'publication_summary_lease_expired',
      completed_at = case
        when expired_subscription.attempt_count >= expired_subscription.max_attempts
          then statement_timestamp()
      end
  where expired_subscription.status = 'processing'
    and expired_subscription.lease_expires_at <= statement_timestamp()
    and (
      target_organization_id is null
      or expired_subscription.organization_id = target_organization_id
    );

  select subscription_value.*
  into subscription_record
  from app_private.publication_batch_subscriptions as subscription_value
  where subscription_value.status in ('ready', 'retryable')
    and subscription_value.available_at <= statement_timestamp()
    and subscription_value.attempt_count < subscription_value.max_attempts
    and (target_organization_id is null or subscription_value.organization_id = target_organization_id)
  order by subscription_value.available_at, subscription_value.created_at, subscription_value.id
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  generated_lease_token := extensions.gen_random_uuid();

  select run_value.* into run_record
  from app_private.agent_runs as run_value
  where run_value.organization_id = subscription_record.organization_id
    and run_value.id = subscription_record.origin_agent_run_id;

  select prompt_value.content_template into system_prompt_value
  from app_private.agent_policy_versions as policy_version
  join app_private.prompt_versions as prompt_value
    on prompt_value.organization_id = policy_version.organization_id
   and prompt_value.id = policy_version.prompt_version_id
  where policy_version.organization_id = run_record.organization_id
    and policy_version.id = run_record.policy_version_id;

  update app_private.publication_batch_subscriptions
  set status = 'processing',
      attempt_count = attempt_count + 1,
      lease_token = generated_lease_token,
      lease_expires_at = statement_timestamp() + make_interval(secs => target_lease_seconds),
      provider_request_id = null,
      last_error_code = null
  where app_private.publication_batch_subscriptions.organization_id = subscription_record.organization_id
    and app_private.publication_batch_subscriptions.id = subscription_record.id;

  return query select
    subscription_record.organization_id,
    subscription_record.id,
    subscription_record.publication_batch_id,
    generated_lease_token,
    statement_timestamp() + make_interval(secs => target_lease_seconds),
    subscription_record.attempt_count + 1,
    run_record.provider,
    run_record.model,
    run_record.reasoning_effort,
    system_prompt_value,
    subscription_record.summary_payload;
end;
$$;

create function api.reconcile_due_publication_batches(
  target_limit integer default 100,
  target_organization_id uuid default null,
  target_now timestamptz default statement_timestamp()
)
returns table (
  scanned_count integer,
  terminal_count integer,
  notifications_ready integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  batch_record record;
  reconciliation record;
  scanned_value integer := 0;
  terminal_value integer := 0;
  notifications_value integer := 0;
begin
  if target_limit not between 1 and 1000 then
    raise exception using errcode = '22023', message = 'publication batch reconciliation limit must be between 1 and 1000';
  end if;

  for batch_record in
    select batch_value.organization_id, batch_value.id
    from app_private.publication_batches as batch_value
    where batch_value.status not in ('completed', 'partially_failed', 'cancelled')
      and (target_organization_id is null or batch_value.organization_id = target_organization_id)
      and not exists (
        select 1
        from app_private.publication_jobs as active_job
        where active_job.organization_id = batch_value.organization_id
          and active_job.batch_id = batch_value.id
          and active_job.status in ('pending', 'processing', 'retryable')
      )
    order by batch_value.created_at, batch_value.id
    for update skip locked
    limit target_limit
  loop
    select * into reconciliation
    from api.reconcile_publication_batch_notifications(
      batch_record.organization_id,
      batch_record.id,
      target_now
    );
    scanned_value := scanned_value + 1;
    terminal_value := terminal_value + case
      when reconciliation.status in ('completed', 'partially_failed', 'cancelled') then 1
      else 0
    end;
    notifications_value := notifications_value + reconciliation.notifications_ready;
  end loop;

  return query select scanned_value, terminal_value, notifications_value;
end;
$$;

create function api.complete_publication_batch_notification(
  target_organization_id uuid,
  target_subscription_id uuid,
  target_lease_token uuid,
  target_visible_text text,
  target_provider_request_id text
)
returns table (
  publication_batch_subscription_id uuid,
  status text,
  message_id uuid,
  outbox_event_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_record app_private.publication_batch_subscriptions%rowtype;
  conversation_record app_private.conversations%rowtype;
  agent_participant_id uuid;
  target_message_id uuid;
  target_outbox_event_id uuid;
  delivery_allowed boolean;
  target_status text;
begin
  if target_visible_text is null
    or target_visible_text <> btrim(target_visible_text)
    or char_length(target_visible_text) not between 1 and 4000 then
    raise exception using errcode = '22023', message = 'publication summary text is invalid';
  end if;

  select subscription_value.*
  into subscription_record
  from app_private.publication_batch_subscriptions as subscription_value
  where subscription_value.organization_id = target_organization_id
    and subscription_value.id = target_subscription_id
  for update;

  if not found
    or subscription_record.status <> 'processing'
    or subscription_record.lease_token is distinct from target_lease_token
    or subscription_record.lease_expires_at <= statement_timestamp() then
    raise exception using errcode = '40001', message = 'publication summary lease is not active';
  end if;

  select conversation_value.*
  into conversation_record
  from app_private.conversations as conversation_value
  where conversation_value.organization_id = target_organization_id
    and conversation_value.channel_connection_id = subscription_record.channel_connection_id
    and conversation_value.id = subscription_record.conversation_id
    and conversation_value.status = 'open';

  if not found then
    raise exception using errcode = '42501', message = 'publication summary conversation is not open';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    target_organization_id::text || ':' || subscription_record.conversation_id::text || ':agent-participant',
    0
  ));

  select participant_value.id
  into agent_participant_id
  from app_private.conversation_participants as participant_value
  where participant_value.organization_id = target_organization_id
    and participant_value.channel_connection_id = subscription_record.channel_connection_id
    and participant_value.conversation_id = subscription_record.conversation_id
    and participant_value.participant_kind = 'agent'
    and participant_value.agent_key = 'customer_assistant'
    and participant_value.left_at is null;

  if agent_participant_id is null then
    insert into app_private.conversation_participants (
      organization_id,
      channel_connection_id,
      conversation_id,
      participant_kind,
      participant_role,
      agent_key
    ) values (
      target_organization_id,
      subscription_record.channel_connection_id,
      subscription_record.conversation_id,
      'agent',
      'agent',
      'customer_assistant'
    ) returning id into agent_participant_id;
  end if;

  delivery_allowed := conversation_record.service_window_expires_at > statement_timestamp();
  target_status := case when delivery_allowed then 'queued' else 'blocked' end;

  insert into app_private.messages (
    organization_id,
    channel_connection_id,
    conversation_id,
    sender_participant_id,
    direction,
    content_kind,
    provider_message_type,
    deduplication_key,
    content,
    provider_context,
    status
  ) values (
    target_organization_id,
    subscription_record.channel_connection_id,
    subscription_record.conversation_id,
    agent_participant_id,
    'outbound',
    'text',
    'text',
    extensions.digest(
      convert_to('publication-batch-summary:' || subscription_record.id::text, 'UTF8'),
      'sha256'
    ),
    jsonb_build_object('text', jsonb_build_object('body', target_visible_text)),
    jsonb_build_object(
      'publication_batch_id', subscription_record.publication_batch_id,
      'publication_batch_subscription_id', subscription_record.id,
      'provider_request_id', target_provider_request_id
    ),
    case when delivery_allowed then 'queued' else 'blocked' end
  ) returning id into target_message_id;

  insert into app_private.outbox_events (
    organization_id,
    channel_connection_id,
    conversation_id,
    message_id,
    destination_identity_id,
    operation,
    idempotency_key,
    payload,
    policy_status,
    policy_basis,
    policy_evaluated_at,
    status,
    completed_at
  ) values (
    target_organization_id,
    subscription_record.channel_connection_id,
    subscription_record.conversation_id,
    target_message_id,
    subscription_record.destination_identity_id,
    'message.send',
    extensions.digest(
      convert_to('publication-batch-summary-send:' || subscription_record.id::text, 'UTF8'),
      'sha256'
    ),
    jsonb_build_object(
      'publication_batch_id', subscription_record.publication_batch_id,
      'type', 'text',
      'text', jsonb_build_object('body', target_visible_text)
    ),
    case when delivery_allowed then 'allowed' else 'blocked' end,
    case when delivery_allowed then 'customer_service_window' else 'service_window_expired' end,
    statement_timestamp(),
    case when delivery_allowed then 'pending' else 'blocked' end,
    case when delivery_allowed then null else statement_timestamp() end
  ) returning id into target_outbox_event_id;

  update app_private.publication_batch_subscriptions
  set status = target_status,
      lease_token = null,
      lease_expires_at = null,
      provider_request_id = target_provider_request_id,
      message_id = target_message_id,
      outbox_event_id = target_outbox_event_id,
      last_error_code = case when delivery_allowed then null else 'service_window_expired' end,
      completed_at = statement_timestamp()
  where organization_id = target_organization_id
    and id = target_subscription_id;

  return query select target_subscription_id, target_status, target_message_id, target_outbox_event_id;
end;
$$;

create function api.fail_publication_batch_notification(
  target_organization_id uuid,
  target_subscription_id uuid,
  target_lease_token uuid,
  target_error_code text,
  target_retryable boolean,
  target_retry_at timestamptz default null
)
returns table (
  publication_batch_subscription_id uuid,
  status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_record app_private.publication_batch_subscriptions%rowtype;
  target_status text;
begin
  select subscription_value.*
  into subscription_record
  from app_private.publication_batch_subscriptions as subscription_value
  where subscription_value.organization_id = target_organization_id
    and subscription_value.id = target_subscription_id
  for update;

  if not found
    or subscription_record.status <> 'processing'
    or subscription_record.lease_token is distinct from target_lease_token then
    raise exception using errcode = '40001', message = 'publication summary failure lease is not active';
  end if;

  target_status := case
    when target_retryable
      and subscription_record.attempt_count < subscription_record.max_attempts
      and target_retry_at > statement_timestamp() then 'retryable'
    else 'failed'
  end;

  update app_private.publication_batch_subscriptions
  set status = target_status,
      available_at = case when target_status = 'retryable' then target_retry_at else available_at end,
      lease_token = null,
      lease_expires_at = null,
      last_error_code = target_error_code,
      completed_at = case when target_status = 'failed' then statement_timestamp() end
  where organization_id = target_organization_id
    and id = target_subscription_id;

  return query select target_subscription_id, target_status;
end;
$$;

create view api.social_rate_limit_observations
with (security_invoker = true, security_barrier = true)
as select
  id,
  organization_id,
  social_connection_id,
  publication_job_id,
  observation_source,
  provider_request_id,
  retry_after_at,
  blocked_until,
  usage_snapshot,
  observed_at,
  created_at
from app_private.social_rate_limit_observations;

create view api.publication_batch_subscriptions
with (security_invoker = true, security_barrier = true)
as select
  id,
  organization_id,
  publication_batch_id,
  origin_agent_run_id,
  channel_connection_id,
  conversation_id,
  destination_identity_id,
  status,
  attempt_count,
  max_attempts,
  available_at,
  summary_payload,
  provider_request_id,
  message_id,
  outbox_event_id,
  last_error_code,
  completed_at,
  created_at,
  updated_at
from app_private.publication_batch_subscriptions;

create view api.facebook_catalog_admin
with (security_invoker = true, security_barrier = true)
as select
  variant_value.organization_id,
  product_value.id as product_id,
  variant_value.id as variant_id,
  product_value.name as product_name,
  variant_value.name as variant_name,
  product_value.status as product_status,
  variant_value.status as variant_status,
  sku_value.sku,
  connection_value.id as social_connection_id,
  connection_value.display_name as facebook_page_name,
  publication_value.id as publication_id,
  publication_value.status as publication_status,
  version_value.id as publication_version_id,
  version_value.pricing_status,
  version_value.price_amount,
  version_value.currency_code,
  tier_value.unit_id as price_unit_id,
  instance_value.id as publication_instance_id,
  instance_value.external_publication_id,
  instance_value.external_url,
  instance_value.status as facebook_status,
  job_value.id as latest_job_id,
  job_value.status as latest_job_status,
  job_value.last_error_code,
  effect_value.effect_certainty as latest_effect_certainty,
  case
    when job_value.status = 'uncertain' then array['reconcile']::text[]
    when job_value.status = 'blocked' then array['retry']::text[]
    when job_value.status = 'failed'
      and effect_value.effect_certainty in ('not_started', 'confirmed_not_applied')
      then array['retry']::text[]
    when job_value.status = 'failed' then array['reconcile']::text[]
    when publication_value.status = 'active'
      and version_value.status = 'approved'
      and variant_value.status = 'active'
      and product_value.status = 'active'
      and instance_value.id is null then array['publish', 'pause']::text[]
    when publication_value.status = 'active'
      and version_value.status = 'approved'
      and variant_value.status = 'active'
      and product_value.status = 'active' then array['refresh', 'pause']::text[]
    when publication_value.status = 'paused' then array['resume']::text[]
    else '{}'::text[]
  end as available_actions,
  variant_value.created_at,
  variant_value.updated_at
from app_private.product_variants as variant_value
join app_private.products as product_value
  on product_value.organization_id = variant_value.organization_id
 and product_value.id = variant_value.product_id
left join lateral (
  select sku_row.sku
  from app_private.variant_skus as sku_row
  where sku_row.organization_id = variant_value.organization_id
    and sku_row.variant_id = variant_value.id
    and sku_row.status = 'current'
  order by sku_row.effective_at desc, sku_row.id desc
  limit 1
) as sku_value on true
left join app_private.social_connections as connection_value
  on connection_value.organization_id = variant_value.organization_id
 and connection_value.surface = 'facebook_page'
 and connection_value.status <> 'archived'
left join app_private.publications as publication_value
  on publication_value.organization_id = variant_value.organization_id
 and publication_value.social_connection_id = connection_value.id
 and publication_value.variant_id = variant_value.id
 and publication_value.status <> 'retired'
left join app_private.publication_versions as version_value
  on version_value.organization_id = publication_value.organization_id
 and version_value.id = publication_value.current_version_id
left join app_private.price_tiers as tier_value
  on tier_value.organization_id = version_value.organization_id
 and tier_value.id = version_value.source_price_tier_id
left join lateral (
  select instance_row.*
  from app_private.publication_instances as instance_row
  where instance_row.organization_id = publication_value.organization_id
    and instance_row.publication_id = publication_value.id
    and instance_row.status <> 'deleted'
  order by instance_row.created_at desc, instance_row.id desc
  limit 1
) as instance_value on true
left join lateral (
  select job_row.*
  from app_private.publication_jobs as job_row
  where job_row.organization_id = publication_value.organization_id
    and job_row.publication_id = publication_value.id
  order by job_row.created_at desc, job_row.id desc
  limit 1
) as job_value on true
left join lateral (
  select event_value.event_payload ->> 'effect_certainty' as effect_certainty
  from app_private.publication_events as event_value
  where event_value.organization_id = job_value.organization_id
    and event_value.job_id = job_value.id
    and event_value.event_type = 'publication_job.result_recorded'
  order by event_value.occurred_at desc, event_value.id desc
  limit 1
) as effect_value on true;

revoke all on
  app_private.social_publication_dispatch_states,
  app_private.social_rate_limit_observations,
  app_private.publication_batch_subscriptions
from public, anon, authenticated;

-- Security-invoker API views need the exact referenced base columns. Rebuild the
-- authenticated read grant set after adding these views so operational columns
-- remain private and dependencies introduced on existing tables stay usable.
revoke select on all tables in schema app_private from authenticated;
do $$
declare
  dependency record;
begin
  for dependency in
    select
      usage.table_schema,
      usage.table_name,
      string_agg(quote_ident(usage.column_name), ', ' order by usage.column_name) as columns
    from information_schema.view_column_usage as usage
    where usage.view_schema = 'api'
      and usage.table_schema = 'app_private'
    group by usage.table_schema, usage.table_name
    order by usage.table_schema, usage.table_name
  loop
    execute format(
      'grant select (%s) on table %I.%I to authenticated',
      dependency.columns,
      dependency.table_schema,
      dependency.table_name
    );
  end loop;
end;
$$;

revoke all on
  api.social_rate_limit_observations,
  api.publication_batch_subscriptions,
  api.facebook_catalog_admin
from public, anon;
grant select on
  api.social_rate_limit_observations,
  api.publication_batch_subscriptions,
  api.facebook_catalog_admin
to authenticated;

revoke all on function api.record_social_rate_limit_observation(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz
) from public, anon, authenticated;
revoke all on function api.claim_facebook_publication_job(
  text, integer, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function api.recover_expired_facebook_publication_jobs(
  integer, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function api.transition_publication_batch_pause(
  uuid, uuid, text, text, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function api.retry_publication_job(
  uuid, uuid, text, timestamptz, uuid
) from public, anon, authenticated;
revoke all on function api.get_publication_batch_status(uuid, uuid)
  from public, anon, authenticated;
revoke all on function api.subscribe_publication_batch(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function api.reconcile_publication_batch_notifications(uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function api.claim_publication_batch_notification(text, integer, uuid)
  from public, anon, authenticated;
revoke all on function api.reconcile_due_publication_batches(integer, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function api.complete_publication_batch_notification(uuid, uuid, uuid, text, text)
  from public, anon, authenticated;
revoke all on function api.fail_publication_batch_notification(uuid, uuid, uuid, text, boolean, timestamptz)
  from public, anon, authenticated;

grant execute on function api.record_social_rate_limit_observation(
  uuid, uuid, uuid, text, text, timestamptz, timestamptz, jsonb, timestamptz
) to service_role;
grant execute on function api.claim_facebook_publication_job(
  text, integer, uuid, timestamptz
) to service_role;
grant execute on function api.recover_expired_facebook_publication_jobs(
  integer, uuid, timestamptz
) to service_role;
grant execute on function api.transition_publication_batch_pause(
  uuid, uuid, text, text, text, timestamptz, uuid
) to service_role;
grant execute on function api.retry_publication_job(
  uuid, uuid, text, timestamptz, uuid
) to service_role;
grant execute on function api.get_publication_batch_status(uuid, uuid) to service_role;
grant execute on function api.subscribe_publication_batch(uuid, uuid, uuid) to service_role;
grant execute on function api.reconcile_publication_batch_notifications(uuid, uuid, timestamptz)
  to service_role;
grant execute on function api.claim_publication_batch_notification(text, integer, uuid)
  to service_role;
grant execute on function api.reconcile_due_publication_batches(integer, uuid, timestamptz)
  to service_role;
grant execute on function api.complete_publication_batch_notification(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function api.fail_publication_batch_notification(uuid, uuid, uuid, text, boolean, timestamptz)
  to service_role;

comment on table app_private.social_rate_limit_observations is
  'Append-only normalized Meta pacing observations; raw headers and secrets are never persisted';
comment on table app_private.publication_batch_subscriptions is
  'Conversation-independent durable request for one LLM-rendered terminal batch summary';
comment on function api.claim_facebook_publication_job(text, integer, uuid, timestamptz) is
  'Claims one due Page job, advances per-connection dispatch state and exposes its Vault token only to service_role';
comment on function api.recover_expired_facebook_publication_jobs(integer, uuid, timestamptz) is
  'Recovers expired Page worker leases in a bounded SKIP LOCKED scan without retrying a started unknown effect';
comment on function api.reconcile_due_publication_batches(integer, uuid, timestamptz) is
  'Closes bounded batches with no active jobs and makes their terminal notification ready exactly once';
comment on function api.retry_publication_job(uuid, uuid, text, timestamptz, uuid) is
  'Creates a linked retry only for blocked or confirmed-not-applied failed effects';
comment on view api.facebook_catalog_admin is
  'Tenant-filtered catalog publication projection with safe UI actions and no credentials';

notify pgrst, 'reload schema';

commit;
