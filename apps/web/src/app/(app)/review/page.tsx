import type { Metadata } from "next";
import { EmptyState } from "@/components/empty-state/EmptyState";
import { UploadStatementLink } from "@/components/empty-state/UploadStatementLink";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { AnsweredGroup } from "@/features/review/components/AnsweredGroup";
import { NothingToReview } from "@/features/review/components/NothingToReview";
import { NumbersCard } from "@/features/review/components/NumbersCard";
import { ReviewGroupCard } from "@/features/review/components/ReviewGroupCard";
import { ReviewGroupItem } from "@/features/review/components/ReviewGroupItem";
import { StakesPanel } from "@/features/review/components/StakesPanel";
import { reviewStatus } from "@/features/review/review-display.helpers";
import { REVIEW_COPY as COPY } from "@/features/review/review.constants";
import { reviewGroupById, scopeText } from "@/features/review/review.helpers";
import { reviewSearchSchema } from "@/features/review/review.schemas";
import { getReview } from "@/features/review/review.service";
import type {
  GroupMovements,
  Review,
  ReviewGroup,
} from "@/features/review/review.types";
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

// A group in its place: open while it asks, closed once answered, and open
// again with "Cambiar". Both are the same item, so it keeps the focus.
function GroupItem({
  group,
  review: { account, period },
}: {
  group: ReviewGroup;
  review: Review;
}) {
  // The Nequi numbers are asked number by number.
  const Card = reviewGroupById(group.id).asksByNumber
    ? NumbersCard
    : ReviewGroupCard;
  const card = (movements: GroupMovements, isChange: boolean) => (
    <Card
      id={group.id}
      movements={movements}
      accountId={account.id}
      period={period}
      isChange={isChange}
    />
  );
  return group.pending === null ? (
    <ReviewGroupItem
      isAnswered
      open={card(group.answered, true)}
      closed={<AnsweredGroup id={group.id} answered={group.answered} />}
    />
  ) : (
    <ReviewGroupItem
      isAnswered={false}
      open={card(group.pending, false)}
      closed={null}
    />
  );
}

// Every group in the review's order.
function ReviewGroups({ review }: { review: Review }) {
  return (
    <ul
      aria-label={COPY.groupsLabel}
      className="flex min-w-0 flex-[2_1_600px] flex-col gap-4"
    >
      {review.groups.map((group) => (
        <li key={group.id}>
          <GroupItem group={group} review={review} />
        </li>
      ))}
    </ul>
  );
}

// docs/ui/v8-02: what waits for review in an account's quarter, asked by
// group, the best guess first, and what was answered, with what's at stake
// beside it (under it on phones). The account and the quarter live in the
// URL, as in Movimientos.
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
      <div className="flex w-full flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <PageHeader title={COPY.title} subtitle={COPY.subtitle} />
          <p className="text-sm font-semibold text-ink-secondary">
            {scopeText(review)}
          </p>
        </div>
        {review.groups.length > 0 && (
          <StatusPill
            {...reviewStatus(review.groups)}
            className="max-sm:w-full"
          />
        )}
      </div>
      {review.groups.length === 0 ? (
        <NothingToReview account={review.account} period={review.period} />
      ) : (
        <div className="flex w-full flex-wrap items-start gap-5.5">
          <ReviewGroups review={review} />
          <StakesPanel review={review} />
        </div>
      )}
    </>
  );
}
