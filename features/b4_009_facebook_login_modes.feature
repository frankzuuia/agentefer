# language: es
Característica: Conectar páginas propias sin mezclar negocios ni credenciales
  Como dueño de Frank - Pruebas
  Quiero conectar mi Facebook de pruebas aunque sea dueño de la app
  Para probar el catálogo sin crear otro portfolio ni usar el Facebook de Fer

  Escenario: Configuración explícita por organización
    Dado que el dueño está autenticado
    Cuando configura el acceso de páginas propias
    Entonces el modo y el identificador se guardan atómicamente y con auditoría
    Y ninguna otra organización cambia su configuración

  Escenario: Un administrador o dueño de otro negocio intenta configurar la app
    Cuando solicita cambiar el modo de acceso
    Entonces se rechaza la operación sin modificar datos

  Escenario: El modo cambia mientras el consentimiento está abierto
    Dado que la sesión guardó el modo de páginas propias
    Cuando la app cambia al modo empresarial antes del callback
    Entonces el intercambio conserva el modo de la sesión original

  Escenario: Obtener credenciales de páginas propias
    Cuando Meta entrega el código al callback autorizado
    Entonces el servidor lo intercambia por un token de usuario de larga duración
    Y consulta las páginas administrables y sus tokens individuales
    Y el navegador solo recibe ID nombre y tareas

  Escenario: Preservar acceso empresarial de otras organizaciones
    Dado que una organización usa el modo empresarial
    Cuando su dueño completa el consentimiento
    Entonces el backend usa el token empresarial y assigned_pages sin intercambio de usuario

  Escenario: Meta devuelve una credencial sin modo reconocido
    Cuando el servidor valida el contrato de la sesión
    Entonces falla sin intentar otro tipo de acceso automáticamente

  Escenario: Seleccionar la segunda página de varias autorizadas
    Cuando el dueño selecciona la segunda página
    Entonces solo su token se conserva en la conexión de esa organización
    Y se eliminan las credenciales temporales no seleccionadas

  Escenario: Credencial duplicada nula extra o incompatible
    Cuando se intenta guardar el paquete de autorización
    Entonces se rechaza antes de guardar secretos o activar la conexión

  Escenario: Listado incompleto de Meta
    Cuando la respuesta contiene una siguiente página de resultados
    Entonces no se sigue una URL arbitraria ni se guarda una autorización parcial

  Escenario: Error de Meta expiración o cancelación
    Cuando no se completa el consentimiento válido
    Entonces no se activa la página ni se cambia silenciosamente de modo
    Y el dueño puede iniciar una nueva autorización

  Escenario: Reutilizar el estado o elegir otra página
    Cuando se intenta completar una sesión consumida o una página no autorizada
    Entonces se rechaza sin crear otra conexión ni acceder a otro token

  Escenario: Intentar guardar credenciales sin identificador de intercambio
    Dado que el dueño tiene una sesión de autorización en curso
    Cuando se solicita guardar páginas con un lease nulo
    Entonces se rechaza sin guardar tokens ni avanzar el estado de la sesión

  Escenario: Completar conexión sin publicar
    Cuando el dueño regresa al catálogo con su página conectada
    Entonces el worker puede resolver la credencial de esa conexión
    Y ningún producto se publica automáticamente por conectar Facebook
