# AgenteFer — revisión de documentación oficial

Fecha de corte: 2026-08-03.  
Estado: evidencia técnica para B1-001 y B1-002.  
Regla: esta matriz describe capacidades documentadas, no permisos concedidos a las cuentas reales de AgenteFer. Cada integración externa todavía requiere una prueba con el recurso autorizado correspondiente.

## 1. Criterio de investigación

- Se usaron fuentes primarias del proveedor o estándar.
- Una capacidad documentada no se considera operativa hasta probar credenciales, permisos, región, cuota y versión reales.
- Los nombres de modelos, precios, límites y versiones son información cambiante; deben revisarse en cada incorporación de modelo y antes de producción.
- No se habilita automatización de Marketplace: Página de Facebook y Marketplace son superficies distintas.
- No se realizaron mutaciones en Meta, Supabase, EasyPanel, Vercel, Cloudflare ni GitHub durante esta revisión.

## 2. OpenAI

### Hechos verificados

- La familia GPT-5.6 incluye variantes Sol, Terra y Luna. Luna está orientada a tareas eficientes y de alto volumen.
- Responses API es la superficie recomendada para razonamiento, tool calling y continuidad multi-turn.
- GPT-5.6 admite niveles de reasoning effort; medium es el punto inicial equilibrado elegido para AgenteFer.
- Las herramientas de función admiten strict mode. El contrato operacional debe cerrar propiedades adicionales y declarar todos los campos requeridos; los campos opcionales pueden representarse con null.
- La continuidad puede usar previous_response_id. Cuando se usa conversación gestionada por API no debe combinarse con previous_response_id.
- Prompt Caching funciona mejor con prefijos estables: herramientas y política primero, datos dinámicos después. El uso debe medirse con cached_tokens y cache_write_tokens.
- Las entradas de Responses pueden incluir texto, imágenes y archivos, sujeto a la capacidad del modelo seleccionado.
- safety_identifier permite enviar un identificador estable y no reversible del actor, no PII directa.

### Decisión para AgenteFer

- Valor inicial de staging: AI_MODEL=openai:gpt-5.6-luna y AI_REASONING_EFFORT=medium.
- La familia y el modelo no se codifican dentro de la lógica del negocio.
- OpenAI usará un adaptador de Responses API que preserve elementos de razonamiento y tool calls requeridos para el siguiente turno.
- Se organizará el prompt con un prefijo estable para reutilizar cache. Cualquier breakpoint explícito se activa sólo después de medir tasa de acierto, latencia y costo.
- La API key permanece exclusivamente en el worker/backend autorizado.

### Fuentes oficiales

- [Latest model y parámetros](https://developers.openai.com/api/docs/guides/latest-model#update-api-and-model-parameters)
- [Guía de migración GPT-5.6](https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol)
- [Prompting GPT-5.6](https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6)
- [Function calling y strict mode](https://developers.openai.com/api/docs/guides/function-calling#strict-mode)
- [Migración a Responses](https://developers.openai.com/api/docs/guides/migrate-to-responses)
- [Herramientas](https://developers.openai.com/api/docs/guides/tools)
- [Estado de conversación](https://developers.openai.com/api/docs/guides/conversation-state)
- [Visión](https://developers.openai.com/api/docs/guides/images-vision)
- [Archivos de entrada](https://developers.openai.com/api/docs/guides/file-inputs)
- [Datos y retención de Responses](https://developers.openai.com/api/docs/guides/your-data#v1responses)
- [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
- [Precios](https://developers.openai.com/api/docs/pricing)
- [Referencia create response](https://developers.openai.com/api/reference/resources/responses/methods/create)

## 3. MiniMax

### Hechos verificados

- MiniMax expone interfaces compatibles con OpenAI y Anthropic.
- La documentación recomienda la ruta compatible con Anthropic para capacidades avanzadas de razonamiento; la ruta compatible con OpenAI también admite tools.
- MiniMax M3 admite entrada multimodal de texto, imagen y video, tool invocation y contexto de hasta un millón de tokens según su ficha oficial.
- La ruta compatible con OpenAI representa imagen mediante image_url y video mediante video_url para modelos capaces.
- El proveedor exige conservar la respuesta completa del asistente, incluidos razonamiento y tool calls, cuando el flujo continúa.
- El cache automático requiere prefijos estables y al menos 512 tokens; el orden recomendado es tools, system y mensajes dinámicos.
- La documentación anterior de M2.7 no debe usarse para negar la capacidad multimodal de M3. Cada modelo se gobierna por su perfil real.

### Decisión para AgenteFer

- El adaptador acepta cualquier identificador de modelo válido, por ejemplo AI_MODEL=minimax:MiniMax-M2.7-highspeed o AI_MODEL=minimax:MiniMax-M3.
- No existe una lista cerrada de modelos permitidos dentro del dominio.
- Si el modelo principal no tiene visión, AI_VISION_MODEL puede señalar otro modelo de la misma familia. Si no se define, hereda AI_MODEL.
- El adaptador no simula que M2.7 y M3 tienen las mismas capacidades.
- No habrá cambio silencioso de proveedor. Un fallback entre proveedores requiere configuración explícita, política de privacidad y auditoría.

### Fuentes oficiales

- [Guía de generación y modelos](https://platform.minimax.io/docs/guides/text-generation)
- [MiniMax M3](https://www.minimax.io/models/text/m3)
- [API compatible con OpenAI](https://platform.minimax.io/docs/api-reference/text-openai-api)
- [Prompt caching](https://platform.minimax.io/docs/api-reference/text-prompt-caching)
- [API overview](https://platform.minimax.io/docs/api-reference/api-overview)
- [Release notes de modelos](https://platform.minimax.io/docs/release-notes/models)

## 4. Meta: WhatsApp, Messenger y Página

### Hechos verificados

- WhatsApp Cloud API requiere un Meta business portfolio, WABA, número de negocio y permisos como whatsapp_business_management y whatsapp_business_messaging.
- Para producción, Meta recomienda token de system user en lugar de token temporal.
- La aplicación debe suscribirse al WABA y recibir mensajes/estados por webhook.
- Los eventos pueden contener texto, imagen, audio, documento, pedido y referencias de producto/publicación.
- Los estados pueden llegar fuera de orden; la reconciliación debe usar ID externo y timestamp, no orden de recepción.
- Dentro de la ventana de atención iniciada/refrescada por el usuario se puede responder conforme a política; fuera de ella, el negocio sólo puede usar mecanismos oficiales autorizados.
- Messenger requiere Page access token, pages_messaging y webhook. La identidad disponible es el PSID/nombre que Meta permita, no un dato inventado.
- La publicación en una Página usa la Graph API y permisos vigentes de Página. El permiso documentado no implica que la App real ya haya pasado revisión.

### Decisión para AgenteFer

- WhatsApp y Messenger serán reactivos: el cliente inicia la conversación; no se construyen campañas de spam.
- La elegibilidad de cada envío se valida fuera del LLM y queda auditada.
- El webhook verificará challenge y firma X-Hub-Signature-256 sobre el body crudo, con comparación segura, idempotencia y límite de tamaño.
- El evento se persiste antes del trabajo asíncrono y la respuesta HTTP no espera al LLM.
- Las publicaciones programadas son de Página de Facebook, no mensajes masivos de WhatsApp.
- Marketplace queda NO-BUILD hasta encontrar una API oficial, permisos reales y una prueba específica para la cuenta.

### Fuentes oficiales

- [WhatsApp Business Platform — colección oficial Meta](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [WhatsApp Cloud API — documentación oficial Meta](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Cloud API overview](https://developers.facebook.com/docs/whatsapp/cloud-api/overview)
- [Webhooks de Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
- [Messenger Platform API — colección oficial Meta](https://www.postman.com/meta/messenger-platform-api/documentation/iyp204x/messenger-platform-api)
- [Messenger Platform overview](https://developers.facebook.com/docs/messenger-platform/overview)
- [Pages API posts](https://developers.facebook.com/docs/pages-api/posts)
- [Page feed reference](https://developers.facebook.com/docs/graph-api/reference/page/feed/)

## 5. Supabase y PostgreSQL

### Hechos verificados

- Los API keys nuevos distinguen publishable keys para cliente y secret keys para backend. La secret key ignora RLS y nunca debe llegar al navegador.
- Supabase retirará las legacy anon/service_role keys; el proyecto debe migrar antes de producción.
- En proyectos nuevos, una tabla no queda expuesta automáticamente a Data API: grants y RLS son controles separados y ambos deben configurarse.
- Supabase recomienda un esquema API dedicado cuando se necesita una superficie explícita; el resto puede vivir en un esquema privado.
- Auth SSR para Next.js usa clientes browser/server de @supabase/ssr; la protección server-side debe validar claims/usuario, y respuestas que renuevan cookies de sesión no se deben cachear públicamente.
- Storage no permite uploads sin políticas RLS. Un bucket público vuelve público el acceso de lectura al objeto, aunque la escritura siga protegida.
- Supabase Queues usa pgmq y ofrece entrega durable con visibility window. Leer un mensaje no lo elimina; el consumidor debe borrarlo o archivarlo al terminar.
- Supabase Cron usa pg_cron y puede ejecutar SQL, funciones o llamadas HTTP. La guía recomienda mantener pocos trabajos concurrentes y ejecuciones cortas.
- El flujo CLI recomendado versiona config, migraciones y seed, con entornos separados.

### Decisión para AgenteFer

- Supabase Postgres es la única fuente de verdad; no se crea otro PostgreSQL en EasyPanel.
- Datos internos viven en esquema privado. Sólo vistas/RPC estrictamente necesarias se exponen mediante esquema API con grants mínimos y RLS.
- Web usa publishable key. API y worker reciben secret keys separadas y de alcance operacional distinto cuando la plataforma lo permita.
- Originales y evidencia permanecen privados; derivados aprobados del catálogo pueden publicarse.
- La cola inicial será Supabase Queues/pgmq y el scheduler será Supabase Cron. Redis no se añade sin una necesidad medida.
- Toda migración que crea una tabla expuesta debe incluir grants, RLS, políticas y pruebas en el mismo cambio.

### Fuentes oficiales

- [API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migración a API keys nuevas](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Seguridad de Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Cambio de exposición automática de tablas](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)
- [Cambio de OpenAPI y anon key](https://supabase.com/changelog/42949-breaking-change-removing-access-to-openapi-spec-via-the-anon-key)
- [Auth SSR para Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Queues](https://supabase.com/docs/guides/queues)
- [pgmq](https://supabase.com/docs/guides/queues/pgmq)
- [Cron](https://supabase.com/docs/guides/cron)
- [CLI workflows](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments)
- [Breaking changes](https://supabase.com/changelog?types=breaking-change)

## 6. Runtime, framework y monorepo

### Hechos verificados

- Node.js 24, nombre Krypton, está en LTS en la fecha de corte. Node 26 es Current y no se selecciona para producción inicial.
- TypeScript 6.0 es la versión mayor actual y modifica defaults; la configuración debe declarar explícitamente target, module, types y rootDir.
- Fastify 5 usa JSON Schema para validación/serialización, hooks y logging con Pino. Los esquemas que alimentan su compilador deben ser código confiable, nunca contenido del usuario.
- Next.js 16 usa App Router y Turbopack por defecto; su mínimo de Node es 20.9.
- npm workspaces gestiona varios paquetes desde un package.json raíz, enlaza paquetes locales y ejecuta scripts por workspace.

### Decisión para AgenteFer

- Runtime: Node.js 24 LTS y TypeScript 6 en modo strict, ESM.
- Monorepo modular con npm workspaces; no Turborepo inicialmente porque npm y los pipelines dirigidos cubren la escala actual.
- Web: Next.js 16 App Router.
- API: Fastify 5.
- Worker: proceso Node independiente que consume cola durable.
- Las versiones exactas de cada paquete se fijarán en B1-004 después de revisar release, licencia y auditoría del árbol real.

### Fuentes oficiales

- [Versiones Node.js](https://nodejs.org/en/about/previous-releases)
- [TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [Fastify reference](https://fastify.dev/docs/latest/Reference/)
- [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [Next.js 16 upgrade](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [npm workspaces](https://docs.npmjs.com/cli/using-npm/workspaces/)

## 7. Despliegue y perímetro

### Vercel

- Un monorepo puede vincular un proyecto a un Root Directory.
- Git genera Preview Deployments y la rama de producción se configura por separado.
- Variables se separan por Development, Preview y Production; un cambio sólo afecta nuevos deployments.
- Decisión: únicamente apps/web se despliega en un proyecto Vercel exclusivo de AgenteFer.

Fuentes:

- [Monorepos](https://vercel.com/docs/monorepos)
- [Git deployments](https://vercel.com/docs/git)
- [Environment variables](https://vercel.com/docs/environment-variables)
- [Deployment environments](https://vercel.com/docs/deployments/environments)

### EasyPanel

- Los servicios App pueden construir desde Git o Dockerfile, configurar variables, dominio, health, comando y réplicas.
- Dockerfile ofrece el control requerido para builds reproducibles y procesos no-root.
- Decisión: api y worker serán servicios separados dentro de agente-fer, cada uno con Dockerfile y variables mínimas. Sólo api tendrá dominio público.

Fuentes:

- [App services](https://easypanel.io/docs/services/app)
- [Builders](https://easypanel.io/docs/builders)

### Cloudflare

- El proxy de DNS para registros HTTP protege el origen y habilita controles de red.
- Full (strict) exige un certificado válido en el origen.
- Turnstile requiere validación server-side; los tokens duran cinco minutos y son de un solo uso.
- WAF y rate limiting dependen del plan y deben verificarse en la zona real.
- Decisión: Cloudflare cubrirá DNS, TLS, WAF/rate limits disponibles y Turnstile para flujos públicos de alto abuso. Workers no forman parte del baseline.

Fuentes:

- [Proxy status](https://developers.cloudflare.com/dns/proxy-status/)
- [Full strict](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)
- [Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/)
- [WAF](https://developers.cloudflare.com/waf/)
- [Custom rules](https://developers.cloudflare.com/waf/custom-rules/)
- [Turnstile Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)

## 8. Calidad, observabilidad y seguridad de entrega

### Hechos verificados

- Vitest admite cobertura V8/Istanbul y umbrales por líneas, funciones, ramas y statements.
- Playwright soporta Node 24 y pruebas reales de navegador.
- OpenTelemetry JavaScript ofrece trazas y métricas estables en Node; logs siguen en desarrollo y no sustituyen logging estructurado.
- OWASP API Security Top 10 destaca autorización, abuso de flujos sensibles y SSRF, relevantes para catálogo, pedidos, webhooks y media.
- GitHub rulesets puede exigir PR y status checks, bloquear force-push y aplicar code scanning.
- Las acciones de terceros deben fijarse por commit SHA y el workflow debe usar permisos mínimos.

### Decisión para AgenteFer

- Vitest: unitarias, integración y contratos de adaptadores.
- pgTAP/Supabase tests: constraints, funciones, grants y RLS.
- Playwright: catálogo, pedido, panel accesible y flujos E2E web.
- Evaluaciones del agente: comprensión natural, tools correctas, incertidumbre, prompt injection, costo y portabilidad entre modelos.
- Pino JSON: logs de aplicación; OpenTelemetry: trazas y métricas del API/worker.
- CI debe ejecutar format, lint, typecheck, unit, integration, build, e2e aplicable, secret scan, dependency audit y controles SQL antes de desplegar.

### Fuentes oficiales

- [Vitest coverage](https://vitest.dev/guide/coverage.html)
- [Playwright installation](https://playwright.dev/docs/intro)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [OpenTelemetry Node.js](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x03-introduction/)
- [GitHub rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use)
- [GitHub push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection)
- [GitHub supply-chain security](https://docs.github.com/en/code-security/concepts/supply-chain-security/supply-chain-security)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/)

## 9. Hallazgos y límites pendientes

| ID      | Hallazgo                                                                       | Impacto                         | Cierre                                                    |
| ------- | ------------------------------------------------------------------------------ | ------------------------------- | --------------------------------------------------------- |
| DOC-001 | Cuenta/App/Página/número Meta aún no están vinculados                          | no se conocen permisos reales   | B4-001 con recursos exclusivos AgenteFer                  |
| DOC-002 | Dominio y zona Cloudflare no están definidos                                   | no se configura edge/TLS        | registrar recurso y ejecutar B4-008                       |
| DOC-003 | Presupuesto y límites monetarios de IA no están definidos                      | no hay umbral final de gasto    | política B5-006/B7                                        |
| DOC-004 | Política comercial de reservas, impuestos, devoluciones y entrega está abierta | afecta esquema/checkout         | decisión de Fer antes del bloque correspondiente          |
| DOC-005 | MiniMax y OpenAI pueden cambiar modelos/capacidades                            | riesgo de drift                 | playbook de onboarding, contract tests y revisión fechada |
| DOC-006 | Publicación repetida debe respetar revisión y política vigentes de Meta        | riesgo de bloqueo/reputación    | capability matrix real y política configurable            |
| DOC-007 | Observability backend final no está seleccionado                               | exportador/retención pendientes | B1-007 sin bloquear instrumentación estándar              |

## 10. Veredicto

- B1-001 tiene evidencia oficial suficiente para seleccionar una fundación técnica.
- B1-002 puede ratificar Node/TypeScript, Next/Fastify, npm workspaces, Supabase Queues/Cron y los límites de despliegue.
- La investigación no autoriza todavía código de integración ni despliegue.
- La selección de modelo queda portable por configuración y contratos, no por bifurcaciones de negocio.
