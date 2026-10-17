import type { AmountMinor } from "../money/money.types";
import { foldText } from "../text/text.utils";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type {
  CategorizableTransaction,
  CategorizationContext,
  CategorizationRule,
  CategorizationRuleId,
  MoneyDirection,
  RuleCategorization,
} from "./categorization.types";
import { matchHolderName } from "./holder-name-match.helpers";
import {
  type CompiledPattern,
  compilePattern,
  foldDescription,
  wordsOf,
} from "./rule-matching.helpers";

type TableRule = CategorizationRule & { readonly id: CategorizationRuleId };

type CompiledRule = {
  readonly rule: TableRule;
  readonly wordsAfter: CompiledPattern;
};

const COMPILED_RULES = CATEGORIZATION_RULES.map(
  (rule: TableRule): CompiledRule => ({
    rule,
    wordsAfter: compilePattern(rule),
  }),
);

// A movement of 0 goes nowhere, so no rule applies to it.
const directionOf = (amount: AmountMinor): MoneyDirection | undefined => {
  if (amount > 0) return MONEY_DIRECTION.IN;
  if (amount < 0) return MONEY_DIRECTION.OUT;
  return undefined;
};

// A rule that names the holder needs their name, and its words to match it.
const namesHolderAsRuleSays = (
  rule: TableRule,
  wordsAfter: readonly string[],
  holderWords: readonly string[] | undefined,
): boolean =>
  rule.namesHolder === undefined ||
  (holderWords !== undefined &&
    matchHolderName(wordsAfter, holderWords) === rule.namesHolder);

/**
 * The category the first matching rule gives a movement, and whether it's
 * only a best guess to review. `null` when no rule applies: Stage 8's LLM
 * will try those. The account's holder name lets transfers to or from it
 * count as moved.
 */
export const categorizeByRules = (
  { descriptionNormalized, amountMinor }: CategorizableTransaction,
  { holderName }: CategorizationContext = {},
): RuleCategorization | null => {
  const direction = directionOf(amountMinor);
  if (direction === undefined) return null;
  const description = foldDescription(descriptionNormalized);
  const holderWords =
    holderName === undefined ? undefined : wordsOf(foldText(holderName));
  const match = COMPILED_RULES.find(({ rule, wordsAfter }) => {
    if (rule.direction !== direction) return false;
    const rest = wordsAfter(description);
    return rest !== undefined && namesHolderAsRuleSays(rule, rest, holderWords);
  });
  if (match === undefined) return null;
  const { id, categoryId, isGuess = false } = match.rule;
  return { ruleId: id, categoryId, isPendingReview: isGuess };
};
