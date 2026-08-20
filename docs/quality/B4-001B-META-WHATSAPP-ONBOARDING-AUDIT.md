# AgenteFer — auditoría de incorporación WhatsApp B4-001B

Estado: **PERSISTED AND VERIFIED — DEPLOYMENT AND LIVE META NUMBER PENDING**.  
Fecha: 2026-08-20.  
Proyecto objetivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Riesgos cubiertos

- App, WABA, número o token cruzado entre organizaciones;
- token inválido, vencido, sin permisos o perteneciente a otra App;
- Phone Number ID ajeno al WABA indicado;
- paginación infinita, redirect externo, respuesta sobredimensionada o timeout de Meta;
- secreto expuesto en Data API, logs, respuesta o almacenamiento persistente del navegador;
- alta parcial entre canal, perfil, auditoría y Vault;
- invocación del RPC con secreto por `authenticated`;
- duplicación del canal al reintentar después de un fallo sólo visual;
- perfil reasignado a otra organización o conexión.

## Procedimiento QA reproducible

Desde `C:\Users\figod\Desktop\agentefer`, exclusivamente en `develop`:

```powershell
git branch --show-current
git remote -v
Get-Content .\supabase\.temp\project-ref
npm run format:check
npm run lint
npm run typecheck
npm run verify:acceptance-contract
npm run test:coverage
npm run test:mutation
npm run test:database:linked:rehearsal
npm run test:database:linked:pending-mutations
npm run test:database:linked
npm run database:types:linked
npx --yes supabase@2.111.0 db lint --linked --schema app_private,api --level warning --fail-on error
npm run build
npm run audit
```

Los comandos linked deben abortar si el enlace no es exactamente
`hprdctmblmfcoagugvyp` (`AgenteFer`). Los ensayos y mutantes previos a la aplicación operan dentro
de transacciones que terminan en `ROLLBACK`.

## Evidencia obtenida antes de persistir

- 20 escenarios Gherkin del bloque y 246 escenarios acumulados, sin errores de parseo;
- 445/445 pruebas TypeScript acumuladas en 22 archivos;
- 106/106 pruebas dirigidas del gateway Supabase y las rutas administrativas;
- 79/79 pruebas del gateway Graph y 19/19 pruebas de recepción webhook contra servidores TCP
  reales de contrato;
- 36/36 aserciones pgTAP de migración ejecutadas remotamente y revertidas;
- 6/6 mutantes SQL críticos eliminados, 100%, cada uno con rollback;
- cobertura acumulada: 97.05% statements, 94.73% branches, 96.25% functions y 97.15%
  lines;
- rutas administrativas y webhook: 100% lines; gateway Graph: 100% lines;
- mutation score TypeScript integral: 95.32%, con 1,998 mutantes eliminados, 94
  sobrevivientes, 4 sin cobertura y cero errores del runner;
- mutation score individual: gateway Supabase 92.73%, rutas administrativas 97.17%, gateway
  Graph 95.53%, rutas webhook 93.44% y RPC webhook 94.92%;
- `format:check`, `lint`, `typecheck`, contratos de workspaces, CI, documentación, aceptación,
  contenedores, base de datos y dependencias verdes;
- build completo verde; API y worker arrancaron correctamente en puertos TCP efímeros;
- `npm audit` completo y de producción: cero vulnerabilidades;
- búsqueda del diff sin literales de credenciales nuevos.

## Evidencia posterior a persistir

- B4-001B y su corrección incremental B4-001C constan en el historial remoto; el `dry-run`
  posterior devolvió `upToDate: true` y cero migraciones pendientes;
- B4-001C restringe `authenticated` a las doce columnas requeridas por la vista y conserva
  `created_at` y `updated_at` fuera de esa concesión;
- ensayo remoto de B4-001C: 3/3 aserciones, con rollback;
- mutation testing SQL de B4-001C: 4/4 mutantes eliminados, 100%, con rollback por mutante;
- suite remota completa: 869/869 aserciones pgTAP en 13 archivos;
- el primer recorrido completo detectó cuatro conteos de fixtures no herméticos en B4-001 y
  B4-002 al coexistir la aplicación real registrada. Se limitaron a sus organizaciones Alpha/Beta
  y la regresión quedó cubierta por contratos estáticos y la repetición verde de la suite completa;
- tipos TypeScript regenerados desde el esquema remoto con la vista, tabla privada y RPC de
  WhatsApp presentes;
- `db lint` remoto sobre `app_private,api`: cero errores;
- `npm run verify` posterior a la sincronización: formato, lint, tipos, 445/445 pruebas, cobertura,
  mutation score 95.32%, build, arranque real de API/worker y auditorías completa/producción con
  cero vulnerabilidades.

CI remota y la prueba visual se anotan después de concluir esas corridas; este documento no los
declara verdes por anticipado.

## Matriz mínima de validación manual

1. Iniciar sesión en `/admin/meta` y seleccionar la organización de Frank.
2. Confirmar que sólo aparecen Apps activas de Frank y que la conexión de Fer no aparece.
3. Introducir WABA ID, Phone Number ID y un system user access token real con ambos permisos.
4. Confirmar nombre/número devueltos por Meta y una sola fila activa en la lista.
5. Recargar: ningún token debe reaparecer; la conexión sí debe aparecer mediante RLS.
6. Repetir el mismo flujo en la organización de Fer con activos distintos; Frank debe permanecer
   intacto.
7. En 375x812, 768x1024, 1024x768 y 1440x900 comprobar cero overflow horizontal, foco visible,
   controles de al menos 44 px y contraste WCAG AA.
8. Enviar un mensaje real al número de prueba y comprobar webhook, delivery idempotente y routing
   hacia la conexión correcta antes de habilitar respuesta automática.

## Métricas y SLO

- cobertura: mínimo 90% en lines, branches, functions y statements; rutas críticas sin huecos;
- mutation score TypeScript: mínimo 90%; SQL de este bloque: 100%;
- cero secretos en URL pública, respuesta, logs, auditoría, métricas, HTML persistido o storage web;
- alta: una conexión y una versión Vault o ninguna;
- listado administrativo p95 menor a 500 ms sin latencia de Meta;
- onboarding externo observado por operación, resultado, duración y categoría de error;
- HTTP 5xx administrativo menor a 1% en ventanas de 15 minutos.

## Puertas aún pendientes

- commit/push en `develop`, CI verde y despliegue sólo de `agente-fer/api`;
- prueba responsive del artefacto desplegado;
- conectar el número real de Frank y validar un mensaje entrante firmado.

No se declara listo para operar conversaciones hasta cerrar estas puertas.
