# AgenteFer — auditoría forense B2-003

Fecha: 2026-08-09.  
Alcance: catálogo universal, ingesta/evidencia cognitiva, producto/variante/SKU y seguridad tenant-aware.  
Estado: **IMPLEMENTED** y certificado contra Supabase AgenteFer; cierre CI final pendiente.

## Evidencia

- Requisitos: BL-008, BL-009, SC-007–SC-009 y RQ-040–RQ-050/RQ-110.
- Contrato: `docs/architecture/UNIVERSAL-CATALOG-B2-003.md`.
- Migración base: `20260809095510_b2_003_universal_catalog.sql`, SHA-256 `D754E2067D02DA1FAE1C4C92E950E4B53C58B4C8BDE98AF59C5E9D28784CA884`.
- Hardening: `20260809101909_b2_003_catalog_trigger_hardening.sql`, SHA-256 `91C76E8E789926E52CBB15CFA53ABEAA2C6BF006F69E8B4BEA91540326B8DCAB`.
- Proyecto exclusivo verificado por CLI: `AgenteFer`, ref `hprdctmblmfcoagugvyp`.
- Remoto: versiones `20260809095510` y `20260809101909` aplicadas.
- SQL: 75/75 pgTAP mediante Management API, transacción con rollback.
- Esquema: lint sin errores; advisors security/performance sin hallazgos.
- Tipos: generados desde remoto para `app_private,api`; `public` ausente.
- Código antes de cierre CI: 90 tests; 93.94% líneas, 93.75% statements, 93.05% funciones, 89.57% ramas; 112/112 mutantes eliminados.
- Dependencias: exactas; `npm audit` 0 vulnerabilidades; 546 firmas de registro y 145 attestations verificadas.
- Aceptación: 7 escenarios Gherkin parseados sin errores.
- Lifecycle TCP: entrypoints API/worker sincronizados con su promesa real; 20/20 corridas de estrés conjuntas.

## Autopsia de regresión real

El primer diseño reutilizó un trigger PL/pgSQL polimórfico para categoría, unidad, producto, variante y borrador. PostgreSQL resolvió referencias como `new.code` contra tablas que no tenían esa columna y produjo `42703` durante actualizaciones válidas. La migración base aplicó atómicamente, pero pgTAP detectó 11 fallos antes de cargar datos reales.

Corrección enterprise:

1. se preservó la migración ya registrada;
2. se creó una migración forward-only;
3. se eliminaron los cinco triggers que apuntaban a la función genérica;
4. se reemplazaron por cinco funciones con records tipados por tabla;
5. se corrigieron pruebas que pretendían saltar privilegios append-only;
6. se añadió un runner pgTAP enlazado, probado y con guard de proyecto;
7. la regresión quedó cubierta por activación, pausa y aplicación de borrador.

No se borró historial ni se deshabilitó una constraint para obtener verde.

## Autopsia del primer run CI

El run `31324097783` aplicó las cuatro migraciones desde cero y aprobó B2-001 y B2-003, pero B2-002 falló en su aserción 31. Esa prueba histórica enumeraba globalmente todas las funciones `SECURITY DEFINER` de `app_private` y esperaba exactamente tres; al agregar B2-003, el conjunto legítimo creció a once.

Corrección de regresión:

1. B2-002 ahora valida por nombre que sus tres funciones privilegiadas permanezcan `SECURITY DEFINER`;
2. B2-003 añadió una aserción global que exige `search_path=""` en toda función `SECURITY DEFINER` presente o futura;
3. el contrato acumulado pasó de 208 a 209 aserciones;
4. la verificación enlazada quedó verde con B2-002 85/85 y B2-003 75/75.

## Autopsia de carrera del lifecycle

Una repetición local integral expuso que el test del entrypoint API podía agotar 5 segundos bajo carga. Los entrypoints descartaban con `void` la promesa real de arranque y las pruebas inferían arranque/cierre mediante polling HTTP, sin consumir el body y sin timeout por petición. La prueba podía dejar trabajo pendiente durante el cierre.

Corrección de regresión:

1. API y worker conservan y exportan su promesa real de runtime sin cambiar el autoarranque productivo;
2. las pruebas esperan el arranque real, consumen la respuesta de readiness y esperan el cierre idempotente;
3. `finally` cierra siempre el runtime antes de restaurar proceso y listeners;
4. no se elevó el timeout global;
5. 20/20 ejecuciones conjuntas de ambos entrypoints pasaron antes de repetir la puerta integral.

## Autopsia del segundo run CI

El run `31324792990` aprobó migraciones desde cero, 209 pgTAP, concurrencia, tres mutantes de esquema, lint y advisors. El drift final de tipos falló porque el remoto generaba `__InternalSupabase.PostgrestVersion: "14.15"`, mientras la imagen local no emitía ese metadato. El contrato relacional era idéntico; la comparación estaba acoplada a una versión operativa de PostgREST.

Corrección de regresión:

1. un normalizador compartido elimina únicamente `__InternalSupabase` y sus comentarios generados;
2. remoto y CI local usan la misma función tipada;
3. el normalizador falla cerrado ante bloques duplicados o incompletos;
4. tablas, vistas, relaciones, enums y funciones continúan comparándose byte por byte;
5. el normalizador queda bajo pruebas unitarias, cobertura y mutation testing.

## Cross-match

| Riesgo | Control | Evidencia |
| ------ | ------- | --------- |
| categoría hardcodeada | taxonomía/atributos/unidades como filas | ninguna columna o enum comercial |
| dato inventado | certeza + evidencia + activación sólo con `confirmed` | propuesta no activa variante |
| duplicado silencioso | candidatos/diferencias + decisión append-only | candidato ajeno al borrador falla |
| SKU duplicado | índice único `organization_id,lower(sku)` | caso insensitive y carrera CI |
| reutilizar SKU | ledger `current/reserved` | SKU retirado sigue ocupado |
| cruce tenant | FK compuesta + RLS forzada | fixtures A/B y vistas por rol |
| exponer medio | hash/metadatos sin path/bucket/URL | inspección de columnas |
| borrar evidencia | grants sin UPDATE/DELETE | `42501` verificado |
| LLM como autoridad | borrador/propuesta separados de autoritativo | aplicación exige tool/constraints |

## Límites preservados

- B2-004 sigue siendo propietario exclusivo de precios.
- B2-005 sigue siendo propietario exclusivo de stock/composición.
- B2-010 sigue siendo propietario exclusivo de Storage y URLs.
- B3/B5 implementarán tools y razonamiento; SQL no decide intención.
- No se cargaron las cinco imágenes ni catálogo real.
- No se conectó Meta, EasyPanel, Cloudflare o Vercel.

## Gate pendiente

GitHub Actions debe ejecutar sobre PostgreSQL local aislado:

- migraciones desde cero;
- las 209 pgTAP acumuladas;
- dos sesiones concurrentes para el mismo SKU;
- 3 mutantes de esquema con 100% eliminados;
- type drift, lint, advisors, cobertura, mutation testing de código, contenedores y auditoría de supply chain.

Hasta que ese run sea verde, este documento no usa `COMPLETE` ni cambia B2-003 a `[x]`.
