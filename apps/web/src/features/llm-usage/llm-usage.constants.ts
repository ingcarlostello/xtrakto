// What LLM calls may cost in a calendar month in Bogotá, in millionths of a
// dollar, at the upper bound lib/ai.ts prices them at (8.3).

/** Each user's month: USD 1 (product brief, usage limits). */
export const USER_MONTHLY_LIMIT_MICRO_USD = 1_000_000;

/** Every user's together: USD 3, under the prepaid balance at DeepSeek. */
export const PLATFORM_MONTHLY_BUDGET_MICRO_USD = 3_000_000;

/** The share of the platform's budget that alerts the owner, once a month. */
export const PLATFORM_ALERT_SHARE = 0.8;
