# language: es
@b3-005 @whatsapp @vision @media
Característica: Ingesta multimodal segura para crear borradores de catálogo
  Para que Fer pueda enviar fotografías sin inflar la base de datos
  Como agente de tienda multitenant
  Quiero conservar evidencia privada y entregar sólo imágenes verificadas al modelo

  Regla: La imagen se descarga y deriva de forma autenticada

    Escenario: Una imagen Meta válida crea original y WebP privados
      Dado un mensaje WhatsApp de imagen con media id y una conexión activa
      Cuando el worker reclama y descarga la media con el token vigente de Vault
      Entonces valida host Meta, MIME, firma real, hash, tamaño y dimensiones
      Y sube el original y el análisis WebP a Storage privado
      Y completa la solicitud sólo después de registrar ambos objetos verificados

    Escenario: Un payload que declara imagen pero contiene otros bytes se rechaza
      Dado una descarga cuyo MIME declarado no coincide con sus bytes
      Cuando el worker normaliza la evidencia
      Entonces la solicitud queda rechazada o en dead letter
      Y no puede activar una visión ni un borrador comercial

  Regla: Las imágenes pendientes nunca se omiten silenciosamente

    Escenario: El agente espera a que termine la ingestión
      Dado un mensaje de imagen con solicitud pendiente o en procesamiento
      Cuando se buscan turnos WhatsApp
      Entonces el mensaje no se reclama como turno cognitivo
      Y el worker puede reintentar la ingestión con su lease

    Escenario: Una rendición visual ausente cierra el turno de forma segura
      Dado un turno reclamado con una imagen sin asset WebP verificado
      Cuando el worker construye la conversación del proveedor
      Entonces no envía una conversación sólo textual
      Y registra un error de evidencia visual faltante sin inventar atributos

  Regla: El proveedor recibe acceso temporal mínimo

    Escenario: OpenAI recibe un WebP privado por URL firmada
      Dado un asset de análisis verificado del mismo tenant
      Cuando el worker prepara el turno visual
      Entonces solicita una URL firmada de 300 segundos
      Y la entrega como input_image al proveedor
      Y no persiste la URL, el token ni los bytes en PostgreSQL

    Escenario: MiniMax no recibe una imagen no soportada
      Dado un turno visual configurado con MiniMax Chat
      Cuando el adaptador prepara la solicitud
      Entonces falla con una capacidad no disponible explícita
      Y no degrada la evidencia a texto ni llama otro proveedor sin configuración

  Regla: El modelo de visión se selecciona antes del job

    Escenario: Una imagen verificada usa el modelo de visión configurado
      Dado un mensaje de imagen WhatsApp con ingestión succeeded
      Cuando se encola el run de conversación
      Entonces el run conserva vision_provider y vision_model como provider y model efectivos
      Y un mensaje de texto en la misma tienda conserva el modelo normal
