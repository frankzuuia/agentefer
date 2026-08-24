# language: es
Característica: Incorporación segura de canales WhatsApp por organización
  Como owner de un negocio en AgenteFer
  Quiero conectar su App WABA número y token de WhatsApp
  Para probar y operar cada organización sin compartir credenciales ni activos Meta

  Regla: Meta valida la cadena completa antes de persistir el canal

    Escenario: Se conecta un número válido
      Dado una App activa con webhook verificado y un token vigente
      Cuando Meta confirma App permisos WABA y Phone Number ID y acepta la suscripción
      Entonces AgenteFer crea una conexión activa y cifra el token en Vault atómicamente

    Escenario: El token pertenece a otra App
      Dado una App seleccionada dentro de la organización
      Cuando el depurador de Meta devuelve un App ID diferente
      Entonces AgenteFer rechaza el alta antes de consultar o persistir el número

    Escenario: Falta un permiso obligatorio
      Dado un token sin whatsapp_business_management o whatsapp_business_messaging
      Cuando AgenteFer inspecciona sus scopes
      Entonces rechaza el alta y no crea conexión ni secreto Vault

    Escenario: El número no pertenece al WABA
      Dado un WABA accesible por el token
      Cuando todas sus páginas de números excluyen el Phone Number ID solicitado
      Entonces AgenteFer rechaza la combinación sin suscribir ni guardar credenciales

    Escenario: Meta repite un cursor de paginación
      Dado una consulta paginada de números
      Cuando Meta devuelve otra vez un cursor ya visitado
      Entonces AgenteFer corta el ciclo y devuelve un fallo temporal recuperable

    Escenario: Meta no confirma la suscripción del WABA
      Dado una App token WABA y número previamente validados
      Cuando subscribed_apps no devuelve éxito
      Entonces AgenteFer no registra un canal activo ni conserva el token

    Escenario: Meta rechaza una etapa con un error de proveedor
      Dado un token que viaja una sola vez hacia Graph API
      Cuando Meta rechaza la depuración el número o la suscripción
      Entonces el log conserva solamente etapa HTTP y código numérico sin token URL cuerpo ni mensaje

    Escenario: Meta responde pero cambia la forma de un campo documentado
      Dado un token que viaja una sola vez hacia Graph API
      Cuando la respuesta exitosa no satisface el contrato local
      Entonces el log conserva solamente etapa y checkpoint de allowlist sin cuerpo valores ni credenciales

  Regla: Cada conexión conserva el tenant y la identidad de routing

    Escenario: Frank conecta su número de pruebas
      Dado la organización de Frank y su App activa
      Cuando registra su propio WABA Phone Number ID y token
      Entonces la conexión el perfil y la versión Vault pertenecen solamente a Frank

    Escenario: Fer conecta su número productivo
      Dado una organización separada para Fer
      Cuando Fer completa el mismo flujo con sus activos Meta
      Entonces reutiliza el mismo código sin reemplazar ni mezclar los activos de Frank

    Escenario: Dos organizaciones intentan usar el mismo Phone Number ID
      Dado un número ya operativo en la organización A
      Cuando la organización B intenta activarlo
      Entonces la unicidad global rechaza el secuestro cross-tenant y revierte Vault

    Escenario: Un owner selecciona una App ajena
      Dado una sesión válida de la organización A
      Cuando envía el ID interno de una App de la organización B
      Entonces RLS devuelve cero Apps elegibles y Meta no recibe ninguna solicitud

    Escenario: La App todavía no verificó el webhook
      Dado una App con estado pending_verification
      Cuando se intenta crear el canal
      Entonces la transacción rechaza la activación y no crea credencial

  Regla: Los secretos duran solamente lo necesario en cada frontera

    Escenario: El owner envía el token desde el panel
      Dado una sesión TLS vigente
      Cuando comienza la validación de WhatsApp
      Entonces el campo se limpia inmediatamente y el navegador no usa almacenamiento persistente

    Escenario: La operación termina con error de Meta o Supabase
      Dado un token recibido por el API
      Cuando la dependencia rechaza expira o falla
      Entonces respuesta log métrica y auditoría omiten por completo el valor del token

    Escenario: Se consulta el canal después de recargar
      Dado un número activo y su token cifrado
      Cuando un owner consulta la vista tenant-aware
      Entonces ve nombre número App WABA estado y vigencia pero ningún secreto ni referencia Vault

    Escenario: Un usuario authenticated intenta invocar directamente el RPC secreto
      Dado un JWT válido sin rol de servicio
      Cuando llama register_meta_whatsapp_connection
      Entonces PostgreSQL deniega la ejecución y no crea filas ni secretos

    Escenario: El token ya venció
      Dado metadata de expiración anterior al instante de validación
      Cuando se intenta activar la conexión
      Entonces Graph y PostgreSQL fallan cerrado sin dejar una conexión pendiente

  Regla: La pantalla funciona como operación multitenant y no como configuración de una sola prueba

    Escenario: El owner cambia de organización
      Dado una sesión con acceso a más de un negocio
      Cuando cambia el selector de organización
      Entonces el panel recarga Apps y números mediante RLS antes de permitir otro alta

    Escenario: El owner verifica una App después de abrir el panel
      Dado una App que acaba de completar el challenge en Meta
      Cuando pulsa Actualizar estado
      Entonces la App activa aparece como opción sin redesplegar ni cambiar variables de EasyPanel

    Escenario: El canal se guarda pero falla la recarga visual
      Dado que Meta Vault y PostgreSQL ya confirmaron la conexión
      Cuando la consulta posterior de estado falla temporalmente
      Entonces el panel conserva el éxito y permite refrescar sin repetir el alta ni duplicar el canal

    Escenario: El owner configura WhatsApp desde un teléfono
      Dado una pantalla de 375 píxeles de ancho
      Cuando abre Apps números y formulario de conexión
      Entonces todo se presenta en una columna con controles táctiles sin desplazamiento horizontal
