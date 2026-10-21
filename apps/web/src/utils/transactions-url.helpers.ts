import {
  type CalendarMonth,
  type CalendarQuarter,
  type CategoryId,
  monthPeriod,
  type Period,
  quarterOfMonth,
  quarterPeriod,
} from "@xtrakto/core";

// The movements list keeps its filters and the movement it details in the
// URL, so a reload keeps them and a link shares them:
// `/transactions?account=…&period=2026-q3&q=nequi&filter=moved&show=60&movement=…`,
// or a category's movements instead of a filter's: `&category=restaurants`.

export const TRANSACTIONS_PARAMS = {
  account: "account",
  period: "period",
  search: "q",
  filter: "filter",
  category: "category",
  shown: "show",
  movement: "movement",
} as const;

/** What the list shows of the period: one kind, or what waits for review. */
export const MOVEMENT_FILTERS = [
  "income",
  "spending",
  "moved",
  "review",
] as const;

export type MovementFilter = (typeof MOVEMENT_FILTERS)[number];

/** What Pagos fijos lists instead of its payments: those that stopped. */
export const RECURRING_FILTERS = ["stopped"] as const;

export type RecurringFilter = (typeof RECURRING_FILTERS)[number];

/** What the movements list shows: a quarter, or one of its months. */
export type MovementPeriod =
  | ({ readonly kind: "quarter" } & CalendarQuarter)
  | ({ readonly kind: "month" } & CalendarMonth);

// "2026-q3" names a quarter, "2026-08" a month.
const PERIOD_PARAM_PATTERN = /^(\d{4})-(?:q([1-4])|(0[1-9]|1[0-2]))$/;

/** A period as the URL writes it: `"2026-q3"`, `"2026-08"`. */
export const periodParam = (period: MovementPeriod): string =>
  period.kind === "quarter"
    ? `${period.year}-q${period.quarter}`
    : `${period.year}-${String(period.month).padStart(2, "0")}`;

/** The period a URL names, or `undefined` when it names none. */
export const parsePeriodParam = (value: string): MovementPeriod | undefined => {
  const match = PERIOD_PARAM_PATTERN.exec(value);
  if (!match) return undefined;
  const [, year, quarter, month] = match;
  return quarter === undefined
    ? { kind: "month", year: Number(year), month: Number(month) }
    : { kind: "quarter", year: Number(year), quarter: Number(quarter) };
};

/** The days a period covers. */
export const periodDays = (period: MovementPeriod): Period =>
  period.kind === "quarter" ? quarterPeriod(period) : monthPeriod(period);

/** The quarter a period is, or falls in. */
export const quarterOf = (period: MovementPeriod): CalendarQuarter =>
  period.kind === "quarter"
    ? { year: period.year, quarter: period.quarter }
    : { year: period.year, quarter: quarterOfMonth(period.month) };

const monthOf = (date: string): CalendarMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

/**
 * Where a statement's movements show: the month that holds all its days,
 * else the quarter of its last day, as for a quarterly statement, whose
 * period opens on the previous quarter's last day.
 */
export const periodOfStatement = ({ from, to }: Period): MovementPeriod => {
  const first = monthOf(from);
  const last = monthOf(to);
  if (first.year === last.year && first.month === last.month)
    return { kind: "month", ...last };
  return { kind: "quarter", ...quarterOf({ kind: "month", ...last }) };
};

/** Where a statement that doesn't reconcile shows its rows (5.7d). */
export const breaksHref = (statementId: string) =>
  `/transactions/breaks/${statementId}` as const;

type TransactionsLink = {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
  /** What the list looks for, kept across periods. */
  readonly search?: string;
  /** Which movements it shows, kept across periods too. */
  readonly filter?: MovementFilter;
  /** A category's movements, instead of a filter's (6.8b). */
  readonly category?: CategoryId;
  readonly shown?: number;
  /** The movement whose detail opens beside the list. */
  readonly movementId?: string;
};

/** A link to the movements of an account in a period. */
export const transactionsHref = ({
  accountId,
  period,
  search,
  filter,
  category,
  shown,
  movementId,
}: TransactionsLink) => ({
  pathname: "/transactions" as const,
  query: {
    ...(accountId === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.account]: accountId }),
    ...(period === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.period]: periodParam(period) }),
    ...(search === undefined ? {} : { [TRANSACTIONS_PARAMS.search]: search }),
    ...(filter === undefined ? {} : { [TRANSACTIONS_PARAMS.filter]: filter }),
    ...(category === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.category]: category }),
    ...(shown === undefined ? {} : { [TRANSACTIONS_PARAMS.shown]: shown }),
    ...(movementId === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.movement]: movementId }),
  },
});

/** The quick review of an account's quarter, with both in the URL (6.3b). */
export const reviewHref = ({
  accountId,
  period,
}: {
  readonly accountId: string;
  readonly period: MovementPeriod;
}) => ({
  pathname: "/review" as const,
  query: {
    [TRANSACTIONS_PARAMS.account]: accountId,
    [TRANSACTIONS_PARAMS.period]: periodParam(period),
  },
});

/**
 * The payments that repeat, in an account and period when given (6.5b),
 * or those that stopped (6.5c).
 */
export const recurringHref = ({
  accountId,
  period,
  filter,
}: {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
  readonly filter?: RecurringFilter;
}) => ({
  pathname: "/recurring" as const,
  query: {
    ...(accountId === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.account]: accountId }),
    ...(period === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.period]: periodParam(period) }),
    ...(filter === undefined ? {} : { [TRANSACTIONS_PARAMS.filter]: filter }),
  },
});

type CategoriesLink = {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
};

/** The categories of an account's period, when given (6.8a). */
export const categoriesHref = ({ accountId, period }: CategoriesLink) => ({
  pathname: "/categories" as const,
  query: {
    ...(accountId === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.account]: accountId }),
    ...(period === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.period]: periodParam(period) }),
  },
});

/** A category's detail in an account's period, when given (6.8b). */
export const categoryHref = ({
  categoryId,
  ...link
}: CategoriesLink & { readonly categoryId: CategoryId }) => ({
  pathname: `/categories/${categoryId}` as const,
  query: categoriesHref(link).query,
});

/** The summary of an account's period, when given (6.7a). */
export const summaryHref = ({
  accountId,
  period,
}: {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
}) => ({
  pathname: "/" as const,
  query: {
    ...(accountId === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.account]: accountId }),
    ...(period === undefined
      ? {}
      : { [TRANSACTIONS_PARAMS.period]: periodParam(period) }),
  },
});
