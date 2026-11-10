import {
  amountFromNumber,
  APP_ERROR_CODE,
  compareLocalDates,
  err,
  localDateFromExcelSerial,
  ok,
  REFERENCE_KIND,
} from "@xtrakto/core";
import type {
  AmountMinor,
  LocalDate,
  ParsedTransaction,
  ReferenceKind,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { movementDescriptions } from "../descriptions/description.helpers";
import {
  columnPositions,
  findColumns,
  isBlankCell,
  isBlankRow,
} from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  ATM_REFERENCE_PREFIX,
  EXPORT_COLUMN,
  EXPORT_DATE_TIME_ZONES,
  EXPORT_HEADER_ROW,
  EXPORT_NO_REFERENCE,
} from "./bancolombia.constants";
import { parseFailed } from "../registry/parse-failure.helpers";

type ExportKey = keyof typeof EXPORT_COLUMN;
/** Where each column of the export is, by key. */
export type ExportColumns = Readonly<Record<ExportKey, number>>;
type FilledCell = Exclude<SpreadsheetCell, null>;

/** How a format writes a movement's date and amount in its cells. */
export type MovementCellReaders = {
  readonly date: (cell: FilledCell) => Result<LocalDate>;
  readonly amount: (cell: FilledCell) => Result<AmountMinor>;
};

type RowContext = {
  readonly columns: ExportColumns;
  readonly readers: MovementCellReaders;
  readonly sourceRow: number;
};

// A Colombian mobile number: 10 digits starting with 3.
const MOBILE_NUMBER_PATTERN = /^3\d{9}$/;

/**
 * What a reference holds, judged by its shape (Appendix A.2): a mobile
 * number, an ATM's location, or any other code (PSE and QR codes, account
 * and contract numbers).
 */
export const detectReferenceKind = (reference: string): ReferenceKind => {
  if (MOBILE_NUMBER_PATTERN.test(reference)) return REFERENCE_KIND.PHONE;
  if (reference.startsWith(ATM_REFERENCE_PREFIX)) return REFERENCE_KIND.ATM;
  return REFERENCE_KIND.CODE;
};

const wrongType = (): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "type" } });

/** A cell's reader from a text's: a cell that isn't text is the wrong type. */
export const fromText =
  <T>(read: (text: string) => Result<T>) =>
  (cell: FilledCell): Result<T> =>
    typeof cell === "string" ? read(cell) : wrongType();

// In the spreadsheet, dates are date cells and amounts numbers: a CSV saved
// from Excel, with both as text, fails here.
const SPREADSHEET_READERS: MovementCellReaders = {
  date: (cell) =>
    typeof cell === "object"
      ? localDateFromExcelSerial(cell.excelSerial, EXPORT_DATE_TIME_ZONES)
      : wrongType(),
  amount: (cell) =>
    typeof cell === "number" ? amountFromNumber(cell) : wrongType(),
};

const readText = fromText((text) => ok(text.trim()));

// Reads one cell of a movement row, failing with the cell's column and row.
const cellReader =
  (row: readonly SpreadsheetCell[], { columns, sourceRow }: RowContext) =>
  <T>(key: ExportKey, read: (cell: FilledCell) => Result<T>): Result<T> => {
    const location = { column: EXPORT_COLUMN[key], row: sourceRow };
    const cell = row[columns[key]] ?? null;
    if (cell === null || isBlankCell(cell)) {
      return parseFailed({ reason: "missing_value", ...location });
    }
    const value = read(cell);
    if (value.ok) return value;
    const cause = value.error.details?.reason;
    return parseFailed({ reason: "invalid_value", ...location, cause });
  };

// The raw reference is kept until persistence, which hashes it. The bank
// writes "null" for some movements without one.
const referenceOf = (
  reference: string | undefined,
): Pick<ParsedTransaction, "referenceRaw" | "referenceKind"> =>
  reference === undefined || reference === EXPORT_NO_REFERENCE
    ? { referenceKind: REFERENCE_KIND.NONE }
    : {
        referenceRaw: reference,
        referenceKind: detectReferenceKind(reference),
      };

const readMovement = (
  row: readonly SpreadsheetCell[],
  context: RowContext,
): Result<ParsedTransaction> => {
  const readCell = cellReader(row, context);
  const date = readCell("DATE", context.readers.date);
  if (!date.ok) return date;
  const description = readCell("DESCRIPTION", readText);
  if (!description.ok) return description;
  const amount = readCell("AMOUNT", context.readers.amount);
  if (!amount.ok) return amount;
  // Many movements have no reference.
  const reference = isBlankCell(row[context.columns.REFERENCE])
    ? ok(undefined)
    : readCell("REFERENCE", readText);
  if (!reference.ok) return reference;
  return ok({
    date: date.value,
    ...movementDescriptions(description.value),
    amountMinor: amount.value,
    ...referenceOf(reference.value),
    sourceRow: context.sourceRow,
  });
};

// The export lists the newest movement first: read bottom-up, the oldest
// comes first. The stable sort then moves any row out of place to its date.
const inDateOrder = (
  transactions: readonly ParsedTransaction[],
): ParsedTransaction[] =>
  transactions
    .toReversed()
    .toSorted((a, b) => compareLocalDates(a.date, b.date));

/** Where each column is, from the header in the export's first row. */
export const findExportColumns = (rows: SheetRows): Result<ExportColumns> => {
  const header = findColumns(rows[EXPORT_HEADER_ROW] ?? [], EXPORT_COLUMN);
  return header.ok
    ? ok(columnPositions(header.value))
    : parseFailed({ reason: "missing_column", column: header.error });
};

/**
 * Reads the movements under the export's header row, oldest first. Every row
 * that isn't blank must be a whole movement, its date and amount as `readers`
 * read them: the spreadsheet's cells by default.
 */
export const readExportMovements = (
  rows: SheetRows,
  readers: MovementCellReaders = SPREADSHEET_READERS,
): Result<ParsedTransaction[]> => {
  const header = findExportColumns(rows);
  if (!header.ok) return header;
  const columns = header.value;
  const transactions: ParsedTransaction[] = [];
  for (const [index, row] of rows.entries()) {
    if (index === EXPORT_HEADER_ROW || isBlankRow(row)) continue;
    const movement = readMovement(row, { columns, readers, sourceRow: index });
    if (!movement.ok) return movement;
    transactions.push(movement.value);
  }
  return ok(inDateOrder(transactions));
};
