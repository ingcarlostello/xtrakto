import type {
  CalendarMonth,
  RecurringPayment,
  RecurringPayments,
} from "@xtrakto/core";

const MONTHS_A_YEAR = 12;

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

/** The payments a page of `month` shows: those paid in it, none without one. */
export const paidIn = (
  { spending, moved }: RecurringPayments,
  month: CalendarMonth | undefined,
): RecurringPayments => {
  const isPaid = (payment: RecurringPayment) => {
    const last = payment.months.at(-1);
    return (
      month !== undefined &&
      last !== undefined &&
      isSameMonth(last.month, month)
    );
  };
  return { spending: spending.filter(isPaid), moved: moved.filter(isPaid) };
};
