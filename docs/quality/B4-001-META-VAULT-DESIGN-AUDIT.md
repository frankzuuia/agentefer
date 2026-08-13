# AgenteFer — auditoría de diseño Vault Meta B4-001

Estado: **VAULT INFRASTRUCTURE CERTIFIED — META CAPABILITY MATRIX PENDING**.  
Fecha: 2026-08-13.  
Proyecto objetivo: `hprdctmblmfcoagugvyp` (`AgenteFer`).  
Rama: `develop`.

## Alcance certificado

- Tres tablas tenant-aware nuevas; total persistido: 92 tablas privadas con RLS
  habilitada y forzada.
- Tres vistas seguras sin `vault_secret_id`, secreto ni valor descifrado.
- Alta atómica, rotación versionada, challenge y HMAC sobre bytes crudos.
- Dos organizaciones QA independientes; cero IDs de cuenta productiva en SQL.
- Cuatro tipos de credencial separados y enlace compuesto canal–organización–App.
- Historial append-only y auditoría sin material secreto.
- Data API limitado a `api, graphql_public` por migración reproducible.

## Autopsias realizadas

1. La primera compilación detectó sintaxis plural inválida al revocar funciones;
   se corrigió antes de persistir nada.
2. PostgreSQL rechazó insertar una columna en medio de una vista existente; se
   preservó el orden histórico y se añadió al final.
3. La prueba inicial asumía que podía revocarse el acceso Vault interno de
   `service_role`. Supabase restaura ese privilegio administrado y el rol posee
   `BYPASSRLS`. La frontera se corrigió al modelo real: Vault fuera de
   PostgREST, secreto no proyectado y RPCs mínimas que no lo devuelven.

Ninguno de esos intentos fallidos se persistió: todos se ejecutaron dentro de
`BEGIN … ROLLBACK`. Después se aplicaron únicamente las dos migraciones
forward-only revisadas. El postflight confirmó cero metadata y cero secretos QA residuales.

## Evidencia remota verde

- Historial Supabase AgenteFer: 15/15 migraciones locales y remotas alineadas.
- Esquema persistido: 92/92 tablas privadas con RLS habilitada y forzada.
- Regresión acumulada: 782/782 pgTAP en diez archivos.
- B4-001: 51/51 pgTAP.
- Mutation testing SQL enlazado: 11/11 mutantes críticos eliminados (100%) y
  rollback independiente por mutante.
- Autorización B2-009 actualizada: 82/82 pgTAP.
- Mensajería B2-002: 85/85 pgTAP.
- Flujo comercial B2-006: 97/97 pgTAP.
- Runtime cognitivo B2-008: 84/84 pgTAP.
- Compilación real PostgreSQL 17 y rollback exitosos.
- Vault QA después de la ejecución: cero secretos residuales.
- Data API: `api` responde; `vault`, `app_private` y `public` son rechazados.
- Lint y advisors de seguridad/rendimiento: cero hallazgos.
- Tipos TypeScript regenerados desde remoto y resincronizados con `drift=false`.

## Pendientes para cerrar B4-001

- ejecutar el pipeline CI de la rama con la suite limpia y los 58 mutantes SQL
  acumulados;
- construir B4-002 y probar challenge/firma mediante HTTPS real;
- capturar la capability matrix de App/Página/WABA/número/permisos reales.

La fila B4-001 de `PROGRESS.md` permanece abierta porque su entregable final es
la matriz real de capacidades Meta. Esta auditoría acredita la infraestructura
de secretos; no finge que Meta ya está conectado.
