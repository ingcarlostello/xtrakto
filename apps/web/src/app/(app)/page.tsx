import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { TransactionsReady } from "@/features/transactions/components/TransactionsReady";
import { countTransactions } from "@/features/transactions/transaction.service";
import { HowItWorks } from "@/features/upload/components/HowItWorks";
import { requireSignedIn } from "@/lib/auth";

const COPY = PAGE_COPY.summary;

export const metadata: Metadata = { title: COPY.title };

// Before the first upload (docs/ui/v8-12): what uploading brings, and the
// bank's download paths beside it. Once movements count, the way to them
// instead. The summary page (Phase 6.7) replaces both.
export default async function SummaryPage() {
  const clerkUserId = await requireSignedIn();
  const movements = await countTransactions(clerkUserId);
  return (
    <>
      <PageHeader
        title={COPY.title}
        subtitle={movements === 0 ? COPY.subtitle : undefined}
      />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col">
          {movements === 0 ? (
            <EmptyState
              title={COPY.emptyTitle}
              description={COPY.emptyDescription}
              action={<UploadStatementLink />}
            />
          ) : (
            <TransactionsReady count={movements} />
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col">
          <HowItWorks />
        </div>
      </div>
    </>
  );
}
