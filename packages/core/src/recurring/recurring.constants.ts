/** How many months in a row make a payment fixed (design v8: "Necesitamos 3 meses para encontrarlos"). */
export const MIN_RECURRING_MONTHS = 3;

/** The most days apart a payment's dates may fall in their months. */
export const MAX_DAY_SPREAD = 10;

/** How far a month of real spending may be from the typical one, in percent. */
export const AMOUNT_TOLERANCE_PERCENT = 50;

/** How far apart its months may be, in percent of the typical one, for each trend. */
export const TREND_PERCENT = {
  STABLE: 2,
  VARIES_LITTLE: 15,
  /** The least a payment must rise to have "Subió". */
  MIN_RISE: 5,
} as const;

/**
 * A shorter name is the start of a longer one the bank cut elsewhere only
 * from this many letters on, so short names never merge.
 */
export const MIN_SHARED_NAME_LENGTH = 8;
