export const ACCOUNT_TYPE = {
  SAVINGS: "savings",
  CREDIT_CARD: "credit_card",
} as const;

/** Where a statement's period comes from: printed by the bank, or the span of its rows. */
export const PERIOD_SOURCE = {
  STATEMENT: "statement",
  ROWS: "rows",
} as const;

/** What a movement's raw reference holds. A phone number is PII and gets hashed. */
export const REFERENCE_KIND = {
  PHONE: "phone",
  ATM: "atm",
  CODE: "code",
  NONE: "none",
} as const;

/**
 * What a parser reports beside the movements, a row it skipped or text it
 * joined; never with descriptions or amounts.
 */
export const PARSE_WARNING_CODE = {
  UNEXPECTED_ROW: "UNEXPECTED_ROW",
  /** A description a PDF wrapped over two lines, joined again. */
  WRAPPED_DESCRIPTION: "WRAPPED_DESCRIPTION",
} as const;
