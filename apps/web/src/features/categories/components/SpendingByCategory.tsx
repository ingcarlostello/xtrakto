import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { spendingRows, spendingSubtitle } from "../categories.helpers";
import { CATEGORIES_COPY } from "../categories.constants";
import type { AccountCategories, SpendingRow } from "../categories.types";

const COPY = CATEGORIES_COPY.spending;

// A category: its chip, its name and what it took, its bar against the
// largest, and its share, count and channels.
function Row({ row }: { row: SpendingRow }) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 border-t border-divider py-3.5">
      <MovementIcon categoryId={row.categoryId} tone="neutral" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-bold">{row.label}</h3>
          <p className="font-display text-base font-medium tabular-nums">
            {row.amount}
          </p>
        </div>
        <span aria-hidden className="h-2 rounded-full bg-ring-track">
          <span
            className="block h-full rounded-full bg-linear-to-r from-spending/60 to-spending"
            style={{ width: `${row.barPercent}%` }}
          />
        </span>
        <p className="text-meta text-ink-muted">{row.note}</p>
      </div>
    </li>
  );
}

/**
 * "Tu gasto real por categoría" (docs/ui/v8-05): the period's real spending
 * by category, the largest first.
 */
export function SpendingByCategory({
  categories,
}: {
  categories: AccountCategories;
}) {
  const rows = spendingRows(categories);
  return (
    <Card variant="card" className="w-full min-w-0 gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>
          {spendingSubtitle(categories.period, categories.summary)}
        </CardDescription>
      </CardHeader>
      {rows.length > 0 && (
        <ul aria-label={COPY.label}>
          {rows.map((row) => (
            <Row key={row.categoryId} row={row} />
          ))}
        </ul>
      )}
    </Card>
  );
}
