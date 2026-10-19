import { ReviewBanner } from "@/components/review-banner/ReviewBanner";
import { reviewHref } from "@/utils/transactions-url.helpers";
import { bannerTitle, pendingOf } from "../review-display.helpers";
import { REVIEW_COPY } from "../review.constants";
import { getReview } from "../review.service";

/**
 * The summary's banner while groups of the quick review wait (v8-01), for
 * the account and quarter the review opens on: what waits, and the way
 * there. Nothing once every group is answered.
 */
export async function PendingReviewBanner({
  clerkUserId,
}: {
  clerkUserId: string;
}) {
  const review = await getReview(clerkUserId, {});
  if (!review) return null;
  const pending = pendingOf(review.groups);
  if (pending.groups === 0) return null;
  return (
    <ReviewBanner
      title={bannerTitle(pending)}
      description={REVIEW_COPY.bannerText}
      action={REVIEW_COPY.bannerAction}
      href={reviewHref({ accountId: review.account.id, period: review.period })}
    />
  );
}
