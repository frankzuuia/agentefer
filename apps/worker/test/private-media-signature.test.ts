import { describe, expect, it } from "vitest";
import { resolvePrivateMediaSignedUrl } from "../src/media-storage.js";

// Pure provider contract, no HTTP or storage simulation.
const origin = new URL("https://storage.example.invalid");
const relative = "/object/sign/agentefer-catalog-private/tenant/asset/analysis_webp/hash.webp";
const expectedPath = `/storage/v1${relative}`;
const signed = `${relative}?token=signature`;

describe("vision private media signature", () => {
  it.each([signed, `/storage/v1${signed}`, `${origin.origin}/storage/v1${signed}`])(
    "resolves the official relative path and compatible canonical forms %#",
    (input) => {
      expect(resolvePrivateMediaSignedUrl(input, origin, expectedPath).toString()).toBe(
        `${origin.origin}/storage/v1${signed}`,
      );
    },
  );
  it.each([
    undefined,
    null,
    {},
    1,
    "",
    "http://[",
    signed.replace("tenant/asset", "other/asset"),
    signed.replace("analysis_webp", "source_original"),
    signed.replace("agentefer-catalog-private", "another-bucket"),
    relative,
    `${relative}?token=`,
    `${signed}&token=other`,
    `${signed}&download=1`,
    `${signed}#fragment`,
    `https://other.invalid/storage/v1${signed}`,
    `https://user@storage.example.invalid/storage/v1${signed}`,
    `https://:pass@storage.example.invalid/storage/v1${signed}`,
    `https://user:pass@storage.example.invalid/storage/v1${signed}`,
  ])("rejects malformed or unbound signatures %#", (input) => {
    expect(() => resolvePrivateMediaSignedUrl(input, origin, expectedPath)).toThrow(
      expect.objectContaining({ kind: "uncertain" }),
    );
  });
  it("accepts the maximum bounded signature", () => {
    const prefix = `${relative}?token=`;
    expect(
      resolvePrivateMediaSignedUrl(prefix + "t".repeat(8192 - prefix.length), origin, expectedPath)
        .pathname,
    ).toBe(expectedPath);
  });
  it("rejects an otherwise valid oversized signature", () => {
    const prefix = `${relative}?token=`;
    expect(() =>
      resolvePrivateMediaSignedUrl(prefix + "t".repeat(8193 - prefix.length), origin, expectedPath),
    ).toThrow(expect.objectContaining({ kind: "uncertain" }));
  });
});
