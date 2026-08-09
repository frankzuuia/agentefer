# AgenteFer — contrato físico de precios B2-004

Estado: implementado en Supabase AgenteFer; candidato pendiente de CI aislado.  
Requisitos: BL-005/006/010/012, SC-010/SC-013, RQ-031–RQ-033, RQ-046, RQ-051, RQ-053/RQ-054 y RQ-110.  
Proyecto: Supabase AgenteFer `hprdctmblmfcoagugvyp`.

## Objetivo y frontera

B2-004 agrega precios universales y auditables sin introducir categorías comerciales en el esquema. Incluye libros, moneda, unidad de venta, escalones arbitrarios, vigencias, `priced`/`on_request`, resolución exacta y trazabilidad anterior/nuevo.

Quedan fuera:

- stock, composición de paquetes y reservas: B2-005;
- pendientes y respuesta diferida: B2-006/B3-007;
- tool `pricing.set_tiers`: B3-006/B3-007;
- lectura anónima, catálogo y QR: B6;
- publicación Meta: B2-007/B4.

## Modelo físico

### `app_private.price_books`

Representa una lista lógica de precios de una organización.

- `code` es estable y único sin distinguir mayúsculas/minúsculas;
- `currency_code` es obligatorio, mayúsculo y de tres letras ASCII;
- `status` es `draft`, `active` o `retired`;
- `is_default` permite como máximo un libro activo predeterminado por organización;
- organización, código y moneda no se reescriben después de crear el libro;
- no existe `DELETE` para roles de aplicación.

### `app_private.price_tiers`

Cada fila es una versión comercial atribuible.

- scope compuesto: organización, libro, variante y unidad;
- `quantity_min`/`quantity_max` forman un `numrange`; `quantity_max = NULL` deja el rango abierto;
- `valid_from`/`valid_until` forman un `tstzrange` `[inicio, fin)`;
- `pricing_status = priced` exige `calculation_method` y `price_amount`;
- `pricing_status = on_request` prohíbe ambos valores;
- `fixed_total` exige una cantidad exacta; `per_unit` admite un rango;
- `price_amount` es `numeric`, no negativo, máximo 999,999,999,999.999999 y hasta seis decimales;
- cantidades son positivas, de magnitud acotada y compatibles con `catalog_units.decimal_scale`;
- `evidence_id` es obligatorio y tenant-aware;
- `supersedes_price_tier_id` enlaza la versión anterior;
- `superseded_at` es la única mutación económica permitida y sólo transiciona una vez de `NULL` a timestamp;
- el resto de la fila es inmutable y no puede borrarse.

La constraint `price_tiers_no_current_overlap` impide que dos filas no supersedidas coincidan en libro, variante, unidad, cantidad y vigencia. Para representar una excepción exacta dentro de un rango, el rango general se divide explícitamente; el backend no inventa prioridades.

## Auditoría anterior/nuevo

`api.price_tier_changes` une cada fila con `supersedes_price_tier_id` y expone columnas tipadas anteriores/nuevas, actor, evidencia y fecha. La evidencia inmutable puede apuntar al mensaje/comando original. Un reemplazo es una transacción: supersede la fila anterior e inserta una o más filas sucesoras; si cualquier constraint falla, todo revierte.

## Resolución determinista

`api.resolve_price_quote(price_book_id, variant_id, unit_id, quantity, at)`:

1. ejecuta como `SECURITY INVOKER` y hereda RLS;
2. exige libro/unidad activos y fila no supersedida;
3. selecciona por containment de cantidad y vigencia;
4. devuelve `on_request` sin cantidad monetaria, o `priced`;
5. para `fixed_total`, devuelve exactamente el monto configurado;
6. para `per_unit`, multiplica `numeric × numeric` en servidor;
7. devuelve cero filas si no existe una tarifa aplicable.

La exclusión garantiza como máximo una fila aplicable por scope. B2-004 no decide qué quiso decir Fer ni resuelve ambigüedad de variante; la tool futura debe aportar IDs explícitos elegidos por el LLM.

## Seguridad

- ambas tablas tienen RLS habilitado y forzado;
- miembros activos autenticados pueden leer filas de su organización;
- `authenticated` no inserta, actualiza ni elimina;
- `service_role` recibe sólo `SELECT/INSERT/UPDATE` requeridos y nunca `DELETE`;
- las tres vistas son `security_invoker/security_barrier`;
- `anon` no recibe schema, tabla, vista ni ejecución de función;
- toda función privilegiada vive en `app_private`, usa `search_path = ''` y no se expone;
- la función de consulta en `api` es invoker y tiene grants explícitos.

## QA obligatorio

- migraciones completas desde cero y tipos sin drift;
- pgTAP de estructura, dinero, escala, rangos, vigencias, `on_request`, historial, RLS y cross-org;
- cantidad 1/4/>4, total fijo y tarifa por unidad;
- dos sesiones concurrentes intentando rangos solapados: un commit y un conflicto;
- mutation testing que elimine exclusión, policy o validator y demuestre que las pruebas fallan;
- lint, advisors, cobertura, contenedores, supply chain y CI `develop` verdes;
- aplicación linked sólo tras validar nombre/ref de AgenteFer.

## Recuperación

La migración es forward-only y atómica. No se cargan precios comerciales ni seeds. Si staging revela una incompatibilidad, se revoca exposición y se aplica una migración correctiva; no se reescribe ni elimina historia ya registrada.
