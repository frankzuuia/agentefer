# AgenteFer — inventario transaccional B2-005

Estado: contrato de implementación para producción.  
Requisitos: BL-011, SC-014, SC-018, SC-019, RQ-038, RQ-047, RQ-055–RQ-061 y RQ-110.

## Resultado que debe garantizar la base de datos

El inventario es un ledger multi-tenant y no una cifra editable aislada. Cada cambio físico conserva operación, líneas, motivo, referencia, actor, tiempo e idempotencia. Los saldos son una proyección bloqueada transaccionalmente y nunca pueden tener existencia o reserva negativas.

Producto, variante, precio, visibilidad e inventario continúan separados:

- una variante `paused` puede conservar stock;
- stock cero no equivale a pausa manual ni borra historia;
- una variante sin configuración inventariable se considera desconocida, nunca “infinita”;
- disponibilidad pública y sincronización de publicaciones pertenecen a bloques posteriores;
- ninguna categoría, nombre, SKU o imagen decide cómo se consume stock.

## Modelo físico

### Unidad inventariable

`inventory_items` vincula una variante con exactamente una unidad inventariable activa o retirada. La precisión procede de `catalog_units.decimal_scale`; pieza con escala cero rechaza fracciones, mientras volumen o peso pueden admitirlas. No existe una unidad “pieza” compilada en código.

### Composición explícita y versionada

`inventory_compositions` identifica cómo una variante ofrecida en una unidad vendible consume inventario. Una composición nace `draft`, sólo puede activarse si tiene componentes, y se retira sin reescribirla. Sólo puede existir una composición activa por variante y unidad vendible.

`inventory_composition_components` contiene los artículos inventariables y la cantidad consumida por una unidad vendible. También la venta directa se declara: por ejemplo, una unidad vendible de una variante puede consumir una unidad inventariable del mismo artículo. Un set, kit o combo declara una o varias líneas. Como los componentes apuntan exclusivamente a artículos inventariables y no a otras composiciones, el núcleo evita ciclos recursivos.

### Ubicaciones

`inventory_locations` es configurable por organización y no codifica productos ni categorías. Una ubicación retirada conserva historial y no acepta nuevas operaciones. Traslados se representan por líneas negativas y positivas en una misma operación; no existe un estado intermedio confirmado.

### Ledger, proyección e idempotencia

`inventory_operations` es la cabecera inmutable. `inventory_movements` registra el delta físico real por artículo y ubicación. `inventory_balances` conserva `on_hand_quantity`, `reserved_quantity` y versión; `available_quantity` se deriva como existencia menos reserva.

La clave idempotente es única por organización. El servidor calcula una huella canónica del contrato completo. Repetir la misma clave y la misma petición devuelve la operación existente; reutilizar la clave con otro contenido falla. No se hace check-then-insert desde la aplicación.

La RPC atómica de movimientos admite dos efectos deterministas:

- `delta`: entrada, venta, devolución, merma, traslado o corrección expresada como cambio;
- `set`: conteo físico o instrucción “pon el inventario en N”, cuyo delta real se calcula bajo bloqueo.

El código de operación y el motivo son datos auditables; PostgreSQL no adivina intención. Antes de actualizar, crea de forma idempotente las filas de saldo y las bloquea en orden estable `(inventory_item_id, location_id)`. Toda la operación revierte si una sola línea viola precisión, ubicación, tenant, reserva o saldo.

### Reservas

`inventory_reservations` y `inventory_reservation_lines` separan cantidad original, consumida y liberada. `inventory_reservation_events` y sus líneas conservan cada transición. Crear, consumir, liberar o expirar es idempotente y bloquea primero la reserva y después los saldos en orden estable.

Una reserva puede consumirse o liberarse parcialmente. La expiración sólo libera el remanente y nunca revierte una cantidad ya consumida. Consumir reduce existencia y reserva en la misma transacción y genera movimientos físicos; liberar o expirar sólo reduce reserva. Ninguna fila histórica se elimina.

## Escenarios de campo y respuesta del núcleo

| Incidente real | Invariante/recuperación |
| --- | --- |
| Meta o WhatsApp entrega el mismo webhook varias veces | misma clave + misma huella = replay sin doble descuento |
| Una clave se recicla para otra petición | conflicto explícito; no se ejecuta ningún efecto |
| Dos clientes disputan la última unidad | bloqueo del saldo; sólo una reserva confirma |
| Venta manual ocurre mientras se reserva | orden serializable por bloqueo; el segundo actor ve saldo actualizado |
| Fer dice “pon 5” mientras entra mercancía | `set` calcula delta dentro del bloqueo; resultado linealizable y auditado |
| Una línea de un combo no tiene stock | revierte el combo completo |
| Componentes están en almacenes distintos | las líneas indican ubicación explícita; el backend no elige silenciosamente |
| Traslado pierde conexión entre salida y entrada | ambas líneas pertenecen a una transacción; se confirman juntas o ninguna |
| Reserva se compra parcialmente | consume sólo las líneas/cantidades solicitadas y mantiene el remanente |
| Reserva vence después de compra parcial | libera sólo el remanente |
| Devolución o merma | movimiento con código, motivo y referencia; nunca edición retrospectiva |
| Conteo intenta bajar por debajo de lo reservado | se rechaza para no prometer stock inexistente |
| Unidad indivisible recibe `0.5` | se rechaza según `decimal_scale` |
| Reintentos invierten el orden de dos artículos | bloqueo canónico evita el patrón de deadlock |
| Ubicación o artículo fue retirado | lectura histórica permitida; nueva operación rechazada |
| ID de otra organización | FK compuesta/RPC tenant-aware rechaza la petición |
| Escritura directa o borrado por rol de servicio | privilegios revocados; sólo RPC auditada puede mutar |
| Falla futura de publicación | el ledger permanece correcto; outbox/sync se incorporan en su bloque |

## Superficie y seguridad

- Todas las tablas viven en `app_private`, usan RLS habilitado y forzado, y tienen FK compuestas por organización.
- Las vistas `api` son `security_invoker` y `security_barrier`; `anon` no recibe acceso en B2-005.
- `authenticated` sólo lee lo autorizado por membresía.
- `service_role` lee y ejecuta RPC explícitas, pero no inserta, actualiza ni elimina directamente el ledger.
- Las funciones mutadoras son `security definer`, `search_path = ''`, califican cada objeto y validan actor/tenant; sus privilegios se revocan antes de conceder lo mínimo.
- Los movimientos, composiciones activadas y eventos son inmutables. Los saldos y estados sólo cambian desde las RPC auditadas.

## Límites del bloque

B2-005 entrega contratos físicos, lecturas y primitivas transaccionales. B3-008 expondrá las tools cognitivas `adjust/reserve/release/record_sale/receive`; B3-009 enlazará pedidos; B4/B7 sincronizarán canales/publicaciones; B6 decidirá presentación pública. Esas capas usarán este núcleo y no volverán a implementar saldos en TypeScript ni a inferir intención mediante `if/else`, regex o keywords.

## Gates de aceptación

1. Migración forward-only atómica y ensayada antes de aplicar.
2. pgTAP cubre estructura, precisión, tenant, RLS, privilegios, inmutabilidad, composición, reservas, expiración, replay y rechazo de claves conflictivas.
3. Pruebas reales concurrentes demuestran una sola reserva de la última unidad y ausencia de deadlock con orden inverso.
4. Mutation testing elimina restricciones/policies/triggers críticos y pgTAP mata cada mutante.
5. Lint/advisors, tipos generados, cobertura, Stryker, integración, contenedor y CI quedan verdes.
