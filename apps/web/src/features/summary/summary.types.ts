import type { AmountMinor, LocalDate, PeriodSummary } from "@xtrakto/core";
import type { BankFigures, UnreconciledStatement } from "@xtrakto/db";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import type { StatusTone } from "@/components/status-pill/StatusPill";
import type {
  breaksHref,
  transactionsHref,
} from "@/utils/transactions-url.helpers";

/** An account's summary for a period: its movements' figures, and the bank's. */
export type AccountSummary = PeriodChoices & {
  readonly summary: PeriodSummary;
  /** After the period's last movement that printed one; none without. */
  readonly balance: {
    readonly date: LocalDate;
    readonly amountMinor: AmountMinor;
  } | null;
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
