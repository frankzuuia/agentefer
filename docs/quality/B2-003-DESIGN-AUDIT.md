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
- SQL: 74/74 pgTAP mediante Management API, transacción con rollback.
- Esquema: lint sin errores; advisors security/performance sin hallazgos.
- Tipos: generados desde remoto para `app_private,api`; `public` ausente.
- Código antes de cierre CI: 81 tests; 93.93% líneas, 93.74% statements, 92.95% funciones, 89.01% ramas; 37/37 mutantes eliminados.
- Dependencias: exactas; `npm audit` 0 vulnerabilidades; 546 firmas de registro y 145 attestations verificadas.
- Aceptación: 7 escenarios Gherkin parseados sin errores.

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
- las 208 pgTAP acumuladas;
- dos sesiones concurrentes para el mismo SKU;
- 3 mutantes de esquema con 100% eliminados;
- type drift, lint, advisors, cobertura, mutation testing de código, contenedores y auditoría de supply chain.

Hasta que ese run sea verde, este documento no usa `COMPLETE` ni cambia B2-003 a `[x]`.
