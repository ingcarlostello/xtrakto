import { TZDate } from "@date-fns/tz";
import { addDays, format, isSameMonth, isSameYear, min } from "date-fns";
import { es } from "date-fns/locale";
import type { LocalDate, Period } from "./date.types";

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

/** A day in running text, without its year: `"1 de noviembre"`. */
export const formatDayInWords = (date: LocalDate): string =>
  formatDate(toDate(date), "d 'de' MMMM");

/**
 * A day with its weekday, as a heading: `"Miércoles 30 de septiembre"`, or
 * `"Miércoles 31 de diciembre de 2025"` with its year.
 */
export const formatWeekdayInWords = (
  date: LocalDate,
  { withYear }: { readonly withYear: boolean },
): string => {
  const pattern = withYear ? "EEEE d 'de' MMMM 'de' yyyy" : "EEEE d 'de' MMMM";
  const text = formatDate(toDate(date), pattern);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
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
