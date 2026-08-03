# AgenteFer — auditoría de dependencias B1-004

Fecha: 2026-08-03.  
Raíz auditada: `C:/Users/figod/Desktop/agentefer`.  
Rama: `develop`.  
Remoto: `https://github.com/frankzuuia/agentefer.git`.

## Alcance

B1-004 fija el runtime, package manager, frameworks y toolchain inmediatos del monorepo. No incorpora todavía SDKs de OpenAI, MiniMax, Supabase, Meta, Cloudflare o Vercel; cada integración conserva su propio gate.

## Reproducibilidad

- Node.js fijado: `24.18.0` en `.node-version` y `devEngines`.
- npm fijado: `11.16.0` en `packageManager`, `engines` y `devEngines`.
- Dependencias directas: 18, todas con versión exacta; 0 rangos flotantes.
- Workspaces privados: 9, todos con `license: UNLICENSED`.
- Lockfile npm: presente y regenerado sin scripts de instalación.
- Política npm: `engine-strict`, `strict-peer-deps`, `save-exact`, auditoría y lockfile obligatorios; scripts desactivados por defecto.
- Instalación limpia comprobada con `npm ci`: 453 paquetes añadidos, 463 auditados, 0 vulnerabilidades.

## Árbol aceptado

| Área     | Dependencias directas                                                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| raíz/dev | TypeScript 6.0.3, @types/node 24.13.3, tsx 4.23.5, ESLint 9.39.5, @eslint/js 9.39.5, typescript-eslint 8.66.0, Prettier 3.9.6, Vitest 4.1.10, @vitest/coverage-v8 4.1.10, eslint-config-next 16.2.12 |
| web      | Next.js 16.2.12, React 19.2.8, React DOM 19.2.8, PostCSS 8.5.25, Sharp 0.35.3, @types/react 19.2.18, @types/react-dom 19.2.4                                                                         |
| API      | Fastify 5.11.2                                                                                                                                                                                       |

`npm ls --depth=0` confirmó ese árbol sin paquetes extra, inválidos o faltantes.

## Autopsia de resolución

### ESLint

ESLint 10.8.0 produjo `ERESOLVE`: `eslint-config-next` 16.2.12 depende de `eslint-plugin-import` 2.32.0, cuyo peer soporta hasta ESLint 9. Se rechazó forzar el peer y se fijaron ESLint/@eslint/js 9.39.5.

### Next.js, PostCSS y Sharp

La primera resolución de Next.js 16.2.12 expuso vulnerabilidades altas transitivas de PostCSS y Sharp. Se rechazó el `npm audit fix` que proponía degradar Next.js a 9.3.3. Los overrides quedan acotados a PostCSS 8.5.25 y Sharp 0.35.3; el árbol final resuelve una sola versión corregida de cada paquete.

Gates de retiro: eliminar cada override cuando Next.js publique una resolución corregida compatible y después de que audit, typecheck, test y build permanezcan verdes.

## Seguridad de cadena de suministro

Resultados observados:

- `npm audit --audit-level=high`: 0 vulnerabilidades.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilidades.
- `npm audit signatures`: 444 paquetes con firma de registry verificada y 104 con attestations verificadas.
- Consulta efectiva: 454 paquetes; 0 sin licencia declarada y 0 GPL/AGPL.
- Entradas externas del lockfile revisadas: 552; 0 sin `integrity`.

El mayor número de entradas del lockfile frente al árbol efectivo corresponde, entre otros, a binarios opcionales por plataforma.

## Licencias

Distribución observada: MIT 376, Apache-2.0 22, ISC 20, BSD-3-Clause 10, BSD-2-Clause 7, MPL-2.0 3, y otras permisivas/privadas en cantidades menores.

`@img/sharp-win32-x64` declara `Apache-2.0 AND LGPL-3.0-or-later` por libvips. No se clasifica como GPL/AGPL prohibida, pero exige conservar avisos y obligaciones aplicables al distribuir imágenes o binarios. B8-005 debe producir SBOM y avisos de terceros antes de release. MPL-2.0 permanece únicamente en dependencias transitivas.

## Incidentes controlados durante la instalación

- Una invocación diagnóstica incorrecta con `npm exec ... node` descargó Node 26.5.1 sólo al cache temporal global de npm. No se guardó en manifests, lockfile ni `node_modules`; el runtime real y las importaciones directas se verificaron con Node 24.18.0. No se limpia el cache global porque puede ser compartido por otros proyectos.
- El árbol generado antes de corregir overrides se movió a `.npm/stale-node_modules-b1-004`. Se verificó que contiene únicamente dependencias generadas y 0 directorios `.git`. La política del entorno bloqueó su eliminación antes de ejecutarse, por lo que permanece local e ignorado; no está versionado ni se usa en resolución.
- El reporte temporal `%TEMP%/agentefer-audit.json` también permanece porque el mismo comando fue rechazado antes de iniciar. No contiene secretos y no forma parte del repositorio.

## Comandos de verificación

```powershell
npm ci
npm test
npm ls --depth=0
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
npm audit signatures
```

## Veredicto

- Reproducibilidad B1-004: aprobada.
- Vulnerabilidades críticas/altas conocidas: 0.
- Conflictos peer tolerados/forzados: 0.
- Dependencias flotantes: 0.
- Código funcional o integración externa introducida: 0.
- Siguiente gate: B1-005, contrato de variables y separación de entornos sin valores secretos.
