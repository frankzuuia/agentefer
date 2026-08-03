begin;

-- AgenteFer owns every application object through migrations executed as postgres.
-- Opt out of legacy automatic Data API exposure before creating application objects.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from public, anon, authenticated, service_role;

revoke create on schema public from public;

create schema app_private authorization postgres;
create schema api authorization postgres;

revoke all on schema app_private from public, anon, authenticated, service_role;
revoke all on schema api from public, anon, authenticated, service_role;

alter default privileges for role postgres in schema app_private
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema app_private
  revoke all on functions from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on tables from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on sequences from public, anon, authenticated, service_role;
alter default privileges for role postgres in schema api
  revoke all on functions from public, anon, authenticated, service_role;

create table app_private.organizations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint organizations_status_valid
    check (status in ('active', 'suspended', 'archived')),
  constraint organizations_created_by_user_fk
    foreign key (created_by_user_id) references auth.users (id) on delete set null
);

create table app_private.user_profiles (
  user_id uuid primary key,
  preferred_name text,
  preferred_locale text,
  time_zone text not null default 'UTC',
  accessibility_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_user_fk
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_profiles_preferred_name_valid
    check (
      preferred_name is null
      or (
        preferred_name = btrim(preferred_name)
        and char_length(preferred_name) between 1 and 160
      )
    ),
  constraint user_profiles_preferred_locale_valid
    check (
      preferred_locale is null
      or (
        preferred_locale = btrim(preferred_locale)
        and char_length(preferred_locale) between 2 and 35
      )
    ),
  constraint user_profiles_time_zone_valid
    check (time_zone = btrim(time_zone) and char_length(time_zone) between 1 and 100),
  constraint user_profiles_accessibility_object
    check (jsonb_typeof(accessibility_preferences) = 'object')
);

create table app_private.organization_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  user_id uuid not null,
  role text not null,
  status text not null,
  invited_by_user_id uuid,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_organization_user_unique
    unique (organization_id, user_id),
  constraint organization_memberships_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint organization_memberships_user_fk
    foreign key (user_id) references auth.users (id) on delete cascade,
  constraint organization_memberships_invited_by_user_fk
    foreign key (invited_by_user_id) references auth.users (id) on delete set null,
  constraint organization_memberships_role_valid
    check (role in ('owner', 'admin', 'operator', 'viewer')),
  constraint organization_memberships_status_valid
    check (status in ('invited', 'active', 'suspended')),
  constraint organization_memberships_active_joined_at
    check (status <> 'active' or joined_at is not null)
);

create table app_private.business_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  public_name text not null,
  time_zone text not null default 'UTC',
  default_locale text,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_organization_unique unique (organization_id),
  constraint business_profiles_organization_fk
    foreign key (organization_id) references app_private.organizations (id) on delete restrict,
  constraint business_profiles_created_by_user_fk
    foreign key (created_by_user_id) references auth.users (id) on delete set null,
  constraint business_profiles_public_name_valid
    check (
      public_name = btrim(public_name)
      and char_length(public_name) between 1 and 160
    ),
  constraint business_profiles_time_zone_valid
    check (time_zone = btrim(time_zone) and char_length(time_zone) between 1 and 100),
  constraint business_profiles_default_locale_valid
    check (
      default_locale is null
      or (
        default_locale = btrim(default_locale)
        and char_length(default_locale) between 2 and 35
      )
    )
);

create index organizations_created_by_user_idx
  on app_private.organizations (created_by_user_id)
  where created_by_user_id is not null;

create index organization_memberships_active_user_organization_idx
  on app_private.organization_memberships (user_id, organization_id)
  where status = 'active';

create index organization_memberships_user_idx
  on app_private.organization_memberships (user_id);

create index organization_memberships_active_owner_idx
  on app_private.organization_memberships (organization_id)
  where role = 'owner' and status = 'active';

create index organization_memberships_invited_by_user_idx
  on app_private.organization_memberships (invited_by_user_id)
  where invited_by_user_id is not null;

create index business_profiles_created_by_user_idx
  on app_private.business_profiles (created_by_user_id)
  where created_by_user_id is not null;

create function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create trigger organizations_set_updated_at
before update on app_private.organizations
for each row execute function app_private.set_updated_at();

create trigger user_profiles_set_updated_at
before update on app_private.user_profiles
for each row execute function app_private.set_updated_at();

create trigger organization_memberships_set_updated_at
before update on app_private.organization_memberships
for each row execute function app_private.set_updated_at();

create trigger business_profiles_set_updated_at
before update on app_private.business_profiles
for each row execute function app_private.set_updated_at();

create function app_private.provision_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into app_private.user_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

insert into app_private.user_profiles (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

create trigger auth_user_provision_profile
after insert on auth.users
for each row execute function app_private.provision_user_profile();

create function app_private.prevent_membership_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.user_id is distinct from old.user_id then
    raise exception using
      errcode = '23514',
      message = 'membership organization and user are immutable';
  end if;

  return new;
end;
$$;

create trigger organization_memberships_prevent_reassignment
before update on app_private.organization_memberships
for each row execute function app_private.prevent_membership_reassignment();

create function app_private.assert_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  if tg_table_name = 'organizations' then
    target_organization_id := case when tg_op = 'DELETE' then old.id else new.id end;
  else
    target_organization_id := case
      when tg_op = 'DELETE' then old.organization_id
      else new.organization_id
    end;
  end if;

  if exists (
    select 1
    from app_private.organizations as organization
    where organization.id = target_organization_id
  ) and not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'organization requires at least one active owner';
  end if;

  return null;
end;
$$;

create constraint trigger organizations_require_active_owner
after insert on app_private.organizations
deferrable initially deferred
for each row execute function app_private.assert_active_owner();

create constraint trigger organization_memberships_preserve_active_owner
after insert or update or delete on app_private.organization_memberships
deferrable initially deferred
for each row execute function app_private.assert_active_owner();

alter table app_private.organizations enable row level security;
alter table app_private.organizations force row level security;
alter table app_private.user_profiles enable row level security;
alter table app_private.user_profiles force row level security;
alter table app_private.organization_memberships enable row level security;
alter table app_private.organization_memberships force row level security;
alter table app_private.business_profiles enable row level security;
alter table app_private.business_profiles force row level security;

create policy organizations_member_select
on app_private.organizations
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = organizations.id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy user_profiles_self_select
on app_private.user_profiles
for select
to authenticated
using (user_id = (select auth.uid()));

create policy organization_memberships_self_select
on app_private.organization_memberships
for select
to authenticated
using (user_id = (select auth.uid()));

create policy business_profiles_member_select
on app_private.business_profiles
for select
to authenticated
using (
  exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = business_profiles.organization_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create view api.organizations
with (security_invoker = true, security_barrier = true)
as
select id, name, status, created_at, updated_at
from app_private.organizations;

create view api.user_profiles
with (security_invoker = true, security_barrier = true)
as
select
  user_id,
  preferred_name,
  preferred_locale,
  time_zone,
  accessibility_preferences,
  created_at,
  updated_at
from app_private.user_profiles;

create view api.organization_memberships
with (security_invoker = true, security_barrier = true)
as
select id, organization_id, user_id, role, status, joined_at, created_at, updated_at
from app_private.organization_memberships;

create view api.business_profiles
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  public_name,
  time_zone,
  default_locale,
  created_at,
  updated_at
from app_private.business_profiles;

grant usage on schema app_private to authenticated, service_role;
grant usage on schema api to authenticated, service_role;

grant select on
  app_private.organizations,
  app_private.user_profiles,
  app_private.organization_memberships,
  app_private.business_profiles
to authenticated;

grant select, insert, update, delete on
  app_private.organizations,
  app_private.user_profiles,
  app_private.organization_memberships,
  app_private.business_profiles
to service_role;

grant select on
  api.organizations,
  api.user_profiles,
  api.organization_memberships,
  api.business_profiles
to authenticated, service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;
revoke all on all functions in schema app_private
  from public, anon, authenticated, service_role;
revoke all on all functions in schema api
  from public, anon, authenticated, service_role;

comment on schema app_private is 'AgenteFer private domain; never expose through Data API';
comment on schema api is 'AgenteFer minimal Data API surface; every object uses explicit grants';
comment on table app_private.organizations is 'Tenant root for every AgenteFer operation';
comment on table app_private.user_profiles is 'Application profile linked only to auth.users primary key';
comment on table app_private.organization_memberships is 'Versioned authorization relationship between user and organization';
comment on table app_private.business_profiles is 'Configurable public business identity owned by one organization';

commit;
