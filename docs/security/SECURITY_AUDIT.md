# AgenteFer — auditoría de seguridad

Fecha: 2026-08-03.  
Alcance: archivos actuales de AgenteFer tras B1-004; todavía no existe código funcional, esquema de aplicación, endpoints ni despliegue.

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
- Archivos funcionales: ninguno.
- Scaffold: root npm y nueve workspaces privados verificados.
- Migraciones de aplicación: ninguna.
- Dependencias directas: 19, todas exactas; lockfile y árbol reproducible presentes.
- Auditoría npm completa/producción: 0 vulnerabilidades.
- Firmas: 444 paquetes verificados; 104 attestations verificadas.
- Recursos configurados: Supabase de AgenteFer enlazado; EasyPanel de AgenteFer vacío.
- Escaneo estricto de secretos en archivos versionables: cero coincidencias.
- Escaneo de referencias de infraestructura no-AgenteFer: cero coincidencias.

## Hallazgos

### SA-001 — Configuración Supabase aún es plantilla local

- Severidad actual: informativa; se vuelve alta si se empuja a producción sin revisión.
- Evidencia: `supabase/config.toml` conserva defaults de desarrollo como signup, URLs localhost y restricciones de red no definidas para producción.
- Impacto: una futura ejecución de configuración sin matriz de entorno podría habilitar una superficie no deseada.
- Acción: B1-005/B2-009 deben definir auth, redirects, exposición Data API, SSL/red y secretos por entorno antes de `config push`.
- Estado: B1-005 ya separó entornos/secretos y exige HTTPS; Auth, Data API y red reales siguen abiertos para B2-009. Bloquea producción.

### SA-002 — No existe todavía implementación de controles

- Severidad actual: informativa.
- Evidencia: sólo hay documentación, scaffold estructural/verificador y configuración inicial Supabase.
- Impacto: RLS, firma de webhooks, rate limits, autorización de tools y redacción están especificados pero no probados.
- Acción: ejecutar B1–B8 y convertir cada control en prueba/evidencia.
- Estado: esperado en Bloque 0.

### SA-003 — Supabase CLI no está fijado en el repositorio

- Severidad actual: baja; aumenta para CI/CD reproducible.
- Evidencia: Supabase se aprovisionó con `npx supabase@latest`; el lockfile actual fija la aplicación pero todavía no incorpora el CLI.
- Impacto: ejecuciones futuras podrían usar una versión diferente.
- Acción: fijar el CLI y validar su mecanismo de instalación antes de automatizar migraciones en B2/CI; no reutilizar `@latest`.
- Estado: abierto.

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

## Controles que ya existen como política

- frontera exclusiva AgenteFer en `AGENTS.md`;
- requisitos RQ-001–RQ-109 y reglas BL-001–BL-025;
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
- Código funcional/integraciones: todavía no existen ni han sido validados.
- Producción: no apta.
