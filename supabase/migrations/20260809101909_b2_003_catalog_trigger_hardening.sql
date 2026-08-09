begin;

drop trigger catalog_categories_prevent_reassignment
  on app_private.catalog_categories;
drop trigger catalog_units_prevent_reassignment
  on app_private.catalog_units;
drop trigger products_prevent_reassignment
  on app_private.products;
drop trigger product_variants_prevent_reassignment
  on app_private.product_variants;
drop trigger catalog_ingestion_drafts_prevent_reassignment
  on app_private.catalog_ingestion_drafts;

drop function app_private.prevent_catalog_scope_reassignment();

create function app_private.prevent_catalog_category_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.code is distinct from old.code then
    raise exception using
      errcode = '23514',
      message = 'category organization and code are immutable';
  end if;

  return new;
end;
$$;

create function app_private.prevent_catalog_unit_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.code is distinct from old.code
    or new.quantity_kind is distinct from old.quantity_kind
    or new.decimal_scale is distinct from old.decimal_scale then
    raise exception using
      errcode = '23514',
      message = 'unit organization, identity and precision are immutable';
  end if;

  return new;
end;
$$;

create function app_private.prevent_product_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.category_id is distinct from old.category_id then
    raise exception using
      errcode = '23514',
      message = 'product organization and category are immutable';
  end if;

  return new;
end;
$$;

create function app_private.prevent_product_variant_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.product_id is distinct from old.product_id then
    raise exception using
      errcode = '23514',
      message = 'variant organization and product are immutable';
  end if;

  return new;
end;
$$;

create function app_private.prevent_catalog_draft_reassignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.organization_id is distinct from old.organization_id
    or new.source_conversation_id is distinct from old.source_conversation_id
    or new.source_message_id is distinct from old.source_message_id then
    raise exception using
      errcode = '23514',
      message = 'draft organization and source evidence are immutable';
  end if;

  return new;
end;
$$;

create trigger catalog_categories_prevent_reassignment
before update on app_private.catalog_categories
for each row execute function app_private.prevent_catalog_category_reassignment();

create trigger catalog_units_prevent_reassignment
before update on app_private.catalog_units
for each row execute function app_private.prevent_catalog_unit_reassignment();

create trigger products_prevent_reassignment
before update on app_private.products
for each row execute function app_private.prevent_product_reassignment();

create trigger product_variants_prevent_reassignment
before update on app_private.product_variants
for each row execute function app_private.prevent_product_variant_reassignment();

create trigger catalog_ingestion_drafts_prevent_reassignment
before update on app_private.catalog_ingestion_drafts
for each row execute function app_private.prevent_catalog_draft_reassignment();

revoke all on function
  app_private.prevent_catalog_category_reassignment(),
  app_private.prevent_catalog_unit_reassignment(),
  app_private.prevent_product_reassignment(),
  app_private.prevent_product_variant_reassignment(),
  app_private.prevent_catalog_draft_reassignment()
from public, anon, authenticated, service_role;

comment on function app_private.prevent_catalog_category_reassignment() is
  'Typed category immutability guard; never accesses fields from unrelated trigger records';
comment on function app_private.prevent_catalog_unit_reassignment() is
  'Typed unit immutability guard; never accesses fields from unrelated trigger records';
comment on function app_private.prevent_product_reassignment() is
  'Typed product tenant and category immutability guard';
comment on function app_private.prevent_product_variant_reassignment() is
  'Typed variant tenant and product immutability guard';
comment on function app_private.prevent_catalog_draft_reassignment() is
  'Typed ingestion draft tenant and source immutability guard';

commit;
