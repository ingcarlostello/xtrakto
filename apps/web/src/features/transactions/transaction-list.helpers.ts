import {
  type AmountMinor,
  CATEGORIES,
  type CategoryId,
  channelOf,
  CURRENCY,
  formatAmount,
  formatSignedAmount,
  formatWeekdayInWords,
  type LocalDate,
  parseTypedAmount,
} from "@xtrakto/core";
import type { MovementSearch, TransactionListItem } from "@xtrakto/db";
import { countText, formatCount } from "@/utils/count-text.utils";
import {
  type MovementFilter,
  type MovementPeriod,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import {
  MAX_MOVEMENTS_SHOWN,
  MOVEMENTS_STEP,
  NO_DESCRIPTION_TEXT,
  TRANSACTIONS_COPY as COPY,
} from "./transaction.constants";
import type {
  DescriptionView,
  MovementTags,
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

const CATEGORY_LABELS: ReadonlyMap<CategoryId, string> = new Map(
  CATEGORIES.map(({ id, labelEs }) => [id, labelEs]),
);

/**
 * A movement's tags (docs/ui/v8-03): the channel its text names, and its
 * category, or "Por revisar" instead while the category is only a guess. A
 * movement that counts nowhere, of a statement that doesn't reconcile, shows
 * its channel only: the quick review never asks about it.
 */
export const movementTags = (
  { descriptionRaw, categoryId, isPendingReview }: TransactionListItem,
  isCounted: boolean,
): MovementTags => {
  const channel = channelOf(descriptionRaw)?.labelEs;
  if (!isCounted)
    return { channel, category: undefined, isPendingReview: false };
  const category =
    isPendingReview || categoryId === null
      ? undefined
      : CATEGORY_LABELS.get(categoryId);
  return { channel, category, isPendingReview };
};

/** `"+$420"`, `"−$90.000"`. */
export const amountText = (amount: AmountMinor): string =>
  formatSignedAmount(amount, CURRENCY_SHOWN);

/** `"312 movimientos del banco."`, or how many match a search. */
export const totalText = (total: number, search?: string): string =>
  search === undefined
    ? `${countText(total, COPY.movements)} ${COPY.ofTheBank}`
    : `${countText(total, COPY.search.matches)} ${COPY.search.with} “${search}”.`;

/** What a search looks for: its text, and the amount it is when it reads as one. */
export const movementSearchOf = (text: string): MovementSearch => {
  const amount = parseTypedAmount(text);
  return amount.ok ? { text, amountMinor: amount.value } : { text };
};

/** `"Mostrando 30 de 312"`. */
export const shownText = (shown: number, total: number): string =>
  `${COPY.shown.before} ${formatCount(shown)} ${COPY.shown.of} ${formatCount(total)}`;

/** The list's filters that a link keeps. */
export type ListLink = {
  /** Only when the user has more than one account. */
  readonly accountId?: string;
  readonly period: MovementPeriod;
  readonly search?: string;
  readonly filter?: MovementFilter;
};

/**
 * What "Mostrar 30 más" brings: one more step, fewer when fewer are left,
 * and nothing once every movement shows or the list holds its most. Its
 * link keeps the account and the period.
 */
export const nextStep = (
  shown: number,
  total: number,
  link: ListLink,
): NextStep | undefined => {
  const count = Math.min(shown + MOVEMENTS_STEP, total, MAX_MOVEMENTS_SHOWN);
  if (count <= shown) return undefined;
  return {
    label: `${COPY.more.before} ${formatCount(count - shown)} ${COPY.more.after}`,
    href: transactionsHref({ ...link, shown: count }),
  };
};
