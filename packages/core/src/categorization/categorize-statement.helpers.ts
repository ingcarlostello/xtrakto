import { CATEGORY_SOURCE } from "../categories/category-source.constants";
import type {
  PreparedStatement,
  PreparedTransaction,
} from "../statements/statement.types";
import { categorizeByRules } from "./categorization.helpers";
import type {
  CategorizationContext,
  CategorizedStatement,
  CategorizedTransaction,
} from "./categorization.types";
import {
  type CompiledUserRules,
  compileUserRules,
  userCategoryOf,
} from "./user-rule.helpers";

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
