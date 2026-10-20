import Link from "next/link";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { StatCard } from "@/components/stat-card/StatCard";
import { Button } from "@/components/ui/button";
import { glanceSubtitle, glanceTiles, glanceTitle } from "../glance.helpers";
import type { AccountSummary } from "../summary.types";

/**
 * "Tu trimestre de un vistazo" (docs/ui/v8-01): what went out, and that not
 * all of it was spending, over the three KPI tiles, each with the way to
 * its movements.
 */
export function GlanceSection({ summary }: { summary: AccountSummary }) {
  const tiles = glanceTiles(summary.summary, periodLinkOf(summary));
  return (
    <section aria-labelledby="glance" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="glance" className="text-section font-bold">
          {glanceTitle(summary.period)}
        </h2>
        <p className="text-caption text-ink-muted">
          {glanceSubtitle(summary.period, summary.summary)}
        </p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        {tiles.map((tile) => (
          <li key={tile.tone}>
            <StatCard
              tone={tile.tone}
              label={tile.label}
              percent={tile.percent}
              amount={tile.amount}
              note={tile.note}
              action={
                <Button
                  variant="link"
                  nativeButton={false}
                  render={<Link href={tile.action.href} />}
                >
                  {tile.action.label}
                </Button>
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
