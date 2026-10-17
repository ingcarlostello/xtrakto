import type { AmountMinor } from "../money/money.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type {
  CategorizableTransaction,
  CategorizationRule,
  CategorizationRuleId,
  MoneyDirection,
  RuleCategorization,
} from "./categorization.types";
import {
  compilePattern,
  foldDescription,
  type FoldedDescription,
} from "./rule-matching.helpers";

type TableRule = CategorizationRule & { readonly id: CategorizationRuleId };

type CompiledRule = {
  readonly rule: TableRule;
  readonly matches: (description: FoldedDescription) => boolean;
};

const COMPILED_RULES = CATEGORIZATION_RULES.map(
  (rule: TableRule): CompiledRule => ({ rule, matches: compilePattern(rule) }),
);

// A movement of 0 goes nowhere, so no rule applies to it.
const directionOf = (amount: AmountMinor): MoneyDirection | undefined => {
  if (amount > 0) return MONEY_DIRECTION.IN;
  if (amount < 0) return MONEY_DIRECTION.OUT;
  return undefined;
};

/**
 * The category the first matching rule gives a movement, and whether it's
 * only a best guess to review. `null` when no rule applies: Stage 8's LLM
 * will try those.
 */
export const categorizeByRules = ({
  descriptionNormalized,
  amountMinor,
}: CategorizableTransaction): RuleCategorization | null => {
  const direction = directionOf(amountMinor);
  if (direction === undefined) return null;
  const description = foldDescription(descriptionNormalized);
  const match = COMPILED_RULES.find(
    ({ rule, matches }) => rule.direction === direction && matches(description),
  );
  if (match === undefined) return null;
  const { id, categoryId, isGuess = false } = match.rule;
  return { ruleId: id, categoryId, isPendingReview: isGuess };
};
