import { describe, expect, it } from "vitest";

import {
  resolveContinuationDisposition,
  resolveOutputTokenRequest,
  type NormalizedTerminationReason,
} from "../src/index.js";

describe("provider-neutral output policy", () => {
  it("omits an artificial cap when the provider parameter is optional", () => {
    expect(resolveOutputTokenRequest("optional")).toEqual({});
    expect(
      resolveOutputTokenRequest("optional", {
        maximumSafeOutputTokens: 200_000,
        source: "versioned_capability",
        verifiedAt: "2026-08-09T00:00:00.000Z",
      }),
    ).toEqual({});
  });

  it("uses the verified safe maximum only when the provider requires it", () => {
    expect(
      resolveOutputTokenRequest("required", {
        maximumSafeOutputTokens: 200_000,
        source: "provider_discovery",
        verifiedAt: "2026-08-09T00:00:00.000Z",
      }),
    ).toEqual({ maxOutputTokens: 200_000 });
  });

  it.each([undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "fails closed for an unverified or invalid provider-required maximum: %s",
    (maximumSafeOutputTokens) => {
      const capability =
        maximumSafeOutputTokens === undefined
          ? undefined
          : {
              maximumSafeOutputTokens,
              source: "versioned_capability" as const,
              verifiedAt: "2026-08-09T00:00:00.000Z",
            };

      expect(() => resolveOutputTokenRequest("required", capability)).toThrow(
        "needs a verified positive model capability",
      );
    },
  );
});

describe("normalized termination recovery", () => {
  it.each<readonly [NormalizedTerminationReason, boolean, string]>([
    ["completed", false, "finish"],
    ["tool_calls", false, "execute_tools"],
    ["output_limit", true, "continue_from_checkpoint"],
    ["context_limit", true, "continue_from_checkpoint"],
    ["output_limit", false, "halt_safely"],
    ["context_limit", false, "halt_safely"],
    ["content_filter", true, "halt_safely"],
    ["cancelled", true, "halt_safely"],
    ["provider_error", true, "halt_safely"],
  ])("maps %s with checkpoint=%s to %s", (reason, hasProviderCheckpoint, expected) => {
    expect(resolveContinuationDisposition({ reason, hasProviderCheckpoint })).toBe(expected);
  });
});
