# AgenteFer — auditoría de seguridad

Fecha: 2026-08-03.  
Alcance: archivos actuales de AgenteFer hasta B2-002 y firma del Supabase staging; todavía no existe conexión Meta, integración externa ni despliegue de aplicación.

## Superficies revisadas

1. Secretos y variables de entorno.
2. Autenticación/sesiones.
3. Autorización/aislamiento.
4. RLS/base de datos.
5. XSS/renderizado.
6. SSRF/redirecciones.
7. Inyección/consultas.
8. Webhooks/firma/replay/idempotencia.
9. Uploads/Storage/PII.
10. Rate limits/CORS/headers/CI/dependencias.

## Evidencia actual

- Git root: `C:/Users/figod/Desktop/agentefer`.
- Rama: `develop`.
- Remoto: `https://github.com/frankzuuia/agentefer.git`.
- Código funcional: configuración, observabilidad, runtimes mínimos API/worker y persistencia B2-001/B2-002; adapters, tools y negocio continúan pendientes.
- Scaffold: root npm y nueve workspaces privados verificados; cuatro workspaces activos.
- Migraciones de aplicación: B2-001 y B2-002 versionadas, probadas desde cero y aplicadas en Supabase staging.
- Dependencias runtime actuales nuevas en B1-007/B1-008: OpenTelemetry, Pino y Fastify, todas exactas; lockfile y árbol reproducible presentes.
- Política de dependencias: versiones/orígenes/integrity/licencias/lifecycle verificados automáticamente y fail-closed.
- Auditoría npm completa/producción: 0 vulnerabilidades.
- Firmas: 449 paquetes verificados; 109 attestations verificadas.
- Recursos configurados: Supabase de AgenteFer enlazado; EasyPanel de AgenteFer vacío.
- Escaneo estricto de secretos plausibles en archivos versionables: cero coincidencias.
- Escaneo de referencias de infraestructura no-AgenteFer: cero coincidencias.

## Hallazgos

### SA-001 — Configuración Supabase aún es plantilla local

- Severidad actual: informativa; se vuelve alta si se empuja a producción sin revisión.
- Evidencia: `supabase/config.toml` conserva defaults de desarrollo como signup, URLs localhost y restricciones de red no definidas para producción.
- Impacto: una futura ejecución de configuración sin matriz de entorno podría habilitar una superficie no deseada.
- Acción: B1-005/B2-009 deben definir auth, redirects, exposición Data API, SSL/red y secretos por entorno antes de `config push`.
- Estado: B1-005 ya separó entornos/secretos y exige HTTPS; Auth, Data API y red reales siguen abiertos para B2-009. Bloquea producción.

### SA-002 — Implementación de controles aún parcial

- Severidad actual: informativa.
- Evidencia: redacción/correlación/errores/métricas y RLS/idempotencia de persistencia B2-001/B2-002 están implementados; firma HTTP, rate limits, adapters y autorización de tools siguen pendientes.
- Impacto: la base rechaza estados y cruces tenant peligrosos, pero todavía no existe perímetro HTTP Meta ni ejecución autorizada de tools.
- Acción: ejecutar B1–B8 y convertir cada control en prueba/evidencia.
- Estado: parcialmente mitigado por B1 y B2-001/B2-002; continúa abierto para B2 restante y B3–B8.

### SA-003 — Supabase CLI no está fijado en el repositorio

- Severidad actual: baja; aumenta para CI/CD reproducible.
- Evidencia: CI y operaciones B2 usan explícitamente Supabase CLI `2.111.0`; el workflow rechaza acciones/versiones no fijadas.
- Impacto: ejecuciones futuras podrían usar una versión diferente.
- Acción: fijar el CLI y validar su mecanismo de instalación antes de automatizar migraciones en B2/CI; no reutilizar `@latest`.
- Estado: mitigado para B2/CI mediante versión exacta; revisar la versión conscientemente al actualizar.

### SA-004 — Overrides temporales de seguridad en Next.js

- Severidad actual: baja, con gate de actualización.
- Evidencia: Next.js 16.2.12 resolvía versiones vulnerables de PostCSS/Sharp; `package.json` fija PostCSS 8.5.25 y Sharp 0.35.3 dentro del override de Next.
- Impacto: una actualización de Next podría volver obsoleto o incompatible el override.
- Acción: revisar advisories, peers, audit y build en cada actualización; retirar el override sólo cuando upstream sea seguro.
- Estado: mitigado; auditorías completa/producción en cero.

### SA-005 — Obligación de avisos de Sharp/libvips

- Severidad actual: informativa; bloquea release sin cumplimiento documental.
- Evidencia: `@img/sharp-win32-x64` declara `Apache-2.0 AND LGPL-3.0-or-later`.
- Impacto: la distribución de binarios/imágenes exige conservar las obligaciones aplicables.
- Acción: B8-005 generará SBOM, avisos de terceros y revisión de distribución.
- Estado: abierto para release, no para desarrollo.

### SA-006 — Validación Docker real

- Severidad residual: informativa; los límites productivos se medirán antes del despliegue.
- Evidencia: `Container runtime` del run 30859122936 construyó ambas imágenes y validó usuario, filesystem, healthcheck, exposición y shutdown.
- Impacto residual: EasyPanel todavía debe reproducir controles y fijar CPU/memoria según mediciones reales.
- Acción: conservar el job bloqueante y comprobar configuración/rollback al crear servicios en B4-007.
- Estado: mitigado en B1-008; despliegue permanece diferido.

### SA-007 — Lifecycle scripts y licencias recíprocas

- Severidad residual: informativa; bloquea release si faltan notices/SBOM.
- Evidencia: tres paquetes dev-only tienen lifecycle flag; cuatro familias usan LGPL/MPL, todos fijados y justificados en `dependency-policy.json`.
- Impacto residual: una distribución futura de frontend/imágenes debe incluir avisos y cumplir obligaciones aplicables de libvips/MPL/CC-BY.
- Acción: el gate B1-009 rechaza cambios no revisados; B8-005 generará SBOM, escaneará imágenes y producirá notices finales.
- Estado: control preventivo implementado; cumplimiento de distribución pendiente de release.

### SA-008 — Catálogo universal y política de publicación

- Severidad actual: informativa; se vuelve alta si una integración publica sin policy gate.
- Evidencia: RQ-110 y ADR-011 permiten categorías extensibles como datos, pero separan expresamente capacidad de modelado, activación pública y autorización de canal.
- Impacto: una categoría universal sin validación de legalidad/política podría intentar ofrecer mercancía prohibida por el negocio, la ley o Meta.
- Acción: B2 conserva estado privado/publicable; B3 autoriza tools; B4 aplica capability/policy antes de publicación; B8 prueba bypass, prompt injection y categorías bloqueadas.
- Estado: control arquitectónico definido; B2-002 ya implementa el policy gate del outbox, mientras el esquema de catálogo, catálogo funcional y adaptador Meta siguen pendientes.

## Controles que ya existen como política

- frontera exclusiva AgenteFer en `AGENTS.md`;
- requisitos RQ-001–RQ-110 y reglas BL-001–BL-025;
- modelo de amenazas TM-001–TM-024;
- escenarios SC-001–SC-037;
- prohibición de secretos, mocks e infraestructura no identificada;
- tool calling con autorización/invariantes y no parser cognitivo rígido;
- separación staging/producción planeada.

## Veredicto

- Hallazgos críticos: 0.
- Hallazgos altos actuales: 0.
- Hallazgos abiertos de implementación: todos los controles B1–B8.
- Bloque 0: apto para cerrar tras match documental.
- Investigación B1-001/B1-002: completada con fuentes oficiales, ADRs y gates documentales.
- Scaffold B1-003: verificado con Node/npm y auditoría de frontera.
- Dependencias B1-004: versiones exactas, lockfile, instalación limpia, licencias, firmas y auditorías verificadas.
- Entornos B1-005: ejemplos vacíos por proceso, parser tipado, redacción, separación pública/secreta y 15 pruebas verificadas.
- B1-006 local: format/lint/typecheck/test/build/audit y política CI pasan; workflow read-only y Actions por SHA preparados.
- B1-006 remoto: `Quality` run 30853524915 aprobó el commit `edfe0b0` en `develop` con Actions Node 24 por SHA y 0 annotations.
- B1-007 completo: Pino/OpenTelemetry neutral, redacción, taxonomía, correlación W3C y métricas aprobados localmente y en el run remoto 30859122936.
- B1-008 completo: API/worker health real por TCP, Dockerfiles no-root, Compose endurecido, 30 pruebas y build/runtime Docker remoto aprobados en `develop`.
- B1-009 completo: política de dependencias y artefactos actualizados desde el árbol real; run 30860154280 aprobado sobre `develop`.
- B2-001 completo: organizaciones, perfiles y membresías aplicados en staging con RLS forzado, pruebas cross-org y cero datos reales.
- B2-002 completo: canales/mensajería aplicados en staging; 14/14 tablas privadas con RLS forzado, 12 policies, 12 vistas, cero acceso `anon`, cero filas nuevas y 134 aserciones pgTAP acumuladas.
- CI B2-002 final: run 30870893413 aprobado sobre `92a0783eb032c39efd4d6bd09d4d7e02f931798b`, tres jobs verdes y cero annotations.
- Aclaración RQ-110: catálogo universal y separación de policy formalizados en ADR-011; gate documental automatizado incorporado al pipeline local/CI.
- Integraciones externas: todavía no existen ni han sido validadas.
- Producción: no apta.
