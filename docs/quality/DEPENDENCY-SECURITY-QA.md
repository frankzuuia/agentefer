# QA — Dependencias y supply chain

## Estado

**Gate autónomo cerrado.** El cambio está validado en `develop`; no constituye por
sí mismo un despliegue productivo.

## Cambios revisados

| Paquete/ámbito | Antes | Después | Motivo |
| --- | --- | --- | --- |
| `next`, `eslint-config-next` | 16.2.12 | 16.3.5 | corregir advisories críticos de Next y Sharp |
| `sharp` (web/worker/override) | 0.35.3 | 0.35.4 | corregir vulnerabilidades de libheif |
| `vitest`, `@vitest/coverage-v8` | 4.1.10 | 4.1.11 | corregir advisory de mocker/path traversal |
| `js-yaml` override | 4.3.1 transitivo | 4.3.2 | corregir advisory de merge keys |

Los binarios opcionales de Sharp cambiaron a las familias `@img/sharp-libvips-*`
1.3.3 y `@img/sharp-*` 0.35.4. La política de dependencias conserva sus
obligaciones LGPL y exige revisión de avisos/relinking en el gate B8.

## Evidencia

```text
npm ls next sharp js-yaml vitest @vitest/mocker @vitest/coverage-v8 --all  PASS
npm audit --audit-level=high                         0 vulnerabilities
npm audit --omit=dev --audit-level=high              0 vulnerabilities
npm run verify:dependency-policy                     PASS
npm run format:check                                 PASS
npm run lint                                         PASS
npm run typecheck                                    PASS
npm run test:coverage                                46 files, 1,141 tests PASS
npm run build                                        PASS
npm run verify:acceptance-contract                   398 scenarios PASS
npm run verify:process-runtime                       API/worker PASS
```

## Límites

Este bloque no rota credenciales, no cambia configuración de EasyPanel y no aplica
migraciones Supabase. Las pruebas externas de Storage/Meta siguen requiriendo
credenciales administradas fuera del repositorio y una ventana controlada.
