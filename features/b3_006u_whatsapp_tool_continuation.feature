# language: es
Característica: Continuación confiable del agente de WhatsApp tras usar herramientas
  El agente debe responder sin perder el turno ni inventar que ejecutó acciones.

  Escenario: El proveedor propone varias herramientas en una sola respuesta
    Dado que MiniMax devuelve dos llamadas nativas en el mismo turno
    Cuando el adaptador prepara la ejecución durable
    Entonces persiste solo la primera llamada y su continuación correspondiente
    Y el modelo puede decidir la siguiente herramienta en otra ronda

  Escenario: Una herramienta termina cuando se agotaron los intentos iniciales
    Dado que un turno consumió todos los intentos de proveedor antes de resolver una herramienta
    Cuando la herramienta termina y la ejecución vuelve a esperar al proveedor
    Entonces el trabajo y el turno reciben un nuevo presupuesto acotado de intentos
    Y sus contadores de intentos conservan numeración monotónica

  Escenario: Una transición duplicada intenta extender los intentos
    Dado que una ronda de herramientas ya recibió su presupuesto de continuación
    Cuando se intenta otorgar el mismo presupuesto otra vez
    Entonces la base de datos rechaza la segunda ampliación

  Escenario: Un cliente no puede cambiar el presupuesto privado del agente
    Dado que un cliente conoce los identificadores de un turno ajeno
    Cuando intenta llamar a la función privada de presupuesto
    Entonces la base de datos niega la ejecución
