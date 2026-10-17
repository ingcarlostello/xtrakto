import type { CategoryId, CategorySource } from "../categories/category.types";
import type {
  ParsedTransaction,
  PreparedStatement,
  PreparedTransaction,
} from "../statements/statement.types";
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
 * What a bank's text says, written folded (`foldText`) and as the words a
 * description splits into: letters and digits.
 */
export type TextPattern = {
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
};

/** One row of the ordered rule table. */
export type CategorizationRule = TextPattern & {
  /**
   * A stable name in snake_case. Movements keep the id of the rule that
   * categorized them, so an id is never renamed or reused.
   */
  readonly id: string;
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

/** A prepared movement with what the rules said about it, ready to save. */
export type CategorizedTransaction = PreparedTransaction & {
  readonly categoryId: CategoryId | null;
  readonly categorySource: CategorySource | null;
  readonly categoryRuleId: CategorizationRuleId | null;
  readonly isPendingReview: boolean;
};

export type CategorizedStatement = Omit<PreparedStatement, "transactions"> & {
  readonly transactions: readonly CategorizedTransaction[];
};
