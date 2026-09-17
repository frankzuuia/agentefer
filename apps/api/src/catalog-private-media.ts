import { AdminMetaGatewayError } from "./admin-meta-gateway.js";

export const PRIVATE_CATALOG_BUCKET = "agentefer-catalog-private";
export const PRIVATE_CATALOG_SIGN_PREFIX = `/storage/v1/object/sign/${PRIVATE_CATALOG_BUCKET}/`;
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Validate every returned signature against the already authorized set of object paths. */
export function resolveCatalogSignedUrls(
  value: unknown,
  paths: readonly string[],
  origin: URL,
): ReadonlyMap<string, string> {
  if (!Array.isArray(value) || value.length !== paths.length || paths.length > 192) {
    throw new AdminMetaGatewayError("dependency");
  }
  const expected = new Set(paths);
  if (expected.size !== paths.length) throw new AdminMetaGatewayError("dependency");
  const signed = new Map<string, string>();
  for (const entry of value as readonly unknown[]) {
    if (
      !isRecord(entry) ||
      typeof entry.path !== "string" ||
      !expected.has(entry.path) ||
      signed.has(entry.path) ||
      (entry.error !== undefined && entry.error !== null) ||
      typeof entry.signedURL !== "string" ||
      entry.signedURL.length > 8192
    )
      throw new AdminMetaGatewayError("dependency");
    let url: URL;
    try {
      // Storage returns paths relative to its /storage/v1 API root, not the project root.
      url = new URL(
        entry.signedURL.startsWith("/object/sign/")
          ? `/storage/v1${entry.signedURL}`
          : entry.signedURL,
        origin,
      );
    } catch {
      throw new AdminMetaGatewayError("dependency");
    }
    const expectedPath =
      PRIVATE_CATALOG_SIGN_PREFIX + entry.path.split("/").map(encodeURIComponent).join("/");
    if (
      url.origin !== origin.origin ||
      url.pathname !== expectedPath ||
      url.username !== "" ||
      url.password !== "" ||
      url.hash !== "" ||
      !url.searchParams.get("token") ||
      [...url.searchParams.keys()].some((key) => key !== "token") ||
      url.searchParams.getAll("token").length !== 1
    )
      throw new AdminMetaGatewayError("dependency");
    signed.set(entry.path, url.toString());
  }
  return signed;
}
