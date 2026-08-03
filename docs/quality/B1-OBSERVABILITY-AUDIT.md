# AgenteFer — auditoría de observabilidad B1-007

Fecha: 2026-08-03.  
Raíz: `C:/Users/figod/Desktop/agentefer`.  
Rama: `develop`.  
Estado: `COMPLETE` local; publicación y CI remoto del cambio aún no ejecutados.

## Entregables

- Implementación: `packages/observability/src/`.
- Pruebas: `packages/observability/test/`.
- Contrato: `docs/architecture/OBSERVABILITY-CONTRACT.md`.
- Selección de dependencias: `docs/references/DEPENDENCY-SELECTION-B1-007.md`.
- Runtime: Pino 10.3.1, OpenTelemetry API 1.9.1 y Core 2.10.0.
- QA métricas: OpenTelemetry SDK Metrics 2.10.0 sólo como devDependency.

## Controles implementados

| Control                 | Evidencia                                                       |
| ----------------------- | --------------------------------------------------------------- |
| logging JSON            | wrapper Pino sin acceso público a logger raw ni mensaje libre   |
| redacción central       | claves/formatos sensibles, PII, raw content, errores y binarios |
| límites de sanitización | profundidad, claves, arrays, nodos, ciclos y getters            |
| taxonomía de errores    | code/category/retryable/severity con allowlists runtime         |
| request/trace IDs       | UUID/crypto y SpanContext válido                                |
| propagación API→worker  | carrier W3C real con inject/extract y rechazo fail-closed       |
| contexto async          | AsyncLocalStorage probado con operaciones concurrentes          |
| métricas base           | counters started/completed e histogram duration con SDK real    |
| control de cardinalidad | métricas sin request/trace/org/conversation/job/agent IDs       |
| neutralidad de backend  | ningún exporter, endpoint o credencial configurados             |

## Defectos detectados por QA y corrección raíz

1. Un teléfono representado como `bigint` evitaba la detección de string. Se corrigió haciendo que bigint atraviese el mismo sanitizador.
2. Una duración negativa incrementaba `completed` antes de fallar. Se movió toda validación antes del primer efecto métrico.
3. Una clave sensible cuyo valor era objeto podía filtrar campos internos neutros. Se movió la decisión por clave antes de discriminar el tipo del valor.
4. Categoría/severidad sólo estaban protegidas por TypeScript. Se agregaron allowlists runtime derivadas de las constantes exportadas.

Las regresiones se demostraron fallando contra el código previo y permanecen en la suite.

## Pruebas

- Archivos Vitest: 4.
- Casos aprobados: 12.
- Logger probado: Pino real escribiendo a un `Writable` real.
- Métricas probadas: MeterProvider, PeriodicExportingMetricReader e InMemoryMetricExporter oficiales.
- Carrier probado: W3C Trace Context oficial; no se simula una integración externa.
- Concurrencia: dos scopes asíncronos mantienen request IDs independientes.
- Casos adversarios: token, teléfono, correo, prompt, raw body string/objeto/array, binary, getter, ciclo, bigint, carrier mutilado y taxonomía inválida.

## Cobertura informativa

| Medida     | Resultado |
| ---------- | --------: |
| statements |    87.50% |
| branches   |    73.29% |
| functions  |    92.15% |
| lines      |    87.33% |

No se inventa un threshold de release en B1. La estrategia mantiene cobertura como señal y exige pruebas de riesgo/contrato; los umbrales definitivos se fijarán con el conjunto funcional real.

## Gate global ejecutado

`npm run verify` aprobado:

- Prettier: aprobado;
- ESLint: aprobado;
- TypeScript strict: config y observability aprobados;
- fronteras: 9 workspaces verificados;
- workspaces activos: config y observability;
- Vitest global: 27 pruebas aprobadas;
- builds: config y observability aprobados;
- workflow policy: 1 workflow, todas las actions por SHA;
- `npm audit`: 0 vulnerabilidades;
- `npm audit --omit=dev`: 0 vulnerabilidades.

Supply chain tras la instalación:

- firmas registry verificadas: 449;
- attestations verificadas: 109.

Escaneos versionables:

- secretos plausibles literales: 0;
- marcadores de proyectos ajenos conocidos: 0;
- `git diff --check`: aprobado.

## Límites honestos

- API y worker ya consumen logger y readiness; por ahora sólo implementan el runtime/health mínimo de B1-008.
- La prueba API→worker cubre el contrato de carrier, no enqueue/consume pgmq.
- No existe SDK Node, instrumentación automática, OTLP exporter ni backend.
- No existen dashboards, retención, sampling, SLOs o alertas.
- No se tocó Supabase, EasyPanel, Meta, Cloudflare ni Vercel.
- No se creó commit ni se ejecutó CI remoto para este cambio local.

## Veredicto

- B1-007: aprobado localmente contra su entregable y validación requeridos.
- Riesgo TM-019: mitigación base implementada y probada; validación end-to-end permanece en B8/staging.
- Siguiente bloque: B1-008, artefactos Docker separados, non-root, health/readiness y build reproducible.

## Addendum B1-008

Se añadió una primitiva de readiness sin dependencias y su prueba. El paquete tiene ahora 5 archivos Vitest y 13 casos; la suite global tiene 30. Los 12 casos y cifras de cobertura anteriores corresponden al cierre original de B1-007.
