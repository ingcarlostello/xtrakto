import { Calendar } from "lucide-react";
import Link from "next/link";
import { CoverageTimeline } from "@/components/coverage-timeline/CoverageTimeline";
import { Button } from "@/components/ui/button";
import { missingMonthsView } from "../missing-months.helpers";
import type { AccountSummary } from "../summary.types";

/**
 * "Te falta abril a junio" (docs/ui/v8-13, design-system.md §9 missing
 * months): what the account misses, the files that bring it, its months as
 * its coverage timeline draws them, and the way to Subir, on the normal
 * surface under the review banner. Nothing when it misses none.
 */
export function MissingMonths({ summary }: { summary: AccountSummary }) {
  const view = missingMonthsView(summary);
  if (!view) return null;
  return (
    <section
      aria-labelledby="missing-months-title"
      className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg bg-card/88 p-5 shadow-card"
    >
      <div className="flex min-w-0 flex-[2_1_20rem] items-start gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink">
          <Calendar aria-hidden strokeWidth={1.7} className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="missing-months-title" className="text-body font-bold">
            {view.title}
          </h2>
          <p className="text-caption text-pretty text-ink-secondary">
            {view.text}
          </p>
        </div>
      </div>
      <div className="min-w-0 flex-[1_1_16rem]">
        <CoverageTimeline segments={view.segments} label={view.timelineLabel} />
      </div>
      <Button nativeButton={false} render={<Link href="/upload" />}>
        {view.action}
      </Button>
    </section>
  );
}
