# AgenteFer — contrato comercial transaccional B2-006

## Propósito

B2-006 conecta conversaciones, catálogo, precios e inventario con trabajo comercial durable. No interpreta lenguaje ni decide intención: el LLM futuro elige una tool; PostgreSQL valida identidad, organización, estados, idempotencia y efectos representables.

Las distinciones son obligatorias:

- interés no equivale a pedido;
- pedido no equivale a venta;
- venta no equivale a pago;
- pendiente resuelta no equivale a mensaje entregado;
- handoff solicitado no equivale a handoff aceptado;
- snapshot histórico no se reescribe cuando cambia catálogo o precio.

Pagos, anticipos, impuestos, reembolsos monetarios y envíos siguen fuera de alcance porque su política real no está decidida. Las reversiones de registro comercial sí conservan la corrección append-only, pero no afirman que haya ocurrido un reembolso. No se crean estados que aparenten dinero recibido.

## Ownership y conexiones

- B2-002 conserva propiedad de `contacts`, identidades, conversaciones, mensajes, consentimientos y `outbox_events`.
- B2-003 conserva producto, variante, SKU y unidades.
- B2-004 conserva libros y tiers de precio; B2-006 copia sólo el snapshot aplicado.
- B2-005 conserva balances, reservas y operaciones físicas; B2-006 enlaza reservas/operaciones sin reescribir el ledger.
- B2-006 es propietario de pendientes comerciales, leads, oportunidades, asignaciones, handoffs, pedidos y ventas.

## Modelo físico

### Idempotencia y auditoría

- `commercial_commands`: clave global por organización, operación, huella SHA-256 del contrato canónico y resultado enlazable.
- `commercial_events`: ledger append-only con exactamente un sujeto real (`pending_request`, `lead`, `opportunity`, `handoff`, `order` o `sale`), estado anterior/nuevo, actor, razón y payload acotado.

La misma clave y la misma huella devuelven replay. La misma clave con otro contrato falla. Un fallo transaccional revierte también el claim.

### Pendientes

`pending_requests` conserva conversación, contacto, mensaje origen opcional, variante/unidad/cantidad opcionales, campos solicitados, contexto recopilado, deadline, resolución y vínculo opcional al efecto de salida. Resolver no cambia precios por sí mismo y no declara envío exitoso.

Estados: `open`, `resolved`, `cancelled`, `expired`. Entrega: `not_requested`, `pending`, `queued`, `succeeded`, `failed`. El outbox de B2-002 sigue siendo la autoridad del efecto externo.

### Lead, oportunidad y handoff

- `leads`: interés capturado desde conversación, web o registro autorizado.
- `lead_interests`: una o más necesidades; la variante puede faltar mientras el texto/contexto no se invente.
- `opportunities`: proceso de cierre con modo `agent_close` o `human_handoff` y estados comerciales explícitos.
- `conversation_assignments`: ventanas temporales de responsabilidad; exactamente una activa por conversación/oportunidad.
- `handoffs`: solicitud reversible entre agente y miembro verificado. Aceptar cierra la asignación anterior y abre la nueva en la misma transacción.

No se adivina qué pendiente, lead u oportunidad quiso Fer: las búsquedas devuelven candidatos y las mutaciones exigen ID.

### Pedidos

`orders` y `order_lines` registran una solicitud real con origen, contacto, conversación opcional, modo de cierre, moneda cuando exista, snapshot privado de contacto y snapshots inmutables por línea. Una línea `on_request` conserva montos nulos y obliga al pedido a `pending_quote`. El canal de origen y `notification_channel_connection_id` son datos distintos: un checkout web puede notificar a Fer por WhatsApp sin fingir que el pedido nació ahí.

Estados: `pending_quote`, `pending_confirmation`, `confirmed`, `partially_fulfilled`, `fulfilled`, `cancelled`, `expired`, `stock_unavailable`.

`order_reservation_links` enlaza reservas B2-005. Reserva expirada o liberada no desaparece: una transición posterior del pedido muestra el estado real.

### Ventas

`sales` y el snapshot comercial de `sale_lines` son append-only. Una venta puede nacer de pedido o de operación externa. Cada línea declara `inventory_effect_status`: `not_required`, `pending` o `applied`; `applied` exige una operación B2-005 real que coincida en variante, unidad, cantidad y dirección. `api.reconcile_sale_inventory` permite únicamente la transición operativa idempotente `pending → applied`; no puede reescribir producto, precio, cantidad ni historia. Una operación física sólo puede vincularse una vez.

Correcciones no borran ni editan una venta: una nueva fila `reversal` referencia la venta y cada línea original. Se permiten correcciones parciales sucesivas hasta el saldo no revertido; nunca por encima de la cantidad original. El pedido se recalcula desde la cantidad neta. No existe estado de pago en este bloque.

## Seguridad

- RLS habilitado y forzado en las 14 tablas.
- `anon` no recibe privilegios; la frontera pública con antiabuso pertenece a B6.
- `authenticated` sólo lee según membresía activa; no muta.
- `service_role` sólo lee tablas y ejecuta RPCs autorizadas; las escrituras directas quedan revocadas.
- Toda RPC `SECURITY DEFINER` fija `search_path = ''`, valida organización, actor y FKs compuestas.
- PII permanece en `app_private`; las vistas administrativas no se exponen públicamente.
- Arrays/JSON/textos/cantidades tienen límites físicos; no se admiten campos JSON desconocidos.

## Concurrencia y recuperación

- Claims idempotentes serializan reintentos.
- Filas de pendiente, handoff, pedido y oportunidad se bloquean antes de transición.
- Una constraint parcial permite una sola asignación activa y un handoff pendiente.
- Un handoff a miembro sólo puede ser aceptado por el miembro objetivo activo.
- Venta contra pedido bloquea líneas y evita sobrecumplimiento concurrente.
- Un fallo de notificación no revierte la resolución/pedido; queda trabajo durable enlazable al outbox.
- Un fallo de inventario no fabrica venta aplicada; queda `pending` y se concilia después contra una operación física exacta, o la transacción falla según el contrato solicitado.

## Frontera cognitiva

El LLM decide, mediante tool calling nativo, si debe buscar candidatos, preguntar, crear pendiente, calificar, transferir, crear pedido o registrar venta. SQL no clasifica texto, no usa regex para entender al cliente y no redacta respuestas. Las RPCs reciben IDs y contratos explícitos y aplican únicamente invariantes deterministas.
