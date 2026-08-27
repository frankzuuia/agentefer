import { OperationalError } from "@agentefer/observability";

import { type ClaimedOutboxEvent } from "./whatsapp-ai-rpc.js";

const MAXIMUM_GRAPH_RESPONSE_BYTES = 262_144;

export type WhatsAppGraphFailureKind =
  "invalid" | "rejected" | "retryable" | "uncertain" | "cancelled";

export class WhatsAppGraphError extends OperationalError {
  readonly kind: WhatsAppGraphFailureKind;

  constructor(kind: WhatsAppGraphFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "WHATSAPP_GRAPH_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "WHATSAPP_GRAPH_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      retryable: {
        code: "WHATSAPP_GRAPH_RETRYABLE",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
      uncertain: {
        code: "WHATSAPP_GRAPH_EFFECT_UNCERTAIN",
        category: "dependency" as const,
        retryable: false,
        severity: "critical" as const,
      },
      cancelled: {
        code: "WHATSAPP_GRAPH_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
    } as const;
    super({ ...attributes[kind], cause });
    this.name = "WhatsAppGraphError";
    this.kind = kind;
  }
}

export type WhatsAppGraphClient = Readonly<{
  sendMessage(
    claim: ClaimedOutboxEvent,
    signal?: AbortSignal,
  ): Promise<Readonly<{ providerMessageId: string }>>;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const graphFailureForStatus = (status: number): WhatsAppGraphFailureKind => {
  if (status === 400 || status === 404 || status === 413 || status === 422) {
    return "invalid";
  }
  if (status === 401 || status === 403) {
    return "rejected";
  }
  if (status === 408 || status === 409 || status === 429) {
    return "retryable";
  }
  return status >= 500 ? "uncertain" : "invalid";
};

const decodeGraphResponse = async (response: Response): Promise<unknown> => {
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_GRAPH_RESPONSE_BYTES) {
    throw new WhatsAppGraphError("invalid");
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new WhatsAppGraphError("uncertain", error);
  }
};

const pathSegmentIsSafe = (value: string): boolean =>
  value.length > 0 &&
  Array.from(value).every(
    (character) =>
      (character >= "0" && character <= "9") ||
      (character >= "a" && character <= "z") ||
      (character >= "A" && character <= "Z") ||
      character === "." ||
      character === "-" ||
      character === "_",
  );

export const createWhatsAppGraphClient = (
  graphOrigin = "https://graph.facebook.com/",
): WhatsAppGraphClient => {
  const origin = new URL(graphOrigin);
  origin.search = "";
  origin.hash = "";
  origin.pathname = "/";

  return Object.freeze({
    async sendMessage(claim, signal) {
      if (!pathSegmentIsSafe(claim.apiVersion) || !pathSegmentIsSafe(claim.phoneNumberId)) {
        throw new WhatsAppGraphError("invalid");
      }
      const endpoint = new URL(`${claim.apiVersion}/${claim.phoneNumberId}/messages`, origin);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${claim.accessToken.reveal()}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: claim.destination,
            ...claim.payload,
          }),
          cache: "no-store",
          redirect: "error",
          ...(signal === undefined ? {} : { signal }),
        });
      } catch (error) {
        if (signal?.aborted === true) {
          throw new WhatsAppGraphError("cancelled", error);
        }
        throw new WhatsAppGraphError("uncertain", error);
      }

      const body = await decodeGraphResponse(response);
      if (!response.ok) {
        throw new WhatsAppGraphError(graphFailureForStatus(response.status));
      }
      if (!isRecord(body) || !Array.isArray(body.messages) || !isRecord(body.messages[0])) {
        throw new WhatsAppGraphError("uncertain");
      }
      const providerMessageId = body.messages[0].id;
      if (
        typeof providerMessageId !== "string" ||
        providerMessageId.length < 1 ||
        providerMessageId.length > 512
      ) {
        throw new WhatsAppGraphError("uncertain");
      }
      return Object.freeze({ providerMessageId });
    },
  });
};
