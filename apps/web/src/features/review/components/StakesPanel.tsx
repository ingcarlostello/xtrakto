import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  type StakesView,
  type StakeView,
  stakesView,
} from "../review-stakes.helpers";
import { REVIEW_COPY as COPY } from "../review.constants";
import type { Review } from "../review.types";

// How far the review went, "2 de 6 respondidos", the movements waiting, and
// a bar that only repeats it.
function Progress({ progress, waiting, answeredPercent }: StakesView) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <p className="text-sm font-bold">{progress}</p>
        {waiting !== null && (
          <p className="text-meta text-ink-muted">{waiting}</p>
        )}
      </div>
      <div
        aria-hidden
        className="h-2 overflow-hidden rounded-full bg-ring-track"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${answeredPercent}%` }}
        />
      </div>
    </div>
  );
}

// Each open group: its name and amount, then what it counts as today and
// what its other answer would change.
function OpenGroups({ groups }: { groups: readonly StakeView[] }) {
  return (
    <ul aria-label={COPY.openGroupsLabel} className="flex flex-col">
      {groups.map(({ id, name, amount, explanation }) => (
        <li
          key={id}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-t border-divider py-3.5"
        >
          <p className="text-sm font-bold">{name}</p>
          <p className="font-display text-base leading-[1.3] font-medium tabular-nums">
            {amount}
          </p>
          <p className="text-meta text-ink-muted">{explanation}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Lo que está en juego" beside the review's groups, under them on phones
 * (design-system.md §9, review group card): how far the review went, what
 * each open group puts at stake, and the way to the summary, now or later.
 */
export function StakesPanel({
  review,
}: {
  review: Pick<Review, "groups" | "totals">;
}) {
  const stakes = stakesView(review);
  const isOpen = stakes.groups.length > 0;
  return (
    <section
      aria-labelledby="stakes-title"
      className="flex min-w-0 flex-[1_1_340px] flex-col"
    >
      <Card variant="card" className="gap-5">
        <div className="flex flex-col gap-0.5">
          <h2 id="stakes-title" className="text-section font-bold text-balance">
            {COPY.stakesTitle}
          </h2>
          <p className="text-caption text-ink-muted">{stakes.subtitle}</p>
        </div>
        <Progress {...stakes} />
        {isOpen && <OpenGroups groups={stakes.groups} />}
        <div className="flex flex-wrap gap-3">
          <Button nativeButton={false} render={<Link href="/" />}>
            {COPY.toSummary}
          </Button>
          {isOpen && (
            <Button
              variant="secondary"
              nativeButton={false}
              render={<Link href="/" />}
            >
              {COPY.answerLater}
            </Button>
          )}
        </div>
        <p className="text-meta text-ink-muted">{COPY.remembered}</p>
      </Card>
    </section>
  );
}
