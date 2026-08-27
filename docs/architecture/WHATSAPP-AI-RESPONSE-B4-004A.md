# AgenteFer — contrato B4-004A respuesta IA por WhatsApp

Estado: **ESPECIFICADO — IMPLEMENTACIÓN PENDIENTE**.  
Fecha: 2026-08-27.  
Dependencias verificadas: B2-002, B2-008, B4-001/B4-001B, B4-002 y B4-003A.  
Proyecto exclusivo: Supabase `AgenteFer` (`hprdctmblmfcoagugvyp`) y worker EasyPanel
`agente-fer/worker`.

## Resultado observable

Un mensaje WhatsApp iniciado por un cliente, autenticado y normalizado genera exactamente un turno
cognitivo durable. El proveedor elegido por `AI_MODEL` produce la respuesta; un outbox autorizado
por la ventana de servicio la envía mediante la conexión WhatsApp de la misma organización.

```text
mensaje inbound normalizado
  → enqueue idempotente del run
  → claim con lease global de servicio
  → prompt/política/historial tenant-scoped
  → OpenAI Responses o MiniMax Chat Completions
  → tool calls nativos cuando existan tools autorizadas
  → mensaje outbound + outbox en una transacción
  → claim con lease y política de ventana
  → token activo desde Vault + Graph API
  → ack durable con wamid
```

## Invariantes

1. El backend no clasifica intención, redacta respuestas comerciales ni extrae argumentos mediante
   regex. El LLM decide texto y tool calls; el runtime sólo valida contratos y permisos.
2. `AI_MODEL=provider:model` selecciona dinámicamente OpenAI o MiniMax. Ningún nombre de modelo se
   codifica en lógica de negocio y un proveedor nuevo se incorpora mediante un adapter registrado.
3. Cada mensaje inbound origina como máximo un run y cada salida origina como máximo un outbox.
4. Claim, intento, respuesta y envío usan leases opacos, presupuesto de intentos y recuperación.
5. Organización, conexión, conversación, identidad destino, WABA y Phone Number ID se derivan de
   claves internas relacionadas; el contenido del cliente nunca decide tenancy.
6. El token Meta se descifra desde Vault únicamente después de reclamar un outbox autorizado. No se
   persiste en payload, mensajes, logs, métricas ni respuesta RPC posterior al envío.
7. Un texto libre sólo se envía dentro de la ventana vigente iniciada por el cliente. Fuera de ella
   queda bloqueado; B4-004B incorporará plantillas aprobadas.
8. La respuesta del proveedor se valida por tamaño, UTF-8, estructura, terminación y contenido útil.
   El razonamiento privado nunca se envía al cliente.
9. Truncamiento recuperable conserva checkpoint/estado; no duplica tool calls ni vuelve a preguntar
   información ya persistida.
10. Fallo LLM o Meta no se presenta como éxito. Se conserva para retry, fallback, conciliación o
    handoff con códigos seguros.
11. Una organización nueva obtiene de forma automática una política inicial versionada; el prompt
    es configuración auditable, no una respuesta hardcodeada.
12. Mientras no existan tools comerciales activas, el modelo puede conversar pero debe declarar
    incertidumbre y no inventar catálogo, precio, stock, venta o acción ejecutada.

## Fronteras de implementación

### Bootstrap de política

Una función interna idempotente crea prompt y policy inicial por organización usando al owner real
como autor. Se ejecuta para organizaciones existentes y en onboarding futuro. No pisa versiones ni
configuraciones creadas por el negocio.

### Enqueue post-normalización

La transacción que finaliza `whatsapp.message` encola el run usando el ID del mensaje inbound como
idempotency key. El payload del job contiene sólo IDs y metadatos seguros; el contenido se obtiene
en el claim tenant-scoped.

### Runtime de proveedor

- `openai:*` usa Responses API y conserva `response.id`/termination/usage.
- `minimax:*` usa el endpoint OpenAI-compatible `/v1/chat/completions`, preserva el mensaje completo
  para continuidad de tool calling y solicita `reasoning_split=true` para separar razonamiento de
  texto visible. Los mensajes de canal `text` se proyectan como texto conversacional; únicamente
  contenido no textual conserva el sobre estructurado con `content_kind`.
- La salida pública acepta texto del proveedor o el sobre interno exacto
  `content_kind=text/content.text.body`. El sobre se proyecta a `body`; cualquier estructura JSON
  desconocida falla cerrado y nunca llega al canal. Esta frontera es validación de protocolo, no
  clasificación de intención ni redacción en backend.
- Los adapters omiten límites artificiales de salida cuando el proveedor lo permite.
- Timeouts, HTTP, rate limit, auth, filtro de contenido y respuesta inválida tienen clasificación
  operativa explícita.

### Salida WhatsApp

El cierre exitoso del turno inserta el mensaje outbound y `message.send` outbox de forma atómica.
El dispatcher reclama únicamente eventos `allowed`, obtiene destino/teléfono/token de la conexión
exacta, envía `POST /{phone-number-id}/messages` y persiste el identificador externo.

## Escenarios de aceptación

| ID        | Escenario                                     | Resultado                                           |
| --------- | --------------------------------------------- | --------------------------------------------------- |
| WA-AI-001 | cliente escribe “hola” dentro de ventana      | una respuesta real del LLM llega por WhatsApp       |
| WA-AI-002 | Meta repite el inbound                        | un run, una respuesta y un envío                    |
| WA-AI-003 | dos organizaciones reciben simultáneamente    | provider, prompt, token y destino no se cruzan      |
| WA-AI-004 | `AI_MODEL` cambia OpenAI↔MiniMax              | siguiente run usa el adapter/modelo indicado        |
| WA-AI-005 | modelo nuevo de familia existente             | se transmite el nombre sin cambio de negocio        |
| WA-AI-006 | pregunta sin tool de catálogo                 | no inventa precio/stock ni afirma una acción        |
| WA-AI-007 | modelo solicita tool no autorizada            | ejecución rechazada y auditada                      |
| WA-AI-008 | salida vacía, inválida o sólo razonamiento    | no se envía; retry/fallback seguro                  |
| WA-AI-009 | timeout/rate limit/proveedor caído            | lease se liquida retryable sin duplicar             |
| WA-AI-010 | ventana de WhatsApp vencida                   | outbox bloqueado, cero llamada Graph                |
| WA-AI-011 | token revocado o Graph 401                    | fallo autenticación durable, sin fuga de secreto    |
| WA-AI-012 | Graph acepta y worker cae antes del ack       | idempotencia/conciliación impide afirmar duplicados |
| WA-AI-013 | prompt injection solicita administrar negocio | tools del contacto permanecen limitadas             |
| WA-AI-014 | payload/response excede límite físico         | rechazo seguro y medido                             |
| WA-AI-015 | shutdown durante LLM o Graph                  | abort, lease recuperable y cero trabajo posterior   |

## Puertas obligatorias

- pgTAP de bootstrap, enqueue, claims, ventana, outbox, Vault, tenancy e idempotencia.
- Unit/contract TCP reales para adapters LLM y Graph; sin mocks de dominio.
- Concurrencia de dos workers y crash-recovery.
- Gherkin de caminos normales, límites, fallas y recuperación.
- Mutation testing dirigido sobre autorización, dedupe, terminación y clasificación HTTP.
- Cobertura total y por rutas críticas; lint, tipos, build, audit, secret scan y contenedor no-root.
- E2E staging con un WhatsApp real y evidencia Meta→DB→LLM→DB→Meta.

## Decisiones posteriores explícitas

- Las tools universales de catálogo/inventario/precio se conectan en B3-006–B3-011 sin cambiar el
  transporte de este bloque.
- Plantillas fuera de ventana y estados delivered/read se completan en B4-004B.
- Messenger reutiliza el ledger/provider runtime, pero mantiene adapter y credenciales separados.
