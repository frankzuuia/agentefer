# AgenteFer — control adaptativo de sondeo del worker

## Estado y alcance

Este bloque corrige el consumo de salida de Supabase causado por sondeos vacíos
del worker. Aplica únicamente a los consumidores durables de AgenteFer: entrada
Meta/WhatsApp, ingesta de medios, turnos y outbox de WhatsApp, publicaciones de
Facebook y notificaciones de lotes. No cambia tablas, RLS, contratos RPC,
credenciales, contenido comercial ni la semántica de leases.

La autopsia de `pg_stat_statements` del proyecto AgenteFer confirmó millones de
claims vacíos desde finales de agosto. El origen es que los cinco procesadores
comparten un intervalo fijo de un segundo y continúan consultando aun sin trabajo.

## Reglas operativas

- **WIB-001 — Sondeo inicial inmediato:** cada consumidor conserva un primer
  ciclo al arrancar para recuperar leases vencidos y trabajo existente.
- **WIB-002 — Actividad reinicia la latencia:** un ciclo que procesa, recupera o
  deja disponible trabajo vuelve al intervalo base configurado.
- **WIB-003 — Reposo reduce egress:** ciclos vacíos o fallidos aumentan
  progresivamente su espera, con jitter acotado, hasta su máximo configurado.
- **WIB-004 — Respuesta comercial protegida:** entrada Meta tiene un máximo de
  respaldo de cinco segundos por defecto. Las colas secundarias tienen sesenta
  segundos por defecto, pero una señal local las despierta sin esperar cuando el
  consumidor anterior produjo trabajo.
- **WIB-005 — No se pierde trabajo:** una señal durante una espera cancela esa
  espera; una señal antes de que empiece queda pendiente para el siguiente ciclo.
  El sondeo de respaldo permanece activo para recuperaciones, reintentos y
  cambios externos a este proceso.
- **WIB-006 — Fallo no provoca tormenta:** un fallo operativo conserva readiness
  degradado y también usa el backoff; no se convierte en una ráfaga de reintentos
  contra una dependencia caída.
- **WIB-007 — Observabilidad:** cada decisión registra resultado del ciclo,
  racha de reposo y próxima espera; las operaciones de espera separan actividad,
  reposo y fallo para poder medir ciclos vacíos y latencia programada.

## Configuración dinámica

| Variable                             | Valor por defecto | Propósito                                          |
| ------------------------------------ | ----------------: | -------------------------------------------------- |
| `WORKER_META_POLL_INTERVAL_MS`       |          1,000 ms | intervalo base de todos los consumidores           |
| `WORKER_META_IDLE_BACKOFF_MAX_MS`    |          5,000 ms | máximo de respaldo para entrada Meta               |
| `WORKER_ASYNC_IDLE_BACKOFF_MAX_MS`   |         60,000 ms | máximo de respaldo para medios, IA y Facebook      |
| `WORKER_IDLE_BACKOFF_JITTER_PERCENT` |               10% | dispersa workers simultáneos sin exceder su máximo |

Los límites se validan al arrancar: cada máximo debe ser igual o mayor al
intervalo base y los valores están acotados por las protecciones operativas del
worker. Los valores por defecto entran automáticamente al desplegar la nueva
versión; no requieren editar secretos ni datos.

## Flujo y aislamiento

```text
Meta webhook durable -> meta inbound -> wake(media, whatsapp-ai)
media terminada      -> wake(whatsapp-ai)
publicación terminada -> wake(resumen de publicación)
```

Las señales son sólo memoria local del proceso y no transportan payload,
identificadores de cliente, secreto ni organización. No sustituyen los claims
atómicos ni los leases de PostgreSQL; sólo evitan esperar el siguiente sondeo
cuando el productor y consumidor coexisten en el mismo worker.

## Matriz de escenarios

| Escenario             | Resultado verificable                                                      |
| --------------------- | -------------------------------------------------------------------------- |
| Cola vacía sostenida  | la espera crece hasta el máximo y no se excede                             |
| Trabajo encontrado    | la racha se reinicia y se usa el intervalo base                            |
| Señal durante espera  | el consumidor despierta una vez sin ejecutar ciclos concurrentes           |
| Señal antes de espera | queda coalescida para el siguiente ciclo                                   |
| Dependencia fallida   | readiness queda degradado y no hay sondeo por segundo                      |
| Detención             | timer, listener y señal pendiente no generan otro ciclo                    |
| Dos workers           | el jitter evita sincronía; los claims/leases continúan siendo la autoridad |

## Límites de este bloque

No se expone un endpoint público de wake ni se agrega una dependencia externa.
Una señal entre contenedores API y worker requeriría un contrato autenticado,
rate limiting, despliegue y pruebas E2E propios; se evaluará como bloque separado
si la medición posterior exige menor latencia que el respaldo de cinco segundos.
