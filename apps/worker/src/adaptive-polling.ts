export const pollingCycleOutcomes = ["active", "idle", "failed"] as const;

export type PollingCycleOutcome = (typeof pollingCycleOutcomes)[number];

export type AdaptivePollingConfiguration = Readonly<{
  baseIntervalMilliseconds: number;
  maximumIdleIntervalMilliseconds: number;
  jitterPercent: number;
}>;

export type AdaptivePollingDecision = Readonly<{
  outcome: PollingCycleOutcome;
  delayMilliseconds: number;
  consecutiveIdleCycles: number;
}>;

export const adaptivePollingWaitResults = ["elapsed", "woken", "aborted"] as const;

export type AdaptivePollingWaitResult = (typeof adaptivePollingWaitResults)[number];

export type AdaptivePoller = Readonly<{
  decide(outcome: PollingCycleOutcome): AdaptivePollingDecision;
  wait(decision: AdaptivePollingDecision, signal: AbortSignal): Promise<AdaptivePollingWaitResult>;
  wake(): void;
}>;

export type CreateAdaptivePollerInput = Readonly<{
  configuration: AdaptivePollingConfiguration;
  random?: () => number;
}>;

const assertPositiveSafeInteger = (value: number, name: string): void => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${name} must be a positive safe integer`);
  }
};

const assertJitterPercent = (value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value > 50) {
    throw new TypeError("jitterPercent must be a finite number between 0 and 50");
  }
};

const assertRandomValue = (value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError("random must return a finite number between 0 and 1");
  }
};

const nextIdleDelay = (
  configuration: AdaptivePollingConfiguration,
  consecutiveIdleCycles: number,
): number => {
  let delayMilliseconds = configuration.baseIntervalMilliseconds;
  for (let index = 0; index < consecutiveIdleCycles; index += 1) {
    delayMilliseconds = Math.min(
      configuration.maximumIdleIntervalMilliseconds,
      delayMilliseconds * 2,
    );
  }
  return delayMilliseconds;
};

const applyJitter = (
  delayMilliseconds: number,
  configuration: AdaptivePollingConfiguration,
  random: () => number,
): number => {
  if (configuration.jitterPercent === 0) {
    return delayMilliseconds;
  }
  const randomValue = random();
  assertRandomValue(randomValue);
  const jitterRange = (delayMilliseconds * configuration.jitterPercent) / 100;
  const lowerBound = Math.max(
    configuration.baseIntervalMilliseconds,
    delayMilliseconds - jitterRange,
  );
  const upperBound = Math.min(
    configuration.maximumIdleIntervalMilliseconds,
    delayMilliseconds + jitterRange,
  );
  return Math.round(lowerBound + (upperBound - lowerBound) * randomValue);
};

export function createAdaptivePoller(input: CreateAdaptivePollerInput): AdaptivePoller {
  const { configuration } = input;
  assertPositiveSafeInteger(configuration.baseIntervalMilliseconds, "baseIntervalMilliseconds");
  assertPositiveSafeInteger(
    configuration.maximumIdleIntervalMilliseconds,
    "maximumIdleIntervalMilliseconds",
  );
  if (configuration.maximumIdleIntervalMilliseconds < configuration.baseIntervalMilliseconds) {
    throw new TypeError(
      "maximumIdleIntervalMilliseconds must not be less than baseIntervalMilliseconds",
    );
  }
  assertJitterPercent(configuration.jitterPercent);

  const random = input.random ?? Math.random;
  const maximumStreak = Math.max(
    1,
    Math.ceil(
      Math.log2(
        configuration.maximumIdleIntervalMilliseconds / configuration.baseIntervalMilliseconds,
      ),
    ) + 1,
  );
  let consecutiveIdleCycles = 0;
  let pendingWake = false;
  let wakeCurrentWait: (() => void) | undefined;

  const decide = (outcome: PollingCycleOutcome): AdaptivePollingDecision => {
    if (outcome === "active") {
      consecutiveIdleCycles = 0;
      return Object.freeze({
        outcome,
        delayMilliseconds: configuration.baseIntervalMilliseconds,
        consecutiveIdleCycles,
      });
    }

    consecutiveIdleCycles = Math.min(maximumStreak, consecutiveIdleCycles + 1);
    const delayMilliseconds = applyJitter(
      nextIdleDelay(configuration, consecutiveIdleCycles),
      configuration,
      random,
    );
    return Object.freeze({ outcome, delayMilliseconds, consecutiveIdleCycles });
  };

  const wait = async (
    decision: AdaptivePollingDecision,
    signal: AbortSignal,
  ): Promise<AdaptivePollingWaitResult> => {
    if (signal.aborted) {
      return "aborted";
    }

    return new Promise((resolve) => {
      const finish = (result: AdaptivePollingWaitResult): void => {
        clearTimeout(timer);
        signal.removeEventListener("abort", afterAbort);
        wakeCurrentWait = undefined;
        resolve(result);
      };
      const afterAbort = (): void => {
        finish("aborted");
      };
      const afterWake = (): void => {
        finish("woken");
      };
      const timer = setTimeout(() => {
        finish("elapsed");
      }, decision.delayMilliseconds);
      wakeCurrentWait = afterWake;
      signal.addEventListener("abort", afterAbort);

      if (pendingWake) {
        pendingWake = false;
        afterWake();
      }
    });
  };

  return Object.freeze({
    decide,
    wait,
    wake() {
      if (wakeCurrentWait === undefined) {
        pendingWake = true;
        return;
      }
      wakeCurrentWait();
    },
  });
}
