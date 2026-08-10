# AgenteFer — auditoría forense B2-004

Fecha de cierre: 2026-08-10.  
Alcance: libros y tiers de precio universales, moneda, unidad, cantidad, vigencia, `on_request`, historial y resolución exacta.  
Estado: **CANDIDATE — PENDING FINAL CI**; siete migraciones y 275/275 pgTAP verificadas contra Supabase AgenteFer, index hardening pendiente de CI aislado.

## Evidencia final

- Requisitos: BL-010, SC-010, SC-013, RQ-031–RQ-033, RQ-046, RQ-051, RQ-053/RQ-054 y RQ-110.
- Investigación oficial: `docs/references/PRICING-B2-004-RESEARCH.md`.
- Contrato físico: `docs/architecture/PRICING-B2-004.md`.
- Aceptación: `features/b2_004_pricing.feature`, con 8 escenarios y 6 reglas.
- Migración: `20260809200347_b2_004_pricing.sql`, SHA-256 `61FFDC0FA104BDB236B8F38C2226816A71DFFF22659F4C1ABB1D80077BCF065C`.
- Hardening: `20260809201842_b2_004_monotonic_updated_at.sql`, SHA-256 `0BF40BF2F60FD3A1EF88B638F7CE4F1534EE4EB20BFA036AF4F2E96B6E19BF1B`.
- Index hardening: `20260810155350_b2_004_price_book_creator_index.sql`, SHA-256 `74D669CE1E102156ACB8CD76C5F6B03A94B6E953F63B66A87CADB67A91D53E87`.
- pgTAP: `b2_004_pricing_test.sql`, SHA-256 `4A36A0B9E1205C77EE6561C2AAA22E11F89D1EC6B033D9EBDA2C3B4831620F0F`.
- Proyecto exclusivo verificado por CLI: `AgenteFer`, ref `hprdctmblmfcoagugvyp`.
- Remoto: versiones `20260809200347`, `20260809201842` y `20260810155350` aplicadas; historial local/remoto sincronizado 7/7.
- Ensayos previos: cada hardening y su pgTAP se ejecutaron en una única transacción con `ROLLBACK`.
- Esquema persistido: 275/275 pgTAP acumuladas mediante Management API; fixtures con `ROLLBACK`.
- Suite B2-004 vigente: 66/66 pgTAP, incluida cobertura genérica de índices FK.
- Tipos: regenerados desde remoto para `app_private,api`; incluyen tablas, vistas y `resolve_price_quote`.
- Contrato estático: siete migraciones, 32 tablas con RLS forzado y 275 pgTAP acumuladas.
- Código del runner: 21/21 unit tests del paquete database, compilación, tipos, lint y formato verdes.
- Código final: 95/95 tests; 94.02% líneas, 93.83% statements, 93.10% funciones y 89.57% ramas; 112/112 mutantes de código eliminados.
- CI candidato previo al index hardening: run `31334187729` sobre `fa5ac860a330d6eb959f3a7ae1fbfb5a8c66bd1d`; jobs `Verify` (`93297206821`), `Database contract` (`93297438027`) y `Container runtime` (`93297438029`) en `success`, con 0 annotations.
- Supply chain: 0 vulnerabilidades, 546 firmas de registro y 145 attestations verificadas.
- Changelog oficial Supabase revisado al cierre; ningún breaking change vigente afecta el contrato B2-004.

## Autopsia de la única regresión del ensayo

La primera ejecución transaccional aprobó 64 de 65 aserciones. El caso llamado “rango no solapado” intentaba insertar cantidad `20–30` sobre la misma variante que ya tenía un tier abierto `5–∞` durante la misma vigencia. PostgreSQL rechazó correctamente la fila con `23P01` y nombró `price_tiers_no_current_overlap`.

La corrección fue sobre el fixture, no sobre la constraint: el caso independiente se movió a una variante que solo tenía cantidad exacta 1. La repetición completa aprobó 65/65. No se deshabilitó ninguna constraint, no se borró historia y no se convirtió el conflicto en prioridad implícita.

## Autopsia de timestamp en regresión acumulada

La primera repetición enlazada de B2-001 sobre el esquema B2-004 falló únicamente en “`updated_at` advances automatically”. El runner Management API envía el archivo como un solo mensaje SQL; PostgreSQL fija `statement_timestamp()` al inicio de ese mensaje. La función histórica `set_updated_at()` podía entonces asignar un instante igual a `created_at`, situación también posible dentro de una tool/RPC con varias operaciones.

La solución no reescribió la migración histórica. Una migración forward-only reemplazó la función compartida por `greatest(clock_timestamp(), old.updated_at + interval '1 microsecond')`, garantizando avance estricto y conservando todos los triggers. El ensayo con migración+49 pgTAP aprobó dentro de rollback; tras aplicarla, las suites B2-001/002/003/004 aprobaron 49/49, 85/85, 75/75 y 65/65 respectivamente.

## Autopsia de índice FK y rol CLI temporal

La revisión con la skill oficial Supabase Postgres Best Practices detectó que `price_books.created_by_user_id` tenía FK `ON DELETE SET NULL` sin índice propio. Aunque los advisors no lo elevaron a warning, una baja de usuario podía escanear todos los libros. Se creó una migración forward-only con índice parcial y una aserción genérica que exige que ninguna columna FK B2-004 quede sin índice; el pgTAP pasó de 65 a 66 y mutation testing de esquema pasa de 6 a 7 mutantes.

Durante el preflight se ejecutaron por error dos comandos linked en paralelo. Ambos inicializan el rol temporal `cli_login_postgres`; una sesión recibió `28P01` mientras la otra completó el dry-run. La repetición secuencial pasó sin cambiar credenciales. Los comandos Supabase linked quedan serializados para evitar rotaciones concurrentes del rol temporal.

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

El equipo local no tiene Docker/Podman instalado. El ensayo remoto transaccional con guard exacto de nombre/ref validó SQL real sin persistencia; GitHub Actions aportó después el PostgreSQL/Supabase aislado que faltaba.

El run `31334187729` demostró el contrato previo. El CI final del index hardening debe demostrar:

- las siete migraciones desde cero;
- las 275 pgTAP acumuladas;
- dos sesiones concurrentes para SKU y dos para tiers de precio solapados;
- 7/7 mutantes de esquema eliminados;
- tipos sin drift, lint y advisors;
- gates generales de cobertura, mutation testing de código, contenedores y supply chain.

B2-004 no cambia a `[x]` hasta que ese nuevo run concluya `success`; B2-005 conserva la propiedad exclusiva de stock/composición.
