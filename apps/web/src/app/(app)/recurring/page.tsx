import type { LocalDate } from "@xtrakto/core";
import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import { ExampleBanner } from "@/features/example/components/ExampleBanner";
import { HowWeFindThem } from "@/features/recurring/components/HowWeFindThem";
import { PaymentsCalendar } from "@/features/recurring/components/PaymentsCalendar";
import { RecurringList } from "@/features/recurring/components/RecurringList";
import { RecurringTiles } from "@/features/recurring/components/RecurringTiles";
import { todayInBogota } from "@/features/recurring/recurring-calendar.service";
import {
  pageSubtitle,
  recurringHrefOf,
  viewOf,
} from "@/features/recurring/recurring-view.helpers";
import { RECURRING_COPY } from "@/features/recurring/recurring.constants";
import { recurringSearchSchema } from "@/features/recurring/recurring.schemas";
import { getRecurringPayments } from "@/features/recurring/recurring.service";
import type {
  AccountRecurring,
  RecurringView,
} from "@/features/recurring/recurring.types";
import { requireViewer } from "@/lib/example-mode";

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

// The list, or why there's none, beside this month's calendar and how we
// found them.
function RecurringColumns({
  recurring,
  view,
  today,
}: {
  recurring: AccountRecurring;
  view: RecurringView;
  today: LocalDate;
}) {
  const { month, payments, stopped } = recurring;
  const hasPayments =
    payments.spending.length + payments.moved.length + stopped.length > 0;
  return (
    <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      {month !== undefined && hasPayments ? (
        <RecurringList recurring={recurring} month={month} view={view} />
      ) : (
        <EmptyState
          title={RECURRING_COPY.noneTitle}
          description={RECURRING_COPY.noneDescription}
          action={<UploadStatementLink />}
        />
      )}
      <div className="flex min-w-0 flex-col gap-5.5">
        {month !== undefined && (
          <PaymentsCalendar
            spending={payments.spending}
            month={month}
            today={today}
          />
        )}
        <HowWeFindThem />
      </div>
    </div>
  );
}

// docs/ui/v8-04: an account's payments that repeat, in the last month with
// movements of a quarter or one of its months: what they take, the list of
// those it expects or of those that stopped, this month's calendar, and how
// we found them. The account, the period and the list live in the URL.
export default async function RecurringPage({
  searchParams,
}: PageProps<"/recurring">) {
  const { clerkUserId, isExample } = await requireViewer();
  const { account, period, filter } = recurringSearchSchema.parse(
    await searchParams,
  );
  const recurring = await getRecurringPayments(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  if (!recurring) return <NoMovements />;
  const view = viewOf(filter, recurring.stopped);
  return (
    <>
      {isExample && <ExampleBanner />}
      <PageHeader
        title={COPY.title}
        subtitle={pageSubtitle(recurring.payments)}
      />
      <PeriodControls choices={recurring} hrefOf={recurringHrefOf(view)} />
      <RecurringTiles spending={recurring.payments.spending} />
      <RecurringColumns
        recurring={recurring}
        view={view}
        today={todayInBogota()}
      />
    </>
  );
}
