# Facebook Login for Business — QA y operación

Fecha: 2026-09-06. Repositorio `frankzuuia/agentefer`, rama `develop`.
Destino Supabase: `AgenteFer` / `hprdctmblmfcoagugvyp`.
Destino API: EasyPanel `agente-fer/api`, Dockerfile `apps/api/Dockerfile`.

## Cambio y límites

El catálogo inicia OAuth con el `config_id` empresarial registrado por el dueño. El estado
de un solo uso vincula organización, dueño y configuración. El backend intercambia el código,
consulta las páginas asignadas y conserva el token empresarial en Vault. La selección de página
devuelve únicamente nombre, ID y tareas. El worker utiliza la referencia de credencial existente.

El RPC de configuración es exclusivo de backend y verifica al dueño de la organización.
El ID de configuración no es secreto; su lectura sigue las políticas RLS existentes de Meta.
Crear una configuración en Meta no conecta automáticamente una página: el dueño debe completar
el consentimiento y seleccionar el activo en el diálogo oficial. No se publica contenido como
parte de este procedimiento. La prueba con Meta real y el despliegue se registran por separado.

## Evidencia ejecutada

- Formato, lint, typecheck, contratos y build: verdes.
- Suite completa: 1,022 pruebas; statements 92.20%, branches 87.14%, funciones 94.82%, líneas 92.27%.
  Son los umbrales actuales del repositorio (90/85/90/90); no se modificaron para este bloque.
- pgTAP enlazado: 1,266/1,266 aserciones en 26 archivos, con rollback de los datos de prueba.
- Ensayo B4-008 antes de aplicación: 23/23; mutación SQL previa: 7/7 detectados con rollback.
- Ensayo B4-008A con el contrato global de autorización: 82/82 con rollback.
- Auditoría npm completa y productiva: cero vulnerabilidades reportadas.
- Mutación TypeScript: 99.05%, 209 detectados, dos supervivientes redundantes y cero sin cobertura.
  Reporte: `reports/mutation/b4-007-facebook-oauth.json`; umbral bloqueante 90%.
  El perfil incluye OAuth y el endpoint administrativo nuevo. Los dos supervivientes mantienen
  el comportamiento: la gramática de versión ya exige longitud mínima y el parser rechaza
  respuestas vacías para los otros RPC aunque se suprima la condición específica de HTTP 204.
- Meta real: configuración `AgenteFer Páginas`, ID `1082476261141815`, creada en Frkleads.
  Permisos: `business_management`, `pages_manage_posts`, `pages_read_engagement`, `pages_show_list`.
  La app continúa sin publicar; el acceso estándar requiere un rol en la app para las pruebas.

El ejecutor nuevo de mutación verifica el enlace exacto a AgenteFer y no consulta inventarios
globales de proyectos. Su SQL de ensayo conserva rollback por cada mutante.

Los ensayos SQL detectaron el nombre incorrecto de una columna en una aserción y la falta del
grant requerido por una vista security-invoker. Se corrigió la aserción con `evidence_summary` y
se agregó el grant específico mediante la migración forward-only B4-008A. Las pruebas globales
también revisan las 103 tablas y las dos tablas OAuth con acceso denegado por defecto.

## Reproducción

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run test:mutation:b4-007-facebook-oauth
npm run verify:acceptance-contract
npm run verify:database-contract
npm run test:database:linked
npm run build
npm run audit
```

Los comandos de ensayo y mutación de B4-008 son para la base anterior a esa migración;
no se debe repetir su DDL sobre una base donde ya esté aplicada ni contar errores de DDL como
mutantes detectados. Las pruebas pgTAP normales sí se ejecutan después de aplicar la migración.

## Verificación real y recuperación

1. Confirmar que la app Meta es Frkleads, ID `2164093000827023`, y que el callback HTTPS coincide.
2. Registrar el ID de configuración en la aplicación de la organización mediante el RPC auditado.
3. Iniciar sesión como dueño en `/admin/catalog` y completar Conectar Facebook.
4. Confirmar página seleccionada, aislamiento y ausencia de secretos en respuestas al navegador.
5. Validar `/health/live` y `/health/ready` después del despliegue de `agente-fer/api`.

### Resultado real del despliegue

- Código `ab23aa3c050ecef859f8d685be3b335b7d2525c3` en `develop` y desplegado en `agente-fer/api`.
- EasyPanel confirma ese SHA y la acción `cmtqiqs2g00h907ri6n61eqfx` terminada el 7 de septiembre
  de 2026 a las 00:46 UTC (6 de septiembre en Ciudad de México). No se desplegó el worker.
- ID de configuración registrado por RPC auditado únicamente para `Frank - Pruebas` y Frkleads.
- Meta confirma como válida la URI `https://agentefer.frkqr.com/admin/catalog/facebook/callback`.
- HTTPS: `/health/live`, `/health/ready`, catálogo y callback devuelven HTTP 200.
- Configuración con cuerpo válido pero sin sesión devuelve HTTP 401; cuerpo inválido HTTP 400.
- Callback: `no-store`, CSP restrictiva, `no-referrer` y `nosniff` verificados en respuesta real.
- Escaneo de patrones de secretos sobre el diff del bloque: cero coincidencias; no sustituye
  un análisis especializado ni es evidencia de inexistencia absoluta de secretos.
- La suite CI completa permanece pendiente de terminación; la conexión E2E necesita que el dueño
  inicie sesión en la pestaña y complete el consentimiento. No hay publicaciones de prueba creadas.

Si el consentimiento falla, no se activa ninguna página; la sesión expira y el usuario puede
iniciar otra. No se revierten migraciones aplicadas ni se eliminan credenciales existentes para
resolver fallos. No se atribuye disponibilidad de publicación a un token sin probarlo con Meta.
