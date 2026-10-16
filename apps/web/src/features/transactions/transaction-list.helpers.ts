import {
  type AmountMinor,
  CURRENCY,
  formatAmount,
  formatSignedAmount,
  formatWeekdayInWords,
  type LocalDate,
} from "@xtrakto/core";
import type { TransactionListItem } from "@xtrakto/db";
import { countText, formatCount } from "@/utils/count-text.utils";
import {
  MAX_MOVEMENTS_SHOWN,
  MOVEMENTS_STEP,
  NO_DESCRIPTION_TEXT,
  TRANSACTIONS_COPY as COPY,
} from "./transaction.constants";
import type {
  DescriptionView,
  NextStep,
  TransactionDay,
} from "./transaction.types";

// Xtrakto reads accounts in pesos only: other currencies are out of scope.
const CURRENCY_SHOWN = CURRENCY.COP;

type OpenDay = {
  date: LocalDate;
  balanceMinor: AmountMinor | null;
  items: TransactionListItem[];
};

/**
 * The list's movements by day, in their order. A day's balance is the first
 * one printed among its movements, its last one in the bank's order: only a
 * statement with balances prints them.
 */
export const groupByDay = (
  items: readonly TransactionListItem[],
): readonly TransactionDay[] => {
  const days: OpenDay[] = [];
  for (const item of items) {
    const day = days.at(-1);
    if (day?.date === item.date) {
      day.items.push(item);
      day.balanceMinor ??= item.balanceAfterMinor;
    } else {
      days.push({
        date: item.date,
        balanceMinor: item.balanceAfterMinor,
        items: [item],
      });
    }
  }
  return days;
};

/** `"Miércoles 30 de septiembre"`, with its year when it isn't this one. */
export const dayHeading = (date: LocalDate, currentYear: string): string =>
  formatWeekdayInWords(date, { withYear: !date.startsWith(`${currentYear}-`) });

/** `"Saldo del día $6.482.310"`. */
export const dayBalanceText = (balance: AmountMinor): string =>
  `${COPY.dayBalance} ${formatAmount(balance, CURRENCY_SHOWN)}`;

/** The bank's text as printed, or, for its `0`, that it gave none. */
export const descriptionView = (raw: string): DescriptionView =>
  raw.trim() === NO_DESCRIPTION_TEXT
    ? { kind: "none", raw }
    : { kind: "bank", text: raw };

/** `"+$420"`, `"−$90.000"`. */
export const amountText = (amount: AmountMinor): string =>
  formatSignedAmount(amount, CURRENCY_SHOWN);

/** `"312 movimientos del banco."` */
export const totalText = (total: number): string =>
  `${countText(total, COPY.movements)} ${COPY.ofTheBank}`;

/** `"Mostrando 30 de 312"`. */
export const shownText = (shown: number, total: number): string =>
  `${COPY.shown.before} ${formatCount(shown)} ${COPY.shown.of} ${formatCount(total)}`;

/**
 * What "Mostrar 30 más" brings: one more step, fewer when fewer are left,
 * and nothing once every movement shows or the list holds its most.
 */
export const nextStep = (
  shown: number,
  total: number,
): NextStep | undefined => {
  const count = Math.min(shown + MOVEMENTS_STEP, total, MAX_MOVEMENTS_SHOWN);
  if (count <= shown) return undefined;
  return {
    count,
    label: `${COPY.more.before} ${formatCount(count - shown)} ${COPY.more.after}`,
  };
};
