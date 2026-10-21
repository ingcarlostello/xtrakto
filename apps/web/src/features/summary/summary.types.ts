import type {
  AmountMinor,
  CategoryId,
  DailyBalances,
  LocalDate,
  PeriodSummary,
  RecurringPayment,
} from "@xtrakto/core";
import type {
  BankFigures,
  PeriodMovement,
  UnreconciledStatement,
} from "@xtrakto/db";
import type {
  ChartEvent,
  ChartTick,
} from "@/components/line-chart/line-chart.types";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import type {
  breaksHref,
  transactionsHref,
} from "@/utils/transactions-url.helpers";

/** An account's summary for a period: its movements' figures, and the bank's. */
export type AccountSummary = PeriodChoices & {
  /** Its movements that count, the oldest first. */
  readonly movements: readonly PeriodMovement[];
  readonly summary: PeriodSummary;
  /** The fixed payments of real spending found in the year that ends with it. */
  readonly fixedPayments: readonly RecurringPayment[];
  /** After the period's last movement that printed one; none without. */
  readonly balance: {
    readonly date: LocalDate;
    readonly amountMinor: AmountMinor;
  } | null;
  /** Day by day, when every movement printed its balance. */
  readonly balances: DailyBalances | null;
  /** Of the quarterly statements whose days meet the period. */
  readonly bankFigures: readonly BankFigures[];
  /** Its statements on the period's days that don't reconcile. */
  readonly unreconciled: readonly UnreconciledStatement[];
};

/** A KPI tile of "Tu trimestre de un vistazo" (docs/ui/v8-01). */
export type GlanceTile = {
  readonly tone: "income" | "spending" | "moved";
  /** "Gasto real". */
  readonly label: string;
  /** Its ring: "45" for 45%. */
  readonly percent: number;
  /** "$24,4M". */
  readonly amount: string;
  /** "El 45% de lo que salió. Créditos, mercado, efectivo y pagos a personas." */
  readonly note: string;
  /** "Ver en qué gastaste", to the period's movements of its kind. */
  readonly action: {
    readonly label: string;
    readonly href: ReturnType<typeof transactionsHref>;
  };
};

/** "Tu cuenta" (docs/ui/v8-01), as its card reads. */
export type AccountCardView = {
  /** "Saldo al 30 de septiembre" and "$6.482.310", when a statement printed it. */
  readonly balance?: { readonly label: string; readonly amount: string };
  /** "Cuenta de ahorros · Bancolombia ••••8821". */
  readonly account: string;
  /** The bank's own, from its quarterly statement: "Saldo promedio", "$10,4M". */
  readonly figures: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly status: {
    readonly tone: StatusTone;
    /** "Saldo verificado". */
    readonly title: string;
    /** "Encadenado con abr–jun 2026 · 312 cuadran". */
    readonly detail: string;
  };
  /** Where a statement that doesn't reconcile breaks. */
  readonly breaksHref?: ReturnType<typeof breaksHref>;
};

/** A tile of "Dónde se fue más" (docs/ui/v8-01, design-system.md §9 insight tile). */
export type SpendingTile = {
  readonly categoryId: CategoryId;
  /** "Créditos", or "Costos del banco · revisar" when it needs a look. */
  readonly title: string;
  /** "$4,6M", "$19.760". */
  readonly amount: string;
  /** "19% de tu gasto real. 1 cuota, entre el 1 y el 4 de cada mes." */
  readonly note: string;
  /** On the attention surface, with a verb in its note. */
  readonly needsAttention: boolean;
};

/** A label on a chart's axis, and where it goes on the plot, from 0 to 100. */
/** "Tu saldo y tu gasto real, día a día" (docs/ui/v8-01), as its card draws it. */
export type DayByDayChartView = {
  /** "Tu gasto real, día a día" without balances. */
  readonly title: string;
  /** Without balances: "Tus archivos de movimientos no traen saldo." */
  readonly note?: string;
  /** The lines as SVG points on a 100 × 100 plot, its top at 0. */
  readonly balance?: { readonly line: string; readonly area: string };
  readonly spending: string;
  /** "$30M" down to "$0", evenly spaced. */
  readonly yTicks: readonly ChartTick[];
  /** "30 jun", "31 jul", "31 ago" and "30 sep". */
  readonly xTicks: readonly ChartTick[];
  readonly event?: ChartEvent;
  /** What the chart says, for screen readers. */
  readonly label: string;
};
