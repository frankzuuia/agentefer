# AgenteFer — progreso y plan de ejecución trazable

Estado global: Bloque 1 y B2-001/B2-002/B2-003/B2-004 completos; precios universales e index hardening están aplicados 7/7 y certificados 275/275 en Supabase AgenteFer y CI aislado. Todavía no existe despliegue de aplicación, conexión Meta ni datos reales del negocio.  
Fuente: `BUSINESS_LOGIC.md` y `MASTER-SPECIFICATION.md`.  
Regla: una tarea solo pasa a completada con entregable real y evidencia de validación.

## Leyenda

- `[x]` completada y verificada en el alcance indicado.
- `[ ]` pendiente.
- `BLOCKED` solo si existe impedimento externo real documentado.
- `NO-BUILD` decisión explícita de no construir hasta nueva autorización/evidencia.

## Bloque 0 — Frontera, requisitos y especificación

| ID     | Fuente                       | Entregable                                                           | Validación                                         | Estado |
| ------ | ---------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- | ------ |
| B0-001 | BL-023, SC-034               | verificar raíz, remoto, rama y recursos exclusivos AgenteFer         | Git + escaneo de referencias externas              | [x]    |
| B0-002 | RQ-001–RQ-110                | ledger exhaustivo de requisitos y evidencia visual                   | IDs continuos 001–110 y revisión de incertidumbres | [x]    |
| B0-003 | BL-001–BL-025                | lógica de negocio con actor, datos, permisos, auditoría y validación | cobertura de las 25 reglas                         | [x]    |
| B0-004 | BL-001–BL-025                | contexto, componentes, límites, entornos y flujos                    | revisión de aislamiento y flujo end-to-end lógico  | [x]    |
| B0-005 | BL-019–BL-025, SC-029–SC-037 | baseline y modelo de amenazas                                        | top 10 AppSec + amenazas/pruebas                   | [x]    |
| B0-006 | SC-001–SC-037                | especificación maestra por cinco lotes                               | matriz normal/edge/falla/recuperación              | [x]    |
| B0-007 | BL-001–BL-025, SC-001–SC-037 | plan uno-a-uno en este archivo                                       | auditoría automática de presencia de IDs           | [x]    |
| B0-008 | Gate 0/1/2/4                 | auditoría final, secretos y estado Git                               | reporte reproducible y veredicto                   | [x]    |

## Bloque 1 — Investigación oficial y fundación técnica

No se instala ni implementa integración antes de completar B1-001 y B1-002.

| ID     | Fuente                                        | Entregable real                                                                                                     | Validación requerida                                             | Estado |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| B1-001 | BL-003, BL-015, BL-019, BL-023, RQ-107–RQ-109 | notas bajo `docs/references/` de Meta, OpenAI, MiniMax, Supabase, framework web/API, Vercel, Cloudflare y EasyPanel | URLs oficiales actuales, capacidades, límites, versiones y fecha | [x]    |
| B1-002 | BL-019, BL-022, BL-023, RQ-107–RQ-109         | ADRs finales de runtime, frameworks, package manager, cola, scheduler y portabilidad LLM                            | cada decisión enlaza evidencia oficial y alternativa descartada  | [x]    |
| B1-003 | BL-023, BL-025                                | monorepo TypeScript con límites `web`, `api`, `worker` y paquetes compartidos ratificados                           | estructura, workspace y comandos funcionan sin mocks             | [x]    |
| B1-004 | BL-025, SC-036                                | versiones exactas, lockfile y política de actualización                                                             | instalación reproducible y auditoría inicial                     | [x]    |
| B1-005 | BL-021, BL-023                                | matriz de entornos y `.env.example` sin valores                                                                     | secret scan y revisión cliente/servidor                          | [x]    |
| B1-006 | BL-025                                        | lint, format, typecheck, unit/integration test y build en CI                                                        | pipeline real en `develop`; fallos bloquean                      | [x]    |
| B1-007 | BL-021, BL-022                                | logging estructurado, taxonomía de errores, IDs de correlación y métricas base                                      | tests de redacción y correlación API→worker                      | [x]    |
| B1-008 | BL-023, SC-031, SC-034                        | Dockerfiles no-root, health/readiness y configuración local                                                         | builds reales, health checks y límites documentados              | [x]    |
| B1-009 | BL-025                                        | artefactos `SECURITY_AUDIT`, `DEPENDENCY_REVIEW` y checklist release iniciales                                      | contenido basado en dependencias/código reales                   | [x]    |

## Bloque 2 — Modelo de datos Supabase, migraciones y RLS

| ID     | Fuente                                | Entregable real                                                                                            | Validación requerida                                                     | Estado |
| ------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| B2-001 | BL-001, BL-002, SC-002–SC-003, SC-032 | endurecimiento de privileges, organizaciones, perfiles de usuario/negocio y membresías                     | migración definitiva, owner invariant, grants/RLS y pruebas cross-org    | [x]    |
| B2-002 | BL-002–BL-004, SC-001–SC-006          | conexiones e identidades de canal, consentimientos, inbox/outbox, conversaciones, participantes y mensajes | identidad siempre scoped a conexión, idempotencia, RLS y estados válidos | [x]    |
| B2-003 | BL-008, BL-009, SC-007–SC-009, RQ-110 | categorías/atributos tipados configurables, productos, variantes, unidades, SKUs, medios y evidencia       | categoría nueva sin deploy; 75/75 pgTAP; CI `31325637856` verde          | [x]    |
| B2-004 | BL-010, SC-010, SC-013, RQ-110        | libros/tiers de precio, unidad, moneda, vigencia y `on_request`                                            | 66/66 pgTAP; CI `31407961615`; 7/7 mutantes y concurrencia verdes        | [x]    |
| B2-005 | BL-011, SC-014, SC-018–SC-019, RQ-110 | unidades inventariables, composición explícita, ubicaciones, movimientos, saldos y reservas                | 110/110 remoto; paquete/kit y no negativo; concurrencia/mutantes CI pendientes | [ ]    |
| B2-006 | BL-006, BL-007, BL-013, SC-011–SC-016 | pendientes, leads, oportunidades, handoffs, pedidos, líneas, estados y ventas                              | pedido ≠ venta, snapshots e idempotencia                                 | [ ]    |
| B2-007 | BL-015, BL-016, SC-021–SC-026         | conexiones sociales, capacidades, publicaciones, lotes, jobs y calendarios                                 | estados, dedupe, cancelación y versionado                                | [ ]    |
| B2-008 | BL-018–BL-022, SC-027–SC-031, SC-037  | configuración versionada, agent runs, tools, auditoría, uso, jobs/attempts                                 | trazabilidad, costo y redacción                                          | [ ]    |
| B2-009 | BL-001, BL-020, BL-021, SC-032        | políticas RLS y grants explícitos para cada entidad                                                        | suite positiva/negativa anon/user/owner/cross-org                        | [ ]    |
| B2-010 | BL-008, BL-020, SC-033                | buckets, paths, políticas y ciclo original/derivado                                                        | aislamiento, MIME/tamaño y URL firmada                                   | [ ]    |
| B2-011 | BL-025, SC-036                        | validación SQL, advisors, tipos generados y documentación ER                                               | reset/migrate/test reproducible y cero hallazgos críticos                | [ ]    |

## Bloque 3 — Herramientas deterministas y workflows del dominio

| ID     | Fuente                                 | Entregable real                                                               | Validación requerida                                              | Estado |
| ------ | -------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| B3-001 | BL-019, SC-029–SC-030                  | registro de tools con contratos, permisos, idempotencia y auditoría           | tool desconocida/argumento inválido/rol incorrecto falla cerrado  | [ ]    |
| B3-002 | BL-002, BL-020, SC-002–SC-003          | resolución de identidad propietario/cliente                                   | matriz de canales/roles y spoofing                                | [ ]    |
| B3-003 | BL-004, BL-005, SC-001, SC-004         | recuperación de contexto publicación-conversación-oferta                      | origen válido/roto/múltiple                                       | [ ]    |
| B3-004 | BL-005, BL-009, BL-014, SC-020, RQ-110 | búsqueda universal de catálogo, candidatos y alternativas                     | distintos rubros, sólo activos/stock real y certeza explícita     | [ ]    |
| B3-005 | BL-008, SC-007, SC-008, SC-009, RQ-110 | ingesta segura y borrador multimodal con categoría/atributos propuestos       | cinco imágenes autorizadas, categoría nueva y casos adversarios   | [ ]    |
| B3-006 | BL-009, BL-010, SC-007–SC-010, RQ-110  | alta/actualización universal de categoría-producto-variante-unidad-SKU-precio | categoría nueva sin código, transacción, conflicto SKU y rollback | [ ]    |
| B3-007 | BL-006, BL-010, SC-011, SC-012, SC-013 | precio pendiente, desambiguación y resolución diferida                        | una/múltiples pendientes y fallo de envío                         | [ ]    |
| B3-008 | BL-011, SC-014, SC-018–SC-019          | adjust/reserve/release/sale/receive                                           | concurrencia, retries y ledger                                    | [ ]    |
| B3-009 | BL-012, BL-013, SC-015–SC-017          | cálculo servidor, pedido, reserva y notificación                              | canales, consentimiento, duplicado y cambio de precio             | [ ]    |
| B3-010 | BL-007, SC-011–SC-013                  | calificación, handoff y reanudación                                           | ambos modos y responsable correcto                                | [ ]    |
| B3-011 | BL-017, BL-018, SC-027–SC-028          | reportes y configuración versionada                                           | zona horaria, definiciones, rollback y permisos                   | [ ]    |

## Bloque 4 — Meta, cola, scheduler e infraestructura staging

| ID     | Fuente                                         | Entregable real                                                              | Validación requerida                                    | Estado   |
| ------ | ---------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------- | -------- |
| B4-001 | BL-003, BL-015, SC-021–SC-026                  | capability matrix de cuenta/App/Página/número reales de AgenteFer            | permisos probados; no inferidos                         | [ ]      |
| B4-002 | BL-003, BL-020, SC-005                         | webhook Meta con firma raw, challenge, replay e idempotencia                 | fixtures oficiales/eventos reales staging               | [ ]      |
| B4-003 | BL-004, SC-001                                 | adaptadores entrantes WhatsApp/Messenger y contexto de publicación           | IDs reales, adjuntos y conversación                     | [ ]      |
| B4-004 | BL-003, SC-006, SC-031                         | salida, ventana/consentimiento/plantillas, estados y retries                 | dentro/fuera ventana, token vencido y dedupe            | [ ]      |
| B4-005 | BL-015, SC-021, SC-024, SC-025, SC-026         | publicación de Página conforme a capacidades verificadas                     | Página staging real, precio vigente y errores           | [ ]      |
| B4-006 | BL-016, BL-022, SC-022, SC-023, SC-024, SC-037 | cola durable, scheduler, leases, dead-letter y conciliación                  | 14:00/18:00, crash after effect y cancelación           | [ ]      |
| B4-007 | BL-023, SC-034                                 | servicios `api` y `worker` en EasyPanel `agente-fer` desde este repo/develop | source exacta, health, límites y cero recursos externos | [ ]      |
| B4-008 | BL-023                                         | Cloudflare/Vercel staging de AgenteFer cuando dominio y web existan          | DNS/TLS/headers/orígenes y rollback                     | [ ]      |
| B4-009 | BL-003–BL-016                                  | E2E Meta→API→worker→LLM/tools→DB→respuesta                                   | conversación real staging y trazas completas            | [ ]      |
| B4-010 | RQ-070, SC-026                                 | Marketplace                                                                  | `NO-BUILD` hasta API/permisos oficiales reales          | NO-BUILD |

## Bloque 5 — Cerebro LLM, voz, visión, memoria y evaluaciones

| ID     | Fuente                                | Entregable real                                                             | Validación requerida                                                  | Estado |
| ------ | ------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| B5-001 | BL-019, SC-029–SC-031, RQ-107–RQ-109  | adaptadores OpenAI/MiniMax y modelo seleccionado con tool calling nativo    | ambas familias reales, cambio por variable, errores, timeout y trazas | [ ]    |
| B5-002 | BL-019, BL-020                        | política/prompt versionado y exposición dinámica de tools                   | owner/cliente/canal/estado reciben tools correctas                    | [ ]    |
| B5-003 | BL-002, SC-002                        | transcripción de notas de voz y confirmación accesible                      | audio real, ruido, idioma y costo/latencia                            | [ ]    |
| B5-004 | BL-008, SC-007–SC-009, SC-033, RQ-110 | visión con evidencia, categoría/atributos propuestos, confianza y preguntas | imágenes reales multirubro y prompt injection visual                  | [ ]    |
| B5-005 | BL-019, SC-029                        | política de memoria, pendientes y configuración durable                     | cliente no envenena memoria/reglas                                    | [ ]    |
| B5-006 | BL-022, SC-030–SC-031                 | budgets, tiers de modelo, cache hash, retry/fallback y alertas              | loop, costo excedido, proveedor caído                                 | [ ]    |
| B5-007 | BL-005–BL-020, SC-001–SC-033, RQ-110  | suite de evaluaciones cognitivas y de tool safety                           | lenguaje natural, catálogo universal, ambigüedad, ventas y ataques    | [ ]    |

## Bloque 6 — Catálogo/QR y experiencia administrativa accesible

| ID     | Fuente                         | Entregable real                                                             | Validación requerida                                                  | Estado |
| ------ | ------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| B6-001 | BL-012, SC-017                 | sistema visual responsive/accesible y estados UX                            | móvil/tablet/desktop, teclado, contraste y lector                     | [ ]    |
| B6-002 | BL-012, SC-017, SC-020, RQ-110 | catálogo público universal/filtrable con empty/loading/error                | categoría nueva visible sin deploy, datos reales y RLS pública mínima | [ ]    |
| B6-003 | BL-012, SC-017, RQ-110         | detalle/galería, opciones, unidad, cantidad y precio dinámico               | rubros distintos, cantidad >4, unidades/atributos dinámicos y agotado | [ ]    |
| B6-004 | BL-013, SC-015–SC-016          | checkout de solicitud con contacto/consentimiento                           | WhatsApp/Messenger, validación y antiabuso                            | [ ]    |
| B6-005 | BL-012, SC-017                 | “consultar precio” con texto/SKU prellenado                                 | URL segura y producto correcto                                        | [ ]    |
| B6-006 | BL-012                         | QR estable y descargable del catálogo                                       | escaneo real y routing                                                | [ ]    |
| B6-007 | BL-017, BL-018, SC-027–SC-028  | panel propietario para catálogo, stock, precios, pendientes y configuración | roles, estados y accesibilidad                                        | [ ]    |
| B6-008 | BL-017                         | reportes interesados/ventas/inventario                                      | definiciones/rangos y exportación autorizada                          | [ ]    |
| B6-009 | BL-025                         | verificación navegador y performance                                        | consola/red, Core Web Vitals objetivo, a11y smoke                     | [ ]    |

## Bloque 7 — Gobierno de uso; pagos fuera de alcance actual

| ID     | Fuente | Entregable real                                                | Validación requerida                                   | Estado   |
| ------ | ------ | -------------------------------------------------------------- | ------------------------------------------------------ | -------- |
| B7-001 | BL-022 | dashboards/alertas de tokens, visión, mensajes y publicaciones | reconciliación contra proveedores                      | [ ]      |
| B7-002 | BL-022 | límites por organización/canal/tarea y override auditado       | bypass/overage y alerta                                | [ ]      |
| B7-003 | RQ-037 | pagos en línea/facturación                                     | no construir hasta requisitos y autorización explícita | NO-BUILD |

## Bloque 8 — Hardening y auditoría integral

| ID     | Fuente                 | Entregable real                                      | Validación requerida                      | Estado |
| ------ | ---------------------- | ---------------------------------------------------- | ----------------------------------------- | ------ |
| B8-001 | BL-001, SC-032         | auditoría RLS/IDOR/BOLA y mínimo privilegio          | suite cross-org completa                  | [ ]    |
| B8-002 | BL-020, SC-005, SC-033 | firma/replay/SSRF/uploads/inyección                  | pruebas adversarias automatizadas         | [ ]    |
| B8-003 | BL-019, SC-029–SC-030  | OWASP LLM/tool overreach/exfiltration/memory         | evals adversariales y approvals           | [ ]    |
| B8-004 | BL-021                 | CSP/CORS/CSRF/headers/XSS/redacción/PII              | DAST/smoke y revisión de logs             | [ ]    |
| B8-005 | BL-021, BL-025, SC-036 | secretos, dependencias, SBOM, contenedores y CI/CD   | cero crítico/alto no aceptado             | [ ]    |
| B8-006 | BL-022, SC-031, SC-037 | caos, retry, dead-letter, conciliación y degradación | provider/worker/DB failure drills         | [ ]    |
| B8-007 | BL-024, SC-035         | retención, exportación, anonimización y eliminación  | PII inventory y casos legales/comerciales | [ ]    |
| B8-008 | BL-025                 | `SECURITY_AUDIT.md` final y checklist release        | hallazgos, evidencia y aceptación         | [ ]    |

## Bloque 9 — Staging sólido y producción separada

| ID     | Fuente         | Entregable real                                                          | Validación requerida                               | Estado |
| ------ | -------------- | ------------------------------------------------------------------------ | -------------------------------------------------- | ------ |
| B9-001 | BL-001–BL-025  | E2E de todos los escenarios aplicables                                   | SC-001–SC-037 con evidencia o NO-BUILD justificado | [ ]    |
| B9-002 | BL-021–BL-023  | observabilidad, alertas, on-call y runbooks                              | simulacro de incidente y trazas                    | [ ]    |
| B9-003 | BL-022, BL-024 | backup/restore, migración y rollback                                     | restauración y rollback reales                     | [ ]    |
| B9-004 | BL-025         | QA funcional, performance, carga, accesibilidad y seguridad              | gates 0–6 completos                                | [ ]    |
| B9-005 | BL-002–BL-018  | UAT accesible con Fer usando voz, catálogo, cliente y handoff            | aceptación documentada y correcciones              | [ ]    |
| B9-006 | BL-023, SC-034 | recursos productivos exclusivos AgenteFer, rama `main` y secretos nuevos | matriz de aislamiento y smoke productivo           | [ ]    |
| B9-007 | BL-025, SC-036 | release record, riesgos conocidos y plan de rollback                     | aprobación explícita antes de tráfico real         | [ ]    |

## Matriz de cobertura

- BL-001–BL-005 → B1, B2-001/002/009, B3-002/003/004, B4, B8, B9.
- BL-006–BL-010 → B2-003/004/006, B3-005/006/007/010, B5, B9.
- BL-011–BL-014 → B2-005/006, B3-004/008/009, B6, B9.
- BL-015–BL-018 → B2-007/008, B3-011, B4-001/005/006, B6-007/008, B9.
- BL-019–BL-022 → B1, B2-008, B3-001, B4-006, B5, B7, B8, B9.
- BL-023–BL-025 → B1, B4-007/008, B8, B9.
- SC-001–SC-006 → B2-001/002, B3-002/003, B4-002/003/004, B9-001.
- SC-007–SC-013 → B2-003/004/006, B3-005/006/007/010, B5-004, B9-001.
- SC-014–SC-020 → B2-005/006, B3-004/008/009, B6-002–B6-005, B9-001.
- SC-021–SC-028 → B2-007/008, B3-011, B4-001/005/006, B6-007/008, B9-001.
- SC-029–SC-037 → B1-005–B1-009, B2-009/010, B3-001, B5, B8, B9.
- RQ-110 → ADR-011, B2-003/004/005, B3-004/005/006/008/009, B5-004/007, B6-002/003/005/007 y B9-001/005.

## Gate actual

- Project boundary: aprobado.
- Requirement/business/spec coverage: `MATCH PERFECT` (RQ-001–110, BL-001–025 y SC-001–037; cero faltantes).
- Technical ingestion: aprobada para B1-001/B1-002; scaffold B1-003 y dependencias B1-004 verificados.
- Functional implementation: B2-003/B2-004 completos; núcleo de stock B2-005 aplicado con 385/385 pgTAP remoto y cierre CI pendiente. Tools, adapters y UI todavía pendientes.
- External integrations: no configuradas.
- Production: no creada.

## Evidencia de cierre del Bloque 0

- Git root: `C:/Users/figod/Desktop/agentefer`.
- Rama: `develop`.
- Remoto: `https://github.com/frankzuuia/agentefer.git`.
- Supabase ref enlazado: `hprdctmblmfcoagugvyp`.
- Recursos no-AgenteFer referenciados: 0.
- Secretos detectados en archivos versionables: 0.
- IDs faltantes en cross-match: 0.
- Veredicto: **MATCH PERFECT para especificación y plan de ejecución**.

## Evidencia parcial del Bloque 1

- Investigación oficial fechada: `docs/references/OFFICIAL_DOCUMENTATION_REVIEW.md`.
- Baseline técnico aceptado: `docs/architecture/ADR-009-TECHNICAL-BASELINE.md`.
- Portabilidad OpenAI/MiniMax aceptada: `docs/architecture/ADR-010-MODEL-PROVIDER-PORTABILITY.md`.
- Catálogo universal data-driven aceptado: `docs/architecture/ADR-011-UNIVERSAL-CATALOG.md`.
- Auditoría RQ-110: `docs/quality/UNIVERSAL-CATALOG-AUDIT.md` (`MATCH PERFECT`; núcleo B2-003 y precios B2-004 completos; stock B2-005 aplicado y pendiente de cierre CI).
- Onboarding de modelos futuros: `docs/operations/MODEL-ONBOARDING-PLAYBOOK.md`.
- Gates de QA: `docs/quality/QUALITY-STRATEGY.md`.
- Auditoría reproducible: `docs/quality/B1-DOCUMENTATION-AUDIT.md`.
- Scaffold y límites: `docs/architecture/REPOSITORY-BOUNDARIES.md`.
- Auditoría B1-003: `docs/quality/B1-SCAFFOLD-AUDIT.md`.
- Selección de dependencias B1-004: `docs/references/DEPENDENCY-SELECTION-B1-004.md`.
- Auditoría B1-004: `docs/quality/B1-DEPENDENCY-AUDIT.md`.
- Contrato de entornos B1-005: `docs/architecture/ENVIRONMENT-CONTRACT.md`.
- Auditoría B1-005: `docs/quality/B1-ENVIRONMENT-AUDIT.md`.
- Auditoría B1-006: `docs/quality/B1-CI-AUDIT.md` (`COMPLETE`; run remoto registrado).
- Contrato de observabilidad B1-007: `docs/architecture/OBSERVABILITY-CONTRACT.md`.
- Selección de dependencias B1-007: `docs/references/DEPENDENCY-SELECTION-B1-007.md`.
- Auditoría B1-007: `docs/quality/B1-OBSERVABILITY-AUDIT.md` (`COMPLETE` local y remoto).
- Contrato de contenedores B1-008: `docs/architecture/CONTAINER-RUNTIME-CONTRACT.md`.
- Auditoría B1-008: `docs/quality/B1-CONTAINER-AUDIT.md` (`COMPLETE`; Docker real verificado en CI).
- Política de dependencias B1-009: `dependency-policy.json` y `scripts/verify-dependency-policy.mjs`.
- Auditoría B1-009: `docs/quality/B1-SECURITY-GATE-AUDIT.md` (`COMPLETE` local y remoto).
- B1-001/B1-002: completos documentalmente.
- B1-003: scaffold estructural verificado.
- B1-004: runtime, dependencias exactas, lockfile, licencias, firmas y auditorías verificados.
- B1-005: variables por proceso, ejemplos vacíos, redacción y secret scan verificados.
- B1-006: gates locales y workflow `Quality` remoto aprobados en `develop`, con Actions Node 24 fijadas por SHA y cero annotations.
- B1-007: logging/redacción, errores, W3C API→worker y métricas base aprobados; API/worker ya consumen logger/readiness.
- B1-008: runtime API/worker, Dockerfiles, Compose y gate aprobados; build/run Docker real y shutdown verificados en CI.
- B1-009: artefactos y política de seguridad aprobados local/remoto. Bloque 1 completo; no existe despliegue.

## Evidencia de B2-001

- Contrato físico: `docs/architecture/DATABASE-FOUNDATION-B2-001.md`.
- Investigación oficial/estado real: `docs/references/SUPABASE-B2-001-RESEARCH.md`.
- Migración definitiva: `supabase/migrations/20260804001247_b2_001_database_foundation.sql`; SHA-256 aplicado en staging `2C7C1DDC89992562F1BE0C280CE89DA2041CBBFC85E0644B6896B8D191880313`.
- Migración Supabase staging registrada: versión `20260804001247`, nombre `b2_001_database_foundation`, proyecto `hprdctmblmfcoagugvyp`.
- Estado remoto: cuatro tablas privadas, cuatro policies, cuatro vistas `security_invoker/security_barrier`, RLS forzado 4/4, acceso `anon` 0 y filas reales 0.
- Tipos: `packages/database/src/database.types.ts`; CI los regenera desde migraciones y bloquea drift.
- QA SQL: 49 aserciones pgTAP, lint `app_private,api` y advisors security/performance ejecutados contra PostgreSQL/Supabase real en CI.
- Advisors remotos: seguridad 0 hallazgos; rendimiento únicamente `INFO unused_index` esperado sobre tablas recién creadas sin filas.
- CI verificado: run `30865955556` (`Verify` 1m45s, `Database contract` 2m29s, `Container runtime` 53s), conclusión `success`, 0 annotations en los tres jobs.
- Auditoría final: `docs/quality/B2-001-DESIGN-AUDIT.md` (`COMPLETE`, `INTEGRITY TOTAL`, `MATCH PERFECT`).

## Evidencia de B2-002

- Investigación oficial: `docs/references/CHANNELS-B2-002-RESEARCH.md`.
- Contrato físico: `docs/architecture/CHANNELS-MESSAGING-B2-002.md`.
- Migración definitiva: `supabase/migrations/20260804011126_b2_002_channels_messaging.sql`; SHA-256 aplicado en staging `BFE2498157AC299C6119786AB9EBEF2A7CD4E379E1534A7DCD04C57256A6D879`.
- Migración Supabase staging registrada: versión `20260804011126`, nombre `b2_002_channels_messaging`, proyecto `hprdctmblmfcoagugvyp`.
- Estado remoto acumulado: 14 tablas privadas con RLS forzado 14/14, 12 policies, 12 vistas, acceso `anon` 0 y filas reales B2-002 0.
- QA SQL: 85 aserciones pgTAP B2-002, 134 acumuladas, migraciones desde cero, lint, advisors y tipos reproducibles sin drift sobre Supabase real aislado.
- Advisors remotos: dos `INFO rls_enabled_no_policy` intencionales para inbox/outbox privados y `INFO unused_index` esperado sobre tablas sin tráfico; cero hallazgos críticos/altos.
- CI final verificado: run `30870893413` sobre commit `92a0783eb032c39efd4d6bd09d4d7e02f931798b`; `Verify`, `Container runtime` y `Database contract` concluyeron `success`, con 0 annotations.
- Auditoría final: `docs/quality/B2-002-DESIGN-AUDIT.md` (`COMPLETE`, `INTEGRITY TOTAL`, `MATCH PERFECT`).

## Evidencia de B2-003

- Contrato físico: `docs/architecture/UNIVERSAL-CATALOG-B2-003.md`.
- Migración base: `supabase/migrations/20260809095510_b2_003_universal_catalog.sql`; SHA-256 `D754E2067D02DA1FAE1C4C92E950E4B53C58B4C8BDE98AF59C5E9D28784CA884`.
- Hardening de regresión: `supabase/migrations/20260809101909_b2_003_catalog_trigger_hardening.sql`; SHA-256 `91C76E8E789926E52CBB15CFA53ABEAA2C6BF006F69E8B4BEA91540326B8DCAB`.
- Supabase AgenteFer: proyecto enlazado `hprdctmblmfcoagugvyp`; ambas versiones remotas registradas.
- Estado remoto acumulado: 30 tablas privadas con RLS forzado; B2-003 aporta 16 tablas, 16 policies y 14 vistas seguras.
- QA remoto: 75/75 pgTAP transaccionales, linter `app_private,api` sin errores y advisors sin hallazgos.
- QA de código final: 90 pruebas, 93.94% líneas, 93.75% statements, 93.05% funciones y 89.57% ramas; 112/112 mutantes de código eliminados; 20/20 corridas de estrés de entrypoints y 3/3 suites completas posteriores a la regresión del harness.
- CI final verificado: run `31325637856` sobre commit `e17b7463e4fa40dae4a2a8018906574f09d19524`; `Verify` (`93275431303`), `Database contract` (`93275639641`) y `Container runtime` (`93275639658`) concluyeron `success`.
- Contrato DB en CI: cuatro migraciones desde cero, 209 pgTAP acumuladas, carrera de SKU, 3/3 mutantes de esquema eliminados, lint/advisors y tipos normalizados sin drift.
- Supply chain en CI: `npm audit` sin vulnerabilidades, 546 firmas de registro y 145 attestations verificadas.
- Auditoría final: `docs/quality/B2-003-DESIGN-AUDIT.md` (`COMPLETE`, `INTEGRITY TOTAL`, `MATCH PERFECT`).

## Evidencia final de B2-004

- Investigación oficial: `docs/references/PRICING-B2-004-RESEARCH.md`.
- Contrato físico: `docs/architecture/PRICING-B2-004.md`.
- Migración: `supabase/migrations/20260809200347_b2_004_pricing.sql`; SHA-256 `61FFDC0FA104BDB236B8F38C2226816A71DFFF22659F4C1ABB1D80077BCF065C`.
- Hardening monotónico: `supabase/migrations/20260809201842_b2_004_monotonic_updated_at.sql`; SHA-256 `0BF40BF2F60FD3A1EF88B638F7CE4F1534EE4EB20BFA036AF4F2E96B6E19BF1B`.
- Hardening de índice FK: `supabase/migrations/20260810155350_b2_004_price_book_creator_index.sql`; SHA-256 `74D669CE1E102156ACB8CD76C5F6B03A94B6E953F63B66A87CADB67A91D53E87`.
- Supabase AgenteFer: proyecto `hprdctmblmfcoagugvyp`; las siete migraciones están sincronizadas.
- QA remoto: ensayos migración+pgTAP con rollback y regresión persistida 275/275 (49 + 85 + 75 + 66), también transaccional.
- Contrato acumulado: siete migraciones, 32 tablas con RLS forzado y 275 aserciones pgTAP.
- Tipos: regenerados desde remoto para `app_private,api` con libros, tiers, historial tipado y resolver exacto.
- QA de código final: 95 pruebas, 94.02% líneas, 93.83% statements, 93.10% funciones y 89.57% ramas; 112/112 mutantes de código eliminados.
- Contrato DB previo al index hardening: run `31334187729` verde con seis migraciones, 274 pgTAP, carreras SKU/precio y 6/6 mutantes.
- Gate final: run `31407961615` sobre `4c6796037d7cb45a83d9b7e11942dc2c0ba66f04`; `Verify` `93518794936`, `Database contract` `93519526341` y `Container runtime` `93519526510`, todos `success` y con 0 annotations.
- Base aislada final: siete migraciones desde cero, 275/275 pgTAP, SKU/precio con un commit y un conflicto, 7/7 mutantes eliminados, lint/advisors y tipos sin drift.
- Supply chain: 0 vulnerabilidades, 546 firmas de registro y 145 attestations verificadas.
- Auditoría final: `docs/quality/B2-004-DESIGN-AUDIT.md` (`COMPLETE — INTEGRITY TOTAL — MATCH PERFECT`).

## Evidencia provisional de B2-005 — pendiente de CI

- Investigación oficial: `docs/references/INVENTORY-B2-005-RESEARCH.md`.
- Contrato físico: `docs/architecture/INVENTORY-B2-005.md`; aceptación: `features/b2_005_inventory.feature`.
- Migración `20260811214250_b2_005_inventory.sql`; SHA-256 `9542D6C8878A4115B455A01E66D4D6E13D3AB9895CB3097F1B43B3F15CE4D605`.
- Supabase AgenteFer `hprdctmblmfcoagugvyp`: historial 8/8; dry-run exacto sin seeds/roles; aplicación atómica.
- Ensayo con rollback 110/110 y regresión persistida 385/385 pgTAP.
- Contrato acumulado: 44 tablas con RLS forzado; 13 vistas B2-005 invoker/barrier; cinco RPC mutadoras sólo para `service_role` y resolver autenticado.
- Lint y advisors remotos: cero hallazgos; tipos `app_private,api` regenerados.
- Gate local: 95/95, cobertura 93.83% statements/89.57% ramas/93.10% funciones/94.02% líneas, 112/112 mutantes de código, 0 vulnerabilidades.
- Auditoría provisional: `docs/quality/B2-005-DESIGN-AUDIT.md`; falta CI Docker para carreras y 14 mutantes SQL antes de marcar `[x]`.
