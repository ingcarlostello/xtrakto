import { CURRENCY, formatSignedAmount } from "@xtrakto/core";
import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { Card } from "@/components/ui/card";
import { countText } from "@/utils/count-text.utils";
import {
  type MovementPeriod,
  periodParam,
} from "@/utils/transactions-url.helpers";
import { REVIEW_ANSWERS, REVIEW_COPY } from "../review.constants";
import { answersToOffer, reviewGroupById } from "../review.helpers";
import type { GroupMovements, ReviewGroupId } from "../review.types";
import { AnswerForm } from "./AnswerForm";

type ReviewGroupCardProps = {
  id: ReviewGroupId;
  /** What it asks about: what waits, or, asked again, what was answered. */
  movements: GroupMovements;
  accountId: string;
  period: MovementPeriod;
  /** Asked again with "Cambiar": the answer given can stay as it is. */
  isChange?: boolean;
};

// The neutral chip, the question and its context, and the amount at stake,
// which moves under the question on phones. The question takes the focus
// when "Cambiar" asks again.
function GroupHeading({
  id,
  movements,
}: Pick<ReviewGroupCardProps, "id" | "movements">) {
  const { icon: Icon, question, context } = reviewGroupById(id);
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3.5 gap-y-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
      >
        <Icon strokeWidth={1.7} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2
          tabIndex={-1}
          data-review-focus=""
          className="text-base font-bold text-balance"
        >
          {question}
        </h2>
        <p className="text-caption text-ink-muted">{context}</p>
      </div>
      <div className="col-start-2 sm:col-start-3 sm:text-right">
        <p className="font-display text-base leading-[1.3] font-medium tabular-nums">
          {formatSignedAmount(movements.amountMinor, CURRENCY.COP)}
        </p>
        <p className="text-meta text-ink-muted">
          {countText(movements.count, REVIEW_COPY.movements)}
        </p>
      </div>
    </div>
  );
}

/**
 * A question of the quick review (design-system.md §9, review group card):
 * the movements it asks about, the bank's texts and the answers.
 */
export function ReviewGroupCard({
  id,
  movements,
  accountId,
  period,
  isChange = false,
}: ReviewGroupCardProps) {
  return (
    <Card variant="card">
      <GroupHeading id={id} movements={movements} />
      <ul aria-label={REVIEW_COPY.textsLabel} className="flex flex-wrap gap-2">
        {movements.texts.map(({ text, count }) => (
          <li key={text} className="max-w-full">
            <RawTextChip text={text} count={count} />
          </li>
        ))}
      </ul>
      <AnswerForm
        group={id}
        answers={answersToOffer(id, { isChange }).map((answer) => ({
          id: answer,
          label: REVIEW_ANSWERS[answer].label,
        }))}
        accountId={accountId}
        period={periodParam(period)}
        canKeep={isChange}
      />
    </Card>
  );
}
