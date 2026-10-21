import type { CategoryId } from "@xtrakto/core";
import { CATEGORY_ICONS } from "@/components/movement-icon/category-icons.constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";

export type InsightTileProps = {
  /** Whose icon its chip shows. */
  readonly categoryId: CategoryId;
  /** "Créditos", "6 pagos sin tienda identificada". */
  readonly title: string;
  /** "$4,6M", "$19.760". */
  readonly amount: string;
  /** What the figure means, or what to do. */
  readonly note: string;
  /** On the attention surface, with a verb in its note. */
  readonly needsAttention: boolean;
};

/**
 * A category's chip, its title, what it took and what that means
 * (design-system.md §9 insight tile); one that needs a look sits on the
 * attention surface, its chip white with the orange dot.
 */
export function InsightTile({
  categoryId,
  title,
  amount,
  note,
  needsAttention,
}: InsightTileProps) {
  const Icon = CATEGORY_ICONS[categoryId];
  return (
    <Card
      className={cn(
        "h-full gap-2 p-4",
        needsAttention && "bg-spending-surface",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "relative flex size-11 items-center justify-center rounded-full text-ink",
          needsAttention ? "bg-surface" : "bg-surface-muted",
        )}
      >
        <Icon strokeWidth={1.7} className="size-5" />
        {needsAttention && (
          <span className="absolute top-0.5 right-0.5 size-[9px] rounded-full bg-spending" />
        )}
      </span>
      <h3 className="text-sm font-bold">{title}</h3>
      <p className="font-display text-amount-l font-medium tabular-nums">
        {amount}
      </p>
      <p className="text-meta text-ink-muted">{note}</p>
    </Card>
  );
}
