import {
  type CalendarMonth,
  type CalendarQuarter,
  monthPeriod,
  type Period,
  quarterOfMonth,
  quarterPeriod,
} from "@xtrakto/core";

// The movements list keeps its filters in the URL, so a reload keeps them
// and a link shares them: `/transactions?account=…&period=2026-q3&q=nequi&show=60`.

export const TRANSACTIONS_PARAMS = {
  account: "account",
  period: "period",
  search: "q",
  shown: "show",
} as const;

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

type TransactionsLink = {
  /** Left out when the user has a single account. */
  readonly accountId?: string;
  /** Left out to open on the account's latest quarter. */
  readonly period?: MovementPeriod;
  /** What the list looks for, kept across periods. */
  readonly search?: string;
  readonly shown?: number;
};

/** A link to the movements of an account in a period. */
export const transactionsHref = ({
  accountId,
  period,
  search,
  shown,
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
    ...(shown === undefined ? {} : { [TRANSACTIONS_PARAMS.shown]: shown }),
  },
});
