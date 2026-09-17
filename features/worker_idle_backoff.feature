# language: es
@worker @reliability @cost-control
Característica: Sondeo adaptativo y seguro de colas durables
  Como plataforma AgenteFer
  Quiero reducir consultas vacías sin perder trabajos ni retrasar conversaciones
  Para conservar respuesta comercial y evitar consumo inútil de Supabase

  Regla: Un worker vacío reduce su frecuencia sin apagar la recuperación durable

    Escenario: Una cola permanece vacía
      Dado un consumidor sin trabajo disponible
      Cuando completa ciclos consecutivos sin reclamar un elemento
      Entonces la espera aumenta de forma acotada con jitter
      Y nunca excede el máximo configurado
      Y el worker conserva un sondeo de respaldo

    Escenario: Un ciclo encuentra trabajo
      Dado un consumidor que acumuló una racha de reposo
      Cuando reclama o recupera trabajo durable
      Entonces la racha se reinicia
      Y la siguiente espera usa el intervalo base configurado

    Escenario: La entrada WhatsApp produce trabajo secundario
      Dado un worker con los consumidores de entrada, medios e IA activos
      Cuando la entrada normaliza un delivery o mensaje
      Entonces despierta localmente a medios e IA
      Y no transmite contenido, tenant ni secretos en la señal

  Regla: Las señales no sustituyen la durabilidad

    Escenario: Una señal llega durante la espera
      Dado un consumidor esperando su siguiente sondeo
      Cuando otro consumidor detecta trabajo relacionado
      Entonces la espera termina sin crear un ciclo concurrente
      Y el claim durable sigue determinando qué worker procesa el elemento

    Escenario: La dependencia falla mientras no hay actividad
      Dado un consumidor cuyo RPC falla
      Cuando programa el siguiente intento
      Entonces readiness permanece degradado
      Y aplica una espera de recuperación en lugar de sondear cada segundo

    Escenario: El worker se detiene durante una espera adaptativa
      Dado un consumidor esperando trabajo
      Cuando el proceso recibe la señal de apagado
      Entonces limpia timer y listener
      Y no ejecuta un ciclo adicional después de detenerse
