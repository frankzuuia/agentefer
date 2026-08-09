# language: es
Característica: Catálogo universal cognitivo y aislado por organización
  Como Fer
  Quiero administrar cualquier clase de producto mediante el agente
  Para mantener un catálogo verificable sin inventar datos ni desplegar código por categoría

  Regla: Las categorías, atributos, opciones y unidades son datos configurables

    Escenario: Crear una categoría comercial nueva sin cambiar el software
      Dado que Fer está autenticado como propietario de su organización
      Cuando el agente propone una categoría nueva con atributos tipados y Fer la confirma
      Entonces la categoría y su contrato de atributos quedan disponibles en el catálogo
      Y no se requiere una migración específica para ese rubro comercial

  Regla: La extracción del modelo no es automáticamente un hecho comercial

    Escenario: Una fotografía no permite confirmar un atributo obligatorio
      Dado un medio verificado y una observación multimodal atribuida al modelo usado
      Cuando el agente no puede confirmar un atributo obligatorio
      Entonces conserva la propuesta y la evidencia en un borrador
      Y registra el atributo como desconocido o propuesto
      Y la base de datos impide activar la oferta

    Escenario: Fer confirma la información faltante
      Dado un borrador con atributos obligatorios pendientes
      Cuando Fer aporta evidencia de confirmación y el agente llama la herramienta autorizada
      Entonces los valores confirmados se guardan con su evidencia
      Y el producto y su variante pueden activarse sólo si cumplen el contrato configurado

  Regla: Producto, variante y SKU son identidades diferentes

    Escenario: Dos configuraciones vendibles requieren SKU distinto
      Dado un producto con dos configuraciones vendibles
      Cuando el agente intenta asignar el mismo SKU ignorando mayúsculas y minúsculas
      Entonces la segunda asignación es rechazada atómicamente
      Y el SKU retirado permanece reservado para conservar trazabilidad

    Escenario: Dos operaciones concurrentes intentan crear el mismo SKU
      Dado que ambas operaciones pertenecen a la misma organización
      Cuando intentan confirmar simultáneamente el mismo SKU
      Entonces exactamente una operación puede persistirlo
      Y la otra recibe un conflicto recuperable sin duplicar el catálogo

  Regla: Los candidatos nunca se reutilizan silenciosamente

    Escenario: El análisis encuentra más de un producto parecido
      Dado un borrador de ingesta con candidatos y diferencias registradas
      Cuando el agente necesita decidir entre reutilizar o crear
      Entonces muestra identificadores verificables a Fer
      Y sólo una decisión explícita ligada a evidencia puede resolver el borrador

  Regla: El aislamiento entre organizaciones no admite excepciones

    Escenario: Un miembro consulta el catálogo administrativo
      Dado que pertenece únicamente a una organización
      Cuando consulta categorías, productos, variantes y SKU
      Entonces sólo recibe filas de su organización
      Y una persona anónima no puede leer ninguna tabla ni vista administrativa
