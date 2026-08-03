# AgenteFer — revisión de dependencias

Fecha: 2026-08-03.  
Estado: B1-009 verificado localmente y en GitHub Actions.

## Inventario real

Actualmente existen:

- un `package.json` raíz y nueve manifiestos privados de workspace;
- Node 24.18.0 y npm 11.16.0 fijados;
- 23 declaraciones externas directas, todas con versión exacta;
- lockfile npm reproducible;
- un árbol limpio validado con `npm ci`;
- 576 entradas de paquete en el lockfile: 557 artefactos del registry y 9 enlaces internos;
- verificadores de frontera, build graph, contenedores y dependencias basados únicamente en Node estándar.

Existen Dockerfiles API/worker y CI real; todavía no existen SDKs de Supabase runtime, OpenAI, MiniMax, Meta, Cloudflare o Vercel. Cada integración conserva su propio gate.

La carpeta `supabase/` fue generada por Supabase CLI y no contiene librerías vendorizadas.

## Resultado actual

- Auditoría completa y de producción: 0 vulnerabilidades.
- 449 paquetes con firmas de registry verificadas; 109 con attestations.
- 0 dependencias externas directas flotantes, 0 peers forzados, 0 artefactos registry sin integridad y 0 sin licencia.
- Host de los 557 artefactos externos: únicamente `registry.npmjs.org`.
- Tres entradas lockfile con lifecycle de instalación, todas dev-only y revisadas: esbuild 0.28.1, fsevents 2.3.3 y unrs-resolver 1.12.2. CI/Docker instalan con `--ignore-scripts`.
- Cuatro familias recíprocas revisadas: axe-core, lightningcss, sharp/libvips y binarios sharp Windows/WASM.
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

El gate ya es ejecutable mediante `dependency-policy.json` y `scripts/verify-dependency-policy.mjs`. Toda nueva versión/rango, licencia, familia recíproca, lifecycle script u origen de registry falla cerrado hasta que la política y esta revisión se actualicen deliberadamente.

## Gate de contenedores

- bases Node oficiales fijadas por versión y digest: aprobado;
- build multi-stage y dependencias productivas filtradas: aprobado;
- usuario no-root, archivos mínimos y health/readiness: aprobado;
- secretos fuera de layers/build args: aprobado por contrato y escaneo versionable;
- build/runtime real en GitHub Actions: aprobado en runs 30859122936 y 30859433695;
- escaneo de vulnerabilidades/SBOM de imagen: permanece como gate B8-005 antes de release.

## Licencias y distribución

- Los diez manifests AgenteFer son privados y `UNLICENSED`.
- No hay GPL/AGPL en el árbol efectivo.
- Sharp/libvips declara LGPL-3.0-or-later y expresiones combinadas Apache/MIT; B8-005 debe generar SBOM, avisos y revisar obligaciones aplicables.
- MPL-2.0 aparece en axe-core, lightningcss y sus binarios opcionales; permanece transitive y revisada, no ignorada.
- Otras licencias con aviso/atribución, incluida CC-BY-4.0, permanecen registradas para el paquete de notices de B8-005.

## Estado

- Selección de plataforma: documentada en B1-001/B1-002.
- Scaffold de workspaces: verificado en B1-003.
- Instalación, lockfile y auditoría inicial: verificados en B1-004.
- Política automatizada, lifecycle y licencias: verificados local/remoto en B1-009, run 30860154280.
- Evidencia detallada: `docs/quality/B1-DEPENDENCY-AUDIT.md`.
- Supabase CLI reproducible: pendiente antes de automatizar migraciones/CI.
- SBOM y auditoría de release: pendientes B8-005.
