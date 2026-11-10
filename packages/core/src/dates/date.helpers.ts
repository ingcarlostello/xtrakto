import { TZDate, tz } from "@date-fns/tz";
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  format,
  isExists,
  lastDayOfMonth,
  startOfMonth,
} from "date-fns";
import { APP_ERROR_CODE } from "../result/app-error.constants";
import { DATE_ORDER } from "./date.constants";
import type {
  CalendarMonth,
  CalendarQuarter,
  DateOrder,
  ExcelDateTimeZones,
  LocalDate,
  Period,
} from "./date.types";
import type { Result } from "../result/result.types";
import { err, ok } from "../result/result.utils";

const LOCAL_DATE_FORMAT = "yyyy-MM-dd";
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_DATE_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})$/;
const DAY_MONTH_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;
// A day, its month's short Spanish name with or without a dot, and a year.
const SHORT_MONTH_DATE_PATTERN = /^(\d{1,2})\s+(\p{L}+)\.?\s+(\d{4})$/u;
const SHORT_MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(
  " ",
);
// September's short name is also written as Intl writes it.
const SEPTEMBER_ALSO = "sept";
const MONTH_NAMES =
  "enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre".split(
    " ",
  );
// September's whole name is also written without its p.
const SEPTEMBER_WITHOUT_P = "setiembre";
// A day, a month and a year in some order, apart by slashes, dashes, dots or
// spaces, maybe with a time after: "02/09/2026", "2026-09-02", "2-sep-26".
const ORDERED_DATE_PATTERN =
  /^(\d{1,4}|\p{L}+)\.?[\s/.-]+(\d{1,2}|\p{L}+)\.?[\s/.-]+(\d{1,4})(?:[\sT]+\d{1,2}:\d{2}.*)?$/u;
const ONLY_DIGITS = /^\d+$/;
const ONLY_LETTERS = /^\p{L}+$/u;
// A year of two digits is this century's: "26" is 2026.
const CENTURY = 2000;

type DatePart = "day" | "month" | "year";

const PARTS_IN_ORDER: Readonly<
  Record<DateOrder, readonly [DatePart, DatePart, DatePart]>
> = {
  [DATE_ORDER.DAY_MONTH_YEAR]: ["day", "month", "year"],
  [DATE_ORDER.MONTH_DAY_YEAR]: ["month", "day", "year"],
  [DATE_ORDER.YEAR_MONTH_DAY]: ["year", "month", "day"],
};
// Every real day and month exists in a leap year such as 2000.
const LEAP_YEAR = 2000;
// Excel's 1900 date system counts days from 1899-12-30 from serial 61
// (1900-03-01) on. Earlier serials include 1900-02-29, a day that never existed.
const FIRST_RELIABLE_EXCEL_SERIAL = 61;
const EXCEL_SERIAL_LIMIT = 2_958_466; // 10000-01-01, beyond Excel's last date
const EXCEL_SERIAL_OF_UNIX_EPOCH = 25_569; // 1970-01-01
const MS_PER_DAY = 86_400_000;

type DateParseFailure = "format" | "range" | "out_of_period" | "ambiguous";

const parseError = (reason: DateParseFailure): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason } });

/** Orders dates for `Array.prototype.sort`. */
export const compareLocalDates = (a: LocalDate, b: LocalDate): number => {
  if (a === b) return 0;
  // Fixed-width "YYYY-MM-DD" text sorts in calendar order.
  return a < b ? -1 : 1;
};

export const isWithinPeriod = (date: LocalDate, period: Period): boolean =>
  date >= period.from && date <= period.to;

// A local date as midnight UTC, which date-fns counts days on.
const utcMidnight = (date: LocalDate): TZDate => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new TZDate(year, month - 1, day, "UTC");
};

/** The days from one date to another: 92 from 2026-06-30 to 2026-09-30. */
export const daysBetween = (from: LocalDate, to: LocalDate): number =>
  differenceInCalendarDays(utcMidnight(to), utcMidnight(from));

/**
 * The calendar day of an instant in a time zone. Throws on an invalid instant
 * or time zone: both come from code, so either one is a bug.
 */
export const localDateFromInstant = (
  instant: Date,
  timeZone: string,
): LocalDate =>
  // This format always yields "YYYY-MM-DD".
  format(instant, LOCAL_DATE_FORMAT, { in: tz(timeZone) }) as LocalDate;

/** The date some days after another, or before it: 2026-06-30 for -1 from 2026-07-01. */
export const addDaysTo = (date: LocalDate, days: number): LocalDate =>
  localDateFromInstant(addDays(utcMidnight(date), days), "UTC");

/**
 * The calendar month an instant falls in, in a time zone: from its first
 * instant to the next month's first instant, excluded. Limits counted per
 * month in Bogotá use it, whatever the server's own time zone.
 */
export const monthBoundsInTimeZone = (
  instant: Date,
  timeZone: string,
): { readonly start: Date; readonly end: Date } => {
  const start = startOfMonth(instant, { in: tz(timeZone) });
  const end = addMonths(start, 1, { in: tz(timeZone) });
  return { start: new Date(start.getTime()), end: new Date(end.getTime()) };
};

/** The days of a month: `2026-08-01` to `2026-08-31`. */
export const monthPeriod = ({ year, month }: CalendarMonth): Period => {
  const first = new TZDate(year, month - 1, 1, "UTC");
  return {
    from: localDateFromInstant(first, "UTC"),
    to: localDateFromInstant(lastDayOfMonth(first), "UTC"),
  };
};

/** The days of a quarter: `2026-07-01` to `2026-09-30` for the third. */
export const quarterPeriod = ({ year, quarter }: CalendarQuarter): Period => ({
  from: monthPeriod({ year, month: quarter * 3 - 2 }).from,
  to: monthPeriod({ year, month: quarter * 3 }).to,
});

/** The quarter a month falls in: 3 for August. */
export const quarterOfMonth = (month: number): number => Math.ceil(month / 3);

// Month is 1-based. Returns undefined when the day doesn't exist.
const toLocalDate = (
  year: number,
  month: number,
  day: number,
): LocalDate | undefined => {
  if (!isExists(year, month - 1, day)) return undefined;
  return localDateFromInstant(new TZDate(year, month - 1, day, "UTC"), "UTC");
};

/** Checks that a value is a `"YYYY-MM-DD"` string naming a day that exists. */
export const isLocalDate = (value: unknown): value is LocalDate => {
  if (typeof value !== "string") return false;
  const match = LOCAL_DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  return toLocalDate(Number(year), Number(month), Number(day)) !== undefined;
};

/**
 * Converts an Excel date cell (1900 date system). The serial holds wall-clock
 * time in `serialTimeZone`; the result is the day in `targetTimeZone`.
 * Bancolombia's movements export stores local midnight as 05:00 UTC, so it
 * reads with `{ serialTimeZone: "UTC", targetTimeZone: "America/Bogota" }`.
 */
export const localDateFromExcelSerial = (
  serial: number,
  { serialTimeZone, targetTimeZone }: ExcelDateTimeZones,
): Result<LocalDate> => {
  if (!Number.isFinite(serial)) return parseError("format");
  if (serial < FIRST_RELIABLE_EXCEL_SERIAL || serial >= EXCEL_SERIAL_LIMIT) {
    return parseError("range");
  }
  const wallClock = new TZDate(
    Math.round((serial - EXCEL_SERIAL_OF_UNIX_EPOCH) * MS_PER_DAY),
    "UTC",
  );
  const instant = new TZDate(
    wallClock.getFullYear(),
    wallClock.getMonth(),
    wallClock.getDate(),
    wallClock.getHours(),
    wallClock.getMinutes(),
    wallClock.getSeconds(),
    wallClock.getMilliseconds(),
    serialTimeZone,
  );
  return ok(localDateFromInstant(instant, targetTimeZone));
};

/** Parses a statement period date such as `"2026/06/30"`. */
export const parseSlashDate = (text: string): Result<LocalDate> => {
  const match = SLASH_DATE_PATTERN.exec(text.trim());
  if (!match) return parseError("format");
  const [, year, month, day] = match;
  const date = toLocalDate(Number(year), Number(month), Number(day));
  return date === undefined ? parseError("format") : ok(date);
};

// The month a short Spanish name stands for, from 1, or 0 for none.
const shortMonthNumber = (name: string): number => {
  const lowered = name.toLowerCase();
  return SHORT_MONTHS.indexOf(lowered === SEPTEMBER_ALSO ? "sep" : lowered) + 1;
};

/**
 * Parses a date written with its month's short Spanish name, as the movements
 * export's PDF prints it: `"3 sep 2026"` or `"03 ago 2026"`, with or without
 * the name's dot, and September also as `"sept"`.
 */
export const parseShortMonthDate = (text: string): Result<LocalDate> => {
  const match = SHORT_MONTH_DATE_PATTERN.exec(text.trim());
  const month = shortMonthNumber(match?.[2] ?? "");
  if (!match || month === 0) return parseError("format");
  const date = toLocalDate(Number(match[3]), month, Number(match[1]));
  return date === undefined ? parseError("format") : ok(date);
};

// A month by its Spanish name, short or whole, from 1, or 0 for none.
const monthOfName = (name: string): number => {
  const lowered = name.toLowerCase();
  if (lowered === SEPTEMBER_WITHOUT_P) return 9;
  return shortMonthNumber(lowered) || MONTH_NAMES.indexOf(lowered) + 1;
};

// What one of a date's parts says, or 0 when it can't be that part.
const partValue = (part: DatePart, token: string): number => {
  if (part === "month" && ONLY_LETTERS.test(token)) return monthOfName(token);
  if (!ONLY_DIGITS.test(token)) return 0;
  if (part !== "year") return token.length <= 2 ? Number(token) : 0;
  if (token.length === 4) return Number(token);
  return token.length === 2 ? CENTURY + Number(token) : 0;
};

/**
 * Parses a date as a bank's file writes it, its day, month and year in
 * `order`: `"02/09/2026"`, `"2026-09-02"`, `"2-sep-26"`, `"02 SEP 2026
 * 14:35"`. The month may go by its Spanish name, the year by its last two
 * digits, and a time after the date is left out.
 */
export const parseDateInOrder = (
  text: string,
  order: DateOrder,
): Result<LocalDate> => {
  const match = ORDERED_DATE_PATTERN.exec(text.trim());
  if (!match) return parseError("format");
  const values = { day: 0, month: 0, year: 0 };
  PARTS_IN_ORDER[order].forEach((part, index) => {
    values[part] = partValue(part, match[index + 1] ?? "");
  });
  const { day, month, year } = values;
  const date =
    day > 0 && month > 0 && year > 0
      ? toLocalDate(year, month, day)
      : undefined;
  return date === undefined ? parseError("format") : ok(date);
};

const yearOf = (date: LocalDate): number => Number(date.slice(0, 4));

const datesInPeriod = (day: number, month: number, period: Period) => {
  const dates: LocalDate[] = [];
  for (let year = yearOf(period.from); year <= yearOf(period.to); year++) {
    const date = toLocalDate(year, month, day);
    if (date !== undefined && isWithinPeriod(date, period)) dates.push(date);
  }
  return dates;
};

/**
 * Resolves a `d/mm` date without a year (`"1/07"`) to the only matching day
 * inside the statement period, which may cross from December to January.
 */
export const inferDayMonthDate = (
  text: string,
  period: Period,
): Result<LocalDate> => {
  const match = DAY_MONTH_PATTERN.exec(text.trim());
  const day = Number(match?.[1]);
  const month = Number(match?.[2]);
  if (!match || !isExists(LEAP_YEAR, month - 1, day)) {
    return parseError("format");
  }
  const [date, ...others] = datesInPeriod(day, month, period);
  if (date === undefined) return parseError("out_of_period");
  return others.length > 0 ? parseError("ambiguous") : ok(date);
};
