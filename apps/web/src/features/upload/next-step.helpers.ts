import { formatMonthRange, type Period } from "@xtrakto/core";
import { countText } from "@/utils/count-text.utils";
import {
  type MovementPeriod,
  periodDays,
  periodOfStatement,
  quarterOf,
  reviewHref,
  transactionsHref,
} from "@/utils/transactions-url.helpers";
import { NEXT_STEP_COPY as COPY } from "./upload-result.constants";
import { UPLOAD_COPY } from "./upload.constants";
import type { UploadJob } from "./upload.types";

/** The quarter of a statement's last day, which the quick review asks about. */
export const reviewQuarterOf = (period: Period): MovementPeriod => ({
  kind: "quarter",
  ...quarterOf(periodOfStatement(period)),
});

/** "Lo que sigue" (docs/ui/v8-08): what waits for the review, and the ways on. */
export type NextStepView = {
  /** "24 movimientos por revisar en jul–sep 2026". */
  readonly title: string;
  readonly reviewHref: ReturnType<typeof reviewHref>;
  readonly movementsHref: ReturnType<typeof transactionsHref>;
};

/**
 * What follows the files the screen sent: the quick review of the quarter
 * of the last one done whose quarter has movements waiting for it, and its
 * movements. `undefined` when nothing waits.
 */
export const nextStepOf = (
  jobs: readonly UploadJob[],
): NextStepView | undefined => {
  const outcome = jobs.findLast(
    (job) => (job.outcome?.toReview ?? 0) > 0,
  )?.outcome;
  if (!outcome?.toReview) return undefined;
  const quarter = reviewQuarterOf(outcome.period);
  return {
    title: `${countText(outcome.toReview, UPLOAD_COPY.movements)} ${COPY.toReviewIn} ${formatMonthRange(periodDays(quarter))}`,
    reviewHref: reviewHref({ accountId: outcome.accountId, period: quarter }),
    movementsHref: transactionsHref({
      accountId: outcome.accountId,
      period: periodOfStatement(outcome.period),
    }),
  };
};
