import { type CalendarMonth, formatMonthName } from "@xtrakto/core";
import type { CoverageMonth } from "@xtrakto/db";
import { countText, wordFor } from "@/utils/count-text.utils";
import { joined } from "@/utils/list-text.utils";
import { COVERAGE_COPY as COPY } from "./coverage-timeline.constants";
import type {
  CoverageSegment,
  CoverageStatus,
} from "./coverage-timeline.types";

const lower = (text: string): string => text.toLocaleLowerCase("es-CO");

const isSameMonth = (a: CalendarMonth, b: CalendarMonth): boolean =>
  a.year === b.year && a.month === b.month;

/** Months of one status in a row. */
type Run = {
  readonly status: CoverageStatus;
  readonly from: CalendarMonth;
  readonly to: CalendarMonth;
  readonly count: number;
};

const runsOf = (segments: readonly CoverageSegment[]): Run[] =>
  segments.reduce<Run[]>((runs, { status, month }) => {
    const last = runs.at(-1);
    if (last?.status === status)
      runs[runs.length - 1] = { ...last, to: month, count: last.count + 1 };
    else runs.push({ status, from: month, to: month, count: 1 });
    return runs;
  }, []);

// "Octubre", "Julio y agosto", "Enero a septiembre de 2026", with the year
// where it first shows or changes: "Noviembre de 2025 a enero de 2026".
const monthsText = (
  { from, to, count }: Run,
  mentionedYear: number | undefined,
): string => {
  const link = count === 2 ? COPY.and : COPY.through;
  const last = lower(formatMonthName(to));
  if (from.year !== to.year)
    return `${formatMonthName(from)} ${COPY.ofYear} ${from.year} ${link} ${last} ${COPY.ofYear} ${to.year}`;
  const year = to.year === mentionedYear ? "" : ` ${COPY.ofYear} ${to.year}`;
  return count === 1
    ? `${formatMonthName(from)}${year}`
    : `${formatMonthName(from)} ${link} ${last}${year}`;
};

// What a run's months hold, said of them: with "todavía" when it reaches
// this month, which may still bring more.
const holdsText = (run: Run, isNow: boolean): string => {
  const { unverified, missing } = COPY;
  if (run.status === "verified") return COPY.verified;
  if (run.status === "unverified") {
    const verb = wordFor(run.count, isNow ? unverified.now : unverified.before);
    const balance = isNow
      ? unverified.noBalanceNow
      : unverified.noBalanceBefore;
    return `${verb} ${unverified.inMovements} ${balance}`;
  }
  const yet = isNow ? ` ${missing.yet}` : "";
  return `${missing.not} ${wordFor(run.count, missing.it)} ${missing.have}${yet}.`;
};

/**
 * What a coverage timeline shows, in words, one sentence per run of months:
 * "Enero a septiembre de 2026 completo y verificado. Octubre va en
 * movimientos, sin saldo todavía."
 */
export const coverageSentence = (
  segments: readonly CoverageSegment[],
  current: CalendarMonth,
): string => {
  let mentionedYear: number | undefined;
  return runsOf(segments)
    .map((run) => {
      const text = `${monthsText(run, mentionedYear)} ${holdsText(run, isSameMonth(run.to, current))}`;
      mentionedYear = run.to.year;
      return text;
    })
    .join(" ");
};

// Days within a month, as `"YYYY-MM-DD"`.
type Days = { readonly from: string; readonly to: string };

const dayOf = (date: string): number => Number(date.slice(8, 10));

// A movements file's days within a month: "1–7", or "5" for one.
const daysText = ({ from, to }: Days): string =>
  from === to ? String(dayOf(from)) : `${dayOf(from)}–${dayOf(to)}`;

// A month's movements files, each by its days within the month, in order.
const filesDaysOf = ({ month, files }: CoverageMonth): Days[] => {
  const [year, number] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year ?? 0, number ?? 1, 0)).getUTCDate();
  const start = `${month}-01`;
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return files
    .filter(({ isQuarterly }) => !isQuarterly)
    .map(({ period }) => ({
      from: period.from > start ? period.from : start,
      to: period.to < end ? period.to : end,
    }))
    .sort((a, b) =>
      a.from === b.from
        ? a.to.localeCompare(b.to)
        : a.from.localeCompare(b.from),
    );
};

// Whether any two of a month's files share a day.
const isOverlapping = (days: readonly Days[]): boolean =>
  days.some((day, index) =>
    days.slice(0, index).some((before) => before.to >= day.from),
  );

/**
 * The latest month of `months` whose movements came in two or more movements
 * files with days in common: "Agosto lo subiste también en 3 archivos de
 * movimientos con fechas que se cruzan (1–7, 1–15 y 15–31). Los juntamos sin
 * duplicar y les agregamos 12 referencias."
 */
export const overlapNote = (
  months: readonly CoverageMonth[],
  current: CalendarMonth,
): string | undefined => {
  const month = months.findLast((m) => isOverlapping(filesDaysOf(m)));
  if (!month) return undefined;
  const days = filesDaysOf(month);
  const [year = 0, number = 1] = month.month.split("-").map(Number);
  const named = formatMonthName({ year, month: number });
  const name =
    year === current.year ? named : `${named} ${COPY.ofYear} ${year}`;
  const { note } = COPY;
  const also = month.files.some(({ isQuarterly }) => isQuarterly)
    ? ` ${note.also}`
    : "";
  const added =
    month.references > 0
      ? ` ${note.added} ${countText(month.references, note.references)}`
      : "";
  return `${name} ${note.uploaded}${also} ${note.in} ${countText(days.length, note.files)} ${note.overlapping} (${joined(days.map(daysText))}). ${note.joined}${added}.`;
};
