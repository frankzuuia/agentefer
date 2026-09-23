# B3-006W — integridad del catálogo por WhatsApp

Fecha: 2026-09-23. Alcance: repositorio y Supabase vinculados a AgenteFer; rama `develop`.

## Autopsia y contrato

- La conversación reportada tardó aproximadamente 124 s para la primera respuesta y 60 s para la confirmación. El agente hizo varias rondas de proveedor, guardó una propuesta interna y no ejecutó la edición de foto solicitada. Esos tiempos provienen de los logs de la incidencia; no son una medición de la versión B3-006W.
- Había productos activos. La propuesta pendiente duplicaba sus nombres y contenía `products` como objeto `{ "item": [...] }`, no como arreglo. Su aplicación fallaba y el agente confundía ese estado interno con el catálogo visible.
- La herramienta nueva rechaza esa forma de JSON y cualquier alta nueva que colisione con un producto activo/pausado. Las propuestas históricas duplicadas se marcan como reemplazadas, conservando su contenido y auditoría; no se eliminan productos, fotos ni publicaciones.
- Para una foto verificada enviada por el dueño a uno o varios productos existentes, la tool nativa `catalog_add_photo_to_products` acepta una única llamada con variantes de productos distintos. La operación es atómica, limitada a la misma organización e idempotente al reintento. Mantiene el alcance `product` o `variant` según la petición; agregar foto no la vuelve principal sin instrucción expresa y nunca publica en Facebook por sí mismo.
- `catalog_edit_offer` conserva nombre, descripción, precio, estado y foto principal/quitar foto; su contrato nuevo ya no ofrece `add_photo`. El ejecutor de tools clasifica `ok=false` como fallo para todos los handlers, sin reportar un efecto confirmado. Las ejecuciones históricas conservan sus snapshots.
- El contexto de una lectura incluye imágenes procesadas y ofertas actuales. El prompt dirige a editar productos existentes y a confirmar sólo operaciones persistidas. La instrucción de recuperación del worker permite lote, sin la restricción anterior de una edición por ronda.
- Los logs del worker agregan duración del turno, duración de las llamadas al proveedor, ronda y número de solicitudes. No incluyen el mensaje ni el contenido de la imagen. Las pruebas de mutación pertenecen al pipeline de desarrollo; MiniMax no las ejecuta en WhatsApp.

## Evidencia reproducible previa al despliegue

| Puerta | Resultado observado |
| --- | --- |
| Worker focalizado | `npx vitest run apps/worker/test/whatsapp-ai-processor.test.ts`: 30/30 |
| Suite con cobertura | `npm run test:coverage`: 1,276/1,276; líneas 90.45%, ramas 86.21% |
| SQL vinculado | `npm run test:database:linked:rehearsal`: 145/145 y rollback |
| Editor anterior | Ensayo B3-006W con `b3_006f_catalog_owner_edit_test.sql`: 24/24 y rollback |
| Contratos de herramientas anteriores | Ensayo B3-006W con `b4_005_b4_006_owner_publication_tools_test.sql`: 26/26; con `b3_001a_read_only_agent_tools_test.sql`: 46/46; ambos con rollback |
| Mutación SQL crítica | `npm run test:database:linked:b3-006w-mutations`: base 145/145, 3 mutantes dirigidos a contrato, lote y clasificación de fallos; cada transacción revertida |
| Mutación worker focalizada | `npm run test:mutation:b3-006t`: 33/33 mutantes detectados; 100% en el alcance seleccionado |
| Contratos | `npm run verify:database-contract`: 62 migraciones ordenadas, 1,449 aserciones pgTAP; `npm run verify:acceptance-contract`: 25 archivos, 444 escenarios |
| Dependencias | `npm run audit`: 0 vulnerabilidades reportadas |
| Compilación, lint y formato | `npm run build`, `npm run typecheck`, `npm run lint`, `npm run format:check`: aprobados |

Objetivo por riesgo: todas las rutas nuevas de edición atómica, aislamiento, replay y colisión de alta tienen aserciones directas; la cobertura global no sustituye esas pruebas. El ensayo usa datos transitorios dentro de una transacción con rollback. No envía mensajes de WhatsApp ni publica en Facebook.

## Frontera de despliegue y recuperación

El historial remoto de Supabase contiene versiones que no están en el árbol local y nueve archivos locales antiguos no figuran en ese historial. El ensayo los enumera y sólo prueba B3-006W, posterior al último registro remoto `20260922210000`. No se usó `migration repair` ni se reescribió historia antigua. El despliegue preparado comprueba proyecto, rama, remoto, árbol limpio, commit subido y versión previa exacta; aplica únicamente B3-006W con su registro en una transacción. Si cambia la versión previa o falla la migración, debe detenerse sin desplegar el worker.

La excepción previamente autorizada por el dueño permite el despliegue de desarrollo con pruebas focalizadas en lugar de esperar el ciclo global de mutación, y antes de la prueba real de WhatsApp. No sustituye esa prueba. Queda pendiente medir con mensajes del dueño la latencia real, comprobar ambas fotos en panel y QR, verificar que no aparece otra alta ni publicación Facebook y revisar `agent_run_id`, `tool_round`, `provider_request_count`, `provider_duration_ms` y `duration_ms` si tarda o falla. Sólo el dueño enviará esos mensajes de prueba.
