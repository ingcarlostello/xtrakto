import { formatDayInWords, type Period } from "@xtrakto/core";
import type { HrefOf } from "@/components/period-controls/period-controls.types";
import {
  type MovementPeriod,
  periodDays,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import type { ListLink } from "./transaction-list.helpers";
import { TRANSACTIONS_COPY } from "./transaction.constants";
import type { AccountTransactions } from "./transaction.types";

const COPY = TRANSACTIONS_COPY.period;

/**
 * Whether a statement's days, those after its opening balance's, meet a
 * period's days.
 */
export const meetsPeriod = (statement: Period, period: Period): boolean =>
  statement.from < period.to && statement.to >= period.from;

/** The filters a link keeps: the account only when there are several. */
export const listLinkOf = ({
  accounts,
  account,
  period,
  search,
  filter,
}: AccountTransactions): ListLink => ({
  ...(accounts.length > 1 ? { accountId: account.id } : {}),
  period,
  ...(search === undefined ? {} : { search }),
  ...(filter === undefined ? {} : { filter }),
});

/** The list's links to another account or period, which keep its search and filter. */
export const listHrefOf =
  ({
    search,
    filter,
  }: Pick<AccountTransactions, "search" | "filter">): HrefOf =>
  (link) =>
    transactionsHref({ ...link, search, filter });

/** `"Del 1 de julio al 30 de septiembre de 2026"`. */
export const periodText = (period: MovementPeriod): string => {
  const { from, to } = periodDays(period);
  return `${COPY.from} ${formatDayInWords(from)} ${COPY.to} ${formatDayInWords(to)} ${COPY.ofYear} ${to.slice(0, 4)}`;
};
