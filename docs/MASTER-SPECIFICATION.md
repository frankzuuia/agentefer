# AgenteFer — especificación maestra

Estado: v0.1 de Bloque 0.  
Entradas: `docs/context/ORIGINAL_REQUIREMENTS.md`, `docs/BUSINESS_LOGIC.md`, `docs/architecture/SYSTEM_CONTEXT.md`, `docs/security/*`.  
Regla de implementación: ningún nombre externo/capacidad de proveedor aquí descrito se considera disponible hasta validarlo con documentación oficial y una prueba real.

## Convenciones globales

- Todo dato operacional pertenece a `organization_id`.
- IDs internos son opacos; IDs externos siempre se guardan con proveedor/conexión.
- Tiempos en UTC; presentación/reportes en zona de la organización.
- Dinero usa decimal entero/preciso más moneda; nunca `float`.
- Cliente, contacto, conversación, lead, pedido y venta son conceptos distintos.
- Producto, variante y SKU son conceptos distintos.
- Categorías, atributos tipados, unidades, opciones y escalones de precio son datos extensibles de la organización; ninguna categoría comercial está compilada en el núcleo.
- Tool calling nativo resuelve cognición; backend valida autorización e invariantes.
- Mutaciones, mensajes y trabajos externos son idempotentes y auditables.
- Los nombres de tablas/herramientas siguientes son contratos planeados; se ratificarán en la especificación de datos antes de migrar.

---

## Batch 1 — BL-001 a BL-005: frontera, identidad, canales y verdad comercial

### Requirements Covered

RQ-001–RQ-003, RQ-009–RQ-018, RQ-025–RQ-026, RQ-051, RQ-080, RQ-082, RQ-087–RQ-088, RQ-094 y RQ-099.

### Scenario Matrix

| ID     | Actor / precondición / trigger                   | Comportamiento y datos                                                                  | Herramientas / externos                               | Auditoría y efecto                       | Validación                                  | Fallback                                           |
| ------ | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| SC-001 | Cliente; publicación ligada; pregunta “precio”   | recuperar conversación, publicación, variante, precio/stock; responder sobre esa oferta | `conversation.get_context`, `catalog.get_offer`; Meta | origen y fuentes; mensaje saliente       | variante correcta aunque texto sea genérico | si enlace roto, preguntar/mostrar candidatos       |
| SC-002 | Fer vinculado; envía audio para cambiar stock    | transcribir, razonar, resolver variante y llamar ajuste autorizado                      | proveedor de voz/LLM, `inventory.adjust`              | audio referenciado, tool call y saldo    | identidad owner y stock resultante          | si ambiguo, opciones por ID/SKU                    |
| SC-003 | Cliente no privilegiado; ordena cambiar precio   | tratar como mensaje comercial; negar cualquier tool administrativa                      | política de tools                                     | intento denegado sin revelar internals   | misma frase desde owner sí habilita flujo   | handoff si parece reporte legítimo                 |
| SC-004 | Cliente; catálogo no tiene compatibilidad/precio | reconocer faltante, preguntar datos y crear pendiente si procede                        | `pending_request.create`                              | faltante y preguntas; notificación a Fer | no aparece dato inventado                   | informar que se confirmará y continuar calificando |
| SC-005 | Meta reenvía evento existente                    | detectar proveedor/conexión/event ID y no repetir efecto                                | webhook adapter, inbox                                | contador/resultado duplicado             | N entregas = 1 inbox/efecto                 | devolver éxito idempotente a Meta                  |
| SC-006 | Mensaje fuera de ventana saliente                | evaluar política antes de enviar                                                        | `messaging.check_policy`                              | razón de bloqueo/plantilla               | no se envía texto libre prohibido           | plantilla oficial autorizada o tarea humana        |

### Data Flow

Webhook → verificación → `inbound_events` → conversación/participante → trabajo durable → contexto organizacional → LLM/tools → outbox → adaptador Meta.

### Tables / APIs / Tools

Entidades planeadas:

- `organizations`, `organization_members`, `business_profiles`;
- `channel_connections`, `channel_identities`;
- `contacts`, `conversations`, `conversation_participants`, `messages`;
- `inbound_events`, `outbox_events`, `consents`;
- herramientas `conversation.get_context`, `catalog.search`, `catalog.get_offer`, `messaging.send`, `pending_request.create`.

APIs externas por validar: recepción/firma/envío WhatsApp y Messenger; identidad/referencia de publicación; reglas de ventana/plantilla.

### Permissions / Tenant Boundaries

- RLS por membresía para administración.
- Lectura pública solo mediante proyección mínima de catálogo.
- Identidad de canal se resuelve server-side; cliente no suministra rol/organización.
- Mensajes/PII no son accesibles entre organizaciones.

### Integrations / Costs / Limits

- Respuesta de webhook rápida; LLM asíncrono.
- Límite por evento, conversación, identidad e IP.
- Ventana y costos reales de Meta/LLM pendientes de referencia oficial.

### Security / RLS / Secrets

- Firma sobre body crudo; idempotencia única.
- Tokens solo en backend/secret store.
- Prompt injection no cambia roles/tools.
- Logs redactan teléfono, texto sensible y headers.

### Failure Modes

Firma inválida, evento duplicado, publicación desconocida, identidad no vinculada, conversación cerrada, canal caído, envío fuera de política y contexto incompleto.

### Recovery / Rollback

Inbox conserva evento aceptado; outbox reintenta recuperables; dead-letter alerta; respuestas no enviadas permanecen conciliables.

### Validation

Pruebas de firma/replay, aislamiento, propietario vs cliente, publicación de origen, ventana de mensajería, idempotencia y redacción.

### Open Risks

Permisos/eventos exactos de Meta, vínculo de identidad de Fer y reglas de retención de conversaciones.

---

## Batch 2 — BL-006 a BL-010: pendientes, handoff, ingesta, variantes y precios

### Requirements Covered

RQ-019–RQ-024, RQ-040–RQ-054, RQ-076, RQ-104 y RQ-110.

### Scenario Matrix

| ID     | Actor / precondición / trigger                  | Comportamiento y datos                                                                | Herramientas / externos                                          | Auditoría y efecto                   | Validación                           | Fallback                               |
| ------ | ----------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ | ------------------------------------ | -------------------------------------- |
| SC-007 | Fer; foto de mercancía + precio/stock           | proponer/reutilizar categoría y atributos; crear evidencia, borrador y candidatos; confirmar invariantes; alta producto/variante | visión LLM, `media.ingest`, `catalog.upsert_offer` | hash, extracción, categoría, confirmación e IDs | producto de cualquier rubro consultable con SKU único | si faltan campos/definición, queda borrador |
| SC-008 | Fer; foto con marca tapada                      | marcar campo desconocido y preguntar; no publicar                                     | `catalog.create_draft`, `pending_question.create`                | evidencia y campo dudoso             | marca no se fabrica                  | Fer completa o conserva borrador       |
| SC-009 | Fer; posible producto existente                 | mostrar candidatos/diferencias y pedir ID                                             | `catalog.find_candidates`                                        | candidatos y selección               | no duplica silenciosamente           | crear solo tras elección explícita     |
| SC-010 | Fer define opciones, unidad y tarifas           | resolver variantes/opciones y escalones explícitos; llanta con/sin rin y 1/4 piezas es un fixture, no el contrato | `pricing.set_tiers` | anterior/nuevo, unidad y vigencia | cualquier cantidad permitida devuelve tarifa exacta | preguntar opción/cantidad/unidad faltante |
| SC-011 | Cliente; oferta sin precio                      | recopilar variante/cantidad; crear pendiente y avisar                                 | `pending_request.create`, outbox                                 | pendiente ligada a conversación      | una notificación idempotente         | seguir calificando sin prometer precio |
| SC-012 | Fer; “dile que cuesta X”; varias pendientes     | LLM presenta candidatos identificables; no muta                                       | `pending_request.search`                                         | ambigüedad y opción elegida          | respuesta va al cliente correcto     | esperar selección                      |
| SC-013 | Fer resuelve pendiente única                    | fijar precio solo si ordenado y responder conversación                                | `pending_request.resolve`, `pricing.set_tiers`, `messaging.send` | resolución y efectos separados       | puede responder sin cambiar catálogo | si envío falla, outbox reintenta       |

### Data Flow

Medio/mensaje → ingesta/evidencia → análisis LLM → categoría/atributos existentes o propuestos → borrador → candidatos → preguntas → confirmación → transacción producto/variante/unidad/SKU/precio/stock/galería.

### Tables / APIs / Tools

Entidades planeadas:

- `categories`, `products`, `product_variants`, `attribute_definitions`, valores tipados de atributos y unidades; nombres físicos finales pendientes de B2-003;
- `media_assets`, `media_evidence`, `product_media`;
- `price_books`, `price_tiers`, composición explícita de paquetes cuando aplique, `pending_requests`, `pending_questions`;
- `handoffs`, `conversation_assignments`;
- herramientas `media.ingest`, `catalog.create_draft`, `catalog.find_candidates`, `catalog.upsert_offer`, `pricing.set_tiers`, `pending_request.search/resolve`, `handoff.create/resume`.

### Permissions / Tenant Boundaries

- Solo owner/admin/operator autorizado crea o edita.
- Cliente puede generar interés/pendiente, no resolver precio.
- Storage y candidatos siempre filtrados por organización.

### Integrations / Costs / Limits

- Visión/transcripción con hash cache, límite de tamaño, páginas, tiempo y costo.
- Proveedor/modelo se selecciona mediante ADR-010; precios, presupuesto y credenciales reales siguen pendientes.

### Security / RLS / Secrets

- Originales privados; derivados públicos solo tras aprobación.
- SSRF/MIME/tamaño controlados.
- Tool inputs no aceptan `organization_id` efectivo sin contraste.

### Failure Modes

OCR incorrecto, media corrupta, duplicado concurrente, SKU conflictivo, precio sin moneda/unidad, pendiente resuelta dos veces y notificación fallida.

### Recovery / Rollback

Borrador conserva evidencia; transacción completa o nada; historial de precio permite nueva corrección sin borrar; outbox reconcilia respuestas.

### Validation

Fixtures reales autorizados de las cinco imágenes; llanta/rin con opciones y tiers 1–4; escenarios de tinaco, tambor y artículo genérico con definiciones distintas; categoría nueva sin migración/despliegue; cantidad superior a cuatro; unidades distintas; extracción con incertidumbre, candidatos, resolución diferida y aislamiento Storage. Los escenarios no visuales validan contratos sin crear productos comerciales falsos.

### Open Risks

Gobierno/versionado de definiciones de categoría y unidad, proveedor de voz/visión, moneda y reglas comerciales de publicación automática.

---

## Batch 3 — BL-011 a BL-014: inventario, catálogo, pedidos y asesoría

### Requirements Covered

RQ-027–RQ-039, RQ-047, RQ-055–RQ-061, RQ-072–RQ-075 y RQ-110.

### Scenario Matrix

| ID     | Actor / precondición / trigger      | Comportamiento y datos                                         | Herramientas / externos                             | Auditoría y efecto              | Validación                          | Fallback                                       |
| ------ | ----------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- | ------------------------------- | ----------------------------------- | ---------------------------------------------- |
| SC-014 | Dos clientes; última unidad         | reservar/confirmar atómicamente para uno                       | `inventory.reserve`, DB transaction                 | saldo/reserva por pedido        | stock nunca negativo                | segundo recibe indisponible/alternativas       |
| SC-015 | Cliente WhatsApp; catálogo; pedido  | recalcular precio/stock, crear pedido snapshot y notificar Fer | `order.create`, outbox                              | consentimiento, líneas y estado | pedido ≠ venta                      | pedido pendiente/handoff si notificación falla |
| SC-016 | Cliente Messenger; aporta WhatsApp  | validar/normalizar contacto con consentimiento y crear pedido  | `contact.add_consented`, `order.create`             | origen y consentimiento         | enlace directo solo con dato válido | continuar por Messenger sin teléfono           |
| SC-017 | Variante sin precio; pulsa consulta | abrir enlace con SKU/variante prellenados sin declarar total   | web route                                           | evento de interés mínimo        | mensaje identifica oferta correcta  | mostrar medios alternos configurados           |
| SC-018 | Fer registra venta que agota        | movimiento atómico, estado no disponible y sync jobs           | `inventory.record_sale`, `publication.enqueue_sync` | saldo y referencias             | catálogo deja de ofrecer            | sync falla pero stock sigue correcto           |
| SC-019 | Fer agrega dos unidades agotadas    | movimiento entrada y reactivación según política               | `inventory.receive`, `catalog.set_availability`     | saldo/reactivación              | vuelve a catálogo una sola vez      | queda activo sin publicar si no autorizado     |
| SC-020 | Cliente pide alternativa            | buscar ofertas elegibles y comparar atributos/precio           | `catalog.find_alternatives`                         | ofertas/criterios usados        | no sugiere agotados                 | reconocer que no hay alternativa               |

### Data Flow

Catálogo público → selección → recálculo servidor → transacción pedido/reserva → outbox a Fer → confirmación comercial → venta/movimiento → disponibilidad/sincronización.

### Tables / APIs / Tools

Entidades planeadas:

- `inventory_locations`, `inventory_movements`, `inventory_reservations` y proyección de saldo;
- `customers`, `customer_contacts`, `leads`, `opportunities`;
- `orders`, `order_items`, `order_status_history`, `sales`;
- `catalog_views/events` solo con minimización/consentimiento aplicable;
- herramientas `inventory.adjust/reserve/release/record_sale/receive`, `order.create/transition`, `catalog.find_alternatives`.

### Permissions / Tenant Boundaries

- Visitante lee proyección pública y crea pedido bajo rate limit.
- Transiciones comerciales y ajustes requieren rol.
- PII nunca forma parte de vistas públicas.

### Integrations / Costs / Limits

- QR es enlace estable; generación local/servidor sin secreto.
- Antiabuso para pedidos públicos.
- Reserva/duración pendiente de política comercial.

### Security / RLS / Secrets

- Precio/stock recalculado server-side.
- Constraints transaccionales e idempotencia.
- Validación y minimización de teléfono/PII.

### Failure Modes

Stock cambia, reserva expira, precio cambia, pedido duplicado, teléfono inválido, notificación falla, venta manual previa y disponibilidad desfasada.

### Recovery / Rollback

Liberación idempotente, conciliación stock-publicación, reintento de notificación, transición compensatoria/cancelación; no borrar pedido histórico.

### Validation

Concurrencia real PostgreSQL, cantidades/unidades/paquetes arbitrarios, snapshots, pedido por ambos canales, catálogo multirubro, accesibilidad móvil, antiabuso y reportes consistentes.

### Open Risks

Política de reserva/venta, impuestos, envío/instalación, definición exacta de “interesado” y analítica de privacidad.

---

## Batch 4 — BL-015 a BL-018: publicaciones, horarios, reportes y configuración

### Requirements Covered

RQ-005, RQ-012, RQ-062–RQ-079.

### Scenario Matrix

| ID     | Actor / precondición / trigger                | Comportamiento y datos                                               | Herramientas / externos                  | Auditoría y efecto                        | Validación                                 | Fallback                                    |
| ------ | --------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------- | ------------------------------------------ | ------------------------------------------- |
| SC-021 | Fer; Página autorizada; publica variante      | revalidar oferta, generar contenido y publicar                       | `publication.create`, Graph API validada | aprobación, payload redactado, ID externo | publicación enlaza variante                | error queda retry/terminal claro            |
| SC-022 | Fer; “publica todo”                           | mostrar/usar política, expandir catálogo elegible en jobs espaciados | `publication.enqueue_catalog`            | lote, cantidad, calendario                | dedupe/frecuencia respetados               | cancelar/pausar lote                        |
| SC-023 | Scheduler 14:00/18:00                         | seleccionar trabajos vencidos y revalidar al ejecutar                | scheduler/queue, `publication.execute`   | run/skip/razón                            | zona horaria y no duplicación              | próximo run/reconciliación                  |
| SC-024 | Precio cambia mientras job espera             | job usa versión/lee vigencia al ejecutar                             | `catalog.get_offer`                      | versión publicada                         | nunca publica precio viejo silenciosamente | regenerar contenido o cancelar              |
| SC-025 | Token/permiso Meta ausente                    | bloquear publicación sin afectar catálogo                            | Meta adapter                             | error clasificado/alerta                  | no declara éxito                           | solicitar reconexión autorizada             |
| SC-026 | Fer pide Marketplace sin capacidad comprobada | informar límite y no simular                                         | capability registry                      | comando bloqueado                         | cero efectos externos                      | ofrecer publicación de Página si autorizada |
| SC-027 | Fer pide interesados/ventas semana            | consultar definiciones y zona; devolver cifras + detalle             | `reports.*`                              | filtros/rango                             | pedido/venta distinguidos                  | indicar datos parciales                     |
| SC-028 | Fer cambia saludo/ubicación                   | validar, versionar y aplicar                                         | `business_config.update`                 | anterior/nuevo                            | conversaciones nuevas usan versión vigente | rollback a versión anterior                 |

### Data Flow

Comando/política → selección elegible → jobs durables → revalidación → adaptador Meta → publicación externa → estado/auditoría → sincronizaciones posteriores.

### Tables / APIs / Tools

Entidades planeadas:

- `social_connections`, `social_capabilities`, `publications`, `publication_media`;
- `publication_batches`, `publication_jobs`, `schedules`;
- `business_profiles`, `business_locations`, `business_policies`, `config_versions`;
- herramientas `publication.preview/create/enqueue_catalog/cancel/sync`, `reports.interested/sales/inventory`, `business_config.update/rollback`.

### Permissions / Tenant Boundaries

- Conexiones y publicaciones limitadas a Página/organización vinculada.
- Lotes y cambios comerciales según rol/política de aprobación.
- Reportes solo administrativos.

### Integrations / Costs / Limits

- Capacidades, límites y políticas exactas de Graph API pendientes de documentación/prueba.
- Límites internos más estrictos que máximos del proveedor.

### Security / RLS / Secrets

- Tokens por entorno en secret store.
- Contenido y medios sanitizados/aprobados.
- No loguear respuestas crudas con token.

### Failure Modes

Permiso revocado, token vencido, rate limit, medio rechazado, publicación parcialmente creada, lote cancelado, zona horaria y reporte con datos tardíos.

### Recovery / Rollback

Reintento selectivo, conciliación por ID externo, cancelación de jobs, actualización/ocultación si API lo permite y rollback de configuración.

### Validation

Sandbox/test Page real autorizado, límites, lotes, cancelación, precios cambiantes, reportes temporales y config versionada.

### Open Risks

Revisión de app Meta, permisos disponibles, política de contenido repetido, edición/marked sold y estrategia de Página.

---

## Batch 5 — BL-019 a BL-025: agente, seguridad, resiliencia, entornos y calidad

### Requirements Covered

RQ-006–RQ-008, RQ-080–RQ-109.

### Scenario Matrix

| ID     | Actor / precondición / trigger                | Comportamiento y datos                                                | Herramientas / externos | Auditoría y efecto         | Validación                              | Fallback                                   |
| ------ | --------------------------------------------- | --------------------------------------------------------------------- | ----------------------- | -------------------------- | --------------------------------------- | ------------------------------------------ |
| SC-029 | Cliente incluye prompt injection              | LLM trata contenido como dato; tools del cliente permanecen limitadas | policy/tool registry    | intento y tools permitidas | no hay mutación admin                   | respuesta comercial segura                 |
| SC-030 | LLM intenta tool inválida/bucle               | contrato rechaza; límites terminan run                                | agent runtime           | error, calls, costo        | máximo respetado                        | handoff/estado pendiente                   |
| SC-031 | Proveedor LLM cae                             | trabajo conserva estado, retry clasificado/fallback aprobado          | LLM adapter/queue       | intentos y alertas         | no se reporta respuesta enviada         | mensaje de demora/handoff permitido        |
| SC-032 | Usuario organización A manipula ID de B       | backend/RLS niega sin fuga                                            | auth/RLS                | denegación                 | tests cruzados read/write               | error genérico seguro                      |
| SC-033 | Medio apunta a metadata/IP privada            | descarga bloqueada antes de conexión útil                             | media fetcher           | razón de bloqueo           | SSRF suite                              | pedir carga directa válida                 |
| SC-034 | Push `develop` intenta producción             | CI/deploy policy bloquea                                              | GitHub/EasyPanel        | intento y commit           | ningún servicio prod cambia             | desplegar staging                          |
| SC-035 | Solicitud legítima de borrado/exportación     | workflow verifica actor, retención y referencias                      | privacy tools           | alcance y resultado        | PII se elimina/anonimiza según política | revisión humana si conflicto legal         |
| SC-036 | Release con prueba/hallazgo crítico           | gate bloquea promoción                                                | CI/security             | evidencia/hallazgo         | estado no “listo”                       | corregir y repetir                         |
| SC-037 | Worker muere tras efecto externo antes de ack | reconciliar por idempotency/external ID                               | queue/provider adapter  | recuperación               | no duplica envío/publicación            | marcar para revisión si resultado incierto |

### Data Flow

Turno → policy/allowlist → LLM → tool call → autorización/validación → transacción/adaptador → resultado → LLM/respuesta; auditoría, uso y traza acompañan cada etapa.

### Tables / APIs / Tools

Entidades planeadas:

- `agent_runs`, `agent_messages`, `tool_executions`, `prompt_versions`, `memory_entries`;
- `audit_events`, `usage_events`, `error_events`, `outbox_events`, `job_attempts`;
- registro de herramientas y políticas versionadas en código/configuración auditada;
- APIs internas para health/readiness/metrics con protección apropiada.

### Permissions / Tenant Boundaries

- Tool registry devuelve subconjunto por actor, rol, canal, organización y estado.
- Service credentials no sustituyen autorización del usuario.
- Jobs llevan referencias verificables, no contexto privilegiado arbitrario.

### Integrations / Costs / Limits

- Model tier por tarea, cache por hash, budgets, retries/fallback y usage events.
- Adaptadores OpenAI/MiniMax, selección por configuración y visión opcional definidos en ADR-010; requieren implementación, contratos y evaluación real.

### Security / RLS / Secrets

- Baseline y threat model obligatorios.
- Escaneo de secretos/dependencias/contenedor/CI.
- Staging/producción separados.
- Operaciones de infraestructura limitadas a recursos AgenteFer identificados explícitamente.

### Failure Modes

Tool overreach, prompt injection, exfiltración, loops, costo, proveedor caído, job huérfano, secreto filtrado, migración incompatible, despliegue incorrecto y backup no restaurable.

### Recovery / Rollback

Cancelación de runs/jobs, dead-letter, conciliación, rollout/rollback por commit, migraciones expand/contract, rotación de secreto y restauración probada.

### Validation

Evaluaciones adversariales del agente, autorización por tool, límites/costos, caos de worker/proveedor, secret scan, SAST/dependencias, typecheck/lint/test/build, RLS y restore drill.

### Open Risks

Modelo exacto de cada entorno, presupuesto, observabilidad backend, retención, CI/CD, backups del plan Supabase y capacidad del servidor Hetzner.

---

## Auditoría forense v0.1

### Coherence failure

No detectada: los requisitos RQ-001–RQ-110 se enlazan a BL-001–BL-025 y escenarios SC-001–SC-037.

### Technical hallucination

Controlada: nombres de contratos internos son planeados; las capacidades externas se marcan pendientes. No se afirma soporte de Marketplace ni operaciones Meta no verificadas.

### Simulation

No hay mocks ni datos comerciales ficticios. Las cinco imágenes son evidencia, no catálogo cargado.

### Security failure

No detectada a nivel de especificación; los controles requieren implementación y pruebas antes de cambiar el veredicto técnico.

### Scenario gaps abiertos

1. Políticas comerciales de reserva, impuestos, devolución, instalación y envío.
2. Cuenta/Página/App/número Meta y permisos reales.
3. Capacidad/costo de voz y respuesta en audio.
4. Cola/scheduler definitivos.
5. Dominio y configuración de infraestructura.
6. Modelo de producción y presupuesto.

### Logic disconnect

No hay desconexión conceptual entre canal, API, cola, worker, LLM, tools, DB y respuesta. Falta demostrarla con código/pruebas reales.

### Veredicto

**INTEGRIDAD TOTAL** entre requisitos, lógica de negocio y especificación v0.1.

**MATCH PERFECT — requisitos, lógica, escenarios y plan de ejecución tienen trazabilidad completa.**

**RED ALERT — implementación funcional aún no autorizada por el gate técnico:**

1. Falta implementar y probar el scaffold técnico ratificado en B1.
2. Falta confirmar cuenta/permisos Meta y políticas comerciales pendientes.
3. Falta definir esquema SQL/RLS detallado y probarlo contra Supabase real.
