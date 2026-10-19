import type {
  AmountMinor,
  CategorizationRuleId,
  CategoryId,
  Period,
} from "@xtrakto/core";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import { usersCategory } from "../user-category-rules/user-category-rule.queries";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

/** A movement the quick review asks about, and the rule that guessed it. */
export type ReviewMovement = {
  readonly id: string;
  readonly ruleId: CategorizationRuleId;
  readonly descriptionRaw: string;
  readonly descriptionNormalized: string;
  readonly amountMinor: AmountMinor;
};

export type ReviewFilter = {
  readonly accountId: string;
  readonly period: Period;
  /** Only what these rules guessed; everything to review without it. */
  readonly ruleIds?: readonly CategorizationRuleId[];
};

/**
 * An account's movements that count in a period and wait for review, the
 * oldest first: what the quick review asks about (6.3b).
 */
export const listReviewMovements = async (
  { tx, userId }: UserContext,
  { accountId, period, ruleIds }: ReviewFilter,
): Promise<ReviewMovement[]> => {
  const rows = await tx
    .select({
      id: transactions.id,
      ruleId: transactions.categoryRuleId,
      descriptionRaw: transactions.descriptionRaw,
      descriptionNormalized: transactions.descriptionNormalized,
      amountMinor: transactions.amountMinor,
    })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        gte(transactions.date, period.from),
        lte(transactions.date, period.to),
        countedMovement,
        eq(transactions.isPendingReview, true),
        ruleIds === undefined
          ? undefined
          : inArray(transactions.categoryRuleId, [...ruleIds]),
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.position));
  // A guess always names its rule (CHECK), so none is left out.
  return rows.flatMap(({ ruleId, ...movement }) =>
    ruleId === null ? [] : [{ ...movement, ruleId }],
  );
};

/**
 * The user's category for some of their movements, such as those the bank
 * wrote as `0`, which no rule can name. Returns how many it changed.
 */
export const setUserCategory = async (
  { tx, userId }: UserContext,
  {
    movementIds,
    categoryId,
  }: {
    readonly movementIds: readonly string[];
    readonly categoryId: CategoryId;
  },
): Promise<number> => {
  if (movementIds.length === 0) return 0;
  const changed = await tx
    .update(transactions)
    .set(usersCategory(categoryId))
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.id, [...movementIds]),
      ),
    )
    .returning({ id: transactions.id });
  return changed.length;
};

/**
 * Takes some of the user's movements out of the review and keeps their best
 * guess, as "No sé" asks. Returns how many it took out.
 */
export const dismissReview = async (
  { tx, userId }: UserContext,
  movementIds: readonly string[],
): Promise<number> => {
  if (movementIds.length === 0) return 0;
  const dismissed = await tx
    .update(transactions)
    .set({ isPendingReview: false })
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.id, [...movementIds]),
        eq(transactions.isPendingReview, true),
      ),
    )
    .returning({ id: transactions.id });
  return dismissed.length;
};
