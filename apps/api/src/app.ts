import Fastify, { type FastifyInstance } from "fastify";

import { type ReadinessState } from "@agentefer/observability";

import { registerHealthRoutes } from "./health.js";

export interface BuildApiInput {
  readonly readiness: ReadinessState;
}

export function buildApi(input: BuildApiInput): FastifyInstance {
  const application = Fastify({
    logger: false,
    trustProxy: false,
    bodyLimit: 1_048_576,
    connectionTimeout: 10_000,
    keepAliveTimeout: 5_000,
    requestTimeout: 15_000,
    forceCloseConnections: "idle",
    return503OnClosing: true,
  });

  registerHealthRoutes(application, input.readiness);
  return application;
}
