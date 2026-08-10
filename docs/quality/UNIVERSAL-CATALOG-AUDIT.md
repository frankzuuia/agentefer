# AgenteFer — auditoría de catálogo universal RQ-110

Fecha: 2026-08-03.  
Alcance: aclaración de producto, arquitectura documental y gate de regresión previos a B2.  
Excluido: migraciones, datos comerciales, catálogo funcional, despliegues e integraciones externas; todavía no existen.

Actualización acumulada 2026-08-10: la exclusión anterior describe el gate documental original. B2-003 implementa y certifica el núcleo universal; B2-004 tiene precios aplicados y está pendiente de su CI final de index hardening. B2-005 conserva stock/composición y las publicaciones/integraciones siguen pendientes.

## Corrección solicitada

Fer puede subir y vender cualquier mercancía u oferta permitida, no sólo llantas. Llantas, rines, tinacos y tambos son ejemplos iniciales; una categoría futura debe poder incorporarse como datos sin migración, edición de código ni despliegue.

## Autopsia

Antes de RQ-110, RQ-004 y RQ-052 ya exigían un catálogo multirubro, pero algunos criterios futuros mencionaban “con/sin rin” y cantidades 1–4 sin distinguir fixture de restricción. No había esquema ni código de dominio que corregir, por lo que el riesgo era de implementación futura: construir columnas, enums, UI o tests especializados por accidente.

## Decisión aplicada

- RQ-110 formaliza catálogo universal y extensibilidad sin despliegues.
- BL-009–BL-012 cubren categorías/atributos tipados, unidades, variantes, precios, paquetes, inventario y UI data-driven.
- ADR-011 prohíbe tablas/columnas/enums/ramas por rubro, precios fijos 1–4 y JSON libre como única fuente autoritativa.
- SC-007 y SC-010 validan categoría nueva, atributos/unidades dinámicos y cantidades arbitrarias.
- B2-003/004/005, B3-006 y B6-002/003 contienen entregables y validaciones concretas.
- ADR-010 y el playbook de onboarding exigen que cualquier OpenAI/MiniMax futuro pase evals multirubro.
- SA-008 separa catálogo universal de autorización legal/comercial/de canal.

## Matriz de trazabilidad

| Fuente  | Contrato                                                 | Validación futura                                       |
| ------- | -------------------------------------------------------- | ------------------------------------------------------- |
| RQ-110  | categoría/atributos/unidades/opciones/tarifas como datos | categoría nueva sin migración/código/deploy             |
| BL-009  | producto-variante-SKU agnóstico a rubro                  | llanta/rin, tinaco, tambor, genérico y concurrencia SKU |
| BL-010  | escalones de precio y unidades arbitrarios               | 1–4 como fixture, cantidad mayor y otra unidad          |
| BL-011  | unidad inventariable y paquetes explícitos               | concurrencia y consumo declarado                        |
| BL-012  | UI/filtros/selectores generados desde datos              | categoría recién creada y precio server-side            |
| ADR-011 | límites, alternativas y gates                            | B2/B3/B5/B6/B9                                          |

## Seguridad

- Una categoría nueva pertenece a una organización y conserva RLS, procedencia y auditoría.
- El LLM propone/interpreta; tools y backend validan permisos, tipos, referencias, estados, dinero y transacciones.
- Un cliente no puede crear categorías ni ejecutar mutaciones administrativas.
- Una oferta modelable no es automáticamente publicable: activación y salida a Meta pasan por policy/capability gate.
- No se introdujeron secretos, credenciales, conexiones, servicios ni datos comerciales.

## Gate automatizado

`scripts/verify-documentation-contract.mjs` comprueba:

1. continuidad exacta RQ-001–RQ-110;
2. presencia del contrato universal en seis documentos canónicos;
3. trazabilidad RQ-110/ADR-011;
4. ausencia de columnas fijas de categoría o cantidad en contratos de implementación.

El gate se ejecuta como `npm run verify:documentation-contract`, forma parte de `npm test` y `verify-workspace-gates` exige que no sea retirado del pipeline.

## Evidencia ejecutada

- `git diff --check`: aprobado.
- `npm run verify:documentation-contract`: 110 requisitos continuos y 6 contratos canónicos aprobados.
- `npm run format:check`: aprobado.
- `npm run lint`: aprobado.
- `npm run verify`: aprobado en 134.7 s; formato, lint, typecheck, 30 pruebas, builds, runtime API/worker, contratos de contenedor/dependencias y auditorías npm con 0 vulnerabilidades.
- CI de `develop`: run 30861773946 aprobado para `861e9c9`; `Verify` 1m37s y `Container runtime` 54s, incluidas firmas/attestations e imágenes reales no-root/health.

## Veredicto

**Veredicto original: MATCH PERFECT documental para RQ-110.** En la fecha de esta auditoría la implementación funcional continuaba pendiente de los gates de B2; aquel veredicto no afirmaba que ya existieran catálogo, esquema o publicación real.

Estado funcional acumulado: B2-003 está `COMPLETE`, `INTEGRITY TOTAL` y `MATCH PERFECT`; B2-004 es candidato final y B2-005/tools/UI/publicación/integraciones permanecen pendientes.
