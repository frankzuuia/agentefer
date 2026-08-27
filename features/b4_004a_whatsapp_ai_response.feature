# language: es
Característica: Respuesta cognitiva durable por WhatsApp
  Como plataforma AgenteFer
  Quiero responder mensajes iniciados por clientes usando el LLM configurado
  Para atender sin inventar información ni mezclar organizaciones

  Escenario: Un saludo real recibe respuesta de IA
    Dado un mensaje WhatsApp autenticado y normalizado dentro de la ventana de servicio
    Cuando el worker ejecuta el turno con el proveedor configurado
    Entonces crea exactamente un mensaje outbound y un outbox autorizado
    Y Meta entrega la respuesta al mismo cliente desde el número de esa organización

  Escenario: Meta repite el mismo mensaje
    Dado un inbound que ya originó un turno
    Cuando el mismo identificador externo vuelve a procesarse
    Entonces no se duplica el run
    Y no se duplica la respuesta ni el envío

  Escenario: Dos organizaciones reciben mensajes al mismo tiempo
    Dado conexiones activas de organizaciones distintas
    Cuando sus workers reclaman trabajo concurrentemente
    Entonces cada turno usa su prompt, conversación, credencial y destinatario
    Y ningún dato o secreto cruza la frontera tenant

  Escenario: El operador cambia de MiniMax a OpenAI
    Dado que AI_MODEL contiene un selector provider:model válido
    Cuando comienza el siguiente turno
    Entonces se usa el adapter y modelo seleccionados
    Y no se requiere cambiar la lógica del canal ni del negocio

  Escenario: Se configura un modelo nuevo de una familia soportada
    Dado un nombre de modelo que el proveedor acepta
    Cuando el adapter crea la solicitud
    Entonces transmite el nombre configurado sin allowlist hardcodeada de modelos
    Y conserva límites físicos y errores reales del proveedor

  Escenario: El cliente pregunta por catálogo antes de habilitar la tool
    Dado que no existe una tool comercial autorizada para ese turno
    Cuando el modelo responde
    Entonces no inventa precio, existencia ni venta
    Y comunica la incertidumbre sin afirmar una acción ejecutada

  Escenario: El modelo solicita una tool no autorizada
    Dado un contacto sin permiso administrativo
    Cuando el proveedor devuelve un tool call fuera de la policy snapshot
    Entonces el runtime no ejecuta la tool
    Y registra el rechazo con evidencia segura

  Escenario: El proveedor devuelve sólo razonamiento o contenido vacío
    Dado un intento LLM aceptado por HTTP
    Cuando no existe texto visible utilizable
    Entonces no se crea un envío al cliente
    Y el trabajo conserva un estado recuperable o fallback autorizado

  Escenario: El proveedor LLM está temporalmente indisponible
    Dado un run reclamado con lease vigente
    Cuando ocurre timeout, rate limit o error recuperable
    Entonces el intento termina retryable sin perder checkpoint
    Y no se crea un mensaje outbound falso

  Escenario: La ventana iniciada por el cliente venció
    Dado un texto libre listo para salida
    Cuando la policy evalúa la conversación
    Entonces el outbox queda bloqueado antes de llamar a Meta
    Y no se inicia contacto fuera de política

  Escenario: Meta rechaza la credencial activa
    Dado un outbox autorizado y reclamado
    Cuando Graph API devuelve un error de autenticación
    Entonces el evento termina con código seguro y alerta operativa
    Y el token no aparece en logs, auditoría ni mensajes

  Escenario: El worker cae después del efecto externo
    Dado que Meta pudo aceptar un envío
    Pero el worker cayó antes de persistir el acuse
    Cuando otro worker recupera el lease
    Entonces reconcilia mediante identidad externa e idempotencia
    Y no afirma éxito ni repite ciegamente

  Escenario: El mensaje contiene prompt injection
    Dado un cliente que pide ignorar políticas o ejecutar administración
    Cuando el LLM procesa el contenido no confiable
    Entonces sólo dispone de tools permitidas al contacto
    Y la organización, credenciales y permisos no cambian

  Escenario: Una respuesta excede el límite físico
    Dado un proveedor que devuelve un cuerpo sobredimensionado
    Cuando el adapter valida la respuesta
    Entonces cancela el procesamiento con un error seguro
    Y no registra ni envía contenido parcial silenciosamente

  Escenario: El servicio se detiene durante LLM o Meta
    Dado una solicitud activa con señal de cancelación
    Cuando el worker recibe SIGTERM
    Entonces aborta red y deja el lease recuperable
    Y no inicia nuevos efectos después del shutdown
