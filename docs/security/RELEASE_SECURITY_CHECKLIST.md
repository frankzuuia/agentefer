# AgenteFer — checklist de seguridad para release

Fecha de última revisión: 2026-08-03.  
Estado: no apto para producción; baseline B1 comprobado, gates B2–B9 pendientes.

## Evidencia preparatoria B1-009

Estos checks no autorizan un release; prueban únicamente el cimiento disponible:

- [x] Repositorio/remoto exclusivos `frankzuuia/agentefer`, rama de desarrollo `develop`.
- [x] Node/npm y dependencias directas fijados; lockfile v3 reproducible.
- [x] CI read-only con Actions por SHA, gates de código, firmas y contenedores reales.
- [x] API/worker no-root, health/readiness y shutdown comprobados en runner Linux.
- [x] Variables por proceso, ejemplos sin valores y escaneo versionable sin secretos.
- [x] Auditorías npm completa/producción: 0 vulnerabilidades conocidas.
- [x] Lifecycle scripts y licencias recíprocas inventariados bajo política fail-closed.
- [ ] SBOM, escaneo de imagen y avisos de terceros finales: B8-005.
- [ ] Aprobación de producción: prohibida hasta completar y firmar B9.

## Frontera y artefacto

- [ ] Commit/release pertenece a `frankzuuia/agentefer`.
- [ ] Rama/destino cumplen `develop`→staging o `main`→producción.
- [ ] Recursos de destino están registrados exclusivamente para AgenteFer.
- [ ] Artefacto es reproducible, identificable y escaneado.
- [ ] Rollback usa artefacto conocido y está documentado.

## Secretos y configuración

- [ ] Cero secretos en Git, frontend, imagen, logs, prompts y reportes.
- [ ] Secretos distintos por entorno y mínimo privilegio.
- [ ] URLs, CORS, redirects, cookies, headers y CSP corresponden al entorno.
- [ ] Credenciales de Meta/LLM/Supabase pueden rotarse sin reconstruir código.
- [ ] `.env.example` y matriz de configuración están actualizados sin valores.

## Auth, RLS y datos

- [ ] Auth/session hardening verificado.
- [ ] RLS activa y probada en toda entidad operacional/expuesta.
- [ ] Tests cross-organization de lectura/escritura pasan.
- [ ] Funciones/vistas/grants privilegiados revisados.
- [ ] Storage original/derivado y URLs firmadas probados.
- [ ] PII inventory, retención, exportación y eliminación definidos.
- [ ] Backup/restore real completado.

## API, webhooks y archivos

- [ ] Firma raw, replay e idempotencia de webhooks probados.
- [ ] Rate limits/antiabuso y límites de body/medios probados.
- [ ] SSRF, MIME, tamaño y procesamiento aislado probados.
- [ ] CORS/CSRF/XSS/CSP/headers validados.
- [ ] Errores públicos y logs no exponen internals/PII/secretos.

## Agente LLM

- [ ] Tool allowlist por actor/rol/canal/estado probada.
- [ ] Prompt injection y tool overreach evaluados.
- [ ] IDs/organización/autorización se validan fuera del LLM.
- [ ] Límite de turns/tools/tokens/tiempo/costo probado.
- [ ] Memoria y configuración no pueden envenenarse desde cliente.
- [ ] Incertidumbre produce pregunta/handoff, no dato inventado.
- [ ] Modelos/prompts/tools tienen versión y auditoría.

## Integraciones y resiliencia

- [ ] Capacidades y permisos Meta se probaron con recursos reales AgenteFer.
- [ ] Ventanas/consentimiento/plantillas de mensajería probadas.
- [ ] Publicaciones/lotes tienen aprobación, límites, dedupe y cancelación.
- [ ] Retries/dead-letter/conciliación y provider outage probados.
- [ ] Worker crash después de efecto externo no duplica.
- [ ] Health/readiness, métricas, alertas y runbooks operan.

## Calidad y aceptación

- [ ] Typecheck, lint, unit, integration, E2E y build pasan.
- [ ] Migraciones/advisors/RLS tests pasan.
- [ ] Secret/dependency/container/security scans pasan.
- [ ] Catálogo móvil, accesibilidad y estados UX verificados.
- [ ] SC-001–SC-037 tienen evidencia o NO-BUILD justificado.
- [ ] UAT accesible con Fer aprobado.
- [ ] Cero hallazgos críticos/altos no corregidos o no aceptados explícitamente.
- [ ] Riesgos conocidos, release record y contacto de incidente documentados.

## Aprobación

No completar ni firmar esta sección hasta B9:

- Release/commit:
- Entorno:
- Evidencia CI:
- Evidencia seguridad:
- Evidencia restore/rollback:
- Aprobador:
- Fecha:
