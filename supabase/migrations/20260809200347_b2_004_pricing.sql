begin;

create extension if not exists btree_gist with schema extensions;

create table app_private.price_books (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name text not null,
  currency_code text not null,
  status text not null default 'draft',
  is_default boolean not null default false,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint price_books_organization_id_id_unique
    unique (organization_id, id),
  constraint price_books_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint price_books_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint price_books_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint price_books_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint price_books_currency_code_valid
    check (currency_code ~ '^[A-Z]{3}$'),
  constraint price_books_status_valid
    check (status in ('draft', 'active', 'retired')),
  constraint price_books_retired_not_default
    check (status <> 'retired' or not is_default)
);

create unique index price_books_organization_code_unique
  on app_private.price_books (organization_id, lower(code));

create unique index price_books_one_active_default_per_organization
  on app_private.price_books (organization_id)
  where is_default and status = 'active';

create table app_private.price_tiers (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  price_book_id uuid not null,
  variant_id uuid not null,
  unit_id uuid not null,
  quantity_min numeric not null,
  quantity_max numeric,
  quantity_range numrange generated always as (
    pg_catalog.numrange(
      quantity_min,
      quantity_max,
      case when quantity_max is null then '[)' else '[]' end
    )
  ) stored,
  pricing_status text not null,
  calculation_method text,
  price_amount numeric,
  valid_from timestamptz not null,
  valid_until timestamptz,
  valid_during tstzrange generated always as (
    pg_catalog.tstzrange(valid_from, valid_until, '[)')
  ) stored,
  supersedes_price_tier_id uuid,
  superseded_at timestamptz,
  evidence_id uuid not null,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint price_tiers_organization_id_id_unique
    unique (organization_id, id),
  constraint price_tiers_price_book_fk
    foreign key (organization_id, price_book_id)
    references app_private.price_books (organization_id, id)
    on delete restrict,
  constraint price_tiers_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint price_tiers_unit_fk
    foreign key (organization_id, unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict,
  constraint price_tiers_supersedes_fk
    foreign key (organization_id, supersedes_price_tier_id)
    references app_private.price_tiers (organization_id, id)
    on delete restrict,
  constraint price_tiers_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint price_tiers_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint price_tiers_quantity_valid
    check (
      quantity_min > 0
      and quantity_min <= 1000000000000
      and scale(quantity_min) <= 9
      and (
        quantity_max is null
        or (
          quantity_max >= quantity_min
          and quantity_max <= 1000000000000
          and scale(quantity_max) <= 9
        )
      )
    ),
  constraint price_tiers_pricing_status_valid
    check (pricing_status in ('priced', 'on_request')),
  constraint price_tiers_calculation_method_valid
    check (calculation_method is null or calculation_method in ('fixed_total', 'per_unit')),
  constraint price_tiers_price_contract_valid
    check (
      (
        pricing_status = 'priced'
        and calculation_method is not null
        and price_amount is not null
      )
      or (
        pricing_status = 'on_request'
        and calculation_method is null
        and price_amount is null
      )
    ),
  constraint price_tiers_amount_valid
    check (
      price_amount is null
      or (
        price_amount >= 0
        and price_amount <= 999999999999.999999
        and scale(price_amount) <= 6
      )
    ),
  constraint price_tiers_fixed_total_exact_quantity
    check (
      calculation_method is distinct from 'fixed_total'
      or (
        quantity_max is not null
        and quantity_max = quantity_min
      )
    ),
  constraint price_tiers_validity_valid
    check (valid_until is null or valid_until > valid_from),
  constraint price_tiers_supersession_valid
    check (
      supersedes_price_tier_id is null
      or supersedes_price_tier_id <> id
    ),
  constraint price_tiers_superseded_at_valid
    check (superseded_at is null or superseded_at >= created_at),
  constraint price_tiers_no_current_overlap
    exclude using gist (
      organization_id extensions.gist_uuid_ops with =,
      price_book_id extensions.gist_uuid_ops with =,
      variant_id extensions.gist_uuid_ops with =,
      unit_id extensions.gist_uuid_ops with =,
      quantity_range with &&,
      valid_during with &&
    )
    where (superseded_at is null)
    deferrable initially immediate
);

create index price_tiers_current_lookup_idx
  on app_private.price_tiers (
    organization_id,
    price_book_id,
    variant_id,
    unit_id,
    valid_from,
    id
  )
  where superseded_at is null;

create index price_tiers_variant_idx
  on app_private.price_tiers (organization_id, variant_id);

create index price_tiers_unit_idx
  on app_private.price_tiers (organization_id, unit_id);

create index price_tiers_evidence_idx
  on app_private.price_tiers (organization_id, evidence_id);

create index price_tiers_supersedes_idx
  on app_private.price_tiers (organization_id, supersedes_price_tier_id)
  where supersedes_price_tier_id is not null;

create index price_tiers_created_by_user_idx
  on app_private.price_tiers (created_by_user_id)
  where created_by_user_id is not null;

create function app_private.prevent_price_book_scope_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.code is distinct from old.code
    or new.currency_code is distinct from old.currency_code
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'price book scope, currency and attribution are immutable';
  end if;

  return new;
end;
$$;

create function app_private.validate_price_tier()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_book app_private.price_books%rowtype;
  target_unit app_private.catalog_units%rowtype;
  previous_tier app_private.price_tiers%rowtype;
begin
  select * into target_book
  from app_private.price_books
  where organization_id = new.organization_id
    and id = new.price_book_id;

  if not found or target_book.status = 'retired' then
    raise exception using
      errcode = '23514',
      message = 'price tier requires a non-retired price book';
  end if;

  select * into target_unit
  from app_private.catalog_units
  where organization_id = new.organization_id
    and id = new.unit_id;

  if not found or target_unit.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'price tier requires an active catalog unit';
  end if;

  if trunc(new.quantity_min, target_unit.decimal_scale) <> new.quantity_min
    or (
      new.quantity_max is not null
      and trunc(new.quantity_max, target_unit.decimal_scale) <> new.quantity_max
    ) then
    raise exception using
      errcode = '23514',
      message = 'price tier quantity exceeds catalog unit precision';
  end if;

  if new.supersedes_price_tier_id is not null then
    select * into previous_tier
    from app_private.price_tiers
    where organization_id = new.organization_id
      and id = new.supersedes_price_tier_id;

    if not found
      or previous_tier.price_book_id <> new.price_book_id
      or previous_tier.variant_id <> new.variant_id
      or previous_tier.unit_id <> new.unit_id then
      raise exception using
        errcode = '23514',
        message = 'superseded price tier must share book, variant and unit';
    end if;

    if previous_tier.superseded_at is null then
      raise exception using
        errcode = '23514',
        message = 'previous price tier must be superseded before replacement';
    end if;
  end if;

  return new;
end;
$$;

create function app_private.prevent_price_tier_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.price_book_id is distinct from old.price_book_id
    or new.variant_id is distinct from old.variant_id
    or new.unit_id is distinct from old.unit_id
    or new.quantity_min is distinct from old.quantity_min
    or new.quantity_max is distinct from old.quantity_max
    or new.pricing_status is distinct from old.pricing_status
    or new.calculation_method is distinct from old.calculation_method
    or new.price_amount is distinct from old.price_amount
    or new.valid_from is distinct from old.valid_from
    or new.valid_until is distinct from old.valid_until
    or new.supersedes_price_tier_id is distinct from old.supersedes_price_tier_id
    or new.evidence_id is distinct from old.evidence_id
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'price tier commercial facts and provenance are immutable';
  end if;

  if old.superseded_at is not null
    or new.superseded_at is null
    or new.superseded_at < old.created_at then
    raise exception using
      errcode = '23514',
      message = 'price tier can be superseded exactly once';
  end if;

  return new;
end;
$$;

create trigger price_books_prevent_scope_rewrite
before update on app_private.price_books
for each row execute function app_private.prevent_price_book_scope_rewrite();

create trigger price_books_set_updated_at
before update on app_private.price_books
for each row execute function app_private.set_updated_at();

create trigger price_tiers_validate
before insert on app_private.price_tiers
for each row execute function app_private.validate_price_tier();

create trigger price_tiers_prevent_core_rewrite
before update on app_private.price_tiers
for each row execute function app_private.prevent_price_tier_core_rewrite();

alter table app_private.price_books enable row level security;
alter table app_private.price_books force row level security;
alter table app_private.price_tiers enable row level security;
alter table app_private.price_tiers force row level security;

create policy price_books_member_select
on app_private.price_books for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = price_books.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy price_tiers_member_select
on app_private.price_tiers for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = price_tiers.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create view api.price_books
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  code,
  name,
  currency_code,
  status,
  is_default,
  created_at,
  updated_at
from app_private.price_books;

create view api.price_tiers
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  price_book_id,
  variant_id,
  unit_id,
  quantity_min,
  quantity_max,
  pricing_status,
  calculation_method,
  price_amount,
  valid_from,
  valid_until,
  supersedes_price_tier_id,
  superseded_at,
  evidence_id,
  created_by_user_id,
  created_at
from app_private.price_tiers;

create view api.price_tier_changes
with (security_invoker = true, security_barrier = true)
as
select
  current_tier.id as price_tier_id,
  current_tier.organization_id,
  current_tier.price_book_id,
  current_tier.variant_id,
  current_tier.unit_id,
  previous_tier.id as previous_price_tier_id,
  previous_tier.quantity_min as previous_quantity_min,
  previous_tier.quantity_max as previous_quantity_max,
  previous_tier.pricing_status as previous_pricing_status,
  previous_tier.calculation_method as previous_calculation_method,
  previous_tier.price_amount as previous_price_amount,
  previous_tier.valid_from as previous_valid_from,
  previous_tier.valid_until as previous_valid_until,
  current_tier.quantity_min as new_quantity_min,
  current_tier.quantity_max as new_quantity_max,
  current_tier.pricing_status as new_pricing_status,
  current_tier.calculation_method as new_calculation_method,
  current_tier.price_amount as new_price_amount,
  current_tier.valid_from as new_valid_from,
  current_tier.valid_until as new_valid_until,
  current_tier.evidence_id,
  current_tier.created_by_user_id,
  current_tier.created_at as changed_at
from app_private.price_tiers as current_tier
left join app_private.price_tiers as previous_tier
  on previous_tier.organization_id = current_tier.organization_id
  and previous_tier.id = current_tier.supersedes_price_tier_id;

create function api.resolve_price_quote(
  target_price_book_id uuid,
  target_variant_id uuid,
  target_unit_id uuid,
  target_quantity numeric,
  target_at timestamptz default statement_timestamp()
)
returns table (
  price_tier_id uuid,
  organization_id uuid,
  price_book_id uuid,
  variant_id uuid,
  unit_id uuid,
  currency_code text,
  requested_quantity numeric,
  pricing_status text,
  calculation_method text,
  price_amount numeric,
  total_amount numeric,
  valid_from timestamptz,
  valid_until timestamptz,
  evidence_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    tier.id,
    tier.organization_id,
    tier.price_book_id,
    tier.variant_id,
    tier.unit_id,
    book.currency_code,
    target_quantity,
    tier.pricing_status,
    tier.calculation_method,
    tier.price_amount,
    case
      when tier.pricing_status = 'on_request' then null
      when tier.calculation_method = 'fixed_total' then tier.price_amount
      when tier.calculation_method = 'per_unit' then tier.price_amount * target_quantity
    end,
    tier.valid_from,
    tier.valid_until,
    tier.evidence_id
  from app_private.price_tiers as tier
  inner join app_private.price_books as book
    on book.organization_id = tier.organization_id
    and book.id = tier.price_book_id
  inner join app_private.catalog_units as unit_value
    on unit_value.organization_id = tier.organization_id
    and unit_value.id = tier.unit_id
  where tier.price_book_id = target_price_book_id
    and tier.variant_id = target_variant_id
    and tier.unit_id = target_unit_id
    and tier.superseded_at is null
    and book.status = 'active'
    and unit_value.status = 'active'
    and target_quantity > 0
    and trunc(target_quantity, unit_value.decimal_scale) = target_quantity
    and tier.quantity_range @> target_quantity
    and tier.valid_during @> target_at;
$$;

revoke all on
  app_private.price_books,
  app_private.price_tiers
from public, anon, authenticated, service_role;

revoke all on
  api.price_books,
  api.price_tiers,
  api.price_tier_changes
from public, anon, authenticated, service_role;

grant select on
  app_private.price_books,
  app_private.price_tiers
to authenticated;

grant select, insert, update on
  app_private.price_books,
  app_private.price_tiers
to service_role;

grant select on
  api.price_books,
  api.price_tiers,
  api.price_tier_changes
to authenticated, service_role;

revoke all on function app_private.prevent_price_book_scope_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_price_tier()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_price_tier_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function api.resolve_price_quote(uuid, uuid, uuid, numeric, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function api.resolve_price_quote(uuid, uuid, uuid, numeric, timestamptz)
  to authenticated, service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;

comment on table app_private.price_books is
  'Organization-scoped logical price lists with explicit immutable currency';
comment on table app_private.price_tiers is
  'Versioned quantity and validity pricing tiers; pricing tiers are rows, never fixed quantity columns';
comment on view api.price_tier_changes is
  'Typed previous/new pricing history with actor and immutable evidence attribution';
comment on function api.resolve_price_quote(uuid, uuid, uuid, numeric, timestamptz) is
  'Deterministic exact quote resolution; price interpretation belongs to LLM tool calling';
comment on column app_private.price_tiers.price_amount is
  'Exact decimal amount; stock and package composition belong to B2-005';

commit;
