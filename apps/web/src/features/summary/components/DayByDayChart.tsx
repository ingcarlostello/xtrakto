import { Card } from "@/components/ui/card";
import { dayByDayChart } from "../day-by-day-chart.helpers";
import { SUMMARY_COPY } from "../summary.constants";
import type {
  AccountSummary,
  ChartEvent,
  ChartTick,
  DayByDayChartView,
} from "../summary.types";

const COPY = SUMMARY_COPY.chart;
// Lines keep their width and dashes however the plot stretches.
const LINE = { vectorEffect: "non-scaling-stroke", fill: "none" } as const;

// Each line's swatch, 18 by 3px: solid blue, dashed orange.
function Legend({ hasBalance }: { hasBalance: boolean }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-secondary sm:shrink-0">
      {hasBalance && (
        <li className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-[3px] w-[18px] rounded-full bg-moved"
          />
          {COPY.balance}
        </li>
      )}
      <li className="flex items-center gap-2">
        <span aria-hidden className="flex w-[18px] gap-1">
          <span className="h-[3px] flex-1 rounded-full bg-spending" />
          <span className="h-[3px] flex-1 rounded-full bg-spending" />
        </span>
        {COPY.spending}
      </li>
    </ul>
  );
}

// The title and the reading guide, beside the legend from `sm`.
function ChartHeader({ chart }: { chart: DayByDayChartView }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="day-by-day" className="text-section font-bold text-balance">
          {chart.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.guide}</p>
        {chart.note && (
          <p className="text-caption text-ink-muted">{chart.note}</p>
        )}
      </div>
      <Legend hasBalance={chart.balance !== undefined} />
    </div>
  );
}

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
      {...LINE}
    />
  ));
}

// The balance's line, over its area fading from 22% to nothing.
function BalanceLine({ line, area }: { line: string; area: string }) {
  return (
    <>
      <defs>
        <linearGradient id="balance-area" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            style={{ stopColor: "var(--color-moved)", stopOpacity: 0.22 }}
          />
          <stop
            offset="1"
            style={{ stopColor: "var(--color-moved)", stopOpacity: 0 }}
          />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#balance-area)" />
      <polyline
        points={line}
        strokeWidth="2.6"
        strokeLinejoin="round"
        className="stroke-moved"
        {...LINE}
      />
    </>
  );
}

// The plot stretched to its box, with the guide down from the day that
// stands out.
function Lines({ chart }: { chart: DayByDayChartView }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 size-full overflow-visible"
    >
      <Gridlines ticks={chart.yTicks} />
      {chart.balance && <BalanceLine {...chart.balance} />}
      <polyline
        points={chart.spending}
        strokeWidth="2.4"
        strokeDasharray="7 6"
        className="stroke-spending"
        {...LINE}
      />
      {chart.event && (
        <line
          x1={chart.event.x}
          x2={chart.event.x}
          y1={chart.event.y}
          y2="100"
          strokeWidth="1"
          strokeDasharray="3 3"
          className="stroke-primary"
          {...LINE}
        />
      )}
    </svg>
  );
}

// What happened that day: beside its point from `sm`, on the side with
// more room, and under the chart on phones, where it isn't positioned and
// its offset does nothing.
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

// The amounts beside the plot, the days under it. The plot is one image
// whose name says what it shows; the day's note stays outside it, read.
function Plot({ chart }: { chart: DayByDayChartView }) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2">
      <AmountLabels ticks={chart.yTicks} />
      <div className="relative">
        <div role="img" aria-label={chart.label} className="relative h-48">
          <Lines chart={chart} />
          {chart.event && (
            <span
              aria-hidden
              className="absolute size-3.5 -translate-1/2 rounded-full border-3 border-primary bg-surface"
              style={{ left: `${chart.event.x}%`, top: `${chart.event.y}%` }}
            />
          )}
        </div>
        <DayLabels ticks={chart.xTicks} />
        {chart.event && <EventNote event={chart.event} />}
      </div>
    </div>
  );
}

/**
 * "Tu saldo y tu gasto real, día a día" (docs/ui/v8-01, design-system.md §9
 * chart card): the balance as a line with its area and the real spending
 * so far dashed, with their legend, the reading guide, the amounts and days
 * on the axes, and the day the most income came in. Nothing without
 * balances or spending to draw.
 */
export function DayByDayChart({ summary }: { summary: AccountSummary }) {
  const chart = dayByDayChart(summary);
  if (!chart) return null;
  return (
    <section aria-labelledby="day-by-day">
      <Card variant="card" className="gap-5">
        <ChartHeader chart={chart} />
        <Plot chart={chart} />
      </Card>
    </section>
  );
}
