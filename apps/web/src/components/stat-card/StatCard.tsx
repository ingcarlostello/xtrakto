import type { ReactNode } from "react";
import {
  KIND_ICONS,
  TONE_CLASSES,
} from "@/components/movement-icon/category-icons.constants";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { ProgressRing } from "./ProgressRing";

type StatCardProps = {
  tone: keyof typeof KIND_ICONS;
  /** "Gasto real". */
  label: string;
  /** Its ring. */
  percent: number;
  /** "$24,4M". */
  amount: string;
  /** What the figure means, in one sentence. */
  note: string;
  /** The link that names where it leads: "Ver en qué gastaste". */
  action?: ReactNode;
};

/**
 * A KPI tile (design-system.md §9, stat card): its kind's chip and label
 * with its ring, its figure, what it means, and where to see more.
 */
export function StatCard({
  tone,
  label,
  percent,
  amount,
  note,
  action,
}: StatCardProps) {
  const Icon = KIND_ICONS[tone];
  return (
    <Card className="h-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "flex size-9.5 shrink-0 items-center justify-center rounded-full",
              TONE_CLASSES[tone].chip,
            )}
          >
            <Icon strokeWidth={1.9} className="size-5" />
          </span>
          <h3 className="text-body font-bold">{label}</h3>
        </div>
        <ProgressRing percent={percent} tone={tone} />
      </div>
      <p className="font-display text-amount-xl font-medium tabular-nums">
        {amount}
      </p>
      <p className="text-caption text-ink-muted">{note}</p>
      {action && <div className="mt-auto">{action}</div>}
    </Card>
  );
}
