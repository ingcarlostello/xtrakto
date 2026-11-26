import { formatDayInWords, type Period } from "@xtrakto/core";
import type { HrefOf } from "@/components/period-controls/period-controls.types";
import { pageDays } from "@/utils/card-cycles.helpers";
import { transactionsHref } from "@/utils/transactions-url.helpers";
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
  category,
}: AccountTransactions): ListLink => ({
  ...(accounts.length > 1 ? { accountId: account.id } : {}),
  period,
  ...(search === undefined ? {} : { search }),
  ...(filter === undefined ? {} : { filter }),
  ...(category === undefined ? {} : { category }),
});

/**
 * The list's links to another account or period, which keep its search and
 * its filter or category.
 */
export const listHrefOf =
  ({
    search,
    filter,
    category,
  }: Pick<AccountTransactions, "search" | "filter" | "category">): HrefOf =>
  (link) =>
    transactionsHref({ ...link, search, filter, category });

/**
 * `"Del 1 de julio al 30 de septiembre de 2026"`, or a card's cycle (12.3c):
 * `"Del 12 de agosto al 10 de septiembre de 2026"`.
 */
export const periodText = ({
  period,
  cycles,
}: Pick<AccountTransactions, "period" | "cycles">): string => {
  const { from, to } = pageDays(period, cycles);
  return `${COPY.from} ${formatDayInWords(from)} ${COPY.to} ${formatDayInWords(to)} ${COPY.ofYear} ${to.slice(0, 4)}`;
};
