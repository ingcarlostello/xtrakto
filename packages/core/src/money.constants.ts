/** Supported currencies, as ISO 4217 codes. */
export const CURRENCY = {
  COP: "COP",
} as const;

/**
 * Digits after the decimal point in every supported currency (ISO 4217 gives
 * COP two). An `AmountMinor` counts hundredths of the currency unit.
 */
export const MINOR_DIGITS = 2;
