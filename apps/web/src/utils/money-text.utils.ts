import {
  type AmountMinor,
  amountMinorSchema,
  CURRENCY,
  formatAmount,
  formatCompactAmount,
} from "@xtrakto/core";

// A box or a small tile writes a million or more compact, and less exact.
const COMPACT_FROM_MINOR = 100_000_000;

/** Some money in a tile or a note, without its direction: "$2,5M". */
export const compactSize = (amount: AmountMinor): string =>
  formatCompactAmount(amountMinorSchema.parse(Math.abs(amount)), CURRENCY.COP);

/** Some money without its direction, to the peso: "$810". */
export const exactSize = (amount: AmountMinor): string =>
  formatAmount(amountMinorSchema.parse(Math.abs(amount)), CURRENCY.COP);

/** Some money in a box or a small tile, without its direction: "$10,4M", "$1.320". */
export const boxAmount = (amount: AmountMinor): string =>
  Math.abs(amount) >= COMPACT_FROM_MINOR
    ? compactSize(amount)
    : exactSize(amount);
