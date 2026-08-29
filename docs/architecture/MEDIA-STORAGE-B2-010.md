# AgenteFer — arquitectura de medios y Storage B2-010

Estado: especificación certificable previa a implementación.  
Fecha: 2026-08-28.  
Dependencias: B2-003 catálogo/evidencia, B2-007 publicación, B2-009 autorización y B3-002A identidad WhatsApp.

## Objetivo y frontera

B2-010 impide que PostgreSQL se convierta en un almacén de imágenes. El binario vive en Supabase Storage; la base conserva identidad, procedencia, hashes, rutas tenant-scoped, estado y relaciones comerciales. Las URLs firmadas se emiten justo a tiempo, expiran y nunca se persisten.

Incluye:

- buckets exactos de AgenteFer con límites de tamaño y MIME;
- objetos inmutables ligados a `media_assets`;
- original privado, WebP para web/visión, WebP publicado y JPEG para WhatsApp;
- galería de producto con variante opcional, rol, orden, alt text y aprobación;
- RLS/privilegios para impedir lectura privada cruzada y escritura desde clientes;
- contratos backend para upload, download y URL firmada sin aceptar hosts arbitrarios;
- idempotencia por hash/path y estados recuperables para reconciliación.

Excluye:

- descargar bytes desde Meta y ejecutar visión: B3-005;
- crear categoría, producto, variante, SKU, precio o composición: B3-005/B3-006;
- enviar imágenes a clientes y administrar `media_id` de Meta: bloque WhatsApp saliente posterior;
- catálogo público/QR y UI administrativa: B6;
- cargar las fotografías de prueba o publicar un producto real.

## Decisiones verificadas

### Objetos, no Base64

`media_assets` sigue siendo la identidad de contenido y procedencia. `media_asset_objects` agrega ubicaciones físicas sin almacenar el cuerpo del archivo. Se prohíben columnas de blob/Base64 y URLs completas. Bucket y path son datos estables; una URL firmada es una credencial temporal.

### Renditions por consumidor

| Rendition | Bucket | MIME | Consumidor | Publicación |
| --- | --- | --- | --- | --- |
| `source_original` | privado | JPEG/PNG/WebP validado | evidencia y reproceso | nunca pública |
| `analysis_webp` | privado | `image/webp` | visión y QA | nunca pública |
| `storefront_webp` | público | `image/webp` | futura tienda QR | sólo aprobada |
| `whatsapp_jpeg` | privado | `image/jpeg` | upload a Meta | nunca pública |

WebP reduce almacenamiento/egress en web y está soportado como entrada visual por OpenAI. WhatsApp exige JPEG o PNG para mensajes de imagen, por lo que un WebP de tienda no se reutiliza ciegamente en el canal.

### Rutas y pertenencia

Todo `object_path` empieza con `organization_id/media_asset_id/`. El resto se deriva de rendition y hash, no del nombre recibido. Se rechazan segmentos vacíos, `.`/`..`, backslash, control characters y paths que no correspondan al tenant y asset declarados.

### Galería

`product_media` liga un asset verificado con un producto y una variante opcional de ese producto. `media_role`, `ordinal`, `alt_text` y estado son datos explícitos. La unicidad de ordinal se aplica por producto o por variante, incluso bajo concurrencia. Asociar no equivale a aprobar ni publicar.

### Ciclo y recuperación

1. El backend valida origen, autorización, tamaño, firma real, MIME y dimensiones.
2. Calcula SHA-256 y resuelve/reutiliza `media_assets` dentro de la organización.
3. Genera derivados con límites de píxeles y elimina metadata no requerida.
4. Sube objetos inmutables sin `upsert`.
5. Registra objetos sólo cuando Storage confirma la escritura.
6. Si el registro falla después del upload, la reconciliación identifica el objeto no registrado por prefijo/hash; nunca se marca verificado sin objeto.
7. Una aprobación crea/activa la relación comercial y, en un bloque posterior, el derivado público.

## Seguridad

- El worker usa exclusivamente `SUPABASE_URL` validada contra `SUPABASE_PROJECT_REF`; no sigue redirects ni recibe una URL de destino del LLM.
- La clave privilegiada sólo existe en backend y nunca aparece en logs, metadatos o respuestas.
- `storage.objects` privado se filtra por bucket, primer segmento de path y membresía activa.
- No existen policies de insert/update/delete para clientes; el backend usa autoridad de servicio y RPCs limitadas.
- Objetos son inmutables: no se usa `upsert`; una corrección crea otro asset/rendition y conserva trazabilidad.
- El contenido entrante es no confiable. Antes de análisis se validan magic bytes, MIME permitido, tamaño, dimensiones y límite de píxeles para impedir polyglots y decompression bombs.
- Original, análisis y WhatsApp permanecen privados. Sólo `storefront_webp` aprobado puede vivir en bucket público.
- No se pasan a OpenAI URLs públicas permanentes; B3-005 emitirá acceso temporal o file input y registrará proveedor/request ID sin guardar la credencial.

## Observabilidad y SLO inicial

Eventos mínimos: `media.storage.uploaded`, `media.storage.registered`, `media.storage.reconciled`, `media.storage.rejected`, `media.gallery.linked`, `media.gallery.approved` y `media.signed_url.issued`. Los atributos seguros incluyen `organization_id`, `media_asset_id`, rendition, bytes, duración, resultado y error taxonómico; nunca URL firmada, token, path de usuario original ni teléfono.

Objetivos previos a baseline productivo:

- duplicados físicos para mismo tenant/asset/rendition/hash: 0;
- URLs firmadas persistidas: 0;
- lecturas cross-tenant: 0;
- objetos públicos sin aprobación: 0;
- mutation score del contrato SQL crítico: >= 90%; rutas críticas 100%;
- p95 upload/derivación y tasa de errores se medirán en staging antes de fijar SLO definitivo.

## Referencias oficiales

- OpenAI Images and vision: entrada por URL/file, formatos JPEG/PNG/WebP y selección de detalle.
- Supabase Storage Buckets: buckets privados con RLS y acceso temporal mediante signed URL.
- Supabase Storage Image Transformations: optimización WebP disponible, con dependencia de plan; B2-010 no depende de ella para producir derivados.
- Meta WhatsApp Business Platform, colección oficial: descarga mediante media ID/URL temporal y envío de imágenes JPEG/PNG por ID o link.

## Veredicto forense previo

GREEN LIGHT: el corte B2-010 coincide con BL-008/BL-020, SC-033, RQ-040/RQ-050, `MASTER-SPECIFICATION` y `PROGRESS`. No invade visión, mutación de catálogo, precio, composición, envío Meta ni QR. La ausencia actual de jerarquía `parent_id` en categorías se conserva como hallazgo para B3-006; no se parchea dentro de Storage.

INTEGRITY TOTAL: `media_assets` conserva identidad/procedencia de B2-003; `publication_media` conserva snapshots de B2-007; la nueva galería será fuente de selección sin reescribir publicaciones históricas.

MATCH PERFECT: cada requisito de este documento tiene escenario en `features/b2_010_media_storage.feature` y tarea B2-010; implementación y evidencia se registrarán antes de marcarlo completo.
