# AgenteFer — investigación oficial B4-003A entrada WhatsApp

Fecha de corte: 2026-08-25.  
Alcance: webhook ya autenticado en B4-002 → mensaje WhatsApp normalizado.  
Fuera de alcance: Messenger (B4-003B), razonamiento LLM (B5), salida y estados (B4-004).

## Fuentes oficiales consultadas

- [Webhook Payload Reference — Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/tduohwq/webhook-payload-reference)
- [Messages Object — Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/1dtuocp/messages-object)
- [Statuses Object — Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/fuaee8l/statuses-object)
- [Context Object — Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/hysdhqs/context-object)
- [Webhook Subscriptions — Meta](https://www.postman.com/meta/whatsapp-business-platform/folder/ozgs3jn/webhook-subscriptions)
- [Message Status Update Notifications — Meta](https://www.postman.com/meta/whatsapp-business-platform/request/rgtfq23/message-status-update-notifications)

## Hechos verificados

1. El objeto raíz de WhatsApp Cloud API es `whatsapp_business_account`.
2. Una entrega contiene uno o más `entry`; cada entrada identifica el WABA y contiene uno o más `changes`.
3. El cambio de mensajería usa `field = messages`, `value.messaging_product = whatsapp` y
   `value.metadata.phone_number_id` para identificar el número receptor.
4. `value.messages` puede contener mensajes de texto, medios, respuestas interactivas, contactos,
   ubicación, pedidos, reacciones, sistema o tipos desconocidos.
5. `message.id` es el identificador externo que permite deduplicar y correlacionar respuestas/estados.
6. `message.context` puede referenciar otro mensaje o un producto; `message.referral` puede conservar
   el origen publicitario. Ninguno de esos campos autoriza por sí mismo una operación comercial.
7. `value.statuses` usa el ID del mensaje saliente y puede llegar fuera de orden; B4-004 lo conciliará
   por timestamp, no por orden de recepción.
8. Meta puede reintentar webhooks. La aplicación debe responder rápido, persistir antes del trabajo
   asíncrono y deduplicar efectos.

## Evidencia real redactada

Consulta de sólo forma sobre el último delivery aceptado en Supabase AgenteFer:

- objeto: `whatsapp_business_account`;
- cambios: 1;
- mensajes: 1;
- tipo: `text`;
- estados: 0;
- delivery: `received`;
- repetición: 1 entrega.

La consulta no leyó ni imprimió teléfono, nombre, texto, WABA, Phone Number ID ni token.

## Decisiones

- El adaptador interpreta únicamente el protocolo de Meta. No interpreta intención comercial.
- La resolución tenant usa conjuntamente organización autenticada del endpoint, App interna, WABA y
  Phone Number ID; ningún campo del cliente elige organización.
- El evento crudo firmado permanece en `meta_webhook_deliveries`; cada mensaje/estado se separa en
  `inbound_events` con idempotencia adicional.
- Texto y metadatos de proveedor permanecen privados y no aparecen en logs ni auditoría segura.
- Un mensaje desconocido se conserva como `unsupported`; no se inventa semántica.
- El LLM recibirá el mensaje normalizado en B5 y decidirá tools mediante tool calling nativo.
