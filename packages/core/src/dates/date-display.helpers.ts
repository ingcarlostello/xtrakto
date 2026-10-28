import { TZDate, tz } from "@date-fns/tz";
import {
  addDays,
  format,
  getDaysInMonth,
  getISODay,
  isSameMonth,
  isSameYear,
  min,
} from "date-fns";
import { es } from "date-fns/locale";
import type {
  CalendarMonth,
  CalendarQuarter,
  LocalDate,
  Period,
} from "./date.types";

// Spanish month abbreviations as the design writes them ("sep", not Intl's
// "sept."), from date-fns' Spanish locale.
const formatDate = (date: Date, pattern: string): string =>
  format(date, pattern, { locale: es });

const toDate = (date: LocalDate): TZDate => {
  const [year, month, day] = date.split("-").map(Number);
  return new TZDate(year ?? 0, (month ?? 1) - 1, day ?? 1, "UTC");
};

/**
 * A statement's own period, by its months: `"jul–sep 2026"`, `"ago 2026"`,
 * `"dic 2026 – feb 2027"`. Bancolombia's quarterly statement opens on the
 * last day of the previous quarter (2026/06/30 for July to September), so the
 * months start the day after.
 */
export const formatMonthRange = ({ from, to }: Period): string => {
  const end = toDate(to);
  const start = min([addDays(toDate(from), 1), end]);
  if (isSameMonth(start, end)) return formatDate(end, "MMM yyyy");
  if (isSameYear(start, end)) {
    return `${formatDate(start, "MMM")}–${formatDate(end, "MMM yyyy")}`;
  }
  return `${formatDate(start, "MMM yyyy")} – ${formatDate(end, "MMM yyyy")}`;
};

const capitalized = (text: string): string =>
  `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

/** A quarter as the period selector names it: `"Jul – sep 2026"`. */
export const formatQuarter = ({ year, quarter }: CalendarQuarter): string => {
  const first = new TZDate(year, quarter * 3 - 3, 1, "UTC");
  const last = new TZDate(year, quarter * 3 - 1, 1, "UTC");
  return `${capitalized(formatDate(first, "MMM"))} – ${formatDate(last, "MMM yyyy")}`;
};

/** A month's name, as a heading or an option: `"Agosto"`. */
export const formatMonthName = ({ year, month }: CalendarMonth): string =>
  capitalized(formatDate(new TZDate(year, month - 1, 1, "UTC"), "MMMM"));

/** A month's short name, as under a chart's bar: `"sep"`. */
export const formatShortMonth = ({ year, month }: CalendarMonth): string =>
  formatDate(new TZDate(year, month - 1, 1, "UTC"), "MMM");

const DAYS_A_WEEK = 7;

/**
 * A month's days by week, Monday first, as a calendar draws them: `null`
 * before its first day and after its last.
 */
export const monthWeeks = ({
  year,
  month,
}: CalendarMonth): readonly (readonly (number | null)[])[] => {
  const first = new TZDate(year, month - 1, 1, "UTC");
  const cells = [
    ...Array.from({ length: getISODay(first) - 1 }, () => null),
    ...Array.from({ length: getDaysInMonth(first) }, (_, index) => index + 1),
  ];
  return Array.from(
    { length: Math.ceil(cells.length / DAYS_A_WEEK) },
    (_, week) =>
      Array.from(
        { length: DAYS_A_WEEK },
        (_, day) => cells[week * DAYS_A_WEEK + day] ?? null,
      ),
  );
};

/** A day on a chart's axis: `"31 jul"`. */
export const formatShortDay = (date: LocalDate): string =>
  formatDate(toDate(date), "d MMM");

/** A day in running text, without its year: `"1 de noviembre"`. */
export const formatDayInWords = (date: LocalDate): string =>
  formatDate(toDate(date), "d 'de' MMMM");

/**
 * Some days in running text, without their year: `"el 10 de julio"`,
 * `"del 10 al 18 de julio"`, `"del 28 de julio al 3 de agosto"`.
 */
export const formatDaysInWords = ({ from, to }: Period): string => {
  if (from === to) return `el ${formatDayInWords(to)}`;
  const start = isSameMonth(toDate(from), toDate(to))
    ? formatDate(toDate(from), "d")
    : formatDayInWords(from);
  return `del ${start} al ${formatDayInWords(to)}`;
};

/**
 * A day with its weekday, as a heading: `"Miércoles 30 de septiembre"`, or
 * `"Miércoles 31 de diciembre de 2025"` with its year.
 */
export const formatWeekdayInWords = (
  date: LocalDate,
  { withYear }: { readonly withYear: boolean },
): string => {
  const pattern = withYear ? "EEEE d 'de' MMMM 'de' yyyy" : "EEEE d 'de' MMMM";
  return capitalized(formatDate(toDate(date), pattern));
};

/**
 * A range of days, such as the movements of a file: `"1–15 ago 2026"`,
 * `"3 ago 2026"`, `"28 jul – 3 ago 2026"`, `"28 dic 2026 – 3 ene 2027"`.
 */
export const formatDayRange = ({ from, to }: Period): string => {
  const start = toDate(from);
  const end = toDate(to);
  if (from === to) return formatDate(end, "d MMM yyyy");
  if (isSameMonth(start, end)) {
    return `${formatDate(start, "d")}–${formatDate(end, "d MMM yyyy")}`;
  }
  if (isSameYear(start, end)) {
    return `${formatDate(start, "d MMM")} – ${formatDate(end, "d MMM yyyy")}`;
  }
  return `${formatDate(start, "d MMM yyyy")} – ${formatDate(end, "d MMM yyyy")}`;
};

// Colombia's day periods, with a no-break space so they never split. Not
// date-fns' Spanish ("a.m."), nor Intl's, whose spaces change with each
// Node's ICU: CI's Node 22 wrote them unlike a Mac's.
const DAY_PERIODS = { am: "a.\u00a0m.", pm: "p.\u00a0m." } as const;

/**
 * The time of an instant in a time zone, as Colombia writes it: `"8:42 a. m."`,
 * `"12:05 a. m."` past midnight, `"6:05 p. m."`.
 */
export const formatTimeOfDay = (instant: Date, timeZone: string): string => {
  const inZone = { in: tz(timeZone) };
  const isMorning = Number(format(instant, "H", inZone)) < 12;
  const period = isMorning ? DAY_PERIODS.am : DAY_PERIODS.pm;
  return `${format(instant, "h:mm", inZone)} ${period}`;
};
