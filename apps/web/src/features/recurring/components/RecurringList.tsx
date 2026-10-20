import type { CalendarMonth, RecurringPayment } from "@xtrakto/core";
import { FilterChips } from "@/components/filter-chips/FilterChips";
import type { FilterChip } from "@/components/filter-chips/filter-chips.types";
import { Card } from "@/components/ui/card";
import {
  listFilters,
  listSubtitle,
  monthBars,
  monthTotal,
  noneText,
  rowView,
} from "../recurring-view.helpers";
import { RECURRING_COPY as COPY } from "../recurring.constants";
import type { AccountRecurring, RecurringView } from "../recurring.types";
import { RecurringRow } from "./RecurringRow";

type RecurringListProps = {
  recurring: AccountRecurring;
  /** The period's last month with movements, which the rows show. */
  month: CalendarMonth;
  view: RecurringView;
};

// The list's title, what it shows, and its chips when some payment stopped.
function ListHeader({
  month,
  view,
  filters,
}: {
  month: CalendarMonth;
  view: RecurringView;
  filters: readonly FilterChip[];
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 pb-4">
      <div className="flex min-w-0 flex-[1_1_18rem] flex-col gap-0.5">
        <h2 id="fixed-payments" className="text-section font-bold">
          {COPY.listTitle}
        </h2>
        <p className="text-caption text-ink-muted">
          {listSubtitle(month, view)}
        </p>
      </div>
      {filters.length > 0 && (
        <FilterChips label={COPY.filtersLabel} options={filters} />
      )}
    </div>
  );
}

// What the fixed payments added up to in the page's month.
function MonthTotal({
  spending,
  month,
}: {
  spending: readonly RecurringPayment[];
  month: CalendarMonth;
}) {
  const total = monthTotal(spending, month);
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-divider pt-4">
      <p className="text-body font-bold">{total.label}</p>
      <p className="font-display text-amount-l font-medium text-spending-text tabular-nums">
        {total.amount}
      </p>
    </div>
  );
}

// "Tus pagos fijos": the real spending its month expects, the largest
// first, with its months as bars and their total; or those that stopped.
function FixedPayments({ recurring, month, view }: RecurringListProps) {
  const shown =
    view === "stopped" ? recurring.stopped : recurring.payments.spending;
  return (
    <section aria-labelledby="fixed-payments" className="flex flex-col">
      <ListHeader
        month={month}
        view={view}
        filters={listFilters(recurring, view)}
      />
      {shown.length > 0 ? (
        <ul>
          {shown.map((payment) => {
            const row = rowView(payment, month, view);
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
      ) : (
        <p className="border-t border-divider py-4 text-caption text-ink-muted">
          {noneText(month)}
        </p>
      )}
      {view === "active" && shown.length > 0 && (
        <MonthTotal spending={shown} month={month} />
      )}
    </section>
  );
}

// "También se repiten, pero no son gasto": card payments and savings.
function MovedPayments({
  moved,
  month,
}: {
  moved: readonly RecurringPayment[];
  month: CalendarMonth;
}) {
  return (
    <section aria-labelledby="moved-payments" className="flex flex-col">
      <div className="flex flex-col gap-0.5 pb-4">
        <h2 id="moved-payments" className="text-section font-bold">
          {COPY.movedTitle}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.movedSubtitle}</p>
      </div>
      <ul>
        {moved.map((payment) => {
          const row = rowView(payment, month);
          return <RecurringRow key={row.key} row={row} tone="moved" />;
        })}
      </ul>
    </section>
  );
}

/** The payments that repeat in the page's month (docs/ui/v8-04). */
export function RecurringList({ recurring, month, view }: RecurringListProps) {
  const { payments, stopped } = recurring;
  return (
    <Card variant="card" className="w-full min-w-0 gap-8">
      {(payments.spending.length > 0 || stopped.length > 0) && (
        <FixedPayments recurring={recurring} month={month} view={view} />
      )}
      {payments.moved.length > 0 && (
        <MovedPayments moved={payments.moved} month={month} />
      )}
    </Card>
  );
}
