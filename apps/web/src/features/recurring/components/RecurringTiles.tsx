import type { RecurringPayment } from "@xtrakto/core";
import { Calendar, Repeat } from "lucide-react";
import { CATEGORY_ICONS } from "@/components/movement-icon/category-icons.constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { recurringTiles } from "../recurring-view.helpers";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import type { RecurringTile } from "../recurring.types";

const TILE_ICONS = { monthly: Calendar, yearly: Repeat } as const;

// A tile's chip, label, figure and what it means (design-system.md §9); the
// payment that rose sits on the attention surface, with the orange dot.
function TileCard({ tile }: { tile: RecurringTile }) {
  const isRose = tile.kind === "rose";
  const Icon =
    tile.kind === "rose"
      ? CATEGORY_ICONS[tile.categoryId]
      : TILE_ICONS[tile.kind];
  return (
    <Card className={cn("h-full", isRose && "bg-spending-surface")}>
      <span
        aria-hidden
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full text-ink",
          isRose ? "bg-surface" : "bg-surface-muted",
        )}
      >
        <Icon strokeWidth={1.7} className="size-5" />
        {isRose && (
          <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
        )}
      </span>
      <p className="text-body font-bold">{tile.label}</p>
      <p className="font-display text-amount-xl font-medium tabular-nums">
        {tile.amount}
      </p>
      <p className="text-caption text-ink-muted">{tile.caption}</p>
    </Card>
  );
}

/**
 * What the fixed payments take, a month and a year, and the one that rose
 * the most (docs/ui/v8-04). Nothing without fixed payments.
 */
export function RecurringTiles({
  spending,
}: {
  spending: readonly RecurringPayment[];
}) {
  const tiles = recurringTiles(spending);
  if (tiles.length === 0) return null;
  return (
    <ul
      aria-label={COPY.tiles.label}
      className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4"
    >
      {tiles.map((tile) => (
        <li key={tile.kind}>
          <TileCard tile={tile} />
        </li>
      ))}
    </ul>
  );
}
