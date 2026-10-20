import { type CalendarQuarter, quarterOfMonth } from "@xtrakto/core";
import type { MovementQuarter, UnreconciledStatement } from "@xtrakto/db";
import {
  type MovementPeriod,
  quarterOf,
} from "@/utils/transactions-url.helpers";
import type { QuarterChoice } from "./period-controls.types";

/** Whether a period is a quarter, or falls in it. */
export const isSameQuarter = (
  period: MovementPeriod,
  quarter: CalendarQuarter,
): boolean => {
  const { year, quarter: number } = quarterOf(period);
  return year === quarter.year && number === quarter.quarter;
};

/**
 * The period a page shows: the one the URL asks, when it falls in a quarter
 * with movements, else the latest such quarter. `undefined` when the
 * account has none.
 */
export const selectPeriod = (
  requested: MovementPeriod | undefined,
  quarters: readonly CalendarQuarter[],
): MovementPeriod | undefined => {
  if (requested && quarters.some((q) => isSameQuarter(requested, q)))
    return requested;
  const latest = quarters[0];
  return (
    latest && { kind: "quarter", year: latest.year, quarter: latest.quarter }
  );
};

const quarterOfDate = (date: string): CalendarQuarter => ({
  year: Number(date.slice(0, 4)),
  quarter: quarterOfMonth(Number(date.slice(5, 7))),
});

/**
 * The quarters to choose from, the latest first: those with movements, and
 * those of a statement that doesn't reconcile, which the picker marks
 * whether or not something else counts on their days.
 */
export const quarterChoices = (
  counted: readonly MovementQuarter[],
  unreconciled: readonly UnreconciledStatement[],
): readonly QuarterChoice[] => {
  const choices = new Map<string, QuarterChoice>();
  for (const { verified, ...quarter } of counted)
    choices.set(`${quarter.year}-${quarter.quarter}`, {
      ...quarter,
      status: verified ? "verified" : "unverified",
    });
  for (const { period } of unreconciled) {
    const quarter = quarterOfDate(period.to);
    choices.set(`${quarter.year}-${quarter.quarter}`, {
      ...quarter,
      status: "unreconciled",
    });
  }
  return [...choices.values()].sort(
    (a, b) => b.year - a.year || b.quarter - a.quarter,
  );
};
