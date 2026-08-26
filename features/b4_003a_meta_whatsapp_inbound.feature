# language: es
Característica: Normalización durable y multitenant de mensajes WhatsApp
  Como plataforma AgenteFer
  Quiero convertir webhooks WhatsApp autenticados en conversaciones internas
  Para que el LLM razone después sobre datos completos sin que el backend adivine intenciones

  Escenario: Un texto entrante crea una conversación y un mensaje normalizado
    Dado un delivery firmado de una conexión WhatsApp activa
    Cuando el worker enruta y normaliza el mensaje de texto
    Entonces existe una identidad, un participante, una conversación abierta y un mensaje inbound
    Y ningún contenido comercial fue interpretado por reglas rígidas

  Escenario: Un medio conserva su evidencia sin descargarlo todavía
    Dado un delivery con imagen, audio, video, documento o sticker
    Cuando el adaptador normaliza el mensaje
    Entonces el mensaje tiene content kind media
    Y conserva el identificador y metadata del medio como contenido no confiable

  Escenario: Un tipo futuro no rompe la entrada
    Dado un mensaje Meta con un tipo todavía desconocido por AgenteFer
    Cuando el adaptador lo normaliza
    Entonces el mensaje queda como unsupported
    Y no se inventa una intención ni una respuesta

  Escenario: Meta repite exactamente el mismo wrapper
    Dado un delivery previamente aceptado
    Cuando Meta entrega nuevamente los mismos bytes
    Entonces sólo aumenta el contador del delivery
    Y no se duplica ningún inbox, conversación o mensaje

  Escenario: Dos wrappers contienen el mismo mensaje
    Dado dos deliveries autenticados con el mismo identificador de mensaje
    Cuando ambos son procesados
    Entonces sólo existe un inbound event y un mensaje para ese identificador

  Escenario: Dos workers reclaman simultáneamente
    Dado un delivery disponible
    Cuando dos workers intentan reclamarlo al mismo tiempo
    Entonces sólo uno recibe un lease válido
    Y el otro continúa sin bloquear ni duplicar efectos

  Escenario: Un worker muere después del claim
    Dado un delivery en processing cuyo lease venció
    Cuando otro worker solicita trabajo
    Entonces recupera el delivery con un token nuevo
    Y el intento previo no puede completar el trabajo

  Escenario: El mismo remitente escribe concurrentemente
    Dado dos mensajes distintos del mismo número externo
    Cuando son normalizados en paralelo
    Entonces existe una sola identidad vigente
    Y existe una sola conversación abierta para esa identidad

  Escenario: La identidad de Fer ya está vinculada
    Dado un sender verificado como miembro de la organización
    Cuando llega un nuevo mensaje desde esa identidad
    Entonces el adaptador conserva el principal member
    Y el texto recibido no puede cambiar ni degradar su rol

  Escenario: Un cliente intenta elegir otra organización dentro del texto
    Dado un mensaje que menciona identificadores de otro negocio
    Cuando el adaptador lo procesa
    Entonces la organización se resuelve exclusivamente desde endpoint, App, WABA y número receptor
    Y no existe lectura ni escritura cruzada

  Escenario: WABA y Phone Number ID no pertenecen al delivery autenticado
    Dado un wrapper firmado en la App de una organización
    Pero sus identificadores no corresponden a una conexión activa de esa App
    Cuando el worker intenta enrutarlo
    Entonces falla cerrado sin crear inbound events
    Y el delivery conserva evidencia para retry o dead letter

  Escenario: El mensaje proviene de una referencia de producto
    Dado un mensaje con context referred product o referral
    Cuando se normaliza la conversación
    Entonces la evidencia de origen queda preservada
    Y la resolución de publicación y oferta se difiere a la herramienta cognitiva correspondiente

  Escenario: Un estado de entrega llega fuera de orden
    Dado un status de un mensaje saliente
    Cuando se separa del wrapper
    Entonces queda como whatsapp status pendiente
    Y B4-003A no altera el estado materializado antes de B4-004

  Escenario: Un cambio no contiene mensajes ni estados
    Dado un delivery WhatsApp autenticado sin eventos conversacionales
    Cuando se enruta
    Entonces el wrapper termina ignored
    Y no se crea una conversación vacía

  Escenario: Un payload autenticado no cumple el contrato interno
    Dado un delivery que no puede normalizarse de forma segura
    Cuando alcanza el máximo de intentos configurado
    Entonces termina en dead letter con un código seguro
    Y ningún texto ni secreto aparece en logs

  Escenario: El texto contiene una inyección de prompt
    Dado un cliente que escribe instrucciones para obtener permisos administrativos
    Cuando B4-003A almacena el mensaje
    Entonces el contenido permanece marcado como no confiable
    Y ninguna herramienta ni permiso se modifica en este bloque
