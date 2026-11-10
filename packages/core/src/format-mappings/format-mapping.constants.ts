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

/** The most words a direction column may use for each way. */
export const MAX_DIRECTION_WORDS = 10;
/** Longest word a direction column may use: "Débito", "CREDITO". */
export const MAX_DIRECTION_WORD_LENGTH = 30;
