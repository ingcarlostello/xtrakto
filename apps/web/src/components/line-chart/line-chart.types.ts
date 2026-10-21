/** A label on a chart's axis, and where it falls, in percent of the plot. */
export type ChartTick = { readonly label: string; readonly at: number };

/** Where a point falls on the plot, in percent from its left and its top. */
export type ChartPoint = { readonly x: number; readonly y: number };

/** The point a chart singles out, and what happened there in plain words. */
export type ChartEvent = ChartPoint & {
  /** "4 de agosto: entraron $31,5M". */
  readonly title: string;
  /** "Ese mismo día $22,0M pasaron a tu inversión. No fue gasto." */
  readonly detail: string;
};

/** The left edge of a chart's scale and its top, in minor units. */
export type ChartScale = { readonly bottom: number; readonly top: number };

/**
 * Where a day and an amount fall on the plot, in percent: the first day
 * drawn at the left, the scale's top at the top.
 */
export type ChartPlot = {
  readonly x: (day: number) => number;
  readonly y: (amount: number) => number;
};
