# AgenteFer — auditoría del gate inicial de seguridad B1-009

Fecha: 2026-08-03.  
Raíz: `C:/Users/figod/Desktop/agentefer`.  
Rama: `develop`.  
Estado: `COMPLETE` local; publicación/CI remoto pendientes.

## Artefactos

- `docs/security/SECURITY_AUDIT.md`.
- `docs/security/DEPENDENCY_REVIEW.md`.
- `docs/security/RELEASE_SECURITY_CHECKLIST.md`.
- `dependency-policy.json`.
- `scripts/verify-dependency-policy.mjs`.

## Evidencia del árbol real

| Medida | Resultado |
| ------ | --------: |
| manifests | 10 |
| workspaces privados | 9 |
| declaraciones externas directas exactas | 23 |
| entradas package-lock v3 | 576 |
| artefactos `registry.npmjs.org` | 557 |
| artefactos registry sin integrity | 0 |
| artefactos registry sin licencia | 0 |
| lifecycle packages revisados | 3, todos dev-only |
| familias con LGPL/MPL revisadas | 4 |
| vulnerabilidades auditadas | 0 |
| firmas/attestations | 449/109 |

## Política automatizada

El verificador descubre manifests y no contiene la lista de workspaces. Comprueba:

1. workspaces privados/UNLICENSED e internos resueltos por npm workspaces;
2. versiones externas semver exactas;
3. lockfileVersion 3;
4. origen único `registry.npmjs.org`;
5. integridad y licencia en cada artefacto externo;
6. allowlist exhaustiva de expresiones de licencia;
7. prohibición GPL/AGPL;
8. lifecycle scripts exactos, justificados y dev-only;
9. familias LGPL/MPL exactas, versionadas y justificadas;
10. detección de aprobaciones obsoletas en la política.

La allowlist es una frontera de supply chain. No decide intención, conversación ni regla comercial; cualquier cambio requiere revisión explícita del paquete real.

## Límites honestos

- `npm audit` sólo cubre advisories conocidos del ecosistema npm.
- B1 no genera todavía SBOM CycloneDX/SPDX ni escanea capas OCI; eso permanece en B8-005.
- No se ha construido el frontend, por lo que obligaciones de distribución se cierran antes del release, no se declaran satisfechas ahora.
- Supabase CLI sigue sin versión fijada dentro del repositorio y no está autorizado para automatización.
- SDKs futuros de Meta/Supabase/LLM deberán pasar el mismo gate antes de incorporarse.
- Producción continúa bloqueada.

## Veredicto local

- Contenido basado en manifests, lockfile, árbol instalado y runs reales: aprobado.
- `npm run verify` con deprecaciones como error: aprobado.
- Vitest: 8 archivos y 30 pruebas aprobadas.
- TypeScript/lint/format/build y procesos API/worker: aprobados.
- `npm audit` completo/producción: 0 vulnerabilidades.
- Firmas/attestations: 449/109 verificadas.
- Hallazgos críticos/altos: 0.
- Excepciones ocultas: 0; lifecycle y licencias recíprocas están documentados.
- Infraestructura externa mutada: 0.
- B1-009 se cerrará tras CI remoto verde sobre el commit exacto.
