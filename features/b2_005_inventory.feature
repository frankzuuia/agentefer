# language: es
@b2-005 @inventory @production
Característica: Inventario transaccional universal
  Para vender cualquier mercancía sin prometer existencias inexistentes
  Como asistente autorizado de una organización
  Quiero movimientos, composiciones y reservas atómicos, auditables e idempotentes

  Escenario: Dos clientes disputan la última unidad
    Dado que existe una sola unidad disponible de una variante
    Cuando dos reservas autorizadas intentan confirmarla al mismo tiempo
    Entonces exactamente una reserva queda confirmada
    Y el saldo disponible nunca queda debajo de cero

  Escenario: Reintento idéntico no duplica un movimiento
    Dado que una entrada fue confirmada con una clave idempotente
    Cuando el mismo contrato llega otra vez con la misma clave
    Entonces se devuelve la misma operación como replay
    Y la existencia cambia una sola vez

  Escenario: Reutilización conflictiva de la clave idempotente
    Dado que una clave idempotente ya confirmó una operación
    Cuando otra petición reutiliza la clave con cantidades diferentes
    Entonces la segunda petición se rechaza completamente
    Y el ledger y el saldo conservan el primer resultado

  Escenario: Un combo consume todos sus componentes declarados
    Dado que una composición activa declara varios artículos inventariables
    Cuando se consume una unidad vendible del combo
    Entonces cada componente se descuenta por su cantidad declarada
    Y si falta cualquier componente no se descuenta ninguno

  Escenario: Ajuste absoluto concurrente con una entrada
    Dado que Fer solicita establecer una existencia física exacta
    Cuando una entrada disputa el mismo saldo
    Entonces ambas operaciones se ordenan mediante bloqueo
    Y cada delta real queda registrado sin actualización perdida

  Escenario: Unidad indivisible rechaza fracciones
    Dado que el artículo usa una unidad con escala decimal cero
    Cuando una operación intenta mover una cantidad fraccionaria
    Entonces la transacción se rechaza sin redondear

  Escenario: Traslado atómico entre ubicaciones
    Dado que una ubicación origen y una ubicación destino activas
    Cuando se registra un traslado con salida y entrada
    Entonces ambas líneas se confirman en la misma operación
    Y una falla en cualquiera revierte el traslado completo

  Escenario: Venta externa agota existencia sin borrar historia
    Dado que Fer vendió fuera del catálogo la última unidad
    Cuando el asistente registra la venta con motivo y referencia
    Entonces la existencia llega exactamente a cero
    Y la operación y sus movimientos permanecen auditables

  Escenario: Reabastecimiento de un artículo agotado
    Dado que un artículo tiene existencia cero
    Cuando Fer registra dos unidades recibidas
    Entonces la existencia disponible aumenta a dos
    Y ninguna publicación se activa sin la política de un bloque posterior

  Escenario: Consumo parcial y expiración de reserva
    Dado que una reserva activa contiene varias unidades
    Cuando una parte se consume y el remanente vence
    Entonces sólo la parte consumida reduce existencia
    Y la expiración libera únicamente el remanente

  Escenario: Conteo físico no puede invadir reservas
    Dado que parte de la existencia está reservada
    Cuando un ajuste absoluto intenta fijar existencia menor que la reserva
    Entonces la operación se rechaza
    Y la promesa existente permanece respaldada

  Escenario: Operaciones inversas no producen deadlock
    Dado que dos transacciones afectan los mismos artículos en orden inverso
    Cuando se ejecutan al mismo tiempo
    Entonces ambas usan el orden canónico de bloqueo
    Y terminan sin saldo negativo ni deadlock

  Escenario: Aislamiento entre organizaciones
    Dado que dos organizaciones tienen artículos y ubicaciones diferentes
    Cuando una petición mezcla identificadores de ambas
    Entonces la base de datos rechaza la referencia cruzada
    Y ninguna organización puede leer el inventario de la otra

  Escenario: El rol de servicio no puede saltarse el ledger
    Dado que el backend usa el rol de servicio
    Cuando intenta editar un saldo o borrar un movimiento directamente
    Entonces PostgreSQL deniega la escritura
    Y sólo las RPC auditadas pueden producir efectos

  Escenario: Pausa comercial independiente del stock
    Dado que una variante pausada conserva existencia positiva
    Cuando se consulta el ledger interno
    Entonces su saldo histórico permanece correcto
    Y la pausa no fabrica un movimiento de inventario
