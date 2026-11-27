import {
  annualRateOf,
  type LocalDate,
  PPM_PER_PERCENT,
  type PrintedRate,
  USURY_STANDING,
  type UsuryStanding,
  usuryStanding,
} from "@xtrakto/core";
import { closedMonthText } from "./card-installments.helpers";
import { CARD_RATES_COPY as COPY } from "./card-rates.constants";
import type { UsuryRates } from "./card-rates.types";

const RATE_FORMAT = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `"1,90%"`: a rate in parts per million, with two decimals, as banks print it. */
export const rateText = (ratePpm: number): string =>
  `${RATE_FORMAT.format(ratePpm / PPM_PER_PERCENT)}%`;

// "28,34% efectivo anual".
const annualText = (annualRatePpm: number): string =>
  `${rateText(annualRatePpm)} ${COPY.annual}`;

// "1,90% al mes" and "25,34% efectivo anual".
const rateParts = (monthlyRatePpm: number): string[] => [
  `${rateText(monthlyRatePpm)} ${COPY.perMonth}`,
  annualText(annualRateOf(monthlyRatePpm)),
];

/** "Tu tarjeta"'s: `"Tasa de compras: 1,90% al mes, 25,34% efectivo anual."`. */
export const purchaseRateLine = (monthlyRatePpm: number): string =>
  `${COPY.purchases} ${rateParts(monthlyRatePpm).join(", ")}.`;

/** A purchase's detail: `"1,90% al mes · 25,34% efectivo anual"`. */
export const rateFact = (monthlyRatePpm: number): string =>
  rateParts(monthlyRatePpm).join(" · ");

/** A rate against the usury of the month its statement closed in, as it reads (12.4b). */
export type UsuryView = {
  readonly standing: UsuryStanding;
  /** `"oct 2026"`. */
  readonly month: string;
  /** `"28,34% efectivo anual"`. */
  readonly usury: string;
};

/**
 * Where a rate stands against the usury of the month its statement closed
 * in (12.4b); nothing when that month's usury isn't saved.
 */
export const usuryViewOf = (
  rate: PrintedRate,
  closedOn: LocalDate,
  usuryRates: UsuryRates,
): UsuryView | undefined => {
  const usuryRatePpm = usuryRates.get(closedOn.slice(0, 7));
  return usuryRatePpm === undefined
    ? undefined
    : {
        standing: usuryStanding(rate, usuryRatePpm),
        month: closedMonthText(closedOn),
        usury: annualText(usuryRatePpm),
      };
};

/**
 * Where a rate stands, in a sentence: `"Por debajo de la usura de oct
 * 2026: 28,34% efectivo anual."`, and past it what to do.
 */
export const usuryLine = ({ standing, month, usury }: UsuryView): string => {
  const line = `${COPY.standing[standing]} ${month}: ${usury}.`;
  return standing === USURY_STANDING.ABOVE
    ? `${line} ${COPY.aboveAction}`
    : line;
};

/** A purchase's usury, under it or at it: `"28,34% efectivo anual · por debajo"`. */
export const usuryFact = ({
  standing,
  usury,
}: UsuryView & {
  readonly standing: Exclude<UsuryStanding, typeof USURY_STANDING.ABOVE>;
}): string => `${usury} · ${COPY.short[standing]}`;
