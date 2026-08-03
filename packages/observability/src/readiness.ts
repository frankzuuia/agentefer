export interface ReadinessState {
  isReady(): boolean;
  markReady(): void;
  markNotReady(): void;
}

export function createReadinessState(initiallyReady = false): ReadinessState {
  let ready = initiallyReady;

  return Object.freeze({
    isReady() {
      return ready;
    },
    markReady() {
      ready = true;
    },
    markNotReady() {
      ready = false;
    },
  });
}
