# AgenteFer — auditoría de diseño del webhook Meta B4-002

Estado: **INGRESS INFRASTRUCTURE CERTIFIED — REAL META EVENT PENDING**.  
Fecha: 2026-08-18.  
Proyecto objetivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance certificado

- `GET|POST /webhooks/meta/:endpointKey` con UUID opaco y sin tenant elegido
  por el request.
- challenge atómico contra verify token cifrado en Vault.
- HMAC-SHA256 calculado sobre los bytes exactos recibidos antes de interpretar
  JSON.
- inbox privado a nivel App/endpoint, sin vista Data API ni DML directo.
- idempotencia por endpoint + SHA-256, replay contabilizado y evidencia inicial
  inmutable incluso después de rotar App Secret.
- límites coordinados API/SQL de 1 MiB, timeout RPC máximo de 4 segundos y
  respuestas públicas cerradas.
- logs estructurados sin body, firma, verify token, secret key ni diagnóstico
  PostgREST; identificador de versión de credencial redactado.
- tenant onboarding dinámico: staging propio y Fer usan filas/Vault separados,
  sin código o env vars por organización.

## Autopsias realizadas

1. El ensayo sin argumentos conservaba un default B2-004 y trató de recrear
   `price_books`. La transacción falló sin persistir. El runner ahora consulta
   el historial remoto y exige exactamente una migración pendiente.
2. B2-009 esperaba 92 tablas y dos inbox default-deny. B4-002 añadió la tabla
   93 y un tercer inbox privado; se actualizaron sólo las expectativas y la
   suite volvió a 82/82.
3. El runner de mutantes confiaba en JSON de `migration list`, pero Supabase CLI
   2.111.0 emite tabla para ese comando. Se sustituyó por consulta read-only a
   `supabase_migrations.schema_migrations`.
4. Un mutante intentó eliminar una constraint con FKs dependientes y no pudo
   compilar. Se convirtió en ataque explícito `CASCADE`; pgTAP lo eliminó y el
   rollback restauró todo.

## Evidencia remota verde

- historial local/remoto: 16/16 migraciones;
- ensayo previo: B4-002 48/48 y rollback;
- regresión acumulada: 830/830 pgTAP en 11 archivos;
- autorización: 82/82;
- mutation testing SQL B4: 23/23 (100%) y rollback por mutante;
- esquema: 93 tablas privadas con RLS habilitada y forzada;
- `db lint --linked --level warning`: cero resultados;
- tipos TypeScript regenerados desde AgenteFer;
- postflight: cero organizaciones, deliveries o secretos Vault QA residuales.
- gate TypeScript: 201/201 pruebas, 95.40% líneas y 91.30% ramas;
- ruta webhook: 100% líneas y 91.66% ramas;
- mutation testing TypeScript: 93.38% sobre 619 mutantes;
- API y worker: procesos reales, puertos efímeros, readiness/liveness y apagado
  verificados;
- auditoría npm completa y producción: cero vulnerabilidades.

## Pendientes reales

- ejecutar el pipeline CI del commit publicado en `develop`;
- desplegar API AgenteFer en EasyPanel con dominio HTTPS propio;
- registrar la callback nueva en la App Meta staging;
- probar challenge y un evento firmado real de WhatsApp/Messenger;
- normalizar entries a conexiones/canales en B4-003 y procesarlas fuera del
  request mediante worker durable.

B4-002 permanece abierto porque sus criterios incluyen un evento Meta real. La
auditoría no reutiliza callbacks heredadas de proyectos ajenos ni afirma que
EasyPanel ya contiene servicios.
