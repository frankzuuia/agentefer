# Facebook Page: orquestación de catálogo B4-005/B4-006

Estado: orquestación, tools de propietario y panel administrativo implementados localmente en `develop`; migraciones y efectos reales en Meta todavía no desplegados.

## Veredicto forense

B2-007 ya contiene la identidad lógica de publicación, versiones inmutables, medios, lotes, jobs, leases, autorización tardía, certeza del efecto, instancias externas, eventos y conciliación. El bloque nuevo debe extender ese cable; crear otra cola o guardar estado de campaña dentro de una conversación produciría duplicados y pérdida de continuidad.

Huecos físicos confirmados:

1. `enqueue_publication_batch` expande jobs con una sola `available_at`; todavía no existe un dispatcher adaptativo.
2. No existe un adaptador de Facebook Page en `apps/worker` ni un claim que entregue su credencial Vault bajo lease.
3. El agente sólo ejecuta tools de lectura; no puede aceptar comandos de publicación del propietario.
4. El batch no conserva una suscripción de notificación al canal/conversación que originó el comando.
5. No existe un comando de retry selectivo ni una proyección administrativa que indique cuándo es seguro mostrar `Reintentar`.

## Invariantes

- Página de Facebook es la única superficie construible hasta verificar otra capacidad oficial; Marketplace continúa `NO-BUILD`.
- El LLM decide intención y selecciona tools. PostgreSQL autoriza tenant/actor, valida invariantes y ejecuta transacciones.
- Combo, llanta, rin, juego y pieza son variantes/unidades explícitas. Sus estados y precios no se infieren entre sí.
- Una versión puede usar un tier vigente o `on_request`; el backend nunca inventa precio.
- Un turno de WhatsApp termina después de aceptar el comando. El `batch_id` es la continuidad durable; la conversación no mantiene el lease.
- Todo efecto externo requiere claim, autorización tardía y `mark_publication_effect_started`.
- Sólo se reintenta automáticamente cuando el efecto está confirmado como no aplicado. `unknown` pasa a conciliación humana/proveedor.
- Token, URL firmada privada y respuesta cruda del proveedor no entran en logs ni vistas cliente.

## Flujo unitario

1. Panel o LLM llama la misma operación `publication.publish` con variante/publicación resuelta y clave idempotente.
2. La base prepara o reutiliza publicación y versión aprobada según política; la versión congela precio/unidad/medios.
3. Se encola un job y se responde sin esperar a Meta.
4. El worker reclama el job y recibe snapshot publicable + secreto efímero bajo el mismo lease.
5. La base reautoriza conexión, capacidad, versión, estado, precio y stock.
6. El worker marca inicio del efecto y llama Graph API.
7. El resultado registra certeza, ID/URL externo o retry futuro. Después reconcilia el batch.

## Flujo masivo y ritmo adaptativo

`publication.enqueue_catalog` congela selección y política, crea un job por publicación activa y devuelve cantidad elegible. El dispatcher calcula disponibilidad con estas entradas, en este orden:

1. pausa/cancelación del batch;
2. `blocked_until` de la observación vigente de la conexión;
3. `Retry-After` válido y señales de uso devueltas por Meta;
4. techo versionado de la policy aprobada para esa organización;
5. historial reciente confirmado de esa conexión.

No se compila un número fijo como 3, 4 o 5 publicaciones. La decisión y su fuente se guardan; un rate limit difiere pendientes sin consumir un intento externo. La ausencia de observaciones no concede capacidad ilimitada: el lote queda sujeto a una política aprobada y conservadora almacenada en datos.

## Continuidad conversacional y notificación

Una suscripción de batch guarda organización, batch, conversación, conexión de canal, destinatario y clave idempotente terminal. No guarda texto comercial. Al alcanzar estado terminal, el reconciliador crea un evento estructurado con contadores y fallos accionables. Ese evento entra al flujo durable de salida de WhatsApp; el LLM puede redactar su presentación usando hechos del evento, pero no controla el cierre ni el dedupe.

Fer puede abrir nuevos runs mientras el lote avanza. Consultar estado lee el batch; cambiar otro producto crea otra tool execution. Ninguna de esas operaciones reemplaza la selección ni el lease de los jobs existentes.

## Tools de propietario

- `catalog.resolve_recent`: resuelve altas confirmadas recientes dentro del tenant y devuelve candidatos; no muta.
- `catalog.set_offer_status`: activa/pausa una variante concreta con auditoría.
- `publication.publish`: encola una publicación concreta.
- `publication.enqueue_catalog`: crea un lote desde el alcance aprobado.
- `publication.status`: devuelve conteos y fallos accionables.
- `publication.retry`: reencola sólo un fallo confirmado sin efecto.
- `publication.pause`: pausa una publicación o batch sin alterar catálogo ajeno.
- `publication.cancel`: cancela pendientes y conserva en vuelo/uncertain para conciliación.

Las definiciones e input schemas viven versionados en el registro de tools. Sólo `owner_member` y roles propietarios autorizados pueden recibir herramientas mutantes.

## Proyección del panel

- Oferta sin instancia publicada: botón `Publicar en Facebook`.
- Oferta publicada: estado, vínculo externo, última sincronización e historial.
- Combo/componentes: controles independientes de activo/pausado, unidad, precio o `Por consultar`.
- Job `failed`/`blocked` con efecto no aplicado: causa y `Reintentar`.
- Job `uncertain`: `Conciliar`; nunca `Reintentar` directo.
- Lote: elegibles, pendientes, procesando, publicados, fallidos, inciertos, próxima ventana y resumen enviado.

## Implementación administrativa local

La migración `20260829140000_b4_005_b4_006_admin_catalog_panel.sql` incorpora una frontera distinta de la conversación sin duplicar reglas comerciales:

- `app_private.admin_catalog_commands` conserva actor, solicitud, huella, resultado y clave idempotente de cada mutación del panel. Tiene RLS habilitado y forzado, sin política de lectura para navegador.
- `api.get_facebook_catalog_admin_page` exige actor `owner`/`admin`, limita cada página a 24 ofertas y usa cursor `(updated_at, variant_id)`. Devuelve categoría, SKU, descripciones, tiers vigentes como decimal textual exacto, hasta ocho WebP aprobados y el estado Facebook/lotes de la conexión seleccionada.
- `api.admin_set_catalog_offer_status` pausa o activa una variante y transiciona sus publicaciones no retiradas dentro de la misma transacción auditada.
- `api.admin_enqueue_facebook_publication` y `api.admin_enqueue_facebook_catalog` reutilizan `enqueue_publication_job`/`enqueue_publication_batch` y la policy adaptativa almacenada; el panel no calcula spacing.
- `api.admin_retry_facebook_publication` conserva linaje y sólo permite el retry que la capa de publicación considera seguro.
- `api.admin_set_facebook_batch_state` pausa o reanuda un lote sin cancelar conversaciones ni trabajos inciertos.

Los seis RPC son `service_role`-only. El navegador envía bearer de Supabase al API; el API autentica la identidad y PostgreSQL vuelve a comprobar tenant y rol antes de cualquier lectura o mutación.

Rutas reales:

- `GET /admin/catalog`: shell sin dependencias externas y sin sesión persistida en `localStorage`/`sessionStorage`.
- `GET /admin/catalog/page`: lectura acotada; la clave privilegiada nunca llega al cliente.
- `POST /admin/catalog/commands`: contrato exacto de 16 KiB para estado, publicación unitaria/masiva, retry y pausa/reanudación de lote.

El gateway acepta solamente objetos `agentefer-catalog-public/{organization_id}/{media_asset_id}/storefront_webp/*.webp`; elimina bucket/path de la respuesta y expone una URL pública codificada. Originales, análisis, JPEG de WhatsApp, base64 y rutas de otra organización son rechazados.

## Contrato móvil primario

La administración se diseña primero para teléfonos y luego se amplía a tablet/escritorio. La pantalla de 375 px es una puerta de aceptación, no una adaptación posterior.

- Encabezado compacto con nombre de sección, búsqueda y un resumen desplegable; los indicadores no forman una fila ancha ni empujan contenido fuera del viewport.
- Navegación inferior fija con Catálogo, Publicaciones, Conversaciones y Más. El contenido reserva su altura para que ninguna acción quede oculta.
- Catálogo paginado por cursor con una ventana acotada de resultados y estado en la URL. No existe carga automática infinita; más de 100 filas usa virtualización además de paginación.
- Cada oferta es una tarjeta compacta con foto principal, nombre, SKU, disponibilidad, precio o `Por consultar` y estado de Facebook. Sólo una tarjeta puede desplegar detalle a la vez.
- Filtros, historial, galería, edición y acciones secundarias abren un panel inferior accesible. La galería puede desplazarse dentro de su región, pero la página nunca tiene overflow horizontal.
- Publicar, Guardar, Reintentar o Conciliar permanecen en una barra de acción contextual; las acciones destructivas requieren confirmación explícita y no comparten posición con la acción principal.
- Objetivos táctiles mínimos de 44×44 px, separación mínima de 8 px, contenido con 16 px laterales, foco visible y compatibilidad con teclado/lector.
- Estados loading, vacío, error, sin conexión y sincronizando conservan la misma geometría para evitar saltos y dobles pulsaciones.

La implementación muestra seis ofertas por página en teléfono y doce en tablet/escritorio. `Anterior` y `Siguiente` reemplazan la ventana actual en vez de anexar nodos; el detalle usa un único `dialog` inferior con scroll interno acotado y acciones pegadas al `safe-area`.

No se presentan como operativas capacidades todavía ausentes. Editar descripción, cambiar tiers, agregar/elegir foto principal y eliminación/despublicación en cascada requieren sus propios RPC/tools, pruebas y conciliación Meta antes de exponer botones en este panel.

La verificación responsive cubre 360, 375, 390, 412, 768, 1024 y 1440 px; a 375 px debe existir cero scroll horizontal y las acciones críticas deben alcanzarse sin recorrer todo el catálogo.

## Puertas de salida

- pgTAP: tenant, roles, idempotencia, selección, spacing, retry/uncertain, resumen único y RLS.
- Unitarias TypeScript: Graph adapter, clasificación de errores/headers, redacción, RPC parsing y aborto.
- Integración: claim→authorize→effect→result→reconcile→outbox.
- Concurrencia: dos workers, conversación simultánea y dos reconciliadores.
- Seguridad: secretos fuera de logs, service-role-only, IDs cruzados, URLs/medios no confiables.
- Mutation testing en clasificación de resultados y cálculo de siguiente disponibilidad.
- E2E real contra Página de staging autorizada antes de marcar B4-005/B4-006 completos.

## Evidencia local del panel

- Contrato de base acumulado: 35 migraciones, 97 tablas con RLS forzado y 1,214 aserciones pgTAP planificadas.
- Ensayo enlazado exacto sobre `AgenteFer` (`hprdctmblmfcoagugvyp`): 23/23 aserciones terminales aprobadas y transacción revertida.
- API focal: 87/87 pruebas de protocolo, gateway TCP y rutas Fastify; typecheck verde.
- Suite acumulada: 945/945 pruebas, 91.74% statements, 86.78% ramas, 94.34% funciones y
  91.72% líneas. Format, lint, typecheck, build y runtime real en puertos TCP efímeros quedaron
  verdes; `npm audit` reportó cero vulnerabilidades.
- Contrato RPC worker→Supabase: 10/10 pruebas TCP que recorren los once RPC privilegiados,
  service headers, aislamiento de organización, decodificación, secreto envuelto, cancelación,
  timeout y clasificación de respuestas.
- Mutation testing: perfil global 90.58%, B2-010 92.84%, worker Facebook 98.48% y panel 95.89%;
  los perfiles B4 forman parte del gate global del repositorio.
- Revisión visual del shell real: 360, 375, 390, 412, 768, 1024 y 1440 px, cero overflow horizontal y cero controles visibles menores a 44 px.
- Limitación de evidencia: la vista autenticada con productos reales requiere aplicar las migraciones pendientes y realizar E2E con la cuenta/Página autorizada; no se usaron productos simulados para fabricar una captura.
