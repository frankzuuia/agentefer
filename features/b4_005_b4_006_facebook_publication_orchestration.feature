# language: es
@b4-005 @b4-006 @facebook-page @publication @production
Característica: Orquestación completa de publicaciones del catálogo en Facebook Page
  Para que Fer administre y publique su tienda sin perder el hilo de WhatsApp
  Como agente propietario respaldado por una cola durable
  Quiero operar ofertas individuales o lotes con límites observados y resultados verificables

  Regla: Panel y WhatsApp comparten el mismo contrato autorizado

    Escenario: Producto no publicado muestra acción disponible
      Dado que una oferta activa tiene versión aprobada y ninguna instancia publicada
      Cuando Fer abre el catálogo administrativo
      Entonces ve la acción Publicar en Facebook
      Y la acción invoca el mismo comando que la tool de WhatsApp

    Escenario: Fer publica el último producto confirmado
      Dado que existen altas de catálogo confirmadas para la organización
      Cuando Fer dice "publica el último producto que subimos"
      Entonces el agente resuelve la alta confirmada más reciente
      Y presenta o ejecuta la publicación según la política de aprobación vigente

    Escenario: Último producto ambiguo requiere aclaración
      Dado que dos candidatos comparten la misma precedencia comercial
      Cuando Fer pide publicar el último producto
      Entonces el agente pregunta cuál candidato quiere publicar
      Y no crea ningún efecto externo antes de resolverlo

  Regla: Cada presentación conserva estado y precio propios

    Esquema del escenario: Pausar una presentación no pausa las demás
      Dado que combo, llanta y rin existen como ofertas independientes activas
      Cuando Fer pausa <presentacion>
      Entonces sólo esa variante y su publicación quedan pausadas
      Y las demás ofertas conservan su estado anterior

      Ejemplos:
        | presentacion |
        | combo        |
        | llanta       |
        | rin          |

    Escenario: Precio por pieza usa unidad y tier propios
      Dado que la variante tiene un tier vigente por pieza
      Cuando se crea la versión para publicar una pieza
      Entonces congela variante unidad tier método y monto correctos
      Y no reutiliza el precio del combo ni del juego

    Escenario: Publicación sin precio queda por consultar
      Dado que Fer decide no mostrar precio
      Cuando aprueba la versión publicable
      Entonces pricing_status queda on_request
      Y el payload de Meta no contiene un precio inventado

  Regla: Publicar todo no bloquea el chat ni usa límites hardcodeados

    Escenario: El comando masivo acepta y libera el turno
      Dado que Fer tiene ofertas elegibles en el catálogo
      Cuando dice "publica todo el catálogo en Facebook"
      Entonces recibe batch_id y cantidad elegible
      Y puede continuar conversando mientras otro worker procesa el lote

    Escenario: Otra conversación no altera el lote
      Dado que un lote permanece en ejecución
      Cuando Fer pregunta por inventario o cambia otra descripción
      Entonces el agente procesa el nuevo turno con su propio run
      Y el lote conserva selección policy snapshot y leases originales

    Escenario: Meta reduce el ritmo permitido
      Dado que el worker recibe Retry-After o una señal de uso restrictiva
      Cuando registra la observación del proveedor
      Entonces difiere trabajos pendientes hasta la ventana calculada
      Y no reintenta en un intervalo fijo compilado

    Escenario: El ritmo puede recuperarse sin exceder la política aprobada
      Dado que observaciones posteriores permiten reanudar
      Cuando el dispatcher calcula la siguiente disponibilidad
      Entonces usa la observación vigente y el techo de policy snapshot
      Y conserva trazabilidad de la decisión

  Regla: Fallos y cierre son visibles, reintentables y únicos

    Escenario: Fallo confirmado sin efecto ofrece Reintentar
      Dado que Meta confirmó que una publicación no fue aplicada
      Cuando el job termina failed
      Entonces el panel muestra causa y botón Reintentar
      Y la tool puede crear un nuevo job enlazado al fallo original

    Escenario: Resultado incierto no se reintenta a ciegas
      Dado que el worker perdió confirmación después de iniciar el efecto
      Cuando Fer solicita reintentar
      Entonces el comando queda bloqueado hasta conciliar el ID externo
      Y no crea una publicación duplicada

    Escenario: Último job emite resumen una sola vez
      Dado que todos los jobs del lote son terminales
      Cuando el reconciliador cierra el lote
      Entonces encola una notificación con publicados omitidos fallidos e inciertos
      Y reejecutar la conciliación no duplica el mensaje final

    Escenario: Reintento del mensaje no repite publicaciones
      Dado que la entrega del resumen por WhatsApp falla transitoriamente
      Cuando el outbox reintenta la notificación
      Entonces conserva la misma clave idempotente de mensaje
      Y ningún job de Facebook vuelve a ejecutarse

  Regla: El panel es móvil primero y no se convierte en una lista interminable

    Escenario: Catálogo operativo a 375 píxeles
      Dado que Fer abre el catálogo administrativo en un viewport de 375 píxeles
      Cuando consulta productos estados y acciones de Facebook
      Entonces la página no tiene desbordamiento horizontal
      Y toda acción táctil mide al menos 44 por 44 píxeles

    Escenario: La navegación del catálogo tiene una ventana acotada
      Dado que existen más productos que el tamaño de página aprobado
      Cuando Fer llega al final de la página actual
      Entonces la interfaz ofrece cargar la siguiente página por cursor
      Y no agrega resultados indefinidamente al documento

    Escenario: Sólo el producto activo expone detalles extensos
      Dado que el catálogo contiene muchas ofertas con galería e historial
      Cuando Fer abre el detalle de una oferta
      Entonces las demás tarjetas permanecen compactas
      Y galería filtros historial y edición se presentan en paneles contextuales accesibles

    Escenario: Las acciones fijas no ocultan contenido
      Dado que Fer opera publicar guardar reintentar o conciliar desde un teléfono
      Cuando aparece la barra de acción contextual
      Entonces el contenido reserva el espacio seguro inferior
      Y Fer puede alcanzar la acción crítica sin recorrer todo el catálogo
