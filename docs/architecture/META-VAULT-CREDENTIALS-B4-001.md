# AgenteFer — credenciales Meta multi-tenant en Supabase Vault

Fecha: 2026-08-13.  
Estado: infraestructura Vault aplicada y certificada; conexión Meta real pendiente.  
Migraciones: `20260813192925_b4_001_meta_vault_credentials.sql` y
`20260813203100_b4_001_constant_time_lint_hardening.sql`.

## Resultado

AgenteFer no guardará App Secrets, verify tokens ni access tokens de Meta en
Git, en columnas de catálogo, en prompts ni en variables compartidas de
EasyPanel. Cada valor se cifra en Supabase Vault y se relaciona mediante
metadata tenant-aware que nunca proyecta `vault_secret_id` al Data API.

La misma infraestructura soporta la organización de pruebas del propietario,
la organización productiva de Fer y organizaciones futuras. No contiene IDs de
App, Página, WABA, número o cuenta hardcodeados.

## Fronteras de confianza

| Componente | Puede recibir secreto en onboarding | Puede recuperar secreto | Superficie permitida |
| --- | ---: | ---: | --- |
| navegador/LLM | no | no | vistas seguras y tools autorizadas |
| API AgenteFer | sí, sólo por request autenticado y redactado | no | RPC de alta, rotación y verificación |
| worker AgenteFer | sólo cuando una tool autorizada rota credencial | no | RPC de rotación/uso futuro |
| Postgres `service_role` | invoca las RPC | privilegio interno de Supabase | firmas explícitas en `api` |
| Supabase Vault | cifra el valor | descifra dentro de SQL autorizado | `vault`, fuera del Data API |

`service_role` es un rol privilegiado administrado por Supabase y puede acceder
internamente a Vault. Por eso su key nunca llega al navegador o al LLM. La
frontera externa adicional es PostgREST: sólo expone `api` y
`graphql_public`; `vault`, `app_private` y `public` quedan fuera.

## Modelo físico

- `meta_applications`: identidad de App por organización, versión Graph y
  estado. La organización y el App ID externo son inmutables.
- `meta_webhook_endpoints`: endpoint UUID opaco por App; no contiene el verify
  token. Su verificación y suspensión tienen estado propio.
- `meta_credential_versions`: ledger append-only de tipo, versión y ciclo de
  vida. `vault_secret_id` existe sólo en la tabla privada.
- `channel_connections.meta_application_id`: impide activar un canal sin App y
  evita enlazar una App de otra organización.

Tipos versionados: `app_secret`, `webhook_verify_token`,
`system_user_access_token` y `channel_access_token`. No se reutiliza un secreto
entre organizaciones. Su nombre Vault se deriva de organización, App,
endpoint/canal, tipo y versión; el valor no forma parte del nombre.

## RPC auditadas

`register_meta_application` crea App, endpoint y las dos credenciales iniciales
en una transacción. `rotate_meta_credential` agrega una versión y mueve la
anterior a `retiring` o `revoked`. Las dos requieren `service_role`; si existe
actor humano debe ser owner/admin activo de la organización.

`verify_meta_webhook_challenge` compara el candidato con el hash del valor
descifrado dentro de PostgreSQL. `verify_meta_webhook_signature` calcula HMAC
SHA-256 sobre el `bytea` crudo y compara 32 bytes en tiempo constante. Ambas
devuelven solamente IDs de ruteo y versión, nunca el material criptográfico.

`confirm_meta_webhook_verification` activa App/endpoint sólo con evidencia de
una versión vigente. Los valores no se escriben en auditoría, errores ni
metadata segura.

## Rotación y recuperación

Una rotación crea una nueva fila y un nuevo secreto; nunca reescribe historia.
Con solapamiento positivo, la versión anterior sigue verificando hasta
`retire_after`; con cero se revoca inmediatamente. Esto permite cambiar
credenciales sin editar código, variables de EasyPanel ni redesplegar.

Si cualquier inserción, constraint o auditoría falla, la transacción revierte
también `vault.create_secret`, evitando secretos huérfanos. La eliminación
directa de historia está bloqueada.

## Data API reproducible

La migración fija `pgrst.db_schemas = 'api, graphql_public'` y recarga la
configuración de PostgREST. Mientras exista ese override, la lista se administra
por migraciones, no desde el Dashboard. Una migración futura deberá reemplazar
la lista completa y pasar el gate que prohíbe `vault`, `app_private` y `public`.

## Flujo de incorporación futuro

1. El usuario autorizado entrega los valores por una sesión TLS al API.
2. El API redacta logs y llama `register_meta_application`; no persiste el body.
3. La respuesta entrega sólo IDs y la URL construida con `endpoint_key`.
4. Meta valida el challenge contra la RPC.
5. El API confirma la evidencia; Página/WABA/número se registran como conexiones
   del mismo tenant y sus tokens se agregan por rotación.
6. B4-002 verifica firma antes de persistir el inbox.

Hoy la bóveda y sus contratos están persistidos en Supabase AgenteFer. No se
declara conectada la App de prueba ni la de Fer hasta desplegar el endpoint y
probar permisos reales.

## Evidencia obtenida

- 51 aserciones pgTAP específicas con dos organizaciones;
- regresión acumulada de 782 aserciones;
- Gherkin de aislamiento, challenge, HMAC, rotación, rollback y no-fuga;
- 11/11 mutantes SQL críticos eliminados contra PostgreSQL remoto reversible;
- 92 tablas privadas con RLS forzado, vistas seguras, lint/advisors sin
  hallazgos, Data API privada cerrada y tipos sin drift.

El CI limpio de la rama debe ejecutar además los 58 mutantes SQL acumulados. La
matriz de capacidades Meta permanece abierta y no se confunde con esta
certificación de almacenamiento de secretos.

## Fuentes oficiales

- [Supabase Vault](https://supabase.com/docs/guides/database/vault)
- [Supabase: securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Supabase: custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas)
- [Meta WhatsApp Business Platform](https://www.postman.com/meta/whatsapp-business-platform/overview)
- [Meta Messenger Platform API](https://www.postman.com/meta/messenger-platform-api/overview)
