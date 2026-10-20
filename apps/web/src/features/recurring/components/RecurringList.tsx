import type { CalendarMonth, RecurringPayments } from "@xtrakto/core";
import { Card } from "@/components/ui/card";
import {
  listSubtitle,
  monthBars,
  monthTotal,
  rowView,
} from "../recurring-view.helpers";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import { RecurringRow } from "./RecurringRow";

type RecurringListProps = {
  payments: RecurringPayments;
  /** The period's last month with movements, which the rows show. */
  month: CalendarMonth;
};

// "Tus pagos fijos": the real spending that repeats, the largest first,
// with its months as bars, and what it added up to in the page's month.
function FixedPayments({ payments, month }: RecurringListProps) {
  const total = monthTotal(payments.spending, month);
  return (
    <section aria-labelledby="fixed-payments" className="flex flex-col">
      <div className="flex flex-col gap-0.5 pb-4">
        <h2 id="fixed-payments" className="text-section font-bold">
          {COPY.listTitle}
        </h2>
        <p className="text-caption text-ink-muted">{listSubtitle(month)}</p>
      </div>
      <ul>
        {payments.spending.map((payment) => {
          const row = rowView(payment, month);
          return (
            <RecurringRow
              key={row.key}
              row={row}
              tone="spending"
              bars={monthBars(payment, month)}
            />
          );
        })}
      </ul>
      <div className="flex items-baseline justify-between gap-4 border-t border-divider pt-4">
        <p className="text-body font-bold">{total.label}</p>
        <p className="font-display text-amount-l font-medium text-spending-text tabular-nums">
          {total.amount}
        </p>
      </div>
    </section>
  );
}

// "También se repiten, pero no son gasto": card payments and savings.
function MovedPayments({ payments, month }: RecurringListProps) {
  return (
    <section aria-labelledby="moved-payments" className="flex flex-col">
      <div className="flex flex-col gap-0.5 pb-4">
        <h2 id="moved-payments" className="text-section font-bold">
          {COPY.movedTitle}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.movedSubtitle}</p>
      </div>
      <ul>
        {payments.moved.map((payment) => {
          const row = rowView(payment, month);
          return <RecurringRow key={row.key} row={row} tone="moved" />;
        })}
      </ul>
    </section>
  );
}

/** The payments that repeat in the page's month (docs/ui/v8-04). */
export function RecurringList({ payments, month }: RecurringListProps) {
  return (
    <Card variant="card" className="w-full min-w-0 gap-8">
      {payments.spending.length > 0 && (
        <FixedPayments payments={payments} month={month} />
      )}
      {payments.moved.length > 0 && (
        <MovedPayments payments={payments} month={month} />
      )}
    </Card>
  );
}
