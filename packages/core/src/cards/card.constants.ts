/** Whose sums a card statement's summary holds (12.2a): each bank prints its own. */
export const CARD_SUMMARY_KIND = {
  BANCOLOMBIA: "bancolombia",
  NU: "nu",
} as const;

/** A purchase's installments at most, as banks offer them. */
export const MAX_INSTALLMENTS = 120;

/** A rate in parts per million: 1% is 10,000. */
export const PPM_PER_PERCENT = 10_000;

/** The highest rate a card prints, 1,000%, in parts per million. */
export const MAX_RATE_PPM = 1_000 * PPM_PER_PERCENT;
