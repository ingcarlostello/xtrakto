import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { KindLegend } from "@/components/kind-legend/KindLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { KindTiles } from "@/features/transactions/components/KindTiles";
import { MovementDetailColumn } from "@/features/transactions/components/MovementDetailColumn";
import { PeriodControls } from "@/features/transactions/components/PeriodControls";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { UnreconciledNotice } from "@/features/transactions/components/Unreconciled";
import { totalText } from "@/features/transactions/transaction-list.helpers";
import { TRANSACTIONS_COPY as COPY } from "@/features/transactions/transaction.constants";
import { transactionsSearchSchema } from "@/features/transactions/transaction.schemas";
import { getAccountTransactions } from "@/features/transactions/transaction.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// Before any movement counts or a statement doesn't reconcile.
function NoTransactions() {
  return (
    <>
      <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
      <EmptyState
        title={COPY.emptyTitle}
        description={COPY.emptyDescription}
        action={<UploadStatementLink />}
      />
    </>
  );
}

// docs/ui/v8-03: an account's movements that count in a quarter or one of
// its months, by day, in their kinds' colors, with the period's totals by
// kind, a warning when a statement of its days doesn't reconcile, and the
// detail of the movement chosen beside them; before any, the invitation to
// upload. The filters and the movement live in the URL.
export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const clerkUserId = await requireSignedIn();
  const { account, period, q, filter, show, movement } =
    transactionsSearchSchema.parse(await searchParams);
  const transactions = await getAccountTransactions(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
    ...(q === undefined ? {} : { search: q }),
    ...(filter === undefined ? {} : { filter }),
    shown: show,
    ...(movement === undefined ? {} : { movementId: movement }),
  });
  if (!transactions) return <NoTransactions />;
  return (
    <>
      <PageHeader
        title={COPY.title}
        subtitle={totalText(transactions.total, transactions.search)}
      />
      <KindLegend />
      <PeriodControls view={transactions} />
      {transactions.unreconciled.map((statement) => (
        <UnreconciledNotice key={statement.id} statement={statement} />
      ))}
      <KindTiles totals={transactions.kindTotals} />
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TransactionList transactions={transactions} />
        <MovementDetailColumn transactions={transactions} />
      </div>
    </>
  );
}
