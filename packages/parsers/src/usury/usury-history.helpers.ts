import {
  type ExtractedContent,
  type LocalDate,
  localDateFromExcelSerial,
  monthPeriod,
  ok,
  type Result,
  type SpreadsheetCell,
} from "@xtrakto/core";
import { parseFailed } from "../registry/parse-failure.helpers";
import {
  comparableText,
  firstSheetRows,
  hasText,
  type SheetRows,
} from "../sheets/sheet.utils";

// The Superintendencia Financiera's "Histórico Tasa de Usura" (12.4a): one
// sheet of blocks, each under its credit modalities' names, with a period's
// first and last days in its first two columns ("DESDE", "HASTA") and,
// under each modality, its "INTERÉS BANCARIO CORRIENTE" and its "TASA DE
// USURA" as fractions. A period was a quarter in the early years, a month
// since; a row with dates and no rates only marks another modality's
// quarter.
const BLOCK = "CRÉDITO DE CONSUMO Y ORDINARIO";
const USURY_HEADER = "TASA DE USURA";
const PPM = 1_000_000;
// Above nothing and under 1,000% a year, as a card's rates (core).
const MOST_PPM = 10_000_000;
// Its dates are days, written at midnight wherever they are read.
const DAYS = { serialTimeZone: "UTC", targetTimeZone: "UTC" } as const;

/** A month's usury rate for consumer and ordinary credit, as the history writes it. */
export type UsuryRead = {
  /** The month's first day. */
  readonly month: LocalDate;
  /** Effective annual, in parts per million: 28,34% is 283,400. */
  readonly rateEaPpm: number;
};

const DECIMAL = /^\d+(?:\.\d+)?$/;

// A number as the Excel stores it, or as a CSV writes it, in text.
const numberOf = (cell: SpreadsheetCell | undefined): number | undefined => {
  if (typeof cell === "number") return cell;
  return typeof cell === "string" && DECIMAL.test(cell.trim())
    ? Number(cell)
    : undefined;
};

const serialOf = (cell: SpreadsheetCell | undefined): number | undefined =>
  cell !== null && typeof cell === "object" ? cell.excelSerial : numberOf(cell);

// Each block's row and the column of its usury rate, under its modality's
// name, which spans two columns: the rate's own header sits in the next row.
const blocksOf = (rows: SheetRows) =>
  rows.flatMap((row, index) => {
    const column = row.findIndex((cell) => hasText(cell, BLOCK));
    if (column < 0) return [];
    const header = rows[index + 1]?.[column + 1];
    const text = typeof header === "string" ? comparableText(header) : "";
    return [
      { index, column: column + 1, isUsury: text.startsWith(USURY_HEADER) },
    ];
  });

// The first day of each month from one day's through another's.
const monthsBetween = (first: LocalDate, last: LocalDate): LocalDate[] => {
  const months: LocalDate[] = [];
  let year = Number(first.slice(0, 4));
  let month = Number(first.slice(5, 7));
  while (`${year}-${String(month).padStart(2, "0")}` <= last.slice(0, 7)) {
    months.push(monthPeriod({ year, month }).from);
    [year, month] = month === 12 ? [year + 1, 1] : [year, month + 1];
  }
  return months;
};

type Block = { readonly index: number; readonly column: number };

// A row's months and rate: none for a row without its rate.
const readRow = (
  row: readonly SpreadsheetCell[],
  { column, index }: Block,
): Result<UsuryRead[]> => {
  const rate = numberOf(row[column]);
  if (rate === undefined) return ok([]);
  const where = { block: BLOCK, row: index };
  const first = localDateFromExcelSerial(serialOf(row[0]) ?? NaN, DAYS);
  const last = localDateFromExcelSerial(serialOf(row[1]) ?? NaN, DAYS);
  if (!first.ok || !last.ok || !first.value.endsWith("-01"))
    return parseFailed({ ...where, reason: "invalid_value", column: "DESDE" });
  const rateEaPpm = Math.round(rate * PPM);
  if (!(rateEaPpm > 0 && rateEaPpm <= MOST_PPM))
    return parseFailed({
      ...where,
      reason: "invalid_value",
      column: USURY_HEADER,
    });
  return ok(
    monthsBetween(first.value, last.value).map((month) => ({
      month,
      rateEaPpm,
    })),
  );
};

// A block's months, from the row under its headers through its last dates.
const monthsOf = (rows: SheetRows, block: Block): Result<UsuryRead[]> => {
  const months: UsuryRead[] = [];
  for (let index = block.index + 2; index < rows.length; index++) {
    const row = rows[index] ?? [];
    if (serialOf(row[0]) === undefined) break;
    const read = readRow(row, { column: block.column, index });
    if (!read.ok) return read;
    months.push(...read.value);
  }
  return ok(months);
};

/**
 * Each month's usury rate for consumer and ordinary credit in the
 * Superintendencia Financiera's history (12.4a), the oldest first: from
 * every block under that modality's name, a quarter's rate for each of its
 * months, and the later row's when two give a month. A history without
 * such a block, or a rate or a date that doesn't read, is `PARSE_FAILED`,
 * naming where, never a value.
 */
export const readUsuryHistory = (
  content: ExtractedContent,
): Result<UsuryRead[]> => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return parseFailed({ reason: "content_type" });
  const blocks = blocksOf(rows);
  if (blocks.length === 0)
    return parseFailed({ reason: "missing_block", block: BLOCK });
  const byMonth = new Map<LocalDate, UsuryRead>();
  for (const block of blocks) {
    if (!block.isUsury)
      return parseFailed({
        reason: "missing_column",
        block: BLOCK,
        column: USURY_HEADER,
      });
    const months = monthsOf(rows, block);
    if (!months.ok) return months;
    for (const read of months.value) byMonth.set(read.month, read);
  }
  return ok(
    [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
  );
};
