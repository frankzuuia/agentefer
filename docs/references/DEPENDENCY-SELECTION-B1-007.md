# AgenteFer — selección de dependencias B1-007

Fecha de consulta: 2026-08-03.  
Origen: registry oficial npm y documentación primaria.  
Alcance: paquete compartido de observabilidad; sin backend/exportador.

## Dependencias runtime exactas

| Paquete               | Versión | Licencia   | Función                                  |
| --------------------- | ------: | ---------- | ---------------------------------------- |
| `pino`                |  10.3.1 | MIT        | logging JSON de aplicación               |
| `@opentelemetry/api`  |   1.9.1 | Apache-2.0 | interfaces estables de trazas y métricas |
| `@opentelemetry/core` |  2.10.0 | Apache-2.0 | propagador oficial W3C Trace Context     |

`@opentelemetry/core@2.10.0` declara peer `@opentelemetry/api >=1.0.0 <1.10.0`; la versión fijada 1.9.1 es compatible. Los tres paquetes soportan Node 24.

## Dependencia exclusiva de prueba

| Paquete                      | Versión | Licencia   | Función                                                    |
| ---------------------------- | ------: | ---------- | ---------------------------------------------------------- |
| `@opentelemetry/sdk-metrics` |  2.10.0 | Apache-2.0 | MeterProvider y exportador en memoria oficiales para tests |

El SDK de métricas no es dependencia runtime. La prueba usa el SDK real para recolectar counters/histogram y comprobar atributos; no sustituye un proveedor externo con un mock.

## Evidencia oficial

- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/): traces y metrics estables; logs en desarrollo.
- [OpenTelemetry propagation](https://opentelemetry.io/docs/languages/js/propagation/): propagación automática/manual y carrier entre procesos.
- [OpenTelemetry API](https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html): una biblioteca consume API y la aplicación registra SDK.
- [OpenTelemetry exporters](https://opentelemetry.io/docs/languages/js/exporters/): SDK/exportadores se inicializan antes del código instrumentado.
- [Pino](https://github.com/pinojs/pino): logger JSON para Node y documentación de redacción.

## Decisiones

- Pino se conserva separado de OpenTelemetry Logs porque esa señal continúa en desarrollo.
- El paquete compartido usa API y propagador; no registra globalmente SDK, meter provider ni exporter.
- `sdk-node`, auto-instrumentations y exporters OTLP se difieren hasta tener entrypoints reales y backend aprobado.
- No se instala transporte pretty en runtime; producción escribe JSON a stdout para que la plataforma recolecte.
- No se agrega Sentry, Datadog, Grafana, Vercel Observability u otro destino por asunción.

## Supply chain verificada

Después de instalar las cuatro dependencias:

- `npm audit`: 0 vulnerabilidades;
- `npm audit --omit=dev`: 0 vulnerabilidades;
- firmas registry verificadas: 449 paquetes;
- attestations verificadas: 109 paquetes;
- versiones directas exactas y lockfile actualizado;
- scripts de instalación continúan desactivados por política del repositorio.

## Actualización futura

Una actualización repite peers, engines, licencia, audit/signatures, pruebas de redacción, carrier W3C, métricas y gate global. Agregar SDK/exportador exige:

1. backend y retención aprobados;
2. variables/secretos por proceso documentados;
3. inicialización ESM anterior a framework/clientes;
4. smoke real contra staging;
5. ausencia de PII/secretos verificada en telemetría exportada;
6. rollback sin pérdida de operación del agente.
