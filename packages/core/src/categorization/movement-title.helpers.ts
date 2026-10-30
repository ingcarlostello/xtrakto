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
  /** The LLM's title, while its category is the LLM's answer (8.6b). */
  readonly llmTitle: string | null;
};

// A title in plain words, as the LLM's must be (8.6b): short, without
// digits or placeholders, in sentence case. Acronyms keep their capitals
// ("Pago de impuestos a la DIAN"), and one more word may have its own
// ("Pago de trámite a la Registraduría"); two, as a person's name or Title
// Case would, may not, nor a word in capitals the bank's text shouts.
const MAX_TITLE_LENGTH = 40;
const CAPITALIZED_WORD = /^\p{Lu}[^\p{Lu}]*$/u;
const HAS_CAPITAL = /\p{Lu}/u;
const ACRONYM = /^\p{Lu}{2,6}$/u;
const NOT_PLAIN = /[\d[\]]/;

const isSentenceCase = (title: string): boolean => {
  const [first = "", ...rest] = title.split(" ");
  const capitalized = rest.filter(
    (word) => HAS_CAPITAL.test(word) && !ACRONYM.test(word),
  );
  return (
    CAPITALIZED_WORD.test(first) &&
    capitalized.length <= 1 &&
    capitalized.every((word) => CAPITALIZED_WORD.test(word))
  );
};

/** Whether a title reads in plain words: short, in sentence case, without digits or placeholders. */
export const isPlainTitle = (title: string): boolean =>
  title.length >= 3 &&
  title.length <= MAX_TITLE_LENGTH &&
  title === title.trim() &&
  !title.endsWith(".") &&
  !NOT_PLAIN.test(title) &&
  isSentenceCase(title);

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
 * A movement's title in plain words (8.6a): the LLM's while its category
 * is the LLM's answer (8.6b); else its rule's while its category is the
 * rule's, more precise where the rule's words name what was paid ("Pago de
 * energía"); its category's once the user or the LLM gave another.
 * `undefined` when neither a rule nor a category says what it was: its bank
 * text titles it.
 */
export const movementTitle = ({
  description,
  categoryId,
  categoryRuleId,
  llmTitle,
}: TitledMovement): string | undefined => {
  if (llmTitle !== null) return llmTitle;
  if (categoryRuleId === null)
    return categoryId === null ? undefined : CATEGORY_TITLES[categoryId];
  const rule = TABLE_RULES.get(categoryRuleId);
  if (categoryId !== null && rule?.categoryId !== categoryId)
    return CATEGORY_TITLES[categoryId];
  return rule && ruleTitle(categoryRuleId, rule, description);
};
