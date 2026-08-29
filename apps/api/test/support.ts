import { SensitiveValue } from "@agentefer/config";
import { createOperationalMetrics, createStructuredLogger } from "@agentefer/observability";

import { createAdminCatalogGateway } from "../src/admin-catalog-gateway.js";
import { createAdminMetaGateway } from "../src/admin-meta-gateway.js";
import { type BuildApiInput } from "../src/app.js";
import { createMetaGraphGateway } from "../src/meta-graph-gateway.js";
import { createMetaWebhookRpcClient } from "../src/meta-webhook-rpc.js";

const supabaseTestUrl = "http://127.0.0.1:9";
const supabaseTestPublishableKey = "sb_publishable_api_test_only";
const supabaseTestSecret = new SensitiveValue(["sb", "secret", "api", "test", "only"].join("_"));

export const buildApiTestInput = (readiness: BuildApiInput["readiness"]): BuildApiInput => ({
  readiness,
  logger: createStructuredLogger({ component: "api", environment: "test", level: "fatal" }),
  metrics: createOperationalMetrics({ component: "api-test" }),
  adminCatalogGateway: createAdminCatalogGateway({
    supabaseUrl: supabaseTestUrl,
    secretKey: supabaseTestSecret,
    timeoutMilliseconds: 50,
  }),
  adminMetaGateway: createAdminMetaGateway({
    supabaseUrl: supabaseTestUrl,
    publishableKey: supabaseTestPublishableKey,
    secretKey: supabaseTestSecret,
    timeoutMilliseconds: 50,
  }),
  metaGraphGateway: createMetaGraphGateway({
    baseUrl: supabaseTestUrl,
    timeoutMilliseconds: 50,
  }),
  apiPublicUrl: "https://agentefer.example.test",
  supabaseUrl: supabaseTestUrl,
  supabasePublishableKey: supabaseTestPublishableKey,
  metaWebhookRpcClient: createMetaWebhookRpcClient({
    supabaseUrl: supabaseTestUrl,
    secretKey: supabaseTestSecret,
    timeoutMilliseconds: 50,
  }),
  metaWebhookMaximumBodyBytes: 1_048_576,
});
