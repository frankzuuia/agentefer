import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const MAXIMUM_GRAPH_RESPONSE_BYTES = 262_144;
const MAXIMUM_USAGE_HEADER_BYTES = 32_768;

export type FacebookPageFailureKind =
  | "invalid"
  | "rejected"
  | "rate_limited"
  | "uncertain"
  | "cancelled";

export type FacebookPageEffectCertainty = "confirmed_not_applied" | "unknown";

export class FacebookPageError extends OperationalError {
  readonly kind: FacebookPageFailureKind;
  readonly effectCertainty: FacebookPageEffectCertainty;
  readonly providerRequestId: string | undefined;
  readonly retryAfterAt: string | undefined;
  readonly usageSnapshot: Readonly<Record<string, unknown>>;

  constructor(
    kind: FacebookPageFailureKind,
    context: Readonly<{
      effectCertainty: FacebookPageEffectCertainty;
      providerRequestId?: string;
      retryAfterAt?: string;
      usageSnapshot?: Readonly<Record<string, unknown>>;
      cause?: unknown;
    }>,
  ) {
    const attributes = {
      invalid: {
        code: "FACEBOOK_PAGE_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "FACEBOOK_PAGE_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      rate_limited: {
        code: "FACEBOOK_PAGE_RATE_LIMITED",
        category: "rate_limit" as const,
        retryable: true,
        severity: "warning" as const,
      },
      uncertain: {
        code: "FACEBOOK_PAGE_EFFECT_UNCERTAIN",
        category: "dependency" as const,
        retryable: false,
        severity: "critical" as const,
      },
      cancelled: {
        code: "FACEBOOK_PAGE_CANCELLED_AFTER_EFFECT_START",
        category: "internal" as const,
        retryable: false,
        severity: "critical" as const,
      },
    } as const;
    super({ ...attributes[kind], cause: context.cause });
    this.name = "FacebookPageError";
    this.kind = kind;
    this.effectCertainty = context.effectCertainty;
    this.providerRequestId = context.providerRequestId;
    this.retryAfterAt = context.retryAfterAt;
    this.usageSnapshot = Object.freeze(context.usageSnapshot ?? {});
  }
}

export type FacebookPagePublishRequest = Readonly<{
  pageId: string;
  apiVersion: string;
  accessToken: SensitiveValue;
  message: string;
  primaryImageUrl?: URL;
}>;

export type FacebookPagePublishResult = Readonly<{
  externalPublicationId: string;
  providerRequestId?: string;
  usageSnapshot: Readonly<Record<string, unknown>>;
  responseSummary: Readonly<Record<string, unknown>>;
}>;

export type FacebookPageClient = Readonly<{
  publish(
    request: FacebookPagePublishRequest,
    signal?: AbortSignal,
  ): Promise<FacebookPagePublishResult>;
}>;

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

const readProviderRequestId = (headers: Headers): string | undefined => {
  const value = headers.get("x-fb-request-id") ?? headers.get("x-fb-trace-id") ?? undefined;
  if (value === undefined || value.length < 1 || value.length > 512) {
    return undefined;
  }
  return value;
};

const parseRetryAfter = (value: string | null, observedAt: Date): string | undefined => {
  if (value === null || value.length > 128) {
    return undefined;
  }
  const seconds = Number(value);
  const retryAt =
    Number.isSafeInteger(seconds) && seconds > 0
      ? observedAt.getTime() + seconds * 1_000
      : Date.parse(value);
  if (!Number.isFinite(retryAt) || retryAt <= observedAt.getTime()) {
    return undefined;
  }
  return new Date(retryAt).toISOString();
};

const parseUsageHeader = (value: string | null): unknown => {
  if (value === null || value.length > MAXIMUM_USAGE_HEADER_BYTES) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) || Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export const readFacebookUsageSnapshot = (
  headers: Headers,
): Readonly<Record<string, unknown>> => {
  const page = parseUsageHeader(headers.get("x-page-usage"));
  const application = parseUsageHeader(headers.get("x-app-usage"));
  const business = parseUsageHeader(headers.get("x-business-use-case-usage"));
  return Object.freeze({
    ...(page === undefined ? {} : { page }),
    ...(application === undefined ? {} : { application }),
    ...(business === undefined ? {} : { business }),
  });
};

const decodeGraphBody = async (response: Response): Promise<unknown> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAXIMUM_GRAPH_RESPONSE_BYTES) {
      return undefined;
    }
  }
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAXIMUM_GRAPH_RESPONSE_BYTES) {
    return undefined;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    return undefined;
  }
};

const safeGraphErrorCode = (body: unknown): string | number | undefined => {
  if (!isRecord(body) || !isRecord(body.error)) {
    return undefined;
  }
  const code = body.error.code;
  return typeof code === "string" || typeof code === "number" ? code : undefined;
};

const failureForResponse = (
  response: Response,
  body: unknown,
  observedAt: Date,
): FacebookPageError => {
  const providerRequestId = readProviderRequestId(response.headers);
  const common = {
    effectCertainty: "confirmed_not_applied" as const,
    ...(providerRequestId === undefined ? {} : { providerRequestId }),
    usageSnapshot: readFacebookUsageSnapshot(response.headers),
  };
  if (response.status === 401 || response.status === 403) {
    return new FacebookPageError("rejected", common);
  }
  if (response.status === 429) {
    const retryAfterAt = parseRetryAfter(response.headers.get("retry-after"), observedAt);
    return new FacebookPageError("rate_limited", {
      ...common,
      ...(retryAfterAt === undefined ? {} : { retryAfterAt }),
    });
  }
  if ([400, 404, 413, 422].includes(response.status)) {
    return new FacebookPageError("invalid", {
      ...common,
      usageSnapshot: {
        ...common.usageSnapshot,
        ...(safeGraphErrorCode(body) === undefined
          ? {}
          : { provider_error_code: safeGraphErrorCode(body) }),
      },
    });
  }
  return new FacebookPageError("uncertain", {
    ...common,
    effectCertainty: "unknown",
  });
};

const validatePublicImageUrl = (value: URL): void => {
  if (
    value.protocol !== "https:" ||
    value.username.length > 0 ||
    value.password.length > 0 ||
    value.hash.length > 0
  ) {
    throw new FacebookPageError("invalid", { effectCertainty: "confirmed_not_applied" });
  }
};

export const createFacebookPageClient = (
  graphOrigin = "https://graph.facebook.com/",
): FacebookPageClient => {
  const origin = new URL(graphOrigin);
  origin.search = "";
  origin.hash = "";
  origin.pathname = "/";

  return Object.freeze({
    async publish(request, signal) {
      if (
        !pathSegmentIsSafe(request.apiVersion) ||
        !pathSegmentIsSafe(request.pageId) ||
        request.message.length < 1 ||
        request.message.length > 60_000 ||
        request.message.trim() !== request.message
      ) {
        throw new FacebookPageError("invalid", { effectCertainty: "confirmed_not_applied" });
      }
      if (request.primaryImageUrl !== undefined) {
        validatePublicImageUrl(request.primaryImageUrl);
      }

      const endpointSuffix = request.primaryImageUrl === undefined ? "feed" : "photos";
      const endpoint = new URL(
        `${request.apiVersion}/${request.pageId}/${endpointSuffix}`,
        origin,
      );
      const requestBody = new URLSearchParams();
      if (request.primaryImageUrl === undefined) {
        requestBody.set("message", request.message);
      } else {
        requestBody.set("url", request.primaryImageUrl.toString());
        requestBody.set("caption", request.message);
        requestBody.set("published", "true");
      }

      let response: Response;
      const observedAt = new Date();
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${request.accessToken.reveal()}`,
            "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          body: requestBody.toString(),
          cache: "no-store",
          redirect: "error",
          ...(signal === undefined ? {} : { signal }),
        });
      } catch (error) {
        throw new FacebookPageError(signal?.aborted === true ? "cancelled" : "uncertain", {
          effectCertainty: "unknown",
          cause: error,
        });
      }

      const body = await decodeGraphBody(response);
      if (!response.ok) {
        throw failureForResponse(response, body, observedAt);
      }
      if (!isRecord(body)) {
        const providerRequestId = readProviderRequestId(response.headers);
        throw new FacebookPageError("uncertain", {
          effectCertainty: "unknown",
          ...(providerRequestId === undefined ? {} : { providerRequestId }),
          usageSnapshot: readFacebookUsageSnapshot(response.headers),
        });
      }
      const externalPublicationId =
        typeof body.post_id === "string"
          ? body.post_id
          : typeof body.id === "string"
            ? body.id
            : undefined;
      if (
        externalPublicationId === undefined ||
        externalPublicationId.length < 1 ||
        externalPublicationId.length > 512
      ) {
        const providerRequestId = readProviderRequestId(response.headers);
        throw new FacebookPageError("uncertain", {
          effectCertainty: "unknown",
          ...(providerRequestId === undefined ? {} : { providerRequestId }),
          usageSnapshot: readFacebookUsageSnapshot(response.headers),
        });
      }
      const providerRequestId = readProviderRequestId(response.headers);
      return Object.freeze({
        externalPublicationId,
        ...(providerRequestId === undefined ? {} : { providerRequestId }),
        usageSnapshot: readFacebookUsageSnapshot(response.headers),
        responseSummary: Object.freeze({
          endpoint_kind: endpointSuffix,
          graph_object_id_present: typeof body.id === "string",
          graph_post_id_present: typeof body.post_id === "string",
        }),
      });
    },
  });
};
