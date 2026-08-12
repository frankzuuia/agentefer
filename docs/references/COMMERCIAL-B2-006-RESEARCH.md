# Investigación oficial B2-006 — flujo comercial

Fecha de revisión: 2026-08-11.

## Fuentes aplicadas

- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase Data API security: https://supabase.com/docs/guides/api/securing-your-api
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html

## Decisiones derivadas

- RLS es defensa en profundidad, no sustituto de grants; por eso se revoca escritura directa y se fuerza RLS.
- Las funciones con privilegios elevados fijan `search_path` vacío y usan nombres calificados.
- FKs compuestas preservan organización en toda referencia; índices cubren las columnas referenciantes.
- Constraints parciales materializan “una asignación activa” y “un handoff pendiente” sin depender de una lectura previa vulnerable a carrera.
- `SELECT ... FOR UPDATE` serializa transiciones y cumplimiento de pedido.
- Idempotencia guarda huella canónica y detecta reuso conflictivo; no se limita a `ON CONFLICT DO NOTHING`.
- Eventos y snapshots append-only conservan evidencia aunque catálogo, contacto o precio cambien.

## Riesgos que el esquema no finge resolver

- Meta/WhatsApp/Messenger aún no están autorizados; no se marca ninguna entrega externa como real.
- La política de pagos/impuestos/devoluciones no existe; venta no contiene estado de pago.
- El endpoint público y rate limit pertenecen a B6; `anon` queda cerrado.
- La interpretación de “dile que cuesta”, intención de compra y ambigüedad pertenece al LLM/tools B3/B5.
