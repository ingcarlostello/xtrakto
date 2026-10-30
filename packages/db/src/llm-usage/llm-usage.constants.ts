/** How a call to an LLM's model ended, as apps/web's lib/ai.ts names it. */
export const LLM_USAGE_OUTCOME = {
  OK: "OK",
  TIMEOUT: "TIMEOUT",
  /** The answer wasn't JSON, the schema rejected it, or it had no text. */
  INVALID_OUTPUT: "INVALID_OUTPUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;
