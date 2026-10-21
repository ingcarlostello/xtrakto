import type { CategorizationRuleId } from "./categorization.types";

/** Which way a movement's money goes: in for a positive amount, out for a negative one. */
export const MONEY_DIRECTION = {
  IN: "in",
  OUT: "out",
} as const;

/** What the bank writes when it doesn't say what a movement was. */
export const NO_DESCRIPTION = "0";

/**
 * The table's rule for the 4x1000, which shares "Costos del banco" with the
 * bank's fees: it tells the tax apart, whatever category it has now.
 */
export const GMF_TAX_RULE_ID: CategorizationRuleId = "gmf_tax";

/**
 * The table's rule for the savings' daily interest ("ABONO INTERESES
 * AHORROS"), whose rows the movements list groups by month.
 */
export const SAVINGS_INTEREST_RULE_ID: CategorizationRuleId =
  "savings_interest";
