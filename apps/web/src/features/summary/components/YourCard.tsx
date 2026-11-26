import { StatementIllustration } from "@/components/empty-state/StatementIllustration";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Card } from "@/components/ui/card";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountSummary, YourCardView } from "../summary.types";
import { yourCardView } from "../your-card.helpers";

const COPY = SUMMARY_COPY.card;

// Figures, each in its small box, two to a row.
function Boxes({ figures }: { figures: YourCardView["figures"] }) {
  if (figures.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2">
      {figures.map(({ label, value }) => (
        <div key={label} className="rounded-sm bg-surface px-3 py-2.5">
          <dt className="text-meta text-ink-muted">{label}</dt>
          <dd className="font-display text-base font-medium tabular-nums">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// "Fecha límite de pago: 4 de octubre" over the minimum and the total.
function Due({ due }: Pick<YourCardView, "due">) {
  if (!due) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-ink-secondary">{due.label}</p>
      <Boxes figures={due.payments} />
    </div>
  );
}

/**
 * "Tu tarjeta" (12.3c, design-system.md §9 account card), in "Tu cuenta"'s
 * place: the debt on the day its latest statement was cut, the card, what's
 * due and by when, its limit and what's available, and the status pill,
 * beside the statement illustration from `sm`.
 */
export function YourCard({ summary }: { summary: AccountSummary }) {
  const view = yourCardView(summary);
  return (
    <section aria-labelledby="your-card" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="your-card" className="text-section font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.subtitle}</p>
      </div>
      <Card variant="panel" className="flex-row items-start gap-4 p-5.5">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {view.debt && (
            <div className="flex flex-col">
              <p className="text-caption text-ink-muted">{view.debt.label}</p>
              <p className="font-display text-amount-xl font-medium tabular-nums">
                {view.debt.amount}
              </p>
            </div>
          )}
          <p className="text-sm text-ink-secondary">{view.account}</p>
          <Due due={view.due} />
          <Boxes figures={view.figures} />
          <StatusPill {...view.status} />
        </div>
        <StatementIllustration className="hidden w-24 shrink-0 sm:block" />
      </Card>
    </section>
  );
}
