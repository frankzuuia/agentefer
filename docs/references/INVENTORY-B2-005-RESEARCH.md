# AgenteFer — investigación Supabase/PostgreSQL para B2-005

Fecha de revisión: 2026-08-11.  
Alcance: inventario transaccional, composición, ubicaciones, ledger, saldos, reservas, RLS y RPC.

## Fuentes oficiales revisadas

- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): RLS debe habilitarse en tablas expuestas, las policies se comportan como filtros por fila y conviene envolver `auth.uid()` en un `select` estable por statement.
- [Supabase Database Functions](https://supabase.com/docs/guides/database/functions): `security invoker` es la preferencia general; una función `security definer` requiere `search_path` seguro y referencias calificadas. Los privilegios `EXECUTE` deben revocarse/concederse expresamente.
- [Supabase Securing your API](https://supabase.com/docs/guides/api/securing-your-api): los grants de tabla y RLS son capas distintas; una superficie dedicada como `api` reduce exposición accidental.
- [Supabase breaking changes](https://supabase.com/changelog?types=breaking-change): no existe un cambio vigente que bloquee B2-005. La retirada de `logs.all`, cambios de realtime/self-hosted y de exposición automática no alteran este diseño privado.

## Reglas PostgreSQL aplicadas

Se usaron las prácticas oficiales distribuidas con la integración Supabase para:

- FK compuestas `(organization_id, id)` y un índice cuyo prefijo cubre cada FK;
- índices parciales para composiciones activas, reservas abiertas y saldos disponibles;
- `numeric` exacto y precisión gobernada por `catalog_units.decimal_scale`;
- transacciones cortas y bloqueos de saldos en orden estable `(inventory_item_id, location_id)`;
- `INSERT ... ON CONFLICT` para reclamar idempotencia sin check-then-write;
- vistas `security_invoker/security_barrier`, RLS forzado y privilegio mínimo;
- funciones `security definer` sólo para mutación atómica, con `search_path = ''` y acceso `service_role` explícito.

## Decisiones derivadas

1. No se creó una tabla o columna por llantas, rines, tinacos, tambos ni cantidades 1–4. `inventory_items`, unidades configurables y composiciones cubren cualquier rubro.
2. Precio, stock, pausa y publicación permanecen separados. Stock cero no reescribe estado comercial ni borra historia.
3. Un único `inventory_commands` gobierna idempotencia para movimientos y reservas. La misma clave con otro contrato falla aunque el segundo comando sea de otro tipo.
4. `inventory_movements` y eventos son append-only; `inventory_balances` es una proyección protegida, no la fuente histórica.
5. Las reservas admiten consumo/liberación parcial y expiración del remanente. Consumir baja existencia y reserva dentro de la misma transacción.
6. Paquetes y kits se validan contra componentes declarados. Una asignación incompleta revierte toda la operación.
7. `anon` permanece sin acceso en B2-005; la apertura pública del catálogo se hará en B6 con una superficie mínima específica.

## Verificación contra cambios actuales

El proyecto usa `app_private` fuera de la Data API y vistas explícitas en `api`; por eso no depende de exposición heredada de `public`. No se fijaron versiones de extensiones, no se alteró `realtime`, no se usa `logs.all` y no se toca infraestructura self-hosted. El diseño permanece compatible con los cambios anunciados revisados el 2026-08-11.
