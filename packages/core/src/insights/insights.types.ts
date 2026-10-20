import type { CalendarMonth, Period } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";
import type {
  RecurringMonth,
  RecurringPayment,
} from "../recurring/recurring.types";
import type { MovementTotal } from "../summary/summary.types";

/** A quarterly statement's own figures, as the bank prints them. */
export type StatementFigures = {
  /** The statement's, which opens on the previous quarter's last day. */
  readonly period: Period;
  /** SALDO PROMEDIO. */
  readonly averageBalanceMinor: AmountMinor | null;
  /** INTERESES: what the account paid, without its investment's. */
  readonly interestMinor: AmountMinor | null;
};

/** The 4x1000 the bank charged in a period. */
export type GmfTaxInsight = {
  readonly kind: "gmf_tax";
  /** Negative, as its movements are. */
  readonly total: MovementTotal;
  /** From the first day it was charged to the last. */
  readonly days: Period;
};

/** What the savings earned, from the bank's own figures. */
export type SavingsYieldInsight = {
  readonly kind: "savings_yield";
  readonly interestMinor: AmountMinor;
  /** Over the statements' days. */
  readonly averageBalanceMinor: AmountMinor;
  /** The effective annual rate it makes, in percent: 0.05 for 0,05%. */
  readonly annualRatePercent: number;
};

/** Money out whose use the bank doesn't say: cash, or a gateway's payments. */
export type NoDetailInsight = {
  readonly kind: "cash" | "payment_gateways";
  /** Negative, as its movements are. */
  readonly total: MovementTotal;
};

/** A fixed payment that became one in the period. */
export type NewRecurringInsight = {
  readonly kind: "new_recurring";
  readonly payment: RecurringPayment;
  /** The first month it repeats in. */
  readonly since: CalendarMonth;
};

/** A fixed payment whose amount rose. */
export type RecurringRoseInsight = {
  readonly kind: "recurring_rose";
  readonly payment: RecurringPayment;
  readonly percent: number;
  /** Its first month and its last, which the percent compares. */
  readonly from: RecurringMonth;
  readonly to: RecurringMonth;
  /** How much more its last month took. */
  readonly riseMinor: AmountMinor;
};

/** A fact of a period worth a look ("Para revisar"), with its numbers. */
export type Insight =
  | GmfTaxInsight
  | SavingsYieldInsight
  | NoDetailInsight
  | NewRecurringInsight
  | RecurringRoseInsight;

/** An insight in words, as its tile reads it (design-system.md §9). */
export type InsightText = {
  /** "Te cobraron 4x1000", "6 pagos sin tienda identificada". */
  readonly title: string;
  /** What it means, or what to do: "… Revisa si tu cuenta es exenta." */
  readonly note: string;
  /** On the attention surface, with a verb in its note. */
  readonly needsAttention: boolean;
};
