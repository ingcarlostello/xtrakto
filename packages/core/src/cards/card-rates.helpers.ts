import {
  CARD_SUMMARY_KIND,
  PPM_PER_PERCENT,
  PRINTED_RATE_DECIMALS,
} from "./card.constants";
import type { CardSummaryKind, PreparedCard } from "./card.types";

// A whole, in parts per million, and the decimals of a percent a rate in
// parts per million keeps: 1% is 10,000.
const PPM = 100 * PPM_PER_PERCENT;
const PPM_DECIMALS = 4;
const MONTHS_A_YEAR = 12;
// A hundredth of a percent: rates read with two decimals, as the usury's.
const SHOWN_PPM = PPM_PER_PERCENT / 100;

/** A monthly rate as a card's statement prints it (12.4b). */
export type PrintedRate = {
  /** In parts per million: 1.9% is 19,000. */
  readonly monthlyRatePpm: number;
  /** Whose statement printed it, which says how it was rounded. */
  readonly bank: CardSummaryKind;
};

/** How a card's rate stands against its month's usury rate (12.4b). */
export const USURY_STANDING = {
  BELOW: "below",
  /** The usury's monthly rate, as its bank rounds the rate it prints. */
  AT: "at",
  ABOVE: "above",
} as const;

export type UsuryStanding =
  (typeof USURY_STANDING)[keyof typeof USURY_STANDING];

/**
 * The effective annual rate a monthly rate makes, in parts per million:
 * 1.9% a month is 25.34% a year (253,401).
 */
export const annualRateOf = (monthlyRatePpm: number): number =>
  Math.round(((1 + monthlyRatePpm / PPM) ** MONTHS_A_YEAR - 1) * PPM);

// An annual rate as it reads, to a hundredth of a percent.
const shown = (annualRatePpm: number): number =>
  Math.round(annualRatePpm / SHOWN_PPM) * SHOWN_PPM;

/**
 * A card's rate against the usury rate of the month its statement closes
 * in, an effective annual rate (12.4b, ADR 0042). A bank prints a monthly
 * rate rounded, Nu to two decimals, and an annual rate reads with two:
 * above the usury only when, however its bank rounded it, it reads above;
 * below only when it reads below; at the usury otherwise. So a rounding
 * never makes a bank break the law, and the words agree with the figures.
 */
export const usuryStanding = (
  { monthlyRatePpm, bank }: PrintedRate,
  usuryRatePpm: number,
): UsuryStanding => {
  const rounding = 10 ** (PPM_DECIMALS - PRINTED_RATE_DECIMALS[bank]) / 2;
  if (shown(annualRateOf(monthlyRatePpm - rounding)) > usuryRatePpm)
    return USURY_STANDING.ABOVE;
  if (shown(annualRateOf(monthlyRatePpm + rounding)) < usuryRatePpm)
    return USURY_STANDING.BELOW;
  return USURY_STANDING.AT;
};

/**
 * A card statement's rate for purchases (12.4b): the one Bancolombia prints
 * for purchases in 2 to 36 installments, or the highest Nu prints on the
 * purchases it charges. `undefined` when it prints none.
 */
export const purchaseRateOf = (card: PreparedCard): PrintedRate | undefined => {
  const bank = card.summary.kind;
  const rates =
    bank === CARD_SUMMARY_KIND.BANCOLOMBIA
      ? [card.purchaseRatePpm]
      : card.installments.map(({ monthlyRatePpm }) => monthlyRatePpm);
  const printed = rates.filter((rate) => rate !== undefined);
  return printed.length === 0
    ? undefined
    : { monthlyRatePpm: Math.max(...printed), bank };
};
