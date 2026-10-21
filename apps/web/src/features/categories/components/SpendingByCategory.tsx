import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { ROW_LINK } from "@/components/movement-row/movement-row.constants";
import type { PeriodLink } from "@/components/period-controls/period-controls.types";
import { periodLinkOf } from "@/components/period-controls/period-options.helpers";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { categoryHref } from "@/utils/transactions-url.helpers";
import { spendingRows, spendingSubtitle } from "../categories.helpers";
import { CATEGORIES_COPY } from "../categories.constants";
import type { AccountCategories, SpendingRow } from "../categories.types";

const COPY = CATEGORIES_COPY.spending;

// A category: its chip, its name and what it took, its bar against the
// largest, and its share, count and channels. Its name opens its detail,
// in the same account and period (6.8b), and covers the whole row.
function Row({ row, link }: { row: SpendingRow; link: PeriodLink }) {
  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3.5 border-t border-divider py-3.5">
      <MovementIcon categoryId={row.categoryId} tone="neutral" />
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-body font-bold">
            <Link
              href={categoryHref({ ...link, categoryId: row.categoryId })}
              className={ROW_LINK}
            >
              {row.label}
            </Link>
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
        <p className="text-meta text-ink-muted">{row.note}</p>
      </div>
      <ChevronRight
        aria-hidden
        strokeWidth={2}
        className="size-4 text-ink-muted"
      />
    </li>
  );
}

/**
 * "Tu gasto real por categoría" (docs/ui/v8-05): the period's real spending
 * by category, the largest first, each opening its detail.
 */
export function SpendingByCategory({
  categories,
}: {
  categories: AccountCategories;
}) {
  const rows = spendingRows(categories);
  const subtitle = spendingSubtitle(categories.period, categories.summary);
  const link = periodLinkOf(categories);
  return (
    <Card variant="card" className="w-full min-w-0 gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>
          {rows.length > 0 ? `${subtitle} ${COPY.touch}` : subtitle}
        </CardDescription>
      </CardHeader>
      {rows.length > 0 && (
        <ul aria-label={COPY.label}>
          {rows.map((row) => (
            <Row key={row.categoryId} row={row} link={link} />
          ))}
        </ul>
      )}
    </Card>
  );
}
