# B3-006V — catálogo activo/pausado y edición de fotos

Fecha: 2026-09-22. Proyecto autorizado: AgenteFer; rama `develop`.

## Diagnóstico comprobado

- En la organización de pruebas había tres ofertas activas y ninguna oferta en estado `draft`.
- La herramienta de la foto reabrió un registro interno de alta ya aplicado, en vez de editar la oferta existente; no se ejecutó `catalog_edit_offer`.
- La función de edición vigente referenciaba `product_variants.effective_at`, columna inexistente. Un ensayo transaccional de `set_status` falló por ese contrato roto.
- El modelo confundía altas históricas con el estado visible. El panel además exponía filtro y contador “Borradores”.

## Contrato corregido

- Un alta nueva confirmada por mensaje de texto activa sus ofertas en la tienda QR dentro de la misma transacción; no publica en Facebook.
- Los registros de alta aplicados permanecen para auditoría, pero no se ofrecen como pendientes ni se reaplican como edición.
- Para cambiar fotos de ofertas existentes, el agente usa un `media_asset_id` verificado y `catalog_edit_offer` por oferta. Sólo anuncia éxito tras resultado confirmado.
- Pausar conserva datos y muestra `Pausado`; reactivar muestra `Activo`. El panel ya no ofrece filtro ni contador de borradores.
- Los fallos de RPC del worker registran operación, fase y HTTP status, sin payload ni secretos.

## Evidencia reproducible

| Puerta | Comando / resultado |
| --- | --- |
| Regresión panel/agente | `npx vitest run apps/api/test/admin-catalog-routes.test.ts apps/worker/test/whatsapp-ai-processor.test.ts --maxWorkers=2`: 69/69 |
| Suite TypeScript con cobertura | `npm run test:coverage`: 1,276/1,276; líneas 90.44%, ramas 86.21% |
| Base vinculada | `npm run test:database:linked:rehearsal -- supabase/migrations/20260922210000_b3_006v_owner_catalog_activation.sql supabase/tests/b3_006a_conversational_catalog_test.sql`: 110/110, rollback |
| Postflight instalado | `npm run test:database:linked:b3-006a -- postflight`: 110/110, rollback; historial remoto `20260922210000` aplicado |
| Regresión editor anterior | Mismo ensayo con `supabase/tests/b3_006f_catalog_owner_edit_test.sql`: 24/24, rollback |
| Mutación crítica | `npm run test:database:linked:b3-006v-mutations`: base 110/110, 2/2 mutantes detectados por fallos pgTAP, rollback |
| Contratos | `npm run verify:database-contract`: 61 migraciones; `npm run verify:acceptance-contract`: 434 escenarios, 0 errores |
| Compilación/estilo | `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`: verdes |
| Dependencias | `npm run audit`: 0 vulnerabilidades reportadas |

Objetivo de cobertura: todas las transiciones críticas probadas por pgTAP y mutación; el 90.44% global es contexto, no sustituto de esas rutas. Los errores de arranque con ambiente `test` observados en la salida de cobertura son pruebas negativas esperadas y no fallaron la suite.

## QA de usuario pendiente

El dueño, no el agente de desarrollo, enviará la próxima foto y orden por WhatsApp. Debe observar que cada producto activo recibe la foto, que el panel la muestra al refrescar, que un producto pausado queda apagado en QR, y que no se crea post de Facebook. Correlacionar `agent_run_id` y `rpc_operation` en los logs de `agente-fer/worker` ante cualquier fallo. La prueba real de Meta/WhatsApp y la inspección visual móvil no están certificadas por las pruebas locales. No declarar cerrado el E2E hasta recibir el resultado del dueño.

## Despliegue

El dueño autorizó la excepción documentada: despliegue antes de su prueba real de WhatsApp.
Commit `f5eecc8d4f1f1c0d66c5feeda8728826f4f65457` subido sólo a `develop`.
Migración B3-006V aplicada únicamente al Supabase vinculado `AgenteFer`; registro local/remoto coincide.
EasyPanel: sólo `agente-fer/api` y `agente-fer/worker`, ambos con build `Success`, commit correcto y 1/1 réplica.
API pública: `/health/ready` 200; `/admin/catalog` 200; `app.js` ya no contiene tarjeta de Borradores.
No se cambió `main`, otro proyecto, otra organización ni los tres productos reales.
