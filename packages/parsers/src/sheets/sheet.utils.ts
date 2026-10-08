import { err, ok } from "@xtrakto/core";
import type { Result, SpreadsheetCell } from "@xtrakto/core";

/** A sheet's rows as extracted: cells by position, an empty row as `[]`. */
export type SheetRows = readonly (readonly SpreadsheetCell[])[];

/** Where a header names a column: the key it was asked for and its position. */
export type ColumnRef<K extends string> = {
  readonly key: K;
  readonly name: string;
  readonly index: number;
};

/** A cell's text without surrounding spaces; undefined if it holds no text. */
export const cellText = (
  cell: SpreadsheetCell | undefined,
): string | undefined => {
  if (typeof cell !== "string") return undefined;
  const text = cell.trim();
  return text === "" ? undefined : text;
};

/**
 * Whether a cell holds a label or header name. Every such comparison goes
 * through here, so tolerating accents or case later (Phase 2.7) changes one
 * place.
 */
export const hasText = (
  cell: SpreadsheetCell | undefined,
  expected: string,
): boolean => cellText(cell) === expected;

/** Whether a row holds nothing: no cells, or only empty ones. */
export const isBlankRow = (row: readonly SpreadsheetCell[]): boolean =>
  row.every(
    (cell) => cell === null || (typeof cell === "string" && cell.trim() === ""),
  );

/** Index of the first row whose first cell is `label`. */
export const findLabelRow = (
  rows: SheetRows,
  label: string,
): number | undefined => {
  const index = rows.findIndex((row) => hasText(row[0], label));
  return index === -1 ? undefined : index;
};

/**
 * Finds each named column in a header row, wherever it is. Fails with the
 * name of the first column the header lacks.
 */
export const findColumns = <K extends string>(
  header: readonly SpreadsheetCell[],
  names: Readonly<Record<K, string>>,
): Result<readonly ColumnRef<K>[], string> => {
  const columns: ColumnRef<K>[] = [];
  // Safe: Object.entries types keys as string, and these are the keys of K.
  for (const [key, name] of Object.entries(names) as [K, string][]) {
    const index = header.findIndex((cell) => hasText(cell, name));
    if (index === -1) return err(name);
    columns.push({ key, name, index });
  }
  return ok(columns);
};
