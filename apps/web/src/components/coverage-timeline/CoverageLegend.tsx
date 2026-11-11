import { cn } from "@/utils/cn.utils";
import {
  COVERAGE_COPY as COPY,
  STATUS_CLASSES,
} from "./coverage-timeline.constants";
import { verifiedLegend } from "./coverage-timeline.helpers";
import type { CoverageView } from "./coverage-timeline.types";

/**
 * What each month's color means, all four as v8 draws them; what verifies a
 * month, as the accounts shown have it (11.3c).
 */
export function CoverageLegend({
  views,
}: {
  views: readonly Pick<CoverageView, "isOtherBank">[];
}) {
  const legend = [
    { swatch: STATUS_CLASSES.verified, text: verifiedLegend(views) },
    { swatch: "h-1 bg-moved", text: COPY.legend.alsoInMovements },
    { swatch: STATUS_CLASSES.unverified, text: COPY.legend.unverified },
    { swatch: STATUS_CLASSES.missing, text: COPY.legend.missing },
  ];
  return (
    <ul
      aria-label={COPY.legendLabel}
      className="flex flex-wrap gap-x-4 gap-y-1.5"
    >
      {legend.map(({ swatch, text }) => (
        <li key={text} className="flex items-center gap-2">
          <span
            aria-hidden
            className={cn("h-1.5 w-3 shrink-0 rounded-full", swatch)}
          />
          <span className="text-meta text-ink-muted">{text}</span>
        </li>
      ))}
    </ul>
  );
}
