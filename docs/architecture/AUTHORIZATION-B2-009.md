# AgenteFer — contrato físico B2-009 autorización integral

Estado: implementado y certificado en AgenteFer.  
Fecha: 2026-08-13.  
Dependencias: B2-001–B2-008.

## Objetivo

Convertir la seguridad distribuida de las 11 migraciones existentes en una frontera completa, reproducible y comprobable. B2-009 no decide intención: el LLM seguirá eligiendo tools nativas y el backend/PostgreSQL sólo validarán identidad, organización, rol, estado, grants e invariantes.

## Superficies

| Superficie | `anon` | `authenticated` | `service_role` |
| --- | --- | --- | --- |
| esquema `app_private` | sin `USAGE` | `USAGE` sólo para RLS/vistas invoker | `USAGE` backend |
| tablas privadas | sin privilegios | `SELECT` sólo en columnas proyectadas; cero escritura | `SELECT` 89, `INSERT` 36, `UPDATE` 29, `DELETE` 4 |
| esquema/vistas `api` | sin acceso | `USAGE` + `SELECT`, sujeto a RLS | `USAGE` + `SELECT` |
| resolvers read-only | sin `EXECUTE` | sólo `resolve_price_quote` y `resolve_inventory_requirements` | `EXECUTE` |
| RPC mutadoras | sin `EXECUTE` | sin `EXECUTE` | `EXECUTE` explícito |
| funciones internas | sin `EXECUTE` | sin `EXECUTE` | sin acceso directo; sólo triggers/RPC propietarias |

`PUBLIC` no recibe privileges de aplicación.

## Matriz humana

| Clase | Roles admitidos | Ejemplos |
| --- | --- | --- |
| self | usuario exacto | preferencias y perfil propio |
| member | owner/admin/operator/viewer activos | catálogo, precios, inventario, pedidos y ventas no sensibles |
| operator | owner/admin/operator activos | conversaciones, PII operativa, jobs, auditoría y runtime |
| admin | owner/admin activos | canales, conexiones sociales, prompts/contratos sin cuerpos secretos y agendas |
| backend-only | `service_role` | inbox/outbox, mutaciones y efectos externos |

Una membresía `invited`, `suspended` o `removed` no autoriza. El `organization_id` recibido por cliente o LLM nunca sustituye la membresía.

## Algoritmo de cierre ACL

1. Verificar forma previa: 89 tablas RLS/force, 89 vistas invoker/barrier, 87 policies de lectura y dos tablas backend-only.
2. Revocar schemas, tablas, vistas, secuencias y funciones de `PUBLIC`, `anon`, `authenticated` y `service_role`.
3. Conceder `USAGE` a `authenticated` y `service_role` en `app_private`/`api`.
4. Conceder a `authenticated` las columnas base exactas usadas por vistas `api`, calculadas desde `information_schema.view_column_usage`.
5. Conceder `SELECT` sobre vistas `api` a `authenticated` y `service_role`.
6. Reconstruir la matriz histórica de `service_role`: lectura de 89 tablas,
   escritura sólo en 36/29/4 tablas y cero acceso directo a secuencias.
7. Conceder `EXECUTE` de RPC `api` a `service_role` y de los dos resolvers puros a `authenticated`.
8. Repetir assertions posteriores y abortar toda la transacción ante una desviación.

## Invariantes verificables

- `app_private` nunca aparece en `api.schemas` ni `api.extra_search_path`.
- Todas las tablas privadas tienen RLS habilitada y forzada.
- Toda tabla legible por humanos tiene exactamente una policy `SELECT TO authenticated`.
- Sólo `inbound_events` y `outbox_events` permanecen sin policy y sin lectura humana.
- Toda policy usa identidad propia/membresía activa; ninguna usa metadata editable.
- Toda vista `api` es `security_invoker` y `security_barrier`.
- Cada columna usada por una vista posee el grant mínimo requerido; columnas adicionales sensibles permanecen denegadas.
- Ninguna función `SECURITY DEFINER` carece de `search_path=''`.
- Ninguna función es ejecutable por `PUBLIC` o `anon`.
- `authenticated` no tiene `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES` o `TRIGGER` sobre tablas privadas.
- `service_role` no se expone a frontend/LLM y las RPC mutadoras conservan autorización de dominio.
- Ledgers de inventario, ventas, publicaciones y runtime no reciben DML directo;
  el worker usa las RPCs transaccionales y auditadas de cada dominio.

## Fallo y no-fuga

- Acceso a objeto sin grant: SQLSTATE `42501`.
- Fila de otra organización, membresía inactiva o rol insuficiente: cero filas, sin confirmar existencia.
- Mutación humana directa: `42501` antes de lógica de negocio.
- RPC administrativa humana: `42501`.
- Desviación de catálogo durante migración: excepción y rollback total.

## QA

- pgTAP transaccional sobre catálogo completo y actores reales efímeros.
- Gherkin positivo, negativo, cross-org, roles, suspensión, funciones y defaults futuros.
- Mutation testing de RLS, view invoker, grants anon/authenticated, función pública, policy y índice de membresía.
- Lint/advisors, tipos sin drift, suite acumulada y CI desde cero.
- Concurrencia nueva: no aplica; no se añaden escrituras ni locks. CI conserva todas las carreras B2-003–B2-008.

## Frontera posterior

B2-010 añadirá Storage privado; B2-011 cerrará el modelo completo. B3 expondrá tools deterministas detrás de esta autorización. B4/B5/B6 conectarán Meta y LLM sólo con credenciales reales.
