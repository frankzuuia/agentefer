# AgenteFer — auditoría B4-003A entrada WhatsApp

Fecha: 2026-08-26.  
Estado: **CALIDAD LOCAL CERTIFICADA — MIGRACIÓN, DEPLOY Y E2E REAL PENDIENTES**.  
Proyecto exclusivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance certificado

- Un delivery WhatsApp ya autenticado por B4-002 se reclama mediante lease durable.
- PostgreSQL enruta el wrapper sin exponer el payload crudo al worker.
- App, WABA y Phone Number ID se resuelven juntos dentro de la organización autenticada.
- Cada `whatsapp.message` se deduplica y se normaliza como contacto, identidad, conversación,
  participante y mensaje inbound.
- `whatsapp.status` permanece separado para B4-004.
- El worker sólo transporta contratos tipados, controla leases/reintentos y emite telemetría; no
  decide intención, producto, respuesta ni herramienta.
- Tipos futuros se preservan como `unsupported`; texto hostil no cambia principal ni permisos.

## Seguridad verificada

- Las seis RPC nuevas son backend-only y sólo ejecutables por `service_role`.
- El claim no devuelve body, texto, número, WABA, Phone Number ID ni metadatos del cliente.
- Las tablas privadas existentes conservan RLS habilitada y forzada; no se creó superficie `anon`.
- Fallos persistidos usan códigos seguros, backoff acotado y máximo de intentos; no almacenan
  excepciones del proveedor.
- Logs Pino y métricas OpenTelemetry contienen únicamente atributos operativos sanitizados.
- La detención cancela HTTP y polling, elimina listeners y no ejecuta un ciclo posterior al stop.
- La configuración sigue siendo dinámica por entorno; no contiene organización, App, número o
  credencial de Frank/Fer hardcodeados.

## Evidencia de base de datos sin persistencia

- Migración pendiente:
  `20260825094500_b4_003a_meta_whatsapp_inbound.sql`.
- SHA-256 migración:
  `EA097AFF461619A5237422803F074422F20695B816BDE674B4FAFE29D0244443`.
- SHA-256 pgTAP:
  `37F581A13F4773F18DB7096618A1AA59E26FC4064AA2BD8957A3A532A56A8921`.
- Ensayo enlazado migración + pgTAP dentro de una sola transacción: **77/77** y `ROLLBACK`.
- Mutation testing SQL: **11/11 mutantes críticos eliminados**, cada uno dentro de rollback.
- Contrato estático: 19 migraciones ordenadas, 94 tablas con RLS forzada y 946 aserciones pgTAP.
- La versión `20260825094500` no se aplicó al historial remoto durante este bloque.

## Evidencia TypeScript y aceptación

- Vitest global: **565/565** pruebas en 24 archivos.
- Cobertura global: 97.27% statements, 94.38% ramas, 96.59% funciones y 97.35% líneas.
- Procesador B4-003A: 100% statements/líneas/funciones y 94.73% ramas.
- Mutation dirigida RPC: **94.17%**, 388/412 mutantes eliminados, 24 supervivientes y cero rutas
  sin cobertura.
- Mutation dirigida procesador: **97.31%**, 178 eliminados, 3 timeouts, 3 supervivientes y 2 sin
  cobertura; supera el umbral obligatorio de 90%.
- Mutation global: **94.41%** sobre 2,701 mutantes; 2,547 eliminados, 3 timeouts, 144
  supervivientes, 7 sin cobertura y 0 errores. El worker acumuló 95.15%.
- Aceptación: 16 escenarios B4-003A y 265 escenarios acumulados, sin errores de parseo.
- Format, ESLint type-aware, TypeScript strict, build completo, procesos API/worker en TCP real,
  contratos de workspace/contenedor/dependencias y `npm audit`: verdes; 0 vulnerabilidades.

## Autopsias y regresiones incorporadas

1. El polling conservaba listeners de `abort` y podía despertar después del shutdown. La espera
   ahora devuelve un resultado explícito, limpia timer/listener y el bucle no ejecuta otro ciclo.
2. Los nombres `message_id`, `content_kind` y `message_count` eran redacted por la política central.
   Se sustituyeron por atributos operativos seguros sin relajar la protección de PII/contenido.
3. Los gates de procesos y del contenedor OCI intentaban usar una dependencia Supabase inexistente
   porque el nuevo loop se habilita por defecto. Todo proceso efímero de QA ahora declara
   `WORKER_META_INBOUND_ENABLED=false`, y el contrato de contenedor impide retirar esa protección;
   EasyPanel conserva el default productivo habilitado.
4. Las primeras pruebas de mutación no observaban exactamente RPCs, métricas, logs, cancelación ni
   clasificación de fallos. Se ampliaron sobre TCP, Pino y OpenTelemetry reales hasta superar 90%.

## Pendientes que impiden declarar B4-003 completo

- aplicar la migración pendiente a Supabase AgenteFer y regenerar tipos desde ese remoto;
- desplegar el worker final en `agente-fer/worker` y verificar readiness con el loop habilitado;
- enviar un mensaje WhatsApp real y comprobar Meta → delivery → worker → mensaje normalizado;
- implementar/certificar Messenger como B4-003B con una Page y permisos reales;
- ejecutar CI remoto después de commit/push autorizados.

No se hizo commit, push, migración remota ni despliegue. B4-003 permanece `[ ]`.
