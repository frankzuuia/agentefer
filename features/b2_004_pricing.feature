# language: es
Característica: Precios universales exactos y auditables
  Como Fer
  Quiero definir precios por variante, unidad, cantidad y vigencia
  Para vender cualquier producto sin perder historia ni inventar tarifas

  Regla: Las cantidades y unidades son datos, no columnas fijas

    Escenario: Configurar tarifas para una, cuatro y más unidades
      Dado un libro activo y una variante identificada
      Cuando Fer confirma tarifas para una unidad, cuatro unidades y cantidades mayores
      Entonces cada escalón queda como una fila con su unidad y rango
      Y una cantidad superior a cuatro puede resolverse sin cambiar código

    Escenario: Usar una unidad con cantidad decimal
      Dado que la organización configuró una unidad divisible
      Cuando Fer define un precio por unidad para una cantidad decimal permitida
      Entonces el total se calcula con aritmética decimal exacta
      Y una precisión superior a la unidad se rechaza

  Regla: Una tarifa explícita nunca se deriva silenciosamente

    Escenario: El paquete de cuatro tiene total propio
      Dado que existe una tarifa por pieza y otra tarifa fija para cuatro
      Cuando el cliente selecciona cuatro unidades
      Entonces recibe exactamente el total fijo configurado
      Y el servidor no multiplica la tarifa de una pieza

  Regla: La ausencia de precio es un estado comercial explícito

    Escenario: La variante requiere consultar precio
      Dado un escalón vigente con estado on_request
      Cuando se consulta una cantidad incluida en su rango
      Entonces la resolución devuelve on_request sin monto
      Y el agente no inventa ni deriva un precio

  Regla: Cantidad y vigencia no pueden ser ambiguas

    Escenario: Dos tarifas actuales se solapan
      Dado un libro, variante, unidad y vigencia existentes
      Cuando dos operaciones intentan confirmar rangos aplicables a la misma selección
      Entonces exactamente una puede persistir
      Y la otra recibe un conflicto recuperable

    Escenario: Dos tarifas usan vigencias consecutivas
      Dado que la primera termina cuando comienza la segunda
      Cuando se resuelve una cotización en cada instante
      Entonces cada instante devuelve una sola tarifa exacta

  Regla: Los cambios conservan anterior, nuevo y procedencia

    Escenario: Fer cambia el precio de una variante identificada
      Dado un escalón vigente con evidencia original
      Cuando la tool autorizada supersede ese escalón e inserta el nuevo
      Entonces el historial conserva ambos montos, actor, evidencia y fecha
      Y sólo la fila nueva participa en cotizaciones actuales

  Regla: El aislamiento entre organizaciones es obligatorio

    Escenario: Un miembro consulta precios administrativos
      Dado que pertenece únicamente a una organización
      Cuando consulta libros, escalones e historial
      Entonces sólo recibe filas de su organización
      Y una persona anónima no puede leer ni resolver precios
