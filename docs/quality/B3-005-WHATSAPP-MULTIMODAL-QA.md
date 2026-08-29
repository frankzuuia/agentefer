# AgenteFer — QA B3-005 multimodal WhatsApp

Estado: **PRUEBAS FUNCIONALES Y MUTATION CRÍTICO VERDES — SUPABASE/META/E2E PENDIENTES**.  
Fecha de corte: 2026-08-28.

## Evidencia local

| Puerta                      | Resultado | Comando/evidencia                                                                                                  |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ |
| Contrato SQL                | Verde     | `node ./scripts/verify-database-contract.mjs`: 32 migraciones ordenadas, 96 tablas RLS, 1,165 assertions pgTAP     |
| Media Graph + normalización | Verde     | `npx vitest run apps/worker/test/whatsapp-media.test.ts`: 24/24                                                    |
| RPC/turno multimodal        | Verde     | `npx vitest run apps/worker/test/whatsapp-ai-rpc.test.ts apps/worker/test/whatsapp-ai-processor.test.ts`: 52/52    |
| Ingesta durable             | Verde     | `npx vitest run apps/worker/test/media-ingest-processor.test.ts`: 15/15                                            |
| Worker typecheck/lint       | Verde     | `npm run typecheck --workspace @agentefer/worker`; `npm run lint --workspace @agentefer/worker`                    |
| OpenAI/MiniMax provider     | Verde     | `npx vitest run packages/ai/test/provider.test.ts`: 53/53                                                          |
| Mutation crítico            | Verde     | `npm run test:mutation:b3-005-critical`: 169 muertos, 16 sobrevivientes, 0 timeouts, 0 sin cobertura; score 91.35% |
| Aplicación remota           | Pendiente | no se aplicaron migraciones ni se tocaron credenciales o datos del proyecto                                        |
| Meta E2E                    | Pendiente | falta webhook/URL Graph real, descarga de las fotos de Fer y respuesta real                                        |

## Casos cubiertos

- Descarga autenticada con Bearer, sin redirects y sólo hosts Meta permitidos.
- MIME declarado, magic bytes, hash/tamaño, dimensiones, píxeles y derivación WebP.
- Reintento idempotente después de timeout de Storage mediante descarga y hash del objeto existente.
- Lease tenant-scoped, Vault, estado `pending/processing/retryable/succeeded/rejected/dead_letter`.
- Enriquecimiento de conversación con URL firmada efímera y rechazo si falta la rendición.
- OpenAI recibe `input_image`; MiniMax rechaza imágenes con error explícito de capacidad.
- Routing durable al modelo de visión sólo para imágenes ya verificadas.
- Los 16 mutantes sobrevivientes están registrados en el reporte JSON; no se ignoran ni se rebaja el umbral de 90%.

## Métricas objetivo antes de staging

- 0 bytes/Base64/URLs firmadas persistidos.
- 0 lecturas cross-tenant y 0 assets `verified` sin original + WebP.
- p95 de RPC interno <=100 ms; p95 URL firmada <=250 ms; error <0.5%.
- Mutation score de rutas críticas >=90% (actual: 91.35%) y cobertura de ramas críticas 100%.

## Bloque siguiente

B3-006 definirá las tools transaccionales para borrador, categoría, producto, variante, unidad,
SKU, precio y composición. La visión sólo propondrá datos y preguntas; Fer confirmará combo,
venta separada, precios, compatibilidad y stock antes de cualquier escritura comercial. B3-005
no se declara cerrado hasta completar las puertas remotas y el recorrido E2E con Meta.
