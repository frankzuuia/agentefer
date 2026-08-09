begin;

create or replace function app_private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := greatest(
    pg_catalog.clock_timestamp(),
    old.updated_at + interval '1 microsecond'
  );
  return new;
end;
$$;

comment on function app_private.set_updated_at() is
  'Assigns a strictly monotonic row update timestamp, including multi-operation RPC statements';

commit;
