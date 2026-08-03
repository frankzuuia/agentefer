# AgenteFer — reglas permanentes de construcción

## Frontera del proyecto

- La raíz autorizada es `C:\Users\figod\Desktop\agentefer`.
- El remoto autorizado es `https://github.com/frankzuuia/agentefer.git`.
- `develop` es desarrollo y `main` es producción.
- Todo cambio nuevo se construye y valida primero en `develop`.
- No hacer commits ni pushes directos a `main` sin instrucción explícita.
- Solo se pueden leer, modificar o desplegar recursos registrados explícitamente como propiedad de AgenteFer.
- Está prohibido incorporar referencias, dependencias, datos, secretos o configuraciones provenientes de cualquier otro proyecto.
- Antes de cualquier escritura, verificar raíz, rama, remoto y estado de Git.

## Método de trabajo

- Trabajar por bloques controlados y explicar cada movimiento antes de ejecutarlo.
- Inspeccionar archivos, esquemas, APIs y conexiones reales antes de diseñar cambios.
- Cero mocks, datos falsos o integraciones simuladas salvo autorización explícita.
- No asumir nombres de tablas, endpoints, variables, dominios ni capacidades de proveedores.
- Verificar tecnología cambiante con documentación oficial actual.
- Preservar cambios existentes del usuario y evitar refactors ajenos al bloque activo.
- Usar `apply_patch` para ediciones manuales de archivos.
- Cada bloque debe incluir validación, seguridad, evidencia de QA y resultado registrado.

## Arquitectura cognitiva

- El LLM es el cerebro cognitivo; el backend es el ejecutor determinista y seguro.
- Usar tool calling nativo para comprender solicitudes, elegir acciones y operar el catálogo.
- No usar regex ni árboles rígidos de `if/else` para adivinar intención, extraer entidades de conversación o generar respuestas comerciales.
- No hardcodear respuestas de negocio en el backend.
- No imponer esquemas rígidos que asfixien el razonamiento del modelo; los contratos de herramientas sí deben validar entradas y salidas operativas.
- El backend sí debe aplicar invariantes deterministas: autorización, idempotencia, límites, transacciones, stock no negativo, estados válidos, firmas y políticas de seguridad.
- Toda herramienta del agente debe estar permitida explícitamente, limitada al negocio correcto y registrada en auditoría.

## Seguridad desde la primera línea

- Nunca escribir secretos, tokens, contraseñas o claves privadas en Git, logs, respuestas o clientes públicos.
- La clave privilegiada de Supabase solo puede existir en servicios de backend autorizados.
- Toda tabla expuesta debe tener RLS y políticas de autorización verificadas.
- Verificar firma, frescura, idempotencia y procedencia de webhooks.
- Tratar imágenes, audios, texto, URLs y metadatos entrantes como contenido no confiable.
- Aplicar límites de tamaño, tipo, frecuencia, costo y concurrencia.
- Separar datos del propietario, clientes, conversaciones y operaciones por organización desde el modelo inicial.
- Acciones sensibles, destructivas, de publicación o de cambio comercial deben tener autorización y auditoría claras.
- En infraestructura, usar únicamente operaciones dirigidas al nombre exacto del recurso AgenteFer; nunca inventarios globales.

## Calidad y producción

- Mantener trazabilidad entre requisito, lógica de negocio, especificación, tarea, prueba y evidencia.
- Ejecutar typecheck, lint, pruebas, build, escaneo de secretos y auditorías aplicables antes de cerrar un bloque.
- Incluir observabilidad estructurada, `request_id`/`trace_id`, taxonomía de errores, métricas, health checks y procedimientos de recuperación.
- Mantener documentación de arquitectura, seguridad, operaciones, agente, decisiones y progreso.
- No declarar producción lista mientras existan hallazgos críticos/altos, requisitos sin cubrir o gates sin evidencia.
