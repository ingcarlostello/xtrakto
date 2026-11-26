import {
  addDaysTo,
  type CalendarMonth,
  type LocalDate,
  monthPeriod,
  type Period,
} from "@xtrakto/core";
import { type PagePeriod, periodDays } from "./transactions-url.helpers";

/**
 * A card's cycles (12.3c): its statements' periods, each named by the month
 * it closes in, as its bank titles it ("tu extracto de septiembre", from 12
 * August to 10 September). `null` for any other account, whose months are
 * the calendar's.
 */
export type CardCycles = readonly Period[] | null;

const keyOf = ({ year, month }: CalendarMonth): string =>
  `${year}-${String(month).padStart(2, "0")}`;

const monthOf = (date: LocalDate): CalendarMonth => ({
  year: Number(date.slice(0, 4)),
  month: Number(date.slice(5, 7)),
});

const shifted = ({ year, month }: CalendarMonth, by: number): CalendarMonth => {
  const index = year * 12 + month - 1 + by;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
};

const monthsApart = (a: CalendarMonth, b: CalendarMonth): number =>
  Math.abs((a.year - b.year) * 12 + a.month - b.month);

// The day a cycle closes on in a month: its cut day, or the month's last
// when the month is shorter.
const cutIn = (month: CalendarMonth, day: number): LocalDate => {
  const { from, to } = monthPeriod(month);
  const cut = addDaysTo(from, day - 1);
  return cut > to ? to : cut;
};

/**
 * A month's days for an account: the calendar's, or the cycle a card's
 * statement closes in it. A card's month without its statement runs
 * between its neighbors' cycles, or to the cut day of its nearest one.
 */
export const monthDays = (month: CalendarMonth, cycles: CardCycles): Period => {
  if (cycles === null) return monthPeriod(month);
  const closingIn = (shown: CalendarMonth) =>
    cycles.find(({ to }) => to.startsWith(keyOf(shown)));
  const own = closingIn(month);
  if (own) return own;
  const [nearest] = [...cycles].sort(
    (a, b) =>
      monthsApart(monthOf(a.to), month) - monthsApart(monthOf(b.to), month),
  );
  if (!nearest) return monthPeriod(month);
  const cutDay = Number(nearest.to.slice(8, 10));
  const before = closingIn(shifted(month, -1));
  const after = closingIn(shifted(month, 1));
  const from = addDaysTo(before?.to ?? cutIn(shifted(month, -1), cutDay), 1);
  const to = after ? addDaysTo(after.from, -1) : cutIn(month, cutDay);
  return from <= to ? { from, to } : monthPeriod(month);
};

// A period's first and last months.
const boundsOf = (
  period: PagePeriod,
): readonly [CalendarMonth, CalendarMonth] => {
  const { year } = period;
  if (period.kind === "month") return [period, period];
  if (period.kind === "year")
    return [
      { year, month: 1 },
      { year, month: 12 },
    ];
  return [
    { year, month: period.quarter * 3 - 2 },
    { year, month: period.quarter * 3 },
  ];
};

/**
 * The days a page period covers for an account: the calendar's, or a card's
 * cycles from its first month's through its last's (12.3c).
 */
export const pageDays = (period: PagePeriod, cycles: CardCycles): Period => {
  if (cycles === null) return periodDays(period);
  const [first, last] = boundsOf(period);
  return {
    from: monthDays(first, cycles).from,
    to: monthDays(last, cycles).to,
  };
};

/**
 * The month a day belongs to, as the account's months run: `"2026-09"` for
 * 20 August on a card whose September cycle starts on the 12th.
 */
export const monthKeyOfDay = (date: LocalDate, cycles: CardCycles): string => {
  const month = monthOf(date);
  if (cycles === null) return keyOf(month);
  const { from, to } = monthDays(month, cycles);
  if (date < from) return keyOf(shifted(month, -1));
  return keyOf(date > to ? shifted(month, 1) : month);
};
