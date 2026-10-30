import type { LlmUsage } from "@xtrakto/db";
import type { AiCallRecord, AiLimit } from "@/lib/ai";
import {
  PLATFORM_ALERT_SHARE,
  PLATFORM_MONTHLY_BUDGET_MICRO_USD,
  USER_MONTHLY_LIMIT_MICRO_USD,
} from "./llm-usage.constants";

/** What the month's LLM calls cost so far, in millionths of a dollar. */
export type MonthSpend = { readonly user: number; readonly platform: number };

/** The limit a new call would pass, the user's first, if any. */
export const limitReached = ({
  user,
  platform,
}: MonthSpend): AiLimit | undefined => {
  if (user >= USER_MONTHLY_LIMIT_MICRO_USD) return "USER_MONTH";
  if (platform >= PLATFORM_MONTHLY_BUDGET_MICRO_USD) return "PLATFORM_BUDGET";
  return undefined;
};

/** Whether a call's cost took the platform's month past the alert's share. */
export const crossesAlert = (platformAfter: number, cost: number): boolean => {
  const threshold = PLATFORM_MONTHLY_BUDGET_MICRO_USD * PLATFORM_ALERT_SHARE;
  return platformAfter - cost < threshold && platformAfter >= threshold;
};

/**
 * The rows `llm_usage` keeps of a call, one per attempt: an attempt that
 * failed before DeepSeek said what it used costs nothing.
 */
export const usageRowsOf = (call: AiCallRecord): LlmUsage[] =>
  call.attempts.map(({ model, outcome, usage }) => ({
    promptName: call.prompt.name,
    promptVersion: call.prompt.version,
    model,
    outcome,
    inputTokens: usage?.inputTokens ?? null,
    outputTokens: usage?.outputTokens ?? null,
    costMicroUsd: usage?.costMicroUsd ?? 0,
  }));
