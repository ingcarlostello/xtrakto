import type { PeriodSummary } from "@xtrakto/core";
import type { BankFigures } from "@xtrakto/db";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import type { transactionsHref } from "@/utils/transactions-url.helpers";

/** An account's summary for a period: its movements' figures, and the bank's. */
export type AccountSummary = PeriodChoices & {
  readonly summary: PeriodSummary;
  /** Of the quarterly statements whose days meet the period. */
  readonly bankFigures: readonly BankFigures[];
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
