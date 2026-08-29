import type { SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";

const PRIVATE_BUCKET_ID = "agentefer-catalog-private";
const PUBLIC_BUCKET_ID = "agentefer-catalog-public";
const MAXIMUM_PRIVATE_BYTES = 26_214_400;
const MAXIMUM_PUBLIC_BYTES = 10_485_760;
const MAXIMUM_CONTROL_RESPONSE_BYTES = 65_536;
const MINIMUM_SIGNED_URL_SECONDS = 30;
const MAXIMUM_SIGNED_URL_SECONDS = 900;

export type MediaRenditionKind =
  "source_original" | "analysis_webp" | "storefront_webp" | "whatsapp_jpeg";

export type MediaMimeType = "image/jpeg" | "image/png" | "image/webp";

export type MediaObjectDescriptor = Readonly<{
  organizationId: string;
  mediaAssetId: string;
  renditionKind: MediaRenditionKind;
  contentSha256Hex: string;
  mimeType: MediaMimeType;
}>;

export type ResolvedMediaObject = Readonly<{
  bucketId: typeof PRIVATE_BUCKET_ID | typeof PUBLIC_BUCKET_ID;
  objectPath: string;
  mimeType: MediaMimeType;
  maximumBytes: number;
}>;

export type MediaStorageFailureKind =
  "invalid" | "rejected" | "conflict" | "retryable" | "uncertain" | "cancelled" | "timeout";

export class MediaStorageError extends OperationalError {
  readonly kind: MediaStorageFailureKind;

  constructor(kind: MediaStorageFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "MEDIA_STORAGE_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "MEDIA_STORAGE_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      conflict: {
        code: "MEDIA_STORAGE_CONFLICT",
        category: "conflict" as const,
        retryable: false,
        severity: "warning" as const,
      },
      retryable: {
        code: "MEDIA_STORAGE_RETRYABLE",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
      uncertain: {
        code: "MEDIA_STORAGE_EFFECT_UNCERTAIN",
        category: "dependency" as const,
        retryable: false,
        severity: "critical" as const,
      },
      cancelled: {
        code: "MEDIA_STORAGE_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      timeout: {
        code: "MEDIA_STORAGE_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;

    super({ ...attributes[kind], cause });
    this.name = "MediaStorageError";
    this.kind = kind;
  }
}

export type MediaStorageClient = Readonly<{
  uploadObject(
    descriptor: MediaObjectDescriptor,
    body: Uint8Array,
    signal?: AbortSignal,
  ): Promise<ResolvedMediaObject>;
  downloadPrivateObject(
    descriptor: MediaObjectDescriptor,
    signal?: AbortSignal,
  ): Promise<Uint8Array>;
  createSignedPrivateUrl(
    descriptor: MediaObjectDescriptor,
    expiresInSeconds: number,
    signal?: AbortSignal,
  ): Promise<URL>;
  createPublicObjectUrl(descriptor: MediaObjectDescriptor): URL;
}>;

type CreateMediaStorageClientInput = Readonly<{
  supabaseUrl: string;
  secretKey: SensitiveValue;
  timeoutMilliseconds: number;
  maximumDownloadBytes: number;
}>;

const isLowerHex = (value: string): boolean =>
  value.length > 0 &&
  Array.from(value).every(
    (character) => (character >= "0" && character <= "9") || (character >= "a" && character <= "f"),
  );

const isCanonicalUuid = (value: string): boolean => {
  if (value.length !== 36) {
    return false;
  }
  const hyphenIndexes = new Set([8, 13, 18, 23]);
  return Array.from(value).every((character, index) =>
    hyphenIndexes.has(index) ? character === "-" : isLowerHex(character),
  );
};

const renditionContract = (
  renditionKind: string,
  mimeType: string,
): Readonly<{
  bucketId: typeof PRIVATE_BUCKET_ID | typeof PUBLIC_BUCKET_ID;
  extension: ".jpg" | ".png" | ".webp";
  maximumBytes: number;
}> => {
  if (renditionKind === "source_original") {
    if (mimeType === "image/jpeg") {
      return Object.freeze({
        bucketId: PRIVATE_BUCKET_ID,
        extension: ".jpg",
        maximumBytes: MAXIMUM_PRIVATE_BYTES,
      });
    }
    if (mimeType === "image/png") {
      return Object.freeze({
        bucketId: PRIVATE_BUCKET_ID,
        extension: ".png",
        maximumBytes: MAXIMUM_PRIVATE_BYTES,
      });
    }
    if (mimeType === "image/webp") {
      return Object.freeze({
        bucketId: PRIVATE_BUCKET_ID,
        extension: ".webp",
        maximumBytes: MAXIMUM_PRIVATE_BYTES,
      });
    }
  }

  if (renditionKind === "analysis_webp" && mimeType === "image/webp") {
    return Object.freeze({
      bucketId: PRIVATE_BUCKET_ID,
      extension: ".webp",
      maximumBytes: MAXIMUM_PRIVATE_BYTES,
    });
  }
  if (renditionKind === "whatsapp_jpeg" && mimeType === "image/jpeg") {
    return Object.freeze({
      bucketId: PRIVATE_BUCKET_ID,
      extension: ".jpg",
      maximumBytes: MAXIMUM_PRIVATE_BYTES,
    });
  }
  if (renditionKind === "storefront_webp" && mimeType === "image/webp") {
    return Object.freeze({
      bucketId: PUBLIC_BUCKET_ID,
      extension: ".webp",
      maximumBytes: MAXIMUM_PUBLIC_BYTES,
    });
  }

  throw new MediaStorageError("invalid");
};

export const resolveMediaObject = (descriptor: MediaObjectDescriptor): ResolvedMediaObject => {
  if (
    !isCanonicalUuid(descriptor.organizationId) ||
    !isCanonicalUuid(descriptor.mediaAssetId) ||
    descriptor.contentSha256Hex.length !== 64 ||
    !isLowerHex(descriptor.contentSha256Hex)
  ) {
    throw new MediaStorageError("invalid");
  }

  const contract = renditionContract(descriptor.renditionKind, descriptor.mimeType);
  return Object.freeze({
    bucketId: contract.bucketId,
    objectPath: `${descriptor.organizationId}/${descriptor.mediaAssetId}/${descriptor.renditionKind}/${descriptor.contentSha256Hex}${contract.extension}`,
    mimeType: descriptor.mimeType,
    maximumBytes: contract.maximumBytes,
  });
};

const createObjectEndpoint = (
  origin: URL,
  operation: "authenticated" | "object" | "public" | "sign",
  object: ResolvedMediaObject,
): URL => {
  const encodedPath = object.objectPath.split("/").map(encodeURIComponent).join("/");
  const endpoint = new URL(origin);
  endpoint.pathname = `/storage/v1/object/${operation === "object" ? "" : `${operation}/`}${encodeURIComponent(object.bucketId)}/${encodedPath}`;
  return endpoint;
};

const failureForStatus = (status: number): MediaStorageFailureKind => {
  if (status === 401 || status === 403) {
    return "rejected";
  }
  if (status === 409) {
    return "conflict";
  }
  if (status === 408 || status === 425 || status === 429 || status >= 500) {
    return "retryable";
  }
  return "invalid";
};

const boundedSignal = (
  timeoutMilliseconds: number,
  signal: AbortSignal | undefined,
): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(timeoutMilliseconds);
  return signal === undefined ? timeoutSignal : AbortSignal.any([signal, timeoutSignal]);
};

const classifyNetworkFailure = (
  error: unknown,
  callerSignal: AbortSignal | undefined,
  uploadStarted: boolean,
): MediaStorageError => {
  if (callerSignal?.aborted === true) {
    return new MediaStorageError("cancelled", error);
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return new MediaStorageError(uploadStarted ? "uncertain" : "timeout", error);
  }
  return new MediaStorageError(uploadStarted ? "uncertain" : "retryable", error);
};

const readLimitedBytes = async (response: Response, maximumBytes: number): Promise<Uint8Array> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      await response.body?.cancel();
      throw new MediaStorageError("invalid");
    }
  }

  if (response.body === null) {
    return new Uint8Array();
  }

  const responseBody: ReadableStream<Uint8Array> = response.body;
  const reader = responseBody.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    let result = await reader.read();
    while (!result.done) {
      const chunk = result.value;
      totalBytes += chunk.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new MediaStorageError("invalid");
      }
      chunks.push(chunk);
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
};

const decodeControlResponse = async (response: Response): Promise<unknown> => {
  const bytes = await readLimitedBytes(response, MAXIMUM_CONTROL_RESPONSE_BYTES);
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new MediaStorageError("uncertain", error);
  }
};

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validatedStorageOrigin = (value: string): URL => {
  const origin = new URL(value);
  const localHttp =
    origin.protocol === "http:" &&
    (origin.hostname === "127.0.0.1" || origin.hostname === "localhost");
  if (
    (origin.protocol !== "https:" && !localHttp) ||
    origin.username !== "" ||
    origin.password !== "" ||
    origin.pathname !== "/" ||
    origin.search !== "" ||
    origin.hash !== ""
  ) {
    throw new MediaStorageError("invalid");
  }
  return origin;
};

export const createMediaStorageClient = (
  input: CreateMediaStorageClientInput,
): MediaStorageClient => {
  if (
    !Number.isSafeInteger(input.timeoutMilliseconds) ||
    input.timeoutMilliseconds < 1 ||
    !Number.isSafeInteger(input.maximumDownloadBytes) ||
    input.maximumDownloadBytes < 1 ||
    input.maximumDownloadBytes > MAXIMUM_PRIVATE_BYTES
  ) {
    throw new MediaStorageError("invalid");
  }
  const origin = validatedStorageOrigin(input.supabaseUrl);
  const authorization = (): Readonly<Record<string, string>> => ({
    apikey: input.secretKey.reveal(),
    authorization: `Bearer ${input.secretKey.reveal()}`,
  });

  return Object.freeze({
    async uploadObject(descriptor, body, signal) {
      const object = resolveMediaObject(descriptor);
      if (body.byteLength < 1 || body.byteLength > object.maximumBytes) {
        throw new MediaStorageError("invalid");
      }
      const endpoint = createObjectEndpoint(origin, "object", object);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...authorization(),
            "cache-control": "max-age=31536000, immutable",
            "content-type": object.mimeType,
            "x-upsert": "false",
          },
          body,
          cache: "no-store",
          redirect: "error",
          signal: boundedSignal(input.timeoutMilliseconds, signal),
        });
      } catch (error) {
        throw classifyNetworkFailure(error, signal, true);
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new MediaStorageError(failureForStatus(response.status));
      }
      await response.body?.cancel();
      return object;
    },

    async downloadPrivateObject(descriptor, signal) {
      const object = resolveMediaObject(descriptor);
      if (object.bucketId !== PRIVATE_BUCKET_ID) {
        throw new MediaStorageError("invalid");
      }
      const endpoint = createObjectEndpoint(origin, "authenticated", object);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "GET",
          headers: { ...authorization(), accept: object.mimeType },
          cache: "no-store",
          redirect: "error",
          signal: boundedSignal(input.timeoutMilliseconds, signal),
        });
      } catch (error) {
        throw classifyNetworkFailure(error, signal, false);
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new MediaStorageError(failureForStatus(response.status));
      }
      const responseMimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
      if (responseMimeType !== object.mimeType) {
        await response.body?.cancel();
        throw new MediaStorageError("invalid");
      }
      return readLimitedBytes(response, Math.min(object.maximumBytes, input.maximumDownloadBytes));
    },

    async createSignedPrivateUrl(descriptor, expiresInSeconds, signal) {
      const object = resolveMediaObject(descriptor);
      if (
        object.bucketId !== PRIVATE_BUCKET_ID ||
        !Number.isSafeInteger(expiresInSeconds) ||
        expiresInSeconds < MINIMUM_SIGNED_URL_SECONDS ||
        expiresInSeconds > MAXIMUM_SIGNED_URL_SECONDS
      ) {
        throw new MediaStorageError("invalid");
      }
      const endpoint = createObjectEndpoint(origin, "sign", object);
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            ...authorization(),
            accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify({ expiresIn: expiresInSeconds }),
          cache: "no-store",
          redirect: "error",
          signal: boundedSignal(input.timeoutMilliseconds, signal),
        });
      } catch (error) {
        throw classifyNetworkFailure(error, signal, false);
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new MediaStorageError(failureForStatus(response.status));
      }
      const decoded = await decodeControlResponse(response);
      const signedPath = isRecord(decoded) ? decoded.signedURL : undefined;
      if (typeof signedPath !== "string" || signedPath.length < 1 || signedPath.length > 8192) {
        throw new MediaStorageError("uncertain");
      }
      const signedUrl = new URL(signedPath, origin);
      const expectedPath = createObjectEndpoint(origin, "sign", object).pathname;
      if (signedUrl.origin !== origin.origin || signedUrl.pathname !== expectedPath) {
        throw new MediaStorageError("uncertain");
      }
      return signedUrl;
    },

    createPublicObjectUrl(descriptor) {
      const object = resolveMediaObject(descriptor);
      if (object.bucketId !== PUBLIC_BUCKET_ID) {
        throw new MediaStorageError("invalid");
      }
      return createObjectEndpoint(origin, "public", object);
    },
  });
};
