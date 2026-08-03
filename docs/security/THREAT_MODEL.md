# AgenteFer — modelo inicial de amenazas

Estado: v0.1, Bloque 0. Se actualizará cuando existan endpoints, tablas, herramientas y proveedores configurados.

## Activos críticos

1. Identidad y autonomía de Fer.
2. Catálogo, precios, stock, ventas y configuración comercial.
3. PII y conversaciones de clientes.
4. Tokens de Meta y proveedor LLM.
5. Claves privilegiadas y datos de Supabase.
6. Página, número de WhatsApp, reputación y capacidad de publicación.
7. Herramientas/prompts/políticas del agente.
8. Historial de auditoría y evidencia de cambios.
9. Presupuesto de IA y recursos del servidor.
10. Repositorio, pipeline y artefactos de despliegue.

## Límites de confianza

- Internet → Cloudflare/API.
- Meta → endpoint de webhook.
- Cliente/Fer → contenido de conversación.
- API → cola/DB/Storage.
- Worker → LLM y adaptadores externos.
- LLM → herramientas internas.
- Navegador público → catálogo/pedido.
- Operador/CI → infraestructura y secretos.
- Staging → producción.

## Amenazas prioritarias

| ID     | Amenaza                                            | Impacto                                  | Controles obligatorios                                                   | Prueba requerida                                                  |
| ------ | -------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| TM-001 | Cliente se hace pasar por Fer                      | Cambios de precio/stock o exfiltración   | vínculo de identidad, membresía/rol y autorización por herramienta       | comando administrativo desde identidad cliente debe denegarse     |
| TM-002 | Prompt injection en mensaje, OCR o imagen          | tool call no autorizado                  | separación instrucciones/datos, allowlist, autorización backend          | payload que ordena ignorar políticas no obtiene privilegios       |
| TM-003 | Webhook falso o replay                             | spam, duplicados, pedidos falsos         | firma cruda, frescura e idempotencia                                     | firma inválida/repetida se rechaza sin efectos                    |
| TM-004 | Evento legítimo duplicado                          | doble respuesta/venta/publicación        | constraints e idempotency keys end-to-end                                | mismo evento N veces produce un efecto                            |
| TM-005 | Manipulación de precio en frontend                 | cobro/orden incorrecta                   | recálculo servidor y snapshot firmado lógicamente                        | total alterado por cliente es ignorado/rechazado                  |
| TM-006 | Carrera por última unidad                          | stock negativo o promesa falsa           | transacción, lock/versión y reserva                                      | dos pedidos concurrentes respetan stock                           |
| TM-007 | Cruce entre organizaciones                         | fuga/modificación de datos               | RLS, membresía, contexto seguro y tests                                  | usuario A no lee/escribe organización B                           |
| TM-008 | Fuga de `service_role` o tokens                    | compromiso total                         | secret stores, redacción, frontend sin privilegios, rotación             | escaneo repo/build/logs y prueba de redacción                     |
| TM-009 | SSRF por medios/URLs                               | acceso a red interna/metadata            | allowlist, resolución/IP checks, timeouts y egress                       | URL localhost/metadata/IP privada se bloquea                      |
| TM-010 | Archivo malicioso/bomba                            | RCE/DoS/costo                            | MIME real, tamaño, aislamiento y límites                                 | archivo falso/enorme falla cerrado                                |
| TM-011 | XSS en catálogo o panel                            | robo de sesión/acciones                  | escape, sanitización, CSP y tests                                        | HTML/script generado se renderiza inerte                          |
| TM-012 | Abuso de pedido público                            | spam/costo/PII falsa                     | rate limit, idempotencia, antiabuso y validación                         | ráfaga automatizada se limita y observa                           |
| TM-013 | Publicación masiva accidental                      | bloqueo/reputación                       | aprobación/política, límites, preview, cancelación                       | comando ambiguo no publica todo                                   |
| TM-014 | Capacidad Meta no soportada                        | fallos o violación de políticas          | capability detection y documentación oficial                             | Marketplace permanece bloqueado sin permiso/API                   |
| TM-015 | Token vencido/proveedor caído                      | pérdida de mensajes/trabajos             | retries clasificados, dead-letter, alertas y reconciliación              | renovación/falla no reporta éxito y se recupera                   |
| TM-016 | LLM alucina precio/compatibilidad                  | pérdida económica/seguridad vehicular    | catálogo como fuente, incertidumbre y handoff                            | dato ausente produce pregunta, no afirmación                      |
| TM-017 | Tool loop/costo sin límite                         | factura/indisponibilidad                 | máximos por turno, timeout, presupuesto y circuit breaker                | loop sintético termina controladamente                            |
| TM-018 | Memoria envenenada                                 | reglas persistentes falsas               | política de memoria y aprobación para configuración                      | mensaje de cliente no cambia regla del negocio                    |
| TM-019 | Logs con PII/secretos                              | filtración secundaria                    | redacción, minimización y retención                                      | errores con token/teléfono quedan redactados                      |
| TM-020 | Despliegue de develop a producción                 | incidente/regresión                      | separación de proyecto/secretos y gate CI/CD                             | pipeline bloquea destino/rama incorrectos                         |
| TM-021 | Dependencia o imagen comprometida                  | supply-chain RCE                         | pinning, lockfile, auditoría/SBOM y provenance                           | dependencia vulnerable bloquea release según severidad            |
| TM-022 | Borrado lógico mal diseñado                        | pérdida de historial                     | estados, soft-delete y restricciones referenciales                       | producto vendido no se elimina físicamente                        |
| TM-023 | Credencial de infraestructura con alcance excesivo | exposición o mutación fuera de AgenteFer | credenciales con scope mínimo y operaciones dirigidas por recurso exacto | cada integración solo puede operar recursos AgenteFer autorizados |
| TM-024 | Fer no puede operar durante falla UI               | pérdida de accesibilidad/ventas          | voz/canal primario, mensajes claros y fallback humano                    | operación crítica tiene ruta accesible alternativa                |

## Gates de aprobación previstos

Requieren política explícita y potencial confirmación según riesgo:

- publicación de todo el catálogo o lote grande;
- modificación masiva de precios/stock;
- eliminación/ocultación masiva;
- cambio de identidad, ubicación, garantías o reglas de cierre;
- conexión/rotación de canales y secretos;
- gasto que exceda presupuesto;
- exportación/eliminación de datos personales;
- promoción a producción.

## Riesgo residual aceptable en staging

Solo puede aceptarse temporalmente si:

- no hay clientes/datos/credenciales productivos;
- está documentado con propietario y fecha de vencimiento;
- no es un hallazgo crítico de aislamiento, secreto, RCE o autorización;
- existe control compensatorio y tarea de corrección.

## Riesgos no aceptables para producción

- secreto privilegiado en cliente, Git o logs;
- tabla operacional sin RLS/prueba de aislamiento;
- webhook sin firma e idempotencia;
- herramienta administrativa accesible a cliente;
- stock/precio confiado al frontend o LLM sin verificación;
- publicación masiva sin límites/auditoría;
- integración simulada presentada como real;
- rollback/restauración no probado.
