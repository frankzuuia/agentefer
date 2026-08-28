# language: es
Característica: Herramientas cognitivas de lectura para clientes de WhatsApp
  Como cliente atendido por AgenteFer
  Quiero que el modelo consulte información real del negocio
  Para recibir respuestas verificables sin inventar catálogo, precio ni existencia

  Escenario: El modelo busca un producto con lenguaje natural
    Dado un mensaje entrante dentro de una conversación WhatsApp activa
    Cuando el LLM llama de forma nativa a catalog_search
    Entonces el runtime consulta únicamente el catálogo activo de esa organización
    Y devuelve el resultado al mismo LLM antes de responder al cliente

  Escenario: El texto no coincide con ningún producto
    Dado que el catálogo no contiene una coincidencia activa
    Cuando el LLM llama a catalog_search
    Entonces la herramienta devuelve una lista vacía verificable
    Y el backend no inventa una respuesta comercial

  Escenario: Un SKU pertenece a otra organización
    Dado que dos organizaciones tienen catálogos aislados
    Cuando una llamada intenta consultar un identificador ajeno
    Entonces el resultado no revela ningún producto externo
    Y la ejecución conserva el tenant congelado del run

  Escenario: La política bloquea una herramienta válida por presupuesto
    Dado que el run alcanzó su presupuesto máximo antes de ejecutar una herramienta
    Cuando el LLM solicita una herramienta de solo lectura incluida en su política congelada
    Entonces la autorización queda bloqueada antes de ejecutar el handler
    Y el resultado durable informa tool_not_authorized con la razón exacta
    Y el agente continúa mediante un nuevo intento arrendado sin inventar información

  Escenario: El cliente solicita cuatro piezas
    Dado que existe una variante activa con precio vigente para cuatro unidades
    Cuando el LLM llama a catalog_get_offer con cantidad cuatro
    Entonces recibe el total exacto resuelto por B2-004
    Y no confunde precio por pieza con precio de paquete

  Escenario: El precio requiere consulta
    Dado que el escalón vigente tiene estado on_request
    Cuando el LLM consulta la oferta
    Entonces la herramienta devuelve on_request sin monto cero
    Y el modelo puede reunir datos o proponer escalamiento

  Escenario: La cantidad no tiene precio configurado
    Dado que no existe un escalón vigente para la cantidad pedida
    Cuando el LLM consulta la oferta
    Entonces la herramienta devuelve not_configured
    Y no reutiliza el precio de otra cantidad

  Escenario: El modelo solicita una herramienta fuera de policy
    Dado que la policy congelada no autoriza esa herramienta
    Cuando el proveedor intenta llamarla
    Entonces el ledger la bloquea antes de ejecutar dominio
    Y ninguna lectura o escritura no autorizada ocurre

  Escenario: Meta o el proveedor repite la misma llamada
    Dado que una tool call ya fue ejecutada y registrada
    Cuando reaparece el mismo call id con los mismos argumentos
    Entonces se reutiliza el resultado durable
    Y no se crea otra ejecución

  Escenario: Un call id se reutiliza con argumentos distintos
    Dado que una tool call ya existe en el run
    Cuando el mismo call id llega con argumentos diferentes
    Entonces la ejecución falla cerrada por conflicto
    Y el resultado anterior permanece inmutable

  Escenario: El worker cae después de guardar el resultado
    Dado que el tool result quedó confirmado en el ledger
    Cuando otro worker recupera el job
    Entonces reanuda el mismo run con el call id y resultado originales
    Y el LLM continúa sin pedir nuevamente datos ya resueltos

  Escenario: El modelo configurado es OpenAI
    Dado un tool result durable y neutral
    Cuando se reanuda el turno con OpenAI Responses
    Entonces el adapter envía function_call_output con el call id original

  Escenario: El modelo configurado es MiniMax
    Dado un tool result durable y neutral
    Cuando se reanuda el turno con MiniMax Chat Completions
    Entonces el adapter envía un mensaje tool con el tool_call_id original

  Escenario: El cliente intenta inyectar identificadores internos
    Dado un mensaje no confiable con UUID y órdenes administrativas
    Cuando el LLM consulta una tool autorizada
    Entonces PostgreSQL deriva la organización del run y no del texto
    Y el actor continúa siendo contact

  Escenario: La conversación está fuera de la ventana de servicio
    Dado un resultado cognitivo listo después de vencer la ventana de WhatsApp
    Cuando el outbox intenta enviar la respuesta
    Entonces el envío se bloquea por la política de 24 horas
    Y el agente no inicia mensajes por su cuenta

  Escenario: El backfill supera el tamaño de un lote
    Dado que hay más organizaciones pendientes que el límite configurado
    Cuando el worker ejecuta ciclos consecutivos de preparación
    Entonces cada organización ya preparada desaparece del siguiente lote
    Y ninguna organización queda bloqueada detrás de las primeras del orden

  Escenario: Una organización falla durante la preparación
    Dado que una organización no puede preparar sus herramientas
    Cuando el resto de organizaciones tiene configuración válida
    Entonces el fallo se audita exclusivamente dentro de la organización afectada
    Y las demás organizaciones continúan procesándose

  Escenario: Un fallo reciente entra en enfriamiento
    Dado un fallo durable de preparación ocurrido hace menos de cinco minutos
    Cuando el worker busca otro lote o intenta reclamar un mensaje nuevo
    Entonces aplaza únicamente esa organización
    Y no repite el mismo fallo en cada intervalo de sondeo

  Escenario: Un mensaje nuevo congela una política con herramientas listas
    Dado un mensaje entrante de WhatsApp todavía sin agent run
    Cuando el worker reclama el turno cognitivo
    Entonces prepara las herramientas nativas antes de crear el run
    Y la versión de policy congelada contiene los tres contratos actuales
