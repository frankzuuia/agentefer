# AgenteFer — auditoría B2-006 flujo comercial

Estado: **COMPLETE — INTEGRITY TOTAL — MATCH PERFECT**.  
Fecha: 2026-08-11.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance

- Requisitos: BL-006, BL-007, BL-013; RQ-019–RQ-024, RQ-026, RQ-034–RQ-038, RQ-072–RQ-076.
- Contrato: `docs/architecture/COMMERCIAL-WORKFLOW-B2-006.md`.
- Investigación: `docs/references/COMMERCIAL-B2-006-RESEARCH.md`.
- Aceptación: `features/b2_006_commercial_workflow.feature`.

## Implementación certificada

- Migración forward-only `20260811230632_b2_006_commercial_workflow.sql`, SHA-256 `CF17F123464DDBB84AEAC6AAA44362089EB09F771A3230C83A938D1972B81B2B`.
- Historial Supabase AgenteFer sincronizado 9/9, sin seed ni roles adicionales.
- 14 tablas con RLS habilitado y forzado, 14 policies tenant-read y 14 vistas `security_invoker/security_barrier`.
- 13 RPCs mutadoras backend-only con actor, organización, idempotencia y privilegios explícitos.
- PII de contacto cifrada por envolvente; sólo ciphertext, fingerprint, hint y referencia de llave permanecen en PostgreSQL.
- Pendientes, leads, intereses, oportunidades, asignaciones, handoffs, pedidos, reservas enlazadas, ventas, líneas y eventos durables.
- Pedido, venta, pago, resolución y entrega son estados separados; B2-006 no fabrica pagos, impuestos, envíos ni capacidades Meta.
- Venta parcial, reversiones parciales acumulables y conciliación tardía de inventario preservan snapshots e historia append-only.

## Riesgos demostrados

- ambigüedad no muta;
- resolución no finge entrega;
- pedido no crea venta;
- venta no crea pago;
- snapshots permanecen inmutables;
- handoff cambia asignación atómicamente y puede volver al agente;
- reintentos no duplican pendientes, handoffs, pedidos o ventas;
- ventas concurrentes no sobrecumplen una línea;
- reserva vencida y efecto de inventario pendiente quedan visibles;
- PII y datos cross-tenant no se exponen;
- ninguna categoría de producto aparece hardcodeada.

## QA y evidencia

- Ensayo migración + B2-006: **97/97 pgTAP** con rollback.
- Regresión remota enlazada: **482/482 pgTAP** (`49 + 85 + 75 + 66 + 110 + 97`), sin fixtures persistentes.
- Aceptación: 24 escenarios B2-006 y 55 acumulados, todos parseables.
- Concurrencia real Docker: conflicto de SKU/precio, resolución de pendiente, aceptación de handoff, última cantidad del pedido, última unidad de inventario, orden canónico de locks y balances no negativos.
- Mutation testing SQL: **22/22 mutantes eliminados (100%)**; incluye 8 mutantes B2-006.
- Gate local: 95/95 pruebas; cobertura 93.83% statements, 89.57% ramas, 93.10% funciones y 94.02% líneas; 112/112 mutantes de código; 0 vulnerabilidades.
- Lint `app_private,api` y advisors security/performance: cero hallazgos local enlazado y CI aislado.
- Tipos `app_private,api`: regenerados desde AgenteFer, SHA-256 `34F717D6B7EF189388591D17E3473B29374B28CE856A6313E735DE360EF4AC9F`, sin drift.
- CI final: run `31551318493`, commit `ba72bc485a9d5820c4d776d823c6302daf3994b3`.
- Jobs: `Verify` `93974405545`, `Database contract` `93974764573` y `Container runtime` `93974764638`, todos `success` y con 0 annotations.
- pgTAP final SHA-256 `DFE6884AAEB01DD600BEFBC4C31CAE1502648B41E0E7D17D8D0F414BCF4CDB1B`.

## Autopsias y regresiones

1. Run `31549141070`: el fixture activaba variante antes que producto y chocó con la constraint B2-003. Se corrigió sólo el orden del fixture; ninguna constraint se relajó.
2. Run `31549901590`: la exclusión mutua de pendientes funcionaba, pero el harness esperaba un mensaje distinto al emitido por la RPC. Se alineó el marcador literal y se añadió diagnóstico SQL al fallo.
3. Run `31550372955`: 21/22 mutantes murieron. La prueba de inmutabilidad cambiaba `total_amount` y una constraint de montos enmascaraba la ausencia del trigger. La regresión ahora cambia un `customer_note` estructuralmente válido y mata exclusivamente el mutante correcto.

## Límite honesto

B2-006 entrega el núcleo comercial transaccional. Las tools cognitivas que el LLM invocará pertenecen a B3; Meta/WhatsApp/Messenger y publicaciones a B4/B7; catálogo web/QR a B6; despliegue a B8/B9. Ninguna de esas integraciones se declara operativa aquí.

No se deshabilitó ninguna constraint, policy, trigger, prueba, advisor ni mutante para obtener el cierre.
