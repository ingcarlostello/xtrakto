import type { CalendarMonth, LocalDate, RecurringPayment } from "@xtrakto/core";
import { Card } from "@/components/ui/card";
import { cn } from "@/utils/cn.utils";
import { RECURRING_CALENDAR_COPY as COPY } from "../recurring-calendar.constants";
import { paymentsCalendar } from "../recurring-calendar.helpers";
import type {
  CalendarDay,
  PaymentsCalendarView,
  PendingPayment,
} from "../recurring-calendar.types";

// A day: shaded within a payment's range, dotted on a fixed day, in blue today.
function DayCell({ day }: { day: CalendarDay }) {
  return (
    <span
      className={cn(
        "relative flex aspect-square items-center justify-center rounded-[10px] text-sm tabular-nums",
        day.isToday
          ? "bg-primary font-bold text-white"
          : day.isInRange
            ? "bg-spending-soft font-semibold text-ink"
            : "text-ink-secondary",
      )}
    >
      {day.day}
      {day.isFixedDay && (
        <span
          className={cn(
            "absolute bottom-1 size-1.5 rounded-full",
            day.isToday ? "bg-white" : "bg-spending",
          )}
        />
      )}
    </span>
  );
}

// The weekdays, Monday first, over the month's days: one image whose name
// says each payment's days.
function CalendarGrid({ view }: { view: PaymentsCalendarView }) {
  return (
    <div
      role="img"
      aria-label={view.label}
      className="grid grid-cols-7 gap-1.5"
    >
      {COPY.weekdays.map((weekday, index) => (
        <span
          key={`weekday-${index}`}
          className="pb-1 text-center text-meta font-semibold text-ink-muted"
        >
          {weekday}
        </span>
      ))}
      {view.weeks
        .flat()
        .map((day, index) =>
          day === null ? (
            <span key={`blank-${index}`} />
          ) : (
            <DayCell key={`day-${day.day}`} day={day} />
          ),
        )}
    </div>
  );
}

// What the shades, the dots and the blue day mean.
function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-ink-muted">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-[4px] bg-spending-soft" />
        {COPY.range}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-1.5 rounded-full bg-spending" />
        {COPY.fixedDay}
      </li>
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 rounded-[4px] bg-primary" />
        {COPY.todayLegend}
      </li>
    </ul>
  );
}

// "Pendiente: …", each with the attention dot, on white.
function PendingList({ pending }: { pending: readonly PendingPayment[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {pending.map((payment) => (
        <li
          key={payment.key}
          className="flex items-start gap-3 rounded-md bg-surface p-3.5 shadow-chip"
        >
          <span
            aria-hidden
            className="mt-1.5 size-2.5 shrink-0 rounded-full bg-spending shadow-[0_0_0_4px_rgb(234_107_45/0.18)]"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm font-bold">{payment.title}</p>
            <p className="text-caption text-ink-muted">{payment.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

type PaymentsCalendarProps = {
  spending: readonly RecurringPayment[];
  /** The page's month: the calendar shows while it's this one or the one before. */
  month: CalendarMonth;
  today: LocalDate;
};

/**
 * When each fixed payment goes out this month (docs/ui/v8-04), with today,
 * and those that haven't appeared yet. A screen reader hears the days as one
 * sentence instead of the grid. Nothing for an older month.
 */
export function PaymentsCalendar({
  spending,
  month,
  today,
}: PaymentsCalendarProps) {
  const view = paymentsCalendar(spending, { month, today });
  if (view === undefined) return null;
  return (
    <Card variant="card" role="region" aria-labelledby="payments-calendar">
      <div className="flex flex-col gap-0.5">
        <h2 id="payments-calendar" className="text-section font-bold">
          {view.title}
        </h2>
        <p className="text-caption text-ink-muted">{view.subtitle}</p>
      </div>
      <CalendarGrid view={view} />
      <Legend />
      {view.pending.length > 0 && <PendingList pending={view.pending} />}
      {view.note && <p className="text-caption text-ink-muted">{view.note}</p>}
    </Card>
  );
}
