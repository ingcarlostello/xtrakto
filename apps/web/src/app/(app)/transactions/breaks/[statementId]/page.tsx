import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { statementName } from "@/features/transactions/balance-breaks.helpers";
import { StatementBreaksView } from "@/features/transactions/components/StatementBreaksView";
import { TRANSACTIONS_COPY } from "@/features/transactions/transaction.constants";
import {
  currentYearInBogota,
  getStatementBreaks,
} from "@/features/transactions/transaction.service";
import { requireSignedIn } from "@/lib/auth";
import { accountLabel } from "@/utils/account-label.helpers";

const COPY = TRANSACTIONS_COPY.breaks;

export const metadata: Metadata = { title: COPY.title };

// "Ver dónde no cuadra" (docs/ui/v8-13): a quarterly statement that doesn't
// reconcile, with the rows where its balance breaks. Only its owner sees it.
export default async function StatementBreaksPage({
  params,
}: PageProps<"/transactions/breaks/[statementId]">) {
  const clerkUserId = await requireSignedIn();
  const id = z.uuid().safeParse((await params).statementId);
  if (!id.success) notFound();
  const breaks = await getStatementBreaks(clerkUserId, id.data);
  if (!breaks) notFound();
  const { account, statement } = breaks;
  return (
    <>
      <PageHeader
        title={COPY.title}
        subtitle={`${statementName(statement.period)} · ${accountLabel(account, account.last4)}`}
      />
      <StatementBreaksView
        breaks={breaks}
        currentYear={currentYearInBogota()}
      />
    </>
  );
}
