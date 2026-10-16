import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransactionList } from "@/features/transactions/components/TransactionList";
import { totalText } from "@/features/transactions/transaction-list.helpers";
import {
  SHOWN_PARAM,
  TRANSACTIONS_COPY as COPY,
} from "@/features/transactions/transaction.constants";
import { shownCountSchema } from "@/features/transactions/transaction.schemas";
import { getAccountTransactions } from "@/features/transactions/transaction.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-03 within 5.7a: the movements that count, by day; until one
// counts, the invitation to upload.
export default async function TransactionsPage({
  searchParams,
}: PageProps<"/transactions">) {
  const clerkUserId = await requireSignedIn();
  const shown = shownCountSchema.parse((await searchParams)[SHOWN_PARAM]);
  const transactions = await getAccountTransactions(clerkUserId, shown);
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
      <PageHeader title={COPY.title} subtitle={totalText(transactions.total)} />
      <TransactionList transactions={transactions} />
    </>
  );
}
