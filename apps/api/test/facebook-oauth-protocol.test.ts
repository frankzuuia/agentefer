import { describe, expect, it } from "vitest";

import {
  parseFacebookOAuthCompleteBody,
  parseFacebookOAuthExchangeBody,
  parseFacebookOAuthStartBody,
} from "../src/facebook-oauth-protocol.js";

const organizationId = "b4071000-0000-4000-8000-000000000001";
const oauthSessionId = "b4071000-0000-4000-8000-000000000002";

describe("Facebook OAuth browser protocol", () => {
  it("accepts only the exact start contract", () => {
    expect(parseFacebookOAuthStartBody({ organizationId })).toEqual({ organizationId });
    expect(parseFacebookOAuthStartBody({ organizationId, extra: true })).toBeUndefined();
    expect(parseFacebookOAuthStartBody({ organizationId: "not-a-uuid" })).toBeUndefined();
    expect(parseFacebookOAuthStartBody(null)).toBeUndefined();
  });

  it("accepts bounded authorization code and state without normalization", () => {
    const state = "s".repeat(43);
    const code = "facebook-code-value";
    expect(parseFacebookOAuthExchangeBody({ state, code })).toEqual({ state, code });
    expect(parseFacebookOAuthExchangeBody({ state: ` ${state}`, code })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state, code: "short" })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state, code, extra: true })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state: "s".repeat(129), code })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state, code: `valid\u0000code` })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state, code: `valid\u007fcode` })).toBeUndefined();
    expect(parseFacebookOAuthExchangeBody({ state, code: "valid code" })).toEqual({
      state,
      code: "valid code",
    });
    expect(parseFacebookOAuthExchangeBody({ state: 123, code })).toBeUndefined();
  });

  it("preserves the exact inclusive OAuth boundaries", () => {
    expect(
      parseFacebookOAuthExchangeBody({ state: "s".repeat(32), code: "c".repeat(8) }),
    ).toBeDefined();
    expect(
      parseFacebookOAuthExchangeBody({ state: "s".repeat(128), code: "c".repeat(4_096) }),
    ).toBeDefined();
    expect(
      parseFacebookOAuthExchangeBody({ state: "s".repeat(31), code: "c".repeat(8) }),
    ).toBeUndefined();
    expect(
      parseFacebookOAuthExchangeBody({ state: "s".repeat(32), code: "c".repeat(4_097) }),
    ).toBeUndefined();
  });

  it("accepts only a UUID session and decimal Page identifier", () => {
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "123456789" })).toEqual({
      oauthSessionId,
      pageId: "123456789",
    });
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "page-123" })).toBeUndefined();
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "103" })).toEqual({
      oauthSessionId,
      pageId: "103",
    });
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "/123" })).toBeUndefined();
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: ":123" })).toBeUndefined();
    expect(parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "" })).toBeUndefined();
    expect(
      parseFacebookOAuthCompleteBody({ oauthSessionId: "invalid", pageId: "123" }),
    ).toBeUndefined();
    expect(parseFacebookOAuthCompleteBody(null)).toBeUndefined();
    expect(
      parseFacebookOAuthCompleteBody({ oauthSessionId, pageId: "123", extra: true }),
    ).toBeUndefined();
  });
});
