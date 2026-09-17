# QA — Worker Idle Backoff

## Estado

**Listo para revisión técnica. No desplegado.**

Este bloque reduce las consultas vacías recurrentes del worker sin cambiar datos,
esquemas, credenciales, integraciones de Meta o configuraciones remotas.

## Hallazgo que motivó el cambio

El worker ejecutaba seis operaciones de reclamación de cola por segundo aun cuando
no existía trabajo: dos de entrada Meta/WhatsApp, una de medios y tres del agente.
El origen era un intervalo fijo de un segundo, no tráfico real de clientes.

La corrección conserva la reacción inmediata al trabajo y aplica espera adaptativa
en reposo:

| Grupo | Intervalo base | Máximo en reposo | Jitter |
| --- | ---: | ---: | ---: |
| Entrada Meta/WhatsApp | 1 s | 5 s | 10 % |
| Medios, IA y publicación | 1 s | 60 s | 10 % |

Una entrega observada despierta localmente al consumidor siguiente. Cada proceso
mantiene una sola reclamación en vuelo; no se introdujo concurrencia adicional ni
se comparten señales entre organizaciones.

## Evidencia ejecutada

| Control | Resultado |
| --- | --- |
| Formato del repositorio | `npm run format:check` — PASS |
| Lint worker | `npm run lint --workspace @agentefer/worker` — PASS |
| Lint configuración | `npm run lint --workspace @agentefer/config` — PASS |
| Tipos worker | `npm run typecheck --workspace @agentefer/worker` — PASS |
| Tipos configuración | `npm run typecheck --workspace @agentefer/config` — PASS |
| Pruebas dirigidas | 7 archivos, 145 pruebas — PASS |
| Cobertura completa | 46 archivos, 1,141 pruebas — PASS |
| Gherkin | 21 features, 398 escenarios, 0 errores de parseo — PASS |
| Arranque de proceso | API y worker en puertos TCP efímeros — PASS |
| Mutation testing del scheduler | 111 killed, 1 timeout, 0 survived; 100 % efectivo — PASS |

Cobertura global medida con V8: statements 91.04 %, branches 86.59 %, functions
93.84 % y lines 91.09 %. Las rutas añadidas del scheduler tienen pruebas de
retroceso exponencial, saturación, jitter, recuperación al encontrar trabajo,
señal local, apagado, configuración inválida y limpieza de listeners.

## Escenarios de aceptación

`features/worker_idle_backoff.feature` cubre el reposo, recuperación por trabajo,
señales internas, fallo transitorio y apagado. El contrato se valida con:

```powershell
npm run verify:acceptance-contract
```

## Gate de seguridad pendiente

`npm run audit` no está verde por dependencias existentes fuera de este bloque:

- crítica: `next@16.2.12`;
- altas: `sharp@0.35.3` y `js-yaml@4.3.1`;
- moderada: Vitest/@vitest-mocker.

No se aplicó `npm audit fix --force`, porque cambiaría dependencias compartidas y
podría alterar el catálogo que ya tenía cambios ajenos. Este hallazgo bloquea un
despliegue enterprise hasta resolverlo en un bloque de actualización y regresión
de dependencias separado.

## Procedimiento reproducible

```powershell
npm run format:check
npm run lint --workspace @agentefer/worker
npm run lint --workspace @agentefer/config
npm run typecheck --workspace @agentefer/worker
npm run typecheck --workspace @agentefer/config
npx vitest run apps/worker/test/adaptive-polling.test.ts apps/worker/test/meta-inbound-processor.test.ts apps/worker/test/media-ingest-processor.test.ts apps/worker/test/whatsapp-ai-processor.test.ts apps/worker/test/facebook-publication-processor.test.ts apps/worker/test/publication-notification-processor.test.ts packages/config/test/environment.test.ts
npm run test:coverage
npm run verify:acceptance-contract
npm run verify:process-runtime
npx stryker run stryker.worker-idle-backoff.config.mjs
npm run audit
```

Después de una autorización explícita de despliegue, comparar durante 24 horas las
métricas reales de operaciones de cola, egress y latencia de entrega. La estimación
en reposo es aproximadamente 0.47 reclamaciones por segundo tras alcanzar el
backoff, frente a 6 por segundo antes del cambio; es una estimación de diseño, no
una medición de producción.
