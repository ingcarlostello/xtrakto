import { isAmountMinor, ok, REFERENCE_KIND } from "@xtrakto/core";
import type {
  AmountMinor,
  FormatMapping,
  LocalDate,
  ParsedTransaction,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { detectReferenceKind } from "../bancolombia/movements-export.helpers";
import { movementDescriptions } from "../descriptions/description.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import { cellText, comparableText, isBlankCell } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  looksLikeDate,
  readMappedAmount,
  readMappedDate,
} from "./mapping-cells.helpers";
import { mappedColumns } from "./mapping-columns.helpers";
import type { MappedColumns } from "./mapping-columns.helpers";
import { isHeaderRow } from "./mapping-table.helpers";

type Row = readonly SpreadsheetCell[];

/** A row of a mapped table, as its parse uses it. */
export type TableRow =
  | { readonly kind: "movement"; readonly transaction: ParsedTransaction }
  /** A balance without an amount, such as a "SALDO ANTERIOR" row. */
  | {
      readonly kind: "balance";
      readonly date: LocalDate;
      readonly balance: AmountMinor;
      readonly sourceRow: number;
    }
  /** Neither, such as a subtotal or a note. */
  | { readonly kind: "other"; readonly sourceRow: number };

type Context = {
  readonly mapping: FormatMapping;
  readonly columns: MappedColumns;
  readonly sourceRow: number;
};

type Money = Result<AmountMinor | undefined>;

// Where a cell couldn't be read: its column's name, never its value.
const failedAt = (context: Context, column: number, cause?: unknown) =>
  parseFailed({
    reason: "invalid_value",
    column: context.mapping.header[column] ?? String(column),
    row: context.sourceRow,
    ...(typeof cause === "string" ? { cause } : {}),
  });

// An amount's cell, undefined while empty.
const optionalAmount = (
  row: Row,
  column: number | undefined,
  context: Context,
): Money => {
  const cell = column === undefined ? undefined : row[column];
  if (column === undefined || isBlankCell(cell)) return ok(undefined);
  const amount = readMappedAmount(cell, context.mapping.decimalSeparator);
  return amount.ok
    ? amount
    : failedAt(context, column, amount.error.details?.reason);
};

const nonZero = (amount: AmountMinor | undefined) =>
  amount === 0 ? undefined : amount;

// Money out is negative and money in positive, whatever sign the bank printed.
const signed = (amount: AmountMinor, isOut: boolean): AmountMinor => {
  const value = isOut ? -Math.abs(amount) : Math.abs(amount);
  // A safe integer's absolute value is one too.
  return isAmountMinor(value) ? value : amount;
};

// Money out and money in, each in its own column: one of them at most.
const outOrIn = (row: Row, context: Context): Money => {
  const { moneyOut, moneyIn = 0 } = context.columns;
  const out = optionalAmount(row, moneyOut, context);
  if (!out.ok) return out;
  const into = optionalAmount(row, moneyIn, context);
  if (!into.ok) return into;
  const [outValue, inValue] = [nonZero(out.value), nonZero(into.value)];
  if (outValue !== undefined && inValue !== undefined) {
    return failedAt(context, moneyIn, "both_amounts");
  }
  if (outValue !== undefined) return ok(signed(outValue, true));
  return ok(inValue === undefined ? undefined : signed(inValue, false));
};

// An amount, and the bank's word for which way it went.
const directed = (row: Row, context: Context): Money => {
  const { amount, direction = 0 } = context.columns;
  const read = optionalAmount(row, amount, context);
  if (!read.ok) return read;
  const value = nonZero(read.value);
  if (value === undefined) return ok(undefined);
  const word = comparableText(cellText(row[direction]) ?? "");
  const says = (words: readonly string[] = []) =>
    words.some((each) => comparableText(each) === word);
  const { directionWords } = context.mapping;
  if (says(directionWords?.in)) return ok(signed(value, false));
  if (says(directionWords?.out)) return ok(signed(value, true));
  return failedAt(context, direction, "direction");
};

// A row's amount, as the mapping writes money; undefined when it holds none.
const readMoney = (row: Row, context: Context): Money => {
  const { columns } = context;
  if (columns.moneyOut !== undefined) return outOrIn(row, context);
  if (columns.direction !== undefined) return directed(row, context);
  const amount = optionalAmount(row, columns.amount, context);
  return amount.ok ? ok(nonZero(amount.value)) : amount;
};

// A row's date: undefined when its cell holds none, as a subtotal's or a
// note's. A cell that reads as a date in another format fails.
const readDate = (
  row: Row,
  context: Context,
): Result<LocalDate | undefined> => {
  const { date: column } = context.columns;
  const cell = row[column];
  if (isBlankCell(cell)) return ok(undefined);
  const date = readMappedDate(cell, context.mapping.dateOrder);
  if (date.ok) return date;
  return looksLikeDate(cell)
    ? failedAt(context, column, "date_format")
    : ok(undefined);
};

// A reference stays raw until it's hashed (Phase 5.5a); a number cell's digits
// are its text.
const referenceOf = (
  row: Row,
  column: number | undefined,
): Pick<ParsedTransaction, "referenceRaw" | "referenceKind"> => {
  if (column === undefined) return {};
  const cell = row[column];
  const text =
    typeof cell === "number" && Number.isSafeInteger(cell)
      ? String(cell)
      : cellText(cell);
  return text === undefined
    ? { referenceKind: REFERENCE_KIND.NONE }
    : { referenceRaw: text, referenceKind: detectReferenceKind(text) };
};

type MovementValues = {
  readonly date: LocalDate;
  readonly amount: AmountMinor;
  readonly balance: AmountMinor | undefined;
};

const movementRow = (
  row: Row,
  { date, amount, balance }: MovementValues,
  context: Context,
): Result<TableRow> => {
  const { columns, mapping, sourceRow } = context;
  const description = cellText(row[columns.description]);
  if (description === undefined) {
    const column = mapping.header[columns.description] ?? "";
    return parseFailed({ reason: "missing_value", column, row: sourceRow });
  }
  return ok({
    kind: "movement",
    transaction: {
      date,
      ...movementDescriptions(description),
      amountMinor: amount,
      ...(balance === undefined ? {} : { balanceAfterMinor: balance }),
      ...referenceOf(row, columns.reference),
      sourceRow,
    },
  });
};

// A row the mapping reads, or undefined for a blank one or a page's header.
const readRow = (row: Row, context: Context): Result<TableRow | undefined> => {
  const { columns, mapping, sourceRow } = context;
  const isBlank = [...columns.read].every((index) => isBlankCell(row[index]));
  if (isBlank || isHeaderRow(row, mapping.header)) return ok(undefined);
  const date = readDate(row, context);
  if (!date.ok) return date;
  if (date.value === undefined) return ok({ kind: "other", sourceRow });
  const amount = readMoney(row, context);
  if (!amount.ok) return amount;
  const balance = optionalAmount(row, columns.balance, context);
  if (!balance.ok) return balance;
  if (amount.value !== undefined) {
    const values = { date: date.value, amount: amount.value };
    return movementRow(row, { ...values, balance: balance.value }, context);
  }
  return ok(
    balance.value === undefined
      ? { kind: "other", sourceRow }
      : {
          kind: "balance",
          date: date.value,
          balance: balance.value,
          sourceRow,
        },
  );
};

/**
 * The table's last row with a date, in any order a bank writes one, so dates
 * in another order than the mapping's fail as such: whatever comes under it,
 * such as totals and notes, isn't read.
 */
export const lastDatedRow = (
  rows: SheetRows,
  headerRow: number,
  mapping: FormatMapping,
): number => {
  const { date } = mappedColumns(mapping);
  const last = rows.findLastIndex(
    (row, index) => index > headerRow && looksLikeDate(row[date]),
  );
  return Math.max(last, headerRow);
};

/**
 * The rows of the table under a mapping's header, through its last row with
 * a date, as movements, balances and other rows. A cell the mapping reads
 * that holds what it can't read fails with its row and column.
 */
export const readTable = (
  rows: SheetRows,
  headerRow: number,
  mapping: FormatMapping,
): Result<TableRow[]> => {
  const columns = mappedColumns(mapping);
  const table: TableRow[] = [];
  const last = lastDatedRow(rows, headerRow, mapping);
  for (let sourceRow = headerRow + 1; sourceRow <= last; sourceRow++) {
    const row = readRow(rows[sourceRow] ?? [], { mapping, columns, sourceRow });
    if (!row.ok) return row;
    if (row.value !== undefined) table.push(row.value);
  }
  return ok(table);
};
