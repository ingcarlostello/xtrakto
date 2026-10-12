import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import {
  asSingleSheet,
  firstSheetRows,
  isBlankCell,
  keepCells,
} from "../sheets/sheet.utils";
import { EXPORT_HEADER_ROW } from "./bancolombia.constants";
import { findExportColumns } from "./movements-export.helpers";
import type { ExportColumns } from "./movements-export.helpers";

type Row = readonly SpreadsheetCell[];

// A row with nothing where the parser reads stays as it is: the parser
// rejects it, and emptying its other cells would let it pass as a blank row.
const minimizeMovement = (
  row: Row,
  columns: ExportColumns,
  read: ReadonlySet<number>,
): Row => {
  if ([...read].every((index) => isBlankCell(row[index]))) return row;
  const description = row[columns.DESCRIPTION];
  const masked =
    typeof description === "string"
      ? row.with(columns.DESCRIPTION, maskLongNumbers(description))
      : row;
  return keepCells(masked, read);
};

/**
 * The movements export with only what its parser reads (ADR 0017): one sheet
 * without a name, the header, and each movement's date, description (long
 * numbers masked), reference and amount. References stay whole: the server
 * hashes them with a key the browser doesn't have. Rows keep their positions,
 * so parsing the result gives the same statement.
 */
export const minimizeMovementsExport = (
  content: ExtractedContent,
): ExtractedContent => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return content;
  const header = findExportColumns(rows);
  if (!header.ok) return asSingleSheet(rows);
  const columns = header.value;
  const read = new Set(Object.values(columns));
  return asSingleSheet(
    rows.map((row, index) =>
      index === EXPORT_HEADER_ROW ? row : minimizeMovement(row, columns, read),
    ),
  );
};
