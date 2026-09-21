# B3-006A — evidencia y límites, 2026-09-07

## Estado

Implementación de alta conversacional versionada en AgenteFer/develop. Migración aplicada sólo en
el proyecto de pruebas `hprdctmblmfcoagugvyp`; no desplegada en servicios productivos.
El postflight remoto ejecutó 88 aserciones con fixtures transaccionales y rollback.
No publicaciones reales, catálogo comercial de prueba persistido ni cambios OAuth en este bloque.
El procedimiento master-architect exigió especificación y trazabilidad antes de implementar;
las puertas pendientes impiden certificar producción o desplegar sin excepción explícita.

## Hallazgos reparados

1. Faltaban herramientas de alta persistente: contexto, guardar propuesta y aplicar confirmación.
2. Conversaciones existentes conservaban una política vieja: cada nuevo turno del dueño adopta
   una instantánea versionada sin reescribir los runs anteriores ni ampliar permisos de clientes.
3. Un rechazo de dominio no podía anunciarse como efecto aplicado: el dispatcher registra
   `failed/confirmed_not_applied`, conserva el error operativo y devuelve el control al modelo.
4. El panel no podía previsualizar imágenes privadas: consulta autorizada más firma temporal en
   lote, sin Base64 ni publicación del original. Transporte real pendiente, no certificado.
5. El worker resolvía incorrectamente `/object/sign/...` desde el dominio: ahora usa la raíz
   `/storage/v1`, verifica archivo/origen/firma y mantiene los límites de seguridad existentes.
   [Contrato oficial de Storage](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts).

## Resultados medidos

| Comprobación | Resultado | Alcance |
| --- | --- | --- |
| `test:coverage` | 1,141 pruebas, 46 archivos, cero fallos | Regresión local; no equivale a E2E externo |
| Cobertura global | líneas 91.09%, sentencias 91.04%, ramas 86.59%, funciones 93.84% | Umbrales existentes 90/90/85/90 |
| `catalog-private-media.ts` | 100% líneas, sentencias, ramas y funciones | Validador puro: 38 pruebas |
| `media-storage.ts` | 98.78% líneas, 97.79% ramas | 23 nuevas pruebas puras; regresión de transporte existente |
| `admin-catalog-gateway.ts` | 79.13% líneas, 67.29% ramas | Firma por lote 708–747 SIN cobertura de transporte real: gate abierto |
| pgTAP nuevo | 88 aserciones, cero fallos | Contratos, SKUs automáticos, confirmación posterior, stock/combo, rechazos y permisos |
| Regresión PostgreSQL | 1,397 aserciones, 28 suites, cero fallos | Migración candidata más todas las pruebas SQL, rollback |
| Mutación SQL | 6/6 detectadas | Misma confirmación, revisión, replay, Base64, dueño, composición |
| Mutación TS dirigida | 172/179 detectadas, 96.09% | API 95.61%; worker 96.92%; umbral 90, sin excluir supervivientes |
| Contraprueba estática directa | 3/3 cambios incorrectos detectados | Proceso Vitest independiente por cambio; restauración y 38/38 pruebas verdes |
| Gherkin | 21 archivos, 398 escenarios compilados | Sintaxis/contratos, NO ejecución E2E de todos los escenarios |
| Dependencias | cero vulnerabilidades en `npm audit`, total y producción | Actualización separada auditada |
| Formato, lint, typecheck, build | verdes | Ejecución local, no CI remoto |
| Patrones de secretos | cero coincidencias en 16 archivos cambiados al ejecutar | Heurística sin valores en salida; no sustituye escaneo especializado |
| Complejidad ESLint | API 24, worker 14 | Controles operativos explícitos; no árboles de intención comercial |

La complejidad API concentra validación de forma, conjunto autorizado y URL. No se redujo quitando
controles para mejorar una cifra; cobertura de todas sus ramas y mutación dirigida son obligatorias.
La firma por lote HTTP no hereda ese 100% y sigue pendiente. No se bajó ningún umbral.

La regresión SQL tardó 109,559 ms sumando procesos CLI/red/SQL; por suite 2,981–5,484 ms.
NO es latencia SQL aislada ni SLO productivo. Latencia p95 foto→respuesta, errores reales de Storage,
costos y continuidad de conversación aún no medidos en este bloque. Objetivos de aceptación:
cero escapes de organización, cero duplicados, cero stock creado por un combo, cero publicaciones
sin solicitud. No se declara cumplimiento de SLO sin tráfico real medido.

## Reproducción

Verificar raíz, remoto autorizado y `develop` antes de ejecutar. La migración debe seguir sin
aplicar para los modos de ensayo; al aplicarla se requiere postflight sin repetir DDL.

```text
npm run typecheck
npm run lint
npm run build
npm run format:check
npm run audit
npm run test:coverage
npm run test:mutation:b3-006a
npm run verify:database-contract
npm run verify:acceptance-contract
npm run verify:documentation-contract
npm run database:types:linked
npm run test:database:linked:b3-006a -- postflight
npm run test:database:linked:b3-006a -- regression
npm run test:database:linked:b3-006a -- mutations
git diff --check
```

Informes locales ignorados por Git: `coverage/coverage-summary.json`,
`reports/database-quality/b3-006a-regression.json`, `b3-006a-mutations.json` y
`reports/mutation/b3-006a-private-media.json`. La salida original queda en la sesión.
Las pruebas SQL utilizan datos transaccionales de contratos; no simulan servicios externos.
Las nuevas pruebas TypeScript son funciones puras sin red. La regresión conserva los fixtures
HTTP existentes del repositorio; no se presentaron como integración real de Supabase o Meta.

## Puertas que siguen abiertas

- CI completo y validación posterior en el entorno de despliegue siguen pendientes. La migración
  ya está aplicada en pruebas, el postflight remoto pasó 88/88 y `database.types.ts` fue sincronizado.
- Foto real del dueño→ingesta durable→WebP→firma→visión→preguntas únicamente faltantes→resumen→
  confirmación posterior→catálogo. Probar cambio de tema y más de 24 mensajes sin perder borrador.
- Firma por lote real, expiración, rechazo de objetos ajenos, falta de objeto y recuperación de Storage.
  Probar galería/principal privada en móvil. No hay bytes ni URLs firmadas persistidos en DB.
- Medios verificados de otra conversación/organización, roles revocados y prompt injection con fotos
  reales; lo probado actualmente incluye rechazo de identidad de medio no verificada, no ese E2E.
- Concurrencia en conexiones PostgreSQL independientes y recuperación tras reinicio. Las pruebas
  actuales verifican replay y revisión obsoleta secuencialmente; no prueban competencia real.
- Revisar atributos opcionales complejos mediante aceptación real; evitar prometer cobertura total
  de todas las combinaciones por el promedio de pruebas.

### Revisión de mutantes supervivientes

No se cambió el resultado bruto 96.09%. Los dos mutantes API de tipo de `path` y cardinalidad del
conjunto son redundantes: pertenencia a un conjunto de strings descarta otros tipos; igual longitud
de respuesta más pertenencia y unicidad impide aceptar peticiones duplicadas. Los dos mutantes de
longitud mínima del worker no aceptan un nuevo caso válido: una cadena vacía o de un carácter no
puede coincidir con la ruta canónica y contener la firma exigida por las comprobaciones posteriores.
Se mantienen estas defensas explícitas, sin exclusiones artificiales de mutación.

Los otros tres afectan inicialización del módulo: bucket vacío, prefijo vacío y guardia de objeto
que devuelve undefined. Se aplicó cada transformación real por separado al archivo local,
se ejecutó `npx vitest run apps/api/test/catalog-private-media.test.ts` en proceso independiente
y los tres devolvieron código 1. Después de cada uno se restauró el contenido original; el último
run sin mutación devolvió código 0, 38 pruebas aprobadas. Esto confirma sensibilidad de las pruebas
sin atribuir falsamente esas detecciones al ejecutor Stryker ni modificar su informe original.

## Próxima prueba y recuperación

El siguiente paso requiere rotar las claves que fueron expuestas por una consulta de diagnóstico
del CLI y configurar credenciales administradas fuera del repositorio para cerrar los E2E de
Storage/visión/WhatsApp. Alcance: Frank-Pruebas en AgenteFer, sin main, sin publicación Facebook
y sin recursos externos al proyecto. Informar que no es un despliegue certificado, verificar
copia/recuperación y registrar migración y SHA antes de operar.
No borrar tablas ni revertir migraciones con pérdida de datos. Ante fallo, detener las tools nuevas,
volver a una política auditada compatible y corregir hacia delante; conservar borradores/auditoría.

Después de cerrar este bloque: distribución pública de medios y venta al cliente, edición de
catálogo/galería, categorías jerárquicas y gestión de bajas/publicaciones son bloques separados.
No se afirma que todo el vendedor experto ni la tienda QR estén terminados por esta entrega.

## Addendum B3-006S — 2026-09-21

### Causa raíz observada

Dos runs reales del dueño resolvieron correctamente actor `member`, imagen verificada y 16 tools,
pero el proveedor devolvió texto final con `tool_round_count=0`. El runtime no tenía una puerta de
finalización determinista y persistió “cambios aplicados” sin mutación. No fue un error de identidad,
Storage, UUID ni panel: fue una afirmación cognitiva sin evidencia operativa.

### Corrección y evidencia

- Worker: una finalización owner con tools administrativas y sin historial se descarta, se reintenta
  una vez exigiendo tool calling y, si reincide, se liquida como `retry_provider` sin texto visible.
- Base: `api.complete_whatsapp_agent_turn` valida que exista una ejecución terminal del mismo run.
- Prompt: una única guía vigente para editar varios destinos, separar galería/principal y no publicar
  en Facebook implícitamente.
- Pruebas: 58/58 unitarias; mutation testing focal 25/25 (100%); Gherkin 422 escenarios; rehearsal
  remoto 99/99 con rollback; contrato estático 59 migraciones, 106/106 tablas privadas con RLS
  forzado y 1,390 aserciones pgTAP registradas.

La cobertura completa ejecutó 1,265/1,265 pruebas y superó los umbrales sin reducirlos: 90.23%
sentencias, 85.93% ramas, 93.07% funciones y 90.35% líneas. Durante ese gate se reparó una deuda
previa de readiness: el procesador admin de imágenes ahora tiene una bandera independiente con
default productivo `true`, no inicia red cuando está deshabilitado y siempre se detiene. Su cliente
RPC quedó cubierto al 100% de líneas/sentencias/funciones y 98.87% de ramas mediante HTTP efímero
local. Migración y despliegue de B3-006S siguen pendientes.
