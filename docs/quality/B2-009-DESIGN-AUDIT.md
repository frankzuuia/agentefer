# AgenteFer — auditoría B2-009 autorización integral

Estado: **IMPLEMENTED — REMOTE QA GREEN, CI PENDING**.  
Fecha: 2026-08-13.  
Proyecto: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Evidencia previa

- Frontera Git limpia; HEAD local/remoto `be5fb277f315d2f1a2894b66765de4df81562cf4`.
- Historial inicial Supabase 11/11; historial final 13/13.
- Investigación oficial: `docs/references/AUTHORIZATION-B2-009-RESEARCH.md`.
- Contrato: `docs/architecture/AUTHORIZATION-B2-009.md`.
- Autopsia remota read-only: 89 tablas, 89 vistas, 87 policies, 159 funciones y 1,142 dependencias de columnas.
- Cero RLS/force faltantes, vistas inseguras, grants `anon`, funciones `PUBLIC`, JWT editable o dependencias de vista sin permiso.

## Riesgos que debe matar la implementación

1. Dependencia accidental de default grants distintos entre proyectos Supabase.
2. BOLA/IDOR por `organization_id` manipulado.
3. Viewer leyendo PII/runtime o ejecutando función administrativa.
4. Operador leyendo configuración admin.
5. Usuario suspendido conservando acceso.
6. Vista `security definer` saltando RLS.
7. Columna privada entregada para hacer funcionar una vista segura.
8. RPC o función interna ejecutable por `PUBLIC`, `anon` o `authenticated` indebidamente.
9. Escritura directa humana fuera de una tool/RPC autorizada.
10. Política futura sin índice de membresía o basada en metadata editable.

## Implementación aplicada

- `20260813150805_b2_009_authorization_hardening.sql`: cierra defaults,
  schemas, vistas, columnas y firmas RPC; `anon` queda sin superficie tenant.
- `20260813152105_b2_009_service_role_least_privilege.sql`: restaura la
  matriz backend histórica exacta después de que la regresión detectó que un
  grant CRUD global era demasiado amplio.
- `authenticated`: 89 vistas `security_invoker`/`security_barrier`, columnas
  base derivadas de `view_column_usage`, cero DML y sólo dos resolvers puros.
- `service_role`: `SELECT` 89, `INSERT` 36, `UPDATE` 29, `DELETE` 4 y cero
  privilegios de secuencia. Los ledgers se mutan mediante RPCs auditadas.
- Defaults futuros: funciones `postgres` nacen sin `PUBLIC EXECUTE`; tablas,
  secuencias y funciones de aplicación requieren grants explícitos.

## Evidencia verde

- Contrato estático: 13 migraciones ordenadas, 89 tablas forced-RLS y 729
  aserciones pgTAP registradas.
- Gherkin: 7 features, 181 escenarios ejecutables y cero errores de parseo.
- Rehearsal de la corrección: 80/80, proyecto/ref AgenteFer y rollback
  confirmado.
- Estado remoto: 729/729 pgTAP en 9 archivos.
- Supabase `db lint --linked --schema app_private,api`: cero errores.
- Tipos TypeScript enlazados: `drift=false`.
- Mutation testing TypeScript: 112/112 eliminados, score 100%.
- Cobertura local: statements 93.83%, branches 89.57%, functions 93.10% y
  lines 94.02%; 95/95 pruebas unitarias verdes.
- Builds y runtime API/worker verdes; `npm audit` reporta cero vulnerabilidades.
- Nueve mutantes de autorización añadidos al total de 47: apertura `anon`, DML humano, RPC
  mutadora, `PUBLIC EXECUTE`, vista sin invoker, policy/índice eliminados y
  exposición de prompt privado.

## Incidente de QA y corrección

La primera migración reotorgó CRUD completo a `service_role`. La regresión
B2-001/B2-002 lo detectó antes del cierre del bloque. Se generó una migración
forward-only compensatoria; no se reescribió el historial remoto. La matriz
final 89/36/29/4 quedó verificada por postflight y pgTAP.

## Gates pendientes

- commit/push exclusivo a `develop`;
- CI final, incluyendo Docker, concurrencia y los 47 mutantes de base.

No existen credenciales externas, datos reales ni conexiones Meta/LLM en este
bloque. No se declarará `COMPLETE` hasta que CI quede verde.
