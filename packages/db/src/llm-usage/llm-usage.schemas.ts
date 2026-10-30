import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { isOneOf, safeIntegerCheck } from "../columns/check.utils";
import { createdAt, primaryId } from "../columns/column.utils";
import { users } from "../users/user.schemas";
import { LLM_USAGE_OUTCOME } from "./llm-usage.constants";
import type { LlmUsageOutcome } from "./llm-usage.types";

// What each call to an LLM's model used (8.3), which counts against the
// user's month and the platform's budget. Never what it asked or answered.
export const llmUsage = pgTable(
  "llm_usage",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    promptName: text("prompt_name").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    model: text("model").notNull(),
    outcome: text("outcome").$type<LlmUsageOutcome>().notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costMicroUsd: bigint("cost_micro_usd", { mode: "number" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("llm_usage_user_created_idx").on(t.userId, t.createdAt),
    check(
      "llm_usage_outcome_check",
      isOneOf(t.outcome, Object.values(LLM_USAGE_OUTCOME)),
    ),
    check("llm_usage_prompt_version_check", sql`${t.promptVersion} > 0`),
    check(
      "llm_usage_tokens_check",
      sql`${t.inputTokens} >= 0 and ${t.outputTokens} >= 0`,
    ),
    check("llm_usage_cost_check", sql`${t.costMicroUsd} >= 0`),
    safeIntegerCheck("llm_usage", t.costMicroUsd),
  ],
);
