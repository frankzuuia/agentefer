begin;

create table app_private.inventory_items (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  variant_id uuid not null,
  inventory_unit_id uuid not null,
  status text not null default 'active',
  retired_at timestamptz,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_items_variant_unique
    unique (organization_id, variant_id),
  constraint inventory_items_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint inventory_items_variant_fk
    foreign key (organization_id, variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint inventory_items_unit_fk
    foreign key (organization_id, inventory_unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict,
  constraint inventory_items_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_items_status_valid
    check (status in ('active', 'retired')),
  constraint inventory_items_retirement_valid
    check (
      (status = 'active' and retired_at is null)
      or (status = 'retired' and retired_at is not null and retired_at >= created_at)
    )
);

create index inventory_items_unit_idx
  on app_private.inventory_items (organization_id, inventory_unit_id);
create index inventory_items_created_by_user_idx
  on app_private.inventory_items (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active',
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_locations_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_locations_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint inventory_locations_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_locations_code_valid
    check (
      code = lower(btrim(code))
      and code ~ '^[a-z0-9][a-z0-9_-]{0,62}$'
    ),
  constraint inventory_locations_name_valid
    check (name = btrim(name) and char_length(name) between 1 and 160),
  constraint inventory_locations_description_valid
    check (
      description is null
      or (
        description = btrim(description)
        and char_length(description) between 1 and 4000
      )
    ),
  constraint inventory_locations_status_valid
    check (status in ('active', 'inactive', 'retired'))
);

create unique index inventory_locations_organization_code_unique
  on app_private.inventory_locations (organization_id, lower(code));
create index inventory_locations_created_by_user_idx
  on app_private.inventory_locations (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_compositions (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  offered_variant_id uuid not null,
  sale_unit_id uuid not null,
  status text not null default 'draft',
  effective_at timestamptz,
  retired_at timestamptz,
  evidence_id uuid,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_compositions_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_compositions_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint inventory_compositions_variant_fk
    foreign key (organization_id, offered_variant_id)
    references app_private.product_variants (organization_id, id)
    on delete restrict,
  constraint inventory_compositions_sale_unit_fk
    foreign key (organization_id, sale_unit_id)
    references app_private.catalog_units (organization_id, id)
    on delete restrict,
  constraint inventory_compositions_evidence_fk
    foreign key (organization_id, evidence_id)
    references app_private.catalog_evidence (organization_id, id)
    on delete restrict,
  constraint inventory_compositions_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_compositions_status_valid
    check (status in ('draft', 'active', 'retired')),
  constraint inventory_compositions_lifecycle_valid
    check (
      (status = 'draft' and effective_at is null and retired_at is null)
      or (
        status = 'active'
        and effective_at is not null
        and effective_at >= created_at
        and retired_at is null
      )
      or (
        status = 'retired'
        and effective_at is not null
        and retired_at is not null
        and retired_at >= effective_at
      )
    )
);

create unique index inventory_compositions_one_active_offer_unit
  on app_private.inventory_compositions (
    organization_id,
    offered_variant_id,
    sale_unit_id
  )
  where status = 'active';
create index inventory_compositions_variant_idx
  on app_private.inventory_compositions (organization_id, offered_variant_id);
create index inventory_compositions_sale_unit_idx
  on app_private.inventory_compositions (organization_id, sale_unit_id);
create index inventory_compositions_evidence_idx
  on app_private.inventory_compositions (organization_id, evidence_id)
  where evidence_id is not null;
create index inventory_compositions_created_by_user_idx
  on app_private.inventory_compositions (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_composition_components (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  composition_id uuid not null,
  inventory_item_id uuid not null,
  quantity_per_sale_unit numeric not null,
  created_by_user_id uuid,
  created_at timestamptz not null default now(),
  constraint inventory_composition_components_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_composition_components_item_unique
    unique (organization_id, composition_id, inventory_item_id),
  constraint inventory_composition_components_composition_fk
    foreign key (organization_id, composition_id)
    references app_private.inventory_compositions (organization_id, id)
    on delete restrict,
  constraint inventory_composition_components_item_fk
    foreign key (organization_id, inventory_item_id)
    references app_private.inventory_items (organization_id, id)
    on delete restrict,
  constraint inventory_composition_components_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_composition_components_quantity_valid
    check (
      quantity_per_sale_unit > 0
      and quantity_per_sale_unit <= 1000000000000
      and scale(quantity_per_sale_unit) <= 9
    )
);

create index inventory_composition_components_item_idx
  on app_private.inventory_composition_components (organization_id, inventory_item_id);
create index inventory_composition_components_created_by_user_idx
  on app_private.inventory_composition_components (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_commands (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  idempotency_key bytea not null,
  command_code text not null,
  request_fingerprint bytea not null,
  request_payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint inventory_commands_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_commands_idempotency_unique
    unique (organization_id, idempotency_key),
  constraint inventory_commands_organization_fk
    foreign key (organization_id)
    references app_private.organizations (id)
    on delete restrict,
  constraint inventory_commands_idempotency_key_valid
    check (octet_length(idempotency_key) = 32),
  constraint inventory_commands_command_code_valid
    check (
      command_code = lower(btrim(command_code))
      and command_code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
    ),
  constraint inventory_commands_fingerprint_valid
    check (octet_length(request_fingerprint) = 32),
  constraint inventory_commands_payload_valid
    check (
      jsonb_typeof(request_payload) = 'object'
      and octet_length(request_payload::text) <= 1048576
    )
);

create table app_private.inventory_balances (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  inventory_item_id uuid not null,
  location_id uuid not null,
  on_hand_quantity numeric not null default 0,
  reserved_quantity numeric not null default 0,
  available_quantity numeric generated always as (
    on_hand_quantity - reserved_quantity
  ) stored,
  version bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_balances_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_balances_item_location_unique
    unique (organization_id, inventory_item_id, location_id),
  constraint inventory_balances_item_fk
    foreign key (organization_id, inventory_item_id)
    references app_private.inventory_items (organization_id, id)
    on delete restrict,
  constraint inventory_balances_location_fk
    foreign key (organization_id, location_id)
    references app_private.inventory_locations (organization_id, id)
    on delete restrict,
  constraint inventory_balances_quantities_valid
    check (
      on_hand_quantity >= 0
      and on_hand_quantity <= 1000000000000
      and reserved_quantity >= 0
      and reserved_quantity <= on_hand_quantity
      and scale(on_hand_quantity) <= 9
      and scale(reserved_quantity) <= 9
    ),
  constraint inventory_balances_version_valid
    check (version >= 0)
);

create index inventory_balances_location_idx
  on app_private.inventory_balances (organization_id, location_id, inventory_item_id);
create index inventory_balances_available_idx
  on app_private.inventory_balances (
    organization_id,
    inventory_item_id,
    available_quantity,
    location_id
  )
  where available_quantity > 0;

create table app_private.inventory_operations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  command_id uuid not null,
  operation_code text not null,
  reason text not null,
  reference_type text,
  reference_id text,
  composition_id uuid,
  sale_quantity numeric,
  created_by_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint inventory_operations_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_operations_command_unique
    unique (organization_id, command_id),
  constraint inventory_operations_command_fk
    foreign key (organization_id, command_id)
    references app_private.inventory_commands (organization_id, id)
    on delete restrict,
  constraint inventory_operations_composition_fk
    foreign key (organization_id, composition_id)
    references app_private.inventory_compositions (organization_id, id)
    on delete restrict,
  constraint inventory_operations_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_operations_code_valid
    check (
      operation_code = lower(btrim(operation_code))
      and operation_code ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
    ),
  constraint inventory_operations_reason_valid
    check (reason = btrim(reason) and char_length(reason) between 1 and 2000),
  constraint inventory_operations_reference_valid
    check (
      (reference_type is null and reference_id is null)
      or (
        reference_type = lower(btrim(reference_type))
        and reference_type ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
        and reference_id = btrim(reference_id)
        and char_length(reference_id) between 1 and 512
      )
    ),
  constraint inventory_operations_composition_sale_valid
    check (
      (composition_id is null and sale_quantity is null)
      or (
        composition_id is not null
        and sale_quantity > 0
        and sale_quantity <= 1000000000000
        and scale(sale_quantity) <= 9
      )
    ),
  constraint inventory_operations_occurred_at_valid
    check (occurred_at <= created_at + interval '5 minutes')
);

create index inventory_operations_reference_idx
  on app_private.inventory_operations (
    organization_id,
    reference_type,
    reference_id,
    occurred_at
  )
  where reference_type is not null;
create index inventory_operations_composition_idx
  on app_private.inventory_operations (organization_id, composition_id, occurred_at)
  where composition_id is not null;
create index inventory_operations_created_by_user_idx
  on app_private.inventory_operations (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_movements (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  operation_id uuid not null,
  inventory_item_id uuid not null,
  location_id uuid not null,
  quantity_delta numeric not null,
  on_hand_quantity_after numeric not null,
  reserved_quantity_after numeric not null,
  created_at timestamptz not null default now(),
  constraint inventory_movements_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_movements_operation_balance_unique
    unique (organization_id, operation_id, inventory_item_id, location_id),
  constraint inventory_movements_operation_fk
    foreign key (organization_id, operation_id)
    references app_private.inventory_operations (organization_id, id)
    on delete restrict,
  constraint inventory_movements_item_fk
    foreign key (organization_id, inventory_item_id)
    references app_private.inventory_items (organization_id, id)
    on delete restrict,
  constraint inventory_movements_location_fk
    foreign key (organization_id, location_id)
    references app_private.inventory_locations (organization_id, id)
    on delete restrict,
  constraint inventory_movements_quantity_valid
    check (
      quantity_delta <> 0
      and abs(quantity_delta) <= 1000000000000
      and scale(quantity_delta) <= 9
      and on_hand_quantity_after >= 0
      and on_hand_quantity_after <= 1000000000000
      and reserved_quantity_after >= 0
      and reserved_quantity_after <= on_hand_quantity_after
      and scale(on_hand_quantity_after) <= 9
      and scale(reserved_quantity_after) <= 9
    )
);

create index inventory_movements_item_location_created_idx
  on app_private.inventory_movements (
    organization_id,
    inventory_item_id,
    location_id,
    created_at,
    id
  );
create index inventory_movements_location_created_idx
  on app_private.inventory_movements (organization_id, location_id, created_at, id);

create table app_private.inventory_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  creation_command_id uuid not null,
  status text not null default 'active',
  reference_type text,
  reference_id text,
  composition_id uuid,
  sale_quantity numeric,
  reason text not null,
  created_by_user_id uuid,
  reserved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_reservations_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_reservations_creation_command_unique
    unique (organization_id, creation_command_id),
  constraint inventory_reservations_creation_command_fk
    foreign key (organization_id, creation_command_id)
    references app_private.inventory_commands (organization_id, id)
    on delete restrict,
  constraint inventory_reservations_composition_fk
    foreign key (organization_id, composition_id)
    references app_private.inventory_compositions (organization_id, id)
    on delete restrict,
  constraint inventory_reservations_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_reservations_status_valid
    check (
      status in (
        'active',
        'partially_consumed',
        'consumed',
        'released',
        'expired',
        'closed'
      )
    ),
  constraint inventory_reservations_reference_valid
    check (
      (reference_type is null and reference_id is null)
      or (
        reference_type = lower(btrim(reference_type))
        and reference_type ~ '^[a-z0-9][a-z0-9._-]{0,126}$'
        and reference_id = btrim(reference_id)
        and char_length(reference_id) between 1 and 512
      )
    ),
  constraint inventory_reservations_reason_valid
    check (reason = btrim(reason) and char_length(reason) between 1 and 2000),
  constraint inventory_reservations_composition_sale_valid
    check (
      (composition_id is null and sale_quantity is null)
      or (
        composition_id is not null
        and sale_quantity > 0
        and sale_quantity <= 1000000000000
        and scale(sale_quantity) <= 9
      )
    ),
  constraint inventory_reservations_expiration_valid
    check (expires_at > reserved_at),
  constraint inventory_reservations_lifecycle_valid
    check (
      (status in ('active', 'partially_consumed') and closed_at is null)
      or (
        status in ('consumed', 'released', 'expired', 'closed')
        and closed_at is not null
        and closed_at >= reserved_at
      )
    )
);

create index inventory_reservations_open_expiration_idx
  on app_private.inventory_reservations (organization_id, expires_at, id)
  where status in ('active', 'partially_consumed');
create index inventory_reservations_reference_idx
  on app_private.inventory_reservations (
    organization_id,
    reference_type,
    reference_id,
    reserved_at
  )
  where reference_type is not null;
create index inventory_reservations_composition_idx
  on app_private.inventory_reservations (organization_id, composition_id, reserved_at)
  where composition_id is not null;
create index inventory_reservations_created_by_user_idx
  on app_private.inventory_reservations (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_reservation_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  reservation_id uuid not null,
  inventory_item_id uuid not null,
  location_id uuid not null,
  reserved_quantity numeric not null,
  consumed_quantity numeric not null default 0,
  released_quantity numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_reservation_lines_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_reservation_lines_balance_unique
    unique (organization_id, reservation_id, inventory_item_id, location_id),
  constraint inventory_reservation_lines_reservation_fk
    foreign key (organization_id, reservation_id)
    references app_private.inventory_reservations (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_lines_item_fk
    foreign key (organization_id, inventory_item_id)
    references app_private.inventory_items (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_lines_location_fk
    foreign key (organization_id, location_id)
    references app_private.inventory_locations (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_lines_quantities_valid
    check (
      reserved_quantity > 0
      and reserved_quantity <= 1000000000000
      and consumed_quantity >= 0
      and released_quantity >= 0
      and consumed_quantity + released_quantity <= reserved_quantity
      and scale(reserved_quantity) <= 9
      and scale(consumed_quantity) <= 9
      and scale(released_quantity) <= 9
    )
);

create index inventory_reservation_lines_item_location_idx
  on app_private.inventory_reservation_lines (
    organization_id,
    inventory_item_id,
    location_id,
    reservation_id
  );
create index inventory_reservation_lines_location_idx
  on app_private.inventory_reservation_lines (
    organization_id,
    location_id,
    reservation_id
  );

create table app_private.inventory_reservation_events (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  reservation_id uuid not null,
  command_id uuid not null,
  operation_id uuid,
  action text not null,
  reason text not null,
  created_by_user_id uuid,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint inventory_reservation_events_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_reservation_events_command_unique
    unique (organization_id, command_id),
  constraint inventory_reservation_events_reservation_fk
    foreign key (organization_id, reservation_id)
    references app_private.inventory_reservations (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_events_command_fk
    foreign key (organization_id, command_id)
    references app_private.inventory_commands (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_events_operation_fk
    foreign key (organization_id, operation_id)
    references app_private.inventory_operations (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_events_created_by_user_fk
    foreign key (created_by_user_id)
    references auth.users (id)
    on delete set null,
  constraint inventory_reservation_events_action_valid
    check (action in ('created', 'consume', 'release', 'expire')),
  constraint inventory_reservation_events_operation_valid
    check (
      (action = 'consume' and operation_id is not null)
      or (action <> 'consume' and operation_id is null)
    ),
  constraint inventory_reservation_events_reason_valid
    check (reason = btrim(reason) and char_length(reason) between 1 and 2000),
  constraint inventory_reservation_events_occurred_at_valid
    check (occurred_at <= created_at + interval '5 minutes')
);

create index inventory_reservation_events_reservation_created_idx
  on app_private.inventory_reservation_events (
    organization_id,
    reservation_id,
    created_at,
    id
  );
create index inventory_reservation_events_operation_idx
  on app_private.inventory_reservation_events (organization_id, operation_id)
  where operation_id is not null;
create index inventory_reservation_events_created_by_user_idx
  on app_private.inventory_reservation_events (created_by_user_id)
  where created_by_user_id is not null;

create table app_private.inventory_reservation_event_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  organization_id uuid not null,
  reservation_event_id uuid not null,
  reservation_line_id uuid not null,
  quantity numeric not null,
  created_at timestamptz not null default now(),
  constraint inventory_reservation_event_lines_organization_id_id_unique
    unique (organization_id, id),
  constraint inventory_reservation_event_lines_event_line_unique
    unique (organization_id, reservation_event_id, reservation_line_id),
  constraint inventory_reservation_event_lines_event_fk
    foreign key (organization_id, reservation_event_id)
    references app_private.inventory_reservation_events (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_event_lines_reservation_line_fk
    foreign key (organization_id, reservation_line_id)
    references app_private.inventory_reservation_lines (organization_id, id)
    on delete restrict,
  constraint inventory_reservation_event_lines_quantity_valid
    check (
      quantity > 0
      and quantity <= 1000000000000
      and scale(quantity) <= 9
    )
);

create index inventory_reservation_event_lines_reservation_line_idx
  on app_private.inventory_reservation_event_lines (organization_id, reservation_line_id);

create function app_private.prevent_inventory_item_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.variant_id is distinct from old.variant_id
    or new.inventory_unit_id is distinct from old.inventory_unit_id
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'inventory item identity, unit and attribution are immutable';
  end if;

  if old.status = 'retired'
    and (new.status is distinct from old.status or new.retired_at is distinct from old.retired_at) then
    raise exception using errcode = '23514', message = 'retired inventory item is terminal';
  end if;

  if new.status = 'retired' and exists (
    select 1
    from app_private.inventory_balances as balance
    where balance.organization_id = new.organization_id
      and balance.inventory_item_id = new.id
      and (balance.on_hand_quantity <> 0 or balance.reserved_quantity <> 0)
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory item with physical or reserved stock cannot be retired';
  end if;

  if new.status = 'retired' and exists (
    select 1
    from app_private.inventory_composition_components as component
    join app_private.inventory_compositions as composition
      on composition.organization_id = component.organization_id
      and composition.id = component.composition_id
    where component.organization_id = new.organization_id
      and component.inventory_item_id = new.id
      and composition.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory item used by an active composition cannot be retired';
  end if;

  return new;
end;
$$;

create function app_private.validate_inventory_item_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' and not exists (
    select 1
    from app_private.catalog_units as unit_value
    where unit_value.organization_id = new.organization_id
      and unit_value.id = new.inventory_unit_id
      and unit_value.status = 'active'
  ) then
    raise exception using
      errcode = '23514',
      message = 'active inventory item requires an active inventory unit';
  end if;

  return new;
end;
$$;

create function app_private.prevent_inventory_location_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.code is distinct from old.code
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'inventory location identity and attribution are immutable';
  end if;

  if old.status = 'retired' and new.status is distinct from old.status then
    raise exception using errcode = '23514', message = 'retired inventory location is terminal';
  end if;

  if new.status <> 'active' and exists (
    select 1
    from app_private.inventory_balances as balance
    where balance.organization_id = new.organization_id
      and balance.location_id = new.id
      and balance.reserved_quantity <> 0
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory location with active reservations cannot become unavailable';
  end if;

  if new.status = 'retired' and exists (
    select 1
    from app_private.inventory_balances as balance
    where balance.organization_id = new.organization_id
      and balance.location_id = new.id
      and balance.on_hand_quantity <> 0
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory location with physical stock cannot be retired';
  end if;

  return new;
end;
$$;

create function app_private.validate_inventory_composition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.organization_id is distinct from old.organization_id
      or new.offered_variant_id is distinct from old.offered_variant_id
      or new.sale_unit_id is distinct from old.sale_unit_id
      or new.evidence_id is distinct from old.evidence_id
      or new.created_by_user_id is distinct from old.created_by_user_id
      or new.created_at is distinct from old.created_at then
      raise exception using
        errcode = '23514',
        message = 'inventory composition scope, evidence and attribution are immutable';
    end if;

    if old.status = 'retired'
      or (old.status = 'active' and new.status <> 'retired')
      or (old.status = 'draft' and new.status not in ('draft', 'active')) then
      raise exception using errcode = '23514', message = 'invalid inventory composition transition';
    end if;
  end if;

  if new.status = 'active' then
    if not exists (
      select 1
      from app_private.catalog_units as unit_value
      where unit_value.organization_id = new.organization_id
        and unit_value.id = new.sale_unit_id
        and unit_value.status = 'active'
    ) then
      raise exception using
        errcode = '23514',
        message = 'active inventory composition requires an active sale unit';
    end if;

    if not exists (
      select 1
      from app_private.inventory_composition_components as component
      where component.organization_id = new.organization_id
        and component.composition_id = new.id
    ) then
      raise exception using
        errcode = '23514',
        message = 'active inventory composition requires at least one component';
    end if;

    if exists (
      select 1
      from app_private.inventory_composition_components as component
      join app_private.inventory_items as item
        on item.organization_id = component.organization_id
        and item.id = component.inventory_item_id
      where component.organization_id = new.organization_id
        and component.composition_id = new.id
        and item.status <> 'active'
    ) then
      raise exception using
        errcode = '23514',
        message = 'active inventory composition requires active components';
    end if;
  end if;

  return new;
end;
$$;

create function app_private.validate_inventory_composition_component()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_decimal_scale smallint;
begin
  if not exists (
    select 1
    from app_private.inventory_compositions as composition
    where composition.organization_id = new.organization_id
      and composition.id = new.composition_id
      and composition.status = 'draft'
  ) then
    raise exception using
      errcode = '23514',
      message = 'components can only be added to a draft inventory composition';
  end if;

  select unit_value.decimal_scale into target_decimal_scale
  from app_private.inventory_items as item
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
  where item.organization_id = new.organization_id
    and item.id = new.inventory_item_id
    and item.status = 'active'
    and unit_value.status = 'active';

  if not found then
    raise exception using
      errcode = '23514',
      message = 'inventory composition component requires an active item and unit';
  end if;

  if trunc(new.quantity_per_sale_unit, target_decimal_scale)
    <> new.quantity_per_sale_unit then
    raise exception using
      errcode = '23514',
      message = 'inventory composition quantity exceeds inventory unit precision';
  end if;

  return new;
end;
$$;

create function app_private.validate_inventory_balance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_decimal_scale smallint;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.inventory_item_id is distinct from old.inventory_item_id
    or new.location_id is distinct from old.location_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory balance scope is immutable';
  end if;

  select unit_value.decimal_scale into target_decimal_scale
  from app_private.inventory_items as item
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
  where item.organization_id = new.organization_id
    and item.id = new.inventory_item_id;

  if not found then
    raise exception using errcode = '23514', message = 'inventory balance requires a valid item unit';
  end if;

  if trunc(new.on_hand_quantity, target_decimal_scale) <> new.on_hand_quantity
    or trunc(new.reserved_quantity, target_decimal_scale) <> new.reserved_quantity then
    raise exception using
      errcode = '23514',
      message = 'inventory balance quantity exceeds inventory unit precision';
  end if;

  return new;
end;
$$;

create function app_private.prevent_inventory_reservation_core_rewrite()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.creation_command_id is distinct from old.creation_command_id
    or new.reference_type is distinct from old.reference_type
    or new.reference_id is distinct from old.reference_id
    or new.composition_id is distinct from old.composition_id
    or new.sale_quantity is distinct from old.sale_quantity
    or new.reason is distinct from old.reason
    or new.created_by_user_id is distinct from old.created_by_user_id
    or new.reserved_at is distinct from old.reserved_at
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation request and provenance are immutable';
  end if;

  if old.closed_at is not null and (
    new.status is distinct from old.status
    or new.closed_at is distinct from old.closed_at
  ) then
    raise exception using errcode = '23514', message = 'closed inventory reservation is terminal';
  end if;

  return new;
end;
$$;

create function app_private.validate_inventory_reservation_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_decimal_scale smallint;
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id
    or new.organization_id is distinct from old.organization_id
    or new.reservation_id is distinct from old.reservation_id
    or new.inventory_item_id is distinct from old.inventory_item_id
    or new.location_id is distinct from old.location_id
    or new.reserved_quantity is distinct from old.reserved_quantity
    or new.created_at is distinct from old.created_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation line allocation is immutable';
  end if;

  if tg_op = 'UPDATE' and (
    new.consumed_quantity < old.consumed_quantity
    or new.released_quantity < old.released_quantity
  ) then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation line progress is monotonic';
  end if;

  select unit_value.decimal_scale into target_decimal_scale
  from app_private.inventory_items as item
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
  where item.organization_id = new.organization_id
    and item.id = new.inventory_item_id;

  if not found then
    raise exception using errcode = '23514', message = 'reservation line requires a valid item unit';
  end if;

  if trunc(new.reserved_quantity, target_decimal_scale) <> new.reserved_quantity
    or trunc(new.consumed_quantity, target_decimal_scale) <> new.consumed_quantity
    or trunc(new.released_quantity, target_decimal_scale) <> new.released_quantity then
    raise exception using
      errcode = '23514',
      message = 'reservation line quantity exceeds inventory unit precision';
  end if;

  return new;
end;
$$;

create function app_private.prevent_active_inventory_unit_retirement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'active' and new.status = 'retired' and (
    exists (
      select 1
      from app_private.inventory_items as item
      where item.organization_id = new.organization_id
        and item.inventory_unit_id = new.id
        and item.status = 'active'
    )
    or exists (
      select 1
      from app_private.inventory_compositions as composition
      where composition.organization_id = new.organization_id
        and composition.sale_unit_id = new.id
        and composition.status = 'active'
    )
  ) then
    raise exception using
      errcode = '23514',
      message = 'catalog unit used by active inventory cannot be retired';
  end if;

  return new;
end;
$$;

create trigger inventory_items_prevent_core_rewrite
before update on app_private.inventory_items
for each row execute function app_private.prevent_inventory_item_core_rewrite();
create trigger inventory_items_validate_unit
before insert or update on app_private.inventory_items
for each row execute function app_private.validate_inventory_item_unit();
create trigger inventory_items_set_updated_at
before update on app_private.inventory_items
for each row execute function app_private.set_updated_at();

create trigger inventory_locations_prevent_core_rewrite
before update on app_private.inventory_locations
for each row execute function app_private.prevent_inventory_location_core_rewrite();
create trigger inventory_locations_set_updated_at
before update on app_private.inventory_locations
for each row execute function app_private.set_updated_at();

create trigger inventory_compositions_validate
before insert or update on app_private.inventory_compositions
for each row execute function app_private.validate_inventory_composition();
create trigger inventory_compositions_set_updated_at
before update on app_private.inventory_compositions
for each row execute function app_private.set_updated_at();

create trigger inventory_composition_components_validate
before insert on app_private.inventory_composition_components
for each row execute function app_private.validate_inventory_composition_component();
create trigger inventory_composition_components_reject_update
before update on app_private.inventory_composition_components
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_composition_components_reject_delete
before delete on app_private.inventory_composition_components
for each row execute function app_private.reject_immutable_catalog_update();

create trigger inventory_commands_reject_update
before update on app_private.inventory_commands
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_commands_reject_delete
before delete on app_private.inventory_commands
for each row execute function app_private.reject_immutable_catalog_update();

create trigger inventory_balances_validate
before insert or update on app_private.inventory_balances
for each row execute function app_private.validate_inventory_balance();
create trigger inventory_balances_set_updated_at
before update on app_private.inventory_balances
for each row execute function app_private.set_updated_at();

create trigger inventory_operations_reject_update
before update on app_private.inventory_operations
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_operations_reject_delete
before delete on app_private.inventory_operations
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_movements_reject_update
before update on app_private.inventory_movements
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_movements_reject_delete
before delete on app_private.inventory_movements
for each row execute function app_private.reject_immutable_catalog_update();

create trigger inventory_reservations_prevent_core_rewrite
before update on app_private.inventory_reservations
for each row execute function app_private.prevent_inventory_reservation_core_rewrite();
create trigger inventory_reservations_set_updated_at
before update on app_private.inventory_reservations
for each row execute function app_private.set_updated_at();
create trigger inventory_reservation_lines_validate
before insert or update on app_private.inventory_reservation_lines
for each row execute function app_private.validate_inventory_reservation_line();
create trigger inventory_reservation_lines_set_updated_at
before update on app_private.inventory_reservation_lines
for each row execute function app_private.set_updated_at();

create trigger inventory_reservation_events_reject_update
before update on app_private.inventory_reservation_events
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_reservation_events_reject_delete
before delete on app_private.inventory_reservation_events
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_reservation_event_lines_reject_update
before update on app_private.inventory_reservation_event_lines
for each row execute function app_private.reject_immutable_catalog_update();
create trigger inventory_reservation_event_lines_reject_delete
before delete on app_private.inventory_reservation_event_lines
for each row execute function app_private.reject_immutable_catalog_update();

create trigger catalog_units_preserve_active_inventory
before update of status on app_private.catalog_units
for each row execute function app_private.prevent_active_inventory_unit_retirement();

create function app_private.assert_inventory_actor(
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is not null and not exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id = target_organization_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
      and membership.role in ('owner', 'admin', 'operator')
  ) then
    raise exception using
      errcode = '42501',
      message = 'inventory actor must be an active owner, admin or operator';
  end if;
end;
$$;

create function app_private.claim_inventory_command(
  target_organization_id uuid,
  target_idempotency_key text,
  target_command_code text,
  target_request_payload jsonb
)
returns table (
  claimed_command_id uuid,
  was_replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  local_command_id uuid;
  local_command_code text;
  local_request_fingerprint bytea;
  local_inserted boolean;
  target_key_digest bytea;
  target_fingerprint bytea;
begin
  if target_idempotency_key is null
    or target_idempotency_key <> btrim(target_idempotency_key)
    or char_length(target_idempotency_key) not between 1 and 512 then
    raise exception using errcode = '22023', message = 'invalid inventory idempotency key';
  end if;

  if target_command_code is null
    or target_command_code <> lower(btrim(target_command_code))
    or target_command_code !~ '^[a-z0-9][a-z0-9._-]{0,126}$' then
    raise exception using errcode = '22023', message = 'invalid inventory command code';
  end if;

  if target_request_payload is null
    or jsonb_typeof(target_request_payload) <> 'object'
    or octet_length(target_request_payload::text) > 1048576 then
    raise exception using errcode = '22023', message = 'invalid inventory command payload';
  end if;

  target_key_digest := extensions.digest(target_idempotency_key, 'sha256');
  target_fingerprint := extensions.digest(target_request_payload::text, 'sha256');

  insert into app_private.inventory_commands (
    organization_id,
    idempotency_key,
    command_code,
    request_fingerprint,
    request_payload
  ) values (
    target_organization_id,
    target_key_digest,
    target_command_code,
    target_fingerprint,
    target_request_payload
  )
  on conflict (organization_id, idempotency_key) do nothing
  returning id into local_command_id;

  local_inserted := local_command_id is not null;

  if not local_inserted then
    select command.id, command.command_code, command.request_fingerprint
      into local_command_id, local_command_code, local_request_fingerprint
    from app_private.inventory_commands as command
    where command.organization_id = target_organization_id
      and command.idempotency_key = target_key_digest
    for update;

    if not found then
      raise exception using errcode = '40001', message = 'inventory command claim disappeared';
    end if;

    if local_command_code <> target_command_code
      or local_request_fingerprint <> target_fingerprint then
      raise exception using
        errcode = '23505',
        message = 'inventory idempotency key was reused with a different request';
    end if;
  end if;

  return query select local_command_id, not local_inserted;
end;
$$;

create function app_private.post_inventory_movement(
  target_organization_id uuid,
  target_command_id uuid,
  target_operation_code text,
  target_reason text,
  target_lines jsonb,
  target_reference_type text,
  target_reference_id text,
  target_composition_id uuid,
  target_sale_quantity numeric,
  target_created_by_user_id uuid,
  target_occurred_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_operation_id uuid;
  parsed_line record;
  target_line_count integer;
  target_valid_line_count integer;
  target_new_on_hand numeric;
  target_quantity_delta numeric;
  target_on_hand_after numeric;
  target_reserved_after numeric;
begin
  perform app_private.assert_inventory_actor(
    target_organization_id,
    target_created_by_user_id
  );

  if target_lines is null
    or jsonb_typeof(target_lines) <> 'array'
    or jsonb_array_length(target_lines) not between 1 and 500
    or octet_length(target_lines::text) > 1048576 then
    raise exception using errcode = '22023', message = 'inventory movement lines must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_lines) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'effect'
        - 'quantity' <> '{}'::jsonb
      or not submitted.line_value ?& array[
        'inventory_item_id',
        'location_id',
        'effect',
        'quantity'
      ]
  ) then
    raise exception using errcode = '22023', message = 'inventory movement line contract is invalid';
  end if;

  target_line_count := jsonb_array_length(target_lines);

  if (
    select count(*)
    from (
      select line.inventory_item_id, line.location_id
      from jsonb_to_recordset(target_lines) as line(
        inventory_item_id uuid,
        location_id uuid,
        effect text,
        quantity numeric
      )
      group by line.inventory_item_id, line.location_id
    ) as unique_line
  ) <> target_line_count then
    raise exception using
      errcode = '22023',
      message = 'inventory movement must contain one effect per item and location';
  end if;

  select count(*) into target_valid_line_count
  from jsonb_to_recordset(target_lines) as line(
    inventory_item_id uuid,
    location_id uuid,
    effect text,
    quantity numeric
  )
  join app_private.inventory_items as item
    on item.organization_id = target_organization_id
    and item.id = line.inventory_item_id
    and item.status = 'active'
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
    and unit_value.status = 'active'
  join app_private.inventory_locations as location
    on location.organization_id = target_organization_id
    and location.id = line.location_id
    and location.status = 'active'
  where line.effect in ('delta', 'set')
    and line.quantity is not null
    and abs(line.quantity) <= 1000000000000
    and (
      (line.effect = 'delta' and line.quantity <> 0)
      or (line.effect = 'set' and line.quantity >= 0)
    )
    and trunc(line.quantity, unit_value.decimal_scale) = line.quantity;

  if target_valid_line_count <> target_line_count then
    raise exception using
      errcode = '23514',
      message = 'inventory movement requires active tenant resources and valid unit precision';
  end if;

  insert into app_private.inventory_operations (
    organization_id,
    command_id,
    operation_code,
    reason,
    reference_type,
    reference_id,
    composition_id,
    sale_quantity,
    created_by_user_id,
    occurred_at
  ) values (
    target_organization_id,
    target_command_id,
    target_operation_code,
    target_reason,
    target_reference_type,
    target_reference_id,
    target_composition_id,
    target_sale_quantity,
    target_created_by_user_id,
    target_occurred_at
  )
  returning id into target_operation_id;

  insert into app_private.inventory_balances (
    organization_id,
    inventory_item_id,
    location_id
  )
  select target_organization_id, line.inventory_item_id, line.location_id
  from jsonb_to_recordset(target_lines) as line(
    inventory_item_id uuid,
    location_id uuid,
    effect text,
    quantity numeric
  )
  on conflict (organization_id, inventory_item_id, location_id) do nothing;

  for parsed_line in
    select
      balance.id as balance_id,
      balance.inventory_item_id,
      balance.location_id,
      balance.on_hand_quantity,
      balance.reserved_quantity,
      line.effect,
      line.quantity
    from jsonb_to_recordset(target_lines) as line(
      inventory_item_id uuid,
      location_id uuid,
      effect text,
      quantity numeric
    )
    join app_private.inventory_balances as balance
      on balance.organization_id = target_organization_id
      and balance.inventory_item_id = line.inventory_item_id
      and balance.location_id = line.location_id
    order by balance.inventory_item_id, balance.location_id
    for update of balance
  loop
    target_new_on_hand := case parsed_line.effect
      when 'delta' then parsed_line.on_hand_quantity + parsed_line.quantity
      when 'set' then parsed_line.quantity
    end;
    target_quantity_delta := target_new_on_hand - parsed_line.on_hand_quantity;

    if target_new_on_hand < parsed_line.reserved_quantity then
      raise exception using
        errcode = '23514',
        message = 'inventory movement would make stock negative or invade reservations';
    end if;

    if target_quantity_delta <> 0 then
      update app_private.inventory_balances
      set on_hand_quantity = target_new_on_hand,
        version = version + 1
      where id = parsed_line.balance_id
      returning on_hand_quantity, reserved_quantity
        into target_on_hand_after, target_reserved_after;

      insert into app_private.inventory_movements (
        organization_id,
        operation_id,
        inventory_item_id,
        location_id,
        quantity_delta,
        on_hand_quantity_after,
        reserved_quantity_after
      ) values (
        target_organization_id,
        target_operation_id,
        parsed_line.inventory_item_id,
        parsed_line.location_id,
        target_quantity_delta,
        target_on_hand_after,
        target_reserved_after
      );
    end if;
  end loop;

  return target_operation_id;
end;
$$;

create function api.apply_inventory_movement(
  target_organization_id uuid,
  target_idempotency_key text,
  target_operation_code text,
  target_reason text,
  target_lines jsonb,
  target_reference_type text default null,
  target_reference_id text default null,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default null
)
returns table (
  operation_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_lines jsonb;
  request_payload jsonb;
  command_claim record;
  target_operation_id uuid;
begin
  if target_lines is null or jsonb_typeof(target_lines) <> 'array' then
    raise exception using errcode = '22023', message = 'inventory movement lines must be an array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_lines) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'effect'
        - 'quantity' <> '{}'::jsonb
  ) then
    raise exception using errcode = '22023', message = 'inventory movement line has unknown fields';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'inventory_item_id', line.inventory_item_id,
      'location_id', line.location_id,
      'effect', line.effect,
      'quantity', line.quantity
    )
    order by line.inventory_item_id, line.location_id
  ) into normalized_lines
  from jsonb_to_recordset(target_lines) as line(
    inventory_item_id uuid,
    location_id uuid,
    effect text,
    quantity numeric
  );

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'operation_code', target_operation_code,
    'reason', target_reason,
    'lines', normalized_lines,
    'reference_type', target_reference_type,
    'reference_id', target_reference_id,
    'created_by_user_id', target_created_by_user_id,
    'occurred_at', target_occurred_at
  );

  select * into command_claim
  from app_private.claim_inventory_command(
    target_organization_id,
    target_idempotency_key,
    'inventory.movement',
    request_payload
  );

  if command_claim.was_replayed then
    select operation.id into target_operation_id
    from app_private.inventory_operations as operation
    where operation.organization_id = target_organization_id
      and operation.command_id = command_claim.claimed_command_id;

    if not found then
      raise exception using errcode = '40001', message = 'replayed inventory operation is incomplete';
    end if;
  else
    target_operation_id := app_private.post_inventory_movement(
      target_organization_id,
      command_claim.claimed_command_id,
      target_operation_code,
      target_reason,
      normalized_lines,
      target_reference_type,
      target_reference_id,
      null,
      null,
      target_created_by_user_id,
      coalesce(target_occurred_at, statement_timestamp())
    );
  end if;

  return query select target_operation_id, command_claim.was_replayed;
end;
$$;

create function api.apply_inventory_composition_movement(
  target_organization_id uuid,
  target_idempotency_key text,
  target_operation_code text,
  target_reason text,
  target_composition_id uuid,
  target_sale_quantity numeric,
  target_allocations jsonb,
  target_reference_type text default null,
  target_reference_id text default null,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default null
)
returns table (
  operation_id uuid,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_allocations jsonb;
  movement_lines jsonb;
  request_payload jsonb;
  command_claim record;
  target_operation_id uuid;
  sale_decimal_scale smallint;
  mismatch_count integer;
begin
  if target_allocations is null
    or jsonb_typeof(target_allocations) <> 'array'
    or jsonb_array_length(target_allocations) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'composition allocations must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_allocations) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'quantity' <> '{}'::jsonb
      or not submitted.line_value ?& array['inventory_item_id', 'location_id', 'quantity']
  ) then
    raise exception using errcode = '22023', message = 'composition allocation contract is invalid';
  end if;

  select sale_unit.decimal_scale into sale_decimal_scale
  from app_private.inventory_compositions as composition
  join app_private.catalog_units as sale_unit
    on sale_unit.organization_id = composition.organization_id
    and sale_unit.id = composition.sale_unit_id
  where composition.organization_id = target_organization_id
    and composition.id = target_composition_id
    and composition.status = 'active'
    and sale_unit.status = 'active';

  if not found
    or target_sale_quantity is null
    or target_sale_quantity <= 0
    or target_sale_quantity > 1000000000000
    or trunc(target_sale_quantity, sale_decimal_scale) <> target_sale_quantity then
    raise exception using
      errcode = '23514',
      message = 'composition movement requires an active composition and valid sale quantity';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'inventory_item_id', allocation.inventory_item_id,
      'location_id', allocation.location_id,
      'quantity', allocation.quantity
    )
    order by allocation.inventory_item_id, allocation.location_id
  ) into normalized_allocations
  from (
    select
      line.inventory_item_id,
      line.location_id,
      sum(line.quantity) as quantity
    from jsonb_to_recordset(target_allocations) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    where line.quantity > 0
    group by line.inventory_item_id, line.location_id
  ) as allocation;

  if normalized_allocations is null then
    raise exception using errcode = '23514', message = 'composition allocations require positive quantities';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(target_allocations) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    where line.inventory_item_id is null
      or line.location_id is null
      or line.quantity is null
      or line.quantity <= 0
      or line.quantity > 1000000000000
  ) <> 0 then
    raise exception using errcode = '23514', message = 'composition allocation quantity is invalid';
  end if;

  with allocated as (
    select line.inventory_item_id, sum(line.quantity) as quantity
    from jsonb_to_recordset(normalized_allocations) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    group by line.inventory_item_id
  ),
  required as (
    select
      component.inventory_item_id,
      component.quantity_per_sale_unit * target_sale_quantity as quantity
    from app_private.inventory_composition_components as component
    where component.organization_id = target_organization_id
      and component.composition_id = target_composition_id
  )
  select count(*) into mismatch_count
  from required
  full join allocated using (inventory_item_id)
  where required.inventory_item_id is null
    or allocated.inventory_item_id is null
    or required.quantity <> allocated.quantity;

  if mismatch_count <> 0 then
    raise exception using
      errcode = '23514',
      message = 'composition allocations must exactly match declared component consumption';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'inventory_item_id', allocation.inventory_item_id,
      'location_id', allocation.location_id,
      'effect', 'delta',
      'quantity', -allocation.quantity
    )
    order by allocation.inventory_item_id, allocation.location_id
  ) into movement_lines
  from jsonb_to_recordset(normalized_allocations) as allocation(
    inventory_item_id uuid,
    location_id uuid,
    quantity numeric
  );

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'operation_code', target_operation_code,
    'reason', target_reason,
    'composition_id', target_composition_id,
    'sale_quantity', target_sale_quantity,
    'allocations', normalized_allocations,
    'reference_type', target_reference_type,
    'reference_id', target_reference_id,
    'created_by_user_id', target_created_by_user_id,
    'occurred_at', target_occurred_at
  );

  select * into command_claim
  from app_private.claim_inventory_command(
    target_organization_id,
    target_idempotency_key,
    'inventory.composition_movement',
    request_payload
  );

  if command_claim.was_replayed then
    select operation.id into target_operation_id
    from app_private.inventory_operations as operation
    where operation.organization_id = target_organization_id
      and operation.command_id = command_claim.claimed_command_id;

    if not found then
      raise exception using errcode = '40001', message = 'replayed composition movement is incomplete';
    end if;
  else
    target_operation_id := app_private.post_inventory_movement(
      target_organization_id,
      command_claim.claimed_command_id,
      target_operation_code,
      target_reason,
      movement_lines,
      target_reference_type,
      target_reference_id,
      target_composition_id,
      target_sale_quantity,
      target_created_by_user_id,
      coalesce(target_occurred_at, statement_timestamp())
    );
  end if;

  return query select target_operation_id, command_claim.was_replayed;
end;
$$;

create function api.resolve_inventory_requirements(
  target_organization_id uuid,
  target_composition_id uuid,
  target_sale_quantity numeric
)
returns table (
  composition_id uuid,
  offered_variant_id uuid,
  sale_unit_id uuid,
  inventory_item_id uuid,
  inventory_unit_id uuid,
  required_quantity numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    composition.id,
    composition.offered_variant_id,
    composition.sale_unit_id,
    component.inventory_item_id,
    item.inventory_unit_id,
    component.quantity_per_sale_unit * target_sale_quantity
  from app_private.inventory_compositions as composition
  join app_private.catalog_units as sale_unit
    on sale_unit.organization_id = composition.organization_id
    and sale_unit.id = composition.sale_unit_id
  join app_private.inventory_composition_components as component
    on component.organization_id = composition.organization_id
    and component.composition_id = composition.id
  join app_private.inventory_items as item
    on item.organization_id = component.organization_id
    and item.id = component.inventory_item_id
  join app_private.catalog_units as inventory_unit
    on inventory_unit.organization_id = item.organization_id
    and inventory_unit.id = item.inventory_unit_id
  where composition.organization_id = target_organization_id
    and composition.id = target_composition_id
    and composition.status = 'active'
    and sale_unit.status = 'active'
    and item.status = 'active'
    and inventory_unit.status = 'active'
    and target_sale_quantity > 0
    and target_sale_quantity <= 1000000000000
    and trunc(target_sale_quantity, sale_unit.decimal_scale) = target_sale_quantity
    and trunc(
      component.quantity_per_sale_unit * target_sale_quantity,
      inventory_unit.decimal_scale
    ) = component.quantity_per_sale_unit * target_sale_quantity;
$$;

create function app_private.validate_inventory_reservation_event_line()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_decimal_scale smallint;
begin
  select unit_value.decimal_scale into target_decimal_scale
  from app_private.inventory_reservation_events as event_value
  join app_private.inventory_reservation_lines as reservation_line
    on reservation_line.organization_id = event_value.organization_id
    and reservation_line.reservation_id = event_value.reservation_id
    and reservation_line.id = new.reservation_line_id
  join app_private.inventory_items as item
    on item.organization_id = reservation_line.organization_id
    and item.id = reservation_line.inventory_item_id
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
  where event_value.organization_id = new.organization_id
    and event_value.id = new.reservation_event_id;

  if not found then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation event line must belong to the same reservation';
  end if;

  if trunc(new.quantity, target_decimal_scale) <> new.quantity then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation event quantity exceeds inventory unit precision';
  end if;

  return new;
end;
$$;

create trigger inventory_reservation_event_lines_validate
before insert on app_private.inventory_reservation_event_lines
for each row execute function app_private.validate_inventory_reservation_event_line();

create function app_private.create_inventory_reservation_core(
  target_organization_id uuid,
  target_command_id uuid,
  target_expires_at timestamptz,
  target_lines jsonb,
  target_reference_type text,
  target_reference_id text,
  target_composition_id uuid,
  target_sale_quantity numeric,
  target_reason text,
  target_created_by_user_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_reservation_id uuid;
  target_event_id uuid;
  target_reserved_at timestamptz := statement_timestamp();
  target_line_count integer;
  target_valid_line_count integer;
  reservation_line record;
  target_reservation_line_id uuid;
begin
  perform app_private.assert_inventory_actor(
    target_organization_id,
    target_created_by_user_id
  );

  if target_expires_at is null or target_expires_at <= target_reserved_at then
    raise exception using errcode = '23514', message = 'inventory reservation expiration must be in the future';
  end if;

  if target_lines is null
    or jsonb_typeof(target_lines) <> 'array'
    or jsonb_array_length(target_lines) not between 1 and 500
    or octet_length(target_lines::text) > 1048576 then
    raise exception using errcode = '22023', message = 'inventory reservation lines must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_lines) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'quantity' <> '{}'::jsonb
      or not submitted.line_value ?& array['inventory_item_id', 'location_id', 'quantity']
  ) then
    raise exception using errcode = '22023', message = 'inventory reservation line contract is invalid';
  end if;

  target_line_count := jsonb_array_length(target_lines);

  if (
    select count(*)
    from (
      select line.inventory_item_id, line.location_id
      from jsonb_to_recordset(target_lines) as line(
        inventory_item_id uuid,
        location_id uuid,
        quantity numeric
      )
      group by line.inventory_item_id, line.location_id
    ) as unique_line
  ) <> target_line_count then
    raise exception using
      errcode = '22023',
      message = 'inventory reservation must contain one line per item and location';
  end if;

  select count(*) into target_valid_line_count
  from jsonb_to_recordset(target_lines) as line(
    inventory_item_id uuid,
    location_id uuid,
    quantity numeric
  )
  join app_private.inventory_items as item
    on item.organization_id = target_organization_id
    and item.id = line.inventory_item_id
    and item.status = 'active'
  join app_private.catalog_units as unit_value
    on unit_value.organization_id = item.organization_id
    and unit_value.id = item.inventory_unit_id
    and unit_value.status = 'active'
  join app_private.inventory_locations as location
    on location.organization_id = target_organization_id
    and location.id = line.location_id
    and location.status = 'active'
  where line.quantity > 0
    and line.quantity <= 1000000000000
    and trunc(line.quantity, unit_value.decimal_scale) = line.quantity;

  if target_valid_line_count <> target_line_count then
    raise exception using
      errcode = '23514',
      message = 'inventory reservation requires active tenant resources and valid unit precision';
  end if;

  insert into app_private.inventory_reservations (
    organization_id,
    creation_command_id,
    reference_type,
    reference_id,
    composition_id,
    sale_quantity,
    reason,
    created_by_user_id,
    reserved_at,
    expires_at
  ) values (
    target_organization_id,
    target_command_id,
    target_reference_type,
    target_reference_id,
    target_composition_id,
    target_sale_quantity,
    target_reason,
    target_created_by_user_id,
    target_reserved_at,
    target_expires_at
  )
  returning id into target_reservation_id;

  insert into app_private.inventory_reservation_events (
    organization_id,
    reservation_id,
    command_id,
    action,
    reason,
    created_by_user_id,
    occurred_at
  ) values (
    target_organization_id,
    target_reservation_id,
    target_command_id,
    'created',
    target_reason,
    target_created_by_user_id,
    target_reserved_at
  )
  returning id into target_event_id;

  insert into app_private.inventory_balances (
    organization_id,
    inventory_item_id,
    location_id
  )
  select target_organization_id, line.inventory_item_id, line.location_id
  from jsonb_to_recordset(target_lines) as line(
    inventory_item_id uuid,
    location_id uuid,
    quantity numeric
  )
  on conflict (organization_id, inventory_item_id, location_id) do nothing;

  for reservation_line in
    select
      balance.id as balance_id,
      balance.inventory_item_id,
      balance.location_id,
      balance.on_hand_quantity,
      balance.reserved_quantity,
      line.quantity
    from jsonb_to_recordset(target_lines) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    join app_private.inventory_balances as balance
      on balance.organization_id = target_organization_id
      and balance.inventory_item_id = line.inventory_item_id
      and balance.location_id = line.location_id
    order by balance.inventory_item_id, balance.location_id
    for update of balance
  loop
    if reservation_line.on_hand_quantity - reservation_line.reserved_quantity
      < reservation_line.quantity then
      raise exception using
        errcode = '23514',
        message = 'inventory reservation exceeds available stock';
    end if;

    insert into app_private.inventory_reservation_lines (
      organization_id,
      reservation_id,
      inventory_item_id,
      location_id,
      reserved_quantity
    ) values (
      target_organization_id,
      target_reservation_id,
      reservation_line.inventory_item_id,
      reservation_line.location_id,
      reservation_line.quantity
    )
    returning id into target_reservation_line_id;

    update app_private.inventory_balances
    set reserved_quantity = reserved_quantity + reservation_line.quantity,
      version = version + 1
    where id = reservation_line.balance_id;

    insert into app_private.inventory_reservation_event_lines (
      organization_id,
      reservation_event_id,
      reservation_line_id,
      quantity
    ) values (
      target_organization_id,
      target_event_id,
      target_reservation_line_id,
      reservation_line.quantity
    );
  end loop;

  return target_reservation_id;
end;
$$;

create function api.create_inventory_reservation(
  target_organization_id uuid,
  target_idempotency_key text,
  target_expires_at timestamptz,
  target_lines jsonb,
  target_reason text,
  target_reference_type text default null,
  target_reference_id text default null,
  target_created_by_user_id uuid default null
)
returns table (
  reservation_id uuid,
  reservation_status text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_lines jsonb;
  request_payload jsonb;
  command_claim record;
  target_reservation_id uuid;
  target_status text;
begin
  if target_lines is null or jsonb_typeof(target_lines) <> 'array' then
    raise exception using errcode = '22023', message = 'inventory reservation lines must be an array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_lines) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'quantity' <> '{}'::jsonb
  ) then
    raise exception using errcode = '22023', message = 'inventory reservation line has unknown fields';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'inventory_item_id', line.inventory_item_id,
      'location_id', line.location_id,
      'quantity', line.quantity
    )
    order by line.inventory_item_id, line.location_id
  ) into normalized_lines
  from (
    select
      submitted.inventory_item_id,
      submitted.location_id,
      sum(submitted.quantity) as quantity
    from jsonb_to_recordset(target_lines) as submitted(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    group by submitted.inventory_item_id, submitted.location_id
  ) as line;

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'expires_at', target_expires_at,
    'lines', normalized_lines,
    'reason', target_reason,
    'reference_type', target_reference_type,
    'reference_id', target_reference_id,
    'created_by_user_id', target_created_by_user_id
  );

  select * into command_claim
  from app_private.claim_inventory_command(
    target_organization_id,
    target_idempotency_key,
    'inventory.reserve',
    request_payload
  );

  if command_claim.was_replayed then
    select reservation.id, reservation.status
      into target_reservation_id, target_status
    from app_private.inventory_reservations as reservation
    where reservation.organization_id = target_organization_id
      and reservation.creation_command_id = command_claim.claimed_command_id;

    if not found then
      raise exception using errcode = '40001', message = 'replayed inventory reservation is incomplete';
    end if;
  else
    target_reservation_id := app_private.create_inventory_reservation_core(
      target_organization_id,
      command_claim.claimed_command_id,
      target_expires_at,
      normalized_lines,
      target_reference_type,
      target_reference_id,
      null,
      null,
      target_reason,
      target_created_by_user_id
    );
    target_status := 'active';
  end if;

  return query select target_reservation_id, target_status, command_claim.was_replayed;
end;
$$;

create function api.create_inventory_composition_reservation(
  target_organization_id uuid,
  target_idempotency_key text,
  target_expires_at timestamptz,
  target_composition_id uuid,
  target_sale_quantity numeric,
  target_allocations jsonb,
  target_reason text,
  target_reference_type text default null,
  target_reference_id text default null,
  target_created_by_user_id uuid default null
)
returns table (
  reservation_id uuid,
  reservation_status text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_allocations jsonb;
  request_payload jsonb;
  command_claim record;
  target_reservation_id uuid;
  target_status text;
  sale_decimal_scale smallint;
  mismatch_count integer;
begin
  if target_allocations is null
    or jsonb_typeof(target_allocations) <> 'array'
    or jsonb_array_length(target_allocations) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'composition allocations must be a bounded array';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_allocations) as submitted(line_value)
    where jsonb_typeof(submitted.line_value) <> 'object'
      or submitted.line_value
        - 'inventory_item_id'
        - 'location_id'
        - 'quantity' <> '{}'::jsonb
      or not submitted.line_value ?& array['inventory_item_id', 'location_id', 'quantity']
  ) then
    raise exception using errcode = '22023', message = 'composition allocation contract is invalid';
  end if;

  select sale_unit.decimal_scale into sale_decimal_scale
  from app_private.inventory_compositions as composition
  join app_private.catalog_units as sale_unit
    on sale_unit.organization_id = composition.organization_id
    and sale_unit.id = composition.sale_unit_id
  where composition.organization_id = target_organization_id
    and composition.id = target_composition_id
    and composition.status = 'active'
    and sale_unit.status = 'active';

  if not found
    or target_sale_quantity is null
    or target_sale_quantity <= 0
    or target_sale_quantity > 1000000000000
    or trunc(target_sale_quantity, sale_decimal_scale) <> target_sale_quantity then
    raise exception using
      errcode = '23514',
      message = 'composition reservation requires an active composition and valid sale quantity';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'inventory_item_id', allocation.inventory_item_id,
      'location_id', allocation.location_id,
      'quantity', allocation.quantity
    )
    order by allocation.inventory_item_id, allocation.location_id
  ) into normalized_allocations
  from (
    select
      line.inventory_item_id,
      line.location_id,
      sum(line.quantity) as quantity
    from jsonb_to_recordset(target_allocations) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    group by line.inventory_item_id, line.location_id
  ) as allocation;

  if normalized_allocations is null or exists (
    select 1
    from jsonb_to_recordset(normalized_allocations) as allocation(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    where allocation.inventory_item_id is null
      or allocation.location_id is null
      or allocation.quantity is null
      or allocation.quantity <= 0
      or allocation.quantity > 1000000000000
  ) then
    raise exception using errcode = '23514', message = 'composition allocation quantity is invalid';
  end if;

  with allocated as (
    select line.inventory_item_id, sum(line.quantity) as quantity
    from jsonb_to_recordset(normalized_allocations) as line(
      inventory_item_id uuid,
      location_id uuid,
      quantity numeric
    )
    group by line.inventory_item_id
  ),
  required as (
    select
      component.inventory_item_id,
      component.quantity_per_sale_unit * target_sale_quantity as quantity
    from app_private.inventory_composition_components as component
    where component.organization_id = target_organization_id
      and component.composition_id = target_composition_id
  )
  select count(*) into mismatch_count
  from required
  full join allocated using (inventory_item_id)
  where required.inventory_item_id is null
    or allocated.inventory_item_id is null
    or required.quantity <> allocated.quantity;

  if mismatch_count <> 0 then
    raise exception using
      errcode = '23514',
      message = 'composition allocations must exactly match declared component reservation';
  end if;

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'expires_at', target_expires_at,
    'composition_id', target_composition_id,
    'sale_quantity', target_sale_quantity,
    'allocations', normalized_allocations,
    'reason', target_reason,
    'reference_type', target_reference_type,
    'reference_id', target_reference_id,
    'created_by_user_id', target_created_by_user_id
  );

  select * into command_claim
  from app_private.claim_inventory_command(
    target_organization_id,
    target_idempotency_key,
    'inventory.composition_reserve',
    request_payload
  );

  if command_claim.was_replayed then
    select reservation.id, reservation.status
      into target_reservation_id, target_status
    from app_private.inventory_reservations as reservation
    where reservation.organization_id = target_organization_id
      and reservation.creation_command_id = command_claim.claimed_command_id;

    if not found then
      raise exception using errcode = '40001', message = 'replayed composition reservation is incomplete';
    end if;
  else
    target_reservation_id := app_private.create_inventory_reservation_core(
      target_organization_id,
      command_claim.claimed_command_id,
      target_expires_at,
      normalized_allocations,
      target_reference_type,
      target_reference_id,
      target_composition_id,
      target_sale_quantity,
      target_reason,
      target_created_by_user_id
    );
    target_status := 'active';
  end if;

  return query select target_reservation_id, target_status, command_claim.was_replayed;
end;
$$;

create function api.transition_inventory_reservation(
  target_organization_id uuid,
  target_reservation_id uuid,
  target_idempotency_key text,
  target_action text,
  target_reason text,
  target_lines jsonb default null,
  target_created_by_user_id uuid default null,
  target_occurred_at timestamptz default null
)
returns table (
  reservation_event_id uuid,
  reservation_id uuid,
  reservation_status text,
  replayed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  submitted_lines jsonb;
  effective_lines jsonb;
  movement_lines jsonb;
  request_payload jsonb;
  command_claim record;
  target_reservation app_private.inventory_reservations%rowtype;
  target_event_id uuid;
  target_operation_id uuid;
  target_effective_at timestamptz := coalesce(target_occurred_at, statement_timestamp());
  target_status text;
  target_total_reserved numeric;
  target_total_consumed numeric;
  target_total_released numeric;
  target_total_remaining numeric;
begin
  if target_action not in ('consume', 'release', 'expire') then
    raise exception using errcode = '22023', message = 'invalid inventory reservation action';
  end if;

  if target_action = 'expire' and target_lines is not null then
    raise exception using errcode = '22023', message = 'expiration always applies to the full remaining reservation';
  end if;

  if target_lines is not null then
    if jsonb_typeof(target_lines) <> 'array'
      or jsonb_array_length(target_lines) not between 1 and 500 then
      raise exception using errcode = '22023', message = 'reservation transition lines must be a bounded array';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(target_lines) as submitted(line_value)
      where jsonb_typeof(submitted.line_value) <> 'object'
        or submitted.line_value
          - 'reservation_line_id'
          - 'quantity' <> '{}'::jsonb
        or not submitted.line_value ?& array['reservation_line_id', 'quantity']
    ) then
      raise exception using errcode = '22023', message = 'reservation transition line contract is invalid';
    end if;

    select jsonb_agg(
      jsonb_build_object(
        'reservation_line_id', line.reservation_line_id,
        'quantity', line.quantity
      )
      order by line.reservation_line_id
    ) into submitted_lines
    from (
      select
        submitted.reservation_line_id,
        sum(submitted.quantity) as quantity
      from jsonb_to_recordset(target_lines) as submitted(
        reservation_line_id uuid,
        quantity numeric
      )
      group by submitted.reservation_line_id
    ) as line;
  end if;

  request_payload := jsonb_build_object(
    'organization_id', target_organization_id,
    'reservation_id', target_reservation_id,
    'action', target_action,
    'reason', target_reason,
    'lines', submitted_lines,
    'created_by_user_id', target_created_by_user_id,
    'occurred_at', target_occurred_at
  );

  select * into command_claim
  from app_private.claim_inventory_command(
    target_organization_id,
    target_idempotency_key,
    'inventory.reservation.' || target_action,
    request_payload
  );

  if command_claim.was_replayed then
    select event_value.id, reservation.status
      into target_event_id, target_status
    from app_private.inventory_reservation_events as event_value
    join app_private.inventory_reservations as reservation
      on reservation.organization_id = event_value.organization_id
      and reservation.id = event_value.reservation_id
    where event_value.organization_id = target_organization_id
      and event_value.command_id = command_claim.claimed_command_id;

    if not found then
      raise exception using errcode = '40001', message = 'replayed reservation transition is incomplete';
    end if;

    return query
    select target_event_id, target_reservation_id, target_status, true;
    return;
  end if;

  perform app_private.assert_inventory_actor(
    target_organization_id,
    target_created_by_user_id
  );

  select * into target_reservation
  from app_private.inventory_reservations as reservation
  where reservation.organization_id = target_organization_id
    and reservation.id = target_reservation_id
  for update;

  if not found or target_reservation.closed_at is not null then
    raise exception using errcode = '23514', message = 'inventory reservation is not open';
  end if;

  if target_effective_at < target_reservation.reserved_at then
    raise exception using errcode = '23514', message = 'reservation transition cannot predate reservation';
  end if;

  if target_action = 'expire' and target_effective_at < target_reservation.expires_at then
    raise exception using errcode = '23514', message = 'inventory reservation has not expired';
  end if;

  if submitted_lines is null then
    select jsonb_agg(
      jsonb_build_object(
        'reservation_line_id', line.id,
        'quantity', line.reserved_quantity - line.consumed_quantity - line.released_quantity
      )
      order by line.id
    ) into effective_lines
    from app_private.inventory_reservation_lines as line
    where line.organization_id = target_organization_id
      and line.reservation_id = target_reservation_id
      and line.reserved_quantity - line.consumed_quantity - line.released_quantity > 0;
  else
    select jsonb_agg(
      jsonb_build_object(
        'reservation_line_id', submitted.reservation_line_id,
        'quantity', submitted.quantity
      )
      order by submitted.reservation_line_id
    ) into effective_lines
    from jsonb_to_recordset(submitted_lines) as submitted(
      reservation_line_id uuid,
      quantity numeric
    )
    join app_private.inventory_reservation_lines as line
      on line.organization_id = target_organization_id
      and line.reservation_id = target_reservation_id
      and line.id = submitted.reservation_line_id
    join app_private.inventory_items as item
      on item.organization_id = line.organization_id
      and item.id = line.inventory_item_id
    join app_private.catalog_units as unit_value
      on unit_value.organization_id = item.organization_id
      and unit_value.id = item.inventory_unit_id
    where submitted.quantity > 0
      and submitted.quantity <= line.reserved_quantity
        - line.consumed_quantity
        - line.released_quantity
      and trunc(submitted.quantity, unit_value.decimal_scale) = submitted.quantity;

    if jsonb_array_length(effective_lines) <> jsonb_array_length(submitted_lines) then
      raise exception using
        errcode = '23514',
        message = 'reservation transition exceeds remaining allocation or unit precision';
    end if;
  end if;

  if effective_lines is null or jsonb_array_length(effective_lines) = 0 then
    raise exception using errcode = '23514', message = 'inventory reservation has no remaining quantity';
  end if;

  perform balance.id
  from jsonb_to_recordset(effective_lines) as requested(
    reservation_line_id uuid,
    quantity numeric
  )
  join app_private.inventory_reservation_lines as line
    on line.organization_id = target_organization_id
    and line.id = requested.reservation_line_id
  join app_private.inventory_balances as balance
    on balance.organization_id = line.organization_id
    and balance.inventory_item_id = line.inventory_item_id
    and balance.location_id = line.location_id
  order by balance.inventory_item_id, balance.location_id
  for update of balance;

  update app_private.inventory_balances as balance
  set reserved_quantity = balance.reserved_quantity - requested_line.quantity,
    version = balance.version + 1
  from jsonb_to_recordset(effective_lines) as requested_line(
    reservation_line_id uuid,
    quantity numeric
  )
  join app_private.inventory_reservation_lines as reservation_line
    on reservation_line.organization_id = target_organization_id
    and reservation_line.id = requested_line.reservation_line_id
  where balance.organization_id = reservation_line.organization_id
    and balance.inventory_item_id = reservation_line.inventory_item_id
    and balance.location_id = reservation_line.location_id;

  if target_action = 'consume' then
    select jsonb_agg(
      jsonb_build_object(
        'inventory_item_id', line.inventory_item_id,
        'location_id', line.location_id,
        'effect', 'delta',
        'quantity', -requested.quantity
      )
      order by line.inventory_item_id, line.location_id
    ) into movement_lines
    from jsonb_to_recordset(effective_lines) as requested(
      reservation_line_id uuid,
      quantity numeric
    )
    join app_private.inventory_reservation_lines as line
      on line.organization_id = target_organization_id
      and line.id = requested.reservation_line_id;

    target_operation_id := app_private.post_inventory_movement(
      target_organization_id,
      command_claim.claimed_command_id,
      'reservation_consume',
      target_reason,
      movement_lines,
      'inventory_reservation',
      target_reservation_id::text,
      null,
      null,
      target_created_by_user_id,
      target_effective_at
    );
  end if;

  update app_private.inventory_reservation_lines as line
  set consumed_quantity = line.consumed_quantity
        + case when target_action = 'consume' then requested.quantity else 0 end,
    released_quantity = line.released_quantity
        + case when target_action in ('release', 'expire') then requested.quantity else 0 end
  from jsonb_to_recordset(effective_lines) as requested(
    reservation_line_id uuid,
    quantity numeric
  )
  where line.organization_id = target_organization_id
    and line.id = requested.reservation_line_id;

  select
    sum(line.reserved_quantity),
    sum(line.consumed_quantity),
    sum(line.released_quantity),
    sum(line.reserved_quantity - line.consumed_quantity - line.released_quantity)
    into
      target_total_reserved,
      target_total_consumed,
      target_total_released,
      target_total_remaining
  from app_private.inventory_reservation_lines as line
  where line.organization_id = target_organization_id
    and line.reservation_id = target_reservation_id;

  target_status := case
    when target_total_remaining > 0 and target_total_consumed > 0 then 'partially_consumed'
    when target_total_remaining > 0 then 'active'
    when target_action = 'expire' then 'expired'
    when target_total_consumed = target_total_reserved then 'consumed'
    when target_total_released = target_total_reserved then 'released'
    else 'closed'
  end;

  update app_private.inventory_reservations
  set status = target_status,
    closed_at = case when target_total_remaining = 0 then target_effective_at else null end
  where organization_id = target_organization_id
    and id = target_reservation_id;

  insert into app_private.inventory_reservation_events (
    organization_id,
    reservation_id,
    command_id,
    operation_id,
    action,
    reason,
    created_by_user_id,
    occurred_at
  ) values (
    target_organization_id,
    target_reservation_id,
    command_claim.claimed_command_id,
    target_operation_id,
    target_action,
    target_reason,
    target_created_by_user_id,
    target_effective_at
  )
  returning id into target_event_id;

  insert into app_private.inventory_reservation_event_lines (
    organization_id,
    reservation_event_id,
    reservation_line_id,
    quantity
  )
  select
    target_organization_id,
    target_event_id,
    requested.reservation_line_id,
    requested.quantity
  from jsonb_to_recordset(effective_lines) as requested(
    reservation_line_id uuid,
    quantity numeric
  );

  return query
  select target_event_id, target_reservation_id, target_status, false;
end;
$$;

alter table app_private.inventory_items enable row level security;
alter table app_private.inventory_items force row level security;
alter table app_private.inventory_locations enable row level security;
alter table app_private.inventory_locations force row level security;
alter table app_private.inventory_compositions enable row level security;
alter table app_private.inventory_compositions force row level security;
alter table app_private.inventory_composition_components enable row level security;
alter table app_private.inventory_composition_components force row level security;
alter table app_private.inventory_commands enable row level security;
alter table app_private.inventory_commands force row level security;
alter table app_private.inventory_balances enable row level security;
alter table app_private.inventory_balances force row level security;
alter table app_private.inventory_operations enable row level security;
alter table app_private.inventory_operations force row level security;
alter table app_private.inventory_movements enable row level security;
alter table app_private.inventory_movements force row level security;
alter table app_private.inventory_reservations enable row level security;
alter table app_private.inventory_reservations force row level security;
alter table app_private.inventory_reservation_lines enable row level security;
alter table app_private.inventory_reservation_lines force row level security;
alter table app_private.inventory_reservation_events enable row level security;
alter table app_private.inventory_reservation_events force row level security;
alter table app_private.inventory_reservation_event_lines enable row level security;
alter table app_private.inventory_reservation_event_lines force row level security;

create policy inventory_items_member_select
on app_private.inventory_items for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_items.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_locations_member_select
on app_private.inventory_locations for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_locations.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_compositions_member_select
on app_private.inventory_compositions for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_compositions.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_composition_components_member_select
on app_private.inventory_composition_components for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_composition_components.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_commands_operator_select
on app_private.inventory_commands for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_commands.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and membership.role in ('owner', 'admin', 'operator')
));

create policy inventory_balances_member_select
on app_private.inventory_balances for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_balances.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_operations_member_select
on app_private.inventory_operations for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_operations.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_movements_member_select
on app_private.inventory_movements for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_movements.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_reservations_member_select
on app_private.inventory_reservations for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_reservations.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_reservation_lines_member_select
on app_private.inventory_reservation_lines for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_reservation_lines.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_reservation_events_member_select
on app_private.inventory_reservation_events for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_reservation_events.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create policy inventory_reservation_event_lines_member_select
on app_private.inventory_reservation_event_lines for select to authenticated
using (exists (
  select 1
  from app_private.organization_memberships as membership
  where membership.organization_id = inventory_reservation_event_lines.organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
));

create view api.inventory_items
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  variant_id,
  inventory_unit_id,
  status,
  retired_at,
  created_at,
  updated_at
from app_private.inventory_items;

create view api.inventory_locations
with (security_invoker = true, security_barrier = true)
as
select id, organization_id, code, name, description, status, created_at, updated_at
from app_private.inventory_locations;

create view api.inventory_compositions
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  offered_variant_id,
  sale_unit_id,
  status,
  effective_at,
  retired_at,
  evidence_id,
  created_at,
  updated_at
from app_private.inventory_compositions;

create view api.inventory_composition_components
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  composition_id,
  inventory_item_id,
  quantity_per_sale_unit,
  created_at
from app_private.inventory_composition_components;

create view api.inventory_balances
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  inventory_item_id,
  location_id,
  on_hand_quantity,
  reserved_quantity,
  available_quantity,
  version,
  created_at,
  updated_at
from app_private.inventory_balances;

create view api.inventory_availability
with (security_invoker = true, security_barrier = true)
as
select
  item.organization_id,
  item.id as inventory_item_id,
  item.variant_id,
  item.inventory_unit_id,
  coalesce(sum(balance.on_hand_quantity), 0::numeric) as on_hand_quantity,
  coalesce(sum(balance.reserved_quantity), 0::numeric) as reserved_quantity,
  coalesce(sum(balance.available_quantity), 0::numeric) as available_quantity,
  max(balance.updated_at) as balance_updated_at
from app_private.inventory_items as item
left join app_private.inventory_balances as balance
  on balance.organization_id = item.organization_id
  and balance.inventory_item_id = item.id
group by item.organization_id, item.id, item.variant_id, item.inventory_unit_id;

create view api.inventory_composition_availability
with (security_invoker = true, security_barrier = true)
as
select
  composition.organization_id,
  composition.id as composition_id,
  composition.offered_variant_id,
  composition.sale_unit_id,
  min(
    trunc(
      coalesce(item_availability.available_quantity, 0::numeric)
        / component.quantity_per_sale_unit,
      sale_unit.decimal_scale
    )
  ) as available_sale_quantity
from app_private.inventory_compositions as composition
join app_private.catalog_units as sale_unit
  on sale_unit.organization_id = composition.organization_id
  and sale_unit.id = composition.sale_unit_id
join app_private.inventory_composition_components as component
  on component.organization_id = composition.organization_id
  and component.composition_id = composition.id
left join api.inventory_availability as item_availability
  on item_availability.organization_id = component.organization_id
  and item_availability.inventory_item_id = component.inventory_item_id
where composition.status = 'active'
group by
  composition.organization_id,
  composition.id,
  composition.offered_variant_id,
  composition.sale_unit_id;

create view api.inventory_operations
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  operation_code,
  reason,
  reference_type,
  reference_id,
  composition_id,
  sale_quantity,
  created_by_user_id,
  occurred_at,
  created_at
from app_private.inventory_operations;

create view api.inventory_movements
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  operation_id,
  inventory_item_id,
  location_id,
  quantity_delta,
  on_hand_quantity_after,
  reserved_quantity_after,
  created_at
from app_private.inventory_movements;

create view api.inventory_reservations
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  status,
  reference_type,
  reference_id,
  composition_id,
  sale_quantity,
  reason,
  created_by_user_id,
  reserved_at,
  expires_at,
  closed_at,
  created_at,
  updated_at
from app_private.inventory_reservations;

create view api.inventory_reservation_lines
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  reservation_id,
  inventory_item_id,
  location_id,
  reserved_quantity,
  consumed_quantity,
  released_quantity,
  created_at,
  updated_at
from app_private.inventory_reservation_lines;

create view api.inventory_reservation_events
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  reservation_id,
  operation_id,
  action,
  reason,
  created_by_user_id,
  occurred_at,
  created_at
from app_private.inventory_reservation_events;

create view api.inventory_reservation_event_lines
with (security_invoker = true, security_barrier = true)
as
select
  id,
  organization_id,
  reservation_event_id,
  reservation_line_id,
  quantity,
  created_at
from app_private.inventory_reservation_event_lines;

revoke all on
  app_private.inventory_items,
  app_private.inventory_locations,
  app_private.inventory_compositions,
  app_private.inventory_composition_components,
  app_private.inventory_commands,
  app_private.inventory_balances,
  app_private.inventory_operations,
  app_private.inventory_movements,
  app_private.inventory_reservations,
  app_private.inventory_reservation_lines,
  app_private.inventory_reservation_events,
  app_private.inventory_reservation_event_lines
from public, anon, authenticated, service_role;

revoke all on
  api.inventory_items,
  api.inventory_locations,
  api.inventory_compositions,
  api.inventory_composition_components,
  api.inventory_balances,
  api.inventory_availability,
  api.inventory_composition_availability,
  api.inventory_operations,
  api.inventory_movements,
  api.inventory_reservations,
  api.inventory_reservation_lines,
  api.inventory_reservation_events,
  api.inventory_reservation_event_lines
from public, anon, authenticated, service_role;

grant select on
  app_private.inventory_items,
  app_private.inventory_locations,
  app_private.inventory_compositions,
  app_private.inventory_composition_components,
  app_private.inventory_commands,
  app_private.inventory_balances,
  app_private.inventory_operations,
  app_private.inventory_movements,
  app_private.inventory_reservations,
  app_private.inventory_reservation_lines,
  app_private.inventory_reservation_events,
  app_private.inventory_reservation_event_lines
to authenticated, service_role;

grant insert, update on
  app_private.inventory_items,
  app_private.inventory_locations,
  app_private.inventory_compositions
to service_role;

grant insert on app_private.inventory_composition_components to service_role;

grant select on
  api.inventory_items,
  api.inventory_locations,
  api.inventory_compositions,
  api.inventory_composition_components,
  api.inventory_balances,
  api.inventory_availability,
  api.inventory_composition_availability,
  api.inventory_operations,
  api.inventory_movements,
  api.inventory_reservations,
  api.inventory_reservation_lines,
  api.inventory_reservation_events,
  api.inventory_reservation_event_lines
to authenticated, service_role;

revoke all on function app_private.prevent_inventory_item_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_item_unit()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_inventory_location_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_composition()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_composition_component()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_balance()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_inventory_reservation_core_rewrite()
  from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_reservation_line()
  from public, anon, authenticated, service_role;
revoke all on function app_private.prevent_active_inventory_unit_retirement()
  from public, anon, authenticated, service_role;
revoke all on function app_private.assert_inventory_actor(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function app_private.claim_inventory_command(uuid, text, text, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function app_private.post_inventory_movement(
  uuid, uuid, text, text, jsonb, text, text, uuid, numeric, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function app_private.validate_inventory_reservation_event_line()
  from public, anon, authenticated, service_role;
revoke all on function app_private.create_inventory_reservation_core(
  uuid, uuid, timestamptz, jsonb, text, text, uuid, numeric, text, uuid
) from public, anon, authenticated, service_role;

revoke all on function api.apply_inventory_movement(
  uuid, text, text, text, jsonb, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.apply_inventory_composition_movement(
  uuid, text, text, text, uuid, numeric, jsonb, text, text, uuid, timestamptz
) from public, anon, authenticated, service_role;
revoke all on function api.resolve_inventory_requirements(uuid, uuid, numeric)
  from public, anon, authenticated, service_role;
revoke all on function api.create_inventory_reservation(
  uuid, text, timestamptz, jsonb, text, text, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.create_inventory_composition_reservation(
  uuid, text, timestamptz, uuid, numeric, jsonb, text, text, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function api.transition_inventory_reservation(
  uuid, uuid, text, text, text, jsonb, uuid, timestamptz
) from public, anon, authenticated, service_role;

grant execute on function api.apply_inventory_movement(
  uuid, text, text, text, jsonb, text, text, uuid, timestamptz
) to service_role;
grant execute on function api.apply_inventory_composition_movement(
  uuid, text, text, text, uuid, numeric, jsonb, text, text, uuid, timestamptz
) to service_role;
grant execute on function api.create_inventory_reservation(
  uuid, text, timestamptz, jsonb, text, text, text, uuid
) to service_role;
grant execute on function api.create_inventory_composition_reservation(
  uuid, text, timestamptz, uuid, numeric, jsonb, text, text, text, uuid
) to service_role;
grant execute on function api.transition_inventory_reservation(
  uuid, uuid, text, text, text, jsonb, uuid, timestamptz
) to service_role;
grant execute on function api.resolve_inventory_requirements(uuid, uuid, numeric)
  to authenticated, service_role;

revoke all on all tables in schema app_private from public, anon;
revoke all on all tables in schema api from public, anon;

comment on table app_private.inventory_items is
  'Variant-scoped inventory identity with an explicit organization-defined unit';
comment on table app_private.inventory_locations is
  'Organization-defined physical or logical stock locations; no product semantics are inferred';
comment on table app_private.inventory_compositions is
  'Versioned sellable-unit consumption contract for direct items, sets, packages and kits';
comment on table app_private.inventory_composition_components is
  'Append-only explicit component quantities; category and product names never infer consumption';
comment on table app_private.inventory_commands is
  'Global organization-scoped idempotency ledger with canonical request fingerprints';
comment on table app_private.inventory_balances is
  'Locked projection of physical and reserved quantities; the append-only ledger remains authoritative';
comment on table app_private.inventory_operations is
  'Immutable inventory transaction header with reason, reference, actor and optional composition provenance';
comment on table app_private.inventory_movements is
  'Immutable physical quantity deltas and after-images for each operation balance';
comment on table app_private.inventory_reservations is
  'Reservation lifecycle projection preserving original request, expiration and terminal time';
comment on table app_private.inventory_reservation_lines is
  'Per-balance reservation allocation with monotonic consumed and released quantities';
comment on table app_private.inventory_reservation_events is
  'Append-only idempotent reservation transition history';
comment on table app_private.inventory_reservation_event_lines is
  'Append-only quantities affected by each reservation transition';
comment on view api.inventory_composition_availability is
  'Derived availability for any active direct or composite offer using declared components only';
comment on function api.apply_inventory_movement(
  uuid, text, text, text, jsonb, text, text, uuid, timestamptz
) is 'Atomic idempotent delta/set movement; intent interpretation belongs to LLM tool calling';
comment on function api.apply_inventory_composition_movement(
  uuid, text, text, text, uuid, numeric, jsonb, text, text, uuid, timestamptz
) is 'Atomic consumption that must exactly match a declared active composition';
comment on function api.create_inventory_reservation(
  uuid, text, timestamptz, jsonb, text, text, text, uuid
) is 'Atomic idempotent reservation of explicit inventory allocations';
comment on function api.create_inventory_composition_reservation(
  uuid, text, timestamptz, uuid, numeric, jsonb, text, text, text, uuid
) is 'Atomic package or kit reservation validated against declared composition';
comment on function api.transition_inventory_reservation(
  uuid, uuid, text, text, text, jsonb, uuid, timestamptz
) is 'Atomic partial consume, release or expiration with immutable event history';

commit;
