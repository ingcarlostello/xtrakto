import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import { HowWeFindThem } from "@/features/recurring/components/HowWeFindThem";
import { RecurringList } from "@/features/recurring/components/RecurringList";
import { pageSubtitle } from "@/features/recurring/recurring-view.helpers";
import { RECURRING_COPY } from "@/features/recurring/recurring.constants";
import { getRecurringPayments } from "@/features/recurring/recurring.service";
import { requireSignedIn } from "@/lib/auth";
import { accountPeriodSearchSchema } from "@/utils/account-period.schemas";
import { recurringHref } from "@/utils/transactions-url.helpers";

const COPY = PAGE_COPY.recurring;

export const metadata: Metadata = { title: COPY.title };

// Before any movement counts.
function NoMovements() {
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

// docs/ui/v8-04: an account's payments that repeat, in the last month with
// movements of a quarter or one of its months, beside how we found them.
// The account and the period live in the URL.
export default async function RecurringPage({
  searchParams,
}: PageProps<"/recurring">) {
  const clerkUserId = await requireSignedIn();
  const { account, period } = accountPeriodSearchSchema.parse(
    await searchParams,
  );
  const recurring = await getRecurringPayments(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  if (!recurring) return <NoMovements />;
  const { month, payments } = recurring;
  const hasPayments = payments.spending.length > 0 || payments.moved.length > 0;
  return (
    <>
      <PageHeader title={COPY.title} subtitle={pageSubtitle(payments)} />
      <PeriodControls choices={recurring} hrefOf={recurringHref} />
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {month !== undefined && hasPayments ? (
          <RecurringList payments={payments} month={month} />
        ) : (
          <EmptyState
            title={RECURRING_COPY.noneTitle}
            description={RECURRING_COPY.noneDescription}
            action={<UploadStatementLink />}
          />
        )}
        <HowWeFindThem />
      </div>
    </>
  );
}
