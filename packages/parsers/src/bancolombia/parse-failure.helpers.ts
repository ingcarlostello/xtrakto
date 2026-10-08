import { APP_ERROR_CODE, err } from "@xtrakto/core";
import type { Result } from "@xtrakto/core";

export type ParseFailureReason =
  /** A block's label isn't in the sheet. */
  | "missing_block"
  /** A header lacks a column that is read. */
  | "missing_column"
  /**
   * A cell that is read is empty. The quarterly statement, all text, also
   * counts a cell that isn't text.
   */
  | "missing_value"
  /** A cell holds the wrong type, or an invalid amount, date or account number. */
  | "invalid_value"
  /** The period starts after it ends. */
  | "invalid_period"
  /** Not a savings account. */
  | "unsupported_account_type"
  /** `FIN ESTADO DE CUENTA` never appears after the movements. */
  | "missing_end"
  /** A movement row appears inside the blocks a new page repeats. */
  | "incomplete_page_header"
  /** A movements export without movements, so without a period either. */
  | "no_movements"
  /** The content isn't a spreadsheet. */
  | "content_type"
  /** The statement read doesn't satisfy the parsed statement schema. */
  | "invalid_output";

/**
 * Where a Bancolombia file couldn't be read: the printed block and column
 * names, a 0-based row and the reason core's helpers gave. Never the cell's
 * value, which can hold personal or financial data.
 */
export type ParseFailure = {
  readonly reason: ParseFailureReason;
  readonly block?: string;
  readonly column?: string;
  readonly row?: number;
  readonly cause?: string | number | boolean;
};

export const parseFailed = (failure: ParseFailure): Result<never> =>
  err({ code: APP_ERROR_CODE.PARSE_FAILED, details: failure });
