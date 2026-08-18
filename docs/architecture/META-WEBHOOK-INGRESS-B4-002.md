# AgenteFer — ingreso autenticado de webhooks Meta B4-002

Fecha: 2026-08-18.  
Rama: `develop`.  
Proyecto de datos exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Estado: implementación y ensayo transaccional completos; despliegue HTTPS y evento Meta real pendientes.

## Frontera multi-tenant

La URL pública es `GET|POST /webhooks/meta/:endpointKey`. `endpointKey` es un
UUID opaco asignado a una Meta App, no contiene organización, Página, WABA,
número ni secreto. La organización se resuelve dentro de PostgreSQL mediante
relaciones compuestas; el cliente HTTP no puede elegirla.

Cada organización registra y rota sus propias credenciales mediante B4-001.
Tu cuenta de staging y Fer son filas independientes con App, endpoint, canales,
versiones y referencias Vault distintas. Incorporar otra organización no exige
cambiar código, rutas ni variables de EasyPanel.

## Challenge

1. La API valida forma y límites de `hub.mode`, `hub.verify_token` y
   `hub.challenge`.
2. Envía el token sólo a `api.accept_meta_webhook_challenge` usando la secret
   key exclusiva del API y el schema `api`.
3. PostgreSQL compara el candidato con Vault, confirma el endpoint de forma
   atómica y devuelve exclusivamente identificadores no secretos.
4. La API responde los bytes exactos del challenge como `text/plain`, con
   `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`.

## Entrega firmada

1. Fastify conserva el cuerpo `application/json` como `Buffer`; nadie
   reserializa el JSON antes de verificarlo.
2. La API exige `X-Hub-Signature-256: sha256=<64 hex>` y manda body base64,
   firma y correlación a `api.ingest_meta_webhook_delivery`.
3. SQL decodifica con límites, verifica HMAC-SHA256 contra la versión Vault
   activa/retirable y sólo después interpreta JSON.
4. La evidencia se guarda en `app_private.meta_webhook_deliveries`, sin vista
   Data API ni DML directo para `service_role`.
5. La unicidad `(webhook_endpoint_id, payload_sha256)` convierte una repetición
   exacta en replay: incrementa contadores y correlación reciente sin crear
   trabajo duplicado ni reescribir la primera evidencia.
6. La API devuelve `EVENT_RECEIVED` sólo después del commit durable.

La bandeja se ubica a nivel App/endpoint porque un payload autenticado puede
contener varias entradas o canales. B4-003 normalizará cada entrada hacia el
`inbound_events` de su conexión; el webhook no espera al LLM.

## Fallo cerrado

| Condición | HTTP | Respuesta pública | Efecto |
| --- | ---: | --- | --- |
| query/body/contrato inválido | 400 | `{"status":"invalid"}` | no persiste |
| firma ausente o inválida | 401/403 | `{"status":"rejected"}` | no persiste |
| endpoint opaco inválido/no autorizado | 404 | `{"status":"rejected"}` | no revela existencia |
| body mayor al límite | 413 | `{"status":"invalid"}` | RPC no invocada |
| MIME no permitido | 415 | `{"status":"invalid"}` | RPC no invocada |
| timeout/dependencia | 503 | `{"status":"unavailable"}` + `Retry-After: 1` | Meta puede reintentar |
| error no clasificado | 500 | `{"status":"failed"}` | diagnóstico sólo estructurado |

Logs y métricas contienen correlación, resultado y UUIDs operativos; el
redactor oculta identificadores de credencial y nunca registra body, firma,
verify token, secret key ni diagnóstico interno de PostgREST.

## Configuración desplegable

- `SUPABASE_URL`, `SUPABASE_PROJECT_REF` y `SUPABASE_SECRET_KEY` pertenecen al
  servicio API de AgenteFer.
- `META_WEBHOOK_RPC_TIMEOUT_MS` controla el timeout, máximo 4 segundos.
- `META_WEBHOOK_MAX_BODY_BYTES` controla parser y ruta, máximo 1 MiB.
- App Secret, verify token y tokens de acceso no son env vars: cada versión vive
  en Supabase Vault asociada a su organización.

Por ello cambiar de tu cuenta de prueba a Fer es aprovisionamiento de datos y
Vault, no un redeploy con valores hardcodeados.

## Evidencia exigida antes de declarar B4-002 completo

- pruebas unitarias/protocolo y TCP de API;
- cobertura y mutation testing TypeScript;
- 48 pgTAP propios, replay/concurrencia, aislamiento y rotación;
- 12 mutantes SQL B4-002 eliminados dentro de rollback;
- migración y tipos remotos alineados exclusivamente en AgenteFer;
- HTTPS público estable y challenge/evento real de una App Meta staging.

El último punto depende del despliegue `agente-fer` y de las credenciales Meta;
por eso el bloque no se marca completo todavía.
