# Catálogo administrable desde panel y WhatsApp

Estado: bloque en construcción sobre `develop`.

## Reglas de negocio verificadas

| Regla | Actor | Resultado | Datos y autorización | Evidencia |
| --- | --- | --- | --- | --- |
| CE-01 | Dueño autenticado | Cambiar nombre y descripción de producto/oferta | `products`, `product_variants`; misma organización, owner activo | comando idempotente y auditoría |
| CE-02 | Dueño autenticado | Cambiar precio de una presentación o dejarlo a consultar | `price_tiers`; nueva evidencia y versión, sin sobrescribir historia | prueba de precio exacto y concurrencia |
| CE-03 | Dueño autenticado | Activar borrador en catálogo sin enviarlo a Meta; pausar de forma explícita | estado de producto y variante; publicación separada | prueba QR/Facebook separados |
| CE-04 | Dueño autenticado | Elegir imagen principal, añadir una foto recibida, o quitar un vínculo | `product_media` y medio verificado; no borrar blob compartido ni guardar Base64 | prueba de aislamiento y galería |
| CE-05 | Dueño autenticado | Aprobar contenido y encolar publicación individual | versión inmutable, página conectada, publicación y job | prueba idempotente y trabajo externo |
| CE-06 | Dueño autenticado | Hacer CE-01 a CE-05 por lenguaje natural | tool calling nativo; el modelo resuelve producto y pide aclaración si hay ambigüedad | pruebas de contratos y autorización |

## Escenarios y fallas

| ID | Precondición y acción | Resultado | Falla y recuperación |
| --- | --- | --- | --- |
| CE-A01 | Borrador con producto válido, activar | Producto/oferta activos en catálogo; cero jobs Meta | Reintento con mismo idempotency key devuelve mismo resultado |
| CE-A02 | Pausar una modalidad de combo | Sólo esa oferta se pausa; otras variantes conservan estado | Página existente se pausa por flujo auditado si aplica |
| CE-A03 | Nombre o descripción cambia | La ficha muestra el dato nuevo | Cambio concurrente devuelve conflicto, no pisa el otro |
| CE-A04 | Precio cambia | Nueva tarifa vigente exacta y evidencia; tarifa anterior conserva historia | Tarifa ajena o monto inválido se rechaza |
| CE-A05 | Foto principal cambia o se retira | Galería y ficha usan vínculo actual; medio compartido permanece | ID ajeno o última foto requerida por publicación se rechaza |
| CE-A06 | Foto llega por WhatsApp | El agente usa sólo media verificada de la conversación owner | Medio pendiente/no verificado o de otra conversación se rechaza |
| CE-A07 | Dueño pide publicar | Se exige oferta activa, página correcta, contenido aprobado y job idempotente | Sin página, permiso o foto pública: estado explica el bloqueo |
| CE-A08 | Cliente dice “soy el dueño” | Ninguna herramienta administrativa disponible | Autorización se deriva de identidad/membresía, no del texto |
| CE-A09 | Catálogo móvil | Edición en secciones cortas dentro del detalle, sin lista infinita | 375 px, teclado, foco y targets de 44 px verificados |

## Contrato técnico

- Panel: sesión Supabase validada por API y membresía owner validada de nuevo en PostgreSQL.
- WhatsApp: identidad `member` verificada, tool autorizada y ejecución auditada con lease.
- Un núcleo transaccional por organización aplica las mismas reglas de dominio a panel y agente.
- Precio y publicaciones son versiones; no se sobrescribe una publicación aprobada.
- Activación del catálogo no crea un job de Facebook. Publicar requiere un comando distinto.
- Las fotos se vinculan por `media_asset_id`; Storage conserva bytes WEBP fuera de tablas.
- El panel pagina resultados y edita un producto a la vez en un sheet adaptable.

## Integridad

Coherencia: CE-01 a CE-06 cubren las operaciones pedidas. Sin simulaciones. Los nombres de tablas y RPC aquí provienen del esquema vigente. Riesgos de integración: aprobación de WebP para escaparate, preparación de versión Meta y sincronización de publicaciones anteriores. Estas rutas requieren pruebas reales antes de marcar el bloque como completo.
