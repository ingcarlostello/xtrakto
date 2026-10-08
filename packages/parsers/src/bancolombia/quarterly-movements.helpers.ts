import {
  inferDayMonthDate,
  ok,
  PARSE_WARNING_CODE,
  parseAmountText,
} from "@xtrakto/core";
import type {
  ParsedStatement,
  ParsedTransaction,
  ParseWarning,
  Period,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import {
  maskLongNumbers,
  normalizeDescription,
} from "../descriptions/description.helpers";
import {
  cellText,
  findColumns,
  findLabelRow,
  hasText,
  isBlankRow,
} from "../sheets/sheet.utils";
import type { ColumnRef, SheetRows } from "../sheets/sheet.utils";
import {
  END_MARKER,
  MOVEMENTS_COLUMN,
  PAGE_START_LABELS,
  QUARTERLY_BLOCK,
} from "./bancolombia.constants";
import { parseFailed } from "./quarterly-failure.helpers";

/** The movements of a quarterly statement and the rows it couldn't place. */
export type QuarterlyMovements = Pick<
  ParsedStatement,
  "transactions" | "warnings"
>;

type MovementKey = keyof typeof MOVEMENTS_COLUMN;
type MovementColumns = Readonly<Record<MovementKey, number>>;

type RowContext = {
  readonly columns: MovementColumns;
  readonly period: Period;
  readonly sourceRow: number;
};

/** What a row after the movements header is. */
type RowKind =
  | "end"
  | "movement"
  | "page_start"
  | "page_header_end"
  | "page_header_movement"
  | "skip"
  | "unexpected";

const BLOCK = QUARTERLY_BLOCK.MOVEMENTS;
const DAY_MONTH_PATTERN = /^\d{1,2}\/\d{1,2}$/;

// Safe: findColumns returns one position for each key it was given.
const toPositions = (
  columns: readonly ColumnRef<MovementKey>[],
): MovementColumns =>
  Object.fromEntries(
    columns.map(({ key, index }) => [key, index]),
  ) as MovementColumns;

const findMovementsTable = (
  rows: SheetRows,
): Result<{ readonly start: number; readonly columns: MovementColumns }> => {
  const labelRow = findLabelRow(rows, BLOCK);
  if (labelRow === undefined) {
    return parseFailed({ reason: "missing_block", block: BLOCK });
  }
  const columns = findColumns(rows[labelRow + 1] ?? [], MOVEMENTS_COLUMN);
  if (!columns.ok) {
    return parseFailed({
      reason: "missing_column",
      block: BLOCK,
      column: columns.error,
    });
  }
  return ok({ start: labelRow + 2, columns: toPositions(columns.value) });
};

// A d/mm date, or anything but text where the date goes, which then fails to
// read instead of passing as a stray row.
const looksLikeMovement = (cell: SpreadsheetCell | undefined): boolean => {
  if (cell === null || cell === undefined) return false;
  return typeof cell !== "string" || DAY_MONTH_PATTERN.test(cell.trim());
};

// The order matters: the end marker may follow a page break, and a movement
// among the blocks a page repeats means that page is damaged.
const classifyRow = (
  row: readonly SpreadsheetCell[],
  columns: MovementColumns,
  isSkippingPage: boolean,
): RowKind => {
  const date = row[columns.DATE];
  const isHeaderRow = hasText(date, MOVEMENTS_COLUMN.DATE);
  if (hasText(row[columns.DESCRIPTION], END_MARKER)) return "end";
  if (isSkippingPage) {
    if (isHeaderRow) return "page_header_end";
    return looksLikeMovement(date) ? "page_header_movement" : "skip";
  }
  if (isBlankRow(row) || isHeaderRow) return "skip";
  if (PAGE_START_LABELS.some((label) => hasText(row[0], label))) {
    return "page_start";
  }
  return looksLikeMovement(date) ? "movement" : "unexpected";
};

// The raw text keeps the bank's spacing; both hide long numbers.
const readDescription = (
  text: string,
): Result<
  Pick<ParsedTransaction, "descriptionRaw" | "descriptionNormalized">
> => {
  const descriptionRaw = maskLongNumbers(text);
  return ok({
    descriptionRaw,
    descriptionNormalized: normalizeDescription(descriptionRaw),
  });
};

// Reads the cells of one movement row, failing with the cell's column and row.
const cellReader =
  (row: readonly SpreadsheetCell[], { columns, sourceRow }: RowContext) =>
  <T>(key: MovementKey, read: (text: string) => Result<T>): Result<T> => {
    const location = {
      block: BLOCK,
      column: MOVEMENTS_COLUMN[key],
      row: sourceRow,
    };
    const text = cellText(row[columns[key]]);
    if (text === undefined) {
      return parseFailed({ reason: "missing_value", ...location });
    }
    const value = read(text);
    if (value.ok) return value;
    const cause = value.error.details?.reason;
    return parseFailed({ reason: "invalid_value", ...location, cause });
  };

const readMovement = (
  row: readonly SpreadsheetCell[],
  context: RowContext,
): Result<ParsedTransaction> => {
  const readCell = cellReader(row, context);
  const date = readCell("DATE", (text) =>
    inferDayMonthDate(text, context.period),
  );
  if (!date.ok) return date;
  const description = readCell("DESCRIPTION", readDescription);
  if (!description.ok) return description;
  const amount = readCell("AMOUNT", parseAmountText);
  if (!amount.ok) return amount;
  const balance = readCell("BALANCE", parseAmountText);
  if (!balance.ok) return balance;
  return ok({
    date: date.value,
    ...description.value,
    amountMinor: amount.value,
    balanceAfterMinor: balance.value,
    sourceRow: context.sourceRow,
  });
};

const damagedPage = (row: number): Result<never> =>
  parseFailed({ reason: "incomplete_page_header", block: BLOCK, row });

/**
 * Reads the movements after the first movements header until
 * `FIN ESTADO DE CUENTA`, skipping blank rows and the blocks each new page
 * repeats. Any other row that isn't a movement becomes a warning.
 */
export const readQuarterlyMovements = (
  rows: SheetRows,
  period: Period,
): Result<QuarterlyMovements> => {
  const table = findMovementsTable(rows);
  if (!table.ok) return table;
  const { start, columns } = table.value;
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];
  let isSkippingPage = false;
  for (const [offset, row] of rows.slice(start).entries()) {
    const sourceRow = start + offset;
    const kind = classifyRow(row, columns, isSkippingPage);
    switch (kind) {
      case "end":
        return ok({ transactions, warnings });
      case "page_header_movement":
        return damagedPage(sourceRow);
      case "page_start":
      case "page_header_end":
        isSkippingPage = kind === "page_start";
        break;
      case "unexpected":
        warnings.push({ code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow });
        break;
      case "movement": {
        const movement = readMovement(row, { columns, period, sourceRow });
        if (!movement.ok) return movement;
        transactions.push(movement.value);
        break;
      }
      case "skip":
        break;
    }
  }
  return parseFailed({ reason: "missing_end", block: BLOCK });
};
