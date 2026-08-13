# AgenteFer — investigación oficial B2-009 autorización integral

Estado: revisado contra documentación oficial vigente.  
Fecha de revisión: 2026-08-13.  
Proyecto exclusivo: Supabase AgenteFer `hprdctmblmfcoagugvyp`.

## Fuentes oficiales

- Supabase, _Securing your API_: https://supabase.com/docs/guides/api/securing-your-api
- Supabase, _Row Level Security_: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase, _Securing your data_: https://supabase.com/docs/guides/database/secure-data
- Supabase, _Column Level Security_: https://supabase.com/docs/guides/database/postgres/column-level-security
- Supabase, _Postgres Roles_: https://supabase.com/docs/guides/database/postgres/roles
- Supabase changelog, _Tables not exposed to Data and GraphQL API automatically_: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically
- PostgreSQL, _Row Security Policies_: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- PostgreSQL, _Privileges_: https://www.postgresql.org/docs/current/ddl-priv.html

## Hechos que gobiernan el diseño

1. `GRANT` decide si un rol alcanza un objeto; RLS decide qué filas puede observar o modificar. Ambas capas son obligatorias.
2. Supabase está retirando la exposición automática de tablas nuevas. AgenteFer debe ser opt-in y no depender de defaults distintos entre proyectos o fechas.
3. `TO authenticated` sólo autentica; no autoriza una organización. Toda policy necesita membresía activa o identidad propia verificable.
4. `UPDATE` necesita policy de `SELECT`, `USING` y `WITH CHECK`; AgenteFer no concede mutación directa humana y evita esa superficie por completo.
5. Una vista creada por `postgres` puede saltarse RLS salvo que use `security_invoker=true`. `security_barrier=true` reduce reordenamientos que pudieran filtrar información.
6. RLS no protege funciones. `EXECUTE` debe revocarse de `PUBLIC` y concederse por firma exacta.
7. `service_role` tiene `BYPASSRLS`; es una identidad técnica de backend, no una autoridad comercial. Las RPC mutadoras conservan actor, organización, rol y estado como invariantes propias.
8. `raw_user_meta_data` y `user_metadata` son editables por el usuario y no se usan para autorización. La fuente es `organization_memberships`.
9. `(select auth.uid())` evita reevaluar la identidad por fila. La consulta de membresía requiere índices por `user_id`, `organization_id` y estado activo.
10. Los grants por columna permiten que vistas seguras funcionen sin entregar contenido privado que no aparece en ellas.

## Autopsia del esquema real previa a B2-009

Consulta read-only ejecutada mediante `supabase@2.111.0 db query --linked`, después de verificar que el único proyecto enlazado era `AgenteFer`.

- 89 tablas `app_private`: RLS 89/89 y `FORCE ROW LEVEL SECURITY` 89/89.
- 87 policies `SELECT TO authenticated`; `inbound_events` y `outbox_events` son backend-only y usan default deny.
- 89 vistas `api`: `security_invoker` 89/89 y `security_barrier` 89/89.
- 1,142 dependencias columna→vista: cero columnas sin grant requerido.
- `anon`: cero uso de esquemas, tablas, vistas o funciones de aplicación.
- `PUBLIC`: cero funciones ejecutables de aplicación.
- `authenticated`: cero escritura directa; dos resolvers read-only ejecutables.
- 159 funciones de aplicación; 99 `SECURITY DEFINER`, todas con `search_path` vacío.
- Matriz de lectura: 12 policies admin, 32 operator, 41 member y 2 self.
- PostgreSQL concede `EXECUTE` a `PUBLIC` por defecto en funciones nuevas. Un
  `REVOKE` limitado por esquema no resta ese default global; B2-009 debe cerrar el
  default global del propietario `postgres` y luego otorgar cada firma de manera
  explícita.
- Ninguna policy usa `auth.jwt()`, `user_metadata` o `raw_user_meta_data`.
- Índice parcial `(user_id, organization_id) WHERE status='active'` presente para la ruta RLS dominante.
- Data API local expone únicamente `api` y `graphql_public`; `app_private` no está expuesto.

## Decisiones B2-009

- No crear un segundo registro de roles ni copiar membresías a JWT.
- No permitir escritura directa a `authenticated`; las futuras tools usarán RPC backend-only.
- Reconstruir privileges desde cero dentro de una migración forward-only para que el resultado no dependa de grants históricos.
- Derivar grants por columna de las dependencias de las vistas `api`; la vista es el contrato de exposición.
- Mantener `anon` cerrado hasta que B7 cree una superficie pública de catálogo deliberada.
- Añadir assertions de catálogo que aborten la migración si el estado previo no coincide con el contrato auditado.
- Probar owner/admin/operator/viewer, usuario suspendido, identidad ajena, `anon`, `authenticated`, `service_role` y `PUBLIC`.

## Fuera de alcance

- Auth productivo, SMTP, CAPTCHA, MFA, redirects y políticas de sesión requieren el dominio y las decisiones operativas posteriores.
- Network restrictions y SSL remoto pertenecen al despliegue; no se alteran sin rangos y entorno definitivos.
- Storage se construye en B2-010.
- Tool calling se implementa en B3/B5; B2-009 no interpreta intención ni contenido.
