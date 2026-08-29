# language: es
@b3-002a @whatsapp @authorization @store-assistant
Característica: Identidad segura del asistente comercial en WhatsApp
  Para que el agente venda con todos los recursos permitidos sin entregar privilegios administrativos
  Como negocio conectado a WhatsApp
  Quiero resolver cada turno desde la identidad verificada y el rol vigente del interlocutor

  Regla: Cliente y miembro usan el mismo asistente comercial con permisos diferentes

    Escenario: Un cliente conserva las herramientas comerciales de lectura
      Dado que el número de WhatsApp pertenece a una identidad de contacto activa
      Cuando el worker reclama su siguiente turno
      Entonces el run congela al actor como contact con su identidad de canal
      Y recibe las herramientas para consultar conversación catálogo precio y existencia

    Escenario: Fer usa el asistente como miembro verificado
      Dado que el número de WhatsApp pertenece a una identidad member verificada
      Y su membresía owner continúa activa en la misma organización
      Cuando el worker reclama su siguiente turno
      Entonces el run congela al actor como member con el user_id real de Fer
      Y conserva las herramientas comerciales disponibles para atender y vender

  Regla: La autorización se deriva de relaciones internas y nunca del texto del mensaje

    Escenario: Un cliente afirma ser el dueño en el mensaje
      Dado que el proveedor sólo verificó su número como contacto
      Cuando escribe que es Fer y solicita una operación administrativa
      Entonces el run continúa identificado como contact
      Y ninguna herramienta restringida a member aparece ni se autoriza

    Escenario: Una membresía revocada no conserva privilegios
      Dado que un número sigue ligado a una identidad member
      Pero su membresía ya no está activa
      Cuando llega un nuevo mensaje de WhatsApp
      Entonces el mensaje no se convierte en un run privilegiado
      Y el backend no degrada silenciosamente esa identidad a cliente

    Escenario: Un miembro de otra organización no cruza permisos
      Dado que una identidad y una membresía pertenecen a organizaciones diferentes
      Cuando se intenta resolver el actor del turno
      Entonces la resolución falla cerrada
      Y no se expone ningún recurso de la otra organización

  Regla: Las herramientas con roles requeridos sólo pertenecen a miembros

    Escenario: Una política intenta ligar una herramienta administrativa a contactos
      Dado que la herramienta exige rol owner o admin
      Cuando se crea el binding con actor contact
      Entonces PostgreSQL rechaza la política
      Y ninguna ejecución puede saltarse la barrera de identidad

    Escenario: Un operador no ve una herramienta exclusiva de owner
      Dado que el run pertenece a un member con rol operator
      Y la política contiene una herramienta que exige owner
      Cuando el worker solicita las definiciones autorizadas
      Entonces esa herramienta no se entrega al LLM
      Y la autorización autoritativa también la rechazaría si fuera invocada

  Regla: La cuenta de prueba se vincula mediante una operación explícita y auditable

    Escenario: Un owner vincula la cuenta de WhatsApp usada para pruebas
      Dado que el remitente de prueba es una identidad contact observada
      Y el usuario objetivo tiene una membresía owner activa en la misma organización
      Cuando un owner autenticado vincula esa identidad al miembro
      Entonces la identidad observada se revoca sin reescribirla
      Y su conversación abierta se cierra conservando el historial
      Y se crea una identidad member verificada para el mismo sujeto del proveedor
      Y la auditoría no almacena el número de teléfono

    Escenario: Reintentar la misma vinculación es idempotente
      Dado que una identidad de WhatsApp fue vinculada con una llave de idempotencia
      Cuando se repite exactamente la solicitud con la misma llave
      Entonces se devuelve la misma identidad member verificada
      Y no se crea una segunda transición ni otra identidad

    Escenario: Un contacto no puede vincularse diciendo que es Fer
      Dado que un cliente de WhatsApp afirma ser el dueño en su mensaje
      Cuando el agente procesa ese texto conversacional
      Entonces no ejecuta la operación administrativa de vinculación
      Y el run permanece como contact con herramientas comerciales
