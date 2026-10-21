import type { CategoryId } from "@xtrakto/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { PeriodControls } from "@/components/period-controls/PeriodControls";
import {
  categoryMovements,
  spendingCategoryOf,
} from "@/features/categories/category-detail.helpers";
import { getCategoryDetail } from "@/features/categories/category-detail.service";
import { CategoryMovements } from "@/features/categories/components/CategoryMovements";
import { CategorySettings } from "@/features/categories/components/CategorySettings";
import { CategoryTiles } from "@/features/categories/components/CategoryTiles";
import { CategoryTitle } from "@/features/categories/components/CategoryTitle";
import { TopPlaces } from "@/features/categories/components/TopPlaces";
import { WeeklyChart } from "@/features/categories/components/WeeklyChart";
import { requireSignedIn } from "@/lib/auth";
import { accountPeriodSearchSchema } from "@/utils/account-period.schemas";
import { categoryLabel } from "@/utils/category-label.helpers";
import { categoryHref } from "@/utils/transactions-url.helpers";

const COPY = PAGE_COPY.categories;

export async function generateMetadata({
  params,
}: PageProps<"/categories/[category]">): Promise<Metadata> {
  const categoryId = spendingCategoryOf((await params).category);
  return {
    title: categoryId === undefined ? COPY.title : categoryLabel(categoryId),
  };
}

// Before any movement counts, the invitation to upload, under the
// category's name.
function NoMovementsYet({ categoryId }: { categoryId: CategoryId }) {
  return (
    <>
      <PageHeader title={categoryLabel(categoryId)} />
      <EmptyState
        title={COPY.emptyTitle}
        description={COPY.emptyDescription}
        action={<UploadStatementLink />}
      />
    </>
  );
}

// docs/ui/v8-06: a category of real spending in an account's quarter or
// one of its months: what it took, week by week and where, its newest
// movements and what it counts as. The account and the period live in the
// URL; any other category is not found.
export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categories/[category]">) {
  const clerkUserId = await requireSignedIn();
  const categoryId = spendingCategoryOf((await params).category);
  if (categoryId === undefined) notFound();
  const { account, period } = accountPeriodSearchSchema.parse(
    await searchParams,
  );
  const detail = await getCategoryDetail(clerkUserId, categoryId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  if (!detail) return <NoMovementsYet categoryId={categoryId} />;
  return (
    <>
      <CategoryTitle detail={detail} />
      <PeriodControls
        choices={detail}
        hrefOf={(link) => categoryHref({ ...link, categoryId })}
      />
      <CategoryTiles detail={detail} />
      {categoryMovements(detail).length > 0 && (
        <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <WeeklyChart detail={detail} />
          <TopPlaces detail={detail} />
        </div>
      )}
      <div className="grid w-full items-start gap-5.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CategoryMovements detail={detail} />
        <CategorySettings detail={detail} />
      </div>
    </>
  );
}
