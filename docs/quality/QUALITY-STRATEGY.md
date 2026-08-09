# AgenteFer — estrategia de calidad y QA

Estado: baseline para B1-006 y todos los bloques.  
Fecha: 2026-08-03.  
Principio: un resultado sólo está completo cuando existe evidencia reproducible del riesgo que afirma cubrir.

## 1. Gates universales

Todo cambio de código debe ejecutar, según alcance:

1. format check;
2. lint;
3. TypeScript typecheck;
4. pruebas unitarias;
5. pruebas de integración;
6. build reproducible;
7. escaneo de secretos;
8. auditoría de dependencias;
9. pruebas SQL/RLS si afecta datos;
10. contract/eval si afecta IA o proveedor;
11. Playwright/accesibilidad si afecta web;
12. build/scan de contenedor si afecta API/worker.
13. escenarios Gherkin parseados y vinculados al flujo si cambia negocio;
14. mutation testing sobre código y constraints críticos;
15. concurrencia real si existe unicidad, saldo, reserva, lease o idempotencia disputable.

No se cierran gates omitiendo una suite fallida. Un skip exige motivo, alcance y aprobador documentados.

## 2. Pirámide de pruebas

### Unitarias

- funciones puras del dominio;
- dinero, cantidades, estados e idempotency keys;
- autorización y policy evaluadas con entradas explícitas;
- normalización/redacción;
- transformación de contratos de proveedor.

No reemplazan una integración real con mocks. Los adaptadores externos necesitan su contract test real.

Mutation testing es obligatorio sobre el código crítico modificado. La suite no se considera fuerte si un mutante equivalente al defecto que pretende prevenir sobrevive sin una excepción explícita revisada.

### Integración

- PostgreSQL real local/staging mediante migraciones;
- transacciones concurrentes de stock/reserva;
- grants y RLS;
- pgmq: read, visibility, archive/delete y retry;
- Fastify: raw body, firma, límites y persistencia;
- Supabase Auth/Storage con recursos de AgenteFer autorizados;
- OpenAI/MiniMax/Meta en staging cuando existan credenciales reales.

### End-to-end

- mensaje entrante → inbox → cola → worker → LLM/tools → DB → outbox;
- catálogo → variante/cantidad → recálculo → pedido → notificación;
- comando Fer → desambiguación → mutación → auditoría;
- publicación Página → ID externo → contexto de Messenger;
- fallos de proveedor, reintentos y conciliación.

## 3. Umbrales

### Cobertura de código

Mínimo inicial:

- líneas: 90%;
- statements: 90%;
- funciones: 90%;
- ramas: 85%;

Módulos críticos —autorización, inventario, precio, firma/idempotencia, tool guard y aislamiento— deben cubrir el 100% de sus ramas conocidas. El porcentaje no sustituye pruebas adversariales ni revisión.

### Seguridad

- cero secretos detectados;
- cero vulnerabilidades critical/high no corregidas o aceptadas explícitamente;
- cero tablas expuestas sin grants/RLS probado;
- cero herramientas administrativas disponibles a cliente;
- cero cruce de organización;
- cero webhook aceptado con firma inválida;
- cero duplicación en escenarios idempotentes.

### Agente

Gates absolutos:

- 100% de denegación en tool overreach administrativo;
- 100% de reconocimiento de tool failure, sin éxito inventado;
- 100% de conservación de producto/cliente correcto en casos diferidos;
- 0 afirmaciones fabricadas de precio, stock o compatibilidad;
- 0 exposición de secretos.

La tasa objetivo de resolución comercial se define después del primer baseline real y nunca puede compensar una falla de seguridad.

### Accesibilidad

- WCAG 2.2 AA;
- navegación completa por teclado;
- foco visible y orden lógico;
- nombres/etiquetas accesibles;
- controles táctiles apropiados;
- errores y estados anunciados;
- pruebas con lector de pantalla y UAT accesible con Fer antes de producción.

### Performance y resiliencia

No se inventan SLOs sin medición. B1-007/B4 deben obtener baseline real para:

- aceptación de webhook;
- edad de cola;
- tiempo a primera respuesta;
- duración/costo de agent run;
- ejecución de tool;
- consulta de catálogo/pedido;
- tasa de retry/dead-letter;
- cache hit ratio.

Después se fijan presupuestos y alertas mediante ADR/runbook.

## 4. Matriz por superficie

| Superficie   | Suite mínima                                                |
| ------------ | ----------------------------------------------------------- |
| Dominio      | unitarias, propiedades, concurrencia donde aplique          |
| SQL/RLS      | migrate/reset, pgTAP, positivo/negativo/cross-org           |
| API          | request injection real, firma, límites, errores, auth       |
| Worker/queue | integración pgmq, crash/retry/dedupe/conciliación           |
| LLM          | contract tests reales, evals, tool safety, costo/cache      |
| Meta         | fixtures oficiales más evento real staging; firma y estados |
| Web          | component/integration, Playwright, a11y, mobile, headers    |
| Contenedor   | build, non-root, health/readiness, scan                     |
| Deploy       | rama/destino, smoke, rollback, correlación a commit         |

Para SQL/RLS, CI ejecuta además mutación de constraints/policies/triggers y carreras PostgreSQL reales cuando el modelo depende de unicidad o serialización. Los tests remotos usan transacciones con `ROLLBACK`; no dejan fixtures.

Fixtures oficiales sirven para reproducir formatos; no demuestran que una credencial o permiso real funcione. La aceptación externa exige prueba staging.

## 5. Datos de prueba

- Nunca copiar datos productivos no anonimizados.
- Las cinco imágenes entregadas se usarán sólo después de ingesta autorizada con hash/procedencia.
- IDs, teléfonos y PII de pruebas se aíslan al entorno.
- Una prueba no deja publicaciones, conversaciones, pedidos o archivos huérfanos.
- Las suites que producen efectos externos usan prefijo/etiqueta de staging y cleanup dirigido sólo a sus propios recursos.

## 6. CI

El pipeline planeado:

- dispara sobre PR hacia develop/main y pushes autorizados;
- usa permisos mínimos;
- fija third-party Actions por commit SHA;
- cancela ejecuciones obsoletas sin interrumpir un deploy activo;
- no entrega secretos productivos a PR;
- conserva reportes de test, coverage, security y build;
- bloquea deploy si falla un required check;
- liga imagen/deployment a commit y digest.

Orden recomendado:

    validate-boundary
    install-reproducible
    format-lint-typecheck
    unit-coverage
    database-integration
    build
    security
    e2e
    deploy-staging
    smoke

Los jobs se separarán cuando existan package.json, lockfile y código real; este documento no presenta un pipeline simulado.

## 7. Evidencia por bloque

Cada cierre registra:

- requisito/BL/SC;
- archivos modificados;
- comandos exactos;
- versión/commit;
- entorno y recurso;
- resultados y artefactos;
- hallazgos;
- recuperación/rollback;
- limitaciones pendientes.

El archivo PROGRESS sólo cambia a completado cuando la evidencia existe.

## 8. Release

La promoción se bloquea si:

- hay test requerido fallido/omitido;
- existe hallazgo critical/high no resuelto;
- falta RLS o aislamiento;
- el proveedor/modelo no pasó contratos/evals;
- no hay rollback/restore;
- el destino no está registrado;
- develop intenta tocar producción;
- no existe UAT accesible con Fer.

RELEASE_SECURITY_CHECKLIST.md es la lista final vinculante.
