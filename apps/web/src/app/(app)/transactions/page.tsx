import type { Metadata } from "next";
import type { z } from "zod";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { KindLegend } from "@/components/kind-legend/KindLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import { ExampleBanner } from "@/features/example/components/ExampleBanner";
import { EXAMPLE_COPY } from "@/features/example/example.constants";
import { DownloadCsvButton } from "@/features/transactions/components/DownloadCsvButton";
import { KindTiles } from "@/features/transactions/components/KindTiles";
import { MovementDetailColumn } from "@/features/transactions/components/MovementDetailColumn";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { UnreconciledNotice } from "@/features/transactions/components/Unreconciled";
import { listHrefOf } from "@/features/transactions/period-selector.helpers";
import { listSubtitle } from "@/features/transactions/transaction-list.helpers";
import { TRANSACTIONS_COPY as COPY } from "@/features/transactions/transaction.constants";
import { transactionsSearchSchema } from "@/features/transactions/transaction.schemas";
import { getAccountTransactions } from "@/features/transactions/transaction.service";
import type { TransactionsRequest } from "@/features/transactions/transaction.types";
import { requireViewer } from "@/lib/example-mode";

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

// What the URL asks the list for.
const requestOf = ({
  account,
  period,
  q,
  filter,
  category,
  show,
  movement,
}: z.infer<typeof transactionsSearchSchema>): TransactionsRequest => ({
  ...(account === undefined ? {} : { accountId: account }),
  ...(period === undefined ? {} : { period }),
  ...(q === undefined ? {} : { search: q }),
  ...(filter === undefined ? {} : { filter }),
  ...(category === undefined ? {} : { category }),
  shown: show,
  ...(movement === undefined ? {} : { movementId: movement }),
});

// docs/ui/v8-03: an account's movements that count in a quarter or one of
// its months, by day, in their kinds' colors, with the period's totals by
// kind, a warning when a statement of its days doesn't reconcile, and the
// detail of the movement chosen beside them; before any, the invitation to
// upload. The filters and the movement live in the URL. The example's, while
// the browser explores it (7.8), are only read: no CSV, no corrections.
export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const { clerkUserId, isExample } = await requireViewer();
  const params = await searchParams;
  const transactions = await getAccountTransactions(
    clerkUserId,
    requestOf(transactionsSearchSchema.parse(params)),
  );
  if (!transactions) return <NoTransactions />;
  return (
    <>
      {isExample && <ExampleBanner />}
      <PageHeader title={COPY.title} subtitle={listSubtitle(transactions)} />
      <KindLegend />
      <PeriodControls
        choices={transactions}
        hrefOf={listHrefOf(transactions)}
        action={
          isExample ? undefined : <DownloadCsvButton searchParams={params} />
        }
      />
      {transactions.unreconciled.map((statement) => (
        <UnreconciledNotice key={statement.id} statement={statement} />
      ))}
      <KindTiles totals={transactions.kindTotals} />
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TransactionList transactions={transactions} />
        <MovementDetailColumn
          transactions={transactions}
          readOnlyNote={isExample ? EXAMPLE_COPY.readOnly : undefined}
        />
      </div>
    </>
  );
}
