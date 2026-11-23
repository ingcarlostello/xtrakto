// The format agent (11.4): what it tells the second proposal failed in the
// first one's reading, in codes, never a value of the file.

/** What failed in a proposal's reading. */
export const MAPPING_FAILURE = {
  /** A column's cells don't read with its role. */
  UNREAD: "unread",
  /** No row read as a movement. */
  NO_MOVEMENTS: "no_movements",
  /** The balances don't follow the movements. */
  BALANCES_BREAK: "balances_break",
} as const;

/** Why a column's cells don't read with its role. */
export const UNREAD_CAUSE = {
  DATE: "date",
  AMOUNT: "amount",
  DIRECTION: "direction",
  /** Empty in a row with a movement. */
  EMPTY: "empty",
  /** A row with money in and money out at once. */
  BOTH_AMOUNTS: "both_amounts",
} as const;

/** The proposals a file gets before the person sees its best reading. */
export const MAX_PROPOSALS = 2;
