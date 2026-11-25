import type { AmountMinor } from "../money/money.types";
import { ACCOUNT_TYPE } from "../statements/statement.constants";
import type { AccountType, ReferenceKind } from "../statements/statement.types";
import { foldText } from "../text/text.utils";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { PAYMENT_PREFIXES } from "./categorization-words.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type {
  CategorizableTransaction,
  CategorizationContext,
  CategorizationRule,
  CategorizationRuleId,
  MoneyDirection,
  RuleCategorization,
  TextPattern,
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
  /** How the rule reads a card's text. */
  readonly cardWordsAfter: CompiledPattern;
};

// A card writes a purchase as its merchant's name, without the "COMPRA EN" a
// savings account's purchase starts with: on a card, the rules for purchases
// read the whole text (12.3a).
const onCard = (rule: TableRule): TextPattern =>
  rule.startsWith === PAYMENT_PREFIXES ? { ...rule, startsWith: [] } : rule;

const COMPILED_RULES = CATEGORIZATION_RULES.map(
  (rule: TableRule): CompiledRule => ({
    rule,
    wordsAfter: compilePattern(rule),
    cardWordsAfter: compilePattern(onCard(rule)),
  }),
);

/** Which way a movement's money goes. One of 0 goes nowhere, so no rule applies to it. */
export const moneyDirectionOf = (
  amount: AmountMinor,
): MoneyDirection | undefined => {
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

/** What a rule asks of a movement before reading its words. */
type MovementFacts = {
  readonly direction: MoneyDirection;
  readonly referenceKind: ReferenceKind | undefined;
  readonly accountType: AccountType;
};

const holdsFor = (rule: TableRule, facts: MovementFacts): boolean =>
  rule.direction === facts.direction &&
  (rule.withReference === undefined ||
    rule.withReference === facts.referenceKind) &&
  (rule.accountType === undefined || rule.accountType === facts.accountType);

/**
 * The category the first matching rule gives a movement, and whether it's
 * only a best guess to review. `null` when no rule applies: Stage 8's LLM
 * will try those. The account's holder name lets transfers to or from it
 * count as moved, a rule can ask what the reference holds, and a card's
 * account has rules of its own.
 */
export const categorizeByRules = (
  {
    descriptionNormalized,
    amountMinor,
    referenceKind,
  }: CategorizableTransaction,
  {
    holderName,
    accountType = ACCOUNT_TYPE.SAVINGS,
  }: CategorizationContext = {},
): RuleCategorization | null => {
  const direction = moneyDirectionOf(amountMinor);
  if (direction === undefined) return null;
  const facts = { direction, referenceKind, accountType };
  const isCard = accountType === ACCOUNT_TYPE.CREDIT_CARD;
  const description = foldDescription(descriptionNormalized);
  const holderWords =
    holderName === undefined ? undefined : wordsOf(foldText(holderName));
  const match = COMPILED_RULES.find(({ rule, wordsAfter, cardWordsAfter }) => {
    if (!holdsFor(rule, facts)) return false;
    const rest = (isCard ? cardWordsAfter : wordsAfter)(description);
    return rest !== undefined && namesHolderAsRuleSays(rule, rest, holderWords);
  });
  if (match === undefined) return null;
  const { id, categoryId, isGuess = false } = match.rule;
  return { ruleId: id, categoryId, isPendingReview: isGuess };
};
