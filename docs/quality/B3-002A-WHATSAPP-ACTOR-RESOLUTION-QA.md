# AgenteFer — QA B3-002A identidad cliente/Fer

Estado: **GATES LOCALES Y FOCALES VERDES — DESPLIEGUE/E2E PENDIENTES**.  
Fecha de corte: 2026-08-28.

## Trazabilidad

| Requisito | Contrato | Prueba |
| --- | --- | --- |
| Un asistente vende a clientes y atiende a Fer | `WHATSAPP-ACTOR-RESOLUTION-B3-002A.md` | contact/member conservan tres tools comerciales |
| Nadie obtiene permisos diciendo “soy Fer” | resolver por identidad inmutable | mensaje de suplantación persiste `actor_kind=contact` |
| Cuenta personal de prueba se vuelve miembro de forma segura | `link_whatsapp_member_identity` | revocación + conversación cerrada + nueva identidad verificada |
| Imágenes/acciones futuras respetan roles | constraint y autorización previa a tool | binding con rol+contact rechazado |
| Cero cruce entre tiendas | scopes compuestos | resolución con organización ajena devuelve cero filas |
| Revocación inmediata | revalidación en claim/context/authorize | miembro suspendido no genera run ni downgrade |

## Evidencia ejecutada

| Puerta | Resultado | Evidencia reproducible |
| --- | --- | --- |
| Ensayo de migración real | Verde | `npm run test:database:linked:rehearsal -- supabase/migrations/20260828160000_b3_002a_whatsapp_actor_resolution.sql supabase/tests/b3_002a_whatsapp_actor_resolution_test.sql`: 28/28 y `ROLLBACK` sobre AgenteFer `hprdctmblmfcoagugvyp`. |
| Mutation testing SQL | Verde | `npm run test:database:linked:b3-002a-mutations`: 10/10 mutantes eliminados, 100%, cada ejecución revertida. |
| Regresión B2-008 + migración | Verde | 84/84 pgTAP y `ROLLBACK`; fixture external-effect corregida a solicitud comercial y conteo aislado por tenant/policy. |
| Regresión B3-001A + migración | Verde | 46/46 pgTAP y `ROLLBACK`; tools de lectura y continuaciones preservadas. |
| Regresión B4-004A + migración | Verde | 47/47 pgTAP y `ROLLBACK`; claim, respuesta, outbox y recuperación preservados. |
| Unitarias/cobertura TypeScript | Verde | 676/676; 96.06% statements, 96.11% lines, 96.97% functions y 90.90% branches. |
| Contrato estático DB | Verde | 29 migraciones ordenadas, 94 tablas con FORCE RLS, 1,090 aserciones pgTAP declaradas y tipos bloqueados. |
| Aceptación | Verde | 14 features, 316 escenarios ejecutables, cero errores de parseo. |
| Formato/lint/typecheck/build | Verde | Prettier, ESLint, todos los workspaces y build completo sin errores. |
| Runtime/proceso | Verde | API y worker arrancaron correctamente en puertos TCP efímeros. |
| Supply chain | Verde | 0 vulnerabilidades completas/producción; 10 manifests, 29 declaraciones externas exactas y 654 artefactos verificados. |
| Privilegios | Verde | RPC de vinculación sólo `service_role`; resolver privado no ejecutable por worker ni clientes. |
| Idempotencia | Verde | replay exacto devuelve la misma identidad; una identidad y un evento de auditoría. |
| Privacidad | Verde | auditoría validada sin `external_subject_id`/teléfono. |
| Aislamiento tenant | Verde | actor de organización ajena no se resuelve. |
| Gobierno | Verde | fixture conserva un segundo owner; la base impide suspender al único owner. |
| Docker/local reset | No ejecutable | Docker y Podman no están instalados en este host; se usó el rehearsal remoto transaccional existente. |
| Despliegue | Pendiente | La migración no fue aplicada y la cuenta real no fue vinculada. |

Reportes ignorados por Git:

- `reports/database-quality/linked-migration-rehearsal.json`
- `reports/database-quality/linked-b3-002a-mutation-summary.json`

## Métricas y objetivos

- pgTAP focal: 28/28, 100%.
- Mutation score SQL crítico: 10/10, 100%; objetivo mínimo 90%.
- Fugas tenant observadas: 0.
- Elevaciones por texto observadas: 0.
- Duplicados de identidad/auditoría en replay: 0.
- Teléfonos en metadata de auditoría: 0.
- Objetivo de claim/resolución interno: p95 <= 100 ms en producción, separado de proveedor LLM.
- Objetivo de autorización de tool: p95 <= 50 ms en producción.
- Error rate objetivo en actor resolution: < 0.1%; identidad no vigente se mide aparte como bloqueo esperado.

## Procedimiento QA pendiente antes de desplegar

1. Ejecutar pgTAP acumulado enlazado y lint/advisors de Supabase después de aplicar la migración.
2. Regenerar tipos desde el esquema remoto y exigir cero drift frente al ajuste revisado localmente.
3. Exponer la vinculación sólo mediante endpoint admin autenticado y probado.
4. Vincular la cuenta personal de prueba mediante la operación idempotente, sin SQL manual.
5. Enviar un mensaje real y comprobar run `member`, `actor_user_id`, tools, trace y ausencia de PII en logs.
6. Probar un número cliente y una suplantación; ambos deben permanecer `contact`.
7. Ejecutar carrera inbound↔vinculación y medir latencia, errores y advisors.
8. Registrar CI remoto y evidencia E2E antes de declarar producción.

## Riesgos abiertos

- La cuenta real sigue siendo `contact` hasta ejecutar el flujo administrativo después del despliegue.
- Falta endpoint/UI autenticada para invocar la RPC; la función sola no autoriza operar manualmente en producción.
- Falta una prueba de carrera explícita entre inbound y vinculación; ambos ya comparten advisory lock, pero el gate de concurrencia debe ejecutarse antes del cierre.
- Imágenes, WebP, SKU, catálogo mutador, pedidos y vista QR no pertenecen a este bloque.
