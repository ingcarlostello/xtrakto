import type { TransactionListItem } from "@xtrakto/db";
import { cn } from "@/utils/cn.utils";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  groupByDay,
} from "../transaction-list.helpers";
import {
  MOVEMENT_ROW_ATTRIBUTE,
  TRANSACTIONS_COPY as COPY,
} from "../transaction.constants";
import type { MovementMark, TransactionDay } from "../transaction.types";

// The bank's text exactly as printed: its case, its cuts and its double
// spaces (design-system.md §4), wrapping only where it has a space.
const BANK_TEXT = "tracking-[0.02em] break-words whitespace-pre-wrap";

function Description({ raw }: { raw: string }) {
  const view = descriptionView(raw);
  if (view.kind === "bank")
    return (
      <p className={`text-body font-semibold ${BANK_TEXT}`}>{view.text}</p>
    );
  return (
    <>
      <p className="text-body font-bold">{COPY.noDescription}</p>
      <p className={`text-meta text-ink-muted ${BANK_TEXT}`}>{view.raw}</p>
    </>
  );
}

type ItemProps = { item: TransactionListItem; mark?: MovementMark };

// No kind color or category yet: those come with Stage 6, so the amount
// stays in ink with its sign (design-system.md §3.4). A marked row, where a
// statement's balance breaks, sits on the attention surface with why.
function TransactionItem({ item, mark }: ItemProps) {
  return (
    <li
      {...{ [MOVEMENT_ROW_ATTRIBUTE]: "" }}
      id={mark?.anchor}
      className={cn(
        "grid scroll-mt-6 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-t border-divider py-3.5",
        mark && "-mx-3.5 rounded-md border-t-0 bg-spending-surface px-3.5",
      )}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Description raw={item.descriptionRaw} />
        {mark && (
          <p className="flex items-start gap-2 pt-1 text-caption text-ink-secondary">
            <span
              aria-hidden
              className="mt-1.5 size-[9px] shrink-0 rounded-full bg-spending"
            />
            {mark.note}
          </p>
        )}
      </div>
      <p className="text-right font-display text-base leading-[1.3] font-medium tabular-nums sm:min-w-32">
        {amountText(item.amountMinor)}
      </p>
    </li>
  );
}

type DayGroupProps = {
  day: TransactionDay;
  currentYear: string;
  marks?: ReadonlyMap<string, MovementMark>;
};

function DayGroup({ day, currentYear, marks }: DayGroupProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 pt-4 pb-2">
        <h3 className="text-sm font-bold">
          {dayHeading(day.date, currentYear)}
        </h3>
        {day.balanceMinor !== null && (
          <p className="text-caption text-ink-muted tabular-nums">
            {dayBalanceText(day.balanceMinor)}
          </p>
        )}
      </div>
      <ul>
        {day.items.map((item) => (
          <TransactionItem
            key={item.id}
            item={item}
            mark={marks?.get(item.id)}
          />
        ))}
      </ul>
    </div>
  );
}

type MovementDaysProps = Omit<DayGroupProps, "day"> & {
  items: readonly TransactionListItem[];
};

/** Movements by day, newest first, each day with its balance when printed. */
export function MovementDays({ items, ...rest }: MovementDaysProps) {
  return groupByDay(items).map((day) => (
    <DayGroup key={day.date} day={day} {...rest} />
  ));
}
