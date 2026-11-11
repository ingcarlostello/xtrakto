/** What a column of a bank's table of movements holds, as a mapping reads it. */
export const COLUMN_ROLE = {
  DATE: "date",
  DESCRIPTION: "description",
  /** A signed amount: money in positive, money out negative. */
  AMOUNT: "amount",
  /** Money out, whatever its sign; money in goes in a column of its own. */
  MONEY_OUT: "money_out",
  MONEY_IN: "money_in",
  /** The balance after the movement. */
  BALANCE: "balance",
  /** A transfer's number or a payment's code, kept until it's hashed. */
  REFERENCE: "reference",
  /** Which way an amount went, in the bank's words: "D" and "C". */
  DIRECTION: "direction",
  /** Not read: a branch, a second date, a document's number. */
  NONE: "none",
} as const;

/**
 * Why a table's roles can't read its movements, as `columnRolesProblem`
 * says it: the person reads each in their words (11.3b).
 */
export const ROLES_PROBLEM = {
  DATE: "one date column",
  DESCRIPTION: "one description column",
  BALANCE: "one balance column at most",
  REFERENCE: "one reference column at most",
  MONEY: "money read one way",
} as const;

/** The most rows of its table a format's sample shows the LLM (11.2b). */
export const MAX_SAMPLE_ROWS = 10;
/** The longest a cell's shape gets: a text's first words say what it is. */
export const MAX_SHAPE_LENGTH = 40;
/** The longest a header's name gets in a sample. */
export const MAX_SAMPLE_NAME_LENGTH = 60;

/** The most words a direction column may use for each way. */
export const MAX_DIRECTION_WORDS = 10;
/** Longest word a direction column may use: "Débito", "CREDITO". */
export const MAX_DIRECTION_WORD_LENGTH = 30;
