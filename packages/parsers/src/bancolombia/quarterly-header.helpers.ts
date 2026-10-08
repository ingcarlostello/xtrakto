import {
  ACCOUNT_TYPE,
  compareLocalDates,
  ok,
  parseAmountText,
  parseSlashDate,
} from "@xtrakto/core";
import type {
  ParsedStatement,
  Period,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { normalizeDescription } from "../descriptions/description.helpers";
import { cellText, findColumns, findLabelRow } from "../sheets/sheet.utils";
import type { ColumnRef, SheetRows } from "../sheets/sheet.utils";
import {
  ACCOUNT_COLUMN,
  CLIENT_COLUMN,
  PERIOD_COLUMN,
  QUARTERLY_BLOCK,
  SAVINGS_ACCOUNT_TYPE,
  SUMMARY_COLUMN,
} from "./bancolombia.constants";
import { parseFailed } from "./quarterly-failure.helpers";

/** What the quarterly statement says before its movements. */
export type QuarterlyHeader = Required<
  Pick<
    ParsedStatement,
    | "holderName"
    | "period"
    | "accountType"
    | "accountLast4"
    | "openingBalanceMinor"
    | "closingBalanceMinor"
    | "totals"
  >
>;

type BlockSpec<K extends string, T> = {
  /** The label that opens the block. */
  readonly label: string;
  /** Header names of the columns to read, by key. */
  readonly columns: Readonly<Record<K, string>>;
  /** Turns a cell's text into its value. */
  readonly read: (text: string) => Result<T>;
};

const ACCOUNT_NUMBER_PATTERN = /^\d{4,}$/;
const ACCOUNT_LAST_DIGITS = 4;

const readText = (text: string): Result<string> => ok(text);

const readValues = <K extends string, T>(
  values: readonly SpreadsheetCell[],
  columns: readonly ColumnRef<K>[],
  { label, read }: Pick<BlockSpec<K, T>, "label" | "read">,
): Result<Record<K, T>> => {
  const record: Partial<Record<K, T>> = {};
  for (const { key, name, index } of columns) {
    const text = cellText(values[index]);
    if (text === undefined) {
      return parseFailed({
        reason: "missing_value",
        block: label,
        column: name,
      });
    }
    const value = read(text);
    if (!value.ok) {
      const cause = value.error.details?.reason;
      return parseFailed({
        reason: "invalid_value",
        block: label,
        column: name,
        cause,
      });
    }
    record[key] = value.value;
  }
  // Safe: the loop set every column's value or returned.
  return ok(record as Record<K, T>);
};

// A block is its label, a header row and the values row under it.
const readBlock = <K extends string, T>(
  rows: SheetRows,
  spec: BlockSpec<K, T>,
): Result<Record<K, T>> => {
  const { label } = spec;
  const labelRow = findLabelRow(rows, label);
  if (labelRow === undefined) {
    return parseFailed({ reason: "missing_block", block: label });
  }
  const columns = findColumns(rows[labelRow + 1] ?? [], spec.columns);
  if (!columns.ok) {
    return parseFailed({
      reason: "missing_column",
      block: label,
      column: columns.error,
    });
  }
  return readValues(rows[labelRow + 2] ?? [], columns.value, spec);
};

const readHolderName = (rows: SheetRows): Result<string> => {
  const client = readBlock(rows, {
    label: QUARTERLY_BLOCK.CLIENT,
    columns: CLIENT_COLUMN,
    read: readText,
  });
  return client.ok ? ok(normalizeDescription(client.value.HOLDER)) : client;
};

const readPeriod = (rows: SheetRows): Result<Period> => {
  const block = QUARTERLY_BLOCK.GENERAL;
  const dates = readBlock(rows, {
    label: block,
    columns: PERIOD_COLUMN,
    read: parseSlashDate,
  });
  if (!dates.ok) return dates;
  const { FROM: from, TO: to } = dates.value;
  return compareLocalDates(from, to) <= 0
    ? ok({ from, to })
    : parseFailed({ reason: "invalid_period", block });
};

const readAccount = (
  rows: SheetRows,
): Result<Pick<QuarterlyHeader, "accountType" | "accountLast4">> => {
  const block = QUARTERLY_BLOCK.GENERAL;
  const account = readBlock(rows, {
    label: block,
    columns: ACCOUNT_COLUMN,
    read: readText,
  });
  if (!account.ok) return account;
  const { TYPE: type, NUMBER: number } = account.value;
  if (type !== SAVINGS_ACCOUNT_TYPE) {
    const column = ACCOUNT_COLUMN.TYPE;
    return parseFailed({ reason: "unsupported_account_type", block, column });
  }
  if (!ACCOUNT_NUMBER_PATTERN.test(number)) {
    const column = ACCOUNT_COLUMN.NUMBER;
    return parseFailed({ reason: "invalid_value", block, column });
  }
  // Only the last digits leave the parser; the full number is never kept.
  return ok({
    accountType: ACCOUNT_TYPE.SAVINGS,
    accountLast4: number.slice(-ACCOUNT_LAST_DIGITS),
  });
};

const readSummary = (
  rows: SheetRows,
): Result<
  Pick<
    QuarterlyHeader,
    "openingBalanceMinor" | "closingBalanceMinor" | "totals"
  >
> => {
  const summary = readBlock(rows, {
    label: QUARTERLY_BLOCK.SUMMARY,
    columns: SUMMARY_COLUMN,
    read: parseAmountText,
  });
  if (!summary.ok) return summary;
  const amounts = summary.value;
  return ok({
    openingBalanceMinor: amounts.OPENING_BALANCE,
    closingBalanceMinor: amounts.CLOSING_BALANCE,
    totals: {
      creditsMinor: amounts.CREDITS,
      // As printed: positive, the opposite of the sum of the debits.
      debitsMinor: amounts.DEBITS,
      interestMinor: amounts.INTEREST,
      withholdingMinor: amounts.WITHHOLDING,
      averageBalanceMinor: amounts.AVERAGE_BALANCE,
    },
  });
};

/**
 * Reads the blocks before the movements: the holder's name (never the
 * address or the city), the period, the account and the summary.
 */
export const readQuarterlyHeader = (
  rows: SheetRows,
): Result<QuarterlyHeader> => {
  const holderName = readHolderName(rows);
  if (!holderName.ok) return holderName;
  const period = readPeriod(rows);
  if (!period.ok) return period;
  const account = readAccount(rows);
  if (!account.ok) return account;
  const summary = readSummary(rows);
  if (!summary.ok) return summary;
  return ok({
    holderName: holderName.value,
    period: period.value,
    ...account.value,
    ...summary.value,
  });
};
