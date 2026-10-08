/** Why a statement's balances couldn't be verified. */
export const RECONCILIATION_ISSUE = {
  /** A row's balance isn't the previous balance plus the row's amount. */
  ROW_BALANCE: "ROW_BALANCE",
  /** The opening balance plus every amount isn't the closing balance. */
  CLOSING_BALANCE: "CLOSING_BALANCE",
  /** The credits don't add up to the printed total. */
  TOTAL_CREDITS: "TOTAL_CREDITS",
  /** The debits don't add up to the printed total. */
  TOTAL_DEBITS: "TOTAL_DEBITS",
  /** The statement prints no balances to check, as in a movements export. */
  NO_BALANCE_DATA: "NO_BALANCE_DATA",
} as const;
