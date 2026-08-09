export type OutputTokenParameterRequirement = "optional" | "required";

export interface VerifiedModelOutputCapability {
  readonly maximumSafeOutputTokens: number;
  readonly source: "provider_discovery" | "versioned_capability";
  readonly verifiedAt: string;
}

export interface OutputTokenRequestParameters {
  readonly maxOutputTokens?: number;
}

export function resolveOutputTokenRequest(
  requirement: OutputTokenParameterRequirement,
  capability?: VerifiedModelOutputCapability,
): OutputTokenRequestParameters {
  if (requirement === "optional") {
    return Object.freeze({});
  }

  if (
    capability === undefined ||
    !Number.isSafeInteger(capability.maximumSafeOutputTokens) ||
    capability.maximumSafeOutputTokens <= 0
  ) {
    throw new Error("A provider-required output limit needs a verified positive model capability");
  }

  return Object.freeze({ maxOutputTokens: capability.maximumSafeOutputTokens });
}
