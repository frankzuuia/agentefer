# AgenteFer — ingesta multimodal WhatsApp y visión B3-005

Estado: implementación local en `develop`; aplicación remota y E2E Meta pendientes.  
Fecha de corte: 2026-08-28.

## Objetivo

Una imagen recibida por WhatsApp se conserva como evidencia privada y se vuelve utilizable por
el agente sin guardar bytes, Base64 ni URLs temporales en PostgreSQL. La visión sólo recibe una
rendición WebP privada, verificada y firmada justo antes del turno.

## Flujo durable

1. La normalización Meta conserva el `media.id`, MIME/hash/tamaño declarados y marca el mensaje
   como `media`; un trigger crea una solicitud idempotente en `media_ingest_requests`.
2. El worker reclama una solicitud con lease tenant-scoped. La función SQL resuelve la conexión
   activa y obtiene el token vigente desde Vault; el token vive únicamente en memoria del worker.
3. El worker pide a Graph `/{api_version}/{media_id}`, valida el host Meta, descarga sin redirects,
   comprueba MIME declarado contra magic bytes, límites de 5 MiB/50 MP y genera `analysis_webp`
   con `sharp`.
4. Se suben `source_original` y `analysis_webp` a Storage privado sin `upsert`; después se
   registran hashes, tamaños y dimensiones mediante B2-010. Sólo un asset con ambos objetos
   verificados puede completar la solicitud.
5. El trigger de `agent_runs` selecciona `vision_provider/vision_model` únicamente si el mensaje
   es una imagen WhatsApp y su solicitud está `succeeded`. Los mensajes de texto conservan el
   modelo normal.
6. El turno obtiene referencias de `get_whatsapp_media_visual_inputs`, emite URLs firmadas de
   300 segundos y las entrega como `input_image` al proveedor OpenAI. Las URLs no se persisten.
   MiniMax falla cerrado si recibe una imagen porque su endpoint Chat compatible no acepta
   contenido mixto imagen-texto.

## Invariantes

- El secreto Meta sólo cruza la frontera SQL→worker durante un lease válido y nunca entra al
  proveedor cognitivo, logs, DB, Storage o cliente.
- Un mensaje con ingestión pendiente no puede activar el turno del agente; una ingestión terminal
  sin rendición visual no se convierte silenciosamente en texto.
- El backend valida autorización, estado, lease, idempotencia, hashes, MIME, tamaño y tenant.
  El LLM interpreta la evidencia y decide qué preguntas hacer, pero no recibe autoridad de escritura.
- La foto no crea todavía producto, SKU, precio ni publicación: esas operaciones pertenecen a
  B3-006 y requieren confirmación de Fer mediante tools autorizadas.

## Límites y observabilidad

Límites físicos: imagen <= 5,242,880 bytes, <= 50,000,000 píxeles, dimensión <= 100,000 y
respuesta RPC <= 1 MiB. Se registran operación, organización, request/asset, intento, MIME,
bytes, duración y error taxonómico; no se registran token, path ni URL firmada.

## Referencias

- [OpenAI Responses API — entradas de imagen](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)
- [Meta WhatsApp Cloud API — obtener URL temporal de media](https://www.postman.com/meta/whatsapp-business-platform/request/fpj02x0/retrieve-media-url)
- [Arquitectura Storage B2-010](./MEDIA-STORAGE-B2-010.md)
