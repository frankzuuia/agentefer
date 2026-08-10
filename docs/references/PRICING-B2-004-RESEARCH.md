# AgenteFer — investigación oficial B2-004

Fecha de revisión: 2026-08-09.  
Alcance: dinero exacto, rangos de cantidad/vigencia, exclusión concurrente y constraints diferibles en PostgreSQL 17.

## Estado real y fuentes

- Supabase AgenteFer usa PostgreSQL 17.6 y la historia local se reproduce con Supabase CLI 2.111.0.
- PostgreSQL documenta `numeric`/`decimal` como tipos exactos y `real`/`double precision` como inexactos: <https://www.postgresql.org/docs/17/datatype-numeric.html>.
- PostgreSQL recomienda `EXCLUDE` para restricciones entre filas y advierte que un `CHECK` no debe consultar otras filas: <https://www.postgresql.org/docs/17/ddl-constraints.html>.
- Los range types y el operador de solapamiento `&&` permiten impedir intervalos coincidentes; `btree_gist` combina igualdad escalar con rangos: <https://www.postgresql.org/docs/17/rangetypes.html>.
- `btree_gist` es una extensión trusted y aporta clases GiST para `uuid`, `numeric` y `timestamptz`: <https://www.postgresql.org/docs/17/btree-gist.html>.
- Las constraints `EXCLUDE` pueden ser `DEFERRABLE`; `SET CONSTRAINTS` controla su comprobación transaccional: <https://www.postgresql.org/docs/17/sql-set-constraints.html>.
- El changelog Supabase se revisó nuevamente al cierre: los cambios vigentes sobre `logs.all`, versiones explícitas de extensiones, gateway self-hosted, Realtime y autoexposición de `public` no afectan B2-004; este bloque no usa esos endpoints/schemas, no fija versión de extensión y expone únicamente `api` con grants/RLS explícitos: <https://supabase.com/changelog>.

## Decisiones ratificadas

1. Dinero se almacena como `numeric` sin coerción silenciosa a coma flotante; una constraint limita magnitud y seis decimales.
2. Cantidad se almacena como `numeric`; la unidad configurada fija la precisión permitida hasta nueve decimales.
3. Los límites de cantidad generan `numrange` y las vigencias generan `tstzrange` con semántica `[inicio, fin)`.
4. Una exclusión GiST combina organización, libro, variante, unidad, cantidad y vigencia; dos filas actuales ambiguas no pueden confirmar concurrentemente.
5. La exclusión es `DEFERRABLE INITIALLY IMMEDIATE`: falla temprano por defecto y permite reemplazos atómicos controlados.
6. El historial no depende de un `CHECK` cross-row ni de JSON comercial: cada tarifa nueva referencia la fila supersedida y conserva evidencia inmutable.

## Alternativas descartadas

- `money`: acopla formato/locale y no resuelve moneda por fila.
- `double precision`: introduce error binario e incumple el contrato de dinero exacto.
- columnas `price_1`…`price_4`: impiden cantidades arbitrarias, unidades y múltiples libros.
- trigger que busca solapamientos sin lock: susceptible a write skew concurrente.
- permitir solapamientos y elegir por prioridad implícita: convierte una ambigüedad de datos en una decisión silenciosa.
- sobrescribir una fila de precio: elimina el valor anterior exigido por RQ-054.

## Límite cognitivo

PostgreSQL valida referencias, moneda, escala, estado, solapamiento, historial y cálculo aritmético exacto. No interpreta mensajes, fotos, nombres de productos ni intención. El LLM elegirá y llamará tools en B3/B5; esas tools ejecutarán transacciones sobre este contrato.
