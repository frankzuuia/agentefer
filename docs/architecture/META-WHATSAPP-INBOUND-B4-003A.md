# AgenteFer — contrato B4-003A adaptador entrante WhatsApp

Estado: **IMPLEMENTADO Y ENSAYADO — MIGRACIÓN/DEPLOY PENDIENTES**.  
Fecha: 2026-08-26.  
Dependencias verificadas: B2-002, B2-008, B4-001, B4-001B y B4-002.  
Proyecto exclusivo: Supabase `AgenteFer` (`hprdctmblmfcoagugvyp`) y worker EasyPanel `agente-fer/worker`.

## Frontera

Este bloque convierte una entrega WhatsApp ya autenticada en identidad, contacto, conversación,
participante y mensaje normalizados. No llama al LLM, no envía mensajes y no decide intención.

```text
Meta firmado
  → meta_webhook_deliveries (B4-002)
  → claim con lease
  → inbound_events por mensaje/estado
  → claim de whatsapp.message
  → contacto/identidad/conversación/participante/mensaje
  → disponible para el runtime cognitivo B5
```

## Invariantes

1. Sólo `service_role` puede reclamar, enrutar, normalizar o registrar fallos.
2. Claim usa `FOR UPDATE SKIP LOCKED`, token opaco y vencimiento; ningún HTTP/LLM mantiene locks.
3. La organización proviene del endpoint cuya firma ya fue validada. WABA y Phone Number ID deben
   coincidir con una conexión WhatsApp activa de esa misma organización y App.
4. Repetir bytes, wrappers o mensajes no duplica `inbound_events`, contactos, conversaciones ni
   mensajes.
5. Un sender existente conserva su principal `member` o `contact`; el contenido no eleva permisos.
6. El cuerpo del cliente se persiste como dato no confiable y nunca aparece en logs/auditoría segura.
7. `context` y `referral` se conservan como evidencia. B3-003 resolverá publicación/oferta; B4-003A
   no adivina productos por texto.
8. Un inbound refresca la ventana de servicio de forma monotónica. Eventos atrasados no reducen la
   ventana ni `last_activity_at`.
9. Tipos de proveedor conocidos se mapean a `content_kind`; tipos futuros se almacenan como
   `unsupported` sin desplegar lógica comercial nueva.
10. Estados de entrega se separan como `whatsapp.status` y permanecen pendientes para B4-004.

## RPCs backend-only

### `claim_meta_webhook_delivery`

Reclama una entrega del objeto solicitado. Recupera leases vencidos, incrementa intento y devuelve
únicamente IDs internos, número de intento, lease y correlación. El payload bruto no cruza el
límite PostgreSQL→worker.

### `route_meta_whatsapp_delivery`

Valida el lease y lee el payload privado dentro de PostgreSQL; separa cada mensaje/estado, resuelve
la conexión exacta e inserta `inbound_events`. Marca el wrapper `routed` o `ignored` en una
transacción.

### `claim_meta_whatsapp_message_event`

Reclama sólo `whatsapp.message`; deja `whatsapp.status` intacto para B4-004.

### `normalize_meta_whatsapp_message`

Valida nuevamente evidencia interna, serializa por conexión+sender, crea/reutiliza contacto e
identidad, abre/reutiliza conversación, garantiza participante, inserta mensaje y cierra el evento.

### Registro de fallos

Funciones separadas registran retry o dead-letter con código seguro, backoff acotado y máximo de
intentos. No persisten mensajes de excepción ni respuestas del proveedor.

## Escenarios

| ID | Escenario | Resultado |
| --- | --- | --- |
| WA-IN-001 | texto real | una conversación y un mensaje `text` |
| WA-IN-002 | imagen/audio/documento/video/sticker | mensaje `media`; ID y metadata preservados |
| WA-IN-003 | interactivo/contacto/ubicación/pedido/reacción/sistema | `content_kind` exacto |
| WA-IN-004 | tipo nuevo | `unsupported`, sin pérdida del payload permitido |
| WA-IN-005 | mismo wrapper repetido | un delivery y cero efectos duplicados |
| WA-IN-006 | wrapper diferente, mismo `wamid` | dos deliveries posibles y un mensaje |
| WA-IN-007 | mismo sender concurrente | una identidad/contacto y una conversación abierta |
| WA-IN-008 | sender ya vinculado a Fer | conserva `member`; no se degrada a cliente |
| WA-IN-009 | WABA/teléfono de otra organización | falla cerrado, cero inbox cross-tenant |
| WA-IN-010 | worker cae con lease | otro worker recupera al vencer, sin duplicar |
| WA-IN-011 | contexto/referencia de producto | evidencia preservada; resolución comercial diferida |
| WA-IN-012 | evento de estado | `whatsapp.status` pendiente para B4-004 |
| WA-IN-013 | payload válido sin mensajes/estados | wrapper `ignored`, trazable |
| WA-IN-014 | payload malformado después de firma | retry acotado y luego dead-letter |
| WA-IN-015 | texto hostil o prompt injection | se almacena como no confiable; no cambia rol/tools |

## Seguridad y observabilidad

- Sin tablas públicas, sin grants `anon`, sin vistas de raw payload y RLS forzada preservada.
- Logs estructurados sólo con IDs internos redactados por la librería de observabilidad.
- Métricas por operación: claim, route, normalize y failure, con resultado/latencia y sin PII.
- Secret key sólo en worker; tokens Meta no participan en entrada ni se descifran aquí.
- Payloads y respuestas RPC tienen límites físicos; timeouts no producen reintentos ciegos infinitos.

## Puertas

- pgTAP: estructura, grants, claims, leases, tenancy, idempotencia, contexto y normalización.
- Concurrencia: dos workers y mismo sender.
- Unit/contract: runtime, límites, timeouts, shutdown y clasificación de fallos.
- Gherkin: caminos normales, edge, falla y recuperación.
- Mutation: lease, grants, scope WABA/teléfono, dedupe e identidad.
- Gates generales: format, lint, typecheck, cobertura, build, audit y secret scan.

## Límites posteriores

- B4-003B implementará Messenger cuando exista Page real y permisos verificables.
- B5 conectará OpenAI/MiniMax y tool calling nativo.
- B4-004 creará outbox, policy de ventana/plantilla, envío y estados.
- B4-009 certificará Meta → worker → LLM/tools → respuesta real.
