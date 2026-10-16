import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/features/transactions/components/PeriodControls";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { UnreconciledNotice } from "@/features/transactions/components/Unreconciled";
import { totalText } from "@/features/transactions/transaction-list.helpers";
import { TRANSACTIONS_COPY as COPY } from "@/features/transactions/transaction.constants";
import { transactionsSearchSchema } from "@/features/transactions/transaction.schemas";
import { getAccountTransactions } from "@/features/transactions/transaction.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-03 within Stage 5: an account's movements that count in a
// quarter or one of its months, by day, and a warning when a statement of
// its days doesn't reconcile; before any, the invitation to upload. The
// filters live in the URL.
export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const clerkUserId = await requireSignedIn();
  const { account, period, q, show } = transactionsSearchSchema.parse(
    await searchParams,
  );
  const transactions = await getAccountTransactions(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
    ...(q === undefined ? {} : { search: q }),
    shown: show,
  });
  if (!transactions)
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
  return (
    <>
      <PageHeader
        title={COPY.title}
        subtitle={totalText(transactions.total, transactions.search)}
      />
      <PeriodControls view={transactions} />
      {transactions.unreconciled.map((statement) => (
        <UnreconciledNotice key={statement.id} statement={statement} />
      ))}
      <TransactionList transactions={transactions} />
    </>
  );
}
