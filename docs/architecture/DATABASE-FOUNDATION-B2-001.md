# AgenteFer — contrato físico de base B2-001

Estado: certificado para implementación tras audit documental.  
Entorno inicial: Supabase staging `hprdctmblmfcoagugvyp`.  
Destino: la misma migración se promoverá a un proyecto productivo separado; no hay variante de prototipo.

## Objetivo y frontera

B2-001 crea la raíz multi-tenant de la que dependerán catálogo, canales, herramientas, pedidos y auditoría. En este bloque no se crean datos comerciales ni mutaciones públicas.

Incluye:

- endurecimiento de default privileges controlados por el rol de migraciones y prohibición de DDL manual;
- esquemas `app_private` y `api`;
- organizaciones;
- perfiles de usuario y negocio;
- membresías y roles;
- proyecciones de lectura mínima;
- RLS/grants, índices, timestamps y garantía de propietario activo;
- pruebas transaccionales cross-org.

Excluye:

- conexiones e identidades WhatsApp/Messenger, que se crean juntas en B2-002;
- auditoría completa de tool calls, que llega en B2-008 antes de habilitar mutaciones administrativas reales;
- configuración productiva de Supabase Auth y exposición remota de `api`, que se valida en B2-009/B4 antes del frontend;
- cualquier seed o producto ficticio.

## Esquemas

### `app_private`

Fuente de verdad del dominio. No se añade a los schemas expuestos por Data API. `PUBLIC` y `anon` no reciben uso ni acceso a objetos. `authenticated` recibe sólo `USAGE` y `SELECT` sobre las cuatro tablas para que vistas `security_invoker` puedan respetar RLS. `service_role` recibe privilegios explícitos necesarios para procesos server-side, aunque nunca sustituye la autorización de aplicación.

### `api`

Única superficie futura de Data API para objetos propios. En B2-001 expone cuatro vistas de lectura `security_invoker`; no contiene funciones de mutación. Cada objeto tiene grants explícitos. `public` deja de ser schema de aplicación.

## Modelo físico

### `app_private.organizations`

| Columna | Tipo / nulabilidad | Regla |
| ------- | ------------------ | ----- |
| `id` | `uuid` PK | `extensions.gen_random_uuid()`; opaco y estable |
| `name` | `text` NOT NULL | `btrim` entre 1 y 160 caracteres |
| `status` | `text` NOT NULL | `active`, `suspended` o `archived`; default `active` |
| `created_by_user_id` | `uuid` NULL FK | sólo `auth.users(id)` PK; `ON DELETE SET NULL` |
| `created_at` | `timestamptz` NOT NULL | reloj de DB |
| `updated_at` | `timestamptz` NOT NULL | trigger controlado |

No existe `DELETE` para clientes o administradores. Archivar es cambio de estado; historia no se borra.

### `app_private.user_profiles`

| Columna | Tipo / nulabilidad | Regla |
| ------- | ------------------ | ----- |
| `user_id` | `uuid` PK/FK | `auth.users(id) ON DELETE CASCADE` |
| `preferred_name` | `text` NULL | 1–160 tras `btrim` cuando existe |
| `preferred_locale` | `text` NULL | 2–35 caracteres cuando existe; no autoriza |
| `time_zone` | `text` NOT NULL | default `UTC`; presentación, no autorización |
| `accessibility_preferences` | `jsonb` NOT NULL | objeto JSON vacío por defecto; nunca contiene roles |
| `created_at` | `timestamptz` NOT NULL | reloj de DB |
| `updated_at` | `timestamptz` NOT NULL | trigger controlado |

Un trigger posterior a `auth.users` crea automáticamente la fila mínima sin copiar `raw_user_meta_data`. Así los datos editables por el usuario jamás entran en autorización ni pueden bloquear signup por tamaño/formato.

### `app_private.organization_memberships`

| Columna | Tipo / nulabilidad | Regla |
| ------- | ------------------ | ----- |
| `id` | `uuid` PK | opaco y estable |
| `organization_id` | `uuid` NOT NULL FK | organización; `ON DELETE RESTRICT` |
| `user_id` | `uuid` NOT NULL FK | `auth.users(id) ON DELETE CASCADE` |
| `role` | `text` NOT NULL | `owner`, `admin`, `operator` o `viewer` |
| `status` | `text` NOT NULL | `invited`, `active` o `suspended` |
| `invited_by_user_id` | `uuid` NULL FK | `auth.users(id) ON DELETE SET NULL` |
| `joined_at` | `timestamptz` NULL | obligatorio cuando estado es `active` |
| `created_at` | `timestamptz` NOT NULL | reloj de DB |
| `updated_at` | `timestamptz` NOT NULL | trigger controlado |

Unicidad: una membresía por `(organization_id, user_id)`. Un constraint trigger diferido exige al menos un `owner` activo por organización al commit. Esto permite crear organización+membresía en una misma transacción y evita eliminar/degradar al último propietario.

### `app_private.business_profiles`

| Columna | Tipo / nulabilidad | Regla |
| ------- | ------------------ | ----- |
| `id` | `uuid` PK | opaco y estable |
| `organization_id` | `uuid` NOT NULL UNIQUE FK | `ON DELETE RESTRICT` |
| `public_name` | `text` NOT NULL | identidad visible, 1–160 tras `btrim` |
| `time_zone` | `text` NOT NULL | default `UTC` |
| `default_locale` | `text` NULL | 2–35 caracteres cuando existe |
| `created_by_user_id` | `uuid` NULL FK | `auth.users(id) ON DELETE SET NULL` |
| `created_at` | `timestamptz` NOT NULL | reloj de DB |
| `updated_at` | `timestamptz` NOT NULL | trigger controlado |

Ubicación, horarios, garantías y políticas comerciales versionadas se amplían en B2-008; no se improvisan como columnas incompletas en esta raíz.

## Índices

- `organizations(created_by_user_id)` para FK/historia.
- UNIQUE de membresía `(organization_id, user_id)` cubre búsquedas por organización.
- parcial `organization_memberships(user_id, organization_id) WHERE status = 'active'` para RLS y selección de contexto.
- parcial `organization_memberships(organization_id) WHERE role = 'owner' AND status = 'active'` para garantía de propietario.
- `organization_memberships(invited_by_user_id)` para FK.
- UNIQUE `business_profiles(organization_id)` cubre FK/uno-a-uno.
- `business_profiles(created_by_user_id)` para FK/historia.

No se crean índices redundantes sólo para satisfacer un checklist.

## RLS y grants

Las cuatro tablas habilitan y fuerzan RLS.

| Tabla | `anon` | `authenticated` | `service_role` | Policy autenticada |
| ----- | ------ | --------------- | -------------- | ------------------- |
| organizations | nada | SELECT | CRUD explícito | miembro activo de la organización |
| user_profiles | nada | SELECT | CRUD explícito | sólo `user_id = (select auth.uid())` |
| organization_memberships | nada | SELECT | CRUD explícito | sólo membresía propia |
| business_profiles | nada | SELECT | CRUD explícito | miembro activo de la organización |

No existen policies INSERT/UPDATE/DELETE para `authenticated`. Las mutaciones futuras se ejecutarán mediante tools/RPC server-side autorizadas y auditadas; no se habilitan antes de B2-008/B3.

Vistas `api`:

- `api.organizations`;
- `api.user_profiles`;
- `api.organization_memberships`;
- `api.business_profiles`.

Todas son `security_invoker = true`, excluyen campos internos innecesarios y heredan RLS de `app_private`. `anon` no recibe `USAGE` ni `SELECT`; `authenticated` y `service_role` reciben sólo los grants declarados.

## Funciones y triggers

1. `app_private.set_updated_at()` — trigger determinista `SECURITY INVOKER`, `search_path` vacío.
2. `app_private.provision_user_profile()` — trigger sobre `auth.users`, `SECURITY DEFINER`, no consume metadata, `search_path` vacío y ejecución revocada a roles públicos/API.
3. `app_private.assert_active_owner()` — constraint trigger diferido, `SECURITY DEFINER`, consulta únicamente tablas fijas, `search_path` vacío y ejecución revocada.

No se crea ninguna función `SECURITY DEFINER` en un schema expuesto.

## Flujo de alta definitivo

1. Supabase Auth crea un usuario real.
2. Trigger crea su perfil mínimo automáticamente.
3. El workflow server-side futuro abre una transacción.
4. Crea organización y perfil comercial.
5. Crea membresía `owner/active` con `joined_at`.
6. El constraint diferido verifica propietario al commit.
7. La auditoría de onboarding se conecta antes de habilitar este workflow a Fer.

No se insertará la organización real de Fer hasta tener identidad Auth verificada y workflow auditado; hacerlo manualmente rompería la automatización solicitada.

## Pruebas reales

La suite pgTAP se ejecuta contra PostgreSQL/Supabase local real en CI:

- migración desde cero y reset repetible;
- tablas, columnas, PK, FK, constraints, índices, vistas, RLS forzado, policies y grants exactos;
- trigger de perfil ante `auth.users`;
- organización sin propietario falla al commit;
- último propietario no puede degradarse/eliminarse;
- mismo usuario no duplica membresía;
- rol/estado/nombre/JSON inválidos fallan;
- usuario autenticado ve sólo su perfil, membresía, organización y negocio;
- usuario de organización A no ve ni modifica B;
- `anon` no accede al schema `api`;
- `authenticated` no muta tablas privadas;
- service role conserva acceso server-side explícito.

Las filas de prueba usan IDs reservados dentro de `BEGIN` y finalizan con `ROLLBACK`. No son seed, mocks ni datos del catálogo.

## Despliegue y recuperación

- El archivo de migración es único, versionado y se prueba antes de staging.
- Staging se actualiza sólo después de CI verde; inmediatamente se ejecutan advisors y probes SQL reales.
- Producción recibirá el mismo archivo desde `main` en un proyecto Supabase distinto.
- No se usa una migración destructiva de rollback en producción. Como las tablas nacen sin consumidores, una falla se contiene revocando exposición y aplicando una migración forward-fix.
- `db reset` queda limitado a local/CI; jamás se ejecuta contra staging o producción.

## Gates de implementación

1. CLI fijado y supply chain verificada.
2. Migración creada mediante `supabase migration new`, no por nombre inventado.
3. `db reset`, `test db`, lint y advisors locales verdes en CI Docker real.
4. Revisión SQL y secret/project-boundary scan.
5. CI de `develop` verde antes de aplicar staging.
6. Migración remota registrada, no SQL suelto sin historia.
7. Advisors y validación cross-org remotos verdes.
8. Tipos TypeScript generados desde el esquema aplicado.

Los tipos versionados viven en `packages/database/src/database.types.ts`. CI regenera `app_private,api` desde una base local creada exclusivamente por la historia de migraciones, formatea con la versión fijada y compara ambos archivos de forma exacta. Cualquier drift bloquea `develop` antes de despliegue.
