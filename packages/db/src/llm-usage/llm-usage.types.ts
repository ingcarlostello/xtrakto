import type { LLM_USAGE_OUTCOME } from "./llm-usage.constants";

export type LlmUsageOutcome =
  (typeof LLM_USAGE_OUTCOME)[keyof typeof LLM_USAGE_OUTCOME];

/** What one call to a model used, never what it asked or answered. */
export type LlmUsage = {
  readonly promptName: string;
  readonly promptVersion: number;
  readonly model: string;
  readonly outcome: LlmUsageOutcome;
  /** Unknown when the call failed before the provider said. */
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  /** Millionths of a dollar; 0 when unknown. */
  readonly costMicroUsd: number;
};
