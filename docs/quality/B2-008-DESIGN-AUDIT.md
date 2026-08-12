# AgenteFer — auditoría B2-008 runtime cognitivo

Estado: **APPLIED — QA remoto verde; CI final pendiente**.  
Fecha: 2026-08-12.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance autorizado

- BL-018–BL-022; SC-027–SC-031 y SC-037.
- Investigación: `docs/references/AGENT-RUNTIME-B2-008-RESEARCH.md`.
- Contrato: `docs/architecture/AGENT-RUNTIME-B2-008.md`.
- Persistencia y contratos provider-neutral; no adapters externos ficticios.

## Decisiones forenses

1. Se reutiliza `outbox_events` B2-002; no se crea un segundo outbox.
2. Raíces conservan el puntero actual y toda versión permanece inmutable.
3. Conversaciones abiertas congelan policy/config; una modificación no cambia reglas a mitad del diálogo.
4. El LLM selecciona tools nativas. La base sólo autoriza y ejecuta invariantes.
5. `provider:model` permanece abierto; cada run y attempt conserva el texto exacto.
6. Usage/cache se normaliza sin fingir paridad entre OpenAI y MiniMax.
7. Checkpoints y secretos se representan mediante referencias/hash; no se exponen payloads opacos.
8. Un efecto externo incierto nunca se reintenta a ciegas.
9. El costo observado siempre se registra aunque exceda presupuesto.
10. No se agrega límite artificial bajo de salida.

## Evidencia obtenida

- Migración `20260812152500_b2_008_agent_runtime.sql` aplicada sólo a `hprdctmblmfcoagugvyp`; historial 11/11.
- SHA-256 migración: `09AC2A350169A0AB19285B2DDA4A869F2B05C0B87F53330E248693BDE9595D29`.
- 20 tablas, 20 vistas seguras, 20 policies, RLS forzada 20/20 y 18 RPCs sólo `service_role`.
- Ensayo atómico con rollback: 84/84 pgTAP.
- Regresión sobre el esquema aplicado: 649/649 en ocho archivos.
- SHA-256 prueba B2-008: `C98750AD436C0D0104418E7662575A52C9D5C13C7012CA6DE623448BE59DC905`.
- Lint remoto `app_private,api`: cero errores; advisors: cero hallazgos.
- Tipos regenerados desde AgenteFer: `B9E69A4A6F69545C8AB7847C35AB112CAAA18DD791AE654F5B8B189B06747206`; auditoría AST confirmó cero entidades/campos previos eliminados.
- 51 escenarios B2-008, 144 acumulados, cero errores de parseo.
- Gates preparados para dos carreras de agent runtime y seis mutantes B2-008, elevando el total SQL a 38.

## Evidencia aún requerida antes de COMPLETE

- CI Docker desde cero con las 11 migraciones y 649 pgTAP;
- dos carreras B2-008 y regresión de concurrencia previa verdes;
- 38/38 mutantes SQL eliminados;
- QA general, contenedores y supply chain verdes;
- commit/push sólo en `develop`, con run/job/SHA registrados.

## Límites honestos

- Meta, OpenAI y MiniMax aún no están conectados con credenciales reales.
- `pgmq` no está habilitado; `agent_jobs` es el ledger transport-neutral.
- No existe todavía almacenamiento protegido B2-010 para payload opaco de checkpoint.
- No se declara que una tool de dominio o una respuesta externa se ejecute hasta sus bloques respectivos.

No se permitirá cerrar B2-008 deshabilitando una policy, constraint, prueba, mutante o escenario.
