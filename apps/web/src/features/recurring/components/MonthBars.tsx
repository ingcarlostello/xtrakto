import { cn } from "@/utils/cn.utils";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import type { MonthBar } from "../recurring.types";

// A month's track, filled to its share of the most, and its short name.
function Bar({ bar, isThin }: { bar: MonthBar; isThin: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-7 items-end overflow-hidden rounded-[4px] bg-surface-muted",
          isThin ? "w-2" : "w-3",
        )}
      >
        <div
          className={cn(
            "w-full rounded-[4px]",
            bar.isShown ? "bg-spending" : "bg-spending/40",
          )}
          style={{ height: `${bar.heightPercent}%` }}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          "h-[15px] text-[10px] text-ink-muted",
          isThin && "w-2 whitespace-nowrap",
        )}
      >
        {bar.label}
      </span>
    </div>
  );
}

/**
 * A payment's months as small bars, the page's month darker (docs/ui/v8-04),
 * from `lg`; a screen reader hears each month's amount. A year's (10.2c)
 * are thinner, from `xl`, where they leave room for the payment's words,
 * with each quarter's first month named, its name reaching over the next.
 */
export function MonthBars({ bars }: { bars: readonly MonthBar[] }) {
  const isYear = bars.length > 3;
  return (
    <div
      role="img"
      aria-label={`${COPY.barsLabel}: ${bars.map(({ text }) => text).join(", ")}`}
      className={cn(
        "hidden items-end",
        isYear ? "gap-1 xl:flex" : "gap-1.5 lg:flex",
      )}
    >
      {bars.map((bar) => (
        <Bar key={bar.key} bar={bar} isThin={isYear} />
      ))}
    </div>
  );
}
