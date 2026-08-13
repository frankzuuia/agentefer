begin;

-- PL/pgSQL declares the integer FOR-loop target implicitly. Removing the
-- redundant declaration preserves the exact comparison algorithm while
-- eliminating shadowed/unused-variable warnings from plpgsql_check.
create or replace function app_private.constant_time_bytea_equal(
  left_value bytea,
  right_value bytea
)
returns boolean
language plpgsql
immutable
strict
parallel safe
set search_path = ''
as $$
declare
  difference integer := 0;
  value_length integer := octet_length(left_value);
begin
  if value_length <> octet_length(right_value) then
    return false;
  end if;

  if value_length = 0 then
    return true;
  end if;

  for byte_index in 0..(value_length - 1) loop
    difference := difference | (
      get_byte(left_value, byte_index) # get_byte(right_value, byte_index)
    );
  end loop;

  return difference = 0;
end;
$$;

commit;
