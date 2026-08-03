# AgenteFer — auditoría forense de diseño B2-001

Fecha: 2026-08-03.  
Alcance: diseño productivo previo a primera migración; no afirma implementación.

## Evidencia cruzada

- BL-001 exige organización obligatoria, membresía explícita y aislamiento.
- BL-002 exige propietario autenticado y separa identidad de canal.
- ADR-009 exige dominio privado y API mínima.
- MASTER Batch 1 separa organizaciones/membresías/perfiles de conexiones/identidades.
- RQ-088 exige staging/producción separados.
- RQ-099 exige `organization_id`, RLS y pruebas cross-org.
- Estado real: PostgreSQL 17.6, `public` vacío, cero migraciones/usuarios y default privileges amplios.
- Investigación oficial: `docs/references/SUPABASE-B2-001-RESEARCH.md`.

## Corrección de dependencia

La versión anterior de B2-001 pedía identidades de canal antes de que B2-002 creara conexiones. Eso permitía una identidad externa sin Página/número/app scope y generaba ambigüedad o suplantación. El plan corregido deja:

- B2-001: Auth user, perfil, organización, negocio y membresía;
- B2-002: conexión + identidad externa como unidad íntegra.

No se perdió requisito: BL-002 y SC-002/003 abarcan ambos entregables.

## Forensic audit

### Coherence failure

No detectada. Las cuatro entidades raíz soportan tenancy y accesibilidad sin invadir catálogo/canales.

### Technical hallucination

No detectada. PostgreSQL 17.6, extensiones, CLI y defaults se inspeccionaron en el proyecto real. UUIDv7 se descartó porque no está disponible.

### Simulation

No hay seed ni datos comerciales ficticios. pgTAP usa el esquema definitivo y filas transaccionales revertidas.

### Security failure

Mitigada en diseño:

- defaults amplios propiedad del ejecutor `postgres` se revocan antes de objetos; DDL manual por `supabase_admin` queda prohibido;
- private schema + API mínima;
- RLS habilitado/forzado;
- grants sin `anon` y sin mutaciones `authenticated`;
- policies con membresía/usuario, no metadata editable;
- funciones privilegiadas fuera de API, con `search_path` vacío y execute revocado;
- propietario activo garantizado al commit.

### Scenario gap

Cubiertos: alta, usuario previo, delete Auth, duplicado, rol/estado inválido, último owner, anon, owner, miembro suspendido, cross-org, service role, reset, forward-fix y advisors.

### Logic disconnect

No detectado en alcance: Auth → perfil → organización/negocio/membresía → vistas API. Mutaciones permanecen cerradas hasta tool/audit; no se finge un endpoint inexistente.

## Riesgos aceptados temporalmente

1. Auth productivo aún requiere dominio, SMTP, MFA/CAPTCHA y política de signup; bloquea producción, no la migración base.
2. Docker no existe localmente; el gate de base de datos se ejecutará en GitHub CI con Docker real antes de staging.
3. `service_role` bypass RLS; cada workflow server-side deberá revalidar actor/organización y auditar antes de habilitarse.

## Cross-match

| Contrato | Tarea | Evidencia exigida |
| -------- | ----- | ----------------- |
| schema privado/API mínima | B2-001 | catálogos + grants |
| cuatro entidades raíz | B2-001 | migración + pgTAP |
| owner invariant | B2-001 | constraint test diferido |
| cross-org | B2-001/B2-009 | RLS positivo/negativo |
| conexión + identidad | B2-002 | FK/scope/idempotencia |
| no mutación sin auditoría | B2-008/B3 | tools + audit events |
| mismo esquema en producción | B9 | replay limpio en proyecto separado |

## Veredicto

**GREEN LIGHT para implementar B2-001 conforme a `DATABASE-FOUNDATION-B2-001.md`.**  
**INTEGRITY TOTAL** con ADR-009, BL-001/002 y Batch 1.  
**MATCH PERFECT** entre diseño y tareas B2-001/B2-002.

Este veredicto deja de ser válido si la migración añade acceso anónimo, mutaciones directas, tablas en `public`, seed o una identidad de canal sin conexión.
