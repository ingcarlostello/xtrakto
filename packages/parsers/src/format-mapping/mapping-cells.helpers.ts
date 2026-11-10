import {
  amountFromNumber,
  APP_ERROR_CODE,
  DATE_ORDER,
  DECIMAL_SEPARATOR,
  err,
  localDateFromExcelSerial,
  parseAmountWithSeparator,
  parseDateInOrder,
} from "@xtrakto/core";
import type {
  AmountMinor,
  DateOrder,
  DecimalSeparator,
  LocalDate,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { MAPPED_DATE_TIME_ZONES } from "./format-mapping.constants";

type Cell = SpreadsheetCell | undefined;

const DATE_ORDERS = Object.values(DATE_ORDER);
const DECIMAL_SEPARATORS = Object.values(DECIMAL_SEPARATOR);

const wrongType: Result<never> = err({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details: { reason: "type" },
});

const isDateCell = (cell: Cell): cell is { excelSerial: number } =>
  typeof cell === "object" && cell !== null;

/**
 * A movement's date in a mapped table: a date cell is the day it shows, and
 * text reads in the mapping's order ("02/09/2026", "2026-09-02").
 */
export const readMappedDate = (
  cell: Cell,
  order: DateOrder,
): Result<LocalDate> => {
  if (isDateCell(cell)) {
    return localDateFromExcelSerial(cell.excelSerial, MAPPED_DATE_TIME_ZONES);
  }
  return typeof cell === "string" ? parseDateInOrder(cell, order) : wrongType;
};

/**
 * An amount in a mapped table: a number cell as it is, and text by the
 * mapping's decimal separator ("85.400,00", "85,400.00").
 */
export const readMappedAmount = (
  cell: Cell,
  separator: DecimalSeparator,
): Result<AmountMinor> => {
  if (typeof cell === "number") return amountFromNumber(cell);
  return typeof cell === "string"
    ? parseAmountWithSeparator(cell, separator)
    : wrongType;
};

/** Whether a cell holds a date, in any order a bank writes one. */
export const looksLikeDate = (cell: Cell): boolean =>
  isDateCell(cell) ||
  (typeof cell === "string" &&
    DATE_ORDERS.some((order) => parseDateInOrder(cell, order).ok));

/** Whether a cell holds an amount, with either decimal separator. */
export const looksLikeAmount = (cell: Cell): boolean =>
  typeof cell === "number" ||
  (typeof cell === "string" &&
    DECIMAL_SEPARATORS.some(
      (separator) => parseAmountWithSeparator(cell, separator).ok,
    ));
