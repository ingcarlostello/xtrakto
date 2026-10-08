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
} from "./bancolombia.constants";
import { parseFailed } from "./parse-failure.helpers";

type ExportKey = keyof typeof EXPORT_COLUMN;
type ExportColumns = Readonly<Record<ExportKey, number>>;
type FilledCell = Exclude<SpreadsheetCell, null>;

type RowContext = {
  readonly columns: ExportColumns;
  readonly sourceRow: number;
};

const HEADER_ROW = 0;
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

// Dates are date cells and amounts numbers: a CSV saved from Excel, with
// both as text, fails here.
const readDate = (cell: FilledCell): Result<LocalDate> =>
  typeof cell === "object"
    ? localDateFromExcelSerial(cell.excelSerial, EXPORT_DATE_TIME_ZONES)
    : wrongType();

const readAmount = (cell: FilledCell): Result<AmountMinor> =>
  typeof cell === "number" ? amountFromNumber(cell) : wrongType();

const readText = (cell: FilledCell): Result<string> =>
  typeof cell === "string" ? ok(cell.trim()) : wrongType();

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

// The raw reference is kept until persistence, which hashes it.
const referenceOf = (
  reference: string | undefined,
): Pick<ParsedTransaction, "referenceRaw" | "referenceKind"> =>
  reference === undefined
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
  const date = readCell("DATE", readDate);
  if (!date.ok) return date;
  const description = readCell("DESCRIPTION", readText);
  if (!description.ok) return description;
  const amount = readCell("AMOUNT", readAmount);
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
  const header = findColumns(rows[HEADER_ROW] ?? [], EXPORT_COLUMN);
  return header.ok
    ? ok(columnPositions(header.value))
    : parseFailed({ reason: "missing_column", column: header.error });
};

/**
 * Reads the movements under the export's header row, oldest first. Every row
 * that isn't blank must be a whole movement.
 */
export const readExportMovements = (
  rows: SheetRows,
): Result<ParsedTransaction[]> => {
  const header = findExportColumns(rows);
  if (!header.ok) return header;
  const columns = header.value;
  const transactions: ParsedTransaction[] = [];
  for (const [index, row] of rows.entries()) {
    if (index === HEADER_ROW || isBlankRow(row)) continue;
    const movement = readMovement(row, { columns, sourceRow: index });
    if (!movement.ok) return movement;
    transactions.push(movement.value);
  }
  return ok(inDateOrder(transactions));
};
