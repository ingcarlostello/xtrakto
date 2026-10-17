import { CATEGORY_SOURCE } from "../categories/category-source.constants";
import type {
  PreparedStatement,
  PreparedTransaction,
} from "../statements/statement.types";
import { categorizeByRules } from "./categorization.helpers";
import type {
  CategorizedStatement,
  CategorizedTransaction,
} from "./categorization.types";

const categorizeMovement = (
  movement: PreparedTransaction,
): CategorizedTransaction => {
  const found = categorizeByRules(movement);
  return {
    ...movement,
    categoryId: found?.categoryId ?? null,
    categorySource: found === null ? null : CATEGORY_SOURCE.RULE,
    categoryRuleId: found?.ruleId ?? null,
    isPendingReview: found?.isPendingReview ?? false,
  };
};

/**
 * The prepared statement with each movement's category as the rules give it,
 * ready to save. A step of its own after `prepareStatement`, which deals with
 * identity and privacy: categories will also read the account and the user's
 * own rules.
 */
export const categorizeStatement = (
  statement: PreparedStatement,
): CategorizedStatement => ({
  ...statement,
  transactions: statement.transactions.map(categorizeMovement),
});
