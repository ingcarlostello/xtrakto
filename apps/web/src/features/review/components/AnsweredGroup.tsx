import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { answeredTitle, outcomeText } from "../review-display.helpers";
import { reviewGroupById } from "../review.helpers";
import type { AnsweredMovements, ReviewGroupId } from "../review.types";
import { ChangeAnswerButton } from "./ChangeAnswerButtons";

type AnsweredGroupProps = {
  id: ReviewGroupId;
  answered: AnsweredMovements;
};

/**
 * An answered group, closed in its place (design-system.md §9, review group
 * card): what it answered and what its movements count as now, with
 * "Cambiar". It takes the focus once answered, and reads as one group.
 */
export function AnsweredGroup({ id, answered }: AnsweredGroupProps) {
  const { name } = reviewGroupById(id);
  const titleId = `review-${id}-answered`;
  const outcomeId = `review-${id}-outcome`;
  return (
    <Card
      variant="card"
      role="group"
      aria-labelledby={titleId}
      aria-describedby={outcomeId}
      tabIndex={-1}
      data-review-focus=""
      className="p-5"
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-1 sm:grid-cols-[2.75rem_minmax(0,1fr)_auto]">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full bg-income-soft text-income-on-soft"
        >
          <Check strokeWidth={1.9} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={titleId} className="text-body font-bold whitespace-pre-wrap">
            {answeredTitle(name, answered)}
          </h2>
          <p id={outcomeId} className="text-caption text-ink-muted">
            {answered.outcomes.map(outcomeText).join(" ")}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <ChangeAnswerButton groupName={name} />
        </div>
      </div>
    </Card>
  );
}
