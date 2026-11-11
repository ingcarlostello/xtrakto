import type {
  ExtractedContent,
  FormatMapping,
  SpreadsheetCell,
} from "@xtrakto/core";
import { maskLongNumbers } from "../descriptions/description.helpers";
import {
  asSingleSheet,
  firstSheetRows,
  keepCells,
} from "../sheets/sheet.utils";
import { mappedColumns } from "./mapping-columns.helpers";
import { lastDatedRow } from "./mapping-rows.helpers";
import { findHeaderRow, isHeaderRow } from "./mapping-table.helpers";

type Row = readonly SpreadsheetCell[];

const masked = (cell: SpreadsheetCell): SpreadsheetCell =>
  typeof cell === "string" ? maskLongNumbers(cell) : cell;

/**
 * A spreadsheet read through a mapping with only what its parse reads (ADR
 * 0017): one sheet without a name; nothing above the table's header, where
 * a bank prints the holder's name and the account, or under its last row
 * with a date; the header's names; and in every other row the columns the
 * mapping reads, with long numbers masked in its descriptions (ADR 0012).
 * References stay whole: the server hashes them. Rows keep their positions,
 * so parsing the result gives the same statement.
 */
export const minimizeMapped = (
  mapping: FormatMapping,
  content: ExtractedContent,
): ExtractedContent => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return content;
  const headerRow = findHeaderRow(rows, mapping.header);
  if (headerRow === undefined) return asSingleSheet(rows);
  const { date, description, read } = mappedColumns(mapping);
  const minimizeRow = (row: Row, index: number): Row => {
    if (index < headerRow) return [];
    if (isHeaderRow(row, mapping.header)) return row.map(masked);
    const text = row[description];
    const withMasked =
      text === undefined ? row : row.with(description, masked(text));
    return keepCells(withMasked, read);
  };
  const last = lastDatedRow(rows, headerRow, date);
  return asSingleSheet(rows.slice(0, last + 1).map(minimizeRow));
};
