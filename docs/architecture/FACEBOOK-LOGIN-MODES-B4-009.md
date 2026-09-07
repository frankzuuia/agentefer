# B4-009 — Acceso a páginas propias y de negocios clientes

## Causa y alcance

El flujo BISU de B4-008 exige un portfolio cliente distinto del propietario de la app.
La prueba real mostró `This Meta Business Account owns the app` para Frkleads. El backend
solo interpreta `assigned_pages` y un token empresarial: cambiar únicamente Meta no basta.

Se extienden BL-015, BL-020, BL-021 y BL-025. Actor: dueño autenticado. Solo se activará el modo
de páginas propias para Frank - Pruebas. Ningún ID de negocio o página se introduce en código.
No se crea otro negocio, usuario humano, producto ni publicación.

## Referencias oficiales revisadas en el navegador

- https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business
  BISU requiere portfolio cliente independiente del propietario de la app. Se admiten varias
  configuraciones. El modo debe ser explícito, no un fallback por error.
- https://developers.facebook.com/documentation/facebook-login/guides/access-tokens/get-long-lived
  Código → token de usuario → `fb_exchange_token` en servidor → `me/accounts` para credenciales
  de Página. Siguen siendo revocables; no se promete renovación silenciosa si Meta exige consentimiento.

## Contratos y flujo

1. La app guarda `facebook_login_mode`: `business_integration_system_user` o `user_page`, junto
   con configuration_id. Las configuraciones existentes conservan el modo empresarial.
2. RPC auditado y exclusivo del dueño: guarda ID y modo atómicamente. El RPC anterior permanece
   como wrapper empresarial compatible. Backend valida el modo; navegador no lo decide al canjear.
3. `begin_facebook_page_oauth` toma una instantánea de ID y modo. `claim` entrega el modo de la
   sesión original, no el que tenga la app en ese momento.
4. BISU mantiene su intercambio y `assigned_pages`. `user_page` intercambia el token de usuario
   en servidor y consulta `me/accounts` con credenciales individuales por Página. No se sigue
   ninguna URL de paginación del proveedor; una respuesta parcial se rechaza antes de guardar
   secretos, dentro del límite técnico existente de 100 páginas.
5. Navegador: solo ID, nombre y tareas. Vault: paquete efímero de credenciales. SQL valida tipo,
   unicidad y correspondencia exacta entre candidatos y tokens. Solo persiste el token seleccionado.
6. Worker: conserva `facebook-page-credential://`, aislamiento y manejo de errores. No necesita
   el token personal del dueño ni cambios de código.

## Matriz de escenarios

| ID | Caso | Resultado y evidencia |
| --- | --- | --- |
| M01 | Dueño configura páginas propias | ID/modo atómicos; auditoría sin secretos |
| M02 | No dueño/otra organización | Rechazo sin modificar la app |
| M03 | Configuración cambia durante OAuth | Intercambio con modo original |
| M04 | Respuesta BISU | Un intercambio y regresión de assigned_pages |
| M05 | Respuesta de usuario | Dos intercambios; persiste solo token de Página |
| M06 | Modo ausente/desconocido/incompatible | Error cerrado sin fallback |
| M07 | JSON nulo/duplicados/token extra/candidato faltante | Error antes de Vault |
| M08 | Página sin tarea de contenido | No seleccionable/publicable |
| M09 | Expiración/cancelación/replay/lease inválido o nulo | Sin activación ni duplicación |
| M10 | Error Meta/timeout/paginación parcial | Fallo recuperable con nueva autorización |
| M11 | Selección fuera de sesión/organización | Rechazo sin leer otro token |
| M12 | Callback/navegador/logs | Sin secretos; CSP/no-store/no-referrer conservados |
| M13 | Configuración existente | Continúa BISU sin cambios globales |
| M14 | Dueño de la app completa prueba real | Conecta su Página sin otro portfolio |

## Puertas y recuperación

Migración forward-only; helpers privados sin ejecución pública; RLS intacta salvo lectura de la
columna no secreta mediante la vista existente. Ensayo pgTAP con rollback antes de aplicar,
contratos HTTP, Gherkin, cobertura medida, mutación TypeScript/SQL, lint/typecheck/build y auditoría.
Consultas remotas a la referencia exacta de AgenteFer; sin inventarios globales.
E2E tras desplegar y configurar Meta, con consentimiento del dueño. No se certifican posts reales.
Ante fallo no se cambia de modo silenciosamente, no se borran credenciales previas ni se toca otra empresa.

## Auditoría previa

MATCH PERFECT M01–M14: configuración, transporte, aislamiento, recuperación y compatibilidad.
GREEN LIGHT para implementación; certificación operativa pendiente de puertas y consentimiento real.
