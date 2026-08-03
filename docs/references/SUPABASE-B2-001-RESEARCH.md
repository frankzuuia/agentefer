# AgenteFer — investigación oficial Supabase para B2-001

Fecha de verificación: 2026-08-03.  
Alcance: fundamento organizacional, Auth, grants, RLS, migraciones y pruebas SQL.  
Regla: staging ejecuta la misma migración destinada a producción; no existe un esquema de prototipo.

## Estado real inspeccionado

- Proyecto: `AgenteFer` / `hprdctmblmfcoagugvyp`.
- Organización Supabase: `ntzefxsqjznlrlqteufb`.
- Región: `us-west-1`.
- Estado: `ACTIVE_HEALTHY`.
- PostgreSQL: 17.6.
- Tablas de aplicación en `public`: 0.
- Migraciones de aplicación remotas: 0.
- Usuarios en `auth.users`: 0.
- Advisors de seguridad: 0 hallazgos antes de crear esquema.
- Advisors de rendimiento: 0 hallazgos antes de crear esquema.
- Extensiones instaladas relevantes: `pgcrypto` 1.3, `pg_stat_statements` 1.11 y `uuid-ossp` 1.1.
- `pgtap` 1.3.3 está disponible pero no instalado.
- UUIDv7 no está disponible como extensión en este proyecto; no se inventará esa capacidad.
- CLI verificado por `--help`: 2.111.0.
- Docker local: no disponible; la validación local reproducible se ejecutará en CI con Docker real antes de aplicar staging.

## Hallazgo de privilegios

El proyecto conserva temporalmente default privileges heredados en `public`: tablas, secuencias y funciones creadas por `postgres` o `supabase_admin` reciben grants amplios para `anon`, `authenticated` y `service_role`. El rol ejecutor real de migraciones es `postgres`, no es superusuario ni miembro de `supabase_admin`; por lo tanto no puede modificar de forma legítima los defaults propiedad de `supabase_admin`. El changelog oficial anuncia la transición a exposición explícita.

Decisión B2-001:

- revocar los default privileges propiedad de `postgres` antes de crear objetos de aplicación;
- prohibir DDL manual mediante Dashboard/`supabase_admin`; todo objeto AgenteFer nace por la historia de migraciones controlada y sus grants explícitos;
- no crear tablas de dominio en `public`;
- usar `app_private` para dominio y `api` para vistas/RPC mínimas;
- grants y RLS viajan en la misma migración que cada objeto;
- `anon` no recibe acceso al fundamento administrativo.

## Fuentes oficiales

1. [Breaking change: explicit Data API grants](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically) — grants y RLS son capas separadas; la exposición nueva pasa a ser opt-in.
2. [Securing your API](https://supabase.com/docs/guides/api/securing-your-api) — mínimo privilegio, default privileges, RLS y esquema API dedicado.
3. [Using custom schemas](https://supabase.com/docs/guides/api/using-custom-schemas) — configuración y grants de un esquema expuesto distinto de `public`.
4. [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — policies con `auth.uid()`, índices y consideraciones de rendimiento.
5. [User Management](https://supabase.com/docs/guides/auth/managing-user-data) — `auth.users` no se expone; perfiles propios referencian únicamente su PK y usan `on delete cascade`.
6. [pgTAP](https://supabase.com/docs/guides/database/extensions/pgtap) — pruebas de tablas, columnas, policies y resultados dentro de `BEGIN`/`ROLLBACK`.
7. [Local development](https://supabase.com/docs/guides/local-development) — migraciones y pruebas antes de entornos remotos.
8. [Managing environments](https://supabase.com/docs/guides/deployment/managing-environments) — staging y producción aplican la misma historia de migraciones.
9. [CLI reference](https://supabase.com/docs/reference/cli/introduction) — descubrir comandos por `--help` y fijar versión.

## Reglas Postgres aplicadas

- `timestamptz`, `text`, `boolean`, `jsonb` objeto y `uuid` según semántica real.
- UUIDv4 sólo para entidades organizacionales de bajo volumen y referencias opacas; la ausencia real de UUIDv7 queda documentada.
- constraints nombrados y FKs indexadas.
- índice parcial para membresías activas y otro para propietarios activos.
- `(select auth.uid())` en policies para evitar evaluación por fila.
- ninguna policy usa `raw_user_meta_data`, `auth.role()` ni sólo `TO authenticated`.
- vistas `security_invoker`; funciones privilegiadas en esquema no expuesto, `search_path` vacío y `EXECUTE` revocado.

## Exclusiones conscientes

- No se modifica todavía configuración productiva de email, URLs, CAPTCHA, MFA o proveedores Auth; dependen del dominio y decisiones del bloque de Auth.
- No se crean identidades WhatsApp/Messenger sin su conexión de canal; ambas pertenecen a B2-002.
- No se instala `pgtap` en la migración productiva. La suite lo habilita dentro de su transacción de pruebas y revierte al terminar.
- No se crean usuarios, organizaciones ni productos reales mediante seed.
