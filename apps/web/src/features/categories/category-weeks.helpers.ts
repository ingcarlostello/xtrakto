import {
  addDaysTo,
  amountMinorSchema,
  type CategoryId,
  daysBetween,
  formatDayInWords,
  formatShortDay,
  type LocalDate,
  monthPeriod,
  type Period,
  sumAmounts,
} from "@xtrakto/core";
import {
  amountTicks,
  areaOf,
  coordinate,
  lineOf,
  plotOf,
  scaleOf,
  yTicksOf,
} from "@/components/line-chart/line-chart.helpers";
import type {
  ChartEvent,
  ChartPlot,
} from "@/components/line-chart/line-chart.types";
import { categoryLabel } from "@/utils/category-label.helpers";
import { countText } from "@/utils/count-text.utils";
import { boxAmount, compactSize } from "@/utils/money-text.utils";
import {
  type MovementPeriod,
  periodDays,
} from "@/utils/transactions-url.helpers";
import { CATEGORIES_COPY } from "./categories.constants";
import type {
  CategoryDetail,
  CategoryWeek,
  WeeklyChartView,
} from "./categories.types";
import { categoryMovements } from "./category-detail.helpers";

const COPY = CATEGORIES_COPY.weeks;
const WEEK_DAYS = 7;
// A week stands out when it took half again what a normal week took, or
// when a normal week took nothing.
const STANDS_OUT = 1.5;

type Weekly = Pick<CategoryDetail, "period" | "categoryId" | "movements">;

const earlier = (a: LocalDate, b: LocalDate): LocalDate => (a < b ? a : b);

/**
 * The period's weeks, seven days from its first and the last one shorter,
 * through the account's last day with movements, each with what the
 * category took in it and how many movements.
 */
export const categoryWeeks = (detail: Weekly): CategoryWeek[] => {
  const { from, to } = periodDays(detail.period);
  const lastDay = detail.movements.at(-1)?.date;
  if (lastDay === undefined) return [];
  const weeks = Math.floor(daysBetween(from, earlier(lastDay, to)) / WEEK_DAYS);
  const mine = categoryMovements(detail);
  return Array.from({ length: weeks + 1 }, (_, index) => {
    const start = addDaysTo(from, index * WEEK_DAYS);
    const end = earlier(addDaysTo(start, WEEK_DAYS - 1), to);
    const inWeek = mine.filter(({ date }) => date >= start && date <= end);
    const total = sumAmounts(inWeek.map(({ amountMinor }) => amountMinor));
    return {
      from: start,
      to: end,
      amountMinor: amountMinorSchema.parse(Math.abs(total)),
      count: inWeek.length,
    };
  });
};

// What a normal week took: the middle one, the larger of two.
const typicalOf = (weeks: readonly CategoryWeek[]): number =>
  [...weeks].map(({ amountMinor }) => amountMinor).sort((a, b) => a - b)[
    Math.floor(weeks.length / 2)
  ] ?? 0;

// The week the category took the most, the first of a tie.
const peakOf = (weeks: readonly CategoryWeek[]) =>
  weeks.reduce<CategoryWeek | undefined>(
    (peak, week) =>
      peak === undefined || week.amountMinor > peak.amountMinor ? week : peak,
    undefined,
  );

// "1 jul", "1 ago", "1 sep", "30 sep": a quarter's months and its last
// day; a month's weeks.
const dayTicks = (period: MovementPeriod, { from, to }: Period) => {
  if (period.kind === "month")
    return Array.from(
      { length: Math.floor(daysBetween(from, to) / WEEK_DAYS) + 1 },
      (_, index) => addDaysTo(from, index * WEEK_DAYS),
    );
  const first = period.quarter * 3 - 2;
  return [
    from,
    monthPeriod({ year: period.year, month: first + 1 }).from,
    monthPeriod({ year: period.year, month: first + 2 }).from,
    to,
  ];
};

type Weeks = {
  readonly weeks: readonly CategoryWeek[];
  readonly categoryId: CategoryId;
};

type EventPlace = { readonly plot: ChartPlot; readonly from: LocalDate };

// The week that stands out, when one does: what it took and how many
// movements, against what a normal week took.
const eventOf = (
  { weeks, categoryId }: Weeks,
  { plot, from }: EventPlace,
): ChartEvent | undefined => {
  const peak = peakOf(weeks);
  const typical = typicalOf(weeks);
  if (peak === undefined || peak.amountMinor === 0) return undefined;
  if (typical > 0 && peak.amountMinor < typical * STANDS_OUT) return undefined;
  const count = countText(peak.count, CATEGORIES_COPY.spending.movements);
  return {
    x: coordinate(plot.x(daysBetween(from, peak.from))),
    y: coordinate(plot.y(peak.amountMinor)),
    title: `${COPY.weekOf} ${formatDayInWords(peak.from)}: ${boxAmount(peak.amountMinor)}`,
    detail:
      typical > 0
        ? `${count}. ${COPY.normalWeek} ${compactSize(amountMinorSchema.parse(typical))}.`
        : `${count}. ${COPY.mostWeeks} «${categoryLabel(categoryId)}».`,
  };
};

// What the chart says, for screen readers: "Gasto en «Efectivo» por semana,
// del 1 de julio al 29 de septiembre. La semana con más fue la del 15 de
// julio: $300.000."
const conclusionOf = ({ weeks, categoryId }: Weeks): string => {
  const peak = peakOf(weeks);
  const first = weeks[0];
  const last = weeks.at(-1);
  if (peak === undefined || first === undefined || last === undefined)
    return "";
  return `${COPY.spentIn} «${categoryLabel(categoryId)}» ${COPY.perWeek} ${formatDayInWords(first.from)} ${COPY.to} ${formatDayInWords(last.to)}. ${COPY.mostIn} ${formatDayInWords(peak.from)}: ${boxAmount(peak.amountMinor)}.`;
};

/**
 * "Semana a semana" (docs/ui/v8-06): what the category took each week, as
 * a line with its area and a dot a week, on a scale of round amounts over
 * the period's days; the week that stands out, and what the chart says.
 * Nothing when the category took nothing in the period.
 */
export const weeklyChart = (detail: Weekly): WeeklyChartView | null => {
  const weeks = categoryWeeks(detail);
  if (!weeks.some(({ count }) => count > 0)) return null;
  const days = periodDays(detail.period);
  const amounts = weeks.map(({ amountMinor }) => amountMinor);
  const ticks = amountTicks(amounts);
  const plot = plotOf(daysBetween(days.from, days.to), scaleOf(ticks));
  const at = weeks.map((week) => daysBetween(days.from, week.from));
  const ofCategory = { weeks, categoryId: detail.categoryId };
  const event = eventOf(ofCategory, { plot, from: days.from });
  return {
    line: lineOf(amounts, plot, at),
    area: areaOf(amounts, plot, at),
    points: weeks.map((week, index) => ({
      x: coordinate(plot.x(at[index] ?? 0)),
      y: coordinate(plot.y(week.amountMinor)),
    })),
    yTicks: yTicksOf(ticks, plot),
    xTicks: dayTicks(detail.period, days).map((date) => ({
      label: formatShortDay(date),
      at: coordinate(plot.x(daysBetween(days.from, date))),
    })),
    ...(event ? { event } : {}),
    label: conclusionOf(ofCategory),
  };
};
