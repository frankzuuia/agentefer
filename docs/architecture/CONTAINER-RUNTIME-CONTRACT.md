# AgenteFer — contrato de contenedores API y worker

Fecha: 2026-08-03.  
Bloque: B1-008, en progreso.  
Artefactos: `apps/api/Dockerfile`, `apps/worker/Dockerfile`, `compose.yaml`.

## Frontera de procesos

| Proceso | Entrada pública                  | Health                   | Dominio en EasyPanel                  |
| ------- | -------------------------------- | ------------------------ | ------------------------------------- |
| API     | HTTP por proxy TLS, más adelante | `/health/live`, `/ready` | sí, cuando se autorice B4-007         |
| worker  | ninguna                          | puerto HTTP interno      | nunca; no se publica ni asigna dominio |

El worker sólo inicia el servidor mínimo de health en B1-008. La cola y los consumidores reales pertenecen a B3/B4; no se simula trabajo de negocio.

## Cadena de construcción

Ambos Dockerfiles usan el contexto de la raíz del monorepo y stages separados:

1. `toolchain`: Node 24.18.0 Bookworm slim fijado por tag y digest; npm se alinea exactamente a 11.16.0.
2. `development-dependencies`: `npm ci --ignore-scripts` contra el lockfile completo.
3. `build`: sólo copia el servicio y sus dependencias internas actuales; compila TypeScript.
4. `production-dependencies`: instala únicamente el árbol productivo del servicio, config y observability.
5. `runtime`: recibe `node_modules` filtrado y archivos `dist`; no recibe fuentes, tests, Git, documentación ni archivos env.

Node 24.18.0 distribuye npm 11.15.0, mientras el contrato del repositorio exige npm 11.16.0. La alineación explícita conserva `devEngines` fail-closed; no se debilitó el manifiesto para acomodar la imagen.

El gate `scripts/verify-container-contract.mjs` descubre los nueve workspaces y exige que sus manifests aparezcan en ambos stages de dependencias de ambos Dockerfiles. Un workspace futuro rompe QA hasta que las imágenes se actualicen de forma deliberada.

## Controles de runtime

- usuario final `node`, nunca root;
- `CMD` exec-form y `STOPSIGNAL SIGTERM`;
- filesystem read-only al ejecutar mediante Compose/CI;
- `/tmp` temporal, acotado, `noexec`, `nosuid` y `nodev`;
- todas las capabilities Linux eliminadas;
- `no-new-privileges` y límite de procesos;
- ningún secreto en `ARG`, `ENV`, imagen o Compose versionado;
- `.dockerignore` excluye secretos, provider state, dependencias y artefactos locales;
- API local publicada sólo en loopback; worker sin `ports`.

EasyPanel deberá reproducir los controles compatibles y fijar CPU/memoria antes de B4-007. No se inventan límites de producción sin medir el runtime real.

## Liveness y readiness

- `GET /health/live`: confirma que el proceso HTTP responde; no consulta proveedores.
- `GET /health/ready`: devuelve `200` únicamente después del arranque y `503` durante arranque o drenado.
- las respuestas son mínimas, `no-store` y `nosniff`; no revelan versión, entorno, dependencias, rutas ni secretos.
- Docker sondea readiness desde dentro del contenedor usando `node`, sin agregar `curl` a la imagen.

En este bloque readiness cubre sólo los componentes realmente existentes. Supabase, cola, Meta y proveedores LLM se incorporarán al cálculo cuando sus clientes/consumidores sean reales; hasta entonces no se finge conectividad.

## Configuración local

`compose.yaml` requiere archivos ignorados `apps/api/.env.local` y `apps/worker/.env.local`, derivados de los contratos vacíos `.env.example`. Compose fija únicamente las interfaces y puertos internos técnicos (`3001` y `3002`); el puerto host del API se puede cambiar con `AGENTEFER_API_PORT` y permanece en `127.0.0.1`.

Los archivos locales no son mecanismo de staging/producción. EasyPanel recibirá cada conjunto de variables desde su secret store, con keys Supabase distintas para API y worker.

## Validación automática

El workflow `Quality` queda preparado con dos jobs:

1. `Verify`: gates TypeScript, pruebas, arranque de procesos reales, auditorías, firmas y política.
2. `Container runtime`: construye ambas imágenes, comprueba usuario no-root, arranca con controles de seguridad, espera los healthchecks, consulta el API por TCP, confirma que el worker no publica puerto y exige salida limpia tras SIGTERM.

El segundo job sólo será evidencia real después de commit/push autorizado y ejecución verde en GitHub Actions. Esta máquina no tiene Docker/Podman/nerdctl/buildah; por ello el bloque no se marca completo localmente.

## Fuentes primarias

- [Node.js 24.18.0 release](https://nodejs.org/en/blog/release/v24.18.0)
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Fastify server reference](https://fastify.dev/docs/latest/Reference/Server/)
- [EasyPanel app service](https://easypanel.io/docs/services/app)
