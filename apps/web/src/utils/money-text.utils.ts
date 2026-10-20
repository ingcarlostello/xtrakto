import {
  type AmountMinor,
  amountMinorSchema,
  CURRENCY,
  formatCompactAmount,
} from "@xtrakto/core";

/** Some money in a tile or a note, without its direction: "$2,5M". */
export const compactSize = (amount: AmountMinor): string =>
  formatCompactAmount(amountMinorSchema.parse(Math.abs(amount)), CURRENCY.COP);
