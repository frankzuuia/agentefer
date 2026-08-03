import { type FastifyInstance, type FastifyReply } from "fastify";

import { type ReadinessState } from "@agentefer/observability";

const liveResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", const: "live" },
  },
} as const;

const readinessResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["ready", "not_ready"] },
  },
} as const;

function prepareHealthReply(reply: FastifyReply): FastifyReply {
  return reply.header("cache-control", "no-store").header("x-content-type-options", "nosniff");
}

export function registerHealthRoutes(
  application: FastifyInstance,
  readiness: ReadinessState,
): void {
  application.get(
    "/health/live",
    {
      schema: {
        response: { 200: liveResponseSchema },
      },
    },
    async (_request, reply) => prepareHealthReply(reply).code(200).send({ status: "live" }),
  );

  application.get(
    "/health/ready",
    {
      schema: {
        response: {
          200: readinessResponseSchema,
          503: readinessResponseSchema,
        },
      },
    },
    async (_request, reply) => {
      const ready = readiness.isReady();
      const statusCode = ready ? 200 : 503;
      const status = ready ? "ready" : "not_ready";

      return prepareHealthReply(reply).code(statusCode).send({ status });
    },
  );
}
