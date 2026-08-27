# AgenteFer — límites del monorepo

Estado: contrato ejecutable de B1-003.  
Fuente: ADR-009 y ADR-010.

## Raíces npm

- `apps/*` contiene procesos o aplicaciones desplegables.
- `packages/*` contiene módulos internos; ninguno se publica al registry.
- Todos los workspaces son privados y ESM.
- Runtime fijado en B1-004: Node 24.18.0 y npm 11.16.0.

## Aplicaciones

| Workspace           | Responsabilidad                                | Puede depender internamente de                         | No puede                                             |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| `@agentefer/web`    | catálogo, QR, pedido y panel accesible         | config, contracts, domain, observability               | conectar DB privilegiada, Meta o runtime LLM         |
| `@agentefer/api`    | auth, webhooks, consultas y enqueue            | config, contracts, database, domain, observability     | esperar al LLM o depender de ai                      |
| `@agentefer/worker` | cola, agente, tools, medios y efectos externos | ai, config, contracts, database, domain, observability | exponer frontend o confiar en input sin autorización |

## Paquetes

| Workspace                  | Responsabilidad                                    | Dependencias internas permitidas |
| -------------------------- | -------------------------------------------------- | -------------------------------- |
| `@agentefer/ai`            | runtime y adaptadores OpenAI/MiniMax/futuros       | config, contracts, observability |
| `@agentefer/config`        | lectura, validación y redacción de env por proceso | ninguna                          |
| `@agentefer/contracts`     | contratos de bordes, eventos y tools               | domain                           |
| `@agentefer/database`      | acceso y transacciones Supabase/Postgres           | domain, observability            |
| `@agentefer/domain`        | invariantes puras del negocio                      | ninguna                          |
| `@agentefer/observability` | logs, trazas, métricas y correlación               | ninguna                          |

## Reglas de conexión

1. Domain no conoce HTTP, UI, Supabase, Meta ni proveedores LLM.
2. Contracts traduce bordes a conceptos del dominio; no ejecuta efectos.
3. Database implementa persistencia; no decide intención ni redacta respuestas.
4. AI transforma protocolos de modelos; no modifica directamente la base.
   Sólo consume de config el contenedor no serializable `SensitiveValue` para credenciales.
5. Worker conecta AI, tools autorizadas y adaptadores externos.
6. API autentica/persiste/encola y responde rápido.
7. Web consume contratos públicos/autorizados y nunca recibe secret keys.
8. Una integración nueva entra por adapter dentro del paquete/proceso dueño.

## Verificación ejecutable

El script `scripts/verify-workspaces.mjs` comprueba:

- las dos raíces exactas;
- los nueve workspaces exactos;
- nombres únicos;
- `private: true`;
- ESM;
- major de Node coherente;
- dependencias internas contra allowlist.

Comandos:

    npm run verify:workspaces
    npm pkg get name --workspaces

## Estado del scaffold

B1-003 crea fronteras y manifiestos, no implementaciones funcionales.  
Next.js, Fastify, TypeScript y el toolchain de pruebas se incorporaron y auditaron en B1-004. Su configuración ejecutable y CI corresponden a B1-006.
