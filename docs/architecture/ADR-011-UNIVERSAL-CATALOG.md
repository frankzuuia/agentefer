# ADR-011 — catálogo universal definido por datos

Estado: aceptada antes del modelo de datos B2.  
Fecha: 2026-08-03.  
Requisitos: RQ-004, RQ-027–RQ-033, RQ-040–RQ-052, RQ-110.

## Contexto

El caso inicial aporta evidencia real de llantas y rines, y Fer también vende tinacos, tambos y otros artículos. Fer debe poder enviar foto/texto/audio de una mercancía permitida que el sistema nunca haya visto, crear o reutilizar su categoría, completar los datos necesarios y ponerla a la venta sin solicitar un cambio de código.

Un esquema especializado en llantas, una lista cerrada de categorías o precios con columnas para una, dos, tres y cuatro piezas convertirían cada rubro nuevo en una migración. En el extremo opuesto, guardar todo en JSON sin definiciones tipadas impediría validación, filtros, unicidad, índices y reportes confiables.

## Decisión

### Núcleo agnóstico a categoría

- `producto` representa la oferta conceptual.
- `variante` representa una combinación materialmente vendible y conserva un SKU estable.
- `categoría` y sus definiciones de atributos son datos versionables y aislados por organización, no enums compilados.
- Las definiciones declaran tipo, unidad, obligatoriedad, cardinalidad, opciones y comportamiento de búsqueda/filtro cuando aplique.
- Los valores se validan contra la definición vigente antes de activar una oferta.
- Una oferta genérica puede no requerir atributos especializados; sólo debe cumplir los invariantes universales de identidad, estado, unidad, visibilidad, procedencia y autorización.
- Plantillas iniciales de llanta, rin, tinaco o tambor podrán existir como datos reutilizables, nunca como tablas/columnas privilegiadas.

Los nombres físicos definitivos y los tipos PostgreSQL se ratificarán en B2-003 antes de migrar. Esta decisión fija el comportamiento, no inventa un esquema ya desplegado.

### Unidades, variantes, precios y paquetes

- Cada variante declara su unidad vendible y su unidad inventariable cuando exista stock.
- Una categoría u oferta puede usar pieza, par, set, paquete, volumen u otra unidad autorizada por la organización.
- Los precios por cantidad son escalones arbitrarios versionados; 1–4 es sólo un fixture del caso de llantas.
- Un combo, kit o paquete que consume otras existencias declara su composición y cantidades. El backend no deduce componentes por el nombre ni por la categoría.
- Precio, stock, variante y composición siguen siendo datos separados y auditables.

### Ingesta y operación cognitiva

El LLM interpreta el contenido aportado por Fer y usa tools para:

1. buscar categorías/atributos existentes;
2. proponer reutilizar o crear una categoría;
3. proponer producto, variantes, unidades, precios, stock y atributos con evidencia;
4. mostrar candidatos si podría existir la oferta;
5. preguntar únicamente lo crítico que falta;
6. confirmar mediante herramientas autorizadas.

El backend valida identidad, permisos, tipos, referencias, unicidad, estados, dinero, inventario y transacciones. No adivina la intención mediante keywords, regex o árboles por tipo de producto.

### Catálogo público

Tarjetas, detalle, filtros, selectores de opción/unidad/cantidad y consulta de precio se construyen a partir de la proyección pública y las definiciones publicables. Agregar una categoría compatible no requiere cambiar el frontend; una presentación visual verdaderamente nueva puede añadirse como mejora progresiva sin bloquear la tarjeta genérica accesible.

### Catálogo universal no significa publicación irrestricta

Que el núcleo pueda modelar una oferta no autoriza vender o publicar contenido prohibido. Activación pública y publicación externa pasan por políticas independientes de legalidad, negocio, seguridad y capacidades del canal. Meta u otro proveedor puede rechazar una categoría sin que el modelo de datos deje de ser universal.

## Alternativas descartadas

### Tablas o columnas por rubro

Descartadas: requieren migración/despliegue por cada mercancía nueva, duplican lógica y limitan búsqueda/reportes.

### Enum cerrado de categorías o variantes

Descartado: contradice la operación de Fer y hace que el catálogo dependa del release de software.

### JSON libre como única representación

Descartado: no garantiza tipos, unidades, campos requeridos, filtros, índices ni evolución gobernada. JSON sólo podrá complementar evidencia cruda o metadatos no autoritativos; los datos comerciales consultables usan definiciones tipadas.

### Columnas fijas `price_1` a `price_4`

Descartadas: no soportan cantidades mayores, paquetes, otras unidades, vigencias ni múltiples listas de precio.

### Ramas de código por nombre de categoría

Descartadas: la interpretación es cognitiva y las invariantes son data-driven. Las integraciones externas sólo pueden aplicar una política de canal declarativa, no convertir el dominio en un catálogo de llantas.

## Consecuencias

Positivas:

- Fer puede incorporar mercancía nueva sin desarrollo ni despliegue;
- UI, búsqueda, precios e inventario comparten contratos universales;
- atributos especializados conservan validación y procedencia;
- llantas/rines siguen cubiertos sin dominar el diseño.

Costos:

- B2 debe diseñar definiciones/valores tipados, versionado e índices con cuidado;
- filtros dinámicos requieren una proyección pública eficiente;
- cambios de definición necesitan reglas de compatibilidad y reclasificación;
- paquetes y conversiones de unidad deben ser explícitos para mantener inventario correcto.

## Criterios de aceptación

1. Crear una categoría autorizada desde datos no modifica migraciones, código ni artefactos desplegados.
2. Crear productos de llanta/rin, tinaco, tambor y un artículo genérico usa las mismas entidades y tools.
3. Una categoría puede definir atributos distintos y tipados sin columnas exclusivas.
4. Una variante admite cantidades superiores a cuatro y unidades diferentes sin cambiar esquema.
5. Un paquete consume exactamente los componentes declarados y mantiene stock no negativo.
6. La web renderiza una tarjeta/detalle genéricos y filtros aplicables desde datos.
7. RLS, unicidad, procedencia y auditoría continúan aisladas por organización.
8. Una oferta no permitida queda bloqueada por la política de publicación, aunque pueda conservarse como borrador privado conforme a la política de retención.

## Gates

- B2-003 debe ratificar el esquema físico, índices, versionado y pruebas multirubro antes de crear la migración.
- B2-004 debe demostrar escalones/unidades arbitrarios y dinero preciso.
- B2-005 debe demostrar composición/consumo transaccional cuando existan paquetes.
- B3 debe exponer tools universales sin decisiones por categoría en el backend.
- B5 debe evaluar creación de categoría/atributos nuevos con tool calling.
- B6 debe verificar tarjeta genérica, filtros dinámicos, unidades y cantidades en navegador real.
