import { describe, expect, it } from "vitest";

import { createReadinessState } from "../src/readiness.js";

describe("readiness state", () => {
  it("moves explicitly between not-ready and ready", () => {
    const state = createReadinessState();

    expect(state.isReady()).toBe(false);
    state.markReady();
    expect(state.isReady()).toBe(true);
    state.markNotReady();
    expect(state.isReady()).toBe(false);
  });
});
