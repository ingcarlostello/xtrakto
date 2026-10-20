import type { PeriodSummary } from "@xtrakto/core";
import type { BankFigures } from "@xtrakto/db";

/** An account's summary for a period: its movements' figures, and the bank's. */
export type AccountSummary = {
  readonly summary: PeriodSummary;
  /** Of the quarterly statements whose days meet the period. */
  readonly bankFigures: readonly BankFigures[];
};
