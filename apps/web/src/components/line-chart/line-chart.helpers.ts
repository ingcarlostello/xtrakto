import {
  amountMinorSchema,
  CURRENCY,
  formatCompactAmount,
} from "@xtrakto/core";
import type { ChartPlot, ChartScale, ChartTick } from "./line-chart.types";

// The plot's box in the SVG: 100 by 100, its top at 0.
const PLOT = 100;
// The amounts on the left split the scale in three steps at most: "$0" to
// "$30M".
const Y_STEPS = 3;
// Round steps: 1, 2, 2,5 and 5 times a power of ten, from $10, so each
// label is whole pesos.
const ROUND_STEPS = [1, 2, 2.5, 5, 10] as const;
const MIN_STEP_MINOR = 1_000;

/** Some money as a chart writes it, with its minus: "$13,8M". */
export const chartMoney = (amount: number): string =>
  formatCompactAmount(amountMinorSchema.parse(amount), CURRENCY.COP);

/** A number of the SVG, to two decimals. */
export const coordinate = (value: number): number =>
  Math.round(value * 100) / 100;

// The round step that splits a range in three at most: $10M for $24,4M.
const roundStep = (range: number): number => {
  const rough = Math.max(range / Y_STEPS, MIN_STEP_MINOR);
  const power = 10 ** Math.floor(Math.log10(rough));
  return (ROUND_STEPS.find((round) => round * power >= rough) ?? 10) * power;
};

/**
 * "$30M", "$20M", "$10M", "$0": round amounts from the top, past the
 * lines' highest and lowest, and 0 always.
 */
export const amountTicks = (amounts: readonly number[]): number[] => {
  const highest = Math.max(0, ...amounts);
  const lowest = Math.min(0, ...amounts);
  const step = roundStep(highest - lowest);
  const bottom = Math.floor(lowest / step) * step;
  const top = Math.max(Math.ceil(highest / step) * step, bottom + step);
  return Array.from(
    { length: (top - bottom) / step + 1 },
    (_, index) => top - index * step,
  );
};

/** The scale its round amounts mark: the first is its top, the last its bottom. */
export const scaleOf = (ticks: readonly number[]): ChartScale => ({
  top: ticks[0] ?? 0,
  bottom: ticks.at(-1) ?? 0,
});

/** Where days and amounts fall on a plot `days` long, on a scale. */
export const plotOf = (
  days: number,
  { bottom, top }: ChartScale,
): ChartPlot => ({
  x: (day) => (day / days) * PLOT,
  y: (amount) => ((top - amount) / (top - bottom)) * PLOT,
});

/** The amounts on the left, where each falls: "$30M", not "$30,0M". */
export const yTicksOf = (
  ticks: readonly number[],
  plot: ChartPlot,
): ChartTick[] =>
  ticks.map((amount) => ({
    label: chartMoney(amount).replace(",0M", "M"),
    at: coordinate(plot.y(amount)),
  }));

/** A line through some amounts, one a day: "0,45.12 1.09,45.12 …". */
export const lineOf = (
  amounts: readonly number[],
  plot: ChartPlot,
  days: readonly number[] = amounts.map((_, day) => day),
): string =>
  amounts
    .map(
      (amount, index) =>
        `${coordinate(plot.x(days[index] ?? index))},${coordinate(plot.y(amount))}`,
    )
    .join(" ");

/** The line closed along the plot's bottom, for the area under it. */
export const areaOf = (
  amounts: readonly number[],
  plot: ChartPlot,
  days: readonly number[] = amounts.map((_, day) => day),
): string =>
  `${coordinate(plot.x(days[0] ?? 0))},${PLOT} ${lineOf(amounts, plot, days)} ${coordinate(plot.x(days.at(-1) ?? 0))},${PLOT}`;
