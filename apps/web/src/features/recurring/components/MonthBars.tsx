import { cn } from "@/utils/cn.utils";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import type { MonthBar } from "../recurring.types";

/**
 * A payment's three months as small bars, the page's month darker
 * (docs/ui/v8-04), from `lg`; a screen reader hears each month's amount.
 */
export function MonthBars({ bars }: { bars: readonly MonthBar[] }) {
  return (
    <div
      role="img"
      aria-label={`${COPY.barsLabel}: ${bars.map(({ text }) => text).join(", ")}`}
      className="hidden items-end gap-1.5 lg:flex"
    >
      {bars.map((bar) => (
        <div key={bar.key} className="flex flex-col items-center gap-1">
          <div className="flex h-7 w-3 items-end overflow-hidden rounded-[4px] bg-surface-muted">
            <div
              className={cn(
                "w-full rounded-[4px]",
                bar.isShown ? "bg-spending" : "bg-spending/40",
              )}
              style={{ height: `${bar.heightPercent}%` }}
            />
          </div>
          <span aria-hidden className="text-[10px] text-ink-muted">
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}
