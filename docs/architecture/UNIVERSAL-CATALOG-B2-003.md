# AgenteFer — contrato físico de catálogo universal B2-003

Estado: implementado en `develop` y aplicado al proyecto Supabase AgenteFer; cierre CI final pendiente.  
Fecha: 2026-08-09.  
Proyecto: `hprdctmblmfcoagugvyp`.  
Dependencias: B2-001 y B2-002.

## Objetivo y frontera

B2-003 crea una fuente de verdad extensible para cualquier mercancía u oferta autorizada por Fer. Ninguna categoría comercial, opción o unidad se compila en TypeScript, SQL o prompts. La visión/LLM propone; las tools autorizadas persisten; PostgreSQL aplica únicamente autorización e invariantes deterministas.

Incluye:

- categorías, unidades, atributos tipados, opciones y unidades permitidas configurables;
- producto y variante como identidades distintas;
- ledger de SKU estable, único por organización y no reutilizable;
- valores tipados con certeza `proposed`, `confirmed` o `unknown` y evidencia opcional;
- metadatos/hash de medios sin rutas ni buckets;
- evidencia append-only atribuible a instrucción, mensaje, medio, modelo o confirmación;
- borradores cognitivos, campos sin resolver, candidatos y decisión explícita;
- activación condicionada por categoría, SKU y atributos confirmados;
- RLS forzada, grants mínimos y vistas administrativas `security_invoker/security_barrier`.

Excluye deliberadamente:

- precios, monedas, tiers y `on_request`: B2-004;
- stock, paquetes, kits, movimientos y reservas: B2-005;
- pendientes, pedidos, ventas y handoff: B2-006;
- publicación Meta: B2-007/B4;
- buckets, objetos, variantes derivadas y URLs firmadas: B2-010;
- catálogo público/QR: B6;
- implementación del tool loop cognitivo: B3/B5.

## Modelo físico

### Taxonomía configurada

`catalog_categories` define rubros por organización. `catalog_units` define vocabulario de medida. `catalog_attribute_definitions` fija scope `product|variant`, tipo `text|integer|decimal|boolean|date|timestamp|option`, cardinalidad, unidad, obligatoriedad, visibilidad, filtro y búsqueda. `catalog_attribute_options` y `catalog_attribute_allowed_units` completan el contrato sin desplegar código.

Los códigos técnicos y scopes son inmutables. Cambios del contrato de activación se bloquean cuando existen productos activos en la categoría.

### Identidad vendible

`products` agrupa la identidad comercial y `product_variants` representa cada configuración vendible distinta. Ambos se crean `draft`; una variante activa exige producto activo, SKU actual y atributos de variante requeridos confirmados.

`variant_skus` es un ledger case-insensitive por organización. Sólo hay un SKU `current` por variante. Retirarlo cambia a `reserved`; el texto permanece reservado y nunca se recicla.

### Valores tipados

`product_attribute_values` y `variant_attribute_values` tienen columnas físicas por tipo. Exactamente una columna contiene valor para `proposed|confirmed`; `unknown` no fabrica un valor. Un trigger tipado valida:

- scope y categoría del atributo;
- columna compatible con `value_type`;
- cardinalidad configurada;
- opción activa perteneciente a la definición;
- unidad activa y expresamente permitida;
- evidencia tenant-aware cuando existe.

Activar no cuenta valores propuestos ni desconocidos como confirmación.

### Medios y evidencia

`media_assets` conserva SHA-256, MIME, tamaño, dimensiones/duración, origen y estado de ingesta. No contiene bucket, path, URL pública ni URL firmada. B2-010 añadirá la relación con Storage sin reescribir identidad/procedencia.

`catalog_evidence` y `catalog_evidence_media` son append-only. Un análisis de modelo requiere proveedor y modelo concretos. Su JSON es evidencia no autoritativa; no se transforma en hecho comercial sin la tool correspondiente.

### Flujo cognitivo auditable

`catalog_ingestion_drafts` conserva propuesta cruda, categoría, certeza y `unresolved_fields`. Un borrador sólo pasa a `applied` con campos resueltos y referencias tenant-aware a producto/variante autoritativos.

`catalog_candidate_matches` conserva candidatos, ranking, confianza y diferencias. `catalog_resolution_decisions` exige una evidencia y exactamente una decisión append-only por borrador: reutilizar candidato, crear nuevo o rechazar. Reutilizar exige que el candidato pertenezca al mismo borrador; así no existe deduplicación silenciosa.

## Seguridad

- 16/16 tablas B2-003 tienen RLS habilitada y forzada.
- `anon` no recibe permisos sobre tablas ni vistas administrativas.
- `authenticated` sólo lee; no inserta, actualiza ni elimina.
- owner/admin/operator leen evidencia, medios y borradores; viewer sólo catálogo no sensible.
- `service_role` tiene mutaciones explícitas y no puede borrar historia.
- evidencia y decisiones no conceden `UPDATE` a `service_role`.
- todas las relaciones cruzadas repiten `organization_id`.
- `messages` y `conversations` recibieron claves puente `(organization_id,id)` para procedencia cross-batch sin perder su scope de canal.
- funciones privadas fijan `search_path=''` y tienen `EXECUTE` revocado.

## Transiciones e integridad diferida

Constraints diferidas permiten que una tool ejecute una transición completa en una sola transacción: confirmar atributos, crear/rotar SKU y activar o pausar jerarquía. Al commit se rechaza:

- producto activo bajo categoría retirada;
- variante activa bajo producto pausado;
- variante activa sin SKU actual;
- degradación/eliminación de un atributo confirmado requerido;
- exceder cardinalidad;
- cross-tenant o candidato ajeno al borrador.

## Migraciones

1. `20260809095510_b2_003_universal_catalog.sql`: modelo, RLS, vistas, triggers e invariantes.
2. `20260809101909_b2_003_catalog_trigger_hardening.sql`: regresión que reemplaza un trigger polimórfico por cinco guards tipados.

No se reescribió una migración ya aplicada. La reparación fue forward-only y atómica.

## QA vinculante

- 74 aserciones pgTAP transaccionales y rollback de fixtures;
- dos organizaciones y matriz owner/operator/viewer/anon/service role;
- tipos, unidades, cardinalidad, certeza, activación y jerarquía;
- SKU case-insensitive, reserva e intento cross-tenant;
- evidencia/decisión append-only y candidato de otro borrador;
- 16 tablas/policies, 14 vistas, RLS/grants exactos;
- linter y advisors remotos sin hallazgos;
- tipos TypeScript generados desde `app_private,api` y sin `public`;
- CI: reconstrucción desde cero, pgTAP, concurrencia real de SKU y 3/3 mutantes de esquema.

## Regla cognitiva

PostgreSQL no interpreta lenguaje, fotos ni intención. El modelo decide qué tool solicitar usando contexto y tool calling nativo; el backend valida actor, organización, idempotencia y argumentos; la base garantiza que el estado resultante sea representable y seguro. Una propuesta del modelo nunca equivale por sí sola a una activación.
