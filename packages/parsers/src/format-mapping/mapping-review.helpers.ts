import { isAmountMinor, ok, sumAmounts } from "@xtrakto/core";
import type {
  AmountMinor,
  ExtractedContent,
  FormatMapping,
  LocalDate,
  ParsedStatement,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import { firstSheetRows } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { MAX_REVIEW_ROWS } from "./format-mapping.constants";
import { mappingParser } from "./mapping-parser.helpers";
import { lastDatedRow, readTable } from "./mapping-rows.helpers";
import type { TableRow } from "./mapping-rows.helpers";
import { tableEdges } from "./mapping-statement.helpers";
import { findHeaderRow } from "./mapping-table.helpers";

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

/** A row of the table as the file writes it, and what the mapping reads in it. */
export type ReviewRow = {
  readonly cells: readonly SpreadsheetCell[];
  readonly kind: TableRow["kind"];
  /** The balance the file opens with, such as "SALDO ANTERIOR". */
  readonly isOpening: boolean;
};

/** How a file reads with a mapping, as the person confirms it (v8-14). */
export type MappingReview = {
  /** The header's cells, as the file writes them. */
  readonly header: readonly SpreadsheetCell[];
  /** The table's first rows. */
  readonly rows: readonly ReviewRow[];
  /** The row that opens the table with its balance, wherever it is. */
  readonly openingRow?: readonly SpreadsheetCell[];
  /** The table's rows after those. */
  readonly moreRows: number;
  /** Where the table starts and ends, as a spreadsheet numbers its rows. */
  readonly firstRow: number;
  readonly lastRow: number;
  readonly test: MappingTest;
};

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

const reviewRows = (
  rows: SheetRows,
  table: readonly TableRow[],
  width: number,
): Pick<MappingReview, "rows" | "openingRow"> => {
  const opening = tableEdges(table).opening?.sourceRow;
  return {
    rows: table.slice(0, MAX_REVIEW_ROWS).map((row) => ({
      cells: cellsOf(rows[sourceRowOf(row)], width),
      kind: row.kind,
      isOpening: row.kind === "balance" && row.sourceRow === opening,
    })),
    ...(opening === undefined
      ? {}
      : { openingRow: cellsOf(rows[opening], width) }),
  };
};

/**
 * How a spreadsheet reads with a mapping, for the person to confirm it
 * before anything is sent (11.3a): its header and first rows as the file
 * writes them, the rows the table spans, and what its movements add up to,
 * against its balances when it prints them. Fails as its parse does.
 */
export const reviewMapping = (
  content: ExtractedContent,
  mapping: FormatMapping,
): Result<MappingReview> => {
  const rows = firstSheetRows(content);
  if (rows === undefined) return parseFailed({ reason: "content_type" });
  const headerRow = findHeaderRow(rows, mapping.header);
  if (headerRow === undefined) {
    return parseFailed({ reason: "missing_block", block: "header" });
  }
  const statement = mappingParser(mapping).parse(content);
  if (!statement.ok) return statement;
  const table = readTable(rows, headerRow, mapping);
  if (!table.ok) return table;
  const width = mapping.header.length;
  return ok({
    header: cellsOf(rows[headerRow], width),
    ...reviewRows(rows, table.value, width),
    moreRows: Math.max(0, table.value.length - MAX_REVIEW_ROWS),
    // Spreadsheets number their rows from 1.
    firstRow: headerRow + 2,
    lastRow: lastDatedRow(rows, headerRow, mapping) + 1,
    test: mappingTest(statement.value),
  });
};
