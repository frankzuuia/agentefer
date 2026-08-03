# AgenteFer — baseline de seguridad

Estado: obligatorio desde Bloque 0.  
Marcos de referencia: OWASP ASVS, OWASP Top 10, OWASP LLM Top 10, principios SAMM y seguridad de cadena de suministro. Las versiones y controles normativos concretos se verificarán antes del gate de release.

## Diez superficies que deben revisarse en cada auditoría

1. Exposición de secretos y variables de entorno.
2. Autenticación y límites de sesión.
3. Autorización y aislamiento por organización.
4. RLS y permisos de base de datos.
5. XSS y renderizado de contenido no confiable.
6. SSRF, URLs externas y redirecciones.
7. Inyección y consultas inseguras.
8. Firma, replay e idempotencia de webhooks.
9. Archivos, Storage y filtración de PII.
10. Rate limits, CORS, headers, CI/CD y dependencias.

## 1. Identidad y autorización

- Todo usuario humano tiene ID interno; toda identidad de WhatsApp/Messenger se vincula explícitamente.
- El número/ID del remitente no basta por sí solo para privilegios si el vínculo no está activo.
- Roles mínimos iniciales: `owner`, `admin`, `operator`, `viewer`, además de actores públicos no autenticados.
- Cada tool call administrativo valida usuario, membresía, organización, rol, canal y estado.
- Datos del JWT editables por el usuario no se usan para autorización.
- Operaciones sensibles requieren sesión reciente o confirmación cuando el riesgo lo justifique.
- Denegaciones se registran sin revelar existencia de datos ajenos.

## 2. Supabase y PostgreSQL

- Toda tabla expuesta tiene RLS activado antes de datos reales.
- Políticas incluyen propiedad/membresía; `TO authenticated` por sí solo no autoriza filas.
- `UPDATE` tiene `USING` y `WITH CHECK`, además de política de `SELECT` requerida.
- Vistas públicas usan invocador de seguridad cuando la versión lo soporte o quedan fuera del esquema expuesto.
- Funciones privilegiadas viven en esquema privado, revocan `PUBLIC`, fijan `search_path` y validan actor/organización.
- `service_role`/secret key nunca se entrega al navegador, LLM, cliente móvil o logs.
- Tablas nuevas no se autoexponen; grants y RLS son explícitos.
- Migraciones pasan advisors, revisión SQL, pruebas de políticas y rollback lógico.
- Stock, reservas, precios y pedidos usan transacciones y constraints de base de datos.

## 3. Webhooks y canales Meta

- Verificar firma oficial sobre bytes crudos antes de parsear/encolar.
- Validar timestamp/frescura cuando el protocolo lo permita y rechazar replay.
- Guardar ID de evento/mensaje y constraint idempotente por conexión/proveedor.
- Responder rápido; procesamiento pesado se desacopla.
- Limitar body, profundidad, cantidad de eventos y medios por webhook.
- Tokens/permisos se segmentan por entorno y Página/cuenta.
- Mensajes salientes pasan política de consentimiento/ventana/plantilla.
- Errores de Meta se redactan antes de logging y se clasifican para retry o terminal.

## 4. Seguridad del agente LLM

- Mensajes, OCR, documentos, publicaciones, páginas web y resultados externos son datos, no instrucciones de sistema.
- El registro de herramientas es allowlist; no existe ejecución arbitraria de SQL, shell, HTTP o código por el modelo.
- Cada herramienta tiene contrato, autorización, límites, idempotencia y efecto documentado.
- Argumentos del modelo se validan; IDs y organización se resuelven/contrastan en backend.
- El modelo no recibe secretos ni credenciales de proveedores.
- Herramientas destructivas, publicación masiva, cambios sensibles y gasto extraordinario tienen gate de aprobación/política.
- Se limita número de tool calls, turnos, tokens, tiempo, concurrencia y costo.
- La memoria tiene política explícita; contenido de cliente no se convierte automáticamente en regla permanente.
- En incertidumbre, el agente pregunta o escala; nunca inventa éxito, precio, stock o compatibilidad.
- Toda ejecución registra modelo, versión, prompt/policy version, herramientas, costo y correlación con redacción de PII.

## 5. API y aplicación web

- Validación de entrada y salida en bordes; errores públicos no incluyen stack, SQL o secretos.
- Mutaciones autenticadas con cookies requieren CSRF; APIs tokenizadas usan audiencia/origen adecuados.
- CORS es allowlist por entorno; no usar comodín con credenciales.
- Headers de seguridad, CSP, anti-clickjacking, `nosniff`, referrer y permisos mínimos.
- Contenido generado/Markdown se sanitiza; no ejecutar HTML arbitrario.
- Rate limits por IP, identidad, organización, ruta y costo.
- Endpoints públicos de catálogo exponen solo datos comerciales mínimos.
- Pedido público tiene idempotencia, antiabuso y recálculo servidor de precio/stock.
- Redirecciones y URLs de contacto se construyen desde destinos validados.

## 6. Archivos y Storage

- Validar firma binaria/MIME real, extensión, tamaño, dimensiones/duración y cantidad.
- Nombres y rutas los genera el servidor; no confiar en path del usuario.
- Originales/evidencia privados; derivados públicos solo si están aprobados para catálogo.
- URLs firmadas con TTL corto para material privado.
- Procesamiento aislado con timeout y límites de memoria/CPU.
- Descargar medios externos únicamente desde hosts/protocolos autorizados y bloquear redes internas/metadatos cloud.
- Hash de contenido para deduplicación, trazabilidad y cache seguro.
- Retención y borrado respetan referencias de venta/auditoría y privacidad.

## 7. Secretos y cadena de suministro

- `.env*` sensibles ignorados; `.env.example` contiene nombres, nunca valores.
- Secretos se guardan en Supabase/EasyPanel/Vercel/GitHub según necesidad y mínimo privilegio.
- Un secreto por entorno; rotación documentada y sin reutilización.
- Dependencias con versión exacta y lockfile comprometido.
- CI ejecuta auditoría de dependencias, licencia/SBOM cuando aplique y escaneo de secretos.
- Imágenes de contenedor fijan versión/digest cuando la operación esté madura; usuario no-root y filesystem mínimo.
- Builds reproducibles; artefacto se liga a commit y no recibe secretos durante etapas innecesarias.

## 8. Auditoría, logs y privacidad

- Logs JSON con `request_id`, `trace_id`, organización, componente, resultado y taxonomía de error.
- No registrar tokens, bodies completos de webhooks, audios, imágenes, números completos o prompts con PII sin necesidad aprobada.
- Redacción central probada para nombres de variables sensibles y formatos de credenciales.
- Auditoría comercial conserva antes/después seguro, actor, fuente, herramienta y referencia.
- Definir retención distinta para logs, auditoría, conversaciones, medios y backups.
- Acceso administrativo a datos de clientes queda limitado y auditado.

## 9. Disponibilidad y recuperación

- Health/liveness y readiness separados.
- Timeouts en red, DB, LLM y procesamiento de medios.
- Retries solo para errores recuperables, con backoff/jitter y clave idempotente.
- Dead-letter y conciliación para trabajos agotados/atascados.
- Circuit breaker o degradación segura ante proveedor caído.
- Backup y restore de Supabase probados antes de producción.
- Rollback de aplicación no revierte datos destructivamente; migraciones compatibles por fases.
- Runbook para Meta caído, LLM caído, DB degradada, token vencido y publicación bloqueada.

## 10. Gate de seguridad por bloque

Un bloque no cierra hasta registrar:

- activos/datos afectados;
- amenazas relevantes;
- controles implementados;
- pruebas positivas y negativas;
- escaneo de secretos;
- hallazgos altos/críticos corregidos o aceptación explícita;
- comando/artefacto/fecha de validación;
- rollback o recuperación.
