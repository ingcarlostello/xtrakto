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
import type { CoverageGaps } from "@/components/coverage-timeline/coverage-gaps.helpers";
import type { CoverageSegment } from "@/components/coverage-timeline/coverage-timeline.types";
import type {
  ChartEvent,
  ChartTick,
} from "@/components/line-chart/line-chart.types";
import type { FilterChip } from "@/components/filter-chips/filter-chips.types";
import type { MovementTone } from "@/components/movement-icon/movement-icon.types";
import type { PagePeriodChoices } from "@/components/period-controls/period-controls.types";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import type {
  breaksHref,
  transactionsHref,
} from "@/utils/transactions-url.helpers";

/** An account's summary for a period: its movements' figures, and the bank's. */
export type AccountSummary = PagePeriodChoices & {
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
  /**
   * What the account misses (10.2d): its months as its coverage timeline
   * shows them through today (10.2a), and those that ended without
   * movements, with the files that bring them; none when it misses none.
   */
  readonly missing?: {
    readonly segments: readonly CoverageSegment[];
    /** What the timeline shows, in words. */
    readonly sentence: string;
    readonly gaps: CoverageGaps;
    readonly today: LocalDate;
  };
  /**
   * The months it doesn't have between its first and its last
   * (`"2026-04"`), where the chart breaks its lines (10.2d).
   */
  readonly missingMonths: readonly string[];
};

/** "Te falta abril a junio" (docs/ui/v8-13), on the summary (10.2d). */
export type MissingMonthsView = {
  /** "Te falta abril a junio y octubre". */
  readonly title: string;
  /** "Para ver el año completo, sube el extracto trimestral abr–jun." */
  readonly text: string;
  /** "Subir abr–jun", or "Ir a Subir" for several files. */
  readonly action: string;
  readonly segments: readonly CoverageSegment[];
  readonly timelineLabel: string;
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

/** A line of "Tu extracto, traducido" (docs/ui/v8-01), as its card reads. */
export type TranslatedLineView = {
  readonly id: string;
  readonly categoryId: CategoryId | null;
  readonly tone: MovementTone;
  /** "Te llegó plata de otro banco", or the bank's text when nothing names it. */
  readonly title: string;
  /** The title is the bank's text, written as printed. */
  readonly isBankText: boolean;
  /** "PAGO INTERBANC SISTEMAS COLOMB", under a title in plain words. */
  readonly bankText?: string;
  /** "Con el del 30 de julio suman $39,8M." */
  readonly note: string;
  /** "Transferencia". */
  readonly channel?: string;
  readonly isPendingReview: boolean;
  /** "+$31.540.200". */
  readonly amount: string;
  /** Its detail in Movimientos. */
  readonly href: ReturnType<typeof transactionsHref>;
};

/** "Tu extracto, traducido" (docs/ui/v8-01), for one of its filters. */
export type TranslatedStatementView = {
  /** "Todo / Gasto / Movido / Ingresos / Por revisar · 24". */
  readonly filters: readonly FilterChip[];
  readonly lines: readonly TranslatedLineView[];
  /** "Ver los 312 movimientos", in Movimientos with the filter; none without. */
  readonly seeAll?: {
    readonly label: string;
    readonly href: ReturnType<typeof transactionsHref>;
  };
};

/** A label on a chart's axis, and where it goes on the plot, from 0 to 100. */
/** "Tu saldo y tu gasto real, día a día" (docs/ui/v8-01), as its card draws it. */
export type DayByDayChartView = {
  /** "Tu gasto real, día a día" without balances. */
  readonly title: string;
  /** Without balances: "Tus archivos de movimientos no traen saldo." */
  readonly note?: string;
  /**
   * The lines as SVG points on a 100 × 100 plot, its top at 0, one piece
   * for each run of months the account has (10.2d).
   */
  readonly balance?: readonly {
    readonly line: string;
    readonly area: string;
  }[];
  readonly spending: readonly string[];
  /** "$30M" down to "$0", evenly spaced. */
  readonly yTicks: readonly ChartTick[];
  /** "30 jun", "31 jul", "31 ago" and "30 sep". */
  readonly xTicks: readonly ChartTick[];
  readonly event?: ChartEvent;
  /** What the chart says, for screen readers. */
  readonly label: string;
};
