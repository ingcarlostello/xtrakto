import type { AmountMinor, CategorizedStatement } from "@xtrakto/core";

/** What `reconcile` found, kept to show where a statement doesn't add up. */
export type BalanceCheck = {
  readonly verified: boolean;
  /** The closing balance minus the opening balance and every amount. */
  readonly differenceMinor?: AmountMinor;
  /** Positions of the movements whose balance breaks the chain. */
  readonly breakPositions: readonly number[];
};

export type SaveStatementInput = {
  /** One of the user's accounts; any other gives NOT_FOUND. */
  readonly accountId: string;
  /** Prepared and categorized: what the rules say about each movement. */
  readonly statement: CategorizedStatement;
  readonly balance: BalanceCheck;
};

/** What saving a statement changed, in counts only. */
export type SavedStatement = {
  /** The statement saved, or the one already holding its movements. */
  readonly statementId: string;
  /** Movements in the statement. */
  readonly total: number;
  /** Movements that count now and didn't before: what the statement added. */
  readonly added: number;
  /** Movements the account already had, from this or an overlapping upload. */
  readonly skipped: number;
  /** Its movements a verified quarterly statement hides on its days. */
  readonly covered: number;
  /** Movements saved before that this verified quarterly statement hides. */
  readonly hidden: number;
  /** Versions of its period that didn't reconcile and were replaced. */
  readonly replaced: number;
};
