# B4-004A — QA de respuesta pública limpia

Fecha: 2026-08-27.  
Incidentes de regresión: MiniMax devolvió primero razonamiento y después, aun con razonamiento
separado, un sobre `content_kind` dentro de `message.content`; el adapter declaró todo el campo como
texto visible y WhatsApp lo entregó al cliente.

## Invariantes verificables

1. Toda solicitud MiniMax OpenAI-compatible incluye `reasoning_split: true`.
2. Un mensaje normalizado con `content_kind=text` entrega al proveedor únicamente su cuerpo humano.
3. Contenido no textual conserva su sobre estructurado para no perder tipo ni metadatos.
4. `reasoning_details` no forma parte de `CognitiveTurnResult.visibleText`, metadata segura, logs ni
   payload de WhatsApp.
5. No se usan regex ni reglas de intención; la proyección sólo decodifica el contrato determinista
   del canal y el LLM conserva la redacción.
6. El sobre exacto `content_kind=text/content.text.body` se proyecta a `body`; objetos, arreglos,
   tipos no textuales, campos adicionales y cuerpos no string fallan cerrado.

## Procedimiento reproducible

1. Desde la raíz del repositorio, ejecutar
   `npx vitest run packages/ai/test/provider.test.ts packages/ai/test/output-policy.test.ts`.
2. Ejecutar cobertura global con `npm run test:coverage` y comprobar las rutas modificadas.
3. Ejecutar mutation testing dirigido a `packages/ai/src/provider.ts`; la meta es al menos 90 % y
   ningún mutante superviviente accionable en la nueva frontera de serialización/separación. Todo
   equivalente debe quedar identificado y justificado.
4. Ejecutar `npm run lint`, `npm run typecheck`, `npm run build` y el verificador Gherkin.
5. En staging, enviar `hola quien eres?` desde un cliente real y comprobar que WhatsApp recibe sólo
   la respuesta comercial, mientras las métricas conservan terminación/uso sin razonamiento crudo.

## Métricas y SLO

- Fuga de razonamiento o sobre interno a mensajes públicos: **0**.
- Respuestas públicas vacías aceptadas: **0**.
- Regresiones de roles, herramientas y contenido no textual en adapters: **0**.
- Cobertura de las ramas nuevas: **100 % objetivo por riesgo crítico**.
- Mutation score de la frontera modificada: **>= 90 %**.

## Evidencia de mutation testing

- Comando dirigido a las líneas del decodificador y sus adapters OpenAI/MiniMax.
- Dry run: **644 pruebas verdes**.
- Mutantes instrumentados: **95**; eliminados: **90**; sin cobertura: **0**; timeouts: **0**.
- Mutation score: **94.74 %**, superior al umbral de 90 %.
- Cinco mutantes equivalentes permanecen en el camino de texto no-JSON. Las transformaciones de
  `every` a `some`, del discriminante `parsed` y de su retorno temprano convergen en el mismo
  resultado observable: preservar el texto crudo. Ninguna omite el rechazo de objetos o arreglos
  estructurados, ni proyecta una envoltura inválida al cliente.

## Evidencia de cobertura y contratos

- Vitest global: **28 archivos y 644 pruebas verdes**.
- Statements: **95.83 %**; branches: **90.39 %**; functions: **96.88 %**; lines:
  **95.88 %**.
- Adapter `provider.ts`: **95.67 %** statements, **89.15 %** branches, **100 %** functions y
  **95.59 %** lines. Las rutas públicas críticas de texto normal, sobre exacto, estructura inválida,
  truncamiento y metadatos ausentes están cubiertas explícitamente.
- Aceptación: **12 features y 287 escenarios ejecutables**, sin errores de parseo.
- Smoke de procesos: API y worker listos y apagados limpiamente en puertos efímeros.
- Auditoría npm completa y de producción: **0 vulnerabilidades**.
