import { TZDate, tz } from "@date-fns/tz";
import { format, isExists } from "date-fns";
import { APP_ERROR_CODE } from "../result/app-error.constants";
import type { ExcelDateTimeZones, LocalDate, Period } from "./date.types";
import type { Result } from "../result/result.types";
import { err, ok } from "../result/result.utils";

const LOCAL_DATE_FORMAT = "yyyy-MM-dd";
const LOCAL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SLASH_DATE_PATTERN = /^(\d{4})\/(\d{2})\/(\d{2})$/;
const DAY_MONTH_PATTERN = /^(\d{1,2})\/(\d{1,2})$/;
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
