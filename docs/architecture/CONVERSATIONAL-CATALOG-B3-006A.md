# B3-006A — alta conversacional persistente

Bloque aprobado el 2026-09-07, exclusivamente AgenteFer/develop. BL-002/008/009/010/011/019/020/025.
Esto especifica implementación, no certifica producción.

## Realidad y flujo

Reutilizar `catalog_ingestion_drafts`, catálogo tipado, SKU histórico, `price_tiers`, inventario
por composición y `product_media`. El runtime autoriza llamadas nativas pero no expone altas.
La ingesta genera original y WebP privado; falta preparar la imagen que consume el panel.

1. Nuevas tools solo para dueño activo, con identidad derivada del run, nunca del JSON LLM.
2. `catalog_ingestion_context`: borradores de la conversación, imágenes verificadas y diccionarios.
3. `catalog_save_draft`: propuesta JSON, faltantes decididos por el modelo, revisión optimista
   e idempotencia. Puede contener productos/variantes relacionados; no inferir intención en SQL.
4. El modelo pregunta solo lo pendiente: venta completa/separada, precio/unidad/moneda, stock
   compartido y autorización de imágenes. No dividir precios de sets sin confirmación. Un precio
   a consultar no equivale a cero. Guardar avances antes de responder.
5. `catalog_apply_draft`: revisión exacta, faltantes vacíos y confirmación del dueño en un mensaje
   posterior al resumen. Crear atómicamente categoría/unidad, producto/variantes/SKU/atributos,
   precios/composiciones/stock y galería. No reescribir contratos existentes de categoría/unidad.
6. Combos y venta individual comparten artículos inventariables; no duplicar stock. Alta en
   estado borrador; activar o publicar son acciones separadas. Ninguna publicación FB implícita.
7. Medios privados por defecto. El panel del dueño reutiliza el WebP privado de la ingesta durable
   y obtiene firmas temporales en lote después de autorizar al dueño. No necesita publicar derivados
   para previsualizar. DB conserva referencias, nunca bytes, Base64 o URLs firmadas. Preparar
   derivados públicos para tienda/cliente pertenece al siguiente bloque de distribución de medios.
8. Resultado negativo debe auditarse fallido/no aplicado, no como efecto confirmado. El modelo
   compone la respuesta comercial y recibe errores operativos corregibles.

## Matriz de escenarios

| ID | Actor, precondición y disparador | Resultado / datos | API, auditoría y efecto | Validación / recuperación |
| --- | --- | --- | --- | --- |
| A01 | Dueño, foto verificada, alta | Borrador persistido | save/context; draft.saved; no publicación | SQL y E2E foto |
| A02 | Dueño responde parte de faltantes | Revisión conserva lo resuelto | save; draft.saved | Otro run recupera |
| A03 | Dueño cambia de tema | Borrador fuera del historial corto | context; lectura | Más de 24 mensajes |
| A04 | Dueño confirma resumen | Alta y mapa IDs atómicos | apply; draft.applied | Consulta catálogo/precios/stock |
| A05 | Precio desconocido | on_request explícito o preguntar | save/apply | No precio cero ni derivado |
| A06 | Combo y piezas | Mismos artículos inventariables | apply/inventory; movimiento | No stock duplicado |
| A07 | Reintento idéntico | Mismo resultado | Comando idempotente | Cero altas duplicadas |
| A08 | Revisión obsoleta/concurrente | No sobrescritura | Conflicto auditado | Recargar borrador |
| A09 | Cliente/admin/dueño revocado | Denegar antes de mutar | Autorización/auditoría | Roles y revocación |
| A10 | Otro tenant/chat/medio | Denegar sin datos ajenos | Scope servidor | Cross-org y cross-chat |
| A11 | Foto contiene instrucciones | Datos no confiables | Prompt/tools restringidas | Eval adversarial real |
| A12 | SKU repetido/contrato incompatible | Rollback íntegro | apply error | Borrador recuperable |
| A13 | Sin confirmación o mismo mensaje | No aplicar | apply blocked | Confirmar resumen |
| A14 | JSON inválido/dato fuera de rango | No efecto parcial | failed/not_applied | Contratos/mutación SQL |
| A15 | Storage falla/worker reinicia | Producto y trabajo pendiente | Lease/retry/media audit | Integración y conciliación |
| A16 | Alta sin permiso Facebook | Cero publicaciones | Ninguna llamada FB | Conteo jobs/publications |
| A17 | Varias fotos | Orden/principal/activos correctos | gallery/renditions | Panel y hashes reales |
| A18 | Categoría/unidad nueva | Diccionario dinámico | apply/creación auditada | Contratos reutilizados |
| A19 | Dueño en conversación con política anterior | Nuevo turno usa política vigente | enqueue/snapshot inmutable | Conservar snapshot viejo y crear uno versionado |
| A20 | Storage devuelve `/object/sign/...` para visión | Resolver desde `/storage/v1` | Worker conserva objeto/origen/firma exactos | Regresión pura y E2E pendiente |

## Seguridad, límites y no-build

Helpers privados sin EXECUTE para roles API; RLS y FKs compuestas para datos nuevos. Nunca aceptar
tenant, actor, destinatarios o credenciales como argumentos cognitivos. Payloads acotados por
seguridad, sin recortar salida cognitiva. Sin URLs arbitrarias. Sin modificaciones OAuth/main.
Subcategorías jerárquicas, edición/bajas, tienda QR personalizada y herramientas comerciales
de envío/pedidos/handoff son bloques siguientes, no se certifican aquí.

## Fuentes

Migraciones B2-003/004/005/010, B3-002A y B4-005/006 del repositorio inspeccionadas.
[PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html): bloquear revisión
y rollback transaccional. [Storage access control](https://supabase.com/docs/guides/storage/security/access-control):
la credencial backend no reemplaza autorización de negocio. Referencias consultadas 2026-09-07.
[Cliente oficial de Storage](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts):
firma por lote con `paths` y `expiresIn`; respuesta relativa a la raíz de Storage.

## Validación y recuperación

pgTAP real, Gherkin, aislamiento/grants, regresión, lint/typecheck/build, secretos/supply chain.
Mutación SQL: autorización, confirmación, revisión, idempotencia y scope de imágenes. Medir
duración SQL, aserciones, fallos, cobertura por escenario y mutantes detectados. Objetivos:
cero escapes tenant, cero duplicados, cero publicaciones implícitas. No sustituir escenarios
críticos con porcentaje promedio TS. Ensayar migración en rollback únicamente en Supabase
AgenteFer validado. Pruebas transaccionales no crean catálogo comercial de demostración;
integraciones WhatsApp/Storage/LLM deben probarse realmente antes de certificar E2E.
No aplicar ni desplegar con gates sin evidencia o excepción aprobada.

## Auditoría previa

GREEN LIGHT: certified for implementation (no certifica ejecución ni despliegue).
INTEGRITY TOTAL: reutiliza modelos y separa publicación/stock de razonamiento.
MATCH PERFECT: escenarios A01–A20 mapeados a tareas B3-006A-D/R/T/M/Q en PROGRESS.

Hallazgo A20: `media-storage.ts` resolvía la firma relativa desde el dominio y luego la rechazaba
al compararla con `/storage/v1/object/sign/...`. Corregir únicamente resolución y validación de
la respuesta, conservando transporte, límites, autorización y leases. Referencia oficial anterior.
