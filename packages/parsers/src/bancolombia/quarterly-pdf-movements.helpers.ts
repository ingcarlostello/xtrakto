import type { Period, Result, SpreadsheetCell } from "@xtrakto/core";
import {
  cellText,
  columnPositions,
  comparableText,
  findColumns,
} from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  MOVEMENTS_COLUMN,
  PDF_SPLIT_MARK,
  QUARTERLY_BLOCK,
  QUARTERLY_PDF_FOOTERS,
} from "./bancolombia.constants";
import { parseFailed } from "../registry/parse-failure.helpers";
import { readMovementRows } from "./quarterly-movements.helpers";
import type { QuarterlyMovements } from "./quarterly-movements.helpers";

/**
 * Whether a line's text is what each page prints under its table, the bank's
 * contact or the page's number, by what it says.
 */
export const isPageFooter = (text: string): boolean =>
  QUARTERLY_PDF_FOOTERS.some((footer) =>
    comparableText(text).startsWith(comparableText(footer)),
  );

const isFooterRow = (row: readonly SpreadsheetCell[]): boolean => {
  const first = row.map(cellText).find((text) => text !== undefined);
  return first !== undefined && isPageFooter(first);
};

// The PDF prints inside one description the "ñí" a spreadsheet splits into
// two cells ("Compa|¡a" for "Compañía"); both read the same.
const withSplitMarkRestored = (
  row: readonly SpreadsheetCell[],
  descriptionColumn: number,
): SpreadsheetCell[] =>
  row.map((cell, index) =>
    index === descriptionColumn && typeof cell === "string"
      ? cell.replaceAll(PDF_SPLIT_MARK, "ñí")
      : cell,
  );

/**
 * Reads the movements of a quarterly statement's PDF from its table's rows,
 * page after page, as the spreadsheet's are read: each page's header, its
 * movements, and `FIN ESTADO DE CUENTA` after the last one. The pages'
 * footers are left out first, so each movement's row is the same whether
 * they were sent or not.
 */
export const readQuarterlyPdfMovements = (
  rows: SheetRows,
  period: Period,
): Result<QuarterlyMovements> => {
  const columns = findColumns(rows[0] ?? [], MOVEMENTS_COLUMN);
  if (!columns.ok) {
    return parseFailed({
      reason: "missing_block",
      block: QUARTERLY_BLOCK.MOVEMENTS,
    });
  }
  const positions = columnPositions(columns.value);
  const table = rows
    .filter((row) => !isFooterRow(row))
    .map((row) => withSplitMarkRestored(row, positions.DESCRIPTION));
  return readMovementRows(table, { start: 1, columns: positions }, period);
};
