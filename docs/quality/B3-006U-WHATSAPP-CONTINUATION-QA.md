# QA B3-006U — continuidad de WhatsApp tras herramientas

## Autopsia

- El webhook de Meta aceptó los mensajes del dueño. La identidad y la preparación de herramientas
  también funcionaron; el fallo estaba después de llamar al modelo.
- Un turno ejecutó una herramienta en su octavo intento. La continuación dejó el trabajo en
  `retryable`, pero `attempt_count = max_attempts = 8` impedía reclamarlo de nuevo.
- Otro turno ejecutó `catalog_ingestion_context` y la siguiente respuesta del proveedor acabó
  en `provider_tool_continuation_invalid`. El código admitía exactamente una llamada nativa por
  ronda. La respuesta bruta no se conserva, por lo que no se atribuye sin evidencia a una causa
  más específica que cero o múltiples llamadas incoherentes.

## Contrato de corrección

- El adaptador MiniMax serializa propuestas múltiples a la primera llamada y guarda un estado
  de replay con esa misma llamada. El modelo reevalúa el resto tras recibir el resultado real.
- Si MiniMax declara `tool_calls` pero no aporta ninguna llamada, el defecto se clasifica como
  reintentable, sin fabricar un resultado de herramienta.
- Al completar una ronda de herramienta, PostgreSQL amplía los límites del trabajo y del run
  con el cupo congelado en su versión de política. Los contadores históricos no se reinician.
- Los triggers de inmutabilidad sólo admiten esta ampliación exacta durante la transición
  `waiting_tools`/`waiting_tool` a `retryable`/`waiting_provider`. Fuera de ella la rechazan.
- No se reencolan conversaciones antiguas ni se emiten mensajes de WhatsApp desde QA.

## Pruebas reproducibles

1. `npm exec -- vitest run packages/ai/test/provider.test.ts apps/worker/test/whatsapp-ai-processor.test.ts`
2. `npm run test:coverage` (dos workers para evitar contención TCP local).
3. `npm run test:mutation:b3-006u` y `npm run test:mutation:b3-006t`.
4. `npm run test:database:linked:rehearsal -- supabase/migrations/20260922180000_b3_006u_tool_round_attempt_budget.sql supabase/tests/b3_006u_tool_round_attempt_budget_test.sql`
5. Repetir el paso 4 con `supabase/tests/b2_008_agent_runtime_test.sql` para probar el flujo
   completo de `resume_agent_run_after_tools` con `ROLLBACK`.
6. `npm run typecheck`, `npm run lint`, `npm run format:check`,
   `npm run verify:database-contract`, `npm run verify:acceptance-contract` y `npm run build`.
7. Después del despliegue, el dueño envía un mensaje nuevo. Verificar, sólo en AgenteFer,
   recepción, run, ejecución de herramienta, outbox y entrega; sin hacer envíos desde QA.

## Evidencia local 2026-09-22

| Puerta | Resultado |
| --- | --- |
| Vitest focalizado | 92/92 |
| Cobertura global | 1,275/1,275; sentencias 90.26%, ramas 86.03%, funciones 93.07%, líneas 90.38% |
| Mutación MiniMax, rango amplio del parser | 68/68 eliminados; 100%; cero sin cobertura |
| Mutación protección de tool choice | 35/35 eliminados; 100% |
| PostgreSQL enlazado, transacción revertida | 9/9 B3-006U y 88/88 B2-008 |
| pgTAP enlazado después de la migración | 1,486/1,486 en 33 archivos; transacciones revertidas |
| Gherkin | 23 features, 429 escenarios, sin errores de parseo |
| Contrato DB | 60 migraciones ordenadas, 106 tablas `FORCE RLS`, 1,403 aserciones |
| Typecheck, lint, formato | verde |
| Build y arranque de procesos | API y worker verdes en puerto TCP efímero |

## Salvedades y cierre

- La ejecución de cobertura sin límite de workers agotó el timeout de cinco pruebas TCP, incluso
  una vez sin compilación paralela. Con `--maxWorkers=2`, sin subir timeouts ni omitir tests,
  cobertura y suite completa pasaron 1,275/1,275. Ese límite está ahora en el script oficial.
- El dueño autorizó explícitamente una excepción documentada para no esperar la batería global
  de mutación de 3,707 mutantes (estimación de 25–38 minutos). Se interrumpió sin declarar
  `npm test` verde. La primera prueba del parser sobre 73 mutantes obtuvo 80.82%: 9 sobrevivieron
  y 5 no tuvieron cobertura. Se agregaron casos para llamadas malformadas y terminación
  inconsistente del proveedor, y se quitó una condición lógicamente redundante. Al repetir el
  mismo rango fuente, quedaron 68/68 eliminados y cero sin cobertura. El recuento bajó por
  eliminar código redundante, no por volver a estrechar el rango.
- El `db push --dry-run` estándar encontró divergencias de historial previas a B3-006U. No se
  reparan ni se aplican las migraciones anteriores en este bloque. La operación de B3-006U debe
  dirigirse expresamente al proyecto enlazado de AgenteFer y verificar su versión después.
- El verificador de procesos de prueba tenía habilitado el procesador de imágenes, aunque su
  Supabase ficticio no existe. Se deshabilitó sólo en ese entorno aislado; la configuración de
  producción no cambia. Tras ello API y worker pasaron el arranque/readiness.
- La prueba E2E real queda a cargo del dueño: no hay evidencia de entrega posterior al despliegue
  hasta que envíe un mensaje nuevo.
- Hallazgo independiente: B3-006R introdujo `catalog_edit_offer_for_owner`, pero el ejecutor
  WhatsApp activo despacha a `catalog_set_offer_status_for_owner_agent`. El resolver B3-006R no
  participa en las fotos del agente. No se conectó aquí porque su fallback de "foto más reciente"
  puede asociar una imagen no elegida explícitamente. El test ahora verifica el dispatch real,
  la denegación de acceso directo a la función huérfana y el contrato UUID/conversación del
  wrapper activo. La mejora de resolución de fotos requiere un bloque separado; no se declara
  reparada con esta entrega.

## Despliegue acotado y postflight

- Código y pruebas finales: commit `0839ecc1d251989c7347157dc795f6c56c457cfc` en
  `origin/develop`; `main` no se modificó.
- La migración `20260922180000` se aplicó solamente al Supabase enlazado de AgenteFer. El
  postflight confirmó una versión registrada y dos triggers nuevos; el barrido pgTAP posterior
  pasó 1,486/1,486.
- EasyPanel: solo proyecto `agente-fer`, servicio `worker`, fuente
  `frankzuuia/agentefer@develop`. Acción de despliegue `cmudhrcz000el07l8a6t1bgon` terminada;
  el servicio resolvió el SHA completo anterior, emitió `worker.runtime.started` y reportó
  `actual=1`, `desired=1`.
- No se tocaron `agente-fer/api`, otros proyectos, Facebook ni conversaciones de WhatsApp. La
  entrega efectiva de una respuesta nueva sigue sin verificar hasta la prueba del dueño.
