# language: es
Característica: Runtime cognitivo durable y neutral de proveedor para AgenteFer
  Como propietario del negocio
  Quiero que el asistente razone con el modelo configurado y ejecute tools versionadas
  Para atender, vender y administrar sin inventar datos ni repetir efectos externos

  Regla: La configuración cognitiva es versionada, inmutable y reproducible

    Escenario: Activar la primera configuración de negocio
      Dado que un administrador registra un documento válido con su contrato de validación
      Cuando activa su primera versión
      Entonces la raíz apunta a esa versión inmutable
      Y el documento privado no aparece en una vista pública

    Escenario: Cambiar configuración con control optimista
      Dado que una configuración activa apunta a una versión conocida
      Cuando el administrador crea otra versión indicando esa versión esperada
      Entonces la nueva versión se activa sin reescribir la anterior

    Escenario: Rechazar una edición concurrente obsoleta
      Dado que otro proceso ya activó una versión más reciente
      Cuando un administrador intenta cambiar desde una versión esperada obsoleta
      Entonces la operación falla por conflicto de estado
      Y ninguna versión incompleta queda persistida

    Escenario: Revertir configuración sin borrar historia
      Dado que existe una versión anterior aprobada
      Cuando el administrador solicita rollback con una razón
      Entonces se crea una nueva versión que copia la anterior
      Y todas las versiones intermedias permanecen auditables

    Escenario: Registrar un prompt privado
      Dado un prompt operativo sin secretos
      Cuando se registra una versión
      Entonces se conserva su hash y contenido inmutable
      Y sólo el runtime privilegiado puede leer el contenido

    Escenario: Rechazar modificación del prompt histórico
      Dado un prompt ya utilizado por un run
      Cuando cualquier actor intenta sobrescribir su contenido
      Entonces PostgreSQL rechaza la modificación

    Escenario: Fijar contratos exactos de tools en una policy
      Dado que existen versiones activas de tools nativas
      Cuando se crea una policy con bindings de actor rol y canal
      Entonces la policy referencia versiones exactas y no nombres flotantes

    Escenario: Rechazar una ruta fallback mal formada
      Dado que la ruta de modelos no es un arreglo ordenado válido
      Cuando se intenta crear la policy
      Entonces la transacción falla antes de activar la policy

  Regla: Cada run conserva identidad exacta de modelo y contexto

    Escenario: Ejecutar con Luna medium y cache explícito
      Dado que la variable de entorno seleccionó un modelo Luna medium
      Cuando el backend encola un comando del dueño
      Entonces el run conserva proveedor modelo razonamiento y modo de cache exactos

    Escenario: Ejecutar con un modelo MiniMax futuro
      Dado que el adaptador soporta el contrato neutral
      Cuando la configuración indica un nombre de modelo MiniMax no conocido al crear el esquema
      Entonces el run acepta y conserva ese nombre sin migración de base de datos

    Escenario: Usar MiniMax M3 como modelo visual separado
      Dado un producto acompañado de imágenes
      Cuando el run declara proveedor y modelo visual MiniMax M3
      Entonces la identidad visual queda congelada independientemente del modelo de texto

    Escenario: Reproducir un enqueue idéntico
      Dado un run creado con una clave idempotente
      Cuando llega otra vez el mismo comando
      Entonces se devuelve el mismo run y el mismo job
      Y no se duplica trabajo

    Escenario: Rechazar reutilización distinta de la clave de run
      Dado un run creado con una clave idempotente
      Cuando la misma clave llega con otro modelo o payload
      Entonces se rechaza el conflicto

    Escenario: Crear snapshot en la primera conversación
      Dado un contacto activo que inicia una conversación WhatsApp abierta
      Cuando se encola su primer turno
      Entonces se fija la policy y todas las versiones activas de configuración

    Escenario: Mantener snapshot después de un cambio global
      Dado que una conversación ya tiene snapshot
      Y el administrador activó otra configuración global
      Cuando llega el siguiente turno de esa conversación
      Entonces conserva las versiones del snapshot original

    Escenario: Rechazar otra policy para una conversación fijada
      Dado que una conversación está fijada a una policy
      Cuando un proceso intenta encolar otro turno con distinta policy
      Entonces se rechaza el conflicto sin cambiar el snapshot

    Escenario: Rechazar contacto bloqueado
      Dado que la identidad de canal del contacto está bloqueada
      Cuando intenta iniciar un run
      Entonces no se crea run ni job

    Escenario: Rechazar conversación cerrada
      Dado que la conversación ya está cerrada
      Cuando llega una solicitud de turno sobre ella
      Entonces se rechaza antes de invocar un proveedor

  Regla: Los workers procesan con leases, checkpoints y mensajes inmutables

    Escenario: Reclamar un único job entre workers concurrentes
      Dado un job pendiente y disponible
      Cuando dos workers intentan reclamarlo a la vez
      Entonces sólo uno recibe lease y token

    Escenario: Rechazar un intento con lease ajeno
      Dado un job reclamado por un worker
      Cuando otro worker intenta iniciar el provider attempt
      Entonces se rechaza por autorización de lease

    Escenario: Resolver el modelo primario
      Dado un run recién reclamado
      Cuando inicia el intento con ordinal cero
      Entonces usa exactamente el proveedor y modelo primarios congelados

    Escenario: Resolver un fallback explícito
      Dado un run con ruta fallback MiniMax
      Cuando inicia un intento con un ordinal permitido
      Entonces usa exactamente el elemento de esa ruta

    Escenario: Rechazar fallback fuera de la ruta
      Dado un run con una sola alternativa
      Cuando el worker solicita un ordinal inexistente
      Entonces el intento no inicia

    Escenario: Reproducir un mensaje cognitivo idéntico
      Dado un mensaje guardado con clave y hash
      Cuando el worker reenvía el mismo contenido
      Entonces recibe el mismo mensaje y secuencia

    Escenario: Rechazar contenido distinto bajo la misma clave de mensaje
      Dado un mensaje ya guardado
      Cuando se reutiliza la clave con contenido diferente
      Entonces se rechaza el conflicto y no se altera la historia

    Escenario: Continuar tras límite de salida sin perder estado
      Dado que el proveedor terminó por output limit
      Cuando el worker registra un checkpoint durable
      Entonces el job vuelve a cola como continuación
      Y no solicita de nuevo información ya guardada

    Escenario: Rechazar continuación sin checkpoint
      Dado que el proveedor reportó output limit o context limit
      Cuando no existe referencia y hash de checkpoint
      Entonces el resultado del intento se rechaza

  Regla: El LLM propone tools y el backend sólo autoriza contratos deterministas

    Escenario: Proponer una tool nativa permitida
      Dado que la policy fija la versión de una tool de catálogo
      Cuando el LLM devuelve un tool call nativo con argumentos JSON
      Entonces el ledger conserva tool versión argumentos y hash exactos

    Escenario: Rechazar una tool no incluida en la policy
      Dado que el LLM propone un nombre no vinculado
      Cuando el backend intenta registrar la propuesta
      Entonces se rechaza sin ejecutar efecto

    Escenario: Bloquear tool del dueño solicitada por un contacto
      Dado que una tool administrativa permite sólo miembros
      Cuando un contacto la propone
      Entonces la propuesta queda terminalmente bloqueada

    Escenario: Bloquear tool por canal incorrecto
      Dado que una tool sólo permite WhatsApp
      Cuando el run pertenece a Messenger
      Entonces la autorización la bloquea antes del handler

    Escenario: Bloquear tool por presupuesto excedido
      Dado que el costo acumulado excedió el presupuesto congelado
      Cuando se autoriza la siguiente tool
      Entonces queda bloqueada con razón de presupuesto

    Escenario: Bloquear tool cuando el costo es desconocido y la policy exige bloqueo
      Dado un evento de uso con costo desconocido
      Y una policy con unknown cost behavior block
      Cuando se autoriza otra tool
      Entonces no se ejecuta hasta resolver gobernanza

    Escenario: Aplicar apagado de emergencia a una tool versionada
      Dado un run que fijó una versión activa de tool
      Y la raíz de la tool fue deshabilitada por emergencia
      Cuando se autoriza la ejecución
      Entonces queda bloqueada aunque el contrato histórico siga inmutable

    Escenario: Limitar tools paralelas por policy
      Dado que el máximo paralelo del run ya está ocupado
      Cuando el LLM propone otra tool en la misma ronda
      Entonces se rechaza el exceso sin adivinar intención

  Regla: Ningún efecto externo se repite a ciegas

    Escenario: Marcar efecto antes de llamar al proveedor externo
      Dado que una tool externa fue autorizada
      Cuando el worker está por publicar enviar o modificar
      Entonces primero guarda estado executing y started unknown

    Escenario: Confirmar efecto externo aplicado
      Dado que existe el marcador de inicio
      Cuando el proveedor devuelve evidencia de éxito
      Entonces la tool termina succeeded y confirmed applied

    Escenario: Reproducir el mismo resultado confirmado
      Dado un resultado terminal con hash
      Cuando se registra otra vez idéntico
      Entonces se devuelve la misma ejecución sin repetir el efecto

    Escenario: Rechazar resultado diferente para una tool terminal
      Dado un resultado terminal confirmado
      Cuando llega evidencia diferente bajo la misma ejecución
      Entonces se rechaza el conflicto

    Escenario: Recuperar caída antes de iniciar efecto
      Dado un lease expirado con external effect state not started
      Cuando corre el reconciliador
      Entonces el job vuelve a retryable con demora controlada

    Escenario: Detener caída después de iniciar efecto
      Dado un lease expirado después del marcador de efecto
      Y no existe confirmación durable del proveedor
      Cuando corre el reconciliador
      Entonces run job attempt y tool terminan uncertain
      Y no se agenda un reintento automático

    Escenario: Reintentar después de efecto confirmado
      Dado un lease expirado con efecto confirmado durablemente
      Cuando todavía hay presupuesto de intentos
      Entonces se reanuda desde el ledger sin repetir ese efecto

  Regla: Uso, fallos, memoria y auditoría nunca fabrican evidencia

    Escenario: Registrar tokens y cache conocidos
      Dado una respuesta de proveedor con medición de tokens
      Cuando se registra uso
      Entonces conserva input output reasoning cache read y cache write disponibles

    Escenario: Mantener costo desconocido como desconocido
      Dado que el proveedor no reportó un costo confiable
      Cuando se registra uso
      Entonces cost status permanece unknown
      Y el sistema no almacena cero como costo inventado

    Escenario: Reproducir evento de uso idéntico
      Dado un evento de uso con clave estable
      Cuando llega otra vez con los mismos datos
      Entonces no se suma dos veces

    Escenario: Rechazar costo distinto bajo la misma clave de uso
      Dado un evento de uso registrado
      Cuando se reutiliza su clave con otro costo
      Entonces se rechaza el conflicto

    Escenario: Registrar error redacted con procedencia completa
      Dado un fallo asociado a run job attempt o tool
      Cuando se registra el evento de error
      Entonces sus referencias pertenecen a la misma organización y ejecución

    Escenario: Rechazar procedencia cruzada de error
      Dado un attempt y un run de organizaciones o ejecuciones distintas
      Cuando se intenta ligarlos en un error
      Entonces la transacción falla

    Escenario: Ocultar contenido cognitivo al navegador
      Dado un miembro autenticado con acceso al dashboard
      Cuando consulta las vistas del runtime
      Entonces puede ver metadatos y hashes
      Pero no prompt mensajes memoria argumentos resultados leases ni checkpoints

    Escenario: Aislar otra organización por RLS
      Dado un dueño autenticado de otra organización
      Cuando consulta runs tools uso errores memoria y auditoría
      Entonces no observa ninguna fila ajena

    Escenario: Escribir memoria sólo mediante una tool autorizada
      Dado una conclusión cognitiva candidata a memoria
      Cuando no existe ejecución de tool con procedencia válida
      Entonces el runtime no ofrece un bypass RPC para escribirla
