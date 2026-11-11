import type { SpreadsheetCell } from "@xtrakto/core";
import type { DateStyle, NumberStyle } from "./format-mapping.types";

const DAY_MS = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const SHORT_MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(
  " ",
);
// What separates thousands and cents in each written style.
const SEPARATORS = {
  comma: { thousands: ".", cents: "," },
  comma_peso: { thousands: ".", cents: "," },
  point: { thousands: ",", cents: "." },
} as const;

const pad = (number: number): string => String(number).padStart(2, "0");

const partsOf = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return { year, month, day };
};

/** The day some days after another, as `YYYY-MM-DD`. */
export const dayAfter = (date: string, days: number): string => {
  const { year, month, day } = partsOf(date);
  return new Date(Date.UTC(year, month - 1, day) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
};

const writtenDates: Readonly<
  Record<Exclude<DateStyle, "date_cell">, (date: string) => string>
> = {
  dmy_slash: (date) => {
    const { year, month, day } = partsOf(date);
    return `${pad(day)}/${pad(month)}/${year}`;
  },
  dmy_dash: (date) => {
    const { year, month, day } = partsOf(date);
    return `${pad(day)}-${pad(month)}-${year}`;
  },
  dmy_time: (date) => `${writtenDates.dmy_slash(date)} 10:15`,
  dmy_short_year: (date) =>
    writtenDates.dmy_slash(date).replace(/\d\d(\d\d)$/, "$1"),
  dmy_month_name: (date) => {
    const { year, month, day } = partsOf(date);
    return `${pad(day)}-${SHORT_MONTHS[month - 1] ?? ""}-${year}`;
  },
  mdy_slash: (date) => {
    const { year, month, day } = partsOf(date);
    return `${pad(month)}/${pad(day)}/${year}`;
  },
  ymd_dash: (date) => date,
};

/** A date as a layout writes it: text, or a date cell at midnight. */
export const dateCell = (date: string, style: DateStyle): SpreadsheetCell => {
  if (style !== "date_cell") return writtenDates[style](date);
  const { year, month, day } = partsOf(date);
  return {
    excelSerial: (Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / DAY_MS,
  };
};

const grouped = (digits: string, separator: string): string =>
  digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator);

/**
 * An amount in cents as a layout writes it: "-85.400,00", "-85,400.00",
 * "-$ 85.400,00", or a number cell.
 */
export const amountCell = (
  cents: number,
  style: NumberStyle,
): SpreadsheetCell => {
  if (style === "number_cell") return cents / 100;
  const { thousands, cents: mark } = SEPARATORS[style];
  const sign = cents < 0 ? "-" : "";
  const pesos = grouped(String(Math.trunc(Math.abs(cents) / 100)), thousands);
  const written = `${pesos}${mark}${pad(Math.abs(cents) % 100)}`;
  return style === "comma_peso" ? `${sign}$ ${written}` : `${sign}${written}`;
};
