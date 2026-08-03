# AgenteFer — ledger exhaustivo de requisitos originales

Estado: fuente canónica inicial del producto.  
Propósito: conservar el detalle de la conversación sin depender de un resumen de chat.  
Regla: cada requisito debe mapearse posteriormente a lógica de negocio, especificación, tarea y validación.

## 1. Propósito humano y alcance

- **RQ-001 — Accesibilidad prioritaria:** el sistema existe para que Fer, quien perdió ambos brazos, pueda administrar ventas y clientes con la menor interacción manual posible.
- **RQ-002 — Asistente personal completo:** Fer debe poder dar instrucciones naturales por texto, audio, fotografías y documentos; el agente debe comprenderlas, usar herramientas y reportar el resultado.
- **RQ-003 — Voz primero:** las operaciones frecuentes deben poder iniciarse y confirmarse mediante notas de voz, con respuestas breves, claras y compatibles con lectura en voz alta.
- **RQ-004 — Catálogo multirubro:** aunque el caso inicial incluye llantas, rines, tinacos y tambos, la arquitectura no debe quedar hardcodeada a una sola categoría.
- **RQ-005 — Identidad comercial configurable:** no se debe hardcodear “Llantera Rodríguez” ni otra marca; Fer podrá definir el nombre, presentación, ubicación, horarios, garantías e instrucciones comerciales.
- **RQ-006 — Fuente de productos flexible:** Fer puede vender productos propios o provenientes de distintos proveedores; el sistema administra el catálogo de Fer sin asumir propiedad del proveedor.
- **RQ-007 — Automatización operativa:** configuraciones repetibles, sincronizaciones, publicaciones y tareas programadas deben ejecutarse automáticamente una vez autorizadas.
- **RQ-008 — Cero mocks:** catálogo, clientes, mensajes, publicaciones, pedidos, reportes e inventario deben usar datos e integraciones reales.

## 2. Canales y reglas de conversación

- **RQ-009 — WhatsApp entrante:** el cliente inicia la conversación; AgenteFer no enviará spam ni iniciará campañas no solicitadas.
- **RQ-010 — Messenger entrante:** el agente también atenderá mensajes recibidos por Messenger de una Página de Facebook autorizada.
- **RQ-011 — Contexto de publicación:** cuando el cliente llega desde una publicación, la primera atención debe centrarse en el producto exacto asociado con esa publicación.
- **RQ-012 — Saludo configurable:** el agente saludará con la identidad comercial vigente, ofrecerá ayuda y podrá compartir el enlace del catálogo.
- **RQ-013 — Continuidad omnicanal:** cada conversación conserva canal, identidad disponible, publicación/producto de origen, historial, etapa comercial y responsable actual.
- **RQ-014 — Identidad de cliente:** en Messenger se usará el nombre/identificador que Meta entregue legítimamente; no se inventarán datos ausentes.
- **RQ-015 — Conocimiento del catálogo:** precios, existencia, fotos, garantías y condiciones comerciales deben responderse desde la fuente de verdad vigente.
- **RQ-016 — Conocimiento general:** el LLM puede explicar conocimiento general de llantas o compatibilidad, pero debe distinguir datos verificados, inferencias y datos faltantes.
- **RQ-017 — Compatibilidad responsable:** no se afirmará que una llanta o rin es compatible con un vehículo si faltan datos críticos; el agente preguntará vehículo, año, versión, medida u otros datos necesarios.
- **RQ-018 — Venta consultiva:** el agente puede sugerir alternativas existentes más económicas o adecuadas, explicando por qué y sin inventar stock.
- **RQ-019 — Precio ausente:** si el producto no tiene precio, el agente recopilará cantidad, variante y datos útiles, notificará a Fer y mantendrá informado al cliente.
- **RQ-020 — Respuesta diferida de Fer:** si Fer responde “dile que cuestan X”, el agente debe identificar la conversación pendiente correcta, registrar el precio autorizado cuando corresponda y contestar al cliente.
- **RQ-021 — Ambigüedad conversacional:** si hay dos clientes/productos compatibles con una instrucción, el agente mostrará opciones identificables y pedirá a Fer elegir; no adivinará.
- **RQ-022 — Modos de cierre:** Fer podrá configurar que el agente cierre la venta o que solo califique al interesado y se lo entregue a Fer.
- **RQ-023 — Handoff humano:** cuando aplique, Fer recibirá canal, cliente, producto, variante, cantidad, preguntas, objeciones, datos recopilados y enlace directo para continuar.
- **RQ-024 — Retorno al agente:** Fer podrá indicar que el agente siga atendiendo una conversación transferida.
- **RQ-025 — Política de mensajería:** cualquier mensaje saliente debe cumplir consentimiento, ventana de conversación y reglas vigentes de Meta; fuera de ventana se usarán únicamente mecanismos oficiales autorizados.
- **RQ-026 — Sin duplicados:** reintentos de webhooks o fallos de red no pueden producir respuestas, pedidos, publicaciones ni descuentos duplicados.

## 3. Catálogo público, QR y pedido

- **RQ-027 — Catálogo web:** habrá un catálogo público móvil que muestre únicamente productos/variantes publicables y disponibles conforme a su estado.
- **RQ-028 — QR:** el sistema generará un QR que apunte al catálogo vigente; el enlace también podrá enviarse en WhatsApp y Messenger.
- **RQ-029 — Tarjeta de producto:** cada tarjeta mostrará nombre, especificaciones relevantes, disponibilidad, condición, precio o “consultar precio” y su galería de imágenes.
- **RQ-030 — Variantes seleccionables:** el cliente podrá elegir, cuando existan, con rin/sin rin u otras variantes reales del producto.
- **RQ-031 — Cantidad seleccionable:** el cliente podrá seleccionar una, dos, tres, cuatro o la cantidad permitida por inventario y reglas del producto.
- **RQ-032 — Precio dinámico:** el total cambiará según variante, cantidad y tarifa vigente; una tarifa de paquete no se derivará aritméticamente si fue definida explícitamente.
- **RQ-033 — Precio por consultar:** si una variante no tiene precio, el botón abrirá el WhatsApp de Fer con un mensaje prellenado que identifique producto, SKU y variante.
- **RQ-034 — Pedido desde catálogo:** al finalizar la selección se creará una solicitud/pedido real con líneas, cantidades, precios conocidos, canal de origen y datos de contacto.
- **RQ-035 — Contacto desde Messenger:** si el cliente llegó por Messenger y hace el pedido web, podrá proporcionar su número de WhatsApp/teléfono con consentimiento para que Fer lo contacte.
- **RQ-036 — Notificación de pedido:** Fer recibirá un resumen y, cuando exista un WhatsApp válido, un enlace directo para contactar al cliente.
- **RQ-037 — Estado claro:** una solicitud de pedido no debe registrarse como venta pagada o completada hasta que ocurra la confirmación comercial correspondiente.
- **RQ-038 — Concurrencia de inventario:** selecciones simultáneas no pueden llevar el stock por debajo de cero; reservas y expiraciones deben ser explícitas.
- **RQ-039 — Accesibilidad del catálogo:** interfaz móvil, controles grandes, navegación por teclado, etiquetas accesibles, estados de carga/error/vacío y contraste suficiente.

## 4. Ingesta de productos y SKU

- **RQ-040 — Alta por fotografías:** Fer podrá enviar fotos con texto adicional y pedir que se agreguen al catálogo.
- **RQ-041 — Extracción multimodal:** el LLM analizará foto y mensaje para proponer categoría, marca, modelo, medida, rin, barrenación, condición, inclusión, garantía, servicios y precios presentes.
- **RQ-042 — Sin inventar datos:** baja calidad, texto tapado o atributos dudosos deben producir preguntas o campos pendientes, nunca valores fabricados.
- **RQ-043 — Preguntas críticas:** antes de publicar se debe aclarar, según el producto, con/sin rin, precio por pieza o paquete, cantidad incluida, condición, stock y atributos de compatibilidad.
- **RQ-044 — Producto y variante:** un producto representa la oferta conceptual; cada combinación vendible materialmente distinta tiene una variante y un SKU estable.
- **RQ-045 — SKU con/sin rin:** llanta sola y combo llanta+rin son variantes diferentes aunque compartan medida o imágenes.
- **RQ-046 — Precio por cantidad:** una variante puede tener tarifas explícitas para 1, 2, 3, 4 o más unidades y vigencias distintas.
- **RQ-047 — Unidades de inventario:** el stock se controla en la unidad vendible definida, normalmente piezas; los sets/paquetes deben declarar cuántas piezas consumen.
- **RQ-048 — SKU generado:** el agente propondrá un SKU legible y estable; la base de datos garantizará unicidad sin usar el SKU como sustituto del identificador interno.
- **RQ-049 — Detección de existente:** si el producto/variante posiblemente existe, el agente mostrará coincidencias con ID/SKU y diferencias para que Fer decida actualizar o crear.
- **RQ-050 — Galería:** Fer podrá agregar fotografías nuevas a un producto existente y ordenar o retirar imágenes.
- **RQ-051 — Procedencia del dato:** atributos y precios conservarán quién/qué los proporcionó, cuándo se modificaron y, cuando aplique, la evidencia visual original.
- **RQ-052 — Categorías extensibles:** atributos especializados de llantas/rines no deben impedir atributos distintos para tinacos, tambos u otros productos.

## 5. Inventario, precios y estados

- **RQ-053 — Cambio natural de precio:** Fer puede ordenar “cambia el tinaco X a 1700”; si X no identifica una sola variante, el agente ofrece candidatos y espera elección.
- **RQ-054 — Cambio auditado:** todo cambio de precio registra valor anterior, nuevo, actor, conversación/comando y fecha.
- **RQ-055 — Ajuste de stock:** Fer puede establecer o ajustar inventario y registrar ventas, entradas, correcciones o devoluciones con motivo.
- **RQ-056 — Venta y agotamiento:** al vender unidades se descuenta stock; cuando llega a cero la variante deja de ofrecerse y sus publicaciones activas se sincronizan según capacidad oficial del canal.
- **RQ-057 — Marcar vendido:** Fer podrá marcar una variante/publicación como vendida aunque el ajuste provenga de una venta fuera del sistema.
- **RQ-058 — Reabastecimiento:** si llegan nuevas unidades de una variante agotada, se reactiva conforme a reglas y puede generarse una publicación nueva/autorizada.
- **RQ-059 — Pausa independiente:** Fer puede pausar temporalmente un producto sin declarar stock cero y reactivarlo después.
- **RQ-060 — No borrar historia:** “quitar del catálogo” normalmente cambia visibilidad/estado; ventas, auditoría y referencias históricas no deben desaparecer físicamente.
- **RQ-061 — Operaciones atómicas:** pedido, reserva, venta y movimientos de stock deben ser transaccionales e idempotentes.

## 6. Facebook y publicaciones

- **RQ-062 — Página de Facebook:** el sistema podrá publicar en una Página autorizada usando únicamente APIs y permisos oficiales disponibles.
- **RQ-063 — Publicación de producto:** Fer puede pedir una publicación de un producto/variante con datos actuales y medios autorizados.
- **RQ-064 — Publicación de catálogo:** Fer puede ordenar publicar todo el catálogo elegible; el sistema lo convierte en trabajos individuales trazables.
- **RQ-065 — Programación por bloques:** se podrán definir horarios como 14:00 y 18:00, separando publicaciones y respetando límites, calidad y políticas del canal.
- **RQ-066 — Frescura sin abuso:** “volver a publicar” no significa duplicar indiscriminadamente; se aplicará una estrategia compatible con Meta y con límites configurables.
- **RQ-067 — Sincronización comercial:** precio, agotamiento, pausa y reabastecimiento generan tareas de actualización, pausa, marcado o nueva publicación solo cuando el canal lo soporte oficialmente.
- **RQ-068 — Trazabilidad social:** cada publicación guarda canal, Página, producto, variante, ID externo, estado, contenido, fecha, resultado y errores.
- **RQ-069 — Contexto de lead:** el identificador de la publicación debe enlazar al producto correcto para que Messenger atienda primero ese interés.
- **RQ-070 — Marketplace no asumido:** no se afirmará automatización de Facebook Marketplace sin comprobar una API oficial y permisos reales para la cuenta; Página y Marketplace son superficies distintas.
- **RQ-071 — Aprobación/configuración:** Fer define qué publicaciones puede ejecutar automáticamente el agente y cuáles requieren confirmación.

## 7. Reportes y operación del propietario

- **RQ-072 — Interesados del día:** Fer podrá preguntar cuántos clientes interesados existen hoy y recibir detalle verificable.
- **RQ-073 — Ventas semanales:** Fer podrá solicitar ventas de la semana, totales y productos, distinguiendo pedidos, ventas confirmadas y cancelaciones.
- **RQ-074 — Inventario:** Fer podrá pedir inventario general, bajo stock, agotados, pausados y movimientos recientes.
- **RQ-075 — Mostrar catálogo:** Fer podrá solicitar el catálogo o un enlace/QR vigente.
- **RQ-076 — Conversaciones pendientes:** el agente debe recordar solicitudes de precio, handoffs, pedidos sin cerrar y errores que requieren acción.
- **RQ-077 — Configuración conversacional:** Fer puede cambiar horarios, ubicación, saludo, garantías, modo de cierre, políticas de publicación y preferencias mediante herramientas autorizadas.
- **RQ-078 — Confirmación accesible:** los resultados se expresarán de forma breve (“precio actualizado”, “stock en 3”), con detalle opcional y referencia para deshacer/corregir.
- **RQ-079 — Auditoría consultable:** Fer podrá preguntar qué cambió, quién lo cambió y por qué.

## 8. Arquitectura e infraestructura acordada

- **RQ-080 — Repositorio único:** código únicamente en `frankzuuia/agentefer`; no mezclar repositorios ni remotos.
- **RQ-081 — Ramas:** `develop` para desarrollo; `main` para producción.
- **RQ-082 — Supabase:** PostgreSQL, Auth, Storage y capacidades verificadas de plataforma serán la fuente central de datos.
- **RQ-083 — Supabase actual:** proyecto `AgenteFer`, ref `hprdctmblmfcoagugvyp`, región `us-west-1`; inicialmente se tratará como desarrollo/staging.
- **RQ-084 — EasyPanel:** proyecto aislado `agente-fer`, actualmente vacío; alojará servicios propios de AgenteFer cuando existan artefactos desplegables reales.
- **RQ-085 — Servicios previstos:** `api` para ingreso/webhooks y `worker` para tareas durables; los límites definitivos dependen de la especificación y pruebas.
- **RQ-086 — Web:** Vercel está previsto para catálogo/administración web y Cloudflare para dominio, DNS y controles perimetrales; aún no están configurados.
- **RQ-087 — Hetzner:** EasyPanel corre en el servidor Hetzner existente; AgenteFer utilizará únicamente recursos exclusivos identificados con su propio proyecto.
- **RQ-088 — Entornos separados:** producción tendrá servicios, secretos y datos separados de desarrollo antes de salir a clientes reales.
- **RQ-089 — Integraciones reales:** Meta, OpenAI, MiniMax, Supabase, Vercel, Cloudflare y EasyPanel se configurarán solo con credenciales y permisos reales.

## 9. Arquitectura cognitiva y seguridad

- **RQ-090 — LLM como cerebro:** comprensión de intención, lenguaje, contexto, desambiguación y redacción comercial corresponde al LLM mediante tool calling.
- **RQ-091 — Backend como ejecutor:** autorización, contratos, transacciones, estados, idempotencia, límites, firmas y stock son invariantes deterministas.
- **RQ-092 — Sin parser cognitivo frágil:** no usar regex, palabras clave o árboles `if/else` para decidir qué quiso decir Fer o un cliente.
- **RQ-093 — Herramientas nativas:** altas, cambios, búsquedas, publicaciones, reportes, handoffs y respuestas diferidas se exponen como herramientas tipadas y auditadas.
- **RQ-094 — Identidad del propietario:** solo identidades/canales de Fer previamente vinculados podrán ejecutar herramientas administrativas.
- **RQ-095 — Separación cliente/propietario:** un cliente jamás puede convertir texto o contenido multimedia en una orden administrativa.
- **RQ-096 — Inyección de prompt:** texto de clientes, publicaciones, imágenes, OCR y URLs son datos no confiables y no pueden modificar políticas ni permisos del agente.
- **RQ-097 — Secretos:** ninguna credencial privilegiada estará en frontend, Git, logs, prompts o respuestas del modelo.
- **RQ-098 — Webhooks:** verificar firma, timestamp/frescura, idempotencia, tamaño y formato antes de encolar contenido.
- **RQ-099 — RLS y organización:** datos operativos incluirán `organization_id`; RLS y pruebas impedirán acceso cruzado.
- **RQ-100 — Auditoría de herramientas:** cada tool call registra actor, organización, conversación, argumentos seguros/redactados, resultado, costo y correlación.
- **RQ-101 — Límites de costo:** modelos, visión, reintentos y publicaciones tendrán presupuesto, timeouts, límites de concurrencia y alertas.
- **RQ-102 — Fallback seguro:** ante incertidumbre o falla externa, el sistema no inventa éxito; conserva el trabajo, informa estado y escala cuando corresponda.
- **RQ-103 — Observabilidad:** logs estructurados sin PII innecesaria, métricas, trazas, health checks, alertas y runbooks.
- **RQ-104 — Seguridad de archivos:** validar MIME real, extensión, tamaño, malware/riesgo, permisos de Storage y URLs firmadas.
- **RQ-105 — Recuperación:** debe existir rollback de despliegue, reintento idempotente, conciliación de tareas y respaldo/restauración probado.
- **RQ-106 — Calidad:** cada bloque exige pruebas unitarias/integración, typecheck, lint, build, escaneo de secretos y auditoría aplicable.
- **RQ-107 — Modelo configurable:** el modelo exacto de OpenAI o MiniMax se seleccionará mediante configuración de entorno; la lógica comercial no contendrá una lista cerrada de modelos.
- **RQ-108 — Capacidad multimodal explícita:** el modelo principal y, cuando sea necesario, el modelo de visión podrán configurarse por separado; nunca se enviarán datos silenciosamente a otra familia/proveedor ni se asumirá una capacidad no verificada.
- **RQ-109 — Evolución de modelos:** incorporar un modelo o proveedor futuro debe limitarse a la frontera de IA, capacidades, contratos, evaluaciones y configuración, sin modificar catálogo, inventario, pedidos, canales o tools de negocio.

## 10. Evidencia visual recibida

Las imágenes se conservan fuera del repositorio en rutas temporales; no deben tratarse como almacenamiento permanente. Antes de construir fixtures o productos reales deberán copiarse mediante un flujo autorizado de ingesta y conservar hash/procedencia.

### IMG-001 — llanta Roadtrack y rin Fuel

- Archivo original: `codex-clipboard-033eb082-93d0-4ac0-ba66-7263ba1d9f61.png`.
- Texto visible: llanta marca Roadtrack M/T, medida `31x10.50r15`, precio `$11,500 el set`.
- Texto visible: rin marca Fuel, medida `15`, barrenación `5-114`, precio `$11,000`.
- Beneficios visibles del combo: 24 tuercas nuevas, instalación, balanceo, pivotes nuevos, nitrógeno y garantía escrita de 3 años.
- Ambigüedades que el agente debe preguntar: moneda, cuántas piezas contiene cada “set”, stock, condición exacta del rin y precio final del combo.

### IMG-002 — fotografía del producto Roadtrack/Fuel

- Archivo original: `codex-clipboard-275a08eb-6835-454b-8a1f-2a4d24588578.png`.
- Muestra visualmente llanta y rin; no debe usarse visión para afirmar especificaciones no legibles sin corroboración.

### IMG-003 — llanta 33x12.50R24LT y rin Chevrolet

- Archivo original: `codex-clipboard-f8d47b6d-75e6-4e9b-b651-538b58fc2d36.png`.
- Texto legible: medida de llanta `33x12.50R24LT`, precio `$16,000 el set`.
- La marca/modelo de la llanta está parcialmente tapada/corrupta en la captura y se considera **no confirmada**.
- Texto visible: rin Chevrolet, medida `24`, barrenación `6-139`, precio `$22,500 el set`.
- Texto visible: nuevas; beneficios similares de instalación, balanceo, pivotes, nitrógeno y garantía escrita de 3 años.
- Ambigüedades: marca/modelo real, moneda, piezas por set, stock y si los precios son separados o forman un combo.

### IMG-004 — detalle rin Chevrolet y llanta

- Archivo original: `codex-clipboard-2bdcdd5f-f1c5-477f-8b65-914c0d9af256.png`.
- Confirma visualmente emblema Chevrolet y etiqueta parcial de llanta, pero el texto de etiqueta no se considera extraído con certeza.

### IMG-005 — publicación de Facebook

- Archivo original: `codex-clipboard-f95e8e25-8a04-401e-8340-cc5e1aef5920.png`.
- Texto visible aproximado: rines 24 originales Chevrolet `6/139` con llantas nuevas.
- Ubicación visible aproximada: bulevar Bellas Artes, cerca de la línea de Otay.
- La ubicación, nombre del negocio y texto comercial deben confirmarse con Fer antes de convertirse en configuración vigente.

## 11. Decisiones no tomadas todavía

Estos puntos no pueden resolverse por suposición y se investigarán/confirmarán en bloques posteriores:

- Nombre público definitivo, dominio y número de WhatsApp Business.
- Página, aplicación y permisos de Meta que se utilizarán.
- Si habrá pagos en línea; por ahora el alcance confirmado es solicitud/pedido y cierre comercial.
- Política exacta de reservas, anticipos, envíos, instalación, devoluciones e impuestos.
- Moneda oficial y si los precios incluyen impuestos.
- Catálogo inicial real, existencias y datos fiscales/comerciales.
- Capacidad real de automatización de Marketplace frente a publicaciones de Página.
- Proveedor final de observabilidad y límites presupuestarios de IA.
