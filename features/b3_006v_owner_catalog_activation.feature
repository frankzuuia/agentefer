# language: es
Característica: Confirmación de catálogo y edición de fotos existentes por el dueño
  El registro interno de alta no es un estado visible del producto ni una herramienta de edición.

  Escenario: Confirmación de producto nuevo activa la tienda QR
    Dado que el dueño confirmó en un mensaje de texto un producto nuevo completo
    Cuando el agente aplica el alta autorizada
    Entonces el producto y todas sus ofertas quedan activos en la tienda QR en una transacción
    Y no se crea ninguna publicación en Facebook

  Escenario: Un alta histórica no se reaplica para cambiar una foto
    Dado que el alta histórica ya produjo artículos activos
    Cuando el agente intenta volver a aplicar ese registro
    Entonces la herramienta rechaza la operación sin modificar productos ni imágenes
    Y el agente debe usar la herramienta de edición del artículo existente

  Escenario: Una foto enviada no confirma un alta pendiente distinta
    Dado que existe un alta interna pendiente
    Cuando el dueño envía una imagen para un producto activo
    Entonces el alta pendiente no se aplica
    Y la imagen sólo se vincula a los productos activos identificados inequívocamente

  Escenario: El dueño pausa una oferta
    Dado que un producto está activo en la tienda QR
    Cuando el dueño ordena pausarlo
    Entonces la oferta aparece como pausada en el panel
    Y deja de mostrarse a clientes sin convertirse en borrador
    Y no se publica en Facebook

  Escenario: La llamada de herramienta falla por contrato HTTP
    Dado que EasyPanel registra el turno del agente
    Cuando Supabase rechaza una operación de herramienta
    Entonces el log contiene el nombre de la operación, la fase y el código HTTP
    Y no contiene secretos ni el contenido del mensaje
