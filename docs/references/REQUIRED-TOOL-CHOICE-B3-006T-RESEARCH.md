# B3-006T — selección obligatoria de herramienta

Fecha de revisión: 2026-09-21.

## Fuentes primarias

- OpenAI, [Function calling — Tool choice](https://developers.openai.com/api/docs/guides/function-calling#tool-choice): `required` obliga al modelo a llamar una o más herramientas.
- MiniMax, [Chat Completions compatible con OpenAI](https://platform.minimax.io/docs/api-reference/text-chat-openai): la ruta documenta herramientas nativas, aunque el esquema público consultado no enumera `tool_choice=required`.

## Evidencia del proveedor usado por AgenteFer

Se ejecutó una prueba acotada contra `https://api.minimax.io/v1/chat/completions`, usando el
modelo configurado `MiniMax-M3`, una herramienta únicamente de lectura y el secreto ya presente
en `agente-fer/worker`. No se imprimió ni persistió el secreto y no se modificaron productos.

| Petición | HTTP | Terminación | Evidencia |
| --- | --- | --- | --- |
| selección predeterminada | 200 | `tool_calls` | `catalog_manage_context` |
| `tool_choice=required` | 200 | `tool_calls` | `catalog_manage_context` |

Conclusión: el proveedor activo acepta la opción aunque no esté enumerada en esa página pública.
La aplicación conserva una barrera durable que rechaza cualquier supuesto éxito sin ejecución
terminal auditada, para fallar cerrado si el proveedor cambia o ignora la opción.
