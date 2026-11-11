import { DATE_ORDER, DECIMAL_SEPARATOR } from "@xtrakto/core";
import type {
  DateOrder,
  DecimalSeparator,
  SpreadsheetCell,
} from "@xtrakto/core";
import { cellText, comparableText } from "../sheets/sheet.utils";
import {
  DIRECTION_WORDS_IN,
  DIRECTION_WORDS_OUT,
} from "./format-mapping.constants";
import { looksLikeDate, readMappedDate } from "./mapping-cells.helpers";

type Cell = SpreadsheetCell | undefined;

const DATE_ORDERS = Object.values(DATE_ORDER);
const { COMMA, POINT } = DECIMAL_SEPARATOR;

// An amount's last separator and the digits after it, before any sign or
// word that ends it ("85.400,00", "85.400,00 CR").
const LAST_SEPARATOR = /([.,])(\d+)\D*$/;

/**
 * The order a date column writes its days in: the only one that reads every
 * date of it, the day first when more do, as Colombia writes them.
 * Undefined when none does.
 */
export const dateOrderOf = (cells: readonly Cell[]): DateOrder | undefined => {
  const dates = cells.filter(looksLikeDate);
  const orders = DATE_ORDERS.filter((order) =>
    dates.every((cell) => readMappedDate(cell, order).ok),
  );
  if (dates.length === 0) return undefined;
  return orders.includes(DATE_ORDER.DAY_MONTH_YEAR)
    ? DATE_ORDER.DAY_MONTH_YEAR
    : orders[0];
};

// What an amount's text says of its decimal separator: two digits or fewer
// after its last separator are its cents; three, a group of thousands.
const separatorSaid = (cell: Cell): DecimalSeparator | undefined => {
  if (typeof cell !== "string") return undefined;
  const [, mark, digits = ""] = LAST_SEPARATOR.exec(cell) ?? [];
  if (mark === undefined || digits.length > 3) return undefined;
  const isPoint = mark === POINT;
  if (digits.length === 3) return isPoint ? COMMA : POINT;
  return isPoint ? POINT : COMMA;
};

/**
 * The decimal separator of a table's amounts: the one most of them say, by
 * the digits after their last separator; a comma, as Colombia writes them,
 * when they say none or as many say each.
 */
export const decimalSeparatorOf = (
  cells: readonly Cell[],
): DecimalSeparator => {
  const said = cells.map(separatorSaid);
  const points = said.filter((separator) => separator === POINT).length;
  const commas = said.filter((separator) => separator === COMMA).length;
  return points > commas ? POINT : COMMA;
};

/**
 * A direction column's words for money in and for money out, as banks write
 * them ("C" and "D", "Crédito" and "Débito"). Undefined when a word isn't
 * one of those, or a way has none: the person says which (11.3b).
 */
export const directionWordsOf = (
  cells: readonly Cell[],
): { in: string[]; out: string[] } | undefined => {
  const words = new Set(
    cells.flatMap((cell) => {
      const text = cellText(cell);
      return text === undefined ? [] : [comparableText(text)];
    }),
  );
  const into = [...words].filter((word) => DIRECTION_WORDS_IN.has(word));
  const out = [...words].filter((word) => DIRECTION_WORDS_OUT.has(word));
  const isEachKnown = into.length + out.length === words.size;
  return isEachKnown && into.length > 0 && out.length > 0
    ? { in: into, out }
    : undefined;
};
