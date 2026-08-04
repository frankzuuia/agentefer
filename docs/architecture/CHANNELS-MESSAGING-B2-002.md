# AgenteFer — contrato físico de canales y mensajería B2-002

Estado: diseño previo a implementación; requiere veredicto GREEN de `B2-002-DESIGN-AUDIT.md`.  
Entorno inicial: Supabase staging `hprdctmblmfcoagugvyp`.  
Dependencia: B2-001 aplicado y certificado.  
Investigación: `docs/references/CHANNELS-B2-002-RESEARCH.md`.

## Objetivo y frontera

B2-002 crea la persistencia segura que permite recibir una conversación, resolver quién participa, conservar evidencia, deduplicar reintentos y preparar una respuesta conforme a política. No conecta todavía una cuenta Meta ni ejecuta HTTP externo.

Incluye:

- conexiones WhatsApp/Messenger sin valores secretos;
- identidades externas siempre scoped a una conexión;
- contactos organizacionales y vínculo verificado de miembros;
- conversaciones uno-a-uno extensibles mediante participantes;
- mensajes normalizados y eventos de entrega;
- evidencia versionada de consentimiento;
- inbox privado idempotente;
- outbox privado idempotente y reclamable;
- RLS, grants, índices, timestamps e invariantes cross-tenant;
- vistas autenticadas mínimas para operación futura.

Excluye:

- credenciales, App/Página/WABA/número reales y suscripción de webhooks: B4;
- verificación HTTP de challenge/firma/tamaño/frescura: B4-002;
- adapters WhatsApp/Messenger y tool loop: B3/B4;
- publicación de Página/capabilities: B2-007/B4-005;
- catálogo, precios, inventario, pedidos y handoffs: bloques posteriores;
- blobs de audio/imágenes/documentos: B2-010;
- auditoría completa de tool calls, jobs e intentos: B2-008;
- seeds, conversaciones de ejemplo o datos de Fer.

## Invariantes maestras

1. Toda fila operacional lleva `organization_id NOT NULL`.
2. Todo ID externo se resuelve mediante `channel_connection_id`; no existe lookup por teléfono, PSID o mensaje sin scope.
3. Cada FK operacional repite organización y conexión cuando la relación cruza ese límite.
4. Ninguna credencial se guarda en JSONB, texto de mensaje, log o vista. Solo existen referencias opacas a un secret store.
5. El inbox deduplica entregas; `messages` y `message_delivery_events` deduplican efectos normalizados.
6. Consentimiento es evidencia append-only con fuente, decisión y vigencia; no un booleano mutable.
7. Un mensaje saliente existe antes del efecto externo y tiene como máximo un evento `message.send` en outbox.
8. Estados de proveedor se conservan con `provider_occurred_at`; llegada posterior no implica ocurrencia posterior.
9. El cuerpo crudo aceptado vive solo en inbox privado; vistas API usan datos normalizados.
10. `authenticated` solo lee lo mínimo y jamás muta. `anon` no accede. Mutaciones futuras pasan por backend autorizado.

## Modelo físico

Todos los IDs internos son UUID opacos generados por PostgreSQL. Todos los tiempos son `timestamptz`. Textos usan `text` más `CHECK`; JSONB debe ser objeto y tiene límite físico. No se crean enums PostgreSQL para mantener migraciones de estados explícitas y revisables.

### 1. `app_private.channel_connections`

Unidad de aislamiento de un número WhatsApp o Página Messenger.

| Campo                      | Contrato                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------- |
| `id`                       | PK UUID                                                                                |
| `organization_id`          | FK a organización; parte de UNIQUE tenant-aware                                        |
| `provider`                 | inicialmente solo `meta`                                                               |
| `channel`                  | `whatsapp` o `messenger`                                                               |
| `external_app_id`          | App ID; requerido cuando la conexión está activa                                       |
| `external_account_id`      | WABA ID para WhatsApp o Page ID para Messenger                                         |
| `external_sender_id`       | `phone_number_id` o Page ID; identificador de routing                                  |
| `display_name`             | etiqueta operativa configurable, no identidad de autorización                          |
| `api_version`              | versión Graph configurada y validada en B4                                             |
| `credential_reference`     | referencia opaca al token en secret store, nunca el token                              |
| `webhook_secret_reference` | referencia opaca al App Secret/verify material                                         |
| `status`                   | `draft`, `pending_verification`, `active`, `suspended`, `revoked`, `error`, `archived` |
| tiempos                    | `connected_at`, `last_verified_at`, `disabled_at`, `created_at`, `updated_at`          |
| `created_by_user_id`       | FK nullable a Auth para procedencia                                                    |

Unicidad global parcial: `(provider, channel, external_sender_id)` entre conexiones que no estén `revoked/archived` impide asignar el mismo número/Página a dos organizaciones operativas por error. Scope, proveedor, canal y IDs externos son inmutables; rotación cambia referencias/versiones/estado, no identidad histórica. Una transferencia futura exige revocar primero la conexión anterior y crear otra mediante workflow auditado.

Una fila `active` exige App, cuenta, sender, versión, ambas referencias secretas y tiempos de conexión/verificación. Estados deshabilitados exigen `disabled_at`.

### 2. `app_private.contacts`

Persona comercial interna a una organización, distinta de Auth user, conversación, lead y pedido.

| Campo                   | Contrato                                 |
| ----------------------- | ---------------------------------------- |
| `id`, `organization_id` | PK y scope tenant-aware                  |
| `display_name`          | nombre legítimamente observado; nullable |
| `preferred_locale`      | preferencia nullable; no autoriza        |
| `status`                | `active`, `blocked`, `archived`          |
| tiempos                 | `created_at`, `updated_at`               |

No guarda teléfono suelto. El identificador de WhatsApp/Messenger pertenece a `channel_identities` y queda scoped a su conexión.

### 3. `app_private.channel_identities`

Vínculo entre un identificador externo y exactamente un contacto o miembro.

| Campo                                            | Contrato                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `id`, `organization_id`, `channel_connection_id` | identidad interna y scope compuesto                                             |
| `external_subject_id`                            | `wa_id` o PSID; PII privada                                                     |
| `principal_type`                                 | `contact` o `member`                                                            |
| `contact_id`                                     | requerido solo para `contact`                                                   |
| `member_user_id`                                 | requerido solo para `member`; FK compuesta a membresía de la misma organización |
| `trust_level`                                    | `provider_observed` o `verified_member`                                         |
| `display_name`                                   | nombre entregado legítimamente por el proveedor; nullable                       |
| `status`                                         | `active`, `blocked`, `revoked`                                                  |
| verificación                                     | `verified_at`, `linked_by_user_id`, `last_seen_at`, `revoked_at`                |
| tiempos                                          | `created_at`, `updated_at`                                                      |

Reglas:

- exactamente uno de `contact_id`/`member_user_id` existe;
- un principal `member` exige `verified_member`, `verified_at` y actor vinculador;
- un principal `contact` usa `provider_observed` y no recibe privilegios administrativos;
- `(channel_connection_id, external_subject_id)` es único entre identidades no revocadas;
- revocar conserva historia y permite una nueva vinculación explícita posterior;
- organización, conexión, identificador externo y principal no se reasignan por `UPDATE`.

Esto cierra TM-001: texto, audio o imagen de un cliente no cambia el principal ni el rol.

### 4. `app_private.inbound_events`

Inbox privado de una entrega de webhook ya autenticada por la API.

| Campo         | Contrato                                                                           |
| ------------- | ---------------------------------------------------------------------------------- |
| scope         | `id`, `organization_id`, `channel_connection_id`                                   |
| clasificación | `event_type`, `provider_event_id` nullable                                         |
| dedupe        | `deduplication_key` SHA-256 binaria y UNIQUE por conexión                          |
| integridad    | `payload_sha256` SHA-256 del body aceptado                                         |
| evidencia     | `payload` JSONB objeto, máximo 1 MiB, sin headers/secretos                         |
| tiempos       | `provider_occurred_at`, `received_at`, `signature_verified_at`, `updated_at`       |
| proceso       | `status`, `attempt_count`, `available_at`, `processing_started_at`, `processed_at` |
| diagnóstico   | `last_error_code`, `request_id`, `trace_id` sin PII                                |

Estados: `received`, `processing`, `retryable`, `processed`, `ignored`, `dead_letter`.

Solo se inserta después de verificar firma. `received/retryable` son reclamables; terminales exigen `processed_at`; `processing` exige `processing_started_at`. Un índice parcial por `available_at, received_at` soporta reclamación con `FOR UPDATE SKIP LOCKED` sin llamadas externas dentro de la transacción.

### 5. `app_private.conversations`

Hilo operativo entre una conexión y una identidad primaria.

| Campo                         | Contrato                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| scope                         | `id`, `organization_id`, `channel_connection_id`                                    |
| `primary_channel_identity_id` | contraparte necesaria, misma organización/conexión                                  |
| `provider_thread_id`          | hilo externo cuando Meta lo entregue; nullable y scoped                             |
| `status`                      | `open`, `closed`, `archived`                                                        |
| actividad                     | `opened_at`, `closed_at`, `last_activity_at`, `last_inbound_at`, `last_outbound_at` |
| política                      | `service_window_expires_at`; dato evaluado, no duración hardcodeada                 |
| origen                        | `origin_kind`, `origin_external_id`, `origin_context` JSONB objeto limitado         |
| tiempos                       | `created_at`, `updated_at`                                                          |

Existe como máximo una conversación `open` por `(connection, primary identity)`. `origin_kind` y `origin_external_id` aparecen juntos; B2-007 reconciliará ese ID con una publicación real sin perder el contexto recibido hoy.

Una conversación `open` requiere al commit un participante activo con su identidad primaria. El constraint diferido permite crear conversación y participante en una sola transacción; al cerrar la conversación, el participante puede finalizar sin borrar historia.

### 6. `app_private.conversation_participants`

Participación temporal y explícita; permite cliente, miembro y agente sin confundirlos.

| Campo                 | Contrato                                                                        |
| --------------------- | ------------------------------------------------------------------------------- |
| scope                 | `id`, `organization_id`, `channel_connection_id`, `conversation_id`             |
| `participant_kind`    | `identity` o `agent`                                                            |
| `participant_role`    | `customer`, `member` o `agent`                                                  |
| `channel_identity_id` | requerido para kind `identity`                                                  |
| `agent_key`           | requerido para kind `agent`; referencia lógica versionable, no nombre de modelo |
| tiempos               | `joined_at`, `left_at`, `created_at`                                            |

Solo puede existir una participación activa por identidad o por `agent_key` dentro de una conversación. Scope/principal son inmutables; finalizar participación fija `left_at`.

### 7. `app_private.messages`

Mensaje normalizado. El contenido del cliente sigue siendo dato no confiable.

| Campo       | Contrato                                                                          |
| ----------- | --------------------------------------------------------------------------------- |
| scope       | `id`, `organization_id`, `channel_connection_id`, `conversation_id`               |
| autor       | `sender_participant_id` de la misma conversación                                  |
| procedencia | `source_inbound_event_id` nullable; `reply_to_message_id` nullable                |
| dirección   | `inbound`, `outbound`, `internal`                                                 |
| contenido   | `content_kind`, `provider_message_type`, `content` JSONB objeto limitado          |
| proveedor   | `external_message_id` nullable, `provider_context` JSONB mínimo                   |
| dedupe      | `deduplication_key` SHA-256 y UNIQUE por conexión                                 |
| estado      | combinación válida según dirección                                                |
| tiempos     | `provider_occurred_at`, `received_at`, `processed_at`, `created_at`, `updated_at` |

`content_kind` normaliza a `text`, `media`, `interactive`, `location`, `contact`, `order`, `reaction`, `unsupported` o `system`; el tipo exacto del proveedor permanece en `provider_message_type` para evolución sin reinterpretar datos.

Estados válidos:

| Dirección | Estados                                                                                      |
| --------- | -------------------------------------------------------------------------------------------- |
| inbound   | `received`, `processed`, `ignored`, `failed`                                                 |
| outbound  | `draft`, `queued`, `accepted`, `sent`, `delivered`, `read`, `failed`, `blocked`, `cancelled` |
| internal  | `recorded`                                                                                   |

`external_message_id` es UNIQUE por conexión cuando existe. Dedupe sigue siendo obligatoria porque no todos los eventos/provider actions garantizan un ID externo utilizable.

Contenido, dirección, autor, conversación y claves son inmutables. Solo pueden avanzar estado, ID externo, timestamps de proceso y contexto de entrega mediante workflows autorizados.

### 8. `app_private.message_delivery_events`

Ledger append-only de estados del proveedor.

| Campo    | Contrato                                                       |
| -------- | -------------------------------------------------------------- |
| scope    | `id`, `organization_id`, `channel_connection_id`, `message_id` |
| fuente   | `source_inbound_event_id` nullable                             |
| dedupe   | `deduplication_key` SHA-256 y UNIQUE por conexión              |
| `status` | `accepted`, `sent`, `delivered`, `read`, `failed`, `deleted`   |
| tiempos  | `provider_occurred_at`, `received_at`, `created_at`            |
| error    | `error_code`, `error_details` JSONB redactado y limitado       |

No se actualiza ni elimina. El mensaje materializado se reconcilia por tiempo del proveedor y una transición válida; recibir `sent` después de `delivered` no retrocede el estado.

### 9. `app_private.consents`

Evidencia append-only de consentimiento o revocación.

| Campo      | Contrato                                                                |
| ---------- | ----------------------------------------------------------------------- |
| scope      | `id`, `organization_id`, `channel_connection_id`, `channel_identity_id` |
| evidencia  | `evidence_message_id` nullable y de la misma conexión                   |
| `purpose`  | propósito explícito, normalizado por workflow/política                  |
| `decision` | `granted` o `revoked`                                                   |
| `source`   | fuente explícita, no texto inferido sin evidencia                       |
| dedupe     | `deduplication_key` SHA-256 y UNIQUE por conexión                       |
| vigencia   | `effective_at`, `expires_at` nullable, `recorded_at`                    |
| `metadata` | evidencia mínima JSONB, sin secreto                                     |

La vigencia actual se obtiene de la última evidencia efectiva no expirada para identidad+propósito. Ningún mensaje saliente interpreta el consentimiento directamente desde el LLM.

### 10. `app_private.outbox_events`

Intención durable de efecto externo, privada y separada del mensaje.

| Campo       | Contrato                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| scope       | `id`, `organization_id`, `channel_connection_id`                                                       |
| relaciones  | `conversation_id`, `message_id`, `destination_identity_id` nullable según operación                    |
| `operation` | tipo versionable; `message.send` exige las tres relaciones                                             |
| dedupe      | `idempotency_key` SHA-256 y UNIQUE por conexión                                                        |
| `payload`   | referencias/argumentos mínimos JSONB, máximo 64 KiB; no duplica secretos                               |
| política    | `policy_status`, `policy_basis`, `policy_evaluated_at`                                                 |
| ejecución   | `status`, `attempt_count`, `available_at`, `processing_started_at`, `lease_expires_at`, `completed_at` |
| resultado   | `provider_request_id`, `last_error_code` redactado                                                     |
| tiempos     | `created_at`, `updated_at`                                                                             |

Estados: `pending`, `processing`, `retryable`, `succeeded`, `blocked`, `failed`, `cancelled`. Política: `pending`, `allowed`, `blocked`.

Reglas:

- solo `policy_status = allowed` puede entrar a `processing` o `succeeded`;
- `blocked` exige política bloqueada y razón;
- estados terminales exigen `completed_at`;
- `processing` exige lease y tiempo de inicio;
- existe como máximo un `message.send` por `message_id`;
- retries reutilizan la fila y la misma idempotency key;
- la llamada Meta ocurre fuera de la transacción de claim.

## Relaciones tenant-aware

Cada tabla padre expone UNIQUE compuesto necesario para FKs hijas:

- conexión: `(organization_id, id)`;
- contacto: `(organization_id, id)`;
- identidad: `(organization_id, channel_connection_id, id)`;
- inbox: `(organization_id, channel_connection_id, id)`;
- conversación: `(organization_id, channel_connection_id, id)`;
- participante: `(organization_id, channel_connection_id, conversation_id, id)`;
- mensaje: `(organization_id, channel_connection_id, conversation_id, id)` para replies/participantes y `(organization_id, channel_connection_id, id)` para delivery, consentimiento y outbox.

Una FK simple a UUID no es suficiente para B2-002. Las pruebas intentarán combinar organización A con conexión/identidad/conversación B y deben fallar por constraint antes de RLS.

## RLS, roles y exposición

Todas las diez tablas habilitan y fuerzan RLS.

| Datos                                                   | owner/admin | operator | viewer | anon | service_role        |
| ------------------------------------------------------- | ----------- | -------- | ------ | ---- | ------------------- |
| conexiones sin refs secretas                            | SELECT      | no       | no     | no   | escritura explícita |
| contactos/identidades                                   | SELECT      | SELECT   | no     | no   | escritura explícita |
| conversaciones/participantes/mensajes/entregas/consents | SELECT      | SELECT   | no     | no   | escritura explícita |
| inbox/outbox crudos                                     | no          | no       | no     | no   | escritura explícita |

Todas las lecturas autenticadas exigen membresía `active` en la misma organización. `member_user_id` no concede permisos por sí mismo: la autorización administrativa se vuelve a calcular desde membresía actual.

Vistas `api` de invocador y barrera de seguridad:

- `api.channel_connections` excluye referencias secretas;
- `api.contacts`;
- `api.channel_identities`;
- `api.conversations`;
- `api.conversation_participants`;
- `api.messages` excluye contexto crudo innecesario;
- `api.message_delivery_events` excluye detalle de error sensible;
- `api.consents` excluye metadata de evidencia.

No existen vistas para `inbound_events` u `outbox_events`. `api` sigue sin exposición remota hasta el gate definido en B2-009/B4.

## Privilegios

- `anon` y `PUBLIC`: nada.
- `authenticated`: `USAGE` de schemas y `SELECT` solo en tablas/vistas normalizadas requeridas por `security_invoker`; ninguna mutación.
- `service_role`: `SELECT/INSERT/UPDATE` en agregados mutables; `SELECT/INSERT` en ledgers append-only; cero `DELETE` en tablas B2-002.
- funciones trigger/constraint: `EXECUTE` revocado a `PUBLIC`, `anon`, `authenticated` y `service_role`.

No se añade un rol SQL nuevo ni acceso superuser para la aplicación.

## Índices y concurrencia

- toda FK tiene índice útil o queda cubierta por PK/UNIQUE compuesto;
- búsquedas RLS empiezan por `organization_id`;
- identities: lookup parcial por conexión+subject no revocado;
- conversations: UNIQUE parcial de conversación abierta por conexión+identidad y thread externo scoped;
- messages: timeline por conversación+ocurrencia y lookup de external ID/dedupe;
- delivery events: mensaje+ocurrencia;
- consents: identidad+purpose+effective_at descendente;
- inbox/outbox: índice parcial `available_at, created/received_at` para pendientes/retryable;
- claims usan una sentencia corta con `FOR UPDATE SKIP LOCKED`; HTTP/LLM nunca mantiene locks.

No se añade GIN a JSONB porque B2-002 no consulta por contenido arbitrario. Se crearán índices de expresión solo cuando una query real lo justifique.

## Mutabilidad y borrado

- conexiones, identidades, contactos y conversaciones se desactivan por estado; no se borran;
- participantes finalizan con `left_at`;
- mensajes conservan contenido original y solo actualizan lifecycle permitido;
- delivery events y consents son append-only;
- inbox/outbox actualizan ejecución pero no scope/dedupe/payload aceptado;
- retención/anónimo posterior operará mediante workflow explícito; no se agrega cascade destructivo.

## Flujo definitivo preparado

1. B4 valida firma sobre bytes crudos, límites y conexión real.
2. Una transacción hace `INSERT ... ON CONFLICT` de inbox por conexión+dedupe.
3. API responde a Meta sin esperar al LLM.
4. Worker reclama inbox con lease corto.
5. Adapter normaliza identidad/contacto, conversación, participante y mensaje con dedupe adicional.
6. LLM recibe contexto normalizado y tool allowlist; contenido no cambia permisos.
7. Respuesta crea mensaje outbound y outbox `message.send` en una transacción.
8. Policy engine registra allowed/blocked usando ventana, evidencia y mecanismo oficial.
9. Worker reclama outbox, llama Meta fuera de transacción y persiste ID/resultado.
10. Webhooks de estado crean delivery events; reconciliador actualiza el estado materializado sin retroceso temporal.

## Failure/recovery

| Falla                            | Estado persistente                            | Recuperación                                      |
| -------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| firma inválida                   | no entra al inbox                             | HTTP rechazado y métrica redactada en B4          |
| entrega duplicada                | mismo inbox                                   | éxito idempotente, cero nuevo efecto              |
| wrapper distinto/mismo mensaje   | inbox adicional posible, mismo message dedupe | normalizador no duplica conversación/respuesta    |
| worker cae tras claim            | lease expira                                  | vuelve a retryable/reclaim                        |
| Meta acepta y HTTP se corta      | outbox incierto + mismo message/idempotency   | conciliación antes de reintentar                  |
| estado fuera de orden            | delivery event preservado                     | materialización por occurred_at/transición válida |
| ventana/consentimiento ausente   | outbox blocked                                | mecanismo oficial o tarea humana posterior        |
| identidad revocada               | evento queda trazable, no autoriza tools      | revisión/vinculación explícita                    |
| conexión revocada/token inválido | outbox retryable/failed según clasificación   | reconexión B4, nunca éxito falso                  |

## Plan de pruebas pgTAP

1. existencia, columnas, tipos, defaults, PK/FK/UNIQUE/CHECK e índices;
2. todas las tablas con RLS habilitado y forzado;
3. grants exactos anon/authenticated/service_role y vistas hardened;
4. mismo external sender no entra en dos organizaciones;
5. identidad sin conexión o con principal de otra organización falla;
6. `member` no verificado o contacto con campos de miembro falla;
7. conversación/participante/mensaje mezclando conexiones falla;
8. conversación sin participante primario falla al commit;
9. duplicados de inbox, message, delivery, consent y outbox fallan/usan conflict target;
10. estados y combinaciones temporales inválidas fallan;
11. owner/admin ve conexión y operación de su organización;
12. operator ve conversaciones pero no configuración de conexión ni inbox/outbox;
13. viewer/anon no ven PII;
14. usuario A no lee ni muta organización B;
15. authenticated no muta; service role no elimina y ledgers no se actualizan;
16. todas las filas de QA viven en `BEGIN/ROLLBACK`, sin seed.

## Despliegue y recuperación de migración

- un solo archivo versionado creado por Supabase CLI;
- reset/migrate/test/lint/advisors/tipos desde cero antes de staging;
- mismo SQL se promueve a producción separada desde `main`, nunca una variante rápida;
- al ser tablas nuevas sin consumidores, una falla se contiene revocando exposición y aplicando forward-fix; no se borra historia;
- B4 no empieza hasta que staging confirme conteos, RLS, policies, grants, vistas y cero datos persistidos.
