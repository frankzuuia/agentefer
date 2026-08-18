import { describe, expect, it } from "vitest";

import {
  META_SIGNATURE_PREFIX,
  parseMetaChallengeQuery,
  parseMetaEndpointKey,
  parseMetaSignatureHeader,
} from "../src/meta-webhook-protocol.js";

describe("Meta opaque endpoint protocol", () => {
  it("accepts a canonical UUID without assigning tenant meaning in the route", () => {
    expect(parseMetaEndpointKey("B4021000-0000-4000-8000-000000000001")).toBe(
      "b4021000-0000-4000-8000-000000000001",
    );
  });

  it.each([
    "00000000-0000-0000-0000-000000000000",
    "FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF",
    "99999999-9999-9999-9999-999999999999",
  ])("accepts every hexadecimal boundary in an opaque UUID: %s", (value) => {
    expect(parseMetaEndpointKey(value)).toBe(value.toLowerCase());
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "b4021000-0000-4000-8000-00000000001",
    "b40210000-0000-4000-8000-000000000001",
    "b4021000_0000-4000-8000-000000000001",
    "b4021000-0000-4000-8000-00000000000@",
    "b4021000-0000-4000-8000-00000000000:",
    "b4021000-0000-4000-8000-00000000000g",
  ])("rejects a malformed opaque endpoint key: %j", (value) => {
    expect(parseMetaEndpointKey(value)).toBeUndefined();
  });
});

describe("Meta raw-body signature header", () => {
  it("returns only normalized HMAC bytes encoded as hex", () => {
    const signature = "A1".repeat(32);

    expect(parseMetaSignatureHeader(`${META_SIGNATURE_PREFIX}${signature}`)).toBe(
      signature.toLowerCase(),
    );
  });

  it.each(["0", "9", "a", "f", "A", "F"])(
    "accepts a signature made from the hexadecimal boundary character %s",
    (character) => {
      expect(parseMetaSignatureHeader(`sha256=${character.repeat(64)}`)).toBe(
        character.toLowerCase().repeat(64),
      );
    },
  );

  it.each(["/", ":", "@", "G"])(
    "rejects a signature containing the adjacent non-hex character %s",
    (character) => {
      expect(parseMetaSignatureHeader(`sha256=${character.repeat(64)}`)).toBeUndefined();
    },
  );

  it.each([
    undefined,
    null,
    ["sha256=abc"],
    "",
    "sha1=" + "a".repeat(64),
    "SHA256=" + "a".repeat(64),
    "sha256=" + "a".repeat(63),
    "sha256=" + "a".repeat(65),
    "sha256=" + "g".repeat(64),
  ])("rejects an invalid signature envelope: %j", (value) => {
    expect(parseMetaSignatureHeader(value)).toBeUndefined();
  });
});

describe("Meta webhook challenge query", () => {
  it("preserves the exact challenge and verify token bytes", () => {
    expect(
      parseMetaChallengeQuery({
        "hub.mode": "subscribe",
        "hub.verify_token": "exact-verify-token-value",
        "hub.challenge": "00123456789",
      }),
    ).toEqual({
      mode: "subscribe",
      verifyToken: "exact-verify-token-value",
      challenge: "00123456789",
    });
  });

  it("accepts exact protocol length boundaries without truncation", () => {
    const minimumToken = "v".repeat(16);
    const maximumToken = "v".repeat(512);
    const maximumChallenge = "c".repeat(1024);

    expect(
      parseMetaChallengeQuery({
        "hub.mode": "subscribe",
        "hub.verify_token": minimumToken,
        "hub.challenge": "1",
      }),
    ).toEqual({ mode: "subscribe", verifyToken: minimumToken, challenge: "1" });
    expect(
      parseMetaChallengeQuery({
        "hub.mode": "subscribe",
        "hub.verify_token": maximumToken,
        "hub.challenge": maximumChallenge,
      }),
    ).toEqual({
      mode: "subscribe",
      verifyToken: maximumToken,
      challenge: maximumChallenge,
    });
  });

  it.each([
    undefined,
    null,
    [],
    "query",
    {},
    {
      "hub.mode": "unsubscribe",
      "hub.verify_token": "exact-verify-token-value",
      "hub.challenge": "123",
    },
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "short",
      "hub.challenge": "123",
    },
    {
      "hub.mode": "subscribe",
      "hub.verify_token": ["exact-verify-token-value"],
      "hub.challenge": "123",
    },
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "exact-verify-token-value",
      "hub.challenge": "",
    },
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "v".repeat(513),
      "hub.challenge": "123",
    },
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "exact-verify-token-value",
      "hub.challenge": "c".repeat(1025),
    },
  ])("rejects an ambiguous or unbounded challenge query: %j", (query) => {
    expect(parseMetaChallengeQuery(query)).toBeUndefined();
  });
});
