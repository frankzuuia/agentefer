import { type Buffer } from "node:buffer";

import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

import { parseMetaEndpointKey } from "./meta-webhook-protocol.js";

const MAXIMUM_RPC_RESPONSE_BYTES = 65_536;

export const META_WEBHOOK_RPC_FAILURE_KINDS = [
  "invalid",
  "rejected",
  "timeout",
  "dependency",
] as const;

export type MetaWebhookRpcFailureKind = (typeof META_WEBHOOK_RPC_FAILURE_KINDS)[number];

export class MetaWebhookRpcError extends OperationalError {
  readonly kind: MetaWebhookRpcFailureKind;

  constructor(kind: MetaWebhookRpcFailureKind, cause?: unknown) {
    const attributes =
      kind === "invalid"
        ? {
            code: "META_WEBHOOK_RPC_INVALID",
            category: "validation" as const,
            retryable: false,
            severity: "warning" as const,
          }
        : kind === "rejected"
          ? {
              code: "META_WEBHOOK_RPC_REJECTED",
              category: "authentication" as const,
              retryable: false,
              severity: "warning" as const,
            }
          : kind === "timeout"
            ? {
                code: "META_WEBHOOK_RPC_TIMEOUT",
                category: "timeout" as const,
                retryable: true,
                severity: "error" as const,
              }
            : {
                code: "META_WEBHOOK_RPC_DEPENDENCY",
                category: "dependency" as const,
                retryable: true,
                severity: "error" as const,
              };

    super({ ...attributes, cause });
    this.name = "MetaWebhookRpcError";
    this.kind = kind;
  }
}

export type AcceptMetaWebhookChallengeInput = Readonly<{
  endpointKey: string;
  mode: "subscribe";
  verifyToken: string;
  requestId: string;
  traceId: string;
}>;

export type AcceptedMetaWebhookChallenge = Readonly<{
  organizationId: string;
  metaApplicationId: string;
  webhookEndpointId: string;
  externalAppId: string;
  credentialVersionId: string;
}>;

export type IngestMetaWebhookDeliveryInput = Readonly<{
  endpointKey: string;
  rawBody: Buffer;
  signatureHex: string;
  requestId: string;
  traceId: string;
}>;

export type IngestedMetaWebhookDelivery = Readonly<{
  deliveryId: string;
  organizationId: string;
  metaApplicationId: string;
  webhookEndpointId: string;
  credentialVersionId: string;
  providerObjectType: string;
  replayed: boolean;
  deliveryCount: number;
  deliveryStatus: string;
}>;

export type MetaWebhookRpcClient = Readonly<{
  acceptChallenge(
    input: AcceptMetaWebhookChallengeInput,
  ): Promise<AcceptedMetaWebhookChallenge>;
  ingestDelivery(input: IngestMetaWebhookDeliveryInput): Promise<IngestedMetaWebhookDelivery>;
}>;

export type CreateMetaWebhookRpcClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readText = (
  value: Readonly<Record<string, unknown>>,
  field: string,
  maximumLength: number,
): string => {
  const candidate = value[field];

  if (typeof candidate !== "string" || candidate.length < 1 || candidate.length > maximumLength) {
    throw new MetaWebhookRpcError("dependency");
  }

  return candidate;
};

const readUuid = (value: Readonly<Record<string, unknown>>, field: string): string => {
  const candidate = parseMetaEndpointKey(value[field]);

  if (candidate === undefined) {
    throw new MetaWebhookRpcError("dependency");
  }

  return candidate;
};

const readSingleRow = (value: unknown): Readonly<Record<string, unknown>> => {
  if (!Array.isArray(value) || value.length !== 1 || !isRecord(value[0])) {
    throw new MetaWebhookRpcError("dependency");
  }

  return value[0];
};

const responseFailureKind = (status: number): MetaWebhookRpcFailureKind => {
  if (status === 400 || status === 413 || status === 422) {
    return "invalid";
  }

  if (status === 401 || status === 403) {
    return "rejected";
  }

  return "dependency";
};

const decodeRpcResponse = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > MAXIMUM_RPC_RESPONSE_BYTES) {
      throw new MetaWebhookRpcError("dependency");
    }
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_RPC_RESPONSE_BYTES) {
    throw new MetaWebhookRpcError("dependency");
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new MetaWebhookRpcError("dependency", error);
  }
};

export function createMetaWebhookRpcClient(
  input: CreateMetaWebhookRpcClientInput,
): MetaWebhookRpcClient {
  const rpcBaseUrl = new URL(input.supabaseUrl);
  rpcBaseUrl.search = "";
  rpcBaseUrl.hash = "";

  const postRpc = async (rpcName: string, payload: Readonly<Record<string, unknown>>): Promise<unknown> => {
    const url = new URL(rpcBaseUrl);
    url.pathname = `/rest/v1/rpc/${rpcName}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          accept: "application/json",
          "accept-profile": "api",
          apikey: input.secretKey.reveal(),
          "content-profile": "api",
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(input.timeoutMilliseconds),
      });
    } catch (error) {
      const kind = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "dependency";
      throw new MetaWebhookRpcError(kind, error);
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new MetaWebhookRpcError(responseFailureKind(response.status));
    }

    return decodeRpcResponse(response);
  };

  return Object.freeze({
    async acceptChallenge(inputValue) {
      const row = readSingleRow(
        await postRpc("accept_meta_webhook_challenge", {
          target_endpoint_key: inputValue.endpointKey,
          target_mode: inputValue.mode,
          target_verify_token: inputValue.verifyToken,
          target_correlation_id: inputValue.requestId,
          target_trace_id: inputValue.traceId,
        }),
      );

      return Object.freeze({
        organizationId: readUuid(row, "organization_id"),
        metaApplicationId: readUuid(row, "meta_application_id"),
        webhookEndpointId: readUuid(row, "webhook_endpoint_id"),
        externalAppId: readText(row, "external_app_id", 255),
        credentialVersionId: readUuid(row, "credential_version_id"),
      });
    },
    async ingestDelivery(inputValue) {
      const row = readSingleRow(
        await postRpc("ingest_meta_webhook_delivery", {
          target_endpoint_key: inputValue.endpointKey,
          target_raw_body_base64: inputValue.rawBody.toString("base64"),
          target_signature_hex: inputValue.signatureHex,
          target_request_id: inputValue.requestId,
          target_trace_id: inputValue.traceId,
        }),
      );
      const replayed = row.replayed;
      const deliveryCount = row.delivery_count;

      if (
        typeof replayed !== "boolean" ||
        typeof deliveryCount !== "number" ||
        !Number.isSafeInteger(deliveryCount) ||
        deliveryCount < 1
      ) {
        throw new MetaWebhookRpcError("dependency");
      }

      return Object.freeze({
        deliveryId: readUuid(row, "delivery_id"),
        organizationId: readUuid(row, "organization_id"),
        metaApplicationId: readUuid(row, "meta_application_id"),
        webhookEndpointId: readUuid(row, "webhook_endpoint_id"),
        credentialVersionId: readUuid(row, "credential_version_id"),
        providerObjectType: readText(row, "provider_object_type", 160),
        replayed,
        deliveryCount,
        deliveryStatus: readText(row, "delivery_status", 32),
      });
    },
  });
}
