import type { CategoryId } from "@xtrakto/core";
import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import {
  BANK_TEXT,
  ROW_LINK,
} from "@/components/movement-row/movement-row.constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { CATEGORIES_COPY } from "../categories.constants";
import type { CategoryDetail, LatestRow } from "../categories.types";
import {
  latestFooter,
  latestRows,
  latestSubtitle,
} from "../category-detail.helpers";

const COPY = CATEGORIES_COPY.latest;

type RowProps = { row: LatestRow; categoryId: CategoryId };

// Its channel, and "Por revisar" while its category is only a guess
// (design-system.md §9). Screen readers hear what the channel is.
function LatestTags({ row }: { row: LatestRow }) {
  if (row.channel === undefined && !row.isPendingReview) return null;
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {row.channel !== undefined && (
        <Badge variant="tag">
          <span className="sr-only">{COPY.channel} </span>
          {row.channel}
        </Badge>
      )}
      {row.isPendingReview && (
        <Badge variant="review">
          <CircleAlert aria-hidden />
          {COPY.pendingReview}
        </Badge>
      )}
    </div>
  );
}

// As Movimientos shows a movement (design-system.md §9): the bank's text,
// here over its day and its tags, and its amount; neutral and in ink while
// its category is a guess. The text opens its detail in Movimientos.
function LatestItem({ row, categoryId }: RowProps) {
  const tone = row.isPendingReview ? "neutral" : "spending";
  return (
    <li className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 border-t border-divider py-3.5">
      <MovementIcon categoryId={categoryId} tone={tone} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <p
          className={cn(
            "text-body",
            row.hasDescription ? `font-semibold ${BANK_TEXT}` : "font-bold",
          )}
        >
          <Link href={row.href} className={ROW_LINK}>
            {row.title}
          </Link>
        </p>
        <p className="text-caption text-ink-muted">{row.date}</p>
        <LatestTags row={row} />
      </div>
      <p
        className={cn(
          "text-right font-display text-base leading-[1.3] font-medium tabular-nums sm:min-w-32",
          TONE_CLASSES[tone].amount,
        )}
      >
        {row.amount}
      </p>
    </li>
  );
}

/**
 * "Movimientos de esta categoría" (docs/ui/v8-06): its newest movements,
 * how many show, and the way to all of them in Movimientos; or that it took
 * nothing in the period.
 */
export function CategoryMovements({ detail }: { detail: CategoryDetail }) {
  const rows = latestRows(detail);
  const footer = latestFooter(detail);
  return (
    <Card variant="card" className="w-full min-w-0 gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
        <CardDescription>{latestSubtitle(detail)}</CardDescription>
      </CardHeader>
      {rows.length > 0 && (
        <ul aria-label={COPY.title}>
          {rows.map((row) => (
            <LatestItem key={row.id} row={row} categoryId={detail.categoryId} />
          ))}
        </ul>
      )}
      {footer && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-t border-divider pt-1">
          <p className="text-meta text-ink-muted">{footer.status}</p>
          <Button
            variant="link"
            nativeButton={false}
            render={<Link href={footer.href} />}
          >
            {footer.label}
          </Button>
        </div>
      )}
    </Card>
  );
}
