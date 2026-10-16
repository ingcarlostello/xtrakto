import type { TransactionListItem } from "@xtrakto/db";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { accountLabel } from "@/utils/account-label.helpers";
import {
  amountText,
  dayBalanceText,
  dayHeading,
  descriptionView,
  groupByDay,
  nextStep,
  shownText,
} from "../transaction-list.helpers";
import {
  MOVEMENT_ROW_ATTRIBUTE,
  TRANSACTIONS_COPY as COPY,
} from "../transaction.constants";
import type { AccountTransactions, TransactionDay } from "../transaction.types";
import { ListFooter } from "./ListFooter";

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

// No kind color or category yet: those come with Stage 6, so the amount
// stays in ink with its sign (design-system.md §3.4).
function TransactionItem({ item }: { item: TransactionListItem }) {
  return (
    <li
      {...{ [MOVEMENT_ROW_ATTRIBUTE]: "" }}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 border-t border-divider py-3.5"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <Description raw={item.descriptionRaw} />
      </div>
      <p className="text-right font-display text-base leading-[1.3] font-medium tabular-nums sm:min-w-32">
        {amountText(item.amountMinor)}
      </p>
    </li>
  );
}

type DayGroupProps = { day: TransactionDay; currentYear: string };

function DayGroup({ day, currentYear }: DayGroupProps) {
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
          <TransactionItem key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

/** "Todos los movimientos": the account's movements by day (docs/ui/v8-03). */
export function TransactionList({
  transactions,
}: {
  transactions: AccountTransactions;
}) {
  const { account, total, items, currentYear } = transactions;
  return (
    <Card variant="card" className="w-full max-w-4xl gap-0">
      <CardHeader className="pb-2">
        <h2 className="text-section font-bold text-balance">
          {COPY.listTitle}
        </h2>
        <CardDescription>
          {accountLabel(account, account.last4)}. {COPY.listOrder}
        </CardDescription>
      </CardHeader>
      {groupByDay(items).map((day) => (
        <DayGroup key={day.date} day={day} currentYear={currentYear} />
      ))}
      <ListFooter
        shown={items.length}
        status={shownText(items.length, total)}
        next={nextStep(items.length, total)}
      />
    </Card>
  );
}
