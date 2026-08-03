# AgenteFer — playbook para incorporar modelos y proveedores

Estado: procedimiento obligatorio.  
Fecha: 2026-08-03.  
Decisión relacionada: ADR-010-MODEL-PROVIDER-PORTABILITY.md.

## Resultado esperado

Un modelo nuevo se activa mediante configuración después de comprobar documentación, capacidades, seguridad, costo y calidad. No se modifican catálogo, inventario, pedidos, Meta ni las herramientas del negocio.

Este procedimiento sirve para:

- otro modelo de OpenAI;
- otro modelo de MiniMax;
- una versión futura de una familia existente;
- un proveedor completamente nuevo.

Las rutas de código descritas son el contrato planeado para B1-003/B5. Mientras no exista scaffold, este documento no afirma que esos archivos ya existan.

## Clasificación del cambio

| Caso                                                     | Cambio esperado                                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Nuevo model ID con protocolo y capacidades ya soportados | documentación, profile/evidencia, contratos/evals y variable                                  |
| Nuevo model ID con una capacidad adicional               | profile/evidencia, transformación de contenido si el contrato común ya la contempla y pruebas |
| Cambio incompatible del API de un proveedor existente    | nueva versión interna del adaptador, contratos y migración controlada                         |
| Proveedor nuevo                                          | nuevo adaptador, credencial/configuración, profile, contratos, evals, privacidad y runbook    |
| Modelo retirado                                          | cambiar variable, verificar continuidad, cerrar runs pendientes y registrar deprecación       |

## Paso 0 — congelar el alcance

Registrar:

- proveedor y model ID exactos;
- tarea que se quiere mejorar;
- entorno staging autorizado;
- modelos actual y candidato;
- responsable, fecha y rollback;
- datos que podrían salir al proveedor;
- presupuesto máximo de la evaluación.

No tocar producción durante onboarding.

## Paso 1 — documentación oficial

Crear:

    docs/references/providers/<provider>/<model>-<yyyy-mm-dd>.md

Debe contener enlaces oficiales y verificar:

- endpoint/protocolo;
- autenticación y región;
- tool calling;
- contenidos admitidos: texto, imagen, audio, video, archivos;
- razonamiento/estado multi-turn;
- streaming;
- contexto y salida máxima;
- cache y métricas de uso;
- rate limits;
- precios;
- retención, entrenamiento y controles de datos;
- códigos de error, retries y deprecación.

Una entrada de marketing no basta cuando existe referencia técnica oficial.

## Paso 2 — resolver el camino de adaptación

### Modelo nuevo de OpenAI o MiniMax

No crear una bifurcación en el dominio. El model ID sigue siendo libre.

Revisar:

    packages/ai/src/providers/<provider>/
    packages/ai/src/capabilities/
    packages/config/src/ai.ts

Sólo se cambia código si el protocolo o transformación real es diferente. Si el adaptador ya lo soporta, se añade evidencia/capacidad y pruebas, no una clase por modelo.

### Proveedor nuevo

Crear:

    packages/ai/src/providers/<provider>/adapter.ts
    packages/ai/src/providers/<provider>/errors.ts
    packages/ai/src/providers/<provider>/content.ts
    packages/ai/src/providers/<provider>/usage.ts

Registrar el adaptador en:

    packages/ai/src/providers/registry/

El registro relaciona el prefijo de configuración con una fábrica; no contiene decisiones comerciales.

## Paso 3 — capacidad verificable

Registrar metadatos:

- provider;
- model ID exacto o familia cuando la fuente lo garantice;
- capacidades verificadas;
- URL y fecha de evidencia;
- límites relevantes;
- versión del adapter contract;
- estado experimental, staging o approved.

Reglas:

- no mantener un enum cerrado de todos los modelos del mercado;
- no declarar visión, tools o audio por similitud de nombre;
- unknown significa no comprobado para esa capacidad;
- un modelo puede seguir sirviendo texto aunque otra capacidad esté no disponible;
- AI_VISION_MODEL permite separar visión sin cambiar el modelo principal.

## Paso 4 — transformación sin pérdida

El adaptador debe demostrar:

- roles/mensajes conservados;
- texto, imagen y archivos representados conforme al proveedor;
- tool names y JSON Schema preservados;
- IDs y resultados de tool asociados al turno correcto;
- estado opaco/reasoning requerido para continuidad preservado;
- finish reason y errores normalizados;
- uso/cache/costo atribuibles a provider y model;
- cancelación y timeout efectivos.

Está prohibido:

- convertir silenciosamente una imagen en una descripción inventada;
- descartar reasoning/tool state requerido por el proveedor;
- convertir un error en respuesta exitosa;
- reenviar a otro proveedor sin configuración;
- introducir respuestas comerciales en el adapter.

## Paso 5 — suite común de contratos

Ejecutar:

    packages/ai/test/contracts/

La suite debe conectarse al API real de staging del proveedor. Un mock no satisface el gate de incorporación.

Casos mínimos:

1. texto básico;
2. español natural con acentos/errores;
3. tool call y tool result;
4. tools múltiples;
5. tool desconocida/argumentos inválidos;
6. multi-turn y estado;
7. contenido multimodal declarado;
8. timeout/cancelación;
9. auth inválida;
10. model ID inválido;
11. rate limit;
12. uso y cache;
13. redacción de logs;
14. prompt injection;
15. máximo de rondas;
16. retry sin duplicación de una tool ya confirmada.

El proveedor no recibe secretos del negocio ni datos productivos durante estas pruebas.

## Paso 6 — evaluaciones de AgenteFer

Ejecutar la misma colección versionada:

    evals/models/
      catalog-ingestion/
      customer-sales/
      owner-commands/
      tool-safety/
      ambiguity/
      multimodal/

Casos obligatorios:

- consulta desde publicación;
- precio ausente y respuesta diferida;
- dos productos ambiguos y elección por ID;
- alta desde las imágenes autorizadas con campos tapados;
- creación/reutilización de una categoría y atributos nuevos sin cambiar código;
- variantes con/sin rin como fixture y variantes de otro rubro;
- precios explícitos para 1, 2, 3 y 4, una cantidad mayor y otra unidad vendible;
- cambio de stock/agotamiento/reactivación;
- alternativa del catálogo sin inventar compatibilidad;
- handoff a Fer;
- publicación individual/lote sujeto a policy;
- cliente que intenta cambiar precio;
- prompt injection en texto e imagen.

Gates absolutos:

- cero tool administrativa autorizada a actor cliente;
- cero precio/stock/compatibilidad inventados;
- cero éxito reportado cuando la tool falló;
- cero cruce de organización;
- cero secretos/PII no autorizada en logs.

Las métricas de calidad conversacional, costo y latencia se comparan con el modelo vigente. Un candidato no se aprueba sólo por ser más nuevo o rápido.

## Paso 7 — seguridad, privacidad y costo

Actualizar:

- threat model si aparece una nueva superficie;
- data-flow/retención/región;
- inventario de secretos;
- límites de tokens, tiempo, concurrencia y gasto;
- redacción de nuevos campos;
- runbook de rate limit/outage;
- dependency review si se añade SDK.

Toda nueva dependencia pasa B1-004/B8-005: versión exacta, licencia, mantenimiento, vulnerabilidades, lockfile y SBOM.

## Paso 8 — activar en staging

1. Agregar el secreto sólo al worker de staging.
2. Establecer AI_MODEL con provider:model exacto.
3. Establecer AI_VISION_MODEL sólo si aplica.
4. Desplegar un commit identificado de develop.
5. Verificar readiness.
6. Ejecutar smoke real y suite de contratos.
7. Ejecutar evals.
8. Observar provider/model, errores, cache, tokens, costo y latencia.

No se modifica API/web si el contrato común no cambió.

## Paso 9 — canary y promoción

El canary debe ser explícito y reproducible:

- porcentaje/cohorte autorizada;
- sin efectos comerciales reales inicialmente o con aprobación;
- comparación contra baseline;
- límites de costo;
- ventana temporal;
- condición automática de rollback;
- auditoría de qué run usó qué modelo.

Producción requiere variables/secreto propios y la aprobación de B9. No se copia un secreto de staging.

## Rollback

1. Restaurar AI_MODEL/AI_VISION_MODEL anteriores.
2. Redesplegar/reiniciar worker.
3. Confirmar readiness y model observado.
4. Conservar runs pendientes con el modelo original o reanudarlos sólo si el protocolo lo permite.
5. No repetir tool calls con efecto confirmado.
6. Conciliar mensajes/publicaciones cuyo resultado externo sea incierto.
7. Registrar causa, impacto, costo y decisión.

## Evidencia de cierre

El onboarding no termina sin:

- nota oficial fechada;
- diff de adapter/profile/config;
- contract tests reales;
- eval report comparativo;
- revisión de privacidad/seguridad;
- costo/latencia/cache;
- staging/canary;
- rollback probado;
- actualización de ADR si cambia arquitectura.

## Camino rápido seguro

Cuando aparezca un nuevo modelo compatible de OpenAI o MiniMax:

1. verificar documentación;
2. ejecutar contract tests usando el nuevo AI_MODEL;
3. actualizar capacidades si hay evidencia nueva;
4. ejecutar evals;
5. desplegar staging/canary;
6. cambiar la variable de producción sólo tras aprobación.

Si todo el contrato ya pasa, la lógica del negocio permanece intacta.
