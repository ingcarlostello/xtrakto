import { CATEGORY_SOURCE } from "../categories/category-source.constants";
import type {
  PreparedStatement,
  PreparedTransaction,
} from "../statements/statement.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { categorizeByRules } from "./categorization.helpers";
import type {
  CategorizationContext,
  CategorizationRule,
  CategorizationRuleId,
  CategorizedStatement,
  CategorizedTransaction,
} from "./categorization.types";
import {
  type CompiledUserRules,
  compileUserRules,
  userCategoryOf,
  type UserRuleMovement,
} from "./user-rule.helpers";

const TABLE_RULES: ReadonlyMap<string, CategorizationRule> = new Map(
  CATEGORIZATION_RULES.map((rule) => [rule.id, rule]),
);

/** What a saved movement's category says: what it is, who gave it, and whether it's a guess. */
export type SavedCategory = Pick<
  CategorizedTransaction,
  "categoryId" | "categorySource" | "isPendingReview"
>;

/**
 * What a saved movement counts as once one of the user's rules is gone
 * (6.3h): their other rules first, then the table's rule that matched it
 * when it was saved, which it keeps (ADR 0025). `undefined` when the table
 * no longer has that rule, so the movement keeps what it has.
 */
export const savedMovementCategory = (
  movement: UserRuleMovement & {
    readonly categoryRuleId: CategorizationRuleId | null;
  },
  userRules: CompiledUserRules,
): SavedCategory | undefined => {
  const usersCategory = userCategoryOf(movement, userRules);
  if (usersCategory !== undefined)
    return {
      categoryId: usersCategory,
      categorySource: CATEGORY_SOURCE.USER,
      isPendingReview: false,
    };
  if (movement.categoryRuleId === null)
    return { categoryId: null, categorySource: null, isPendingReview: false };
  const rule = TABLE_RULES.get(movement.categoryRuleId);
  return (
    rule && {
      categoryId: rule.categoryId,
      categorySource: CATEGORY_SOURCE.RULE,
      isPendingReview: rule.isGuess ?? false,
    }
  );
};

// The user's rule decides when one holds, never as a guess; the table's
// rule that matched stays, so the quick review knows what it guessed.
const categorizeMovement = (
  movement: PreparedTransaction,
  context: CategorizationContext,
  userRules: CompiledUserRules,
): CategorizedTransaction => {
  const found = categorizeByRules(movement, context);
  const categoryRuleId = found?.ruleId ?? null;
  const usersCategory = userCategoryOf(movement, userRules);
  if (usersCategory !== undefined)
    return {
      ...movement,
      categoryId: usersCategory,
      categorySource: CATEGORY_SOURCE.USER,
      categoryRuleId,
      isPendingReview: false,
    };
  return {
    ...movement,
    categoryId: found?.categoryId ?? null,
    categorySource: found === null ? null : CATEGORY_SOURCE.RULE,
    categoryRuleId,
    isPendingReview: found?.isPendingReview ?? false,
  };
};

/**
 * The prepared statement with each movement's category, ready to save: the
 * user's rules first, then the table's. A step of its own after
 * `prepareStatement`, which deals with identity and privacy: categories read
 * the account's holder name and the user's rules.
 */
export const categorizeStatement = (
  statement: PreparedStatement,
  context: CategorizationContext = {},
): CategorizedStatement => {
  const userRules = compileUserRules(context.userRules ?? []);
  return {
    ...statement,
    transactions: statement.transactions.map((movement) =>
      categorizeMovement(movement, context, userRules),
    ),
  };
};
