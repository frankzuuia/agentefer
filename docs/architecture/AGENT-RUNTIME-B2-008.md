# AgenteFer — contrato físico B2-008 runtime cognitivo durable

Estado: **COMPLETE**; migración aplicada en Supabase AgenteFer y certificación local/remota verde.  
Fecha: 2026-08-12.  
Dependencias: B2-001–B2-007, ADR-010 y outbox B2-002.

## Frontera cognitiva

El LLM comprende el lenguaje y elige tools mediante tool calling nativo. El backend y PostgreSQL no adivinan intención; validan identidad, policy exacta, permisos, contratos, idempotencia, presupuesto, estados y certeza del efecto.

```text
mensaje/evento no confiable
  -> run con policy/config/model congelados
  -> llamada provider-neutral
  -> tool call propuesta por el LLM
  -> autorización determinista del contrato exacto
  -> ejecución de dominio/adaptador
  -> resultado durable devuelto al mismo run
  -> continuación, fallback explícito o cierre seguro
```

## Entidades físicas

### Versionado y policy

1. `agent_commands`: ledger idempotente de comandos B2-008; guarda fingerprint, no request crudo.
2. `business_configurations`: raíz por organización/clave con puntero a versión vigente.
3. `business_configuration_versions`: documento validado e inmutable, versión monotónica, hash y procedencia; rollback crea otra versión.
4. `prompt_versions`: prompt inmutable con hash; el contenido queda privado y sólo metadata llega a vistas.
5. `tool_contracts`: identidad estable de una tool, sin semántica cognitiva hardcodeada.
6. `tool_contract_versions`: descripción y JSON Schema nativos, `effect_class`, handler interno y hash; inmutable.
7. `agent_policies`: raíz de policy por clave con puntero vigente.
8. `agent_policy_versions`: prompt exacto, límites, cache, presupuesto, tratamiento de costo desconocido y fallback explícito; inmutable.
9. `agent_policy_tools`: allowlist exacta de versiones de tools, actores permitidos, roles requeridos y canales/superficies; inmutable con la policy.

### Snapshot y ejecución

10. `conversation_agent_snapshots`: congela policy al iniciar una conversación; cambios posteriores sólo afectan conversaciones nuevas.
11. `agent_runs`: run idempotente con actor, origen, policy, provider/model/vision exactos, cache hash, límites, presupuesto y terminación normalizada.
12. `agent_run_configurations`: versiones exactas de configuración usadas por el run; para conversaciones se copian del snapshot inicial.
13. `agent_messages`: secuencia del run ligada opcionalmente a `messages`; contenido privado, hash y trust classification.
14. `tool_executions`: proposal/authorization/result de una tool, argumentos/resultados seguros, llamada del proveedor y certeza de efecto.

### Durabilidad, costo y auditoría

15. `usage_events`: tokens/calls/cache/costo normalizados y resumen provider-specific seguro; append-only.
16. `error_events`: taxonomía normalizada, retryability, request ID seguro y resumen redactado; append-only.
17. `agent_jobs`: trabajo transport-neutral con disponibilidad, lease, checkpoint reference/hash y estado `uncertain` explícito.
18. `job_attempts`: attempt provider/model exacto, ordinal, fallback, terminación, latencia y decisión; append-only en sus hechos centrales.
19. `memory_entries`: memoria permitida con scope, provenance, hash, caducidad y contenido privado; nunca instrucciones de mayor privilegio.
20. `audit_events`: ledger global append-only con correlación y metadata segura; puede referenciar run, tool, job, configuración y outbox existente.

No se duplica `app_private.outbox_events`; B2-008 lo referencia para demostrar si una respuesta o efecto de mensajería fue realmente encolado.

## Reglas de versión

- Sólo la raíz mutable cambia `current_version_id`; versiones, prompts, contratos y policies no se reescriben.
- Toda activación toma lock y exige `expected_current_version_id`; una orden basada en estado viejo falla sin sobrescribir.
- Rollback de configuración copia una versión histórica a una nueva versión monotónica y registra `source_version_id`.
- Una policy sólo puede activarse si su prompt existe, sus tools están activas y cada límite es verificable.
- La primera ejecución de una conversación crea un snapshot único. Runs posteriores reutilizan ese snapshot aunque cambie la configuración vigente.
- Runs sin conversación fijan policy y configuración vigente al enqueue.

## Autorización de tools

- `provider_tool_call_id` es único dentro del run.
- `execution_key` es única por organización; una continuación/fallback recupera el resultado previo.
- `external_effect_key` es obligatoria y única para `external_effect`; nunca se reutiliza un efecto incierto.
- La policy vincula la versión exacta del contrato, actores permitidos y roles de membresía.
- Un actor `contact` no satisface roles administrativos aunque escriba una orden idéntica a Fer.
- Los argumentos se validan contra el contrato en la frontera TypeScript; PostgreSQL verifica que el hash/JSON seguro pertenezca a la ejecución autorizada.
- El contenido no confiable jamás modifica la allowlist o el actor snapshot.

## Jobs, attempts y recuperación

Estados de job: `pending`, `processing`, `waiting_tools`, `retryable`, `succeeded`, `blocked`, `failed`, `cancelled`, `uncertain`.

- Claim usa `FOR UPDATE SKIP LOCKED`; lease token y expiración son obligatorios.
- Un attempt fija provider/model y no puede reescribirlos después.
- Terminaciones normalizadas: `completed`, `tool_calls`, `output_limit`, `context_limit`, `content_filter`, `cancelled`, `provider_error`.
- `output_limit`/`context_limit` sólo pueden continuar con checkpoint reference y hash.
- Fallback sólo puede seleccionar un candidato presente en la ruta congelada del run.
- Si el worker muere antes de un efecto externo, el job puede volver a `retryable`.
- Si existe un efecto externo iniciado sin resultado confirmado, job/run/tool quedan `uncertain`; no existe retry ciego.
- Un run completado exige job terminal, attempts cerrados y ninguna tool autorizada/ejecutando/uncertain.

## Presupuesto, límites y cache

- `max_tool_rounds`, `max_provider_attempts`, timeout y concurrencia provienen de policy; no deciden intención.
- No existe un `max_output_tokens` comercial arbitrario. La capacidad física del proveedor se resuelve en el adapter conforme ADR-010.
- Usage con costo conocido se serializa sobre el run; al exceder presupuesto se registra el consumo y se bloquean llamadas nuevas.
- Costo desconocido nunca se transforma en cero; policy `block` detiene y `allow_and_alert` permite con audit/error.
- Cache guarda modo, prefijo hash y tokens normalizados. Ninguna clave contiene prompt, teléfono, nombre o mensaje.

## Seguridad y exposición

- 20/20 tablas con RLS forzado y policies explícitas.
- RPCs mutantes sólo para `service_role`; usuarios autenticados reciben vistas `security_invoker` y columnas mínimas según rol.
- Prompt body, agent message content, memoria, argumentos/resultados detallados, payload de job y checkpoint reference no aparecen en vistas.
- `public`/`anon` no reciben privilegios; frontend no ejecuta tools ni mutaciones administrativas.
- Secretos no forman parte del esquema. Sólo el worker obtiene credenciales desde el secret store del entorno.
- Tablas históricas rechazan update/delete; raíces y estados mutables tienen triggers de transición/reasignación.

## RPCs implementadas

1. `create_business_configuration_version`
2. `rollback_business_configuration`
3. `register_prompt_version`
4. `register_tool_contract_version`
5. `create_agent_policy_version`
6. `enqueue_agent_run`
7. `claim_agent_job`
8. `start_agent_job_attempt`
9. `append_agent_message`
10. `propose_tool_execution`
11. `authorize_tool_execution`
12. `mark_tool_effect_started`
13. `record_tool_execution_result`
14. `resume_agent_run_after_tools`
15. `record_usage_event`
16. `record_error_event`
17. `record_agent_attempt_result`
18. `recover_expired_agent_job`

La memoria se escribe mediante una tool versionada normal; no recibe un bypass RPC especial.

## Puertas de aceptación

- pgTAP sobre estructura, permisos, versionado, snapshots, tool authorization, límites, usage, termination y recovery.
- Concurrencia real para activación de configuración, claim único y presupuesto serializado.
- Mutation testing sobre inmutabilidad, allowlist, idempotencia, certeza de efecto, RLS y budget locking.
- Gherkin para SC-028–SC-031/SC-037, cliente hostil, fallback, truncamiento y costo desconocido.
- Ensayo enlazado con rollback; luego migración forward-only y regresión acumulada.
- CI Docker desde cero, lint/advisors, tipos sin drift, cobertura y supply chain verdes.

## Evidencia de implementación

- Migración atómica: `supabase/migrations/20260812152500_b2_008_agent_runtime.sql`.
- Supabase exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`), historial local/remoto 11/11.
- Esquema: 20 tablas, 20 policies, 20 vistas `security_invoker/security_barrier`, RLS forzada 20/20 y 18 RPC backend-only.
- Ensayo migración + pgTAP: 84/84 dentro de transacción con rollback.
- Regresión post-aplicación: 649/649 pgTAP entre B2-001 y B2-008.
- `db lint --linked --schema app_private,api`: cero errores; advisors security/performance: cero hallazgos.
- Tipos `app_private,api` regenerados desde AgenteFer y auditados por AST: 20 tablas, 20 vistas y 18 RPC nuevas; cero entidades o campos históricos removidos.
- Aceptación: 51 escenarios B2-008, 144 acumulados, cero errores Gherkin.
- CI `31617992972` certificó dos carreras del runtime, regresiones concurrentes previas, 38/38 mutantes SQL, lint/advisors, tipos sin drift, contenedores y QA general; los tres jobs concluyeron `success` con cero annotations.

## Frontera posterior

B2-008 no llama a OpenAI, MiniMax ni Meta y no habilita `pgmq`. B3 implementará tools de dominio sobre estos contratos; B5 conectará adapters/evals reales; B6 conectará canales; B2-010 resolverá almacenamiento protegido de medios/estado opaco.
