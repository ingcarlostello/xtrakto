import { CURRENCY, formatSignedAmount } from "@xtrakto/core";
import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { Card } from "@/components/ui/card";
import { countText } from "@/utils/count-text.utils";
import {
  type MovementPeriod,
  periodParam,
} from "@/utils/transactions-url.helpers";
import { REVIEW_ANSWERS, REVIEW_COPY } from "../review.constants";
import { reviewGroupById } from "../review.helpers";
import type { ReviewGroup } from "../review.types";
import { AnswerForm } from "./AnswerForm";

type ReviewGroupCardProps = {
  group: ReviewGroup;
  accountId: string;
  period: MovementPeriod;
};

// The neutral chip, the question and its context, and the amount at stake,
// which moves under the question on phones.
function GroupHeading({ group }: { group: ReviewGroup }) {
  const { icon: Icon, question, context } = reviewGroupById(group.id);
  return (
    <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3.5 gap-y-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
      <span
        aria-hidden
        className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
      >
        <Icon strokeWidth={1.7} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-base font-bold text-balance">{question}</h2>
        <p className="text-caption text-ink-muted">{context}</p>
      </div>
      <div className="col-start-2 sm:col-start-3 sm:text-right">
        <p className="font-display text-base leading-[1.3] font-medium tabular-nums">
          {formatSignedAmount(group.amountMinor, CURRENCY.COP)}
        </p>
        <p className="text-meta text-ink-muted">
          {countText(group.count, REVIEW_COPY.movements)}
        </p>
      </div>
    </div>
  );
}

/**
 * An open question of the quick review (design-system.md §9, review group
 * card): the movements it asks about, the bank's texts and the answers.
 */
export function ReviewGroupCard({
  group,
  accountId,
  period,
}: ReviewGroupCardProps) {
  const { answers } = reviewGroupById(group.id);
  return (
    <Card variant="card">
      <GroupHeading group={group} />
      <ul aria-label={REVIEW_COPY.textsLabel} className="flex flex-wrap gap-2">
        {group.texts.map(({ text, count }) => (
          <li key={text} className="max-w-full">
            <RawTextChip text={text} count={count} />
          </li>
        ))}
      </ul>
      <AnswerForm
        group={group.id}
        answers={answers.map((id) => ({ id, label: REVIEW_ANSWERS[id].label }))}
        accountId={accountId}
        period={periodParam(period)}
      />
    </Card>
  );
}
