import "server-only";
import {
  DEFAULT_TIME_ZONE,
  findRecurringPayments,
  localDateFromInstant,
} from "@xtrakto/core";
import {
  type FinishedFiles,
  listIngestionJobResults,
  listMovementsOfStatements,
  listReviewMovements,
  listSummaryMovements,
  readNoticePreferences,
  type UserContext,
} from "@xtrakto/db";
import { historyOf } from "@/features/recurring/recurring.helpers";
import { pendingOf } from "@/features/review/review-display.helpers";
import { reviewGroupsOf } from "@/features/review/review.helpers";
import { reviewQuarterOf } from "@/features/upload/next-step.helpers";
import { SITE_URL } from "@/lib/site";
import {
  periodDays,
  recurringHref,
  reviewHref,
} from "@/utils/transactions-url.helpers";
import {
  countRisenBy,
  statementsBrought,
} from "./upload-notice-content.helpers";
import type { UploadEmailContent } from "./upload-notice-email.helpers";

type Brought = ReturnType<typeof statementsBrought>;

// Where a page's link leads, from the email.
const urlOf = ({
  pathname,
  query,
}: {
  readonly pathname: string;
  readonly query: Record<string, string>;
}): string => `${SITE_URL}${pathname}?${new URLSearchParams(query)}`;

// What waits for review in the latest quarter of the upload where something
// does, which the link opens, as "Lo que sigue" counts it (10.1b). One after
// the other: they share the transaction.
const reviewOf = async (
  ctx: UserContext,
  statements: Brought,
): Promise<UploadEmailContent["review"]> => {
  for (const { accountId, period } of statements) {
    const quarter = reviewQuarterOf(period);
    const movements = await listReviewMovements(ctx, {
      accountId,
      period: periodDays(quarter),
    });
    const pending = pendingOf(reviewGroupsOf(movements));
    if (pending.groups > 0)
      return {
        pending,
        url: urlOf(reviewHref({ accountId, period: quarter })),
      };
  }
  return undefined;
};

// The fixed payments the upload made rise, in its accounts, among those of
// the year through today: a file of long ago tells nothing new. The link
// goes to the first account with one. One after the other, as above.
const risenOf = async (
  ctx: UserContext,
  statements: Brought,
): Promise<UploadEmailContent["risen"]> => {
  const brought = await listMovementsOfStatements(
    ctx,
    statements.map(({ id }) => id),
  );
  const today = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE);
  const period = historyOf({ from: today, to: today });
  let count = 0;
  let first: string | undefined;
  for (const accountId of new Set(statements.map((s) => s.accountId))) {
    const history = await listSummaryMovements(ctx, { accountId, period });
    const risen = countRisenBy(
      findRecurringPayments(history).spending,
      brought,
    );
    count += risen;
    if (risen > 0) first ??= accountId;
  }
  return first === undefined
    ? undefined
    : { count, url: urlOf(recurringHref({ accountId: first })) };
};

/**
 * What the email of an upload says, one part for each notice its person has
 * on: read when it's sent, in their context. Empty with nothing to say.
 */
export const readUploadNoticeContent = async (
  ctx: UserContext,
  { jobIds, files, failed, added }: FinishedFiles,
): Promise<UploadEmailContent> => {
  const notices = await readNoticePreferences(ctx);
  const statements = statementsBrought(
    await listIngestionJobResults(ctx, jobIds),
  );
  const review = notices.reviewWaiting
    ? await reviewOf(ctx, statements)
    : undefined;
  const risen = notices.fixedPaymentRose
    ? await risenOf(ctx, statements)
    : undefined;
  return {
    ...(notices.uploadReady ? { files: { files, failed, added } } : {}),
    ...(review ? { review } : {}),
    ...(risen ? { risen } : {}),
  };
};
