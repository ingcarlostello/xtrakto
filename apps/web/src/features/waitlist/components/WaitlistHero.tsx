import { cn } from "@/utils/cn.utils";
import { Card, CardTitle } from "@/components/ui/card";
import { LANDING_COPY, WAITLIST_COPY } from "../waitlist.constants";
import { WaitlistBadge } from "./WaitlistChrome";

const { title } = WAITLIST_COPY;
const GLANCE = LANDING_COPY.glance;

// Each figure in its kind's text tone (design-system.md §3.4).
const KIND_TEXT = {
  income: "text-income-text",
  spending: "text-spending-text",
  moved: "text-moved-text",
} as const;

/** The badge, the headline with its two kinds in their colors, the pitch. */
export function WaitlistHero({ className }: { className?: string }) {
  return (
    <div className={cn("grid content-start gap-5", className)}>
      <WaitlistBadge />
      <h1 className="font-display text-title font-semibold text-balance sm:text-landing">
        {title.before}
        <span className="text-spending-text">{title.spent}</span>
        {title.middle}
        <span className="text-moved-text">{title.moved}</span>
        {title.after}
      </h1>
      <p className="text-body text-ink-secondary sm:text-lg">
        {WAITLIST_COPY.subtitle}
      </p>
    </div>
  );
}

/** "Tu trimestre, de un vistazo": the design's example quarter, said to be one. */
export function QuarterGlance({ className }: { className?: string }) {
  return (
    <Card className={cn("bg-surface", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <CardTitle className="text-sm">{GLANCE.title}</CardTitle>
        <span className="text-meta text-ink-muted">{GLANCE.example}</span>
      </div>
      <div
        role="img"
        aria-label={GLANCE.bar}
        className="flex h-3 gap-0.5 overflow-hidden rounded-full"
      >
        <span className="w-[45%] bg-spending" />
        <span className="flex-1 bg-moved" />
      </div>
      <dl className="grid grid-cols-3 gap-3">
        {GLANCE.figures.map(({ kind, label, amount }) => (
          <div key={kind}>
            <dt className={cn("text-meta font-bold", KIND_TEXT[kind])}>
              {label}
            </dt>
            <dd
              className={cn(
                "font-display text-amount-l font-medium tabular-nums",
                KIND_TEXT[kind],
              )}
            >
              {amount}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
