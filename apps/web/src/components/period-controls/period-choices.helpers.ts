import { type CalendarQuarter, quarterOfMonth } from "@xtrakto/core";
import type { MovementQuarter, UnreconciledStatement } from "@xtrakto/db";
import {
  type MovementPeriod,
  type PagePeriod,
  quarterOf,
} from "@/utils/transactions-url.helpers";
import type { QuarterChoice, YearChoice } from "./period-controls.types";

/** Whether a period is a quarter, or falls in it; a year is neither. */
export const isSameQuarter = (
  period: PagePeriod,
  quarter: CalendarQuarter,
): boolean => {
  if (period.kind === "year") return false;
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

/**
 * The period a page that offers years shows (10.2b): a year the URL asks
 * when the account has quarters in it, else as `selectPeriod` chooses.
 */
export const selectPagePeriod = (
  requested: PagePeriod | undefined,
  quarters: readonly CalendarQuarter[],
): PagePeriod | undefined => {
  if (requested?.kind !== "year") return selectPeriod(requested, quarters);
  const hasYear = quarters.some(({ year }) => year === requested.year);
  return hasYear ? requested : selectPeriod(undefined, quarters);
};

/**
 * The years to choose from, the latest first: those of the quarters, each
 * with how many of its months the account has (`"2026-08"` keys).
 */
export const yearChoices = (
  quarters: readonly CalendarQuarter[],
  months: ReadonlySet<string>,
): readonly YearChoice[] =>
  [...new Set(quarters.map(({ year }) => year))]
    .sort((a, b) => b - a)
    .map((year) => ({
      year,
      months: [...months].filter((key) => key.startsWith(`${year}-`)).length,
    }));

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
