import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { NothingToReview } from "@/features/review/components/NothingToReview";
import { ReviewGroupCard } from "@/features/review/components/ReviewGroupCard";
import { REVIEW_COPY as COPY } from "@/features/review/review.constants";
import { scopeText } from "@/features/review/review.helpers";
import { reviewSearchSchema } from "@/features/review/review.schemas";
import { getReview } from "@/features/review/review.service";
import { requireSignedIn } from "@/lib/auth";

export const metadata: Metadata = { title: COPY.pageTitle };

// Before any movement counts, there's nothing to ask.
function NoMovements() {
  return (
    <>
      <PageHeader title={COPY.title} />
      <EmptyState
        title={COPY.emptyTitle}
        description={COPY.emptyDescription}
        action={<UploadStatementLink />}
      />
    </>
  );
}

// docs/ui/v8-02: what waits for review in an account's quarter, asked by
// group, the best guess first. The account and the quarter live in the URL,
// as in Movimientos.
export default async function ReviewPage({
  searchParams,
}: PageProps<"/review">) {
  const clerkUserId = await requireSignedIn();
  const { account, period } = reviewSearchSchema.parse(await searchParams);
  const review = await getReview(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
  });
  if (!review) return <NoMovements />;
  return (
    <>
      <div className="flex flex-col gap-1">
        <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
        <p className="text-sm font-semibold text-ink-secondary">
          {scopeText(review)}
        </p>
      </div>
      {review.groups.length === 0 ? (
        <NothingToReview account={review.account} period={review.period} />
      ) : (
        <ul
          aria-label={COPY.groupsLabel}
          className="flex w-full max-w-4xl flex-col gap-4"
        >
          {review.groups.map((group) => (
            <li key={group.id}>
              <ReviewGroupCard
                group={group}
                accountId={review.account.id}
                period={review.period}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
