import { createHash } from "node:crypto";

import { type SensitiveValue } from "@agentefer/config";
import { OperationalError } from "@agentefer/observability";
import sharp from "sharp";

const MAXIMUM_META_CONTROL_RESPONSE_BYTES = 65_536;
const MAXIMUM_INPUT_BYTES = 5_242_880;
const MAXIMUM_IMAGE_PIXELS = 50_000_000;
const MAXIMUM_IMAGE_DIMENSION = 100_000;
const MAXIMUM_FILE_NAME_LENGTH = 255;
const META_HOST_SUFFIXES = [".facebook.com", ".fbsbx.com"] as const;

export type SupportedImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export type WhatsAppMediaReference = Readonly<{
  apiVersion: string;
  phoneNumberId: string;
  mediaId: string;
  accessToken: SensitiveValue;
}>;

export type RetrievedWhatsAppMedia = Readonly<{
  bytes: Uint8Array;
  declaredMimeType: SupportedImageMimeType;
  declaredSha256Hex?: string;
  declaredFileSize?: number;
}>;

export type NormalizedImage = Readonly<{
  originalBytes: Uint8Array;
  originalMimeType: SupportedImageMimeType;
  originalSha256Hex: string;
  widthPixels: number;
  heightPixels: number;
  analysisWebpBytes: Uint8Array;
  analysisWebpSha256Hex: string;
  analysisWidthPixels: number;
  analysisHeightPixels: number;
  originalFileName?: string;
}>;

export type WhatsAppMediaFailureKind =
  "invalid" | "rejected" | "retryable" | "uncertain" | "cancelled" | "timeout";

export class WhatsAppMediaError extends OperationalError {
  readonly kind: WhatsAppMediaFailureKind;

  constructor(kind: WhatsAppMediaFailureKind, cause?: unknown) {
    const attributes = {
      invalid: {
        code: "WHATSAPP_MEDIA_INVALID",
        category: "validation" as const,
        retryable: false,
        severity: "warning" as const,
      },
      rejected: {
        code: "WHATSAPP_MEDIA_REJECTED",
        category: "authentication" as const,
        retryable: false,
        severity: "critical" as const,
      },
      retryable: {
        code: "WHATSAPP_MEDIA_RETRYABLE",
        category: "dependency" as const,
        retryable: true,
        severity: "error" as const,
      },
      uncertain: {
        code: "WHATSAPP_MEDIA_EFFECT_UNCERTAIN",
        category: "dependency" as const,
        retryable: false,
        severity: "critical" as const,
      },
      cancelled: {
        code: "WHATSAPP_MEDIA_CANCELLED",
        category: "internal" as const,
        retryable: true,
        severity: "warning" as const,
      },
      timeout: {
        code: "WHATSAPP_MEDIA_TIMEOUT",
        category: "timeout" as const,
        retryable: true,
        severity: "error" as const,
      },
    } as const;

    super({ ...attributes[kind], cause });
    this.name = "WhatsAppMediaError";
    this.kind = kind;
  }
}

export type WhatsAppMediaClient = Readonly<{
  retrieveImage(
    reference: WhatsAppMediaReference,
    signal?: AbortSignal,
  ): Promise<RetrievedWhatsAppMedia>;
}>;

type ControlResponse = Readonly<{
  url: string;
  mimeType: SupportedImageMimeType;
  sha256Hex?: string;
  fileSize?: number;
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

const supportedMime = (value: unknown): SupportedImageMimeType | undefined =>
  value === "image/jpeg" || value === "image/png" || value === "image/webp" ? value : undefined;

const isLowerHex = (value: string, length: number): boolean =>
  value.length === length &&
  Array.from(value).every(
    (character) => (character >= "0" && character <= "9") || (character >= "a" && character <= "f"),
  );

const graphFailureForStatus = (status: number): WhatsAppMediaFailureKind => {
  if (status === 401 || status === 403) {
    return "rejected";
  }
  if (status === 408 || status === 409 || status === 429 || status >= 500) {
    return "retryable";
  }
  if (status === 404) {
    return "retryable";
  }
  return "invalid";
};

const validateOrigin = (value: string): URL => {
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
    throw new WhatsAppMediaError("invalid");
  }
  return origin;
};

const isMetaDownloadHost = (hostname: string, configuredOrigin: URL): boolean =>
  hostname === configuredOrigin.hostname ||
  META_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));

const readLimitedBytes = async (response: Response, maximumBytes: number): Promise<Uint8Array> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 1 || parsedLength > maximumBytes) {
      await response.body?.cancel();
      throw new WhatsAppMediaError("invalid");
    }
  }
  if (response.body === null) {
    throw new WhatsAppMediaError("invalid");
  }
  const reader = response.body.getReader() as ReadableStreamDefaultReader<Uint8Array>;
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    let result = await reader.read();
    while (!result.done) {
      totalBytes += result.value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new WhatsAppMediaError("invalid");
      }
      chunks.push(result.value);
      result = await reader.read();
    }
  } finally {
    reader.releaseLock();
  }
  if (totalBytes < 1) {
    throw new WhatsAppMediaError("invalid");
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const readControlResponse = async (response: Response): Promise<ControlResponse> => {
  const bytes = await readLimitedBytes(response, MAXIMUM_META_CONTROL_RESPONSE_BYTES);
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    throw new WhatsAppMediaError("uncertain", error);
  }
  if (!isRecord(value) || typeof value.url !== "string" || value.url.length < 1) {
    throw new WhatsAppMediaError("uncertain");
  }
  const mimeType = supportedMime(value.mime_type);
  if (mimeType === undefined) {
    throw new WhatsAppMediaError("invalid");
  }
  const sha256Hex =
    typeof value.sha256 === "string" && isLowerHex(value.sha256, 64) ? value.sha256 : undefined;
  const fileSize =
    typeof value.file_size === "number" &&
    Number.isSafeInteger(value.file_size) &&
    value.file_size > 0
      ? value.file_size
      : undefined;
  return Object.freeze({
    url: value.url,
    mimeType,
    ...(sha256Hex === undefined ? {} : { sha256Hex }),
    ...(fileSize === undefined ? {} : { fileSize }),
  });
};

const requestFailure = (error: unknown, signal: AbortSignal | undefined): WhatsAppMediaError => {
  if (signal?.aborted === true) {
    return new WhatsAppMediaError("cancelled", error);
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return new WhatsAppMediaError("timeout", error);
  }
  return new WhatsAppMediaError("retryable", error);
};

const hashHex = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const mimeForSharpFormat = (format: string | undefined): SupportedImageMimeType | undefined =>
  format === "jpeg"
    ? "image/jpeg"
    : format === "png"
      ? "image/png"
      : format === "webp"
        ? "image/webp"
        : undefined;

export const normalizeImage = async (
  media: RetrievedWhatsAppMedia,
  originalFileName?: string,
): Promise<NormalizedImage> => {
  if (media.bytes.byteLength < 1 || media.bytes.byteLength > MAXIMUM_INPUT_BYTES) {
    throw new WhatsAppMediaError("invalid");
  }
  const originalSha256Hex = hashHex(media.bytes);
  if (media.declaredSha256Hex !== undefined && media.declaredSha256Hex !== originalSha256Hex) {
    throw new WhatsAppMediaError("invalid");
  }
  if (media.declaredFileSize !== undefined && media.declaredFileSize !== media.bytes.byteLength) {
    throw new WhatsAppMediaError("invalid");
  }
  try {
    const image = sharp(media.bytes, {
      limitInputPixels: MAXIMUM_IMAGE_PIXELS,
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    const widthPixels = metadata.width;
    const heightPixels = metadata.height;
    const actualMimeType = mimeForSharpFormat(metadata.format);
    if (
      actualMimeType !== media.declaredMimeType ||
      !Number.isSafeInteger(widthPixels) ||
      !Number.isSafeInteger(heightPixels) ||
      widthPixels < 1 ||
      heightPixels < 1 ||
      widthPixels > MAXIMUM_IMAGE_DIMENSION ||
      heightPixels > MAXIMUM_IMAGE_DIMENSION ||
      widthPixels * heightPixels > MAXIMUM_IMAGE_PIXELS ||
      (metadata.pages !== undefined && metadata.pages > 1)
    ) {
      throw new WhatsAppMediaError("invalid");
    }
    const analysis = await image.rotate().webp({ quality: 85, effort: 4 }).toBuffer({
      resolveWithObject: true,
    });
    const analysisMetadata = await sharp(analysis.data, {
      limitInputPixels: MAXIMUM_IMAGE_PIXELS,
    }).metadata();
    if (
      analysis.info.format !== "webp" ||
      !Number.isSafeInteger(analysisMetadata.width) ||
      !Number.isSafeInteger(analysisMetadata.height)
    ) {
      throw new WhatsAppMediaError("uncertain");
    }
    if (
      originalFileName !== undefined &&
      (originalFileName.trim() !== originalFileName ||
        originalFileName.length < 1 ||
        originalFileName.length > MAXIMUM_FILE_NAME_LENGTH)
    ) {
      throw new WhatsAppMediaError("invalid");
    }
    return Object.freeze({
      originalBytes: media.bytes,
      originalMimeType: media.declaredMimeType,
      originalSha256Hex,
      widthPixels,
      heightPixels,
      analysisWebpBytes: analysis.data,
      analysisWebpSha256Hex: hashHex(analysis.data),
      analysisWidthPixels: analysisMetadata.width,
      analysisHeightPixels: analysisMetadata.height,
      ...(originalFileName === undefined ? {} : { originalFileName }),
    });
  } catch (error) {
    if (error instanceof WhatsAppMediaError) {
      throw error;
    }
    throw new WhatsAppMediaError("invalid", error);
  }
};

export const createWhatsAppMediaClient = (
  graphOrigin = "https://graph.facebook.com/",
  timeoutMilliseconds = 30_000,
): WhatsAppMediaClient => {
  const origin = validateOrigin(graphOrigin);
  if (!Number.isSafeInteger(timeoutMilliseconds) || timeoutMilliseconds < 1) {
    throw new WhatsAppMediaError("invalid");
  }
  return Object.freeze({
    async retrieveImage(reference, signal) {
      if (
        !pathSegmentIsSafe(reference.apiVersion) ||
        !pathSegmentIsSafe(reference.phoneNumberId) ||
        !pathSegmentIsSafe(reference.mediaId)
      ) {
        throw new WhatsAppMediaError("invalid");
      }
      const requestSignal =
        signal === undefined
          ? AbortSignal.timeout(timeoutMilliseconds)
          : AbortSignal.any([signal, AbortSignal.timeout(timeoutMilliseconds)]);
      const endpoint = new URL(
        `${reference.apiVersion}/${reference.mediaId}?phone_number_id=${encodeURIComponent(reference.phoneNumberId)}`,
        origin,
      );
      let controlResponse: Response;
      try {
        controlResponse = await fetch(endpoint, {
          method: "GET",
          headers: {
            accept: "application/json",
            authorization: `Bearer ${reference.accessToken.reveal()}`,
          },
          cache: "no-store",
          redirect: "error",
          signal: requestSignal,
        });
      } catch (error) {
        throw requestFailure(error, signal);
      }
      if (!controlResponse.ok) {
        await controlResponse.body?.cancel();
        throw new WhatsAppMediaError(graphFailureForStatus(controlResponse.status));
      }
      let control: ControlResponse;
      try {
        control = await readControlResponse(controlResponse);
      } catch (error) {
        if (error instanceof WhatsAppMediaError) {
          throw error;
        }
        throw new WhatsAppMediaError("uncertain", error);
      }
      let mediaUrl: URL;
      try {
        mediaUrl = new URL(control.url);
      } catch (error) {
        throw new WhatsAppMediaError("invalid", error);
      }
      if (
        mediaUrl.protocol !== origin.protocol ||
        mediaUrl.username !== "" ||
        mediaUrl.password !== "" ||
        !isMetaDownloadHost(mediaUrl.hostname, origin)
      ) {
        throw new WhatsAppMediaError("invalid");
      }
      let mediaResponse: Response;
      try {
        mediaResponse = await fetch(mediaUrl, {
          method: "GET",
          headers: {
            accept: control.mimeType,
            authorization: `Bearer ${reference.accessToken.reveal()}`,
          },
          cache: "no-store",
          redirect: "error",
          signal: requestSignal,
        });
      } catch (error) {
        throw requestFailure(error, signal);
      }
      if (!mediaResponse.ok) {
        await mediaResponse.body?.cancel();
        throw new WhatsAppMediaError(graphFailureForStatus(mediaResponse.status));
      }
      const responseMimeType = mediaResponse.headers.get("content-type")?.split(";", 1)[0]?.trim();
      if (responseMimeType !== control.mimeType) {
        await mediaResponse.body?.cancel();
        throw new WhatsAppMediaError("invalid");
      }
      const bytes = await readLimitedBytes(mediaResponse, MAXIMUM_INPUT_BYTES);
      return Object.freeze({
        bytes,
        declaredMimeType: control.mimeType,
        ...(control.sha256Hex === undefined ? {} : { declaredSha256Hex: control.sha256Hex }),
        ...(control.fileSize === undefined ? {} : { declaredFileSize: control.fileSize }),
      });
    },
  });
};
