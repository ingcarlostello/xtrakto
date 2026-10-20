import {
  type CalendarMonth,
  formatDayInWords,
  formatMonthName,
  type LocalDate,
  monthPeriod,
  monthWeeks,
  type RecurringPayment,
} from "@xtrakto/core";
import { compactSize } from "@/utils/money-text.utils";
import {
  joined,
  latestAmountOf,
  monthWord,
  paymentTitle,
} from "./recurring-view.helpers";
import { RECURRING_CALENDAR_COPY as COPY } from "./recurring-calendar.constants";
import type {
  CalendarDay,
  PaymentsCalendarView,
  PendingPayment,
} from "./recurring-calendar.types";
import {
  calendarMonthOf,
  isSameMonth,
  monthBefore,
  paidMonth,
} from "./recurring.helpers";

type Days = RecurringPayment["days"];

const dayOf = (date: LocalDate): number => Number(date.slice(8, 10));

// A payment's days in a month of `lastDay` days: the 31st falls on its last.
const daysWithin = ({ days }: RecurringPayment, lastDay: number): Days => ({
  first: Math.min(days.first, lastDay),
  last: Math.min(days.last, lastDay),
});

// "el 5", "del 8 al 12".
const daysText = ({ days }: RecurringPayment): string =>
  days.first === days.last
    ? `${COPY.onDay} ${days.first}`
    : `${COPY.from} ${days.first} ${COPY.to} ${days.last}`;

const byFirstDay = (payments: readonly RecurringPayment[]) =>
  [...payments].sort((a, b) => a.days.first - b.days.first);

// Each day of the month, with the payments' days on it and today.
const calendarWeeks = (
  spending: readonly RecurringPayment[],
  {
    month,
    today,
    lastDay,
  }: { month: CalendarMonth; today: LocalDate; lastDay: number },
): PaymentsCalendarView["weeks"] => {
  const ranges = spending.map((payment) => daysWithin(payment, lastDay));
  return monthWeeks(month).map((week) =>
    week.map((day): CalendarDay | null =>
      day === null
        ? null
        : {
            day,
            isInRange: ranges.some(
              ({ first, last }) => first < last && first <= day && day <= last,
            ),
            isFixedDay: ranges.some(
              ({ first, last }) => first === last && day === first,
            ),
            isToday: day === dayOf(today),
          },
    ),
  );
};

// "Pendiente: GAS NATURAL CIUDAD, del 8 al 12." and "Aún no aparece. Unos
// $31 mil, por transferencia o PSE.": its latest month's amount, about.
const pendingView = (payment: RecurringPayment): PendingPayment => {
  const channels = payment.channels.map((id) => COPY.channels[id]);
  const by =
    channels.length > 0 ? `, ${COPY.by} ${joined(channels, COPY.or)}` : "";
  return {
    key: `${payment.label}-${payment.referenceLast4 ?? ""}`,
    title: `${COPY.pending} ${paymentTitle(payment)}, ${daysText(payment)}.`,
    detail: `${COPY.notYet} ${COPY.about} ${compactSize(latestAmountOf(payment))}${by}.`,
  };
};

/**
 * This month's calendar of the fixed payments a page expects
 * (docs/ui/v8-04), when the page's month is this one or the one before:
 * each payment's day or range of days, and today. With this month's
 * movements, it also says which payments haven't appeared though their days
 * began. None for an older month, or without fixed payments.
 */
export const paymentsCalendar = (
  spending: readonly RecurringPayment[],
  {
    month,
    today,
  }: { readonly month: CalendarMonth; readonly today: LocalDate },
): PaymentsCalendarView | undefined => {
  const current = calendarMonthOf(today);
  const hasThisMonth = isSameMonth(month, current);
  if (spending.length === 0) return undefined;
  if (!hasThisMonth && !isSameMonth(month, monthBefore(current, 1)))
    return undefined;
  const lastDay = dayOf(monthPeriod(current).to);
  const pending = hasThisMonth
    ? byFirstDay(spending).filter(
        (payment) =>
          paidMonth(payment, current) === undefined &&
          daysWithin(payment, lastDay).first <= dayOf(today),
      )
    : [];
  const days = byFirstDay(spending).map(
    (payment) => `${paymentTitle(payment)}, ${daysText(payment)}`,
  );
  return {
    title: formatMonthName(current),
    subtitle: `${COPY.subtitle} ${COPY.today} ${formatDayInWords(today)}.`,
    label: `${COPY.label} ${monthWord(current)}: ${days.join("; ")}.`,
    weeks: calendarWeeks(spending, { month: current, today, lastDay }),
    pending: pending.map(pendingView),
    ...(hasThisMonth && pending.length === 0
      ? { note: COPY.nothingPending }
      : {}),
  };
};
