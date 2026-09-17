import { describe, expect, it } from "vitest";
import {
  PRIVATE_CATALOG_BUCKET,
  PRIVATE_CATALOG_SIGN_PREFIX,
  resolveCatalogSignedUrls,
} from "../src/catalog-private-media.js";

// Pure security-contract inputs: no mocked SDK, HTTP service, account or storage object.
const origin = new URL("https://storage.example.invalid");
const path = "tenant/asset/analysis_webp/hash.webp";
const signedPath = `/object/sign/agentefer-catalog-private/${path}?token=opaque-test-signature`;
describe("private catalog signature binding", () => {
  it("restricts the signing namespace to the project private bucket", () => {
    expect(PRIVATE_CATALOG_BUCKET).toBe("agentefer-catalog-private");
    expect(PRIVATE_CATALOG_SIGN_PREFIX).toBe("/storage/v1/object/sign/agentefer-catalog-private/");
  });
  it("accepts a full page of distinct valid signatures", () => {
    const paths = Array.from({ length: 192 }, (_, i) => `${path}${String(i)}`);
    expect(
      resolveCatalogSignedUrls(
        paths.map((value) => ({
          path: value,
          signedURL: `/object/sign/agentefer-catalog-private/${value}?token=signature`,
        })),
        paths,
        origin,
      ).size,
    ).toBe(192);
  });
  it.each([8192, 8193])("enforces the exact signature length boundary %i", (length) => {
    const prefix = `/object/sign/agentefer-catalog-private/${path}?token=`;
    const signedURL = prefix + "t".repeat(length - prefix.length);
    const resolve = () => resolveCatalogSignedUrls([{ path, signedURL }], [path], origin);
    if (length === 8192) expect(resolve().size).toBe(1);
    else expect(resolve).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
  it("rejects a short response even when each returned path is valid", () => {
    expect(() => resolveCatalogSignedUrls([], [path], origin)).toThrow(
      expect.objectContaining({ kind: "dependency" }),
    );
  });
  it("rejects oversized valid batches", () => {
    const paths = Array.from({ length: 193 }, (_, i) => `${path}${String(i)}`);
    expect(() =>
      resolveCatalogSignedUrls(
        paths.map((value) => ({
          path: value,
          signedURL: `/object/sign/agentefer-catalog-private/${value}?token=signature`,
        })),
        paths,
        origin,
      ),
    ).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
  it("rejects non-record objects with otherwise valid properties", () => {
    for (const value of [
      Object.assign(() => undefined, { path, signedURL: signedPath }),
      Object.assign([], { path, signedURL: signedPath }),
    ]) {
      expect(() => resolveCatalogSignedUrls([value], [path], origin)).toThrow(
        expect.objectContaining({ kind: "dependency" }),
      );
    }
  });
  it("binds API-relative signatures to the Storage API root", () => {
    expect(
      resolveCatalogSignedUrls([{ path, signedURL: signedPath, error: null }], [path], origin).get(
        path,
      ),
    ).toBe(`https://storage.example.invalid/storage/v1${signedPath}`);
  });
  it("accepts an absolute signature only for the same origin and exact path", () => {
    const url = `https://storage.example.invalid/storage/v1${signedPath}`;
    expect(resolveCatalogSignedUrls([{ path, signedURL: url }], [path], origin).get(path)).toBe(
      url,
    );
  });
  it("accepts an empty authorized set without producing a signature", () => {
    expect(resolveCatalogSignedUrls([], [], origin).size).toBe(0);
  });
  it.each([
    null,
    {},
    "payload",
    [null],
    ["entry"],
    [{ path }],
    [{ path, signedURL: 1 }],
    [{ path, signedURL: signedPath, error: "missing" }],
    [{ path: "other", signedURL: signedPath }],
    [{ path, signedURL: "x".repeat(8193) }],
    [{ path, signedURL: "http://[" }],
    [
      { path, signedURL: signedPath },
      { path, signedURL: signedPath },
    ],
  ])("rejects malformed or mismatched result %#", (input) => {
    expect(() => resolveCatalogSignedUrls(input, [path], origin)).toThrow(
      expect.objectContaining({ kind: "dependency" }),
    );
  });
  it.each([
    `https://other.invalid/storage/v1${signedPath}`,
    `https://user@storage.example.invalid/storage/v1${signedPath}`,
    `https://user:pass@storage.example.invalid/storage/v1${signedPath}`,
    `https://:pass@storage.example.invalid/storage/v1${signedPath}`,
    `${signedPath}#fragment`,
    `${signedPath}&download=true`,
    `${signedPath}&token=second`,
    signedPath.replace("?token=opaque-test-signature", ""),
    signedPath.replace("opaque-test-signature", ""),
    signedPath.replace("tenant/asset", "other-tenant/asset"),
    signedPath.replace("analysis_webp", "source_original"),
    signedPath.replace("agentefer-catalog-private", "agentefer-catalog-public"),
  ])("rejects an unbound signed URL %#", (signedURL) => {
    expect(() => resolveCatalogSignedUrls([{ path, signedURL }], [path], origin)).toThrow(
      expect.objectContaining({ kind: "dependency" }),
    );
  });
  it("rejects duplicate requested paths", () => {
    expect(() =>
      resolveCatalogSignedUrls(
        [
          { path, signedURL: signedPath },
          { path, signedURL: signedPath },
        ],
        [path, path],
        origin,
      ),
    ).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
  it("rejects an internally valid signature for an unrequested object", () => {
    expect(() =>
      resolveCatalogSignedUrls(
        [
          {
            path: "unrequested",
            signedURL: "/object/sign/agentefer-catalog-private/unrequested?token=valid",
          },
        ],
        [path],
        origin,
      ),
    ).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
  it("rejects duplicate response paths even with the correct response length", () => {
    expect(() =>
      resolveCatalogSignedUrls(
        [
          { path, signedURL: signedPath },
          { path, signedURL: signedPath },
        ],
        [path, "second"],
        origin,
      ),
    ).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
  it("bounds the signing response to a catalog page", () => {
    expect(() =>
      resolveCatalogSignedUrls(
        Array.from({ length: 193 }),
        Array.from({ length: 193 }, (_, i) => String(i)),
        origin,
      ),
    ).toThrow(expect.objectContaining({ kind: "dependency" }));
  });
});
