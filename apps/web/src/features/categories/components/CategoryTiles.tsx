import { Calendar, type LucideIcon, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { CATEGORIES_COPY } from "../categories.constants";
import type {
  CategoryDetail,
  CategoryFigure,
  MonthBox,
} from "../categories.types";
import { categoryTiles } from "../category-detail.helpers";

const COPY = CATEGORIES_COPY.detail;

function NeutralChip({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-ink"
    >
      <Icon strokeWidth={1.7} className="size-5" />
    </span>
  );
}

type FigureTileProps = {
  chip: ReactNode;
  figure: CategoryFigure;
  /** The total's in its kind's text color; the average's in ink. */
  amountClassName?: string;
};

// A tile's chip, label, figure and what it means (design-system.md §9).
function FigureTile({ chip, figure, amountClassName }: FigureTileProps) {
  return (
    <Card className="h-full">
      {chip}
      <p className="text-body font-bold">{figure.label}</p>
      <p
        className={cn(
          "font-display text-amount-xl font-medium tabular-nums",
          amountClassName,
        )}
      >
        {figure.amount}
      </p>
      <p className="text-caption text-ink-muted">{figure.note}</p>
    </Card>
  );
}

// "Por mes": what the category took each month, the most on the attention
// surface, which screen readers hear as words.
function MonthsTile({ months }: { months: readonly MonthBox[] }) {
  return (
    <Card className="h-full">
      <NeutralChip icon={Calendar} />
      <p className="text-body font-bold">{COPY.byMonth}</p>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-2">
        {months.map((month) => (
          <li
            key={month.key}
            className={cn(
              "flex flex-col gap-0.5 rounded-sm px-3 py-2.5",
              month.isMost ? "bg-spending-surface" : "bg-surface-muted",
            )}
          >
            <span className="text-meta text-ink-muted">{month.label}</span>
            <span className="text-body font-bold tabular-nums">
              {month.amount}
              {month.isMost && (
                <span className="sr-only">, {COPY.mostMonth}</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * What the category took in the period (docs/ui/v8-06): its total, its
 * average and largest movement, and each month of a quarter. Nothing when
 * it took nothing. The months go under the other two at full width until a
 * third of the row holds three boxes, from `xl`.
 */
export function CategoryTiles({ detail }: { detail: CategoryDetail }) {
  const tiles = categoryTiles(detail);
  if (!tiles) return null;
  const hasMonths = tiles.months.length > 0;
  return (
    <ul
      aria-label={COPY.tilesLabel}
      className={cn("grid gap-4 sm:grid-cols-2", hasMonths && "xl:grid-cols-3")}
    >
      <li>
        <FigureTile
          chip={<MovementIcon categoryId={detail.categoryId} tone="spending" />}
          figure={tiles.total}
          amountClassName={TONE_CLASSES.spending.amount}
        />
      </li>
      <li>
        <FigureTile chip={<NeutralChip icon={Tag} />} figure={tiles.average} />
      </li>
      {hasMonths && (
        <li className="sm:col-span-2 xl:col-span-1">
          <MonthsTile months={tiles.months} />
        </li>
      )}
    </ul>
  );
}
