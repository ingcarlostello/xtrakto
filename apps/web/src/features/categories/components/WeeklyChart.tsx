import { CHART_LINE } from "@/components/line-chart/line-chart.constants";
import type { ChartPoint } from "@/components/line-chart/line-chart.types";
import { LineChartPlot } from "@/components/line-chart/LineChartPlot";
import { Card } from "@/components/ui/card";
import { CATEGORIES_COPY } from "../categories.constants";
import type { CategoryDetail, WeeklyChartView } from "../categories.types";
import { weeklyChart } from "../category-weeks.helpers";

const COPY = CATEGORIES_COPY.weeks;

// The title and the reading guide, beside the legend's solid orange swatch
// from `sm`.
function ChartHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-0.5">
        <h2 id="weekly-chart" className="text-section font-bold text-balance">
          {COPY.title}
        </h2>
        <p className="text-caption text-ink-muted">{COPY.guide}</p>
      </div>
      <p className="flex items-center gap-2 text-caption text-ink-secondary sm:shrink-0">
        <span
          aria-hidden
          className="h-[3px] w-[18px] rounded-full bg-spending"
        />
        {COPY.legend}
      </p>
    </div>
  );
}

// The line through each week, over its area fading from 18% to nothing.
function WeeksLine({ chart }: { chart: WeeklyChartView }) {
  return (
    <>
      <defs>
        <linearGradient id="weeks-area" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0"
            style={{ stopColor: "var(--color-spending)", stopOpacity: 0.18 }}
          />
          <stop
            offset="1"
            style={{ stopColor: "var(--color-spending)", stopOpacity: 0 }}
          />
        </linearGradient>
      </defs>
      <polygon points={chart.area} fill="url(#weeks-area)" />
      <polyline
        points={chart.line}
        strokeWidth="2.4"
        strokeLinejoin="round"
        className="stroke-spending"
        {...CHART_LINE}
      />
    </>
  );
}

// A dot a week, in HTML, so it stays round however the plot stretches.
function WeekDots({ points }: { points: readonly ChartPoint[] }) {
  return points.map((point) => (
    <span
      key={point.x}
      aria-hidden
      className="absolute size-2 -translate-1/2 rounded-full bg-spending"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    />
  ));
}

/**
 * "Semana a semana" (docs/ui/v8-06, design-system.md §9 chart card): what
 * the category took each week, a line with its area and a dot a week, the
 * amounts and days on the axes, and the week that stands out. Nothing when
 * the category took nothing in the period.
 */
export function WeeklyChart({ detail }: { detail: CategoryDetail }) {
  const chart = weeklyChart(detail);
  if (!chart) return null;
  return (
    <section aria-labelledby="weekly-chart" className="min-w-0">
      <Card variant="card" className="gap-5">
        <ChartHeader />
        <LineChartPlot
          yTicks={chart.yTicks}
          xTicks={chart.xTicks}
          label={chart.label}
          event={chart.event}
          overlay={<WeekDots points={chart.points} />}
        >
          <WeeksLine chart={chart} />
        </LineChartPlot>
      </Card>
    </section>
  );
}
