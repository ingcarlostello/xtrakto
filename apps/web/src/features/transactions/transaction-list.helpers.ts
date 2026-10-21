import {
  type AmountMinor,
  CATEGORIES,
  type CategoryId,
  channelOf,
  CURRENCY,
  formatAmount,
  formatMonthName,
  formatSignedAmount,
  formatWeekdayInWords,
  type LocalDate,
  parseTypedAmount,
  SAVINGS_INTEREST_RULE_ID,
  sumAmounts,
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
  AccountTransactions,
  DescriptionView,
  DetailLinks,
  MovementLine,
  MovementList,
  MovementTags,
  NextStep,
  TransactionDay,
} from "./transaction.types";

// Xtrakto reads accounts in pesos only: other currencies are out of scope.
const CURRENCY_SHOWN = CURRENCY.COP;

type OpenDay = {
  date: LocalDate;
  balanceMinor: AmountMinor | null;
  lines: MovementLine[];
};

// The balance each day closed with: the first one printed among its
// movements, its last one in the bank's order. Only a statement with
// balances prints them.
const closingBalances = (
  items: readonly TransactionListItem[],
): ReadonlyMap<LocalDate, AmountMinor> => {
  const balances = new Map<LocalDate, AmountMinor>();
  for (const { date, balanceAfterMinor } of items)
    if (balanceAfterMinor !== null && !balances.has(date))
      balances.set(date, balanceAfterMinor);
  return balances;
};

const dateOf = (line: MovementLine): LocalDate =>
  line.kind === "movement" ? line.item.date : line.date;

// Lines by day, in their order, each day with the balance it closed with.
const daysOf = (
  lines: readonly MovementLine[],
  balances: ReadonlyMap<LocalDate, AmountMinor>,
): TransactionDay[] => {
  const days: OpenDay[] = [];
  for (const line of lines) {
    const day = days.at(-1);
    if (day?.date === dateOf(line)) day.lines.push(line);
    else
      days.push({
        date: dateOf(line),
        balanceMinor: balances.get(dateOf(line)) ?? null,
        lines: [line],
      });
  }
  return days;
};

/** Movements by day, each one a line, in their order, as a statement printed them. */
export const groupByDay = (
  items: readonly TransactionListItem[],
): readonly TransactionDay[] =>
  daysOf(
    items.map((item) => ({ kind: "movement", item })),
    closingBalances(items),
  );

const isDailyInterest = ({
  categoryRuleId,
  categoryId,
}: TransactionListItem): boolean =>
  categoryRuleId === SAVINGS_INTEREST_RULE_ID && categoryId === "interest";

// Each month's daily interest, in the list's order: "2026-09" → its abonos.
const interestByMonth = (items: readonly TransactionListItem[]) => {
  const months = new Map<string, TransactionListItem[]>();
  for (const item of items.filter(isDailyInterest)) {
    const month = item.date.slice(0, 7);
    months.set(month, [...(months.get(month) ?? []), item]);
  }
  return months;
};

/**
 * The list's lines, in its order: each movement, but a month's daily
 * interest in one line, where its newest abono goes, when it has two or
 * more (design-system.md §10).
 */
export const movementLines = (
  items: readonly TransactionListItem[],
): MovementLine[] => {
  const months = interestByMonth(items);
  return items.flatMap((item): MovementLine[] => {
    const abonos = isDailyInterest(item)
      ? months.get(item.date.slice(0, 7))
      : undefined;
    if (abonos === undefined || abonos.length < 2)
      return [{ kind: "movement", item }];
    if (abonos[0] !== item) return [];
    return [
      {
        kind: "interest",
        date: item.date,
        descriptionRaw: item.descriptionRaw,
        amountMinor: sumAmounts(abonos.map(({ amountMinor }) => amountMinor)),
        count: abonos.length,
      },
    ];
  });
};

// How many movements a line holds.
const movementsIn = (line: MovementLine): number =>
  line.kind === "interest" ? line.count : 1;

/**
 * The newest `shown` lines of a period's movements, by day, each day with
 * the balance it closed with among all of them, and what they add up to.
 */
export const movementList = (
  items: readonly TransactionListItem[],
  shown: number,
): MovementList => {
  const lines = movementLines(items);
  const shownLines = lines.slice(0, shown);
  const grouped = lines.filter(({ kind }) => kind === "interest");
  return {
    days: daysOf(shownLines, closingBalances(items)),
    shownLines: shownLines.length,
    shownMovements: shownLines.reduce((sum, l) => sum + movementsIn(l), 0),
    lineCount: lines.length,
    groupedInterest: grouped.reduce((sum, l) => sum + movementsIn(l), 0),
  };
};

/** `"Intereses de septiembre"`. */
export const interestTitle = (date: LocalDate): string =>
  `${COPY.interest.title} ${formatMonthName({
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
  }).toLowerCase()}`;

/** `"30 abonos diarios, agrupados en una línea."`. */
export const interestNote = (count: number): string =>
  `${countText(count, COPY.interest.abonos)}, ${COPY.interest.inOneLine}`;

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

export const CATEGORY_LABELS: ReadonlyMap<CategoryId, string> = new Map(
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

/**
 * `"312 movimientos del banco."`, or how many match a search; then, when the
 * list groups the daily interest, `"Los 90 abonos diarios de intereses se
 * ven agrupados por mes."`.
 */
export const totalText = (
  total: number,
  {
    search,
    groupedInterest = 0,
  }: { search?: string; groupedInterest?: number } = {},
): string => {
  const count =
    search === undefined
      ? `${countText(total, COPY.movements)} ${COPY.ofTheBank}`
      : `${countText(total, COPY.search.matches)} ${COPY.search.with} “${search}”.`;
  return groupedInterest === 0
    ? count
    : `${count} ${COPY.interest.groupedBefore} ${formatCount(groupedInterest)} ${COPY.interest.groupedAfter}`;
};

/** The page's subtitle: how many movements there are or match, and the grouped abonos. */
export const listSubtitle = ({
  total,
  search,
  list,
}: Pick<AccountTransactions, "total" | "search" | "list">): string =>
  totalText(total, {
    ...(search === undefined ? {} : { search }),
    groupedInterest: list.groupedInterest,
  });

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

/**
 * Where each movement's detail opens and closes: the list as it is, with
 * as many movements as it shows, so the one chosen stays in it.
 */
export const detailLinks = (
  link: ListLink,
  { shown, openId }: { readonly shown: number; readonly openId?: string },
): DetailLinks => {
  const kept = { ...link, ...(shown > MOVEMENTS_STEP ? { shown } : {}) };
  return {
    open: (movementId) => transactionsHref({ ...kept, movementId }),
    close: transactionsHref(kept),
    ...(openId === undefined ? {} : { openId }),
  };
};
