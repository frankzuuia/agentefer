# language: es
@b2-010 @storage @media @catalog
Característica: Almacenamiento durable y ligero de imágenes de catálogo
  Para que el agente pueda analizar, mostrar y enviar fotografías sin inflar PostgreSQL
  Como plataforma multitenant de AgenteFer
  Quiero conservar objetos derivados en Storage y sólo metadatos verificables en la base

  Regla: PostgreSQL nunca es almacén de binarios ni URLs temporales

    Escenario: Una fotografía verificada conserva original y derivados por canal
      Dado un medio autorizado perteneciente a una organización
      Cuando el backend registra su ciclo de almacenamiento
      Entonces el original permanece en un bucket privado
      Y existe un derivado WebP para web o visión
      Y puede existir un derivado JPEG compatible con WhatsApp
      Y PostgreSQL sólo conserva bucket ruta hash MIME tamaño dimensiones y estado
      Y ninguna columna conserva Base64 blob URL pública completa o URL firmada

    Escenario: Una URL firmada caduca sin modificar la identidad del medio
      Dado un objeto privado verificado
      Cuando un backend autorizado solicita acceso temporal
      Entonces Storage genera una URL con expiración
      Y la URL no se persiste en ninguna tabla
      Y una nueva solicitud puede emitir otra URL para el mismo path inmutable

  Regla: Cada organización queda aislada también dentro de Storage

    Escenario: Un miembro intenta leer el original de otra organización
      Dado un path cuyo primer segmento pertenece a otra organización
      Cuando el miembro autenticado solicita el objeto privado
      Entonces la política de Storage rechaza la lectura
      Y la vista administrativa tampoco expone el objeto

    Escenario: Un backend intenta registrar un path fuera del prefijo tenant
      Dado un asset de una organización válida
      Cuando se registra un object path con otro prefijo o recorrido de directorio
      Entonces PostgreSQL rechaza la relación
      Y el asset no puede marcarse como verificado por esa operación

  Regla: La galería es explícita y nunca se publica por inferencia

    Escenario: Fer agrega otra foto a un producto existente
      Dado un asset verificado de la misma organización
      Cuando una herramienta administrativa lo vincula al producto identificado
      Entonces la relación conserva producto variante opcional rol ordinal y texto alternativo
      Y permanece en borrador hasta aprobación autorizada

    Escenario: Se intenta asociar un asset ajeno o no verificado
      Dado un producto y un medio incompatibles por tenant o estado
      Cuando se crea la relación de galería
      Entonces la operación falla atómicamente
      Y no altera el orden de las fotografías existentes

    Escenario: Dos fotos intentan ocupar el mismo ordinal
      Dado una galería de producto o variante
      Cuando dos operaciones concurrentes solicitan la misma posición
      Entonces exactamente una puede conservar ese ordinal
      Y la otra recibe un conflicto recuperable

  Regla: La publicación separa evidencia privada de contenido comercial

    Escenario: Un derivado WebP todavía no fue aprobado
      Dado un original y derivados privados verificados
      Cuando un cliente consulta la futura tienda QR
      Entonces ningún objeto privado se vuelve público
      Y sólo un derivado expresamente aprobado puede registrarse como publicado

    Escenario: El archivo declara imagen pero sus bytes no corresponden
      Dado un medio entrante con MIME o firma real inválidos
      Cuando el pipeline seguro lo verifica
      Entonces el asset queda rechazado o en cuarentena
      Y no puede ligarse a producto publicación visión ni envío WhatsApp
