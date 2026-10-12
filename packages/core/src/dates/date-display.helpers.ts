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
