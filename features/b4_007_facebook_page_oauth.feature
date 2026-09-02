# language: es
Característica: Conexión segura de una página de Facebook desde el catálogo
  Como dueño de una organización
  Quiero conectar una página administrable desde mi panel móvil
  Para publicar productos sin exponer credenciales ni mezclar empresas

  Regla: La autorización pertenece al dueño y a una sola organización

    Escenario: El dueño inicia la conexión desde la tarjeta de Facebook
      Dado que el dueño inició sesión y eligió su organización activa
      Cuando pulsa "Conectar Facebook"
      Entonces el sistema crea un estado aleatorio de un solo uso ligado al dueño y la organización
      Y abre el diálogo oficial de Facebook con los permisos mínimos de páginas

    Escenario: Un administrador que no es dueño intenta iniciar la conexión
      Dado que un administrador inició sesión en el panel
      Cuando intenta iniciar OAuth para la organización
      Entonces el sistema rechaza la operación por autorización
      Y no crea una sesión OAuth ni entrega datos de la aplicación Meta

    Escenario: Una respuesta OAuth se intenta reutilizar
      Dado que un código y estado ya fueron reclamados para intercambio
      Cuando el navegador intenta intercambiarlos otra vez
      Entonces el sistema rechaza el replay
      Y no crea una segunda conexión social

  Regla: Los secretos nunca cruzan al navegador

    Escenario: Facebook devuelve páginas administrables
      Dado que Facebook entregó un código válido al callback exacto
      Cuando el backend intercambia el código y consulta las páginas
      Entonces el navegador recibe solamente el identificador, nombre y tareas de cada página
      Y los tokens de usuario y página permanecen entre backend, Meta y Vault

    Escenario: Facebook devuelve una página sin permiso para crear contenido
      Dado que la cuenta solo tiene una tarea de consulta en esa página
      Cuando el backend prepara las páginas seleccionables
      Entonces esa página no aparece como opción publicable
      Y no se activa una capacidad de publicación

  Regla: La selección es móvil, acotada y recuperable

    Escenario: El dueño autorizó una sola página publicable
      Cuando el backend valida la autorización
      Entonces el panel selecciona esa única página sin pedir un paso innecesario
      Y actualiza el catálogo con la conexión activa

    Escenario: El dueño autorizó varias páginas publicables
      Cuando el backend valida la autorización
      Entonces el panel muestra un diálogo acotado con botones táctiles de al menos 44 píxeles
      Y el resto del catálogo no obtiene un desplazamiento horizontal ni una lista infinita

    Escenario: El dueño cancela Facebook o cierra sesión durante el flujo
      Cuando el callback informa cancelación o el dueño cierra su sesión
      Entonces el panel cierra la ventana auxiliar y no activa ninguna página
      Y la sesión OAuth pendiente expira sin conservar tokens temporales

  Regla: La conexión habilita publicaciones sin romper compatibilidad

    Escenario: El dueño confirma una página con permiso de contenido
      Cuando el backend guarda su token de página cifrado en Vault
      Entonces activa una conexión social aislada por organización
      Y el worker puede resolver esa credencial específica sin eliminar el mecanismo legado existente
