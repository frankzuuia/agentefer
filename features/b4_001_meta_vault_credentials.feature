# language: es
Característica: Credenciales Meta cifradas y aisladas por organización
  Como propietario de una organización en AgenteFer
  Quiero administrar mis credenciales Meta sin guardarlas en código ni variables compartidas
  Para conectar WhatsApp y Messenger sin mezclar cuentas ni revelar secretos

  Regla: Cada organización conserva una identidad Meta independiente

    Escenario: Se registra una primera aplicación Meta
      Dado una organización y una App Meta autorizada
      Cuando el backend registra App Secret y token de verificación
      Entonces crea una aplicación un endpoint opaco y dos versiones cifradas en una sola transacción

    Escenario: Una segunda organización registra su propia aplicación
      Dado dos organizaciones con Apps Meta diferentes
      Cuando ambas completan el registro
      Entonces cada una recibe un endpoint y credenciales independientes

    Escenario: Un canal intenta usar la aplicación de otra organización
      Dado un canal de la organización A y una App Meta de la organización B
      Cuando el backend intenta enlazarlos
      Entonces la base rechaza la relación cross-tenant

    Escenario: Un canal activo no tiene una aplicación Meta
      Dado un canal todavía sin App Meta enlazada
      Cuando intenta pasar a estado activo
      Entonces la base rechaza la activación

  Regla: El secreto existe solamente en Supabase Vault

    Escenario: Un propietario consulta la configuración Meta
      Dado un owner activo de la organización
      Cuando consulta las vistas api
      Entonces observa identidad estado y versión sin secreto ni referencia Vault

    Escenario: Un usuario anónimo intenta descifrar Vault
      Dado un request con rol anon
      Cuando intenta consultar vault.decrypted_secrets
      Entonces recibe denegación sin datos

    Escenario: Un usuario autenticado intenta descifrar Vault
      Dado un request con rol authenticated
      Cuando intenta consultar vault.decrypted_secrets
      Entonces recibe denegación sin datos

    Escenario: El backend intenta insertar una referencia Vault directamente
      Dado el rol de servicio de AgenteFer
      Cuando evita la RPC auditada e inserta una versión manualmente
      Entonces recibe denegación y no crea credencial

    Escenario: Se inspecciona la superficie Data API
      Dado la configuración PostgREST versionada
      Cuando se enumeran los esquemas expuestos
      Entonces sólo api y graphql_public están presentes y vault app_private public quedan fuera

  Regla: Challenge y firma se verifican sin extraer el secreto

    Escenario: Meta presenta el token de verificación correcto
      Dado un endpoint pendiente y su token cifrado vigente
      Cuando llega el challenge con el endpoint opaco
      Entonces la RPC identifica exactamente su organización App y versión

    Escenario: Meta presenta un token de verificación incorrecto
      Dado un endpoint pendiente
      Cuando llega un token distinto
      Entonces la RPC devuelve cero coincidencias sin revelar la causa sensible

    Escenario: El token correcto se prueba contra otra organización
      Dado dos endpoints de organizaciones distintas
      Cuando el token de A se presenta al endpoint de B
      Entonces la RPC devuelve cero coincidencias

    Escenario: Meta entrega un webhook con firma válida
      Dado un endpoint activo un body crudo y su App Secret vigente
      Cuando se verifica el HMAC SHA-256 de los bytes exactos
      Entonces la RPC identifica exactamente su organización App y versión

    Escenario: Un byte del webhook cambia
      Dado un webhook previamente firmado
      Cuando cambia un byte del body crudo
      Entonces la firma deja de ser válida

    Escenario: La firma válida de una App se reutiliza contra otra
      Dado dos Apps con secretos diferentes
      Cuando la firma de A se presenta al endpoint de B
      Entonces la RPC devuelve cero coincidencias

  Regla: La rotación no requiere cambiar código ni redesplegar

    Escenario: Se rota el App Secret con solapamiento
      Dado un App Secret actual
      Cuando se registra una nueva versión con periodo de solapamiento
      Entonces la nueva queda current y la anterior retiring hasta su vencimiento

    Escenario: Se rota el token de verificación sin solapamiento
      Dado un token de verificación actual
      Cuando se registra una nueva versión con solapamiento cero
      Entonces el anterior queda revocado y sólo el nuevo autentica

    Escenario: Una rotación falla a mitad de transacción
      Dado una operación de rotación auditada
      Cuando una constraint rechaza la nueva versión
      Entonces no quedan ni metadatos ni secretos Vault huérfanos

    Escenario: Se agrega una organización futura
      Dado una nueva organización sin IDs conocidos durante el despliegue
      Cuando completa el mismo flujo de registro
      Entonces funciona sin hardcodear cuenta App Página WABA número ni endpoint

  Regla: La trazabilidad nunca contiene material secreto

    Escenario: Se audita el alta y la rotación
      Dado credenciales registradas y rotadas
      Cuando se consultan los eventos de auditoría
      Entonces aparecen IDs tipo versión actor correlación y traza pero ningún valor secreto

    Escenario: Un owner conoce el ID interno de otra organización
      Dado un owner de A y credenciales de B
      Cuando consulta las vistas seguras por el ID de B
      Entonces obtiene cero filas sin confirmar su existencia
