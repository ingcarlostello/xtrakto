import {
  APP_ERROR_CODE,
  err,
  isAmountMinor,
  ok,
  PARSE_WARNING_CODE,
  parseCardDate,
  parsePercentText,
} from "@xtrakto/core";
import type {
  AmountMinor,
  Installment,
  ParsedStatement,
  ParsedTransaction,
  ParseWarning,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { movementDescriptions } from "../descriptions/description.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import {
  cellText,
  columnPositions,
  findColumns,
  findLabelRow,
  hasText,
  isBlankRow,
} from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { readCardAmount } from "../cards/card-readers.helpers";
import {
  CARD_DATE_PATTERN,
  CARD_MOVEMENTS_COLUMN,
  CARD_TABLE,
  INSTALLMENTS_PATTERN,
} from "./card.constants";

type Row = readonly SpreadsheetCell[];
type MovementKey = keyof typeof CARD_MOVEMENTS_COLUMN;

/**
 * What reading a table's rows needs: its label, where its columns are, and
 * the names its header gives them, for a failure to say which.
 */
export type CardTableColumns = {
  readonly label: string;
  readonly columns: Readonly<Record<MovementKey, number>>;
  readonly names: Readonly<Record<MovementKey, string>>;
};

/** Where a table of movements is in a sheet: its columns and its first row. */
export type CardTable = CardTableColumns & { readonly start: number };

/** The movements of a statement's tables and the rows that weren't. */
export type CardMovements = Pick<ParsedStatement, "transactions" | "warnings">;

type RowContext = {
  readonly table: CardTableColumns;
  readonly sourceRow: number;
};

const formatError = (): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "format" } });

/**
 * A table of movements by its label: the label, then a header with every
 * column read. None when the sheet doesn't print it, or prints its label
 * alone, as a currency without movements does.
 */
export const findCardTable = (
  rows: SheetRows,
  label: string,
): Result<CardTable | undefined> => {
  const labelRow = findLabelRow(rows, label);
  const header = labelRow === undefined ? undefined : rows[labelRow + 1];
  if (labelRow === undefined || header === undefined || isBlankRow(header)) {
    return ok(undefined);
  }
  const columns = findColumns(header, CARD_MOVEMENTS_COLUMN);
  if (!columns.ok) {
    return parseFailed({
      reason: "missing_column",
      block: label,
      column: columns.error,
    });
  }
  return ok({
    label,
    start: labelRow + 2,
    columns: columnPositions(columns.value),
    names: CARD_MOVEMENTS_COLUMN,
  });
};

const isTableLabel = (cell: SpreadsheetCell | undefined): boolean =>
  Object.values(CARD_TABLE).some((label) => hasText(cell, label));

/** A table's rows, by their position: up to a blank row or the next table. */
export const tableRows = (
  rows: SheetRows,
  { start }: CardTable,
): (readonly [number, Row])[] => {
  const end = rows.findIndex(
    (row, index) => index >= start && (isBlankRow(row) || isTableLabel(row[0])),
  );
  return rows
    .slice(start, end === -1 ? undefined : end)
    .map((row, offset) => [start + offset, row] as const);
};

/**
 * Whether a row's date cell makes it a movement: a day-first date, or
 * anything but text, which then fails to read instead of passing as a stray
 * row.
 */
export const looksLikeCardMovement = (
  cell: SpreadsheetCell | undefined,
): boolean => {
  if (cell === null || cell === undefined) return false;
  return typeof cell !== "string" || CARD_DATE_PATTERN.test(cell.trim());
};

// The bank prints a charge positive and a payment negative; Xtrakto stores
// money that leaves through the card as negative.
const inXtraktoSigns = (amount: AmountMinor): AmountMinor => {
  const opposite = amount === 0 ? 0 : -amount;
  // The opposite of a safe integer is one too.
  if (!isAmountMinor(opposite)) throw new RangeError("Not an amount");
  return opposite;
};

const installmentOf = (
  text: string,
): Result<Pick<Installment, "number" | "count">> => {
  const [, number = "", count = ""] = INSTALLMENTS_PATTERN.exec(text) ?? [];
  const installment = { number: Number(number), count: Number(count) };
  return installment.number >= 1 && installment.number <= installment.count
    ? ok(installment)
    : formatError();
};

// Reads the cells of one movement row, failing with the cell's column and row.
const cellReader =
  (row: Row, { table, sourceRow }: RowContext) =>
  <T>(key: MovementKey, read: (text: string) => Result<T>): Result<T> => {
    const location = {
      block: table.label,
      column: table.names[key],
      row: sourceRow,
    };
    const text = cellText(row[table.columns[key]]);
    if (text === undefined) {
      return parseFailed({ reason: "missing_value", ...location });
    }
    const value = read(text);
    if (value.ok) return value;
    const cause = value.error.details?.["reason"];
    return parseFailed({ reason: "invalid_value", ...location, cause });
  };

type ReadCell = ReturnType<typeof cellReader>;

// A purchase's installment, when its row says which: what's due this month,
// its rate when it has one, and what remains.
const readInstallment = (
  row: Row,
  { table }: RowContext,
  readCell: ReadCell,
): Result<Installment | undefined> => {
  const { INSTALLMENTS, MONTHLY_RATE } = table.columns;
  if (cellText(row[INSTALLMENTS]) === undefined) return ok(undefined);
  const counts = readCell("INSTALLMENTS", installmentOf);
  if (!counts.ok) return counts;
  const monthly = readCell("MONTHLY", readCardAmount);
  if (!monthly.ok) return monthly;
  const remaining = readCell("REMAINING", readCardAmount);
  if (!remaining.ok) return remaining;
  const hasRate = cellText(row[MONTHLY_RATE]) !== undefined;
  const rate = hasRate ? readCell("MONTHLY_RATE", parsePercentText) : ok(0);
  if (!rate.ok) return rate;
  return ok({
    ...counts.value,
    monthlyMinor: monthly.value,
    ...(hasRate ? { monthlyRatePpm: rate.value } : {}),
    remainingMinor: remaining.value,
  });
};

const readCardMovement = (
  row: Row,
  context: RowContext,
): Result<ParsedTransaction> => {
  const readCell = cellReader(row, context);
  const date = readCell("DATE", parseCardDate);
  if (!date.ok) return date;
  const description = readCell("DESCRIPTION", (text) =>
    ok(movementDescriptions(text)),
  );
  if (!description.ok) return description;
  const amount = readCell("AMOUNT", readCardAmount);
  if (!amount.ok) return amount;
  const installment = readInstallment(row, context, readCell);
  if (!installment.ok) return installment;
  return ok({
    date: date.value,
    ...description.value,
    amountMinor: inXtraktoSigns(amount.value),
    ...(installment.value === undefined
      ? {}
      : { installment: installment.value }),
    sourceRow: context.sourceRow,
  });
};

/**
 * A table's movements from its rows, each with its position; a row whose date
 * cell doesn't make it a movement becomes a warning.
 */
export const readCardTableRows = (
  rows: readonly (readonly [number, Row])[],
  table: CardTableColumns,
): Result<CardMovements> => {
  const transactions: ParsedTransaction[] = [];
  const warnings: ParseWarning[] = [];
  for (const [sourceRow, row] of rows) {
    if (!looksLikeCardMovement(row[table.columns.DATE])) {
      warnings.push({ code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow });
      continue;
    }
    const movement = readCardMovement(row, { table, sourceRow });
    if (!movement.ok) return movement;
    transactions.push(movement.value);
  }
  return ok({ transactions, warnings });
};

// Each table the sheet prints, in its order.
const findTables = (rows: SheetRows): Result<CardTable[]> => {
  const tables: CardTable[] = [];
  for (const label of Object.values(CARD_TABLE)) {
    const table = findCardTable(rows, label);
    if (!table.ok) return table;
    if (table.value !== undefined) tables.push(table.value);
  }
  return ok(tables);
};

/**
 * The movements of the card's sheet in pesos, in Xtrakto's signs: those of
 * the period, then the purchases of earlier statements whose installments go
 * on, each with its installment.
 */
export const readCardMovements = (rows: SheetRows): Result<CardMovements> => {
  const tables = findTables(rows);
  if (!tables.ok) return tables;
  const movements: CardMovements = { transactions: [], warnings: [] };
  for (const table of tables.value) {
    const read = readCardTableRows(tableRows(rows, table), table);
    if (!read.ok) return read;
    movements.transactions.push(...read.value.transactions);
    movements.warnings.push(...read.value.warnings);
  }
  return ok(movements);
};

/**
 * A warning for each movement of the card's sheet in dollars, which a
 * statement in pesos doesn't count (12.2b): only how many there are is read.
 */
export const foreignMovementWarnings = (
  rows: SheetRows,
): Result<ParseWarning[]> => {
  const tables = findTables(rows);
  if (!tables.ok) return tables;
  return ok(
    tables.value.flatMap((table) =>
      tableRows(rows, table)
        .filter(([, row]) => looksLikeCardMovement(row[table.columns.DATE]))
        .map(() => ({ code: PARSE_WARNING_CODE.FOREIGN_CURRENCY })),
    ),
  );
};
