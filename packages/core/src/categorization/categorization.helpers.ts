import type { AmountMinor } from "../money/money.types";
import { foldText } from "../text/text.utils";
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
  containsKeyword,
  parseKeyword,
  startsWithWords,
  wordsOf,
} from "./rule-matching.helpers";

type TableRule = CategorizationRule & { readonly id: CategorizationRuleId };

/** A folded description and its words, worked out once per movement. */
type Description = {
  readonly text: string;
  readonly words: readonly string[];
};

type CompiledRule = {
  readonly rule: TableRule;
  readonly matches: (description: Description) => boolean;
};

// The words after the first prefix the description starts with, or none.
const afterPrefix = (
  words: readonly string[],
  prefixes: readonly (readonly string[])[],
): readonly string[] | undefined => {
  const prefix = prefixes.find((candidate) =>
    startsWithWords(words, candidate),
  );
  return prefix && words.slice(prefix.length);
};

const compileRule = (rule: TableRule): CompiledRule => {
  const prefixes = (rule.startsWith ?? []).map((prefix) => prefix.split(" "));
  const keywords = (rule.words ?? []).map(parseKeyword);
  const matches = ({ text, words }: Description): boolean => {
    if (rule.is !== undefined && text !== rule.is) return false;
    const rest = prefixes.length === 0 ? words : afterPrefix(words, prefixes);
    if (rest === undefined) return false;
    return (
      keywords.length === 0 ||
      keywords.some((keyword) => containsKeyword(rest, keyword))
    );
  };
  return { rule, matches };
};

const COMPILED_RULES = CATEGORIZATION_RULES.map(compileRule);

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
  const text = foldText(descriptionNormalized);
  const description = { text, words: wordsOf(text) };
  const match = COMPILED_RULES.find(
    ({ rule, matches }) => rule.direction === direction && matches(description),
  );
  if (match === undefined) return null;
  const { id, categoryId, isGuess = false } = match.rule;
  return { ruleId: id, categoryId, isPendingReview: isGuess };
};
