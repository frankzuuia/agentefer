# AgenteFer — auditoría B2-008 runtime cognitivo

Estado: **COMPLETE — INTEGRITY TOTAL — MATCH PERFECT**.  
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
- Commit funcional `f32a5f00367c9be84859bd91e30abacdda641e75`, sólo en `develop`.
- CI final `31617992972`: `Verify` `94185472907`, `Database contract` `94186089044` y `Container runtime` `94186089134`, todos `success` y con cero annotations.
- CI DB: once migraciones desde cero, 649/649 pgTAP, concurrencia B2-008 y previa, 38/38 mutantes SQL eliminados, lint/advisors verdes y tipos canónicos sin drift.
- CI general: 95/95 pruebas, cobertura 94.02% líneas/89.57% ramas, 112/112 mutantes TypeScript, contenedores no-root y supply chain verdes.

## Certificación final

- Las once migraciones se reconstruyen desde cero y el contrato acumulado permanece verde.
- Las rutas críticas de idempotencia, concurrencia, autorización, RLS, recuperación y certeza de efectos tienen evidencia positiva, negativa y de mutación.
- No existen excepciones de calidad abiertas para B2-008.
- OpenAI, MiniMax, Meta y `pgmq` continúan fuera de alcance y sin conexiones simuladas.

## Límites honestos

- Meta, OpenAI y MiniMax aún no están conectados con credenciales reales.
- `pgmq` no está habilitado; `agent_jobs` es el ledger transport-neutral.
- No existe todavía almacenamiento protegido B2-010 para payload opaco de checkpoint.
- No se declara que una tool de dominio o una respuesta externa se ejecute hasta sus bloques respectivos.

No se permitirá cerrar B2-008 deshabilitando una policy, constraint, prueba, mutante o escenario.
