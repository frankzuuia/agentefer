# AgenteFer — auditoría de contenedores B1-008

Fecha: 2026-08-03.  
Raíz: `C:/Users/figod/Desktop/agentefer`.  
Rama: `develop`.  
Estado: `IN PROGRESS`; QA local aprobada, ejecución Docker real pendiente.

## Entregables preparados

- API Fastify mínima y worker con health HTTP interno.
- Readiness compartida en `@agentefer/observability`.
- Dockerfiles multi-stage independientes para API y worker.
- Compose local endurecido y sin valores secretos.
- `.dockerignore` de mínimo contexto y exclusión de secretos.
- gate dinámico `verify:container-contract`.
- job CI `Container runtime` posterior al gate completo.
- contrato: `docs/architecture/CONTAINER-RUNTIME-CONTRACT.md`.

## Evidencia local

`npm run verify` aprobado:

- Prettier: aprobado;
- ESLint: aprobado;
- TypeScript strict: aprobado;
- frontera: 9 workspaces;
- workspaces activos: API, worker, config y observability;
- grafo interno buildable: config y observability;
- contrato de contenedores: 2 Dockerfiles y 9 manifests sincronizados;
- Vitest: 8 archivos, 30 pruebas aprobadas;
- builds: los 4 workspaces activos aprobados;
- procesos compilados: API y worker arrancan por TCP, alcanzan readiness/liveness y terminan;
- `npm audit`: 0 vulnerabilidades;
- `npm audit --omit=dev`: 0 vulnerabilidades.

Las pruebas API/worker abren sockets TCP reales en puertos efímeros. No existe consumidor, proveedor, cola o base de datos simulados.

## Controles inspeccionados

| Control                         | API | worker |
| ------------------------------- | --- | ------ |
| base Node por digest            | sí  | sí     |
| npm de build exacto             | sí  | sí     |
| instalación `ci` scriptless     | sí  | sí     |
| árbol productivo filtrado       | sí  | sí     |
| runtime `USER node`             | sí  | sí     |
| healthcheck de readiness        | sí  | sí     |
| shutdown por SIGTERM            | sí  | sí     |
| filesystem read-only en Compose | sí  | sí     |
| capabilities eliminadas         | sí  | sí     |
| puerto host                     | loopback | ninguno |

## Hallazgo resuelto durante QA

Una verificación en checkout limpio descubrió que `dist` local ocultaba la dependencia de tipos internos durante lint/typecheck. La corrección raíz fue `scripts/prepare-workspace-dependencies.mjs`: descubre el grafo desde manifests, calcula el cierre transitivo, ordena topológicamente y construye dependencias internas antes de cada gate. No contiene una lista hardcodeada de paquetes.

El checkout limpio final aprobó la suite completa con 101 archivos versionables, 458 paquetes instalados y 0 vulnerabilidades. Los directorios de auditoría permanecen fuera del repositorio en `%TEMP%`; no se tocó otro proyecto.

## Evidencia todavía obligatoria

- `docker build --pull` real de ambas imágenes;
- arranque real con root filesystem read-only;
- health Docker `healthy` en ambos servicios;
- usuario final inspeccionado como `node`;
- API accesible sólo por su puerto y worker sin puerto publicado;
- shutdown SIGTERM observado;
- CI remoto verde contra el commit exacto de `develop`.

No hay engine Docker local. Instalar Docker Desktop sería un cambio de sistema amplio y no se ejecutó implícitamente. EasyPanel tampoco se usó como banco de pruebas porque B4-007 exige imágenes previamente validadas.

## Veredicto

- Implementación y QA estática/local de B1-008: aprobadas.
- Validación de contenedor real: pendiente.
- B1-008 permanece abierto y bloquea la creación de servicios EasyPanel.
- Infraestructura externa mutada: 0.
- Commit/push del cambio: no ejecutado.
