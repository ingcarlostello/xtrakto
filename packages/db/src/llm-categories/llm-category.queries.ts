import {
  CATEGORY_SOURCE,
  type CategorizationRuleId,
  MONEY_DIRECTION,
} from "@xtrakto/core";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { transactions } from "../transactions/transaction.schemas";
import { goingWay } from "../user-category-rules/user-category-rule.queries";
import type { UserContext } from "../user-context/user-context.types";
import type { LlmMovementCategory, LlmWaitingText } from "./llm-category.types";

// The table's rule for a purchase or a payment at a merchant it doesn't
// know, which counts as "Otros" until something names it.
const UNKNOWN_MERCHANT: CategorizationRuleId = "unknown_merchant";

/**
 * A movement the LLM may categorize (8.5a): one no rule knows, or a payment
 * the table knows only as a merchant's. Never a guess the quick review asks
 * about, nor one the user or the LLM already decided, nor one a verified
 * quarterly statement hides; money that only moved has a rule of its own.
 */
const waitingForLlm = and(
  isNull(transactions.coveredByStatementId),
  goingWay(undefined),
  or(
    isNull(transactions.categorySource),
    and(
      eq(transactions.categorySource, CATEGORY_SOURCE.RULE),
      eq(transactions.categoryRuleId, UNKNOWN_MERCHANT),
    ),
  ),
);

/**
 * The texts of the user's movements that wait for the LLM, in every
 * statement, each once with its money's direction.
 */
export const listLlmWaitingTexts = async ({
  tx,
  userId,
}: UserContext): Promise<LlmWaitingText[]> => {
  const rows = await tx
    .selectDistinct({
      descriptionNormalized: transactions.descriptionNormalized,
      isIncoming: sql<boolean>`${transactions.amountMinor} > 0`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), waitingForLlm));
  return rows.map(({ descriptionNormalized, isIncoming }) => ({
    descriptionNormalized,
    direction: isIncoming ? MONEY_DIRECTION.IN : MONEY_DIRECTION.OUT,
  }));
};

type CategoryGroup = Omit<LlmMovementCategory, "descriptionNormalized"> & {
  readonly texts: string[];
};

// The answers by their direction, category and title, one update each.
const groupsOf = (
  categories: readonly LlmMovementCategory[],
): CategoryGroup[] => {
  const groups = new Map<string, CategoryGroup>();
  for (const { descriptionNormalized, ...answer } of categories) {
    const key = JSON.stringify(answer);
    const group = groups.get(key) ?? { ...answer, texts: [] };
    group.texts.push(descriptionNormalized);
    groups.set(key, group);
  }
  return [...groups.values()];
};

/**
 * Gives each of the LLM's categories to every movement of the user that
 * waits with its text, going its way, in every statement; the movement
 * keeps it as the LLM's answer, which undoing a user's rule gives back
 * (ADR 0025). Returns how many movements it changed.
 */
export const saveLlmCategories = async (
  { tx, userId }: UserContext,
  categories: readonly LlmMovementCategory[],
): Promise<number> => {
  let changed = 0;
  for (const { direction, categoryId, title, texts } of groupsOf(categories)) {
    const rows = await tx
      .update(transactions)
      .set({
        categoryId,
        categorySource: CATEGORY_SOURCE.LLM,
        llmCategoryId: categoryId,
        llmTitle: title,
        isPendingReview: false,
      })
      .where(
        and(
          eq(transactions.userId, userId),
          waitingForLlm,
          goingWay(direction),
          inArray(transactions.descriptionNormalized, texts),
        ),
      )
      .returning({ id: transactions.id });
    changed += rows.length;
  }
  return changed;
};
