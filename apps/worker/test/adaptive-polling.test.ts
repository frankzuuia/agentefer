import { getEventListeners } from "node:events";

import { describe, expect, it } from "vitest";

import {
  createAdaptivePoller,
  type AdaptivePollingConfiguration,
} from "../src/adaptive-polling.js";

const createPoller = (overrides: Partial<AdaptivePollingConfiguration> = {}) =>
  createAdaptivePoller({
    configuration: {
      baseIntervalMilliseconds: 100,
      maximumIdleIntervalMilliseconds: 1_000,
      jitterPercent: 0,
      ...overrides,
    },
  });

describe("adaptive durable polling", () => {
  it("backs off empty and failed cycles, then resets immediately after work", () => {
    const poller = createPoller();

    expect(poller.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 200,
      consecutiveIdleCycles: 1,
    });
    expect(poller.decide("failed")).toEqual({
      outcome: "failed",
      delayMilliseconds: 400,
      consecutiveIdleCycles: 2,
    });
    expect(poller.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 800,
      consecutiveIdleCycles: 3,
    });
    expect(poller.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 1_000,
      consecutiveIdleCycles: 4,
    });
    expect(poller.decide("active")).toEqual({
      outcome: "active",
      delayMilliseconds: 100,
      consecutiveIdleCycles: 0,
    });
  });

  it("saturates the idle streak at its configured maximum", () => {
    const poller = createPoller({ maximumIdleIntervalMilliseconds: 500 });

    for (let index = 0; index < 12; index += 1) {
      poller.decide("idle");
    }

    expect(poller.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 500,
      consecutiveIdleCycles: 4,
    });
  });

  it("keeps jitter inside the configured interval without dropping below the base interval", () => {
    const lower = createAdaptivePoller({
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 10,
      },
      random: () => 0,
    });
    const upper = createAdaptivePoller({
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 10,
      },
      random: () => 1,
    });

    expect(lower.decide("idle").delayMilliseconds).toBe(180);
    expect(upper.decide("idle").delayMilliseconds).toBe(220);
  });

  it("does not call random when jitter is disabled", () => {
    const poller = createAdaptivePoller({
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 0,
      },
      random: () => {
        throw new Error("random must not run with zero jitter");
      },
    });

    expect(poller.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 200,
      consecutiveIdleCycles: 1,
    });
  });

  it("wakes a pending interval immediately without creating a concurrent cycle", async () => {
    const poller = createPoller();
    const controller = new AbortController();
    const waiting = poller.wait(
      Object.freeze({
        outcome: "idle" as const,
        delayMilliseconds: 60_000,
        consecutiveIdleCycles: 1,
      }),
      controller.signal,
    );

    poller.wake();

    await expect(waiting).resolves.toBe("woken");
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("finishes an ordinary interval and removes its abort listener", async () => {
    const poller = createPoller();
    const controller = new AbortController();

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "active" as const,
          delayMilliseconds: 1,
          consecutiveIdleCycles: 0,
        }),
        controller.signal,
      ),
    ).resolves.toBe("elapsed");

    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("does not register a listener when waiting starts after shutdown", async () => {
    const poller = createPoller();
    const controller = new AbortController();
    controller.abort();

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "idle" as const,
          delayMilliseconds: 60_000,
          consecutiveIdleCycles: 1,
        }),
        controller.signal,
      ),
    ).resolves.toBe("aborted");

    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
  });

  it("preserves a wake that arrives before the consumer starts waiting", async () => {
    const poller = createPoller();
    const controller = new AbortController();
    poller.wake();

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "idle" as const,
          delayMilliseconds: 10,
          consecutiveIdleCycles: 1,
        }),
        controller.signal,
      ),
    ).resolves.toBe("woken");

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "idle" as const,
          delayMilliseconds: 1,
          consecutiveIdleCycles: 1,
        }),
        controller.signal,
      ),
    ).resolves.toBe("elapsed");
  });

  it("clears a completed wait so a later signal reaches the next wait", async () => {
    const poller = createPoller();
    const controller = new AbortController();

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "active" as const,
          delayMilliseconds: 1,
          consecutiveIdleCycles: 0,
        }),
        controller.signal,
      ),
    ).resolves.toBe("elapsed");

    poller.wake();

    await expect(
      poller.wait(
        Object.freeze({
          outcome: "idle" as const,
          delayMilliseconds: 10,
          consecutiveIdleCycles: 1,
        }),
        controller.signal,
      ),
    ).resolves.toBe("woken");
  });

  it("cleans its wait on shutdown and rejects unsafe operator configuration", async () => {
    const poller = createPoller();
    const controller = new AbortController();
    const waiting = poller.wait(
      Object.freeze({
        outcome: "idle" as const,
        delayMilliseconds: 60_000,
        consecutiveIdleCycles: 1,
      }),
      controller.signal,
    );
    controller.abort();

    await expect(waiting).resolves.toBe("aborted");
    expect(getEventListeners(controller.signal, "abort")).toHaveLength(0);
    expect(() =>
      createAdaptivePoller({
        configuration: {
          baseIntervalMilliseconds: 1_000,
          maximumIdleIntervalMilliseconds: 999,
          jitterPercent: 0,
        },
      }),
    ).toThrow("maximumIdleIntervalMilliseconds");
  });

  it.each([
    {
      configuration: {
        baseIntervalMilliseconds: 0,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 0,
      },
      message: "baseIntervalMilliseconds must be a positive safe integer",
    },
    {
      configuration: {
        baseIntervalMilliseconds: 100.5,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 0,
      },
      message: "baseIntervalMilliseconds must be a positive safe integer",
    },
    {
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 0,
        jitterPercent: 0,
      },
      message: "maximumIdleIntervalMilliseconds must be a positive safe integer",
    },
    {
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: -0.1,
      },
      message: "jitterPercent must be a finite number between 0 and 50",
    },
    {
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 50.1,
      },
      message: "jitterPercent must be a finite number between 0 and 50",
    },
    {
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: Number.NaN,
      },
      message: "jitterPercent must be a finite number between 0 and 50",
    },
  ])("rejects invalid scheduler configuration", ({ configuration, message }) => {
    expect(() => createAdaptivePoller({ configuration })).toThrow(message);
  });

  it("allows equal base and maximum bounds, then rejects malformed random sources", () => {
    const fixed = createAdaptivePoller({
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 100,
        jitterPercent: 0,
      },
    });
    expect(fixed.decide("idle")).toEqual({
      outcome: "idle",
      delayMilliseconds: 100,
      consecutiveIdleCycles: 1,
    });

    const highestValidJitter = createAdaptivePoller({
      configuration: {
        baseIntervalMilliseconds: 100,
        maximumIdleIntervalMilliseconds: 1_000,
        jitterPercent: 50,
      },
      random: () => 1,
    });
    expect(highestValidJitter.decide("idle").delayMilliseconds).toBe(300);

    for (const invalidRandomValue of [Number.NaN, -0.01, 1.01]) {
      const poller = createAdaptivePoller({
        configuration: {
          baseIntervalMilliseconds: 100,
          maximumIdleIntervalMilliseconds: 1_000,
          jitterPercent: 10,
        },
        random: () => invalidRandomValue,
      });
      expect(() => poller.decide("idle")).toThrow(
        "random must return a finite number between 0 and 1",
      );
    }
  });
});
