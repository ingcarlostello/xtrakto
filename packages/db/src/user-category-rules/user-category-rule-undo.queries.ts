import {
  type AmountMinor,
  type CategorizationRuleId,
  compileUserRules,
  type SavedCategory,
  savedMovementCategory,
  type UserCategoryRule,
} from "@xtrakto/core";
import { and, eq, inArray, type SQL } from "drizzle-orm";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import {
  listUserCategoryRules,
  movementsOfRule,
} from "./user-category-rule.queries";
import { userCategoryRules } from "./user-category-rule.schemas";

type SavedMovement = {
  readonly id: string;
  readonly descriptionNormalized: string;
  readonly amountMinor: AmountMinor;
  readonly referenceHash: string | null;
  readonly categoryRuleId: CategorizationRuleId | null;
};

// The user's stored rule for the same reference, or the same text and
// direction.
const sameRule = (userId: string, rule: UserCategoryRule): SQL | undefined =>
  rule.target === "reference"
    ? and(
        eq(userCategoryRules.userId, userId),
        eq(userCategoryRules.referenceHash, rule.referenceHash),
      )
    : and(
        eq(userCategoryRules.userId, userId),
        eq(userCategoryRules.direction, rule.direction),
        eq(userCategoryRules.descriptionFolded, rule.descriptionFolded),
      );

// Each movement with what the user's rules or the table's say now, one
// update per category.
const recategorize = async (
  ctx: UserContext,
  movements: readonly SavedMovement[],
): Promise<number> => {
  const rules = compileUserRules(await listUserCategoryRules(ctx));
  const groups = new Map<string, { category: SavedCategory; ids: string[] }>();
  for (const { id, referenceHash, ...movement } of movements) {
    const category = savedMovementCategory(
      { ...movement, ...(referenceHash === null ? {} : { referenceHash }) },
      rules,
    );
    if (category === undefined) continue;
    const key = JSON.stringify(category);
    groups.set(key, {
      category,
      ids: [...(groups.get(key)?.ids ?? []), id],
    });
  }
  for (const { category, ids } of groups.values())
    await ctx.tx
      .update(transactions)
      .set(category)
      .where(
        and(eq(transactions.userId, ctx.userId), inArray(transactions.id, ids)),
      );
  return [...groups.values()].reduce((sum, { ids }) => sum + ids.length, 0);
};

/**
 * Deletes one of the user's rules, as stored, and gives the movements it
 * held for what their other rules say, else the table's rule each kept, in
 * any statement (6.3h, ADR 0025). Returns how many it changed.
 */
export const deleteUserCategoryRule = async (
  ctx: UserContext,
  rule: UserCategoryRule,
): Promise<number> => {
  const matching = await movementsOfRule(ctx, rule);
  await ctx.tx.delete(userCategoryRules).where(sameRule(ctx.userId, rule));
  if (matching === undefined) return 0;
  const movements = await ctx.tx
    .select({
      id: transactions.id,
      descriptionNormalized: transactions.descriptionNormalized,
      amountMinor: transactions.amountMinor,
      referenceHash: transactions.referenceHash,
      categoryRuleId: transactions.categoryRuleId,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, ctx.userId), matching));
  return recategorize(ctx, movements);
};
