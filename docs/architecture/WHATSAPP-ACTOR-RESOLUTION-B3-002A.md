# AgenteFer — identidad cliente/Fer en el asistente de tienda B3-002A

Estado: **IMPLEMENTADO LOCALMENTE — ENSAYO REMOTO VERDE — NO DESPLEGADO**.  
Fecha de corte: 2026-08-28.  
Dependencias: B2-002, B2-008, B2-009, B3-001A y B4-003A–B4-004F.

## Resultado del bloque

AgenteFer conserva un solo asistente comercial y una sola conversación natural, pero PostgreSQL decide qué recursos puede ver según la identidad durable del remitente:

- `contact`: cliente observado por Meta; puede usar recursos comerciales aprobados para buscar catálogo, precio, existencia y contexto.
- `member`: Fer u otro operador vinculado de forma explícita; conserva recursos comerciales y puede recibir herramientas administrativas que además permitan su rol vigente.

El texto entrante nunca selecciona el actor. Escribir “soy Fer” no cambia autoridad, membresía, policy ni tools.

## Resolución autoritativa

`app_private.resolve_whatsapp_agent_actor` exige simultáneamente:

1. organización, conexión y conversación exactas;
2. conexión Meta/WhatsApp activa;
3. identidad primaria activa de esa conversación;
4. `contact + provider_observed + contact_id`, o bien
5. `member + verified_member + verified_at + member_user_id` y membresía `owner/admin/operator` activa en el mismo tenant.

Una identidad de miembro suspendido no se degrada a cliente: el turno queda sin claim privilegiado. El worker tampoco puede ejecutar directamente el resolver privado.

## Cuenta usada para pruebas

La cuenta personal usada para probar WhatsApp puede comenzar como `contact`; no se hardcodea su número ni se deduce propiedad desde un mensaje. La transición se realiza con `api.link_whatsapp_member_identity`:

```text
owner/admin autenticado
  -> RPC idempotente valida actor y miembro objetivo
  -> toma el mismo advisory lock que el normalizador inbound
  -> cierra la conversación contact preservando mensajes y snapshots
  -> revoca la identidad observada sin reescribir su principal
  -> crea identidad nueva member/verified_member para el mismo sujeto Meta
  -> audita UUIDs internos, nunca el teléfono
  -> siguiente mensaje crea automáticamente una conversación member
```

La RPC sólo está disponible al backend `service_role`; el backend debe derivar `target_actor_user_id` de una sesión autenticada y nunca de un campo libre del cliente. La pantalla/endpoint administrativo que disparará esta aprobación explícita es el siguiente consumidor; no se debe operar por SQL manual en producción.

## Policies, roles y tools

- Las tres tools comerciales actuales aceptan `contact` y `member` exclusivamente en WhatsApp.
- Una tool con `required_membership_roles` sólo puede ligarse a `actor_kind=member`; el constraint se aplica a toda policy nueva.
- `get_agent_turn_tool_context` omite tools si la membresía ya no está activa o si el rol actual no está permitido.
- `authorize_tool_execution` vuelve a comprobar contrato activo, actor, rol, identidad WhatsApp actual, canal y presupuesto justo antes de ejecutar.
- Los bindings históricos que preceden al constraint no ganan privilegios: una tool con roles requerida bloquea actores no-member en autorización.

Esto permite que el mismo LLM atienda y venda a clientes, mientras Fer recibe herramientas administrativas sólo cuando su identidad y rol reales lo permiten. No se usan árboles de intención, regex ni respuestas de negocio hardcodeadas.

## Snapshots sin reescribir historia

Antes de B3-002A cada conversación tenía un único snapshot y el claim automático persistía siempre `contact`. La migración conserva esos registros como carril legado y añade snapshots por `actor_kind`:

- un cliente existente sigue usando su snapshot `contact`;
- una conversación histórica de miembro que fue reclamada erróneamente como contacto puede crear un snapshot `member` nuevo;
- todo snapshot nuevo declara `actor_kind` y `actor_lane_enforced=true`;
- un run nuevo debe coincidir con la policy y el carril del snapshot.

No se actualiza ni elimina ningún snapshot o run histórico.

## Seguridad y concurrencia

- Scope compuesto por organización/conexión/conversación en todas las resoluciones.
- Identidad y principal inmutables; la promoción revoca y crea, no reasigna.
- Vinculación limitada a owner/admin; objetivo limitado a owner/admin/operator activo.
- Idempotency key con fingerprint exacto y resultado durable.
- Lock por `connection_id:external_subject_id`, igual al normalizador de Meta.
- Conversación anterior cerrada antes de liberar la unicidad del sujeto.
- Auditoría sin `external_subject_id`, teléfono, texto del mensaje ni secretos.
- Runs pendientes dejan de ser reclamables si la identidad o membresía ya no es vigente.

## Fuera de alcance de B3-002A

- Endpoint/pantalla admin para aprobar la vinculación de la cuenta de prueba.
- Ingesta de imágenes, Storage privado, derivados WebP y multimedia WhatsApp.
- Creación de SKU/producto/set/subcategoría mediante visión y tool calling.
- Tools mutadoras de catálogo, precios, stock, pedidos y seguimiento de venta.
- Vista QR del cliente y panel administrativo.

Esos bloques consumirán esta frontera de autoridad; no podrán volver a decidir permisos desde lenguaje natural.
