import { SensitiveValue } from "@agentefer/config";
import {
  createOperationalMetrics,
  createStructuredLogger,
} from "@agentefer/observability";

import { type BuildApiInput } from "../src/app.js";
import { createMetaWebhookRpcClient } from "../src/meta-webhook-rpc.js";

export const buildApiTestInput = (
  readiness: BuildApiInput["readiness"],
): BuildApiInput => ({
  readiness,
  logger: createStructuredLogger({ component: "api", environment: "test", level: "fatal" }),
  metrics: createOperationalMetrics({ component: "api-test" }),
  metaWebhookRpcClient: createMetaWebhookRpcClient({
    supabaseUrl: "http://127.0.0.1:9",
    secretKey: new SensitiveValue(["sb", "secret", "api", "test", "only"].join("_")),
    timeoutMilliseconds: 50,
  }),
  metaWebhookMaximumBodyBytes: 1_048_576,
});
