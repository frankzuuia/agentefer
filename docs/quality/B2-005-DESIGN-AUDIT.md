# AgenteFer — auditoría B2-005 inventario transaccional

Estado: **IMPLEMENTED — REMOTE VERIFIED — CI SQL GATES PENDING**.  
Fecha: 2026-08-11.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance auditado

- Requisitos: BL-011, SC-014, SC-018–SC-019, RQ-038, RQ-047, RQ-055–RQ-061 y RQ-110.
- Contrato: `docs/architecture/INVENTORY-B2-005.md`.
- Investigación: `docs/references/INVENTORY-B2-005-RESEARCH.md`.
- Aceptación: `features/b2_005_inventory.feature`.
- Migración: `supabase/migrations/20260811214250_b2_005_inventory.sql`.
- Pruebas: `supabase/tests/b2_005_inventory_test.sql`.

## Evidencia aplicada

- SHA-256 de la migración: `9542D6C8878A4115B455A01E66D4D6E13D3AB9895CB3097F1B43B3F15CE4D605`.
- Ensayo migración + 110 pgTAP contra PostgreSQL real: **110/110**, con rollback certificado.
- Supabase remoto: historial local/remoto **8/8**; sólo se aplicó `20260811214250_b2_005_inventory.sql`, sin seeds ni roles.
- Regresión remota persistida: **385/385 pgTAP** (`49 + 85 + 75 + 66 + 110`), cada suite transaccional y sin fixtures persistentes.
- Contrato acumulado: 8 migraciones, 44 tablas con RLS forzado y tipos `app_private,api` regenerados sin fallback a `public`.
- `db lint --linked --schema app_private,api`: cero errores.
- `db advisors --linked --type all --level warn --fail-on warn`: cero hallazgos.
- Gate local completo: 95/95 pruebas, 93.83% statements, 89.57% ramas, 93.10% funciones y 94.02% líneas.
- Mutation testing de código: **112/112**, 100%; auditoría npm: 0 vulnerabilidades.

## Regresión forense de inmutabilidad

El run candidato `31541978097` confirmó migraciones, pgTAP y concurrencia, pero detuvo correctamente la certificación con **13/14** mutantes SQL. Sobrevivió la eliminación de `inventory_reservation_events_reject_update` porque la prueba anterior cambiaba `action` a `release`: aun sin el trigger, `inventory_reservation_events_operation_valid` rechazaba los eventos `consume` y producía el mismo SQLSTATE `23514`. Era una falsa atribución de cobertura.

La regresión ahora cambia `reason` de un único evento por otro valor semánticamente válido, exige el rechazo y confirma que el historial permanece intacto. Sin el trigger, esa escritura es válida y la prueba debe fallar; con la protección productiva, las dos aserciones pasan. El cierre queda condicionado a que un nuevo run demuestre **14/14** mutantes muertos.

## Controles demostrados

| Riesgo | Control físico | Evidencia |
| --- | --- | --- |
| dos clientes por última unidad | bloqueo ordenado y `available >= requested` | pgTAP + carrera Docker preparada |
| webhook/tool duplicado | comando global + huella canónica | replay no duplica; clave conflictiva falla |
| stock negativo | checks, bloqueo y validación antes del movimiento | sobreventa, `set` bajo reserva y escritura privilegiada fallan |
| paquete incompleto | composición activa y asignaciones exactas | rollback completo de combo inválido |
| traslado parcial | líneas origen/destino en una operación | operación atómica y prueba de saldos |
| deadlock por orden inverso | orden canónico de bloqueo | escenario concurrente incorporado al gate CI |
| expiración incorrecta | deadline y liberación sólo del remanente | temprano falla; expirado libera sin bajar físico |
| reserva parcial | cantidades consumidas/liberadas monotónicas | estados `partially_consumed`/`closed` auditados |
| fuga tenant | FK compuestas, actor y RLS | IDs cruzados fallan; usuario A no lee B |
| borrado/rewrite histórico | sin DELETE y triggers append-only | service role y mantenimiento privilegiado rechazados |
| producto específico | unidad/composición como datos | cero columnas por llanta/rin/tinaco/tambo |

## Mutación y concurrencia pendientes de CI

El workflow existente reconstruirá las ocho migraciones desde cero y ejecutará:

- carrera SKU;
- carrera de rango de precio;
- carrera de reserva de última unidad;
- movimientos inversos sin deadlock y verificación no negativa;
- **14/14** mutantes de esquema, incluidos composición, precisión, idempotencia, balance, RLS e inmutabilidad.

B2-005 no se marca completo ni se declara listo hasta que los tres jobs CI estén verdes y sin annotations. No se deshabilitó ninguna constraint, policy, trigger, lint, advisor o prueba para obtener la evidencia local/remota.
