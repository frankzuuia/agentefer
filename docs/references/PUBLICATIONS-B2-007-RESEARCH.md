# Investigación oficial B2-007 — publicaciones sociales

Fecha de revisión: 2026-08-12.

## Fuentes aplicadas

- Meta Pages API posts: https://developers.facebook.com/docs/pages-api/posts
- Meta Graph API Page feed: https://developers.facebook.com/docs/graph-api/reference/page/feed/
- Messenger Platform overview: https://developers.facebook.com/docs/messenger-platform/overview
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Database Functions: https://supabase.com/docs/guides/database/functions
- Supabase Queues/pgmq: https://supabase.com/docs/guides/queues/pgmq
- Supabase Cron: https://supabase.com/docs/guides/cron
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL explicit locking: https://www.postgresql.org/docs/current/explicit-locking.html

## Estado real comprobado

- El proyecto enlazado exclusivo es `hprdctmblmfcoagugvyp` (`AgenteFer`).
- PostgreSQL remoto reportó versión 17.6 durante la auditoría B2-007.
- `pgmq` 1.5.1 y `pg_cron` 1.6.4 están disponibles, pero no se instalaron en B2-007.
- El historial remoto permanece 9/9 hasta que esta migración supere todas las puertas y se aplique de forma explícita.
- No existen todavía App, Página, token, permisos ni webhook Meta entregados para AgenteFer; ninguna publicación externa se declara probada.

## Decisiones derivadas

- Página de Facebook y Marketplace son superficies diferentes. B2-007 modela `facebook_page`; Marketplace permanece NO-BUILD sin API oficial y permisos reales demostrados.
- Una capacidad documentada no equivale a capacidad concedida. `social_capabilities` guarda observaciones append-only y la autorización usa la más reciente y vigente.
- Los secretos no se guardan ni proyectan: `credential_reference` apunta al gestor de secretos del runtime y se omite de `api.social_connections`.
- Un contenido aprobado es un snapshot de variante, precio, disponibilidad y medios; el texto no es autoridad de precio o stock.
- La publicación se reautoriza después del claim y justo antes del efecto externo. Se vuelven a consultar conexión, capacidad, versión, catálogo, precio e inventario.
- `refresh` significa crear una nueva instancia externa y conservar la anterior. No se sobreescribe el ID del post viejo, porque puede seguir originando conversaciones de Messenger.
- Un worker perdido antes de iniciar el efecto puede reintentarse. Si se perdió después de iniciarlo, el estado es `uncertain` y requiere conciliación; no se publica otra vez a ciegas.
- Una ocurrencia programada guarda `schedule_id`, `generation` y `schedule_occurrence_at`; el avance de `next_run_at` es atómico con la expansión del lote.
- `pgmq` y `pg_cron` se conectarán en B4 mediante migraciones versionadas y workers durables. B2-007 no instala extensiones sin que exista el transporte real que las consume.

## Límites que no se fingen resueltos

- No se conocen la versión Graph efectiva, permisos concedidos, revisión de App, cuotas o restricciones específicas de la cuenta real.
- La validación sintáctica de cron y el cálculo de la siguiente ocurrencia pertenecen al scheduler real; la base sólo acepta un horario previamente marcado `valid` y una transición temporal exacta.
- No se llama a Meta desde PostgreSQL. La base registra intentos, leases, autorización, certeza de efecto, respuesta resumida e identidad externa proporcionada por el adapter.
- WhatsApp y Messenger siguen siendo reactivos al mensaje del cliente; los lotes B2-007 son publicaciones de Página, no campañas de spam.
- Repetir contenido debe respetar políticas y capacidades vigentes de Meta. La frecuencia queda en configuración versionada, no hardcodeada en SQL.
