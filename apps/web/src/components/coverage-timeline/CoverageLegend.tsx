import { cn } from "@/utils/cn.utils";
import {
  COVERAGE_COPY as COPY,
  STATUS_CLASSES,
} from "./coverage-timeline.constants";

const LEGEND = [
  { swatch: STATUS_CLASSES.verified, text: COPY.legend.verified },
  { swatch: "h-1 bg-moved", text: COPY.legend.alsoInMovements },
  { swatch: STATUS_CLASSES.unverified, text: COPY.legend.unverified },
  { swatch: STATUS_CLASSES.missing, text: COPY.legend.missing },
] as const;

/** What each month's color means, all four as v8 draws them. */
export function CoverageLegend() {
  return (
    <ul
      aria-label={COPY.legendLabel}
      className="flex flex-wrap gap-x-4 gap-y-1.5"
    >
      {LEGEND.map(({ swatch, text }) => (
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
