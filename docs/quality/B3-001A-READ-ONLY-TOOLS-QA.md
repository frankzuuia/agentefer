# AgenteFer — QA B3-001A herramientas cognitivas de lectura

Estado: **WORKER DEPLOYED — REAL WHATSAPP E2E PENDING**.  
Fecha de corte: 2026-08-28.

## Puertas obligatorias

1. Unitarias de adapters OpenAI/MiniMax: definición, call y continuación con tool result.
2. Unitarias del worker: call válida, desconocida, JSON inválido, replay, autorización bloqueada, resultado fallido y recuperación.
3. pgTAP: contratos versionados, binding a policy, aislamiento tenant, búsqueda, oferta, precio faltante y exposición de privilegios.
4. Integración enlazada: migración ensayada con rollback, luego migración forward-only y regresión acumulada.
5. Gherkin: todos los escenarios de `b3_001a_read_only_agent_tools.feature` deben compilar.
6. Seguridad: service role de mínimo privilegio, ninguna RPC de tool para `anon/authenticated`, ningún secreto o texto crudo en logs.
7. Mutation testing: adapters, parser de argumentos, ledger/idempotencia, aislamiento y estados de precio deben matar mutantes relevantes.
8. E2E real: cliente pregunta por producto existente, inexistente, cantidad con precio y cantidad sin precio usando WhatsApp conectado.

## Objetivos cuantitativos

- Cobertura de rutas nuevas: 100% funciones y al menos 95% statements/lines; ninguna rama crítica sin prueba.
- Mutation score de código crítico nuevo: al menos 90%, justificando equivalentes.
- Errores de lint, typecheck, build, audit y migración: 0.
- Fugas entre organizaciones observadas: 0.
- Duplicados ante replay/concurrencia: 0.
- Calls sin ledger antes de ejecución: 0.
- Respuestas comerciales inventadas por fallback backend: 0.
- p95 interno de RPC de lectura, sin latencia del proveedor: objetivo <= 500 ms y medición obligatoria en producción.

## Evidencia a registrar al cierre

- Conteo de pruebas y cobertura.
- Mutation score y mutantes equivalentes.
- Resultado de rehearsal, push, pgTAP acumulado, lint y advisors.
- SHA del commit en `develop` y despliegue exclusivo del worker AgenteFer.
- Correlation ID del E2E, tool seleccionada, estado del ledger y respuesta final visible.

## Evidencia obtenida

| Puerta | Resultado | Evidencia reproducible |
| --- | --- | --- |
| Unitarias y regresión TypeScript | Verde | 676 pruebas; 96.06% statements, 96.11% lines, 96.97% functions y 90.90% branches. |
| Mutation testing TypeScript | Verde | Suite global previa: 92.16% total y 93.17% sobre código cubierto; 3,148 mutantes eliminados, 3 timeouts, 231 sobrevivientes y 37 sin cobertura. Rangos B3: provider 97.10%, worker original 100%; focal processor 20/21 (95.24%) con un equivalente documentado; aislamiento de fallo parcial 18/18 (100%); preparación única por proceso y observabilidad 25/25 (100%). |
| Mutation testing SQL B3-001A | Verde | `npm run test:database:linked:b3-001a-mutations`: 15/15 mutantes eliminados, 100%, cada ejecución revertida. |
| Mutation testing SQL de escalamiento | Verde | `npm run test:database:linked:b3-001a-preparation-mutations`: 8/8 mutantes eliminados, 100%, cada ejecución revertida. |
| Ensayo de migración de tools | Verde | 46/46 pgTAP y `ROLLBACK` antes de aplicar `20260827170000_b3_001a_read_only_agent_tools.sql`. |
| Ensayo de hardening PL/pgSQL | Verde | 10/10 pgTAP y `ROLLBACK` antes de aplicar `20260828110000_b3_001a_plpgsql_lint_hardening.sql`. |
| Ensayo de escalamiento multitenant | Verde | 12/12 pgTAP y `ROLLBACK` antes de aplicar `20260828123000_b3_001a_tool_preparation_scaling.sql`. |
| Historial Supabase | Verde | 28 migraciones locales/remotas alineadas en el ref AgenteFer `hprdctmblmfcoagugvyp`; las tres migraciones B3 fueron aplicadas forward-only, sin seeds ni roles. |
| pgTAP acumulado enlazado | Verde | 1,062/1,062 pruebas en 18 archivos contra AgenteFer. |
| Lint remoto Supabase | Verde | `api`, `app_private`, `extensions` y `public`: 0 errores y 0 advertencias. |
| Contrato estático de base | Verde | 28 migraciones ordenadas, 94 tablas con FORCE RLS, 1,062 aserciones derivadas de sus planes y tipos TypeScript bloqueados. |
| Aceptación Gherkin | Verde | 13 archivos y 306 escenarios ejecutables, con 0 errores de parseo. |
| Build, runtime y supply chain | Verde | Build completo; API y worker arrancaron en puertos TCP efímeros; `npm audit` completo y producción: 0 vulnerabilidades. |
| Regresión de base real no vacía | Verde | B4-003A dejó de consultar todos los `whatsapp.status`; ahora identifica su fixture por organización y `payload.status.id/status`. Sus 78 pruebas pasan sin depender de una base vacía. |
| Git | Verde | Commit de código `af404e4bdf0d8a8a0a93689fc65714ba1b25fa25` publicado exclusivamente en `origin/develop`; `main` no fue modificado. |
| EasyPanel | Verde | Action `cmtd46m4b00ea07ri8r2z4ffj` construyó correctamente `agente-fer / worker` desde `develop` y `apps/worker/Dockerfile`; réplica `actual=1`, `desired=1`. |
| Arranque desplegado | Verde | `worker.runtime.started` observado con inbound y WhatsApp AI operativos, provider `minimax` y modelo `MiniMax-M3`; ningún `worker.bootstrap.failed` posterior al último arranque sano. |
| Regresión de metadata de despliegue | Verde | Un SHA abreviado fue rechazado en bootstrap como exige el contrato. Se corrigió a los 40 caracteres, se redeployó mediante action `cmtd48zc100el07rieiub37k1` y se confirmó recuperación sin relajar la validación. |

## Pendiente para cerrar el bloque

- E2E real por WhatsApp para producto existente, inexistente, cantidad con precio y cantidad sin precio.
- Registrar correlation ID, tool call, ledger durable, respuesta visible, latencia y revisión de advisors después del E2E.
