# language: es
@b2-006 @commercial @production
Característica: Flujo comercial durable y auditable
  Para que el asistente no pierda clientes ni invente cierres
  Como organización que atiende conversaciones y catálogo
  Quiero separar pendientes, interesados, pedidos, handoffs y ventas reales

  Escenario: Oferta sin precio crea una pendiente identificable
    Dado que un cliente pregunta por una variante sin precio
    Cuando el agente reúne variante cantidad y conversación
    Entonces crea una pendiente abierta con esos identificadores
    Y no inventa precio ni modifica el catálogo

  Escenario: Varias pendientes requieren selección explícita
    Dado que Fer tiene dos pendientes compatibles con su instrucción
    Cuando pide responder sin indicar un ID único
    Entonces la búsqueda devuelve candidatos identificables
    Y ninguna pendiente cambia de estado

  Escenario: Resolver pendiente no declara mensaje entregado
    Dado que Fer autoriza una respuesta para una pendiente única
    Cuando la resolución queda registrada
    Entonces la pendiente conserva respuesta y actor
    Y la entrega sigue separada hasta que el outbox la confirme

  Escenario: Reintento idéntico no duplica pendiente
    Dado que una petición ya creó una pendiente
    Cuando llega otra vez con la misma clave y contrato
    Entonces devuelve la misma pendiente como replay
    Y existe un solo evento de creación

  Escenario: Clave reutilizada con otro cliente falla
    Dado que una clave ya pertenece a una pendiente
    Cuando se reutiliza con otra conversación o variante
    Entonces la transacción se rechaza
    Y la primera pendiente permanece intacta

  Escenario: Dos resoluciones concurrentes no pisan respuesta
    Dado que una pendiente está abierta
    Cuando dos resoluciones distintas compiten
    Entonces sólo una transición se confirma
    Y la otra observa que la pendiente ya no está abierta

  Escenario: Lead conserva varios intereses sin inventar variante
    Dado que un cliente pregunta por dos productos y uno no está identificado
    Cuando el agente captura el lead
    Entonces registra el interés identificado y el texto del otro
    Y no fabrica un ID de catálogo

  Escenario: Handoff solicitado no cambia responsable todavía
    Dado que el agente atiende una oportunidad
    Cuando solicita transferirla a Fer
    Entonces se crea un handoff pendiente
    Y la asignación del agente sigue activa hasta aceptación

  Escenario: Aceptar handoff cambia responsable atómicamente
    Dado que existe un handoff pendiente hacia un miembro activo
    Cuando el miembro acepta
    Entonces termina la asignación anterior y abre la nueva
    Y nunca existen dos responsables activos

  Escenario: Handoff duplicado se deduplica
    Dado que una oportunidad ya tiene transferencia pendiente
    Cuando un webhook o tool reintenta la misma solicitud
    Entonces devuelve el mismo handoff
    Y no genera otra notificación comercial

  Escenario: Fer devuelve la conversación al agente
    Dado que Fer tiene una oportunidad asignada
    Cuando solicita que el agente continúe
    Entonces se registra un handoff de retorno
    Y al aceptarlo la responsabilidad vuelve al agente indicado

  Escenario: Miembro suspendido no puede recibir handoff
    Dado que el destino ya no tiene membresía activa
    Cuando se intenta crear o aceptar la transferencia
    Entonces PostgreSQL rechaza la transición
    Y conserva al responsable actual

  Escenario: Checkout crea pedido y no venta
    Dado que un cliente finaliza una selección válida
    Cuando se crea el pedido idempotente
    Entonces guarda líneas y snapshots comerciales
    Y no crea ninguna venta ni estado de pago

  Escenario: Línea sin precio mantiene pedido pendiente de cotización
    Dado que una línea vigente tiene precio por consultar
    Cuando se crea el pedido
    Entonces el pedido queda pending_quote con montos nulos
    Y no deriva un total desde otro precio

  Escenario: Cambio posterior de precio no reescribe pedido
    Dado que un pedido guardó un precio vigente
    Cuando Fer publica otra tarifa después
    Entonces la línea conserva el snapshot original
    Y una nueva cotización requiere una transición explícita

  Escenario: Reintento de checkout no duplica pedido
    Dado que la red repite la confirmación del catálogo
    Cuando llega la misma clave y las mismas líneas
    Entonces se devuelve el pedido existente
    Y no se duplican líneas ni notificaciones

  Escenario: Reserva vencida no desaparece del pedido
    Dado que un pedido enlazó una reserva de inventario
    Cuando la reserva expira antes de confirmar
    Entonces el vínculo histórico permanece
    Y el pedido puede pasar explícitamente a stock_unavailable

  Escenario: Venta parcial no completa todo el pedido
    Dado que un pedido contiene varias unidades
    Cuando se registra una venta por una parte
    Entonces el pedido queda parcialmente atendido
    Y la cantidad restante sigue visible

  Escenario: Dos ventas concurrentes no sobrecumplen una línea
    Dado que queda una unidad sin vender en una línea
    Cuando dos cierres intentan venderla al mismo tiempo
    Entonces sólo uno se registra
    Y la suma vendida nunca supera la cantidad pedida

  Escenario: Venta externa con inventario pendiente es conciliable
    Dado que Fer cerró una venta fuera del flujo
    Cuando falta todavía el movimiento físico verificable
    Entonces la venta declara inventory_effect_status pending
    Y el reporte no afirma que el stock fue aplicado

  Escenario: Conciliación tardía exige el movimiento físico exacto
    Dado que una línea de venta quedó con inventario pendiente
    Cuando aparece una operación con la misma variante unidad cantidad y dirección
    Entonces la conciliación cambia sólo el estado operativo a applied
    Y un reintento no duplica ni reutiliza el movimiento

  Escenario: Pedido web notifica por un canal independiente
    Dado que un pedido del catálogo web no tiene conversación de origen
    Cuando el outbox entrega a Fer la notificación por WhatsApp
    Entonces el pedido conserva vacío su canal de origen
    Y registra por separado el canal real de notificación

  Escenario: Corrección de venta conserva original
    Dado que una venta registrada fue incorrecta
    Cuando se crea una reversa autorizada
    Entonces la reversa referencia la venta original
    Y ninguna fila histórica se edita o elimina

  Escenario: Organización ajena no puede cruzar datos comerciales
    Dado que dos organizaciones tienen contactos y pedidos distintos
    Cuando una petición mezcla sus identificadores
    Entonces las FKs y RLS rechazan el cruce
    Y no se filtran snapshots ni datos de contacto
