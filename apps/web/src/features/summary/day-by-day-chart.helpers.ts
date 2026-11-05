import {
  addDaysTo,
  type DailyBalances,
  type DayTotals,
  daysBetween,
  formatDayInWords,
  formatShortDay,
  type LocalDate,
  monthPeriod,
  type Period,
  quarterOfMonth,
  quarterPeriod,
} from "@xtrakto/core";
import {
  amountTicks,
  areaOf,
  chartMoney as money,
  coordinate,
  lineOf,
  plotOf,
  scaleOf,
  yTicksOf,
} from "@/components/line-chart/line-chart.helpers";
import type {
  ChartEvent,
  ChartPlot,
  ChartScale,
  ChartTick,
} from "@/components/line-chart/line-chart.types";
import { calendarMonthOf } from "@/features/recurring/recurring.helpers";
import { compactSize } from "@/utils/money-text.utils";
import { type PagePeriod, periodDays } from "@/utils/transactions-url.helpers";
import { movedPlaces } from "./glance.helpers";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountSummary, DayByDayChartView } from "./summary.types";

const COPY = SUMMARY_COPY.chart;
// A day stands out when what came in is a tenth of the scale or more, so
// a day of interest never does.
const EVENT_SHARE = 0.1;

// Each day the lines draw, from where they start: the day before a
// period's first, whose closing balance a quarterly statement opens with.
const datesFrom = ({ from, to }: Period): LocalDate[] =>
  Array.from({ length: daysBetween(from, to) + 1 }, (_, day) =>
    addDaysTo(from, day),
  );

// Where the lines start: the period's opening, or a year's first quarter
// with movements (10.2c), since its files can begin in any quarter, and a
// balance isn't known before its quarterly statement opens.
const startOf = (
  period: PagePeriod,
  opening: LocalDate,
  first: LocalDate | undefined,
): LocalDate => {
  if (period.kind !== "year" || first === undefined) return opening;
  const { year, month } = calendarMonthOf(first);
  const quarter = quarterPeriod({ year, quarter: quarterOfMonth(month) });
  return addDaysTo(quarter.from, -1);
};

// The days the lines draw, through the last with movements, and where each
// falls on the period's axis, which starts at its opening.
const drawnDays = (summary: AccountSummary, opening: LocalDate) => {
  const { days } = summary.summary;
  const start = startOf(summary.period, opening, days[0]?.date);
  const drawn = { from: start, to: days.at(-1)?.date ?? start };
  const dates = datesFrom(drawn);
  return { drawn, dates, at: dates.map((date) => daysBetween(opening, date)) };
};

// The real spending so far on each day, as money out: 0 at the opening.
const spendingSoFar = (
  dates: readonly LocalDate[],
  days: readonly DayTotals[],
): number[] => {
  const spentOn = new Map(
    days.map(({ date, kinds }) => [date, -kinds.spending.amountMinor]),
  );
  let total = 0;
  return dates.map((date) => {
    total += spentOn.get(date) ?? 0;
    return total;
  });
};

// The balance on each day, the opening's first, the same over a day
// without movements.
const balanceEachDay = (
  dates: readonly LocalDate[],
  { openingMinor, days }: DailyBalances,
): number[] => {
  const closingOn = new Map(
    days.map(({ date, closingMinor }) => [date, closingMinor]),
  );
  let balance: number = openingMinor;
  return dates.map((date) => {
    balance = closingOn.get(date) ?? balance;
    return balance;
  });
};

// "30 jun", "31 jul", "31 ago", "30 sep": a quarter's opening and its
// months' last days; a month's opening, its 10th, its 20th and its last;
// a year's quarters' last days (10.2c), whose opening would read "31 dic"
// twice.
const dayTicks = (period: PagePeriod, { from, to }: Period) => {
  if (period.kind === "year")
    return [3, 6, 9, 12].map(
      (month) => monthPeriod({ year: period.year, month }).to,
    );
  const opening = addDaysTo(from, -1);
  if (period.kind === "month")
    return [opening, addDaysTo(from, 9), addDaysTo(from, 19), to];
  const first = period.quarter * 3 - 2;
  return [
    opening,
    monthPeriod({ year: period.year, month: first }).to,
    monthPeriod({ year: period.year, month: first + 1 }).to,
    to,
  ];
};

// The day the most income came in, when it stands out: what came in, and
// where money moved that same day, which wasn't spending.
const eventOf = (
  { summary, period }: AccountSummary,
  balance: readonly number[],
  {
    plot,
    opening,
    start,
    scale,
  }: {
    plot: ChartPlot;
    opening: LocalDate;
    start: LocalDate;
    scale: ChartScale;
  },
): ChartEvent | undefined => {
  const peak = summary.days.reduce<DayTotals | undefined>(
    (best, day) =>
      day.kinds.income.amountMinor > (best?.kinds.income.amountMinor ?? 0)
        ? day
        : best,
    undefined,
  );
  const income = peak?.kinds.income.amountMinor ?? 0;
  if (!peak || income < (scale.top - scale.bottom) * EVENT_SHARE)
    return undefined;
  const { out } = peak.kinds.moved;
  return {
    x: coordinate(plot.x(daysBetween(opening, peak.date))),
    y: coordinate(plot.y(balance[daysBetween(start, peak.date)] ?? 0)),
    title: `${formatDayInWords(peak.date)}: ${COPY.cameIn} ${compactSize(peak.kinds.income.amountMinor)}`,
    detail:
      out.count > 0
        ? `${COPY.sameDay} ${compactSize(out.amountMinor)} ${COPY.movedTo} ${movedPlaces(peak.movedByCategory)}. ${COPY.notSpending}`
        : COPY.mostIncome[period.kind],
  };
};

// What the chart says, for screen readers, over the days it draws: "Tu
// saldo pasó de $13,8M el 30 de junio a $6,5M el 30 de septiembre, y tu
// gasto real llegó a $24,4M."
const conclusionOf = (
  { from, to }: Period,
  spending: readonly number[],
  balance: readonly number[] | null,
): string => {
  const spent = spending.at(-1) ?? 0;
  if (!balance)
    return `${COPY.spendingReached} ${money(spent)} ${COPY.on} ${formatDayInWords(to)}.`;
  const change = `${COPY.balanceFrom} ${money(balance[0] ?? 0)} ${COPY.on} ${formatDayInWords(from)} ${COPY.to} ${money(balance.at(-1) ?? 0)} ${COPY.on} ${formatDayInWords(to)}`;
  return spent > 0
    ? `${change}, ${COPY.andSpending} ${money(spent)}.`
    : `${change}. ${SUMMARY_COPY.spending.none}`;
};

/**
 * "Tu saldo y tu gasto real, día a día" (docs/ui/v8-01): the balance each
 * day, when every movement printed it, and the real spending so far, from
 * the period's opening, or a year's first quarter with movements, through
 * its last day with movements, on a scale of round amounts; the day the
 * most income came in, and what the chart says. Without balances, only the
 * spending, and nothing without spending either.
 */
export const dayByDayChart = (
  summary: AccountSummary,
): DayByDayChartView | null => {
  const days = periodDays(summary.period);
  const opening = addDaysTo(days.from, -1);
  const { drawn, dates, at } = drawnDays(summary, opening);
  const spending = spendingSoFar(dates, summary.summary.days);
  const balance = summary.balances && balanceEachDay(dates, summary.balances);
  if (!balance && (spending.at(-1) ?? 0) <= 0) return null;
  const amounts = amountTicks([...spending, ...(balance ?? [])]);
  const scale = scaleOf(amounts);
  const plot = plotOf(daysBetween(opening, days.to), scale);
  const event =
    balance &&
    eventOf(summary, balance, { plot, opening, start: drawn.from, scale });
  return {
    title: balance ? COPY.title : COPY.spendingTitle,
    ...(balance
      ? {
          balance: {
            line: lineOf(balance, plot, at),
            area: areaOf(balance, plot, at),
          },
        }
      : { note: COPY.noBalance }),
    spending: lineOf(spending, plot, at),
    yTicks: yTicksOf(amounts, plot),
    xTicks: dayTicks(summary.period, days).map((date): ChartTick => ({
      label: formatShortDay(date),
      at: coordinate(plot.x(daysBetween(opening, date))),
    })),
    ...(event ? { event } : {}),
    label: conclusionOf(drawn, spending, balance),
  };
};
