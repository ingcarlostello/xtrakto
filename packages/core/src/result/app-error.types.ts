import type { APP_ERROR_CODE } from "./app-error.constants";

export type AppErrorCode = (typeof APP_ERROR_CODE)[keyof typeof APP_ERROR_CODE];

/**
 * Internal identifiers, counts, row numbers and field names only. Never
 * descriptions, amounts, names, or account or phone numbers: errors can reach
 * logs and Sentry.
 */
export type AppErrorDetails = Readonly<
  Record<string, string | number | boolean>
>;

/**
 * A plain object rather than an `Error` subclass, so it survives serialization
 * across server actions. It carries no message: the UI maps each code to text.
 */
export type AppError = {
  readonly code: AppErrorCode;
  readonly details?: AppErrorDetails;
};
