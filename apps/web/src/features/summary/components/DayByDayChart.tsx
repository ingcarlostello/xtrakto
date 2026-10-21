import { CHART_LINE } from "@/components/line-chart/line-chart.constants";
import { LineChartPlot } from "@/components/line-chart/LineChartPlot";
import { Card } from "@/components/ui/card";
import { dayByDayChart } from "../day-by-day-chart.helpers";
import { SUMMARY_COPY } from "../summary.constants";
import type { AccountSummary, DayByDayChartView } from "../summary.types";

const COPY = SUMMARY_COPY.chart;

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
        {...CHART_LINE}
      />
    </>
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
    <section
      aria-labelledby="day-by-day"
      className="flex flex-col lg:self-stretch"
    >
      {/* As tall as "Dónde se fue más" beside it, as v8 draws it. */}
      <Card variant="card" className="flex-1 gap-5">
        <ChartHeader chart={chart} />
        <LineChartPlot
          yTicks={chart.yTicks}
          xTicks={chart.xTicks}
          label={chart.label}
          event={chart.event}
        >
          {chart.balance && <BalanceLine {...chart.balance} />}
          <polyline
            points={chart.spending}
            strokeWidth="2.4"
            strokeDasharray="7 6"
            className="stroke-spending"
            {...CHART_LINE}
          />
        </LineChartPlot>
      </Card>
    </section>
  );
}
