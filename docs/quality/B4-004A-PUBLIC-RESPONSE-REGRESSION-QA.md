# B4-004A — QA de respuesta pública limpia

Fecha: 2026-08-27.  
Incidente de regresión: MiniMax devolvió razonamiento y un sobre `content_kind` dentro de
`message.content`; el adapter declaró todo el campo como texto visible y WhatsApp lo entregó al
cliente.

## Invariantes verificables

1. Toda solicitud MiniMax OpenAI-compatible incluye `reasoning_split: true`.
2. Un mensaje normalizado con `content_kind=text` entrega al proveedor únicamente su cuerpo humano.
3. Contenido no textual conserva su sobre estructurado para no perder tipo ni metadatos.
4. `reasoning_details` no forma parte de `CognitiveTurnResult.visibleText`, metadata segura, logs ni
   payload de WhatsApp.
5. No se usan regex ni reglas de intención; la proyección sólo decodifica el contrato determinista
   del canal y el LLM conserva la redacción.

## Procedimiento reproducible

1. Desde la raíz del repositorio, ejecutar
   `npx vitest run packages/ai/test/provider.test.ts packages/ai/test/output-policy.test.ts`.
2. Ejecutar cobertura global con `npm run test:coverage` y comprobar las rutas modificadas.
3. Ejecutar mutation testing dirigido a `packages/ai/src/provider.ts`; la meta es al menos 90 % y
   ningún mutante superviviente en la nueva frontera de serialización/separación.
4. Ejecutar `npm run lint`, `npm run typecheck`, `npm run build` y el verificador Gherkin.
5. En staging, enviar `hola quien eres?` desde un cliente real y comprobar que WhatsApp recibe sólo
   la respuesta comercial, mientras las métricas conservan terminación/uso sin razonamiento crudo.

## Métricas y SLO

- Fuga de razonamiento o sobre interno a mensajes públicos: **0**.
- Respuestas públicas vacías aceptadas: **0**.
- Regresiones de roles, herramientas y contenido no textual en adapters: **0**.
- Cobertura de las ramas nuevas: **100 % objetivo por riesgo crítico**.
- Mutation score de la frontera modificada: **>= 90 %**.
