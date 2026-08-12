# language: es
@b2-007 @publication @production
Característica: Publicaciones sociales durables y verificables
  Para mantener fresco cualquier producto que Fer decida vender
  Como asistente que coordina catálogo, Facebook y Messenger
  Quiero publicar sólo hechos vigentes con permisos reales y trazabilidad completa

  Regla: La conexión social y sus capacidades son hechos verificables

    Escenario: Conexión activa exige identidad y secreto referenciado
      Dado que Fer conecta una página de Facebook
      Cuando la conexión cambia a activa
      Entonces conserva app página versión credencial referenciada y fechas verificadas
      Y nunca expone el valor del secreto en una vista pública

    Escenario: Credenciales faltantes impiden conexión activa
      Dado que la conexión no tiene cuenta externa o referencia de credencial
      Cuando se intenta activarla
      Entonces PostgreSQL rechaza el estado
      Y no se crea una conexión aparentemente funcional

    Escenario: Sólo propietario o administrador conecta una página
      Dado que un operador o visor intenta registrar una conexión social
      Cuando ejecuta la tool de conexión
      Entonces la autorización se rechaza
      Y el intento no modifica conexiones ni capacidades

    Escenario: Capacidad concedida se registra como observación inmutable
      Dado que Meta confirma el permiso para crear publicaciones
      Cuando el probe guarda la capacidad page.post.create
      Entonces registra fuente evidencia vigencia y momento observado
      Y no reescribe una observación anterior

    Escenario: Revocación posterior domina a permiso anterior
      Dado que una capacidad fue concedida antes
      Cuando llega una observación posterior revocada
      Entonces la vista vigente muestra la revocación
      Y el historial conserva ambos hechos

    Escenario: Capacidad vencida no autoriza una publicación
      Dado que el permiso concedido ya alcanzó valid_until
      Cuando un worker autoriza el trabajo
      Entonces el trabajo queda bloqueado por capacidad no concedida
      Y ningún efecto externo comienza

  Regla: La publicación conserva un snapshot universal aprobado

    Escenario: Cualquier variante del catálogo puede tener publicación
      Dado que existe una variante activa de cualquier categoría
      Cuando el agente crea su publicación lógica
      Entonces enlaza conexión variante y organización
      Y no contiene reglas especiales sólo para llantas

    Escenario: Una oferta operacional no se duplica
      Dado que ya existe una publicación no retirada para conexión y variante
      Cuando otra orden intenta crear la misma oferta
      Entonces la unicidad rechaza la duplicación
      Y se conserva una sola identidad lógica

    Escenario: Publicación con precio congela procedencia
      Dado que una variante tiene un tier vigente confirmado
      Cuando se crea una versión publicable
      Entonces guarda tier método monto moneda y vigencia de origen
      Y el texto no se usa como fuente de verdad del precio

    Escenario: Producto sin precio queda por consultar
      Dado que Fer aún no confirmó precio para una variante
      Cuando el agente crea su versión sin tier
      Entonces pricing_status queda on_request
      Y monto método y moneda permanecen nulos

    Escenario: Galería conserva orden y activos verificados
      Dado que Fer agrega varias fotos verificadas del producto
      Cuando se crea la versión
      Entonces cada imagen conserva asset rol ordinal y texto alternativo
      Y se rechazan archivos ajenos o no verificados

    Escenario: Sólo propietario o administrador aprueba contenido
      Dado que existe una versión en borrador
      Cuando un visor intenta aprobarla
      Entonces la autorización se rechaza
      Y la publicación continúa en borrador

    Escenario: Nueva versión no reescribe la anterior
      Dado que una publicación ya tiene versión aprobada
      Cuando Fer aprueba texto o precio nuevo
      Entonces la versión anterior queda superseded
      Y la nueva versión se vuelve current_version_id atómicamente

    Escenario: Producto retirado no puede activarse socialmente
      Dado que el producto o su variante ya no están activos
      Cuando se intenta aprobar una publicación activa
      Entonces la validación rechaza la transición
      Y el catálogo social no afirma disponibilidad falsa

  Regla: Cada efecto externo tiene autorización tardía e identidad única

    Escenario: Claim concurrente entrega un job a un worker
      Dado que un job pendiente está disponible
      Cuando dos workers intentan reclamarlo al mismo tiempo
      Entonces sólo uno obtiene lease_token
      Y attempt_count aumenta exactamente una vez

    Escenario: Worker reautoriza justo antes de publicar
      Dado que el job tiene lease vigente
      Cuando solicita autorización tardía
      Entonces relee conexión capacidad versión catálogo precio e inventario
      Y guarda el snapshot exacto de la decisión

    Escenario: Precio cambiado bloquea job antiguo
      Dado que un job capturó una versión con un tier anterior
      Cuando Fer supersede ese precio antes del efecto
      Entonces la autorización responde price_snapshot_stale
      Y exige generar y aprobar contenido actualizado

    Escenario: Stock agotado bloquea publicación
      Dado que una variante rastreada llegó a disponibilidad cero
      Cuando el worker autoriza una publicación pendiente
      Entonces responde stock_unavailable
      Y Meta no recibe una oferta agotada

    Escenario: Cambio de catálogo invalida snapshot
      Dado que el producto cambió después de aprobar su versión
      Cuando se autoriza un job viejo
      Entonces responde catalog_snapshot_stale
      Y el agente debe crear otra versión desde hechos actuales

    Escenario: Efecto sólo comienza después de autorización
      Dado que el worker aún no obtuvo autorización válida
      Cuando intenta marcar el inicio del efecto
      Entonces la operación se rechaza
      Y no se registra una llamada externa ficticia

    Escenario: Publicación confirmada crea instancia atribuible
      Dado que Meta confirmó la creación con ID externo
      Cuando el worker registra resultado succeeded
      Entonces crea una instancia con URL ID versión y job de origen
      Y un lead de Messenger puede atribuirse a esa publicación

    Escenario: Refresh crea otra instancia y conserva la anterior
      Dado que una publicación ya existe en Facebook
      Cuando Fer solicita refrescarla con un post nuevo
      Entonces se crea una segunda instancia externa
      Y no se sobrescribe la identidad del post anterior

    Escenario: Resultado exitoso exige confirmación del efecto
      Dado que el proveedor no confirmó si aplicó la solicitud
      Cuando el worker intenta declarar succeeded
      Entonces PostgreSQL rechaza el resultado
      Y no inventa una instancia publicada

    Escenario: Lease perdido antes del efecto permite reintento
      Dado que el worker murió antes de marcar effect_started_at
      Cuando vence el lease
      Entonces el job pasa a retryable si quedan intentos
      Y no duplica una publicación externa

    Escenario: Lease perdido después del efecto queda incierto
      Dado que el worker inició la llamada pero perdió la respuesta
      Cuando vence el lease
      Entonces el job pasa a uncertain
      Y nunca se reintenta a ciegas con otra publicación

    Escenario: Clave externa incierta no se reutiliza
      Dado que un efecto externo terminó incierto
      Cuando otro comando usa la misma external_effect_key
      Entonces la unicidad rechaza el nuevo job
      Y el caso queda pendiente de conciliación

  Regla: Los lotes y horarios son reanudables sin spam ni duplicados

    Escenario: Publicar catálogo expande sólo ofertas activas
      Dado que Fer pide publicar su catálogo
      Cuando se expande el lote con IDs seleccionados o alcance activo
      Entonces crea un job por publicación vigente
      Y omite borradores pausados retirados o sin versión aprobada

    Escenario: Reintento de lote devuelve la expansión original
      Dado que la red repite el mismo comando de lote
      Cuando conserva clave y payload idénticos
      Entonces devuelve el mismo batch y número de jobs
      Y no genera nuevas claves de efecto

    Escenario: Misma clave con otro lote se rechaza
      Dado que una clave idempotente ya representa una selección
      Cuando se reutiliza con otra operación o productos
      Entonces el comando falla por conflicto
      Y la primera campaña permanece intacta

    Escenario: Cron validado avanza una ocurrencia exacta
      Dado que un horario activo tiene timezone IANA cron válido y next_run_at
      Cuando el scheduler reclama esa ocurrencia
      Entonces el batch guarda schedule generation y occurrence
      Y next_run_at avanza atómicamente a la siguiente ejecución

    Escenario: Scheduler atrasado no repite ocurrencia procesada
      Dado que next_run_at ya avanzó después de un enqueue
      Cuando un worker atrasado presenta la ocurrencia anterior
      Entonces la validación rechaza el lote
      Y no repite las publicaciones de esa ventana

    Escenario: Cambio de configuración incrementa generación
      Dado que Fer modifica horario selección o política
      Cuando se guarda la nueva configuración
      Entonces generation aumenta exactamente uno
      Y el horario vuelve a unvalidated hasta validación real

    Escenario: Cancelación elimina pendientes pero respeta trabajos en vuelo
      Dado que un lote contiene jobs pendientes y procesando
      Cuando Fer cancela la campaña
      Entonces los pendientes pasan a cancelled
      Y los procesando o inciertos permanecen conciliables

    Escenario: Lote termina parcialmente fallido con errores reales
      Dado que algunos jobs concluyeron y otros quedaron bloqueados o inciertos
      Cuando se reconcilia el batch
      Entonces calcula contadores por estado
      Y termina partially_failed sin ocultar los fallos

  Regla: Seguridad y atribución sobreviven canales y organizaciones

    Escenario: Organización ajena no lee publicaciones
      Dado que dos organizaciones tienen páginas y productos distintos
      Cuando un miembro consulta las vistas API
      Entonces RLS devuelve sólo filas de su organización
      Y no filtra conexiones capacidades jobs ni instancias ajenas

    Escenario: Navegador no ejecuta tools del worker
      Dado que un usuario autenticado controla su sesión web
      Cuando intenta llamar claim authorize o record result
      Entonces PostgreSQL niega EXECUTE
      Y sólo el backend service_role puede operar efectos

    Escenario: Mensaje desde un post prioriza ese producto
      Dado que un cliente llega por Messenger desde una publicación conocida
      Cuando inicia la conversación preguntando por ella
      Entonces el agente resuelve publicación variante precio y disponibilidad exactos
      Y atiende primero el interés de origen antes de ofrecer alternativas

    Escenario: Conexión real pendiente no se finge disponible
      Dado que todavía no existen credenciales o capacidades confirmadas de Meta
      Cuando el sistema prepara contenido y jobs
      Entonces conserva conexiones en draft o trabajos bloqueados
      Y ninguna prueba afirma haber publicado realmente en Facebook
