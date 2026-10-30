import type { CategoryId } from "../categories/category.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import type {
  CategorizationRule,
  CategorizationRuleId,
} from "./categorization.types";
import { CATEGORY_TITLES, TITLE_REFINEMENTS } from "./movement-title.constants";
import {
  containsKeyword,
  foldDescription,
  parseKeyword,
} from "./rule-matching.helpers";

/** What a movement's title reads: its bank text, its category and the table's rule it kept. */
export type TitledMovement = {
  readonly description: string;
  readonly categoryId: CategoryId | null;
  readonly categoryRuleId: CategorizationRuleId | null;
};

const TABLE_RULES = new Map<CategorizationRuleId, CategorizationRule>(
  CATEGORIZATION_RULES.map((rule) => [rule.id, rule]),
);

const ruleTitle = (
  ruleId: CategorizationRuleId,
  rule: CategorizationRule,
  description: string,
): string => {
  const refinements = TITLE_REFINEMENTS[ruleId];
  if (refinements === undefined) return rule.titleEs;
  const { words } = foldDescription(description);
  const refinement = refinements.find((candidate) =>
    candidate.words.some((keyword) =>
      containsKeyword(words, parseKeyword(keyword)),
    ),
  );
  return refinement?.titleEs ?? rule.titleEs;
};

/**
 * A movement's title in plain words (8.6a): its rule's while its category
 * is the rule's, more precise where the rule's words name what was paid
 * ("Pago de energía"); its category's once the user or the LLM gave
 * another. `undefined` when neither a rule nor a category says what it
 * was: its bank text titles it.
 */
export const movementTitle = ({
  description,
  categoryId,
  categoryRuleId,
}: TitledMovement): string | undefined => {
  if (categoryRuleId === null)
    return categoryId === null ? undefined : CATEGORY_TITLES[categoryId];
  const rule = TABLE_RULES.get(categoryRuleId);
  if (categoryId !== null && rule?.categoryId !== categoryId)
    return CATEGORY_TITLES[categoryId];
  return rule && ruleTitle(categoryRuleId, rule, description);
};
