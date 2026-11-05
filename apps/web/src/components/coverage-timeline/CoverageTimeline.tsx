import { cn } from "@/utils/cn.utils";
import { STATUS_CLASSES } from "./coverage-timeline.constants";
import type { CoverageSegment } from "./coverage-timeline.types";

type CoverageTimelineProps = {
  segments: readonly CoverageSegment[];
  /** The sentence that names it, when it doesn't show beside it. */
  label?: string;
};

/**
 * An account's months (docs/ui/v8-07, v8-08, v8-11): a segment each, the
 * months movements files brought too underlined, and the month's short
 * name. One image named by its sentence, or hidden when the sentence shows.
 */
export function CoverageTimeline({ segments, label }: CoverageTimelineProps) {
  return (
    <div
      {...(label === undefined
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": label })}
      className="flex gap-1.5"
    >
      {segments.map(({ month, label: name, status, isAlsoInMovements }) => (
        <div
          key={`${month.year}-${month.month}`}
          className="flex min-w-0 flex-1 flex-col items-center gap-1"
        >
          <span
            className={cn("h-2 w-full rounded-full", STATUS_CLASSES[status])}
          />
          <span
            className={cn(
              "h-1 w-full rounded-full",
              isAlsoInMovements ? "bg-moved" : "bg-transparent",
            )}
          />
          <span className="text-[11px] leading-[1.45] text-ink-muted sm:text-meta">
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
