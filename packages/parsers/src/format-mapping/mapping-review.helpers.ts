import {
  COLUMN_ROLE,
  DATE_ORDER,
  isAmountMinor,
  ok,
  sumAmounts,
} from "@xtrakto/core";
import type {
  AmountMinor,
  ColumnRole,
  DateOrder,
  DecimalSeparator,
  ExtractedContent,
  FormatMapping,
  LocalDate,
  ParsedStatement,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { firstSheetRows, isBlankRow } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { MAX_REVIEW_ROWS } from "./format-mapping.constants";
import { mappingParser } from "./mapping-parser.helpers";
import { formatsOf, mappingOn } from "./mapping-roles.helpers";
import type { MappingChoices } from "./mapping-roles.helpers";
import { lastDatedRow, readTable } from "./mapping-rows.helpers";
import type { TableRow } from "./mapping-rows.helpers";
import { tableEdges } from "./mapping-statement.helpers";
import { findTable, isHeaderRow } from "./mapping-table.helpers";
import type { TableLocation } from "./mapping-table.helpers";

/** Money that went one way: how many movements, and how much in all. */
export type MoneyWay = {
  readonly count: number;
  readonly totalMinor: AmountMinor;
};

/** What a file's movements add up to with a mapping, for the person to check. */
export type MappingTest = {
  readonly movementCount: number;
  readonly moneyIn: MoneyWay;
  /** Its total is positive: what went out. */
  readonly moneyOut: MoneyWay;
  /** For a file that prints balances. */
  readonly balances?: {
    readonly openingMinor: AmountMinor;
    /** The opening balance and every movement. */
    readonly computedClosingMinor: AmountMinor;
    /** What the file says it closes with, and on which day. */
    readonly closingMinor: AmountMinor;
    readonly closingOn: LocalDate;
    /** Whether every balance chains to the cent. */
    readonly isVerified: boolean;
  };
};

/** A row of the table as the file writes it, and what the mapping read in it. */
export type ReviewRow = {
  readonly cells: readonly SpreadsheetCell[];
  /** What the mapping read in it, when the choices read the file. */
  readonly kind?: TableRow["kind"];
  /** The balance the file opens with, such as "SALDO ANTERIOR". */
  readonly isOpening: boolean;
};

/** What the person's choices read: the mapping they make, and what the file adds up to with it. */
export type MappingReading = {
  readonly mapping: FormatMapping;
  readonly test: MappingTest;
};

/** How a file no parser knows reads with the person's choices, as they confirm them (v8-14). */
export type MappingReview = {
  /** The header's cells, as the file writes them. */
  readonly header: readonly SpreadsheetCell[];
  /** The header's names, as the format compares them: a failure names its column so. */
  readonly names: readonly string[];
  /** The table's first rows. */
  readonly rows: readonly ReviewRow[];
  /** The row that opens the table with its balance, wherever it is. */
  readonly openingRow?: readonly SpreadsheetCell[];
  /** The table's rows after those. */
  readonly moreRows: number;
  /** Where the table starts and ends, as a spreadsheet numbers its rows. */
  readonly firstRow: number;
  readonly lastRow: number;
  /** The roles it read with: the person's, or only the date the code found. */
  readonly roles: readonly ColumnRole[];
  /** The formats it read with: the person's, else those its cells write. */
  readonly dateOrder: DateOrder;
  readonly decimalSeparator: DecimalSeparator;
  /** The mapping and its test when the choices read the whole file; else where they don't. */
  readonly reading: Result<MappingReading>;
};

const { DATE, NONE } = COLUMN_ROLE;

const sourceRowOf = (row: TableRow): number =>
  row.kind === "movement" ? row.transaction.sourceRow : row.sourceRow;

// A row's cells, one for each of the header's columns.
const cellsOf = (row: readonly SpreadsheetCell[] | undefined, width: number) =>
  Array.from({ length: width }, (_, column) => row?.[column] ?? null);

// What went out, as a positive amount.
const outgoing = (amount: AmountMinor): AmountMinor[] => {
  const value = -amount;
  // A safe integer's opposite is one too.
  return amount < 0 && isAmountMinor(value) ? [value] : [];
};

const wayOf = (amounts: readonly AmountMinor[]): MoneyWay => ({
  count: amounts.length,
  totalMinor: sumAmounts(amounts),
});

const balancesOf = (
  statement: ParsedStatement,
): MappingTest["balances"] | undefined => {
  const { openingBalanceMinor, closingBalanceMinor, transactions } = statement;
  if (openingBalanceMinor === undefined || closingBalanceMinor === undefined) {
    return undefined;
  }
  return {
    openingMinor: openingBalanceMinor,
    computedClosingMinor: sumAmounts([
      openingBalanceMinor,
      ...transactions.map(({ amountMinor }) => amountMinor),
    ]),
    closingMinor: closingBalanceMinor,
    closingOn: statement.period.to,
    isVerified: reconcile(statement).balanceVerified,
  };
};

/** What a statement's movements add up to, each way, and with its balances. */
export const mappingTest = (statement: ParsedStatement): MappingTest => {
  const amounts = statement.transactions.map(({ amountMinor }) => amountMinor);
  const balances = balancesOf(statement);
  return {
    movementCount: amounts.length,
    moneyIn: wayOf(amounts.filter((amount) => amount > 0)),
    moneyOut: wayOf(amounts.flatMap(outgoing)),
    ...(balances === undefined ? {} : { balances }),
  };
};

// Only the date the code found, for the person to choose the rest (11.3b).
const startingRoles = ({ header, dateColumn }: TableLocation): ColumnRole[] =>
  header.map((_, column) => (column === dateColumn ? DATE : NONE));

// The table's rows as the file writes them: those under its header that hold
// something, through its last date, but a page's repeated header.
const tableRowIndexes = (
  rows: SheetRows,
  table: TableLocation,
  last: number,
): number[] =>
  Array.from(
    { length: last - table.headerRow },
    (_, offset) => table.headerRow + 1 + offset,
  ).filter((index) => {
    const row = rows[index] ?? [];
    return !isBlankRow(row) && !isHeaderRow(row, table.header);
  });

type Reading = {
  readonly reading: Result<MappingReading>;
  /** The kind of each row it read, by its position. */
  readonly kinds: ReadonlyMap<number, TableRow["kind"]>;
  readonly opening?: number;
};

// What the choices read of the file: the whole of it, or where they stop.
const readingOf = (
  content: ExtractedContent,
  table: TableLocation,
  choices: MappingChoices,
): Reading => {
  const rows = firstSheetRows(content) ?? [];
  const unread = { kinds: new Map<number, TableRow["kind"]>() };
  const mapping = mappingOn(rows, table, choices);
  if (!mapping.ok) return { ...unread, reading: mapping };
  const statement = mappingParser(mapping.value).parse(content);
  if (!statement.ok) return { ...unread, reading: statement };
  const read = readTable(rows, table.headerRow, mapping.value);
  const tableRows = read.ok ? read.value : [];
  return {
    reading: ok({ mapping: mapping.value, test: mappingTest(statement.value) }),
    kinds: new Map(tableRows.map((row) => [sourceRowOf(row), row.kind])),
    opening: tableEdges(tableRows).opening?.sourceRow,
  };
};

/**
 * How a spreadsheet no parser knows reads with the person's choices, as they
 * confirm and correct them (11.3a, 11.3b): its header and first rows as the
 * file writes them, the rows the table spans, the roles and formats it read
 * with, and the mapping they make with what its movements add up to, or
 * where they don't read it. Without choices, it reads with only the date the
 * code found. Fails only when the file holds no table.
 */
export const reviewChoices = (
  content: ExtractedContent,
  choices?: MappingChoices,
): Result<MappingReview> => {
  const located = findTable(content);
  if (!located.ok) return located;
  const table = located.value;
  const rows = firstSheetRows(content) ?? [];
  const width = table.header.length;
  const chosen = { ...choices, roles: choices?.roles ?? startingRoles(table) };
  const date = chosen.roles.indexOf(DATE);
  const last = lastDatedRow(
    rows,
    table.headerRow,
    date === -1 ? table.dateColumn : date,
  );
  const indexes = tableRowIndexes(rows, table, last);
  const { reading, kinds, opening } = readingOf(content, table, chosen);
  const formats = formatsOf(rows, table, chosen);
  return ok({
    header: cellsOf(rows[table.headerRow], width),
    names: table.header,
    rows: indexes.slice(0, MAX_REVIEW_ROWS).map((index) => ({
      cells: cellsOf(rows[index], width),
      // A row the mapping skips holds nothing it reads: no movement.
      ...(reading.ok ? { kind: kinds.get(index) ?? "other" } : {}),
      isOpening: index === opening,
    })),
    ...(opening === undefined
      ? {}
      : { openingRow: cellsOf(rows[opening], width) }),
    moreRows: Math.max(0, indexes.length - MAX_REVIEW_ROWS),
    // Spreadsheets number their rows from 1.
    firstRow: table.headerRow + 2,
    lastRow: last + 1,
    roles: chosen.roles,
    dateOrder: formats.dateOrder ?? DATE_ORDER.DAY_MONTH_YEAR,
    decimalSeparator: formats.decimalSeparator,
    reading,
  });
};
