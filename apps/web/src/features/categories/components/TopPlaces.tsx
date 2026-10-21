import { BANK_TEXT } from "@/components/movement-row/movement-row.constants";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { CATEGORIES_COPY } from "../categories.constants";
import type { CategoryDetail, PlaceRow } from "../categories.types";
import { placesView } from "../category-places.helpers";

const COPY = CATEGORIES_COPY.places;

// A place: who was paid, as the bank writes it, and what it took; its bar
// against the most, and how many movements and the ways the bank wrote it.
function Place({ row }: { row: PlaceRow }) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-divider py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className={`min-w-0 text-body font-bold ${BANK_TEXT}`}>
          {row.title}
        </h3>
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
      <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>{row.note}</p>
    </li>
  );
}

/**
 * "Dónde más" (docs/ui/v8-06): where the category's money went, however
 * the bank wrote each place, the most first, and how many more places
 * there are. Nothing when the category took nothing in the period.
 */
export function TopPlaces({ detail }: { detail: CategoryDetail }) {
  const view = placesView(detail);
  if (!view) return null;
  return (
    <Card variant="card" className="min-w-0 gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>{COPY.subtitle}</CardDescription>
      </CardHeader>
      <ul aria-label={COPY.title}>
        {view.rows.map((row) => (
          <Place key={row.key} row={row} />
        ))}
      </ul>
      {view.more && (
        <p className="border-t border-divider pt-3 text-meta text-ink-muted">
          {view.more}
        </p>
      )}
    </Card>
  );
}
