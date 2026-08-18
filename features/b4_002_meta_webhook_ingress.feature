# language: es
Característica: Ingreso seguro e idempotente de webhooks Meta
  Como operador de AgenteFer
  Quiero autenticar y persistir cada entrega de Meta antes de procesarla
  Para atender WhatsApp y Messenger sin mezclar organizaciones ni duplicar efectos

  Regla: El challenge sólo activa el endpoint opaco correcto

    Escenario: Meta verifica un endpoint con su token vigente
      Dado un endpoint pendiente con verify token cifrado en Vault
      Cuando Meta envía modo subscribe token correcto y challenge
      Entonces el API activa ese endpoint atómicamente y devuelve exactamente el challenge

    Escenario: Meta envía un modo de challenge distinto de subscribe
      Dado un endpoint pendiente con verify token vigente
      Cuando llega un modo de challenge no permitido
      Entonces el API rechaza la verificación y no activa el endpoint

    Escenario: Un token de otra organización intenta verificar el endpoint
      Dado dos organizaciones con endpoints y verify tokens diferentes
      Cuando el endpoint de la primera recibe el token de la segunda
      Entonces el API rechaza la verificación sin revelar qué parte fue incorrecta

  Regla: La firma se valida sobre los mismos bytes que se persisten

    Escenario: Llega una entrega válida de WhatsApp
      Dado un endpoint activo y un App Secret vigente
      Cuando Meta firma los bytes crudos de un lote whatsapp_business_account
      Entonces el API persiste un inbox privado con SHA-256 y JSON derivados de esos mismos bytes

    Escenario: Llega una entrega válida de Messenger
      Dado un endpoint activo y un App Secret vigente
      Cuando Meta firma los bytes crudos de un lote page
      Entonces el API conserva el tipo page para su normalización asíncrona posterior

    Escenario: La firma no corresponde al body recibido
      Dado un endpoint activo
      Cuando el body cambia después de haberse calculado la firma
      Entonces el API rechaza la entrega y no persiste ningún inbox

    Escenario: Una firma de la organización A llega al endpoint de B
      Dado dos organizaciones con Apps Secrets independientes
      Cuando una entrega de A apunta al endpoint opaco de B
      Entonces el API rechaza la firma y ninguna organización recibe trabajo ajeno

    Escenario: Un body firmado contiene JSON malformado
      Dado una firma válida para los bytes recibidos
      Cuando los bytes no forman un objeto JSON Meta válido
      Entonces el API rechaza el payload sin registrar el body ni detalles sensibles

    Escenario: Un lote firmado excede los límites operativos
      Dado una entrega auténtica de Meta
      Cuando supera un MiB o contiene más de cien entries
      Entonces el API falla cerrado antes de crear trabajo durable

  Regla: Los reintentos producen evidencia pero no efectos duplicados

    Escenario: Meta reenvía exactamente la misma entrega
      Dado una entrega autenticada ya persistida
      Cuando el mismo endpoint recibe otra vez los mismos bytes firmados
      Entonces conserva un solo inbox incrementa el contador y responde éxito idempotente

    Escenario: La respuesta HTTP se pierde después de persistir
      Dado que la transacción de ingreso terminó pero Meta no recibió la respuesta
      Cuando Meta reintenta la misma entrega
      Entonces el API reconoce el replay y no crea un segundo trabajo

    Escenario: Dos organizaciones reciben bytes idénticos legítimos
      Dado endpoints opacos distintos con Apps Secrets independientes
      Cuando cada App firma y entrega los mismos bytes a su endpoint
      Entonces cada organización conserva su propio inbox sin colisión cross-tenant

    Escenario: El mismo JSON llega con bytes diferentes
      Dado dos representaciones firmadas distintas del mismo contenido JSON
      Cuando ambas pasan autenticación
      Entonces B4-002 preserva ambas entregas y B4-003 deduplica por evento de proveedor

  Regla: La recepción permanece rápida y recuperable

    Escenario: Supabase no responde dentro del presupuesto del webhook
      Dado que el API no puede confirmar persistencia durable
      Cuando vence el timeout menor al límite de Meta
      Entonces responde un fallo temporal redactado para que Meta reintente

    Escenario: Un lote contiene eventos para varios números o páginas
      Dado una entrega Meta autenticada con múltiples entries
      Cuando el API termina la transacción de ingreso
      Entonces responde sin esperar el ruteo por conexión ni al agente cognitivo

    Escenario: El App Secret rota con solapamiento
      Dado un endpoint activo y una entrega previamente recibida
      Cuando se crea una nueva versión de App Secret en Vault
      Entonces las firmas autorizadas siguen funcionando sin cambiar código ni redesplegar

    Escenario: Se observa una solicitud de webhook
      Dado logging estructurado y correlación por request y trace
      Cuando el API acepta rechaza o difiere una entrega
      Entonces registra sólo IDs seguros resultado latencia y categoría sin body firma token ni secreto
