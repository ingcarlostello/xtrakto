import type { KindTotals } from "@xtrakto/core";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { KIND_ICONS, TONE_CLASSES } from "../category-icons.constants";
import { kindTiles } from "../kind-view.helpers";
import { TRANSACTIONS_COPY } from "../transaction.constants";
import type { KindTile } from "../transaction.types";

// A kind's icon chip, label, total in its text color, and count (§9).
function KindTileCard({ tone, label, totals, detail }: KindTile) {
  const Icon = KIND_ICONS[tone];
  return (
    <Card className="h-full flex-row items-center gap-3.5">
      <span
        aria-hidden
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          TONE_CLASSES[tone].chip,
        )}
      >
        <Icon strokeWidth={1.9} className="size-5" />
      </span>
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-bold">{label}</p>
        <p
          className={cn(
            "font-display text-amount-l font-medium tabular-nums",
            TONE_CLASSES[tone].amount,
          )}
        >
          {/* Each direction whole: a line breaks only between them. */}
          {totals.map((total, index) => (
            <span key={total} className="whitespace-nowrap">
              {index > 0 && " · "}
              {total}
            </span>
          ))}
        </p>
        <p className="text-meta text-ink-muted">{detail}</p>
      </div>
    </Card>
  );
}

/**
 * The period's totals by kind (docs/ui/v8-03): what came in, the real
 * spending, and what only moved, out and back, each with its count.
 */
export function KindTiles({ totals }: { totals: KindTotals }) {
  return (
    <ul
      aria-label={TRANSACTIONS_COPY.kinds.tilesLabel}
      className="grid w-full gap-3 sm:grid-cols-3"
    >
      {kindTiles(totals).map((tile) => (
        <li key={tile.tone}>
          <KindTileCard {...tile} />
        </li>
      ))}
    </ul>
  );
}
