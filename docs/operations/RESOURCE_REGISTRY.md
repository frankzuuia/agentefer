# AgenteFer — registro autorizado de recursos

Estado: fuente canónica de frontera operacional.  
Regla de denegación: cualquier recurso no listado aquí se considera fuera de alcance y no puede consultarse, conectarse, modificarse ni desplegarse desde AgenteFer.

## Código fuente

| Tipo       | Identificador autorizado                      | Estado                      |
| ---------- | --------------------------------------------- | --------------------------- |
| Ruta local | `C:\Users\figod\Desktop\agentefer`            | activa                      |
| GitHub     | `https://github.com/frankzuuia/agentefer.git` | activo                      |
| Desarrollo | rama `develop`                                | activa                      |
| Producción | rama `main`                                   | reservada; sin push directo |

## Supabase

| Campo                     | Valor autorizado       |
| ------------------------- | ---------------------- |
| Nombre                    | `AgenteFer`            |
| Project ref               | `hprdctmblmfcoagugvyp` |
| Región                    | `us-west-1`            |
| Uso actual                | desarrollo/staging     |
| Estado observado al crear | `ACTIVE_HEALTHY`       |

Restricciones:

- El `project-ref` debe verificarse antes de migración, configuración o consulta administrativa.
- No conectar esta aplicación a otra base Supabase.
- Producción requerirá un proyecto nuevo, exclusivo y agregado aquí tras autorización.

## EasyPanel

| Campo                    | Valor autorizado |
| ------------------------ | ---------------- |
| Proyecto                 | `agente-fer`     |
| Servicios actuales       | ninguno          |
| Servicios reservados     | `api`, `worker`  |
| Rama prevista de staging | `develop`        |

Restricciones:

- Solo usar operaciones MCP dirigidas con `projectName: agente-fer`.
- No usar enumeración global para construir o configurar AgenteFer.
- No crear servicios hasta existir Dockerfile, health checks y build verificado.
- Producción requerirá recursos exclusivos y registro previo aquí.

## Recursos todavía no creados o vinculados

| Sistema                 | Estado          | Condición para agregarlo                         |
| ----------------------- | --------------- | ------------------------------------------------ |
| Meta App                | no configurada  | cuenta/app/permisos reales AgenteFer verificados |
| WhatsApp Business       | no configurado  | número/cuenta AgenteFer autorizados              |
| Facebook Page/Messenger | no configurados | Página y permisos AgenteFer autorizados          |
| Vercel                  | no configurado  | proyecto web exclusivo desde este repo           |
| Cloudflare              | no configurado  | dominio/zona/rutas exclusivas definidas          |
| Dominio público         | no definido     | decisión de identidad comercial                  |
| Supabase producción     | no creado       | gate staging y autorización de producción        |
| EasyPanel producción    | no creado       | gate staging y autorización de producción        |

## Procedimiento para autorizar un recurso nuevo

1. Fer/propietario autoriza finalidad y proveedor.
2. Se verifica identidad, cuenta, proyecto y aislamiento reales.
3. Se documentan permisos mínimos, secretos requeridos y costo/límites.
4. Se añade el identificador no secreto a este registro.
5. Se implementan pruebas de frontera y rollback.
6. Solo entonces se permite conexión o mutación.

## Datos prohibidos en este registro

- tokens;
- contraseñas;
- API keys;
- connection strings con credenciales;
- secretos de webhook;
- claves privilegiadas;
- PII de clientes.
