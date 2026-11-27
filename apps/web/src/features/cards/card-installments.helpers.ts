import {
  type CalendarMonth,
  type ChargedInstallment,
  formatShortMonth,
  type LocalDate,
} from "@xtrakto/core";
import type { CardFigures, CardPurchase } from "@xtrakto/db";
import { countText } from "@/utils/count-text.utils";
import { exactSize } from "@/utils/money-text.utils";
import { CARD_INSTALLMENTS_COPY as COPY } from "./card-installments.constants";
import type {
  InstallmentsLeft,
  LatestInstallment,
} from "./card-installments.types";

/**
 * Each purchase's latest installment, by its fingerprint: what the latest
 * statement that reconciles and charges it charged (12.3d). `statements`
 * come the oldest first, as `listCardFigures` reads them; one that doesn't
 * reconcile says nothing, as none of its numbers count.
 */
export const latestInstallments = (
  statements: readonly CardFigures[],
): ReadonlyMap<string, LatestInstallment> => {
  const latest = new Map<string, LatestInstallment>();
  for (const { period, isVerified, card } of statements) {
    if (!isVerified) continue;
    for (const installment of card.installments)
      latest.set(installment.fingerprint, {
        ...installment,
        closedOn: period.to,
        bank: card.summary.kind,
      });
  }
  return latest;
};

/**
 * What the card's latest statement that reconciles still charges: its
 * purchases with installments to come, each with what it charged of them.
 * `null` until a statement reconciles.
 */
export const installmentsLeft = (
  statements: readonly CardFigures[],
  purchases: readonly CardPurchase[],
): InstallmentsLeft | null => {
  const latest = statements.findLast(({ isVerified }) => isVerified);
  if (!latest) return null;
  const closedOn = latest.period.to;
  const bank = latest.card.summary.kind;
  return {
    closedOn,
    purchases: latest.card.installments
      .filter(({ number, count }) => number < count)
      .flatMap((installment) => {
        const purchase = purchases.find(
          ({ fingerprint }) => fingerprint === installment.fingerprint,
        );
        return purchase
          ? [{ purchase, installment: { ...installment, closedOn, bank } }]
          : [];
      }),
  };
};

/** `"3 de 24 · $41.667 al mes"`, or `"3 de 24"` when the statement prints no month's installment. */
export const installmentNote = ({
  number,
  count,
  monthlyMinor,
}: ChargedInstallment): string => {
  const which = `${number} ${COPY.of} ${count}`;
  return monthlyMinor === undefined
    ? which
    : `${which} · ${exactSize(monthlyMinor)} ${COPY.perMonth}`;
};

/** The month its last installment falls in: the month its statement closed, plus those left. */
export const lastMonthOf = ({
  number,
  count,
  closedOn,
}: LatestInstallment): CalendarMonth => {
  const year = Number(closedOn.slice(0, 4));
  const index = year * 12 + Number(closedOn.slice(5, 7)) - 1 + count - number;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

/** `"nov 2026"`. */
export const monthText = (month: CalendarMonth): string =>
  `${formatShortMonth(month)} ${month.year}`;

/** The month a statement closed in: `"oct 2026"`. */
export const closedMonthText = (closedOn: LocalDate): string =>
  monthText({
    year: Number(closedOn.slice(0, 4)),
    month: Number(closedOn.slice(5, 7)),
  });

/** Where it comes from: `"en tu extracto de oct 2026"`. */
export const statementText = ({ closedOn }: LatestInstallment): string =>
  `${COPY.inStatement} ${closedMonthText(closedOn)}`;

/** In a row: `"Cuota 3 de 24 · $41.667 al mes"`. */
export const installmentLine = (installment: ChargedInstallment): string =>
  `${COPY.installment} ${installmentNote(installment)}`;

/** What's left of it: `"$916.667"`, or `"21 cuotas"` when its statement prints no amount. */
export const leftAmountText = ({
  number,
  count,
  remainingMinor,
}: LatestInstallment): string =>
  remainingMinor === undefined
    ? countText(count - number, COPY.installments)
    : exactSize(remainingMinor);

/** `"hasta ago 2028"`: the month of its last installment. */
export const untilText = (installment: LatestInstallment): string =>
  `${COPY.until} ${monthText(lastMonthOf(installment))}`;

/** What's left of it, and until when: `"$916.667, hasta ago 2028"`. */
export const leftText = (installment: LatestInstallment): string =>
  `${leftAmountText(installment)}, ${untilText(installment)}`;
