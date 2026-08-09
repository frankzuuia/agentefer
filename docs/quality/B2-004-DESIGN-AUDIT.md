# AgenteFer — auditoría forense B2-004

Fecha: 2026-08-09.  
Alcance: libros y tiers de precio universales, moneda, unidad, cantidad, vigencia, `on_request`, historial y resolución exacta.  
Estado: **CANDIDATE — PENDING ISOLATED CI**; aplicado y probado contra Supabase AgenteFer, sin declarar todavía el gate local-Docker de CI.

## Evidencia disponible

- Requisitos: BL-010, SC-010, SC-013, RQ-031–RQ-033, RQ-046, RQ-051, RQ-053/RQ-054 y RQ-110.
- Investigación oficial: `docs/references/PRICING-B2-004-RESEARCH.md`.
- Contrato físico: `docs/architecture/PRICING-B2-004.md`.
- Aceptación: `features/b2_004_pricing.feature`, con 8 escenarios y 6 reglas.
- Migración: `20260809200347_b2_004_pricing.sql`, SHA-256 `61FFDC0FA104BDB236B8F38C2226816A71DFFF22659F4C1ABB1D80077BCF065C`.
- Hardening: `20260809201842_b2_004_monotonic_updated_at.sql`, SHA-256 `0BF40BF2F60FD3A1EF88B638F7CE4F1534EE4EB20BFA036AF4F2E96B6E19BF1B`.
- pgTAP: `b2_004_pricing_test.sql`, SHA-256 `6F5F7CFC15BE6F3705410C01A5CEC1C84590A3E1E8EC65B35F75D46DAF8AA4AC`.
- Proyecto exclusivo verificado por CLI: `AgenteFer`, ref `hprdctmblmfcoagugvyp`.
- Remoto: versiones `20260809200347` y `20260809201842` aplicadas; historial local/remoto sincronizado 6/6.
- Ensayo previo: migración completa y 65/65 pgTAP en una única transacción con `ROLLBACK`.
- Esquema persistido: 274/274 pgTAP acumuladas mediante Management API; fixtures con `ROLLBACK`.
- Tipos: regenerados desde remoto para `app_private,api`; incluyen tablas, vistas y `resolve_price_quote`.
- Contrato estático: cinco migraciones, 32 tablas con RLS forzado y 274 pgTAP acumuladas.
- Código del runner: 21/21 unit tests del paquete database, compilación, tipos, lint y formato verdes.

## Autopsia de la única regresión del ensayo

La primera ejecución transaccional aprobó 64 de 65 aserciones. El caso llamado “rango no solapado” intentaba insertar cantidad `20–30` sobre la misma variante que ya tenía un tier abierto `5–∞` durante la misma vigencia. PostgreSQL rechazó correctamente la fila con `23P01` y nombró `price_tiers_no_current_overlap`.

La corrección fue sobre el fixture, no sobre la constraint: el caso independiente se movió a una variante que solo tenía cantidad exacta 1. La repetición completa aprobó 65/65. No se deshabilitó ninguna constraint, no se borró historia y no se convirtió el conflicto en prioridad implícita.

## Autopsia de timestamp en regresión acumulada

La primera repetición enlazada de B2-001 sobre el esquema B2-004 falló únicamente en “`updated_at` advances automatically”. El runner Management API envía el archivo como un solo mensaje SQL; PostgreSQL fija `statement_timestamp()` al inicio de ese mensaje. La función histórica `set_updated_at()` podía entonces asignar un instante igual a `created_at`, situación también posible dentro de una tool/RPC con varias operaciones.

La solución no reescribió la migración histórica. Una migración forward-only reemplazó la función compartida por `greatest(clock_timestamp(), old.updated_at + interval '1 microsecond')`, garantizando avance estricto y conservando todos los triggers. El ensayo con migración+49 pgTAP aprobó dentro de rollback; tras aplicarla, las suites B2-001/002/003/004 aprobaron 49/49, 85/85, 75/75 y 65/65 respectivamente.

## Cross-match

| Riesgo                         | Control                                         | Evidencia                                           |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------------- |
| columnas para 1/2/3/4          | tiers como filas con `quantity_min/max`         | fixture exacto 1, paquete 4 y tramo abierto >4      |
| dinero flotante                | `numeric` exacto y escala máxima 6              | multiplicación decimal y rechazo de escala excesiva |
| paquete derivado indebidamente | `fixed_total` explícito                         | cuatro unidades conservan 6000, no derivan 6800     |
| precio inexistente inventado   | estado `on_request` sin monto                   | resolver devuelve total nulo                        |
| dos precios aplicables         | exclusión GiST en seis dimensiones              | solapamiento rechazado con `23P01`                  |
| cambio destructivo             | fila anterior se supersede una vez              | vista tipada anterior/nuevo + evidencia             |
| cruce tenant                   | FK compuestas, RLS forzada y vistas invocadoras | fixtures A/B y pruebas por rol                      |
| acceso público prematuro       | cero grants `anon`                              | vista/RPC anónima denegada antes de B6              |
| intención en backend           | SQL solo valida IDs y contratos explícitos      | el LLM futuro elige tools/argumentos                |

## Seguridad y límites preservados

- `price_books` y `price_tiers` tienen RLS habilitado y forzado.
- `authenticated` solo lee; `service_role` versiona pero no elimina historia.
- Las vistas usan `security_invoker` y `security_barrier`.
- Toda función `SECURITY DEFINER` fija `search_path = ''`.
- B2-005 sigue siendo propietario exclusivo de stock, composición, reservas y movimientos.
- B3-006/B3-007 implementarán las tools cognitivas; PostgreSQL no interpreta la orden de Fer.
- B6 decidirá la proyección pública autorizada; B2-004 no expone precios a `anon`.
- No se cargaron productos ni precios reales y no se conectó Meta, EasyPanel, Cloudflare o Vercel.

## Gate pendiente

El equipo local no tiene Docker/Podman instalado. Se añadió un ensayo remoto transaccional con guard exacto de nombre/ref para validar SQL real sin persistencia, pero esta evidencia no sustituye el job aislado de CI.

Antes de cambiar B2-004 a `[x]`, GitHub Actions debe demostrar:

- las seis migraciones desde cero;
- las 274 pgTAP acumuladas;
- dos sesiones concurrentes para SKU y dos para tiers de precio solapados;
- 6/6 mutantes de esquema eliminados;
- tipos sin drift, lint y advisors;
- gates generales de cobertura, mutation testing de código, contenedores y supply chain.
