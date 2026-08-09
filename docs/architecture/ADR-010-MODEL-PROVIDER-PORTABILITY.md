# ADR-010 — portabilidad de proveedor y modelo LLM

Estado: aceptada.  
Fecha: 2026-08-03.  
Fuentes: documentación oficial de OpenAI y MiniMax registrada en docs/references/OFFICIAL_DOCUMENTATION_REVIEW.md.

## Objetivo

Fer debe poder elegir el modelo exacto de OpenAI o MiniMax mediante variables de EasyPanel. Un cambio de modelo no puede modificar catálogo, inventario, pedidos, Meta, prompts comerciales ni implementación de tools.

La arquitectura también debe permitir incorporar un modelo o proveedor futuro con un camino explícito y verificable.

## Contrato de configuración

### Variables canónicas

| Variable             | Obligatoria              | Semántica                                                            |
| -------------------- | ------------------------ | -------------------------------------------------------------------- |
| AI_MODEL             | sí en worker             | proveedor:modelo exacto para conversación y tool calling             |
| AI_VISION_MODEL      | no                       | proveedor:modelo para entradas visuales; hereda AI_MODEL si se omite |
| AI_REASONING_EFFORT  | no                       | preferencia genérica; valor inicial medium                           |
| AI_TURN_TIMEOUT_MS   | sí                       | timeout por llamada                                                  |
| AI_MAX_TOOL_ROUNDS   | sí                       | límite duro del ciclo de tools                                       |
| AI_CACHE_MODE        | sí                       | off, auto o explicit según capacidades verificadas                   |
| AI_FALLBACK_MODELS   | no                       | lista ordenada y explícita; vacío significa sin fallback             |
| OPENAI_API_KEY       | si se selecciona OpenAI  | secreto exclusivo del worker                                         |
| MINIMAX_API_KEY      | si se selecciona MiniMax | secreto exclusivo del worker                                         |

Ejemplos de configuración, no lista cerrada:

    AI_MODEL=openai:gpt-5.6-luna
    AI_REASONING_EFFORT=medium

    AI_MODEL=minimax:MiniMax-M2.7-highspeed
    AI_VISION_MODEL=minimax:MiniMax-M3

    AI_MODEL=minimax:MiniMax-M3

Reglas:

1. El texto después del proveedor se envía como model ID exacto; el dominio no mantiene un enum cerrado.
2. Cambiar AI_MODEL y reiniciar/redesplegar worker cambia el modelo usado en ejecuciones nuevas.
3. Una ejecución ya iniciada conserva provider, model y policy version con los que comenzó.
4. AI_VISION_MODEL vacío hereda AI_MODEL. Si ese modelo no soporta visión, la operación falla con capacidad no disponible y queda pendiente; nunca salta silenciosamente a otro proveedor.
5. AI_REASONING_EFFORT sólo se transmite cuando el adaptador declara una semántica compatible. Si no aplica, se registra como not_applied; no se inventa una equivalencia.
6. Una credencial faltante o modelo inválido vuelve readiness no apta y no genera una respuesta ficticia.
7. Los cambios de variables sólo aplican al nuevo proceso/despliegue, conforme al comportamiento de EasyPanel/Vercel.
8. El runtime no impone un límite fijo de salida por configuración comercial: omite el parámetro cuando la API lo permite y, cuando el proveedor lo exige, usa el máximo seguro verificado para el modelo/capacidad seleccionados.
9. Toda terminación por límite de salida o contexto se normaliza, mide y continúa desde estado persistido sin repetir tools ni perder hechos ya confirmados.

## Diseño del runtime de IA

### Núcleo independiente

packages/ai tendrá un contrato interno estable:

- solicitud normalizada con actor, canal, mensajes, contenidos y tools permitidas;
- respuesta normalizada con texto, tool calls, finish reason, uso, latencia y estado del proveedor;
- estado opaco del proveedor para continuidad;
- política de salida resuelta por capacidades verificadas, nunca por una constante global arbitraria;
- errores normalizados sin perder código/request ID seguro del proveedor;
- eventos de cache, costo y rate limit.

El núcleo:

- no contiene nombres de modelos;
- no decide intenciones con reglas de backend;
- no redacta respuestas comerciales hardcodeadas;
- no ejecuta una tool sin autorización del dominio;
- no degrada una entrada multimodal a sólo texto sin evidencia/confirmación.

### Adaptadores

Rutas planeadas para B1-003/B5:

    packages/ai/src/providers/openai/
    packages/ai/src/providers/minimax/
    packages/ai/src/providers/registry/
    packages/ai/src/runtime/
    packages/ai/src/capabilities/
    packages/ai/test/contracts/

OpenAI:

- Responses API;
- preserva IDs/items necesarios para continuidad;
- tools nativas con strict mode;
- registra cached_tokens/cache_write_tokens;
- soporta reasoning effort según el modelo.

MiniMax:

- cliente/ruta oficial compatible seleccionada por el adaptador;
- preserva la respuesta completa requerida para continuidad;
- tools nativas;
- registra cache y reasoning del proveedor sin fingir campos OpenAI;
- acepta IDs de modelo arbitrarios.

Un proveedor futuro agrega un adaptador y un registro; no modifica las tools del dominio.

### Capacidades, no nombres hardcodeados

Cada ejecución resuelve un perfil de capacidad verificable:

- text;
- tool_calling;
- vision;
- video;
- audio_input;
- reasoning;
- streaming;
- prompt_cache;
- provider_managed_state.

El perfil puede proceder de metadatos oficiales/versionados o discovery confiable del proveedor. Un modelo desconocido puede utilizar texto/tools si la API lo acepta, pero una operación especializada no se habilita por conjetura. La ausencia de evidencia falla cerrado para esa capacidad, no para todo el sistema.

El routing se basa en capacidades y política, no en comparaciones dispersas del nombre del modelo.

## Tool calling

- Las mismas definiciones de tools se presentan a cualquier adaptador.
- Los contratos operativos validan argumentos y resultados.
- El LLM decide qué tool usar; el backend decide si el actor puede ejecutarla.
- IDs efectivos, organización, permisos, idempotencia, stock y estados se resuelven fuera del modelo.
- La respuesta de una tool regresa al mismo run/modelo salvo fallback explícito.
- Los adapters transforman formato de tools, nunca significado comercial.

## Cache

- Prefijo estable: políticas versionadas, identidad del agente y definiciones de tools.
- Sufijo dinámico: actor, conversación, catálogo recuperado y mensaje actual.
- OpenAI y MiniMax conservan su mecanismo nativo; el núcleo normaliza métricas, no emula un cache de prompts con datos sensibles.
- Una clave/hash de cache no contiene PII.
- Cache se invalida cuando cambian policy version, toolset version o datos que forman el prefijo.
- El éxito se mide por hit ratio, costo, latencia y calidad; no sólo por tokens cacheados.

## Fallback

- Desactivado por defecto.
- Nunca cambia de OpenAI a MiniMax o viceversa sin AI_FALLBACK_MODELS explícita.
- Cada candidato debe pasar contrato, privacidad, región, costo y evals.
- Una mutación externa no se reejecuta al cambiar de modelo; el ledger/tool result se reutiliza.
- El fallback y su motivo quedan en agent_runs/usage_events.

## Seguridad y privacidad

- Sólo el worker conoce las API keys.
- El modelo recibe el mínimo contexto necesario y nunca secretos.
- Imágenes, OCR y mensajes de clientes son contenido no confiable.
- Los adaptadores aplican límites de bytes, tipos, tokens, tiempo, concurrencia y costo.
- Los logs no guardan payload completo por defecto.
- Cambiar de proveedor puede cambiar tratamiento/retención/región de datos; requiere revisión antes de activar en producción.
- safety_identifier u homólogo usa un hash estable no reversible, nunca teléfono/nombre.

## Pruebas obligatorias

Todo adaptador/modelo seleccionado debe pasar el mismo contrato:

1. respuesta de texto;
2. tool call único y múltiple;
3. argumentos inválidos;
4. tool result y continuación;
5. timeout, rate limit, auth y modelo inexistente;
6. conteo de uso/cache;
7. estado multi-turn;
8. visión cuando se declara;
9. prompt injection sin tool administrativa;
10. cancelación y máximo de rondas;
11. redacción de logs;
12. no duplicación tras retry/fallback.
13. terminación por salida/contexto y continuación idempotente.

Además debe ejecutar evals representativas de AgenteFer: precio pendiente, ambigüedad entre IDs, alta multimodal de categorías conocidas y nuevas, atributos/unidades dinámicos, llanta con/sin rin y tiers 1–4 como fixtures, cantidades mayores, inventario, handoff, asesoría y publicaciones.

## Consecuencias

- Se puede seleccionar cualquier modelo válido de ambas familias sin editar lógica comercial.
- Un modelo sin una capacidad no rompe operaciones no relacionadas.
- Un proveedor nuevo requiere trabajo explícito y medible, pero sólo en la frontera de IA.
- La portabilidad no significa resultados idénticos; las evals definen el umbral de aceptación.
- La variable EasyPanel es un selector de runtime, no una promesa de que un modelo inexistente o incapaz funcionará.

## Criterio de aceptación

La portabilidad queda demostrada, no sólo documentada, cuando:

- el mismo suite de contratos pasa con al menos un modelo OpenAI y uno MiniMax reales;
- cambiar AI_MODEL en staging y redesplegar worker cambia provider/model observados;
- no cambia ningún paquete de dominio;
- las tool calls conservan autorización e idempotencia;
- un modelo no multimodal falla seguro o usa AI_VISION_MODEL explícito;
- costo, latencia, cache y calidad quedan comparables por provider/model.
