# AgenteFer — contrato de observabilidad B1-007

Fecha: 2026-08-03.  
Estado: implementación compartida; adopción por proceso y exportador pendientes.  
Paquete: `@agentefer/observability`.

## Propósito y frontera

El paquete define logging estructurado, taxonomía de errores, correlación W3C y métricas base sin conocer HTTP, Supabase, Meta, proveedores LLM ni reglas comerciales. No depende de ningún paquete interno, por lo que `web`, `api`, `worker`, `ai` y `database` pueden consumirlo sin crear ciclos.

La biblioteca no configura un backend de observabilidad. El SDK, instrumentaciones y exportadores deben inicializarse en el entrypoint de cada proceso antes de importar Fastify, el worker o clientes instrumentados. Esta decisión conserva portabilidad OTLP y evita enviar telemetría accidentalmente a un destino no aprobado.

## Logging estructurado

La única fábrica pública es `createStructuredLogger`. El wrapper no expone la instancia Pino ni acepta un mensaje libre. Cada registro contiene:

- `component` y entorno validado cuando se declara;
- `event` como identificador operativo validado;
- `outcome` de taxonomía cerrada;
- correlación activa cuando aplica;
- atributos bajo `attributes` después de sanitización central;
- taxonomía segura de error, nunca el objeto `Error` original.

Pino emite JSON con timestamp ISO. Su configuración de `redact` es defensa adicional; la frontera primaria es el sanitizador no mutante ejecutado antes de entregar datos a Pino.

## Política de redacción

Se redactan por defecto:

- authorization, cookies, passwords, secrets, tokens y credenciales por nombre/formato;
- teléfonos, correos y nombres de clientes;
- prompts, mensajes, texto, OCR, transcripts, bodies, payloads y contenido crudo;
- audio, imágenes, documentos, media, buffers y vistas binarias;
- message, stack y cause de errores;
- strings largos u opacos con apariencia de credencial.

La clave sensible elimina el valor completo aunque sea objeto o array. El recorrido tiene límites de profundidad, claves, arrays y nodos; detecta ciclos y no ejecuta getters. Los identificadores de correlación sólo sobreviven si usan el alfabeto y longitud operativos permitidos.

No deben pasarse cuerpos completos con la expectativa de que el logger sea almacenamiento. La aplicación debe registrar conteos, estados y referencias seguras; conversaciones y medios pertenecen a sus almacenes con retención propia.

## Taxonomía de errores

`OperationalError` contiene únicamente:

- `code`: identificador estable y seguro;
- `category`: validation, authentication, authorization, conflict, rate_limit, dependency, timeout o internal;
- `retryable`: decisión determinista del adaptador;
- `severity`: warning, error o critical;
- `cause`: disponible para control interno, nunca serializada por el logger.

Categoría y severidad se validan también en runtime. Un error desconocido se transforma en `UNCLASSIFIED_ERROR/internal/error` sin mensaje ni stack. Esta taxonomía no genera respuestas públicas; los contratos HTTP/canal definirán la respuesta apropiada en sus bloques.

## Correlación API → worker

`createCorrelationScope` crea `request_id` mediante UUID criptográfico y un contexto de traza válido cuando no existe uno activo. `injectCorrelation` serializa el contexto mediante el propagador W3C oficial; `extractCorrelation` falla cerrado ante `traceparent` inválido o `request_id` ausente.

Carrier interno:

| Campo                         | Obligatorio | Uso                         |
| ----------------------------- | ----------- | --------------------------- |
| `traceparent`                 | sí          | contexto distribuido W3C    |
| `tracestate`                  | no          | estado W3C cuando exista    |
| `x-agentefer-request-id`      | sí          | correlación de operación    |
| `x-agentefer-organization-id` | no          | tenant seguro ya autorizado |
| `x-agentefer-conversation-id` | no          | conversación persistida     |
| `x-agentefer-job-id`          | no          | trabajo durable             |
| `x-agentefer-agent-run-id`    | no          | ejecución cognitiva         |

`AsyncLocalStorage` conserva el scope entre awaits concurrentes y OpenTelemetry conserva el `Context`. La prueba B1 valida serialización/extracción real del carrier compartido. No afirma todavía una integración pgmq: el schema de trabajo, enqueue transaccional y consumidor real pertenecen a B2/B3.

## Métricas base

`createOperationalMetrics` crea tres instrumentos estables:

| Instrumento                     | Tipo      | Atributos permitidos                                       |
| ------------------------------- | --------- | ---------------------------------------------------------- |
| `agentefer.operation.started`   | Counter   | component, operation                                       |
| `agentefer.operation.completed` | Counter   | component, operation, outcome, error.category cuando falla |
| `agentefer.operation.duration`  | Histogram | los mismos atributos de completed                          |

No se permiten IDs de request, traza, organización, conversación, job o agente en métricas: producirían alta cardinalidad y podrían filtrar contexto. La duración se valida antes de escribir cualquier instrumento, de modo que una observación inválida no altera contadores.

No se fijan SLOs, buckets, sampling ni alertas sin mediciones reales. Esos valores requieren baseline de staging y backend seleccionado.

## Inicialización futura por proceso

Cuando exista un proceso funcional, su entrypoint deberá:

1. cargar configuración validada del proceso;
2. inicializar `NodeSDK`, resource, sampler, lectores y exportadores aprobados;
3. registrar instrumentaciones antes de importar framework/clientes;
4. crear logger y métricas del componente;
5. manejar shutdown/flush con timeout;
6. arrancar la aplicación.

Las variables OTLP, credenciales y destino se agregarán al contrato de entorno sólo después de seleccionar el backend. Un destino ausente no puede provocar exportación silenciosa a localhost ni a infraestructura ajena.

## Gates de adopción

- API: cada request/webhook crea o extrae scope antes de log/enqueue.
- Worker: cada job extrae carrier, inicia span hijo y conserva IDs en efectos/auditoría.
- AI: modelo, policy version, tools, tokens/costo y cache se observan sin prompt ni respuesta cruda.
- Database: consultas/transacciones se trazan sin SQL parametrizado, valores ni secretos.
- Web: telemetría de navegador se evalúa aparte porque OpenTelemetry web permanece experimental.
- Producción: backend, retención, acceso, alertas, sampling y presupuesto requieren decisión explícita.
