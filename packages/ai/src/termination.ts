export type NormalizedTerminationReason =
  | "completed"
  | "tool_calls"
  | "output_limit"
  | "context_limit"
  | "content_filter"
  | "cancelled"
  | "provider_error";

export type ContinuationDisposition =
  "finish" | "execute_tools" | "continue_from_checkpoint" | "halt_safely";

export interface TerminationContext {
  readonly reason: NormalizedTerminationReason;
  readonly hasProviderCheckpoint: boolean;
}

export function resolveContinuationDisposition(
  context: TerminationContext,
): ContinuationDisposition {
  switch (context.reason) {
    case "completed":
      return "finish";
    case "tool_calls":
      return "execute_tools";
    case "output_limit":
    case "context_limit":
      return context.hasProviderCheckpoint ? "continue_from_checkpoint" : "halt_safely";
    case "content_filter":
    case "cancelled":
    case "provider_error":
      return "halt_safely";
  }
}
