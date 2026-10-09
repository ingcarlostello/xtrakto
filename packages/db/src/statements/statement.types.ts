import type { PreparedStatement } from "@xtrakto/core";

export type SaveStatementInput = {
  /** One of the user's accounts; any other gives NOT_FOUND. */
  readonly accountId: string;
  readonly balanceVerified: boolean;
  readonly statement: PreparedStatement;
};

export type SavedStatement = {
  readonly statementId: string;
  /** Movements new to the account. */
  readonly inserted: number;
  /** Movements the account already had, from this or an overlapping upload. */
  readonly skipped: number;
};
