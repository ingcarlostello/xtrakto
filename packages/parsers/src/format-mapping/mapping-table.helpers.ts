import { APP_ERROR_CODE, err, ok } from "@xtrakto/core";
import type { ExtractedContent, Result, SpreadsheetCell } from "@xtrakto/core";
import {
  comparableText,
  firstSheetRows,
  isBlankCell,
  isBlankRow,
} from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { MIN_HEADER_NAMES } from "./format-mapping.constants";
import { looksLikeAmount, looksLikeDate } from "./mapping-cells.helpers";

type Row = readonly SpreadsheetCell[];

/** Where a spreadsheet's table of movements starts. */
export type TableLocation = {
  /** The header's row, from 0. */
  readonly headerRow: number;
  /** The header's names, as `headerNames` writes them: the format's fingerprint. */
  readonly header: readonly string[];
  /** The column its first movement holds its date in. */
  readonly dateColumn: number;
};

// A digit, or one masked as ADR 0012 masks them.
const DIGIT = /[\d*]/g;

const noTable: Result<never> = err({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
  details: { reason: "no_table" },
});

/**
 * A header's names as a format's fingerprint compares them: as `hasText`
 * compares labels, with each digit as a 9, so "Saldo al 30/09" names the same
 * column in every file. A cell without text has an empty name.
 */
export const headerNames = (row: Row): string[] =>
  row.map((cell) =>
    typeof cell === "string" ? comparableText(cell).replace(DIGIT, "9") : "",
  );

/** Whether a row's names are a header's: its own, or a page's that repeats it. */
export const isHeaderRow = (row: Row, header: readonly string[]): boolean => {
  const names = headerNames(row);
  return (
    names.length === header.length &&
    names.every((name, index) => name === header[index])
  );
};

/** The first row whose names are a header's, if any. */
export const findHeaderRow = (
  rows: SheetRows,
  header: readonly string[],
): number | undefined => {
  const index = rows.findIndex((row) => isHeaderRow(row, header));
  return index === -1 ? undefined : index;
};

// At least three names, each text that's neither a date nor an amount.
const isNamesRow = (row: Row): boolean => {
  const filled = row.filter((cell) => !isBlankCell(cell));
  return (
    filled.length >= MIN_HEADER_NAMES &&
    filled.every(
      (cell) =>
        typeof cell === "string" &&
        !looksLikeDate(cell) &&
        !looksLikeAmount(cell),
    )
  );
};

// A movement's row holds a date in one cell and an amount in another: the
// date's column, if it's one.
const movementDateColumn = (row: Row): number | undefined => {
  const column = row.findIndex(looksLikeDate);
  const hasAmount = row.some(
    (cell, index) => index !== column && looksLikeAmount(cell),
  );
  return column !== -1 && hasAmount ? column : undefined;
};

// The header over a movement's row: the nearest row above it that holds
// something, when it's a row of names that also names the date's column.
const headerOver = (
  rows: SheetRows,
  index: number,
): TableLocation | undefined => {
  const column = movementDateColumn(rows[index] ?? []);
  if (column === undefined) return undefined;
  const above = rows.slice(0, index).findLastIndex((row) => !isBlankRow(row));
  const header = rows[above];
  return header !== undefined &&
    isNamesRow(header) &&
    !isBlankCell(header[column])
    ? { headerRow: above, header: headerNames(header), dateColumn: column }
    : undefined;
};

/**
 * Finds the table of movements in a spreadsheet no parser knows: its header
 * is the last row of names above the first rows that hold a date and an
 * amount, and its names are the format's fingerprint. Nothing above the
 * header, where a bank prints the holder's name and the account, is read.
 */
export const findTable = (content: ExtractedContent): Result<TableLocation> => {
  const rows = firstSheetRows(content) ?? [];
  for (let index = 1; index < rows.length; index++) {
    const table = headerOver(rows, index);
    if (table !== undefined) return ok(table);
  }
  return noTable;
};
