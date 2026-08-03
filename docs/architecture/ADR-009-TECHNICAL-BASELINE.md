# ADR-009 — fundación técnica de AgenteFer

Estado: aceptada para scaffold de staging.  
Fecha: 2026-08-03.  
Ratifica: ADR-001 a ADR-004 de SYSTEM_CONTEXT.md.  
Evidencia: docs/references/OFFICIAL_DOCUMENTATION_REVIEW.md.

## Contexto

AgenteFer requiere:

- catálogo y panel accesibles;
- webhooks rápidos y verificables;
- procesamiento durable de LLM, medios y publicaciones;
- transacciones fuertes para precio, inventario y pedidos;
- despliegues separados para web, API y worker;
- una sola base de datos y cero mezcla con otros proyectos;
- pruebas, seguridad y observabilidad desde el scaffold.

La escala inicial no justifica microservicios, Redis, Kubernetes ni un orquestador adicional. Sí requiere límites claros porque los webhooks, el agente y las mutaciones comerciales tienen perfiles de riesgo diferentes.

## Decisión

### Runtime y lenguaje

- Node.js 24 LTS.
- TypeScript 6, strict y ESM.
- npm con lockfile y workspaces.

La elección unifica contratos y tipos entre web, API, worker y adaptadores. Python no forma parte de la arquitectura de aplicación.

### Estructura planeada del repositorio

La estructura se materializa en B1-003; estos nombres son un contrato arquitectónico, no componentes ya creados:

    apps/
      web/
      api/
      worker/
    packages/
      ai/
      config/
      contracts/
      database/
      domain/
      observability/
    evals/
    supabase/
      migrations/
      tests/
    docs/

Responsabilidades:

- apps/web: catálogo público, QR, pedido y panel accesible.
- apps/api: webhooks, autenticación, endpoints públicos/admin, health y enqueue.
- apps/worker: LLM, tool loop, medios, outbox, publicaciones, notificaciones y reconciliación.
- packages/domain: invariantes comerciales sin dependencias de HTTP, UI o proveedor LLM.
- packages/contracts: contratos de borde y tools.
- packages/ai: runtime cognitivo, adaptadores de proveedor y políticas versionadas.
- packages/database: acceso a datos, transacciones y tipos generados.
- packages/config: validación/redacción de configuración por proceso.
- packages/observability: logging, trazas, métricas y correlación.

No se importa código, configuración ni dependencia desde otro repositorio.

### Web

- Next.js 16 con App Router.
- Despliegue en un proyecto Vercel exclusivo, con Root Directory apps/web.
- Desarrollo/Preview/Production usan variables distintas.
- El navegador sólo recibe publishable key y datos públicos mínimos.
- Las mutaciones sensibles pasan por API/RPC autorizada; precio y stock se recalculan server-side.

### API

- Fastify 5.
- JSON Schema confiable para validación y serialización de bordes.
- Body crudo disponible exclusivamente donde la firma de webhook lo requiera.
- Logging JSON redactado con request_id y trace_id.
- El webhook autentica, aplica límites, persiste inbox idempotente, encola y responde rápido.
- Ningún request de Meta espera al LLM o al procesamiento de imágenes.

### Worker

- Proceso Node independiente.
- Consume trabajos con visibility timeout, lease operativo, idempotencia y máximo de intentos.
- Ejecuta el ciclo LLM/tool bajo presupuesto, timeout y allowlist.
- Revalida estado antes de cada efecto externo.
- Archiva/elimina el mensaje de cola sólo después de persistir el resultado.
- Los efectos inciertos pasan a conciliación; no se repiten ciegamente.

### Datos, Auth, Storage, cola y scheduler

- Supabase Postgres es la fuente de verdad única.
- Auth y Storage pertenecen al mismo proyecto Supabase de AgenteFer por entorno.
- Esquema privado para dominio; esquema API mínimo para vistas/RPC expuestas.
- Grants y RLS se escriben y prueban junto a cada migración.
- Supabase Queues/pgmq es la cola durable inicial.
- Supabase Cron dispara schedules y conciliadores; el trabajo pesado permanece en worker.
- Transacciones de inventario, reservas, pedidos y precios viven en PostgreSQL.
- No se despliega PostgreSQL ni Redis en EasyPanel inicialmente.

### Despliegue

- apps/api → servicio EasyPanel agente-fer/api.
- apps/worker → servicio EasyPanel agente-fer/worker.
- apps/web → proyecto Vercel exclusivo por crear y registrar.
- Dockerfiles multi-stage, proceso no-root, health y readiness.
- Sólo API tiene ruta pública; worker no expone dominio.
- develop despliega únicamente staging. main queda reservada para producción separada.
- Cloudflare cubrirá el dominio público cuando exista: DNS proxy, TLS Full strict, controles WAF/rate limit disponibles y Turnstile en flujos de abuso.

### Observabilidad

- Pino JSON para logs.
- OpenTelemetry para trazas y métricas de Node.
- Correlación mínima: request_id, trace_id, organization_id seguro, conversation_id, job_id y agent_run_id cuando apliquen.
- Texto completo, teléfonos, medios, tokens, prompts con PII y bodies crudos no se registran por defecto.

## Alternativas descartadas

### Repositorios separados

Descartados porque romperían contratos atómicos, trazabilidad y la frontera solicitada. Un solo monorepo no significa un solo proceso desplegado.

### Microservicios por módulo

Descartados en etapa inicial: aumentan fallos distribuidos y operación sin evidencia de escala. Se usa monolito modular con tres artefactos.

### Python para el agente

Descartado para esta plataforma. La cognición pertenece al LLM y la ejecución determinista comparte TypeScript con los contratos del sistema.

### Redis/BullMQ

Descartado inicialmente porque Supabase Queues/pgmq y Cron cubren durabilidad/scheduling sin una base adicional. Se reevalúa sólo con métricas que demuestren una limitación.

### Turborepo

Descartado inicialmente: npm workspaces y pipelines por workspace son suficientes. Puede adoptarse mediante ADR si el tiempo de CI lo justifica.

### Cloudflare Workers como backend principal

Descartado del baseline porque API/worker ya están destinados a EasyPanel/Hetzner. Cloudflare se usa como perímetro, no como una cuarta runtime.

### LLM dentro del webhook

Descartado por latencia, reintentos del proveedor, costo y duplicación de efectos.

## Consecuencias

Positivas:

- contratos compartidos y builds reproducibles;
- base de datos única;
- API y worker escalan/reinician por separado;
- menor infraestructura inicial;
- límites de seguridad claros.

Costos:

- tres artefactos y configuraciones por entorno;
- disciplina estricta de contratos, migraciones y colas;
- OpenTelemetry ESM requiere verificar inicialización antes del código de aplicación;
- producción requiere nuevos recursos Supabase/EasyPanel/Vercel y secretos, no una promoción sobre staging.

## Gates antes de implementar

- B1-003 debe crear exactamente los límites ratificados o proponer un ADR sustituto.
- B1-004 debe fijar versiones exactas después de auditar el árbol real.
- B1-005 debe definir variables por proceso sin secretos.
- B1-006 debe bloquear cambios que fallen pruebas o seguridad.
- No se crean servicios EasyPanel hasta tener Dockerfiles y health checks verificados.
