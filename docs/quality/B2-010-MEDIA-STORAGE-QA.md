# AgenteFer — QA B2-010 almacenamiento y galería de medios

Estado: **GATES LOCALES Y FOCALES VERDES — APLICACIÓN REMOTA/E2E PENDIENTES**.  
Fecha de corte: 2026-08-28.

## Veredicto

La fundación B2-010 está preparada para guardar bytes en Supabase Storage y únicamente identidad,
hash, rutas canónicas y metadatos en PostgreSQL. No existe persistencia Base64, blob binario ni URL
firmada/durable en base de datos o auditoría. La migración no fue aplicada y todavía no se declara
lista para producción.

## Trazabilidad

| Requisito | Contrato | Prueba |
| --- | --- | --- |
| Una foto no debe inflar PostgreSQL | `MEDIA-STORAGE-B2-010.md` | auditoría de columnas y vistas sin bytes/Base64/URL |
| Original preservado y derivados por canal | cuatro `rendition_kind` explícitos | constraints de bucket, MIME, path, hash y estado |
| Agregar más fotos sin duplicar | identidad tenant+SHA y vínculo de galería idempotente | replay de asset, objeto y `product_media` |
| No publicar antes de aprobación | `draft → approved → storefront_webp` | operador/antes de aprobación rechazados |
| Fer y clientes no cruzan tiendas | FKs compuestas, RLS y path tenant-first | owner ajeno ve cero registry/gallery/Storage |
| Envío futuro por WhatsApp sin URL durable | JPEG privado y URL firmada efímera | URL same-origin, TTL 30–900 y secreto redactado |
| Historial verificable | filas y auditoría append-only | `DELETE` ejecutado como superusuario alcanza el trigger y falla |

## Evidencia ejecutada

| Puerta | Resultado | Evidencia reproducible |
| --- | --- | --- |
| Ensayo de migración real | Verde | `npm run test:database:linked:rehearsal -- supabase/migrations/20260828190000_b2_010_media_storage.sql supabase/tests/b2_010_media_storage_test.sql`: 58/58 y rollback sobre AgenteFer `hprdctmblmfcoagugvyp`. |
| Mutation testing SQL | Verde | `npm run test:database:linked:b2-010-mutations`: 16/16 mutantes eliminados, 100%, cada ejecución revertida. |
| Unitarias Storage | Verde | `npx vitest run apps/worker/test/media-storage.test.ts`: 87/87. |
| Mutation testing TypeScript | Verde | `npm run test:mutation:b2-010`: 92.84% total y 93.65% cubierto; 425 killed, 3 timeouts, 29 survived y 4 sin cobertura de 461. Umbral obligatorio: 90%. |
| Pipeline raíz encadenado | Verde | `npm test`: contratos, 763/763 pruebas, cobertura, mutación global y mutación B2-010 terminaron con código 0. |
| Mutation testing global | Verde | 92.16% total y 93.17% cubierto; 3,161 killed, 3 timeouts, 232 survived y 37 sin cobertura de 3,433. |
| Contrato estático DB | Verde | 30 migraciones ordenadas, 96 tablas con RLS forzado, 1,148 aserciones pgTAP y tipos TypeScript bloqueados. |
| Contrato de workspace | Verde | workspaces activos, scripts y configuración Stryker B2-010 conectados al pipeline raíz. |
| Despliegue | Pendiente | B2-010 no fue aplicada; no se crearon buckets ni filas persistentes durante QA. |
| E2E real | Pendiente | falta recibir las fotos reales por Meta, transcodificar, analizar, crear SKU y enviar/mostrar la galería. |

Reportes locales ignorados por Git:

- `reports/database-quality/linked-migration-rehearsal.json`
- `reports/database-quality/linked-b2-010-mutation-summary.json`
- `reports/mutation/b2-010-media-storage.json`

## Invariantes de seguridad verificados

- Buckets exactos: `agentefer-catalog-private` privado y `agentefer-catalog-public` público.
- Límite físico: 25 MiB en privados y 10 MiB en escaparate público.
- Objetos inmutables con `x-upsert=false` y path
  `{organization_id}/{media_asset_id}/{rendition_kind}/{sha256}.{ext}`.
- Original JPEG/PNG/WebP, análisis WebP y JPEG para WhatsApp permanecen privados.
- El WebP público sólo se registra después de aprobar una relación de producto/variante.
- Viewer no ve ubicaciones privadas; owner/admin/operator sólo ven su organización.
- RPC mutadoras sólo son ejecutables por `service_role`; el backend revalida actor y rol.
- Descargas rechazan MIME distinto, cuerpo declarado/stream excedido y respuesta faltante.
- URLs firmadas aceptadas sólo si conservan origen y path exactos; TTL entre 30 y 900 segundos.
- Errores operativos no serializan la clave y auditoría no guarda path ni URL de entrega.

## Métricas y objetivos

- pgTAP focal: 58/58, 100%.
- Mutation score SQL crítico: 16/16, 100%; objetivo mínimo 90%.
- Mutation score TypeScript: 92.84%; objetivo mínimo 90%.
- Tests unitarios focales: 87/87.
- Bytes/Base64/URLs firmadas persistidas en PostgreSQL durante el diseño: 0.
- Fugas tenant observadas: 0.
- Publicaciones previas a aprobación aceptadas: 0.
- Objetivo de RPC interno p95 en producción: <= 100 ms, separado de upload/transcodificación.
- Objetivo de creación de URL firmada p95 en producción: <= 250 ms y error rate < 0.5%.
- Upload/download se medirán por tamaño y proveedor; objetivo inicial p95 para objetos <= 5 MiB:
  <= 3 s sin contar recepción desde Meta.
- SLO de integridad: 100% de assets `verified` con original y análisis WebP físicos registrados.

Los objetivos de latencia son criterios de aceptación productivos; aún no son mediciones de este
host ni del proveedor remoto.

## Procedimiento QA pendiente antes de desplegar

1. Reproducir el pipeline integral en CI y registrar el run después de commit/push autorizado.
2. Aplicar la migración únicamente desde `develop` al proyecto exacto AgenteFer y regenerar tipos.
3. Verificar configuración real de ambos buckets, policies, advisors y ausencia de drift.
4. Subir JPEG, PNG y WebP reales; validar magic bytes, decodificación segura, orientación y límites.
5. Probar concurrencia de hash/link/ordinal y recuperación tras fallo entre upload y registro SQL.
6. Ejecutar B3-005: descarga Meta autenticada, derivación, visión, preguntas y borrador durable.
7. Ejecutar B3-006: creación transaccional de categoría/producto/variante/SKU/precio/composición.
8. Enviar el JPEG privado a una cuenta real de prueba y comprobar expiración/revocación de URL.
9. Mostrar sólo el WebP aprobado en QR y verificar aislamiento cliente/admin.
10. Medir SLO, costo, errores, reintentos, objetos huérfanos y reconciliación antes de producción.

## Riesgos abiertos

- B2-010 modela y transporta medios, pero todavía no inspecciona magic bytes ni transcodifica; eso
  pertenece a B3-005 y debe ejecutarse en aislamiento.
- No existe todavía la tool cognitiva que interprete la foto, proponga SKU o haga preguntas a Fer.
- No se ha probado descarga ni envío real mediante Meta; sus URLs temporales no se guardarán.
- No existe aún vista QR/admin que consuma la galería aprobada.
- Los 29 mutantes TypeScript supervivientes son ramas redundantes o defensivas fuera del umbral;
  el reporte JSON conserva su ubicación para seguimiento. Ninguna puerta crítica SQL sobrevivió.
