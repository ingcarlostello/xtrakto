import {
  type CalendarMonth,
  type CalendarQuarter,
  type LocalDate,
  quarterOfMonth,
} from "@xtrakto/core";
import type { AccountCoverage } from "@xtrakto/db";
import {
  monthAtIndex,
  monthIndex,
  monthKey,
  monthOfKey,
  monthsHad,
} from "./coverage-timeline.helpers";
import type { CoverageSegment } from "./coverage-timeline.types";

/** A file the bank gives for months an account misses (10.2d). */
export type GapFile =
  /** A quarter that ended: its quarterly statement. */
  | { readonly kind: "quarterly"; readonly quarter: CalendarQuarter }
  /** Months of the quarter that goes on: their movements. */
  | { readonly kind: "movements"; readonly months: readonly CalendarMonth[] };

/** The months an account misses, and the files that bring them (10.2d). */
export type CoverageGaps = {
  /** Months in a row, the oldest first: abril to junio, then octubre. */
  readonly runs: readonly (readonly CalendarMonth[])[];
  readonly files: readonly GapFile[];
};

const quarterOf = ({ year, month }: CalendarMonth): CalendarQuarter => ({
  year,
  quarter: quarterOfMonth(month),
});

const isSameQuarter = (a: CalendarQuarter, b: CalendarQuarter): boolean =>
  a.year === b.year && a.quarter === b.quarter;

// Months in runs of months in a row.
const runsOf = (months: readonly CalendarMonth[]): CalendarMonth[][] =>
  months.reduce<CalendarMonth[][]>((runs, month) => {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run && last && monthIndex(month) === monthIndex(last) + 1)
      run.push(month);
    else runs.push([month]);
    return runs;
  }, []);

// The file each month comes in: its quarter's statement once the quarter
// ended; else the quarter's movements, which the bank gives for this month
// and the three before, so for any month of the quarter that goes on.
const filesFor = (
  months: readonly CalendarMonth[],
  current: CalendarMonth,
): GapFile[] =>
  months.reduce<GapFile[]>((files, month) => {
    const quarter = quarterOf(month);
    if (!isSameQuarter(quarter, quarterOf(current)))
      return files.some(
        (file) =>
          file.kind === "quarterly" && isSameQuarter(file.quarter, quarter),
      )
        ? files
        : [...files, { kind: "quarterly", quarter }];
    const last = files.at(-1);
    return last?.kind === "movements"
      ? [
          ...files.slice(0, -1),
          { kind: "movements", months: [...last.months, month] },
        ]
      : [...files, { kind: "movements", months: [month] }];
  }, []);

/**
 * What an account's timeline misses (10.2d): its months that ended without
 * movements, after its first, in runs, and the files that bring them, from
 * `today` in Bogotá. `undefined` when it misses none.
 */
export const coverageGaps = (
  segments: readonly CoverageSegment[],
  today: LocalDate,
): CoverageGaps | undefined => {
  const current = monthOfKey(today);
  const missing = segments
    .filter(
      ({ status, month }) =>
        status === "missing" && monthIndex(month) < monthIndex(current),
    )
    .map(({ month }) => month);
  return missing.length === 0
    ? undefined
    : { runs: runsOf(missing), files: filesFor(missing, current) };
};

/**
 * The months an account doesn't have between its first and its last
 * (`"2026-04"`), where a chart breaks its lines (10.2d).
 */
export const monthsMissing = (coverage: AccountCoverage): string[] => {
  const had = monthsHad(coverage);
  const keys = [...had].sort();
  const [first] = keys;
  const last = keys.at(-1);
  if (first === undefined || last === undefined) return [];
  const start = monthIndex(monthOfKey(first));
  return Array.from(
    { length: monthIndex(monthOfKey(last)) - start + 1 },
    (_, index) => monthKey(monthAtIndex(start + index)),
  ).filter((key) => !had.has(key));
};
