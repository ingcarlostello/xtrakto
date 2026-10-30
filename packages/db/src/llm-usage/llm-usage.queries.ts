import { and, eq, gte, lt, sql } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { llmUsage } from "./llm-usage.schemas";
import type { LlmUsage } from "./llm-usage.types";

/** Saves what each attempt of a call used, as the context user's. */
export const recordLlmUsage = async (
  ctx: UserContext,
  attempts: readonly LlmUsage[],
): Promise<void> => {
  if (attempts.length === 0) return;
  await ctx.tx
    .insert(llmUsage)
    .values(attempts.map((attempt) => ({ ...attempt, userId: ctx.userId })));
};

/** What the context user's calls cost in `month`, in millionths of a dollar. */
export const userLlmCostIn = async (
  ctx: UserContext,
  month: { readonly start: Date; readonly end: Date },
): Promise<number> => {
  const [row] = await ctx.tx
    .select({ total: sql<string | null>`sum(${llmUsage.costMicroUsd})` })
    .from(llmUsage)
    .where(
      and(
        eq(llmUsage.userId, ctx.userId),
        gte(llmUsage.createdAt, month.start),
        lt(llmUsage.createdAt, month.end),
      ),
    );
  return Number(row?.total ?? 0);
};

/**
 * What every user's calls cost this calendar month in Bogotá, in millionths
 * of a dollar. Row-Level Security shows no one else's rows, so it reads them
 * through a SECURITY DEFINER function without parameters (ADR 0014).
 */
export const platformLlmCostThisMonth = async (
  ctx: UserContext,
): Promise<number> => {
  const result = await ctx.tx.execute<{ total: string }>(
    sql`select public.llm_platform_cost_this_month() as total`,
  );
  return Number(result.rows[0]?.total ?? 0);
};
