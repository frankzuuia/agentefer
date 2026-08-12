# AgenteFer — investigación B2-008 runtime cognitivo durable

Fecha de revisión: 2026-08-12.  
Alcance: BL-018–BL-022, SC-027–SC-031 y SC-037.  
Proyecto: exclusivamente AgenteFer.

## Fuentes primarias revisadas

- [OpenAI model guidance](https://developers.openai.com/api/docs/guides/latest-model): Responses API, continuidad con estado/`previous_response_id`, preservación de `call_id`, tool calling, cache explícito/implícito, `cached_tokens`, `cache_write_tokens`, reasoning persistido y límites por capacidad.
- [MiniMax API overview](https://platform.minimax.io/docs/api-reference/api-overview): generación conversacional y tool calls mediante una interfaz de proveedor sin lógica de negocio.
- [MiniMax Prompt Caching](https://platform.minimax.io/docs/api-reference/text-prompt-caching): cache por prefijo, métricas `cached_tokens`/cache read propias y diferencias entre cache automático y explícito.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security): RLS, policies por rol y vistas `security_invoker` para preservar políticas del llamador.
- [Supabase Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security): privilegios de columna o vistas dedicadas para no exponer payloads sensibles.
- [Supabase Queues](https://supabase.com/docs/guides/queues) y [PGMQ](https://supabase.com/docs/guides/queues/pgmq): entrega durable con visibility timeout; una cola transporta trabajo pero no reemplaza el ledger de dominio ni la idempotencia del efecto.
- ADR local `docs/architecture/ADR-010-MODEL-PROVIDER-PORTABILITY.md`: selector `provider:model`, capabilities, fallback explícito, estado durable, cache sin PII y output sin límite artificial bajo.
- Seguridad local `docs/security/SECURITY_BASELINE.md` y `docs/security/THREAT_MODEL.md`: contenido recuperado no confiable, autorización de tools fuera del modelo, secretos sólo backend y auditoría redactada.

## Hechos que gobiernan el modelo

1. Un run iniciado debe conservar proveedor, modelo, prompt, toolset, policy, configuración comercial y límites exactos aunque EasyPanel cambie después.
2. OpenAI y MiniMax no comparten todos los nombres de campos de uso/cache/estado. El dominio guarda métricas normalizadas y un resumen provider-specific seguro, nunca falsifica equivalencias.
3. Los IDs/estado necesarios para continuar una respuesta son datos del adapter. B2-008 guarda referencia, hash y secuencia; el payload opaco se almacenará en un medio protegido cuando exista B2-010/B5.
4. Una tool confirmada se reutiliza al continuar o hacer fallback. `provider_tool_call_id`, `execution_key` y `external_effect_key` impiden repetir efectos.
5. Queue visibility no garantiza exactamente una mutación de negocio frente a crashes. El job, attempt, tool ledger y certeza de efecto siguen siendo obligatorios.
6. El costo real puede conocerse después de la llamada. El evento siempre se registra; si rebasa presupuesto, el run queda bloqueado para nuevas llamadas y no se oculta el consumo.
7. Un costo ausente no equivale a cero. La policy decide `block` o `allow_and_alert`; la decisión queda auditada.
8. Las vistas de operación no exponen prompts, contenido de mensajes del agente, argumentos/resultados completos, memoria ni referencias de checkpoint.

## Decisiones y exclusiones

- PostgreSQL no interpreta intención, acentos, OCR ni prompt injection. El LLM elige una tool nativa; la base autoriza el contrato exacto y aplica invariantes.
- Los JSON Schema son contratos de tools, no un `response_format` rígido para asfixiar la salida completa del modelo.
- No se enumera una lista cerrada de modelos. `provider` y `model` son textos exactos y cada run/attempt conserva ambos.
- No se crea otro `outbox_events`: B2-002 ya posee el outbox de mensajería; tools y audit lo referencian.
- No se habilita `pgmq` todavía. El ledger B2-008 es transport-neutral y B5/B6 conectará el transporte reproducible.
- No se almacenan API keys, tokens Meta, secretos o headers completos.
- No se declara disponible ningún adapter real. La certificación OpenAI/MiniMax con cuentas reales pertenece a B5.

## Riesgos que el contrato debe demostrar

- activación concurrente de versiones y rollback sobre base obsoleta;
- conversación abierta que cambia de configuración a mitad de atención;
- cliente que intenta tool administrativa o tool fuera del policy snapshot;
- tool call duplicada después de retry/fallback;
- límite de rondas, intentos, timeout o presupuesto rebasado;
- costo desconocido tratado silenciosamente como cero;
- worker perdido antes o después de iniciar un efecto externo;
- checkpoint faltante ante truncamiento de salida/contexto;
- provider/model cambiado dentro de un attempt ya iniciado;
- fuga cross-tenant o exposición de prompts, memoria, argumentos o estado opaco;
- update/delete de usage, error, attempt o audit history.
