# AgenteFer — herramientas cognitivas de lectura B3-001A

Estado: **WORKER DEPLOYED — REAL WHATSAPP E2E PENDING**.  
Fecha de corte: 2026-08-28.  
Dependencias: B2-003, B2-004, B2-005, B2-008, B2-009 y B4-004A–F.

## Resultado del bloque

El asistente de clientes deja de responder únicamente con conocimiento general y obtiene tres herramientas nativas, universales y aisladas por organización:

1. `conversation_get_context`: recupera el contexto durable de la conversación actual.
2. `catalog_search`: busca productos y variantes activas por lenguaje natural, SKU, nombre, descripción y atributos públicos.
3. `catalog_get_offer`: obtiene una oferta verificable para una variante, unidad y cantidad exactas, incluyendo precio vigente y disponibilidad.

El LLM decide cuándo y cómo usarlas. TypeScript y PostgreSQL no clasifican intención; sólo validan el protocolo, la versión del contrato, la autorización congelada, el tenant, la idempotencia y los tipos de entrada/salida.

## Flujo durable

```text
mensaje de WhatsApp
  -> claim del run y policy congelada
  -> provider recibe tools autorizadas
  -> LLM emite tool_call nativa
  -> tool_call se persiste y autoriza en el ledger B2-008
  -> RPC de dominio ejecuta exclusivamente dentro del tenant del run
  -> resultado se persiste como tool_result
  -> job vuelve a waiting_provider
  -> provider recibe tool_call + tool_result con el call_id original
  -> LLM redacta la respuesta visible
  -> outbox conserva la ventana de servicio de 24 horas
```

Ningún resultado comercial sale directo al cliente. Siempre vuelve al mismo modelo para que éste razone con el contexto y redacte la respuesta final.

## Contratos nativos

### `conversation_get_context`

Entrada:

```json
{}
```

Salida: identidad pública disponible del contacto, canal, estado y ventana de servicio, referencia de publicación/producto preservada por Meta y mensajes recientes seguros. Nunca incluye secretos ni datos de otra conversación.

### `catalog_search`

Entrada:

```json
{
  "query": "texto libre del cliente",
  "limit": 5
}
```

`query` es obligatorio y `limit` está acotado por contrato. La búsqueda devuelve sólo producto y variante activos del tenant, SKU vigente, categoría, atributos públicos confirmados y resumen de disponibilidad. Un resultado vacío es evidencia válida; no autoriza inventar.

### `catalog_get_offer`

Entrada:

```json
{
  "variant_id": "uuid",
  "unit_id": "uuid",
  "quantity": 4
}
```

La herramienta usa el price book activo por defecto de la organización y el resolver B2-004. Devuelve `priced`, `on_request` o `not_configured`, moneda, método de cálculo, total exacto y disponibilidad de la composición/unidad solicitada. No transforma un precio faltante en cero.

## Portabilidad de proveedor

- OpenAI Responses conserva `function_call.call_id` y continúa con `function_call_output`.
- MiniMax Chat Completions conserva `tool_calls[].id` y continúa con un mensaje `tool` enlazado por `tool_call_id`.
- El dominio durable guarda una representación neutral; cada adapter proyecta el formato de su proveedor.
- Agregar un modelo nuevo de una familia soportada no requiere migración. Agregar una familia nueva requiere sólo un adapter que traduzca definiciones, calls, results y terminaciones al contrato neutral.

## Seguridad e invariantes

- Las herramientas se obtienen exclusivamente de `agent_policy_tools` de la policy congelada.
- Las tools de este bloque permiten `actor_kind=contact` sólo en canal `whatsapp`.
- Los UUID de entrada nunca deciden el tenant; el tenant siempre proviene del run reclamado.
- Todas las consultas incluyen `organization_id` y estados publicables/activos.
- El worker usa service role únicamente contra RPCs cerradas; no recibe acceso genérico a tablas.
- Una tool no registrada, desactivada o fuera de policy termina bloqueada y se devuelve como resultado seguro al modelo.
- Los argumentos y resultados quedan hasheados, auditados y sujetos a límites de tamaño.
- No hay regex, palabras clave ni `if/else` para comprender lo que el cliente quiso decir.

## Recuperación e idempotencia

- `provider_tool_call_id` identifica la llamada dentro del run.
- `execution_key` deriva de organización, run y call id; un replay idéntico recupera la misma ejecución.
- Antes de liberar el lease se persisten call, checkpoint del proveedor y estado `waiting_tools` en una operación consistente.
- Después de registrar el resultado, el job se reactiva con el historial neutral de tools.
- Una caída antes de persistir no deja una acción ficticia; una caída después de persistir recupera el mismo resultado.
- Este bloque sólo ejecuta lecturas, por lo que nunca existe incertidumbre de efecto externo.

## Preparación multitenant y escalamiento

- Cada proceso worker ejecuta el backfill acotado una sola vez después de arrancar; no vuelve a escanear organizaciones en cada sondeo.
- El backfill excluye policies que ya contienen los tres contratos actuales, prioriza organizaciones con trabajo WhatsApp accionable y permite que lotes consecutivos avancen más allá de las primeras 100 organizaciones.
- Un fallo de preparación queda auditado dentro de su tenant y entra en enfriamiento durante cinco minutos; los demás tenants siguen disponibles.
- El `claim` de un mensaje nuevo vuelve a comprobar y preparar las tools dentro de la misma transacción antes de crear el `agent_run`. Así, una organización agregada después del arranque no depende del backfill.
- Las ejecuciones históricas conservan la policy inmutable que ya habían congelado; el hardening no reescribe runs en curso.
- La función privada de readiness no es ejecutable por `anon`, `authenticated` ni `service_role`; el worker usa exclusivamente las RPC públicas revisadas.

## Fuera de alcance

- Crear o modificar productos, precios, inventario o publicaciones.
- Tomar pedidos, reservar stock, cerrar ventas o escalar a Fer.
- Messenger y catálogo web público.

Esas capacidades usarán el mismo ledger en bloques posteriores y no podrán saltarse los contratos establecidos aquí.
