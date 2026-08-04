# AgenteFer — auditoría forense de diseño B2-002

Fecha: 2026-08-03.  
Alcance: diseño previo a migración de conexiones, identidades, contactos, conversaciones, mensajería, consentimiento, inbox y outbox.  
Estado de implementación al emitir este documento: ninguna tabla B2-002 creada local o remotamente.

## Evidencia cruzada

- BL-002: solo identidades previamente vinculadas pueden representar a Fer.
- BL-003: conversaciones entrantes, política fuera del LLM y cero spam.
- BL-004: publicación/conversación conserva contexto verificable.
- SC-001–SC-006: contexto, owner vs cliente, faltantes, replay y ventana.
- RQ-009–RQ-014, RQ-025–RQ-026, RQ-069 y RQ-094–RQ-099.
- TM-001, TM-003, TM-004, TM-007 y TM-008.
- B2-001: `app_private`, `api`, organizaciones, membresías y owner invariant ya aplicados.
- investigación oficial: `docs/references/CHANNELS-B2-002-RESEARCH.md`.
- contrato físico: `docs/architecture/CHANNELS-MESSAGING-B2-002.md`.

## Autopsia de dependencias

### Entrada real

Un webhook auténtico no es todavía un comando ni una conversación autorizada. Primero pertenece a una conexión; luego se normaliza a identidad, contacto/miembro, conversación, participante y mensaje. Solo después un runtime cognitivo puede recibir contexto y herramientas permitidas.

### Salida real

Una respuesta del LLM no es un envío. Debe existir como mensaje outbound y evento outbox, pasar política determinista, ser reclamado por worker y obtener resultado de Meta. Los estados posteriores llegan otra vez por inbox y se conservan como delivery events.

### Dependencias posteriores preservadas

- B2-006 puede enlazar leads, pendientes, handoffs y pedidos a conversación/contacto sin redefinir identidad.
- B2-007 puede reconciliar `origin_external_id` con publicación real y ampliar conexiones sociales.
- B2-008 puede añadir agent runs, tool audit y job attempts sin convertir inbox/outbox en tablas nuevas incompatibles.
- B2-010 puede enlazar medios a mensajes sin guardar blobs en JSONB.
- B3/B4 pueden implementar adapters y tools sobre FKs/idempotency ya estables.

No se corta ningún cable de B2-001 y no se crea dependencia hacia otro repositorio/proyecto.

## Auditoría por clase de fallo

### Coherence failure

No detectada.

- `channel_connection` es la raíz externa y `organization_id` la raíz tenant.
- contacto, Auth user, identidad, participante y conversación permanecen conceptos distintos.
- owner/cliente no se decide por texto: se deriva de channel identity vinculada y membresía vigente.
- mensaje, outbox y efecto externo permanecen conceptos distintos.
- contexto de publicación se conserva como referencia externa hasta que B2-007 cree la publicación normalizada.

### Technical hallucination

No detectada en el diseño.

- WhatsApp confirma WABA, `phone_number_id`, `wa_id`, `wamid` y endpoint scoped al número.
- Messenger confirma `PAGE_ID`, PSID, `message_id`, firma, retry y timestamps.
- no se afirma que la App/Página/número de AgenteFer ya tenga permisos;
- no se inventa un event ID universal de Meta: el inbox siempre tiene hash propio y `provider_event_id` es nullable;
- no se asume orden de entrega;
- no se usa `realtime` como cola;
- no se fija una duración en un CHECK: `service_window_expires_at` proviene de política vigente.

### Simulation

No existe.

- cero seed y cero fixtures persistentes;
- ninguna credencial/ID real se inventa;
- pgTAP usará filas transaccionales revertidas, no un proveedor simulado;
- integración Meta real permanece bloqueada hasta B4.

### Security failure

Mitigada en diseño:

| Amenaza               | Control físico                                                               | Evidencia exigida                                   |
| --------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| spoof de Fer          | member identity exige membresía compuesta + verificación + vínculo inmutable | cliente con mismo texto no obtiene identidad member |
| replay/duplicado      | dedupe en inbox, message, delivery, consent y outbox                         | N entregas producen un efecto                       |
| cross-tenant          | `organization_id` + conexión repetidos en FKs compuestas, RLS forzado        | mezcla A/B falla por FK y por RLS                   |
| fuga de secreto       | solo referencias opacas; vistas excluyen refs; inbox/outbox sin policy auth  | scans y grants exactos                              |
| PII excesiva          | schemas privados, viewer/anon excluidos, payload crudo no expuesto           | matriz positiva/negativa de roles                   |
| envío prohibido       | policy status/basis antes de processing/success                              | outbox no procesa si policy no es allowed           |
| caída/retry           | estados, available time, lease y misma idempotency key                       | reclaim no duplica mensaje                          |
| estado fuera de orden | ledger append-only con occurred/received separados                           | `sent` tardío no retrocede `delivered`              |

### Scenario gap

La matriz previa cubre:

- owner vinculado, cliente observado y cliente intentando tool administrativa;
- WhatsApp y Messenger;
- mensaje con/sin ID externo y con/sin thread externo;
- conversación nueva, existente, cerrada y duplicada concurrente;
- publicación conocida/desconocida/borrada aún no normalizada;
- inbox igual e inbox wrapper distinto con mismo mensaje;
- delivery duplicado/fuera de orden/fallido;
- consentimiento concedido/revocado/expirado;
- outbox allowed/blocked/retryable/terminal;
- token/canal revocado sin declarar éxito;
- owner/admin/operator/viewer/anon/service role y cross-org;
- caída antes/después de claim y resultado externo incierto.

### Logic disconnect

No detectado.

El flujo completo queda conectado:

`connection → inbox → identity/contact/member → conversation/participant → message → LLM/tools → outbound message → policy → outbox → Meta → inbox status → delivery event`.

Los tramos no implementados tienen bloque propietario explícito; no se presentan como funcionando hoy.

## Revisión de estados

### Conexión

`draft → pending_verification → active`; desde activo puede pasar a `suspended/error/revoked/archived`. `revoked/archived` liberan el sender solo para un workflow posterior explícito; no reasignan la fila histórica.

### Inbox

`received/retryable → processing → processed/ignored/dead_letter`. Lease/available time permiten recuperar crash. Estados terminales requieren tiempo terminal.

### Mensaje

Dirección restringe estados. Internal no puede fingir `delivered`; inbound no puede fingir `sent`; outbound no puede existir como `processed`.

### Outbox

`pending/retryable → processing → succeeded/failed`; `blocked/cancelled` son terminales. Processing/succeeded requieren política `allowed`; blocked exige política `blocked` y razón.

No se valida intención humana con CHECK/if/regex. Estos son invariantes de persistencia y seguridad, mientras el LLM decide qué tool solicitar.

## Revisión de constraints e índices

- todos los IDs externos están scoped por conexión;
- sender operativo es único globalmente para evitar secuestro cross-org;
- sender revocado/archivado conserva historia y permite transferencia explícita;
- todas las FKs de conexión/contacto/identidad/conversación/mensaje tienen índice útil planeado;
- índices parciales se limitan a lookups activos y colas pendientes;
- no se agrega GIN sin query real;
- `ON CONFLICT` reemplaza select-then-insert en ingestión;
- claims usan transacción corta y `SKIP LOCKED`.

## Revisión de RLS/grants

- diez tablas con RLS habilitado y forzado;
- conexión: owner/admin activos;
- operación/PII normalizada: owner/admin/operator activos;
- viewer y anon: cero PII;
- inbox/outbox: cero lectura autenticada;
- authenticated: cero INSERT/UPDATE/DELETE;
- service role: privilegios explícitos, sin DELETE y sin UPDATE de ledgers append-only;
- vistas `security_invoker/security_barrier`, sin raw payload ni referencias secretas;
- funciones privadas con `search_path = ''` y execute revocado.

El bypass inherente de service role se reconoce: B3/B4 deben revalidar actor/organización y auditar antes de cada mutación. No se presenta RLS como sustituto de autorización backend.

## Recovery/rollback

Antes de consumidores, rollback operacional es no exponer y aplicar forward-fix. No se elimina la migración aplicada ni se borran eventos. Un error de schema detectado en staging bloquea B4. Producción recibirá el mismo historial desde `main` en un proyecto separado.

## Cross-match B2-002

| Entregable requerido | Objeto físico                             | Gate                                       |
| -------------------- | ----------------------------------------- | ------------------------------------------ |
| conexiones           | `channel_connections`                     | scope, estado, referencias no secretas     |
| identidades          | `contacts`, `channel_identities`          | conexión obligatoria, principal verificado |
| consentimientos      | `consents` append-only                    | fuente/vigencia/dedupe                     |
| inbox/outbox         | `inbound_events`, `outbox_events`         | dedupe, policy, estados, lease             |
| conversaciones       | `conversations`                           | primary identity, origin, ventana          |
| participantes        | `conversation_participants`               | kind/role, pertenencia compuesta           |
| mensajes             | `messages`, `message_delivery_events`     | dirección, dedupe, estados fuera de orden  |
| RLS                  | policies + grants + vistas                | matriz de roles/cross-org                  |
| QA                   | pgTAP + reset + lint + advisors + typegen | cero fila persistida                       |

## Riesgos abiertos que no invalidan la migración

1. Retención/anónimo exactos de payloads, PII y conversaciones requieren política aprobada antes de producción.
2. Referencias reales de secret store y estrategia de rotación se fijan en B4; las columnas jamás aceptarán el valor secreto.
3. Payloads/capabilities exactos de la App real se prueban en B4 y pueden requerir una migración aditiva.
4. El reconciliador de estados y policy engine aún no existen; el schema solo garantiza que no se puedan representar combinaciones peligrosas obvias.
5. `api` continúa sin exposición remota hasta el gate Auth/Data API.

## Veredicto previo

**GREEN LIGHT PARA IMPLEMENTAR B2-002, NO PARA CONECTAR META NI PRODUCCIÓN.**  
**INTEGRIDAD DE DISEÑO: APROBADA.**  
**MATCH: B2-002 ↔ BL-002–BL-004 ↔ SC-001–SC-006 COMPLETO.**

Este veredicto se revoca si el SQL:

- acepta una identidad sin conexión;
- guarda tokens/App Secret/verify token;
- permite IDs externos sin scope;
- expone inbox/outbox a authenticated/anon;
- omite RLS forzado o tests cross-org;
- confía en un único nivel de dedupe;
- permite procesar outbox sin política allowed;
- inserta datos reales o simulados;
- difiere seguridad/idempotencia a “después”.
