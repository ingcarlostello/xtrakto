import {
  type CalendarMonth,
  type LocalDate,
  monthPeriod,
  type Period,
  type RecurringMonth,
  type RecurringPayment,
  type RecurringPayments,
} from "@xtrakto/core";
import type { PagePayments } from "./recurring.types";

const MONTHS_A_YEAR = 12;
// Payments are looked for in the year that ends with the period.
const HISTORY_MONTHS = 12;

export const isSameMonth = (a: CalendarMonth, b: CalendarMonth): boolean =>
  a.year === b.year && a.month === b.month;

/** The month `back` months before `month`. */
export const monthBefore = (
  month: CalendarMonth,
  back: number,
): CalendarMonth => {
  const index = month.year * MONTHS_A_YEAR + month.month - 1 - back;
  return {
    year: Math.floor(index / MONTHS_A_YEAR),
    month: (index % MONTHS_A_YEAR) + 1,
  };
};

/** The month a day falls in. */
export const calendarMonthOf = (date: LocalDate): CalendarMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

/** The year that ends with a period, where its payments that repeat are found. */
export const historyOf = ({ to }: Period): Period => ({
  from: monthPeriod(monthBefore(calendarMonthOf(to), HISTORY_MONTHS - 1)).from,
  to,
});

/** What a payment added up to in a month, when it was paid in it. */
export const paidMonth = (
  payment: RecurringPayment,
  month: CalendarMonth,
): RecurringMonth | undefined =>
  payment.months.find((paid) => isSameMonth(paid.month, month));

/**
 * The payments of a page whose movements end on `lastDate`, in that day's
 * month: those paid in it and, while its movements don't reach its last day,
 * those of the month before, which may still come. The real spending that
 * repeated before and doesn't now stopped.
 */
export const splitByMonth = (
  { spending, moved }: RecurringPayments,
  lastDate: LocalDate,
): PagePayments => {
  const month = calendarMonthOf(lastDate);
  const isInProgress = lastDate < monthPeriod(month).to;
  const isExpected = ({ months }: RecurringPayment) => {
    const last = months.at(-1)?.month;
    if (last === undefined) return false;
    return (
      isSameMonth(last, month) ||
      (isInProgress && isSameMonth(last, monthBefore(month, 1)))
    );
  };
  return {
    payments: {
      spending: spending.filter(isExpected),
      moved: moved.filter(isExpected),
    },
    stopped: spending.filter((payment) => !isExpected(payment)),
  };
};
