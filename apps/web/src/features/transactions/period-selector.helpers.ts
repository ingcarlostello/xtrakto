import {
  formatDayInWords,
  formatMonthName,
  formatQuarter,
} from "@xtrakto/core";
import type { AccountRow, MovementQuarter } from "@xtrakto/db";
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
import type { AccountTransactions, PeriodOption } from "./transaction.types";

const COPY = TRANSACTIONS_COPY.period;

const isSameQuarter = (period: MovementPeriod, quarter: MovementQuarter) => {
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
  quarters: readonly MovementQuarter[],
): MovementPeriod | undefined => {
  if (requested && quarters.some((q) => isSameQuarter(requested, q)))
    return requested;
  const latest = quarters[0];
  return (
    latest && { kind: "quarter", year: latest.year, quarter: latest.quarter }
  );
};

/** The filters a link keeps: the account only when there are several. */
export const listLinkOf = ({
  accounts,
  account,
  period,
}: AccountTransactions): ListLink => ({
  ...(accounts.length > 1 ? { accountId: account.id } : {}),
  period,
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
  const { accountId } = listLinkOf(view);
  return view.quarters.map((quarter) => {
    const period: MovementPeriod = { kind: "quarter", ...quarter };
    return {
      key: periodParam(period),
      label: formatQuarter(quarter),
      href: transactionsHref({ accountId, period }),
      isCurrent: isSameQuarter(view.period, quarter),
      badge: {
        label: quarter.verified ? COPY.verified : COPY.unverified,
        isOk: quarter.verified,
      },
    };
  });
};

/** The shown quarter's three months, then the whole quarter. */
export const monthOptions = (
  view: AccountTransactions,
): readonly PeriodOption[] => {
  const { accountId, period } = listLinkOf(view);
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
    href: transactionsHref({ accountId, period: option }),
    isCurrent: periodParam(option) === periodParam(period),
  }));
};

/** The accounts to switch to, each opening on its latest quarter. */
export const accountOptions = ({
  accounts,
  account,
}: Pick<
  AccountTransactions,
  "accounts" | "account"
>): readonly PeriodOption[] =>
  accounts.map((option: AccountRow) => ({
    key: option.id,
    label: accountLabel(option, option.last4),
    href: transactionsHref({ accountId: option.id }),
    isCurrent: option.id === account.id,
  }));
