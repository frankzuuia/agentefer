# AgenteFer — auditoría de entorno B1-005

Fecha: 2026-08-03.  
Raíz: `C:/Users/figod/Desktop/agentefer`.  
Rama: `develop`.  
Remoto: `https://github.com/frankzuuia/agentefer.git`.

## Entregables

- Contrato tipado: `packages/config/src/`.
- Ejemplos sin valores: `apps/web/.env.example`, `apps/api/.env.example`, `apps/worker/.env.example`.
- Matriz de proceso/clasificación: `docs/architecture/ENVIRONMENT-CONTRACT.md`.
- Pruebas: `packages/config/test/environment.test.ts`.
- Dependencia nueva: `zod@4.4.3`, exacta, MIT, sin dependencias propias ni scripts de instalación, con firma y attestation del registry.

## Fronteras comprobadas

| Proceso | Variables | Secretos permitidos                       | Exposición pública                   |
| ------- | --------: | ----------------------------------------- | ------------------------------------ |
| web     |         8 | ninguno                                   | sólo cinco `NEXT_PUBLIC_*` aprobadas |
| api     |        11 | Supabase secret key propia                | ninguna variable secreta pública     |
| worker  |        18 | Supabase + OpenAI/MiniMax según selección | ninguna                              |

Las listas exportadas del parser se comparan automáticamente con cada `.env.example`; una divergencia rompe la suite.

## Seguridad implementada

- staging/production requieren HTTPS y commit SHA completo;
- URL Supabase debe coincidir con el project ref declarado;
- sólo `sb_publishable_*` se acepta como llave web;
- sólo `sb_secret_*` se acepta para Supabase privilegiado;
- variables `NEXT_PUBLIC_*` con apariencia de secreto fallan cerrado;
- secretos tipados se serializan como `[REDACTED]` y sólo se obtienen mediante `reveal()` explícito;
- los errores incluyen nombre/regla, nunca el valor recibido;
- API y worker tienen contratos separados para recibir secret keys rotables distintas;
- IA acepta model IDs arbitrarios bajo `provider:model` sin enum cerrado;
- visión hereda el modelo principal; fallback vacío significa desactivado;
- OpenAI/MiniMax exigen su credencial sólo cuando un selector los usa;
- límites configurables conservan ceilings absolutos de tokens, timeout, tools y fallback.

## Validación ejecutada

- TypeScript 6 strict, `--noEmit`: aprobado.
- Prettier check sobre código/matriz: aprobado.
- Vitest: 1 archivo, 15 pruebas aprobadas.
- Ejemplos: 8/11/18 variables, todos los valores vacíos, sin duplicados y no ignorados por Git.
- Workspace boundary: 9 paquetes verificados.
- `npm audit` completo: 0 vulnerabilidades.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Dependencias directas actuales: 19.
- Archivos `.env` no-example versionables: 0.
- Patrones de secretos fuera de dependencias/docs: 0.
- Referencias a los marcadores conocidos de proyectos ajenos: 0.

## Decisiones diferidas sin asunción

- Variables/credenciales Meta: B4-001, después de verificar App/Página/WABA/número/permisos reales.
- Cloudflare/Vercel: B4-008; se solicitará acceso mínimo al usuario justo antes.
- Exportador de observabilidad: B1-007.
- Valores reales de staging: secret stores de EasyPanel/Vercel cuando existan artefactos desplegables.
- Recursos y secretos de producción: B9, nuevos y separados.

## Estado local no versionable

La cuarentena `.npm/stale-node_modules-b1-004` y `%TEMP%/agentefer-audit.json` permanecen porque la política bloqueó su eliminación antes de ejecutarse. La primera está ignorada por Git; ninguno participa en build/resolución ni contiene un repositorio.

## Veredicto

- B1-005: aprobado.
- Secretos reales escritos/conectados: 0.
- Infraestructura mutada: 0.
- Código funcional de canal/LLM: 0.
- Siguiente gate: B1-006, configuración ejecutable de lint/format/typecheck/test/build y CI sobre `develop`.
