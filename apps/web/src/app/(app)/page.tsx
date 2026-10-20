import { Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { KindLegend } from "@/components/kind-legend/KindLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import { Button } from "@/components/ui/button";
import { PendingReviewBanner } from "@/features/review/components/PendingReviewBanner";
import { AccountCard } from "@/features/summary/components/AccountCard";
import { GlanceSection } from "@/features/summary/components/GlanceSection";
import { SUMMARY_COPY } from "@/features/summary/summary.constants";
import { getSummary } from "@/features/summary/summary.service";
import { UnreconciledEmpty } from "@/features/transactions/components/Unreconciled";
import { findUnreconciledStatement } from "@/features/transactions/transaction.service";
import { HowItWorks } from "@/features/upload/components/HowItWorks";
import { requireSignedIn } from "@/lib/auth";
import { accountPeriodSearchSchema } from "@/utils/account-period.schemas";
import { summaryHref } from "@/utils/transactions-url.helpers";

const COPY = PAGE_COPY.summary;

export const metadata: Metadata = { title: COPY.title };

// Before any movement counts (docs/ui/v8-12): what uploading brings, and
// the bank's download paths beside it; or the way to a statement that
// doesn't reconcile, when nothing else counts.
async function NoSummary({ clerkUserId }: { clerkUserId: string }) {
  const unreconciled = await findUnreconciledStatement(clerkUserId);
  return (
    <>
      <PageHeader
        title={COPY.title}
        subtitle={unreconciled ? undefined : COPY.subtitle}
      />
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col">
          {unreconciled ? (
            <UnreconciledEmpty statement={unreconciled} />
          ) : (
            <EmptyState
              title={COPY.emptyTitle}
              description={COPY.emptyDescription}
              action={<UploadStatementLink />}
            />
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col">
          <HowItWorks />
        </div>
      </div>
    </>
  );
}

// docs/ui/v8-01: an account's quarter, or one of its months, at a glance
// beside the account's card, under the color legend and the period
// controls, with the review banner while groups wait. The account and the
// period live in the URL.
export default async function SummaryPage({ searchParams }: PageProps<"/">) {
  const clerkUserId = await requireSignedIn();
  const { account, period } = accountPeriodSearchSchema.parse(
    await searchParams,
  );
  const summary = await getSummary(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  if (!summary) return <NoSummary clerkUserId={clerkUserId} />;
  return (
    <>
      <PageHeader title={SUMMARY_COPY.title} />
      <KindLegend />
      <PeriodControls
        choices={summary}
        hrefOf={summaryHref}
        action={
          <Button
            nativeButton={false}
            render={<Link href="/upload" />}
            className="w-full sm:w-auto"
          >
            <Upload aria-hidden strokeWidth={2.2} />
            {SUMMARY_COPY.upload}
          </Button>
        }
      />
      <PendingReviewBanner clerkUserId={clerkUserId} />
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <GlanceSection summary={summary} />
        <AccountCard summary={summary} />
      </div>
    </>
  );
}
