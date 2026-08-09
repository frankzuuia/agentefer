# AgenteFer — contrato de entornos y secretos

Fecha: 2026-08-03.  
Bloque: B1-005.  
Implementación: `packages/config/src/`.

## Objetivo

Cada proceso recibe exclusivamente la configuración que necesita. Los ejemplos se separan por artefacto y contienen valores vacíos; ninguna credencial se guarda en Git. Una variable ausente o insegura produce readiness no apta en vez de usar un valor ficticio.

## Entornos

| `APP_ENV`    | Rama/uso                             | Recursos                                                                           | Transporte        |
| ------------ | ------------------------------------ | ---------------------------------------------------------------------------------- | ----------------- |
| `local`      | desarrollo local                     | únicamente recursos locales autorizados                                            | HTTP permitido    |
| `test`       | pruebas puras/integración controlada | fixtures o recursos de test explícitos                                             | HTTP permitido    |
| `staging`    | `develop`                            | Supabase `hprdctmblmfcoagugvyp`, EasyPanel `agente-fer`, web staging por registrar | HTTPS obligatorio |
| `production` | `main`, tras B9                      | recursos nuevos y exclusivos aún no creados                                        | HTTPS obligatorio |

`staging` y `production` requieren `DEPLOYMENT_COMMIT_SHA` completo de 40 caracteres. Producción no puede reutilizar secretos ni recursos de staging.

## Matriz canónica

### Comunes

| Variable                | Procesos         | Clase   | Obligación         | Regla                                     |
| ----------------------- | ---------------- | ------- | ------------------ | ----------------------------------------- |
| `APP_ENV`               | web, api, worker | interna | siempre            | `local`, `test`, `staging` o `production` |
| `LOG_LEVEL`             | web, api, worker | interna | siempre            | nivel estructurado permitido              |
| `DEPLOYMENT_COMMIT_SHA` | web, api, worker | interna | staging/production | commit desplegado y auditable             |

### Web

| Variable                               | Clase   | Obligación | Regla                                          |
| -------------------------------------- | ------- | ---------- | ---------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                  | pública | siempre    | URL del catálogo; HTTPS fuera de local/test    |
| `NEXT_PUBLIC_API_URL`                  | pública | siempre    | URL pública del API; HTTPS fuera de local/test |
| `NEXT_PUBLIC_SUPABASE_URL`             | pública | siempre    | hostname debe coincidir con el project ref     |
| `NEXT_PUBLIC_SUPABASE_PROJECT_REF`     | pública | siempre    | ref no secreto del entorno                     |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | siempre    | sólo formato actual `sb_publishable_*`         |

La guardia de exposición inspecciona todas las variables `NEXT_PUBLIC_*` presentes. Cualquier nombre con apariencia de secreto/token/private key o una key no aprobada hace fallar el arranque sin imprimir el valor.

### API

| Variable                   | Clase              | Obligación | Regla                                                           |
| -------------------------- | ------------------ | ---------- | --------------------------------------------------------------- |
| `API_HOST`                 | interna            | siempre    | interfaz de escucha                                             |
| `API_PORT`                 | interna            | siempre    | entero 1–65535                                                  |
| `API_PUBLIC_URL`           | interna            | siempre    | URL canónica del API                                            |
| `WEB_PUBLIC_URL`           | interna            | siempre    | origen web exacto autorizado; no wildcard                       |
| `SUPABASE_URL`             | interna            | siempre    | coincide con `SUPABASE_PROJECT_REF`                             |
| `SUPABASE_PROJECT_REF`     | interna            | siempre    | frontera explícita del proyecto                                 |
| `SUPABASE_PUBLISHABLE_KEY` | interna/no secreta | siempre    | operaciones con contexto de usuario/RLS                         |
| `SUPABASE_SECRET_KEY`      | secreta            | siempre    | key exclusiva del API; bypass RLS sólo tras autorización propia |

### Worker

| Variable               | Clase   | Obligación  | Regla                                                     |
| ---------------------- | ------- | ----------- | --------------------------------------------------------- |
| `WORKER_HEALTH_HOST`   | interna | siempre     | interfaz del health server; no implica exposición pública |
| `WORKER_HEALTH_PORT`   | interna | siempre     | entero 1–65535; puerto sólo interno                       |
| `SUPABASE_URL`         | interna | siempre     | coincide con `SUPABASE_PROJECT_REF`                       |
| `SUPABASE_PROJECT_REF` | interna | siempre     | frontera explícita del proyecto                           |
| `SUPABASE_SECRET_KEY`  | secreta | siempre     | key exclusiva del worker, distinta a API                  |
| `AI_MODEL`             | interna | siempre     | `provider:model` exacto; modelo no enumerado              |
| `AI_VISION_MODEL`      | interna | opcional    | hereda `AI_MODEL`; no cambia de proveedor silenciosamente |
| `AI_REASONING_EFFORT`  | interna | opcional    | preferencia transmitida sólo si el adapter la soporta     |
| `AI_TURN_TIMEOUT_MS`   | interna | siempre     | entero positivo, techo absoluto 600,000 ms                |
| `AI_MAX_TOOL_ROUNDS`   | interna | siempre     | entero positivo, techo absoluto 64                        |
| `AI_CACHE_MODE`        | interna | siempre     | `off`, `auto` o `explicit`                                |
| `AI_FALLBACK_MODELS`   | interna | opcional    | arreglo JSON ordenado, máximo 8; vacío = sin fallback     |
| `OPENAI_API_KEY`       | secreta | condicional | obligatoria si cualquier selector usa `openai`            |
| `OPENAI_API_BASE_URL`  | interna | opcional    | override HTTPS; vacío usa endpoint oficial del adapter    |
| `MINIMAX_API_KEY`      | secreta | condicional | obligatoria si cualquier selector usa `minimax`           |
| `MINIMAX_API_BASE_URL` | interna | opcional    | override HTTPS; vacío usa endpoint oficial del adapter    |

Objetivo inicial de staging acordado, a configurar en EasyPanel cuando exista el worker desplegable:

- `AI_MODEL`: `openai:gpt-5.6-luna`;
- `AI_REASONING_EFFORT`: `medium`;
- `AI_CACHE_MODE`: `auto`.

Cambiar `AI_MODEL` por `minimax:MiniMax-M2.7-highspeed`, `minimax:MiniMax-M3` u otro ID válido cambia las ejecuciones nuevas después del reinicio/redespliegue. El adapter y su perfil de capacidades determinan si visión/tools están disponibles; la configuración no adivina capacidades por el nombre.

## Secretos redactables

`SUPABASE_SECRET_KEY`, `OPENAI_API_KEY` y `MINIMAX_API_KEY` se transforman en `SensitiveValue`:

- `JSON.stringify` y coerción a string muestran `[REDACTED]`;
- el consumidor autorizado debe llamar explícitamente `reveal()` al construir el cliente externo;
- los errores incluyen nombres de variables, nunca sus valores.

Esto reduce filtraciones accidentales; no sustituye la redacción central de logs de B1-007.

## Supabase: convención vigente

AgenteFer usa llaves nuevas:

- `sb_publishable_*` en el navegador, protegida por roles y RLS;
- `sb_secret_*` únicamente en API/worker controlados, con una key distinta por componente para rotación independiente.

No se diseñan nuevas integraciones con `anon` o `service_role`: Supabase las clasifica como legacy y anuncia su deprecación para finales de 2026. Una secret key tiene acceso elevado y bypass RLS; por eso su presencia no autoriza por sí sola una operación de usuario.

Fuentes oficiales consultadas:

- [Understanding API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrating to publishable and secret API keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Environment variables](https://supabase.com/docs/guides/functions/secrets)
- [Breaking change: OpenAPI spec via anon key](https://supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key)

## Variables deliberadamente diferidas

No se inventan todavía variables de Meta, Turnstile, observabilidad, SMTP o dominio:

- Meta App/Página/WABA/número y permisos se verifican en B4-001 antes de nombrar credenciales.
- Cloudflare/Vercel se configuran en B4-008 cuando existan dominio y artefacto web. Se solicitará al usuario el acceso mínimo justo antes de ese movimiento.
- Logging/exportadores se cierran en B1-007.
- Los datos comerciales configurables pertenecen a base de datos versionada, no a env.

## Aprovisionamiento automático futuro

1. Los archivos `.env.example` son contratos sin valores, no archivos de despliegue.
2. EasyPanel/Vercel reciben variables desde su secret store por entorno.
3. CI verifica nombres requeridos y destino antes de desplegar; no copia secretos entre entornos.
4. El proceso valida y falla cerrado al arrancar/readiness.
5. La rotación actualiza el secret store y redespliega/reinicia el componente afectado.
6. B9 creará valores y recursos de producción nuevos; nunca promoverá los de staging.

## Pruebas actuales

`packages/config/test/environment.test.ts` cubre 15 casos sin mocks externos: sincronización exacta de ejemplos, happy paths, exposición pública, redacción, HTTPS, frontera Supabase, selección OpenAI/MiniMax, modelo futuro, credenciales condicionales, fallback y ceilings.
