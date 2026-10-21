import { CATEGORY_ICONS } from "@/components/movement-icon/category-icons.constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountSummary, SpendingTile } from "../summary.types";
import { spendingTiles } from "../where-it-went.helpers";

const COPY = SUMMARY_COPY.where;

// A category's chip, its title, what it took and what that means
// (design-system.md §9 insight tile); one that needs a look sits on the
// attention surface, its chip white with the orange dot.
function InsightTile({ tile }: { tile: SpendingTile }) {
  const Icon = CATEGORY_ICONS[tile.categoryId];
  return (
    <Card
      className={cn(
        "h-full gap-2 p-4",
        tile.needsAttention && "bg-spending-surface",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full text-ink",
          tile.needsAttention ? "bg-surface" : "bg-surface-muted",
        )}
      >
        <Icon strokeWidth={1.7} className="size-5" />
        {tile.needsAttention && (
          <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
        )}
      </span>
      <h3 className="text-sm font-bold">{tile.title}</h3>
      <p className="font-display text-amount-l font-medium tabular-nums">
        {tile.amount}
      </p>
      <p className="text-meta text-ink-muted">{tile.note}</p>
    </Card>
  );
}

/**
 * "Dónde se fue más" (docs/ui/v8-01): the categories that weigh most in
 * real spending, two by two, and the bank's costs to check when it charged
 * the 4x1000. Nothing without real spending.
 */
export function WhereItWent({ summary }: { summary: AccountSummary }) {
  const tiles = spendingTiles(summary);
  if (tiles.length === 0) return null;
  return (
    <section aria-labelledby="where" className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-0.5">
        <h2 id="where" className="text-section font-bold">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.subtitle}</p>
      </div>
      <ul className="grid grid-cols-2 gap-4">
        {tiles.map((tile) => (
          <li key={tile.categoryId}>
            <InsightTile tile={tile} />
          </li>
        ))}
      </ul>
    </section>
  );
}
