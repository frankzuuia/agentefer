# AgenteFer — auditoría B2-007 publicaciones

Estado: **COMPLETE — INTEGRITY TOTAL — MATCH PERFECT**.  
Fecha: 2026-08-12.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance

- Requisitos: BL-015, BL-016; SC-021–SC-026.
- Contrato: `docs/architecture/PUBLICATION-WORKFLOW-B2-007.md`.
- Investigación: `docs/references/PUBLICATIONS-B2-007-RESEARCH.md`.
- Aceptación: `features/b2_007_publication_workflow.feature`.

## Implementación certificada

- Migración forward-only `20260812132809_b2_007_publication_workflow.sql`.
- 11 tablas privadas, RLS forzado 11/11, 11 policies y 13 vistas seguras.
- 18 RPCs backend-only para conexión, capacidades, versiones, schedules, batches, claims, autorización, resultados, recuperación y conciliación.
- Idempotencia con fingerprint, snapshots append-only, `external_effect_key` única y provenance exacta de instancias.
- Nueve índices FK añadidos después de que la prueba física detectó las referencias sin cobertura completa.
- Ninguna categoría de producto hardcodeada y ninguna llamada falsa a Meta.

## Riesgos cubiertos por pruebas

- conexión incompleta o actor sin rol;
- replay idéntico y colisión idempotente;
- duplicación concurrente de oferta lógica;
- aprobación por visor y snapshot reescrito;
- capacidad revocada/vencida después de enqueue;
- versión, catálogo, precio y stock obsoletos;
- worker perdido antes y después del efecto;
- resultado exitoso sin certeza confirmada;
- refresh que debe crear otra instancia;
- cron atrasado, ocurrencia repetida y cancelación;
- `external_effect_key` incierta reutilizada;
- provenance de instancia, job y current version manipulados;
- fuga cross-tenant y ejecución de tools desde navegador.

## Evidencia verde actual

- Ensayo enlazado migración + B2-007: **83/83 pgTAP**, todo revertido en AgenteFer.
- Migración aplicada atómicamente; historial Supabase AgenteFer **10/10**. SHA-256 `654C56E07517DD1C98F7EE3CC7990612B3957C765DE941AD140EF6BB3AEB49F7`.
- Regresión remota acumulada: **565/565 pgTAP** en siete archivos, sin fixtures persistentes.
- Suite B2-007 final SHA-256 `778A6C919CE4C35CEB9639A917AD55566195DC536CC4225D93489A851FE53C3C`.
- Tipos `app_private,api` regenerados desde el esquema remoto real. SHA-256 `A0F8FBB6A663D7F3988047941337988EC8AAB9C3131451531CF938D32349A466`.
- Lint `app_private,api` y advisors security/performance remotos: cero hallazgos.
- Regresión previa B2-001–B2-006: **482/482 pgTAP** certificada en CI run `31552333864` attempt 2, commit `4be37b7fa79d085a65fdada8f90d4bb61c551040`.
- Contrato estático: 10 migraciones, 69 tablas RLS y 565 aserciones esperadas.
- Aceptación: 36 escenarios B2-007, 93 acumulados, cero errores de parseo.
- Sintaxis/formato de verificadores de base, concurrencia, mutación y aceptación: verde.
- Puerta local `npm run verify`: 95/95 tests; cobertura 93.83% statements, 89.57% branches, 93.10% functions y 94.02% lines; 112/112 mutantes TypeScript eliminados; cero vulnerabilidades.
- CI final run `31608356030` sobre commit `eb3ab04d9997b2c1b14e8633fdba8109d629d4f1`.
- Jobs CI: `Verify` `94153030453`, `Container runtime` `94153808349` y `Database contract` `94153808359`, todos `success` y con cero annotations.
- Base aislada CI: diez migraciones desde cero, **565/565 pgTAP**, concurrencia de oferta lógica/claim único/ocurrencia exacta y todas las carreras previas.
- Mutation testing SQL CI: **32/32** mutantes eliminados (100%), diez correspondientes a B2-007.
- Lint de esquemas y advisors security/performance CI: cero hallazgos; tipos canónicos regenerados sin drift.

## Autopsias convertidas en regresión

1. `attempt_count` chocaba con la columna implícita de `RETURNS TABLE`; se calificó el target del claim.
2. IDs dentro de JSON conservaban comillas con `jsonb_array_elements(... )::text::uuid`; se cambió a `jsonb_array_elements_text`.
3. `status` del resultado de `cancel_publication_batch` chocaba con el filtro de tabla; se calificaron aliases en cancelación y resultado.
4. Las pruebas usaban aliases inexistentes en dos vistas; se corrigieron contra sus proyecciones reales.
5. La puerta FK detectó nueve referencias sin índice; se añadieron índices exactos y quedó en cero.
6. El primer CI B2-007 (`31607485872`, job `94150746066`) descubrió que tres replays pgTAP regeneraban `statement_timestamp()` bajo una misma clave idempotente. La base rechazó correctamente solicitudes distintas; se estabilizaron los instantes del fixture, se dejó regresión explícita y el run final pasó desde cero.

## Veredicto

B2-007 cumple el contrato físico, aislamiento, idempotencia, autorización tardía, trazabilidad de efectos externos, concurrencia, recuperación y pruebas de mutación previstas para este bloque. No quedan excepciones de calidad abiertas dentro de su alcance.

## Límite honesto

Meta sigue sin credenciales/capacidades reales. B2-007 no demuestra posts externos; demuestra que el sistema no puede marcarlos exitosos sin autorización, efecto iniciado y respuesta confirmada del adapter. `pgmq`, `pg_cron`, Graph API y webhooks pertenecen al siguiente bloque de integración.

No se deshabilitó ninguna constraint, policy, trigger, prueba o mutante para avanzar.
