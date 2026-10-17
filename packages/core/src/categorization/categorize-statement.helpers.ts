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

const categorizeMovement = (
  movement: PreparedTransaction,
  context: CategorizationContext,
): CategorizedTransaction => {
  const found = categorizeByRules(movement, context);
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
 * identity and privacy: categories read the account's holder name, and will
 * read the user's own rules.
 */
export const categorizeStatement = (
  statement: PreparedStatement,
  context: CategorizationContext = {},
): CategorizedStatement => ({
  ...statement,
  transactions: statement.transactions.map((movement) =>
    categorizeMovement(movement, context),
  ),
});
