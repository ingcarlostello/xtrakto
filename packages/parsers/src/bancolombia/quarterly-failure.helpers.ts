import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { Result } from "@xtrakto/core";

export type QuarterlyFailureReason =
  /** A block's label isn't in the sheet. */
  | "missing_block"
  /** A block's header lacks a column that is read. */
  | "missing_column"
  /** A cell that is read holds no text. */
  | "missing_value"
  /** A cell's text isn't a valid amount, date or account number. */
  | "invalid_value"
  /** The period starts after it ends. */
  | "invalid_period"
  /** Not a savings account. */
  | "unsupported_account_type";

/**
 * Where a quarterly statement couldn't be read: the printed block and column
 * names, a 0-based row and the reason core's helpers gave. Never the cell's
 * text, which can hold personal or financial data.
 */
export type QuarterlyFailure = {
  readonly reason: QuarterlyFailureReason;
  readonly block?: string;
  readonly column?: string;
  readonly row?: number;
  readonly cause?: string | number | boolean;
};

export const parseFailed = (failure: QuarterlyFailure): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: failure });
