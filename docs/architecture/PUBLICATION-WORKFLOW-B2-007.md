# AgenteFer — workflow de publicaciones B2-007

## Propósito

B2-007 convierte una intención explícita de Fer —publicar, refrescar, sincronizar, pausar o cancelar— en trabajo durable y auditable. PostgreSQL no interpreta lenguaje ni redacta anuncios. El LLM futuro decide qué tool invocar; la base aplica invariantes deterministas sobre IDs, organización, estados, idempotencia y efectos externos.

El diseño es universal: una publicación referencia `product_variants`. No existen columnas o ramas para llantas, rines, tinacos o cualquier categoría particular.

## Ownership

- B2-001: organizaciones, usuarios, membresías y roles.
- B2-002: Messenger, conversaciones e identidad de cliente.
- B2-003: producto, variante, SKU, evidencia y medios.
- B2-004: precio exacto, moneda, unidad, vigencia y `on_request`.
- B2-005: disponibilidad real, composición y movimientos.
- B2-007: conexión social de Página, capacidades observadas, publicación lógica, versiones, horarios, lotes, jobs, instancias y eventos.

## Modelo físico

### Comandos y auditoría

`publication_commands` conserva clave idempotente por organización, operación, payload canónico, huella SHA-256 y resultado. Misma clave y mismo contrato devuelven replay; la misma clave con otro contrato falla. `publication_events` es append-only y enlaza de forma tipada conexión, publicación, versión, horario, lote, job o instancia.

### Conexiones y capacidades

`social_connections` representa exclusivamente `meta/facebook_page`. El estado `active` exige identidad externa, versión API, referencia de credencial y momentos de conexión/verificación. La referencia secreta vive sólo en `app_private`.

`social_capabilities` es un ledger de observaciones `unknown`, `granted`, `denied`, `revoked` o `expired`. La vista vigente selecciona la observación más reciente por conexión/código. Ninguna fila se actualiza para fingir que el permiso siempre fue otro.

### Publicación y versiones

`publications` da identidad lógica única a `(organization, connection, variant)` mientras no esté retirada. `publication_versions` conserva texto, payload, precio y disponibilidad del momento. Una versión `priced` referencia el tier exacto; una versión `on_request` mantiene monto, moneda y método nulos. `publication_media` acepta sólo imágenes verificadas y scoped.

Sólo owner/admin aprueba. La aprobación supersede la versión anterior y selecciona la nueva en una transacción. `current_version_id` siempre apunta a una versión `approved` de la misma publicación.

### Horarios y lotes

`publication_schedules` conserva timezone IANA, expresión cron, política, selección, operación, estado de validación y `generation`. Cambiar configuración incrementa generación exactamente una vez y obliga a revalidar.

`publication_batches` snapshottea selección/política. Una ocurrencia programada es única por organización, horario, generación y momento. La expansión crea como máximo un job por publicación elegible. Cancelar termina pendientes/retryable y conserva processing/uncertain para conciliación.

### Jobs, leases y efectos

`publication_jobs` usa `FOR UPDATE SKIP LOCKED`, lease temporal, contador de intentos y `external_effect_key` globalmente única por organización. El worker sigue esta secuencia:

1. claim;
2. autorización tardía;
3. marca `effect_started_at` inmediatamente antes de la llamada;
4. registra resultado con certeza `not_started`, `confirmed_applied`, `confirmed_not_applied` o `unknown`.

La autorización bloquea con razones explícitas: `social_connection_not_active`, `required_capability_not_granted`, `publication_version_not_current`, `catalog_offer_not_active`, `catalog_snapshot_stale`, `price_snapshot_stale` o `stock_unavailable`.

Un lease expirado antes del efecto pasa a `retryable` si quedan intentos. Después del efecto pasa a `uncertain`. La misma `external_effect_key` no puede crear otro job, impidiendo reintentos ciegos.

### Instancias y atribución Messenger

`publication_instances` registra cada post externo confirmado con conexión, publicación, versión, job, ID externo, URL y timestamps del proveedor. `refresh` crea una nueva instancia. La vista `api.publication_origin_lookup` permite resolver un post histórico hacia su variante/precio y atender primero ese interés cuando Messenger origine la conversación.

## Seguridad

- 11 tablas con RLS habilitado y forzado; 11 policies de lectura por membresía/rol.
- 13 vistas `security_invoker/security_barrier`; `anon` no recibe privilegios.
- 18 RPCs mutadoras ejecutables sólo por `service_role`; navegador autenticado no puede reclamar jobs ni registrar efectos.
- Funciones `SECURITY DEFINER` con `search_path = ''` y nombres calificados.
- FKs compuestas preservan organización y todas las columnas referenciantes tienen índice.
- Historial, snapshots, contratos de efecto y provenance se protegen con triggers y constraints.
- JSON, texto, IDs, prioridades, intentos y leases tienen límites físicos.

## Concurrencia y recuperación

- Índice parcial: una publicación operacional por conexión/variante.
- Constraint: una `external_effect_key` por organización.
- Índice único: una ocurrencia por horario/generación/momento.
- Locks serializan aprobación, expansión, cancelación, reconciliación y transiciones.
- `SKIP LOCKED` permite varios workers sin doble claim.
- Estados terminales no se reactivan; un efecto incierto no se oculta como fallo seguro.

## Frontera de automatización

B2-007 deja el contrato preparado para Supabase Queues/pgmq, Supabase Cron y el adapter Meta, pero no los finge. B4 conectará cola, scheduler, Graph API, secretos y webhooks reales mediante configuración/migraciones reproducibles. La lógica cognitiva usará tool calling nativo; no habrá regex ni árbol `if/else` para adivinar intención del usuario.
