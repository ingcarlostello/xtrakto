import type { CategoryId, CategorySource } from "../categories/category.types";
import type {
  ParsedTransaction,
  PreparedStatement,
  PreparedTransaction,
  ReferenceKind,
} from "../statements/statement.types";
import type { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import type { MONEY_DIRECTION } from "./categorization.constants";

export type MoneyDirection =
  (typeof MONEY_DIRECTION)[keyof typeof MONEY_DIRECTION];

/** How a transfer's words name the account holder: whole words, or the last one cut. */
export type HolderNameMatch = "whole" | "cut";

/**
 * A rule the user made by answering the quick review or correcting a
 * movement (6.3). A text rule holds for the movements whose text is the
 * same as `userRuleTextOf` writes it, going the same way. A reference names
 * one person or account, so its rule holds the ways its category allows:
 * money that only moves, both; a payment to someone, money going out; an
 * income, money coming in (ADR 0026).
 */
export type UserCategoryRule =
  | {
      readonly target: "description";
      readonly descriptionFolded: string;
      readonly direction: MoneyDirection;
      readonly categoryId: CategoryId;
    }
  | {
      readonly target: "reference";
      /** The reference's HMAC, as movements keep it. */
      readonly referenceHash: string;
      /** Its last 4 digits, which show it ("ref ••• 1270"), when it has them. */
      readonly referenceLast4?: string;
      readonly categoryId: CategoryId;
    };

/** What the rules know about the movement's account and its user. */
export type CategorizationContext = {
  /** The holder's name, as `normalizeHolderName` writes it; unknown until a quarterly statement prints it. */
  readonly holderName?: string;
  /** The user's own rules, which come before the table's. */
  readonly userRules?: readonly UserCategoryRule[];
};

/** What the rules read from a movement: its text, its amount and what its reference holds. */
export type CategorizableTransaction = Pick<
  ParsedTransaction,
  "descriptionNormalized" | "amountMinor" | "referenceKind"
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
  /** The words after the prefix name the account holder, whole or cut. */
  readonly namesHolder?: HolderNameMatch;
  /** The movement's reference holds this, such as the number a Nequi send went to. */
  readonly withReference?: ReferenceKind;
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
  /**
   * The table's rule that matched, kept when the user's rule decides, so the
   * quick review knows what it guessed.
   */
  readonly categoryRuleId: CategorizationRuleId | null;
  readonly isPendingReview: boolean;
};

export type CategorizedStatement = Omit<PreparedStatement, "transactions"> & {
  readonly transactions: readonly CategorizedTransaction[];
};
