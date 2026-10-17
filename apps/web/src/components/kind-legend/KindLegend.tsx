import { cn } from "@/utils/cn.utils";
import { KIND_LEGEND, KIND_LEGEND_LABEL } from "./kind-legend.constants";

// Each kind's graphic color (design-system.md §3.4).
const DOT = {
  income: "bg-income",
  spending: "bg-spending",
  moved: "bg-moved",
} as const;

/**
 * "Ingresos: lo que entró de otros", and the other two kinds, each with its
 * 10px dot, right under the page title.
 */
export function KindLegend() {
  return (
    <ul
      aria-label={KIND_LEGEND_LABEL}
      className="flex flex-col gap-1 text-sm sm:flex-row sm:flex-wrap sm:gap-x-5"
    >
      {KIND_LEGEND.map(({ tone, label, meaning }) => (
        <li key={tone} className="flex items-baseline gap-2">
          <span
            aria-hidden
            className={cn("size-2.5 shrink-0 rounded-full", DOT[tone])}
          />
          <span className="text-ink-secondary">
            <strong className="font-bold text-ink">{label}:</strong> {meaning}
          </span>
        </li>
      ))}
    </ul>
  );
}
