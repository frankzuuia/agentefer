# QA B3-006T — evidencia de herramientas del dueño

## Defecto reproducido

Dos runs reales de dueño terminaron fallidos después de ocho intentos cada uno. La política SQL
exigía evidencia durable, pero el proveedor podía devolver texto con selección automática y cero
tool calls; el worker descartaba correctamente ese texto y por eso WhatsApp quedaba sin respuesta.

## Corrección

- El worker solicita `tool_choice=required` sólo en el primer paso de un run cuya política exige
  evidencia, sin historial y con herramientas autorizadas.
- OpenAI Responses y MiniMax Chat Completions transmiten esa opción.
- Después de una ejecución durable se restaura la selección normal.
- La autorización, el aislamiento por organización y la barrera SQL no se relajan.

## Procedimiento reproducible

1. Ejecutar `npm exec -- vitest run packages/ai/test/provider.test.ts apps/worker/test/whatsapp-ai-processor.test.ts`.
2. Ejecutar `npm run test:coverage`.
3. Ejecutar `npm run test:mutation:b3-006t`.
4. Ejecutar `npm run typecheck`, `npm run lint`, `npm run build`, `npm run format:check` y los
   verificadores de contratos.
5. Tras desplegar sólo `agente-fer/worker`, enviar un nuevo mensaje desde el número dueño y
   comprobar run, tool execution, outbox y entrega de WhatsApp.

## Evidencia local 2026-09-21

| Puerta | Resultado |
| --- | --- |
| Vitest focalizado | verde; adaptadores y procesador cubiertos |
| Suite con cobertura | 1,266/1,266 pruebas; 90.23% statements, 85.97% branches, 93.07% functions, 90.36% lines |
| Mutation testing focalizado | 39/39 mutantes eliminados; 100% |
| Typecheck / lint / build / formato | verde |
| Aceptación | 425 escenarios Gherkin parseados |
| Contrato de base de datos | 59 migraciones, 106 tablas forced-RLS y 1,390 aserciones registradas |

## Puerta pendiente

La reparación no queda certificada end-to-end hasta observar un mensaje real posterior al
despliegue con una herramienta autorizada, respuesta en outbox y entrega confirmada por WhatsApp.
