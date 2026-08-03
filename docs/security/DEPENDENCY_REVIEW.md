# AgenteFer — revisión de dependencias

Fecha: 2026-08-03.  
Estado: B1-004 instalado y auditado; árbol reproducible sin vulnerabilidades conocidas.

## Inventario real

Actualmente existen:

- un `package.json` raíz y nueve manifiestos privados de workspace;
- Node 24.18.0 y npm 11.16.0 fijados;
- 19 dependencias directas con versión exacta;
- lockfile npm reproducible;
- un árbol limpio validado con `npm ci`;
- verificador de fronteras basado únicamente en Node estándar.

Todavía no existen Dockerfiles/imágenes, acciones CI ni SDKs de integraciones externas.

La carpeta `supabase/` fue generada por Supabase CLI y no contiene librerías vendorizadas.

## Resultado actual

- Auditoría completa y de producción: 0 vulnerabilidades.
- 444 paquetes con firmas de registry verificadas; 104 con attestations.
- 0 dependencias directas flotantes, 0 peers forzados y 0 paquetes efectivos sin licencia.
- PostCSS y Sharp están fijados mediante overrides de seguridad acotados; deben revisarse al actualizar Next.js.
- Zod 4.4.3 se incorporó en B1-005 únicamente para contratos de configuración; es MIT, sin dependencias propias ni lifecycle de instalación y con firma/attestation verificadas.
- Supabase CLI usado inicialmente mediante `npx ...@latest` aún no está autorizado para automatización; se fijará cuando B2/CI lo incorpore.
- No se aceptó ningún starter/boilerplate ni código de otro producto.

## Gate para Bloque 1

Antes de aceptar una dependencia:

1. justificar su función y por qué no se implementa con plataforma/runtime existente;
2. consultar documentación y repositorio oficial;
3. elegir versión exacta compatible;
4. revisar licencia, mantenimiento, vulnerabilidades y dependencias transitivas relevantes;
5. instalar desde registry oficial y comprometer lockfile;
6. ejecutar auditoría y pruebas reales;
7. registrar actualización/rollback.

## Gate de contenedores

- bases de imagen oficiales y versionadas;
- runtime soportado;
- build multi-stage cuando aplique;
- usuario no-root;
- solo archivos necesarios;
- health/readiness;
- escaneo de imagen;
- sin secretos en layers/build args.

## Licencias y distribución

- Los diez paquetes AgenteFer son privados y `UNLICENSED`.
- No hay GPL/AGPL en el árbol efectivo.
- El binario Sharp/libvips declara Apache-2.0 y LGPL-3.0-or-later; B8-005 debe generar SBOM y avisos de terceros aplicables.
- MPL-2.0 existe sólo en tres dependencias transitivas.

## Estado

- Selección de plataforma: documentada en B1-001/B1-002.
- Scaffold de workspaces: verificado en B1-003.
- Instalación, lockfile y auditoría inicial: verificados en B1-004.
- Evidencia detallada: `docs/quality/B1-DEPENDENCY-AUDIT.md`.
- Supabase CLI reproducible: pendiente antes de automatizar migraciones/CI.
- SBOM y auditoría de release: pendientes B8-005.
