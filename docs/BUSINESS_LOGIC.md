# AgenteFer — lógica de negocio

Estado: baseline de Bloque 0.  
Fuente: `docs/context/ORIGINAL_REQUIREMENTS.md`.  
Convención: `BL-nnn: nombre -> regla -> dirección técnica`.

## BL-001: Frontera organizacional

**Regla →** Toda operación pertenece a una organización y nunca puede leer o modificar datos de otra.  
**Dirección técnica →** `organization_id` obligatorio en datos operativos, membresías explícitas, RLS y contexto de organización en cada herramienta.

- Actor: propietario, cliente, sistema y operador autorizado.
- Requisitos: RQ-080, RQ-082, RQ-087, RQ-088, RQ-094, RQ-099.
- Datos: organizaciones, miembros, identidades de canal, configuraciones y todos los agregados operativos.
- Permiso: membresía activa y rol suficiente; el contexto nunca se acepta ciegamente desde el cliente.
- Auditoría: organización, actor, operación y correlación en toda acción sensible.
- Validación: pruebas negativas de lectura/escritura cruzada y herramientas con organización alterada.

## BL-002: Propietario accesible y autenticado

**Regla →** Fer administra el negocio por lenguaje natural, audio, imágenes y comandos breves, pero solo desde identidades previamente vinculadas.  
**Dirección técnica →** adaptadores de canal normalizan mensajes; un registro de identidad vincula remitente/canal con usuario y organización antes de exponer herramientas administrativas.

- Actor: Fer o administrador delegado.
- Requisitos: RQ-001, RQ-002, RQ-003, RQ-078, RQ-094.
- Datos: usuarios, membresías, identidades de canal, sesiones y preferencias de accesibilidad.
- Permiso: propietario/administrador verificado.
- Auditoría: autenticación, comando original referenciado, herramienta invocada y resultado.
- Validación: audio/texto del propietario funciona; el mismo comando enviado por un cliente queda denegado.

## BL-003: Atención iniciada por el cliente

**Regla →** WhatsApp y Messenger atienden conversaciones entrantes; no se envía spam ni se inicia contacto fuera de consentimiento y política vigente.  
**Dirección técnica →** política de mensajería separada del razonamiento, con ventana/consentimiento/plantilla verificados antes de cualquier envío.

- Actor: cliente, agente y sistema de mensajería.
- Requisitos: RQ-009, RQ-010, RQ-025.
- Datos: conversaciones, consentimientos, ventanas, plantillas autorizadas y mensajes.
- Permiso: conversación iniciada/consentimiento válido y credenciales del canal.
- Auditoría: decisión de elegibilidad, plantilla cuando aplique, ID externo y estado de entrega.
- Validación: mensajes dentro/fuera de ventana, ausencia de consentimiento y reintentos del proveedor.

## BL-004: Contexto de publicación y conversación

**Regla →** Una consulta originada en una publicación se atiende primero sobre el producto/variante publicado y conserva ese contexto durante el diálogo.  
**Dirección técnica →** relaciones entre publicación externa, variante, conversación y mensaje de referencia; el LLM recibe contexto recuperado, no inferido del texto solamente.

- Actor: cliente y agente.
- Requisitos: RQ-011, RQ-013, RQ-014, RQ-069.
- Datos: publicaciones, conversaciones, participantes, mensajes y etapa comercial.
- Permiso: lectura pública de datos comerciales vigentes; PII restringida a la organización.
- Auditoría: origen de conversación, cambios de producto focal y recuperación de contexto.
- Validación: mensajes con/sin referencia de publicación, publicaciones borradas y múltiples productos en una conversación.

## BL-005: Catálogo como fuente de verdad comercial

**Regla →** El agente solo afirma precio, stock, fotos, garantía y condición a partir de datos vigentes del catálogo; los faltantes se reconocen.  
**Dirección técnica →** herramientas de consulta devuelven datos versionados con procedencia; la respuesta distingue hechos, conocimiento general e incertidumbre.

- Actor: cliente, Fer y agente.
- Requisitos: RQ-015, RQ-016, RQ-017, RQ-042, RQ-051.
- Datos: productos, variantes, atributos, precios, inventario, medios, garantías y procedencia.
- Permiso: lectura pública filtrada o lectura administrativa según actor.
- Auditoría: consultas relevantes y fuentes usadas para afirmaciones comerciales.
- Validación: precio ausente, stock desactualizado, atributo dudoso e intento de inventar compatibilidad.

## BL-006: Precio faltante y respuesta diferida

**Regla →** Si falta precio, el agente recopila los datos necesarios, crea una solicitud pendiente para Fer y puede reanudar la conversación exacta cuando Fer responda.  
**Dirección técnica →** entidad de tarea/consulta pendiente ligada a conversación, variante, cliente y campos solicitados; resolución mediante tool call y notificación idempotente.

- Actor: cliente, Fer y agente.
- Requisitos: RQ-019, RQ-020, RQ-021, RQ-076.
- Datos: solicitudes pendientes, conversaciones, variantes, mensajes y notificaciones.
- Permiso: cliente crea necesidad; solo propietario autorizado fija/resuelve precio.
- Auditoría: creación, datos recopilados, resolución, cambio de precio opcional y respuesta enviada.
- Validación: una pendiente, varias pendientes ambiguas, cliente inactivo y fallo de envío después de resolver.

## BL-007: Cierre autónomo o handoff humano

**Regla →** Fer define si el agente intenta cerrar o califica y transfiere; la transferencia incluye todo el contexto útil y puede devolverse al agente.  
**Dirección técnica →** máquina de estados comercial determinista con política configurable; el LLM decide propuestas dentro de permisos y usa herramientas para transferir/reanudar.

- Actor: Fer, cliente y agente.
- Requisitos: RQ-022, RQ-023, RQ-024.
- Datos: conversaciones, leads, oportunidades, handoffs, responsables y notas estructuradas.
- Permiso: política de organización; transferencia/reanudación autorizada.
- Auditoría: motivo, responsable anterior/nuevo, resumen y tiempos.
- Validación: ambos modos, transferencia duplicada, Fer no disponible y retorno posterior.

## BL-008: Ingesta multimodal con confirmación

**Regla →** Fotografías y texto producen una propuesta de producto; datos críticos ausentes o ambiguos se preguntan antes de publicar.  
**Dirección técnica →** visión/LLM llama herramientas de borrador con evidencia y confianza; validadores operativos impiden activar variantes incompletas.

- Actor: Fer y agente.
- Requisitos: RQ-040, RQ-041, RQ-042, RQ-043, RQ-050, RQ-104.
- Datos: archivos, hashes, borradores, atributos propuestos, evidencia, medios y preguntas pendientes.
- Permiso: propietario/administrador; archivos aislados por organización.
- Auditoría: archivo origen, modelo/versión, propuesta, correcciones y confirmación.
- Validación: imagen clara, borrosa, maliciosa, duplicada, tipo falso, precio tapado y múltiples productos.

## BL-009: Producto, variante y SKU

**Regla →** El producto agrupa cualquier oferta comercial permitida; cada combinación vendible distinta tiene variante y SKU estable, sin duplicar silenciosamente una existente. Una categoría nueva se registra como dato de la organización y no exige cambiar código.  
**Dirección técnica →** Núcleo agnóstico a categoría, IDs internos inmutables, SKU único por organización, definiciones de atributos tipados y búsqueda semántica/estructurada para candidatos; Fer resuelve ambigüedad. No existen columnas, enums ni ramas de dominio exclusivas para llantas, rines, tinacos o tambos.

- Actor: Fer y agente.
- Requisitos: RQ-004, RQ-044, RQ-045, RQ-048, RQ-049, RQ-052, RQ-110.
- Datos: categorías configurables, definiciones/valores tipados de atributos, productos, variantes, unidades de venta, SKUs y relaciones de medios.
- Permiso: edición administrativa; lectura pública solo de activos.
- Auditoría: alta, candidato descartado/elegido, cambio de SKU y fusión futura.
- Validación: llanta con/sin rin como fixture; tinaco por capacidad/material; tambor por presentación; artículo genérico sin atributos especializados; categoría creada por Fer; reclasificación controlada; mismo modelo distinta variante y SKU concurrente.

## BL-010: Precios explícitos y por cantidad

**Regla →** Cada variante puede tener precio por cualquier unidad vendible, paquete o escalón de cantidad configurado; un precio no se deriva si Fer proporcionó una tarifa explícita distinta. Las cantidades 1–4 son un caso comercial posible, no un límite del catálogo.  
**Dirección técnica →** libro de precios versionado con unidad de venta explícita, cantidad mínima/máxima, moneda, vigencia y estado `priced`/`on_request`; los escalones son filas/datos, no columnas fijas por cantidad.

- Actor: Fer, cliente y agente.
- Requisitos: RQ-031, RQ-032, RQ-033, RQ-046, RQ-053, RQ-054, RQ-110.
- Datos: unidades de venta, listas de precios, escalones arbitrarios, moneda, vigencias e historial.
- Permiso: propietario/administrador modifica; público consulta tarifa aplicable.
- Auditoría: anterior/nuevo, fuente, actor y vigencia.
- Validación: cantidades 1–4 como fixture, paquete con descuento, pieza, par, set, volumen u otra unidad definida, cantidad superior a cuatro, vigencias superpuestas, sin precio y moneda ausente.

## BL-011: Inventario transaccional

**Regla →** Stock, reservas, ventas, entradas y correcciones se registran como movimientos en la unidad inventariable explícita; ninguna concurrencia puede generar stock negativo. Paquetes o kits declaran su composición y consumo, nunca se infieren por categoría.  
**Dirección técnica →** ledger de inventario y operaciones PostgreSQL atómicas con bloqueo/versión, claves idempotentes y reservas con expiración.

- Actor: Fer, catálogo, pedido y worker.
- Requisitos: RQ-038, RQ-047, RQ-055, RQ-056, RQ-057, RQ-058, RQ-059, RQ-060, RQ-061, RQ-110.
- Datos: unidades inventariables, composición de paquetes cuando aplique, ubicaciones, existencias, movimientos, reservas, ventas y estados de variante.
- Permiso: herramientas administrativas o transacciones de pedido autorizadas.
- Auditoría: tipo, cantidad, saldo previo/posterior, referencia y motivo.
- Validación: dos compradores por última unidad, reintento, expiración, corrección, unidad no divisible y paquete/kit que consume componentes declarados.

## BL-012: Catálogo público y QR

**Regla →** El catálogo móvil muestra sólo ofertas elegibles de cualquier categoría configurada, permite galería, opciones/variantes y cantidades válidas, y ofrece pedido o consulta de precio.  
**Dirección técnica →** frontend público generado desde definiciones de categoría/unidad con consultas limitadas/RLS, URL estable y QR; filtros, opciones y cálculo de precio provienen de datos validados por servidor o función autorizada, no de lógica de categoría en el cliente.

- Actor: visitante/cliente.
- Requisitos: RQ-027, RQ-028, RQ-029, RQ-030, RQ-031, RQ-032, RQ-033, RQ-039, RQ-110.
- Datos: vista pública de catálogo, precios aplicables, disponibilidad, medios y configuración comercial pública.
- Permiso: lectura pública mínima; sin acceso a costos, PII o historial.
- Auditoría: eventos de interés con minimización y consentimiento aplicable.
- Validación: móvil, accesibilidad, categoría recién creada sin despliegue, filtros/atributos generados por datos, cantidad/unidad permitida, agotado durante selección, precio por consultar y enlace QR obsoleto.

## BL-013: Solicitud de pedido y contacto

**Regla →** Finalizar catálogo crea un pedido/solicitud real, no una venta pagada, y notifica a Fer con un medio legítimo para continuar.  
**Dirección técnica →** pedido y líneas inmutables/versionadas, snapshot comercial, estado explícito y notificaciones mediante outbox.

- Actor: cliente, Fer y sistema.
- Requisitos: RQ-034, RQ-035, RQ-036, RQ-037.
- Datos: clientes, contactos consentidos, pedidos, líneas, estados y notificaciones.
- Permiso: creación pública limitada y protegida contra abuso; lectura administrativa organizacional.
- Auditoría: consentimiento, snapshot, transición y entrega de notificación.
- Validación: WhatsApp, Messenger con/sin teléfono, duplicado, stock cambia y notificación falla.

## BL-014: Asesoría y alternativas verificables

**Regla →** El agente ayuda con conocimiento general de la categoría consultada y ofrece alternativas del catálogo, sin presentar una inferencia como hecho o compatibilidad confirmada.  
**Dirección técnica →** recuperación de candidatos por herramientas; respuesta con fuente/estado de certeza y preguntas de aplicabilidad/compatibilidad faltantes según atributos definidos.

- Actor: cliente y agente.
- Requisitos: RQ-016, RQ-017, RQ-018, RQ-110.
- Datos: catálogo, definiciones/valores de atributos, aplicabilidad/compatibilidad, historial de conversación y conocimiento del modelo.
- Permiso: lectura de ofertas públicas.
- Auditoría: variantes sugeridas y atributos usados.
- Validación: alternativa más barata en distintos rubros, sin alternativas, datos de aplicabilidad incompletos —incluido vehículo cuando corresponda— y conocimiento contradictorio con catálogo.

## BL-015: Publicaciones oficiales de Meta

**Regla →** Solo se publica o sincroniza en superficies y cuentas autorizadas mediante APIs oficiales; Marketplace no se presume disponible.  
**Dirección técnica →** adaptador de Meta con capacidades detectadas, permisos verificados, ID externo, estado y errores; comandos no soportados quedan bloqueados con explicación.

- Actor: Fer, agente y Meta.
- Requisitos: RQ-062, RQ-063, RQ-067, RQ-068, RQ-069, RQ-070, RQ-071.
- Datos: conexiones, permisos, páginas, publicaciones, medios, trabajos y resultados.
- Permiso: identidad propietaria y autorización de publicación según política.
- Auditoría: payload redactado, aprobador, ID externo y respuesta de Meta.
- Validación: permiso ausente, token vencido, publicación rechazada, producto agotado y superficie no soportada.

## BL-016: Programación responsable

**Regla →** Publicar catálogo completo u horarios repetidos genera trabajos espaciados, deduplicados y limitados; frescura no justifica abuso.  
**Dirección técnica →** scheduler y cola durable con políticas de frecuencia, ventanas, presupuesto, idempotencia y cancelación.

- Actor: Fer, scheduler y worker.
- Requisitos: RQ-064, RQ-065, RQ-066, RQ-071.
- Datos: calendarios, políticas, trabajos, intentos y publicaciones.
- Permiso: calendario aprobado por propietario.
- Auditoría: quién programó, expansión por producto, ejecución, omisión y razón.
- Validación: 14:00/18:00, catálogo grande, cambio de precio en cola, pausa global, rate limit y reanudación.

## BL-017: Reportes verificables

**Regla →** Interesados, ventas, inventario, catálogo y pendientes se calculan desde eventos/estados reales y distinguen conceptos comerciales.  
**Dirección técnica →** herramientas de consulta con rangos de tiempo en zona configurada y definiciones documentadas; el LLM explica el resultado.

- Actor: Fer.
- Requisitos: RQ-072, RQ-073, RQ-074, RQ-075, RQ-076, RQ-079.
- Datos: leads, conversaciones, pedidos, ventas, movimientos, tareas y auditoría.
- Permiso: propietario/administrador.
- Auditoría: consulta, filtros y rango temporal.
- Validación: día/semana con zona horaria, cero resultados, cancelaciones y datos parciales.

## BL-018: Configuración comercial versionada

**Regla →** Identidad, saludo, ubicación, horarios, garantías, cierre y políticas cambian mediante herramientas y conservan historial.  
**Dirección técnica →** configuración tipada y versionada por organización; el LLM interpreta la orden y una herramienta valida/aplica el cambio.

- Actor: Fer.
- Requisitos: RQ-005, RQ-012, RQ-077.
- Datos: perfil comercial, ubicaciones, horarios, políticas y versiones.
- Permiso: propietario/administrador.
- Auditoría: valor anterior/nuevo, vigencia y actor.
- Validación: cambio ambiguo, horario inválido, rollback y conversaciones ya abiertas.

## BL-019: LLM cerebro, herramientas ejecutoras

**Regla →** El LLM comprende y decide qué herramienta usar; ningún texto del usuario ejecuta directamente una mutación.  
**Dirección técnica →** tool calling nativo, registro/allowlist de herramientas, contratos operativos, autorización previa y resultados estructurados devueltos al modelo.

- Actor: agente LLM y backend.
- Requisitos: RQ-090, RQ-091, RQ-092, RQ-093, RQ-107, RQ-108, RQ-109.
- Datos: turnos, ejecuciones, contratos, resultados y memoria permitida.
- Permiso: por herramienta, actor, organización, estado y canal.
- Auditoría: modelo/versión, herramienta, argumentos redactados, resultado, latencia y costo.
- Validación: acentos/errores naturales, prompt injection, herramienta inexistente, argumentos inválidos, bucle y timeout.

## BL-020: Contenido no confiable y webhooks

**Regla →** Mensajes, OCR, imágenes, documentos, URLs y webhooks son datos no confiables hasta validar origen y límites.  
**Dirección técnica →** verificación de firma y replay, validación de medios, aislamiento de contenido y separación estricta entre instrucciones del sistema y datos recuperados.

- Actor: Meta, cliente, Fer y atacante externo.
- Requisitos: RQ-095, RQ-096, RQ-098, RQ-104.
- Datos: eventos entrantes, archivos, hashes, headers mínimos, cuarentena y resultados de validación.
- Permiso: solo eventos auténticos continúan al pipeline.
- Auditoría: aceptación/rechazo y razón sin conservar secretos.
- Validación: firma falsa, replay, bomba de tamaño, MIME falso, URL privada y prompt injection en imagen.

## BL-021: Secretos, auditoría y observabilidad

**Regla →** Secretos permanecen en almacenes autorizados; las operaciones son observables sin filtrar credenciales o PII innecesaria.  
**Dirección técnica →** env/secret store por entorno, redacción central, logs estructurados, trazas, métricas, alertas y ledger de auditoría inmutable funcionalmente.

- Actor: sistema, operador y auditor.
- Requisitos: RQ-097, RQ-100, RQ-103.
- Datos: referencias de secretos, eventos de auditoría, logs, métricas y trazas.
- Permiso: mínimo privilegio; auditoría separada de acceso operativo.
- Auditoría: accesos administrativos y cambios de configuración.
- Validación: escaneo Git/logs, error de proveedor con token, PII en prompt y correlación end-to-end.

## BL-022: Costo y recuperación segura

**Regla →** La automatización tiene límites de gasto, concurrencia y reintentos; una falla nunca se reporta como éxito.  
**Dirección técnica →** usage events, presupuestos, timeouts, backoff, dead-letter/reconciliación, circuit breakers y estados terminales explícitos.

- Actor: agente, API, worker y operador.
- Requisitos: RQ-101, RQ-102, RQ-105, RQ-108, RQ-109.
- Datos: uso, costos, intentos, errores, trabajos y conciliaciones.
- Permiso: cambios presupuestarios solo administrativos.
- Auditoría: consumo, proveedor/modelo, decisión de retry/fallback y recuperación.
- Validación: proveedor caído, respuesta parcial, costo excedido, worker reiniciado y mensaje duplicado.

## BL-023: Entornos y despliegue aislados

**Regla →** Desarrollo y producción usan ramas, servicios, datos y secretos separados; AgenteFer no comparte recursos internos con proyectos ajenos.  
**Dirección técnica →** matriz de entornos, GitHub deploy por rama, EasyPanel `agente-fer` para desarrollo inicial y recursos de producción separados antes del lanzamiento.

- Actor: desarrollador/operador y CI/CD.
- Requisitos: RQ-080, RQ-081, RQ-083, RQ-084, RQ-085, RQ-086, RQ-087, RQ-088, RQ-089.
- Datos: configuración de despliegue, variables por entorno, releases y health status.
- Permiso: despliegue con credenciales de entorno y gates cumplidos.
- Auditoría: commit, imagen, actor, entorno, resultado y rollback.
- Validación: develop no toca producción, secreto equivocado falla cerrado, rollback y health check.

## BL-024: Retención e historia

**Regla →** Ocultar o agotar no borra historia comercial; PII y medios sí deben cumplir políticas de retención, exportación y eliminación autorizada.  
**Dirección técnica →** estados/soft-delete donde haya referencias, políticas de retención, anonimización y workflows auditados de exportación/eliminación.

- Actor: Fer, cliente y operador autorizado.
- Requisitos: RQ-060, RQ-103, RQ-105.
- Datos: productos, ventas, conversaciones, PII, medios, auditoría y backups.
- Permiso: política por tipo de dato y solicitud autorizada.
- Auditoría: retención, exportación, anonimización y eliminación.
- Validación: producto con ventas, cliente eliminado, backup y restauración.

## BL-025: Gates de calidad

**Regla →** Ningún bloque ni release se declara listo sin trazabilidad, pruebas, seguridad y evidencia operativa correspondiente.  
**Dirección técnica →** gates automatizados en CI y checklist versionado; hallazgos altos/críticos bloquean avance salvo aceptación explícita documentada.

- Actor: desarrollo, QA, seguridad y propietario del producto.
- Requisitos: RQ-008, RQ-106.
- Datos: especificaciones, tareas, pruebas, artefactos, hallazgos y release records.
- Permiso: cierre de gate por evidencia, no por afirmación.
- Auditoría: comando, versión, resultado, excepción y aprobador.
- Validación: requisito sin tarea, prueba fallida, secreto detectado, migración insegura y rollback no probado.

## Auditoría de cobertura inicial

- Requisitos cubiertos directamente: RQ-001 a RQ-110.
- Duplicados intencionales: seguridad, accesibilidad e aislamiento aparecen en varias reglas porque son propiedades transversales.
- Conceptos separados deliberadamente: pedido ≠ venta; producto ≠ variante; Página de Facebook ≠ Marketplace; stock cero ≠ pausa manual; conocimiento general ≠ dato de catálogo.
- Estado del veredicto: **INTEGRIDAD TOTAL para lógica de negocio inicial**.
- Restricción: todavía no hay `GREEN LIGHT` de implementación funcional; la investigación técnica está documentada, pero faltan scaffold, contratos, esquema y pruebas reales de integración.
