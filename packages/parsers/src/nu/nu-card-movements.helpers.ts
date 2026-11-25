import {
  APP_ERROR_CODE,
  err,
  isAmountMinor,
  ok,
  PARSE_WARNING_CODE,
  parseCardDate,
  parsePercentText,
  sumAmounts,
} from "@xtrakto/core";
import type {
  AmountMinor,
  Installment,
  ParsedStatement,
  ParsedTransaction,
  ParseWarning,
  Period,
  Result,
} from "@xtrakto/core";
import { readCardAmount } from "../cards/card-readers.helpers";
import { movementDescriptions } from "../descriptions/description.helpers";
import { tableLineCells } from "../pdf-layout/pdf-table.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import {
  NU_LINE,
  NU_WIDTH,
  nuLineKind,
  sameText,
} from "./nu-card-table.helpers";
import type {
  Cells,
  ColumnKey,
  NuColumns,
  NuTable,
} from "./nu-card-table.helpers";
import {
  NU_INSTALLMENTS,
  NU_INTEREST_TEXT,
  NU_MOVEMENTS_COLUMN,
  NU_ROW_TEXT,
  NU_SUB_ROW_MARK,
} from "./nu.constants";

type NuMovements = Pick<ParsedStatement, "transactions" | "warnings">;

/** A movement's row: its first line's cells, and what the lines under it add. */
type NuRow = {
  readonly sourceRow: number;
  readonly cells: Cells;
  readonly date: string[];
  readonly description: string[];
  readonly conversions: { sourceRow: number; text: string; charge: string }[];
  readonly lateInterest: { sourceRow: number; interest: string }[];
};

/** What part of a month's interest a row charges, and where. */
type Charged = {
  readonly sourceRow: number;
  readonly amountMinor: AmountMinor;
};

// A sub-row's line also carries its row's year and its description's end;
// the words of a late interest's sub-row go on under it, not its row's.
const addToRow = (row: NuRow, cells: Cells, columns: NuColumns): void => {
  const date = cells[columns.DATE] ?? null;
  const description = cells[columns.DESCRIPTION] ?? null;
  if (date !== null) row.date.push(date);
  if (description !== null && row.lateInterest.length === 0) {
    row.description.push(description);
  }
};

/** A line of the table: its cells, and its place among the table's lines. */
type TableLine = { readonly cells: Cells; readonly sourceRow: number };

// A conversion charge under a purchase abroad, a movement of its own.
const addConversion = (
  row: NuRow,
  { cells, sourceRow }: TableLine,
  columns: NuColumns,
): void => {
  const text = (cells[columns.AMOUNT] ?? "").replace(NU_SUB_ROW_MARK, "");
  row.conversions.push({ sourceRow, text, charge: cells[columns.TOTAL] ?? "" });
};

const newRow = ({ cells, sourceRow }: TableLine): NuRow => ({
  sourceRow,
  cells,
  date: [],
  description: [],
  conversions: [],
  lateInterest: [],
});

// The table's lines grouped into rows; a line that's none of them, a warning.
const groupRows = (table: NuTable, columns: NuColumns) => {
  const rows: NuRow[] = [];
  const warnings: ParseWarning[] = [];
  table.lines.forEach((placed, sourceRow) => {
    const line = { cells: tableLineCells(placed, NU_WIDTH), sourceRow };
    const kind = nuLineKind(line.cells, columns);
    const row = kind === NU_LINE.ROW ? newRow(line) : rows.at(-1);
    if (kind === NU_LINE.ROW && row !== undefined) rows.push(row);
    if (row === undefined || kind === NU_LINE.STRAY) {
      warnings.push({ code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow });
    } else if (kind === NU_LINE.LATE) {
      const interest = line.cells[columns.INTEREST] ?? "";
      row.lateInterest.push({ sourceRow, interest });
    } else {
      if (kind === NU_LINE.CONVERSION) addConversion(row, line, columns);
      addToRow(row, line.cells, columns);
    }
  });
  return { rows, warnings };
};

type Where = { readonly column: string; readonly row: number };

// A value read, or why it couldn't be, by its column and row.
const readValue = <T>(
  text: string,
  where: Where,
  read: (text: string) => Result<T>,
): Result<T> => {
  if (text.trim() === "") {
    return parseFailed({ reason: "missing_value", ...where });
  }
  const value = read(text);
  if (value.ok) return value;
  const cause = value.error.details?.["reason"];
  return parseFailed({ reason: "invalid_value", ...where, cause });
};

// Reads a row's cell, failing with its column and row.
const cellReader =
  (row: NuRow, columns: NuColumns) =>
  <T>(key: ColumnKey, read: (text: string) => Result<T>): Result<T> =>
    readValue(
      row.cells[columns[key]] ?? "",
      { column: NU_MOVEMENTS_COLUMN[key], row: row.sourceRow },
      read,
    );

const negative = (amount: AmountMinor): AmountMinor => {
  const opposite = amount === 0 ? 0 : -amount;
  // The opposite of a safe integer is one too.
  if (!isAmountMinor(opposite)) throw new RangeError("Not an amount");
  return opposite;
};

/** A purchase's interest of the month: its monthly rate and what it charges. */
type MonthInterest = {
  readonly ratePpm: number;
  readonly amountMinor: AmountMinor;
};

// "2.05% $24.600,00": the rate, then what it charges.
const interestOf = (text: string): Result<MonthInterest> => {
  const [rate = "", ...charged] = text.split(" ");
  const ratePpm = parsePercentText(rate);
  if (!ratePpm.ok) return ratePpm;
  const amount = readCardAmount(charged.join(" "));
  if (!amount.ok) return amount;
  return ok({ ratePpm: ratePpm.value, amountMinor: amount.value });
};

const installmentOf = (
  text: string,
): Result<Pick<Installment, "number" | "count">> => {
  const [, number, count] = NU_INSTALLMENTS.exec(text) ?? [];
  const installment = { number: Number(number), count: Number(count) };
  return installment.number >= 1 && installment.number <= installment.count
    ? ok(installment)
    : err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "format" } });
};

type ReadCell = ReturnType<typeof cellReader>;

/** A purchase's installment and what its rate charges this month. */
type Charge = {
  readonly installment: Installment;
  readonly interest: AmountMinor;
};

const readCharge = (readCell: ReadCell): Result<Charge> => {
  const counts = readCell("INSTALLMENTS", installmentOf);
  if (!counts.ok) return counts;
  const monthly = readCell("MONTHLY", readCardAmount);
  if (!monthly.ok) return monthly;
  const interest = readCell("INTEREST", interestOf);
  if (!interest.ok) return interest;
  const remaining = readCell("REMAINING", readCardAmount);
  if (!remaining.ok) return remaining;
  return ok({
    installment: {
      ...counts.value,
      monthlyMinor: monthly.value,
      monthlyRatePpm: interest.value.ratePpm,
      remainingMinor: remaining.value,
    },
    interest: interest.value.amountMinor,
  });
};

/** What a row gives: its movements, and its part of the month's charges. */
type RowRead = {
  readonly movements: readonly ParsedTransaction[];
  readonly interest: readonly Charged[];
  readonly late: readonly Charged[];
};

// Each conversion charge under a row, a movement on the row's day.
const readConversions = (
  row: NuRow,
  date: ParsedTransaction["date"],
): Result<ParsedTransaction[]> => {
  const movements: ParsedTransaction[] = [];
  for (const { sourceRow, text, charge } of row.conversions) {
    const where = { column: NU_MOVEMENTS_COLUMN.TOTAL, row: sourceRow };
    const amount = readValue(charge, where, readCardAmount);
    if (!amount.ok) return amount;
    movements.push({
      date,
      ...movementDescriptions(text),
      amountMinor: negative(amount.value),
      sourceRow,
    });
  }
  return ok(movements);
};

// What each late interest's sub-row under a row charges.
const readLate = (row: NuRow): Result<Charged[]> => {
  const charged: Charged[] = [];
  for (const { sourceRow, interest } of row.lateInterest) {
    const where = { column: NU_MOVEMENTS_COLUMN.INTEREST, row: sourceRow };
    const read = readValue(interest, where, interestOf);
    if (!read.ok) return read;
    charged.push({ sourceRow, amountMinor: read.value.amountMinor });
  }
  return ok(charged);
};

// A row's movement in Xtrakto's signs: a payment comes back to the card, a
// purchase leaves through it with its installment.
const readMovement = (
  row: NuRow,
  columns: NuColumns,
): Result<{ movement: ParsedTransaction; interest: Charged[] }> => {
  const readCell = cellReader(row, columns);
  const where = { column: NU_MOVEMENTS_COLUMN.DATE, row: row.sourceRow };
  const date = readValue(row.date.join(" "), where, parseCardDate);
  if (!date.ok) return date;
  const amount = readCell("AMOUNT", readCardAmount);
  if (!amount.ok) return amount;
  const description = movementDescriptions(row.description.join(" "));
  const movement = {
    date: date.value,
    ...description,
    sourceRow: row.sourceRow,
  };
  if (sameText(description.descriptionNormalized, NU_ROW_TEXT.PAYMENT)) {
    return ok({
      movement: { ...movement, amountMinor: amount.value },
      interest: [],
    });
  }
  const charge = readCharge(readCell);
  if (!charge.ok) return charge;
  const { installment, interest } = charge.value;
  return ok({
    movement: { ...movement, amountMinor: negative(amount.value), installment },
    interest: [{ sourceRow: row.sourceRow, amountMinor: interest }],
  });
};

const readNuRow = (row: NuRow, columns: NuColumns): Result<RowRead> => {
  const read = readMovement(row, columns);
  if (!read.ok) return read;
  const { movement, interest } = read.value;
  const conversions = readConversions(row, movement.date);
  if (!conversions.ok) return conversions;
  const late = readLate(row);
  if (!late.ok) return late;
  return ok({
    movements: [movement, ...conversions.value],
    interest,
    late: late.value,
  });
};

// The month's interest or late interest: one movement on the period's last
// day, the day before its cut, as Bancolombia dates its own (12.2d), at the
// line of the first row that charges it.
const monthCharge = (
  text: string,
  charged: readonly Charged[],
  period: Period,
): ParsedTransaction[] => {
  const total = sumAmounts(charged.map(({ amountMinor }) => amountMinor));
  const first = charged.find(({ amountMinor }) => amountMinor !== 0);
  if (first === undefined || total === 0) return [];
  return [
    {
      date: period.to,
      ...movementDescriptions(text),
      amountMinor: negative(total),
      sourceRow: first.sourceRow,
    },
  ];
};

/**
 * The movements of Nu's table in Xtrakto's signs: the month's late interest
 * and interest, each one movement on the period's last day; then each row,
 * newest first, as the bank lists them: a payment, or a purchase with its
 * installment, and the conversion charge under a purchase abroad. A line in
 * the table that's none of these becomes a warning.
 */
export const readNuCardMovements = (
  table: NuTable,
  period: Period,
): Result<NuMovements> => {
  if (table.columns === undefined)
    return ok({ transactions: [], warnings: [] });
  if (!table.columns.ok) return table.columns;
  const columns = table.columns.value;
  const { rows, warnings } = groupRows(table, columns);
  const read: RowRead[] = [];
  for (const row of rows) {
    const value = readNuRow(row, columns);
    if (!value.ok) return value;
    read.push(value.value);
  }
  return ok({
    transactions: [
      ...monthCharge(
        NU_INTEREST_TEXT.LATE,
        read.flatMap(({ late }) => late),
        period,
      ),
      ...monthCharge(
        NU_INTEREST_TEXT.INTEREST,
        read.flatMap(({ interest }) => interest),
        period,
      ),
      ...read.flatMap(({ movements }) => movements),
    ],
    warnings,
  });
};
