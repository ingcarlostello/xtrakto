import {
  type CalendarQuarter,
  formatDayInWords,
  formatMonthName,
  formatQuarter,
  type Period,
  quarterOfMonth,
} from "@xtrakto/core";
import type {
  AccountRow,
  MovementQuarter,
  UnreconciledStatement,
} from "@xtrakto/db";
import { accountLabel } from "@/utils/account-label.helpers";
import {
  type MovementPeriod,
  periodDays,
  periodParam,
  quarterOf,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import type { ListLink } from "./transaction-list.helpers";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type {
  AccountTransactions,
  PeriodOption,
  QuarterChoice,
} from "./transaction.types";

const COPY = TRANSACTIONS_COPY.period;

const QUARTER_BADGES = {
  verified: { label: COPY.verified, variant: "ok" },
  unverified: { label: COPY.unverified, variant: "neutral" },
  unreconciled: { label: COPY.unreconciled, variant: "attention" },
} as const;

const isSameQuarter = (period: MovementPeriod, quarter: CalendarQuarter) => {
  const { year, quarter: number } = quarterOf(period);
  return year === quarter.year && number === quarter.quarter;
};

/**
 * The period the list shows: the one the URL asks, when it falls in a
 * quarter with movements, else the latest such quarter. `undefined` when the
 * account has none.
 */
export const selectPeriod = (
  requested: MovementPeriod | undefined,
  quarters: readonly CalendarQuarter[],
): MovementPeriod | undefined => {
  if (requested && quarters.some((q) => isSameQuarter(requested, q)))
    return requested;
  const latest = quarters[0];
  return (
    latest && { kind: "quarter", year: latest.year, quarter: latest.quarter }
  );
};

/**
 * Whether a statement's days, those after its opening balance's, meet a
 * period's days.
 */
export const meetsPeriod = (statement: Period, period: Period): boolean =>
  statement.from < period.to && statement.to >= period.from;

const quarterOfDate = (date: string): CalendarQuarter => ({
  year: Number(date.slice(0, 4)),
  quarter: quarterOfMonth(Number(date.slice(5, 7))),
});

/**
 * The quarters to choose from, the latest first: those with movements, and
 * those of a statement that doesn't reconcile, which the picker marks
 * whether or not something else counts on their days.
 */
export const quarterChoices = (
  counted: readonly MovementQuarter[],
  unreconciled: readonly UnreconciledStatement[],
): readonly QuarterChoice[] => {
  const choices = new Map<string, QuarterChoice>();
  for (const { verified, ...quarter } of counted)
    choices.set(`${quarter.year}-${quarter.quarter}`, {
      ...quarter,
      status: verified ? "verified" : "unverified",
    });
  for (const { period } of unreconciled) {
    const quarter = quarterOfDate(period.to);
    choices.set(`${quarter.year}-${quarter.quarter}`, {
      ...quarter,
      status: "unreconciled",
    });
  }
  return [...choices.values()].sort(
    (a, b) => b.year - a.year || b.quarter - a.quarter,
  );
};

/** The filters a link keeps: the account only when there are several. */
export const listLinkOf = ({
  accounts,
  account,
  period,
  search,
}: AccountTransactions): ListLink => ({
  ...(accounts.length > 1 ? { accountId: account.id } : {}),
  period,
  ...(search === undefined ? {} : { search }),
});

/** `"Del 1 de julio al 30 de septiembre de 2026"`. */
export const periodText = (period: MovementPeriod): string => {
  const { from, to } = periodDays(period);
  return `${COPY.from} ${formatDayInWords(from)} ${COPY.to} ${formatDayInWords(to)} ${COPY.ofYear} ${to.slice(0, 4)}`;
};

/** The quarters to choose from, each with its status. */
export const quarterOptions = (
  view: AccountTransactions,
): readonly PeriodOption[] => {
  const { accountId, search } = listLinkOf(view);
  return view.quarters.map((quarter) => {
    const period: MovementPeriod = {
      kind: "quarter",
      year: quarter.year,
      quarter: quarter.quarter,
    };
    return {
      key: periodParam(period),
      label: formatQuarter(quarter),
      href: transactionsHref({ accountId, period, search }),
      isCurrent: isSameQuarter(view.period, quarter),
      badge: QUARTER_BADGES[quarter.status],
    };
  });
};

/** The shown quarter's three months, then the whole quarter. */
export const monthOptions = (
  view: AccountTransactions,
): readonly PeriodOption[] => {
  const { accountId, period, search } = listLinkOf(view);
  const { year, quarter } = quarterOf(period);
  const months: MovementPeriod[] = [0, 1, 2].map((offset) => ({
    kind: "month",
    year,
    month: quarter * 3 - 2 + offset,
  }));
  const options: MovementPeriod[] = [
    ...months,
    { kind: "quarter", year, quarter },
  ];
  return options.map((option) => ({
    key: periodParam(option),
    label: option.kind === "month" ? formatMonthName(option) : COPY.quarter,
    href: transactionsHref({ accountId, period: option, search }),
    isCurrent: periodParam(option) === periodParam(period),
  }));
};

/** The accounts to switch to, each opening on its latest quarter. */
export const accountOptions = ({
  accounts,
  account,
  search,
}: Pick<
  AccountTransactions,
  "accounts" | "account" | "search"
>): readonly PeriodOption[] =>
  accounts.map((option: AccountRow) => ({
    key: option.id,
    label: accountLabel(option, option.last4),
    href: transactionsHref({ accountId: option.id, search }),
    isCurrent: option.id === account.id,
  }));
