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
  /** A card's previous balance and charges aren't the charges it prints (12.2a). */
  CARD_CHARGES: "CARD_CHARGES",
  /** A card's total to pay isn't what its summary leaves. */
  CARD_TOTAL: "CARD_TOTAL",
  /** A card's minimum isn't what its summary says it's made of. */
  CARD_MINIMUM: "CARD_MINIMUM",
  /** What a card's installments leave isn't the debt its summary gives. */
  CARD_INSTALLMENTS: "CARD_INSTALLMENTS",
  /** A card's movements of the period don't take its previous balance to its debt. */
  CARD_MOVEMENTS: "CARD_MOVEMENTS",
  /** A card's conversion charges aren't what its summary counts (12.2d). */
  CARD_CONVERSION: "CARD_CONVERSION",
  /** A card's interest or late interest isn't what its summary charges. */
  CARD_INTEREST: "CARD_INTEREST",
} as const;
