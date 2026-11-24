import {
  APP_ERROR_CODE,
  CARD_SUMMARY_KIND,
  err,
  ok,
  parseAmountWithSeparator,
  parseCardDate,
  parseCardPeriod,
} from "@xtrakto/core";
import type {
  AmountMinor,
  CardStatement,
  CardSummary,
  ExtractedContent,
  LocalDate,
  Period,
  Result,
} from "@xtrakto/core";
import { decimalSeparatorOf } from "../format-mapping/mapping-formats.helpers";
import { parseFailed } from "../registry/parse-failure.helpers";
import { cellText, findLabelRow, hasText } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import {
  CARD_CURRENCY,
  CARD_LABEL,
  CARD_MINIMUM_LABEL,
  CARD_NUMBER_PATTERN,
  CARD_SUMMARY_HEADER,
  CARD_TOTAL_LABEL,
  NOTHING_DUE,
} from "./card.constants";
import { readHolderName } from "./quarterly-header.helpers";

/** The card's sheets by the currency each says it's in; either may be missing. */
export type CardSheets = {
  readonly pesos?: SheetRows;
  readonly dollars?: SheetRows;
};

/** What the card's sheet in pesos says before its movements (Appendix A.4). */
export type CardHeader = {
  readonly holderName: string;
  readonly accountLast4: string;
  readonly period: Period;
  readonly card: CardStatement;
};

// Where to read amounts beside their labels: below a row, in a column.
type AmountsBeside<K extends string> = {
  readonly start: number;
  readonly column: number;
  readonly labels: Readonly<Record<K, string>>;
  readonly block: string;
};

/** The figures right of their labels in the first column. */
const PAYMENT_LABEL = {
  creditLimitMinor: CARD_LABEL.CREDIT_LIMIT,
  availableMinor: CARD_LABEL.AVAILABLE,
  minimumPaymentMinor: CARD_LABEL.MINIMUM,
  totalPaymentMinor: CARD_LABEL.TOTAL,
} as const;

const formatError = (): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: { reason: "format" } });

const isInCurrency = (rows: SheetRows, currency: string): boolean => {
  const index = findLabelRow(rows, CARD_LABEL.CURRENCY);
  return index !== undefined && hasText(rows[index]?.[1], currency);
};

/**
 * The card's sheets by their "Moneda:", whatever their names or order; none
 * when the content isn't a spreadsheet.
 */
export const cardSheets = (
  content: ExtractedContent,
): CardSheets | undefined => {
  if (content.type !== "spreadsheet") return undefined;
  const rowsIn = (currency: string) =>
    content.sheets.find(({ rows }) => isInCurrency(rows, currency))?.rows;
  const pesos = rowsIn(CARD_CURRENCY.PESOS);
  const dollars = rowsIn(CARD_CURRENCY.DOLLARS);
  return {
    ...(pesos === undefined ? {} : { pesos }),
    ...(dollars === undefined ? {} : { dollars }),
  };
};

/**
 * An amount as the card's sheet writes it, by the separator its cents say:
 * `"1.234,56"`, `"1.234.567,8"`, and the minimum's `"123,456.00"`.
 */
export const readCardAmount = (text: string): Result<AmountMinor> =>
  parseAmountWithSeparator(text, decimalSeparatorOf([text]));

/** The card's last 4 digits, from its number masked but them. */
export const lastFourOf = (text: string): Result<string> => {
  const [, lastFour] = CARD_NUMBER_PATTERN.exec(text) ?? [];
  return lastFour === undefined ? formatError() : ok(lastFour);
};

/** When the card is due, or nothing when nothing is. */
export const dueDateOf = (text: string): Result<LocalDate | undefined> =>
  NOTHING_DUE.test(text) ? ok(undefined) : parseCardDate(text);

// The texts right of a label in the first column, read together.
const readBeside = <T>(
  rows: SheetRows,
  label: string,
  read: (texts: readonly string[]) => Result<T>,
): Result<T> => {
  const index = findLabelRow(rows, label);
  if (index === undefined) {
    return parseFailed({ reason: "missing_block", block: label });
  }
  const texts = (rows[index] ?? []).slice(1).flatMap((cell) => {
    const text = cellText(cell);
    return text === undefined ? [] : [text];
  });
  if (texts.length === 0) {
    return parseFailed({ reason: "missing_value", block: label });
  }
  const value = read(texts);
  if (value.ok) return value;
  const cause = value.error.details?.["reason"];
  return parseFailed({ reason: "invalid_value", block: label, cause });
};

const firstText =
  <T>(read: (text: string) => Result<T>) =>
  (texts: readonly string[]): Result<T> =>
    read(texts[0] ?? "");

// Each label's amount, in the cell right of it, in a column under a row.
const readAmountsBeside = <K extends string>(
  rows: SheetRows,
  { start, column, labels, block }: AmountsBeside<K>,
): Result<Record<K, AmountMinor>> => {
  const amounts: Partial<Record<K, AmountMinor>> = {};
  // Safe: Object.entries types keys as string, and these are the keys of K.
  for (const [key, label] of Object.entries(labels) as [K, string][]) {
    const row = rows
      .slice(start)
      .find((cells) => hasText(cells[column], label));
    const text = cellText(row?.[column + 1]);
    if (text === undefined) {
      return parseFailed({ reason: "missing_value", block, column: label });
    }
    const amount = readCardAmount(text);
    if (!amount.ok) {
      const cause = amount.error.details?.["reason"];
      return parseFailed({
        reason: "invalid_value",
        block,
        column: label,
        cause,
      });
    }
    amounts[key] = amount.value;
  }
  // Safe: the loop set every label's amount or returned.
  return ok(amounts as Record<K, AmountMinor>);
};

/** The row over both summaries, and the column of each. */
export const findSummaries = (
  rows: SheetRows,
): Result<{ row: number; total: number; minimum: number }> => {
  for (const [row, cells] of rows.entries()) {
    const total = cells.findIndex((cell) =>
      hasText(cell, CARD_SUMMARY_HEADER.TOTAL),
    );
    const minimum = cells.findIndex((cell) =>
      hasText(cell, CARD_SUMMARY_HEADER.MINIMUM),
    );
    if (total !== -1 && minimum !== -1) return ok({ row, total, minimum });
  }
  return parseFailed({
    reason: "missing_block",
    block: CARD_SUMMARY_HEADER.TOTAL,
  });
};

const readSummary = (rows: SheetRows): Result<CardSummary> => {
  const header = findSummaries(rows);
  if (!header.ok) return header;
  const { row, total, minimum } = header.value;
  const totals = readAmountsBeside(rows, {
    start: row + 1,
    column: total,
    labels: CARD_TOTAL_LABEL,
    block: CARD_SUMMARY_HEADER.TOTAL,
  });
  if (!totals.ok) return totals;
  const minimums = readAmountsBeside(rows, {
    start: row + 1,
    column: minimum,
    labels: CARD_MINIMUM_LABEL,
    block: CARD_SUMMARY_HEADER.MINIMUM,
  });
  if (!minimums.ok) return minimums;
  return ok({
    kind: CARD_SUMMARY_KIND.BANCOLOMBIA,
    total: totals.value,
    minimum: minimums.value,
  });
};

/** The values of several readers in turn, or the first failure. */
export const readAll = <T extends object>(readers: {
  readonly [K in keyof T]: () => Result<T[K]>;
}): Result<T> => {
  const values: Partial<T> = {};
  // Safe: Object.keys types keys as string, and these are the keys of T.
  for (const key of Object.keys(readers) as (keyof T)[]) {
    const value = readers[key]();
    if (!value.ok) return value;
    values[key] = value.value;
  }
  // Safe: the loop set every reader's value or returned.
  return ok(values as T);
};

/**
 * Reads what the card's sheet in pesos prints before its movements: the
 * holder's name (never the address, the city or the department), the card's
 * last 4 digits, the billed period, when it's due, what's due, the limit and
 * what's available, and both summaries.
 */
export const readCardHeader = (rows: SheetRows): Result<CardHeader> => {
  const header = readAll({
    holderName: () => readHolderName(rows),
    accountLast4: () =>
      readBeside(rows, CARD_LABEL.CARD, firstText(lastFourOf)),
    period: () =>
      readBeside(rows, CARD_LABEL.PERIOD, (texts) =>
        parseCardPeriod(texts.join(" - ")),
      ),
    dueDate: () => readBeside(rows, CARD_LABEL.DUE_DATE, firstText(dueDateOf)),
    payments: () =>
      readAmountsBeside(rows, {
        start: 0,
        column: 0,
        labels: PAYMENT_LABEL,
        block: CARD_LABEL.CARD,
      }),
    summary: () => readSummary(rows),
  });
  if (!header.ok) return header;
  const { holderName, accountLast4, period, dueDate, payments, summary } =
    header.value;
  return ok({
    holderName,
    accountLast4,
    period,
    card: {
      ...payments,
      ...(dueDate === undefined ? {} : { dueDate }),
      summary,
    },
  });
};
