import type {
  CalendarMonth,
  CategoryId,
  RecurringPayments,
} from "@xtrakto/core";
import type { PeriodChoices } from "@/components/period-controls/period-controls.types";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";

/** What the URL asks the page for. */
export type RecurringRequest = {
  readonly accountId?: string;
  readonly period?: MovementPeriod;
};

/** An account's payments that repeat, as the page reads them. */
export type AccountRecurring = PeriodChoices & {
  /** The period's last month with movements: the payments paid in it show. */
  readonly month: CalendarMonth | undefined;
  readonly payments: RecurringPayments;
};

/** A month's bar: what was paid in it, against the most of the three. */
export type MonthBar = {
  readonly key: string;
  /** "jul". */
  readonly label: string;
  /** What a screen reader hears: "Julio $162.300". */
  readonly text: string;
  readonly heightPercent: number;
  /** The month the page shows, drawn darker. */
  readonly isShown: boolean;
};

/** A payment of either list, as its row reads. */
export type RecurringRowView = {
  readonly key: string;
  readonly categoryId: CategoryId;
  readonly title: string;
  /** The latest way the bank wrote it, as printed. */
  readonly bankText: string;
  /** "También: “PAGO PSE Electrificadora de S”." */
  readonly alsoText?: string;
  /** "2 cuotas: $1.540.000 y $311.000." */
  readonly installmentsText?: string;
  /** "Mensual · entre el 1 y el 4". */
  readonly cadence: string;
  readonly channels: readonly string[];
  readonly trend: {
    readonly label: string;
    readonly variant: "ok" | "spending" | "neutral";
  };
  readonly hasSeveralChannels: boolean;
  /** "−$182.000", or "$48.000 a $2.090.000" when its amount moves a lot. */
  readonly amount: string;
};
