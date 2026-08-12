# AgenteFer — auditoría B2-006 flujo comercial

Estado: **DESIGNED — IMPLEMENTATION PENDING**.  
Fecha: 2026-08-11.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance

- Requisitos: BL-006, BL-007, BL-013; RQ-019–RQ-024, RQ-026, RQ-034–RQ-038, RQ-072–RQ-076.
- Contrato: `docs/architecture/COMMERCIAL-WORKFLOW-B2-006.md`.
- Investigación: `docs/references/COMMERCIAL-B2-006-RESEARCH.md`.
- Aceptación: `features/b2_006_commercial_workflow.feature`.

## Riesgos que deben quedar demostrados

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

El estado cambiará sólo después de migración, pgTAP, concurrencia, mutantes SQL, remoto AgenteFer, tipos, lint/advisors y CI verdes.
