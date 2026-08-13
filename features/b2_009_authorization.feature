# language: es
Característica: Autorización integral y aislamiento por organización
  Como propietario de AgenteFer
  Quiero una frontera de grants y RLS cerrada por defecto
  Para que ningún actor vea o modifique información fuera de su autoridad

  Regla: La exposición de objetos es explícita

    Escenario: Un visitante anónimo intenta usar el esquema privado
      Dado un request con rol anon
      Cuando intenta consultar una tabla app_private
      Entonces recibe denegación sin datos

    Escenario: Un visitante anónimo intenta usar una vista administrativa
      Dado un request con rol anon
      Cuando consulta una vista api
      Entonces recibe denegación sin revelar filas

    Escenario: Una función nueva conserva defaults restrictivos
      Dado un objeto efímero creado por postgres
      Cuando no existe un grant explícito
      Entonces PUBLIC anon authenticated y service_role no reciben acceso automático

    Escenario: El esquema privado no está expuesto por Data API
      Dado la configuración Supabase versionada
      Cuando se enumeran los esquemas publicados
      Entonces app_private no aparece en schemas ni extra_search_path

    Escenario: Todas las vistas administrativas respetan al invocador
      Dado el catálogo de vistas api
      Cuando se revisan sus opciones de seguridad
      Entonces todas usan security_invoker y security_barrier

  Regla: La membresía activa define la organización

    Escenario: Un owner consulta su organización
      Dado un owner activo de la organización A
      Cuando consulta una vista member
      Entonces observa sólo filas de A

    Escenario: Un viewer consulta información no sensible
      Dado un viewer activo de la organización A
      Cuando consulta catálogo precios inventario pedidos y ventas member
      Entonces observa las filas autorizadas de A

    Escenario: Un usuario manipula el ID de otra organización
      Dado un miembro activo de A y una fila de B
      Cuando intenta consultar la fila de B por ID conocido
      Entonces obtiene cero filas sin confirmar su existencia

    Escenario: Un usuario suspendido conserva un JWT válido
      Dado una membresía suspendida de A
      Cuando consulta cualquier vista tenant
      Entonces obtiene cero filas

    Escenario: Una invitación pendiente intenta leer datos
      Dado una membresía invited sin activación
      Cuando consulta una vista tenant
      Entonces obtiene cero filas

    Escenario: Un usuario sin membresía intenta usar un organization_id válido
      Dado una identidad autenticada sin membresía
      Cuando envía el ID de A
      Entonces obtiene cero filas

  Regla: Los niveles humanos tienen mínimo privilegio

    Escenario: Un viewer intenta leer una conversación
      Dado un viewer activo
      Cuando consulta una superficie operator
      Entonces obtiene cero filas

    Escenario: Un operator lee una conversación de su organización
      Dado un operator activo
      Cuando consulta una superficie operator de su organización
      Entonces obtiene sus filas autorizadas

    Escenario: Un operator intenta leer configuración administrativa
      Dado un operator activo
      Cuando consulta una superficie admin
      Entonces obtiene cero filas

    Escenario: Un admin consulta configuración administrativa segura
      Dado un admin activo
      Cuando consulta una vista admin
      Entonces obtiene la proyección segura de su organización

    Escenario: Un owner consulta todas las clases humanas
      Dado un owner activo
      Cuando consulta superficies member operator y admin
      Entonces obtiene únicamente filas de su organización

    Escenario: Un usuario consulta su propio perfil
      Dado una identidad autenticada
      Cuando consulta api.user_profiles
      Entonces observa sólo su perfil

    Escenario: Un owner intenta consultar el perfil de otro usuario
      Dado un owner que conoce el ID de otro usuario
      Cuando consulta api.user_profiles por ese ID
      Entonces obtiene cero filas

  Regla: Las escrituras pasan por tools backend autorizadas

    Escenario: Un owner intenta insertar directamente
      Dado un owner autenticado
      Cuando ejecuta INSERT sobre una tabla privada
      Entonces recibe SQLSTATE 42501

    Escenario: Un admin intenta actualizar directamente
      Dado un admin autenticado
      Cuando ejecuta UPDATE sobre una tabla privada
      Entonces recibe SQLSTATE 42501

    Escenario: Un operator intenta borrar directamente
      Dado un operator autenticado
      Cuando ejecuta DELETE sobre una tabla privada
      Entonces recibe SQLSTATE 42501

    Escenario: Un actor humano intenta ejecutar una RPC mutadora
      Dado cualquier rol humano autenticado
      Cuando invoca una función administrativa api
      Entonces recibe SQLSTATE 42501

    Escenario: El backend invoca una RPC mutadora
      Dado service_role dentro del API o worker
      Cuando ejecuta una RPC autorizada con actor y organización válidos
      Entonces la función conserva sus invariantes de dominio

    Escenario: El LLM propone una acción
      Dado una tool call nativa producida por el LLM
      Cuando el backend recibe sus argumentos
      Entonces la autorización determinista valida actor organización rol y estado antes del efecto

  Regla: Funciones y columnas sensibles permanecen cerradas

    Escenario: Una vista usa columnas privadas necesarias
      Dado una vista api security_invoker
      Cuando se calculan sus dependencias de columnas
      Entonces authenticated tiene exactamente los grants requeridos para evaluarla

    Escenario: Un usuario pide una columna omitida de la vista
      Dado una columna privada sin grant
      Cuando authenticated intenta seleccionarla directamente
      Entonces recibe SQLSTATE 42501

    Escenario: Un usuario ejecuta el resolver de precio
      Dado un miembro autenticado de la organización
      Cuando invoca resolve_price_quote sobre datos propios
      Entonces recibe sólo el resultado permitido por RLS

    Escenario: Un usuario ejecuta el resolver de inventario
      Dado un miembro autenticado de la organización
      Cuando invoca resolve_inventory_requirements sobre datos propios
      Entonces recibe sólo el resultado permitido por RLS

    Escenario: Un usuario llama un resolver con datos de otra organización
      Dado un miembro autenticado de A
      Cuando invoca un resolver con IDs de B
      Entonces la operación falla sin revelar disponibilidad ni precio

    Escenario: Una función SECURITY DEFINER tiene ruta mutable
      Dado el catálogo de funciones de aplicación
      Cuando una función privilegiada no fija search_path vacío
      Entonces la migración o el gate de calidad falla

    Escenario: PUBLIC obtiene EXECUTE sobre una función
      Dado cualquier función app_private o api
      Cuando PUBLIC tiene privilegio EXECUTE
      Entonces el gate de calidad falla

  Regla: La matriz completa permanece verificable

    Escenario: Una tabla privada pierde RLS
      Dado cualquiera de las 89 tablas privadas
      Cuando RLS deja de estar habilitada o forzada
      Entonces pgTAP y mutation testing detectan la regresión

    Escenario: Una tabla humana pierde su policy
      Dado una tabla distinta de inbox o outbox
      Cuando desaparece su policy SELECT tenant-aware
      Entonces pgTAP y mutation testing detectan la regresión

    Escenario: Una policy usa metadata editable
      Dado una policy nueva o modificada
      Cuando contiene auth.jwt user_metadata o raw_user_meta_data
      Entonces el contrato de base falla

    Escenario: Un grant entrega escritura a authenticated
      Dado cualquiera de las tablas privadas
      Cuando authenticated obtiene INSERT UPDATE DELETE TRUNCATE REFERENCES o TRIGGER
      Entonces el contrato de base falla

    Escenario: Una columna requerida por una vista pierde su grant
      Dado cualquiera de las dependencias columna vista
      Cuando authenticated ya no puede leer la columna requerida
      Entonces la prueba de dependencias falla

    Escenario: Se agrega una entidad futura sin cerrar permisos
      Dado una migración posterior
      Cuando crea tabla vista secuencia o función de aplicación
      Entonces CI exige RLS grants vistas seguras y privilegios explícitos antes de aceptar el cambio
