# language: es
Característica: El dueño modifica el catálogo existente por WhatsApp con evidencia real
  El asistente identifica productos activos y aplica sólo cambios confirmados por herramientas.

  Escenario: Agregar una foto verificada a dos productos activos
    Dado que el dueño envió una imagen procesada en su conversación
    Y existen dos productos activos inequívocos en su negocio
    Cuando pide agregar esa imagen a ambos productos
    Entonces el agente usa una sola operación atómica para los dos productos
    Y la foto queda aprobada en ambos productos sin crear otros artículos
    Y el agente confirma el cambio sólo después del resultado persistido
    Y no se publica nada en Facebook

  Escenario: Reintentar la edición después de una respuesta incierta
    Dado que una operación de foto ya quedó persistida
    Cuando se repite la misma clave de ejecución
    Entonces se devuelve el resultado anterior sin duplicar imágenes

  Escenario: Rechazar un lote con dos variantes del mismo producto
    Dado que el dueño seleccionó dos variantes de un mismo producto
    Cuando el agente solicita agregar una foto al lote
    Entonces la herramienta rechaza el lote completo
    Y ninguna relación de imagen parcial queda persistida

  Escenario: Un producto existente no puede convertirse en otra alta
    Dado que ya existe una oferta activa con el nombre solicitado
    Cuando el agente intenta guardarla como alta nueva
    Entonces la herramienta indica que debe editarse el producto existente
    Y no crea una propuesta pendiente adicional

  Escenario: La propuesta nueva contiene colecciones mal formadas
    Dado que el modelo entrega productos como un objeto item en vez de un arreglo JSON
    Cuando la herramienta valida la propuesta antes de guardarla
    Entonces rechaza el contrato sin persistir datos parciales

  Escenario: El dueño de otro negocio no puede editar esta foto
    Dado que la imagen y los productos pertenecen a una organización distinta
    Cuando el agente intenta asociarlos
    Entonces la autorización impide el cambio entre negocios

  Escenario: Una tool específica agrega la foto sin competir con la edición de precio
    Dado que el agente dispone de herramientas autorizadas del dueño
    Cuando identifica una foto procesada y los productos de destino
    Entonces usa catalog_add_photo_to_products con los ID exactos
    Y no usa catalog_edit_offer para adjuntar la foto

  Escenario: Agregar foto sólo a una presentación concreta
    Dado que el dueño distingue una variante de un producto existente
    Cuando pide que la foto sea de esa presentación y no de todo el producto
    Entonces catalog_add_photo_to_products usa scope variant
    Y la relación de imagen queda asociada sólo a la variante solicitada

  Escenario: Una herramienta rechaza una foto no verificada
    Dado que la imagen solicitada no pertenece a la conversación del dueño
    Cuando el agente intenta asociarla a un producto
    Entonces el ejecutor registra la herramienta como fallida y sin efecto aplicado
    Y el agente no afirma que la foto cambió

  Escenario: La respuesta lenta queda medible sin contenido privado
    Dado que MiniMax necesita varias llamadas para resolver el turno
    Cuando el worker registra la terminación del turno
    Entonces el log contiene duración, ronda y número de llamadas al proveedor
    Y no registra el texto del mensaje ni secretos
