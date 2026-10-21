import type { ReactNode } from "react";
import { CHART_LINE } from "./line-chart.constants";
import type { ChartEvent, ChartTick } from "./line-chart.types";

// The amounts on the left, each centered on its gridline: evenly spaced,
// as the gridlines are.
function AmountLabels({ ticks }: { ticks: readonly ChartTick[] }) {
  return (
    <div
      aria-hidden
      className="flex h-48 flex-col justify-between text-meta text-ink-muted"
    >
      {ticks.map(({ label }) => (
        <span
          key={label}
          className="flex h-0 items-center justify-end tabular-nums"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// The days under the plot, each moved back as far into itself as its day
// is into the plot: the first starts at the left edge, the last ends at
// the right one.
function DayLabels({ ticks }: { ticks: readonly ChartTick[] }) {
  return (
    <div aria-hidden className="relative mt-2 h-5 text-meta text-ink-muted">
      {ticks.map(({ label, at }) => (
        <span
          key={label}
          className="absolute top-0 whitespace-nowrap"
          style={{ left: `${at}%`, translate: `-${at}% 0` }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

// The gridlines, the bottom one the axis.
function Gridlines({ ticks }: { ticks: readonly ChartTick[] }) {
  return ticks.map((tick, index) => (
    <line
      key={tick.label}
      x1="0"
      x2="100"
      y1={tick.at}
      y2={tick.at}
      strokeWidth="1"
      className={
        index === ticks.length - 1 ? "stroke-chart-axis" : "stroke-chart-grid"
      }
      {...CHART_LINE}
    />
  ));
}

// What happened at the point: beside it from `sm`, on the side with more
// room, and under the chart on phones, where it isn't positioned and its
// offset does nothing.
function EventNote({ event }: { event: ChartEvent }) {
  return (
    <div
      className="mt-3 rounded-sm bg-surface px-4 py-3 shadow-pop sm:absolute sm:top-0 sm:mt-0 sm:w-[min(18rem,calc(50%-1rem))]"
      style={
        event.x < 50
          ? { left: `calc(${event.x}% + 1rem)` }
          : { right: `calc(${100 - event.x}% + 1rem)` }
      }
    >
      <p className="text-sm font-bold">{event.title}</p>
      <p className="text-caption text-ink-muted">{event.detail}</p>
    </div>
  );
}

type LineChartPlotProps = {
  /** The amounts on the left, top first. */
  yTicks: readonly ChartTick[];
  /** The days under the plot. */
  xTicks: readonly ChartTick[];
  /** What the chart says, as its image's name. */
  label: string;
  /** The point it singles out, with its guide down and its note. */
  event?: ChartEvent | undefined;
  /** Its lines and areas, on a 100 by 100 SVG stretched to the plot. */
  children: ReactNode;
  /** What goes over the plot in HTML, so it never stretches: its dots. */
  overlay?: ReactNode;
};

// The dashed guide down from the point that stands out.
function EventGuide({ event }: { event: ChartEvent }) {
  return (
    <line
      x1={event.x}
      x2={event.x}
      y1={event.y}
      y2="100"
      strokeWidth="1"
      strokeDasharray="3 3"
      className="stroke-primary"
      {...CHART_LINE}
    />
  );
}

// The plot stretched to its box, with the guide down from the point that
// stands out, and over it, in HTML, the dots and the point's circle.
function PlotImage({
  yTicks,
  label,
  event,
  children,
  overlay,
}: Omit<LineChartPlotProps, "xTicks">) {
  return (
    <div role="img" aria-label={label} className="relative h-48">
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
      >
        <Gridlines ticks={yTicks} />
        {children}
        {event && <EventGuide event={event} />}
      </svg>
      {overlay}
      {event && (
        <span
          aria-hidden
          className="absolute size-3.5 -translate-1/2 rounded-full border-3 border-primary bg-surface"
          style={{ left: `${event.x}%`, top: `${event.y}%` }}
        />
      )}
    </div>
  );
}

/**
 * A chart card's plot (design-system.md §9): the amounts beside it, the
 * days under it, its gridlines, and the point it singles out with its
 * note. The plot is one image whose name says what it shows; the note
 * stays outside it, read.
 */
export function LineChartPlot({ xTicks, ...plot }: LineChartPlotProps) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <AmountLabels ticks={plot.yTicks} />
      <div className="relative">
        <PlotImage {...plot} />
        <DayLabels ticks={xTicks} />
        {plot.event && <EventNote event={plot.event} />}
      </div>
    </div>
  );
}
