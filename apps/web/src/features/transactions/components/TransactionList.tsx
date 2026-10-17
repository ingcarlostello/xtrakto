import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { accountLabel } from "@/utils/account-label.helpers";
import { filterOptions } from "../kind-view.helpers";
import { listLinkOf, periodText } from "../period-selector.helpers";
import {
  type ListLink,
  nextStep,
  shownText,
} from "../transaction-list.helpers";
import { TRANSACTIONS_COPY as COPY } from "../transaction.constants";
import type { AccountTransactions } from "../transaction.types";
import { KindFilters } from "./KindFilters";
import { ListFooter } from "./ListFooter";
import { MovementDays } from "./MovementDays";
import { NoMatches } from "./NoMatches";
import { SearchField } from "./SearchField";

type ListBodyProps = { transactions: AccountTransactions; link: ListLink };

// The days, or why there are none: nothing matches, nothing of the filter's
// kind, or the period is empty.
function ListBody({ transactions, link }: ListBodyProps) {
  const { total, items, currentYear } = transactions;
  if (items.length === 0) {
    if (link.search !== undefined) return <NoMatches link={link} />;
    return (
      <p className="py-6 text-body text-ink-muted">
        {link.filter === undefined ? COPY.emptyPeriod : COPY.kinds.emptyFilter}
      </p>
    );
  }
  return (
    <>
      <MovementDays items={items} currentYear={currentYear} />
      <ListFooter
        shown={items.length}
        status={shownText(items.length, total)}
        next={nextStep(items.length, total, link)}
      />
    </>
  );
}

/**
 * "Todos los movimientos": the account's movements in the period, by day,
 * the search among them and the filters by kind (docs/ui/v8-03).
 */
export function TransactionList({
  transactions,
}: {
  transactions: AccountTransactions;
}) {
  const { account, period } = transactions;
  const link = listLinkOf(transactions);
  return (
    <Card variant="card" className="w-full max-w-4xl gap-0">
      <CardHeader className="pb-4">
        <h2 className="text-section font-bold text-balance">
          {COPY.listTitle}
        </h2>
        <CardDescription>
          {periodText(period)}. {accountLabel(account, account.last4)}.
        </CardDescription>
      </CardHeader>
      <SearchField link={link} />
      <KindFilters options={filterOptions(link, transactions.pendingReview)} />
      <ListBody transactions={transactions} link={link} />
    </Card>
  );
}
