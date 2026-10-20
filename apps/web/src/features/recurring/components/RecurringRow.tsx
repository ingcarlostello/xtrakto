import { Badge } from "@/components/ui/badge";
import { TONE_CLASSES } from "@/components/movement-icon/category-icons.constants";
import { MovementIcon } from "@/components/movement-icon/MovementIcon";
import { cn } from "@/utils/cn.utils";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import type { MonthBar, RecurringRowView } from "../recurring.types";
import { MonthBars } from "./MonthBars";

const BANK_TEXT = "tracking-[0.02em] break-words whitespace-pre-wrap";

// "Mensual · entre el 1 y el 4", then its channels and how its amount moves.
function Cadence({ row }: { row: RecurringRowView }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-caption text-ink-secondary">{row.cadence}</p>
      <div className="flex flex-wrap gap-1.5">
        {row.channels.map((channel) => (
          <Badge key={channel} variant="tag">
            <span className="sr-only">{COPY.channel} </span>
            {channel}
          </Badge>
        ))}
        <Badge variant={row.trend.variant}>{row.trend.label}</Badge>
        {row.hasSeveralChannels && (
          <Badge variant="info">{COPY.severalChannels}</Badge>
        )}
      </div>
    </div>
  );
}

// Who was paid, how the bank wrote it, and its installments.
function Names({ row }: { row: RecurringRowView }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <p className="text-body font-bold">{row.title}</p>
      <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>{row.bankText}</p>
      {row.alsoText && (
        <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>
          {row.alsoText}
        </p>
      )}
      {row.installmentsText && (
        <p className="text-meta text-ink-muted">{row.installmentsText}</p>
      )}
    </div>
  );
}

type RecurringRowProps = {
  row: RecurringRowView;
  /** Real spending, in its color with its months; or money that only moves. */
  tone: "spending" | "moved";
  bars?: readonly MonthBar[];
};

/**
 * A payment that repeats (docs/ui/v8-04): its category's chip, who was paid
 * and how the bank wrote it, its days, channels and trend, its months from
 * `lg`, and its amount. On phones the amount stays beside the name.
 */
export function RecurringRow({ row, tone, bars }: RecurringRowProps) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-2 border-t border-divider py-3.5 lg:grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_auto_8rem] lg:items-center">
      <div className="row-span-2 lg:row-span-1">
        <MovementIcon
          categoryId={row.categoryId}
          tone={tone === "spending" ? "neutral" : "moved"}
        />
      </div>
      <Names row={row} />
      <p
        className={cn(
          "col-start-3 row-start-1 max-w-32 text-right font-display text-base leading-[1.3] font-medium tabular-nums lg:col-start-5 lg:max-w-none",
          TONE_CLASSES[tone].amount,
        )}
      >
        {row.amount}
      </p>
      <div className="col-span-2 col-start-2 lg:col-span-1 lg:col-start-3 lg:row-start-1">
        <Cadence row={row} />
      </div>
      {bars && (
        <div className="hidden lg:col-start-4 lg:row-start-1 lg:block">
          <MonthBars bars={bars} />
        </div>
      )}
    </li>
  );
}
