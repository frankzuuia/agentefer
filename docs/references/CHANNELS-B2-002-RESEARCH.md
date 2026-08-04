# AgenteFer — investigación oficial de canales B2-002

Fecha de corte: 2026-08-03.  
Alcance: contratos de identidad, webhooks, mensajes y estados necesarios para diseñar B2-002.  
Regla: este documento no acredita permisos ni credenciales reales de AgenteFer; esa capability matrix se prueba en B4.

## Fuentes primarias revisadas

- [Workspace oficial WhatsApp Business Platform de Meta](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Colección oficial WhatsApp Cloud API de Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Referencia oficial de payloads webhook de WhatsApp](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)
- [Workspace oficial Messenger Platform API de Meta](https://www.postman.com/meta/messenger-platform-api/overview)
- [Webhooks oficiales de Messenger Platform](https://www.postman.com/meta/messenger-platform-api/folder/22794852-b5d97624-14d8-4e67-a2e4-529add49ca58)
- [Send API oficial de Messenger Platform](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api)
- [Changelog oficial de Supabase](https://supabase.com/changelog)
- reglas locales completas de `supabase-postgres-best-practices`: claves, tipos, constraints, FKs, índices, upsert, RLS, privilegios, JSONB y locks.

Las páginas renderizadas de `developers.facebook.com` devolvieron error al lector automatizado. No se sustituyeron por blogs: se usaron los workspaces publicados por Meta en Postman y se mantiene B4 como gate contra la App/Página/número reales.

## Contrato confirmado de WhatsApp Cloud API

1. La jerarquía operativa incluye Meta business portfolio, WhatsApp Business Account (WABA) y business phone number.
2. El webhook usa `object = whatsapp_business_account`; `entry.id` identifica el WABA y `metadata.phone_number_id` identifica el número receptor de Cloud API.
3. Enviar usa `/{phone_number_id}/messages`; la respuesta entrega el identificador del destinatario y un mensaje con ID prefijado `wamid`.
4. El ID de mensaje se usa para contestar a un mensaje concreto y reconciliar estados.
5. Los estados documentados incluyen `sent`, `delivered`, `read`, `failed` y `deleted`. Son eventos independientes: AgenteFer preservará su timestamp y no asumirá orden de recepción.
6. La colección oficial exige `whatsapp_business_management` y `whatsapp_business_messaging`; tokens de usuario y system user existen, pero ningún token pertenece al modelo de dominio público.
7. El webhook debe suscribirse al WABA y responder rápido; la verificación criptográfica y la prueba real de suscripción pertenecen a B4.

### Consecuencia física

- una conexión WhatsApp queda scoped por proveedor, WABA y `phone_number_id`;
- un `wa_id` o mensaje `wamid` nunca se resuelve sin esa conexión;
- un estado no sobreescribe historia: se registra como evento deduplicado y el estado materializado solo avanza mediante reconciliación temporal;
- secretos se referencian, no se almacenan como columnas de credencial.

## Contrato confirmado de Messenger Platform

1. El webhook de Página usa `object = page`; `entry.id` es `PAGE_ID`.
2. Dentro de `messaging`, `sender.id` es el identificador Page-scoped de la persona (PSID) y `recipient.id` es la Página en mensajes entrantes.
3. El Send API usa `/{PAGE_ID}/messages`, `recipient.id = PSID` y devuelve `recipient_id` y `message_id`.
4. La respuesta libre estándar se dirige a una persona que escribió a la Página; la colección documenta la ventana de 24 horas o consentimiento/mecanismo autorizado fuera de ella.
5. Meta firma Event Notifications con `X-Hub-Signature-256`, usando el App Secret y el payload. La verificación GET compara `hub.verify_token` y devuelve `hub.challenge`.
6. Meta reintenta entregas fallidas; la colección exige deduplicación. También advierte que múltiples mensajes pueden llegar fuera de orden y que debe usarse el timestamp del webhook.
7. El historial de notificaciones no se consulta después a Meta: el inbox aceptado debe persistirse antes de continuar.

### Consecuencia física

- una conexión Messenger queda scoped por proveedor y `PAGE_ID`;
- un PSID y un `message_id` solo son únicos dentro de la conexión de Página que los emitió;
- llegada y ocurrencia son tiempos distintos;
- el payload aceptado queda privado y sujeto a futura retención; la UI consume proyecciones normalizadas, nunca el inbox crudo.

## Supabase/PostgreSQL vigente

El changelog revisado hasta 2026-07-30 no introduce un cambio que invalide B2-002. Sí ratifica controles ya elegidos:

- las tablas no deben depender de exposición automática por Data API;
- `realtime` no es el mecanismo de inbox/outbox y su schema está bloqueado contra cambios;
- Postgres 17 es la línea vigente del proyecto;
- no se fijan versiones de extensiones en SQL;
- las legacy keys y superficies automáticas no forman parte del contrato productivo.

Las reglas de Postgres aplicables exigen FKs indexadas, constraints para invariantes, `ON CONFLICT` para deduplicación atómica, RLS forzado, grants mínimos, transacciones cortas y `FOR UPDATE SKIP LOCKED` cuando el worker reclame filas.

## Decisiones ratificadas para B2-002

1. `app_private` conserva toda PII y bodies aceptados; `public` permanece vacío.
2. Toda entidad operacional lleva `organization_id`.
3. Toda identidad externa y todo ID de mensaje se scoped por `channel_connection_id`.
4. Las FKs incluyen organización y conexión para impedir ensamblar filas válidas de tenants distintos.
5. Inbox deduplica la entrega; mensajes y eventos de entrega deduplican efectos normalizados. Una sola capa no es suficiente.
6. Outbox conserva intención, política y estado; el HTTP externo nunca ocurre dentro de una transacción de DB.
7. Consentimiento es evidencia versionada, no un booleano sin fuente ni vigencia.
8. `authenticated` no muta tablas; tools server-side futuras autorizan y auditan.
9. Inbox/outbox crudos no se exponen a `authenticated`; conversaciones normalizadas requieren rol operacional activo.
10. No se insertan Página, WABA, número, PSID, teléfono, token ni conversaciones reales en esta migración.

## Gates que permanecen para B4

- App ID, WABA, `phone_number_id`, Página y PSID reales;
- permisos concedidos y App Review aplicable;
- token system user/Page y estrategia real de rotación;
- challenge, firma sobre bytes crudos y replay con fixtures/eventos reales;
- versión Graph seleccionada y soportada;
- ventana, plantillas/utility messages y política efectiva de la cuenta;
- payloads exactos activados para mensajes, adjuntos, referencias de publicación y estados;
- retención aprobada de PII/payloads y borrado/anónimo.

Hasta pasar esos gates, el esquema expresa capacidades posibles y estados verificables, pero no afirma que Meta ya esté conectado.
