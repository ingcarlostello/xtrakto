import type { PeriodSummary } from "@xtrakto/core";
import Link from "next/link";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { movedView } from "../categories.helpers";
import { CATEGORIES_COPY } from "../categories.constants";
import type { MovedLink, MovedRow } from "../categories.types";

const COPY = CATEGORIES_COPY.moved;

// Where money went, with its bar against the most; or what came back, and
// that it isn't income.
function Row({ row }: { row: MovedRow }) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-3.5 border-t border-divider py-3.5">
      <MovementIcon categoryId={row.categoryId} tone="moved" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-bold">{row.label}</h3>
          <p className="font-display text-base font-medium text-moved-text tabular-nums">
            {row.amount}
          </p>
        </div>
        {row.barPercent !== undefined && (
          <span aria-hidden className="h-2 rounded-full bg-ring-track">
            <span
              className="block h-full rounded-full bg-moved"
              style={{ width: `${row.barPercent}%` }}
            />
          </span>
        )}
        {row.note && <p className="text-meta text-ink-muted">{row.note}</p>}
        {row.links?.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="self-start text-sm font-semibold text-primary hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </li>
  );
}

/**
 * "Movido no es gasto" (docs/ui/v8-05): what went out to the user's own
 * investment, accounts and cards, the most first, and what came back; the
 * card payments' row with the way to each card they reached (12.3e).
 */
export function MovedNotSpending({
  summary,
  cardLinks,
}: {
  summary: PeriodSummary;
  cardLinks: readonly MovedLink[];
}) {
  const { subtitle, rows } = movedView(summary, cardLinks);
  return (
    <Card variant="card" className="gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      {rows.length > 0 && (
        <ul aria-label={COPY.title}>
          {rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </ul>
      )}
    </Card>
  );
}
