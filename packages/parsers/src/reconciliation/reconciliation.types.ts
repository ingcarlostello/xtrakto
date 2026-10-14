import type { AmountMinor } from "@xtrakto/core";
import type { RECONCILIATION_ISSUE } from "./reconciliation.constants";

export type ReconciliationIssueCode =
  (typeof RECONCILIATION_ISSUE)[keyof typeof RECONCILIATION_ISSUE];

/**
 * A check that failed. It holds no amounts, so issues can be counted in logs
 * and analytics; the movements tell how far off a balance is.
 */
export type ReconciliationIssue = {
  readonly code: ReconciliationIssueCode;
  /** For `ROW_BALANCE`: the row in the extracted content. */
  readonly sourceRow?: number;
  /** For `ROW_BALANCE`: the movement's index in the statement, as it's saved. */
  readonly position?: number;
};

export type Reconciliation = {
  /** Whether the balances were checked and every check passed. */
  readonly balanceVerified: boolean;
  readonly issues: readonly ReconciliationIssue[];
  /**
   * The closing balance minus the opening balance and every amount, when the
   * statement prints both balances: zero when they add up.
   */
  readonly closingDifferenceMinor?: AmountMinor;
};
