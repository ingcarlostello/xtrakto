import { sumAmounts } from "@xtrakto/core";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import {
  closedMonthText,
  installmentLine,
  leftAmountText,
  untilText,
} from "@/features/cards/card-installments.helpers";
import type { InstallmentLeft } from "@/features/cards/card-installments.types";
import { movementTone } from "@/features/transactions/kind-view.helpers";
import { monthKeyOfDay } from "@/utils/card-cycles.helpers";
import { countText } from "@/utils/count-text.utils";
import { exactSize } from "@/utils/money-text.utils";
import {
  parsePeriodParam,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import { SUMMARY_COPY } from "./summary.constants";
import type {
  AccountSummary,
  InstallmentRowView,
  InstallmentsLeftView,
} from "./summary.types";
import { lineTitleOf } from "./translated-statement.helpers";

const COPY = SUMMARY_COPY.installments;

// A purchase in its row: its title, which installment its latest statement
// charged, what's left and until when, and its detail in its cycle.
const rowOf = (
  { purchase, installment }: InstallmentLeft,
  summary: AccountSummary,
): InstallmentRowView => {
  const period = parsePeriodParam(monthKeyOfDay(purchase.date, summary.cycles));
  return {
    id: purchase.id,
    categoryId: purchase.categoryId,
    tone: movementTone(purchase, true),
    ...lineTitleOf(purchase),
    note: installmentLine(installment),
    left: leftAmountText(installment),
    until: untilText(installment),
    href: transactionsHref({
      ...periodLinkOf(summary),
      ...(period ? { period } : {}),
      movementId: purchase.id,
    }),
  };
};

// "Te faltan $833.330 en 1 compra.", or only how many when a statement
// prints no amount left; or that nothing is left.
const totalOf = (purchases: readonly InstallmentLeft[]): string => {
  if (purchases.length === 0) return COPY.none;
  const count = countText(purchases.length, COPY.purchases);
  const amounts = purchases.flatMap(({ installment }) =>
    installment.remainingMinor === undefined
      ? []
      : [installment.remainingMinor],
  );
  return amounts.length === purchases.length
    ? `${COPY.left} ${exactSize(sumAmounts(amounts))} ${COPY.inPurchases} ${count}.`
    : `${COPY.installmentsOf} ${count}.`;
};

/**
 * "Cuotas que te faltan" (12.3d): what a card's latest statement that
 * reconciles still charges of its purchases in installments, whatever the
 * period the page shows, each with what's left and until when, and what
 * they add up to. `null` for any other account, or until a statement
 * reconciles.
 */
export const installmentsLeftView = (
  summary: AccountSummary,
): InstallmentsLeftView | null => {
  const left = summary.installmentsLeft;
  if (!left) return null;
  return {
    subtitle: `${COPY.byStatement} ${closedMonthText(left.closedOn)}.`,
    total: totalOf(left.purchases),
    rows: left.purchases.map((purchase) => rowOf(purchase, summary)),
  };
};
