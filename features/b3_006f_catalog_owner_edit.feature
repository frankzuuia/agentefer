# language: es
Característica: Administración completa del catálogo por el dueño
  Como dueño de la organización
  Quiero administrar productos desde el panel o WhatsApp
  Para mantener el catálogo y Facebook sincronizados sin mezclar empresas

  Regla: La visibilidad del catálogo y la publicación en Facebook son decisiones separadas

    Escenario: Activar un borrador solo en el catálogo
      Dado un producto en borrador perteneciente a la organización del dueño
      Cuando el dueño lo activa desde el panel
      Entonces el producto queda activo en el catálogo de la tienda QR
      Y no se crea ni se encola una publicación de Facebook

    Escenario: Publicar después de activar
      Dado un producto activo con una imagen pública aprobada
      Cuando el dueño solicita publicarlo en la página de Facebook conectada
      Entonces se crea una versión aprobada con la información vigente
      Y la publicación se encola de forma idempotente

    Escenario: Publicar sin precio por decisión del dueño
      Dado un producto activo con precios vigentes
      Cuando el dueño elige publicar sin precio
      Entonces la versión de Facebook omite el precio
      Y los precios del catálogo no se eliminan ni se modifican

  Regla: Las modificaciones conservan trazabilidad y alcance organizacional

    Escenario: Cambiar nombre y descripción
      Dado un producto de la organización del dueño
      Cuando el dueño cambia su nombre y descripción desde el panel
      Entonces los nuevos textos quedan disponibles para el catálogo
      Y la operación queda registrada con actor e idempotencia

    Escenario: Cambiar un precio vigente
      Dado un producto con una presentación de precio vigente
      Cuando el dueño confirma un precio nuevo
      Entonces la versión anterior deja de estar vigente
      Y se crea una nueva versión de precio con evidencia auditable

    Escenario: Intentar editar un producto de otra organización
      Dado un producto que no pertenece a la organización del dueño
      Cuando intenta cambiar cualquiera de sus datos
      Entonces la operación se rechaza sin revelar información del producto
      Y no se modifica ninguna fila de la otra organización

  Regla: Las fotografías tienen una principal y un ciclo de vida seguro

    Escenario: Elegir otra fotografía principal
      Dado un producto con varias fotografías aprobadas
      Cuando el dueño selecciona una fotografía diferente como principal
      Entonces existe una sola fotografía principal en el alcance aplicable
      Y las demás fotografías permanecen disponibles en la galería

    Escenario: Quitar una fotografía del producto
      Dado una fotografía asociada al producto
      Cuando el dueño solicita quitarla
      Entonces la asociación se retira del catálogo
      Y el archivo no se borra físicamente sin una política de retención

    Escenario: Preparar una fotografía para tienda y Facebook
      Dado una fotografía privada verificada y aprobada para el producto
      Cuando el worker reclama el trabajo de escaparate
      Entonces copia bytes verificados a una ruta pública inmutable
      Y registra la versión WebP pública antes de completar el trabajo

  Regla: WhatsApp reconoce al dueño y ejecuta las mismas capacidades autorizadas

    Escenario: El dueño cambia un producto por WhatsApp
      Dado que el número remitente está vinculado como dueño activo
      Cuando pide cambiar el nombre, precio, estado o fotografía de un producto inequívoco
      Entonces el LLM selecciona la herramienta de edición del catálogo
      Y el backend vuelve a validar organización, rol e idempotencia

    Escenario: Un cliente intenta usar una herramienta administrativa
      Dado que el número remitente pertenece a un cliente
      Cuando solicita editar o publicar un producto
      Entonces las herramientas administrativas no están disponibles para esa conversación
      Y el agente continúa atendiendo al cliente como vendedor

    Escenario: El dueño agrega la última fotografía enviada
      Dado que el dueño envió una fotografía verificada en la misma conversación
      Cuando pide agregarla a un producto específico
      Entonces el agente asocia únicamente ese medio verificado al producto indicado
      Y pregunta para resolver cualquier ambigüedad antes de ejecutar

  Regla: El panel móvil evita recorridos interminables

    Escenario: Administrar un producto desde un teléfono
      Dado que el dueño abre el catálogo en una pantalla móvil
      Cuando abre un producto para administrarlo
      Entonces ve secciones compactas para datos, precios, fotos, estado y Facebook
      Y puede completar cada acción sin una tabla horizontal ni scroll infinito
