# AgenteFer — incorporación multi-tenant de WhatsApp B4-001B

Fecha: 2026-08-20.  
Rama: `develop`.  
Proyecto de datos exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Estado: implementación y ensayo reversible completos; migración, CI, despliegue y número Meta real pendientes.

## Resultado arquitectónico

La pantalla `/admin/meta` permite conectar cualquier número de WhatsApp Cloud API a la
organización seleccionada. Frank puede mantener una organización de pruebas y Fer una
organización productiva usando el mismo código, pero con App, WABA, Phone Number ID, canal y
secreto Vault independientes. Incorporar otro negocio no requiere variables de EasyPanel, rutas
ni código específicos por cliente.

El backend no confía en que el usuario haya combinado correctamente sus activos. Antes de
persistir verifica en vivo con Meta que el token:

1. sea válido y pertenezca a la App seleccionada;
2. incluya `whatsapp_business_management` y `whatsapp_business_messaging`;
3. no esté vencido ni tenga acceso de datos vencido;
4. permita enumerar el Phone Number ID dentro de ese WABA;
5. permita suscribir la App al WABA mediante `subscribed_apps`.

`granular_scopes` no se usa como autoridad porque Meta puede variar u omitir ese metadato según el
tipo de token. La autorización efectiva del activo se demuestra contra el recurso vivo del WABA y
el número solicitado. Sólo después de esas cinco comprobaciones se invoca el registrador transaccional. Si Meta, Vault,
una constraint o la auditoría fallan, no queda una conexión parcial ni un secreto huérfano.

## Flujo y fronteras

| Paso                  | Autoridad                                    | Dato sensible                       | Resultado permitido                                          |
| --------------------- | -------------------------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| sesión y organización | Supabase Auth + RLS con JWT del usuario      | token de sesión                     | Apps y números visibles sólo para owner/admin del tenant     |
| validación externa    | API AgenteFer → Graph API HTTPS              | access token en memoria del request | identidad de App, scopes, vigencia y perfil del número       |
| suscripción           | API AgenteFer → `/{WABA-ID}/subscribed_apps` | mismo token efímero                 | confirmación booleana de Meta                                |
| persistencia          | API → RPC con `service_role`                 | token una vez                       | canal, perfil no secreto, auditoría y secreto Vault atómicos |
| lectura posterior     | vista `api.meta_whatsapp_connections` + RLS  | ninguno                             | estado, nombre, número, WABA, App y vigencia no secreta      |

El selector interno de App se obtiene mediante el JWT de la sesión y RLS. Un UUID de App de otra
organización produce cero candidatos y detiene el flujo antes de enviar una petición a Meta. El
RPC vuelve a validar owner/admin, organización, App activa y webhook verificado para que la API no
sea una autoridad única.

## Modelo de datos

`channel_connections` conserva el routing canónico:

- `organization_id` identifica al tenant;
- `meta_application_id` enlaza la App de esa misma organización;
- `external_account_id` contiene el WABA ID;
- `external_sender_id` contiene el Phone Number ID y conserva unicidad operacional global;
- `credential_reference` y `webhook_secret_reference` son referencias opacas, nunca secretos.

`app_private.meta_whatsapp_connection_profiles` conserva únicamente hechos validados por Meta:
número visible, nombre verificado, estados de calidad/nombre, tipo y scopes del token, expiración,
última validación y suscripción. Tiene RLS habilitada y forzada, política owner/admin, FK compuesta
al canal y triggers que impiden un perfil no operativo o su reasignación de tenant.

El access token se crea como una versión `channel_access_token` mediante la infraestructura B4-001
y vive exclusivamente cifrado en Supabase Vault. La vista segura no expone token,
`vault_secret_id` ni referencias internas.

## Contrato de red

- La versión Graph proviene de la App del tenant; no está fijada por la pantalla ni por EasyPanel.
- El origen oficial del proveedor es `https://graph.facebook.com` en producción.
- WABA y Phone Number ID aceptan sólo identificadores decimales acotados antes de construir URLs.
- Cada respuesta externa se limita a 64 KiB, no sigue redirects y usa timeout/cancelación.
- La enumeración usa páginas de 100, máximo 50 páginas y detección de cursor repetido.
- El código no sigue URLs `next` arbitrarias, cerrando una vía SSRF.
- Errores de Meta se reducen a clases públicas estables; body, token y diagnóstico interno no se
  registran ni se devuelven.

## Experiencia operativa

El formulario solicita App verificada, WABA ID, Phone Number ID y access token. El token se limpia
del campo inmediatamente después de iniciar `fetch`; no se usa `localStorage` ni `sessionStorage`.
Después del alta sólo se muestran nombre y número confirmados. Si la conexión fue guardada pero
falla la recarga visual, la pantalla conserva el éxito y ofrece `Actualizar estado` sin repetir la
operación.

La UI comparte el sistema oscuro premium del panel, usa controles táctiles y colapsa a una columna
en 375 px. La verificación visual real sigue siendo una puerta previa al despliegue.

## Fallo cerrado

| Condición                               | HTTP | Persistencia                     |
| --------------------------------------- | ---: | -------------------------------- |
| body, versión o identificador inválido  |  400 | ninguna                          |
| token, scopes, App o WABA no autorizado |  403 | ninguna                          |
| Phone Number ID ya conectado            |  409 | rollback completo                |
| timeout/fallo Meta o Vault              |  503 | ninguna o rollback completo      |
| App ajena o no verificada               |  403 | ninguna petición Meta o rollback |

## Fuentes oficiales

- [Meta WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Meta WhatsApp Cloud API](https://www.postman.com/meta/whatsapp-business-platform/documentation/wlk6lh4/whatsapp-cloud-api)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Data API security](https://supabase.com/docs/guides/api/securing-your-api)
