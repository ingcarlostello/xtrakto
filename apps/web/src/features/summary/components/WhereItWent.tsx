import { InsightTile } from "@/components/insight-tile/InsightTile";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountSummary } from "../summary.types";
import { spendingTiles } from "../where-it-went.helpers";

const COPY = SUMMARY_COPY.where;

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
            <InsightTile {...tile} />
          </li>
        ))}
      </ul>
    </section>
  );
}
