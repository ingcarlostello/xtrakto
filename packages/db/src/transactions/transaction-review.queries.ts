import {
  type AmountMinor,
  CATEGORIZATION_RULES,
  type CategorizationRuleId,
  CATEGORY_SOURCE,
  type CategoryId,
  type Period,
} from "@xtrakto/core";
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import { usersCategory } from "../user-category-rules/user-category-rule.queries";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

/**
 * A movement the quick review asks or asked about: the rule that guessed it,
 * whether it still waits for an answer, and the category it has now.
 */
export type ReviewMovement = {
  readonly id: string;
  readonly ruleId: CategorizationRuleId;
  readonly descriptionRaw: string;
  readonly descriptionNormalized: string;
  readonly amountMinor: AmountMinor;
  readonly isPendingReview: boolean;
  /** The rule's guess, or the user's answer. */
  readonly categoryId: CategoryId;
  /** The user answered with a category; else the guess stands. */
  readonly isUsersCategory: boolean;
  /** The number it went to or came from, as its HMAC, when the bank wrote it. */
  readonly referenceHash: string | null;
  readonly referenceLast4: string | null;
};

export type ReviewFilter = {
  readonly accountId: string;
  readonly period: Period;
  /** Only what these rules guessed; what every guessing rule did without it. */
  readonly ruleIds?: readonly CategorizationRuleId[];
};

const GUESSING_RULE_IDS: readonly CategorizationRuleId[] =
  CATEGORIZATION_RULES.flatMap((rule) =>
    "isGuess" in rule && rule.isGuess ? [rule.id] : [],
  );

const REVIEW_COLUMNS = {
  id: transactions.id,
  ruleId: transactions.categoryRuleId,
  descriptionRaw: transactions.descriptionRaw,
  descriptionNormalized: transactions.descriptionNormalized,
  amountMinor: transactions.amountMinor,
  isPendingReview: transactions.isPendingReview,
  categoryId: transactions.categoryId,
  categorySource: transactions.categorySource,
  referenceHash: transactions.referenceHash,
  referenceLast4: transactions.referenceLast4,
};

/**
 * An account's movements that count in a period and that a rule guessed,
 * the oldest first: those waiting for review and those the user answered,
 * which keep the rule's id (6.3b, 6.3c).
 */
export const listReviewMovements = async (
  { tx, userId }: UserContext,
  { accountId, period, ruleIds = GUESSING_RULE_IDS }: ReviewFilter,
): Promise<ReviewMovement[]> => {
  const rows = await tx
    .select(REVIEW_COLUMNS)
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        gte(transactions.date, period.from),
        lte(transactions.date, period.to),
        countedMovement,
        inArray(transactions.categoryRuleId, [...ruleIds]),
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.position));
  // A rule's id goes with a category (CHECK), so none is left out.
  return rows.flatMap(({ ruleId, categoryId, categorySource, ...movement }) =>
    ruleId === null || categoryId === null
      ? []
      : [
          {
            ...movement,
            ruleId,
            categoryId,
            isUsersCategory: categorySource === CATEGORY_SOURCE.USER,
          },
        ],
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
