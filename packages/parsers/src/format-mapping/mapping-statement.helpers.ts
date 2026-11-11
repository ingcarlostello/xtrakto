import {
  ACCOUNT_TYPE,
  addDaysTo,
  compareLocalDates,
  CURRENCY,
  isAmountMinor,
  ok,
  PARSE_WARNING_CODE,
  PERIOD_SOURCE,
  parsedStatementSchema,
} from "@xtrakto/core";
import type {
  AmountMinor,
  FormatMapping,
  ParsedStatement,
  ParsedTransaction,
  ParseWarning,
  Period,
  Result,
} from "@xtrakto/core";
import { parseFailed } from "../registry/parse-failure.helpers";
import { MAPPED_FORMAT_ID } from "./format-mapping.constants";
import { inDateOrder, isNewestFirst } from "./mapping-order.helpers";
import type { TableRow } from "./mapping-rows.helpers";

type BalanceRow = Extract<TableRow, { readonly kind: "balance" }>;

/** What a table holds around its movements. */
export type TableEdges = {
  /** The balance row before its first movement, such as "SALDO ANTERIOR". */
  readonly opening?: BalanceRow;
  /** The balance row after its last movement. */
  readonly closing?: BalanceRow;
  /** Every other row that isn't a movement. */
  readonly warnings: readonly ParseWarning[];
};

type Ends = {
  readonly first: ParsedTransaction;
  readonly last: ParsedTransaction;
};

const balanceAt = (table: readonly TableRow[], index: number) => {
  const row = table[index];
  return row?.kind === "balance" ? row : undefined;
};

// In the order the file is read, oldest first: a balance row right before
// the first movement opens the file, and one right after the last closes it;
// any other row that isn't a movement gets a warning.
const edgesOf = (table: readonly TableRow[]): TableEdges => {
  const first = table.findIndex(({ kind }) => kind === "movement");
  const last = table.findLastIndex(({ kind }) => kind === "movement");
  const opening = table.findLastIndex(
    ({ kind }, index) => kind === "balance" && index < first,
  );
  const closing = table.findIndex(
    ({ kind }, index) => kind === "balance" && index > last,
  );
  const warnings = table.flatMap((row, index) => {
    if (row.kind === "movement" || index === opening || index === closing) {
      return [];
    }
    return [
      { code: PARSE_WARNING_CODE.UNEXPECTED_ROW, sourceRow: row.sourceRow },
    ];
  });
  return {
    opening: balanceAt(table, opening),
    closing: balanceAt(table, closing),
    warnings: warnings.toSorted((a, b) => a.sourceRow - b.sourceRow),
  };
};

const movementsOf = (table: readonly TableRow[]): ParsedTransaction[] =>
  table.flatMap((row) => (row.kind === "movement" ? [row.transaction] : []));

/**
 * The balance rows that open and close a table, and a warning for each of
 * its other rows, in the order the file is read, oldest first: a file that
 * lists its movements newest first lists its balance rows so too, its
 * opening balance last.
 */
export const tableEdges = (table: readonly TableRow[]): TableEdges =>
  edgesOf(isNewestFirst(movementsOf(table)) ? table.toReversed() : table);

const balanceBefore = ({
  amountMinor,
  balanceAfterMinor,
}: ParsedTransaction): AmountMinor | undefined => {
  if (balanceAfterMinor === undefined) return undefined;
  const balance = balanceAfterMinor - amountMinor;
  return isAmountMinor(balance) ? balance : undefined;
};

// The balances that open and close a file that prints them: its own rows',
// else the one before its first movement and the one after its last. Both
// or neither.
const balancesOf = ({ first, last }: Ends, edges: TableEdges) => {
  const opening = edges.opening?.balance ?? balanceBefore(first);
  const closing = edges.closing?.balance ?? last.balanceAfterMinor;
  return opening === undefined || closing === undefined
    ? undefined
    : { openingBalanceMinor: opening, closingBalanceMinor: closing };
};

// With balances, the period opens on the opening balance's day, so it covers
// its days as a quarterly statement does (ADR 0018); without them, it spans
// the movements, as a movements export's does.
const periodOf = (
  { first, last }: Ends,
  edges: TableEdges,
  hasBalances: boolean,
): Period => {
  if (!hasBalances) return { from: first.date, to: last.date };
  const opened = edges.opening?.date;
  const closed = edges.closing?.date;
  return {
    from:
      opened !== undefined && compareLocalDates(opened, first.date) < 0
        ? opened
        : addDaysTo(first.date, -1),
    to:
      closed !== undefined && compareLocalDates(closed, last.date) > 0
        ? closed
        : last.date,
  };
};

/**
 * The statement a mapped table holds: its movements oldest first, and the
 * balances that open and close it when it prints them. Its account is a
 * savings account in pesos of the mapping's bank, which the file doesn't
 * name, and its rows that aren't movements are warnings.
 */
export const mappedStatement = (
  mapping: FormatMapping,
  table: readonly TableRow[],
): Result<ParsedStatement> => {
  const edges = tableEdges(table);
  const movements = inDateOrder(movementsOf(table), edges.opening?.balance);
  const [first] = movements;
  const last = movements.at(-1);
  if (first === undefined || last === undefined) {
    return parseFailed({ reason: "no_movements" });
  }
  const balances = balancesOf({ first, last }, edges);
  const statement = parsedStatementSchema.safeParse({
    bankId: mapping.bankId,
    formatId: MAPPED_FORMAT_ID,
    accountType: ACCOUNT_TYPE.SAVINGS,
    currency: CURRENCY.COP,
    period: periodOf({ first, last }, edges, balances !== undefined),
    periodSource: PERIOD_SOURCE.ROWS,
    ...balances,
    transactions: movements,
    warnings: edges.warnings,
  });
  return statement.success
    ? ok(statement.data)
    : parseFailed({ reason: "invalid_output" });
};
