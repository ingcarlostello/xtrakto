import type { CategoryId } from "../categories/category.types";
import type { ParsedTransaction } from "../statements/statement.types";
import type { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import type { MONEY_DIRECTION } from "./categorization.constants";

export type MoneyDirection =
  (typeof MONEY_DIRECTION)[keyof typeof MONEY_DIRECTION];

/** What the rules read from a movement. */
export type CategorizableTransaction = Pick<
  ParsedTransaction,
  "descriptionNormalized" | "amountMinor"
>;

/**
 * One row of the ordered rule table. Its texts are written folded
 * (`foldText`) and as the words a description splits into: letters and digits.
 */
export type CategorizationRule = {
  /** A stable name in snake_case. */
  readonly id: string;
  /** The whole description, such as the bank's `0`. */
  readonly is?: string;
  /** The description starts with one of these, word by word. */
  readonly startsWith?: readonly string[];
  /**
   * One of these appears after the prefix, or anywhere without one: a whole
   * word (`GAS`), the start of one (`DROGUER*`) or words in a row
   * (`EMPRESAS PUBLICAS`).
   */
  readonly words?: readonly string[];
  readonly direction: MoneyDirection;
  readonly categoryId: CategoryId;
  /** The category is only a best guess, which the quick review asks about. */
  readonly isGuess?: boolean;
  /** Why, as the movement's detail says it before "Regla del sistema, sin IA". */
  readonly reasonEs: string;
};

export type CategorizationRuleId = (typeof CATEGORIZATION_RULES)[number]["id"];

/** What a rule says about one movement. */
export type RuleCategorization = {
  readonly ruleId: CategorizationRuleId;
  readonly categoryId: CategoryId;
  /** The category is a best guess, waiting for the user's answer. */
  readonly isPendingReview: boolean;
};
