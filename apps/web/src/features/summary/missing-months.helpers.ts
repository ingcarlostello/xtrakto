import {
  type CalendarMonth,
  type CalendarQuarter,
  formatMonthName,
  formatShortMonth,
  type LocalDate,
} from "@xtrakto/core";
import type { AccountCoverage } from "@xtrakto/db";
import {
  coverageGaps,
  type GapFile,
  monthsMissing,
} from "@/components/coverage-timeline/coverage-gaps.helpers";
import { coverageViewOf } from "@/components/coverage-timeline/coverage-timeline.helpers";
import { PAGE_COPY } from "@/components/empty-state/empty-states.constants";
import { wordFor } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { SUMMARY_COPY } from "./summary.constants";
import type { AccountSummary, MissingMonthsView } from "./summary.types";

const COPY = SUMMARY_COPY.missing;

/**
 * What an account misses through `today` in Bogotá (10.2d): its timeline
 * with its months that ended without movements, and the months the chart
 * skips, from the coverage of the user's accounts.
 */
export const missingOf = (
  coverage: readonly AccountCoverage[],
  accountId: string,
  today: LocalDate,
): Pick<AccountSummary, "missing" | "missingMonths"> => {
  const found = coverage.find((account) => account.accountId === accountId);
  if (!found) return { missingMonths: [] };
  const { segments, sentence } = coverageViewOf(found, today);
  const gaps = coverageGaps(segments, today);
  return {
    missingMonths: monthsMissing(found),
    ...(gaps ? { missing: { segments, sentence, gaps, today } } : {}),
  };
};

const nameOf = (month: CalendarMonth): string =>
  formatMonthName(month).toLocaleLowerCase("es-CO");

// " de 2025" after what isn't of this year.
const yearOf = (year: number, current: number): string =>
  year === current ? "" : ` ${COPY.of} ${year}`;

// A run's words, with its year when it isn't this one: each month of one or
// two ("julio", "agosto", or "noviembre", "diciembre de 2025"), else "abril
// a junio", or "noviembre de 2025 a enero de 2026" across a new year.
const runWords = (run: readonly CalendarMonth[], current: number): string[] => {
  const [first] = run;
  const last = run.at(-1);
  if (!first || !last) return [];
  if (first.year !== last.year)
    return run.length === 2
      ? run.map((month) => `${nameOf(month)}${yearOf(month.year, current)}`)
      : [
          `${nameOf(first)} ${COPY.of} ${first.year} ${COPY.through} ${nameOf(last)} ${COPY.of} ${last.year}`,
        ];
  const year = yearOf(last.year, current);
  if (run.length === 1) return [`${nameOf(first)}${year}`];
  return run.length === 2
    ? [nameOf(first), `${nameOf(last)}${year}`]
    : [`${nameOf(first)} ${COPY.through} ${nameOf(last)}${year}`];
};

// "abr–jun", or "oct–dic 2025" of another year.
const quarterWords = (
  { year, quarter }: CalendarQuarter,
  current: number,
): string => {
  const first = formatShortMonth({ year, month: quarter * 3 - 2 });
  const last = formatShortMonth({ year, month: quarter * 3 });
  return `${first}–${last}${year === current ? "" : ` ${year}`}`;
};

// What a file brings, as its button names it: "abr–jun", "octubre", or
// "oct–nov" for two months of movements.
const fileWords = (file: GapFile, current: number): string => {
  if (file.kind === "quarterly") return quarterWords(file.quarter, current);
  const [first] = file.months;
  const last = file.months.at(-1);
  if (file.months.length === 1 || !first || !last)
    return file.months.map(nameOf).join(" ");
  return `${formatShortMonth(first)}–${formatShortMonth(last)}`;
};

// "el extracto trimestral abr–jun y los movimientos de octubre".
const filesText = (files: readonly GapFile[], current: number): string => {
  const quarters = files.flatMap((file) =>
    file.kind === "quarterly" ? [quarterWords(file.quarter, current)] : [],
  );
  const months = files.flatMap((file) =>
    file.kind === "movements"
      ? file.months.map((m) => `${nameOf(m)}${yearOf(m.year, current)}`)
      : [],
  );
  return joined([
    ...(quarters.length > 0
      ? [`${wordFor(quarters.length, COPY.quarterly)} ${joined(quarters)}`]
      : []),
    ...(months.length > 0 ? [`${COPY.movements} ${joined(months)}`] : []),
  ]);
};

/**
 * "Te falta abril a junio" (docs/ui/v8-13): the months the account misses,
 * which files bring them, and the way to Subir, naming the one file when
 * there is one. `undefined` when it misses none.
 */
export const missingMonthsView = ({
  missing,
}: Pick<AccountSummary, "missing">): MissingMonthsView | undefined => {
  if (!missing) return undefined;
  const { gaps, today, segments, sentence } = missing;
  const current = Number(today.slice(0, 4));
  const [only] = gaps.files;
  return {
    title: `${COPY.title} ${joined(gaps.runs.flatMap((run) => runWords(run, current)))}`,
    text: `${COPY.toSee} ${filesText(gaps.files, current)}.`,
    action:
      gaps.files.length === 1 && only
        ? `${COPY.upload} ${fileWords(only, current)}`
        : PAGE_COPY.uploadAction,
    segments,
    timelineLabel: sentence,
  };
};
