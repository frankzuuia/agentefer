# AgenteFer — selección de dependencias B1-004

Fecha de consulta: 2026-08-03.  
Origen: registry oficial npm y documentación primaria enlazada en OFFICIAL_DOCUMENTATION_REVIEW.md.  
Alcance: toolchain y frameworks que se usarán inmediatamente en B1.

## Runtime y package manager

| Herramienta | Versión | Razón                                              |
| ----------- | ------: | -------------------------------------------------- |
| Node.js     | 24.18.0 | runtime LTS observado y major ratificado           |
| npm         | 11.16.0 | package manager observado; workspaces y devEngines |

El rango `engines.node` permanece en major 24 para paquetes internos. `devEngines` y `.node-version` fijan el entorno de desarrollo/CI exacto.

## Dependencias raíz de desarrollo

| Paquete             | Versión exacta | Licencia   | Función                                        |
| ------------------- | -------------: | ---------- | ---------------------------------------------- |
| TypeScript          |          6.0.3 | Apache-2.0 | compilador estricto ESM                        |
| @types/node         |        24.13.3 | MIT        | tipos alineados con Node 24                    |
| tsx                 |         4.23.5 | MIT        | ejecución/desarrollo TypeScript                |
| ESLint              |         9.39.5 | MIT        | análisis estático compatible con el árbol Next |
| @eslint/js          |         9.39.5 | MIT        | reglas base flat config                        |
| typescript-eslint   |         8.66.0 | MIT        | parser/reglas TypeScript                       |
| Prettier            |          3.9.6 | MIT        | formato reproducible                           |
| Vitest              |         4.1.10 | MIT        | pruebas unitarias/integración                  |
| @vitest/coverage-v8 |         4.1.10 | MIT        | cobertura V8                                   |
| eslint-config-next  |        16.2.12 | MIT        | reglas oficiales Next/React                    |

## Web

| Paquete          | Versión exacta | Licencia   | Función                                                   |
| ---------------- | -------------: | ---------- | --------------------------------------------------------- |
| Next.js          |        16.2.12 | MIT        | App Router y build web                                    |
| React            |         19.2.8 | MIT        | interfaz                                                  |
| React DOM        |         19.2.8 | MIT        | render web                                                |
| PostCSS          |         8.5.25 | MIT        | pin directo y override de seguridad de Next               |
| Sharp            |         0.35.3 | Apache-2.0 | procesamiento de imágenes y override de seguridad de Next |
| @types/react     |        19.2.18 | MIT        | tipos                                                     |
| @types/react-dom |         19.2.4 | MIT        | tipos                                                     |

## API

| Paquete | Versión exacta | Licencia | Función      |
| ------- | -------------: | -------- | ------------ |
| Fastify |         5.11.2 | MIT      | servidor API |

## Compatibilidad verificada

- Next.js 16.2.12 requiere Node 20.9 o superior y React 18.2/19.
- React DOM 19.2.8 requiere React 19.2.8 compatible.
- ESLint 9.39.5 soporta Node 24.
- @eslint/js 9.39.5 corresponde a ESLint 9.
- typescript-eslint 8.66.0 acepta ESLint 9 y TypeScript desde 4.8.4 hasta menor que 6.1.
- ESLint 10.8.0 se descartó porque eslint-config-next 16.2.12 arrastra eslint-plugin-import 2.32.0, cuyo peer sólo acepta hasta ESLint 9; strict-peer-deps detectó el conflicto.
- TypeScript 7.0.2 se descartó por romper ese peer y por contradecir ADR-009.
- Vitest 4.1.10 admite Node 24; su paquete de cobertura exige la misma versión.
- Fastify 5 pertenece a la línea LTS vigente.

## Política de instalación

- versiones directas exactas, sin `^` ni `~`;
- lockfile obligatorio;
- `strict-peer-deps=true`;
- `engine-strict=true`;
- scripts de instalación desactivados por defecto;
- auditoría npm después de instalar;
- ningún SDK externo se instala antes del bloque que lo implementa;
- toda actualización futura repite documentación, peers, licencia, audit, pruebas y rollback.

## Overrides de seguridad de Next.js

El primer install de Next.js 16.2.12 produjo tres vulnerabilidades altas en producción:

- PostCSS GHSA-6g55-p6wh-862q;
- PostCSS GHSA-r28c-9q8g-f849;
- PostCSS GHSA-fxqj-rqcc-2cmp;
- PostCSS GHSA-qx2v-qp2m-jg93;
- Sharp GHSA-f88m-g3jw-g9cj.

Next.js 16.2.12 fija PostCSS 8.4.31 y permite Sharp 0.34.x. El issue vercel/next.js #96064 permanece abierto. La corrección automática de npm propone Next.js 9.3.3, incompatible con ADR-009, por lo que se rechaza.

Overrides acotados:

| Dependencia de Next | Versión corregida | Razón                                            |
| ------------------- | ----------------: | ------------------------------------------------ |
| PostCSS             |            8.5.25 | corrige los rangos afectados y conserva major 8  |
| Sharp               |            0.35.3 | corrige GHSA-f88m-g3jw-g9cj y soporta Node 20.9+ |

Condiciones de aceptación:

- npm debe resolver una sola versión corregida;
- npm audit completo y producción deben quedar en cero;
- Sharp debe poder importarse y reportar sus versiones;
- el build Next real debe pasar en B1-006;
- eliminar los overrides cuando Next publique una dependencia corregida compatible.

## Dependencias diferidas

No se instalaron todavía:

- OpenAI/MiniMax;
- Supabase SDK/SSR;
- plugins Fastify;
- OpenTelemetry;
- Meta SDKs;
- Playwright;
- librerías de QR o UI.

Cada una se incorpora sólo cuando exista código y validación del bloque dueño.
