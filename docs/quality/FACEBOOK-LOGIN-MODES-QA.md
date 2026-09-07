# B4-009 — Facebook propio y empresarial: evidencia del cambio

Repositorio: `frankzuuia/agentefer`, rama `develop`. Base enlazada autorizada:
`hprdctmblmfcoagugvyp`. Único servicio previsto: EasyPanel `agente-fer/api`.
Este informe no certifica el E2E general del agente ni la publicación real en Facebook.

## Diagnóstico y corrección

Meta impedía elegir el portfolio propietario de la app dentro del flujo BISU. La solución
añade un modo explícito `user_page`, separado del empresarial y elegido por organización.
El backend intercambia la credencial personal únicamente en servidor, obtiene tokens de Página
y persiste solo el de la página seleccionada. No hay fallback entre modos ni selección automática.
La sesión conserva una instantánea de modo y configuración aunque cambie la app durante OAuth.

La revisión detectó además que `<>` no rechazaba un lease SQL nulo. La comparación se sustituyó
por `IS DISTINCT FROM`; la prueba de regresión y su mutante demuestran el rechazo. Las pruebas
negativas revierten también cualquier escritura que un mutante permita indebidamente.

Trazabilidad: matriz M01–M14 en
[especificación](../architecture/FACEBOOK-LOGIN-MODES-B4-009.md) y 13 escenarios en
`features/b4_009_facebook_login_modes.feature`.

## Evidencia ejecutada

- Formato, lint, typecheck, contratos de documentación/aceptación/base/contenedores/dependencias,
  build y arranque/parada real de procesos API y worker: sin errores.
- Suite TypeScript: **1,061/1,061 pruebas**, 43 archivos.
- Cobertura total: statements **92.30%**, branches **87.32%**, funciones **94.83%**, líneas **92.33%**.
  Umbrales existentes 90/85/90/90 sin reducirlos. Parser de modos: 100% en las cuatro métricas;
  adaptador Graph: 98.49% líneas y 92.45% ramas. Las rutas de selección, aislamiento y rechazo se
  verifican además con contratos HTTP y PostgreSQL real, no solo con un promedio de cobertura.
- Mutación focal TypeScript: **99.22%**, 256 detectados, 2 supervivientes redundantes,
  cero sin cobertura y cero errores. Los supervivientes son las guardas históricas redundantes
  de longitud de versión y respuesta vacía; no afectan selección de modo ni credenciales.
- Ensayo previo de la migración: **43+28+23+82** aserciones con rollback y cero fallos.
- Mutación SQL previa: **9/9** detectados con ejecución SQL válida y rollback. Incluye lease
  nulo, pérdida de modo/instantánea, token de otra página, modo incompatible, token nulo,
  campos extra, credencial ajena y eliminación del paquete efímero.
- Migración `20260907110000_b4_009_facebook_login_modes.sql` aplicada mediante CLI enlazada,
  después de comprobar que era la única pendiente. No se modificó la configuración de otra app.
- Regresión PostgreSQL posterior: **1,309/1,309** aserciones en **27** archivos, cero fallos,
  datos transaccionales de pruebas revertidos. Tipos TypeScript regenerados desde la base real.
- Lint de `app_private,api`: cero errores. Auditoría npm completa y productiva: cero vulnerabilidades.
- Complejidad ciclomática medida con ESLint: parser de modo 3; intercambio/listado Graph 23.
  No es una reducción de umbrales ni una medición de latencia productiva.
- Escaneo del diff añadido contra patrones conocidos de claves privadas y tokens: cero coincidencias.
  Es una comprobación acotada, no una garantía absoluta de ausencia de secretos.
- El generador de tipos y los ensayos validan la referencia exacta de AgenteFer; no enumeran
  proyectos de la cuenta. No se guardaron credenciales reales en código, fixtures ni reportes.

Los contratos HTTP usan servidores TCP locales y respuestas de prueba controladas; no equivalen
a consentimiento real de Meta. Los datos pgTAP son fixtures transaccionales, nunca productos o
cuentas reales creados para aparentar el E2E. No se realizó ninguna publicación externa.

## Seguridad pendiente y límites de certificación

El advisor remoto devuelve un aviso `auth_leaked_password_protection`: la comprobación de
contraseñas filtradas está desactivada en Supabase Auth. No fue habilitada ni modificada por
este bloque y no se presenta el advisor como verde. Requiere una decisión separada sobre la
política de autenticación; no se declara producción íntegramente certificada.

El CI anterior, `34070992290` para `380666b`, terminó correctamente. No certifica este diff:
el nuevo CI, despliegue, consentimiento del dueño y acceso real a la Página se verifican por separado.
No hay evidencia de latencia E2E de OAuth ni de publicación con Meta hasta completar esa autorización.

## Meta y activación controlada

En la app Frkleads `2164093000827023` existen ambas configuraciones:

- `AgenteFer Páginas` / `1082476261141815`: empresarial, conservada intacta.
- `AgenteFer Pruebas Propias` / `28333701236299503`: usuario, con `pages_show_list`,
  `pages_read_engagement`, `pages_manage_posts`; sin permisos de WhatsApp ni business_management.

Se comprobó que la organización `Frank - Pruebas` y su dueño corresponden a la app de pruebas.
El registro del nuevo ID/modo debe hacerse mediante `api.configure_facebook_login` únicamente
después de desplegar la API compatible. La sesión anterior debe abandonarse y comenzar otra
desde **Conectar Facebook**. Fer utilizará su propio consentimiento cuando se configure producción.

### Resultado operativo registrado

- Código `db389bd919314aba851af5fbd6cfaaede863768b` subido a `develop`; `main` sin cambios.
- EasyPanel confirma ese SHA en `agente-fer/api`, acción `cmtql5npw00hl07ricu3t4j2d` terminada
  el 7 de septiembre de 2026 a las 01:53:25 UTC (6 de septiembre en Ciudad de México).
- Health live/ready, catálogo y callback: HTTP 200. Muestreo simple de cliente: 786/698/182/182 ms,
  respectivamente; no representa percentiles, carga ni un SLO del proveedor.
- Catálogo/callback conservan `no-store` y `no-referrer`. Worker no desplegado.
- RPC auditado ejecutado después del deploy: `Frank - Pruebas` tiene `user_page` y el ID
  `28333701236299503`; verificación de auditoría positiva. Ninguna otra organización configurada.
- Pestaña del catálogo abierta en Chrome, detenida en inicio de sesión privado del dueño.
  No se completó consentimiento, selección de página ni publicación; E2E Meta sigue pendiente.
- CI del código: https://github.com/frankzuuia/agentefer/actions/runs/34074397824,
  en ejecución al registrar esta evidencia. No se presenta como aprobado.

## Reproducción y recuperación

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:mutation:b4-007-facebook-oauth
npm run test:database:linked:b4-009 -- after
npm run verify:acceptance-contract
npm run verify:database-contract
npm run build
npm run verify:process-runtime
npm run audit
```

Los modos `rehearsal` y `mutations` del ejecutor son exclusivamente previos a la migración:
verifican historial y rechazan volver a aplicar DDL sobre una base ya migrada. Para repetirlos
se necesita una base de ensayo de AgenteFer autorizada con el historial anterior; nunca se
revierte la base real. Ante error de OAuth se inicia nuevo consentimiento, no se cambia de modo
automáticamente ni se borran conexiones previas. `main`, otros proyectos y el worker no se despliegan.
