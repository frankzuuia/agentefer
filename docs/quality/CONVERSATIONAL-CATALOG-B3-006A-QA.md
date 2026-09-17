# B3-006A — evidencia y límites, 2026-09-07

## Estado

Implementación de alta conversacional versionada en AgenteFer/develop. No aplicada ni desplegada.
Supabase autorizado: `hprdctmblmfcoagugvyp`. Todos los ensayos SQL terminan en rollback.
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
| `test:coverage` | 1,122 pruebas, 45 archivos, cero fallos | Regresión local; no equivale a E2E externo |
| Cobertura global | líneas 91.97%, sentencias 91.89%, ramas 87.08%, funciones 94.48% | Umbrales existentes 90/90/85/90 |
| `catalog-private-media.ts` | 100% líneas, sentencias, ramas y funciones | Validador puro: 38 pruebas |
| `media-storage.ts` | 98.78% líneas, 97.79% ramas | 23 nuevas pruebas puras; regresión de transporte existente |
| `admin-catalog-gateway.ts` | 79.13% líneas, 67.29% ramas | Firma por lote 708–747 SIN cobertura de transporte real: gate abierto |
| pgTAP nuevo | 88 aserciones, cero fallos | Contratos, SKUs automáticos, confirmación posterior, stock/combo, rechazos y permisos |
| Regresión PostgreSQL | 1,397 aserciones, 28 suites, cero fallos | Migración candidata más todas las pruebas SQL, rollback |
| Mutación SQL | 6/6 detectadas | Misma confirmación, revisión, replay, Base64, dueño, composición |
| Mutación TS dirigida | 172/179 detectadas, 96.09% | API 95.61%; worker 96.92%; umbral 90, sin excluir supervivientes |
| Contraprueba estática directa | 3/3 cambios incorrectos detectados | Proceso Vitest independiente por cambio; restauración y 38/38 pruebas verdes |
| Gherkin | 20 archivos, 392 escenarios compilados | Sintaxis/contratos, NO ejecución E2E de todos los escenarios |
| Dependencias | cero vulnerabilidades en `npm audit`, total y producción | Sin cambios de dependencias |
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

- Aplicación controlada únicamente en pruebas, tipos regenerados desde el esquema aplicado,
  CI completo y validación posterior. La comprobación estática actual conserva contratos públicos;
  los tipos privados generados todavía corresponden al esquema anterior.
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

Requiere autorización explícita de excepción limitada para instalar la candidata en el entorno
de pruebas y cerrar los E2E que necesitan código aplicado. Alcance: Frank-Pruebas en AgenteFer,
sin main, sin publicación Facebook y sin recursos externos al proyecto. Informar que no es un
despliegue certificado, verificar copia/recuperación y registrar migración y SHA antes de operar.
No borrar tablas ni revertir migraciones con pérdida de datos. Ante fallo, detener las tools nuevas,
volver a una política auditada compatible y corregir hacia delante; conservar borradores/auditoría.

Después de cerrar este bloque: distribución pública de medios y venta al cliente, edición de
catálogo/galería, categorías jerárquicas y gestión de bajas/publicaciones son bloques separados.
No se afirma que todo el vendedor experto ni la tienda QR estén terminados por esta entrega.
