# B4-001 Admin Meta onboarding QA

## Alcance

Este procedimiento valida la pantalla `/admin/meta` y sus contratos de backend para registrar,
por organización, una aplicación de Meta con WhatsApp y Messenger. Los secretos viajan una sola
vez al RPC auditado `api.register_meta_application` y se almacenan como versiones cifradas en
Supabase Vault. La respuesta HTTP sólo devuelve la URL de callback; nunca devuelve el App Secret.

## Riesgos que deben permanecer cerrados

- Una sesión ausente, vencida o revocada no puede listar organizaciones ni registrar credenciales.
- RLS decide qué organizaciones ve el usuario; el navegador no puede indicar una organización
  ajena sin que el RPC la rechace.
- Las credenciales de Frank y Fer pertenecen a filas y secretos Vault separados por organización.
- El token de acceso, App Secret y Verify Token no aparecen en respuesta, logs ni almacenamiento
  persistente del navegador.
- Los cuerpos desconocidos, JSON inválido, media types incorrectos y respuestas de dependencia
  mayores a 64 KiB se rechazan con respuestas estables y sin diagnósticos sensibles.
- La página no carga scripts, fuentes, estilos ni imágenes de terceros.

## Ejecución reproducible

Desde `C:\Users\figod\Desktop\agentefer`, en la rama `develop`:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm run verify:acceptance-contract
npm run test:coverage
npm run test:mutation
npm run build
npm run audit
npm run test:database:linked
npm run test:database:linked:mutations
```

La ejecución contra Supabase debe abortarse si el proyecto enlazado no es
`hprdctmblmfcoagugvyp` (`AgenteFer`). Nunca se ejecuta contra otro proyecto.

## Aceptación funcional

1. Abrir `/admin/meta` sin sesión muestra el acceso y no solicita todavía secretos de Meta.
2. Iniciar sesión con un usuario confirmado carga únicamente organizaciones permitidas por RLS.
3. Elegir una organización mantiene todas las credenciales dentro de ese tenant.
4. Registrar App ID, nombre, versión, App Secret y Verify Token devuelve una callback única con
   forma `https://agentefer.frkqr.com/webhooks/meta/{endpointKey}`.
5. El App Secret y Verify Token desaparecen del formulario tras el envío.
6. Recargar obliga a una nueva sesión y no recupera secretos anteriores desde el navegador.
7. Un duplicado o conflicto devuelve HTTP 409 sin sobrescribir versiones previas.
8. Un fallo transitorio de Supabase devuelve HTTP 503 y `Retry-After: 2`.

## Aceptación visual y accesible

- Verificar viewport 375x812, 768x1024, 1024x768 y 1440x900.
- No debe existir desbordamiento horizontal, texto cortado ni controles fuera del viewport.
- Todos los campos tienen etiqueta visible, foco perceptible y área táctil mínima de 44 px.
- El contraste de texto y controles cumple WCAG AA.
- `prefers-reduced-motion` elimina transiciones no esenciales.
- La apariencia usa el sistema oscuro premium de AgenteFer inspirado en Supabase; no usa emojis,
  iconos rasterizados ni estilos visuales heredados.

## Métricas y puertas

- Cobertura objetivo del repositorio: al menos 90% en statements, branches, functions y lines.
- Rutas críticas del bloque: sin líneas sin cobertura.
- Mutation score mínimo: 90% sin reducir el umbral ni ocultar mutantes nuevos.
- Respuesta del API administrativo: objetivo p95 menor a 500 ms sin contar latencia externa de Meta.
- Error HTTP 5xx administrativo: menor a 1% en una ventana de 15 minutos.
- Cero secretos en respuestas, logs, URLs, métricas, localStorage, sessionStorage o cookies.

## Evidencia y límite de esta etapa

Las pruebas automatizadas usan servidores TCP locales reales para contratos HTTP; no sustituyen la
validación final con una aplicación real de Meta. La prueba final de webhook, suscripción a
`messages`, envío/recepción de WhatsApp y eventos de Messenger se ejecuta cuando el propietario
introduzca sus credenciales en `/admin/meta`. Ninguna credencial real se pega en el repositorio ni
en el chat.
