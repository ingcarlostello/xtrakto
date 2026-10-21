import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { InsightTile } from "@/components/insight-tile/InsightTile";
import { KindLegend } from "@/components/kind-legend/KindLegend";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import { gatewaysTile } from "@/features/categories/categories.helpers";
import { getCategories } from "@/features/categories/categories.service";
import { MovedNotSpending } from "@/features/categories/components/MovedNotSpending";
import { SpendingByCategory } from "@/features/categories/components/SpendingByCategory";
import { YourRules } from "@/features/categories/components/YourRules";
import { requireSignedIn } from "@/lib/auth";
import { accountPeriodSearchSchema } from "@/utils/account-period.schemas";
import { categoriesHref } from "@/utils/transactions-url.helpers";

const COPY = PAGE_COPY.categories;

export const metadata: Metadata = { title: COPY.title };

// docs/ui/v8-05: an account's real spending by category in a quarter or one
// of its months, beside where the rest only moved, the payments through
// gateways to name, and the user's rules. The account and the period live
// in the URL.
export default async function CategoriesPage({
  searchParams,
}: PageProps<"/categories">) {
  const clerkUserId = await requireSignedIn();
  const { account, period } = accountPeriodSearchSchema.parse(
    await searchParams,
  );
  const categories = await getCategories(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  const header = <PageHeader title={COPY.title} subtitle={COPY.subtitle} />;
  if (!categories)
    return (
      <>
        {header}
        <EmptyState
          title={COPY.emptyTitle}
          description={COPY.emptyDescription}
          action={<UploadStatementLink />}
        />
      </>
    );
  const gateways = gatewaysTile(categories.movements);
  return (
    <>
      {header}
      <KindLegend />
      <PeriodControls choices={categories} hrefOf={categoriesHref} />
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <SpendingByCategory categories={categories} />
        <div className="flex min-w-0 flex-col gap-5.5">
          <MovedNotSpending summary={categories.summary} />
          {gateways && <InsightTile {...gateways} />}
          <YourRules rules={categories.rules} />
        </div>
      </div>
    </>
  );
}
