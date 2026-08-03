import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { type AddressInfo } from "node:net";

import { type ReadinessState } from "@agentefer/observability";

export interface CreateWorkerHealthServerInput {
  readonly readiness: ReadinessState;
}

export interface WorkerHealthListenOptions {
  readonly host: string;
  readonly port: number;
}

type HealthStatus = "live" | "ready" | "not_ready" | "not_found" | "method_not_allowed";

function sendStatus(
  response: ServerResponse,
  statusCode: number,
  status: HealthStatus,
  headers: Readonly<Record<string, string>> = {},
): void {
  const payload = JSON.stringify({ status });

  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-length": String(Buffer.byteLength(payload)),
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(payload);
}

function handleHealthRequest(
  request: IncomingMessage,
  response: ServerResponse,
  readiness: ReadinessState,
): void {
  if (request.method !== "GET") {
    sendStatus(response, 405, "method_not_allowed", { allow: "GET" });
    return;
  }

  if (request.url === "/health/live") {
    sendStatus(response, 200, "live");
    return;
  }

  if (request.url === "/health/ready") {
    const ready = readiness.isReady();
    sendStatus(response, ready ? 200 : 503, ready ? "ready" : "not_ready");
    return;
  }

  sendStatus(response, 404, "not_found");
}

export function createWorkerHealthServer(input: CreateWorkerHealthServerInput): Server {
  const server = createServer((request, response) => {
    handleHealthRequest(request, response, input.readiness);
  });

  server.headersTimeout = 5_000;
  server.requestTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  server.maxHeadersCount = 32;
  return server;
}

export async function listenWorkerHealthServer(
  server: Server,
  options: WorkerHealthListenOptions,
): Promise<AddressInfo> {
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error): void => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = (): void => {
      server.off("error", handleError);
      resolve();
    };

    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen({ host: options.host, port: options.port });
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new TypeError("worker health server did not expose a TCP address");
  }

  return address;
}

export async function closeWorkerHealthServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
        return;
      }

      reject(error);
    });
  });
}
